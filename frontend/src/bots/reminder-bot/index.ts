/**
 * Reminder Bot
 * Set reminders for yourself or your team
 */

import { bot, command } from "@/lib/bots";
import { createLogger } from "@/lib/logger";
import {
  remindCommand,
  remindersCommand,
  cancelReminderCommand,
  snoozeCommand,
  remindChannelCommand,
  setTriggerCallback,
} from "./commands";
import {
  cleanupOldReminders,
  stopAllTimers,
  buildReminderMessage,
  getStats,
  exportReminders,
  importReminders,
  type Reminder,
} from "./scheduler";
import manifest from "./manifest.json";

const logger = createLogger("ReminderBot");

/**
 * Create and configure the Reminder Bot
 */
export function createReminderBot() {
  return (
    bot(manifest.id)
      .name(manifest.name)
      .description(manifest.description)
      .version(manifest.version)
      .author(manifest.author)
      .icon(manifest.icon)
      .permissions("read_messages", "send_messages", "mention_users")

      // Register commands
      .command(
        command("remind")
          .description("Set a reminder")
          .aliases("remindme", "reminder")
          .durationArg("time", "When to remind (e.g., 5m, 1h, 2d)", true)
          .stringArg("message", "What to remind about", true)
          .example(
            '/remind 30m "Check the build"',
            '/remind 1h "Team standup meeting"',
            '/remind 1d "Submit weekly report"',
          )
          .cooldown(5),
        remindCommand,
      )
      .command(
        command("reminders")
          .description("List your active reminders")
          .aliases("myreminders")
          .example("/reminders"),
        remindersCommand,
      )
      .command(
        command("cancelreminder")
          .description("Cancel a reminder")
          .aliases("cancelrem", "delreminder")
          .stringArg("reminder_id", "ID of the reminder to cancel", true)
          .example("/cancelreminder rem_abc123"),
        cancelReminderCommand,
      )
      .command(
        command("snooze")
          .description("Snooze a reminder")
          .stringArg("reminder_id", "ID of the reminder to snooze", true)
          .durationArg("time", "How long to snooze (default: 10m)")
          .example("/snooze rem_abc123", "/snooze rem_abc123 30m"),
        snoozeCommand,
      )
      .command(
        command("remindchannel")
          .description("Set a reminder for the entire channel")
          .durationArg("time", "When to remind", true)
          .stringArg("message", "The reminder message", true)
          .example(
            '/remindchannel 1h "Team meeting starting!"',
            '/remindchannel 15m "Break time!"',
          )
          .cooldown(30),
        remindChannelCommand,
      )

      // Initialization
      .onInit(async (instance, api) => {
        // Set up the trigger callback to send messages when reminders fire
        setTriggerCallback(async (reminder) => {
          if (!reminder) return;

          try {
            const message = buildReminderMessage(reminder);
            await api.sendMessage(reminder.channelId, message);
          } catch (error) {
            logger.error("Failed to send reminder", error as Error, {
              reminderId: reminder.id,
            });
          }
        });

        // Try to load saved reminders from storage
        try {
          const savedReminders = await api.getStorage<Reminder[]>("reminders");
          if (savedReminders && savedReminders.length > 0) {
            importReminders(savedReminders, async (reminder) => {
              try {
                const message = buildReminderMessage(reminder);
                await api.sendMessage(reminder.channelId, message);
              } catch (error) {
                logger.error("Failed to send reminder", error as Error, {
                  reminderId: reminder.id,
                });
              }
            });
          }
        } catch (error) {}

        // Periodic cleanup of old reminders
        const cleanupInterval = setInterval(
          () => {
            const deleted = cleanupOldReminders();
            if (deleted > 0) {
              // Old reminders cleaned up
            }
          },
          60 * 60 * 1000,
        ); // Every hour

        // Periodic save to storage
        const saveInterval = setInterval(
          async () => {
            try {
              const reminders = exportReminders();
              await api.setStorage("reminders", reminders);
            } catch (error) {
              logger.error("Failed to save reminders", error as Error);
            }
          },
          5 * 60 * 1000,
        ); // Every 5 minutes

        // Register cleanup handlers to prevent memory leaks
        instance.registerCleanup(() => {
          clearInterval(cleanupInterval);
          clearInterval(saveInterval);
          // Clear all scheduled reminders
          stopAllTimers();
        });
      })

      .build()
  );
}

// Export the bot factory
export default createReminderBot;

// Export manifest for external use
export { manifest };

// Re-export commands for testing
export {
  remindCommand,
  remindersCommand,
  cancelReminderCommand,
  snoozeCommand,
  remindChannelCommand,
};

// Re-export scheduler functions for testing
export {
  createReminder,
  getReminder,
  getUserReminders,
  cancelReminder,
  snoozeReminder,
  scheduleReminder,
  buildReminderMessage,
  formatReminderList,
  getStats,
  exportReminders,
  importReminders,
  stopAllTimers,
  clearAllReminders,
} from "./scheduler";
