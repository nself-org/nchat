/**
 * Audit Export - Export functionality for audit logs
 *
 * This module provides export capabilities for audit logs,
 * including CSV, JSON, and XLSX formats.
 */

import type {
  AuditExportOptions,
  AuditExportResult,
  AuditLogEntry,
  ExportFormat,
} from "./audit-types";
import {
  formatEntryForCSV,
  formatEntriesForJSON,
  getCSVHeaders,
  formatTimestamp,
} from "./audit-formatter";
import { filterAuditLogs } from "./audit-search";

// ============================================================================
// CSV Export
// ============================================================================

/**
 * Export audit logs to CSV format
 */
export function exportToCSV(entries: AuditLogEntry[]): string {
  const headers = getCSVHeaders();
  const rows: string[] = [headers.join(",")];

  entries.forEach((entry) => {
    const formattedEntry = formatEntryForCSV(entry);
    const row = headers.map((header) => {
      const value = formattedEntry[header] ?? "";
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      if (value.includes(",") || value.includes('"') || value.includes("\n")) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });
    rows.push(row.join(","));
  });

  return rows.join("\n");
}

// ============================================================================
// JSON Export
// ============================================================================

/**
 * Export audit logs to JSON format
 */
export function exportToJSON(
  entries: AuditLogEntry[],
  includeMetadata = true,
): string {
  return formatEntriesForJSON(entries, includeMetadata);
}

// ============================================================================
// Export Handler
// ============================================================================

/**
 * Export audit logs with options
 */
export async function exportAuditLogs(
  entries: AuditLogEntry[],
  options: AuditExportOptions,
): Promise<AuditExportResult> {
  let filteredEntries = entries;

  // Apply filters if provided
  if (options.filters) {
    filteredEntries = filterAuditLogs(entries, options.filters);
  }

  // Apply date range filter if provided
  if (options.dateRange) {
    filteredEntries = filteredEntries.filter((entry) => {
      const entryDate = new Date(entry.timestamp);
      return (
        entryDate >= options.dateRange!.start &&
        entryDate <= options.dateRange!.end
      );
    });
  }

  // Generate export data based on format
  let data: string;
  let mimeType: string;
  let extension: string;

  switch (options.format) {
    case "csv":
      data = exportToCSV(filteredEntries);
      mimeType = "text/csv";
      extension = "csv";
      break;
    case "json":
      data = exportToJSON(filteredEntries, options.includeMetadata ?? true);
      mimeType = "application/json";
      extension = "json";
      break;
    case "xlsx":
      // XLSX export would require a library like xlsx
      // For now, fall back to CSV
      data = exportToCSV(filteredEntries);
      mimeType = "text/csv";
      extension = "csv";
      break;
    default:
      data = exportToJSON(filteredEntries);
      mimeType = "application/json";
      extension = "json";
  }

  // Generate filename
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `audit-logs-${timestamp}.${extension}`;

  return {
    filename,
    data,
    mimeType,
    recordCount: filteredEntries.length,
  };
}

// ============================================================================
// Download Helpers
// ============================================================================

/**
 * Trigger a file download in the browser
 */
export function downloadFile(
  data: string | Blob,
  filename: string,
  mimeType: string,
): void {
  const blob =
    data instanceof Blob ? data : new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export and download audit logs
 */
export async function exportAndDownloadAuditLogs(
  entries: AuditLogEntry[],
  options: AuditExportOptions,
): Promise<AuditExportResult> {
  const result = await exportAuditLogs(entries, options);
  downloadFile(result.data, result.filename, result.mimeType);
  return result;
}

// ============================================================================
// Export Templates
// ============================================================================

export interface ExportTemplate {
  id: string;
  name: string;
  description: string;
  format: ExportFormat;
  includeMetadata: boolean;
  fields?: (keyof AuditLogEntry)[];
}

export const defaultExportTemplates: ExportTemplate[] = [
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
    description: "Core audit log data in JSON format without detailed metadata",
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
    fields: [
      "id",
      "timestamp",
      "category",
      "action",
      "severity",
      "actor",
      "ipAddress",
      "success",
      "errorMessage",
    ],
  },
];

// ============================================================================
// Scheduled Export
// ============================================================================

export interface ScheduledExportConfig {
  id: string;
  name: string;
  enabled: boolean;
  schedule: "daily" | "weekly" | "monthly";
  format: ExportFormat;
  filters?: {
    categories?: string[];
    severities?: string[];
  };
  destination: {
    type: "email" | "storage" | "webhook";
    value: string;
  };
  lastRun?: Date;
  nextRun?: Date;
}

/**
 * Calculate next run date for scheduled export
 */
export function calculateNextRunDate(
  schedule: "daily" | "weekly" | "monthly",
  fromDate: Date = new Date(),
): Date {
  const nextRun = new Date(fromDate);
  nextRun.setHours(0, 0, 0, 0); // Reset to midnight

  switch (schedule) {
    case "daily":
      nextRun.setDate(nextRun.getDate() + 1);
      break;
    case "weekly":
      nextRun.setDate(nextRun.getDate() + (7 - nextRun.getDay())); // Next Sunday
      break;
    case "monthly":
      nextRun.setMonth(nextRun.getMonth() + 1);
      nextRun.setDate(1); // First of next month
      break;
  }

  return nextRun;
}

// ============================================================================
// Export Statistics
// ============================================================================

export interface ExportStatistics {
  totalExports: number;
  lastExportDate?: Date;
  exportsByFormat: Record<ExportFormat, number>;
  totalRecordsExported: number;
  averageRecordsPerExport: number;
}

/**
 * Generate export statistics summary
 */
export function generateExportSummary(entries: AuditLogEntry[]): string {
  const lines: string[] = [
    "# Audit Log Export Summary",
    "",
    `Generated: ${formatTimestamp(new Date(), "long")}`,
    `Total Records: ${entries.length}`,
    "",
    "## Overview",
    "",
  ];

  // Count by category
  const byCategory = new Map<string, number>();
  const bySeverity = new Map<string, number>();
  const bySuccess = { success: 0, failure: 0 };

  entries.forEach((entry) => {
    byCategory.set(entry.category, (byCategory.get(entry.category) ?? 0) + 1);
    bySeverity.set(entry.severity, (bySeverity.get(entry.severity) ?? 0) + 1);
    if (entry.success) {
      bySuccess.success++;
    } else {
      bySuccess.failure++;
    }
  });

  lines.push("### By Category");
  byCategory.forEach((count, category) => {
    lines.push(`- ${category}: ${count}`);
  });
  lines.push("");

  lines.push("### By Severity");
  bySeverity.forEach((count, severity) => {
    lines.push(`- ${severity}: ${count}`);
  });
  lines.push("");

  lines.push("### By Status");
  lines.push(`- Success: ${bySuccess.success}`);
  lines.push(`- Failure: ${bySuccess.failure}`);
  lines.push("");

  // Date range
  if (entries.length > 0) {
    const dates = entries.map((e) => new Date(e.timestamp).getTime());
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    lines.push("### Date Range");
    lines.push(`- From: ${formatTimestamp(minDate, "long")}`);
    lines.push(`- To: ${formatTimestamp(maxDate, "long")}`);
  }

  return lines.join("\n");
}
