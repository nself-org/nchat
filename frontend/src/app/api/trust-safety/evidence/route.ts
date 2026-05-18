/**
 * Evidence Management API Routes
 *
 * POST /api/trust-safety/evidence - Collect new evidence
 * GET /api/trust-safety/evidence - Search/list evidence
 */

import { NextRequest, NextResponse } from "next/server";
import { getEvidenceCollector } from "@/services/trust-safety/evidence-collector.service";
import type { EvidenceCollectionRequest } from "@/lib/trust-safety/evidence-types";

// Initialize collector
const collector = getEvidenceCollector();

/**
 * POST - Collect new evidence
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const requiredFields = [
      "type",
      "content",
      "reason",
      "source",
      "workspaceId",
    ];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, error: `Missing required field: ${field}` },
          { status: 400 },
        );
      }
    }

    // Get collector info from headers or body
    const collectorId =
      body.collectorId || request.headers.get("x-user-id") || "system";
    const collectorRole =
      body.collectorRole || request.headers.get("x-user-role") || "system";

    const collectionRequest: EvidenceCollectionRequest = {
      type: body.type,
      content: body.content,
      encrypt: body.encrypt,
      priority: body.priority,
      reason: body.reason,
      source: body.source,
      workspaceId: body.workspaceId,
      channelId: body.channelId,
      userId: body.userId,
      references: body.references,
      metadata: body.metadata,
      retentionPolicyId: body.retentionPolicyId,
    };

    const result = await collector.collect(
      collectionRequest,
      collectorId,
      collectorRole,
    );

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
        type: result.evidence.type,
        status: result.evidence.status,
        priority: result.evidence.priority,
        contentHash: result.evidence.contentHash.value,
        collectedAt: result.evidence.collectedAt,
        collectedBy: result.evidence.collectedBy,
      },
    });
  } catch (error) {
    console.error("Evidence collection error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to collect evidence" },
      { status: 500 },
    );
  }
}

/**
 * GET - Search/list evidence
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse filters from query params
    const filters: Parameters<typeof collector.search>[0] = {};

    const type = searchParams.get("type");
    if (type) {
      filters.type = type.split(",") as any;
    }

    const status = searchParams.get("status");
    if (status) {
      filters.status = status.split(",") as any;
    }

    const priority = searchParams.get("priority");
    if (priority) {
      filters.priority = priority.split(",") as any;
    }

    const workspaceId = searchParams.get("workspaceId");
    if (workspaceId) {
      filters.workspaceId = workspaceId;
    }

    const channelId = searchParams.get("channelId");
    if (channelId) {
      filters.channelId = channelId;
    }

    const userId = searchParams.get("userId");
    if (userId) {
      filters.userId = userId;
    }

    const collectedBy = searchParams.get("collectedBy");
    if (collectedBy) {
      filters.collectedBy = collectedBy;
    }

    const startDate = searchParams.get("startDate");
    if (startDate) {
      filters.startDate = new Date(startDate);
    }

    const endDate = searchParams.get("endDate");
    if (endDate) {
      filters.endDate = new Date(endDate);
    }

    const hasLegalHold = searchParams.get("hasLegalHold");
    if (hasLegalHold !== null) {
      filters.hasLegalHold = hasLegalHold === "true";
    }

    const limit = searchParams.get("limit");
    if (limit) {
      filters.limit = parseInt(limit, 10);
    }

    const offset = searchParams.get("offset");
    if (offset) {
      filters.offset = parseInt(offset, 10);
    }

    const evidence = collector.search(filters);

    // Return summarized evidence (no content for list view)
    const results = evidence.map((e) => ({
      id: e.id,
      type: e.type,
      status: e.status,
      priority: e.priority,
      contentHash: e.contentHash.value,
      workspaceId: e.workspaceId,
      channelId: e.channelId,
      userId: e.userId,
      collectedBy: e.collectedBy,
      collectedAt: e.collectedAt,
      collectionReason: e.collectionReason,
      legalHoldCount: e.legalHoldIds.length,
      hasLegalHold: e.legalHoldIds.length > 0,
    }));

    return NextResponse.json({
      success: true,
      count: results.length,
      evidence: results,
    });
  } catch (error) {
    console.error("Evidence search error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to search evidence" },
      { status: 500 },
    );
  }
}
