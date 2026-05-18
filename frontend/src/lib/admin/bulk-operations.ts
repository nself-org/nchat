/**
 * Bulk Operations Library
 *
 * Provides utilities for performing bulk administrative operations on users,
 * channels, messages, and other entities.
 */

import type { AdminUser, AdminChannel } from "./admin-store";

// ============================================================================
// Types
// ============================================================================

export type BulkOperationType =
  | "user.invite"
  | "user.suspend"
  | "user.delete"
  | "user.role.assign"
  | "user.permission.update"
  | "channel.archive"
  | "channel.delete"
  | "channel.transfer"
  | "channel.privacy.change"
  | "message.delete"
  | "message.flag"
  | "message.archive";

export type BulkOperationStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export interface BulkOperation {
  id: string;
  type: BulkOperationType;
  status: BulkOperationStatus;
  totalItems: number;
  processedItems: number;
  successCount: number;
  failureCount: number;
  startedAt?: Date;
  completedAt?: Date;
  createdBy: string;
  parameters: Record<string, unknown>;
  errors: BulkOperationError[];
}

export interface BulkOperationError {
  itemId: string;
  itemName: string;
  error: string;
  timestamp: Date;
}

export interface BulkUserInviteParams {
  emails: string[];
  roleId?: string;
  sendWelcomeEmail?: boolean;
  customMessage?: string;
}

export interface BulkUserSuspendParams {
  userIds: string[];
  reason: string;
  duration?: number; // in days, undefined = permanent
  notifyUsers?: boolean;
}

export interface BulkUserDeleteParams {
  userIds: string[];
  deleteMessages?: boolean;
  transferOwnership?: {
    channelOwnerId: string;
  };
}

export interface BulkRoleAssignParams {
  userIds: string[];
  roleId: string;
  notify?: boolean;
}

export interface BulkChannelArchiveParams {
  channelIds: string[];
  reason?: string;
  notifyMembers?: boolean;
}

export interface BulkChannelDeleteParams {
  channelIds: string[];
  archiveMessages?: boolean;
  notifyMembers?: boolean;
}

export interface BulkChannelTransferParams {
  channelIds: string[];
  newOwnerId: string;
  notifyOwners?: boolean;
}

export interface BulkMessageDeleteParams {
  messageIds: string[];
  reason?: string;
  notifyAuthors?: boolean;
}

export interface BulkMessageFlagParams {
  messageIds: string[];
  flagType: "spam" | "inappropriate" | "harassment" | "other";
  reason: string;
}

export interface BulkExportOptions {
  format: "csv" | "json" | "xlsx";
  fields?: string[];
  filters?: Record<string, unknown>;
}

export interface BulkImportResult {
  total: number;
  successful: number;
  failed: number;
  errors: Array<{
    row: number;
    field?: string;
    message: string;
  }>;
}

// ============================================================================
// CSV Export/Import Utilities
// ============================================================================

/**
 * Convert array of objects to CSV string
 */
export function arrayToCSV<T extends Record<string, any>>(
  data: T[],
  fields?: string[],
): string {
  if (data.length === 0) return "";

  const selectedFields = fields || Object.keys(data[0]);
  const headers = selectedFields.join(",");

  const rows = data.map((row) => {
    return selectedFields
      .map((field) => {
        const value = row[field];
        // Handle different value types
        if (value === null || value === undefined) return "";
        if (typeof value === "object") return JSON.stringify(value);
        if (typeof value === "string") {
          // Escape quotes and wrap in quotes if contains comma or newline
          const escaped = value.replace(/"/g, '""');
          return escaped.includes(",") || escaped.includes("\n")
            ? `"${escaped}"`
            : escaped;
        }
        return String(value);
      })
      .join(",");
  });

  return [headers, ...rows].join("\n");
}

/**
 * Parse CSV string to array of objects
 */
export function parseCSV(csv: string): Record<string, string>[] {
  const lines = csv.trim().split("\n");
  if (lines.length === 0) return [];

  const headers = lines[0].split(",").map((h) => h.trim());
  const data: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === headers.length) {
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      data.push(row);
    }
  }

  return data;
}

/**
 * Parse a single CSV line, handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

/**
 * Download data as CSV file
 */
export function downloadCSV(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Download data as JSON file
 */
export function downloadJSON(filename: string, data: unknown): void {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], {
    type: "application/json;charset=utf-8;",
  });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ============================================================================
// Bulk Operation Progress Tracking
// ============================================================================

export class BulkOperationProgress {
  private operation: BulkOperation;
  private onUpdate?: (operation: BulkOperation) => void;

  constructor(
    operation: BulkOperation,
    onUpdate?: (operation: BulkOperation) => void,
  ) {
    this.operation = operation;
    this.onUpdate = onUpdate;
  }

  start(): void {
    this.operation.status = "running";
    this.operation.startedAt = new Date();
    this.notify();
  }

  incrementSuccess(): void {
    this.operation.processedItems++;
    this.operation.successCount++;
    this.notify();
  }

  incrementFailure(itemId: string, itemName: string, error: string): void {
    this.operation.processedItems++;
    this.operation.failureCount++;
    this.operation.errors.push({
      itemId,
      itemName,
      error,
      timestamp: new Date(),
    });
    this.notify();
  }

  complete(): void {
    this.operation.status = "completed";
    this.operation.completedAt = new Date();
    this.notify();
  }

  fail(): void {
    this.operation.status = "failed";
    this.operation.completedAt = new Date();
    this.notify();
  }

  cancel(): void {
    this.operation.status = "cancelled";
    this.operation.completedAt = new Date();
    this.notify();
  }

  getProgress(): number {
    if (this.operation.totalItems === 0) return 0;
    return (this.operation.processedItems / this.operation.totalItems) * 100;
  }

  getOperation(): BulkOperation {
    return this.operation;
  }

  private notify(): void {
    if (this.onUpdate) {
      this.onUpdate(this.operation);
    }
  }
}

// ============================================================================
// User Export/Import
// ============================================================================

export interface UserExportData {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: string;
  isActive: boolean;
  isBanned: boolean;
  createdAt: string;
  lastSeenAt?: string;
  messagesCount: number;
  channelsCount: number;
}

export function exportUsersToCSV(users: AdminUser[]): string {
  const exportData: UserExportData[] = users.map((user) => ({
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    email: user.email,
    role: user.role.name,
    isActive: user.isActive,
    isBanned: user.isBanned,
    createdAt: user.createdAt,
    lastSeenAt: user.lastSeenAt,
    messagesCount: user.messagesCount,
    channelsCount: user.channelsCount,
  }));

  return arrayToCSV(exportData);
}

export function exportChannelsToCSV(channels: AdminChannel[]): string {
  const exportData = channels.map((channel) => ({
    id: channel.id,
    name: channel.name,
    slug: channel.slug,
    description: channel.description || "",
    type: channel.type,
    isPrivate: channel.isPrivate,
    isArchived: channel.isArchived,
    createdAt: channel.createdAt,
    creatorUsername: channel.creator?.username || "",
    membersCount: channel.membersCount,
    messagesCount: channel.messagesCount,
  }));

  return arrayToCSV(exportData);
}

// ============================================================================
// Validation Utilities
// ============================================================================

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateEmails(emails: string[]): {
  valid: string[];
  invalid: string[];
} {
  const valid: string[] = [];
  const invalid: string[] = [];

  emails.forEach((email) => {
    const trimmed = email.trim();
    if (validateEmail(trimmed)) {
      valid.push(trimmed);
    } else {
      invalid.push(trimmed);
    }
  });

  return { valid, invalid };
}

export function parseEmailList(text: string): string[] {
  // Split by newlines, commas, or semicolons
  return text
    .split(/[\n,;]/)
    .map((email) => email.trim())
    .filter((email) => email.length > 0);
}

// ============================================================================
// Batch Processing Utilities
// ============================================================================

/**
 * Process items in batches to avoid overwhelming the system
 */
export async function processBatch<T, R>(
  items: T[],
  batchSize: number,
  processor: (batch: T[]) => Promise<R[]>,
  onProgress?: (processed: number, total: number) => void,
): Promise<R[]> {
  const results: R[] = [];
  const totalBatches = Math.ceil(items.length / batchSize);

  for (let i = 0; i < totalBatches; i++) {
    const start = i * batchSize;
    const end = Math.min(start + batchSize, items.length);
    const batch = items.slice(start, end);

    const batchResults = await processor(batch);
    results.push(...batchResults);

    if (onProgress) {
      onProgress(end, items.length);
    }
  }

  return results;
}

/**
 * Delay execution for a specified time (useful for rate limiting)
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
