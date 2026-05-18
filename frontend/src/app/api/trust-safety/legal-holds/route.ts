/**
 * Legal Holds API Routes
 *
 * POST /api/trust-safety/legal-holds - Create a legal hold
 * GET /api/trust-safety/legal-holds - List legal holds
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getLegalHoldService,
  getEvidenceCollector,
} from "@/services/trust-safety";

const collector = getEvidenceCollector();
const legalHoldService = getLegalHoldService(undefined, collector);

/**
 * POST - Create a new legal hold
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const requiredFields = ["name", "description", "scope", "criteria"];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, error: `Missing required field: ${field}` },
          { status: 400 },
        );
      }
    }

    const requestedBy =
      body.requestedBy || request.headers.get("x-user-id") || "system";
    const requestedByRole =
      body.requestedByRole || request.headers.get("x-user-role") || "system";

    const result = await legalHoldService.create({
      name: body.name,
      description: body.description,
      scope: body.scope,
      criteria: body.criteria,
      requestedBy,
      requestedByRole,
      effectiveFrom: body.effectiveFrom
        ? new Date(body.effectiveFrom)
        : undefined,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      caseReference: body.caseReference,
      legalMatterId: body.legalMatterId,
      legalContact: body.legalContact,
    });

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
        scope: result.hold.scope,
        effectiveFrom: result.hold.effectiveFrom,
        expiresAt: result.hold.expiresAt,
        evidenceCount: result.hold.evidenceCount,
        createdAt: result.hold.createdAt,
      },
    });
  } catch (error) {
    console.error("Legal hold creation error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create legal hold" },
      { status: 500 },
    );
  }
}

/**
 * GET - List legal holds
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const filters: Parameters<typeof legalHoldService.getAll>[0] = {};

    const status = searchParams.get("status");
    if (status) {
      filters.status = status.split(",") as any;
    }

    const scope = searchParams.get("scope");
    if (scope) {
      filters.scope = scope as any;
    }

    const requestedBy = searchParams.get("requestedBy");
    if (requestedBy) {
      filters.requestedBy = requestedBy;
    }

    const caseReference = searchParams.get("caseReference");
    if (caseReference) {
      filters.caseReference = caseReference;
    }

    const includeExpired = searchParams.get("includeExpired");
    if (includeExpired !== null) {
      filters.includeExpired = includeExpired === "true";
    }

    const holds = legalHoldService.getAll(filters);

    return NextResponse.json({
      success: true,
      count: holds.length,
      legalHolds: holds.map((h) => ({
        id: h.id,
        name: h.name,
        description: h.description,
        status: h.status,
        scope: h.scope,
        caseReference: h.caseReference,
        requestedBy: h.requestedBy,
        approvedBy: h.approvedBy,
        effectiveFrom: h.effectiveFrom,
        expiresAt: h.expiresAt,
        evidenceCount: h.evidenceCount,
        createdAt: h.createdAt,
        updatedAt: h.updatedAt,
      })),
    });
  } catch (error) {
    console.error("Legal holds list error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to list legal holds" },
      { status: 500 },
    );
  }
}
