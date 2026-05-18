/**
 * POST /api/billing/checkout
 *
 * Create a Stripe checkout session for subscription.
 */

import { NextRequest, NextResponse } from "next/server";
import { getStripeBillingService } from "@/lib/billing/stripe-service";
import { getTenantService } from "@/lib/tenants/tenant-service";
import { getTenantId } from "@/lib/tenants/tenant-middleware";
import { z } from "zod";

import { logger } from "@/lib/logger";

const checkoutSchema = z.object({
  plan: z.enum(["free", "pro", "enterprise", "custom"]),
  interval: z.enum(["monthly", "yearly"]),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

export async function POST(request: NextRequest) {
  try {
    const tenantId = getTenantId(request);

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 400 });
    }

    const body = await request.json();

    // Validate request
    const validationResult = checkoutSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.errors,
        },
        { status: 400 },
      );
    }

    const { plan, interval, successUrl, cancelUrl } = validationResult.data;

    // Get tenant
    const tenantService = getTenantService();
    const tenant = await tenantService.getTenantById(tenantId);

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Create checkout session
    const billingService = getStripeBillingService();
    const session = await billingService.createCheckoutSession(
      tenant,
      plan,
      interval,
      successUrl,
      cancelUrl,
    );

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    logger.error("Error creating checkout session:", error);
    return NextResponse.json(
      {
        error: "Failed to create checkout session",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
