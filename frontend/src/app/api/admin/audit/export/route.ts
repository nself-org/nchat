/**
 * POST /api/admin/audit/export
 *
 * Export audit logs in various formats (CSV, JSON, XLSX)
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuditQueryService } from "@/services/audit/audit-query.service";
import { logger } from "@/lib/logger";
import type { AuditLogFilters, ExportFormat } from "@/lib/audit/audit-types";

/**
 * POST /api/admin/audit/export
 *
 * Create an audit log export
 *
 * Body parameters:
 * - format: Export format ('csv', 'json', 'xlsx')
 * - filters: Optional filters to apply
 * - includeMetadata: Include metadata in export (default: true)
 * - dateRange: Optional date range filter
 * - async: Create async export job (default: false)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      format = "csv",
      filters,
      includeMetadata = true,
      dateRange,
      async: asyncExport = false,
    } = body as {
      format: ExportFormat;
      filters?: AuditLogFilters;
      includeMetadata?: boolean;
      dateRange?: { start: string; end: string };
      async?: boolean;
    };

    // Validate format
    if (!["csv", "json", "xlsx"].includes(format)) {
      return NextResponse.json(
        { success: false, error: `Unsupported format: ${format}` },
        { status: 400 },
      );
    }

    // Build filters with date range
    const exportFilters: AuditLogFilters = {
      ...filters,
      ...(dateRange && {
        startDate: new Date(dateRange.start),
        endDate: new Date(dateRange.end),
      }),
    };

    const queryService = getAuditQueryService();

    // Create async export job if requested
    if (asyncExport) {
      const job = await queryService.createExportJob({
        format,
        filters: exportFilters,
        includeMetadata,
      });

      return NextResponse.json({
        success: true,
        jobId: job.id,
        status: job.status,
        message:
          "Export job created. Check status at /api/admin/audit/export/{jobId}",
      });
    }

    // Synchronous export
    const result = await queryService.export({
      format,
      filters: exportFilters,
      includeMetadata,
    });

    // Return file download
    const headers = new Headers();
    headers.set("Content-Type", result.mimeType);
    headers.set(
      "Content-Disposition",
      `attachment; filename="${result.filename}"`,
    );

    return new NextResponse(result.data, { headers });
  } catch (error) {
    logger.error("[Audit Export API] Error", error);
    return NextResponse.json(
      { success: false, error: "Failed to export audit logs" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/admin/audit/export
 *
 * Get export job status or list recent export jobs
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const jobId = searchParams.get("jobId");

    const queryService = getAuditQueryService();

    if (jobId) {
      // Get specific job status
      const job = queryService.getExportJob(jobId);

      if (!job) {
        return NextResponse.json(
          { success: false, error: "Export job not found" },
          { status: 404 },
        );
      }

      return NextResponse.json({
        success: true,
        job: {
          id: job.id,
          status: job.status,
          format: job.format,
          progress: job.progress,
          totalRecords: job.totalRecords,
          processedRecords: job.processedRecords,
          createdAt: job.createdAt,
          completedAt: job.completedAt,
          downloadUrl: job.downloadUrl,
          error: job.error,
        },
      });
    }

    // Return info about export capabilities
    return NextResponse.json({
      success: true,
      supportedFormats: ["csv", "json", "xlsx"],
      maxRecords: 100000,
      note: "Use POST to create an export",
    });
  } catch (error) {
    logger.error("[Audit Export API] GET error", error);
    return NextResponse.json(
      { success: false, error: "Failed to get export info" },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
