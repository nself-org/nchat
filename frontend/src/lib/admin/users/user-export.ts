/**
 * User Export Module
 * Handles user export functionality for admin
 */

import type {
  AdminUser,
  UserFilterOptions,
  UserExportOptions,
  UserExportResult,
} from "./user-types";

// ============================================================================
// Export Operations
// ============================================================================

export async function exportUsers(
  options: UserExportOptions,
): Promise<UserExportResult> {
  const response = await fetch("/api/admin/users/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    throw new Error("Failed to export users");
  }

  return response.json();
}

export async function downloadExport(exportId: string): Promise<Blob> {
  const response = await fetch(`/api/admin/users/export/${exportId}/download`);

  if (!response.ok) {
    throw new Error("Failed to download export");
  }

  return response.blob();
}

// ============================================================================
// Client-side Export
// ============================================================================

export function exportToCSV(
  users: AdminUser[],
  fields?: (keyof AdminUser)[],
): string {
  const defaultFields: (keyof AdminUser)[] = [
    "id",
    "username",
    "displayName",
    "email",
    "isActive",
    "isBanned",
    "createdAt",
    "lastSeenAt",
  ];

  const exportFields = fields || defaultFields;

  // Create header row
  const header = exportFields.map(formatFieldName).join(",");

  // Create data rows
  const rows = users.map((user) => {
    return exportFields
      .map((field) => {
        const value = getFieldValue(user, field);
        return escapeCSVValue(value);
      })
      .join(",");
  });

  return [header, ...rows].join("\n");
}

export function exportToJSON(
  users: AdminUser[],
  fields?: (keyof AdminUser)[],
): string {
  const data = fields
    ? users.map((user) => {
        const filtered: Partial<AdminUser> = {};
        for (const field of fields) {
          if (field in user) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (filtered as any)[field] = user[field];
          }
        }
        return filtered;
      })
    : users;

  return JSON.stringify(data, null, 2);
}

// ============================================================================
// Download Functions
// ============================================================================

export function downloadCSV(users: AdminUser[], filename?: string): void {
  const csv = exportToCSV(users);
  downloadFile(csv, filename || "users-export.csv", "text/csv");
}

export function downloadJSON(users: AdminUser[], filename?: string): void {
  const json = exportToJSON(users);
  downloadFile(json, filename || "users-export.json", "application/json");
}

export function downloadFile(
  content: string,
  filename: string,
  mimeType: string,
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================================================
// Utility Functions
// ============================================================================

function formatFieldName(field: string): string {
  // Convert camelCase to Title Case
  return field
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

function getFieldValue(user: AdminUser, field: keyof AdminUser): string {
  const value = user[field];

  if (value === null || value === undefined) {
    return "";
  }

  if (field === "role") {
    return typeof value === "object" && value !== null
      ? (value as { name: string }).name
      : String(value);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  return String(value);
}

function escapeCSVValue(value: string): string {
  // If value contains comma, newline, or quote, wrap in quotes
  if (/[,\n"]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// ============================================================================
// Export Presets
// ============================================================================

export const EXPORT_FIELD_PRESETS = {
  basic: ["id", "username", "displayName", "email"] as (keyof AdminUser)[],
  standard: [
    "id",
    "username",
    "displayName",
    "email",
    "isActive",
    "isBanned",
    "createdAt",
    "lastSeenAt",
  ] as (keyof AdminUser)[],
  full: [
    "id",
    "username",
    "displayName",
    "email",
    "avatarUrl",
    "bio",
    "location",
    "website",
    "isActive",
    "isBanned",
    "isVerified",
    "createdAt",
    "updatedAt",
    "lastSeenAt",
    "lastLoginAt",
    "messagesCount",
    "channelsCount",
  ] as (keyof AdminUser)[],
} as const;

export const EXPORT_FORMATS = [
  { value: "csv", label: "CSV (.csv)", description: "Comma-separated values" },
  {
    value: "json",
    label: "JSON (.json)",
    description: "JavaScript Object Notation",
  },
  {
    value: "xlsx",
    label: "Excel (.xlsx)",
    description: "Microsoft Excel format",
  },
] as const;

export function getExportFilename(format: string, prefix?: string): string {
  const date = new Date().toISOString().split("T")[0];
  const name = prefix || "users";
  return `${name}-export-${date}.${format}`;
}

// ============================================================================
// Export Progress Tracking
// ============================================================================

export interface ExportProgress {
  status: "pending" | "processing" | "completed" | "failed";
  progress: number; // 0-100
  totalRecords: number;
  processedRecords: number;
  error?: string;
}

export async function getExportProgress(
  exportId: string,
): Promise<ExportProgress> {
  const response = await fetch(`/api/admin/users/export/${exportId}/progress`);

  if (!response.ok) {
    throw new Error("Failed to get export progress");
  }

  return response.json();
}

// ============================================================================
// Scheduled Exports
// ============================================================================

export interface ScheduledExport {
  id: string;
  name: string;
  schedule: string; // cron expression
  options: UserExportOptions;
  recipients: string[];
  isActive: boolean;
  lastRunAt?: string;
  nextRunAt: string;
  createdAt: string;
}

export async function createScheduledExport(
  name: string,
  schedule: string,
  options: UserExportOptions,
  recipients: string[],
): Promise<ScheduledExport> {
  const response = await fetch("/api/admin/users/export/scheduled", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, schedule, options, recipients }),
  });

  if (!response.ok) {
    throw new Error("Failed to create scheduled export");
  }

  return response.json();
}

export async function getScheduledExports(): Promise<ScheduledExport[]> {
  const response = await fetch("/api/admin/users/export/scheduled");

  if (!response.ok) {
    throw new Error("Failed to get scheduled exports");
  }

  return response.json();
}

export async function deleteScheduledExport(exportId: string): Promise<void> {
  const response = await fetch(
    `/api/admin/users/export/scheduled/${exportId}`,
    {
      method: "DELETE",
    },
  );

  if (!response.ok) {
    throw new Error("Failed to delete scheduled export");
  }
}
