/**
 * Hello Bot Handlers
 * Message handlers and utility functions
 */

import type { MessageContext, BotApi, BotResponse } from "@/lib/bots";
import { response, matchesKeyword } from "@/lib/bots";

// ============================================================================
// GREETING MESSAGES
// ============================================================================

const greetings = {
  friendly: {
    hello: ["Hello", "Hey there", "Hi", "Howdy"],
    emoji: ["!", "!", "!", "!"],
  },
  formal: {
    hello: ["Good day", "Greetings", "Hello", "Salutations"],
    emoji: [".", ".", ".", "."],
  },
  casual: {
    hello: ["Hey", "Yo", "Sup", "Hi"],
    emoji: ["!", "!", "!", "!"],
  },
  fun: {
    hello: ["Heyyy", "Howdy-doo", "Ahoy", "Well hello there"],
    emoji: ["!", "!", "!", "!"],
  },
};

const farewells = {
  friendly: {
    goodbye: ["Goodbye", "See you later", "Take care", "Bye bye"],
    emoji: ["!", "!", "!", "!"],
  },
  formal: {
    goodbye: ["Farewell", "Until next time", "Good day", "Be well"],
    emoji: [".", ".", ".", "."],
  },
  casual: {
    goodbye: ["Later", "Peace", "Bye", "Catch ya later"],
    emoji: ["!", "!", "!", "!"],
  },
  fun: {
    goodbye: ["Toodles", "Adios amigo", "Smell ya later", "Stay groovy"],
    emoji: ["!", "!", "!", "!"],
  },
};

const waveMessages = [
  "{sender} waves at {target}",
  "{sender} gives {target} a friendly wave",
  "{sender} sends a wave to {target}",
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get a random item from an array
 */
function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Get a greeting based on style
 */
export function getGreeting(style: string, includeEmoji: boolean): string {
  const styleKey = style as keyof typeof greetings;
  const greetingSet = greetings[styleKey] || greetings.friendly;
  const greeting = randomFrom(greetingSet.hello);
  const punctuation = randomFrom(greetingSet.emoji);

  if (includeEmoji) {
    const emojis = ["", "", "", ""];
    return `${randomFrom(emojis)} ${greeting}`;
  }

  return greeting;
}

/**
 * Get a farewell based on style
 */
export function getFarewell(style: string, includeEmoji: boolean): string {
  const styleKey = style as keyof typeof farewells;
  const farewellSet = farewells[styleKey] || farewells.friendly;
  const farewell = randomFrom(farewellSet.goodbye);

  if (includeEmoji) {
    const emojis = ["", "", ""];
    return `${randomFrom(emojis)} ${farewell}`;
  }

  return farewell;
}

/**
 * Get a wave message
 */
export function getWaveMessage(
  sender: string,
  target: string,
  includeEmoji: boolean,
): string {
  const message = randomFrom(waveMessages)
    .replace("{sender}", sender)
    .replace("{target}", target);

  return includeEmoji ? `${message}` : message;
}

/**
 * Get a random greeting for auto-responses
 */
export function getRandomGreeting(): string {
  const responses = ["Hello!", "Hey there!", "Hi!", "Howdy!", "Greetings!"];
  return randomFrom(responses);
}

// ============================================================================
// MESSAGE HANDLERS
// ============================================================================

/**
 * Handle greeting keywords in messages
 */
export async function handleGreetingMessage(
  ctx: MessageContext,
  api: BotApi,
): Promise<BotResponse | void> {
  // Skip commands
  if (ctx.isCommand) return;

  // Check for greeting keywords
  const keywords = ["hello bot", "hi bot", "hey bot", "hello hello-bot"];

  if (matchesKeyword(ctx.message.content, keywords)) {
    const config = api.getBotConfig();
    const style = (config.settings?.greeting_style as string) || "friendly";
    const includeEmoji = config.settings?.include_emoji !== false;

    const greeting = getGreeting(style, includeEmoji);

    return response()
      .text(`${greeting}, ${ctx.user.displayName}!`)
      .reply()
      .build();
  }
}

/**
 * Handle mentions of the bot
 */
export async function handleMention(
  ctx: MessageContext,
  api: BotApi,
): Promise<BotResponse | void> {
  if (!ctx.isMention) return;

  const manifest = api.getBotInfo();

  // Check if the bot was mentioned
  const botId = manifest.id;
  if (!ctx.message.mentions?.includes(botId)) return;

  return response()
    .text(
      `Hey ${ctx.user.displayName}! Need something? Try \`/hello\` or \`/help\`!`,
    )
    .reply()
    .build();
}

export default {
  handleGreetingMessage,
  handleMention,
};
