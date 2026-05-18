/**
 * Evidence Verification API Route
 *
 * POST /api/trust-safety/evidence/[id]/verify - Verify evidence integrity
 */

import { NextRequest, NextResponse } from "next/server";
import { getEvidenceCollector } from "@/services/trust-safety/evidence-collector.service";

const collector = getEvidenceCollector();

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST - Verify evidence integrity
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const verifierId = request.headers.get("x-user-id") || "system";
    const verifierRole = request.headers.get("x-user-role") || "system";

    const result = await collector.verify(id, verifierId, verifierRole);

    return NextResponse.json({
      success: true,
      verification: {
        evidenceId: result.evidenceId,
        isValid: result.isValid,
        verifiedAt: result.verifiedAt,
        verifiedBy: result.verifiedBy,
        message: result.message,
        checks: result.checks,
      },
    });
  } catch (error) {
    console.error("Evidence verification error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to verify evidence" },
      { status: 500 },
    );
  }
}
