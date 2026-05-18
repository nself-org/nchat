/**
 * Poll Bot Handlers
 * Vote handling and poll management utilities
 */

import { randomBytes } from "crypto";
import type { ReactionContext, BotApi, BotResponse } from "@/lib/bots";
import { response, embed, mentionUser } from "@/lib/bots";

// ============================================================================
// POLL TYPES
// ============================================================================

export interface Poll {
  id: string;
  channelId: string;
  messageId: string;
  creatorId: string;
  question: string;
  options: PollOption[];
  createdAt: Date;
  endsAt?: Date;
  isAnonymous: boolean;
  isEnded: boolean;
}

export interface PollOption {
  index: number;
  text: string;
  emoji: string;
  votes: string[]; // User IDs
}

// ============================================================================
// POLL STORAGE
// ============================================================================

// In-memory storage for polls (in production, use persistent storage via api.setStorage)
const polls = new Map<string, Poll>();

// Emoji options for polls
export const POLL_EMOJIS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
export const YES_NO_EMOJIS = { yes: "", no: "" };

/**
 * Generate a unique poll ID
 */
export function generatePollId(): string {
  return `poll_${Date.now()}_${randomBytes(4).toString("hex")}`;
}

/**
 * Create a new poll
 */
export function createPoll(
  channelId: string,
  messageId: string,
  creatorId: string,
  question: string,
  optionTexts: string[],
  duration?: number,
  isAnonymous = false,
): Poll {
  const poll: Poll = {
    id: generatePollId(),
    channelId,
    messageId,
    creatorId,
    question,
    options: optionTexts.map((text, index) => ({
      index,
      text: text.trim(),
      emoji: POLL_EMOJIS[index] || `${index + 1}`,
      votes: [],
    })),
    createdAt: new Date(),
    endsAt: duration ? new Date(Date.now() + duration) : undefined,
    isAnonymous,
    isEnded: false,
  };

  polls.set(poll.id, poll);
  return poll;
}

/**
 * Create a yes/no poll
 */
export function createYesNoPoll(
  channelId: string,
  messageId: string,
  creatorId: string,
  question: string,
  duration?: number,
): Poll {
  const poll: Poll = {
    id: generatePollId(),
    channelId,
    messageId,
    creatorId,
    question,
    options: [
      { index: 0, text: "Yes", emoji: YES_NO_EMOJIS.yes, votes: [] },
      { index: 1, text: "No", emoji: YES_NO_EMOJIS.no, votes: [] },
    ],
    createdAt: new Date(),
    endsAt: duration ? new Date(Date.now() + duration) : undefined,
    isAnonymous: false,
    isEnded: false,
  };

  polls.set(poll.id, poll);
  return poll;
}

/**
 * Get a poll by ID
 */
export function getPoll(pollId: string): Poll | undefined {
  return polls.get(pollId);
}

/**
 * Get poll by message ID
 */
export function getPollByMessage(messageId: string): Poll | undefined {
  for (const poll of polls.values()) {
    if (poll.messageId === messageId) {
      return poll;
    }
  }
  return undefined;
}

/**
 * Register a vote
 */
export function registerVote(
  pollId: string,
  optionIndex: number,
  userId: string,
): { success: boolean; message: string } {
  const poll = polls.get(pollId);

  if (!poll) {
    return { success: false, message: "Poll not found" };
  }

  if (poll.isEnded) {
    return { success: false, message: "This poll has ended" };
  }

  if (poll.endsAt && new Date() > poll.endsAt) {
    poll.isEnded = true;
    return { success: false, message: "This poll has ended" };
  }

  if (optionIndex < 0 || optionIndex >= poll.options.length) {
    return { success: false, message: "Invalid option" };
  }

  // Remove any existing vote from this user
  for (const option of poll.options) {
    const existingIndex = option.votes.indexOf(userId);
    if (existingIndex !== -1) {
      option.votes.splice(existingIndex, 1);
    }
  }

  // Add new vote
  poll.options[optionIndex].votes.push(userId);

  return { success: true, message: "Vote recorded" };
}

/**
 * End a poll
 */
export function endPoll(
  pollId: string,
  userId: string,
): { success: boolean; message: string; poll?: Poll } {
  const poll = polls.get(pollId);

  if (!poll) {
    return { success: false, message: "Poll not found" };
  }

  if (poll.creatorId !== userId) {
    return {
      success: false,
      message: "Only the poll creator can end this poll",
    };
  }

  poll.isEnded = true;

  return { success: true, message: "Poll ended", poll };
}

/**
 * Format poll results
 */
export function formatPollResults(poll: Poll, showVoters = true): string {
  const totalVotes = poll.options.reduce(
    (sum, opt) => sum + opt.votes.length,
    0,
  );

  let results = `**${poll.question}**\n\n`;

  // Sort by votes (descending)
  const sortedOptions = [...poll.options].sort(
    (a, b) => b.votes.length - a.votes.length,
  );

  for (const option of sortedOptions) {
    const voteCount = option.votes.length;
    const percentage =
      totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
    const bar = generateProgressBar(percentage);

    results += `${option.emoji} **${option.text}**\n`;
    results += `${bar} ${percentage}% (${voteCount} vote${voteCount !== 1 ? "s" : ""})\n`;

    if (showVoters && !poll.isAnonymous && voteCount > 0) {
      const voterMentions = option.votes
        .slice(0, 5)
        .map((id) => mentionUser(id))
        .join(", ");
      const overflow = voteCount > 5 ? ` +${voteCount - 5} more` : "";
      results += `  Voters: ${voterMentions}${overflow}\n`;
    }

    results += "\n";
  }

  results += `---\n`;
  results += `Total votes: ${totalVotes}\n`;

  if (poll.isEnded) {
    results += `**Poll ended**`;
  } else if (poll.endsAt) {
    results += `Ends: ${poll.endsAt.toLocaleString()}`;
  }

  return results;
}

/**
 * Generate a progress bar
 */
function generateProgressBar(percentage: number, length = 10): string {
  const filled = Math.round((percentage / 100) * length);
  const empty = length - filled;
  return "" + "".repeat(filled) + "".repeat(empty) + "";
}

/**
 * Build poll message embed
 */
export function buildPollEmbed(poll: Poll): ReturnType<typeof embed> {
  const e = embed()
    .title(`:bar_chart: ${poll.question}`)
    .color("#6366F1")
    .footer(`Poll ID: ${poll.id} | React to vote!`)
    .timestamp(poll.createdAt);

  let description = "";
  for (const option of poll.options) {
    description += `${option.emoji} ${option.text}\n`;
  }

  if (poll.endsAt) {
    description += `\n---\nEnds: ${poll.endsAt.toLocaleString()}`;
  }

  if (poll.isAnonymous) {
    description += "\n:detective: Votes are anonymous";
  }

  e.description(description);

  return e;
}

// ============================================================================
// REACTION HANDLER
// ============================================================================

/**
 * Handle vote reactions
 */
export async function handleVoteReaction(
  ctx: ReactionContext,
  api: BotApi,
): Promise<BotResponse | void> {
  const poll = getPollByMessage(ctx.message.messageId);

  if (!poll) return;
  if (poll.isEnded) return;

  // Find which option was selected
  const optionIndex = poll.options.findIndex(
    (opt) => opt.emoji === ctx.reaction.emoji,
  );

  if (optionIndex === -1) return;

  // Only handle vote additions
  if (ctx.reaction.action !== "add") return;

  const result = registerVote(poll.id, optionIndex, ctx.user.id);

  if (!result.success) {
    // Could send ephemeral message here
  }
}

// ============================================================================
// CLEANUP
// ============================================================================

/**
 * Check and end expired polls
 */
export function checkExpiredPolls(): Poll[] {
  const expired: Poll[] = [];
  const now = new Date();

  for (const poll of polls.values()) {
    if (!poll.isEnded && poll.endsAt && now > poll.endsAt) {
      poll.isEnded = true;
      expired.push(poll);
    }
  }

  return expired;
}

/**
 * Get active polls for a channel
 */
export function getActivePolls(channelId: string): Poll[] {
  return Array.from(polls.values()).filter(
    (poll) => poll.channelId === channelId && !poll.isEnded,
  );
}

/**
 * Delete old polls (cleanup)
 */
export function cleanupOldPolls(maxAge = 7 * 24 * 60 * 60 * 1000): number {
  const cutoff = new Date(Date.now() - maxAge);
  let deleted = 0;

  for (const [id, poll] of polls.entries()) {
    if (poll.isEnded && poll.createdAt < cutoff) {
      polls.delete(id);
      deleted++;
    }
  }

  return deleted;
}
