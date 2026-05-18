/**
 * Individual Entitlement Grant API Route
 *
 * GET /api/entitlements/[id] - Get a specific grant
 * PATCH /api/entitlements/[id] - Update a grant
 * DELETE /api/entitlements/[id] - Delete a grant
 */

import { NextRequest, NextResponse } from "next/server";
import { getEntitlementService } from "@/services/entitlements/entitlement.service";
import type {
  EntitlementScope,
  UpdateEntitlementGrantInput,
} from "@/lib/entitlements/entitlement-types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Parse grant ID into components.
 * Format: scope:entityId:entitlementKey
 */
function parseGrantId(id: string): {
  scope: EntitlementScope;
  entityId: string;
  entitlementKey: string;
} | null {
  const parts = id.split(":");
  if (parts.length < 3) {
    return null;
  }

  const validScopes = ["organization", "workspace", "channel", "user"];
  if (!validScopes.includes(parts[0])) {
    return null;
  }

  return {
    scope: parts[0] as EntitlementScope,
    entityId: parts[1],
    entitlementKey: parts.slice(2).join(":"), // Key may contain colons
  };
}

/**
 * GET /api/entitlements/[id]
 *
 * Get a specific entitlement grant.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const parsed = parseGrantId(id);

    if (!parsed) {
      return NextResponse.json(
        {
          error:
            "Invalid grant ID format. Expected: scope:entityId:entitlementKey",
        },
        { status: 400 },
      );
    }

    const service = getEntitlementService();
    const grant = await service.getGrant(
      parsed.scope,
      parsed.entityId,
      parsed.entitlementKey,
    );

    if (!grant) {
      return NextResponse.json({ error: "Grant not found" }, { status: 404 });
    }

    return NextResponse.json(grant);
  } catch (error) {
    console.error("Error fetching grant:", error);
    return NextResponse.json(
      { error: "Failed to fetch grant" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/entitlements/[id]
 *
 * Update an entitlement grant.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const parsed = parseGrantId(id);

    if (!parsed) {
      return NextResponse.json(
        {
          error:
            "Invalid grant ID format. Expected: scope:entityId:entitlementKey",
        },
        { status: 400 },
      );
    }

    const body = await request.json();

    const updates: UpdateEntitlementGrantInput = {};

    if (body.value !== undefined) {
      updates.value = body.value;
    }
    if (body.priority !== undefined) {
      updates.priority = body.priority;
    }
    if (body.expiresAt !== undefined) {
      updates.expiresAt = body.expiresAt ? new Date(body.expiresAt) : undefined;
    }
    if (body.active !== undefined) {
      updates.active = body.active;
    }
    if (body.reason !== undefined) {
      updates.reason = body.reason;
    }

    const service = getEntitlementService();
    const grant = await service.updateGrant(
      parsed.scope,
      parsed.entityId,
      parsed.entitlementKey,
      updates,
    );

    if (!grant) {
      return NextResponse.json({ error: "Grant not found" }, { status: 404 });
    }

    return NextResponse.json(grant);
  } catch (error) {
    console.error("Error updating grant:", error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Failed to update grant" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/entitlements/[id]
 *
 * Delete an entitlement grant.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const parsed = parseGrantId(id);

    if (!parsed) {
      return NextResponse.json(
        {
          error:
            "Invalid grant ID format. Expected: scope:entityId:entitlementKey",
        },
        { status: 400 },
      );
    }

    const service = getEntitlementService();
    const deleted = await service.deleteGrant(
      parsed.scope,
      parsed.entityId,
      parsed.entitlementKey,
    );

    if (!deleted) {
      return NextResponse.json({ error: "Grant not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting grant:", error);
    return NextResponse.json(
      { error: "Failed to delete grant" },
      { status: 500 },
    );
  }
}
