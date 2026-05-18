/**
 * Subscription State Machine
 *
 * Manages valid subscription state transitions with validation,
 * proration calculation, and audit logging.
 *
 * @module @/lib/billing/subscription-state-machine
 * @version 1.0.0
 */

import { v4 as uuidv4 } from "uuid";
import type { PlanTier, BillingInterval } from "@/types/subscription.types";
import {
  SubscriptionState,
  StateTransition,
  StateTransitionTrigger,
  StateTransitionEvent,
  StateTransitionAuditEntry,
  SubscriptionEntity,
  SubscriptionStateInfo,
  SUBSCRIPTION_STATE_INFO,
  ProrationPreview,
  ProrationLineItem,
  ProrationCalculationInput,
  ProrationBehavior,
  PlanChangeDirection,
  PlanChangeValidation,
  PlanChangeError,
  PlanChangeWarning,
  PlanChangeErrorCode,
  PauseState,
  PauseLimits,
  DEFAULT_PAUSE_LIMITS,
  SubscriptionError,
  SubscriptionErrorCode,
  SubscriptionLifecycleEvent,
  SubscriptionLifecycleEventType,
} from "./subscription-types";
import { PLAN_LIMITS, PLAN_PRICING, comparePlans } from "./plan-config";

// ============================================================================
// State Transition Matrix
// ============================================================================

/**
 * Valid state transitions matrix.
 * Key: fromState, Value: Map of toState -> allowed triggers
 */
const STATE_TRANSITION_MATRIX: Record<
  SubscriptionState,
  Partial<Record<SubscriptionState, StateTransitionTrigger[]>>
> = {
  trial: {
    active: ["trial_converted", "payment_succeeded"],
    canceled: ["subscription_canceled", "trial_ended"],
  },
  active: {
    grace: ["grace_period_started", "payment_failed"],
    past_due: ["payment_failed"],
    paused: ["subscription_paused"],
    canceled: ["subscription_canceled"],
  },
  grace: {
    active: ["payment_succeeded", "payment_recovered"],
    past_due: ["grace_period_ended"],
    canceled: ["subscription_canceled"],
  },
  past_due: {
    active: ["payment_succeeded", "payment_recovered"],
    canceled: ["subscription_canceled", "payment_failed"],
  },
  paused: {
    active: ["subscription_resumed"],
    canceled: ["subscription_canceled"],
  },
  canceled: {
    active: ["subscription_reactivated"],
  },
};

// ============================================================================
// State Machine Class
// ============================================================================

/**
 * Subscription state machine for managing lifecycle transitions.
 */
export class SubscriptionStateMachine {
  private subscription: SubscriptionEntity;
  private auditLog: StateTransitionAuditEntry[] = [];
  private pendingEvents: SubscriptionLifecycleEvent[] = [];

  constructor(subscription: SubscriptionEntity) {
    this.subscription = { ...subscription };
  }

  /**
   * Get current state.
   */
  getState(): SubscriptionState {
    return this.subscription.state;
  }

  /**
   * Get state information.
   */
  getStateInfo(): SubscriptionStateInfo {
    return SUBSCRIPTION_STATE_INFO[this.subscription.state];
  }

  /**
   * Check if a transition is valid.
   */
  canTransition(
    toState: SubscriptionState,
    trigger: StateTransitionTrigger,
  ): boolean {
    const fromState = this.subscription.state;
    const allowedTransitions = STATE_TRANSITION_MATRIX[fromState]?.[toState];

    if (!allowedTransitions) {
      return false;
    }

    return allowedTransitions.includes(trigger);
  }

  /**
   * Get all valid transitions from current state.
   */
  getValidTransitions(): Array<{
    toState: SubscriptionState;
    triggers: StateTransitionTrigger[];
  }> {
    const fromState = this.subscription.state;
    const transitions = STATE_TRANSITION_MATRIX[fromState];

    if (!transitions) {
      return [];
    }

    return Object.entries(transitions).map(([toState, triggers]) => ({
      toState: toState as SubscriptionState,
      triggers: triggers as StateTransitionTrigger[],
    }));
  }

  /**
   * Execute a state transition.
   */
  transition(
    toState: SubscriptionState,
    trigger: StateTransitionTrigger,
    actor: {
      type: "user" | "system" | "admin" | "webhook";
      id: string;
      email?: string;
    },
    metadata: Record<string, unknown> = {},
  ): StateTransitionEvent {
    const fromState = this.subscription.state;

    if (!this.canTransition(toState, trigger)) {
      throw new SubscriptionError(
        SubscriptionErrorCode.INVALID_STATE_TRANSITION,
        `Cannot transition from ${fromState} to ${toState} with trigger ${trigger}`,
        this.subscription.id,
        { fromState, toState, trigger },
      );
    }

    // Create audit entry
    const auditEntry: StateTransitionAuditEntry = {
      timestamp: new Date(),
      action: `${fromState} -> ${toState}`,
      actor: actor.id,
      actorType: actor.type,
      details: { trigger, ...metadata },
    };
    this.auditLog.push(auditEntry);

    // Update subscription state
    const previousState = this.subscription.previousState;
    this.subscription.previousState = fromState;
    this.subscription.state = toState;
    this.subscription.stateChangedAt = new Date();
    this.subscription.updatedAt = new Date();

    // Create transition event
    const event: StateTransitionEvent = {
      id: uuidv4(),
      subscriptionId: this.subscription.id,
      workspaceId: this.subscription.workspaceId,
      fromState,
      toState,
      trigger,
      triggeredBy: actor.id,
      triggeredAt: new Date(),
      metadata,
      auditLog: [auditEntry],
    };

    // Add lifecycle event
    this.addLifecycleEvent(
      this.mapTriggerToEventType(trigger, fromState, toState),
      actor,
      { fromState, toState, trigger, ...metadata },
    );

    // Handle state-specific logic
    this.handleStateEntry(toState, trigger, metadata);

    return event;
  }

  /**
   * Handle state entry logic.
   */
  private handleStateEntry(
    state: SubscriptionState,
    trigger: StateTransitionTrigger,
    metadata: Record<string, unknown>,
  ): void {
    switch (state) {
      case "active":
        // Clear pause state if resuming
        if (trigger === "subscription_resumed") {
          this.subscription.pauseState = {
            isPaused: false,
            pausedAt: null,
            pauseReason: null,
            pauseBehavior: null,
            pauseDurationType: null,
            scheduledResumeAt: null,
            maxPauseDurationDays: DEFAULT_PAUSE_LIMITS.maxPauseDurationDays,
            pauseCountInPeriod: this.subscription.pauseState.pauseCountInPeriod,
            maxPausesPerPeriod: this.subscription.pauseState.maxPausesPerPeriod,
          };
        }
        // Clear grace period if payment recovered
        if (
          trigger === "payment_recovered" ||
          trigger === "payment_succeeded"
        ) {
          this.subscription.graceStartedAt = null;
          this.subscription.graceEndsAt = null;
        }
        // Set trial conversion timestamp
        if (trigger === "trial_converted") {
          this.subscription.trialConvertedAt = new Date();
        }
        break;

      case "grace":
        this.subscription.graceStartedAt = new Date();
        // Grace period typically lasts 7 days
        const graceEndDate = new Date();
        graceEndDate.setDate(graceEndDate.getDate() + 7);
        this.subscription.graceEndsAt = graceEndDate;
        break;

      case "paused":
        this.subscription.pauseState.isPaused = true;
        this.subscription.pauseState.pausedAt = new Date();
        this.subscription.pauseState.pauseCountInPeriod += 1;
        if (metadata.pauseReason) {
          this.subscription.pauseState.pauseReason =
            metadata.pauseReason as string;
        }
        break;

      case "canceled":
        this.subscription.canceledAt = new Date();
        if (metadata.reasonCategory) {
          this.subscription.cancellationReason = metadata.reasonCategory as any;
        }
        if (metadata.feedback) {
          this.subscription.cancellationFeedback = metadata.feedback as string;
        }
        break;
    }
  }

  /**
   * Map trigger to lifecycle event type.
   */
  private mapTriggerToEventType(
    trigger: StateTransitionTrigger,
    fromState: SubscriptionState,
    toState: SubscriptionState,
  ): SubscriptionLifecycleEventType {
    const triggerMap: Record<
      StateTransitionTrigger,
      SubscriptionLifecycleEventType
    > = {
      trial_started: "subscription.trial_started",
      trial_ended: "subscription.trial_ended",
      trial_converted: "subscription.trial_converted",
      payment_succeeded: "subscription.payment_succeeded",
      payment_failed: "subscription.payment_failed",
      payment_recovered: "subscription.payment_succeeded",
      grace_period_started: "subscription.grace_started",
      grace_period_ended: "subscription.grace_ended",
      subscription_paused: "subscription.paused",
      subscription_resumed: "subscription.resumed",
      subscription_canceled: "subscription.canceled",
      subscription_reactivated: "subscription.reactivated",
      plan_upgraded: "subscription.upgraded",
      plan_downgraded: "subscription.downgraded",
      period_renewed: "subscription.renewed",
      admin_override: "subscription.activated",
    };

    return triggerMap[trigger] || "subscription.activated";
  }

  /**
   * Add a lifecycle event.
   */
  private addLifecycleEvent(
    type: SubscriptionLifecycleEventType,
    actor: {
      type: "user" | "system" | "admin" | "webhook";
      id: string;
      email?: string;
    },
    data: Record<string, unknown>,
  ): void {
    this.pendingEvents.push({
      id: uuidv4(),
      type,
      subscriptionId: this.subscription.id,
      workspaceId: this.subscription.workspaceId,
      organizationId: this.subscription.organizationId,
      timestamp: new Date(),
      actor,
      data,
      previousState: this.subscription.previousState || undefined,
      newState: this.subscription.state,
    });
  }

  /**
   * Get pending events.
   */
  getPendingEvents(): SubscriptionLifecycleEvent[] {
    return [...this.pendingEvents];
  }

  /**
   * Clear pending events.
   */
  clearPendingEvents(): void {
    this.pendingEvents = [];
  }

  /**
   * Get audit log.
   */
  getAuditLog(): StateTransitionAuditEntry[] {
    return [...this.auditLog];
  }

  /**
   * Get updated subscription.
   */
  getSubscription(): SubscriptionEntity {
    return { ...this.subscription };
  }
}

// ============================================================================
// Proration Calculator
// ============================================================================

/**
 * Calculate proration for plan changes.
 */
export class ProrationCalculator {
  /**
   * Calculate proration preview for a plan change.
   */
  static calculate(input: ProrationCalculationInput): ProrationPreview {
    const now = input.changeDate;
    const periodStart = input.currentPeriodStart;
    const periodEnd = input.currentPeriodEnd;

    // Calculate days in period and remaining
    const totalDaysInPeriod = Math.ceil(
      (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24),
    );
    const daysElapsed = Math.ceil(
      (now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24),
    );
    const daysRemaining = totalDaysInPeriod - daysElapsed;

    // Calculate daily rates
    const currentDailyRate = input.currentPlanPriceCents / totalDaysInPeriod;
    const newDailyRate = input.newPlanPriceCents / totalDaysInPeriod;

    // Calculate credit for unused portion of current plan
    const currentPlanCredit = Math.round(currentDailyRate * daysRemaining);

    // Calculate charge for remaining portion of new plan
    const newPlanCharge = Math.round(newDailyRate * daysRemaining);

    // Net amount
    const netAmount = newPlanCharge - currentPlanCredit;
    const isCredit = netAmount < 0;

    // Create line items
    const lineItems: ProrationLineItem[] = [
      {
        description: `Credit for unused time on ${input.currentPlan} plan`,
        amount: -currentPlanCredit,
        quantity: daysRemaining,
        unitAmount: Math.round(currentDailyRate),
        periodStart: now,
        periodEnd: periodEnd,
        type: "credit",
        planTier: input.currentPlan,
      },
      {
        description: `Charge for ${input.newPlan} plan (prorated)`,
        amount: newPlanCharge,
        quantity: daysRemaining,
        unitAmount: Math.round(newDailyRate),
        periodStart: now,
        periodEnd: periodEnd,
        type: "charge",
        planTier: input.newPlan,
      },
    ];

    return {
      method: "time_based",
      currency: "USD",
      currentPlanCredit,
      currentPlanDaysRemaining: daysRemaining,
      currentPlanDailyRate: Math.round(currentDailyRate),
      newPlanCharge,
      newPlanDaysRemaining: daysRemaining,
      newPlanDailyRate: Math.round(newDailyRate),
      netAmount: Math.abs(netAmount),
      isCredit,
      effectiveDate: now,
      nextBillingDate: periodEnd,
      lineItems,
    };
  }

  /**
   * Get proration behavior based on plan change direction.
   */
  static getProrationBehavior(
    direction: PlanChangeDirection,
    isImmediateChange: boolean,
  ): ProrationBehavior {
    if (!isImmediateChange) {
      return "none";
    }

    switch (direction) {
      case "upgrade":
        return "create_prorations";
      case "downgrade":
        return "none"; // Downgrades typically take effect at period end
      case "lateral":
        return "none";
    }
  }
}

// ============================================================================
// Plan Change Validator
// ============================================================================

/**
 * Validate plan change requests.
 */
export class PlanChangeValidator {
  /**
   * Validate a plan change.
   */
  static validate(
    subscription: SubscriptionEntity,
    newPlan: PlanTier,
    newInterval: BillingInterval,
    currentUsage: { members: number; channels: number; storageBytes: number },
  ): PlanChangeValidation {
    const errors: PlanChangeError[] = [];
    const warnings: PlanChangeWarning[] = [];
    const currentPlan = subscription.plan;
    const currentInterval = subscription.interval;

    // Determine change direction
    const direction = this.getChangeDirection(currentPlan, newPlan);

    // Check if same plan and interval
    if (currentPlan === newPlan && currentInterval === newInterval) {
      errors.push({
        code: "SAME_PLAN",
        message: "No change in plan or billing interval",
      });
    }

    // Check subscription state allows changes
    const stateInfo = SUBSCRIPTION_STATE_INFO[subscription.state];
    if (direction === "upgrade" && !stateInfo.canUpgrade) {
      errors.push({
        code: "STATE_NOT_ALLOWED",
        message: `Cannot upgrade while subscription is ${subscription.state}`,
      });
    }
    if (direction === "downgrade" && !stateInfo.canDowngrade) {
      errors.push({
        code: "STATE_NOT_ALLOWED",
        message: `Cannot downgrade while subscription is ${subscription.state}`,
      });
    }

    // Check custom plan restriction
    if (newPlan === "custom") {
      errors.push({
        code: "CUSTOM_PLAN_CONTACT_SALES",
        message: "Custom plans require contacting sales",
      });
    }

    // Check pending changes
    if (subscription.pendingPlanChange) {
      errors.push({
        code: "PENDING_CHANGE_EXISTS",
        message: "A plan change is already pending",
      });
    }

    // Check usage limits for downgrades
    if (direction === "downgrade") {
      const newLimits = PLAN_LIMITS[newPlan];

      if (
        newLimits.maxMembers !== null &&
        currentUsage.members > newLimits.maxMembers
      ) {
        errors.push({
          code: "USAGE_EXCEEDS_LIMIT",
          message: `Current member count (${currentUsage.members}) exceeds ${newPlan} plan limit (${newLimits.maxMembers})`,
          field: "members",
          currentValue: currentUsage.members,
          requiredValue: newLimits.maxMembers,
        });
      }

      if (
        newLimits.maxChannels !== null &&
        currentUsage.channels > newLimits.maxChannels
      ) {
        errors.push({
          code: "USAGE_EXCEEDS_LIMIT",
          message: `Current channel count (${currentUsage.channels}) exceeds ${newPlan} plan limit (${newLimits.maxChannels})`,
          field: "channels",
          currentValue: currentUsage.channels,
          requiredValue: newLimits.maxChannels,
        });
      }

      if (
        newLimits.maxStorageBytes !== null &&
        currentUsage.storageBytes > newLimits.maxStorageBytes
      ) {
        const currentGB = (
          currentUsage.storageBytes /
          (1024 * 1024 * 1024)
        ).toFixed(1);
        const limitGB = (
          newLimits.maxStorageBytes /
          (1024 * 1024 * 1024)
        ).toFixed(1);
        errors.push({
          code: "USAGE_EXCEEDS_LIMIT",
          message: `Current storage (${currentGB} GB) exceeds ${newPlan} plan limit (${limitGB} GB)`,
          field: "storage",
          currentValue: currentUsage.storageBytes,
          requiredValue: newLimits.maxStorageBytes,
        });
      }
    }

    // Check interval availability
    const newPricing = PLAN_PRICING[newPlan];
    if (newInterval === "yearly" && newPricing.yearly === null) {
      errors.push({
        code: "INTERVAL_NOT_AVAILABLE",
        message: `Yearly billing is not available for the ${newPlan} plan`,
      });
    }

    // Add warnings for downgrades
    if (direction === "downgrade") {
      warnings.push({
        code: "DOWNGRADE_FEATURES",
        message: "Some features may become unavailable after downgrade",
        severity: "warning",
      });
    }

    // Calculate effective timing
    const effectiveTiming =
      direction === "upgrade" ? "immediate" : "period_end";

    // Calculate proration preview if valid
    let prorationPreview: ProrationPreview | undefined;
    if (errors.length === 0 && direction === "upgrade") {
      prorationPreview = ProrationCalculator.calculate({
        currentPlan,
        newPlan,
        currentInterval,
        newInterval,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        changeDate: new Date(),
        currentPlanPriceCents:
          currentInterval === "monthly"
            ? PLAN_PRICING[currentPlan].monthly
            : (PLAN_PRICING[currentPlan].yearly ?? 0) / 12,
        newPlanPriceCents:
          newInterval === "monthly"
            ? PLAN_PRICING[newPlan].monthly
            : (PLAN_PRICING[newPlan].yearly ?? 0) / 12,
      });
    }

    // Calculate usage impact
    const usageImpact = this.calculateUsageImpact(
      currentPlan,
      newPlan,
      currentUsage,
    );

    return {
      isValid: errors.length === 0,
      direction,
      errors,
      warnings,
      effectiveTiming,
      prorationPreview,
      usageImpact,
    };
  }

  /**
   * Get plan change direction.
   */
  static getChangeDirection(
    currentPlan: PlanTier,
    newPlan: PlanTier,
  ): PlanChangeDirection {
    const comparison = comparePlans(newPlan, currentPlan);
    if (comparison > 0) return "upgrade";
    if (comparison < 0) return "downgrade";
    return "lateral";
  }

  /**
   * Calculate usage impact of plan change.
   */
  private static calculateUsageImpact(
    currentPlan: PlanTier,
    newPlan: PlanTier,
    currentUsage: { members: number; channels: number; storageBytes: number },
  ) {
    const currentLimits = PLAN_LIMITS[currentPlan];
    const newLimits = PLAN_LIMITS[newPlan];

    return {
      membersImpact: {
        currentUsage: currentUsage.members,
        currentLimit: currentLimits.maxMembers,
        newLimit: newLimits.maxMembers,
        isOverLimit:
          newLimits.maxMembers !== null &&
          currentUsage.members > newLimits.maxMembers,
        actionRequired:
          newLimits.maxMembers !== null &&
          currentUsage.members > newLimits.maxMembers
            ? `Remove ${currentUsage.members - newLimits.maxMembers} members before downgrade`
            : undefined,
      },
      channelsImpact: {
        currentUsage: currentUsage.channels,
        currentLimit: currentLimits.maxChannels,
        newLimit: newLimits.maxChannels,
        isOverLimit:
          newLimits.maxChannels !== null &&
          currentUsage.channels > newLimits.maxChannels,
        actionRequired:
          newLimits.maxChannels !== null &&
          currentUsage.channels > newLimits.maxChannels
            ? `Archive ${currentUsage.channels - newLimits.maxChannels} channels before downgrade`
            : undefined,
      },
      storageImpact: {
        currentUsage: currentUsage.storageBytes,
        currentLimit: currentLimits.maxStorageBytes,
        newLimit: newLimits.maxStorageBytes,
        isOverLimit:
          newLimits.maxStorageBytes !== null &&
          currentUsage.storageBytes > newLimits.maxStorageBytes,
        actionRequired:
          newLimits.maxStorageBytes !== null &&
          currentUsage.storageBytes > newLimits.maxStorageBytes
            ? `Delete files to reduce storage usage before downgrade`
            : undefined,
      },
      featuresLost: this.getFeaturesDiff(currentPlan, newPlan).lost,
      featuresGained: this.getFeaturesDiff(currentPlan, newPlan).gained,
    };
  }

  /**
   * Get features difference between plans.
   */
  private static getFeaturesDiff(
    currentPlan: PlanTier,
    newPlan: PlanTier,
  ): { lost: string[]; gained: string[] } {
    // This would compare PLAN_FEATURES but we simplify here
    const lost: string[] = [];
    const gained: string[] = [];

    const direction = this.getChangeDirection(currentPlan, newPlan);

    // Common features that differ between tiers
    const features = [
      "voiceMessages",
      "videoCalls",
      "screenSharing",
      "customEmoji",
      "webhooks",
      "integrations",
      "apiAccess",
      "sso",
      "auditLogs",
      "adminDashboard",
      "prioritySupport",
      "customBranding",
      "dataExport",
    ];

    // Import actual features for comparison
    const { PLAN_FEATURES } = require("./plan-config");
    const currentFeatures = PLAN_FEATURES[currentPlan];
    const newFeatures = PLAN_FEATURES[newPlan];

    for (const feature of features) {
      if (currentFeatures[feature] === true && newFeatures[feature] === false) {
        lost.push(feature);
      }
      if (currentFeatures[feature] === false && newFeatures[feature] === true) {
        gained.push(feature);
      }
    }

    return { lost, gained };
  }
}

// ============================================================================
// Pause Validator
// ============================================================================

/**
 * Validate subscription pause requests.
 */
export class PauseValidator {
  /**
   * Validate if subscription can be paused.
   */
  static canPause(
    subscription: SubscriptionEntity,
    limits: PauseLimits = DEFAULT_PAUSE_LIMITS,
  ): { canPause: boolean; reason?: string } {
    const stateInfo = SUBSCRIPTION_STATE_INFO[subscription.state];

    // Check state allows pausing
    if (!stateInfo.canPause) {
      return {
        canPause: false,
        reason: `Cannot pause subscription in ${subscription.state} state`,
      };
    }

    // Check trial period
    if (subscription.state === "trial" && !limits.allowPauseInTrial) {
      return {
        canPause: false,
        reason: "Cannot pause during trial period",
      };
    }

    // Check grace period
    if (subscription.state === "grace" && !limits.allowPauseInGrace) {
      return {
        canPause: false,
        reason: "Cannot pause during grace period",
      };
    }

    // Check max pauses per year
    if (subscription.pauseState.pauseCountInPeriod >= limits.maxPausesPerYear) {
      return {
        canPause: false,
        reason: `Maximum of ${limits.maxPausesPerYear} pauses per year exceeded`,
      };
    }

    // Check minimum days between pauses
    if (subscription.pauseState.pausedAt) {
      const lastPauseEnd =
        subscription.pauseState.scheduledResumeAt || new Date();
      const daysSinceLastPause = Math.ceil(
        (new Date().getTime() - lastPauseEnd.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysSinceLastPause < limits.minDaysBetweenPauses) {
        return {
          canPause: false,
          reason: `Must wait ${limits.minDaysBetweenPauses - daysSinceLastPause} more days before pausing again`,
        };
      }
    }

    return { canPause: true };
  }

  /**
   * Calculate pause end date.
   */
  static calculatePauseEndDate(
    durationType: "indefinite" | "fixed" | "until_date",
    durationDays?: number,
    resumeDate?: Date,
    maxDurationDays: number = DEFAULT_PAUSE_LIMITS.maxPauseDurationDays,
  ): Date | null {
    const now = new Date();

    switch (durationType) {
      case "indefinite":
        // Set to max pause duration
        const maxEndDate = new Date(now);
        maxEndDate.setDate(maxEndDate.getDate() + maxDurationDays);
        return maxEndDate;

      case "fixed":
        if (durationDays) {
          const endDate = new Date(now);
          const clampedDays = Math.min(durationDays, maxDurationDays);
          endDate.setDate(endDate.getDate() + clampedDays);
          return endDate;
        }
        return null;

      case "until_date":
        if (resumeDate) {
          // Clamp to max duration
          const maxDate = new Date(now);
          maxDate.setDate(maxDate.getDate() + maxDurationDays);
          return resumeDate > maxDate ? maxDate : resumeDate;
        }
        return null;
    }
  }
}

// ============================================================================
// Billing Cycle Calculator
// ============================================================================

/**
 * Calculate billing cycle dates and amounts.
 */
export class BillingCycleCalculator {
  /**
   * Calculate next billing date.
   */
  static calculateNextBillingDate(
    currentPeriodEnd: Date,
    interval: BillingInterval,
  ): Date {
    const nextDate = new Date(currentPeriodEnd);

    if (interval === "monthly") {
      nextDate.setMonth(nextDate.getMonth() + 1);
    } else {
      nextDate.setFullYear(nextDate.getFullYear() + 1);
    }

    return nextDate;
  }

  /**
   * Calculate period dates for a new period.
   */
  static calculatePeriodDates(
    startDate: Date,
    interval: BillingInterval,
  ): { periodStart: Date; periodEnd: Date } {
    const periodStart = new Date(startDate);
    const periodEnd = new Date(startDate);

    if (interval === "monthly") {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }

    return { periodStart, periodEnd };
  }

  /**
   * Calculate days until renewal.
   */
  static calculateDaysUntilRenewal(currentPeriodEnd: Date): number {
    const now = new Date();
    const diff = currentPeriodEnd.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  /**
   * Calculate trial end date.
   */
  static calculateTrialEndDate(startDate: Date, trialDays: number): Date {
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + trialDays);
    return endDate;
  }

  /**
   * Calculate trial days remaining.
   */
  static calculateTrialDaysRemaining(trialEndsAt: Date): number {
    const now = new Date();
    const diff = trialEndsAt.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  /**
   * Check if currently in trial.
   */
  static isInTrial(trialEndsAt: Date | null): boolean {
    if (!trialEndsAt) return false;
    return new Date() < trialEndsAt;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new subscription state machine.
 */
export function createStateMachine(
  subscription: SubscriptionEntity,
): SubscriptionStateMachine {
  return new SubscriptionStateMachine(subscription);
}

/**
 * Create initial subscription entity.
 */
export function createInitialSubscription(
  workspaceId: string,
  organizationId: string,
  plan: PlanTier,
  interval: BillingInterval,
  createdBy: string,
  trialDays: number = 14,
): SubscriptionEntity {
  const now = new Date();
  const trialEndsAt = BillingCycleCalculator.calculateTrialEndDate(
    now,
    trialDays,
  );
  const { periodStart, periodEnd } =
    BillingCycleCalculator.calculatePeriodDates(now, interval);

  return {
    id: uuidv4(),
    workspaceId,
    organizationId,
    plan,
    interval,
    state: trialDays > 0 ? "trial" : "active",
    stateChangedAt: now,
    previousState: null,
    trialStartedAt: trialDays > 0 ? now : null,
    trialEndsAt: trialDays > 0 ? trialEndsAt : null,
    trialDaysRemaining: trialDays > 0 ? trialDays : null,
    trialConvertedAt: null,
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    billingAnchor: {
      type: "subscription_start",
    },
    stripeSubscriptionId: null,
    stripeCustomerId: null,
    stripePriceId: null,
    lastPaymentAt: null,
    lastPaymentAmount: null,
    lastPaymentStatus: null,
    graceStartedAt: null,
    graceEndsAt: null,
    pauseState: {
      isPaused: false,
      pausedAt: null,
      pauseReason: null,
      pauseBehavior: null,
      pauseDurationType: null,
      scheduledResumeAt: null,
      maxPauseDurationDays: DEFAULT_PAUSE_LIMITS.maxPauseDurationDays,
      pauseCountInPeriod: 0,
      maxPausesPerPeriod: DEFAULT_PAUSE_LIMITS.maxPausesPerYear,
    },
    canceledAt: null,
    cancelAtPeriodEnd: false,
    cancellationReason: null,
    cancellationFeedback: null,
    pendingPlanChange: null,
    createdAt: now,
    updatedAt: now,
    createdBy,
    stateHistory: [],
  };
}

/**
 * Get subscription summary for display.
 */
export function getSubscriptionSummary(subscription: SubscriptionEntity) {
  const stateInfo = SUBSCRIPTION_STATE_INFO[subscription.state];
  const isInTrial = BillingCycleCalculator.isInTrial(subscription.trialEndsAt);
  const trialDaysRemaining = subscription.trialEndsAt
    ? BillingCycleCalculator.calculateTrialDaysRemaining(
        subscription.trialEndsAt,
      )
    : null;

  return {
    id: subscription.id,
    plan: subscription.plan,
    planName:
      subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1),
    interval: subscription.interval,
    state: subscription.state,
    stateInfo,
    hasAccess: stateInfo.isAccessGranted,
    accessExpiresAt: subscription.cancelAtPeriodEnd
      ? subscription.currentPeriodEnd
      : null,
    isInTrial,
    trialDaysRemaining,
    nextBillingDate:
      subscription.state === "active" ? subscription.currentPeriodEnd : null,
    nextBillingAmount:
      subscription.state === "active"
        ? subscription.interval === "monthly"
          ? PLAN_PRICING[subscription.plan].monthly
          : PLAN_PRICING[subscription.plan].yearly
        : null,
    currency: "USD" as const,
    isPastDue: subscription.state === "past_due",
    isGracePeriod: subscription.state === "grace",
    isPaused: subscription.state === "paused",
    isCanceling: subscription.cancelAtPeriodEnd,
    canUpgrade: stateInfo.canUpgrade,
    canDowngrade: stateInfo.canDowngrade,
    canPause: stateInfo.canPause,
    canResume: stateInfo.canResume,
    canCancel: stateInfo.canCancel,
  };
}
