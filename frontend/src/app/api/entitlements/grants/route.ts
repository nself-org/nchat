/**
 * Entitlement Grants API Route
 *
 * GET /api/entitlements/grants - List grants for an entity
 */

import { NextRequest, NextResponse } from "next/server";
import { getEntitlementService } from "@/services/entitlements/entitlement.service";
import type { EntitlementScope } from "@/lib/entitlements/entitlement-types";

/**
 * GET /api/entitlements/grants
 *
 * List all entitlement grants for a specific entity.
 *
 * Query parameters:
 * - scope: organization | workspace | channel | user
 * - entityId: The entity's unique identifier
 * - active: Filter by active status (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const scope = searchParams.get("scope") as EntitlementScope | null;
    const entityId = searchParams.get("entityId");
    const activeParam = searchParams.get("active");

    // Validate required parameters
    if (!scope) {
      return NextResponse.json(
        { error: "Missing scope parameter" },
        { status: 400 },
      );
    }

    if (!entityId) {
      return NextResponse.json(
        { error: "Missing entityId parameter" },
        { status: 400 },
      );
    }

    // Validate scope
    const validScopes: EntitlementScope[] = [
      "organization",
      "workspace",
      "channel",
      "user",
    ];
    if (!validScopes.includes(scope)) {
      return NextResponse.json(
        {
          error: `Invalid scope: ${scope}. Must be one of: ${validScopes.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const service = getEntitlementService();
    let grants = await service.getGrants(scope, entityId);

    // Filter by active status if specified
    if (activeParam !== null) {
      const activeFilter = activeParam === "true";
      grants = grants.filter((g) => g.active === activeFilter);
    }

    // Filter out expired grants
    const now = new Date();
    const validGrants = grants.filter((g) => !g.expiresAt || g.expiresAt > now);
    const expiredGrants = grants.filter(
      (g) => g.expiresAt && g.expiresAt <= now,
    );

    // Group by source
    const bySource: Record<string, typeof grants> = {};
    for (const grant of validGrants) {
      if (!bySource[grant.source]) {
        bySource[grant.source] = [];
      }
      bySource[grant.source].push(grant);
    }

    return NextResponse.json({
      grants: validGrants,
      expired: expiredGrants,
      bySource,
      total: validGrants.length,
      expiredCount: expiredGrants.length,
      scope,
      entityId,
    });
  } catch (error) {
    console.error("Error fetching grants:", error);
    return NextResponse.json(
      { error: "Failed to fetch grants" },
      { status: 500 },
    );
  }
}
