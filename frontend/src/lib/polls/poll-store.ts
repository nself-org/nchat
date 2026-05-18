/**
 * Poll Store - Manages poll state for the nself-chat application
 *
 * Handles active polls, user votes, poll creation, and real-time updates.
 * Includes caching and optimistic updates for better UX.
 */

import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

// ============================================================================
// Types
// ============================================================================

export interface PollUser {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

export interface PollVote {
  id: string;
  poll_id: string;
  option_id: string;
  user_id: string;
  created_at: string;
  user: PollUser;
}

export interface PollOptionData {
  id: string;
  poll_id: string;
  text: string;
  position: number;
  vote_count: number;
  votes: PollVote[];
}

export interface PollSettings {
  allowMultipleVotes: boolean;
  isAnonymous: boolean;
  allowAddOptions: boolean;
  showResultsBeforeVoting: boolean;
}

export interface Poll {
  id: string;
  channel_id: string;
  message_id: string;
  creator_id: string;
  question: string;
  options: PollOptionData[];
  settings: PollSettings;
  status: "active" | "closed";
  ends_at: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  creator: PollUser;
  total_votes: number;
}

export interface CreatePollInput {
  channelId: string;
  messageId: string;
  question: string;
  options: string[];
  settings: PollSettings;
  endsAt?: Date | null;
}

export interface PollCreatorState {
  isOpen: boolean;
  channelId: string | null;
  question: string;
  options: string[];
  settings: PollSettings;
  endsAt: Date | null;
  step: "create" | "preview";
}

export interface PollState {
  // Cached polls by ID
  polls: Map<string, Poll>;

  // Polls by channel ID
  pollsByChannel: Map<string, string[]>;

  // User votes: pollId -> optionIds
  userVotes: Map<string, Set<string>>;

  // Loading states
  loadingPolls: Set<string>;
  votingPolls: Set<string>;

  // Poll creator modal state
  creator: PollCreatorState;

  // Currently viewing results for
  viewingResultsFor: string | null;

  // Currently viewing voters for
  viewingVotersFor: { pollId: string; optionId: string } | null;
}

export interface PollActions {
  // Poll CRUD operations
  setPoll: (poll: Poll) => void;
  setPolls: (polls: Poll[]) => void;
  removePoll: (pollId: string) => void;
  updatePollStatus: (pollId: string, status: "active" | "closed") => void;

  // User votes
  setUserVotes: (pollId: string, optionIds: string[]) => void;
  addUserVote: (pollId: string, optionId: string) => void;
  removeUserVote: (pollId: string, optionId: string) => void;
  clearUserVotes: (pollId: string) => void;
  hasUserVoted: (pollId: string) => boolean;
  getUserVotedOptions: (pollId: string) => string[];

  // Loading states
  setLoadingPoll: (pollId: string, loading: boolean) => void;
  setVotingPoll: (pollId: string, voting: boolean) => void;

  // Poll creator
  openCreator: (channelId: string) => void;
  closeCreator: () => void;
  setCreatorQuestion: (question: string) => void;
  setCreatorOptions: (options: string[]) => void;
  addCreatorOption: () => void;
  removeCreatorOption: (index: number) => void;
  updateCreatorOption: (index: number, text: string) => void;
  setCreatorSettings: (settings: Partial<PollSettings>) => void;
  setCreatorEndsAt: (endsAt: Date | null) => void;
  setCreatorStep: (step: "create" | "preview") => void;
  resetCreator: () => void;

  // Results and voters modals
  openResultsModal: (pollId: string) => void;
  closeResultsModal: () => void;
  openVotersModal: (pollId: string, optionId: string) => void;
  closeVotersModal: () => void;

  // Optimistic updates
  optimisticVote: (
    pollId: string,
    optionId: string,
    userId: string,
    user: PollUser,
  ) => void;
  optimisticUnvote: (pollId: string, optionId: string, userId: string) => void;
  revertVote: (pollId: string, optionId: string, userId: string) => void;

  // Channel-based operations
  addPollToChannel: (channelId: string, pollId: string) => void;
  getPollsForChannel: (channelId: string) => Poll[];

  // Utility
  getPoll: (pollId: string) => Poll | undefined;
  reset: () => void;
}

export type PollStore = PollState & PollActions;

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_POLL_SETTINGS: PollSettings = {
  allowMultipleVotes: false,
  isAnonymous: false,
  allowAddOptions: false,
  showResultsBeforeVoting: true,
};

const DEFAULT_CREATOR_STATE: PollCreatorState = {
  isOpen: false,
  channelId: null,
  question: "",
  options: ["", ""],
  settings: { ...DEFAULT_POLL_SETTINGS },
  endsAt: null,
  step: "create",
};

// ============================================================================
// Initial State
// ============================================================================

const initialState: PollState = {
  polls: new Map(),
  pollsByChannel: new Map(),
  userVotes: new Map(),
  loadingPolls: new Set(),
  votingPolls: new Set(),
  creator: { ...DEFAULT_CREATOR_STATE },
  viewingResultsFor: null,
  viewingVotersFor: null,
};

// ============================================================================
// Store
// ============================================================================

export const usePollStore = create<PollStore>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        ...initialState,

        // Poll CRUD operations
        setPoll: (poll) =>
          set(
            (state) => {
              state.polls.set(poll.id, poll);
              // Add to channel mapping
              const channelPolls =
                state.pollsByChannel.get(poll.channel_id) || [];
              if (!channelPolls.includes(poll.id)) {
                state.pollsByChannel.set(poll.channel_id, [
                  ...channelPolls,
                  poll.id,
                ]);
              }
            },
            false,
            "poll/setPoll",
          ),

        setPolls: (polls) =>
          set(
            (state) => {
              for (const poll of polls) {
                state.polls.set(poll.id, poll);
                // Add to channel mapping
                const channelPolls =
                  state.pollsByChannel.get(poll.channel_id) || [];
                if (!channelPolls.includes(poll.id)) {
                  state.pollsByChannel.set(poll.channel_id, [
                    ...channelPolls,
                    poll.id,
                  ]);
                }
              }
            },
            false,
            "poll/setPolls",
          ),

        removePoll: (pollId) =>
          set(
            (state) => {
              const poll = state.polls.get(pollId);
              if (poll) {
                // Remove from channel mapping
                const channelPolls = state.pollsByChannel.get(poll.channel_id);
                if (channelPolls) {
                  state.pollsByChannel.set(
                    poll.channel_id,
                    channelPolls.filter((id) => id !== pollId),
                  );
                }
              }
              state.polls.delete(pollId);
              state.userVotes.delete(pollId);
              state.loadingPolls.delete(pollId);
              state.votingPolls.delete(pollId);
            },
            false,
            "poll/removePoll",
          ),

        updatePollStatus: (pollId, status) =>
          set(
            (state) => {
              const poll = state.polls.get(pollId);
              if (poll) {
                poll.status = status;
                if (status === "closed") {
                  poll.closed_at = new Date().toISOString();
                } else {
                  poll.closed_at = null;
                }
              }
            },
            false,
            "poll/updatePollStatus",
          ),

        // User votes
        setUserVotes: (pollId, optionIds) =>
          set(
            (state) => {
              state.userVotes.set(pollId, new Set(optionIds));
            },
            false,
            "poll/setUserVotes",
          ),

        addUserVote: (pollId, optionId) =>
          set(
            (state) => {
              const votes = state.userVotes.get(pollId) || new Set();
              votes.add(optionId);
              state.userVotes.set(pollId, votes);
            },
            false,
            "poll/addUserVote",
          ),

        removeUserVote: (pollId, optionId) =>
          set(
            (state) => {
              const votes = state.userVotes.get(pollId);
              if (votes) {
                votes.delete(optionId);
              }
            },
            false,
            "poll/removeUserVote",
          ),

        clearUserVotes: (pollId) =>
          set(
            (state) => {
              state.userVotes.delete(pollId);
            },
            false,
            "poll/clearUserVotes",
          ),

        hasUserVoted: (pollId) => {
          const votes = get().userVotes.get(pollId);
          return votes ? votes.size > 0 : false;
        },

        getUserVotedOptions: (pollId) => {
          const votes = get().userVotes.get(pollId);
          return votes ? Array.from(votes) : [];
        },

        // Loading states
        setLoadingPoll: (pollId, loading) =>
          set(
            (state) => {
              if (loading) {
                state.loadingPolls.add(pollId);
              } else {
                state.loadingPolls.delete(pollId);
              }
            },
            false,
            "poll/setLoadingPoll",
          ),

        setVotingPoll: (pollId, voting) =>
          set(
            (state) => {
              if (voting) {
                state.votingPolls.add(pollId);
              } else {
                state.votingPolls.delete(pollId);
              }
            },
            false,
            "poll/setVotingPoll",
          ),

        // Poll creator
        openCreator: (channelId) =>
          set(
            (state) => {
              state.creator = {
                ...DEFAULT_CREATOR_STATE,
                isOpen: true,
                channelId,
              };
            },
            false,
            "poll/openCreator",
          ),

        closeCreator: () =>
          set(
            (state) => {
              state.creator.isOpen = false;
            },
            false,
            "poll/closeCreator",
          ),

        setCreatorQuestion: (question) =>
          set(
            (state) => {
              state.creator.question = question;
            },
            false,
            "poll/setCreatorQuestion",
          ),

        setCreatorOptions: (options) =>
          set(
            (state) => {
              state.creator.options = options;
            },
            false,
            "poll/setCreatorOptions",
          ),

        addCreatorOption: () =>
          set(
            (state) => {
              if (state.creator.options.length < 10) {
                state.creator.options.push("");
              }
            },
            false,
            "poll/addCreatorOption",
          ),

        removeCreatorOption: (index) =>
          set(
            (state) => {
              if (state.creator.options.length > 2) {
                state.creator.options.splice(index, 1);
              }
            },
            false,
            "poll/removeCreatorOption",
          ),

        updateCreatorOption: (index, text) =>
          set(
            (state) => {
              if (index >= 0 && index < state.creator.options.length) {
                state.creator.options[index] = text;
              }
            },
            false,
            "poll/updateCreatorOption",
          ),

        setCreatorSettings: (settings) =>
          set(
            (state) => {
              state.creator.settings = {
                ...state.creator.settings,
                ...settings,
              };
            },
            false,
            "poll/setCreatorSettings",
          ),

        setCreatorEndsAt: (endsAt) =>
          set(
            (state) => {
              state.creator.endsAt = endsAt;
            },
            false,
            "poll/setCreatorEndsAt",
          ),

        setCreatorStep: (step) =>
          set(
            (state) => {
              state.creator.step = step;
            },
            false,
            "poll/setCreatorStep",
          ),

        resetCreator: () =>
          set(
            (state) => {
              state.creator = { ...DEFAULT_CREATOR_STATE };
            },
            false,
            "poll/resetCreator",
          ),

        // Results and voters modals
        openResultsModal: (pollId) =>
          set(
            (state) => {
              state.viewingResultsFor = pollId;
            },
            false,
            "poll/openResultsModal",
          ),

        closeResultsModal: () =>
          set(
            (state) => {
              state.viewingResultsFor = null;
            },
            false,
            "poll/closeResultsModal",
          ),

        openVotersModal: (pollId, optionId) =>
          set(
            (state) => {
              state.viewingVotersFor = { pollId, optionId };
            },
            false,
            "poll/openVotersModal",
          ),

        closeVotersModal: () =>
          set(
            (state) => {
              state.viewingVotersFor = null;
            },
            false,
            "poll/closeVotersModal",
          ),

        // Optimistic updates
        optimisticVote: (pollId, optionId, userId, user) =>
          set(
            (state) => {
              const poll = state.polls.get(pollId);
              if (!poll) return;

              // Add user vote tracking
              const userVotes = state.userVotes.get(pollId) || new Set();

              // If not multiple votes allowed, clear existing votes first
              if (!poll.settings.allowMultipleVotes && userVotes.size > 0) {
                // Remove from old option
                for (const oldOptionId of userVotes) {
                  const oldOption = poll.options.find(
                    (o) => o.id === oldOptionId,
                  );
                  if (oldOption) {
                    oldOption.vote_count = Math.max(
                      0,
                      oldOption.vote_count - 1,
                    );
                    oldOption.votes = oldOption.votes.filter(
                      (v) => v.user_id !== userId,
                    );
                  }
                }
                userVotes.clear();
                poll.total_votes = Math.max(0, poll.total_votes - 1);
              }

              // Add new vote
              const option = poll.options.find((o) => o.id === optionId);
              if (option && !userVotes.has(optionId)) {
                option.vote_count += 1;
                option.votes.push({
                  id: `temp-${Date.now()}`,
                  poll_id: pollId,
                  option_id: optionId,
                  user_id: userId,
                  created_at: new Date().toISOString(),
                  user,
                });
                userVotes.add(optionId);
                poll.total_votes += 1;
              }

              state.userVotes.set(pollId, userVotes);
            },
            false,
            "poll/optimisticVote",
          ),

        optimisticUnvote: (pollId, optionId, userId) =>
          set(
            (state) => {
              const poll = state.polls.get(pollId);
              if (!poll) return;

              const option = poll.options.find((o) => o.id === optionId);
              if (option) {
                option.vote_count = Math.max(0, option.vote_count - 1);
                option.votes = option.votes.filter((v) => v.user_id !== userId);
                poll.total_votes = Math.max(0, poll.total_votes - 1);
              }

              const userVotes = state.userVotes.get(pollId);
              if (userVotes) {
                userVotes.delete(optionId);
              }
            },
            false,
            "poll/optimisticUnvote",
          ),

        revertVote: (pollId, optionId, userId) =>
          set(
            (state) => {
              // This would revert an optimistic update
              // In practice, you would refetch the poll data
              const userVotes = state.userVotes.get(pollId);
              if (userVotes) {
                userVotes.delete(optionId);
              }
            },
            false,
            "poll/revertVote",
          ),

        // Channel-based operations
        addPollToChannel: (channelId, pollId) =>
          set(
            (state) => {
              const channelPolls = state.pollsByChannel.get(channelId) || [];
              if (!channelPolls.includes(pollId)) {
                state.pollsByChannel.set(channelId, [...channelPolls, pollId]);
              }
            },
            false,
            "poll/addPollToChannel",
          ),

        getPollsForChannel: (channelId) => {
          const state = get();
          const pollIds = state.pollsByChannel.get(channelId) || [];
          return pollIds
            .map((id) => state.polls.get(id))
            .filter((p): p is Poll => p !== undefined);
        },

        // Utility
        getPoll: (pollId) => {
          return get().polls.get(pollId);
        },

        reset: () =>
          set(
            () => ({
              ...initialState,
              polls: new Map(),
              pollsByChannel: new Map(),
              userVotes: new Map(),
              loadingPolls: new Set(),
              votingPolls: new Set(),
            }),
            false,
            "poll/reset",
          ),
      })),
    ),
    { name: "poll-store" },
  ),
);

// ============================================================================
// Selectors
// ============================================================================

export const selectPoll = (pollId: string) => (state: PollStore) =>
  state.polls.get(pollId);

export const selectPollsByChannel = (channelId: string) => (state: PollStore) =>
  state.getPollsForChannel(channelId);

export const selectUserVotes = (pollId: string) => (state: PollStore) =>
  state.userVotes.get(pollId);

export const selectHasUserVoted = (pollId: string) => (state: PollStore) =>
  state.hasUserVoted(pollId);

export const selectIsLoadingPoll = (pollId: string) => (state: PollStore) =>
  state.loadingPolls.has(pollId);

export const selectIsVotingPoll = (pollId: string) => (state: PollStore) =>
  state.votingPolls.has(pollId);

export const selectCreatorState = (state: PollStore) => state.creator;

export const selectIsCreatorOpen = (state: PollStore) => state.creator.isOpen;

export const selectViewingResultsFor = (state: PollStore) =>
  state.viewingResultsFor;

export const selectViewingVotersFor = (state: PollStore) =>
  state.viewingVotersFor;

// ============================================================================
// Helpers
// ============================================================================

/**
 * Calculate vote percentage for an option
 */
export function calculateVotePercentage(
  voteCount: number,
  totalVotes: number,
): number {
  if (totalVotes === 0) return 0;
  return Math.round((voteCount / totalVotes) * 100);
}

/**
 * Find the winning option(s) in a poll
 */
export function findWinningOptions(poll: Poll): PollOptionData[] {
  if (poll.total_votes === 0) return [];
  const maxVotes = Math.max(...poll.options.map((o) => o.vote_count));
  return poll.options.filter((o) => o.vote_count === maxVotes);
}

/**
 * Check if a poll has ended
 */
export function isPollEnded(poll: Poll): boolean {
  if (poll.status === "closed") return true;
  if (!poll.ends_at) return false;
  return new Date(poll.ends_at) < new Date();
}

/**
 * Get time remaining for a poll
 */
export function getPollTimeRemaining(poll: Poll): {
  ended: boolean;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  text: string;
} {
  if (poll.status === "closed" || !poll.ends_at) {
    return {
      ended: poll.status === "closed",
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      text: poll.status === "closed" ? "Poll closed" : "No end date",
    };
  }

  const now = new Date();
  const endDate = new Date(poll.ends_at);
  const diff = endDate.getTime() - now.getTime();

  if (diff <= 0) {
    return {
      ended: true,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      text: "Poll ended",
    };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  let text = "";
  if (days > 0) {
    text = `${days}d ${hours}h remaining`;
  } else if (hours > 0) {
    text = `${hours}h ${minutes}m remaining`;
  } else if (minutes > 0) {
    text = `${minutes}m ${seconds}s remaining`;
  } else {
    text = `${seconds}s remaining`;
  }

  return { ended: false, days, hours, minutes, seconds, text };
}

/**
 * Format poll settings for display
 */
export function formatPollSettings(settings: PollSettings): string[] {
  const formatted: string[] = [];
  if (settings.allowMultipleVotes) {
    formatted.push("Multiple choices allowed");
  }
  if (settings.isAnonymous) {
    formatted.push("Anonymous voting");
  }
  if (settings.allowAddOptions) {
    formatted.push("Users can add options");
  }
  return formatted;
}

/**
 * Validate poll creator input
 */
export function validatePollCreator(creator: PollCreatorState): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!creator.question.trim()) {
    errors.push("Question is required");
  }

  const validOptions = creator.options.filter((o) => o.trim());
  if (validOptions.length < 2) {
    errors.push("At least 2 options are required");
  }

  if (creator.endsAt && creator.endsAt < new Date()) {
    errors.push("End date must be in the future");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Convert API response to Poll format
 */
export function normalizePoll(apiPoll: any): Poll {
  return {
    id: apiPoll.id,
    channel_id: apiPoll.channel_id,
    message_id: apiPoll.message_id,
    creator_id: apiPoll.creator_id,
    question: apiPoll.question,
    options: apiPoll.options.map((opt: any) => ({
      id: opt.id,
      poll_id: opt.poll_id,
      text: opt.text,
      position: opt.position,
      vote_count: opt.votes_aggregate?.aggregate?.count || 0,
      votes: opt.votes || [],
    })),
    settings: apiPoll.settings || DEFAULT_POLL_SETTINGS,
    status: apiPoll.status,
    ends_at: apiPoll.ends_at,
    created_at: apiPoll.created_at,
    updated_at: apiPoll.updated_at,
    closed_at: apiPoll.closed_at,
    creator: apiPoll.creator,
    total_votes: apiPoll.votes_aggregate?.aggregate?.count || 0,
  };
}
