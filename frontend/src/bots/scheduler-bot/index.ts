/**
 * Scheduler Bot
 * Schedule messages and recurring tasks
 */

import { bot, command } from "@/lib/bots";
import type { CommandContext, BotApi, BotResponse } from "@/lib/bots";
import {
  response,
  embed,
  error,
  success,
  parseDuration,
  formatDuration,
} from "@/lib/bots";
import { createLogger } from "@/lib/logger";
import {
  scheduleMessage,
  cancelScheduledMessage,
  getScheduledMessage,
  getUserScheduledMessages,
  getChannelScheduledMessages,
  createRecurringTask,
  cancelRecurringTask,
  getRecurringTasks,
  exportSchedules,
  importSchedules,
  formatScheduleList,
  formatRecurringTaskList,
  type ScheduledMessage,
  type RecurringTask,
} from "./scheduler";
import manifest from "./manifest.json";

const logger = createLogger("SchedulerBot");

// ============================================================================
// COMMAND HANDLERS
// ============================================================================

/**
 * /schedule command - Schedule a message
 */
const scheduleCommand = async (
  ctx: CommandContext,
  api: BotApi,
): Promise<BotResponse> => {
  const when = ctx.args.when as string;
  const message = ctx.args.message as string;
  const channel = (ctx.args.channel as string) || ctx.channel.id;

  if (!when || !message) {
    return error(
      "Missing required arguments",
      'Usage: `/schedule <when> "<message>" [channel]`\n' +
        "Examples:\n" +
        '• `/schedule 1h "Team meeting in 1 hour!"`\n' +
        '• `/schedule 2d "Don\'t forget the deadline!"`\n' +
        '• `/schedule 30m "Break time!" #general`',
    );
  }

  const delay = parseDuration(when);
  if (!delay) {
    return error(
      "Invalid time format",
      "Use formats like: 30m, 1h, 2h, 1d, 1w",
    );
  }

  if (delay < 60000) {
    return error("Duration too short", "Minimum schedule time is 1 minute.");
  }

  const config = api.getBotConfig();
  const maxDuration =
    ((config.settings?.max_duration as number) || 30) * 24 * 60 * 60 * 1000;

  if (delay > maxDuration) {
    return error(
      "Duration too long",
      `Maximum schedule time is ${config.settings?.max_duration || 30} days.`,
    );
  }

  const scheduled = scheduleMessage(
    ctx.user.id,
    channel,
    message,
    delay,
    async (msg) => {
      try {
        await api.sendMessage(
          msg.channelId,
          response().text(msg.message).build(),
        );
      } catch (error) {
        logger.error("Failed to send scheduled message", error as Error, {
          scheduleId: msg.id,
        });
      }
    },
  );

  const sendTime = new Date(Date.now() + delay);

  return response()
    .embed(
      embed()
        .title("📅 Message Scheduled")
        .description(
          `Your message will be sent in **${formatDuration(delay)}**`,
        )
        .field("Message", message)
        .field("When", sendTime.toLocaleString())
        .field("Channel", `<#${channel}>`, true)
        .field("ID", `${scheduled.id}`, true)
        .color("#10B981")
        .footer("Use /scheduled to see all your scheduled messages"),
    )
    .build();
};

/**
 * /scheduled command - List scheduled messages
 */
const scheduledCommand = async (
  ctx: CommandContext,
  api: BotApi,
): Promise<BotResponse> => {
  const messages = getUserScheduledMessages(ctx.user.id);
  const list = formatScheduleList(messages);

  return response()
    .embed(
      embed()
        .title("📅 Your Scheduled Messages")
        .description(list)
        .color("#6366F1")
        .footer("Use /cancelschedule <id> to cancel a scheduled message"),
    )
    .build();
};

/**
 * /cancelschedule command - Cancel scheduled message
 */
const cancelScheduleCommand = async (
  ctx: CommandContext,
  api: BotApi,
): Promise<BotResponse> => {
  const scheduleId = ctx.args.schedule_id as string;

  if (!scheduleId) {
    return error(
      "Missing schedule ID",
      "Usage: `/cancelschedule <schedule_id>`",
    );
  }

  const cancelled = cancelScheduledMessage(scheduleId, ctx.user.id);

  if (!cancelled) {
    return error(
      "Cannot cancel",
      "Schedule not found or you do not have permission to cancel it.",
    );
  }

  return success(
    "Schedule cancelled",
    `Scheduled message ${scheduleId} has been cancelled.`,
  );
};

/**
 * /recurring command - Create recurring task
 */
const recurringCommand = async (
  ctx: CommandContext,
  api: BotApi,
): Promise<BotResponse> => {
  const interval = ctx.args.interval as string;
  const message = ctx.args.message as string;
  const channel = (ctx.args.channel as string) || ctx.channel.id;

  if (!interval || !message) {
    return error(
      "Missing required arguments",
      'Usage: `/recurring <interval> "<message>" [channel]`\n' +
        "Examples:\n" +
        '• `/recurring 1d "Daily standup reminder!"`\n' +
        '• `/recurring 1w "Weekly team sync!"`\n' +
        '• `/recurring 1h "Hourly check!" #status`',
    );
  }

  const delay = parseDuration(interval);
  if (!delay) {
    return error("Invalid interval format", "Use formats like: 1h, 6h, 1d, 1w");
  }

  if (delay < 60 * 60 * 1000) {
    return error("Interval too short", "Minimum recurring interval is 1 hour.");
  }

  const config = api.getBotConfig();
  const maxRecurring = (config.settings?.max_recurring as number) || 10;

  const existingTasks = getRecurringTasks(ctx.user.id);
  if (existingTasks.length >= maxRecurring) {
    return error(
      "Recurring task limit reached",
      `You can only have ${maxRecurring} recurring tasks. Cancel some with \`/cancelrecurring\`.`,
    );
  }

  const task = createRecurringTask(
    ctx.user.id,
    channel,
    message,
    delay,
    async (msg) => {
      try {
        await api.sendMessage(
          msg.channelId,
          response().text(msg.message).build(),
        );
      } catch (error) {
        logger.error("Failed to send recurring message", error as Error, {
          taskId: msg.taskId,
        });
      }
    },
  );

  const nextRun = new Date(Date.now() + delay);

  return response()
    .embed(
      embed()
        .title("🔄 Recurring Task Created")
        .description(`Task will run every **${formatDuration(delay)}**`)
        .field("Message", message)
        .field("Next Run", nextRun.toLocaleString())
        .field("Channel", `<#${channel}>`, true)
        .field("ID", `${task.id}`, true)
        .color("#10B981"),
    )
    .build();
};

/**
 * /recurringtasks command - List recurring tasks
 */
const recurringTasksCommand = async (
  ctx: CommandContext,
  api: BotApi,
): Promise<BotResponse> => {
  const tasks = getRecurringTasks(ctx.user.id);
  const list = formatRecurringTaskList(tasks);

  return response()
    .embed(
      embed()
        .title("🔄 Your Recurring Tasks")
        .description(list)
        .color("#6366F1")
        .footer("Use /cancelrecurring <id> to cancel a recurring task"),
    )
    .build();
};

/**
 * /cancelrecurring command - Cancel recurring task
 */
const cancelRecurringCommand = async (
  ctx: CommandContext,
  api: BotApi,
): Promise<BotResponse> => {
  const taskId = ctx.args.task_id as string;

  if (!taskId) {
    return error("Missing task ID", "Usage: `/cancelrecurring <task_id>`");
  }

  const cancelled = cancelRecurringTask(taskId, ctx.user.id);

  if (!cancelled) {
    return error(
      "Cannot cancel",
      "Task not found or you do not have permission to cancel it.",
    );
  }

  return success(
    "Recurring task cancelled",
    `Task ${taskId} has been cancelled.`,
  );
};

// ============================================================================
// BOT FACTORY
// ============================================================================

/**
 * Create and configure the Scheduler Bot
 */
export function createSchedulerBot() {
  return (
    bot(manifest.id)
      .name(manifest.name)
      .description(manifest.description)
      .version(manifest.version)
      .author(manifest.author)
      .icon(manifest.icon)
      .permissions("read_messages", "send_messages")

      // Register commands
      .command(
        command("schedule")
          .description("Schedule a message to be sent later")
          .aliases("schedmsg")
          .durationArg("when", "When to send (e.g., 1h, 2d)", true)
          .stringArg("message", "The message to send", true)
          .stringArg("channel", "Channel to send to (optional)")
          .example(
            '/schedule 1h "Meeting reminder!"',
            '/schedule 2d "Deadline tomorrow!" #team',
          )
          .cooldown(5),
        scheduleCommand,
      )
      .command(
        command("scheduled")
          .description("List your scheduled messages")
          .aliases("schedules")
          .example("/scheduled"),
        scheduledCommand,
      )
      .command(
        command("cancelschedule")
          .description("Cancel a scheduled message")
          .aliases("cancelsched")
          .stringArg("schedule_id", "ID of the scheduled message", true)
          .example("/cancelschedule sched_abc123"),
        cancelScheduleCommand,
      )
      .command(
        command("recurring")
          .description("Create a recurring message")
          .durationArg("interval", "How often to send (e.g., 1d, 1w)", true)
          .stringArg("message", "The message to send", true)
          .stringArg("channel", "Channel to send to (optional)")
          .example(
            '/recurring 1d "Daily standup!"',
            '/recurring 1w "Weekly sync!" #team',
          )
          .cooldown(10),
        recurringCommand,
      )
      .command(
        command("recurringtasks")
          .description("List your recurring tasks")
          .aliases("recurring-list")
          .example("/recurringtasks"),
        recurringTasksCommand,
      )
      .command(
        command("cancelrecurring")
          .description("Cancel a recurring task")
          .stringArg("task_id", "ID of the recurring task", true)
          .example("/cancelrecurring task_abc123"),
        cancelRecurringCommand,
      )

      // Initialization
      .onInit(async (instance, api) => {
        // Load saved schedules
        try {
          const saved = await api.getStorage<{
            messages: ScheduledMessage[];
            tasks: RecurringTask[];
          }>("schedules");

          if (saved) {
            importSchedules(
              saved.messages || [],
              saved.tasks || [],
              async (msg) => {
                try {
                  await api.sendMessage(
                    msg.channelId,
                    response().text(msg.message).build(),
                  );
                } catch (error) {
                  logger.error(
                    "Failed to send scheduled/recurring message",
                    error as Error,
                  );
                }
              },
            );
          }
        } catch (error) {
          logger.error("Failed to load schedules", error as Error);
        }

        // Periodic save
        const saveInterval = setInterval(
          async () => {
            try {
              await api.setStorage("schedules", exportSchedules());
            } catch (error) {
              logger.error("Failed to save schedules", error as Error);
            }
          },
          5 * 60 * 1000,
        ); // Every 5 minutes

        instance.registerCleanup(() => {
          clearInterval(saveInterval);
        });
      })

      .build()
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default createSchedulerBot;
export { manifest };
