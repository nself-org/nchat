/**
 * Payout Service
 *
 * Orchestrates the complete payout lifecycle by composing:
 * - PayoutPolicyEngine (policy evaluation)
 * - ApprovalManager (multi-approval workflow)
 * - TreasuryManager (balance and reserve management)
 * - TreasuryAuditLogger (immutable audit trail)
 *
 * Provides high-level methods for:
 * - Creating payout requests
 * - Submitting payouts for approval
 * - Processing approvals/rejections
 * - Executing approved payouts
 * - Cancelling/reversing payouts
 * - Querying payout history
 *
 * @module @/services/billing/payout.service
 * @version 1.0.0
 */

import { logger } from "@/lib/logger";
import {
  type PayoutPolicy,
  type PayoutRequest,
  type PayoutStatus,
  type CreatePayoutInput,
  type ApprovalRecord,
  type ApprovalDecision,
  type ApprovalStatus,
  type PayoutStatusChange,
  type TreasuryAccount,
  PayoutErrorCode,
  PayoutError,
  VALID_PAYOUT_TRANSITIONS,
} from "@/lib/billing/payout-types";
import {
  PayoutPolicyEngine,
  ApprovalManager,
  TreasuryAuditLogger,
  createDefaultPolicy,
  isValidPayoutTransition,
  type PolicyEvaluationContext,
} from "@/lib/billing/payout-policy";
import { TreasuryManager } from "@/lib/billing/treasury-manager";

// ============================================================================
// Types
// ============================================================================

/**
 * Result of creating a payout request.
 */
export interface CreatePayoutResult {
  success: boolean;
  payout?: PayoutRequest;
  policyResult?: {
    allowed: boolean;
    violations: Array<{ ruleId: string; message: string }>;
    warnings: Array<{ ruleId: string; message: string }>;
  };
  error?: string;
}

/**
 * Result of approving/rejecting a payout.
 */
export interface ApprovalResult {
  success: boolean;
  payout?: PayoutRequest;
  approvalStatus?: ApprovalStatus;
  autoTransitioned?: boolean;
  error?: string;
}

/**
 * Result of executing a payout.
 */
export interface ExecutePayoutResult {
  success: boolean;
  payout?: PayoutRequest;
  transactionId?: string;
  error?: string;
}

/**
 * Payout query filters.
 */
export interface PayoutQueryFilters {
  workspaceId?: string;
  status?: PayoutStatus[];
  requestedBy?: string;
  startDate?: number;
  endDate?: number;
  limit?: number;
  offset?: number;
}

/**
 * Payout service configuration.
 */
export interface PayoutServiceConfig {
  /** Custom audit checksum secret */
  auditChecksumSecret?: string;
}

// ============================================================================
// Service Implementation
// ============================================================================

export class PayoutService {
  private policyEngine: PayoutPolicyEngine;
  private approvalManager: ApprovalManager;
  private treasuryManager: TreasuryManager;
  private auditLogger: TreasuryAuditLogger;
  private log = logger.scope("PayoutService");

  /** In-memory payout storage */
  private payouts: Map<string, PayoutRequest> = new Map();
  /** Workspace -> policy mapping */
  private policies: Map<string, PayoutPolicy> = new Map();

  constructor(treasuryManager?: TreasuryManager, config?: PayoutServiceConfig) {
    this.policyEngine = new PayoutPolicyEngine();
    this.approvalManager = new ApprovalManager();
    this.treasuryManager = treasuryManager || new TreasuryManager();
    this.auditLogger = new TreasuryAuditLogger(config?.auditChecksumSecret);
  }

  // --------------------------------------------------------------------------
  // Policy Management
  // --------------------------------------------------------------------------

  /**
   * Set or update the payout policy for a workspace.
   */
  setPolicy(policy: PayoutPolicy): void {
    this.policies.set(policy.workspaceId, policy);

    this.auditLogger.record({
      eventType: "policy_updated",
      actorId: policy.createdBy,
      actorRole: "admin",
      workspaceId: policy.workspaceId,
      description: `Payout policy updated: ${policy.name}`,
    });
  }

  /**
   * Get the policy for a workspace (creates default if none exists).
   */
  getPolicy(workspaceId: string): PayoutPolicy {
    let policy = this.policies.get(workspaceId);
    if (!policy) {
      policy = createDefaultPolicy(workspaceId, "system");
      this.policies.set(workspaceId, policy);
    }
    return policy;
  }

  // --------------------------------------------------------------------------
  // Payout Lifecycle
  // --------------------------------------------------------------------------

  /**
   * Create a new payout request.
   *
   * Steps:
   * 1. Validate input
   * 2. Evaluate policy
   * 3. If policy allows, create payout in "draft" status
   * 4. Record audit entry
   */
  createPayout(input: CreatePayoutInput, now?: number): CreatePayoutResult {
    const timestamp = now ?? Date.now();

    try {
      // Validate basic input
      this.validateCreateInput(input);

      // Get policy
      const policy = this.getPolicy(input.workspaceId);

      // Build evaluation context
      const recentPayouts = this.getRecentPayouts(input.workspaceId);
      const treasuryAccount = this.treasuryManager.getAccountByWorkspace(
        input.workspaceId,
      );

      const context: PolicyEvaluationContext = {
        now: timestamp,
        recentPayouts,
        treasuryAccount,
      };

      // Evaluate policy
      const policyResult = this.policyEngine.evaluate(input, policy, context);

      if (!policyResult.allowed) {
        this.auditLogger.record({
          eventType: "policy_violation",
          actorId: input.requestedBy,
          actorRole: "user",
          workspaceId: input.workspaceId,
          description: `Payout request blocked by policy: ${policyResult.violations.map((v) => v.message).join("; ")}`,
          amount: input.amount,
          currency: input.currency,
          now: timestamp,
        });

        return {
          success: false,
          policyResult: {
            allowed: false,
            violations: policyResult.violations.map((v) => ({
              ruleId: v.ruleId,
              message: v.message,
            })),
            warnings: policyResult.warnings.map((w) => ({
              ruleId: w.ruleId,
              message: w.message,
            })),
          },
          error: `Policy violation: ${policyResult.violations[0]?.message || "Unknown"}`,
        };
      }

      // Create payout request
      const id = `payout_${timestamp}_${Math.random().toString(36).slice(2, 10)}`;
      const payout: PayoutRequest = {
        id,
        workspaceId: input.workspaceId,
        requestedBy: input.requestedBy,
        amount: input.amount,
        currency: input.currency,
        method: input.method,
        recipientId: input.recipientId,
        recipientName: input.recipientName,
        recipientDetails: input.recipientDetails,
        description: input.description,
        category: input.category,
        reference: input.reference,
        status: "draft",
        statusHistory: [],
        createdAt: timestamp,
        updatedAt: timestamp,
        version: 0,
        metadata: input.metadata,
      };

      this.payouts.set(id, payout);

      this.auditLogger.record({
        eventType: "payout_requested",
        actorId: input.requestedBy,
        actorRole: "user",
        workspaceId: input.workspaceId,
        payoutId: id,
        description: `Payout request created: ${input.amount} ${input.currency} to ${input.recipientName}`,
        amount: input.amount,
        currency: input.currency,
        newState: "draft",
        now: timestamp,
      });

      return {
        success: true,
        payout: { ...payout },
        policyResult: {
          allowed: true,
          violations: [],
          warnings: policyResult.warnings.map((w) => ({
            ruleId: w.ruleId,
            message: w.message,
          })),
        },
      };
    } catch (error) {
      this.log.error(
        "Failed to create payout",
        error instanceof Error ? error : new Error(String(error)),
      );
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create payout",
      };
    }
  }

  /**
   * Submit a draft payout for approval.
   *
   * Steps:
   * 1. Validate payout exists and is in 'draft' status
   * 2. Determine approval threshold
   * 3. Create approval status
   * 4. Hold reserve in treasury
   * 5. Transition to 'pending_approval'
   */
  submitForApproval(
    payoutId: string,
    submittedBy: string,
    now?: number,
  ): CreatePayoutResult {
    const timestamp = now ?? Date.now();

    try {
      const payout = this.getPayoutInternal(payoutId);

      if (payout.status !== "draft") {
        throw new PayoutError(
          PayoutErrorCode.INVALID_STATE_TRANSITION,
          `Cannot submit payout in state '${payout.status}' for approval. Must be in 'draft' state.`,
          payoutId,
        );
      }

      const policy = this.getPolicy(payout.workspaceId);

      // Create approval status
      const approvalStatus = this.approvalManager.createApprovalStatus(
        payoutId,
        payout.amount,
        policy,
        timestamp,
      );

      // Hold reserve in treasury
      const account = this.treasuryManager.getAccountByWorkspace(
        payout.workspaceId,
      );
      if (account) {
        this.treasuryManager.holdReserve(
          account.id,
          payout.amount,
          payoutId,
          submittedBy,
          timestamp,
        );

        this.auditLogger.record({
          eventType: "treasury_reserve_hold",
          actorId: submittedBy,
          actorRole: "user",
          workspaceId: payout.workspaceId,
          payoutId,
          accountId: account.id,
          description: `Reserve held for payout: ${payout.amount} ${payout.currency}`,
          amount: payout.amount,
          currency: payout.currency,
          now: timestamp,
        });
      }

      // Transition status
      this.transitionStatus(payout, "pending_approval", submittedBy, timestamp);
      payout.approvalStatus = approvalStatus;

      this.auditLogger.record({
        eventType: "payout_submitted_for_approval",
        actorId: submittedBy,
        actorRole: "user",
        workspaceId: payout.workspaceId,
        payoutId,
        description: `Payout submitted for approval. Required approvals: ${approvalStatus.requiredApprovals}`,
        amount: payout.amount,
        currency: payout.currency,
        previousState: "draft",
        newState: "pending_approval",
        now: timestamp,
      });

      return {
        success: true,
        payout: { ...payout },
      };
    } catch (error) {
      this.log.error(
        "Failed to submit payout for approval",
        error instanceof Error ? error : new Error(String(error)),
      );
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to submit for approval",
      };
    }
  }

  /**
   * Process an approval/rejection decision on a payout.
   *
   * Steps:
   * 1. Validate payout is pending approval
   * 2. Process the approval decision
   * 3. If fully approved, transition to 'approved'
   * 4. If rejected, transition to 'rejected' and release reserve
   */
  processApproval(
    payoutId: string,
    approverId: string,
    approverRole: string,
    decision: ApprovalDecision,
    reason?: string,
    now?: number,
  ): ApprovalResult {
    const timestamp = now ?? Date.now();

    try {
      const payout = this.getPayoutInternal(payoutId);

      if (payout.status !== "pending_approval") {
        throw new PayoutError(
          PayoutErrorCode.INVALID_STATE_TRANSITION,
          `Cannot approve/reject payout in state '${payout.status}'`,
          payoutId,
        );
      }

      if (!payout.approvalStatus) {
        throw new PayoutError(
          PayoutErrorCode.INTERNAL_ERROR,
          "Payout has no approval status",
          payoutId,
        );
      }

      // Check expiry first
      payout.approvalStatus = this.approvalManager.checkExpiry(
        payout.approvalStatus,
        timestamp,
      );
      if (payout.approvalStatus.isExpired) {
        this.transitionStatus(payout, "expired", "system", timestamp);
        this.releaseReserveForPayout(payout, "system", timestamp);

        this.auditLogger.record({
          eventType: "approval_expired",
          actorId: "system",
          actorRole: "system",
          workspaceId: payout.workspaceId,
          payoutId,
          description: "Approval window expired",
          previousState: "pending_approval",
          newState: "expired",
          now: timestamp,
        });

        return {
          success: false,
          payout: { ...payout },
          approvalStatus: payout.approvalStatus,
          error: "Approval window has expired",
        };
      }

      // Create approval record
      const approvalRecord: ApprovalRecord = {
        id: `approval_${timestamp}_${Math.random().toString(36).slice(2, 8)}`,
        payoutId,
        approverId,
        approverRole,
        decision,
        reason,
        timestamp,
      };

      // Process the approval
      payout.approvalStatus = this.approvalManager.processApproval(
        payout.approvalStatus,
        approvalRecord,
        payout.requestedBy,
        timestamp,
      );

      // Log the decision
      this.auditLogger.record({
        eventType:
          decision === "approved" ? "approval_granted" : "approval_denied",
        actorId: approverId,
        actorRole: approverRole,
        workspaceId: payout.workspaceId,
        payoutId,
        approvalId: approvalRecord.id,
        description: `Payout ${decision} by ${approverId} (${approverRole})${reason ? ": " + reason : ""}`,
        amount: payout.amount,
        currency: payout.currency,
        now: timestamp,
      });

      let autoTransitioned = false;

      // If fully approved, transition to 'approved'
      if (payout.approvalStatus.isFullyApproved) {
        this.transitionStatus(payout, "approved", approverId, timestamp);
        autoTransitioned = true;

        this.auditLogger.record({
          eventType: "payout_approved",
          actorId: approverId,
          actorRole: approverRole,
          workspaceId: payout.workspaceId,
          payoutId,
          description: `Payout fully approved (${payout.approvalStatus.currentApprovals}/${payout.approvalStatus.requiredApprovals} approvals)`,
          amount: payout.amount,
          currency: payout.currency,
          previousState: "pending_approval",
          newState: "approved",
          now: timestamp,
        });
      }

      // If rejected, transition to 'rejected' and release reserve
      if (payout.approvalStatus.isRejected) {
        this.transitionStatus(
          payout,
          "rejected" as PayoutStatus,
          approverId,
          timestamp,
        );
        this.releaseReserveForPayout(payout, approverId, timestamp);
        autoTransitioned = true;

        this.auditLogger.record({
          eventType: "payout_rejected",
          actorId: approverId,
          actorRole: approverRole,
          workspaceId: payout.workspaceId,
          payoutId,
          description: `Payout rejected by ${approverId}${reason ? ": " + reason : ""}`,
          amount: payout.amount,
          currency: payout.currency,
          previousState: "pending_approval",
          newState: "cancelled",
          now: timestamp,
        });
      }

      return {
        success: true,
        payout: { ...payout },
        approvalStatus: payout.approvalStatus,
        autoTransitioned,
      };
    } catch (error) {
      if (error instanceof PayoutError) {
        return {
          success: false,
          error: error.message,
        };
      }
      this.log.error(
        "Failed to process approval",
        error instanceof Error ? error : new Error(String(error)),
      );
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to process approval",
      };
    }
  }

  /**
   * Execute an approved payout.
   *
   * Steps:
   * 1. Validate payout is in 'approved' state
   * 2. Transition to 'processing'
   * 3. Execute the treasury payout (remove reserved funds)
   * 4. Transition to 'completed'
   */
  executePayout(
    payoutId: string,
    executedBy: string,
    now?: number,
  ): ExecutePayoutResult {
    const timestamp = now ?? Date.now();

    try {
      const payout = this.getPayoutInternal(payoutId);

      if (payout.status !== "approved") {
        throw new PayoutError(
          PayoutErrorCode.INVALID_STATE_TRANSITION,
          `Cannot execute payout in state '${payout.status}'. Must be 'approved'.`,
          payoutId,
        );
      }

      // Transition to processing
      this.transitionStatus(payout, "processing", executedBy, timestamp);
      payout.processingStartedAt = timestamp;

      this.auditLogger.record({
        eventType: "payout_processing",
        actorId: executedBy,
        actorRole: "admin",
        workspaceId: payout.workspaceId,
        payoutId,
        description: `Payout processing started`,
        amount: payout.amount,
        currency: payout.currency,
        previousState: "approved",
        newState: "processing",
        now: timestamp,
      });

      // Execute treasury payout
      const account = this.treasuryManager.getAccountByWorkspace(
        payout.workspaceId,
      );
      let transactionId: string | undefined;

      if (account) {
        const tx = this.treasuryManager.executePayout(
          account.id,
          payout.amount,
          payoutId,
          executedBy,
          timestamp,
        );
        transactionId = tx.id;
      }

      // Transition to completed
      this.transitionStatus(payout, "completed", executedBy, timestamp);
      payout.completedAt = timestamp;

      this.auditLogger.record({
        eventType: "payout_completed",
        actorId: executedBy,
        actorRole: "admin",
        workspaceId: payout.workspaceId,
        payoutId,
        transactionId,
        description: `Payout completed: ${payout.amount} ${payout.currency} to ${payout.recipientName}`,
        amount: payout.amount,
        currency: payout.currency,
        previousState: "processing",
        newState: "completed",
        now: timestamp,
      });

      return {
        success: true,
        payout: { ...payout },
        transactionId,
      };
    } catch (error) {
      // If processing failed, transition to 'failed'
      const payout = this.payouts.get(payoutId);
      if (payout && payout.status === "processing") {
        this.transitionStatus(payout, "failed", executedBy, timestamp);
        payout.failedAt = timestamp;
        payout.failureReason =
          error instanceof Error ? error.message : "Unknown error";

        this.auditLogger.record({
          eventType: "payout_failed",
          actorId: executedBy,
          actorRole: "admin",
          workspaceId: payout.workspaceId,
          payoutId,
          description: `Payout failed: ${payout.failureReason}`,
          amount: payout.amount,
          currency: payout.currency,
          previousState: "processing",
          newState: "failed",
          now: timestamp,
        });
      }

      return {
        success: false,
        payout: payout ? { ...payout } : undefined,
        error:
          error instanceof Error ? error.message : "Payout execution failed",
      };
    }
  }

  /**
   * Cancel a payout (from any non-terminal state).
   */
  cancelPayout(
    payoutId: string,
    cancelledBy: string,
    reason?: string,
    now?: number,
  ): CreatePayoutResult {
    const timestamp = now ?? Date.now();

    try {
      const payout = this.getPayoutInternal(payoutId);

      if (!isValidPayoutTransition(payout.status, "cancelled")) {
        throw new PayoutError(
          PayoutErrorCode.INVALID_STATE_TRANSITION,
          `Cannot cancel payout in state '${payout.status}'`,
          payoutId,
        );
      }

      const previousStatus = payout.status;
      this.transitionStatus(
        payout,
        "cancelled",
        cancelledBy,
        timestamp,
        reason,
      );

      // Release reserve if held
      if (["pending_approval", "approved"].includes(previousStatus)) {
        this.releaseReserveForPayout(payout, cancelledBy, timestamp);
      }

      this.auditLogger.record({
        eventType: "payout_cancelled",
        actorId: cancelledBy,
        actorRole: "admin",
        workspaceId: payout.workspaceId,
        payoutId,
        description: `Payout cancelled${reason ? ": " + reason : ""}`,
        amount: payout.amount,
        currency: payout.currency,
        previousState: previousStatus,
        newState: "cancelled",
        now: timestamp,
      });

      return {
        success: true,
        payout: { ...payout },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to cancel payout",
      };
    }
  }

  /**
   * Reverse a completed payout.
   */
  reversePayout(
    payoutId: string,
    reversedBy: string,
    reason: string,
    now?: number,
  ): CreatePayoutResult {
    const timestamp = now ?? Date.now();

    try {
      const payout = this.getPayoutInternal(payoutId);

      if (payout.status !== "completed") {
        throw new PayoutError(
          PayoutErrorCode.INVALID_STATE_TRANSITION,
          `Cannot reverse payout in state '${payout.status}'. Must be 'completed'.`,
          payoutId,
        );
      }

      this.transitionStatus(payout, "reversed", reversedBy, timestamp, reason);

      // Credit back to treasury
      const account = this.treasuryManager.getAccountByWorkspace(
        payout.workspaceId,
      );
      if (account) {
        this.treasuryManager.deposit(
          account.id,
          payout.amount,
          `Reversal of payout ${payoutId}: ${reason}`,
          reversedBy,
          { now: timestamp },
        );
      }

      this.auditLogger.record({
        eventType: "payout_reversed",
        actorId: reversedBy,
        actorRole: "admin",
        workspaceId: payout.workspaceId,
        payoutId,
        description: `Payout reversed: ${reason}`,
        amount: payout.amount,
        currency: payout.currency,
        previousState: "completed",
        newState: "reversed",
        now: timestamp,
      });

      return {
        success: true,
        payout: { ...payout },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to reverse payout",
      };
    }
  }

  // --------------------------------------------------------------------------
  // Query Methods
  // --------------------------------------------------------------------------

  /**
   * Get a payout by ID.
   */
  getPayout(payoutId: string): PayoutRequest | undefined {
    const payout = this.payouts.get(payoutId);
    return payout ? { ...payout } : undefined;
  }

  /**
   * Query payouts with filters.
   */
  queryPayouts(filters: PayoutQueryFilters): PayoutRequest[] {
    let results = Array.from(this.payouts.values());

    if (filters.workspaceId) {
      results = results.filter((p) => p.workspaceId === filters.workspaceId);
    }
    if (filters.status && filters.status.length > 0) {
      results = results.filter((p) => filters.status!.includes(p.status));
    }
    if (filters.requestedBy) {
      results = results.filter((p) => p.requestedBy === filters.requestedBy);
    }
    if (filters.startDate !== undefined) {
      results = results.filter((p) => p.createdAt >= filters.startDate!);
    }
    if (filters.endDate !== undefined) {
      results = results.filter((p) => p.createdAt <= filters.endDate!);
    }

    // Sort by creation time descending (newest first)
    results.sort((a, b) => b.createdAt - a.createdAt);

    const offset = filters.offset || 0;
    const limit = filters.limit || results.length;

    return results.slice(offset, offset + limit).map((p) => ({ ...p }));
  }

  /**
   * Get the audit trail for a payout.
   */
  getPayoutAuditTrail(payoutId: string) {
    return this.auditLogger.getPayoutAuditTrail(payoutId);
  }

  /**
   * Get the audit logger (for advanced queries).
   */
  getAuditLogger(): TreasuryAuditLogger {
    return this.auditLogger;
  }

  /**
   * Get the treasury manager.
   */
  getTreasuryManager(): TreasuryManager {
    return this.treasuryManager;
  }

  /**
   * Verify audit chain integrity.
   */
  verifyAuditIntegrity() {
    return this.auditLogger.verifyIntegrity();
  }

  // --------------------------------------------------------------------------
  // Internal Helpers
  // --------------------------------------------------------------------------

  private getPayoutInternal(payoutId: string): PayoutRequest {
    const payout = this.payouts.get(payoutId);
    if (!payout) {
      throw new PayoutError(
        PayoutErrorCode.PAYOUT_NOT_FOUND,
        `Payout ${payoutId} not found`,
        payoutId,
      );
    }
    return payout;
  }

  private validateCreateInput(input: CreatePayoutInput): void {
    if (!input.workspaceId) {
      throw new PayoutError(
        PayoutErrorCode.INVALID_INPUT,
        "workspaceId is required",
      );
    }
    if (!input.requestedBy) {
      throw new PayoutError(
        PayoutErrorCode.INVALID_INPUT,
        "requestedBy is required",
      );
    }
    if (!input.amount || input.amount <= 0) {
      throw new PayoutError(
        PayoutErrorCode.INVALID_INPUT,
        "amount must be positive",
      );
    }
    if (!input.currency) {
      throw new PayoutError(
        PayoutErrorCode.INVALID_INPUT,
        "currency is required",
      );
    }
    if (!input.method) {
      throw new PayoutError(
        PayoutErrorCode.INVALID_INPUT,
        "method is required",
      );
    }
    if (!input.recipientName) {
      throw new PayoutError(
        PayoutErrorCode.INVALID_INPUT,
        "recipientName is required",
      );
    }
    if (!input.description) {
      throw new PayoutError(
        PayoutErrorCode.INVALID_INPUT,
        "description is required",
      );
    }
  }

  private transitionStatus(
    payout: PayoutRequest,
    toStatus: PayoutStatus,
    changedBy: string,
    timestamp: number,
    reason?: string,
  ): void {
    const fromStatus = payout.status;

    // Special handling: 'rejected' maps to 'cancelled' in our state model
    const actualToStatus =
      toStatus === ("rejected" as PayoutStatus) ? "cancelled" : toStatus;

    // Validate only for actual state model transitions
    if (actualToStatus !== toStatus) {
      // It's a rejection mapped to cancelled - allow
    } else if (!isValidPayoutTransition(fromStatus, actualToStatus)) {
      throw new PayoutError(
        PayoutErrorCode.INVALID_STATE_TRANSITION,
        `Invalid state transition from '${fromStatus}' to '${actualToStatus}'`,
        payout.id,
      );
    }

    const statusChange: PayoutStatusChange = {
      fromStatus,
      toStatus: actualToStatus,
      changedBy,
      reason,
      timestamp,
    };

    payout.statusHistory.push(statusChange);
    payout.status = actualToStatus;
    payout.updatedAt = timestamp;
    payout.version += 1;
  }

  private releaseReserveForPayout(
    payout: PayoutRequest,
    releasedBy: string,
    timestamp: number,
  ): void {
    const account = this.treasuryManager.getAccountByWorkspace(
      payout.workspaceId,
    );
    if (account) {
      try {
        this.treasuryManager.releaseReserve(
          account.id,
          payout.amount,
          payout.id,
          releasedBy,
          timestamp,
        );

        this.auditLogger.record({
          eventType: "treasury_reserve_release",
          actorId: releasedBy,
          actorRole: "system",
          workspaceId: payout.workspaceId,
          payoutId: payout.id,
          accountId: account.id,
          description: `Reserve released for payout: ${payout.amount} ${payout.currency}`,
          amount: payout.amount,
          currency: payout.currency,
          now: timestamp,
        });
      } catch (error) {
        this.log.warn("Failed to release reserve", {
          payoutId: payout.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  private getRecentPayouts(workspaceId: string): PayoutRequest[] {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return Array.from(this.payouts.values())
      .filter(
        (p) =>
          p.workspaceId === workspaceId &&
          p.createdAt >= thirtyDaysAgo &&
          !["cancelled", "reversed", "failed"].includes(p.status),
      )
      .sort((a, b) => a.createdAt - b.createdAt);
  }

  /**
   * Clear all data (for testing).
   */
  reset(): void {
    this.payouts.clear();
    this.policies.clear();
    this.auditLogger.clear();
    this.treasuryManager.clear();
  }
}

// ============================================================================
// Singleton
// ============================================================================

let payoutServiceInstance: PayoutService | null = null;

/**
 * Get the singleton payout service.
 */
export function getPayoutService(): PayoutService {
  if (!payoutServiceInstance) {
    payoutServiceInstance = new PayoutService();
  }
  return payoutServiceInstance;
}

/**
 * Create a new payout service with custom configuration.
 */
export function createPayoutService(
  treasuryManager?: TreasuryManager,
  config?: PayoutServiceConfig,
): PayoutService {
  return new PayoutService(treasuryManager, config);
}

/**
 * Reset the singleton (for testing).
 */
export function resetPayoutService(): void {
  payoutServiceInstance = null;
}
