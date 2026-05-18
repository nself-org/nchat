/**
 * Trust & Safety Evidence Types
 *
 * Comprehensive type definitions for the evidence pipeline including:
 * - Immutable evidence records
 * - Chain of custody tracking
 * - Legal hold management
 * - Tamper-evident audit trails
 * - Export formats
 */

// ============================================================================
// Core Evidence Types
// ============================================================================

/**
 * Unique identifier for evidence records
 */
export type EvidenceId = string;

/**
 * Evidence record status
 */
export type EvidenceStatus =
  | "active" // Currently relevant and accessible
  | "archived" // Past retention period but preserved
  | "legal_hold" // Under legal hold, cannot be deleted
  | "deleted" // Marked for deletion (soft delete)
  | "purged"; // Permanently removed (only after legal hold expires)

/**
 * Types of evidence that can be collected
 */
export type EvidenceType =
  | "message" // Chat message content
  | "attachment" // File attachments
  | "user_profile" // User profile data
  | "channel_metadata" // Channel information
  | "moderation_action" // Moderation actions taken
  | "report" // User reports
  | "appeal" // Appeals submitted
  | "system_log" // System-generated logs
  | "audit_trail" // Audit log entries
  | "screenshot" // Screenshot evidence
  | "media"; // Audio/video content

/**
 * Priority levels for evidence
 */
export type EvidencePriority = "low" | "medium" | "high" | "critical";

/**
 * Hash algorithm used for integrity verification
 */
export type HashAlgorithm = "SHA-256" | "SHA-384" | "SHA-512";

// ============================================================================
// Evidence Record
// ============================================================================

/**
 * Content hash for tamper detection
 */
export interface ContentHash {
  /** Hash algorithm used */
  algorithm: HashAlgorithm;
  /** Hex-encoded hash value */
  value: string;
  /** When the hash was computed */
  computedAt: Date;
  /** Previous hash in the chain (for chained hashing) */
  previousHash?: string;
}

/**
 * Metadata attached to evidence
 */
export interface EvidenceMetadata {
  /** Original source of the evidence */
  source: string;
  /** Content type (MIME type if applicable) */
  contentType?: string;
  /** Size in bytes */
  sizeBytes?: number;
  /** Original filename if applicable */
  filename?: string;
  /** Additional key-value metadata */
  custom?: Record<string, unknown>;
}

/**
 * Reference to related evidence or entities
 */
export interface EvidenceReference {
  /** Type of reference */
  type: "evidence" | "user" | "channel" | "message" | "report" | "case";
  /** ID of referenced entity */
  id: string;
  /** Relationship description */
  relationship: string;
}

/**
 * Immutable evidence record
 */
export interface EvidenceRecord {
  /** Unique identifier */
  id: EvidenceId;
  /** Type of evidence */
  type: EvidenceType;
  /** Current status */
  status: EvidenceStatus;
  /** Priority level */
  priority: EvidencePriority;

  /** The actual content (may be encrypted) */
  content: string;
  /** Whether content is encrypted */
  isEncrypted: boolean;
  /** Encryption key ID if encrypted */
  encryptionKeyId?: string;

  /** Content integrity hash */
  contentHash: ContentHash;
  /** Chain hash linking to previous record */
  chainHash?: ContentHash;

  /** Evidence metadata */
  metadata: EvidenceMetadata;

  /** Related entities */
  references: EvidenceReference[];

  /** Associated workspace */
  workspaceId: string;
  /** Associated channel if applicable */
  channelId?: string;
  /** Associated user if applicable */
  userId?: string;

  /** Who collected this evidence */
  collectedBy: string;
  /** When it was collected */
  collectedAt: Date;
  /** Reason for collection */
  collectionReason: string;

  /** Legal hold IDs applied to this evidence */
  legalHoldIds: string[];

  /** Retention policy applied */
  retentionPolicyId?: string;
  /** When this evidence should be reviewed for deletion */
  retentionExpiresAt?: Date;

  /** When the record was created (immutable) */
  createdAt: Date;
  /** Last status update */
  updatedAt: Date;

  /** Version for optimistic locking */
  version: number;
}

// ============================================================================
// Chain of Custody
// ============================================================================

/**
 * Types of custody events
 */
export type CustodyEventType =
  | "collected" // Evidence first collected
  | "accessed" // Evidence was accessed/viewed
  | "exported" // Evidence was exported
  | "transferred" // Custody transferred to another party
  | "legal_hold_applied" // Legal hold placed on evidence
  | "legal_hold_released" // Legal hold removed
  | "status_changed" // Status was changed
  | "verified" // Integrity was verified
  | "failed_verification" // Integrity check failed
  | "archived" // Evidence was archived
  | "restored" // Evidence was restored from archive
  | "annotated"; // Notes were added

/**
 * Chain of custody entry
 */
export interface CustodyEntry {
  /** Unique identifier */
  id: string;
  /** Evidence ID this entry relates to */
  evidenceId: EvidenceId;
  /** Type of custody event */
  eventType: CustodyEventType;
  /** Who performed the action */
  actorId: string;
  /** Actor's name (for record keeping) */
  actorName?: string;
  /** Actor's role at time of action */
  actorRole: string;
  /** When the event occurred */
  timestamp: Date;
  /** IP address of actor */
  ipAddress?: string;
  /** User agent string */
  userAgent?: string;
  /** Description of the action */
  description: string;
  /** Any notes added */
  notes?: string;
  /** Hash of this entry for verification */
  entryHash: string;
  /** Hash of previous entry (creates chain) */
  previousEntryHash?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Complete chain of custody for an evidence record
 */
export interface CustodyChain {
  /** Evidence ID */
  evidenceId: EvidenceId;
  /** All custody entries in chronological order */
  entries: CustodyEntry[];
  /** Hash of the complete chain */
  chainHash: string;
  /** Last verification timestamp */
  lastVerified?: Date;
  /** Whether the chain is valid */
  isValid: boolean;
}

// ============================================================================
// Legal Hold
// ============================================================================

/**
 * Legal hold status
 */
export type LegalHoldStatus =
  | "active" // Currently in effect
  | "pending" // Scheduled to take effect
  | "released" // No longer in effect
  | "expired"; // Past expiration date

/**
 * Legal hold scope
 */
export type LegalHoldScope =
  | "user" // All evidence related to a user
  | "channel" // All evidence in a channel
  | "workspace" // All evidence in a workspace
  | "date_range" // Evidence within a date range
  | "specific" // Specific evidence IDs
  | "query"; // Evidence matching a query

/**
 * Legal hold record
 */
export interface LegalHold {
  /** Unique identifier */
  id: string;
  /** Name of the legal hold */
  name: string;
  /** Description and reason for the hold */
  description: string;
  /** Current status */
  status: LegalHoldStatus;
  /** Scope of the hold */
  scope: LegalHoldScope;

  /** Target criteria based on scope */
  criteria: LegalHoldCriteria;

  /** Case number or reference */
  caseReference?: string;
  /** Legal matter ID */
  legalMatterId?: string;

  /** Who requested the hold */
  requestedBy: string;
  /** Who approved the hold */
  approvedBy?: string;
  /** Legal counsel contact */
  legalContact?: string;

  /** When the hold takes effect */
  effectiveFrom: Date;
  /** When the hold expires (if applicable) */
  expiresAt?: Date;

  /** Evidence IDs currently under this hold */
  evidenceIds: EvidenceId[];
  /** Count of evidence records */
  evidenceCount: number;

  /** When created */
  createdAt: Date;
  /** Last updated */
  updatedAt: Date;

  /** Audit notes */
  notes?: string[];
}

/**
 * Criteria for legal hold scope
 */
export interface LegalHoldCriteria {
  /** User IDs to include */
  userIds?: string[];
  /** Channel IDs to include */
  channelIds?: string[];
  /** Workspace ID */
  workspaceId?: string;
  /** Date range start */
  startDate?: Date;
  /** Date range end */
  endDate?: Date;
  /** Specific evidence IDs */
  evidenceIds?: EvidenceId[];
  /** Search query */
  query?: string;
  /** Evidence types to include */
  evidenceTypes?: EvidenceType[];
  /** Keywords to match */
  keywords?: string[];
}

// ============================================================================
// Retention Policy
// ============================================================================

/**
 * Retention policy definition
 */
export interface RetentionPolicy {
  /** Unique identifier */
  id: string;
  /** Name of the policy */
  name: string;
  /** Description */
  description: string;
  /** Whether this policy is active */
  isActive: boolean;

  /** Evidence types this policy applies to */
  evidenceTypes: EvidenceType[];
  /** Priority levels this policy applies to */
  priorities?: EvidencePriority[];

  /** Retention period in days */
  retentionDays: number;
  /** Action to take when retention expires */
  expirationAction: "archive" | "delete" | "review";

  /** Whether to archive before deletion */
  archiveBeforeDelete: boolean;
  /** Archive retention in days (if archiving) */
  archiveRetentionDays?: number;

  /** Who can override this policy */
  overrideRoles?: string[];

  /** When created */
  createdAt: Date;
  /** Last updated */
  updatedAt: Date;
  /** Who created this policy */
  createdBy: string;
}

// ============================================================================
// Evidence Export
// ============================================================================

/**
 * Export format types
 */
export type ExportFormat = "json" | "pdf" | "csv" | "eml" | "zip";

/**
 * Export status
 */
export type ExportStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "expired";

/**
 * Evidence export request
 */
export interface EvidenceExportRequest {
  /** Unique identifier */
  id: string;
  /** Who requested the export */
  requestedBy: string;
  /** When requested */
  requestedAt: Date;

  /** Evidence IDs to export */
  evidenceIds: EvidenceId[];
  /** Export format */
  format: ExportFormat;
  /** Whether to include custody chain */
  includeCustodyChain: boolean;
  /** Whether to include verification data */
  includeVerification: boolean;
  /** Whether to redact sensitive data */
  redactSensitive: boolean;

  /** Export status */
  status: ExportStatus;
  /** Processing progress (0-100) */
  progress: number;

  /** Result file URL (when completed) */
  resultUrl?: string;
  /** Result file hash */
  resultHash?: ContentHash;
  /** Result file size */
  resultSizeBytes?: number;
  /** When result expires */
  resultExpiresAt?: Date;

  /** Error message if failed */
  error?: string;

  /** When processing started */
  startedAt?: Date;
  /** When completed */
  completedAt?: Date;
}

/**
 * Exported evidence package
 */
export interface EvidenceExportPackage {
  /** Export metadata */
  metadata: {
    exportId: string;
    exportedAt: Date;
    exportedBy: string;
    format: ExportFormat;
    evidenceCount: number;
    totalSizeBytes: number;
  };

  /** Package integrity hash */
  packageHash: ContentHash;

  /** Manifest of included evidence */
  manifest: {
    evidenceId: EvidenceId;
    type: EvidenceType;
    contentHash: string;
    filename?: string;
  }[];

  /** Chain of custody for each evidence */
  custodyChains?: Record<EvidenceId, CustodyChain>;

  /** Verification certificate */
  verification: {
    algorithm: HashAlgorithm;
    rootHash: string;
    timestamp: Date;
    signedBy?: string;
    signature?: string;
  };

  /** Evidence records (in JSON format, or paths in ZIP) */
  evidence: EvidenceRecord[] | string[];
}

// ============================================================================
// Audit Trail
// ============================================================================

/**
 * Audit event categories
 */
export type AuditCategory =
  | "evidence" // Evidence-related events
  | "legal_hold" // Legal hold events
  | "export" // Export events
  | "access" // Access events
  | "configuration" // Configuration changes
  | "verification"; // Verification events

/**
 * Audit trail entry
 */
export interface AuditEntry {
  /** Unique identifier */
  id: string;
  /** Category of event */
  category: AuditCategory;
  /** Specific action */
  action: string;
  /** Who performed the action */
  actorId: string;
  /** Actor's role */
  actorRole: string;
  /** When it occurred */
  timestamp: Date;
  /** IP address */
  ipAddress?: string;
  /** Target entity type */
  targetType?: string;
  /** Target entity ID */
  targetId?: string;
  /** Description of the action */
  description: string;
  /** Before state (for changes) */
  beforeState?: Record<string, unknown>;
  /** After state (for changes) */
  afterState?: Record<string, unknown>;
  /** Hash of this entry */
  entryHash: string;
  /** Hash of previous entry in chain */
  previousHash?: string;
  /** Request ID for correlation */
  requestId?: string;
}

// ============================================================================
// Verification
// ============================================================================

/**
 * Verification result
 */
export interface VerificationResult {
  /** Evidence ID verified */
  evidenceId: EvidenceId;
  /** Whether verification passed */
  isValid: boolean;
  /** Timestamp of verification */
  verifiedAt: Date;
  /** Who performed verification */
  verifiedBy: string;
  /** Checks performed */
  checks: VerificationCheck[];
  /** Overall result message */
  message: string;
}

/**
 * Individual verification check
 */
export interface VerificationCheck {
  /** Name of the check */
  name: string;
  /** Whether it passed */
  passed: boolean;
  /** Expected value */
  expected?: string;
  /** Actual value */
  actual?: string;
  /** Error message if failed */
  error?: string;
}

// ============================================================================
// Collection Request
// ============================================================================

/**
 * Request to collect evidence
 */
export interface EvidenceCollectionRequest {
  /** Type of evidence to collect */
  type: EvidenceType;
  /** The content to preserve */
  content: string;
  /** Whether content should be encrypted */
  encrypt?: boolean;
  /** Priority level */
  priority?: EvidencePriority;
  /** Collection reason */
  reason: string;
  /** Source of the evidence */
  source: string;
  /** Associated workspace */
  workspaceId: string;
  /** Associated channel */
  channelId?: string;
  /** Associated user */
  userId?: string;
  /** Related entity references */
  references?: Omit<EvidenceReference, "id">[];
  /** Additional metadata */
  metadata?: Partial<EvidenceMetadata>;
  /** Retention policy to apply */
  retentionPolicyId?: string;
}

// ============================================================================
// Statistics
// ============================================================================

/**
 * Evidence statistics
 */
export interface EvidenceStatistics {
  /** Total evidence count */
  total: number;
  /** Count by status */
  byStatus: Record<EvidenceStatus, number>;
  /** Count by type */
  byType: Record<EvidenceType, number>;
  /** Count by priority */
  byPriority: Record<EvidencePriority, number>;
  /** Total size in bytes */
  totalSizeBytes: number;
  /** Evidence under legal hold */
  underLegalHold: number;
  /** Active legal holds */
  activeLegalHolds: number;
  /** Pending exports */
  pendingExports: number;
  /** Last collection timestamp */
  lastCollectedAt?: Date;
  /** Last verification timestamp */
  lastVerifiedAt?: Date;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Evidence-related error codes
 */
export type EvidenceErrorCode =
  | "EVIDENCE_NOT_FOUND"
  | "EVIDENCE_LOCKED"
  | "LEGAL_HOLD_ACTIVE"
  | "INTEGRITY_CHECK_FAILED"
  | "CHAIN_BROKEN"
  | "UNAUTHORIZED_ACCESS"
  | "EXPORT_FAILED"
  | "ENCRYPTION_FAILED"
  | "RETENTION_POLICY_VIOLATION"
  | "INVALID_OPERATION";

/**
 * Evidence error
 */
export interface EvidenceError {
  code: EvidenceErrorCode;
  message: string;
  evidenceId?: EvidenceId;
  details?: Record<string, unknown>;
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Creates a new evidence record with defaults
 */
export function createEvidenceRecord(
  params: EvidenceCollectionRequest & { collectedBy: string },
): Omit<
  EvidenceRecord,
  "id" | "contentHash" | "chainHash" | "version" | "createdAt" | "updatedAt"
> {
  return {
    type: params.type,
    status: "active",
    priority: params.priority || "medium",
    content: params.content,
    isEncrypted: params.encrypt || false,
    metadata: {
      source: params.source,
      ...params.metadata,
    },
    references: (params.references || []).map((ref, index) => ({
      ...ref,
      id: `ref-${index}`,
    })),
    workspaceId: params.workspaceId,
    channelId: params.channelId,
    userId: params.userId,
    collectedBy: params.collectedBy,
    collectedAt: new Date(),
    collectionReason: params.reason,
    legalHoldIds: [],
    retentionPolicyId: params.retentionPolicyId,
  };
}

/**
 * Creates a custody entry
 */
export function createCustodyEntry(params: {
  evidenceId: EvidenceId;
  eventType: CustodyEventType;
  actorId: string;
  actorRole: string;
  description: string;
  actorName?: string;
  ipAddress?: string;
  userAgent?: string;
  notes?: string;
  previousEntryHash?: string;
}): Omit<CustodyEntry, "id" | "entryHash" | "timestamp"> {
  return {
    evidenceId: params.evidenceId,
    eventType: params.eventType,
    actorId: params.actorId,
    actorName: params.actorName,
    actorRole: params.actorRole,
    description: params.description,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    notes: params.notes,
    previousEntryHash: params.previousEntryHash,
  };
}

/**
 * Creates a legal hold
 */
export function createLegalHold(params: {
  name: string;
  description: string;
  scope: LegalHoldScope;
  criteria: LegalHoldCriteria;
  requestedBy: string;
  effectiveFrom?: Date;
  expiresAt?: Date;
  caseReference?: string;
  legalMatterId?: string;
  legalContact?: string;
}): Omit<
  LegalHold,
  "id" | "evidenceIds" | "evidenceCount" | "createdAt" | "updatedAt"
> {
  return {
    name: params.name,
    description: params.description,
    status:
      params.effectiveFrom && params.effectiveFrom > new Date()
        ? "pending"
        : "active",
    scope: params.scope,
    criteria: params.criteria,
    caseReference: params.caseReference,
    legalMatterId: params.legalMatterId,
    requestedBy: params.requestedBy,
    legalContact: params.legalContact,
    effectiveFrom: params.effectiveFrom || new Date(),
    expiresAt: params.expiresAt,
  };
}
