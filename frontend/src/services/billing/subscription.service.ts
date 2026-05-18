/**
 * Subscription Service
 *
 * High-level service for managing subscription lifecycle operations.
 * Handles creation, plan changes, pause/resume, and cancellation.
 *
 * @module @/services/billing/subscription.service
 * @version 1.0.0
 */

import { v4 as uuidv4 } from "uuid";
import type { PlanTier, BillingInterval } from "@/types/subscription.types";
import {
  SubscriptionState,
  SubscriptionEntity,
  SubscriptionSummary,
  SubscriptionOperationResult,
  SubscriptionError,
  SubscriptionErrorCode,
  SubscriptionLifecycleEvent,
  SubscriptionLifecycleEventType,
  StateTransitionTrigger,
  StateTransitionAuditEntry,
  PlanChangeRequest,
  PlanChangeValidation,
  PauseRequest,
  ResumeRequest,
  PauseState,
  PauseLimits,
  DEFAULT_PAUSE_LIMITS,
  CancellationRequest,
  CancellationConfirmation,
  CancellationFeedback,
  CANCELLATION_REASONS,
  RenewalInfo,
  PendingPlanChange,
  BillingCycle,
  BillingCycleStatus,
  ProrationPreview,
  SubscriptionFilterOptions,
} from "@/lib/billing/subscription-types";
import {
  SubscriptionStateMachine,
  ProrationCalculator,
  PlanChangeValidator,
  PauseValidator,
  BillingCycleCalculator,
  createStateMachine,
  createInitialSubscription,
  getSubscriptionSummary,
} from "@/lib/billing/subscription-state-machine";
import {
  PLAN_PRICING,
  PLAN_LIMITS,
  comparePlans,
} from "@/lib/billing/plan-config";
import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

/**
 * Actor performing operations.
 */
export interface OperationActor {
  type: "user" | "system" | "admin" | "webhook";
  id: string;
  email?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Current usage for validation.
 */
export interface CurrentUsage {
  members: number;
  channels: number;
  storageBytes: number;
}

/**
 * Create subscription options.
 */
export interface CreateSubscriptionOptions {
  workspaceId: string;
  organizationId: string;
  plan: PlanTier;
  interval: BillingInterval;
  trialDays?: number;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
}

/**
 * Subscription repository interface.
 */
export interface SubscriptionRepository {
  findById(id: string): Promise<SubscriptionEntity | null>;
  findByWorkspaceId(workspaceId: string): Promise<SubscriptionEntity | null>;
  findMany(options: SubscriptionFilterOptions): Promise<SubscriptionEntity[]>;
  create(subscription: SubscriptionEntity): Promise<SubscriptionEntity>;
  update(
    id: string,
    data: Partial<SubscriptionEntity>,
  ): Promise<SubscriptionEntity>;
  delete(id: string): Promise<void>;
  saveEvent(event: SubscriptionLifecycleEvent): Promise<void>;
  saveFeedback(feedback: CancellationFeedback): Promise<void>;
}

// ============================================================================
// In-Memory Repository (for testing/development)
// ============================================================================

/**
 * In-memory subscription repository.
 */
export class InMemorySubscriptionRepository implements SubscriptionRepository {
  private subscriptions: Map<string, SubscriptionEntity> = new Map();
  private events: SubscriptionLifecycleEvent[] = [];
  private feedback: CancellationFeedback[] = [];

  async findById(id: string): Promise<SubscriptionEntity | null> {
    return this.subscriptions.get(id) || null;
  }

  async findByWorkspaceId(
    workspaceId: string,
  ): Promise<SubscriptionEntity | null> {
    for (const subscription of this.subscriptions.values()) {
      if (subscription.workspaceId === workspaceId) {
        return subscription;
      }
    }
    return null;
  }

  async findMany(
    options: SubscriptionFilterOptions,
  ): Promise<SubscriptionEntity[]> {
    let results = Array.from(this.subscriptions.values());

    if (options.states && options.states.length > 0) {
      results = results.filter((s) => options.states!.includes(s.state));
    }

    if (options.plans && options.plans.length > 0) {
      results = results.filter((s) => options.plans!.includes(s.plan));
    }

    if (options.intervals && options.intervals.length > 0) {
      results = results.filter((s) => options.intervals!.includes(s.interval));
    }

    if (options.workspaceId) {
      results = results.filter((s) => s.workspaceId === options.workspaceId);
    }

    if (options.organizationId) {
      results = results.filter(
        (s) => s.organizationId === options.organizationId,
      );
    }

    if (options.trialEndingBefore) {
      results = results.filter(
        (s) => s.trialEndsAt && s.trialEndsAt < options.trialEndingBefore!,
      );
    }

    if (options.renewingBefore) {
      results = results.filter(
        (s) => s.currentPeriodEnd < options.renewingBefore!,
      );
    }

    if (options.createdAfter) {
      results = results.filter((s) => s.createdAt > options.createdAfter!);
    }

    if (options.createdBefore) {
      results = results.filter((s) => s.createdAt < options.createdBefore!);
    }

    // Apply pagination
    const offset = options.offset ?? 0;
    const limit = options.limit ?? 100;

    return results.slice(offset, offset + limit);
  }

  async create(subscription: SubscriptionEntity): Promise<SubscriptionEntity> {
    this.subscriptions.set(subscription.id, subscription);
    return subscription;
  }

  async update(
    id: string,
    data: Partial<SubscriptionEntity>,
  ): Promise<SubscriptionEntity> {
    const existing = this.subscriptions.get(id);
    if (!existing) {
      throw new SubscriptionError(
        SubscriptionErrorCode.SUBSCRIPTION_NOT_FOUND,
        `Subscription not found: ${id}`,
        id,
      );
    }

    const updated = { ...existing, ...data, updatedAt: new Date() };
    this.subscriptions.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.subscriptions.delete(id);
  }

  async saveEvent(event: SubscriptionLifecycleEvent): Promise<void> {
    this.events.push(event);
  }

  async saveFeedback(feedback: CancellationFeedback): Promise<void> {
    this.feedback.push(feedback);
  }

  // Test helpers
  clear(): void {
    this.subscriptions.clear();
    this.events = [];
    this.feedback = [];
  }

  getEvents(): SubscriptionLifecycleEvent[] {
    return [...this.events];
  }

  getFeedback(): CancellationFeedback[] {
    return [...this.feedback];
  }
}

// ============================================================================
// Subscription Service
// ============================================================================

/**
 * Service for managing subscription lifecycle.
 */
export class SubscriptionService {
  private repository: SubscriptionRepository;
  private pauseLimits: PauseLimits;

  constructor(
    repository: SubscriptionRepository,
    pauseLimits: PauseLimits = DEFAULT_PAUSE_LIMITS,
  ) {
    this.repository = repository;
    this.pauseLimits = pauseLimits;
  }

  // ==========================================================================
  // CRUD Operations
  // ==========================================================================

  /**
   * Create a new subscription.
   */
  async createSubscription(
    options: CreateSubscriptionOptions,
    actor: OperationActor,
  ): Promise<SubscriptionOperationResult<SubscriptionEntity>> {
    try {
      const subscription = createInitialSubscription(
        options.workspaceId,
        options.organizationId,
        options.plan,
        options.interval,
        actor.id,
        options.trialDays ?? 14,
      );

      // Set Stripe references if provided
      if (options.stripeCustomerId) {
        subscription.stripeCustomerId = options.stripeCustomerId;
      }
      if (options.stripeSubscriptionId) {
        subscription.stripeSubscriptionId = options.stripeSubscriptionId;
      }
      if (options.stripePriceId) {
        subscription.stripePriceId = options.stripePriceId;
      }

      // Save subscription
      const saved = await this.repository.create(subscription);

      // Create event
      const event = this.createEvent("subscription.created", saved, actor, {
        plan: options.plan,
        interval: options.interval,
        trialDays: options.trialDays,
      });
      await this.repository.saveEvent(event);

      // Add trial started event if applicable
      if (options.trialDays && options.trialDays > 0) {
        const trialEvent = this.createEvent(
          "subscription.trial_started",
          saved,
          actor,
          { trialDays: options.trialDays, trialEndsAt: saved.trialEndsAt },
        );
        await this.repository.saveEvent(trialEvent);
      }

      return {
        success: true,
        data: saved,
        events: [event],
        auditEntries: [],
      };
    } catch (error) {
      logger.error("Failed to create subscription", { error, options });
      return {
        success: false,
        error:
          error instanceof SubscriptionError
            ? error
            : new SubscriptionError(
                SubscriptionErrorCode.INTERNAL_ERROR,
                error instanceof Error
                  ? error.message
                  : "Failed to create subscription",
              ),
        events: [],
        auditEntries: [],
      };
    }
  }

  /**
   * Get subscription by ID.
   */
  async getSubscription(id: string): Promise<SubscriptionEntity | null> {
    return this.repository.findById(id);
  }

  /**
   * Get subscription by workspace ID.
   */
  async getSubscriptionByWorkspace(
    workspaceId: string,
  ): Promise<SubscriptionEntity | null> {
    return this.repository.findByWorkspaceId(workspaceId);
  }

  /**
   * Get subscription summary.
   */
  async getSubscriptionSummary(
    id: string,
  ): Promise<SubscriptionSummary | null> {
    const subscription = await this.repository.findById(id);
    if (!subscription) return null;
    return getSubscriptionSummary(subscription);
  }

  /**
   * List subscriptions with filters.
   */
  async listSubscriptions(
    options: SubscriptionFilterOptions,
  ): Promise<SubscriptionEntity[]> {
    return this.repository.findMany(options);
  }

  // ==========================================================================
  // State Transitions
  // ==========================================================================

  /**
   * Transition subscription state.
   */
  async transitionState(
    subscriptionId: string,
    toState: SubscriptionState,
    trigger: StateTransitionTrigger,
    actor: OperationActor,
    metadata: Record<string, unknown> = {},
  ): Promise<SubscriptionOperationResult<SubscriptionEntity>> {
    try {
      const subscription = await this.repository.findById(subscriptionId);
      if (!subscription) {
        return {
          success: false,
          error: new SubscriptionError(
            SubscriptionErrorCode.SUBSCRIPTION_NOT_FOUND,
            `Subscription not found: ${subscriptionId}`,
            subscriptionId,
          ),
          events: [],
          auditEntries: [],
        };
      }

      const stateMachine = createStateMachine(subscription);

      // Execute transition
      const transitionEvent = stateMachine.transition(
        toState,
        trigger,
        actor,
        metadata,
      );

      // Get updated subscription
      const updated = stateMachine.getSubscription();

      // Persist changes
      await this.repository.update(subscriptionId, updated);

      // Save events
      const events = stateMachine.getPendingEvents();
      for (const event of events) {
        await this.repository.saveEvent(event);
      }

      return {
        success: true,
        data: updated,
        events,
        auditEntries: stateMachine.getAuditLog(),
      };
    } catch (error) {
      logger.error("Failed to transition subscription state", {
        error,
        subscriptionId,
        toState,
        trigger,
      });

      return {
        success: false,
        error:
          error instanceof SubscriptionError
            ? error
            : new SubscriptionError(
                SubscriptionErrorCode.INTERNAL_ERROR,
                error instanceof Error
                  ? error.message
                  : "Failed to transition state",
                subscriptionId,
              ),
        events: [],
        auditEntries: [],
      };
    }
  }

  // ==========================================================================
  // Plan Change Operations
  // ==========================================================================

  /**
   * Validate a plan change request.
   */
  async validatePlanChange(
    subscriptionId: string,
    newPlan: PlanTier,
    newInterval: BillingInterval,
    currentUsage: CurrentUsage,
  ): Promise<PlanChangeValidation> {
    const subscription = await this.repository.findById(subscriptionId);
    if (!subscription) {
      return {
        isValid: false,
        direction: "lateral",
        errors: [
          {
            code: "INVALID_PLAN" as any,
            message: `Subscription not found: ${subscriptionId}`,
          },
        ],
        warnings: [],
        effectiveTiming: "immediate",
      };
    }

    return PlanChangeValidator.validate(
      subscription,
      newPlan,
      newInterval,
      currentUsage,
    );
  }

  /**
   * Change subscription plan.
   */
  async changePlan(
    request: PlanChangeRequest,
    actor: OperationActor,
    currentUsage: CurrentUsage,
  ): Promise<SubscriptionOperationResult<SubscriptionEntity>> {
    try {
      const subscription = await this.repository.findById(
        request.subscriptionId,
      );
      if (!subscription) {
        return {
          success: false,
          error: new SubscriptionError(
            SubscriptionErrorCode.SUBSCRIPTION_NOT_FOUND,
            `Subscription not found: ${request.subscriptionId}`,
            request.subscriptionId,
          ),
          events: [],
          auditEntries: [],
        };
      }

      // Validate the change
      const validation = PlanChangeValidator.validate(
        subscription,
        request.newPlan,
        request.newInterval ?? subscription.interval,
        currentUsage,
      );

      if (!validation.isValid) {
        return {
          success: false,
          error: new SubscriptionError(
            SubscriptionErrorCode.INVALID_PLAN_CHANGE,
            validation.errors.map((e) => e.message).join("; "),
            request.subscriptionId,
            { errors: validation.errors },
          ),
          events: [],
          auditEntries: [],
        };
      }

      const events: SubscriptionLifecycleEvent[] = [];
      const auditEntries: StateTransitionAuditEntry[] = [];
      const newInterval = request.newInterval ?? subscription.interval;

      // Handle immediate changes
      if (validation.effectiveTiming === "immediate") {
        // Update subscription
        const updated = await this.repository.update(request.subscriptionId, {
          plan: request.newPlan,
          interval: newInterval,
          updatedAt: new Date(),
        });

        // Create appropriate event
        const eventType: SubscriptionLifecycleEventType =
          validation.direction === "upgrade"
            ? "subscription.upgraded"
            : validation.direction === "downgrade"
              ? "subscription.downgraded"
              : "subscription.plan_changed";

        const event = this.createEvent(eventType, updated, actor, {
          previousPlan: request.currentPlan,
          newPlan: request.newPlan,
          previousInterval: subscription.interval,
          newInterval,
          direction: validation.direction,
          proration: validation.prorationPreview,
        });
        events.push(event);
        await this.repository.saveEvent(event);

        // Add proration event if applicable
        if (validation.prorationPreview) {
          const prorationEvent = this.createEvent(
            "subscription.proration_created",
            updated,
            actor,
            { proration: validation.prorationPreview },
          );
          events.push(prorationEvent);
          await this.repository.saveEvent(prorationEvent);
        }

        return {
          success: true,
          data: updated,
          events,
          auditEntries,
        };
      }

      // Handle scheduled changes (period_end)
      const pendingChange: PendingPlanChange = {
        id: uuidv4(),
        subscriptionId: request.subscriptionId,
        currentPlan: request.currentPlan,
        newPlan: request.newPlan,
        currentInterval: subscription.interval,
        newInterval,
        effectiveDate: subscription.currentPeriodEnd,
        createdAt: new Date(),
        createdBy: actor.id,
      };

      const updated = await this.repository.update(request.subscriptionId, {
        pendingPlanChange: pendingChange,
        updatedAt: new Date(),
      });

      const event = this.createEvent(
        "subscription.plan_changed",
        updated,
        actor,
        {
          pendingChange,
          effectiveDate: subscription.currentPeriodEnd,
          direction: validation.direction,
        },
      );
      events.push(event);
      await this.repository.saveEvent(event);

      return {
        success: true,
        data: updated,
        events,
        auditEntries,
      };
    } catch (error) {
      logger.error("Failed to change plan", { error, request });
      return {
        success: false,
        error:
          error instanceof SubscriptionError
            ? error
            : new SubscriptionError(
                SubscriptionErrorCode.INTERNAL_ERROR,
                error instanceof Error
                  ? error.message
                  : "Failed to change plan",
                request.subscriptionId,
              ),
        events: [],
        auditEntries: [],
      };
    }
  }

  /**
   * Calculate proration for plan change.
   */
  async calculateProration(
    subscriptionId: string,
    newPlan: PlanTier,
    newInterval: BillingInterval,
  ): Promise<ProrationPreview | null> {
    const subscription = await this.repository.findById(subscriptionId);
    if (!subscription) return null;

    const currentPricing = PLAN_PRICING[subscription.plan];
    const newPricing = PLAN_PRICING[newPlan];

    const currentPriceCents =
      subscription.interval === "monthly"
        ? currentPricing.monthly
        : (currentPricing.yearly ?? 0) / 12;

    const newPriceCents =
      newInterval === "monthly"
        ? newPricing.monthly
        : (newPricing.yearly ?? 0) / 12;

    return ProrationCalculator.calculate({
      currentPlan: subscription.plan,
      newPlan,
      currentInterval: subscription.interval,
      newInterval,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      changeDate: new Date(),
      currentPlanPriceCents: currentPriceCents,
      newPlanPriceCents: newPriceCents,
    });
  }

  /**
   * Cancel pending plan change.
   */
  async cancelPendingPlanChange(
    subscriptionId: string,
    actor: OperationActor,
  ): Promise<SubscriptionOperationResult<SubscriptionEntity>> {
    try {
      const subscription = await this.repository.findById(subscriptionId);
      if (!subscription) {
        return {
          success: false,
          error: new SubscriptionError(
            SubscriptionErrorCode.SUBSCRIPTION_NOT_FOUND,
            `Subscription not found: ${subscriptionId}`,
            subscriptionId,
          ),
          events: [],
          auditEntries: [],
        };
      }

      if (!subscription.pendingPlanChange) {
        return {
          success: false,
          error: new SubscriptionError(
            SubscriptionErrorCode.INVALID_REQUEST,
            "No pending plan change to cancel",
            subscriptionId,
          ),
          events: [],
          auditEntries: [],
        };
      }

      const updated = await this.repository.update(subscriptionId, {
        pendingPlanChange: null,
        updatedAt: new Date(),
      });

      const event = this.createEvent(
        "subscription.plan_changed",
        updated,
        actor,
        {
          action: "pending_change_cancelled",
          cancelledChange: subscription.pendingPlanChange,
        },
      );
      await this.repository.saveEvent(event);

      return {
        success: true,
        data: updated,
        events: [event],
        auditEntries: [],
      };
    } catch (error) {
      logger.error("Failed to cancel pending plan change", {
        error,
        subscriptionId,
      });
      return {
        success: false,
        error:
          error instanceof SubscriptionError
            ? error
            : new SubscriptionError(
                SubscriptionErrorCode.INTERNAL_ERROR,
                error instanceof Error
                  ? error.message
                  : "Failed to cancel pending change",
                subscriptionId,
              ),
        events: [],
        auditEntries: [],
      };
    }
  }

  // ==========================================================================
  // Pause/Resume Operations
  // ==========================================================================

  /**
   * Check if subscription can be paused.
   */
  async canPause(
    subscriptionId: string,
  ): Promise<{ canPause: boolean; reason?: string }> {
    const subscription = await this.repository.findById(subscriptionId);
    if (!subscription) {
      return { canPause: false, reason: "Subscription not found" };
    }
    return PauseValidator.canPause(subscription, this.pauseLimits);
  }

  /**
   * Pause subscription.
   */
  async pauseSubscription(
    request: PauseRequest,
    actor: OperationActor,
  ): Promise<SubscriptionOperationResult<SubscriptionEntity>> {
    try {
      const subscription = await this.repository.findById(
        request.subscriptionId,
      );
      if (!subscription) {
        return {
          success: false,
          error: new SubscriptionError(
            SubscriptionErrorCode.SUBSCRIPTION_NOT_FOUND,
            `Subscription not found: ${request.subscriptionId}`,
            request.subscriptionId,
          ),
          events: [],
          auditEntries: [],
        };
      }

      // Validate pause is allowed
      const validation = PauseValidator.canPause(
        subscription,
        this.pauseLimits,
      );
      if (!validation.canPause) {
        return {
          success: false,
          error: new SubscriptionError(
            SubscriptionErrorCode.PAUSE_NOT_ALLOWED,
            validation.reason || "Cannot pause subscription",
            request.subscriptionId,
          ),
          events: [],
          auditEntries: [],
        };
      }

      // Calculate resume date
      const scheduledResumeAt = PauseValidator.calculatePauseEndDate(
        request.durationType,
        request.durationDays,
        request.resumeDate,
        this.pauseLimits.maxPauseDurationDays,
      );

      // Handle immediate pause
      if (request.behavior === "immediate") {
        return this.transitionState(
          request.subscriptionId,
          "paused",
          "subscription_paused",
          actor,
          {
            pauseReason: request.reason,
            durationType: request.durationType,
            durationDays: request.durationDays,
            scheduledResumeAt,
          },
        );
      }

      // Schedule pause for period end
      const updatedPauseState: PauseState = {
        ...subscription.pauseState,
        pauseBehavior: request.behavior,
        pauseDurationType: request.durationType,
        pauseReason: request.reason || null,
        scheduledResumeAt,
      };

      const updated = await this.repository.update(request.subscriptionId, {
        pauseState: updatedPauseState,
        updatedAt: new Date(),
      });

      const event = this.createEvent("subscription.paused", updated, actor, {
        scheduledFor: "period_end",
        effectiveDate: subscription.currentPeriodEnd,
        durationType: request.durationType,
        scheduledResumeAt,
      });
      await this.repository.saveEvent(event);

      return {
        success: true,
        data: updated,
        events: [event],
        auditEntries: [],
      };
    } catch (error) {
      logger.error("Failed to pause subscription", { error, request });
      return {
        success: false,
        error:
          error instanceof SubscriptionError
            ? error
            : new SubscriptionError(
                SubscriptionErrorCode.INTERNAL_ERROR,
                error instanceof Error
                  ? error.message
                  : "Failed to pause subscription",
                request.subscriptionId,
              ),
        events: [],
        auditEntries: [],
      };
    }
  }

  /**
   * Resume subscription.
   */
  async resumeSubscription(
    request: ResumeRequest,
    actor: OperationActor,
  ): Promise<SubscriptionOperationResult<SubscriptionEntity>> {
    try {
      const subscription = await this.repository.findById(
        request.subscriptionId,
      );
      if (!subscription) {
        return {
          success: false,
          error: new SubscriptionError(
            SubscriptionErrorCode.SUBSCRIPTION_NOT_FOUND,
            `Subscription not found: ${request.subscriptionId}`,
            request.subscriptionId,
          ),
          events: [],
          auditEntries: [],
        };
      }

      if (subscription.state !== "paused") {
        return {
          success: false,
          error: new SubscriptionError(
            SubscriptionErrorCode.NOT_PAUSED,
            "Subscription is not paused",
            request.subscriptionId,
          ),
          events: [],
          auditEntries: [],
        };
      }

      return this.transitionState(
        request.subscriptionId,
        "active",
        "subscription_resumed",
        actor,
        { resumeImmediately: request.resumeImmediately },
      );
    } catch (error) {
      logger.error("Failed to resume subscription", { error, request });
      return {
        success: false,
        error:
          error instanceof SubscriptionError
            ? error
            : new SubscriptionError(
                SubscriptionErrorCode.INTERNAL_ERROR,
                error instanceof Error
                  ? error.message
                  : "Failed to resume subscription",
                request.subscriptionId,
              ),
        events: [],
        auditEntries: [],
      };
    }
  }

  // ==========================================================================
  // Cancellation Operations
  // ==========================================================================

  /**
   * Cancel subscription.
   */
  async cancelSubscription(
    request: CancellationRequest,
    actor: OperationActor,
  ): Promise<SubscriptionOperationResult<CancellationConfirmation>> {
    try {
      const subscription = await this.repository.findById(
        request.subscriptionId,
      );
      if (!subscription) {
        return {
          success: false,
          error: new SubscriptionError(
            SubscriptionErrorCode.SUBSCRIPTION_NOT_FOUND,
            `Subscription not found: ${request.subscriptionId}`,
            request.subscriptionId,
          ),
          events: [],
          auditEntries: [],
        };
      }

      if (subscription.state === "canceled") {
        return {
          success: false,
          error: new SubscriptionError(
            SubscriptionErrorCode.ALREADY_CANCELED,
            "Subscription is already canceled",
            request.subscriptionId,
          ),
          events: [],
          auditEntries: [],
        };
      }

      const events: SubscriptionLifecycleEvent[] = [];
      const cancellationDate = new Date();
      const effectiveDate =
        request.behavior === "immediate"
          ? cancellationDate
          : subscription.currentPeriodEnd;
      const accessUntil = effectiveDate;

      // Handle immediate cancellation
      if (request.behavior === "immediate") {
        const result = await this.transitionState(
          request.subscriptionId,
          "canceled",
          "subscription_canceled",
          actor,
          {
            reasonCategory: request.reasonCategory,
            reasonDetails: request.reasonDetails,
            feedback: request.feedback,
            behavior: request.behavior,
          },
        );

        if (!result.success) {
          return {
            success: false,
            error: result.error,
            events: [],
            auditEntries: [],
          };
        }

        events.push(...result.events);
      } else {
        // Schedule cancellation at period end
        const updated = await this.repository.update(request.subscriptionId, {
          cancelAtPeriodEnd: true,
          cancellationReason: request.reasonCategory,
          cancellationFeedback: request.feedback || null,
          updatedAt: new Date(),
        });

        const event = this.createEvent(
          "subscription.cancellation_scheduled",
          updated,
          actor,
          {
            effectiveDate: subscription.currentPeriodEnd,
            reasonCategory: request.reasonCategory,
            reasonDetails: request.reasonDetails,
          },
        );
        events.push(event);
        await this.repository.saveEvent(event);
      }

      // Save cancellation feedback
      const feedback: CancellationFeedback = {
        id: uuidv4(),
        subscriptionId: request.subscriptionId,
        workspaceId: subscription.workspaceId,
        reasonCategory: request.reasonCategory,
        reasonDetails: request.reasonDetails || null,
        feedback: request.feedback || null,
        competitorName: request.competitorName || null,
        wouldRecommend: request.wouldRecommend,
        planAtCancellation: subscription.plan,
        monthsAsCustomer: this.calculateMonthsAsCustomer(subscription),
        totalRevenue: 0, // Would be calculated from invoice history
        canceledAt: cancellationDate,
        analyzedAt: null,
      };
      await this.repository.saveFeedback(feedback);

      const confirmation: CancellationConfirmation = {
        subscriptionId: request.subscriptionId,
        cancellationDate,
        effectiveDate,
        behavior: request.behavior,
        accessUntil,
        refundAmount:
          request.behavior === "immediate"
            ? this.calculateRefund(subscription)
            : null,
        dataRetentionDays: 30,
        canReactivateBefore: new Date(
          effectiveDate.getTime() + 30 * 24 * 60 * 60 * 1000,
        ),
      };

      return {
        success: true,
        data: confirmation,
        events,
        auditEntries: [],
      };
    } catch (error) {
      logger.error("Failed to cancel subscription", { error, request });
      return {
        success: false,
        error:
          error instanceof SubscriptionError
            ? error
            : new SubscriptionError(
                SubscriptionErrorCode.INTERNAL_ERROR,
                error instanceof Error
                  ? error.message
                  : "Failed to cancel subscription",
                request.subscriptionId,
              ),
        events: [],
        auditEntries: [],
      };
    }
  }

  /**
   * Undo scheduled cancellation.
   */
  async undoCancellation(
    subscriptionId: string,
    actor: OperationActor,
  ): Promise<SubscriptionOperationResult<SubscriptionEntity>> {
    try {
      const subscription = await this.repository.findById(subscriptionId);
      if (!subscription) {
        return {
          success: false,
          error: new SubscriptionError(
            SubscriptionErrorCode.SUBSCRIPTION_NOT_FOUND,
            `Subscription not found: ${subscriptionId}`,
            subscriptionId,
          ),
          events: [],
          auditEntries: [],
        };
      }

      if (!subscription.cancelAtPeriodEnd) {
        return {
          success: false,
          error: new SubscriptionError(
            SubscriptionErrorCode.INVALID_REQUEST,
            "Subscription is not scheduled for cancellation",
            subscriptionId,
          ),
          events: [],
          auditEntries: [],
        };
      }

      const updated = await this.repository.update(subscriptionId, {
        cancelAtPeriodEnd: false,
        cancellationReason: null,
        cancellationFeedback: null,
        updatedAt: new Date(),
      });

      const event = this.createEvent(
        "subscription.reactivated",
        updated,
        actor,
        {
          action: "cancellation_undone",
        },
      );
      await this.repository.saveEvent(event);

      return {
        success: true,
        data: updated,
        events: [event],
        auditEntries: [],
      };
    } catch (error) {
      logger.error("Failed to undo cancellation", { error, subscriptionId });
      return {
        success: false,
        error:
          error instanceof SubscriptionError
            ? error
            : new SubscriptionError(
                SubscriptionErrorCode.INTERNAL_ERROR,
                error instanceof Error
                  ? error.message
                  : "Failed to undo cancellation",
                subscriptionId,
              ),
        events: [],
        auditEntries: [],
      };
    }
  }

  /**
   * Reactivate canceled subscription.
   */
  async reactivateSubscription(
    subscriptionId: string,
    actor: OperationActor,
  ): Promise<SubscriptionOperationResult<SubscriptionEntity>> {
    const subscription = await this.repository.findById(subscriptionId);
    if (!subscription) {
      return {
        success: false,
        error: new SubscriptionError(
          SubscriptionErrorCode.SUBSCRIPTION_NOT_FOUND,
          `Subscription not found: ${subscriptionId}`,
          subscriptionId,
        ),
        events: [],
        auditEntries: [],
      };
    }

    if (subscription.state !== "canceled") {
      return {
        success: false,
        error: new SubscriptionError(
          SubscriptionErrorCode.INVALID_REQUEST,
          "Subscription is not canceled",
          subscriptionId,
        ),
        events: [],
        auditEntries: [],
      };
    }

    return this.transitionState(
      subscriptionId,
      "active",
      "subscription_reactivated",
      actor,
      {},
    );
  }

  // ==========================================================================
  // Renewal Operations
  // ==========================================================================

  /**
   * Get renewal information.
   */
  async getRenewalInfo(subscriptionId: string): Promise<RenewalInfo | null> {
    const subscription = await this.repository.findById(subscriptionId);
    if (!subscription) return null;

    const pricing = PLAN_PRICING[subscription.plan];
    const nextAmount =
      subscription.interval === "monthly"
        ? pricing.monthly
        : (pricing.yearly ?? 0);

    return {
      subscriptionId,
      nextRenewalDate: subscription.currentPeriodEnd,
      nextAmount,
      currency: "USD",
      willAutoRenew:
        !subscription.cancelAtPeriodEnd && subscription.state === "active",
      renewalPlan: subscription.pendingPlanChange?.newPlan ?? subscription.plan,
      renewalInterval:
        subscription.pendingPlanChange?.newInterval ?? subscription.interval,
      daysUntilRenewal: BillingCycleCalculator.calculateDaysUntilRenewal(
        subscription.currentPeriodEnd,
      ),
      paymentMethodValid: !!subscription.stripeSubscriptionId,
      pendingPlanChange: subscription.pendingPlanChange || undefined,
    };
  }

  /**
   * Process renewal (called by webhook or cron).
   */
  async processRenewal(
    subscriptionId: string,
    actor: OperationActor,
  ): Promise<SubscriptionOperationResult<SubscriptionEntity>> {
    try {
      const subscription = await this.repository.findById(subscriptionId);
      if (!subscription) {
        return {
          success: false,
          error: new SubscriptionError(
            SubscriptionErrorCode.SUBSCRIPTION_NOT_FOUND,
            `Subscription not found: ${subscriptionId}`,
            subscriptionId,
          ),
          events: [],
          auditEntries: [],
        };
      }

      // Check if should cancel instead
      if (subscription.cancelAtPeriodEnd) {
        return this.transitionState(
          subscriptionId,
          "canceled",
          "subscription_canceled",
          actor,
          { reason: "period_end_cancellation" },
        );
      }

      // Apply pending plan change if exists
      let plan = subscription.plan;
      let interval = subscription.interval;

      if (subscription.pendingPlanChange) {
        plan = subscription.pendingPlanChange.newPlan;
        interval = subscription.pendingPlanChange.newInterval;
      }

      // Calculate new period dates
      const { periodStart, periodEnd } =
        BillingCycleCalculator.calculatePeriodDates(
          subscription.currentPeriodEnd,
          interval,
        );

      // Update subscription
      const updated = await this.repository.update(subscriptionId, {
        plan,
        interval,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        pendingPlanChange: null,
        updatedAt: new Date(),
      });

      const events: SubscriptionLifecycleEvent[] = [];

      // Add renewal event
      const renewalEvent = this.createEvent(
        "subscription.renewed",
        updated,
        actor,
        {
          previousPeriodEnd: subscription.currentPeriodEnd,
          newPeriodStart: periodStart,
          newPeriodEnd: periodEnd,
          plan,
          interval,
        },
      );
      events.push(renewalEvent);
      await this.repository.saveEvent(renewalEvent);

      // Add plan change event if applicable
      if (subscription.pendingPlanChange) {
        const planChangeEvent = this.createEvent(
          "subscription.plan_changed",
          updated,
          actor,
          {
            previousPlan: subscription.plan,
            newPlan: plan,
            previousInterval: subscription.interval,
            newInterval: interval,
          },
        );
        events.push(planChangeEvent);
        await this.repository.saveEvent(planChangeEvent);
      }

      return {
        success: true,
        data: updated,
        events,
        auditEntries: [],
      };
    } catch (error) {
      logger.error("Failed to process renewal", { error, subscriptionId });
      return {
        success: false,
        error:
          error instanceof SubscriptionError
            ? error
            : new SubscriptionError(
                SubscriptionErrorCode.INTERNAL_ERROR,
                error instanceof Error
                  ? error.message
                  : "Failed to process renewal",
                subscriptionId,
              ),
        events: [],
        auditEntries: [],
      };
    }
  }

  // ==========================================================================
  // Payment Handling
  // ==========================================================================

  /**
   * Handle payment success.
   */
  async handlePaymentSuccess(
    subscriptionId: string,
    amount: number,
    actor: OperationActor,
  ): Promise<SubscriptionOperationResult<SubscriptionEntity>> {
    try {
      const subscription = await this.repository.findById(subscriptionId);
      if (!subscription) {
        return {
          success: false,
          error: new SubscriptionError(
            SubscriptionErrorCode.SUBSCRIPTION_NOT_FOUND,
            `Subscription not found: ${subscriptionId}`,
            subscriptionId,
          ),
          events: [],
          auditEntries: [],
        };
      }

      // Update payment info
      await this.repository.update(subscriptionId, {
        lastPaymentAt: new Date(),
        lastPaymentAmount: amount,
        lastPaymentStatus: "succeeded",
        updatedAt: new Date(),
      });

      // Transition state if needed
      if (subscription.state === "trial") {
        return this.transitionState(
          subscriptionId,
          "active",
          "trial_converted",
          actor,
          { paymentAmount: amount },
        );
      }

      if (subscription.state === "past_due" || subscription.state === "grace") {
        return this.transitionState(
          subscriptionId,
          "active",
          "payment_recovered",
          actor,
          { paymentAmount: amount },
        );
      }

      // Just record the event for active subscriptions
      const event = this.createEvent(
        "subscription.payment_succeeded",
        subscription,
        actor,
        {
          amount,
        },
      );
      await this.repository.saveEvent(event);

      return {
        success: true,
        data: subscription,
        events: [event],
        auditEntries: [],
      };
    } catch (error) {
      logger.error("Failed to handle payment success", {
        error,
        subscriptionId,
      });
      return {
        success: false,
        error:
          error instanceof SubscriptionError
            ? error
            : new SubscriptionError(
                SubscriptionErrorCode.INTERNAL_ERROR,
                error instanceof Error
                  ? error.message
                  : "Failed to handle payment",
                subscriptionId,
              ),
        events: [],
        auditEntries: [],
      };
    }
  }

  /**
   * Handle payment failure.
   */
  async handlePaymentFailure(
    subscriptionId: string,
    isFirstFailure: boolean,
    actor: OperationActor,
  ): Promise<SubscriptionOperationResult<SubscriptionEntity>> {
    try {
      const subscription = await this.repository.findById(subscriptionId);
      if (!subscription) {
        return {
          success: false,
          error: new SubscriptionError(
            SubscriptionErrorCode.SUBSCRIPTION_NOT_FOUND,
            `Subscription not found: ${subscriptionId}`,
            subscriptionId,
          ),
          events: [],
          auditEntries: [],
        };
      }

      await this.repository.update(subscriptionId, {
        lastPaymentStatus: "failed",
        updatedAt: new Date(),
      });

      // First failure: enter grace period
      if (subscription.state === "active" && isFirstFailure) {
        return this.transitionState(
          subscriptionId,
          "grace",
          "grace_period_started",
          actor,
          { reason: "payment_failed" },
        );
      }

      // Already in grace: move to past_due
      if (subscription.state === "grace") {
        return this.transitionState(
          subscriptionId,
          "past_due",
          "grace_period_ended",
          actor,
          { reason: "payment_still_failed" },
        );
      }

      // Final failure: cancel
      if (subscription.state === "past_due") {
        return this.transitionState(
          subscriptionId,
          "canceled",
          "payment_failed",
          actor,
          { reason: "payment_exhausted_retries" },
        );
      }

      // Record the event
      const event = this.createEvent(
        "subscription.payment_failed",
        subscription,
        actor,
        {
          isFirstFailure,
        },
      );
      await this.repository.saveEvent(event);

      return {
        success: true,
        data: subscription,
        events: [event],
        auditEntries: [],
      };
    } catch (error) {
      logger.error("Failed to handle payment failure", {
        error,
        subscriptionId,
      });
      return {
        success: false,
        error:
          error instanceof SubscriptionError
            ? error
            : new SubscriptionError(
                SubscriptionErrorCode.INTERNAL_ERROR,
                error instanceof Error
                  ? error.message
                  : "Failed to handle payment failure",
                subscriptionId,
              ),
        events: [],
        auditEntries: [],
      };
    }
  }

  // ==========================================================================
  // Trial Operations
  // ==========================================================================

  /**
   * Handle trial ending.
   */
  async handleTrialEnding(
    subscriptionId: string,
    daysRemaining: number,
    actor: OperationActor,
  ): Promise<SubscriptionOperationResult<void>> {
    try {
      const subscription = await this.repository.findById(subscriptionId);
      if (!subscription) {
        return {
          success: false,
          error: new SubscriptionError(
            SubscriptionErrorCode.SUBSCRIPTION_NOT_FOUND,
            `Subscription not found: ${subscriptionId}`,
            subscriptionId,
          ),
          events: [],
          auditEntries: [],
        };
      }

      // Update trial days remaining
      await this.repository.update(subscriptionId, {
        trialDaysRemaining: daysRemaining,
        updatedAt: new Date(),
      });

      const event = this.createEvent(
        "subscription.trial_ending",
        subscription,
        actor,
        {
          daysRemaining,
          trialEndsAt: subscription.trialEndsAt,
        },
      );
      await this.repository.saveEvent(event);

      return {
        success: true,
        events: [event],
        auditEntries: [],
      };
    } catch (error) {
      logger.error("Failed to handle trial ending", { error, subscriptionId });
      return {
        success: false,
        error:
          error instanceof SubscriptionError
            ? error
            : new SubscriptionError(
                SubscriptionErrorCode.INTERNAL_ERROR,
                error instanceof Error
                  ? error.message
                  : "Failed to handle trial ending",
                subscriptionId,
              ),
        events: [],
        auditEntries: [],
      };
    }
  }

  /**
   * Handle trial ended without conversion.
   */
  async handleTrialEnded(
    subscriptionId: string,
    actor: OperationActor,
  ): Promise<SubscriptionOperationResult<SubscriptionEntity>> {
    const subscription = await this.repository.findById(subscriptionId);
    if (!subscription) {
      return {
        success: false,
        error: new SubscriptionError(
          SubscriptionErrorCode.SUBSCRIPTION_NOT_FOUND,
          `Subscription not found: ${subscriptionId}`,
          subscriptionId,
        ),
        events: [],
        auditEntries: [],
      };
    }

    // If no payment method, cancel
    if (!subscription.stripeSubscriptionId) {
      return this.transitionState(
        subscriptionId,
        "canceled",
        "trial_ended",
        actor,
        { reason: "no_payment_method" },
      );
    }

    // Otherwise, try to charge and convert
    return this.transitionState(
      subscriptionId,
      "active",
      "trial_converted",
      actor,
      {},
    );
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Create a lifecycle event.
   */
  private createEvent(
    type: SubscriptionLifecycleEventType,
    subscription: SubscriptionEntity,
    actor: OperationActor,
    data: Record<string, unknown>,
  ): SubscriptionLifecycleEvent {
    return {
      id: uuidv4(),
      type,
      subscriptionId: subscription.id,
      workspaceId: subscription.workspaceId,
      organizationId: subscription.organizationId,
      timestamp: new Date(),
      actor: {
        type: actor.type,
        id: actor.id,
        email: actor.email,
      },
      data,
      previousState: subscription.previousState || undefined,
      newState: subscription.state,
    };
  }

  /**
   * Calculate months as customer.
   */
  private calculateMonthsAsCustomer(subscription: SubscriptionEntity): number {
    const now = new Date();
    const start = subscription.createdAt;
    const months =
      (now.getFullYear() - start.getFullYear()) * 12 +
      (now.getMonth() - start.getMonth());
    return Math.max(1, months);
  }

  /**
   * Calculate refund amount for immediate cancellation.
   */
  private calculateRefund(subscription: SubscriptionEntity): number {
    if (subscription.state !== "active") return 0;

    const pricing = PLAN_PRICING[subscription.plan];
    const periodPrice =
      subscription.interval === "monthly"
        ? pricing.monthly
        : (pricing.yearly ?? 0);

    const periodStart = subscription.currentPeriodStart;
    const periodEnd = subscription.currentPeriodEnd;
    const now = new Date();

    const totalDays = Math.ceil(
      (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24),
    );
    const daysUsed = Math.ceil(
      (now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24),
    );
    const daysRemaining = Math.max(0, totalDays - daysUsed);

    return Math.round((periodPrice / totalDays) * daysRemaining);
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let subscriptionService: SubscriptionService | null = null;
let defaultRepository: InMemorySubscriptionRepository | null = null;

/**
 * Get the subscription service singleton.
 */
export function getSubscriptionService(): SubscriptionService {
  if (!subscriptionService) {
    defaultRepository = new InMemorySubscriptionRepository();
    subscriptionService = new SubscriptionService(defaultRepository);
  }
  return subscriptionService;
}

/**
 * Create a new subscription service with custom repository.
 */
export function createSubscriptionService(
  repository: SubscriptionRepository,
  pauseLimits?: PauseLimits,
): SubscriptionService {
  return new SubscriptionService(repository, pauseLimits);
}

/**
 * Reset the singleton (for testing).
 */
export function resetSubscriptionService(): void {
  subscriptionService = null;
  defaultRepository = null;
}
