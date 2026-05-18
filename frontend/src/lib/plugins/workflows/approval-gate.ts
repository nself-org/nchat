/**
 * Approval Gate
 *
 * Manages human approval checkpoints within workflow execution.
 * Supports multi-approver workflows, timeout with escalation,
 * and approval/rejection with comments.
 */

import { generateId } from "../app-lifecycle";
import type {
  ApprovalRequest,
  ApprovalResponse,
  ApprovalStatus,
  ApprovalAction,
  WorkflowAuditEntry,
  WorkflowAuditEventType,
} from "./types";

// ============================================================================
// APPROVAL STORE
// ============================================================================

/**
 * In-memory store for approval requests.
 * In production, this would be backed by a database.
 */
export class ApprovalStore {
  private requests: Map<string, ApprovalRequest> = new Map();

  get(id: string): ApprovalRequest | undefined {
    return this.requests.get(id);
  }

  getByRunAndStep(runId: string, stepId: string): ApprovalRequest | undefined {
    for (const req of this.requests.values()) {
      if (req.runId === runId && req.stepId === stepId) {
        return req;
      }
    }
    return undefined;
  }

  list(filter?: {
    runId?: string;
    status?: ApprovalStatus;
  }): ApprovalRequest[] {
    let requests = Array.from(this.requests.values());
    if (filter?.runId) {
      requests = requests.filter((r) => r.runId === filter.runId);
    }
    if (filter?.status) {
      requests = requests.filter((r) => r.status === filter.status);
    }
    return requests;
  }

  save(request: ApprovalRequest): void {
    this.requests.set(request.id, request);
  }

  delete(id: string): boolean {
    return this.requests.delete(id);
  }

  clear(): void {
    this.requests.clear();
  }
}

// ============================================================================
// APPROVAL GATE MANAGER
// ============================================================================

export interface ApprovalGateConfig {
  /** Custom time function for testing */
  nowFn?: () => Date;
}

/**
 * Manages approval gates for workflow steps.
 * Handles request creation, approval/rejection, timeout, and escalation.
 */
export class ApprovalGateManager {
  private store: ApprovalStore;
  private auditLog: WorkflowAuditEntry[] = [];
  private config: ApprovalGateConfig;

  /** Callback when an approval is fully resolved (approved or rejected) */
  onApprovalResolved?: (request: ApprovalRequest) => void;

  /** Callback when an approval is escalated */
  onApprovalEscalated?: (request: ApprovalRequest) => void;

  /** Callback for sending notifications */
  onNotify?: (
    userIds: string[],
    message: string,
    data: Record<string, unknown>,
  ) => void;

  constructor(store?: ApprovalStore, config?: ApprovalGateConfig) {
    this.store = store ?? new ApprovalStore();
    this.config = config ?? {};
  }

  // ==========================================================================
  // REQUEST MANAGEMENT
  // ==========================================================================

  /**
   * Create an approval request for a workflow step.
   */
  createRequest(
    runId: string,
    stepId: string,
    workflowId: string,
    action: ApprovalAction,
  ): ApprovalRequest {
    // Check for existing request for this run/step
    const existing = this.store.getByRunAndStep(runId, stepId);
    if (existing && existing.status === "pending") {
      return existing;
    }

    const now = this.now();
    const request: ApprovalRequest = {
      id: generateId("approval"),
      runId,
      stepId,
      message: action.message,
      approverIds: action.approverIds,
      minApprovals: action.minApprovals ?? 1,
      currentApprovals: 0,
      currentRejections: 0,
      responses: [],
      status: "pending",
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + action.timeoutMs).toISOString(),
      escalationUserIds: action.escalationUserIds ?? [],
      escalated: false,
    };

    this.store.save(request);

    this.audit(
      "workflow.approval_requested",
      workflowId,
      runId,
      stepId,
      "system",
      {
        approverIds: action.approverIds,
        minApprovals: action.minApprovals,
        timeoutMs: action.timeoutMs,
      },
    );

    // Notify approvers
    if (this.onNotify) {
      this.onNotify(
        action.approverIds,
        `Approval required: ${action.message}`,
        { requestId: request.id, runId, stepId },
      );
    }

    return request;
  }

  /**
   * Submit an approval for a request.
   */
  approve(
    requestId: string,
    userId: string,
    comment?: string,
  ): ApprovalRequest {
    const request = this.getRequestOrThrow(requestId);

    this.validateResponder(request, userId);

    // Check for duplicate response
    if (request.responses.some((r) => r.userId === userId)) {
      throw new ApprovalError(
        `User "${userId}" has already responded to this request`,
        "DUPLICATE_RESPONSE",
      );
    }

    const response: ApprovalResponse = {
      userId,
      decision: "approved",
      comment,
      respondedAt: this.now().toISOString(),
    };

    request.responses.push(response);
    request.currentApprovals++;

    // Check if we've reached the required approvals
    if (request.currentApprovals >= request.minApprovals) {
      request.status = "approved";
      this.audit(
        "workflow.approval_granted",
        "",
        request.runId,
        request.stepId,
        userId,
        {
          approvals: request.currentApprovals,
          required: request.minApprovals,
        },
      );

      if (this.onApprovalResolved) {
        this.onApprovalResolved(request);
      }
    }

    this.store.save(request);
    return request;
  }

  /**
   * Submit a rejection for a request.
   */
  reject(requestId: string, userId: string, comment?: string): ApprovalRequest {
    const request = this.getRequestOrThrow(requestId);

    this.validateResponder(request, userId);

    // Check for duplicate response
    if (request.responses.some((r) => r.userId === userId)) {
      throw new ApprovalError(
        `User "${userId}" has already responded to this request`,
        "DUPLICATE_RESPONSE",
      );
    }

    const response: ApprovalResponse = {
      userId,
      decision: "rejected",
      comment,
      respondedAt: this.now().toISOString(),
    };

    request.responses.push(response);
    request.currentRejections++;

    // Check if rejection should finalize the request
    // (rejected if remaining potential approvers can't reach min approvals)
    const remainingApprovers =
      request.approverIds.length - request.responses.length;
    if (request.currentApprovals + remainingApprovers < request.minApprovals) {
      request.status = "rejected";
      this.audit(
        "workflow.approval_rejected",
        "",
        request.runId,
        request.stepId,
        userId,
        {
          rejections: request.currentRejections,
          reason: comment,
        },
      );

      if (this.onApprovalResolved) {
        this.onApprovalResolved(request);
      }
    }

    this.store.save(request);
    return request;
  }

  // ==========================================================================
  // TIMEOUT AND ESCALATION
  // ==========================================================================

  /**
   * Check for and process expired approval requests.
   * Returns the list of expired requests.
   */
  processExpired(): ApprovalRequest[] {
    const now = this.now();
    const pendingRequests = this.store.list({ status: "pending" });
    const expired: ApprovalRequest[] = [];

    for (const request of pendingRequests) {
      if (new Date(request.expiresAt) <= now) {
        // Check if we should escalate first
        if (request.escalationUserIds.length > 0 && !request.escalated) {
          request.escalated = true;
          request.status = "escalated";

          this.audit(
            "workflow.approval_escalated",
            "",
            request.runId,
            request.stepId,
            "system",
            {
              escalationUserIds: request.escalationUserIds,
            },
          );

          // Notify escalation contacts
          if (this.onNotify) {
            this.onNotify(
              request.escalationUserIds,
              `Escalation: Approval request expired - ${request.message}`,
              {
                requestId: request.id,
                runId: request.runId,
                stepId: request.stepId,
              },
            );
          }

          if (this.onApprovalEscalated) {
            this.onApprovalEscalated(request);
          }
        } else {
          request.status = "expired";

          this.audit(
            "workflow.approval_expired",
            "",
            request.runId,
            request.stepId,
            "system",
            {
              approvals: request.currentApprovals,
              required: request.minApprovals,
            },
          );

          if (this.onApprovalResolved) {
            this.onApprovalResolved(request);
          }
        }

        this.store.save(request);
        expired.push(request);
      }
    }

    return expired;
  }

  // ==========================================================================
  // QUERIES
  // ==========================================================================

  /**
   * Get a request by ID.
   */
  getRequest(id: string): ApprovalRequest | undefined {
    return this.store.get(id);
  }

  /**
   * Get request by run and step.
   */
  getRequestByRunAndStep(
    runId: string,
    stepId: string,
  ): ApprovalRequest | undefined {
    return this.store.getByRunAndStep(runId, stepId);
  }

  /**
   * List pending requests for a specific user.
   */
  getPendingForUser(userId: string): ApprovalRequest[] {
    return this.store
      .list({ status: "pending" })
      .filter(
        (r) =>
          r.approverIds.includes(userId) &&
          !r.responses.some((resp) => resp.userId === userId),
      );
  }

  /**
   * Get the audit log.
   */
  getAuditLog(): WorkflowAuditEntry[] {
    return [...this.auditLog];
  }

  /**
   * Clear all state.
   */
  clear(): void {
    this.store.clear();
    this.auditLog = [];
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private getRequestOrThrow(id: string): ApprovalRequest {
    const request = this.store.get(id);
    if (!request) {
      throw new ApprovalError(
        `Approval request not found: ${id}`,
        "REQUEST_NOT_FOUND",
      );
    }
    if (request.status !== "pending" && request.status !== "escalated") {
      throw new ApprovalError(
        `Cannot respond to request in "${request.status}" status`,
        "REQUEST_NOT_PENDING",
      );
    }
    return request;
  }

  private validateResponder(request: ApprovalRequest, userId: string): void {
    // Allow escalation users to respond too
    const allowedResponders = [
      ...request.approverIds,
      ...request.escalationUserIds,
    ];

    if (!allowedResponders.includes(userId)) {
      throw new ApprovalError(
        `User "${userId}" is not authorized to respond to this request`,
        "NOT_AUTHORIZED",
      );
    }
  }

  private audit(
    eventType: WorkflowAuditEventType,
    workflowId: string,
    runId?: string,
    stepId?: string,
    actorId: string = "system",
    data?: Record<string, unknown>,
  ): void {
    const entry: WorkflowAuditEntry = {
      id: generateId("audit"),
      eventType,
      workflowId,
      runId,
      stepId,
      actorId,
      timestamp: this.now().toISOString(),
      description: `${eventType}${stepId ? ` (step: ${stepId})` : ""}`,
      data,
    };
    this.auditLog.push(entry);
  }

  private now(): Date {
    return this.config.nowFn ? this.config.nowFn() : new Date();
  }
}

// ============================================================================
// ERRORS
// ============================================================================

export class ApprovalError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "ApprovalError";
  }
}
