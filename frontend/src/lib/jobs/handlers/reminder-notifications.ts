/**
 * Reminder Notifications Job Handler
 *
 * Handles processing of reminder notifications when they become due.
 * Sends push and/or email notifications based on user preferences.
 *
 * Features:
 * - Due reminder detection
 * - Multi-channel delivery (push, email)
 * - Recurring reminder rescheduling
 * - Snooze handling
 *
 * @module lib/jobs/handlers/reminder-notifications
 * @version 1.0.0
 */

import { Job } from "bullmq";
import { createLogger } from "@/lib/logger";
import { getNotificationService } from "@/services/notifications/notification.service";
import { getPreferenceService } from "@/services/notifications/preference.service";
import type { JobResult } from "@/services/jobs/types";

const log = createLogger("ReminderNotificationsHandler");

// ============================================================================
// CONSTANTS
// ============================================================================

export const MAX_RETRIES = 3;
export const BASE_RETRY_DELAY = 5000;
export const BATCH_SIZE = 50;

// ============================================================================
// TYPES
// ============================================================================

export interface ReminderPayload {
  reminderId: string;
  userId: string;
  content: string;
  note?: string;
  messageId?: string;
  channelId?: string;
  channelName?: string;
  type: "message" | "custom" | "followup";
  actionUrl?: string;
  isRecurring?: boolean;
  recurrenceRule?: {
    frequency: "daily" | "weekly" | "monthly" | "yearly";
    interval: number;
    daysOfWeek?: number[];
    dayOfMonth?: number;
    endDate?: string;
    count?: number;
  };
}

export interface ReminderResult {
  reminderId: string;
  userId: string;
  notificationsSent: number;
  channels: string[];
  sentAt: Date;
  nextReminder?: Date;
}

interface JobData {
  type: string;
  payload: ReminderPayload;
  metadata: Record<string, unknown>;
  tags: string[];
  createdAt: string;
}

// ============================================================================
// GRAPHQL QUERIES & MUTATIONS
// ============================================================================

const GET_REMINDER_QUERY = `
  query GetReminder($id: uuid!) {
    nchat_reminders_by_pk(id: $id) {
      id
      user_id
      content
      note
      message_id
      channel_id
      channel {
        id
        name
      }
      message {
        id
        content
        sender {
          id
          display_name
          avatar_url
        }
      }
      remind_at
      timezone
      status
      type
      is_recurring
      recurrence_rule
      snooze_count
      created_at
      updated_at
    }
  }
`;

const UPDATE_REMINDER_STATUS = `
  mutation UpdateReminderStatus(
    $id: uuid!
    $status: String!
    $completedAt: timestamptz
    $nextRemindAt: timestamptz
  ) {
    update_nchat_reminders_by_pk(
      pk_columns: { id: $id }
      _set: {
        status: $status
        completed_at: $completedAt
        remind_at: $nextRemindAt
        updated_at: "now()"
      }
    ) {
      id
      status
      remind_at
    }
  }
`;

const GET_DUE_REMINDERS_QUERY = `
  query GetDueReminders($now: timestamptz!, $limit: Int!) {
    nchat_reminders(
      where: {
        remind_at: { _lte: $now }
        status: { _eq: "pending" }
      }
      order_by: { remind_at: asc }
      limit: $limit
    ) {
      id
      user_id
      content
      note
      message_id
      channel_id
      channel {
        name
      }
      remind_at
      type
      is_recurring
      recurrence_rule
    }
  }
`;

const GET_USER_INFO_QUERY = `
  query GetUserInfo($userId: uuid!) {
    users_by_pk(id: $userId) {
      id
      email
      display_name
    }
    nchat_push_subscriptions(
      where: { user_id: { _eq: $userId }, active: { _eq: true } }
      limit: 1
    ) {
      id
      endpoint
      p256dh_key
      auth_key
    }
  }
`;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function executeGraphQL<T = unknown>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<{ data?: T; errors?: Array<{ message: string }> }> {
  const hasuraUrl =
    process.env.NEXT_PUBLIC_GRAPHQL_URL || "http://localhost:8080/v1/graphql";
  const hasuraAdminSecret = process.env.HASURA_ADMIN_SECRET;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (hasuraAdminSecret) {
    headers["x-hasura-admin-secret"] = hasuraAdminSecret;
  }

  const response = await fetch(hasuraUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Calculate next reminder date for recurring reminders
 */
function calculateNextReminder(
  currentDate: Date,
  recurrenceRule: ReminderPayload["recurrenceRule"],
): Date | null {
  if (!recurrenceRule) return null;

  const { frequency, interval, endDate, count } = recurrenceRule;
  const next = new Date(currentDate);

  switch (frequency) {
    case "daily":
      next.setDate(next.getDate() + interval);
      break;
    case "weekly":
      next.setDate(next.getDate() + interval * 7);
      break;
    case "monthly":
      next.setMonth(next.getMonth() + interval);
      break;
    case "yearly":
      next.setFullYear(next.getFullYear() + interval);
      break;
  }

  // Check if past end date
  if (endDate && next > new Date(endDate)) {
    return null;
  }

  return next;
}

/**
 * Format reminder content for notification
 */
function formatReminderNotification(payload: ReminderPayload): {
  title: string;
  body: string;
} {
  let title = "Reminder";
  let body = payload.content;

  switch (payload.type) {
    case "message":
      title = payload.channelName
        ? `Reminder: #${payload.channelName}`
        : "Message Reminder";
      break;
    case "followup":
      title = "Follow-up Reminder";
      break;
    case "custom":
    default:
      title = "Reminder";
  }

  if (payload.note) {
    body = `${payload.content}\n\nNote: ${payload.note}`;
  }

  return { title, body };
}

// ============================================================================
// JOB PROCESSOR
// ============================================================================

/**
 * Process a reminder notification job
 */
export async function processReminderJob(
  job: Job<JobData>,
): Promise<JobResult<ReminderResult>> {
  const payload = job.data.payload as ReminderPayload;
  const jobLog = createLogger(`ReminderJob:${job.id}`);

  jobLog.info("Processing reminder job", {
    reminderId: payload.reminderId,
    userId: payload.userId,
    type: payload.type,
    attemptsMade: job.attemptsMade,
  });

  try {
    await job.updateProgress(10);

    // Get user preferences
    const preferenceService = getPreferenceService();
    const preferences = await preferenceService.getPreferences(payload.userId);

    await job.updateProgress(20);

    // Get user info for notifications
    const userResult = await executeGraphQL<{
      users_by_pk: { id: string; email: string; display_name: string } | null;
      nchat_push_subscriptions: Array<{
        id: string;
        endpoint: string;
        p256dh_key: string;
        auth_key: string;
      }>;
    }>(GET_USER_INFO_QUERY, { userId: payload.userId });

    const user = userResult.data?.users_by_pk;
    const pushSubscriptions = userResult.data?.nchat_push_subscriptions || [];

    if (!user) {
      throw new Error("User not found");
    }

    await job.updateProgress(40);

    // Format notification content
    const { title, body } = formatReminderNotification(payload);

    const notificationService = getNotificationService();
    const channelsSent: string[] = [];
    let notificationsSent = 0;

    // Check if user can receive push notifications
    const canReceivePush = await preferenceService.canReceive(
      payload.userId,
      "push",
      "alert",
    );

    // Send push notification if enabled and has subscriptions
    if (canReceivePush && pushSubscriptions.length > 0) {
      for (const sub of pushSubscriptions) {
        try {
          await notificationService.sendPush(payload.userId, sub.endpoint, {
            title,
            body,
            category: "alert",
            metadata: {
              reminderId: payload.reminderId,
              type: payload.type,
              actionUrl: payload.actionUrl,
            },
          });
          notificationsSent++;
          if (!channelsSent.includes("push")) {
            channelsSent.push("push");
          }
        } catch (err) {
          jobLog.warn("Failed to send push notification", {
            subscriptionId: sub.id,
            error: err,
          });
        }
      }
    }

    await job.updateProgress(60);

    // Check if user can receive email notifications
    const canReceiveEmail = await preferenceService.canReceive(
      payload.userId,
      "email",
      "alert",
    );

    // Send email notification if enabled
    if (canReceiveEmail && user.email) {
      try {
        const appUrl =
          process.env.NEXT_PUBLIC_APP_URL || "https://app.nchat.com";
        const appName = process.env.NEXT_PUBLIC_APP_NAME || "nchat";

        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2937; margin: 0; padding: 20px; background: #f3f4f6;">
  <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
    <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 24px; text-align: center;">
      <h1 style="margin: 0; font-size: 20px;">Reminder</h1>
    </div>
    <div style="padding: 24px;">
      <h2 style="margin: 0 0 12px; font-size: 18px; color: #111827;">${title}</h2>
      <p style="margin: 0 0 16px; color: #4b5563; line-height: 1.5;">${body}</p>
      ${
        payload.actionUrl
          ? `<a href="${payload.actionUrl}" style="display: inline-block; padding: 12px 24px; background: #f59e0b; color: white; text-decoration: none; border-radius: 6px; font-weight: 500;">View in ${appName}</a>`
          : ""
      }
    </div>
    <div style="background: #f9fafb; padding: 16px 24px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0;"><a href="${appUrl}/settings/notifications" style="color: #4f46e5; text-decoration: none;">Manage notification settings</a></p>
    </div>
  </div>
</body>
</html>
        `.trim();

        await notificationService.sendEmail(payload.userId, user.email, {
          subject: `Reminder: ${payload.content.substring(0, 50)}${payload.content.length > 50 ? "..." : ""}`,
          html: htmlContent,
          category: "alert",
        });
        notificationsSent++;
        channelsSent.push("email");
      } catch (err) {
        jobLog.warn("Failed to send email notification", { error: err });
      }
    }

    await job.updateProgress(80);

    // Update reminder status
    let nextReminder: Date | undefined;

    if (payload.isRecurring && payload.recurrenceRule) {
      nextReminder =
        calculateNextReminder(new Date(), payload.recurrenceRule) || undefined;

      if (nextReminder) {
        // Reschedule for next occurrence
        await executeGraphQL(UPDATE_REMINDER_STATUS, {
          id: payload.reminderId,
          status: "pending",
          completedAt: null,
          nextRemindAt: nextReminder.toISOString(),
        });
      } else {
        // No more occurrences, mark as completed
        await executeGraphQL(UPDATE_REMINDER_STATUS, {
          id: payload.reminderId,
          status: "completed",
          completedAt: new Date().toISOString(),
          nextRemindAt: null,
        });
      }
    } else {
      // Non-recurring, mark as completed
      await executeGraphQL(UPDATE_REMINDER_STATUS, {
        id: payload.reminderId,
        status: "completed",
        completedAt: new Date().toISOString(),
        nextRemindAt: null,
      });
    }

    await job.updateProgress(100);

    jobLog.info("Reminder notifications sent", {
      reminderId: payload.reminderId,
      notificationsSent,
      channels: channelsSent,
      nextReminder,
    });

    return {
      success: true,
      data: {
        reminderId: payload.reminderId,
        userId: payload.userId,
        notificationsSent,
        channels: channelsSent,
        sentAt: new Date(),
        nextReminder,
      },
      metadata: {
        type: payload.type,
        isRecurring: payload.isRecurring,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    jobLog.error("Error processing reminder job", error as Error, {
      reminderId: payload.reminderId,
      userId: payload.userId,
    });

    // Throw to trigger retry if attempts remaining
    if (job.attemptsMade < MAX_RETRIES) {
      throw error;
    }

    return {
      success: false,
      error: errorMessage,
      metadata: {
        reminderId: payload.reminderId,
        attemptsMade: job.attemptsMade,
      },
    };
  }
}

// ============================================================================
// BATCH PROCESSING
// ============================================================================

/**
 * Process all due reminders
 */
export async function processDueReminders(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
}> {
  log.info("Processing due reminders");

  const result = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0,
  };

  try {
    // Get due reminders
    const dueResult = await executeGraphQL<{
      nchat_reminders: Array<{
        id: string;
        user_id: string;
        content: string;
        note?: string;
        message_id?: string;
        channel_id?: string;
        channel?: { name: string };
        remind_at: string;
        type: string;
        is_recurring: boolean;
        recurrence_rule?: ReminderPayload["recurrenceRule"];
      }>;
    }>(GET_DUE_REMINDERS_QUERY, {
      now: new Date().toISOString(),
      limit: BATCH_SIZE,
    });

    if (dueResult.errors) {
      log.error("Failed to get due reminders", undefined, {
        errors: dueResult.errors,
      });
      return result;
    }

    const reminders = dueResult.data?.nchat_reminders || [];
    log.info("Found due reminders", { count: reminders.length });

    // Process each reminder
    for (const reminder of reminders) {
      result.processed++;

      try {
        const notificationService = getNotificationService();

        // Create a chat event to trigger notifications
        await notificationService.processChatEvent({
          type: "reminder.due",
          timestamp: new Date().toISOString(),
          actor: {
            id: "system",
            name: "Reminder",
          },
          target: {
            user_id: reminder.user_id,
          },
          data: {
            channel_id: reminder.channel_id,
            channel_name: reminder.channel?.name,
            message_id: reminder.message_id,
            message_preview: reminder.content,
            action_url: reminder.message_id
              ? `/chat/${reminder.channel_id}?message=${reminder.message_id}`
              : undefined,
            reminder_id: reminder.id,
            reminder_type: reminder.type,
          },
        });

        // Update reminder status
        await executeGraphQL(UPDATE_REMINDER_STATUS, {
          id: reminder.id,
          status: reminder.is_recurring ? "pending" : "completed",
          completedAt: reminder.is_recurring ? null : new Date().toISOString(),
          nextRemindAt: reminder.is_recurring
            ? calculateNextReminder(
                new Date(),
                reminder.recurrence_rule,
              )?.toISOString()
            : null,
        });

        result.succeeded++;
      } catch (error) {
        result.failed++;
        log.error("Failed to process reminder", error as Error, {
          reminderId: reminder.id,
        });
      }
    }

    log.info("Due reminders processing complete", result);
    return result;
  } catch (error) {
    log.error("Error processing due reminders", error as Error);
    return result;
  }
}

// ============================================================================
// REGISTRATION HELPER
// ============================================================================

/**
 * Register the reminder processor with the processor service
 */
export function registerReminderProcessor(processorService: {
  registerProcessor: (
    type: string,
    processor: (job: Job<JobData>) => Promise<JobResult<unknown>>,
  ) => void;
}): void {
  processorService.registerProcessor(
    "reminder-notification",
    processReminderJob as (job: Job<JobData>) => Promise<JobResult<unknown>>,
  );
  log.info("Reminder notification processor registered");
}

export default {
  processReminderJob,
  processDueReminders,
  registerReminderProcessor,
  MAX_RETRIES,
  BASE_RETRY_DELAY,
  BATCH_SIZE,
};
