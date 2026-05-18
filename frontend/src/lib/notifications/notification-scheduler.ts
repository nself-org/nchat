/**
 * Notification Scheduler - Handles scheduled and digest notifications
 *
 * Provides:
 * - Email digest scheduling
 * - Reminder notifications
 * - Scheduled message delivery
 * - Batch notification timing
 */

import type {
  EmailDigestFrequency,
  DayOfWeek,
  NotificationHistoryEntry,
} from "./notification-types";

// ============================================================================
// Types
// ============================================================================

export interface ScheduledNotification {
  id: string;
  /** When to send the notification (ISO date string) */
  scheduledFor: string;
  /** Notification payload */
  payload: {
    type: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  };
  /** Whether this has been sent */
  sent: boolean;
  /** Whether this is a recurring notification */
  recurring: boolean;
  /** Recurrence pattern (if recurring) */
  recurrencePattern?: "daily" | "weekly" | "monthly";
  /** Created timestamp */
  createdAt: string;
}

export interface DigestConfig {
  frequency: EmailDigestFrequency;
  time: string; // HH:mm
  weeklyDay: DayOfWeek;
  timezone: string;
}

export interface DigestContent {
  period: {
    from: string;
    to: string;
  };
  summary: {
    totalNotifications: number;
    unreadCount: number;
    mentions: number;
    directMessages: number;
    threads: number;
    channels: number;
  };
  notifications: NotificationHistoryEntry[];
  channelActivity: Array<{
    channelId: string;
    channelName: string;
    messageCount: number;
    mentionCount: number;
  }>;
}

// ============================================================================
// Time Utilities
// ============================================================================

/**
 * Parse time string to Date object for today
 */
export function parseTimeForToday(time: string, timezone?: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const now = new Date();

  // Create date in local timezone
  const date = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    hours,
    minutes,
    0,
    0,
  );

  return date;
}

/**
 * Get the next occurrence of a specific time
 */
export function getNextOccurrence(
  time: string,
  options?: {
    timezone?: string;
    skipToday?: boolean;
  },
): Date {
  const now = new Date();
  const target = parseTimeForToday(time, options?.timezone);

  // If the time has passed today (or skipToday), move to tomorrow
  if (target <= now || options?.skipToday) {
    target.setDate(target.getDate() + 1);
  }

  return target;
}

/**
 * Get the next occurrence for a specific day of week
 */
export function getNextDayOccurrence(
  dayOfWeek: DayOfWeek,
  time: string,
  options?: {
    timezone?: string;
    skipThisWeek?: boolean;
  },
): Date {
  const now = new Date();
  const currentDay = now.getDay() as DayOfWeek;

  let daysToAdd = dayOfWeek - currentDay;
  if (daysToAdd < 0) {
    daysToAdd += 7;
  }

  // If it's the same day, check if time has passed
  if (daysToAdd === 0) {
    const target = parseTimeForToday(time, options?.timezone);
    if (target <= now || options?.skipThisWeek) {
      daysToAdd = 7;
    }
  }

  // If skipping this week, add 7 days
  if (options?.skipThisWeek && daysToAdd < 7) {
    daysToAdd += 7;
  }

  const target = new Date(now);
  target.setDate(target.getDate() + daysToAdd);
  const [hours, minutes] = time.split(":").map(Number);
  target.setHours(hours, minutes, 0, 0);

  return target;
}

// ============================================================================
// Digest Scheduling
// ============================================================================

/**
 * Get the next scheduled digest time
 */
export function getNextDigestTime(config: DigestConfig): Date | null {
  switch (config.frequency) {
    case "instant":
    case "never":
      return null;

    case "hourly":
      const nextHour = new Date();
      nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
      return nextHour;

    case "daily":
      return getNextOccurrence(config.time, { timezone: config.timezone });

    case "weekly":
      return getNextDayOccurrence(config.weeklyDay, config.time, {
        timezone: config.timezone,
      });

    default:
      return null;
  }
}

/**
 * Get the period for a digest based on frequency
 */
export function getDigestPeriod(frequency: EmailDigestFrequency): {
  from: Date;
  to: Date;
} {
  const to = new Date();
  const from = new Date();

  switch (frequency) {
    case "hourly":
      from.setHours(from.getHours() - 1);
      break;
    case "daily":
      from.setDate(from.getDate() - 1);
      break;
    case "weekly":
      from.setDate(from.getDate() - 7);
      break;
    default:
      from.setDate(from.getDate() - 1);
  }

  return { from, to };
}

/**
 * Check if a digest should be sent now
 */
export function shouldSendDigest(
  config: DigestConfig,
  lastSentAt?: string,
): boolean {
  if (config.frequency === "instant" || config.frequency === "never") {
    return false;
  }

  const now = new Date();
  const nextDigestTime = getNextDigestTime(config);

  if (!nextDigestTime) return false;

  // Check if we've passed the scheduled time
  if (now < nextDigestTime) return false;

  // Check if we already sent one recently
  if (lastSentAt) {
    const lastSent = new Date(lastSentAt);
    const minInterval = getMinDigestInterval(config.frequency);
    const timeSinceLastSent = now.getTime() - lastSent.getTime();

    if (timeSinceLastSent < minInterval) {
      return false;
    }
  }

  return true;
}

/**
 * Get minimum interval between digests (in milliseconds)
 */
function getMinDigestInterval(frequency: EmailDigestFrequency): number {
  switch (frequency) {
    case "hourly":
      return 55 * 60 * 1000; // 55 minutes
    case "daily":
      return 23 * 60 * 60 * 1000; // 23 hours
    case "weekly":
      return 6 * 24 * 60 * 60 * 1000; // 6 days
    default:
      return 0;
  }
}

// ============================================================================
// Digest Content Generation
// ============================================================================

/**
 * Generate digest content from notifications
 */
export function generateDigestContent(
  notifications: NotificationHistoryEntry[],
  period: { from: Date; to: Date },
): DigestContent {
  // Filter notifications within period
  const filtered = notifications.filter((n) => {
    const createdAt = new Date(n.createdAt);
    return createdAt >= period.from && createdAt <= period.to;
  });

  // Calculate summary
  const summary = {
    totalNotifications: filtered.length,
    unreadCount: filtered.filter((n) => !n.isRead).length,
    mentions: filtered.filter((n) => n.type === "mention").length,
    directMessages: filtered.filter((n) => n.type === "direct_message").length,
    threads: filtered.filter((n) => n.type === "thread_reply").length,
    channels: new Set(filtered.map((n) => n.channelId).filter(Boolean)).size,
  };

  // Group by channel for activity summary
  const channelMap = new Map<
    string,
    { name: string; messages: number; mentions: number }
  >();

  filtered.forEach((n) => {
    if (n.channelId) {
      const existing = channelMap.get(n.channelId) || {
        name: n.channelName || n.channelId,
        messages: 0,
        mentions: 0,
      };
      existing.messages++;
      if (n.type === "mention") {
        existing.mentions++;
      }
      channelMap.set(n.channelId, existing);
    }
  });

  const channelActivity = Array.from(channelMap.entries())
    .map(([channelId, data]) => ({
      channelId,
      channelName: data.name,
      messageCount: data.messages,
      mentionCount: data.mentions,
    }))
    .sort((a, b) => b.messageCount - a.messageCount);

  return {
    period: {
      from: period.from.toISOString(),
      to: period.to.toISOString(),
    },
    summary,
    notifications: filtered.slice(0, 50), // Limit to 50 most recent
    channelActivity,
  };
}

/**
 * Format digest content as plain text
 */
export function formatDigestAsText(digest: DigestContent): string {
  const lines: string[] = [];

  lines.push("=".repeat(50));
  lines.push("NOTIFICATION DIGEST");
  lines.push("=".repeat(50));
  lines.push("");

  // Period
  const fromDate = new Date(digest.period.from).toLocaleDateString();
  const toDate = new Date(digest.period.to).toLocaleDateString();
  lines.push(`Period: ${fromDate} - ${toDate}`);
  lines.push("");

  // Summary
  lines.push("SUMMARY");
  lines.push("-".repeat(50));
  lines.push(`Total notifications: ${digest.summary.totalNotifications}`);
  lines.push(`Unread: ${digest.summary.unreadCount}`);
  lines.push(`Mentions: ${digest.summary.mentions}`);
  lines.push(`Direct messages: ${digest.summary.directMessages}`);
  lines.push(`Thread replies: ${digest.summary.threads}`);
  lines.push(`Active channels: ${digest.summary.channels}`);
  lines.push("");

  // Channel activity
  if (digest.channelActivity.length > 0) {
    lines.push("CHANNEL ACTIVITY");
    lines.push("-".repeat(50));
    digest.channelActivity.forEach((channel) => {
      lines.push(
        `#${channel.channelName}: ${channel.messageCount} messages` +
          (channel.mentionCount > 0
            ? ` (${channel.mentionCount} mentions)`
            : ""),
      );
    });
    lines.push("");
  }

  // Recent notifications
  if (digest.notifications.length > 0) {
    lines.push("RECENT NOTIFICATIONS");
    lines.push("-".repeat(50));
    digest.notifications.slice(0, 10).forEach((n) => {
      const time = new Date(n.createdAt).toLocaleString();
      const status = n.isRead ? "[Read]" : "[Unread]";
      lines.push(`${status} ${n.title}`);
      lines.push(`   ${n.body}`);
      lines.push(`   ${time}`);
      lines.push("");
    });
  }

  return lines.join("\n");
}

/**
 * Format digest content as HTML
 */
export function formatDigestAsHtml(digest: DigestContent): string {
  const fromDate = new Date(digest.period.from).toLocaleDateString();
  const toDate = new Date(digest.period.to).toLocaleDateString();

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4f46e5; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
    .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 20px 0; }
    .summary-item { background: white; padding: 15px; border-radius: 6px; text-align: center; }
    .summary-value { font-size: 24px; font-weight: bold; color: #4f46e5; }
    .summary-label { font-size: 12px; color: #6b7280; text-transform: uppercase; }
    .section { margin: 20px 0; }
    .section-title { font-size: 14px; font-weight: 600; color: #374151; margin-bottom: 10px; }
    .notification { background: white; padding: 12px; border-radius: 6px; margin-bottom: 8px; border-left: 3px solid #4f46e5; }
    .notification.unread { border-left-color: #ef4444; }
    .notification-title { font-weight: 600; margin-bottom: 4px; }
    .notification-body { color: #6b7280; font-size: 14px; }
    .notification-time { color: #9ca3af; font-size: 12px; margin-top: 4px; }
    .channel-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
    .channel-name { font-weight: 500; }
    .channel-stats { color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 20px;">Notification Digest</h1>
      <p style="margin: 5px 0 0; opacity: 0.9; font-size: 14px;">${fromDate} - ${toDate}</p>
    </div>
    <div class="content">
      <div class="summary-grid">
        <div class="summary-item">
          <div class="summary-value">${digest.summary.unreadCount}</div>
          <div class="summary-label">Unread</div>
        </div>
        <div class="summary-item">
          <div class="summary-value">${digest.summary.mentions}</div>
          <div class="summary-label">Mentions</div>
        </div>
        <div class="summary-item">
          <div class="summary-value">${digest.summary.directMessages}</div>
          <div class="summary-label">Direct Messages</div>
        </div>
        <div class="summary-item">
          <div class="summary-value">${digest.summary.threads}</div>
          <div class="summary-label">Thread Replies</div>
        </div>
      </div>

      ${
        digest.channelActivity.length > 0
          ? `
        <div class="section">
          <div class="section-title">Channel Activity</div>
          ${digest.channelActivity
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
      `
          : ""
      }

      ${
        digest.notifications.length > 0
          ? `
        <div class="section">
          <div class="section-title">Recent Notifications</div>
          ${digest.notifications
            .slice(0, 10)
            .map(
              (n) => `
            <div class="notification ${n.isRead ? "" : "unread"}">
              <div class="notification-title">${n.title}</div>
              <div class="notification-body">${n.body}</div>
              <div class="notification-time">${new Date(n.createdAt).toLocaleString()}</div>
            </div>
          `,
            )
            .join("")}
        </div>
      `
          : ""
      }
    </div>
  </div>
</body>
</html>
  `.trim();
}

// ============================================================================
// Scheduled Notification Management
// ============================================================================

/**
 * Create a scheduled notification
 */
export function createScheduledNotification(
  payload: ScheduledNotification["payload"],
  scheduledFor: Date | string,
  options?: {
    recurring?: boolean;
    recurrencePattern?: ScheduledNotification["recurrencePattern"];
  },
): ScheduledNotification {
  return {
    id: `sched_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    scheduledFor:
      typeof scheduledFor === "string"
        ? scheduledFor
        : scheduledFor.toISOString(),
    payload,
    sent: false,
    recurring: options?.recurring ?? false,
    recurrencePattern: options?.recurrencePattern,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Get due notifications
 */
export function getDueNotifications(
  scheduled: ScheduledNotification[],
  now: Date = new Date(),
): ScheduledNotification[] {
  return scheduled.filter((n) => {
    if (n.sent) return false;
    const scheduledTime = new Date(n.scheduledFor);
    return scheduledTime <= now;
  });
}

/**
 * Process a scheduled notification (mark as sent or reschedule)
 */
export function processScheduledNotification(
  notification: ScheduledNotification,
): ScheduledNotification {
  if (notification.recurring && notification.recurrencePattern) {
    // Calculate next occurrence
    const nextDate = new Date(notification.scheduledFor);

    switch (notification.recurrencePattern) {
      case "daily":
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case "weekly":
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case "monthly":
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
    }

    return {
      ...notification,
      scheduledFor: nextDate.toISOString(),
      sent: false,
    };
  }

  return {
    ...notification,
    sent: true,
  };
}
