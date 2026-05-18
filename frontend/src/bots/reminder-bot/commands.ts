/**
 * Reminder Bot Commands
 * Command handlers for setting and managing reminders
 */

import type {
  CommandContext,
  CommandHandler,
  BotApi,
  BotResponse,
} from "@/lib/bots";
import {
  response,
  embed,
  error,
  success,
  parseDuration,
  formatDuration,
} from "@/lib/bots";
import {
  createReminder,
  getReminder,
  getUserReminders,
  cancelReminder,
  snoozeReminder,
  scheduleReminder,
  buildReminderMessage,
  formatReminderList,
} from "./scheduler";

// Store the trigger callback for scheduling
let triggerCallback:
  | ((reminder: ReturnType<typeof getReminder>) => void)
  | null = null;

/**
 * Set the trigger callback for when reminders fire
 */
export function setTriggerCallback(
  callback: (reminder: ReturnType<typeof getReminder>) => void,
): void {
  triggerCallback = callback;
}

/**
 * /remind command handler
 * Set a personal reminder
 */
export const remindCommand: CommandHandler = async (
  ctx: CommandContext,
  api: BotApi,
): Promise<BotResponse> => {
  const config = api.getBotConfig();
  const maxReminders = (config.settings?.max_reminders as number) || 25;
  const maxDurationDays = (config.settings?.max_duration as number) || 365;
  const maxDuration = maxDurationDays * 24 * 60 * 60 * 1000;

  const timeStr = ctx.args.time as string;
  const message = ctx.args.message as string;

  if (!timeStr || !message) {
    return error(
      "Missing required arguments",
      'Usage: `/remind <time> "<message>"`\nExample: `/remind 30m "Check the build"`',
    );
  }

  // Parse duration
  const delay = parseDuration(timeStr);
  if (!delay) {
    return error(
      "Invalid time format",
      'Use formats like: 5m, 30m, 1h, 2h, 1d, 1w\nExample: `/remind 1h "Meeting time"`',
    );
  }

  if (delay > maxDuration) {
    return error(
      "Duration too long",
      `Maximum reminder duration is ${maxDurationDays} days.`,
    );
  }

  if (delay < 60000) {
    return error(
      "Duration too short",
      "Minimum reminder duration is 1 minute.",
    );
  }

  // Check reminder limit
  const existingReminders = getUserReminders(ctx.user.id);
  if (existingReminders.length >= maxReminders) {
    return error(
      "Reminder limit reached",
      `You can only have ${maxReminders} active reminders. Cancel some with \`/cancelreminder\`.`,
    );
  }

  // Create and schedule the reminder
  const reminder = createReminder(
    ctx.user.id,
    ctx.channel.id,
    message,
    delay,
    false,
  );

  scheduleReminder(reminder, (triggered) => {
    if (triggerCallback && triggered) {
      triggerCallback(triggered);
    }
  });

  const remindTime = new Date(Date.now() + delay);

  return response()
    .embed(
      embed()
        .title(":white_check_mark: Reminder Set")
        .description(`I'll remind you in **${formatDuration(delay)}**`)
        .field("Message", message)
        .field("When", remindTime.toLocaleString())
        .field("ID", `${reminder.id}`, true)
        .color("#10B981")
        .footer("Use /reminders to see all your reminders"),
    )
    .build();
};

/**
 * /reminders command handler
 * List all active reminders
 */
export const remindersCommand: CommandHandler = async (
  ctx: CommandContext,
  api: BotApi,
): Promise<BotResponse> => {
  const reminders = getUserReminders(ctx.user.id);
  const list = formatReminderList(reminders);

  return response()
    .embed(
      embed().title(":bell: Your Reminders").description(list).color("#6366F1"),
    )
    .build();
};

/**
 * /cancelreminder command handler
 * Cancel an active reminder
 */
export const cancelReminderCommand: CommandHandler = async (
  ctx: CommandContext,
  api: BotApi,
): Promise<BotResponse> => {
  const reminderId = ctx.args.reminder_id as string;

  if (!reminderId) {
    return error(
      "Missing reminder ID",
      "Usage: `/cancelreminder <reminder_id>`",
    );
  }

  const result = cancelReminder(reminderId, ctx.user.id);

  if (!result.success) {
    return error("Cannot cancel reminder", result.message);
  }

  return success(
    "Reminder cancelled",
    `Reminder ${reminderId} has been cancelled.`,
  );
};

/**
 * /snooze command handler
 * Snooze a reminder
 */
export const snoozeCommand: CommandHandler = async (
  ctx: CommandContext,
  api: BotApi,
): Promise<BotResponse> => {
  const config = api.getBotConfig();
  const defaultSnooze = (config.settings?.default_snooze as string) || "10m";

  const reminderId = ctx.args.reminder_id as string;
  const timeStr = (ctx.args.time as string) || defaultSnooze;

  if (!reminderId) {
    return error(
      "Missing reminder ID",
      "Usage: `/snooze <reminder_id> [time]`",
    );
  }

  const delay = parseDuration(timeStr);
  if (!delay) {
    return error(
      "Invalid snooze duration",
      "Use formats like: 5m, 10m, 30m, 1h",
    );
  }

  const result = snoozeReminder(reminderId, ctx.user.id, delay);

  if (!result.success) {
    return error("Cannot snooze reminder", result.message);
  }

  // Reschedule
  scheduleReminder(result.reminder!, (triggered) => {
    if (triggerCallback && triggered) {
      triggerCallback(triggered);
    }
  });

  return response()
    .embed(
      embed()
        .title(":zzz: Reminder Snoozed")
        .description(`Reminder snoozed for **${formatDuration(delay)}**`)
        .field("New time", result.reminder!.remindAt.toLocaleString())
        .color("#F59E0B"),
    )
    .build();
};

/**
 * /remindchannel command handler
 * Set a reminder for the entire channel
 */
export const remindChannelCommand: CommandHandler = async (
  ctx: CommandContext,
  api: BotApi,
): Promise<BotResponse> => {
  const timeStr = ctx.args.time as string;
  const message = ctx.args.message as string;

  if (!timeStr || !message) {
    return error(
      "Missing required arguments",
      'Usage: `/remindchannel <time> "<message>"`',
    );
  }

  const delay = parseDuration(timeStr);
  if (!delay) {
    return error("Invalid time format", "Use formats like: 15m, 1h, 2h");
  }

  // Create channel reminder
  const reminder = createReminder(
    ctx.user.id,
    ctx.channel.id,
    message,
    delay,
    true,
  );

  scheduleReminder(reminder, (triggered) => {
    if (triggerCallback && triggered) {
      triggerCallback(triggered);
    }
  });

  const remindTime = new Date(Date.now() + delay);

  return response()
    .embed(
      embed()
        .title(":loudspeaker: Channel Reminder Set")
        .description(
          `The channel will be reminded in **${formatDuration(delay)}**`,
        )
        .field("Message", message)
        .field("When", remindTime.toLocaleString())
        .color("#10B981"),
    )
    .build();
};

/**
 * Command definitions
 */
export const commands = {
  remind: remindCommand,
  reminders: remindersCommand,
  cancelreminder: cancelReminderCommand,
  snooze: snoozeCommand,
  remindchannel: remindChannelCommand,
};

export default commands;
