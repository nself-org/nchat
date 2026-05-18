/**
 * nchat Example Bots
 *
 * This module exports all example bots that demonstrate the Bot SDK capabilities.
 *
 * @example
 * ```typescript
 * import { createHelloBot, createPollBot, createReminderBot, createWelcomeBot } from '@/bots'
 *
 * // Create and start all bots
 * const helloBot = createHelloBot()
 * const pollBot = createPollBot()
 * const reminderBot = createReminderBot()
 * const welcomeBot = createWelcomeBot()
 * ```
 */

// Import bot factories and manifests locally for use in registerAllBots and manifests object
import createHelloBot, { manifest as helloBotManifest } from "./hello-bot";
import createPollBot, { manifest as pollBotManifest } from "./poll-bot";
import createReminderBot, {
  manifest as reminderBotManifest,
} from "./reminder-bot";
import createWelcomeBot, {
  manifest as welcomeBotManifest,
} from "./welcome-bot";
import { getRuntime } from "@/lib/bots";

// Re-export bot factories and manifests
export { createHelloBot, helloBotManifest };
export { createPollBot, pollBotManifest };
export { createReminderBot, reminderBotManifest };
export { createWelcomeBot, welcomeBotManifest };

// Hello Bot - additional exports
export { helloCommand, waveCommand, goodbyeCommand } from "./hello-bot";

// Poll Bot - additional exports
export {
  pollCommand,
  quickpollCommand,
  pollResultsCommand,
  endPollCommand,
  createPoll,
  getPoll,
  registerVote,
  formatPollResults,
} from "./poll-bot";

// Reminder Bot - additional exports
export {
  remindCommand,
  remindersCommand,
  cancelReminderCommand,
  snoozeCommand,
  remindChannelCommand,
  createReminder,
  getReminder,
  getUserReminders,
  cancelReminder,
  snoozeReminder,
  scheduleReminder,
  buildReminderMessage,
  formatReminderList,
  getStats as getReminderStats,
} from "./reminder-bot";

// Welcome Bot - additional exports
export {
  getChannelTemplate,
  setChannelTemplate,
  deleteChannelTemplate,
  getDefaultTemplate,
  processTemplate,
  PRESET_TEMPLATES,
  formatStats as formatWelcomeStats,
  handleUserJoin,
  handleUserLeave,
} from "./welcome-bot";

/**
 * Register all example bots with the runtime
 */
export function registerAllBots() {
  const runtime = getRuntime();

  const bots = [
    createHelloBot(),
    createPollBot(),
    createReminderBot(),
    createWelcomeBot(),
  ];

  runtime.startAll();

  return bots;
}

/**
 * Bot manifests for documentation
 */
export const manifests = {
  hello: helloBotManifest,
  poll: pollBotManifest,
  reminder: reminderBotManifest,
  welcome: welcomeBotManifest,
};
