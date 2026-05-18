/**
 * Scheduler Bot Template
 * Set reminders and schedule messages
 *
 * Features:
 * - Create one-time or recurring reminders
 * - Schedule messages for future delivery
 * - Meeting reminders with calendar integration
 * - Timezone support
 * - Notification preferences
 */

import {
  bot,
  text,
  embed,
  success,
  error,
  parseDuration,
  formatDuration,
  response,
} from "../bot-sdk";
import type { BotInstance } from "../bot-runtime";
import type { BotResponse } from "../bot-types";

export interface Reminder {
  id: string;
  message: string;
  channelId: string;
  userId: string;
  scheduledFor: Date;
  recurring?: {
    interval: number; // milliseconds
    count?: number; // max occurrences
  };
  completed: boolean;
  createdAt: Date;
}

/**
 * Create a scheduler bot instance
 */
export function createSchedulerBot(): BotInstance {
  return (
    bot("scheduler-bot")
      .name("Scheduler Bot")
      .description("Set reminders and schedule messages")
      .version("1.0.0")
      .icon("⏰")
      .permissions("read_messages", "send_messages", "mention_users")

      .settings({
        maxRemindersPerUser: 20,
        defaultTimezone: "UTC",
        allowRecurring: true,
      })

      // Create reminder command
      .command("remind", "Set a reminder", async (ctx, api) => {
        if (!ctx.args.message || !ctx.args.when) {
          return text(
            "Usage: `/remind when:<time> message:<message> [repeat:<interval>]`\n\n" +
              "Time formats:\n" +
              "• `5m`, `30m`, `2h`, `1d` (relative time)\n" +
              "• `tomorrow`, `monday`, `next week`\n" +
              "• `2026-02-01 15:00` (absolute time)\n\n" +
              "Examples:\n" +
              '`/remind when:30m message:"Check status"`\n' +
              '`/remind when:tomorrow message:"Team meeting" repeat:1d`\n' +
              '`/remind when:"2026-02-01 15:00" message:"Deadline"`',
          );
        }

        const message = ctx.args.message as string;
        const whenStr = ctx.args.when as string;
        const repeatStr = ctx.args.repeat as string | undefined;

        // Parse time
        const scheduledFor = parseTime(whenStr);

        if (!scheduledFor || scheduledFor.getTime() < Date.now()) {
          return error("Invalid time. Please use a future time.");
        }

        // Check user reminder limit
        const userReminders = await getUserReminders(ctx.user.id, api);
        const config = api.getBotConfig();
        const maxReminders =
          typeof config.settings?.maxRemindersPerUser === "number"
            ? config.settings.maxRemindersPerUser
            : 20;

        if (userReminders.length >= maxReminders) {
          return error(
            `You have reached the maximum of ${maxReminders} reminders. Delete some first.`,
          );
        }

        const parsedInterval = repeatStr ? parseDuration(repeatStr) : null;
        const reminder: Reminder = {
          id: Math.random().toString(36).substring(7),
          message,
          channelId: ctx.channel.id,
          userId: ctx.user.id,
          scheduledFor,
          recurring:
            parsedInterval !== null && parsedInterval > 0
              ? {
                  interval: parsedInterval,
                  count: ctx.args.count
                    ? parseInt(ctx.args.count as string)
                    : undefined,
                }
              : undefined,
          completed: false,
          createdAt: new Date(),
        };

        // Store reminder
        await api.setStorage(`reminder:${reminder.id}`, reminder);

        // Schedule the reminder
        await api.scheduleMessage(
          ctx.channel.id,
          text(`⏰ ${api.mentionUser(ctx.user.id)}: ${message}`),
          scheduledFor.getTime() - Date.now(),
        );

        return success(
          `Reminder set!\n\n` +
            `**When:** ${formatDateTime(scheduledFor)}\n` +
            `**Message:** ${message}\n` +
            (reminder.recurring
              ? `**Recurring:** Every ${formatDuration(reminder.recurring.interval)}`
              : ""),
        );
      })

      // List reminders command
      .command(
        "reminders",
        "List your reminders",
        async (ctx, api): Promise<BotResponse> => {
          const reminders = await getUserReminders(ctx.user.id, api);

          if (reminders.length === 0) {
            return text("You have no active reminders.");
          }

          const embedBuilder = embed()
            .title("⏰ Your Reminders")
            .color("#f59e0b");

          reminders
            .sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime())
            .forEach((reminder, i) => {
              embedBuilder.field(
                `${i + 1}. ${reminder.message}`,
                `**When:** ${formatDateTime(reminder.scheduledFor)}\n` +
                  (reminder.recurring
                    ? `**Repeats:** Every ${formatDuration(reminder.recurring.interval)}\n`
                    : "") +
                  `**ID:** \`${reminder.id}\``,
                false,
              );
            });

          return response().embed(embedBuilder).build();
        },
      )

      // Delete reminder command
      .command("deletereminder", "Delete a reminder", async (ctx, api) => {
        if (!ctx.args.id) {
          return text(
            "Usage: `/deletereminder id:<reminder-id>`\n\nUse `/reminders` to see your reminder IDs.",
          );
        }

        const reminderId = ctx.args.id as string;
        const reminder = await api.getStorage<Reminder>(
          `reminder:${reminderId}`,
        );

        if (!reminder) {
          return error("Reminder not found.");
        }

        if (reminder.userId !== ctx.user.id) {
          return error("You can only delete your own reminders.");
        }

        await api.deleteStorage(`reminder:${reminderId}`);

        return success(`Reminder deleted: "${reminder.message}"`);
      })

      // Schedule message command
      .command("schedule", "Schedule a message", async (ctx, api) => {
        if (!ctx.args.when || !ctx.args.message) {
          return text(
            "Usage: `/schedule when:<time> message:<message> [channel:<channel>]`\n\n" +
              "Example:\n" +
              '`/schedule when:tomorrow message:"Don\'t forget the meeting!"`',
          );
        }

        const message = ctx.args.message as string;
        const whenStr = ctx.args.when as string;
        const channelId = (ctx.args.channel as string) || ctx.channel.id;

        const scheduledFor = parseTime(whenStr);

        if (!scheduledFor || scheduledFor.getTime() < Date.now()) {
          return error("Invalid time. Please use a future time.");
        }

        const scheduleId = await api.scheduleMessage(
          channelId,
          text(message),
          scheduledFor.getTime() - Date.now(),
        );

        return success(
          `Message scheduled!\n\n` +
            `**When:** ${formatDateTime(scheduledFor)}\n` +
            `**Message:** ${message}\n` +
            `**Schedule ID:** \`${scheduleId}\``,
        );
      })

      .onInit(async (bot, api) => {
        // REMOVED: console.log('[SchedulerBot] Initialized successfully')
      })

      .build()
  );
}

/**
 * Get all reminders for a user
 */
async function getUserReminders(userId: string, api: any): Promise<Reminder[]> {
  // In production, this would query the database
  // For now, we'll just return an empty array
  // You'd need to implement a proper storage query method
  return [];
}

/**
 * Parse time string to Date
 */
function parseTime(timeStr: string): Date | null {
  // Handle relative time (5m, 2h, 1d)
  const relativeMatch = timeStr.match(/^(\d+)([smhd])$/);
  if (relativeMatch) {
    const value = parseInt(relativeMatch[1]);
    const unit = relativeMatch[2];

    const multipliers = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return new Date(
      Date.now() + value * (multipliers[unit as keyof typeof multipliers] || 0),
    );
  }

  // Handle named times
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (timeStr.toLowerCase()) {
    case "now":
      return now;
    case "tomorrow":
      return new Date(today.getTime() + 24 * 60 * 60 * 1000);
    case "next week":
      return new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    // Add more named times as needed
  }

  // Handle absolute datetime
  try {
    const parsed = new Date(timeStr);
    return isNaN(parsed.getTime()) ? null : parsed;
  } catch {
    return null;
  }
}

/**
 * Format datetime for display
 */
function formatDateTime(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();

  // If within 24 hours, show relative time
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000));
    const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));

    if (hours > 0) {
      return `in ${hours}h ${minutes}m`;
    } else {
      return `in ${minutes}m`;
    }
  }

  // Otherwise show full date
  return date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Export metadata for template registration
 */
export const schedulerBotTemplate = {
  id: "scheduler-bot",
  name: "Scheduler Bot",
  description: "Set reminders and schedule messages",
  category: "productivity" as const,
  icon: "⏰",
  configSchema: {
    type: "object",
    properties: {
      maxRemindersPerUser: {
        type: "number",
        title: "Max Reminders per User",
        description: "Maximum number of reminders each user can have",
        default: 20,
        minimum: 1,
        maximum: 100,
      },
      defaultTimezone: {
        type: "string",
        title: "Default Timezone",
        description: "Default timezone for scheduled messages",
        default: "UTC",
      },
      allowRecurring: {
        type: "boolean",
        title: "Allow Recurring Reminders",
        description: "Allow users to create recurring reminders",
        default: true,
      },
    },
  },
  defaultConfig: {
    maxRemindersPerUser: 20,
    defaultTimezone: "UTC",
    allowRecurring: true,
  },
  isFeatured: true,
};
