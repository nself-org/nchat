/**
 * Polls Module
 *
 * Provides functionality for creating, voting, and managing polls in messages.
 * Supports multiple choice, anonymous voting, and poll expiration.
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Poll status
 */
export type PollStatus = "active" | "closed" | "expired";

/**
 * Poll option
 */
export interface PollOption {
  /** Option ID */
  id: string;
  /** Option text */
  text: string;
  /** Number of votes */
  votes: number;
  /** Vote percentage (0-100) */
  percentage: number;
  /** List of voter IDs (if not anonymous) */
  voters?: string[];
}

/**
 * Poll voter info
 */
export interface PollVoter {
  /** User ID */
  id: string;
  /** Username */
  username: string;
  /** Display name */
  displayName: string;
  /** Avatar URL */
  avatarUrl?: string;
  /** Option(s) they voted for */
  optionIds: string[];
  /** When they voted */
  votedAt: number;
}

/**
 * Poll data structure
 */
export interface Poll {
  /** Unique poll ID */
  id: string;
  /** Poll question */
  question: string;
  /** Poll options */
  options: PollOption[];
  /** User who created the poll */
  createdBy: string;
  /** When the poll was created */
  createdAt: string;
  /** When the poll expires (optional) */
  expiresAt?: string;
  /** Whether voting is anonymous */
  isAnonymous: boolean;
  /** Whether multiple choices are allowed */
  allowMultiple: boolean;
  /** Total number of votes cast */
  totalVotes: number;
  /** Current status */
  status: PollStatus;
  /** Channel ID where poll was posted */
  channelId: string;
  /** Message ID containing the poll */
  messageId: string;
  /** Whether users can add options */
  allowAddOptions?: boolean;
  /** Maximum options a user can select (if allowMultiple) */
  maxChoices?: number;
  /** When the poll was closed (if closed) */
  closedAt?: string;
  /** Who closed the poll (if manually closed) */
  closedBy?: string;
}

/**
 * Poll creation input
 */
export interface CreatePollInput {
  /** Poll question */
  question: string;
  /** Initial options (at least 2) */
  options: string[];
  /** Channel to post in */
  channelId: string;
  /** Whether voting is anonymous */
  isAnonymous?: boolean;
  /** Whether multiple choices are allowed */
  allowMultiple?: boolean;
  /** Expiration time (optional) */
  expiresAt?: Date | string;
  /** Whether users can add options */
  allowAddOptions?: boolean;
  /** Maximum choices per user */
  maxChoices?: number;
}

/**
 * Poll update input
 */
export interface UpdatePollInput {
  /** Updated question */
  question?: string;
  /** Updated expiration */
  expiresAt?: Date | string | null;
  /** Updated anonymous setting */
  isAnonymous?: boolean;
  /** Updated multiple choice setting */
  allowMultiple?: boolean;
  /** Updated allow add options setting */
  allowAddOptions?: boolean;
  /** Updated max choices */
  maxChoices?: number;
}

/**
 * Vote input
 */
export interface VoteInput {
  /** Poll ID */
  pollId: string;
  /** Option ID(s) to vote for */
  optionIds: string[];
  /** User voting */
  userId: string;
}

/**
 * Vote result
 */
export interface VoteResult {
  /** Whether the vote was successful */
  success: boolean;
  /** Updated poll data */
  poll?: Poll;
  /** Error message if failed */
  error?: string;
  /** Error code */
  errorCode?: VoteErrorCode;
}

/**
 * Vote error codes
 */
export type VoteErrorCode =
  | "POLL_NOT_FOUND"
  | "POLL_CLOSED"
  | "POLL_EXPIRED"
  | "OPTION_NOT_FOUND"
  | "ALREADY_VOTED"
  | "TOO_MANY_CHOICES"
  | "MULTIPLE_NOT_ALLOWED"
  | "UNAUTHORIZED";

// ============================================================================
// Constants
// ============================================================================

/** Minimum number of options */
export const MIN_POLL_OPTIONS = 2;

/** Maximum number of options */
export const MAX_POLL_OPTIONS = 10;

/** Maximum question length */
export const MAX_QUESTION_LENGTH = 300;

/** Maximum option length */
export const MAX_OPTION_LENGTH = 100;

/** Default max choices for multiple selection */
export const DEFAULT_MAX_CHOICES = 3;

/** Minimum poll duration (5 minutes) */
export const MIN_POLL_DURATION_MS = 5 * 60 * 1000;

/** Maximum poll duration (30 days) */
export const MAX_POLL_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

// ============================================================================
// ID Generation
// ============================================================================

/**
 * Generate a poll ID
 */
export function generatePollId(): string {
  return `poll_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate an option ID
 */
export function generateOptionId(): string {
  return `opt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate poll creation input
 */
export function validateCreatePollInput(input: CreatePollInput): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate question
  if (!input.question || input.question.trim().length === 0) {
    errors.push("Question is required");
  } else if (input.question.length > MAX_QUESTION_LENGTH) {
    errors.push(
      `Question exceeds maximum length of ${MAX_QUESTION_LENGTH} characters`,
    );
  }

  // Validate options
  if (!input.options || input.options.length < MIN_POLL_OPTIONS) {
    errors.push(`At least ${MIN_POLL_OPTIONS} options are required`);
  } else if (input.options.length > MAX_POLL_OPTIONS) {
    errors.push(`Cannot have more than ${MAX_POLL_OPTIONS} options`);
  } else {
    // Validate each option
    const trimmedOptions = input.options.map((o) => o.trim());
    const emptyOptions = trimmedOptions.filter((o) => o.length === 0);
    if (emptyOptions.length > 0) {
      errors.push("Options cannot be empty");
    }

    const longOptions = trimmedOptions.filter(
      (o) => o.length > MAX_OPTION_LENGTH,
    );
    if (longOptions.length > 0) {
      errors.push(
        `Options exceed maximum length of ${MAX_OPTION_LENGTH} characters`,
      );
    }

    // Check for duplicates
    const uniqueOptions = new Set(trimmedOptions.map((o) => o.toLowerCase()));
    if (uniqueOptions.size !== trimmedOptions.length) {
      errors.push("Options must be unique");
    }
  }

  // Validate expiration
  if (input.expiresAt) {
    const expiresAt = new Date(input.expiresAt).getTime();
    const now = Date.now();

    if (isNaN(expiresAt)) {
      errors.push("Invalid expiration date");
    } else if (expiresAt - now < MIN_POLL_DURATION_MS) {
      errors.push("Poll must be active for at least 5 minutes");
    } else if (expiresAt - now > MAX_POLL_DURATION_MS) {
      errors.push("Poll cannot be active for more than 30 days");
    }
  }

  // Validate max choices
  if (input.maxChoices !== undefined) {
    if (input.maxChoices < 1) {
      errors.push("Maximum choices must be at least 1");
    } else if (input.options && input.maxChoices > input.options.length) {
      errors.push("Maximum choices cannot exceed number of options");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate vote input
 */
export function validateVoteInput(
  poll: Poll,
  input: VoteInput,
): { valid: boolean; errors: string[]; errorCode?: VoteErrorCode } {
  const errors: string[] = [];
  let errorCode: VoteErrorCode | undefined;

  // Check poll status
  if (poll.status === "closed") {
    errors.push("Poll is closed");
    errorCode = "POLL_CLOSED";
  } else if (poll.status === "expired" || isPollExpired(poll)) {
    errors.push("Poll has expired");
    errorCode = "POLL_EXPIRED";
  }

  // Check options exist
  const validOptionIds = poll.options.map((o) => o.id);
  const invalidOptions = input.optionIds.filter(
    (id) => !validOptionIds.includes(id),
  );
  if (invalidOptions.length > 0) {
    errors.push("Invalid option selected");
    errorCode = "OPTION_NOT_FOUND";
  }

  // Check multiple selection
  if (!poll.allowMultiple && input.optionIds.length > 1) {
    errors.push("Only one option can be selected");
    errorCode = "MULTIPLE_NOT_ALLOWED";
  }

  // Check max choices
  if (poll.maxChoices && input.optionIds.length > poll.maxChoices) {
    errors.push(`Cannot select more than ${poll.maxChoices} options`);
    errorCode = "TOO_MANY_CHOICES";
  }

  return {
    valid: errors.length === 0,
    errors,
    errorCode,
  };
}

// ============================================================================
// Poll Status Utilities
// ============================================================================

/**
 * Check if a poll is expired
 */
export function isPollExpired(poll: Poll): boolean {
  if (poll.status === "closed" || poll.status === "expired") return true;
  if (!poll.expiresAt) return false;
  return new Date(poll.expiresAt).getTime() < Date.now();
}

/**
 * Check if a poll is active
 */
export function isPollActive(poll: Poll): boolean {
  return poll.status === "active" && !isPollExpired(poll);
}

/**
 * Check if user can vote
 */
export function canVote(
  poll: Poll,
  userId: string,
  existingVote?: string[],
): boolean {
  if (!isPollActive(poll)) return false;

  // If anonymous or no existing vote info, allow
  if (poll.isAnonymous || !existingVote) return true;

  // Allow changing vote
  return true;
}

/**
 * Check if user can close poll
 */
export function canClosePoll(poll: Poll, userId: string): boolean {
  return poll.status === "active" && poll.createdBy === userId;
}

/**
 * Check if user can add option
 */
export function canAddOption(poll: Poll): boolean {
  return (
    poll.status === "active" &&
    poll.allowAddOptions === true &&
    poll.options.length < MAX_POLL_OPTIONS
  );
}

// ============================================================================
// Poll Calculations
// ============================================================================

/**
 * Calculate vote percentages for all options
 */
export function calculatePercentages(
  options: PollOption[],
  totalVotes: number,
): PollOption[] {
  if (totalVotes === 0) {
    return options.map((opt) => ({ ...opt, percentage: 0 }));
  }

  return options.map((opt) => ({
    ...opt,
    percentage: Math.round((opt.votes / totalVotes) * 100),
  }));
}

/**
 * Get winning option(s)
 */
export function getWinningOptions(poll: Poll): PollOption[] {
  if (poll.totalVotes === 0) return [];

  const maxVotes = Math.max(...poll.options.map((o) => o.votes));
  return poll.options.filter((o) => o.votes === maxVotes);
}

/**
 * Check if there is a tie
 */
export function hasTie(poll: Poll): boolean {
  return getWinningOptions(poll).length > 1;
}

/**
 * Get vote count for a specific option
 */
export function getOptionVoteCount(poll: Poll, optionId: string): number {
  const option = poll.options.find((o) => o.id === optionId);
  return option?.votes ?? 0;
}

/**
 * Get percentage for a specific option
 */
export function getOptionPercentage(poll: Poll, optionId: string): number {
  const option = poll.options.find((o) => o.id === optionId);
  if (!option || poll.totalVotes === 0) return 0;
  return Math.round((option.votes / poll.totalVotes) * 100);
}

// ============================================================================
// Time Utilities
// ============================================================================

/**
 * Get time remaining until poll expires
 */
export function getTimeRemaining(poll: Poll): {
  expired: boolean;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  text: string;
} {
  if (!poll.expiresAt || poll.status === "closed") {
    return {
      expired: poll.status === "closed" || poll.status === "expired",
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      text: poll.status === "closed" ? "Poll closed" : "No expiration",
    };
  }

  const now = Date.now();
  const expiresAt = new Date(poll.expiresAt).getTime();
  const diff = expiresAt - now;

  if (diff <= 0) {
    return {
      expired: true,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      text: "Poll expired",
    };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  let text: string;
  if (days > 0) {
    text = `${days}d ${hours}h remaining`;
  } else if (hours > 0) {
    text = `${hours}h ${minutes}m remaining`;
  } else if (minutes > 0) {
    text = `${minutes}m ${seconds}s remaining`;
  } else {
    text = `${seconds}s remaining`;
  }

  return { expired: false, days, hours, minutes, seconds, text };
}

/**
 * Format poll duration for display
 */
export function formatPollDuration(expiresAt: string | Date): string {
  const date = new Date(expiresAt);
  const now = new Date();
  const diff = date.getTime() - now.getTime();

  if (diff <= 0) return "Expired";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days} day${days !== 1 ? "s" : ""}`;
  if (hours > 0) return `${hours} hour${hours !== 1 ? "s" : ""}`;
  return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
}

// ============================================================================
// Poll Creation
// ============================================================================

/**
 * Create a new poll
 */
export function createPoll(
  input: CreatePollInput,
  creatorId: string,
  messageId: string,
): Poll {
  const now = new Date().toISOString();

  const options: PollOption[] = input.options.map((text) => ({
    id: generateOptionId(),
    text: text.trim(),
    votes: 0,
    percentage: 0,
    voters: input.isAnonymous ? undefined : [],
  }));

  return {
    id: generatePollId(),
    question: input.question.trim(),
    options,
    createdBy: creatorId,
    createdAt: now,
    expiresAt: input.expiresAt
      ? new Date(input.expiresAt).toISOString()
      : undefined,
    isAnonymous: input.isAnonymous ?? false,
    allowMultiple: input.allowMultiple ?? false,
    totalVotes: 0,
    status: "active",
    channelId: input.channelId,
    messageId,
    allowAddOptions: input.allowAddOptions ?? false,
    maxChoices: input.allowMultiple
      ? (input.maxChoices ?? DEFAULT_MAX_CHOICES)
      : 1,
  };
}

// ============================================================================
// Vote Processing
// ============================================================================

/**
 * Process a vote on a poll
 */
export function processVote(
  poll: Poll,
  optionIds: string[],
  userId: string,
  previousVote?: string[],
): Poll {
  const updatedOptions = poll.options.map((option) => {
    const wasVoted = previousVote?.includes(option.id) ?? false;
    const isVoted = optionIds.includes(option.id);

    let votes = option.votes;
    let voters = option.voters ? [...option.voters] : undefined;

    if (wasVoted && !isVoted) {
      // Remove vote
      votes = Math.max(0, votes - 1);
      if (voters) {
        voters = voters.filter((v) => v !== userId);
      }
    } else if (!wasVoted && isVoted) {
      // Add vote
      votes = votes + 1;
      if (voters && !voters.includes(userId)) {
        voters = [...voters, userId];
      }
    }

    return { ...option, votes, voters };
  });

  // Calculate new total
  const totalVotes = updatedOptions.reduce((sum, opt) => sum + opt.votes, 0);

  // Recalculate percentages
  const optionsWithPercentages = calculatePercentages(
    updatedOptions,
    totalVotes,
  );

  return {
    ...poll,
    options: optionsWithPercentages,
    totalVotes,
  };
}

/**
 * Remove a vote from a poll
 */
export function removeVote(
  poll: Poll,
  optionIds: string[],
  userId: string,
): Poll {
  return processVote(poll, [], userId, optionIds);
}

// ============================================================================
// Poll Management
// ============================================================================

/**
 * Close a poll
 */
export function closePoll(poll: Poll, closedBy: string): Poll {
  return {
    ...poll,
    status: "closed",
    closedAt: new Date().toISOString(),
    closedBy,
  };
}

/**
 * Add an option to a poll
 */
export function addPollOption(poll: Poll, optionText: string): Poll {
  if (!canAddOption(poll)) {
    return poll;
  }

  const newOption: PollOption = {
    id: generateOptionId(),
    text: optionText.trim(),
    votes: 0,
    percentage: 0,
    voters: poll.isAnonymous ? undefined : [],
  };

  const updatedOptions = calculatePercentages(
    [...poll.options, newOption],
    poll.totalVotes,
  );

  return {
    ...poll,
    options: updatedOptions,
  };
}

/**
 * Update poll settings
 */
export function updatePoll(poll: Poll, updates: UpdatePollInput): Poll {
  return {
    ...poll,
    question: updates.question?.trim() ?? poll.question,
    expiresAt:
      updates.expiresAt === null
        ? undefined
        : updates.expiresAt
          ? new Date(updates.expiresAt).toISOString()
          : poll.expiresAt,
    isAnonymous: updates.isAnonymous ?? poll.isAnonymous,
    allowMultiple: updates.allowMultiple ?? poll.allowMultiple,
    allowAddOptions: updates.allowAddOptions ?? poll.allowAddOptions,
    maxChoices: updates.maxChoices ?? poll.maxChoices,
  };
}

// ============================================================================
// Display Utilities
// ============================================================================

/**
 * Get poll status text
 */
export function getPollStatusText(poll: Poll): string {
  if (poll.status === "closed") return "Closed";
  if (isPollExpired(poll)) return "Expired";
  return "Active";
}

/**
 * Get poll summary text
 */
export function getPollSummary(poll: Poll): string {
  const voteText =
    poll.totalVotes === 1 ? "1 vote" : `${poll.totalVotes} votes`;
  const statusText = getPollStatusText(poll).toLowerCase();
  return `${voteText} - ${statusText}`;
}

/**
 * Get voter list for an option (non-anonymous only)
 */
export function getOptionVoters(poll: Poll, optionId: string): string[] {
  if (poll.isAnonymous) return [];
  const option = poll.options.find((o) => o.id === optionId);
  return option?.voters ?? [];
}

/**
 * Format poll settings for display
 */
export function formatPollSettings(poll: Poll): string[] {
  const settings: string[] = [];

  if (poll.isAnonymous) {
    settings.push("Anonymous voting");
  }

  if (poll.allowMultiple) {
    settings.push(`Multiple choice (max ${poll.maxChoices})`);
  }

  if (poll.allowAddOptions) {
    settings.push("Users can add options");
  }

  if (poll.expiresAt) {
    settings.push(`Expires: ${formatPollDuration(poll.expiresAt)}`);
  }

  return settings;
}

/**
 * Sort options by vote count (descending)
 */
export function sortOptionsByVotes(options: PollOption[]): PollOption[] {
  return [...options].sort((a, b) => b.votes - a.votes);
}

/**
 * Check if user has voted
 */
export function hasUserVoted(poll: Poll, userId: string): boolean {
  if (poll.isAnonymous) return false;
  return poll.options.some((opt) => opt.voters?.includes(userId));
}

/**
 * Get user's voted options
 */
export function getUserVotedOptions(poll: Poll, userId: string): string[] {
  if (poll.isAnonymous) return [];
  return poll.options
    .filter((opt) => opt.voters?.includes(userId))
    .map((opt) => opt.id);
}
