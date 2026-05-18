/**
 * Data Export API (GDPR Article 20 - Right to Data Portability)
 *
 * Allows users to request and download their personal data.
 */

import { NextRequest, NextResponse } from "next/server";
import { DataExportService } from "@/lib/compliance/data-export";
import type {
  DataExportRequest,
  ExportDataCategory,
  ExportFormat,
} from "@/lib/compliance/compliance-types";
import { logger } from "@/lib/logger";

// Simulated database (replace with real database calls)
const exportRequests: DataExportRequest[] = [];

/**
 * GET /api/compliance/export
 * List export requests for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id") || "demo-user";

    const userRequests = exportRequests.filter((r) => r.userId === userId);

    return NextResponse.json({
      success: true,
      requests: userRequests,
      count: userRequests.length,
    });
  } catch (error) {
    logger.error("Error fetching export requests:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch export requests",
        message:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/compliance/export
 * Create a new data export request
 */
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id") || "demo-user";
    const userEmail = request.headers.get("x-user-email") || "demo@example.com";
    const ipAddress =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      undefined;

    const body = await request.json();
    const {
      categories,
      format,
      includeMetadata,
      dateRangeStart,
      dateRangeEnd,
    } = body;

    // Validate request
    const validation = DataExportService.validateExportRequest({
      userId,
      userEmail,
      categories: categories as ExportDataCategory[],
      format: format as ExportFormat,
      includeMetadata,
      dateRangeStart: dateRangeStart ? new Date(dateRangeStart) : undefined,
      dateRangeEnd: dateRangeEnd ? new Date(dateRangeEnd) : undefined,
    });

    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid export request",
          errors: validation.errors,
          warnings: validation.warnings,
        },
        { status: 400 },
      );
    }

    // Check rate limits
    const canRequest = DataExportService.canRequestExport(
      exportRequests,
      userId,
    );
    if (!canRequest.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: canRequest.reason,
        },
        { status: 429 },
      );
    }

    // Create export request
    const exportRequest = DataExportService.createExportRequest(
      userId,
      userEmail,
      {
        categories: categories as ExportDataCategory[],
        format: format as ExportFormat,
        includeMetadata,
        dateRangeStart: dateRangeStart ? new Date(dateRangeStart) : undefined,
        dateRangeEnd: dateRangeEnd ? new Date(dateRangeEnd) : undefined,
        ipAddress,
      },
    );

    // Save to database
    exportRequests.push(exportRequest);

    // await queueExportJob(exportRequest.id);

    // await logComplianceEvent('export_requested', { userId, requestId: exportRequest.id });

    return NextResponse.json({
      success: true,
      request: exportRequest,
      message: `Your export request has been created. Processing typically takes ${DataExportService.EXPORT_PROCESSING_TIME_ESTIMATE}.`,
      warnings: validation.warnings,
    });
  } catch (error) {
    logger.error("Error creating export request:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create export request",
        message:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/compliance/export?id=<requestId>
 * Cancel a pending export request
 */
export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id") || "demo-user";
    const requestId = request.nextUrl.searchParams.get("id");

    if (!requestId) {
      return NextResponse.json(
        { success: false, error: "Request ID is required" },
        { status: 400 },
      );
    }

    const exportRequest = exportRequests.find(
      (r) => r.id === requestId && r.userId === userId,
    );

    if (!exportRequest) {
      return NextResponse.json(
        { success: false, error: "Export request not found" },
        { status: 404 },
      );
    }

    if (!["pending", "processing"].includes(exportRequest.status)) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot cancel an export request in this status",
        },
        { status: 400 },
      );
    }

    // Update status
    exportRequest.status = "cancelled";

    // await logComplianceEvent('export_cancelled', { userId, requestId });

    return NextResponse.json({
      success: true,
      message: "Export request cancelled successfully",
    });
  } catch (error) {
    logger.error("Error cancelling export request:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to cancel export request",
        message:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Unknown error",
      },
      { status: 500 },
    );
  }
}
