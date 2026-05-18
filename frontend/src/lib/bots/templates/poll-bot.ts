/**
 * Poll Bot Template
 * Create and manage polls and surveys
 *
 * Features:
 * - Create polls with multiple options
 * - Real-time vote tracking
 * - Anonymous or public voting
 * - Poll results visualization
 * - Time-limited polls
 * - Multiple choice polls
 */

import { bot, embed, button, text, success, error } from "../bot-sdk";
import type { BotInstance } from "../bot-runtime";

export interface Poll {
  id: string;
  question: string;
  options: string[];
  votes: Record<string, string | string[]>; // userId -> optionIndex or array of indices
  createdBy: string;
  createdAt: Date;
  expiresAt?: Date;
  allowMultipleVotes: boolean;
  anonymous: boolean;
  maxChoices: number;
  channelId: string;
  messageId?: string;
}

/**
 * Create a poll bot instance
 */
export function createPollBot(): BotInstance {
  return (
    bot("poll-bot")
      .name("Poll Bot")
      .description("Create and manage polls and surveys")
      .version("1.0.0")
      .icon("📊")
      .permissions("read_messages", "send_messages", "add_reactions")

      .settings({
        defaultDuration: 24 * 60 * 60 * 1000, // 24 hours
        maxOptions: 10,
        allowAnonymous: true,
      })

      // Create poll command
      .command("poll", "Create a new poll", async (ctx, api) => {
        if (!ctx.args.question || !ctx.args.options) {
          return text(
            "Usage: `/poll question:<question> options:<opt1,opt2,opt3> [duration:<time>] [multiple:true] [anonymous:true]`\n\n" +
              "Examples:\n" +
              '`/poll question:"What pizza?" options:"Cheese,Pepperoni,Veggie"`\n' +
              '`/poll question:"Pick colors" options:"Red,Blue,Green" multiple:true`\n' +
              '`/poll question:"Rate us" options:"1,2,3,4,5" duration:1h anonymous:true`',
          );
        }

        const question = ctx.args.question as string;
        const optionsStr = ctx.args.options as string;
        const options = optionsStr
          .split(",")
          .map((o) => o.trim())
          .filter((o) => o.length > 0);

        const config = api.getBotConfig();
        const maxOptions =
          typeof config.settings?.maxOptions === "number"
            ? config.settings.maxOptions
            : 10;

        if (options.length < 2) {
          return error("A poll must have at least 2 options.");
        }

        if (options.length > maxOptions) {
          return error(`Maximum ${maxOptions} options allowed.`);
        }

        const pollId = Math.random().toString(36).substring(7);

        const poll: Poll = {
          id: pollId,
          question,
          options,
          votes: {},
          createdBy: ctx.user.id,
          createdAt: new Date(),
          expiresAt: ctx.args.duration
            ? new Date(Date.now() + parseDuration(ctx.args.duration as string))
            : undefined,
          allowMultipleVotes:
            ctx.args.multiple === true || ctx.args.multiple === "true",
          anonymous:
            ctx.args.anonymous === true || ctx.args.anonymous === "true",
          maxChoices: ctx.args.multiple ? options.length : 1,
          channelId: ctx.channel.id,
        };

        // Store poll
        await api.setStorage(`poll:${pollId}`, poll);

        return renderPoll(poll);
      })

      // Vote on poll (via reactions or button clicks)
      .onReaction(async (ctx, api) => {
        // Check if reaction is on a poll message
        const messageId = ctx.reaction.messageId;
        const emoji = ctx.reaction.emoji;

        // Find poll by message ID
        const polls =
          (await api.getStorage<Record<string, Poll>>("polls")) || {};
        const poll = Object.values(polls).find(
          (p) => p.messageId === messageId,
        );

        if (!poll) return;

        // Map emoji to option index
        const emojiNumbers = [
          "1️⃣",
          "2️⃣",
          "3️⃣",
          "4️⃣",
          "5️⃣",
          "6️⃣",
          "7️⃣",
          "8️⃣",
          "9️⃣",
          "🔟",
        ];
        const optionIndex = emojiNumbers.indexOf(emoji);

        if (optionIndex === -1 || optionIndex >= poll.options.length) return;

        // Process vote
        if (ctx.reaction.action === "add") {
          if (poll.allowMultipleVotes) {
            const userVotes = (poll.votes[ctx.user.id] as string[]) || [];
            if (!userVotes.includes(String(optionIndex))) {
              userVotes.push(String(optionIndex));
              poll.votes[ctx.user.id] = userVotes;
            }
          } else {
            poll.votes[ctx.user.id] = String(optionIndex);
          }
        } else {
          // Remove vote
          if (poll.allowMultipleVotes) {
            const userVotes = (poll.votes[ctx.user.id] as string[]) || [];
            poll.votes[ctx.user.id] = userVotes.filter(
              (v) => v !== String(optionIndex),
            );
          } else {
            delete poll.votes[ctx.user.id];
          }
        }

        // Update poll
        await api.setStorage(`poll:${poll.id}`, poll);

        // Update message with new results
        await api.editMessage(messageId, renderPoll(poll));
      })

      // Show poll results
      .command(
        "pollresults",
        "Show detailed poll results",
        async (ctx, api) => {
          if (!ctx.args.id) {
            return text("Usage: `/pollresults id:<poll-id>`");
          }

          const poll = await api.getStorage<Poll>(`poll:${ctx.args.id}`);

          if (!poll) {
            return error("Poll not found.");
          }

          return renderPollResults(poll, true);
        },
      )

      // Close poll
      .command("closepoll", "Close a poll", async (ctx, api) => {
        if (!ctx.args.id) {
          return text("Usage: `/closepoll id:<poll-id>`");
        }

        const poll = await api.getStorage<Poll>(`poll:${ctx.args.id}`);

        if (!poll) {
          return error("Poll not found.");
        }

        if (poll.createdBy !== ctx.user.id) {
          return error("Only the poll creator can close it.");
        }

        poll.expiresAt = new Date();
        await api.setStorage(`poll:${poll.id}`, poll);

        return success(
          `Poll closed. Final results:\n\n${renderPollResults(poll, true).content}`,
        );
      })

      .onInit(async (bot, api) => {
        // REMOVED: console.log('[PollBot] Initialized successfully')
      })

      .build()
  );
}

/**
 * Render a poll as an embed
 */
function renderPoll(poll: Poll): any {
  const totalVotes = Object.keys(poll.votes).length;
  const voteCounts = calculateVoteCounts(poll);

  const optionsText = poll.options
    .map((option, i) => {
      const count = voteCounts[i] || 0;
      const percentage =
        totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
      const bar = createProgressBar(percentage);

      return `${i + 1}️⃣ **${option}**\n${bar} ${count} vote${count !== 1 ? "s" : ""} (${percentage}%)`;
    })
    .join("\n\n");

  const response = embed()
    .title(`📊 ${poll.question}`)
    .description(optionsText)
    .footer(
      `Total votes: ${totalVotes}` +
        (poll.expiresAt
          ? ` • Expires: ${formatRelativeTime(poll.expiresAt)}`
          : "") +
        (poll.allowMultipleVotes ? " • Multiple choice" : "") +
        (poll.anonymous ? " • Anonymous" : ""),
    )
    .color("#8b5cf6");

  return response.build();
}

/**
 * Render detailed poll results
 */
function renderPollResults(poll: Poll, showVoters: boolean): any {
  const totalVotes = Object.keys(poll.votes).length;
  const voteCounts = calculateVoteCounts(poll);

  let resultsText = poll.options
    .map((option, i) => {
      const count = voteCounts[i] || 0;
      const percentage =
        totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
      const bar = createProgressBar(percentage);

      let text = `**${option}**\n${bar} ${count} vote${count !== 1 ? "s" : ""} (${percentage}%)`;

      if (showVoters && !poll.anonymous) {
        const voters = Object.entries(poll.votes)
          .filter(([, vote]) =>
            poll.allowMultipleVotes
              ? (vote as string[]).includes(String(i))
              : vote === String(i),
          )
          .map(([userId]) => `<@${userId}>`);

        if (voters.length > 0) {
          text += `\nVoters: ${voters.join(", ")}`;
        }
      }

      return text;
    })
    .join("\n\n");

  return text(resultsText);
}

/**
 * Calculate vote counts for each option
 */
function calculateVoteCounts(poll: Poll): Record<number, number> {
  const counts: Record<number, number> = {};

  Object.values(poll.votes).forEach((vote) => {
    if (Array.isArray(vote)) {
      vote.forEach((v) => {
        const idx = parseInt(v);
        counts[idx] = (counts[idx] || 0) + 1;
      });
    } else {
      const idx = parseInt(vote);
      counts[idx] = (counts[idx] || 0) + 1;
    }
  });

  return counts;
}

/**
 * Create a visual progress bar
 */
function createProgressBar(percentage: number, length: number = 10): string {
  const filled = Math.round((percentage / 100) * length);
  const empty = length - filled;

  return "█".repeat(filled) + "░".repeat(empty);
}

/**
 * Format relative time
 */
function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const then = date.getTime();
  const diff = then - now;

  if (diff < 0) return "Expired";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

/**
 * Parse duration string to milliseconds
 */
function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);

  if (!match) return 0;

  const value = parseInt(match[1]);
  const unit = match[2];

  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return value * (multipliers[unit as keyof typeof multipliers] || 0);
}

/**
 * Export metadata for template registration
 */
export const pollBotTemplate = {
  id: "poll-bot",
  name: "Poll Bot",
  description: "Create and manage polls and surveys",
  category: "productivity" as const,
  icon: "📊",
  configSchema: {
    type: "object",
    properties: {
      defaultDuration: {
        type: "number",
        title: "Default Poll Duration (ms)",
        description: "Default duration for polls in milliseconds",
        default: 24 * 60 * 60 * 1000,
      },
      maxOptions: {
        type: "number",
        title: "Maximum Options",
        description: "Maximum number of poll options",
        default: 10,
        minimum: 2,
        maximum: 20,
      },
      allowAnonymous: {
        type: "boolean",
        title: "Allow Anonymous Polls",
        description: "Allow users to create anonymous polls",
        default: true,
      },
    },
  },
  defaultConfig: {
    defaultDuration: 24 * 60 * 60 * 1000,
    maxOptions: 10,
    allowAnonymous: true,
  },
  isFeatured: true,
};
