/**
 * Audit Log Export API Route
 *
 * Handles audit log export operations:
 * - POST: Export audit logs in various formats (CSV, JSON)
 */

import { NextRequest, NextResponse } from "next/server";

import type {
  AuditLogEntry,
  AuditLogFilters,
  AuditCategory,
  ExportFormat,
} from "@/lib/audit/audit-types";

import {
  exportToCSV,
  exportToJSON,
  generateExportSummary,
} from "@/lib/audit/audit-export";
import { filterAuditLogs, sortAuditLogs } from "@/lib/audit/audit-search";

import { logger } from "@/lib/logger";

// ============================================================================
// Mock Data (In production, fetch from database)
// ============================================================================

// This would be replaced with actual database queries
function getMockAuditEntries(): AuditLogEntry[] {
  // Return empty array - in production, this would query the database
  return [];
}

// ============================================================================
// POST - Export Audit Logs
// ============================================================================

interface ExportRequest {
  format: ExportFormat;
  filters?: AuditLogFilters;
  dateRange?: {
    start: string; // ISO date string
    end: string; // ISO date string
  };
  includeMetadata?: boolean;
  includeSummary?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ExportRequest;

    // Validate format
    const validFormats: ExportFormat[] = ["csv", "json"];
    if (!body.format || !validFormats.includes(body.format)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid export format",
          message: `Format must be one of: ${validFormats.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Get audit entries
    let entries = getMockAuditEntries();

    // Apply filters
    if (body.filters) {
      entries = filterAuditLogs(entries, body.filters);
    }

    // Apply date range filter
    if (body.dateRange) {
      const startDate = new Date(body.dateRange.start);
      const endDate = new Date(body.dateRange.end);

      entries = entries.filter((entry) => {
        const entryDate = new Date(entry.timestamp);
        return entryDate >= startDate && entryDate <= endDate;
      });
    }

    // Sort by timestamp descending
    entries = sortAuditLogs(entries, { field: "timestamp", direction: "desc" });

    // Generate export data
    let exportData: string;
    let mimeType: string;
    let extension: string;

    switch (body.format) {
      case "csv":
        exportData = exportToCSV(entries);
        mimeType = "text/csv";
        extension = "csv";
        break;
      case "json":
        exportData = exportToJSON(entries, body.includeMetadata ?? true);
        mimeType = "application/json";
        extension = "json";
        break;
      default:
        exportData = exportToJSON(entries);
        mimeType = "application/json";
        extension = "json";
    }

    // Generate filename
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, 19);
    const filename = `audit-logs-${timestamp}.${extension}`;

    // Add summary if requested
    let summary: string | undefined;
    if (body.includeSummary) {
      summary = generateExportSummary(entries);
    }

    // Return as file download
    const headers = new Headers();
    headers.set("Content-Type", mimeType);
    headers.set("Content-Disposition", `attachment; filename="${filename}"`);

    // If returning as JSON response with metadata
    if (request.headers.get("Accept") === "application/json") {
      return NextResponse.json({
        success: true,
        data: {
          filename,
          mimeType,
          recordCount: entries.length,
          exportData,
          summary,
        },
      });
    }

    // Return as file download
    return new NextResponse(exportData, {
      status: 200,
      headers,
    });
  } catch (error) {
    logger.error("[Audit Export API] POST error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to export audit logs",
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

// ============================================================================
// GET - Get Export Options/Templates
// ============================================================================

export async function GET() {
  try {
    const templates = [
      {
        id: "full-json",
        name: "Full JSON Export",
        description: "Complete audit log data in JSON format with all metadata",
        format: "json",
        includeMetadata: true,
      },
      {
        id: "basic-json",
        name: "Basic JSON Export",
        description:
          "Core audit log data in JSON format without detailed metadata",
        format: "json",
        includeMetadata: false,
      },
      {
        id: "csv-report",
        name: "CSV Report",
        description: "Audit log data in CSV format for spreadsheet analysis",
        format: "csv",
        includeMetadata: false,
      },
      {
        id: "security-report",
        name: "Security Report",
        description: "Security-focused export with key fields for compliance",
        format: "csv",
        includeMetadata: true,
        filters: {
          category: ["security"] as AuditCategory[],
        },
      },
      {
        id: "admin-actions",
        name: "Admin Actions Report",
        description: "Export of administrative actions",
        format: "csv",
        includeMetadata: true,
        filters: {
          category: ["admin"] as AuditCategory[],
        },
      },
    ];

    const formats = [
      {
        id: "csv",
        name: "CSV",
        description: "Comma-separated values for spreadsheet applications",
        mimeType: "text/csv",
      },
      {
        id: "json",
        name: "JSON",
        description: "JavaScript Object Notation for programmatic use",
        mimeType: "application/json",
      },
    ];

    return NextResponse.json({
      success: true,
      data: {
        templates,
        formats,
        maxRecords: 100000,
        supportedFilters: [
          "category",
          "severity",
          "actorId",
          "resourceId",
          "startDate",
          "endDate",
          "success",
          "searchQuery",
        ],
      },
    });
  } catch (error) {
    logger.error("[Audit Export API] GET error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get export options",
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
