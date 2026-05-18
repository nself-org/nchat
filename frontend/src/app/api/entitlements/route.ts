/**
 * Entitlements API Route
 *
 * GET /api/entitlements - List all entitlement definitions
 * POST /api/entitlements - Create a new entitlement grant
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getEntitlementService,
  ENTITLEMENT_DEFINITIONS,
} from "@/services/entitlements/entitlement.service";
import type {
  CreateEntitlementGrantInput,
  EntitlementCategory,
} from "@/lib/entitlements/entitlement-types";

/**
 * GET /api/entitlements
 *
 * List all available entitlement definitions.
 * Optionally filter by category.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") as EntitlementCategory | null;

    const service = getEntitlementService();
    let definitions = service.getAllDefinitions();

    if (category) {
      definitions = definitions.filter((d) => d.category === category);
    }

    // Group by category for easier consumption
    const grouped: Record<string, typeof definitions> = {};
    for (const def of definitions) {
      if (!grouped[def.category]) {
        grouped[def.category] = [];
      }
      grouped[def.category].push(def);
    }

    return NextResponse.json({
      definitions,
      grouped,
      total: definitions.length,
      categories: Object.keys(grouped),
    });
  } catch (error) {
    console.error("Error fetching entitlements:", error);
    return NextResponse.json(
      { error: "Failed to fetch entitlements" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/entitlements
 *
 * Create a new entitlement grant.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const requiredFields = ["entitlementKey", "scope", "entityId", "value"];
    for (const field of requiredFields) {
      if (body[field] === undefined) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 },
        );
      }
    }

    // Validate entitlement key exists
    if (!ENTITLEMENT_DEFINITIONS[body.entitlementKey]) {
      return NextResponse.json(
        { error: `Unknown entitlement: ${body.entitlementKey}` },
        { status: 400 },
      );
    }

    // Validate scope
    const validScopes = ["organization", "workspace", "channel", "user"];
    if (!validScopes.includes(body.scope)) {
      return NextResponse.json(
        {
          error: `Invalid scope: ${body.scope}. Must be one of: ${validScopes.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const input: CreateEntitlementGrantInput = {
      entitlementKey: body.entitlementKey,
      scope: body.scope,
      entityId: body.entityId,
      value: body.value,
      source: body.source,
      priority: body.priority,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      grantedBy: body.grantedBy,
      reason: body.reason,
    };

    const service = getEntitlementService();
    const grant = await service.createGrant(input);

    return NextResponse.json(grant, { status: 201 });
  } catch (error) {
    console.error("Error creating grant:", error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Failed to create grant" },
      { status: 500 },
    );
  }
}
