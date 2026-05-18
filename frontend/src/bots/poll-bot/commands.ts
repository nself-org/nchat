/**
 * Poll Bot Commands
 * Command handlers for creating and managing polls
 */

import type {
  CommandContext,
  CommandHandler,
  BotApi,
  BotResponse,
} from "@/lib/bots";
import { response, embed, error, success, parseDuration } from "@/lib/bots";
import {
  createPoll,
  createYesNoPoll,
  getPoll,
  endPoll,
  formatPollResults,
  buildPollEmbed,
  POLL_EMOJIS,
  YES_NO_EMOJIS,
} from "./handlers";

/**
 * /poll command handler
 * Create a new poll with multiple options
 */
export const pollCommand: CommandHandler = async (
  ctx: CommandContext,
  api: BotApi,
): Promise<BotResponse> => {
  const config = api.getBotConfig();
  const maxOptions = (config.settings?.max_options as number) || 10;

  const question = ctx.args.question as string;
  const optionsRaw = ctx.args.options as string;
  const durationStr = ctx.args.duration as string | undefined;
  const isAnonymous = (ctx.args.anonymous as boolean) || false;

  if (!question || !optionsRaw) {
    return error(
      "Missing required arguments",
      'Usage: `/poll "Question" "Option1 | Option2 | Option3"`',
    );
  }

  // Parse options
  const options = optionsRaw
    .split("|")
    .map((o) => o.trim())
    .filter((o) => o.length > 0);

  if (options.length < 2) {
    return error(
      "Not enough options",
      "A poll needs at least 2 options. Separate options with | (pipe).",
    );
  }

  if (options.length > maxOptions) {
    return error("Too many options", `Maximum ${maxOptions} options allowed.`);
  }

  // Parse duration
  let duration: number | undefined;
  if (durationStr) {
    const parsed = parseDuration(durationStr);
    if (!parsed) {
      return error(
        "Invalid duration",
        "Use formats like: 30m, 1h, 24h, 1d, 1w",
      );
    }
    duration = parsed;
  } else {
    const defaultDuration =
      (config.settings?.default_duration as string) || "24h";
    duration = parseDuration(defaultDuration) ?? undefined;
  }

  // Create the poll (we'll get the message ID after sending)
  const tempMessageId = `temp_${Date.now()}`;
  const poll = createPoll(
    ctx.channel.id,
    tempMessageId,
    ctx.user.id,
    question,
    options,
    duration,
    isAnonymous,
  );

  // Build the response
  const pollEmbed = buildPollEmbed(poll);

  // Instructions for voting
  let instructions =
    "\n**How to vote:** React with the corresponding number emoji\n";
  instructions += options
    .map((opt, i) => `${POLL_EMOJIS[i]} ${opt}`)
    .join("\n");

  return response().embed(pollEmbed).text(instructions).build();
};

/**
 * /quickpoll command handler
 * Create a simple yes/no poll
 */
export const quickpollCommand: CommandHandler = async (
  ctx: CommandContext,
  api: BotApi,
): Promise<BotResponse> => {
  const question = ctx.args.question as string;

  if (!question) {
    return error(
      "Missing question",
      'Usage: `/quickpoll "Your yes/no question?"`',
    );
  }

  const config = api.getBotConfig();
  const defaultDuration =
    (config.settings?.default_duration as string) || "24h";
  const duration = parseDuration(defaultDuration) || undefined;

  const tempMessageId = `temp_${Date.now()}`;
  const poll = createYesNoPoll(
    ctx.channel.id,
    tempMessageId,
    ctx.user.id,
    question,
    duration,
  );

  return response()
    .embed(
      embed()
        .title(`:question: ${question}`)
        .description(
          `${YES_NO_EMOJIS.yes} Yes\n${YES_NO_EMOJIS.no} No\n\nReact to vote!`,
        )
        .color("#10B981")
        .footer(`Poll ID: ${poll.id}`)
        .timestamp(),
    )
    .build();
};

/**
 * /pollresults command handler
 * Show results of a poll
 */
export const pollResultsCommand: CommandHandler = async (
  ctx: CommandContext,
  api: BotApi,
): Promise<BotResponse> => {
  const pollId = ctx.args.poll_id as string;

  if (!pollId) {
    return error("Missing poll ID", "Usage: `/pollresults <poll_id>`");
  }

  const poll = getPoll(pollId);

  if (!poll) {
    return error("Poll not found", `No poll found with ID: ${pollId}`);
  }

  // Check permissions
  const showVoters =
    (api.getBotConfig().settings?.show_voters as boolean) !== false;

  const results = formatPollResults(poll, showVoters);

  return response()
    .embed(
      embed()
        .title(":bar_chart: Poll Results")
        .description(results)
        .color(poll.isEnded ? "#6B7280" : "#6366F1")
        .timestamp(),
    )
    .build();
};

/**
 * /endpoll command handler
 * End a poll early
 */
export const endPollCommand: CommandHandler = async (
  ctx: CommandContext,
  api: BotApi,
): Promise<BotResponse> => {
  const pollId = ctx.args.poll_id as string;

  if (!pollId) {
    return error("Missing poll ID", "Usage: `/endpoll <poll_id>`");
  }

  const result = endPoll(pollId, ctx.user.id);

  if (!result.success) {
    return error("Cannot end poll", result.message);
  }

  const poll = result.poll!;
  const showVoters =
    (api.getBotConfig().settings?.show_voters as boolean) !== false;
  const results = formatPollResults(poll, showVoters);

  return response()
    .embed(
      embed()
        .title(":stop_sign: Poll Ended")
        .description(results)
        .color("#EF4444")
        .footer(`Ended by ${ctx.user.displayName}`)
        .timestamp(),
    )
    .build();
};

/**
 * Command definitions
 */
export const commands = {
  poll: pollCommand,
  quickpoll: quickpollCommand,
  pollresults: pollResultsCommand,
  endpoll: endPollCommand,
};

export default commands;
