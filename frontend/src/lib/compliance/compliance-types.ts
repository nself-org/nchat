/**
 * Compliance and Data Retention Type Definitions
 *
 * Comprehensive types for GDPR, CCPA, HIPAA compliance,
 * data retention policies, and user consent management.
 */

// ============================================================================
// RETENTION POLICY TYPES
// ============================================================================

/**
 * Predefined retention periods
 */
export type RetentionPeriod =
  | "forever"
  | "30_days"
  | "90_days"
  | "180_days"
  | "1_year"
  | "2_years"
  | "3_years"
  | "5_years"
  | "7_years"
  | "custom";

/**
 * Data categories for retention
 */
export type DataCategory =
  | "messages"
  | "files"
  | "reactions"
  | "threads"
  | "user_profiles"
  | "activity_logs"
  | "audit_logs"
  | "analytics"
  | "system_logs"
  | "backups";

/**
 * Message types that can be excluded from retention
 */
export type MessageType =
  | "text"
  | "file"
  | "image"
  | "video"
  | "voice"
  | "system"
  | "notification"
  | "poll"
  | "pinned";

/**
 * Retention policy configuration
 */
export interface RetentionPolicy {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  isDefault: boolean;
  period: RetentionPeriod;
  customDays?: number;
  dataCategory: DataCategory;
  excludeMessageTypes?: MessageType[];
  excludePinnedMessages: boolean;
  excludeStarredMessages: boolean;
  channelOverrides?: ChannelRetentionOverride[];
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

/**
 * Channel-specific retention override
 */
export interface ChannelRetentionOverride {
  channelId: string;
  channelName: string;
  period: RetentionPeriod;
  customDays?: number;
  reason?: string;
  createdAt: Date;
  createdBy?: string;
}

/**
 * Auto-delete configuration
 */
export interface AutoDeleteConfig {
  enabled: boolean;
  scheduleTime: string; // HH:mm format
  timezone: string;
  dryRunMode: boolean;
  notifyAdmins: boolean;
  notifyUsers: boolean;
  excludeWeekends: boolean;
  excludeHolidays: boolean;
  batchSize: number;
  maxDeletionsPerRun: number;
  lastRunAt?: Date;
  nextRunAt?: Date;
}

/**
 * Retention job status
 */
export interface RetentionJobStatus {
  id: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  startedAt?: Date;
  completedAt?: Date;
  itemsProcessed: number;
  itemsDeleted: number;
  itemsFailed: number;
  errorMessage?: string;
  dryRun: boolean;
}

// ============================================================================
// LEGAL HOLD TYPES
// ============================================================================

/**
 * Legal hold for eDiscovery
 */
export interface LegalHold {
  id: string;
  name: string;
  description?: string;
  matterName: string;
  matterNumber?: string;
  custodians: string[]; // User IDs
  channels?: string[]; // Channel IDs
  startDate: Date;
  endDate?: Date;
  status: "active" | "released" | "expired";
  preserveMessages: boolean;
  preserveFiles: boolean;
  preserveAuditLogs: boolean;
  notifyCustodians: boolean;
  notificationSent?: Date;
  createdAt: Date;
  createdBy: string;
  releasedAt?: Date;
  releasedBy?: string;
  notes?: string;
}

/**
 * Legal hold notification
 */
export interface LegalHoldNotification {
  id: string;
  holdId: string;
  userId: string;
  type: "initiation" | "reminder" | "release";
  sentAt: Date;
  acknowledged: boolean;
  acknowledgedAt?: Date;
}

// ============================================================================
// DATA EXPORT TYPES (GDPR)
// ============================================================================

/**
 * Data export request status
 */
export type ExportRequestStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "expired"
  | "cancelled";

/**
 * Data categories for export
 */
export type ExportDataCategory =
  | "profile"
  | "messages"
  | "files"
  | "reactions"
  | "activity"
  | "settings"
  | "consents"
  | "all";

/**
 * Export format options
 */
export type ExportFormat = "json" | "csv" | "zip";

/**
 * User data export request
 */
export interface DataExportRequest {
  id: string;
  userId: string;
  userEmail: string;
  status: ExportRequestStatus;
  categories: ExportDataCategory[];
  format: ExportFormat;
  includeMetadata: boolean;
  dateRangeStart?: Date;
  dateRangeEnd?: Date;
  requestedAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  expiresAt?: Date;
  downloadUrl?: string;
  downloadCount: number;
  maxDownloads: number;
  fileSize?: number;
  errorMessage?: string;
  ipAddress?: string;
  verifiedIdentity: boolean;
}

/**
 * Exported user data structure
 */
export interface ExportedUserData {
  exportMetadata: {
    exportId: string;
    exportedAt: Date;
    userId: string;
    categories: ExportDataCategory[];
    dateRange?: {
      start: Date;
      end: Date;
    };
  };
  profile?: ExportedProfile;
  messages?: ExportedMessage[];
  files?: ExportedFile[];
  reactions?: ExportedReaction[];
  activity?: ExportedActivity[];
  settings?: ExportedSettings;
  consents?: ExportedConsent[];
}

export interface ExportedProfile {
  id: string;
  email: string;
  displayName?: string;
  username?: string;
  avatarUrl?: string;
  createdAt: Date;
  lastLoginAt?: Date;
  timezone?: string;
  locale?: string;
}

export interface ExportedMessage {
  id: string;
  channelId: string;
  channelName: string;
  content: string;
  createdAt: Date;
  updatedAt?: Date;
  threadId?: string;
  attachments?: string[];
}

export interface ExportedFile {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  uploadedAt: Date;
  channelId?: string;
}

export interface ExportedReaction {
  messageId: string;
  emoji: string;
  createdAt: Date;
}

export interface ExportedActivity {
  type: string;
  timestamp: Date;
  details?: Record<string, unknown>;
}

export interface ExportedSettings {
  notifications: Record<string, unknown>;
  privacy: Record<string, unknown>;
  appearance: Record<string, unknown>;
}

export interface ExportedConsent {
  type: string;
  granted: boolean;
  grantedAt?: Date;
  revokedAt?: Date;
}

// ============================================================================
// DATA DELETION TYPES (RIGHT TO BE FORGOTTEN)
// ============================================================================

/**
 * Deletion request status
 */
export type DeletionRequestStatus =
  | "pending"
  | "pending_verification"
  | "approved"
  | "processing"
  | "completed"
  | "rejected"
  | "cancelled";

/**
 * Deletion scope options
 */
export type DeletionScope =
  | "full_account"
  | "messages_only"
  | "files_only"
  | "activity_only"
  | "partial";

/**
 * Data deletion request
 */
export interface DataDeletionRequest {
  id: string;
  userId: string;
  userEmail: string;
  status: DeletionRequestStatus;
  scope: DeletionScope;
  specificCategories?: DataCategory[];
  reason?: string;
  requestedAt: Date;
  verifiedAt?: Date;
  approvedAt?: Date;
  approvedBy?: string;
  processedAt?: Date;
  completedAt?: Date;
  rejectedAt?: Date;
  rejectedBy?: string;
  rejectionReason?: string;
  retentionPeriodEnds?: Date;
  legalHoldBlocked: boolean;
  legalHoldIds?: string[];
  ipAddress?: string;
  confirmationSent: boolean;
  confirmationAcknowledged: boolean;
}

/**
 * Deletion confirmation
 */
export interface DeletionConfirmation {
  requestId: string;
  userId: string;
  deletedCategories: DataCategory[];
  itemsDeleted: Record<DataCategory, number>;
  completedAt: Date;
  retainedDueToLegalHold?: string[];
}

// ============================================================================
// CONSENT MANAGEMENT TYPES
// ============================================================================

/**
 * Consent types
 */
export type ConsentType =
  | "essential"
  | "analytics"
  | "marketing"
  | "personalization"
  | "third_party"
  | "data_processing"
  | "communications"
  | "cookies_essential"
  | "cookies_functional"
  | "cookies_analytics"
  | "cookies_advertising";

/**
 * Consent status
 */
export type ConsentStatus = "granted" | "denied" | "pending" | "expired";

/**
 * User consent record
 */
export interface UserConsent {
  id: string;
  userId: string;
  consentType: ConsentType;
  status: ConsentStatus;
  version: string;
  grantedAt?: Date;
  revokedAt?: Date;
  expiresAt?: Date;
  ipAddress?: string;
  userAgent?: string;
  source: "signup" | "settings" | "banner" | "api" | "admin";
  metadata?: Record<string, unknown>;
}

/**
 * Consent configuration
 */
export interface ConsentConfig {
  type: ConsentType;
  name: string;
  description: string;
  required: boolean;
  defaultValue: boolean;
  category: "essential" | "functional" | "analytics" | "marketing";
  legalBasis:
    | "consent"
    | "contract"
    | "legal_obligation"
    | "legitimate_interest";
  dataProcessed: string[];
  thirdParties?: string[];
  retentionPeriod?: string;
  version: string;
}

/**
 * Cookie consent preferences
 */
export interface CookiePreferences {
  essential: boolean; // Always true, cannot be changed
  functional: boolean;
  analytics: boolean;
  advertising: boolean;
  updatedAt: Date;
}

// ============================================================================
// PRIVACY SETTINGS TYPES
// ============================================================================

/**
 * User privacy settings
 */
export interface PrivacySettings {
  userId: string;
  profileVisibility: "public" | "members" | "contacts" | "private";
  showOnlineStatus: boolean;
  showLastSeen: boolean;
  showReadReceipts: boolean;
  showTypingIndicator: boolean;
  allowDirectMessages: "everyone" | "contacts" | "none";
  allowInvites: boolean;
  allowMentions: boolean;
  searchable: boolean;
  activityStatusVisible: boolean;
  shareAnalytics: boolean;
  personalizedAds: boolean;
  dataProcessingConsent: boolean;
  marketingEmails: boolean;
  productUpdates: boolean;
  securityAlerts: boolean;
  updatedAt: Date;
}

// ============================================================================
// DATA CLASSIFICATION TYPES
// ============================================================================

/**
 * Data classification levels
 */
export type ClassificationLevel =
  | "public"
  | "internal"
  | "confidential"
  | "restricted"
  | "top_secret";

/**
 * Data classification policy
 */
export interface DataClassificationPolicy {
  id: string;
  name: string;
  level: ClassificationLevel;
  description: string;
  handlingRequirements: string[];
  retentionRequirements?: RetentionPeriod;
  encryptionRequired: boolean;
  accessRestrictions: string[];
  auditRequired: boolean;
  labelRequired: boolean;
  color: string;
  icon?: string;
}

/**
 * Classified data item
 */
export interface ClassifiedData {
  dataId: string;
  dataType: DataCategory;
  classification: ClassificationLevel;
  classifiedBy: string;
  classifiedAt: Date;
  reason?: string;
  expiresAt?: Date;
}

// ============================================================================
// ENCRYPTION SETTINGS TYPES
// ============================================================================

/**
 * Encryption configuration
 */
export interface EncryptionConfig {
  enabled: boolean;
  atRestEncryption: boolean;
  inTransitEncryption: boolean;
  endToEndEncryption: boolean;
  algorithm: "AES-256-GCM" | "AES-256-CBC" | "ChaCha20-Poly1305";
  keyRotationDays: number;
  lastKeyRotation?: Date;
  nextKeyRotation?: Date;
  backupEncryption: boolean;
  fileEncryption: boolean;
}

// ============================================================================
// ACCESS CONTROL TYPES
// ============================================================================

/**
 * Access control entry
 */
export interface AccessControlEntry {
  id: string;
  resourceType: "channel" | "file" | "message" | "user" | "report" | "settings";
  resourceId: string;
  principalType: "user" | "role" | "group";
  principalId: string;
  permissions: AccessPermission[];
  grantedAt: Date;
  grantedBy: string;
  expiresAt?: Date;
  condition?: AccessCondition;
}

/**
 * Access permissions
 */
export type AccessPermission =
  | "read"
  | "write"
  | "delete"
  | "admin"
  | "export"
  | "share";

/**
 * Conditional access
 */
export interface AccessCondition {
  ipRestriction?: string[];
  timeRestriction?: {
    startTime: string;
    endTime: string;
    timezone: string;
  };
  mfaRequired?: boolean;
  deviceRestriction?: string[];
}

// ============================================================================
// COMPLIANCE REPORT TYPES
// ============================================================================

/**
 * Report types
 */
export type ComplianceReportType =
  | "retention_summary"
  | "deletion_audit"
  | "export_audit"
  | "consent_status"
  | "access_audit"
  | "legal_hold_summary"
  | "data_inventory"
  | "breach_report"
  | "compliance_overview"
  | "gdpr_compliance"
  | "ccpa_compliance"
  | "hipaa_compliance";

/**
 * Compliance report
 */
export interface ComplianceReport {
  id: string;
  type: ComplianceReportType;
  name: string;
  description?: string;
  generatedAt: Date;
  generatedBy: string;
  dateRangeStart: Date;
  dateRangeEnd: Date;
  format: "pdf" | "csv" | "json" | "html";
  fileUrl?: string;
  fileSize?: number;
  expiresAt?: Date;
  parameters?: Record<string, unknown>;
  status: "pending" | "generating" | "completed" | "failed";
  errorMessage?: string;
}

/**
 * Report schedule
 */
export interface ReportSchedule {
  id: string;
  reportType: ComplianceReportType;
  name: string;
  frequency: "daily" | "weekly" | "monthly" | "quarterly" | "annually";
  dayOfWeek?: number; // 0-6
  dayOfMonth?: number; // 1-31
  time: string; // HH:mm
  timezone: string;
  enabled: boolean;
  recipients: string[];
  format: "pdf" | "csv" | "json" | "html";
  lastRunAt?: Date;
  nextRunAt?: Date;
}

// ============================================================================
// COMPLIANCE CERTIFICATION TYPES
// ============================================================================

/**
 * Compliance standards
 */
export type ComplianceStandard =
  | "gdpr"
  | "ccpa"
  | "hipaa"
  | "soc2"
  | "iso27001"
  | "pci_dss"
  | "fedramp";

/**
 * Compliance badge/certification
 */
export interface ComplianceBadge {
  standard: ComplianceStandard;
  name: string;
  description: string;
  certified: boolean;
  certificationDate?: Date;
  expirationDate?: Date;
  certificateUrl?: string;
  auditor?: string;
  level?: string;
  scope?: string[];
}

// ============================================================================
// DATA PROCESSING AGREEMENT TYPES
// ============================================================================

/**
 * Data Processing Agreement
 */
export interface DataProcessingAgreement {
  id: string;
  name: string;
  version: string;
  effectiveDate: Date;
  expirationDate?: Date;
  parties: {
    controller: string;
    processor: string;
  };
  dataSubjects: string[];
  dataCategories: string[];
  processingPurposes: string[];
  subProcessors?: SubProcessor[];
  technicalMeasures: string[];
  organizationalMeasures: string[];
  crossBorderTransfers?: CrossBorderTransfer[];
  signedAt?: Date;
  signedBy?: string;
  documentUrl?: string;
  status: "draft" | "active" | "expired" | "terminated";
}

/**
 * Sub-processor information
 */
export interface SubProcessor {
  name: string;
  location: string;
  purpose: string;
  dataProcessed: string[];
  contractDate?: Date;
}

/**
 * Cross-border data transfer
 */
export interface CrossBorderTransfer {
  destinationCountry: string;
  transferMechanism: "adequacy_decision" | "scc" | "bcr" | "derogation";
  safeguards: string[];
}

// ============================================================================
// AUDIT LOG TYPES
// ============================================================================

/**
 * Compliance audit log entry
 */
export interface ComplianceAuditEntry {
  id: string;
  timestamp: Date;
  action: ComplianceAction;
  actorId?: string;
  actorEmail?: string;
  targetType: string;
  targetId?: string;
  details: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
}

/**
 * Compliance actions
 */
export type ComplianceAction =
  | "export_requested"
  | "export_completed"
  | "export_downloaded"
  | "deletion_requested"
  | "deletion_approved"
  | "deletion_completed"
  | "deletion_rejected"
  | "consent_granted"
  | "consent_revoked"
  | "legal_hold_created"
  | "legal_hold_released"
  | "retention_policy_created"
  | "retention_policy_updated"
  | "retention_policy_deleted"
  | "retention_job_started"
  | "retention_job_completed"
  | "privacy_settings_updated"
  | "classification_changed"
  | "access_granted"
  | "access_revoked"
  | "report_generated"
  | "dpa_signed"
  | "encryption_config_updated";

// ============================================================================
// STORE STATE TYPES
// ============================================================================

/**
 * Compliance store state
 */
export interface ComplianceState {
  // Retention
  retentionPolicies: RetentionPolicy[];
  autoDeleteConfig: AutoDeleteConfig | null;
  retentionJobs: RetentionJobStatus[];

  // Legal Holds
  legalHolds: LegalHold[];

  // Export/Deletion Requests
  exportRequests: DataExportRequest[];
  deletionRequests: DataDeletionRequest[];

  // Consent
  userConsents: UserConsent[];
  consentConfigs: ConsentConfig[];
  cookiePreferences: CookiePreferences | null;

  // Privacy
  privacySettings: PrivacySettings | null;

  // Classification
  classificationPolicies: DataClassificationPolicy[];

  // Encryption
  encryptionConfig: EncryptionConfig | null;

  // Reports
  reports: ComplianceReport[];
  reportSchedules: ReportSchedule[];

  // Certifications
  badges: ComplianceBadge[];

  // DPAs
  dpas: DataProcessingAgreement[];

  // UI State
  loading: boolean;
  error: string | null;
  selectedPolicyId: string | null;
  selectedHoldId: string | null;
}

/**
 * Compliance store actions
 */
export interface ComplianceActions {
  // Retention Policies
  setRetentionPolicies: (policies: RetentionPolicy[]) => void;
  addRetentionPolicy: (policy: RetentionPolicy) => void;
  updateRetentionPolicy: (
    id: string,
    updates: Partial<RetentionPolicy>,
  ) => void;
  deleteRetentionPolicy: (id: string) => void;
  setAutoDeleteConfig: (config: AutoDeleteConfig | null) => void;

  // Legal Holds
  setLegalHolds: (holds: LegalHold[]) => void;
  addLegalHold: (hold: LegalHold) => void;
  updateLegalHold: (id: string, updates: Partial<LegalHold>) => void;
  releaseLegalHold: (id: string, releasedBy: string) => void;

  // Export Requests
  setExportRequests: (requests: DataExportRequest[]) => void;
  addExportRequest: (request: DataExportRequest) => void;
  updateExportRequest: (
    id: string,
    updates: Partial<DataExportRequest>,
  ) => void;

  // Deletion Requests
  setDeletionRequests: (requests: DataDeletionRequest[]) => void;
  addDeletionRequest: (request: DataDeletionRequest) => void;
  updateDeletionRequest: (
    id: string,
    updates: Partial<DataDeletionRequest>,
  ) => void;

  // Consent
  setUserConsents: (consents: UserConsent[]) => void;
  updateConsent: (type: ConsentType, status: ConsentStatus) => void;
  setCookiePreferences: (prefs: CookiePreferences) => void;

  // Privacy
  setPrivacySettings: (settings: PrivacySettings | null) => void;
  updatePrivacySettings: (updates: Partial<PrivacySettings>) => void;

  // Encryption
  setEncryptionConfig: (config: EncryptionConfig | null) => void;

  // Reports
  setReports: (reports: ComplianceReport[]) => void;
  addReport: (report: ComplianceReport) => void;

  // UI
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSelectedPolicyId: (id: string | null) => void;
  setSelectedHoldId: (id: string | null) => void;

  // Reset
  reset: () => void;
}

export type ComplianceStore = ComplianceState & ComplianceActions;

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Convert retention period to days
 */
export function retentionPeriodToDays(
  period: RetentionPeriod,
  customDays?: number,
): number | null {
  switch (period) {
    case "forever":
      return null;
    case "30_days":
      return 30;
    case "90_days":
      return 90;
    case "180_days":
      return 180;
    case "1_year":
      return 365;
    case "2_years":
      return 730;
    case "3_years":
      return 1095;
    case "5_years":
      return 1825;
    case "7_years":
      return 2555;
    case "custom":
      return customDays ?? null;
  }
}

/**
 * Format retention period for display
 */
export function formatRetentionPeriod(
  period: RetentionPeriod,
  customDays?: number,
): string {
  switch (period) {
    case "forever":
      return "Keep Forever";
    case "30_days":
      return "30 Days";
    case "90_days":
      return "90 Days";
    case "180_days":
      return "6 Months";
    case "1_year":
      return "1 Year";
    case "2_years":
      return "2 Years";
    case "3_years":
      return "3 Years";
    case "5_years":
      return "5 Years";
    case "7_years":
      return "7 Years";
    case "custom":
      return customDays ? `${customDays} Days` : "Custom";
  }
}

/**
 * Get compliance standard display info
 */
export function getComplianceStandardInfo(standard: ComplianceStandard): {
  name: string;
  fullName: string;
  description: string;
} {
  const info: Record<
    ComplianceStandard,
    { name: string; fullName: string; description: string }
  > = {
    gdpr: {
      name: "GDPR",
      fullName: "General Data Protection Regulation",
      description: "EU data protection and privacy regulation",
    },
    ccpa: {
      name: "CCPA",
      fullName: "California Consumer Privacy Act",
      description: "California state privacy law",
    },
    hipaa: {
      name: "HIPAA",
      fullName: "Health Insurance Portability and Accountability Act",
      description: "US healthcare data protection",
    },
    soc2: {
      name: "SOC 2",
      fullName: "Service Organization Control 2",
      description: "Security, availability, and confidentiality controls",
    },
    iso27001: {
      name: "ISO 27001",
      fullName: "ISO/IEC 27001",
      description: "Information security management system",
    },
    pci_dss: {
      name: "PCI DSS",
      fullName: "Payment Card Industry Data Security Standard",
      description: "Payment card data security",
    },
    fedramp: {
      name: "FedRAMP",
      fullName: "Federal Risk and Authorization Management Program",
      description: "US government cloud security",
    },
  };
  return info[standard];
}
