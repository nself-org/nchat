/**
 * Reminder Bot
 *
 * Set and manage reminders for yourself or channels.
 * Supports natural language time parsing.
 */

import { Bot, BotConfig, BotContext, BotResponse } from "../bot-types";

export interface ReminderBotConfig extends BotConfig {
  maxRemindersPerUser?: number;
}

interface Reminder {
  id: string;
  userId: string;
  channelId: string;
  message: string;
  remindAt: Date;
  createdAt: Date;
  recurring?: "daily" | "weekly" | "monthly";
  notified: boolean;
}

// In-memory storage (use database in production)
const reminders = new Map<string, Reminder>();
let reminderIdCounter = 1;

export class ReminderBot implements Bot {
  readonly id = "reminder-bot";
  readonly name = "Reminder Bot";
  readonly description = "Never forget anything";
  readonly avatar = "⏰";
  readonly version = "1.0.0";

  private maxReminders: number;
  private checkInterval: NodeJS.Timeout | null = null;

  constructor(config?: ReminderBotConfig) {
    this.maxReminders = config?.maxRemindersPerUser || 50;
  }

  getCommands() {
    return [
      {
        name: "remind",
        description: "Set a reminder",
        usage:
          "/remind <time> <message> | /remind me in 30 minutes to check email",
      },
      {
        name: "reminders",
        description: "List your reminders",
        usage: "/reminders",
      },
      {
        name: "cancel-reminder",
        description: "Cancel a reminder",
        usage: "/cancel-reminder <reminder-id>",
      },
    ];
  }

  /**
   * Start checking for due reminders
   */
  start() {
    this.checkInterval = setInterval(() => this.checkReminders(), 60000);
  }

  /**
   * Stop the reminder checker
   */
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  async onMessage(): Promise<BotResponse | null> {
    return null;
  }

  async onCommand(
    command: string,
    args: string[],
    context: BotContext,
  ): Promise<BotResponse> {
    switch (command) {
      case "remind":
        return this.setReminder(args, context);
      case "reminders":
        return this.listReminders(context);
      case "cancel-reminder":
        return this.cancelReminder(args, context);
      default:
        return {
          type: "message",
          content:
            "Unknown command. Try /remind, /reminders, or /cancel-reminder",
        };
    }
  }

  async onMention(context: BotContext): Promise<BotResponse> {
    return {
      type: "message",
      content:
        "Hi! Use `/remind in 30 minutes to <message>` to set a reminder!",
    };
  }

  private setReminder(args: string[], context: BotContext): BotResponse {
    const input = args.join(" ");

    // Check user's reminder count
    const userReminders = Array.from(reminders.values()).filter(
      (r) => r.userId === context.user.id && !r.notified,
    );
    if (userReminders.length >= this.maxReminders) {
      return {
        type: "message",
        content: `You have reached the maximum of ${this.maxReminders} active reminders.`,
      };
    }

    // Parse the reminder
    const parsed = this.parseReminderInput(input);
    if (!parsed) {
      return {
        type: "message",
        content: `I couldn't understand that. Try:\n• /remind in 30 minutes to check email\n• /remind at 3pm to call mom\n• /remind tomorrow at 9am to submit report`,
      };
    }

    const { time, message, recurring } = parsed;
    const reminderId = `rem-${reminderIdCounter++}`;

    const reminder: Reminder = {
      id: reminderId,
      userId: context.user.id,
      channelId: context.channel.id,
      message,
      remindAt: time,
      createdAt: new Date(),
      recurring,
      notified: false,
    };

    reminders.set(reminderId, reminder);

    const timeStr = this.formatDateTime(time);
    const recurringStr = recurring ? ` (${recurring})` : "";

    return {
      type: "message",
      content: `⏰ Got it! I'll remind you ${timeStr}${recurringStr}:\n"${message}"\n\nReminder ID: ${reminderId}`,
    };
  }

  private listReminders(context: BotContext): BotResponse {
    const userReminders = Array.from(reminders.values())
      .filter((r) => r.userId === context.user.id && !r.notified)
      .sort((a, b) => a.remindAt.getTime() - b.remindAt.getTime());

    if (userReminders.length === 0) {
      return {
        type: "message",
        content:
          "You don't have any active reminders. Use `/remind` to set one!",
      };
    }

    const list = userReminders
      .map((r) => {
        const timeStr = this.formatDateTime(r.remindAt);
        const recurringStr = r.recurring ? ` 🔄 ${r.recurring}` : "";
        return `• **${r.id}**: ${timeStr}${recurringStr}\n  "${r.message}"`;
      })
      .join("\n\n");

    return {
      type: "rich",
      content: {
        title: `⏰ Your Reminders (${userReminders.length})`,
        description: list,
        footer: "Use /cancel-reminder <id> to remove one",
        color: "#f59e0b",
      },
    };
  }

  private cancelReminder(args: string[], context: BotContext): BotResponse {
    const [reminderId] = args;

    if (!reminderId) {
      return {
        type: "message",
        content: "Usage: `/cancel-reminder <reminder-id>`",
      };
    }

    const reminder = reminders.get(reminderId);
    if (!reminder) {
      return {
        type: "message",
        content: `Reminder "${reminderId}" not found.`,
      };
    }

    if (reminder.userId !== context.user.id) {
      return {
        type: "message",
        content: "You can only cancel your own reminders.",
      };
    }

    reminders.delete(reminderId);

    return {
      type: "message",
      content: `✅ Cancelled reminder: "${reminder.message}"`,
    };
  }

  private parseReminderInput(
    input: string,
  ): { time: Date; message: string; recurring?: Reminder["recurring"] } | null {
    // Remove "me" if present
    input = input.replace(/^me\s+/i, "");

    // Check for "to" keyword to separate time and message
    const toMatch = input.match(/^(.+?)\s+to\s+(.+)$/i);
    if (!toMatch) return null;

    const timeStr = toMatch[1].toLowerCase();
    const message = toMatch[2];

    const now = new Date();
    let time: Date | null = null;
    let recurring: Reminder["recurring"] | undefined;

    // Parse relative time (in X minutes/hours/days)
    const relativeMatch = timeStr.match(
      /in\s+(\d+)\s+(minute|minutes|min|hour|hours|hr|day|days)/i,
    );
    if (relativeMatch) {
      const amount = parseInt(relativeMatch[1], 10);
      const unit = relativeMatch[2].toLowerCase();
      time = new Date(now);

      if (unit.startsWith("min")) {
        time.setMinutes(time.getMinutes() + amount);
      } else if (unit.startsWith("hour") || unit === "hr") {
        time.setHours(time.getHours() + amount);
      } else if (unit.startsWith("day")) {
        time.setDate(time.getDate() + amount);
      }
    }

    // Parse "at X:XX" or "at Xpm/am"
    const atMatch = timeStr.match(/at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (atMatch) {
      let hours = parseInt(atMatch[1], 10);
      const minutes = atMatch[2] ? parseInt(atMatch[2], 10) : 0;
      const meridiem = atMatch[3]?.toLowerCase();

      if (meridiem === "pm" && hours < 12) hours += 12;
      if (meridiem === "am" && hours === 12) hours = 0;

      time = new Date(now);
      time.setHours(hours, minutes, 0, 0);

      // If time is in the past, move to next day
      if (time <= now) {
        time.setDate(time.getDate() + 1);
      }
    }

    // Parse "tomorrow"
    if (timeStr.includes("tomorrow")) {
      time = time || new Date(now);
      time.setDate(time.getDate() + 1);
      if (!atMatch) {
        time.setHours(9, 0, 0, 0); // Default to 9am
      }
    }

    // Parse recurring
    if (timeStr.includes("every day") || timeStr.includes("daily")) {
      recurring = "daily";
    } else if (timeStr.includes("every week") || timeStr.includes("weekly")) {
      recurring = "weekly";
    } else if (timeStr.includes("every month") || timeStr.includes("monthly")) {
      recurring = "monthly";
    }

    if (!time) return null;

    return { time, message, recurring };
  }

  private checkReminders() {
    const now = new Date();

    for (const [id, reminder] of reminders) {
      if (reminder.notified) continue;
      if (reminder.remindAt <= now) {
        // Trigger reminder notification
        this.sendReminder(reminder);

        if (reminder.recurring) {
          // Reschedule recurring reminder
          const nextTime = new Date(reminder.remindAt);
          if (reminder.recurring === "daily") {
            nextTime.setDate(nextTime.getDate() + 1);
          } else if (reminder.recurring === "weekly") {
            nextTime.setDate(nextTime.getDate() + 7);
          } else if (reminder.recurring === "monthly") {
            nextTime.setMonth(nextTime.getMonth() + 1);
          }
          reminder.remindAt = nextTime;
        } else {
          reminder.notified = true;
        }
      }
    }
  }

  private sendReminder(reminder: Reminder) {
    // In production, this would send an actual notification
  }

  private formatDateTime(date: Date): string {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const timeStr = date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    if (date.toDateString() === now.toDateString()) {
      return `today at ${timeStr}`;
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return `tomorrow at ${timeStr}`;
    } else {
      return `on ${date.toLocaleDateString()} at ${timeStr}`;
    }
  }
}

export function createReminderBot(config?: ReminderBotConfig): ReminderBot {
  return new ReminderBot(config);
}
