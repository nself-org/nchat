/**
 * Notification Digest Job Handler
 *
 * Handles processing of email digests - daily and weekly notification summaries
 * sent to users based on their preferences.
 *
 * Features:
 * - Daily and weekly digest scheduling
 * - Email content generation with HTML templates
 * - Quiet hours and preference checking
 * - Retry with exponential backoff
 *
 * @module lib/jobs/handlers/notification-digest
 * @version 1.0.0
 */

import { Job } from "bullmq";
import { createLogger } from "@/lib/logger";
import { getNotificationService } from "@/services/notifications/notification.service";
import { getPreferenceService } from "@/services/notifications/preference.service";
import type { JobResult } from "@/services/jobs/types";

const log = createLogger("NotificationDigestHandler");

// ============================================================================
// CONSTANTS
// ============================================================================

export const MAX_RETRIES = 2;
export const BASE_RETRY_DELAY = 10000;
export const BATCH_SIZE = 100;
export const MAX_NOTIFICATIONS_PER_DIGEST = 50;

// ============================================================================
// TYPES
// ============================================================================

export interface DigestPayload {
  userId: string;
  email: string;
  digestType: "daily" | "weekly" | "hourly";
  periodStart?: number;
  periodEnd?: number;
  channelIds?: string[];
  includeUnreadCount?: boolean;
  includeMentions?: boolean;
  includeThreadReplies?: boolean;
  timezone?: string;
}

export interface DigestResult {
  userId: string;
  digestType: string;
  notificationCount: number;
  sentAt: Date;
  emailId?: string;
}

interface JobData {
  type: string;
  payload: DigestPayload;
  metadata: Record<string, unknown>;
  tags: string[];
  createdAt: string;
}

interface DigestNotification {
  id: string;
  type: string;
  priority: string;
  title: string;
  body: string;
  actor?: {
    id: string;
    display_name: string;
    avatar_url?: string;
  };
  channel?: {
    id: string;
    name: string;
  };
  created_at: string;
  is_read: boolean;
  action_url?: string;
}

interface ChannelActivity {
  channelId: string;
  channelName: string;
  messageCount: number;
  mentionCount: number;
}

// ============================================================================
// GRAPHQL QUERIES
// ============================================================================

const GET_NOTIFICATIONS_FOR_DIGEST = `
  query GetNotificationsForDigest(
    $userId: uuid!
    $startDate: timestamptz!
    $endDate: timestamptz!
    $limit: Int!
  ) {
    nchat_notifications(
      where: {
        user_id: { _eq: $userId }
        created_at: { _gte: $startDate, _lte: $endDate }
        is_archived: { _eq: false }
      }
      order_by: { created_at: desc }
      limit: $limit
    ) {
      id
      type
      priority
      title
      body
      actor {
        id
        display_name
        avatar_url
      }
      channel {
        id
        name
      }
      created_at
      is_read
      action_url
    }
    nchat_notifications_aggregate(
      where: {
        user_id: { _eq: $userId }
        created_at: { _gte: $startDate, _lte: $endDate }
        is_read: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`;

const GET_USER_EMAIL = `
  query GetUserEmail($userId: uuid!) {
    users_by_pk(id: $userId) {
      email
      display_name
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
 * Calculate digest period based on type
 */
function getDigestPeriod(digestType: DigestPayload["digestType"]): {
  start: Date;
  end: Date;
} {
  const end = new Date();
  const start = new Date();

  switch (digestType) {
    case "hourly":
      start.setHours(start.getHours() - 1);
      break;
    case "daily":
      start.setDate(start.getDate() - 1);
      break;
    case "weekly":
      start.setDate(start.getDate() - 7);
      break;
    default:
      start.setDate(start.getDate() - 1);
  }

  return { start, end };
}

/**
 * Group notifications by channel for activity summary
 */
function groupByChannel(
  notifications: DigestNotification[],
): ChannelActivity[] {
  const channelMap = new Map<
    string,
    { name: string; messages: number; mentions: number }
  >();

  notifications.forEach((n) => {
    if (n.channel?.id) {
      const existing = channelMap.get(n.channel.id) || {
        name: n.channel.name || n.channel.id,
        messages: 0,
        mentions: 0,
      };
      existing.messages++;
      if (n.type === "mention") {
        existing.mentions++;
      }
      channelMap.set(n.channel.id, existing);
    }
  });

  return Array.from(channelMap.entries())
    .map(([channelId, data]) => ({
      channelId,
      channelName: data.name,
      messageCount: data.messages,
      mentionCount: data.mentions,
    }))
    .sort((a, b) => b.messageCount - a.messageCount);
}

/**
 * Generate HTML email content for digest
 */
function generateDigestHtml(
  notifications: DigestNotification[],
  period: { start: Date; end: Date },
  digestType: string,
  userName?: string,
): string {
  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const mentionCount = notifications.filter((n) => n.type === "mention").length;
  const dmCount = notifications.filter(
    (n) => n.type === "direct_message",
  ).length;
  const threadCount = notifications.filter(
    (n) => n.type === "thread_reply",
  ).length;
  const channelActivity = groupByChannel(notifications);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.nchat.com";
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "nchat";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${digestType.charAt(0).toUpperCase() + digestType.slice(1)} Notification Digest</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; color: #1f2937; margin: 0; padding: 0; background: #f3f4f6; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .email-wrapper { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
    .header { background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: white; padding: 32px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .header p { margin: 8px 0 0; opacity: 0.9; font-size: 14px; }
    .greeting { padding: 24px 24px 0; font-size: 16px; color: #374151; }
    .summary { padding: 16px 24px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .summary-item { background: #f9fafb; padding: 16px; border-radius: 8px; text-align: center; }
    .summary-value { font-size: 28px; font-weight: bold; color: #4f46e5; margin-bottom: 4px; }
    .summary-label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
    .section { padding: 0 24px 24px; }
    .section-title { font-size: 14px; font-weight: 600; color: #374151; margin: 0 0 12px; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb; }
    .notification { padding: 12px; background: #fafafa; border-radius: 8px; margin-bottom: 10px; border-left: 3px solid #e5e7eb; }
    .notification.unread { border-left-color: #ef4444; background: #fef2f2; }
    .notification.mention { border-left-color: #f59e0b; background: #fffbeb; }
    .notification-header { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
    .notification-avatar { width: 28px; height: 28px; border-radius: 50%; background: #e5e7eb; flex-shrink: 0; }
    .notification-title { font-weight: 600; color: #111827; font-size: 14px; flex: 1; }
    .notification-body { color: #6b7280; font-size: 13px; line-height: 1.4; margin-bottom: 6px; }
    .notification-meta { font-size: 11px; color: #9ca3af; }
    .notification-action { display: inline-block; margin-top: 8px; padding: 6px 14px; background: #4f46e5; color: white; text-decoration: none; border-radius: 6px; font-size: 12px; font-weight: 500; }
    .channel-list { background: #f9fafb; border-radius: 8px; padding: 12px; }
    .channel-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
    .channel-item:last-child { border-bottom: none; }
    .channel-name { font-weight: 500; color: #374151; font-size: 13px; }
    .channel-stats { font-size: 12px; color: #6b7280; }
    .cta-button { display: block; text-align: center; padding: 14px 24px; background: #4f46e5; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; margin: 0 24px 24px; }
    .cta-button:hover { background: #4338ca; }
    .footer { background: #f9fafb; padding: 24px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; }
    .footer a { color: #4f46e5; text-decoration: none; }
    .footer a:hover { text-decoration: underline; }
    .unsubscribe { margin-top: 12px; font-size: 11px; }
    @media (max-width: 480px) {
      .summary { grid-template-columns: repeat(2, 1fr); }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="email-wrapper">
      <div class="header">
        <h1>${digestType.charAt(0).toUpperCase() + digestType.slice(1)} Digest</h1>
        <p>${period.start.toLocaleDateString()} - ${period.end.toLocaleDateString()}</p>
      </div>

      ${userName ? `<div class="greeting">Hi ${userName},</div>` : ""}

      <div class="summary">
        <div class="summary-item">
          <div class="summary-value">${notifications.length}</div>
          <div class="summary-label">Total</div>
        </div>
        <div class="summary-item">
          <div class="summary-value">${unreadCount}</div>
          <div class="summary-label">Unread</div>
        </div>
        <div class="summary-item">
          <div class="summary-value">${mentionCount}</div>
          <div class="summary-label">Mentions</div>
        </div>
        <div class="summary-item">
          <div class="summary-value">${dmCount}</div>
          <div class="summary-label">Messages</div>
        </div>
      </div>

      ${
        channelActivity.length > 0
          ? `
        <div class="section">
          <div class="section-title">Channel Activity</div>
          <div class="channel-list">
            ${channelActivity
              .slice(0, 5)
              .map(
                (ch) => `
              <div class="channel-item">
                <span class="channel-name">#${ch.channelName}</span>
                <span class="channel-stats">${ch.messageCount} messages${
                  ch.mentionCount > 0 ? ` (${ch.mentionCount} mentions)` : ""
                }</span>
              </div>
            `,
              )
              .join("")}
          </div>
        </div>
      `
          : ""
      }

      ${
        notifications.length > 0
          ? `
        <div class="section">
          <div class="section-title">Recent Notifications</div>
          ${notifications
            .slice(0, 10)
            .map(
              (n) => `
            <div class="notification ${!n.is_read ? "unread" : ""} ${n.type === "mention" ? "mention" : ""}">
              <div class="notification-header">
                ${n.actor?.avatar_url ? `<img src="${n.actor.avatar_url}" alt="" class="notification-avatar">` : '<div class="notification-avatar"></div>'}
                <div class="notification-title">${n.title}</div>
              </div>
              <div class="notification-body">${n.body.length > 120 ? n.body.substring(0, 120) + "..." : n.body}</div>
              <div class="notification-meta">${new Date(n.created_at).toLocaleString()}</div>
              ${n.action_url ? `<a href="${n.action_url}" class="notification-action">View</a>` : ""}
            </div>
          `,
            )
            .join("")}
        </div>
      `
          : `
        <div class="section">
          <p style="text-align: center; color: #6b7280; padding: 24px 0;">No new notifications during this period.</p>
        </div>
      `
      }

      <a href="${appUrl}/chat" class="cta-button">Open ${appName}</a>

      <div class="footer">
        <p>You received this digest because you have ${digestType} notification digest enabled.</p>
        <p><a href="${appUrl}/settings/notifications">Manage notification settings</a></p>
        <p class="unsubscribe">
          <a href="${appUrl}/api/notifications/unsubscribe?type=digest&userId={{userId}}">Unsubscribe from digest emails</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

// ============================================================================
// JOB PROCESSOR
// ============================================================================

/**
 * Process an email digest job
 */
export async function processDigestJob(
  job: Job<JobData>,
): Promise<JobResult<DigestResult>> {
  const payload = job.data.payload as DigestPayload;
  const jobLog = createLogger(`DigestJob:${job.id}`);

  jobLog.info("Processing digest job", {
    userId: payload.userId,
    digestType: payload.digestType,
    attemptsMade: job.attemptsMade,
  });

  try {
    await job.updateProgress(10);

    // Get preference service to check if user wants digests
    const preferenceService = getPreferenceService();
    const preferences = await preferenceService.getPreferences(payload.userId);

    // Check if digest is enabled
    if (!preferences.digest.enabled) {
      jobLog.info("Digest disabled for user, skipping", {
        userId: payload.userId,
      });
      return {
        success: true,
        data: {
          userId: payload.userId,
          digestType: payload.digestType,
          notificationCount: 0,
          sentAt: new Date(),
        },
        metadata: { skipped: true, reason: "digest_disabled" },
      };
    }

    await job.updateProgress(20);

    // Calculate period
    const period = getDigestPeriod(payload.digestType);

    // Get user's email if not provided
    let email = payload.email;
    let userName: string | undefined;

    if (!email) {
      const userResult = await executeGraphQL<{
        users_by_pk: { email: string; display_name: string } | null;
      }>(GET_USER_EMAIL, { userId: payload.userId });

      if (!userResult.data?.users_by_pk?.email) {
        throw new Error("User email not found");
      }

      email = userResult.data.users_by_pk.email;
      userName = userResult.data.users_by_pk.display_name;
    }

    await job.updateProgress(40);

    // Fetch notifications for the period
    const notificationsResult = await executeGraphQL<{
      nchat_notifications: DigestNotification[];
      nchat_notifications_aggregate: { aggregate: { count: number } };
    }>(GET_NOTIFICATIONS_FOR_DIGEST, {
      userId: payload.userId,
      startDate: period.start.toISOString(),
      endDate: period.end.toISOString(),
      limit: MAX_NOTIFICATIONS_PER_DIGEST,
    });

    if (notificationsResult.errors) {
      throw new Error(
        `Failed to fetch notifications: ${notificationsResult.errors[0].message}`,
      );
    }

    await job.updateProgress(60);

    const notifications = notificationsResult.data?.nchat_notifications || [];
    const unreadCount =
      notificationsResult.data?.nchat_notifications_aggregate?.aggregate
        ?.count || 0;

    // Skip if no notifications
    if (notifications.length === 0 && unreadCount === 0) {
      jobLog.info("No notifications to include in digest", {
        userId: payload.userId,
      });
      return {
        success: true,
        data: {
          userId: payload.userId,
          digestType: payload.digestType,
          notificationCount: 0,
          sentAt: new Date(),
        },
        metadata: { skipped: true, reason: "no_notifications" },
      };
    }

    await job.updateProgress(70);

    // Generate HTML content
    const htmlContent = generateDigestHtml(
      notifications,
      period,
      payload.digestType,
      userName,
    );

    await job.updateProgress(80);

    // Send email via notification service
    const notificationService = getNotificationService();
    const sendResult = await notificationService.sendEmail(
      payload.userId,
      email,
      {
        subject: `Your ${payload.digestType} notification digest - ${period.start.toLocaleDateString()}`,
        html: htmlContent,
        category: "system",
      },
    );

    await job.updateProgress(90);

    if (!sendResult.success) {
      throw new Error(sendResult.error || "Failed to send digest email");
    }

    await job.updateProgress(100);

    jobLog.info("Digest email sent successfully", {
      userId: payload.userId,
      digestType: payload.digestType,
      notificationCount: notifications.length,
      emailId: sendResult.notification_id,
    });

    return {
      success: true,
      data: {
        userId: payload.userId,
        digestType: payload.digestType,
        notificationCount: notifications.length,
        sentAt: new Date(),
        emailId: sendResult.notification_id,
      },
      metadata: {
        period: { start: period.start, end: period.end },
        unreadCount,
        channelCount: new Set(
          notifications.map((n) => n.channel?.id).filter(Boolean),
        ).size,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    jobLog.error("Error processing digest job", error as Error, {
      userId: payload.userId,
      digestType: payload.digestType,
    });

    // Throw to trigger retry if attempts remaining
    if (job.attemptsMade < MAX_RETRIES) {
      throw error;
    }

    return {
      success: false,
      error: errorMessage,
      metadata: {
        userId: payload.userId,
        digestType: payload.digestType,
        attemptsMade: job.attemptsMade,
      },
    };
  }
}

// ============================================================================
// BATCH PROCESSING
// ============================================================================

const GET_USERS_WITH_DIGEST_ENABLED = `
  query GetUsersWithDigestEnabled($frequency: String!, $limit: Int!, $offset: Int!) {
    nchat_digest_settings(
      where: {
        enabled: { _eq: true }
        frequency: { _eq: $frequency }
      }
      limit: $limit
      offset: $offset
    ) {
      user_id
      frequency
      time
      timezone
      last_sent_at
    }
    nchat_digest_settings_aggregate(
      where: {
        enabled: { _eq: true }
        frequency: { _eq: $frequency }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`;

const UPDATE_DIGEST_LAST_SENT = `
  mutation UpdateDigestLastSent($userId: uuid!) {
    update_nchat_digest_settings_by_pk(
      pk_columns: { user_id: $userId }
      _set: { last_sent_at: "now()" }
    ) {
      user_id
      last_sent_at
    }
  }
`;

/**
 * Check if it's time to send a digest based on user's settings
 */
function shouldSendDigest(
  settings: { time: string; timezone: string; last_sent_at: string | null },
  digestType: "daily" | "weekly" | "hourly",
): boolean {
  const now = new Date();

  // Get current time in user's timezone
  const userTime = new Intl.DateTimeFormat("en-US", {
    timeZone: settings.timezone || "UTC",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);

  // Check if we're within the digest window (settings.time +/- 30 mins)
  const [targetHour, targetMinute] = settings.time.split(":").map(Number);
  const [currentHour, currentMinute] = userTime.split(":").map(Number);

  const targetMinutes = targetHour * 60 + targetMinute;
  const currentMinutes = currentHour * 60 + currentMinute;
  const diff = Math.abs(currentMinutes - targetMinutes);

  // Not within 30-minute window of target time
  if (diff > 30 && diff < 1410) {
    return false;
  }

  // Check last sent time
  if (settings.last_sent_at) {
    const lastSent = new Date(settings.last_sent_at);
    const hoursSinceLastSent =
      (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60);

    if (digestType === "hourly" && hoursSinceLastSent < 0.9) {
      return false;
    }
    if (digestType === "daily" && hoursSinceLastSent < 22) {
      return false;
    }
    if (digestType === "weekly" && hoursSinceLastSent < 166) {
      return false;
    }
  }

  return true;
}

/**
 * Process all pending digests for users who have them enabled
 */
export async function processAllPendingDigests(
  digestType: "daily" | "weekly" | "hourly",
): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
}> {
  log.info("Processing pending digests", { digestType });

  const result = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0,
  };

  try {
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      // Get users with digest enabled for this frequency
      const usersResult = await executeGraphQL<{
        nchat_digest_settings: Array<{
          user_id: string;
          frequency: string;
          time: string;
          timezone: string;
          last_sent_at: string | null;
        }>;
        nchat_digest_settings_aggregate: { aggregate: { count: number } };
      }>(GET_USERS_WITH_DIGEST_ENABLED, {
        frequency: digestType,
        limit: BATCH_SIZE,
        offset,
      });

      if (usersResult.errors) {
        log.error("Failed to get users with digest enabled", undefined, {
          errors: usersResult.errors,
        });
        break;
      }

      const users = usersResult.data?.nchat_digest_settings || [];
      const totalCount =
        usersResult.data?.nchat_digest_settings_aggregate?.aggregate?.count ||
        0;

      for (const userSettings of users) {
        result.processed++;

        // Check if it's time to send digest
        if (!shouldSendDigest(userSettings, digestType)) {
          result.skipped++;
          continue;
        }

        try {
          // Get user email
          const userResult = await executeGraphQL<{
            users_by_pk: { email: string; display_name: string } | null;
          }>(GET_USER_EMAIL, { userId: userSettings.user_id });

          if (!userResult.data?.users_by_pk?.email) {
            log.warn("User email not found", { userId: userSettings.user_id });
            result.skipped++;
            continue;
          }

          // Create a mock job to process
          const mockJob = {
            id: `batch-${userSettings.user_id}-${Date.now()}`,
            data: {
              type: "email-digest",
              payload: {
                userId: userSettings.user_id,
                email: userResult.data.users_by_pk.email,
                digestType,
                timezone: userSettings.timezone,
              } as DigestPayload,
              metadata: {},
              tags: ["digest", digestType],
              createdAt: new Date().toISOString(),
            },
            attemptsMade: 0,
            updateProgress: async () => {},
          } as unknown as Job<JobData>;

          const jobResult = await processDigestJob(mockJob);

          if (jobResult.success) {
            result.succeeded++;
            // Update last_sent_at
            await executeGraphQL(UPDATE_DIGEST_LAST_SENT, {
              userId: userSettings.user_id,
            });
          } else {
            result.failed++;
          }
        } catch (error) {
          result.failed++;
          log.error("Failed to process digest for user", error as Error, {
            userId: userSettings.user_id,
          });
        }
      }

      offset += BATCH_SIZE;
      hasMore = offset < totalCount;
    }

    log.info("Pending digests processing complete", result);
    return result;
  } catch (error) {
    log.error("Error processing pending digests", error as Error);
    return result;
  }
}

// ============================================================================
// REGISTRATION HELPER
// ============================================================================

interface JobData {
  type: string;
  payload: DigestPayload;
  metadata: Record<string, unknown>;
  tags: string[];
  createdAt: string;
}

/**
 * Register the digest processor with the processor service
 */
export function registerDigestProcessor(processorService: {
  registerProcessor: (
    type: string,
    processor: (job: Job<JobData>) => Promise<JobResult<unknown>>,
  ) => void;
}): void {
  processorService.registerProcessor(
    "email-digest",
    processDigestJob as (job: Job<JobData>) => Promise<JobResult<unknown>>,
  );
  log.info("Email digest processor registered");
}

export default {
  processDigestJob,
  processAllPendingDigests,
  registerDigestProcessor,
  MAX_RETRIES,
  BASE_RETRY_DELAY,
  MAX_NOTIFICATIONS_PER_DIGEST,
};
