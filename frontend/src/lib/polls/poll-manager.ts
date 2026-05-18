/**
 * Poll Manager
 *
 * Comprehensive poll management utilities for creating, validating,
 * voting, and managing polls. Provides business logic layer for poll operations.
 */

import type {
  Poll,
  PollOption,
  PollVote,
  PollSettings,
  CreatePollInput,
  UpdatePollInput,
  CastVoteInput,
  PollStatus,
} from "@/types/poll";
import {
  isPollOpen,
  canVoteInPoll,
  calculatePollPercentages,
  getWinningOptions,
  formatPollClosingTime,
  DefaultPollSettings,
} from "@/types/poll";

// ============================================================================
// Constants
// ============================================================================

export const POLL_CONSTANTS = {
  MIN_OPTIONS: 2,
  MAX_OPTIONS: 10,
  MAX_QUESTION_LENGTH: 300,
  MAX_DESCRIPTION_LENGTH: 500,
  MAX_OPTION_LENGTH: 100,
  MIN_POLL_DURATION_MS: 5 * 60 * 1000, // 5 minutes
  MAX_POLL_DURATION_MS: 30 * 24 * 60 * 60 * 1000, // 30 days
  DEFAULT_MAX_SELECTIONS: 3,
  POLL_ENDING_SOON_MS: 60 * 60 * 1000, // 1 hour
} as const;

// ============================================================================
// Validation
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate poll creation input
 */
export function validateCreatePollInput(
  input: CreatePollInput,
): ValidationResult {
  const errors: string[] = [];

  // Validate question
  if (!input.question?.trim()) {
    errors.push("Question is required");
  } else if (input.question.length > POLL_CONSTANTS.MAX_QUESTION_LENGTH) {
    errors.push(
      `Question must be ${POLL_CONSTANTS.MAX_QUESTION_LENGTH} characters or less`,
    );
  }

  // Validate description
  if (
    input.description &&
    input.description.length > POLL_CONSTANTS.MAX_DESCRIPTION_LENGTH
  ) {
    errors.push(
      `Description must be ${POLL_CONSTANTS.MAX_DESCRIPTION_LENGTH} characters or less`,
    );
  }

  // Validate options
  if (!input.options || input.options.length < POLL_CONSTANTS.MIN_OPTIONS) {
    errors.push(`At least ${POLL_CONSTANTS.MIN_OPTIONS} options are required`);
  } else if (input.options.length > POLL_CONSTANTS.MAX_OPTIONS) {
    errors.push(`Maximum ${POLL_CONSTANTS.MAX_OPTIONS} options allowed`);
  } else {
    // Check for empty options
    const emptyOptions = input.options.filter((opt) => !opt.text?.trim());
    if (emptyOptions.length > 0) {
      errors.push("All options must have text");
    }

    // Check for too long options
    const longOptions = input.options.filter(
      (opt) => opt.text.length > POLL_CONSTANTS.MAX_OPTION_LENGTH,
    );
    if (longOptions.length > 0) {
      errors.push(
        `Options must be ${POLL_CONSTANTS.MAX_OPTION_LENGTH} characters or less`,
      );
    }

    // Check for duplicates (case insensitive)
    const optionTexts = input.options.map((opt) =>
      opt.text.trim().toLowerCase(),
    );
    const uniqueTexts = new Set(optionTexts);
    if (uniqueTexts.size !== optionTexts.length) {
      errors.push("Options must be unique");
    }
  }

  // Validate settings
  if (input.settings) {
    const settings = input.settings;

    if (settings.allowMultiple) {
      if (settings.maxSelections && settings.maxSelections < 1) {
        errors.push("Maximum selections must be at least 1");
      }
      if (settings.minSelections && settings.minSelections < 1) {
        errors.push("Minimum selections must be at least 1");
      }
      if (
        settings.maxSelections &&
        settings.minSelections &&
        settings.minSelections > settings.maxSelections
      ) {
        errors.push("Minimum selections cannot exceed maximum selections");
      }
      if (
        settings.maxSelections &&
        input.options &&
        settings.maxSelections > input.options.length
      ) {
        errors.push("Maximum selections cannot exceed number of options");
      }
    }
  }

  // Validate expiration
  if (input.closesAt) {
    const now = new Date();
    const closesAt = new Date(input.closesAt);

    if (isNaN(closesAt.getTime())) {
      errors.push("Invalid expiration date");
    } else {
      const diff = closesAt.getTime() - now.getTime();
      if (diff < POLL_CONSTANTS.MIN_POLL_DURATION_MS) {
        errors.push("Poll must be active for at least 5 minutes");
      }
      if (diff > POLL_CONSTANTS.MAX_POLL_DURATION_MS) {
        errors.push("Poll cannot be active for more than 30 days");
      }
    }
  }

  // Validate channel
  if (!input.channelId?.trim()) {
    errors.push("Channel ID is required");
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
  input: CastVoteInput,
): ValidationResult {
  const errors: string[] = [];

  // Check if poll is open
  if (!isPollOpen(poll)) {
    if (poll.status === "closed") {
      errors.push("Poll is closed");
    } else if (poll.status === "cancelled") {
      errors.push("Poll has been cancelled");
    } else if (poll.closesAt && new Date(poll.closesAt) < new Date()) {
      errors.push("Poll has expired");
    } else {
      errors.push("Poll is not accepting votes");
    }
  }

  // Check if options exist
  const validOptionIds = poll.options.map((opt) => opt.id);
  const invalidOptions = input.optionIds.filter(
    (id) => !validOptionIds.includes(id),
  );
  if (invalidOptions.length > 0) {
    errors.push("Invalid option(s) selected");
  }

  // Check if empty
  if (input.optionIds.length === 0) {
    errors.push("At least one option must be selected");
  }

  // Check multiple selection rules
  if (!poll.settings.allowMultiple && input.optionIds.length > 1) {
    errors.push("Only one option can be selected");
  }

  // Check max selections
  if (
    poll.settings.maxSelections &&
    input.optionIds.length > poll.settings.maxSelections
  ) {
    errors.push(
      `Maximum ${poll.settings.maxSelections} option(s) can be selected`,
    );
  }

  // Check min selections
  if (
    poll.settings.minSelections &&
    input.optionIds.length < poll.settings.minSelections
  ) {
    errors.push(
      `At least ${poll.settings.minSelections} option(s) must be selected`,
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate poll update input
 */
export function validateUpdatePollInput(
  poll: Poll,
  input: UpdatePollInput,
): ValidationResult {
  const errors: string[] = [];

  // Validate question
  if (input.question !== undefined) {
    if (!input.question.trim()) {
      errors.push("Question cannot be empty");
    } else if (input.question.length > POLL_CONSTANTS.MAX_QUESTION_LENGTH) {
      errors.push(
        `Question must be ${POLL_CONSTANTS.MAX_QUESTION_LENGTH} characters or less`,
      );
    }
  }

  // Validate description
  if (
    input.description !== undefined &&
    input.description.length > POLL_CONSTANTS.MAX_DESCRIPTION_LENGTH
  ) {
    errors.push(
      `Description must be ${POLL_CONSTANTS.MAX_DESCRIPTION_LENGTH} characters or less`,
    );
  }

  // Validate expiration
  if (input.closesAt !== undefined && input.closesAt !== null) {
    const now = new Date();
    const closesAt = new Date(input.closesAt);

    if (isNaN(closesAt.getTime())) {
      errors.push("Invalid expiration date");
    } else {
      const diff = closesAt.getTime() - now.getTime();
      if (diff < 0) {
        errors.push("Expiration date must be in the future");
      }
      if (diff > POLL_CONSTANTS.MAX_POLL_DURATION_MS) {
        errors.push("Poll cannot be active for more than 30 days");
      }
    }
  }

  // Validate settings
  if (input.settings) {
    if (input.settings.maxSelections && input.settings.maxSelections < 1) {
      errors.push("Maximum selections must be at least 1");
    }
    if (
      input.settings.maxSelections &&
      input.settings.maxSelections > poll.options.length
    ) {
      errors.push("Maximum selections cannot exceed number of options");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// Poll Creation
// ============================================================================

/**
 * Create a new poll object
 */
export function createPollObject(
  input: CreatePollInput,
  creatorId: string,
  pollId: string = generatePollId(),
): Poll {
  const now = new Date();

  const options: PollOption[] = input.options.map((opt, index) => ({
    id: generateOptionId(),
    text: opt.text.trim(),
    emoji: opt.emoji,
    imageUrl: opt.imageUrl,
    voteCount: 0,
    percentage: 0,
    position: index,
  }));

  const settings: PollSettings = {
    ...DefaultPollSettings,
    ...input.settings,
  };

  const poll: Poll = {
    id: pollId,
    question: input.question.trim(),
    description: input.description?.trim(),
    options,
    settings,
    status: "active",
    createdBy: creatorId,
    channelId: input.channelId,
    totalVotes: 0,
    totalVoters: 0,
    createdAt: now,
    updatedAt: now,
    closesAt: input.closesAt,
    hasVoted: false,
  };

  return poll;
}

/**
 * Generate a unique poll ID
 */
export function generatePollId(): string {
  return `poll_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate a unique option ID
 */
export function generateOptionId(): string {
  return `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate a unique vote ID
 */
export function generateVoteId(): string {
  return `vote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// Voting Logic
// ============================================================================

/**
 * Process a vote on a poll
 */
export function processPollVote(
  poll: Poll,
  userId: string,
  optionIds: string[],
  previousVote?: PollVote,
): Poll {
  // Create a deep copy of the poll
  const updatedPoll = { ...poll };
  updatedPoll.options = poll.options.map((opt) => ({ ...opt }));

  // Track voter IDs if not anonymous
  const voterIds = new Set<string>();
  poll.options.forEach((opt) => {
    if (opt.voterIds) {
      opt.voterIds.forEach((id) => voterIds.add(id));
    }
  });

  // Remove previous vote if exists
  if (previousVote) {
    previousVote.optionIds.forEach((optionId) => {
      const option = updatedPoll.options.find((opt) => opt.id === optionId);
      if (option) {
        option.voteCount = Math.max(0, option.voteCount - 1);
        if (option.voterIds) {
          option.voterIds = option.voterIds.filter((id) => id !== userId);
        }
      }
    });
    voterIds.delete(userId);
  }

  // Add new vote
  optionIds.forEach((optionId) => {
    const option = updatedPoll.options.find((opt) => opt.id === optionId);
    if (option) {
      option.voteCount += 1;
      if (!poll.settings.isAnonymous) {
        if (!option.voterIds) option.voterIds = [];
        if (!option.voterIds.includes(userId)) {
          option.voterIds.push(userId);
        }
      }
    }
  });

  // Add user to voters set
  voterIds.add(userId);

  // Update totals
  updatedPoll.totalVotes = updatedPoll.options.reduce(
    (sum, opt) => sum + opt.voteCount,
    0,
  );
  updatedPoll.totalVoters = voterIds.size;

  // Recalculate percentages
  updatedPoll.options = calculatePollPercentages(
    updatedPoll.options,
    updatedPoll.totalVotes,
  );

  // Mark as voted
  updatedPoll.hasVoted = true;

  // Update timestamp
  updatedPoll.updatedAt = new Date();

  return updatedPoll;
}

/**
 * Remove a user's vote from a poll
 */
export function removePollVote(
  poll: Poll,
  userId: string,
  vote: PollVote,
): Poll {
  const updatedPoll = { ...poll };
  updatedPoll.options = poll.options.map((opt) => ({ ...opt }));

  vote.optionIds.forEach((optionId) => {
    const option = updatedPoll.options.find((opt) => opt.id === optionId);
    if (option) {
      option.voteCount = Math.max(0, option.voteCount - 1);
      if (option.voterIds) {
        option.voterIds = option.voterIds.filter((id) => id !== userId);
      }
    }
  });

  // Recalculate totals
  updatedPoll.totalVotes = updatedPoll.options.reduce(
    (sum, opt) => sum + opt.voteCount,
    0,
  );

  // Count unique voters
  const voterIds = new Set<string>();
  updatedPoll.options.forEach((opt) => {
    if (opt.voterIds) {
      opt.voterIds.forEach((id) => voterIds.add(id));
    }
  });
  updatedPoll.totalVoters = voterIds.size;

  // Recalculate percentages
  updatedPoll.options = calculatePollPercentages(
    updatedPoll.options,
    updatedPoll.totalVotes,
  );

  updatedPoll.hasVoted = false;
  updatedPoll.currentUserVote = undefined;
  updatedPoll.updatedAt = new Date();

  return updatedPoll;
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
    closedAt: new Date(),
    closedBy,
    updatedAt: new Date(),
  };
}

/**
 * Reopen a closed poll
 */
export function reopenPoll(poll: Poll, newClosesAt?: Date): Poll {
  return {
    ...poll,
    status: "active",
    closedAt: undefined,
    closedBy: undefined,
    closesAt: newClosesAt || poll.closesAt,
    updatedAt: new Date(),
  };
}

/**
 * Cancel a poll
 */
export function cancelPoll(poll: Poll): Poll {
  return {
    ...poll,
    status: "cancelled",
    closedAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Update poll settings
 */
export function updatePollSettings(
  poll: Poll,
  updates: Partial<PollSettings>,
): Poll {
  return {
    ...poll,
    settings: {
      ...poll.settings,
      ...updates,
    },
    updatedAt: new Date(),
  };
}

/**
 * Add an option to a poll
 */
export function addPollOption(
  poll: Poll,
  optionText: string,
  emoji?: string,
): Poll {
  if (poll.options.length >= POLL_CONSTANTS.MAX_OPTIONS) {
    throw new Error(`Maximum ${POLL_CONSTANTS.MAX_OPTIONS} options allowed`);
  }

  if (!poll.settings.allowAddOptions) {
    throw new Error("Adding options is not allowed for this poll");
  }

  if (poll.status !== "active") {
    throw new Error("Cannot add options to a closed poll");
  }

  const trimmedText = optionText.trim();
  if (!trimmedText) {
    throw new Error("Option text cannot be empty");
  }

  if (trimmedText.length > POLL_CONSTANTS.MAX_OPTION_LENGTH) {
    throw new Error(
      `Option must be ${POLL_CONSTANTS.MAX_OPTION_LENGTH} characters or less`,
    );
  }

  // Check for duplicates
  const isDuplicate = poll.options.some(
    (opt) => opt.text.toLowerCase() === trimmedText.toLowerCase(),
  );
  if (isDuplicate) {
    throw new Error("This option already exists");
  }

  const newOption: PollOption = {
    id: generateOptionId(),
    text: trimmedText,
    emoji,
    voteCount: 0,
    percentage: 0,
    position: poll.options.length,
  };

  const updatedOptions = [...poll.options, newOption];

  return {
    ...poll,
    options: calculatePollPercentages(updatedOptions, poll.totalVotes),
    updatedAt: new Date(),
  };
}

// ============================================================================
// Poll Status Checks
// ============================================================================

/**
 * Check if poll is ending soon
 */
export function isPollEndingSoon(poll: Poll): boolean {
  if (!poll.closesAt || poll.status !== "active") return false;

  const now = new Date();
  const closesAt = new Date(poll.closesAt);
  const diff = closesAt.getTime() - now.getTime();

  return diff > 0 && diff <= POLL_CONSTANTS.POLL_ENDING_SOON_MS;
}

/**
 * Get poll status
 */
export function getPollStatus(poll: Poll): PollStatus {
  if (poll.status === "closed" || poll.status === "cancelled") {
    return poll.status;
  }

  if (poll.closesAt && new Date(poll.closesAt) < new Date()) {
    return "closed";
  }

  return "active";
}

/**
 * Check if user can manage poll
 */
export function canManagePoll(
  poll: Poll,
  userId: string,
  userRole?: string,
): boolean {
  if (poll.createdBy === userId) return true;
  if (userRole === "owner" || userRole === "admin") return true;
  return false;
}

// ============================================================================
// Results Export
// ============================================================================

export interface PollExportData {
  poll: Poll;
  results: {
    option: PollOption;
    voters: Array<{ userId: string; votedAt: Date }>;
  }[];
  summary: {
    totalVotes: number;
    totalVoters: number;
    winningOptions: PollOption[];
    createdAt: Date;
    closedAt?: Date;
    duration?: string;
  };
}

/**
 * Prepare poll data for export
 */
export function preparePollExport(poll: Poll): PollExportData {
  const winningOptions = getWinningOptions(poll);

  let duration: string | undefined;
  if (poll.closedAt) {
    const start = new Date(poll.createdAt);
    const end = new Date(poll.closedAt);
    const diff = end.getTime() - start.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    duration = `${hours}h ${minutes}m`;
  }

  return {
    poll,
    results: poll.options.map((option) => ({
      option,
      voters: [], // Would be populated from database in real implementation
    })),
    summary: {
      totalVotes: poll.totalVotes,
      totalVoters: poll.totalVoters,
      winningOptions,
      createdAt: poll.createdAt,
      closedAt: poll.closedAt,
      duration,
    },
  };
}

/**
 * Export poll results as CSV
 */
export function exportPollAsCSV(poll: Poll): string {
  const lines: string[] = [];

  // Header
  lines.push(`"Poll Results: ${poll.question.replace(/"/g, '""')}"`);
  lines.push(`"Created: ${poll.createdAt.toLocaleString()}"`);
  if (poll.closedAt) {
    lines.push(`"Closed: ${poll.closedAt.toLocaleString()}"`);
  }
  lines.push(`"Total Votes: ${poll.totalVotes}"`);
  lines.push(`"Total Voters: ${poll.totalVoters}"`);
  lines.push("");

  // Results table
  lines.push('"Option","Votes","Percentage"');
  poll.options.forEach((option) => {
    lines.push(
      `"${option.text.replace(/"/g, '""')}",${option.voteCount},${option.percentage}%`,
    );
  });

  return lines.join("\n");
}

/**
 * Export poll results as JSON
 */
export function exportPollAsJSON(poll: Poll): string {
  const exportData = preparePollExport(poll);
  return JSON.stringify(exportData, null, 2);
}

// ============================================================================
// Notifications
// ============================================================================

export interface PollNotification {
  type: "poll_created" | "poll_ending_soon" | "poll_closed" | "poll_voted";
  pollId: string;
  message: string;
  timestamp: Date;
}

/**
 * Create poll notification
 */
export function createPollNotification(
  type: PollNotification["type"],
  poll: Poll,
): PollNotification {
  let message = "";

  switch (type) {
    case "poll_created":
      message = `New poll: ${poll.question}`;
      break;
    case "poll_ending_soon":
      message = `Poll ending soon: ${poll.question}`;
      break;
    case "poll_closed":
      message = `Poll closed: ${poll.question}`;
      break;
    case "poll_voted":
      message = `New vote on: ${poll.question}`;
      break;
  }

  return {
    type,
    pollId: poll.id,
    message,
    timestamp: new Date(),
  };
}
