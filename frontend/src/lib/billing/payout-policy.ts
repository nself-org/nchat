/**
 * Payout Policy Engine
 *
 * Deterministic policy evaluation for payout requests including:
 * - Amount limits (min/max per payout, daily/weekly/monthly aggregates)
 * - Frequency limits (max payouts per time window, cooldown periods)
 * - Method and currency restrictions
 * - Time window restrictions (business hours)
 * - Reserve minimum enforcement
 * - Multi-approval threshold determination
 * - Compliance checks
 *
 * @module @/lib/billing/payout-policy
 * @version 1.0.0
 */

import { createHmac } from "crypto";
import { logger } from "@/lib/logger";
import {
  type PayoutPolicy,
  type PayoutPolicyRule,
  type PolicyEvaluationResult,
  type PolicyViolation,
  type ApprovalThreshold,
  type PayoutRequest,
  type CreatePayoutInput,
  type ApprovalRecord,
  type ApprovalStatus,
  type ApprovalDecision,
  type TreasuryAuditEntry,
  type TreasuryAuditEventType,
  type TreasuryAuditFilters,
  type TimeWindowRestriction,
  type TreasuryAccount,
  type PayoutStatus,
  PayoutErrorCode,
  PayoutError,
  VALID_PAYOUT_TRANSITIONS,
  DEFAULT_PAYOUT_POLICY,
} from "./payout-types";

// ============================================================================
// Policy Engine
// ============================================================================

/**
 * Payout policy evaluation engine.
 *
 * Evaluates payout requests against configurable policies to determine
 * whether a payout should be allowed, requires approval, or should be blocked.
 * All evaluation is deterministic given the same inputs.
 */
export class PayoutPolicyEngine {
  private log = logger.scope("PayoutPolicy");

  /**
   * Evaluate a payout request against a policy.
   * Returns all violations and warnings. A blocking violation means the payout is denied.
   */
  evaluate(
    input: CreatePayoutInput,
    policy: PayoutPolicy,
    context: PolicyEvaluationContext,
  ): PolicyEvaluationResult {
    const violations: PolicyViolation[] = [];
    const warnings: PolicyViolation[] = [];
    const appliedRules: string[] = [];

    if (!policy.enabled) {
      return {
        allowed: true,
        violations: [],
        warnings: [],
        appliedRules: ["policy_disabled"],
        evaluatedAt: context.now,
      };
    }

    // 1. Amount limits
    this.checkAmountLimits(input, policy, violations, warnings, appliedRules);

    // 2. Frequency limits
    this.checkFrequencyLimits(
      input,
      policy,
      context,
      violations,
      warnings,
      appliedRules,
    );

    // 3. Aggregate amount limits
    this.checkAggregateLimits(
      input,
      policy,
      context,
      violations,
      warnings,
      appliedRules,
    );

    // 4. Cooldown period
    this.checkCooldownPeriod(
      policy,
      context,
      violations,
      warnings,
      appliedRules,
    );

    // 5. Method restrictions
    this.checkMethodRestrictions(
      input,
      policy,
      violations,
      warnings,
      appliedRules,
    );

    // 6. Currency restrictions
    this.checkCurrencyRestrictions(
      input,
      policy,
      violations,
      warnings,
      appliedRules,
    );

    // 7. Time window restrictions
    this.checkTimeWindowRestrictions(
      policy,
      context,
      violations,
      warnings,
      appliedRules,
    );

    // 8. Reserve minimum
    this.checkReserveMinimum(
      input,
      policy,
      context,
      violations,
      warnings,
      appliedRules,
    );

    // 9. Custom rules
    for (const rule of policy.rules) {
      if (!rule.enabled) continue;
      this.evaluateCustomRule(
        rule,
        input,
        context,
        violations,
        warnings,
        appliedRules,
      );
    }

    const blockingViolations = violations.filter((v) => v.severity === "block");
    const allowed = blockingViolations.length === 0;

    return {
      allowed,
      violations,
      warnings,
      appliedRules,
      evaluatedAt: context.now,
    };
  }

  /**
   * Determine the approval threshold for a payout amount.
   */
  getApprovalThreshold(
    amount: number,
    policy: PayoutPolicy,
  ): ApprovalThreshold | null {
    // Sort thresholds by minAmount descending to find the most specific match
    const sorted = [...policy.approvalThresholds].sort(
      (a, b) => b.minAmount - a.minAmount,
    );

    for (const threshold of sorted) {
      if (amount >= threshold.minAmount && amount < threshold.maxAmount) {
        return threshold;
      }
    }

    // If no threshold matches, use the highest one
    if (sorted.length > 0 && amount >= sorted[0].minAmount) {
      return sorted[0];
    }

    return null;
  }

  // --------------------------------------------------------------------------
  // Private check methods
  // --------------------------------------------------------------------------

  private checkAmountLimits(
    input: CreatePayoutInput,
    policy: PayoutPolicy,
    violations: PolicyViolation[],
    _warnings: PolicyViolation[],
    appliedRules: string[],
  ): void {
    appliedRules.push("min_amount", "max_amount");

    if (input.amount < policy.minPayoutAmount) {
      violations.push({
        ruleId: "min_amount",
        ruleName: "Minimum Payout Amount",
        severity: "block",
        message: `Payout amount ${input.amount} is below minimum ${policy.minPayoutAmount}`,
        details: {
          amount: input.amount,
          minimum: policy.minPayoutAmount,
        },
      });
    }

    if (input.amount > policy.maxPayoutAmount) {
      violations.push({
        ruleId: "max_amount",
        ruleName: "Maximum Payout Amount",
        severity: "block",
        message: `Payout amount ${input.amount} exceeds maximum ${policy.maxPayoutAmount}`,
        details: {
          amount: input.amount,
          maximum: policy.maxPayoutAmount,
        },
      });
    }
  }

  private checkFrequencyLimits(
    _input: CreatePayoutInput,
    policy: PayoutPolicy,
    context: PolicyEvaluationContext,
    violations: PolicyViolation[],
    _warnings: PolicyViolation[],
    appliedRules: string[],
  ): void {
    appliedRules.push("frequency_limit");

    const dayMs = 24 * 60 * 60 * 1000;
    const weekMs = 7 * dayMs;
    const monthMs = 30 * dayMs;

    const dayStart = context.now - dayMs;
    const weekStart = context.now - weekMs;
    const monthStart = context.now - monthMs;

    const dailyCount = context.recentPayouts.filter(
      (p) => p.createdAt >= dayStart,
    ).length;
    const weeklyCount = context.recentPayouts.filter(
      (p) => p.createdAt >= weekStart,
    ).length;
    const monthlyCount = context.recentPayouts.filter(
      (p) => p.createdAt >= monthStart,
    ).length;

    if (dailyCount >= policy.maxPayoutsPerDay) {
      violations.push({
        ruleId: "daily_frequency",
        ruleName: "Daily Frequency Limit",
        severity: "block",
        message: `Daily payout limit exceeded: ${dailyCount}/${policy.maxPayoutsPerDay}`,
        details: {
          current: dailyCount,
          limit: policy.maxPayoutsPerDay,
          period: "daily",
        },
      });
    }

    if (weeklyCount >= policy.maxPayoutsPerWeek) {
      violations.push({
        ruleId: "weekly_frequency",
        ruleName: "Weekly Frequency Limit",
        severity: "block",
        message: `Weekly payout limit exceeded: ${weeklyCount}/${policy.maxPayoutsPerWeek}`,
        details: {
          current: weeklyCount,
          limit: policy.maxPayoutsPerWeek,
          period: "weekly",
        },
      });
    }

    if (monthlyCount >= policy.maxPayoutsPerMonth) {
      violations.push({
        ruleId: "monthly_frequency",
        ruleName: "Monthly Frequency Limit",
        severity: "block",
        message: `Monthly payout limit exceeded: ${monthlyCount}/${policy.maxPayoutsPerMonth}`,
        details: {
          current: monthlyCount,
          limit: policy.maxPayoutsPerMonth,
          period: "monthly",
        },
      });
    }
  }

  private checkAggregateLimits(
    input: CreatePayoutInput,
    policy: PayoutPolicy,
    context: PolicyEvaluationContext,
    violations: PolicyViolation[],
    _warnings: PolicyViolation[],
    appliedRules: string[],
  ): void {
    appliedRules.push("aggregate_limits");

    const dayMs = 24 * 60 * 60 * 1000;
    const weekMs = 7 * dayMs;
    const monthMs = 30 * dayMs;

    const dayStart = context.now - dayMs;
    const weekStart = context.now - weekMs;
    const monthStart = context.now - monthMs;

    const dailyTotal = context.recentPayouts
      .filter((p) => p.createdAt >= dayStart)
      .reduce((sum, p) => sum + p.amount, 0);

    const weeklyTotal = context.recentPayouts
      .filter((p) => p.createdAt >= weekStart)
      .reduce((sum, p) => sum + p.amount, 0);

    const monthlyTotal = context.recentPayouts
      .filter((p) => p.createdAt >= monthStart)
      .reduce((sum, p) => sum + p.amount, 0);

    if (dailyTotal + input.amount > policy.dailyAmountLimit) {
      violations.push({
        ruleId: "daily_amount_limit",
        ruleName: "Daily Amount Limit",
        severity: "block",
        message: `Daily amount limit exceeded: ${dailyTotal + input.amount}/${policy.dailyAmountLimit}`,
        details: {
          currentTotal: dailyTotal,
          requestedAmount: input.amount,
          limit: policy.dailyAmountLimit,
          period: "daily",
        },
      });
    }

    if (weeklyTotal + input.amount > policy.weeklyAmountLimit) {
      violations.push({
        ruleId: "weekly_amount_limit",
        ruleName: "Weekly Amount Limit",
        severity: "block",
        message: `Weekly amount limit exceeded: ${weeklyTotal + input.amount}/${policy.weeklyAmountLimit}`,
        details: {
          currentTotal: weeklyTotal,
          requestedAmount: input.amount,
          limit: policy.weeklyAmountLimit,
          period: "weekly",
        },
      });
    }

    if (monthlyTotal + input.amount > policy.monthlyAmountLimit) {
      violations.push({
        ruleId: "monthly_amount_limit",
        ruleName: "Monthly Amount Limit",
        severity: "block",
        message: `Monthly amount limit exceeded: ${monthlyTotal + input.amount}/${policy.monthlyAmountLimit}`,
        details: {
          currentTotal: monthlyTotal,
          requestedAmount: input.amount,
          limit: policy.monthlyAmountLimit,
          period: "monthly",
        },
      });
    }
  }

  private checkCooldownPeriod(
    policy: PayoutPolicy,
    context: PolicyEvaluationContext,
    violations: PolicyViolation[],
    _warnings: PolicyViolation[],
    appliedRules: string[],
  ): void {
    if (policy.cooldownPeriodMs <= 0) return;

    appliedRules.push("cooldown_period");

    if (context.recentPayouts.length > 0) {
      const lastPayout =
        context.recentPayouts[context.recentPayouts.length - 1];
      const timeSinceLast = context.now - lastPayout.createdAt;

      if (timeSinceLast < policy.cooldownPeriodMs) {
        const remainingMs = policy.cooldownPeriodMs - timeSinceLast;
        violations.push({
          ruleId: "cooldown_period",
          ruleName: "Cooldown Period",
          severity: "block",
          message: `Cooldown period active. Wait ${Math.ceil(remainingMs / 1000)} seconds.`,
          details: {
            cooldownMs: policy.cooldownPeriodMs,
            timeSinceLastMs: timeSinceLast,
            remainingMs,
            lastPayoutAt: lastPayout.createdAt,
          },
        });
      }
    }
  }

  private checkMethodRestrictions(
    input: CreatePayoutInput,
    policy: PayoutPolicy,
    violations: PolicyViolation[],
    _warnings: PolicyViolation[],
    appliedRules: string[],
  ): void {
    appliedRules.push("method_restriction");

    if (
      policy.allowedMethods.length > 0 &&
      !policy.allowedMethods.includes(input.method)
    ) {
      violations.push({
        ruleId: "method_restriction",
        ruleName: "Method Restriction",
        severity: "block",
        message: `Payout method '${input.method}' is not allowed. Allowed: ${policy.allowedMethods.join(", ")}`,
        details: {
          method: input.method,
          allowedMethods: policy.allowedMethods,
        },
      });
    }
  }

  private checkCurrencyRestrictions(
    input: CreatePayoutInput,
    policy: PayoutPolicy,
    violations: PolicyViolation[],
    _warnings: PolicyViolation[],
    appliedRules: string[],
  ): void {
    appliedRules.push("currency_restriction");

    if (
      policy.allowedCurrencies.length > 0 &&
      !policy.allowedCurrencies.includes(input.currency)
    ) {
      violations.push({
        ruleId: "currency_restriction",
        ruleName: "Currency Restriction",
        severity: "block",
        message: `Currency '${input.currency}' is not allowed. Allowed: ${policy.allowedCurrencies.join(", ")}`,
        details: {
          currency: input.currency,
          allowedCurrencies: policy.allowedCurrencies,
        },
      });
    }
  }

  private checkTimeWindowRestrictions(
    policy: PayoutPolicy,
    context: PolicyEvaluationContext,
    violations: PolicyViolation[],
    warnings: PolicyViolation[],
    appliedRules: string[],
  ): void {
    if (policy.timeWindowRestrictions.length === 0) return;

    appliedRules.push("time_window");

    for (const restriction of policy.timeWindowRestrictions) {
      const date = new Date(context.now);
      const dayOfWeek = date.getUTCDay();
      const hour = date.getUTCHours();

      const dayAllowed = restriction.allowedDays.includes(
        dayOfWeek as 0 | 1 | 2 | 3 | 4 | 5 | 6,
      );
      const hourAllowed =
        hour >= restriction.startHourUTC && hour < restriction.endHourUTC;

      if (!dayAllowed || !hourAllowed) {
        const violation: PolicyViolation = {
          ruleId: `time_window:${restriction.id}`,
          ruleName: restriction.name,
          severity: restriction.severity,
          message: `Payout outside allowed time window: ${restriction.name}`,
          details: {
            currentDay: dayOfWeek,
            currentHour: hour,
            allowedDays: restriction.allowedDays,
            startHour: restriction.startHourUTC,
            endHour: restriction.endHourUTC,
          },
        };

        if (restriction.severity === "block") {
          violations.push(violation);
        } else {
          warnings.push(violation);
        }
      }
    }
  }

  private checkReserveMinimum(
    input: CreatePayoutInput,
    policy: PayoutPolicy,
    context: PolicyEvaluationContext,
    violations: PolicyViolation[],
    _warnings: PolicyViolation[],
    appliedRules: string[],
  ): void {
    if (!context.treasuryAccount || policy.minimumReserveFraction <= 0) return;

    appliedRules.push("reserve_minimum");

    const totalBalance = context.treasuryAccount.totalBalance;
    const minimumReserve = totalBalance * policy.minimumReserveFraction;
    const availableAfterPayout =
      context.treasuryAccount.availableBalance - input.amount;

    if (availableAfterPayout < minimumReserve) {
      violations.push({
        ruleId: "reserve_minimum",
        ruleName: "Minimum Reserve",
        severity: "block",
        message: `Payout would breach minimum reserve requirement. Available after: ${availableAfterPayout}, required reserve: ${minimumReserve}`,
        details: {
          totalBalance,
          availableBalance: context.treasuryAccount.availableBalance,
          payoutAmount: input.amount,
          availableAfterPayout,
          minimumReserveFraction: policy.minimumReserveFraction,
          minimumReserve,
        },
      });
    }
  }

  private evaluateCustomRule(
    rule: PayoutPolicyRule,
    input: CreatePayoutInput,
    _context: PolicyEvaluationContext,
    violations: PolicyViolation[],
    warnings: PolicyViolation[],
    appliedRules: string[],
  ): void {
    appliedRules.push(`custom:${rule.id}`);

    // Evaluate based on rule type
    switch (rule.type) {
      case "max_amount": {
        const maxAmount = rule.params.maxAmount as number;
        if (maxAmount && input.amount > maxAmount) {
          const violation: PolicyViolation = {
            ruleId: rule.id,
            ruleName: rule.name,
            severity: rule.severity,
            message:
              rule.description ||
              `Custom max amount exceeded: ${input.amount} > ${maxAmount}`,
            details: { amount: input.amount, maxAmount },
          };
          if (rule.severity === "block") violations.push(violation);
          else warnings.push(violation);
        }
        break;
      }
      case "min_amount": {
        const minAmount = rule.params.minAmount as number;
        if (minAmount && input.amount < minAmount) {
          const violation: PolicyViolation = {
            ruleId: rule.id,
            ruleName: rule.name,
            severity: rule.severity,
            message:
              rule.description ||
              `Custom min amount not met: ${input.amount} < ${minAmount}`,
            details: { amount: input.amount, minAmount },
          };
          if (rule.severity === "block") violations.push(violation);
          else warnings.push(violation);
        }
        break;
      }
      case "recipient_whitelist": {
        const whitelist = rule.params.whitelist as string[] | undefined;
        if (
          whitelist &&
          input.recipientId &&
          !whitelist.includes(input.recipientId)
        ) {
          const violation: PolicyViolation = {
            ruleId: rule.id,
            ruleName: rule.name,
            severity: rule.severity,
            message: `Recipient not on whitelist`,
            details: { recipientId: input.recipientId },
          };
          if (rule.severity === "block") violations.push(violation);
          else warnings.push(violation);
        }
        break;
      }
      default:
        // Unknown rule type - skip
        break;
    }
  }
}

// ============================================================================
// Approval Manager
// ============================================================================

/**
 * Multi-approval workflow manager.
 *
 * Manages the approval lifecycle for payout requests, enforcing:
 * - Threshold-based approval requirements
 * - Role-based approval permissions
 * - Self-approval prevention
 * - Duplicate approval prevention
 * - Approval expiry
 */
export class ApprovalManager {
  private log = logger.scope("ApprovalManager");

  /**
   * Create an approval status for a payout based on its threshold.
   */
  createApprovalStatus(
    payoutId: string,
    amount: number,
    policy: PayoutPolicy,
    now: number,
  ): ApprovalStatus {
    const engine = new PayoutPolicyEngine();
    const threshold = engine.getApprovalThreshold(amount, policy);

    if (!threshold) {
      // No threshold found - require at least 1 approval from owner
      const defaultThreshold: ApprovalThreshold = {
        id: "default",
        name: "Default",
        minAmount: 0,
        maxAmount: Infinity,
        requiredApprovals: 1,
        requiredRoles: ["owner"],
        expiresAfterMs: 24 * 60 * 60 * 1000,
      };

      return {
        payoutId,
        threshold: defaultThreshold,
        requiredApprovals: 1,
        currentApprovals: 0,
        approvals: [],
        rejections: [],
        isFullyApproved: false,
        isRejected: false,
        isExpired: false,
        expiresAt: now + defaultThreshold.expiresAfterMs,
      };
    }

    return {
      payoutId,
      threshold,
      requiredApprovals: threshold.requiredApprovals,
      currentApprovals: 0,
      approvals: [],
      rejections: [],
      isFullyApproved: false,
      isRejected: false,
      isExpired: false,
      expiresAt: now + threshold.expiresAfterMs,
    };
  }

  /**
   * Process an approval decision.
   *
   * Enforces:
   * - Self-approval prevention (cannot approve your own payout)
   * - Duplicate approval prevention (same person cannot approve twice)
   * - Role requirements
   * - Expiry check
   */
  processApproval(
    status: ApprovalStatus,
    approval: ApprovalRecord,
    requestedBy: string,
    now: number,
  ): ApprovalStatus {
    // Check expiry
    if (now >= status.expiresAt) {
      return {
        ...status,
        isExpired: true,
      };
    }

    // Already fully decided
    if (status.isFullyApproved) {
      throw new PayoutError(
        PayoutErrorCode.ALREADY_DECIDED,
        "Payout has already been fully approved",
      );
    }
    if (status.isRejected) {
      throw new PayoutError(
        PayoutErrorCode.ALREADY_DECIDED,
        "Payout has already been rejected",
      );
    }

    // Self-approval prevention
    if (approval.approverId === requestedBy) {
      throw new PayoutError(
        PayoutErrorCode.SELF_APPROVAL_DENIED,
        "Cannot approve your own payout request",
        status.payoutId,
      );
    }

    // Duplicate approval prevention
    const alreadyDecided = [...status.approvals, ...status.rejections].find(
      (a) => a.approverId === approval.approverId,
    );
    if (alreadyDecided) {
      throw new PayoutError(
        PayoutErrorCode.DUPLICATE_APPROVAL,
        "You have already made a decision on this payout",
        status.payoutId,
      );
    }

    // Role check
    if (
      status.threshold.requiredRoles.length > 0 &&
      !status.threshold.requiredRoles.includes(approval.approverRole)
    ) {
      throw new PayoutError(
        PayoutErrorCode.INSUFFICIENT_ROLE,
        `Role '${approval.approverRole}' cannot approve at this threshold. Required: ${status.threshold.requiredRoles.join(", ")}`,
        status.payoutId,
      );
    }

    const updated = { ...status };

    if (approval.decision === "approved") {
      updated.approvals = [...status.approvals, approval];
      updated.currentApprovals = updated.approvals.length;

      if (updated.currentApprovals >= updated.requiredApprovals) {
        updated.isFullyApproved = true;
      }
    } else {
      updated.rejections = [...status.rejections, approval];
      updated.isRejected = true;
    }

    return updated;
  }

  /**
   * Check if an approval status has expired.
   */
  checkExpiry(status: ApprovalStatus, now: number): ApprovalStatus {
    if (status.isFullyApproved || status.isRejected || status.isExpired) {
      return status;
    }

    if (now >= status.expiresAt) {
      return {
        ...status,
        isExpired: true,
      };
    }

    return status;
  }
}

// ============================================================================
// Treasury Audit Logger
// ============================================================================

/**
 * Immutable, append-only audit log for treasury operations.
 *
 * Each entry includes a HMAC checksum computed from the entry contents
 * and the previous entry's checksum, creating a tamper-evident chain.
 */
export class TreasuryAuditLogger {
  private entries: TreasuryAuditEntry[] = [];
  private checksumSecret: string;
  private log = logger.scope("TreasuryAudit");

  constructor(checksumSecret?: string) {
    this.checksumSecret = checksumSecret || "treasury-audit-integrity-key";
  }

  /**
   * Record an audit entry. The entry is immutable once recorded.
   */
  record(params: {
    eventType: TreasuryAuditEventType;
    actorId: string;
    actorRole: string;
    workspaceId: string;
    description: string;
    payoutId?: string;
    accountId?: string;
    approvalId?: string;
    transactionId?: string;
    amount?: number;
    currency?: string;
    previousState?: string;
    newState?: string;
    ipAddress?: string;
    userAgent?: string;
    requestId?: string;
    metadata?: Record<string, unknown>;
    now?: number;
  }): TreasuryAuditEntry {
    const timestamp = params.now ?? Date.now();
    const previousChecksum =
      this.entries.length > 0
        ? this.entries[this.entries.length - 1].checksum
        : undefined;

    // Generate a unique ID
    const id = `audit_${timestamp}_${this.entries.length}_${Math.random().toString(36).slice(2, 10)}`;

    // Compute checksum for tamper detection
    const checksumPayload = JSON.stringify({
      id,
      eventType: params.eventType,
      timestamp,
      actorId: params.actorId,
      workspaceId: params.workspaceId,
      description: params.description,
      amount: params.amount,
      previousChecksum,
    });

    const checksum = createHmac("sha256", this.checksumSecret)
      .update(checksumPayload)
      .digest("hex");

    const entry: TreasuryAuditEntry = {
      id,
      eventType: params.eventType,
      timestamp,
      actorId: params.actorId,
      actorRole: params.actorRole,
      workspaceId: params.workspaceId,
      payoutId: params.payoutId,
      accountId: params.accountId,
      approvalId: params.approvalId,
      transactionId: params.transactionId,
      description: params.description,
      amount: params.amount,
      currency: params.currency as never,
      previousState: params.previousState,
      newState: params.newState,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      requestId: params.requestId,
      checksum,
      previousChecksum,
      metadata: params.metadata,
    };

    // Append (never modify existing entries)
    this.entries.push(Object.freeze(entry) as TreasuryAuditEntry);

    this.log.audit(`Treasury: ${params.eventType}`, params.actorId, {
      payoutId: params.payoutId,
      amount: params.amount,
    });

    return entry;
  }

  /**
   * Query audit entries with filters.
   */
  query(filters: TreasuryAuditFilters): TreasuryAuditEntry[] {
    let results = [...this.entries];

    if (filters.eventTypes && filters.eventTypes.length > 0) {
      results = results.filter((e) =>
        filters.eventTypes!.includes(e.eventType),
      );
    }
    if (filters.actorId) {
      results = results.filter((e) => e.actorId === filters.actorId);
    }
    if (filters.workspaceId) {
      results = results.filter((e) => e.workspaceId === filters.workspaceId);
    }
    if (filters.payoutId) {
      results = results.filter((e) => e.payoutId === filters.payoutId);
    }
    if (filters.accountId) {
      results = results.filter((e) => e.accountId === filters.accountId);
    }
    if (filters.startTime !== undefined) {
      results = results.filter((e) => e.timestamp >= filters.startTime!);
    }
    if (filters.endTime !== undefined) {
      results = results.filter((e) => e.timestamp <= filters.endTime!);
    }

    // Apply pagination
    const offset = filters.offset || 0;
    const limit = filters.limit || results.length;

    return results.slice(offset, offset + limit);
  }

  /**
   * Verify the integrity of the audit chain.
   * Returns true if no tampering is detected.
   */
  verifyIntegrity(): { valid: boolean; brokenAt?: number; details?: string } {
    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i];

      // Verify chain linkage
      if (i > 0) {
        const previousEntry = this.entries[i - 1];
        if (entry.previousChecksum !== previousEntry.checksum) {
          return {
            valid: false,
            brokenAt: i,
            details: `Chain broken at entry ${i}: previousChecksum mismatch`,
          };
        }
      } else {
        if (entry.previousChecksum !== undefined) {
          return {
            valid: false,
            brokenAt: 0,
            details: "First entry should not have a previousChecksum",
          };
        }
      }

      // Verify entry checksum
      const checksumPayload = JSON.stringify({
        id: entry.id,
        eventType: entry.eventType,
        timestamp: entry.timestamp,
        actorId: entry.actorId,
        workspaceId: entry.workspaceId,
        description: entry.description,
        amount: entry.amount,
        previousChecksum: entry.previousChecksum,
      });

      const expectedChecksum = createHmac("sha256", this.checksumSecret)
        .update(checksumPayload)
        .digest("hex");

      if (entry.checksum !== expectedChecksum) {
        return {
          valid: false,
          brokenAt: i,
          details: `Checksum mismatch at entry ${i}: expected ${expectedChecksum}, got ${entry.checksum}`,
        };
      }
    }

    return { valid: true };
  }

  /**
   * Get all entries for a specific payout (complete audit trail).
   */
  getPayoutAuditTrail(payoutId: string): TreasuryAuditEntry[] {
    return this.entries.filter((e) => e.payoutId === payoutId);
  }

  /**
   * Get total count of entries.
   */
  get size(): number {
    return this.entries.length;
  }

  /**
   * Get all entries (read-only copies).
   */
  getAll(): TreasuryAuditEntry[] {
    return [...this.entries];
  }

  /**
   * Clear all entries (for testing only).
   */
  clear(): void {
    this.entries = [];
  }
}

// ============================================================================
// Context Type for Policy Evaluation
// ============================================================================

/**
 * Context provided to the policy engine for evaluation.
 */
export interface PolicyEvaluationContext {
  /** Current timestamp (for deterministic evaluation) */
  now: number;
  /** Recent payouts for frequency/aggregate checks */
  recentPayouts: PayoutRequest[];
  /** Treasury account for balance/reserve checks */
  treasuryAccount?: TreasuryAccount;
}

// ============================================================================
// State Machine
// ============================================================================

/**
 * Validate a payout state transition.
 */
export function isValidPayoutTransition(
  from: PayoutStatus,
  to: PayoutStatus,
): boolean {
  const allowed = VALID_PAYOUT_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

/**
 * Get all valid transitions from a state.
 */
export function getValidPayoutTransitions(from: PayoutStatus): PayoutStatus[] {
  return VALID_PAYOUT_TRANSITIONS[from] || [];
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a default payout policy for a workspace.
 */
export function createDefaultPolicy(
  workspaceId: string,
  createdBy: string,
  now?: number,
): PayoutPolicy {
  const timestamp = now ?? Date.now();
  return {
    ...DEFAULT_PAYOUT_POLICY,
    id: `policy_${workspaceId}`,
    workspaceId,
    createdBy,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

let policyEngineInstance: PayoutPolicyEngine | null = null;

/**
 * Get the singleton policy engine.
 */
export function getPayoutPolicyEngine(): PayoutPolicyEngine {
  if (!policyEngineInstance) {
    policyEngineInstance = new PayoutPolicyEngine();
  }
  return policyEngineInstance;
}

/**
 * Reset the singleton (for testing).
 */
export function resetPayoutPolicyEngine(): void {
  policyEngineInstance = null;
}

let approvalManagerInstance: ApprovalManager | null = null;

/**
 * Get the singleton approval manager.
 */
export function getApprovalManager(): ApprovalManager {
  if (!approvalManagerInstance) {
    approvalManagerInstance = new ApprovalManager();
  }
  return approvalManagerInstance;
}

/**
 * Reset the singleton (for testing).
 */
export function resetApprovalManager(): void {
  approvalManagerInstance = null;
}
