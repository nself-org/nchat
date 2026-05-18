/**
 * Polls Library Index
 *
 * Export all poll-related utilities, hooks, and stores.
 *
 * @example
 * ```tsx
 * import {
 *   usePoll,
 *   usePollCreator,
 *   usePollStore,
 *   FEATURES,
 * } from '@/lib/polls'
 * ```
 */

// Store
export {
  usePollStore,
  // Selectors
  selectPoll,
  selectPollsByChannel,
  selectUserVotes,
  selectHasUserVoted,
  selectIsLoadingPoll,
  selectIsVotingPoll,
  selectCreatorState,
  selectIsCreatorOpen,
  selectViewingResultsFor,
  selectViewingVotersFor,
  // Helpers
  calculateVotePercentage,
  findWinningOptions,
  isPollEnded,
  getPollTimeRemaining,
  formatPollSettings,
  validatePollCreator,
  normalizePoll,
} from "./poll-store";

// Types from store
export type {
  Poll,
  PollUser,
  PollVote,
  PollOptionData,
  PollSettings,
  PollCreatorState,
  PollState,
  PollActions,
  PollStore,
  CreatePollInput,
} from "./poll-store";

// Hooks
export {
  usePoll,
  usePollByMessage,
  usePolls,
  useCreatePoll,
  usePollCreator,
  usePollActions,
  usePollResults,
  useCanCreatePoll,
} from "./use-poll";

// Types from hooks
export type {
  UsePollResult,
  UsePollsResult,
  UseCreatePollResult,
  UsePollCreatorResult,
} from "./use-poll";
