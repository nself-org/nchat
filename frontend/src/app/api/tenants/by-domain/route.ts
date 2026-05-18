/**
 * GET /api/tenants/by-domain?domain=chat.acme.com
 *
 * Get tenant by custom domain.
 * Internal route - used by middleware for tenant resolution.
 */

import { NextRequest, NextResponse } from "next/server";
import { getTenantService } from "@/lib/tenants/tenant-service";

import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    // Verify internal request
    const isInternalRequest =
      request.headers.get("X-Internal-Request") === "true";

    if (!isInternalRequest) {
      return NextResponse.json(
        { error: "Forbidden - internal use only" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const domain = searchParams.get("domain");

    if (!domain) {
      return NextResponse.json(
        { error: "Missing domain parameter" },
        { status: 400 },
      );
    }

    const tenantService = getTenantService();
    const tenant = await tenantService.getTenantByDomain(domain);

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    return NextResponse.json(tenant);
  } catch (error) {
    logger.error("Error fetching tenant by domain:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch tenant",
        details:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : String(error),
      },
      { status: 500 },
    );
  }
}
