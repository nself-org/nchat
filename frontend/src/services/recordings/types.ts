/**
 * Recording Service Types
 *
 * Comprehensive type definitions for the call recording pipeline:
 * - Recording capture and storage
 * - Retention policies
 * - Playback ACLs
 * - Redaction
 * - Processing
 *
 * @module services/recordings/types
 */

// ============================================================================
// Recording Core Types
// ============================================================================

export type RecordingStatus =
  | "starting"
  | "recording"
  | "stopping"
  | "processing"
  | "completed"
  | "failed"
  | "archived"
  | "deleted"
  | "legal_hold";

export type RecordingFormat = "mp4" | "webm" | "mkv" | "hls" | "audio_only";

export type RecordingQuality = "360p" | "480p" | "720p" | "1080p" | "4k";

export type RecordingLayout =
  | "grid"
  | "speaker"
  | "single"
  | "pip"
  | "side_by_side";

export type RecordingSource =
  | "call"
  | "livestream"
  | "screen_share"
  | "voice_chat";

export interface Recording {
  id: string;
  callId?: string;
  streamId?: string;
  channelId: string;
  workspaceId: string;
  recordedBy: string;
  status: RecordingStatus;
  format: RecordingFormat;
  quality: RecordingQuality;
  layout: RecordingLayout;
  source: RecordingSource;

  // File information
  filePath?: string;
  fileUrl?: string;
  fileSize?: number;
  mimeType?: string;
  checksum?: string;

  // Duration and timing
  durationSeconds?: number;
  startedAt: string;
  endedAt?: string;
  processedAt?: string;

  // Multi-track support
  tracks: RecordingTrack[];

  // Transcoding outputs
  variants: RecordingVariant[];

  // Thumbnails
  thumbnailUrl?: string;
  thumbnails: RecordingThumbnail[];

  // Transcript (optional)
  transcriptId?: string;
  hasTranscript: boolean;

  // Encryption
  isEncrypted: boolean;
  encryptionKeyId?: string;

  // Retention
  retentionPolicyId?: string;
  expiresAt?: string;
  legalHold: boolean;

  // Redaction
  redactions: RedactionSegment[];
  hasRedactions: boolean;

  // Access control
  visibility: RecordingVisibility;
  allowedUserIds: string[];
  shareLinks: ShareLink[];

  // Metadata
  metadata: RecordingMetadata;
  createdAt: string;
  updatedAt: string;

  // Error handling
  errorMessage?: string;
  retryCount: number;
}

export interface RecordingTrack {
  id: string;
  type: "audio" | "video" | "screen";
  participantId: string;
  participantName: string;
  filePath?: string;
  startOffset: number;
  durationSeconds: number;
  muted: boolean;
}

export interface RecordingVariant {
  id: string;
  quality: RecordingQuality;
  format: RecordingFormat;
  filePath: string;
  fileUrl?: string;
  fileSize: number;
  bitrate: number;
  resolution?: { width: number; height: number };
  audioCodec?: string;
  videoCodec?: string;
  createdAt: string;
}

export interface RecordingThumbnail {
  id: string;
  timestamp: number;
  filePath: string;
  url?: string;
  width: number;
  height: number;
}

export interface RecordingMetadata {
  participants: ParticipantInfo[];
  totalParticipants: number;
  peakParticipants: number;
  averageDuration: number;
  screenShares: ScreenShareInfo[];
  platform?: string;
  clientVersion?: string;
  serverRegion?: string;
  tags?: string[];
  customData?: Record<string, unknown>;
}

export interface ParticipantInfo {
  userId: string;
  displayName: string;
  joinedAt: string;
  leftAt?: string;
  durationSeconds: number;
  hasAudio: boolean;
  hasVideo: boolean;
  wasScreenSharing: boolean;
}

export interface ScreenShareInfo {
  participantId: string;
  startedAt: string;
  endedAt?: string;
  durationSeconds: number;
}

// ============================================================================
// Retention Policy Types
// ============================================================================

export type RetentionPeriod =
  | "7_days"
  | "30_days"
  | "90_days"
  | "180_days"
  | "1_year"
  | "2_years"
  | "5_years"
  | "forever";

export interface RetentionPolicy {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  isDefault: boolean;
  isActive: boolean;

  // Retention settings
  retentionPeriod: RetentionPeriod;
  retentionDays: number;

  // Auto-deletion
  autoDeleteEnabled: boolean;
  warningDaysBefore: number;

  // Legal hold override
  legalHoldExempt: boolean;

  // Storage quota
  enforceQuota: boolean;
  quotaBytes?: number;
  currentUsageBytes: number;

  // Actions
  onExpiry: "delete" | "archive" | "notify";
  archiveLocation?: string;

  // Scope
  applyToSources: RecordingSource[];
  applyToChannelIds?: string[];

  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface StorageQuota {
  workspaceId: string;
  totalBytes: number;
  usedBytes: number;
  recordingCount: number;
  oldestRecordingDate?: string;
  newestRecordingDate?: string;
  averageRecordingSizeBytes: number;
  projectedDaysUntilFull?: number;
}

export interface RetentionSchedule {
  recordingId: string;
  policyId: string;
  scheduledAction: "delete" | "archive" | "notify";
  scheduledAt: string;
  executed: boolean;
  executedAt?: string;
  result?: "success" | "failed" | "skipped";
  error?: string;
}

// ============================================================================
// Playback ACL Types
// ============================================================================

export type RecordingVisibility =
  | "private"
  | "participants"
  | "channel"
  | "workspace"
  | "public";

export type SharePermission = "view" | "download" | "share" | "edit" | "delete";

export interface PlaybackACL {
  id: string;
  recordingId: string;
  userId?: string;
  groupId?: string;
  permissions: SharePermission[];
  grantedBy: string;
  grantedAt: string;
  expiresAt?: string;
  isActive: boolean;
  accessCount: number;
  lastAccessAt?: string;
}

export interface ShareLink {
  id: string;
  recordingId: string;
  token: string;
  createdBy: string;
  createdAt: string;
  expiresAt?: string;
  maxViews?: number;
  viewCount: number;
  permissions: SharePermission[];
  password?: string; // hashed
  isActive: boolean;
  allowedDomains?: string[];
  allowedEmails?: string[];
  requireAuth: boolean;
  lastAccessAt?: string;
  accessLog: ShareAccessLog[];
}

export interface ShareAccessLog {
  timestamp: string;
  ip?: string;
  userAgent?: string;
  userId?: string;
  email?: string;
  action: "view" | "download" | "share";
  success: boolean;
  reason?: string;
}

export interface AccessRequest {
  id: string;
  recordingId: string;
  requesterId: string;
  requesterEmail: string;
  requesterName: string;
  reason?: string;
  status: "pending" | "approved" | "denied";
  requestedAt: string;
  respondedAt?: string;
  respondedBy?: string;
  grantedPermissions?: SharePermission[];
  expiresAt?: string;
}

// ============================================================================
// Redaction Types
// ============================================================================

export type RedactionType =
  | "audio"
  | "video"
  | "both"
  | "blur"
  | "silence"
  | "beep";

export interface RedactionSegment {
  id: string;
  recordingId: string;
  type: RedactionType;
  startSeconds: number;
  endSeconds: number;
  reason: string;
  createdBy: string;
  createdAt: string;
  applied: boolean;
  appliedAt?: string;

  // For video redaction
  region?: RedactionRegion;

  // For track-specific redaction
  trackId?: string;
  participantId?: string;
}

export interface RedactionRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  trackMovement: boolean;
}

export interface RedactionRequest {
  id: string;
  recordingId: string;
  segments: Omit<
    RedactionSegment,
    "id" | "recordingId" | "applied" | "appliedAt"
  >[];
  status: "pending" | "processing" | "completed" | "failed";
  requestedBy: string;
  requestedAt: string;
  completedAt?: string;
  outputRecordingId?: string;
  error?: string;
}

export interface RedactionAuditLog {
  id: string;
  recordingId: string;
  segmentId: string;
  action: "created" | "applied" | "removed" | "exported";
  performedBy: string;
  performedAt: string;
  previousState?: Partial<RedactionSegment>;
  newState?: Partial<RedactionSegment>;
}

// ============================================================================
// Processing Types
// ============================================================================

export type ProcessingJobType =
  | "transcode"
  | "thumbnail"
  | "transcript"
  | "redaction"
  | "merge"
  | "extract_audio"
  | "compress"
  | "encrypt";

export type ProcessingJobStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled"
  | "retrying";

export interface ProcessingJob {
  id: string;
  recordingId: string;
  type: ProcessingJobType;
  status: ProcessingJobStatus;
  priority: number;
  progress: number;
  startedAt?: string;
  completedAt?: string;
  estimatedDuration?: number;
  actualDuration?: number;
  workerId?: string;
  retryCount: number;
  maxRetries: number;
  error?: string;
  input: ProcessingInput;
  output?: ProcessingOutput;
  createdAt: string;
  updatedAt: string;
}

export interface ProcessingInput {
  sourceFilePath: string;
  sourceFormat: RecordingFormat;
  options:
    | TranscodeOptions
    | ThumbnailOptions
    | TranscriptOptions
    | RedactionOptions;
}

export interface ProcessingOutput {
  filePath: string;
  fileSize: number;
  format: RecordingFormat;
  metadata?: Record<string, unknown>;
}

export interface TranscodeOptions {
  targetQuality: RecordingQuality;
  targetFormat: RecordingFormat;
  videoBitrate?: number;
  audioBitrate?: number;
  videoCodec?: string;
  audioCodec?: string;
  fps?: number;
  preserveAspectRatio: boolean;
}

export interface ThumbnailOptions {
  intervals: number[]; // seconds from start
  width: number;
  height: number;
  format: "jpeg" | "png" | "webp";
  quality: number;
}

export interface TranscriptOptions {
  language: string;
  enableSpeakerDiarization: boolean;
  maxSpeakers?: number;
  format: "vtt" | "srt" | "json" | "txt";
  includePunctuation: boolean;
}

export interface RedactionOptions {
  segments: RedactionSegment[];
  preserveOriginal: boolean;
  outputFormat?: RecordingFormat;
}

// ============================================================================
// Encryption Types
// ============================================================================

export interface EncryptionConfig {
  enabled: boolean;
  algorithm: "aes-256-gcm" | "aes-256-cbc";
  keyRotationDays: number;
  deriveKeyFromMasterKey: boolean;
}

export interface EncryptionKey {
  id: string;
  workspaceId: string;
  algorithm: string;
  encryptedKey: string; // Encrypted with master key
  iv?: string;
  createdAt: string;
  expiresAt?: string;
  rotatedAt?: string;
  isActive: boolean;
  usageCount: number;
}

export interface EncryptedFile {
  recordingId: string;
  keyId: string;
  algorithm: string;
  iv: string;
  authTag?: string;
  encryptedFilePath: string;
  originalChecksum: string;
  encryptedChecksum: string;
}

// ============================================================================
// Event Types
// ============================================================================

export type RecordingEventType =
  | "recording.started"
  | "recording.stopped"
  | "recording.completed"
  | "recording.failed"
  | "recording.deleted"
  | "recording.archived"
  | "recording.accessed"
  | "recording.downloaded"
  | "recording.shared"
  | "recording.redacted"
  | "recording.restored"
  | "processing.started"
  | "processing.completed"
  | "processing.failed"
  | "retention.warning"
  | "retention.executed"
  | "acl.updated"
  | "share.created"
  | "share.accessed"
  | "share.expired";

export interface RecordingEvent {
  id: string;
  type: RecordingEventType;
  recordingId: string;
  workspaceId: string;
  userId?: string;
  timestamp: string;
  data: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface StartRecordingRequest {
  callId?: string;
  streamId?: string;
  channelId: string;
  format?: RecordingFormat;
  quality?: RecordingQuality;
  layout?: RecordingLayout;
  source: RecordingSource;
  enableMultiTrack?: boolean;
  retentionPolicyId?: string;
  encrypt?: boolean;
}

export interface StartRecordingResponse {
  success: boolean;
  recording: Recording;
  message: string;
}

export interface StopRecordingRequest {
  recordingId: string;
}

export interface StopRecordingResponse {
  success: boolean;
  recording: Recording;
  message: string;
  estimatedProcessingTime?: number;
}

export interface GetRecordingRequest {
  recordingId: string;
  includeVariants?: boolean;
  includeThumbnails?: boolean;
  includeTranscript?: boolean;
}

export interface ListRecordingsRequest {
  workspaceId?: string;
  channelId?: string;
  callId?: string;
  status?: RecordingStatus[];
  source?: RecordingSource[];
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
  sortBy?: "createdAt" | "duration" | "fileSize";
  sortOrder?: "asc" | "desc";
}

export interface ListRecordingsResponse {
  recordings: Recording[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface CreateShareLinkRequest {
  recordingId: string;
  permissions: SharePermission[];
  expiresAt?: string;
  maxViews?: number;
  password?: string;
  requireAuth?: boolean;
  allowedDomains?: string[];
  allowedEmails?: string[];
}

export interface CreateShareLinkResponse {
  success: boolean;
  shareLink: ShareLink;
  url: string;
}

export interface UpdateRetentionRequest {
  recordingId: string;
  retentionPolicyId?: string;
  expiresAt?: string;
  legalHold?: boolean;
}

export interface CreateRedactionRequest {
  recordingId: string;
  segments: Omit<
    RedactionSegment,
    "id" | "recordingId" | "applied" | "appliedAt" | "createdAt"
  >[];
  applyImmediately?: boolean;
  preserveOriginal?: boolean;
}

export interface ProcessingStatusRequest {
  recordingId?: string;
  jobId?: string;
}

export interface ProcessingStatusResponse {
  jobs: ProcessingJob[];
  overallProgress?: number;
  estimatedCompletion?: string;
}

// ============================================================================
// Error Types
// ============================================================================

export class RecordingError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "RecordingError";
  }
}

export class RecordingNotFoundError extends RecordingError {
  constructor(recordingId: string) {
    super(`Recording not found: ${recordingId}`, "RECORDING_NOT_FOUND", 404, {
      recordingId,
    });
  }
}

export class RecordingAccessDeniedError extends RecordingError {
  constructor(recordingId: string, userId: string) {
    super("Access denied to recording", "RECORDING_ACCESS_DENIED", 403, {
      recordingId,
      userId,
    });
  }
}

export class RecordingProcessingError extends RecordingError {
  constructor(
    recordingId: string,
    jobType: ProcessingJobType,
    message: string,
  ) {
    super(message, "RECORDING_PROCESSING_ERROR", 500, { recordingId, jobType });
  }
}

export class RetentionPolicyError extends RecordingError {
  constructor(message: string, policyId?: string) {
    super(message, "RETENTION_POLICY_ERROR", 400, { policyId });
  }
}

export class RedactionError extends RecordingError {
  constructor(message: string, recordingId: string, segmentId?: string) {
    super(message, "REDACTION_ERROR", 400, { recordingId, segmentId });
  }
}

export class ShareLinkError extends RecordingError {
  constructor(message: string, linkId?: string) {
    super(message, "SHARE_LINK_ERROR", 400, { linkId });
  }
}

export class StorageQuotaExceededError extends RecordingError {
  constructor(workspaceId: string, currentUsage: number, quota: number) {
    super("Storage quota exceeded", "STORAGE_QUOTA_EXCEEDED", 403, {
      workspaceId,
      currentUsage,
      quota,
    });
  }
}
