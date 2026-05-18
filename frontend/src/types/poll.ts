/**
 * Poll Types for nself-chat
 *
 * Type definitions for polls, poll options, votes, and poll settings.
 * Supports single-choice, multiple-choice, and anonymous polls.
 */

import type { UserBasicInfo } from "./user";

// ============================================================================
// Poll Type Definitions
// ============================================================================

/**
 * Types of polls.
 */
export type PollType = "single" | "multiple" | "ranked";

/**
 * Poll status values.
 */
export type PollStatus = "draft" | "active" | "closed" | "cancelled";

/**
 * Poll visibility for results.
 */
export type PollResultsVisibility = "always" | "after_vote" | "after_close";

// ============================================================================
// Poll Option Types
// ============================================================================

/**
 * Poll option.
 */
export interface PollOption {
  /** Unique option ID */
  id: string;
  /** Option text */
  text: string;
  /** Option emoji/icon (optional) */
  emoji?: string;
  /** Option image URL (optional) */
  imageUrl?: string;
  /** Vote count */
  voteCount: number;
  /** Percentage of total votes */
  percentage: number;
  /** Display order */
  position: number;
  /** User IDs who voted for this option (if not anonymous) */
  voterIds?: string[];
  /** Voters (if not anonymous and loaded) */
  voters?: UserBasicInfo[];
}

/**
 * Input for creating a poll option.
 */
export interface PollOptionInput {
  text: string;
  emoji?: string;
  imageUrl?: string;
}

// ============================================================================
// Poll Vote Types
// ============================================================================

/**
 * Poll vote record.
 */
export interface PollVote {
  /** Vote ID */
  id: string;
  /** Poll ID */
  pollId: string;
  /** User ID (null for anonymous) */
  userId?: string;
  /** User info (if not anonymous) */
  user?: UserBasicInfo;
  /** Selected option ID(s) */
  optionIds: string[];
  /** Ranking (for ranked choice) */
  ranking?: { optionId: string; rank: number }[];
  /** When the vote was cast */
  votedAt: Date;
  /** When the vote was last changed */
  updatedAt?: Date;
}

/**
 * Input for casting a vote.
 */
export interface CastVoteInput {
  pollId: string;
  optionIds: string[];
  ranking?: { optionId: string; rank: number }[];
}

// ============================================================================
// Poll Settings Types
// ============================================================================

/**
 * Poll settings and configuration.
 */
export interface PollSettings {
  /** Poll type */
  type: PollType;
  /** Allow multiple selections (for multiple choice) */
  allowMultiple: boolean;
  /** Maximum selections (for multiple choice) */
  maxSelections?: number;
  /** Minimum selections (for multiple choice) */
  minSelections?: number;
  /** Anonymous voting */
  isAnonymous: boolean;
  /** When results are visible */
  resultsVisibility: PollResultsVisibility;
  /** Allow vote changes */
  allowVoteChange: boolean;
  /** Allow adding new options */
  allowAddOptions: boolean;
  /** Who can add options */
  addOptionsPermission: "creator" | "anyone";
  /** Auto-close after time (minutes, null = no auto-close) */
  autoCloseAfter?: number | null;
  /** Close after reaching vote count */
  closeAtVoteCount?: number | null;
  /** Require comment with vote */
  requireComment: boolean;
  /** Show voter names */
  showVoterNames: boolean;
  /** Show real-time results */
  showRealTimeResults: boolean;
  /** Quiz mode (has correct answer) */
  isQuiz: boolean;
  /** Correct option ID (for quiz mode) */
  correctOptionId?: string;
  /** Explanation shown after voting (for quiz mode) */
  explanation?: string;
}

/**
 * Default poll settings.
 */
export const DefaultPollSettings: PollSettings = {
  type: "single",
  allowMultiple: false,
  isAnonymous: false,
  resultsVisibility: "after_vote",
  allowVoteChange: true,
  allowAddOptions: false,
  addOptionsPermission: "creator",
  requireComment: false,
  showVoterNames: true,
  showRealTimeResults: true,
  isQuiz: false,
};

// ============================================================================
// Main Poll Interface
// ============================================================================

/**
 * Core Poll interface.
 */
export interface Poll {
  /** Unique poll ID */
  id: string;
  /** Poll question/title */
  question: string;
  /** Poll description (optional) */
  description?: string;
  /** Poll options */
  options: PollOption[];
  /** Poll settings */
  settings: PollSettings;
  /** Poll status */
  status: PollStatus;
  /** Creator user ID */
  createdBy: string;
  /** Creator info */
  creator?: UserBasicInfo;
  /** Channel ID */
  channelId: string;
  /** Message ID (if attached to message) */
  messageId?: string;
  /** Total vote count */
  totalVotes: number;
  /** Unique voter count */
  totalVoters: number;
  /** When poll was created */
  createdAt: Date;
  /** When poll was last updated */
  updatedAt: Date;
  /** When poll opens */
  opensAt?: Date;
  /** When poll closes */
  closesAt?: Date;
  /** When poll was actually closed */
  closedAt?: Date;
  /** Who closed the poll */
  closedBy?: string;
  /** Current user's vote (if any) */
  currentUserVote?: PollVote;
  /** Whether current user has voted */
  hasVoted: boolean;
}

/**
 * Poll with detailed results.
 */
export interface PollWithResults extends Poll {
  /** Detailed results by option */
  results: PollOptionResult[];
  /** Vote distribution over time */
  voteDistribution?: PollVoteDistribution[];
}

/**
 * Poll option result with detailed vote info.
 */
export interface PollOptionResult extends PollOption {
  /** Voters for this option (if visible) */
  voters: UserBasicInfo[];
  /** Vote timestamps */
  voteTimestamps?: Date[];
}

/**
 * Vote distribution over time.
 */
export interface PollVoteDistribution {
  /** Time bucket */
  timestamp: Date;
  /** Votes by option at this time */
  optionVotes: { optionId: string; count: number }[];
  /** Total votes at this time */
  totalVotes: number;
}

// ============================================================================
// Input Types
// ============================================================================

/**
 * Input for creating a new poll.
 */
export interface CreatePollInput {
  question: string;
  description?: string;
  options: PollOptionInput[];
  settings?: Partial<PollSettings>;
  channelId: string;
  opensAt?: Date;
  closesAt?: Date;
}

/**
 * Input for updating a poll.
 */
export interface UpdatePollInput {
  question?: string;
  description?: string;
  settings?: Partial<PollSettings>;
  closesAt?: Date;
}

/**
 * Input for adding an option to a poll.
 */
export interface AddPollOptionInput {
  pollId: string;
  option: PollOptionInput;
}

// ============================================================================
// Poll Events
// ============================================================================

/**
 * Poll event types.
 */
export type PollEventType =
  | "poll_created"
  | "poll_updated"
  | "poll_closed"
  | "poll_cancelled"
  | "vote_cast"
  | "vote_changed"
  | "vote_removed"
  | "option_added";

/**
 * Poll event payload.
 */
export interface PollEvent {
  type: PollEventType;
  pollId: string;
  poll?: Poll;
  userId?: string;
  user?: UserBasicInfo;
  vote?: PollVote;
  option?: PollOption;
  timestamp: Date;
}

/**
 * Poll vote event (for real-time updates).
 */
export interface PollVoteEvent {
  pollId: string;
  optionId: string;
  voteCount: number;
  totalVotes: number;
  userId?: string;
  user?: UserBasicInfo;
  timestamp: Date;
}

// ============================================================================
// Poll Query Types
// ============================================================================

/**
 * Poll filter criteria.
 */
export interface PollFilter {
  /** Filter by status */
  status?: PollStatus[];
  /** Filter by creator */
  createdBy?: string;
  /** Filter by channel */
  channelId?: string;
  /** Filter by date range */
  createdAfter?: Date;
  createdBefore?: Date;
  /** Only polls user has voted in */
  hasVoted?: boolean;
  /** Only polls user created */
  isCreator?: boolean;
  /** Include closed polls */
  includeClosed?: boolean;
}

/**
 * Poll sort options.
 */
export interface PollSortOptions {
  sortBy: "createdAt" | "closesAt" | "totalVotes" | "question";
  sortOrder: "asc" | "desc";
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if poll is open for voting.
 */
export function isPollOpen(poll: Poll): boolean {
  if (poll.status !== "active") return false;
  const now = new Date();
  if (poll.opensAt && poll.opensAt > now) return false;
  if (poll.closesAt && poll.closesAt < now) return false;
  return true;
}

/**
 * Check if user can vote in poll.
 */
export function canVoteInPoll(poll: Poll, hasVoted: boolean): boolean {
  if (!isPollOpen(poll)) return false;
  if (hasVoted && !poll.settings.allowVoteChange) return false;
  return true;
}

/**
 * Calculate option percentages.
 */
export function calculatePollPercentages(
  options: PollOption[],
  totalVotes: number,
): PollOption[] {
  return options.map((option) => ({
    ...option,
    percentage:
      totalVotes > 0 ? Math.round((option.voteCount / totalVotes) * 100) : 0,
  }));
}

/**
 * Get winning options (highest vote count).
 */
export function getWinningOptions(poll: Poll): PollOption[] {
  const maxVotes = Math.max(...poll.options.map((o) => o.voteCount));
  if (maxVotes === 0) return [];
  return poll.options.filter((o) => o.voteCount === maxVotes);
}

/**
 * Format poll closing time.
 */
export function formatPollClosingTime(closesAt: Date): string {
  const now = new Date();
  const diff = closesAt.getTime() - now.getTime();

  if (diff <= 0) return "Closed";

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? "s" : ""} left`;
  if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} left`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""} left`;
  return "Closing soon";
}
