/**
 * POST /api/billing/portal
 *
 * Create a Stripe billing portal session.
 */

import { NextRequest, NextResponse } from "next/server";
import { getStripeBillingService } from "@/lib/billing/stripe-service";
import { getTenantService } from "@/lib/tenants/tenant-service";
import { getTenantId } from "@/lib/tenants/tenant-middleware";
import { z } from "zod";

import { logger } from "@/lib/logger";

const portalSchema = z.object({
  returnUrl: z.string().url(),
});

export async function POST(request: NextRequest) {
  try {
    const tenantId = getTenantId(request);

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 400 });
    }

    const body = await request.json();

    // Validate request
    const validationResult = portalSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.errors,
        },
        { status: 400 },
      );
    }

    const { returnUrl } = validationResult.data;

    // Get tenant
    const tenantService = getTenantService();
    const tenant = await tenantService.getTenantById(tenantId);

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    if (!tenant.billing.stripeCustomerId) {
      return NextResponse.json(
        { error: "No billing account found" },
        { status: 400 },
      );
    }

    // Create portal session
    const billingService = getStripeBillingService();
    const session = await billingService.createPortalSession(tenant, returnUrl);

    return NextResponse.json({
      url: session.url,
    });
  } catch (error) {
    logger.error("Error creating portal session:", error);
    return NextResponse.json(
      {
        error: "Failed to create portal session",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
