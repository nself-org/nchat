/**
 * Hello Bot Commands
 * Command handlers for the Hello Bot
 */

import type {
  CommandContext,
  CommandHandler,
  BotApi,
  BotResponse,
} from "@/lib/bots";
import { response, embed, text, mentionUser } from "@/lib/bots";
import {
  getGreeting,
  getFarewell,
  getWaveMessage,
  getRandomGreeting,
} from "./handlers";

/**
 * /hello command handler
 * Greets a user or says hello to the channel
 */
export const helloCommand: CommandHandler = async (
  ctx: CommandContext,
  api: BotApi,
): Promise<BotResponse> => {
  const config = api.getBotConfig();
  const style = (config.settings?.greeting_style as string) || "friendly";
  const includeEmoji = config.settings?.include_emoji !== false;

  const targetName = ctx.args.name as string | undefined;
  const greeting = getGreeting(style, includeEmoji);

  if (targetName) {
    // Check if it's a user mention
    if (targetName.startsWith("<@") && targetName.endsWith(">")) {
      return response().text(`${greeting} ${targetName}!`).reply().build();
    }
    return response().text(`${greeting} ${targetName}!`).build();
  }

  // Greet the command user
  return response().text(`${greeting} ${ctx.user.displayName}!`).build();
};

/**
 * /wave command handler
 * Waves at a user
 */
export const waveCommand: CommandHandler = async (
  ctx: CommandContext,
  api: BotApi,
): Promise<BotResponse> => {
  const config = api.getBotConfig();
  const includeEmoji = config.settings?.include_emoji !== false;

  const targetUserId = ctx.args.user as string | undefined;
  const waveEmoji = includeEmoji ? " :wave:" : "";

  if (targetUserId) {
    const user = await api.getUser(targetUserId);
    const displayName = user?.displayName || "someone";
    const message = getWaveMessage(
      ctx.user.displayName,
      displayName,
      includeEmoji,
    );
    return response().text(message).build();
  }

  return response().text(`${ctx.user.displayName} waves${waveEmoji}`).build();
};

/**
 * /goodbye command handler
 * Says farewell to the channel
 */
export const goodbyeCommand: CommandHandler = async (
  ctx: CommandContext,
  api: BotApi,
): Promise<BotResponse> => {
  const config = api.getBotConfig();
  const style = (config.settings?.greeting_style as string) || "friendly";
  const includeEmoji = config.settings?.include_emoji !== false;

  const farewell = getFarewell(style, includeEmoji);

  return response()
    .embed(
      embed()
        .color("#6366F1")
        .description(`${farewell}, ${ctx.user.displayName}!`)
        .footer("See you soon!"),
    )
    .build();
};

/**
 * Command definitions for registration
 */
export const commands = {
  hello: helloCommand,
  wave: waveCommand,
  goodbye: goodbyeCommand,
};

export default commands;
