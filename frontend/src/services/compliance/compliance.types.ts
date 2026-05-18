/**
 * Compliance Service Types
 *
 * Enhanced type definitions for GDPR, CCPA compliance operations,
 * DSAR (Data Subject Access Request) workflows, and data deletion.
 *
 * @module services/compliance/compliance.types
 * @version 1.0.0
 */

import type {
  DataExportRequest,
  DataDeletionRequest,
  ExportDataCategory,
  ExportFormat,
  DeletionScope,
  DataCategory,
  LegalHold,
  UserConsent,
  ComplianceAuditEntry,
  ComplianceAction,
} from "@/lib/compliance/compliance-types";

// ============================================================================
// DSAR (Data Subject Access Request) Types
// ============================================================================

/**
 * DSAR request types based on regulation
 */
export type DSARRequestType =
  | "access" // Right to access (GDPR Art. 15, CCPA 1798.100)
  | "portability" // Data portability (GDPR Art. 20)
  | "rectification" // Right to correction (GDPR Art. 16, CCPA 1798.106)
  | "erasure" // Right to be forgotten (GDPR Art. 17, CCPA 1798.105)
  | "restriction" // Restrict processing (GDPR Art. 18)
  | "objection" // Object to processing (GDPR Art. 21)
  | "opt_out" // Opt-out of sale (CCPA 1798.120)
  | "limit_use"; // Limit sensitive data use (CCPA 1798.121)

/**
 * DSAR request status workflow
 */
export type DSARStatus =
  | "submitted" // Initial submission
  | "identity_verification_pending" // Awaiting identity verification
  | "identity_verified" // Identity confirmed
  | "identity_failed" // Identity verification failed
  | "in_review" // Under review by compliance team
  | "approved" // Request approved
  | "rejected" // Request rejected
  | "in_progress" // Processing in progress
  | "awaiting_data" // Waiting for data collection
  | "ready_for_delivery" // Data ready, awaiting delivery
  | "delivered" // Completed and delivered
  | "closed" // Request closed
  | "cancelled" // Cancelled by requester
  | "expired"; // Download/action period expired

/**
 * DSAR priority levels
 */
export type DSARPriority = "low" | "normal" | "high" | "urgent";

/**
 * Regulation framework for the request
 */
export type RegulationFramework = "gdpr" | "ccpa" | "lgpd" | "pdpa" | "other";

/**
 * Identity verification method
 */
export type VerificationMethod =
  | "email_confirmation"
  | "sms_otp"
  | "document_upload"
  | "knowledge_based"
  | "video_call"
  | "notarized_document"
  | "trusted_contact";

/**
 * Verification status
 */
export type VerificationStatus =
  | "pending"
  | "in_progress"
  | "verified"
  | "failed"
  | "expired";

/**
 * Identity verification record
 */
export interface IdentityVerification {
  id: string;
  dsarId: string;
  method: VerificationMethod;
  status: VerificationStatus;
  requestedAt: Date;
  completedAt?: Date;
  expiresAt: Date;
  attempts: number;
  maxAttempts: number;
  verificationToken?: string;
  documentType?: string;
  documentReference?: string;
  verifiedBy?: string;
  failureReason?: string;
  metadata?: Record<string, unknown>;
}

/**
 * DSAR Request - Main data structure
 */
export interface DSARRequest {
  id: string;
  externalRef?: string; // External reference number for user
  userId: string;
  userEmail: string;
  userName?: string;
  userPhone?: string;

  // Request details
  requestType: DSARRequestType;
  regulation: RegulationFramework;
  status: DSARStatus;
  priority: DSARPriority;

  // Categories and scope
  dataCategories: ExportDataCategory[];
  scope?: {
    dateFrom?: Date;
    dateTo?: Date;
    channels?: string[];
    includeAttachments: boolean;
    includeMetadata: boolean;
  };

  // Timing
  submittedAt: Date;
  acknowledgedAt?: Date;
  deadlineAt: Date;
  extensionDeadline?: Date;
  extensionReason?: string;
  completedAt?: Date;
  closedAt?: Date;

  // Verification
  identityVerification?: IdentityVerification;
  verificationRequired: boolean;
  verifiedAt?: Date;

  // Processing
  assignedTo?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
  rejectionReason?: string;

  // Delivery
  deliveryMethod?: "download" | "email" | "postal";
  deliveryEmail?: string;
  downloadUrl?: string;
  downloadExpiresAt?: Date;
  downloadCount: number;
  maxDownloads: number;

  // Export details
  exportFormat?: ExportFormat;
  exportFileSize?: number;
  exportChecksum?: string;

  // Legal and compliance
  legalHoldBlocked: boolean;
  legalHoldIds?: string[];
  consentRecorded: boolean;

  // Audit trail
  auditEvents: DSARAuditEvent[];

  // Metadata
  sourceIp?: string;
  userAgent?: string;
  notes?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * DSAR Audit event
 */
export interface DSARAuditEvent {
  id: string;
  dsarId: string;
  timestamp: Date;
  action: DSARAction;
  actorId?: string;
  actorEmail?: string;
  actorRole?: string;
  previousStatus?: DSARStatus;
  newStatus?: DSARStatus;
  description: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

/**
 * DSAR Actions for audit trail
 */
export type DSARAction =
  | "request_submitted"
  | "identity_verification_sent"
  | "identity_verification_completed"
  | "identity_verification_failed"
  | "request_acknowledged"
  | "request_assigned"
  | "request_reviewed"
  | "request_approved"
  | "request_rejected"
  | "data_collection_started"
  | "data_collection_completed"
  | "data_export_generated"
  | "data_ready_for_delivery"
  | "data_delivered"
  | "data_downloaded"
  | "extension_requested"
  | "extension_granted"
  | "request_cancelled"
  | "request_closed"
  | "request_expired"
  | "legal_hold_applied"
  | "legal_hold_released"
  | "note_added"
  | "status_changed";

// ============================================================================
// GDPR Export Types
// ============================================================================

/**
 * GDPR Export job status
 */
export type ExportJobStatus =
  | "queued"
  | "collecting_profile"
  | "collecting_messages"
  | "collecting_files"
  | "collecting_activity"
  | "generating_archive"
  | "encrypting"
  | "uploading"
  | "completed"
  | "failed";

/**
 * GDPR Export job
 */
export interface GDPRExportJob {
  id: string;
  dsarId: string;
  userId: string;
  status: ExportJobStatus;
  progress: number; // 0-100
  currentPhase: string;

  // Data collection stats
  profileIncluded: boolean;
  messagesCollected: number;
  filesCollected: number;
  activitiesCollected: number;
  reactionsCollected: number;
  consentsCollected: number;

  // Output
  outputFormat: ExportFormat;
  outputPath?: string;
  outputSize?: number;
  outputChecksum?: string;
  encryptionKey?: string;

  // Timing
  startedAt?: Date;
  completedAt?: Date;
  estimatedCompletionAt?: Date;

  // Errors
  errorMessage?: string;
  errorDetails?: Record<string, unknown>;
  retryCount: number;
  maxRetries: number;
}

/**
 * Collected user data for export
 */
export interface CollectedUserData {
  profile: {
    id: string;
    email: string;
    displayName?: string;
    username?: string;
    avatarUrl?: string;
    timezone?: string;
    locale?: string;
    createdAt: Date;
    lastLoginAt?: Date;
    metadata?: Record<string, unknown>;
  };

  messages: Array<{
    id: string;
    channelId: string;
    channelName: string;
    content: string;
    contentType: "text" | "html" | "markdown";
    createdAt: Date;
    updatedAt?: Date;
    threadId?: string;
    parentId?: string;
    attachmentIds?: string[];
    mentions?: string[];
    reactions?: Array<{ emoji: string; count: number }>;
    isEdited: boolean;
    isDeleted: boolean;
  }>;

  files: Array<{
    id: string;
    filename: string;
    mimeType: string;
    size: number;
    uploadedAt: Date;
    channelId?: string;
    messageId?: string;
    downloadUrl?: string;
    checksum?: string;
  }>;

  channels: Array<{
    id: string;
    name: string;
    type: "public" | "private" | "dm" | "group";
    role: string;
    joinedAt: Date;
    lastReadAt?: Date;
  }>;

  activity: Array<{
    type: string;
    timestamp: Date;
    ipAddress?: string;
    userAgent?: string;
    details?: Record<string, unknown>;
  }>;

  reactions: Array<{
    messageId: string;
    emoji: string;
    createdAt: Date;
  }>;

  settings: Record<string, unknown>;

  consents: Array<{
    type: string;
    granted: boolean;
    grantedAt?: Date;
    revokedAt?: Date;
    version?: string;
  }>;
}

// ============================================================================
// Data Deletion Types
// ============================================================================

/**
 * Deletion job status
 */
export type DeletionJobStatus =
  | "queued"
  | "verifying_eligibility"
  | "checking_legal_holds"
  | "deleting_messages"
  | "deleting_files"
  | "deleting_reactions"
  | "deleting_activity"
  | "anonymizing_references"
  | "purging_backups"
  | "generating_certificate"
  | "completed"
  | "failed"
  | "partially_completed";

/**
 * Data deletion job
 */
export interface DataDeletionJob {
  id: string;
  dsarId: string;
  userId: string;
  status: DeletionJobStatus;
  progress: number; // 0-100
  currentPhase: string;

  // Scope
  scope: DeletionScope;
  categories: DataCategory[];
  retainAuditLogs: boolean;

  // Statistics
  messagesDeleted: number;
  filesDeleted: number;
  reactionsDeleted: number;
  activitiesDeleted: number;
  referencesAnonymized: number;

  // Legal holds
  legalHoldBlocked: boolean;
  legalHoldIds?: string[];
  retainedItemCount: number;
  retainedCategories?: DataCategory[];

  // Timing
  startedAt?: Date;
  completedAt?: Date;
  estimatedCompletionAt?: Date;

  // Verification
  verificationRequired: boolean;
  verifiedAt?: Date;
  verificationToken?: string;

  // Certificate
  certificateGenerated: boolean;
  certificateUrl?: string;
  certificateChecksum?: string;

  // Errors
  errorMessage?: string;
  errorDetails?: Record<string, unknown>;
  retryCount: number;
  maxRetries: number;
}

/**
 * Deletion certificate for compliance evidence
 */
export interface DeletionCertificate {
  id: string;
  userId: string;
  userEmail: string;
  dsarId: string;
  jobId: string;

  // Request details
  requestedAt: Date;
  completedAt: Date;
  scope: DeletionScope;
  categories: DataCategory[];

  // Statistics
  itemsDeleted: Record<DataCategory, number>;
  totalItemsDeleted: number;

  // Retained items (legal holds)
  itemsRetained: Record<DataCategory, number>;
  retentionReasons: string[];

  // Verification
  checksum: string;
  signature?: string;

  // Evidence
  auditTrailIncluded: boolean;
  auditTrailHash?: string;

  // Metadata
  generatedAt: Date;
  generatedBy: string;
  expiresAt?: Date;
}

// ============================================================================
// Service Configuration Types
// ============================================================================

/**
 * DSAR Service configuration
 */
export interface DSARServiceConfig {
  enabled: boolean;

  // Deadlines (in days)
  defaultDeadlineDays: number; // Default: 30 for GDPR, 45 for CCPA
  maxExtensionDays: number; // Default: 60 for GDPR, 45 for CCPA
  verificationExpiryHours: number; // Default: 48

  // Verification
  requireIdentityVerification: boolean;
  allowedVerificationMethods: VerificationMethod[];
  maxVerificationAttempts: number;

  // Rate limiting
  maxRequestsPerUserPerMonth: number;
  maxConcurrentRequests: number;

  // Delivery
  defaultExportFormat: ExportFormat;
  maxDownloads: number;
  downloadExpiryDays: number;

  // Notifications
  notifyOnSubmission: boolean;
  notifyOnCompletion: boolean;
  notifyOnExpiry: boolean;

  // Auto-processing
  autoAcknowledge: boolean;
  autoApproveVerified: boolean;

  // Retention
  retainRequestRecordsDays: number;
  retainExportsDays: number;
}

/**
 * GDPR Export service configuration
 */
export interface GDPRExportServiceConfig {
  enabled: boolean;

  // Data collection
  includeEncryptedContent: boolean;
  includeDeletedContent: boolean;
  includeSystemMessages: boolean;
  maxFileSizeMB: number;
  maxTotalSizeMB: number;

  // Format
  defaultFormat: ExportFormat;
  supportedFormats: ExportFormat[];
  includeMetadata: boolean;
  prettyPrintJson: boolean;

  // Processing
  batchSize: number;
  maxConcurrentJobs: number;
  jobTimeoutMinutes: number;
  retryAttempts: number;

  // Security
  encryptExports: boolean;
  encryptionAlgorithm: "AES-256-GCM" | "AES-256-CBC";

  // Storage
  storageProvider: "local" | "s3" | "gcs" | "azure";
  storagePath: string;
  storageRetentionDays: number;
}

/**
 * Data deletion service configuration
 */
export interface DataDeletionServiceConfig {
  enabled: boolean;

  // Cooling-off
  coolingOffPeriodDays: number; // Default: 14
  allowCancellation: boolean;

  // Verification
  requireVerification: boolean;
  verificationMethods: VerificationMethod[];

  // Processing
  batchSize: number;
  maxConcurrentJobs: number;
  jobTimeoutMinutes: number;

  // Anonymization
  anonymizeReferences: boolean;
  anonymizationPrefix: string; // e.g., "deleted_user_"

  // Retention exceptions
  retainAuditLogs: boolean;
  retainBillingRecords: boolean;
  retainLegalHoldData: boolean;

  // Certificate
  generateCertificate: boolean;
  certificateRetentionDays: number;

  // Backups
  purgeFromBackups: boolean;
  backupPurgeDays: number;
}

// ============================================================================
// Service Statistics Types
// ============================================================================

/**
 * DSAR Statistics
 */
export interface DSARStatistics {
  // Totals
  totalRequests: number;
  activeRequests: number;
  completedRequests: number;
  rejectedRequests: number;
  cancelledRequests: number;

  // By type
  byRequestType: Record<DSARRequestType, number>;

  // By status
  byStatus: Record<DSARStatus, number>;

  // By regulation
  byRegulation: Record<RegulationFramework, number>;

  // Timing metrics
  averageCompletionDays: number;
  averageResponseDays: number;
  overdueCount: number;

  // This period (configurable)
  periodStart: Date;
  periodEnd: Date;
  newRequestsInPeriod: number;
  completedInPeriod: number;

  // Verification
  verificationSuccessRate: number;
  averageVerificationAttempts: number;
}

/**
 * Compliance Dashboard Statistics
 */
export interface ComplianceDashboardStats {
  dsar: DSARStatistics;
  exports: {
    totalExports: number;
    pendingExports: number;
    completedExports: number;
    failedExports: number;
    totalDataExportedMB: number;
  };
  deletions: {
    totalDeletions: number;
    pendingDeletions: number;
    completedDeletions: number;
    blockedByLegalHold: number;
    totalItemsDeleted: number;
  };
  legalHolds: {
    activeHolds: number;
    totalHolds: number;
    usersAffected: number;
  };
  complianceScore: number;
  lastUpdated: Date;
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * Compliance event for real-time updates
 */
export interface ComplianceEvent {
  type: ComplianceEventType;
  timestamp: Date;
  dsarId?: string;
  userId?: string;
  actorId?: string;
  data: Record<string, unknown>;
}

export type ComplianceEventType =
  | "dsar_submitted"
  | "dsar_status_changed"
  | "dsar_completed"
  | "dsar_expired"
  | "export_started"
  | "export_completed"
  | "export_failed"
  | "deletion_started"
  | "deletion_completed"
  | "deletion_failed"
  | "legal_hold_applied"
  | "legal_hold_released"
  | "verification_required"
  | "verification_completed"
  | "deadline_approaching"
  | "deadline_passed";

// ============================================================================
// API Types
// ============================================================================

/**
 * Create DSAR request input
 */
export interface CreateDSARInput {
  requestType: DSARRequestType;
  regulation?: RegulationFramework;
  dataCategories?: ExportDataCategory[];
  scope?: {
    dateFrom?: Date;
    dateTo?: Date;
    channels?: string[];
    includeAttachments?: boolean;
    includeMetadata?: boolean;
  };
  deliveryMethod?: "download" | "email" | "postal";
  deliveryEmail?: string;
  exportFormat?: ExportFormat;
  notes?: string;
}

/**
 * Update DSAR request input
 */
export interface UpdateDSARInput {
  status?: DSARStatus;
  priority?: DSARPriority;
  assignedTo?: string;
  reviewNotes?: string;
  rejectionReason?: string;
  extensionReason?: string;
  notes?: string;
  tags?: string[];
}

/**
 * DSAR list filters
 */
export interface DSARListFilters {
  status?: DSARStatus[];
  requestType?: DSARRequestType[];
  regulation?: RegulationFramework[];
  priority?: DSARPriority[];
  assignedTo?: string;
  userId?: string;
  userEmail?: string;
  submittedAfter?: Date;
  submittedBefore?: Date;
  deadlineBefore?: Date;
  isOverdue?: boolean;
  hasLegalHold?: boolean;
  tags?: string[];
}

/**
 * DSAR list options
 */
export interface DSARListOptions {
  filters?: DSARListFilters;
  sortBy?: "submittedAt" | "deadlineAt" | "priority" | "status";
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
  includeAuditEvents?: boolean;
}

/**
 * Operation result
 */
export interface OperationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// Default Configurations
// ============================================================================

export const DEFAULT_DSAR_CONFIG: DSARServiceConfig = {
  enabled: true,
  defaultDeadlineDays: 30,
  maxExtensionDays: 60,
  verificationExpiryHours: 48,
  requireIdentityVerification: true,
  allowedVerificationMethods: [
    "email_confirmation",
    "sms_otp",
    "knowledge_based",
  ],
  maxVerificationAttempts: 3,
  maxRequestsPerUserPerMonth: 5,
  maxConcurrentRequests: 2,
  defaultExportFormat: "zip",
  maxDownloads: 5,
  downloadExpiryDays: 7,
  notifyOnSubmission: true,
  notifyOnCompletion: true,
  notifyOnExpiry: true,
  autoAcknowledge: true,
  autoApproveVerified: false,
  retainRequestRecordsDays: 730, // 2 years
  retainExportsDays: 7,
};

export const DEFAULT_GDPR_EXPORT_CONFIG: GDPRExportServiceConfig = {
  enabled: true,
  includeEncryptedContent: false,
  includeDeletedContent: false,
  includeSystemMessages: false,
  maxFileSizeMB: 100,
  maxTotalSizeMB: 5000,
  defaultFormat: "zip",
  supportedFormats: ["json", "csv", "zip"],
  includeMetadata: true,
  prettyPrintJson: true,
  batchSize: 1000,
  maxConcurrentJobs: 5,
  jobTimeoutMinutes: 60,
  retryAttempts: 3,
  encryptExports: true,
  encryptionAlgorithm: "AES-256-GCM",
  storageProvider: "local",
  storagePath: "/exports",
  storageRetentionDays: 7,
};

export const DEFAULT_DELETION_CONFIG: DataDeletionServiceConfig = {
  enabled: true,
  coolingOffPeriodDays: 14,
  allowCancellation: true,
  requireVerification: true,
  verificationMethods: ["email_confirmation"],
  batchSize: 500,
  maxConcurrentJobs: 3,
  jobTimeoutMinutes: 120,
  anonymizeReferences: true,
  anonymizationPrefix: "deleted_user_",
  retainAuditLogs: true,
  retainBillingRecords: true,
  retainLegalHoldData: true,
  generateCertificate: true,
  certificateRetentionDays: 730,
  purgeFromBackups: false,
  backupPurgeDays: 90,
};
