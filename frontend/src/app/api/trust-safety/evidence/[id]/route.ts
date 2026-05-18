/**
 * Evidence Detail API Routes
 *
 * GET /api/trust-safety/evidence/[id] - Get evidence by ID
 * POST /api/trust-safety/evidence/[id]/verify - Verify evidence integrity
 * PATCH /api/trust-safety/evidence/[id] - Update evidence status
 */

import { NextRequest, NextResponse } from "next/server";
import { getEvidenceCollector } from "@/services/trust-safety/evidence-collector.service";

const collector = getEvidenceCollector();

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET - Get evidence by ID
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const accessorId = request.headers.get("x-user-id") || "system";
    const accessorRole = request.headers.get("x-user-role") || "system";

    const result = await collector.get(id, accessorId, accessorRole);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.message },
        { status: 404 },
      );
    }

    // Get custody chain
    const custodyChain = await collector.getCustodyChain(id);

    return NextResponse.json({
      success: true,
      evidence: result.evidence,
      custodyChain: custodyChain
        ? {
            chainHash: custodyChain.chainHash,
            isValid: custodyChain.isValid,
            entryCount: custodyChain.entries.length,
            entries: custodyChain.entries.map((e) => ({
              id: e.id,
              eventType: e.eventType,
              actorId: e.actorId,
              actorRole: e.actorRole,
              timestamp: e.timestamp,
              description: e.description,
            })),
          }
        : null,
    });
  } catch (error) {
    console.error("Evidence retrieval error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve evidence" },
      { status: 500 },
    );
  }
}

/**
 * PATCH - Update evidence status
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const actorId =
      body.actorId || request.headers.get("x-user-id") || "system";
    const actorRole =
      body.actorRole || request.headers.get("x-user-role") || "system";

    const { action, reason } = body;

    if (!action) {
      return NextResponse.json(
        { success: false, error: "Missing required field: action" },
        { status: 400 },
      );
    }

    if (!reason) {
      return NextResponse.json(
        { success: false, error: "Missing required field: reason" },
        { status: 400 },
      );
    }

    let result;

    switch (action) {
      case "archive":
        result = await collector.archive(id, actorId, actorRole, reason);
        break;

      case "restore":
        result = await collector.restore(id, actorId, actorRole, reason);
        break;

      case "update_status":
        if (!body.newStatus) {
          return NextResponse.json(
            { success: false, error: "Missing required field: newStatus" },
            { status: 400 },
          );
        }
        result = await collector.updateStatus(
          id,
          body.newStatus,
          actorId,
          actorRole,
          reason,
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
        { success: false, error: result.error.message },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      evidence: {
        id: result.evidence.id,
        status: result.evidence.status,
        updatedAt: result.evidence.updatedAt,
        version: result.evidence.version,
      },
    });
  } catch (error) {
    console.error("Evidence update error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update evidence" },
      { status: 500 },
    );
  }
}
