/**
 * Workflow Service
 *
 * Service layer for workflow automation. Orchestrates the workflow builder,
 * trigger engine, execution engine, approval gates, and scheduler.
 */

import type { AppEventType } from "@/lib/plugins/app-contract";
import type {
  WorkflowDefinition,
  WorkflowRun,
  WorkflowRunStatus,
  ApprovalRequest,
  ScheduledExecution,
  WorkflowAuditEntry,
  WorkflowAuditEventType,
} from "@/lib/plugins/workflows/types";
import {
  WorkflowBuilder,
  validateWorkflowDefinition,
} from "@/lib/plugins/workflows/workflow-builder";
import { TriggerEngine } from "@/lib/plugins/workflows/trigger-engine";
import { WorkflowExecutionEngine } from "@/lib/plugins/workflows/execution-engine";
import {
  ApprovalGateManager,
  ApprovalStore,
} from "@/lib/plugins/workflows/approval-gate";
import {
  WorkflowScheduler,
  ScheduleStore,
} from "@/lib/plugins/workflows/scheduler";

// ============================================================================
// WORKFLOW STORE
// ============================================================================

/**
 * In-memory store for workflow definitions.
 */
export class WorkflowDefinitionStore {
  private workflows: Map<string, WorkflowDefinition> = new Map();

  get(id: string): WorkflowDefinition | undefined {
    return this.workflows.get(id);
  }

  list(filter?: {
    enabled?: boolean;
    tags?: string[];
    createdBy?: string;
  }): WorkflowDefinition[] {
    let workflows = Array.from(this.workflows.values());
    if (filter?.enabled !== undefined) {
      workflows = workflows.filter((w) => w.enabled === filter.enabled);
    }
    if (filter?.tags && filter.tags.length > 0) {
      workflows = workflows.filter((w) =>
        filter.tags!.some((t) => w.tags.includes(t)),
      );
    }
    if (filter?.createdBy) {
      workflows = workflows.filter((w) => w.createdBy === filter.createdBy);
    }
    return workflows;
  }

  save(workflow: WorkflowDefinition): void {
    this.workflows.set(workflow.id, workflow);
  }

  delete(id: string): boolean {
    return this.workflows.delete(id);
  }

  clear(): void {
    this.workflows.clear();
  }
}

// ============================================================================
// WORKFLOW SERVICE
// ============================================================================

/**
 * Main workflow service. Coordinates all workflow subsystems.
 */
export class WorkflowService {
  private store: WorkflowDefinitionStore;
  private triggerEngine: TriggerEngine;
  private executionEngine: WorkflowExecutionEngine;
  private approvalManager: ApprovalGateManager;
  private scheduler: WorkflowScheduler;

  constructor(options?: {
    store?: WorkflowDefinitionStore;
    executionEngine?: WorkflowExecutionEngine;
    approvalManager?: ApprovalGateManager;
    scheduler?: WorkflowScheduler;
  }) {
    this.store = options?.store ?? new WorkflowDefinitionStore();
    this.triggerEngine = new TriggerEngine();
    this.executionEngine =
      options?.executionEngine ??
      new WorkflowExecutionEngine({
        sleepFn: async () => {}, // No actual delays in service layer
        enableAudit: true,
      });
    this.approvalManager =
      options?.approvalManager ?? new ApprovalGateManager(new ApprovalStore());
    this.scheduler =
      options?.scheduler ?? new WorkflowScheduler(new ScheduleStore());

    // Wire up approval callbacks
    this.executionEngine.onApprovalRequest = (runId, stepId, action) => {
      const run = this.executionEngine.getRun(runId);
      if (run) {
        this.approvalManager.createRequest(
          runId,
          stepId,
          run.workflowId,
          action,
        );
      }
    };

    // Wire up scheduler callbacks
    this.scheduler.onScheduleFired = (schedule) => {
      const workflow = this.store.get(schedule.workflowId);
      if (workflow) {
        this.executeWorkflow(workflow.id, {
          type: "schedule",
          scheduledTime: new Date().toISOString(),
        }).catch(() => {
          // Log error but don't throw
        });
      }
    };
  }

  // ==========================================================================
  // WORKFLOW CRUD
  // ==========================================================================

  /**
   * Create a new workflow.
   */
  createWorkflow(workflow: WorkflowDefinition): WorkflowDefinition {
    const validation = validateWorkflowDefinition(workflow);
    if (!validation.valid) {
      const errors = validation.errors.filter((e) => e.severity === "error");
      throw new WorkflowServiceError(
        `Invalid workflow: ${errors.map((e) => e.message).join("; ")}`,
        "INVALID_WORKFLOW",
      );
    }

    this.store.save(workflow);
    this.triggerEngine.registerWorkflow(workflow);

    // Set up schedule if trigger is schedule-based
    if (workflow.trigger.type === "schedule" && workflow.enabled) {
      this.scheduler.createSchedule(workflow);
    }

    return workflow;
  }

  /**
   * Update a workflow.
   */
  updateWorkflow(
    id: string,
    updates: Partial<WorkflowDefinition>,
  ): WorkflowDefinition {
    const existing = this.store.get(id);
    if (!existing) {
      throw new WorkflowServiceError(
        `Workflow not found: ${id}`,
        "WORKFLOW_NOT_FOUND",
      );
    }

    const updated: WorkflowDefinition = {
      ...existing,
      ...updates,
      id: existing.id, // Cannot change ID
      createdBy: existing.createdBy, // Cannot change creator
      createdAt: existing.createdAt, // Cannot change creation time
      updatedAt: new Date().toISOString(),
    };

    const validation = validateWorkflowDefinition(updated);
    if (!validation.valid) {
      const errors = validation.errors.filter((e) => e.severity === "error");
      throw new WorkflowServiceError(
        `Invalid workflow: ${errors.map((e) => e.message).join("; ")}`,
        "INVALID_WORKFLOW",
      );
    }

    this.store.save(updated);

    // Re-register with trigger engine
    this.triggerEngine.unregisterWorkflow(id);
    this.triggerEngine.registerWorkflow(updated);

    // Update schedule
    if (updated.trigger.type === "schedule") {
      this.scheduler.createSchedule(updated);
    }

    return updated;
  }

  /**
   * Delete a workflow.
   */
  deleteWorkflow(id: string): boolean {
    const workflow = this.store.get(id);
    if (!workflow) return false;

    this.triggerEngine.unregisterWorkflow(id);

    // Remove schedule
    const schedule = this.scheduler.getScheduleByWorkflow(id);
    if (schedule) {
      this.scheduler.removeSchedule(schedule.id);
    }

    return this.store.delete(id);
  }

  /**
   * Get a workflow by ID.
   */
  getWorkflow(id: string): WorkflowDefinition | undefined {
    return this.store.get(id);
  }

  /**
   * List workflows.
   */
  listWorkflows(filter?: {
    enabled?: boolean;
    tags?: string[];
    createdBy?: string;
  }): WorkflowDefinition[] {
    return this.store.list(filter);
  }

  /**
   * Enable a workflow.
   */
  enableWorkflow(id: string): WorkflowDefinition {
    return this.updateWorkflow(id, { enabled: true });
  }

  /**
   * Disable a workflow.
   */
  disableWorkflow(id: string): WorkflowDefinition {
    return this.updateWorkflow(id, { enabled: false });
  }

  // ==========================================================================
  // EXECUTION
  // ==========================================================================

  /**
   * Execute a workflow.
   */
  async executeWorkflow(
    workflowId: string,
    triggerInfo: {
      type: string;
      userId?: string;
      eventData?: Record<string, unknown>;
      scheduledTime?: string;
      webhookData?: Record<string, unknown>;
    },
    inputs?: Record<string, unknown>,
  ): Promise<WorkflowRun> {
    const workflow = this.store.get(workflowId);
    if (!workflow) {
      throw new WorkflowServiceError(
        `Workflow not found: ${workflowId}`,
        "WORKFLOW_NOT_FOUND",
      );
    }

    if (!workflow.enabled) {
      throw new WorkflowServiceError(
        `Workflow "${workflow.name}" is disabled`,
        "WORKFLOW_DISABLED",
      );
    }

    return this.executionEngine.startRun(
      workflow,
      triggerInfo as WorkflowRun["triggeredBy"],
      inputs,
    );
  }

  /**
   * Handle an incoming event - evaluate triggers and execute matching workflows.
   */
  async handleEvent(
    eventType: AppEventType,
    eventData: Record<string, unknown>,
  ): Promise<WorkflowRun[]> {
    const matches = this.triggerEngine.evaluateEvent(eventType, eventData);
    const runs: WorkflowRun[] = [];

    for (const match of matches) {
      try {
        const run = await this.executionEngine.startRun(
          match.workflow,
          match.triggerInfo,
        );
        runs.push(run);
      } catch {
        // Log error but continue with other workflows
      }
    }

    return runs;
  }

  /**
   * Cancel a running workflow.
   */
  cancelRun(runId: string): WorkflowRun {
    return this.executionEngine.cancelRun(runId);
  }

  /**
   * Retry a failed workflow run.
   */
  async retryRun(runId: string): Promise<WorkflowRun> {
    const run = this.executionEngine.getRun(runId);
    if (!run) {
      throw new WorkflowServiceError(
        `Run not found: ${runId}`,
        "RUN_NOT_FOUND",
      );
    }

    const workflow = this.store.get(run.workflowId);
    if (!workflow) {
      throw new WorkflowServiceError(
        `Workflow not found: ${run.workflowId}`,
        "WORKFLOW_NOT_FOUND",
      );
    }

    return this.executionEngine.retryRun(runId, workflow);
  }

  /**
   * Get a workflow run.
   */
  getRun(runId: string): WorkflowRun | undefined {
    return this.executionEngine.getRun(runId);
  }

  /**
   * List workflow runs.
   */
  listRuns(filter?: {
    workflowId?: string;
    status?: WorkflowRunStatus;
  }): WorkflowRun[] {
    return this.executionEngine.listRuns(filter);
  }

  // ==========================================================================
  // APPROVALS
  // ==========================================================================

  /**
   * Approve a pending approval request.
   */
  approveRequest(
    requestId: string,
    userId: string,
    comment?: string,
  ): ApprovalRequest {
    return this.approvalManager.approve(requestId, userId, comment);
  }

  /**
   * Reject a pending approval request.
   */
  rejectRequest(
    requestId: string,
    userId: string,
    comment?: string,
  ): ApprovalRequest {
    return this.approvalManager.reject(requestId, userId, comment);
  }

  /**
   * Get pending approvals for a user.
   */
  getPendingApprovals(userId: string): ApprovalRequest[] {
    return this.approvalManager.getPendingForUser(userId);
  }

  // ==========================================================================
  // SCHEDULING
  // ==========================================================================

  /**
   * Get upcoming scheduled executions.
   */
  getUpcomingSchedules(limit?: number): ScheduledExecution[] {
    return this.scheduler.getUpcomingExecutions(limit);
  }

  // ==========================================================================
  // AUDIT
  // ==========================================================================

  /**
   * Get audit log entries.
   */
  getAuditLog(filter?: {
    workflowId?: string;
    runId?: string;
    eventType?: WorkflowAuditEventType;
  }): WorkflowAuditEntry[] {
    return this.executionEngine.getAuditLog(filter);
  }

  /**
   * Clear all state (for testing).
   */
  clear(): void {
    this.store.clear();
    this.triggerEngine.clear();
    this.executionEngine.clear();
    this.approvalManager.clear();
    this.scheduler.clear();
  }
}

// ============================================================================
// ERRORS
// ============================================================================

export class WorkflowServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "WorkflowServiceError";
  }
}
