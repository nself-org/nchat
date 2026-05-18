/**
 * Example Bots
 *
 * Pre-built bot templates that demonstrate the bot SDK capabilities.
 * These can be used as-is or as starting points for custom bots.
 */

export { HelloBot, createHelloBot } from "./hello-bot";
export { PollBot, createPollBot } from "./poll-bot";
export { ReminderBot, createReminderBot } from "./reminder-bot";
export { WelcomeBot, createWelcomeBot } from "./welcome-bot";

// Bot metadata for the marketplace
export const EXAMPLE_BOTS = [
  {
    id: "hello-bot",
    name: "Hello Bot",
    description: "A simple greeting bot that responds to messages",
    icon: "👋",
    category: "utility",
    commands: ["/hello", "/hi", "/greet"],
  },
  {
    id: "poll-bot",
    name: "Poll Bot",
    description: "Create and manage polls in channels",
    icon: "📊",
    category: "productivity",
    commands: ["/poll", "/vote", "/results"],
  },
  {
    id: "reminder-bot",
    name: "Reminder Bot",
    description: "Set reminders for yourself or channels",
    icon: "⏰",
    category: "productivity",
    commands: ["/remind", "/reminders", "/cancel-reminder"],
  },
  {
    id: "welcome-bot",
    name: "Welcome Bot",
    description: "Automatically welcome new members to channels",
    icon: "🎉",
    category: "community",
    commands: ["/setwelcome", "/welcomemessage"],
  },
] as const;
