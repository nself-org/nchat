/**
 * Stripe Billing Service
 *
 * Handles Stripe integration for subscription billing.
 * Manages customers, subscriptions, and webhook processing.
 */

import Stripe from "stripe";
import { DEFAULT_PLANS } from "../tenants/types";
import type {
  Tenant,
  BillingPlan,
  BillingInterval,
  SubscriptionPlan,
} from "../tenants/types";
import { getTenantService } from "../tenants/tenant-service";
import {
  PLAN_LIMITS,
  PLAN_FEATURES,
  comparePlans,
  STRIPE_PRICE_IDS,
} from "./plan-config";
import type { PlanTier } from "@/types/subscription.types";

import { logger } from "@/lib/logger";

// ============================================================================
// Plan Transition Types
// ============================================================================

export interface PlanTransitionValidation {
  isValid: boolean;
  error?: string;
  isUpgrade: boolean;
  isDowngrade: boolean;
  requiresProration: boolean;
  effectiveDate: "immediate" | "period_end";
  creditAmount?: number;
  additionalCharge?: number;
}

export interface PlanTransitionResult {
  success: boolean;
  subscription?: Stripe.Subscription;
  error?: string;
  transitionType: "upgrade" | "downgrade" | "interval_change";
  prorationAmount?: number;
}

/**
 * Initialize Stripe client
 */
function getStripeClient(): Stripe {
  const apiKey = process.env.STRIPE_SECRET_KEY;

  if (!apiKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }

  return new Stripe(apiKey, {
    apiVersion: "2025-08-27.basil",
    typescript: true,
  });
}

/**
 * Stripe Billing Service Class
 */
export class StripeBillingService {
  private stripe: Stripe;
  private tenantService = getTenantService();

  constructor() {
    this.stripe = getStripeClient();
  }

  /**
   * Create a Stripe customer for a tenant
   */
  async createCustomer(tenant: Tenant): Promise<string> {
    const customer = await this.stripe.customers.create({
      email: tenant.ownerEmail,
      name: tenant.ownerName,
      metadata: {
        tenant_id: tenant.id,
        tenant_slug: tenant.slug,
        tenant_name: tenant.name,
      },
    });

    return customer.id;
  }

  /**
   * Create a subscription for a tenant
   */
  async createSubscription(
    tenant: Tenant,
    plan: BillingPlan,
    interval: BillingInterval,
  ): Promise<Stripe.Subscription> {
    // Get or create Stripe customer
    let customerId = tenant.billing.stripeCustomerId;

    if (!customerId) {
      customerId = await this.createCustomer(tenant);

      // Update tenant with customer ID
      await this.tenantService.updateTenant(tenant.id, {
        metadata: {
          ...tenant.metadata,
          stripeCustomerId: customerId,
        },
      });
    }

    // Get price ID from plan configuration
    const planConfig: SubscriptionPlan = (DEFAULT_PLANS as any)[plan];
    const priceId =
      interval === "monthly"
        ? planConfig.stripePriceIdMonthly
        : planConfig.stripePriceIdYearly;

    if (!priceId) {
      throw new Error(`Price ID not configured for plan: ${plan}/${interval}`);
    }

    // Create subscription
    const subscription = await this.stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice.payment_intent"],
      metadata: {
        tenant_id: tenant.id,
        tenant_slug: tenant.slug,
        plan,
        interval,
      },
    });

    return subscription;
  }

  /**
   * Validate a plan transition before executing
   */
  async validatePlanTransition(
    tenant: Tenant,
    newPlan: PlanTier,
    newInterval: BillingInterval,
  ): Promise<PlanTransitionValidation> {
    const currentPlan = tenant.billing.plan as PlanTier;
    const currentInterval = tenant.billing.interval;

    // Check if any change is being made
    if (currentPlan === newPlan && currentInterval === newInterval) {
      return {
        isValid: false,
        error: "No change in plan or billing interval",
        isUpgrade: false,
        isDowngrade: false,
        requiresProration: false,
        effectiveDate: "immediate",
      };
    }

    // Determine if upgrade or downgrade
    const planComparison = comparePlans(newPlan, currentPlan);
    const isUpgrade = planComparison > 0;
    const isDowngrade = planComparison < 0;
    const isIntervalChangeOnly = currentPlan === newPlan;

    // Get Stripe price ID for new plan
    const stripePrices = STRIPE_PRICE_IDS[newPlan];
    const newPriceId =
      newInterval === "monthly" ? stripePrices?.monthly : stripePrices?.yearly;

    if (!newPriceId && newPlan !== "free" && newPlan !== "custom") {
      return {
        isValid: false,
        error: `Stripe price not configured for ${newPlan}/${newInterval}`,
        isUpgrade,
        isDowngrade,
        requiresProration: false,
        effectiveDate: "immediate",
      };
    }

    // Check if downgrade would exceed new plan's limits
    if (isDowngrade) {
      const newLimits = PLAN_LIMITS[newPlan];
      const currentUsage = tenant.billing.usageTracking;

      // Check member limit
      if (
        newLimits.maxMembers !== null &&
        currentUsage.users > newLimits.maxMembers
      ) {
        return {
          isValid: false,
          error: `Cannot downgrade: Current users (${currentUsage.users}) exceeds ${newPlan} plan limit (${newLimits.maxMembers})`,
          isUpgrade,
          isDowngrade,
          requiresProration: false,
          effectiveDate: "period_end",
        };
      }

      // Check storage limit
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
        return {
          isValid: false,
          error: `Cannot downgrade: Current storage (${currentGB} GB) exceeds ${newPlan} plan limit (${limitGB} GB)`,
          isUpgrade,
          isDowngrade,
          requiresProration: false,
          effectiveDate: "period_end",
        };
      }
    }

    // Check for custom plan restrictions
    if (newPlan === "custom") {
      return {
        isValid: false,
        error: "Custom plans require sales contact",
        isUpgrade,
        isDowngrade,
        requiresProration: false,
        effectiveDate: "immediate",
      };
    }

    return {
      isValid: true,
      isUpgrade,
      isDowngrade,
      requiresProration: isUpgrade, // Prorate on upgrades
      effectiveDate: isDowngrade ? "period_end" : "immediate",
    };
  }

  /**
   * Update subscription with proper plan transition handling
   */
  async updateSubscription(
    tenant: Tenant,
    newPlan: BillingPlan,
    newInterval: BillingInterval,
  ): Promise<PlanTransitionResult> {
    if (!tenant.billing.stripeSubscriptionId) {
      return {
        success: false,
        error: "No active subscription found",
        transitionType: "upgrade",
      };
    }

    // Validate the transition first
    const validation = await this.validatePlanTransition(
      tenant,
      newPlan as PlanTier,
      newInterval,
    );

    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error,
        transitionType: validation.isUpgrade ? "upgrade" : "downgrade",
      };
    }

    try {
      // Get current subscription
      const subscription = await this.stripe.subscriptions.retrieve(
        tenant.billing.stripeSubscriptionId,
      );

      // Get new price ID
      const stripePrices = STRIPE_PRICE_IDS[newPlan as PlanTier];
      const newPriceId =
        newInterval === "monthly"
          ? stripePrices?.monthly
          : stripePrices?.yearly;

      if (!newPriceId) {
        // Fallback to DEFAULT_PLANS for backward compatibility
        const planConfig: SubscriptionPlan = (DEFAULT_PLANS as any)[newPlan];
        const fallbackPriceId =
          newInterval === "monthly"
            ? planConfig.stripePriceIdMonthly
            : planConfig.stripePriceIdYearly;

        if (!fallbackPriceId) {
          return {
            success: false,
            error: `Price ID not configured for plan: ${newPlan}/${newInterval}`,
            transitionType: validation.isUpgrade ? "upgrade" : "downgrade",
          };
        }
      }

      // Determine proration behavior
      let prorationBehavior: "create_prorations" | "none" | "always_invoice" =
        "none";
      if (validation.isUpgrade) {
        // Upgrades: prorate immediately
        prorationBehavior = "create_prorations";
      } else if (validation.isDowngrade) {
        // Downgrades: take effect at period end, no proration
        prorationBehavior = "none";
      }

      // Update subscription
      const updatedSubscription = await this.stripe.subscriptions.update(
        subscription.id,
        {
          items: [
            {
              id: subscription.items.data[0].id,
              price:
                newPriceId ||
                (DEFAULT_PLANS as any)[newPlan][
                  newInterval === "monthly"
                    ? "stripePriceIdMonthly"
                    : "stripePriceIdYearly"
                ],
            },
          ],
          proration_behavior: prorationBehavior,
          // For downgrades, schedule the change at period end
          ...(validation.isDowngrade && {
            billing_cycle_anchor: "unchanged",
          }),
          metadata: {
            ...subscription.metadata,
            plan: newPlan,
            interval: newInterval,
            previous_plan: tenant.billing.plan,
            transition_type: validation.isUpgrade ? "upgrade" : "downgrade",
            transition_date: new Date().toISOString(),
          },
        },
      );

      // Update tenant billing info
      await this.tenantService.updateTenant(tenant.id, {
        metadata: {
          ...tenant.metadata,
          stripePriceId: newPriceId,
          billingPlan: newPlan,
          billingInterval: newInterval,
        },
      });

      // Calculate proration amount if applicable
      let prorationAmount: number | undefined;
      if (validation.isUpgrade && updatedSubscription.latest_invoice) {
        const invoiceId =
          typeof updatedSubscription.latest_invoice === "string"
            ? updatedSubscription.latest_invoice
            : updatedSubscription.latest_invoice.id;
        if (invoiceId) {
          const invoice = await this.stripe.invoices.retrieve(invoiceId);
          prorationAmount = invoice.amount_due;
        }
      }

      return {
        success: true,
        subscription: updatedSubscription,
        transitionType: validation.isUpgrade
          ? "upgrade"
          : validation.isDowngrade
            ? "downgrade"
            : "interval_change",
        prorationAmount,
      };
    } catch (error) {
      logger.error("Error updating subscription:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update subscription",
        transitionType: validation.isUpgrade ? "upgrade" : "downgrade",
      };
    }
  }

  /**
   * Legacy update subscription method (returns Stripe.Subscription directly)
   * @deprecated Use updateSubscription instead which returns PlanTransitionResult
   */
  async updateSubscriptionLegacy(
    tenant: Tenant,
    newPlan: BillingPlan,
    newInterval: BillingInterval,
  ): Promise<Stripe.Subscription> {
    const result = await this.updateSubscription(tenant, newPlan, newInterval);
    if (!result.success || !result.subscription) {
      throw new Error(result.error || "Failed to update subscription");
    }
    return result.subscription;
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(
    tenant: Tenant,
    immediately: boolean = false,
  ): Promise<Stripe.Subscription> {
    if (!tenant.billing.stripeSubscriptionId) {
      throw new Error("No active subscription found");
    }

    if (immediately) {
      // Cancel immediately
      return await this.stripe.subscriptions.cancel(
        tenant.billing.stripeSubscriptionId,
      );
    } else {
      // Cancel at period end
      return await this.stripe.subscriptions.update(
        tenant.billing.stripeSubscriptionId,
        {
          cancel_at_period_end: true,
        },
      );
    }
  }

  /**
   * Resume cancelled subscription
   */
  async resumeSubscription(tenant: Tenant): Promise<Stripe.Subscription> {
    if (!tenant.billing.stripeSubscriptionId) {
      throw new Error("No subscription found");
    }

    return await this.stripe.subscriptions.update(
      tenant.billing.stripeSubscriptionId,
      {
        cancel_at_period_end: false,
      },
    );
  }

  /**
   * Create a checkout session for initial subscription
   */
  async createCheckoutSession(
    tenant: Tenant,
    plan: BillingPlan,
    interval: BillingInterval,
    successUrl: string,
    cancelUrl: string,
  ): Promise<Stripe.Checkout.Session> {
    // Get or create customer
    let customerId = tenant.billing.stripeCustomerId;

    if (!customerId) {
      customerId = await this.createCustomer(tenant);
    }

    // Get price ID
    const planConfig: SubscriptionPlan = (DEFAULT_PLANS as any)[plan];
    const priceId =
      interval === "monthly"
        ? planConfig.stripePriceIdMonthly
        : planConfig.stripePriceIdYearly;

    if (!priceId) {
      throw new Error(`Price ID not configured for plan: ${plan}/${interval}`);
    }

    // Create checkout session
    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        tenant_id: tenant.id,
        tenant_slug: tenant.slug,
        plan,
        interval,
      },
    });

    return session;
  }

  /**
   * Create a billing portal session
   */
  async createPortalSession(
    tenant: Tenant,
    returnUrl: string,
  ): Promise<Stripe.BillingPortal.Session> {
    if (!tenant.billing.stripeCustomerId) {
      throw new Error("No Stripe customer found");
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: tenant.billing.stripeCustomerId,
      return_url: returnUrl,
    });

    return session;
  }

  /**
   * Process Stripe webhook event
   */
  async processWebhookEvent(
    event: Stripe.Event,
    signature: string,
    rawBody: string,
  ): Promise<void> {
    // Verify webhook signature
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
    }

    try {
      this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      throw new Error(`Webhook signature verification failed: ${err}`);
    }

    // Handle different event types
    switch (event.type) {
      case "customer.subscription.created":
        await this.handleSubscriptionCreated(
          event.data.object as Stripe.Subscription,
        );
        break;

      case "customer.subscription.updated":
        await this.handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription,
        );
        break;

      case "customer.subscription.deleted":
        await this.handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
        );
        break;

      case "invoice.paid":
        await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_failed":
        await this.handleInvoicePaymentFailed(
          event.data.object as Stripe.Invoice,
        );
        break;

      case "customer.subscription.trial_will_end":
        await this.handleTrialWillEnd(event.data.object as Stripe.Subscription);
        break;

      default:
      // REMOVED: console.log(`Unhandled event type: ${event.type}`)
    }
  }

  /**
   * Get subscription usage for metered billing
   */
  async recordUsage(
    tenant: Tenant,
    quantity: number,
    action: "increment" | "set" = "increment",
  ): Promise<void> {
    if (!tenant.billing.stripeSubscriptionId) {
      throw new Error("No active subscription found");
    }

    // Get subscription items
    const subscription = await this.stripe.subscriptions.retrieve(
      tenant.billing.stripeSubscriptionId,
      { expand: ["items"] },
    );

    // Find metered item (if any)
    const meteredItem = subscription.items.data.find((item) => {
      return (
        (item.price as Stripe.Price & { usage_type?: string }).usage_type ===
        "metered"
      );
    });

    if (!meteredItem) {
      return; // No metered billing configured
    }

    // Record usage using the billing meter events API
    await this.stripe.billing.meterEvents.create({
      event_name: "usage_record",
      payload: {
        stripe_customer_id: subscription.customer as string,
        value: String(quantity),
      },
    });
  }

  // Private webhook handlers

  private async handleSubscriptionCreated(
    subscription: Stripe.Subscription,
  ): Promise<void> {
    const tenantId = subscription.metadata.tenant_id;

    if (!tenantId) {
      logger.error("No tenant_id in subscription metadata");
      return;
    }

    await this.tenantService.updateTenant(tenantId, {
      metadata: {
        stripeSubscriptionId: subscription.id,
        stripePriceId: subscription.items.data[0]?.price.id,
      },
    });
  }

  private async handleSubscriptionUpdated(
    subscription: Stripe.Subscription,
  ): Promise<void> {
    const tenantId = subscription.metadata.tenant_id;

    if (!tenantId) {
      return;
    }

    const tenant = await this.tenantService.getTenantById(tenantId);

    if (!tenant) {
      return;
    }

    // Update tenant billing status
    const status = subscription.status === "active" ? "active" : "suspended";

    await this.tenantService.updateTenant(tenantId, {
      metadata: {
        ...tenant.metadata,
        stripeSubscriptionStatus: subscription.status,
      },
    });
  }

  private async handleSubscriptionDeleted(
    subscription: Stripe.Subscription,
  ): Promise<void> {
    const tenantId = subscription.metadata.tenant_id;

    if (!tenantId) {
      return;
    }

    // Mark tenant as cancelled
    await this.tenantService.deleteTenant(tenantId);
  }

  private async handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    const invoiceWithSub = invoice as Stripe.Invoice & {
      subscription?: string | Stripe.Subscription | null;
    };
    const subscriptionId =
      typeof invoiceWithSub.subscription === "string"
        ? invoiceWithSub.subscription
        : invoiceWithSub.subscription?.id;

    if (!subscriptionId) {
      return;
    }

    const subscription =
      await this.stripe.subscriptions.retrieve(subscriptionId);
    const tenantId = subscription.metadata.tenant_id;

    if (!tenantId) {
      return;
    }

    // Update payment history
    await this.tenantService.updateTenant(tenantId, {
      metadata: {
        lastPaymentDate: new Date(invoice.created * 1000).toISOString(),
        lastPaymentAmount: invoice.amount_paid,
        lastPaymentStatus: "succeeded",
      },
    });
  }

  private async handleInvoicePaymentFailed(
    invoice: Stripe.Invoice,
  ): Promise<void> {
    const invoiceWithSub = invoice as Stripe.Invoice & {
      subscription?: string | Stripe.Subscription | null;
    };
    const subscriptionId =
      typeof invoiceWithSub.subscription === "string"
        ? invoiceWithSub.subscription
        : invoiceWithSub.subscription?.id;

    if (!subscriptionId) {
      return;
    }

    const subscription =
      await this.stripe.subscriptions.retrieve(subscriptionId);
    const tenantId = subscription.metadata.tenant_id;

    if (!tenantId) {
      return;
    }

    // Update payment status and potentially suspend tenant
    await this.tenantService.updateTenant(tenantId, {
      metadata: {
        lastPaymentStatus: "failed",
      },
    });
  }

  private async handleTrialWillEnd(
    subscription: Stripe.Subscription,
  ): Promise<void> {
    const tenantId = subscription.metadata.tenant_id;

    if (!tenantId) {
      return;
    }

    // REMOVED: console.log(`Trial ending soon for tenant: ${tenantId}`)
  }
}

// Singleton instance
let stripeBillingService: StripeBillingService | null = null;

export function getStripeBillingService(): StripeBillingService {
  if (!stripeBillingService) {
    stripeBillingService = new StripeBillingService();
  }
  return stripeBillingService;
}
