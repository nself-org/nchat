/**
 * Legal Hold Detail API Routes
 *
 * GET /api/trust-safety/legal-holds/[id] - Get legal hold by ID
 * PATCH /api/trust-safety/legal-holds/[id] - Update legal hold
 * POST /api/trust-safety/legal-holds/[id] - Legal hold actions (approve, release, extend)
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getLegalHoldService,
  getEvidenceCollector,
} from "@/services/trust-safety";

const collector = getEvidenceCollector();
const legalHoldService = getLegalHoldService(undefined, collector);

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET - Get legal hold by ID
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const hold = legalHoldService.get(id);

    if (!hold) {
      return NextResponse.json(
        { success: false, error: "Legal hold not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      legalHold: hold,
    });
  } catch (error) {
    console.error("Legal hold retrieval error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve legal hold" },
      { status: 500 },
    );
  }
}

/**
 * PATCH - Update legal hold criteria
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const updatedBy =
      body.updatedBy || request.headers.get("x-user-id") || "system";
    const updaterRole =
      body.updaterRole || request.headers.get("x-user-role") || "system";

    if (!body.criteria) {
      return NextResponse.json(
        { success: false, error: "Missing required field: criteria" },
        { status: 400 },
      );
    }

    const result = await legalHoldService.updateCriteria(
      id,
      body.criteria,
      updatedBy,
      updaterRole,
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      legalHold: {
        id: result.hold.id,
        name: result.hold.name,
        status: result.hold.status,
        criteria: result.hold.criteria,
        evidenceCount: result.hold.evidenceCount,
        updatedAt: result.hold.updatedAt,
      },
    });
  } catch (error) {
    console.error("Legal hold update error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update legal hold" },
      { status: 500 },
    );
  }
}

/**
 * POST - Legal hold actions
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { action } = body;

    const actorId =
      body.actorId || request.headers.get("x-user-id") || "system";
    const actorRole =
      body.actorRole || request.headers.get("x-user-role") || "system";

    if (!action) {
      return NextResponse.json(
        { success: false, error: "Missing required field: action" },
        { status: 400 },
      );
    }

    let result;

    switch (action) {
      case "approve":
        result = await legalHoldService.approve(
          id,
          actorId,
          actorRole,
          body.notes,
        );
        break;

      case "release":
        if (!body.reason) {
          return NextResponse.json(
            { success: false, error: "Missing required field: reason" },
            { status: 400 },
          );
        }
        result = await legalHoldService.release(
          id,
          actorId,
          actorRole,
          body.reason,
        );
        break;

      case "extend":
        if (!body.expiresAt) {
          return NextResponse.json(
            { success: false, error: "Missing required field: expiresAt" },
            { status: 400 },
          );
        }
        if (!body.reason) {
          return NextResponse.json(
            { success: false, error: "Missing required field: reason" },
            { status: 400 },
          );
        }
        result = await legalHoldService.extend(
          id,
          new Date(body.expiresAt),
          actorId,
          actorRole,
          body.reason,
        );
        break;

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      legalHold: {
        id: result.hold.id,
        name: result.hold.name,
        status: result.hold.status,
        approvedBy: result.hold.approvedBy,
        expiresAt: result.hold.expiresAt,
        evidenceCount: result.hold.evidenceCount,
        updatedAt: result.hold.updatedAt,
      },
    });
  } catch (error) {
    console.error("Legal hold action error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process legal hold action" },
      { status: 500 },
    );
  }
}
