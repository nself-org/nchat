/**
 * Jobs Service Types
 *
 * Type definitions for the nchat background job queue system.
 * Integrates with the nself-plugins jobs plugin (BullMQ-based).
 *
 * @module services/jobs/types
 * @version 1.0.0
 */

import type { JobsOptions } from "bullmq";

// ============================================================================
// Job Configuration Types
// ============================================================================

/**
 * Configuration for the jobs service
 */
export interface JobsServiceConfig {
  /** Redis connection URL */
  redisUrl: string;
  /** Enable job processing (set false for client-only mode) */
  enableWorker: boolean;
  /** Default job concurrency */
  defaultConcurrency: number;
  /** Default retry attempts */
  defaultRetryAttempts: number;
  /** Default retry delay in milliseconds */
  defaultRetryDelay: number;
  /** Default job timeout in milliseconds */
  defaultTimeout: number;
  /** Enable debug logging */
  debug: boolean;
}

/**
 * Default configuration values
 */
export const DEFAULT_JOBS_CONFIG: JobsServiceConfig = {
  redisUrl:
    process.env.JOBS_REDIS_URL ||
    process.env.REDIS_URL ||
    "redis://localhost:6379",
  enableWorker: false, // Workers run in separate process
  defaultConcurrency: 5,
  defaultRetryAttempts: 3,
  defaultRetryDelay: 5000,
  defaultTimeout: 60000,
  debug: process.env.NODE_ENV === "development",
};

// ============================================================================
// Job Status and Priority Types
// ============================================================================

/**
 * Status of a job in the queue
 */
export type JobStatus =
  | "waiting"
  | "active"
  | "completed"
  | "failed"
  | "delayed"
  | "stuck"
  | "paused";

/**
 * Job priority levels
 */
export type JobPriority = "critical" | "high" | "normal" | "low";

/**
 * Numeric values for priorities (BullMQ uses numbers, lower = higher priority)
 */
export const JobPriorityValue: Record<JobPriority, number> = {
  critical: 1,
  high: 5,
  normal: 10,
  low: 20,
};

// ============================================================================
// nchat-Specific Job Types
// ============================================================================

/**
 * All job types supported by nchat
 */
export type NchatJobType =
  | "scheduled-message"
  | "email-digest"
  | "cleanup-expired"
  | "index-search"
  | "process-file"
  | "send-notification"
  | "send-email"
  | "http-webhook"
  | "custom";

/**
 * Queue names for organizing jobs
 */
export type QueueName =
  | "default"
  | "high-priority"
  | "low-priority"
  | "scheduled";

// ============================================================================
// Job Payload Types
// ============================================================================

/**
 * Scheduled message job payload
 */
export interface ScheduledMessagePayload {
  /** Message ID from scheduled messages store */
  scheduledMessageId: string;
  /** Channel to send to */
  channelId: string;
  /** User who scheduled the message */
  userId: string;
  /** Message content */
  content: string;
  /** Optional thread parent ID */
  threadId?: string;
  /** Optional reply-to message ID */
  replyToId?: string;
  /** Attachments to include */
  attachments?: Array<{
    id: string;
    name: string;
    type: string;
    url: string;
  }>;
  /** Mentioned user IDs */
  mentions?: string[];
}

/**
 * Email digest job payload
 */
export interface EmailDigestPayload {
  /** User ID to send digest to */
  userId: string;
  /** User email address */
  email: string;
  /** Digest type */
  digestType: "daily" | "weekly";
  /** Start of digest period (timestamp) */
  periodStart: number;
  /** End of digest period (timestamp) */
  periodEnd: number;
  /** Channels to include in digest */
  channelIds?: string[];
  /** Include unread message count */
  includeUnreadCount: boolean;
  /** Include mentions */
  includeMentions: boolean;
  /** Include thread replies */
  includeThreadReplies: boolean;
}

/**
 * Cleanup expired content job payload
 */
export interface CleanupExpiredPayload {
  /** Type of content to clean up */
  targetType:
    | "messages"
    | "attachments"
    | "sessions"
    | "drafts"
    | "scheduled_messages"
    | "job_results";
  /** Clean items older than this (hours) */
  olderThanHours?: number;
  /** Clean items older than this (days) */
  olderThanDays?: number;
  /** Maximum items to delete per run */
  batchSize?: number;
  /** Dry run (don't actually delete) */
  dryRun?: boolean;
}

/**
 * Search indexing job payload
 */
export interface IndexSearchPayload {
  /** Type of indexing operation */
  operation: "index" | "update" | "delete" | "reindex";
  /** Entity type to index */
  entityType: "message" | "channel" | "user" | "file";
  /** Entity IDs to process */
  entityIds: string[];
  /** Channel ID (for message indexing) */
  channelId?: string;
  /** Full reindex of index */
  fullReindex?: boolean;
}

/**
 * File processing job payload
 */
export interface ProcessFilePayload {
  /** File ID */
  fileId: string;
  /** Storage URL */
  fileUrl: string;
  /** File MIME type */
  mimeType: string;
  /** File size in bytes */
  fileSize: number;
  /** Processing operations to perform */
  operations: Array<
    | "thumbnail"
    | "preview"
    | "extract_text"
    | "virus_scan"
    | "compress"
    | "transcode"
  >;
  /** User who uploaded the file */
  userId: string;
  /** Channel file was uploaded to */
  channelId?: string;
  /** Message file is attached to */
  messageId?: string;
}

/**
 * Send notification job payload
 */
export interface SendNotificationPayload {
  /** Notification type */
  notificationType: "push" | "email" | "in-app" | "sms";
  /** User IDs to notify */
  userIds: string[];
  /** Notification title */
  title: string;
  /** Notification body */
  body: string;
  /** Deep link URL */
  url?: string;
  /** Notification icon URL */
  iconUrl?: string;
  /** Notification image URL */
  imageUrl?: string;
  /** Additional data payload */
  data?: Record<string, unknown>;
  /** Collapse key for grouping */
  collapseKey?: string;
  /** Time-to-live in seconds */
  ttl?: number;
}

/**
 * Send email job payload
 */
export interface SendEmailPayload {
  /** Recipient email addresses */
  to: string | string[];
  /** Sender email (optional, uses default) */
  from?: string;
  /** Email subject */
  subject: string;
  /** Plain text body */
  body: string;
  /** HTML body */
  html?: string;
  /** CC recipients */
  cc?: string[];
  /** BCC recipients */
  bcc?: string[];
  /** Email attachments */
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
  /** Email template ID */
  templateId?: string;
  /** Template variables */
  templateVars?: Record<string, unknown>;
}

/**
 * HTTP webhook job payload
 */
export interface HttpWebhookPayload {
  /** Webhook URL */
  url: string;
  /** HTTP method */
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  /** Request headers */
  headers?: Record<string, string>;
  /** Request body */
  body?: unknown;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** HTTP status codes to retry on */
  retryOnStatus?: number[];
  /** Secret for signing payload */
  secret?: string;
  /** Webhook event type */
  eventType?: string;
}

/**
 * Custom job payload
 */
export interface CustomJobPayload {
  /** Action identifier */
  action: string;
  /** Action data */
  data: Record<string, unknown>;
}

/**
 * Union type of all job payloads
 */
export type JobPayload =
  | ScheduledMessagePayload
  | EmailDigestPayload
  | CleanupExpiredPayload
  | IndexSearchPayload
  | ProcessFilePayload
  | SendNotificationPayload
  | SendEmailPayload
  | HttpWebhookPayload
  | CustomJobPayload;

// ============================================================================
// Job Creation Options
// ============================================================================

/**
 * Options for creating a new job
 */
export interface CreateJobOptions {
  /** Queue to add job to */
  queue?: QueueName;
  /** Job priority */
  priority?: JobPriority;
  /** Delay before processing (milliseconds) */
  delay?: number;
  /** Maximum retry attempts */
  maxRetries?: number;
  /** Delay between retries (milliseconds) */
  retryDelay?: number;
  /** Job timeout (milliseconds) */
  timeout?: number;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Tags for filtering */
  tags?: string[];
  /** Remove job after completion (seconds) */
  removeOnComplete?: boolean | number;
  /** Remove job after failure (seconds) */
  removeOnFail?: boolean | number;
  /** Deduplication ID */
  jobId?: string;
}

/**
 * Internal job creation data
 */
export interface CreateJobData<T extends JobPayload = JobPayload> {
  /** Job type */
  type: NchatJobType;
  /** Job payload */
  payload: T;
  /** Creation options */
  options: CreateJobOptions;
}

// ============================================================================
// Job Record Types
// ============================================================================

/**
 * Job record from database
 */
export interface JobRecord {
  /** Job ID */
  id: string;
  /** BullMQ job ID */
  bullmqId: string | null;
  /** Queue name */
  queueName: string;
  /** Job type */
  jobType: NchatJobType;
  /** Priority */
  priority: JobPriority;
  /** Current status */
  status: JobStatus;
  /** Job payload */
  payload: JobPayload;
  /** BullMQ options */
  options: Partial<JobsOptions>;
  /** Creation timestamp */
  createdAt: Date;
  /** Start timestamp */
  startedAt: Date | null;
  /** Completion timestamp */
  completedAt: Date | null;
  /** Failure timestamp */
  failedAt: Date | null;
  /** Scheduled execution time */
  scheduledFor: Date | null;
  /** Progress (0-100) */
  progress: number;
  /** Current retry count */
  retryCount: number;
  /** Maximum retries */
  maxRetries: number;
  /** Retry delay */
  retryDelay: number;
  /** Additional metadata */
  metadata: Record<string, unknown>;
  /** Tags */
  tags: string[];
  /** Worker ID processing this job */
  workerId: string | null;
  /** Process ID */
  processId: number | null;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Job result record
 */
export interface JobResultRecord {
  /** Result ID */
  id: string;
  /** Job ID */
  jobId: string;
  /** Result data */
  result: Record<string, unknown>;
  /** Processing duration (milliseconds) */
  durationMs: number;
  /** Memory usage (MB) */
  memoryMb: number | null;
  /** CPU usage (percent) */
  cpuPercent: number | null;
  /** Additional metadata */
  metadata: Record<string, unknown>;
  /** Creation timestamp */
  createdAt: Date;
}

/**
 * Job failure record
 */
export interface JobFailureRecord {
  /** Failure ID */
  id: string;
  /** Job ID */
  jobId: string;
  /** Error message */
  errorMessage: string;
  /** Error stack trace */
  errorStack: string | null;
  /** Error code */
  errorCode: string | null;
  /** Attempt number */
  attemptNumber: number;
  /** Failure timestamp */
  failedAt: Date;
  /** Worker ID */
  workerId: string | null;
  /** Process ID */
  processId: number | null;
  /** Additional metadata */
  metadata: Record<string, unknown>;
  /** Will retry */
  willRetry: boolean;
  /** Next retry timestamp */
  retryAt: Date | null;
}

// ============================================================================
// Schedule Types
// ============================================================================

/**
 * Schedule options for recurring jobs
 */
export interface ScheduleOptions {
  /** Schedule name (unique identifier) */
  name: string;
  /** Human-readable description */
  description?: string;
  /** Job type to create */
  jobType: NchatJobType;
  /** Queue to add jobs to */
  queueName?: QueueName;
  /** Job payload */
  payload: JobPayload;
  /** Cron expression */
  cronExpression: string;
  /** Timezone for cron */
  timezone?: string;
  /** Enable/disable schedule */
  enabled?: boolean;
  /** Maximum runs (null = unlimited) */
  maxRuns?: number | null;
  /** End date for schedule */
  endDate?: Date | null;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Tags for filtering */
  tags?: string[];
}

/**
 * Schedule record from database
 */
export interface ScheduleRecord {
  /** Schedule ID */
  id: string;
  /** Schedule name */
  name: string;
  /** Description */
  description: string | null;
  /** Job type */
  jobType: NchatJobType;
  /** Queue name */
  queueName: string;
  /** Job payload */
  payload: JobPayload;
  /** BullMQ options */
  options: Partial<JobsOptions>;
  /** Cron expression */
  cronExpression: string;
  /** Timezone */
  timezone: string;
  /** Is enabled */
  enabled: boolean;
  /** Last run timestamp */
  lastRunAt: Date | null;
  /** Last created job ID */
  lastJobId: string | null;
  /** Next run timestamp */
  nextRunAt: Date | null;
  /** Total runs */
  totalRuns: number;
  /** Successful runs */
  successfulRuns: number;
  /** Failed runs */
  failedRuns: number;
  /** Maximum runs */
  maxRuns: number | null;
  /** End date */
  endDate: Date | null;
  /** Additional metadata */
  metadata: Record<string, unknown>;
  /** Tags */
  tags: string[];
  /** Creation timestamp */
  createdAt: Date;
  /** Update timestamp */
  updatedAt: Date;
  /** Created by user ID */
  createdBy: string | null;
  /** Updated by user ID */
  updatedBy: string | null;
}

// ============================================================================
// Statistics Types
// ============================================================================

/**
 * Statistics for a single queue
 */
export interface QueueStats {
  /** Queue name */
  queueName: string;
  /** Waiting jobs */
  waiting: number;
  /** Active jobs */
  active: number;
  /** Completed jobs */
  completed: number;
  /** Failed jobs */
  failed: number;
  /** Delayed jobs */
  delayed: number;
  /** Stuck jobs */
  stuck: number;
  /** Total jobs */
  total: number;
  /** Average duration (seconds) */
  avgDurationSeconds: number | null;
  /** Last job timestamp */
  lastJobAt: Date | null;
}

/**
 * Statistics by job type
 */
export interface JobTypeStats {
  /** Job type */
  jobType: NchatJobType;
  /** Total jobs */
  totalJobs: number;
  /** Completed jobs */
  completed: number;
  /** Failed jobs */
  failed: number;
  /** Success rate (0-1) */
  successRate: number | null;
  /** Average duration (seconds) */
  avgDurationSeconds: number | null;
  /** First job timestamp */
  firstJobAt: Date | null;
  /** Last job timestamp */
  lastJobAt: Date | null;
}

/**
 * Global statistics across all queues
 */
export interface GlobalStats {
  /** Total jobs across all queues */
  totalJobs: number;
  /** Waiting jobs */
  waiting: number;
  /** Active jobs */
  active: number;
  /** Completed jobs (24h) */
  completed: number;
  /** Failed jobs (24h) */
  failed: number;
  /** Per-queue stats */
  queues: QueueStats[];
  /** Per-job-type stats */
  jobTypes: JobTypeStats[];
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * Job event types
 */
export type JobEventType =
  | "created"
  | "started"
  | "progress"
  | "completed"
  | "failed"
  | "retry"
  | "stalled"
  | "removed";

/**
 * Job event data
 */
export interface JobEvent {
  /** Event type */
  type: JobEventType;
  /** Job ID */
  jobId: string;
  /** Queue name */
  queueName: string;
  /** Job type */
  jobType: NchatJobType;
  /** Event data */
  data?: unknown;
  /** Error (for failed events) */
  error?: string;
  /** Progress (for progress events) */
  progress?: number;
  /** Event timestamp */
  timestamp: Date;
}

/**
 * Job event listener
 */
export type JobEventListener = (event: JobEvent) => void;

// ============================================================================
// Result Types
// ============================================================================

/**
 * Result of a job processor
 */
export interface JobResult<T = unknown> {
  /** Success flag */
  success: boolean;
  /** Result data */
  data?: T;
  /** Error message */
  error?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Scheduled message result
 */
export interface ScheduledMessageResult {
  /** Created message ID */
  messageId: string;
  /** Channel ID */
  channelId: string;
  /** Sent timestamp */
  sentAt: Date;
}

/**
 * Email digest result
 */
export interface EmailDigestResult {
  /** Email message ID */
  messageId: string;
  /** Number of items included */
  itemCount: number;
  /** Recipient email */
  sentTo: string;
}

/**
 * Cleanup result
 */
export interface CleanupResult {
  /** Items deleted */
  deletedCount: number;
  /** Items skipped */
  skippedCount: number;
  /** Bytes freed */
  bytesFreed?: number;
  /** Deleted item IDs */
  deletedIds?: string[];
}

/**
 * Index search result
 */
export interface IndexSearchResult {
  /** Documents indexed */
  indexedCount: number;
  /** Documents failed */
  failedCount: number;
  /** Task IDs (for async indexing) */
  taskIds?: number[];
}

/**
 * File processing result
 */
export interface ProcessFileResult {
  /** Generated thumbnail URL */
  thumbnailUrl?: string;
  /** Generated preview URL */
  previewUrl?: string;
  /** Extracted text content */
  extractedText?: string;
  /** Virus scan result */
  virusScanPassed?: boolean;
  /** Compressed file URL */
  compressedUrl?: string;
  /** Transcoded file URL */
  transcodedUrl?: string;
}

/**
 * Send notification result
 */
export interface SendNotificationResult {
  /** Successfully sent count */
  sentCount: number;
  /** Failed count */
  failedCount: number;
  /** Notification IDs */
  notificationIds: string[];
}

// ============================================================================
// Processor Types
// ============================================================================

/**
 * Job processor function signature
 */
export type JobProcessor<TPayload extends JobPayload, TResult> = (
  job: {
    id: string;
    data: TPayload;
    progress: (value: number) => Promise<void>;
    log: (message: string) => void;
    attemptsMade: number;
    opts: Partial<JobsOptions>;
  },
  token?: string,
) => Promise<JobResult<TResult>>;

/**
 * Registered processor info
 */
export interface RegisteredProcessor {
  /** Job type */
  type: NchatJobType;
  /** Processor function */
  processor: JobProcessor<JobPayload, unknown>;
  /** Concurrency for this processor */
  concurrency?: number;
}
