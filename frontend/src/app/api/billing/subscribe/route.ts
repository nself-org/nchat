/**
 * POST /api/billing/subscribe
 *
 * Create a new subscription or upgrade existing subscription
 */

import { NextRequest, NextResponse } from "next/server";
import { getStripeBillingService } from "@/lib/billing/stripe-service";
import { getTenantService } from "@/lib/tenants/tenant-service";
import { getTenantId } from "@/lib/tenants/tenant-middleware";
import { z } from "zod";

import { logger } from "@/lib/logger";

const subscribeSchema = z.object({
  planTier: z.enum(["free", "pro", "enterprise", "custom"]),
  interval: z.enum(["monthly", "yearly"]),
  returnUrl: z.string().url(),
});

export async function POST(request: NextRequest) {
  try {
    const tenantId = getTenantId(request);

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 400 });
    }

    const body = await request.json();
    const validationResult = subscribeSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.errors,
        },
        { status: 400 },
      );
    }

    const { planTier, interval, returnUrl } = validationResult.data;

    // Get tenant
    const tenantService = getTenantService();
    const tenant = await tenantService.getTenantById(tenantId);

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Create checkout session via Stripe
    const billingService = getStripeBillingService();
    const session = await billingService.createCheckoutSession(
      tenant,
      planTier as any,
      interval,
      `${returnUrl}?success=true`,
      `${returnUrl}?canceled=true`,
    );

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    logger.error("Error creating subscription:", error);
    return NextResponse.json(
      {
        error: "Failed to create subscription",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
