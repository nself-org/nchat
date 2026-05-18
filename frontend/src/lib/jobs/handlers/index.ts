/**
 * Job Handlers Index
 *
 * Centralized exports for all job handler implementations.
 * These handlers process background jobs in the nchat application.
 *
 * @module lib/jobs/handlers
 * @version 1.0.0
 */

// Scheduled Messages Handler
export {
  processScheduledMessageJob,
  processScheduledMessages,
  calculateRetryDelay,
  getBackoffConfig,
  cleanupOldScheduledMessages,
  registerScheduledMessageProcessor,
  MAX_RETRIES,
  BASE_RETRY_DELAY,
  BATCH_SIZE,
  type ProcessScheduledMessagesResult,
} from "./scheduled-messages";

// Notification Digest Handler
export {
  processDigestJob,
  processAllPendingDigests,
  registerDigestProcessor,
  MAX_RETRIES as DIGEST_MAX_RETRIES,
  BASE_RETRY_DELAY as DIGEST_BASE_RETRY_DELAY,
  MAX_NOTIFICATIONS_PER_DIGEST,
  type DigestPayload,
  type DigestResult,
} from "./notification-digest";

// Reminder Handler
export {
  processReminderJob,
  processDueReminders,
  registerReminderProcessor,
  MAX_RETRIES as REMINDER_MAX_RETRIES,
  type ReminderPayload,
  type ReminderResult,
} from "./reminder-notifications";

// Analytics Aggregation Handler
export {
  handleAnalyticsAggregation,
  createAnalyticsAggregationSchedules,
  type AnalyticsAggregationJobPayload,
} from "./analytics-aggregation";
