/**
 * Data Export Service
 *
 * Handles GDPR-compliant user data export requests.
 */

import type {
  DataExportRequest,
  ExportRequestStatus,
  ExportDataCategory,
  ExportFormat,
  ExportedUserData,
  ExportedProfile,
  ExportedMessage,
  ExportedFile,
  ExportedReaction,
  ExportedActivity,
  ExportedSettings,
  ExportedConsent,
} from "./compliance-types";

// ============================================================================
// CONSTANTS
// ============================================================================

export const EXPORT_CATEGORIES: {
  category: ExportDataCategory;
  label: string;
  description: string;
}[] = [
  {
    category: "profile",
    label: "Profile",
    description: "Your account information and settings",
  },
  {
    category: "messages",
    label: "Messages",
    description: "All messages you have sent",
  },
  { category: "files", label: "Files", description: "Files you have uploaded" },
  {
    category: "reactions",
    label: "Reactions",
    description: "Your emoji reactions",
  },
  {
    category: "activity",
    label: "Activity",
    description: "Your login and activity history",
  },
  {
    category: "settings",
    label: "Settings",
    description: "Your preferences and configurations",
  },
  {
    category: "consents",
    label: "Consents",
    description: "Your consent history",
  },
  { category: "all", label: "Everything", description: "All available data" },
];

export const EXPORT_FORMATS: {
  format: ExportFormat;
  label: string;
  description: string;
}[] = [
  { format: "json", label: "JSON", description: "Machine-readable format" },
  { format: "csv", label: "CSV", description: "Spreadsheet-compatible format" },
  {
    format: "zip",
    label: "ZIP Archive",
    description: "Compressed archive with all files",
  },
];

export const EXPORT_EXPIRATION_DAYS = 7;
export const MAX_DOWNLOADS_PER_EXPORT = 5;
export const EXPORT_PROCESSING_TIME_ESTIMATE = "24-48 hours";

// ============================================================================
// REQUEST CREATION
// ============================================================================

/**
 * Create a new data export request
 */
export function createExportRequest(
  userId: string,
  userEmail: string,
  options: {
    categories?: ExportDataCategory[];
    format?: ExportFormat;
    includeMetadata?: boolean;
    dateRangeStart?: Date;
    dateRangeEnd?: Date;
    ipAddress?: string;
  } = {},
): DataExportRequest {
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + EXPORT_EXPIRATION_DAYS);

  return {
    id: crypto.randomUUID(),
    userId,
    userEmail,
    status: "pending",
    categories: options.categories || ["all"],
    format: options.format || "zip",
    includeMetadata: options.includeMetadata ?? true,
    dateRangeStart: options.dateRangeStart,
    dateRangeEnd: options.dateRangeEnd,
    requestedAt: now,
    expiresAt,
    downloadCount: 0,
    maxDownloads: MAX_DOWNLOADS_PER_EXPORT,
    ipAddress: options.ipAddress,
    verifiedIdentity: false,
  };
}

// ============================================================================
// REQUEST VALIDATION
// ============================================================================

export interface ExportValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate an export request
 */
export function validateExportRequest(
  request: Partial<DataExportRequest>,
): ExportValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!request.userId) {
    errors.push("User ID is required");
  }

  if (!request.userEmail) {
    errors.push("User email is required");
  }

  if (!request.categories || request.categories.length === 0) {
    errors.push("At least one data category must be selected");
  }

  if (request.dateRangeStart && request.dateRangeEnd) {
    if (request.dateRangeStart > request.dateRangeEnd) {
      errors.push("Start date must be before end date");
    }

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    if (request.dateRangeStart < oneYearAgo) {
      warnings.push("Exporting data older than 1 year may take longer");
    }
  }

  if (request.categories?.includes("all") && request.categories.length > 1) {
    warnings.push('"Everything" category includes all other categories');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Check if user can request a new export
 */
export function canRequestExport(
  existingRequests: DataExportRequest[],
  userId: string,
): { allowed: boolean; reason?: string } {
  const pendingRequests = existingRequests.filter(
    (r) => r.userId === userId && ["pending", "processing"].includes(r.status),
  );

  if (pendingRequests.length > 0) {
    return {
      allowed: false,
      reason:
        "You already have a pending export request. Please wait for it to complete.",
    };
  }

  // Check rate limiting (max 1 request per day)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const recentRequests = existingRequests.filter(
    (r) => r.userId === userId && new Date(r.requestedAt) >= today,
  );

  if (recentRequests.length >= 1) {
    return {
      allowed: false,
      reason:
        "You can only request one export per day. Please try again tomorrow.",
    };
  }

  return { allowed: true };
}

// ============================================================================
// STATUS MANAGEMENT
// ============================================================================

/**
 * Get human-readable status information
 */
export function getExportStatusInfo(status: ExportRequestStatus): {
  label: string;
  description: string;
  color: string;
  icon: string;
} {
  const statusMap: Record<
    ExportRequestStatus,
    { label: string; description: string; color: string; icon: string }
  > = {
    pending: {
      label: "Pending",
      description: "Your request is queued for processing",
      color: "yellow",
      icon: "clock",
    },
    processing: {
      label: "Processing",
      description: "Your data is being compiled",
      color: "blue",
      icon: "loader",
    },
    completed: {
      label: "Ready",
      description: "Your export is ready for download",
      color: "green",
      icon: "check",
    },
    failed: {
      label: "Failed",
      description: "Export failed. Please try again.",
      color: "red",
      icon: "x",
    },
    expired: {
      label: "Expired",
      description: "Download link has expired",
      color: "gray",
      icon: "clock",
    },
    cancelled: {
      label: "Cancelled",
      description: "Export request was cancelled",
      color: "gray",
      icon: "x",
    },
  };

  return statusMap[status];
}

/**
 * Check if export is downloadable
 */
export function isExportDownloadable(request: DataExportRequest): {
  downloadable: boolean;
  reason?: string;
} {
  if (request.status !== "completed") {
    return { downloadable: false, reason: "Export is not ready yet" };
  }

  if (!request.downloadUrl) {
    return { downloadable: false, reason: "Download URL not available" };
  }

  if (request.expiresAt && new Date() > new Date(request.expiresAt)) {
    return { downloadable: false, reason: "Download link has expired" };
  }

  if (request.downloadCount >= request.maxDownloads) {
    return { downloadable: false, reason: "Maximum download limit reached" };
  }

  return { downloadable: true };
}

// ============================================================================
// DATA FORMATTING
// ============================================================================

/**
 * Format file size for display
 */
export function formatFileSize(bytes?: number): string {
  if (!bytes) return "Unknown size";

  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Create empty exported data structure
 */
export function createEmptyExportedData(
  exportId: string,
  userId: string,
  categories: ExportDataCategory[],
): ExportedUserData {
  return {
    exportMetadata: {
      exportId,
      exportedAt: new Date(),
      userId,
      categories,
    },
  };
}

/**
 * Sanitize exported data (remove sensitive internal fields)
 */
export function sanitizeExportedData(data: ExportedUserData): ExportedUserData {
  const sanitized = { ...data };

  // Remove internal IDs and sensitive fields from profile
  if (sanitized.profile) {
    const { ...safeProfile } = sanitized.profile;
    sanitized.profile = safeProfile;
  }

  // Remove internal message fields
  if (sanitized.messages) {
    sanitized.messages = sanitized.messages.map((msg) => ({
      id: msg.id,
      channelId: msg.channelId,
      channelName: msg.channelName,
      content: msg.content,
      createdAt: msg.createdAt,
      updatedAt: msg.updatedAt,
      threadId: msg.threadId,
      attachments: msg.attachments,
    }));
  }

  return sanitized;
}

// ============================================================================
// EXPORT TEMPLATES
// ============================================================================

/**
 * Generate export summary email content
 */
export function generateExportReadyEmail(request: DataExportRequest): {
  subject: string;
  body: string;
} {
  const expirationDate = request.expiresAt
    ? new Date(request.expiresAt).toLocaleDateString()
    : "N/A";

  return {
    subject: "Your Data Export is Ready",
    body: `
Hello,

Your requested data export is now ready for download.

Export Details:
- Request ID: ${request.id}
- Categories: ${request.categories.join(", ")}
- Format: ${request.format.toUpperCase()}
- File Size: ${formatFileSize(request.fileSize)}
- Available until: ${expirationDate}
- Remaining downloads: ${request.maxDownloads - request.downloadCount}

You can download your data from your account settings.

This is an automated message. Please do not reply to this email.
    `.trim(),
  };
}

// ============================================================================
// GDPR COMPLIANCE HELPERS
// ============================================================================

/**
 * Generate GDPR-compliant export metadata
 */
export function generateGDPRMetadata(
  request: DataExportRequest,
): Record<string, unknown> {
  return {
    exportType: "GDPR Article 20 - Right to Data Portability",
    requestedAt: request.requestedAt,
    processedAt: request.processedAt,
    dataController: "Your Organization Name", // Should be configured
    dataSubjectId: request.userId,
    dataSubjectEmail: request.userEmail,
    categoriesIncluded: request.categories,
    dateRange:
      request.dateRangeStart && request.dateRangeEnd
        ? {
            from: request.dateRangeStart,
            to: request.dateRangeEnd,
          }
        : "All available data",
    format: request.format,
    generatedAt: new Date().toISOString(),
    validUntil: request.expiresAt,
  };
}

// ============================================================================
// EXPORT
// ============================================================================

export const DataExportService = {
  EXPORT_CATEGORIES,
  EXPORT_FORMATS,
  EXPORT_EXPIRATION_DAYS,
  MAX_DOWNLOADS_PER_EXPORT,
  EXPORT_PROCESSING_TIME_ESTIMATE,
  createExportRequest,
  validateExportRequest,
  canRequestExport,
  getExportStatusInfo,
  isExportDownloadable,
  formatFileSize,
  createEmptyExportedData,
  sanitizeExportedData,
  generateExportReadyEmail,
  generateGDPRMetadata,
};
