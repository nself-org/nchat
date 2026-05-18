/**
 * Evidence Export API Routes
 *
 * POST /api/trust-safety/evidence/export - Create export request
 * GET /api/trust-safety/evidence/export - List export requests
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getEvidenceExportService,
  getEvidenceCollector,
} from "@/services/trust-safety";

const collector = getEvidenceCollector();
const exportService = getEvidenceExportService(undefined, collector);

/**
 * POST - Create and process export request
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (
      !body.evidenceIds ||
      !Array.isArray(body.evidenceIds) ||
      body.evidenceIds.length === 0
    ) {
      return NextResponse.json(
        { success: false, error: "Missing or empty evidenceIds array" },
        { status: 400 },
      );
    }

    if (!body.format) {
      return NextResponse.json(
        { success: false, error: "Missing required field: format" },
        { status: 400 },
      );
    }

    const requestedBy =
      body.requestedBy || request.headers.get("x-user-id") || "system";
    const requestedByRole =
      body.requestedByRole || request.headers.get("x-user-role") || "system";

    // Create export request
    const createResult = await exportService.createExportRequest({
      requestedBy,
      requestedByRole,
      evidenceIds: body.evidenceIds,
      format: body.format,
      includeCustodyChain: body.includeCustodyChain,
      includeVerification: body.includeVerification,
      redactSensitive: body.redactSensitive,
      reason: body.reason,
    });

    if (!createResult.success) {
      return NextResponse.json(
        { success: false, error: createResult.error },
        { status: 400 },
      );
    }

    // Process the export
    const processResult = await exportService.processExport(
      createResult.request.id,
      requestedBy,
      requestedByRole,
    );

    if (!processResult.success) {
      return NextResponse.json(
        { success: false, error: processResult.error },
        { status: 500 },
      );
    }

    // Return export package
    return NextResponse.json({
      success: true,
      export: {
        id: createResult.request.id,
        status: "completed",
        format: createResult.request.format,
        evidenceCount: processResult.package.metadata.evidenceCount,
        totalSizeBytes: processResult.package.metadata.totalSizeBytes,
        packageHash: processResult.package.packageHash.value,
        merkleRoot: processResult.package.verification.rootHash,
        exportedAt: processResult.package.metadata.exportedAt,
        expiresAt: createResult.request.resultExpiresAt,
      },
      package: body.includePackage ? processResult.package : undefined,
    });
  } catch (error) {
    console.error("Export creation error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create export" },
      { status: 500 },
    );
  }
}

/**
 * GET - List export requests
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const filters: Parameters<typeof exportService.getExportRequests>[0] = {};

    const status = searchParams.get("status");
    if (status) {
      filters.status = status.split(",") as any;
    }

    const requestedBy = searchParams.get("requestedBy");
    if (requestedBy) {
      filters.requestedBy = requestedBy;
    }

    const startDate = searchParams.get("startDate");
    if (startDate) {
      filters.startDate = new Date(startDate);
    }

    const endDate = searchParams.get("endDate");
    if (endDate) {
      filters.endDate = new Date(endDate);
    }

    const limit = searchParams.get("limit");
    if (limit) {
      filters.limit = parseInt(limit, 10);
    }

    const requests = exportService.getExportRequests(filters);

    return NextResponse.json({
      success: true,
      count: requests.length,
      exports: requests.map((r) => ({
        id: r.id,
        requestedBy: r.requestedBy,
        requestedAt: r.requestedAt,
        format: r.format,
        status: r.status,
        progress: r.progress,
        evidenceCount: r.evidenceIds.length,
        resultSizeBytes: r.resultSizeBytes,
        resultExpiresAt: r.resultExpiresAt,
        error: r.error,
      })),
    });
  } catch (error) {
    console.error("Export list error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to list exports" },
      { status: 500 },
    );
  }
}
