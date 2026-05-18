"use client";

/**
 * Poll Hooks - React hooks for managing polls in the nself-chat application
 *
 * Provides hooks for fetching polls, voting, creating polls, and subscribing
 * to real-time updates. Integrates with Apollo Client and the poll store.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useSubscription } from "@apollo/client";
import { useAuth } from "@/contexts/auth-context";
import { useFeatureEnabled } from "@/lib/features/hooks/use-feature";
import { FEATURES } from "@/lib/features/feature-flags";
import {
  usePollStore,
  normalizePoll,
  calculateVotePercentage,
  findWinningOptions,
  isPollEnded,
  getPollTimeRemaining,
  validatePollCreator,
  type Poll,
  type PollOptionData,
  type PollSettings,
  type PollUser,
} from "./poll-store";
import { logger } from "@/lib/logger";
import {
  GET_POLL,
  GET_POLL_BY_MESSAGE,
  GET_POLLS_BY_CHANNEL,
  GET_USER_VOTES,
  GET_POLL_RESULTS,
  CREATE_POLL,
  VOTE_POLL,
  REMOVE_VOTE,
  REMOVE_USER_VOTES,
  CLOSE_POLL,
  REOPEN_POLL,
  ADD_POLL_OPTION,
  POLL_UPDATED_SUBSCRIPTION,
} from "@/graphql/polls";

// ============================================================================
// Types
// ============================================================================

export interface UsePollResult {
  poll: Poll | undefined;
  loading: boolean;
  error: Error | undefined;
  refetch: () => void;
  // User interaction
  hasVoted: boolean;
  votedOptions: string[];
  canVote: boolean;
  canManage: boolean;
  // Vote actions
  vote: (optionId: string) => Promise<void>;
  unvote: (optionId: string) => Promise<void>;
  // Results
  getOptionPercentage: (optionId: string) => number;
  winningOptions: PollOptionData[];
  // Status
  isEnded: boolean;
  timeRemaining: ReturnType<typeof getPollTimeRemaining>;
  isVoting: boolean;
}

export interface UsePollsResult {
  polls: Poll[];
  loading: boolean;
  error: Error | undefined;
  refetch: () => void;
  hasMore: boolean;
  loadMore: () => void;
}

export interface UseCreatePollResult {
  createPoll: (input: CreatePollInput) => Promise<Poll | null>;
  creating: boolean;
  error: Error | undefined;
}

export interface CreatePollInput {
  channelId: string;
  messageId: string;
  question: string;
  options: string[];
  settings: PollSettings;
  endsAt?: Date | null;
}

export interface UsePollCreatorResult {
  isOpen: boolean;
  channelId: string | null;
  question: string;
  options: string[];
  settings: PollSettings;
  endsAt: Date | null;
  step: "create" | "preview";
  // Validation
  isValid: boolean;
  errors: string[];
  // Actions
  open: (channelId: string) => void;
  close: () => void;
  setQuestion: (question: string) => void;
  setOptions: (options: string[]) => void;
  addOption: () => void;
  removeOption: (index: number) => void;
  updateOption: (index: number, text: string) => void;
  setSettings: (settings: Partial<PollSettings>) => void;
  setEndsAt: (endsAt: Date | null) => void;
  setStep: (step: "create" | "preview") => void;
  reset: () => void;
  submit: () => Promise<Poll | null>;
}

// ============================================================================
// Main Hook: usePoll
// ============================================================================

/**
 * Hook for managing a single poll
 */
export function usePoll(pollId: string | undefined): UsePollResult {
  const { user } = useAuth();
  const pollsEnabled = useFeatureEnabled(FEATURES.POLLS);

  const store = usePollStore();
  const cachedPoll = pollId ? store.polls.get(pollId) : undefined;

  // Fetch poll data
  const { data, loading, error, refetch } = useQuery(GET_POLL, {
    variables: { pollId },
    skip: !pollId || !pollsEnabled,
    fetchPolicy: "cache-and-network",
    onCompleted: (data) => {
      if (data?.nchat_polls_by_pk) {
        store.setPoll(normalizePoll(data.nchat_polls_by_pk));
      }
    },
  });

  // Fetch user votes
  const { data: userVotesData } = useQuery(GET_USER_VOTES, {
    variables: { pollId, userId: user?.id },
    skip: !pollId || !user?.id || !pollsEnabled,
    fetchPolicy: "cache-and-network",
    onCompleted: (data) => {
      if (data?.nchat_poll_votes && pollId) {
        const optionIds = data.nchat_poll_votes.map((v: any) => v.option_id);
        store.setUserVotes(pollId, optionIds);
      }
    },
  });

  // Subscribe to poll updates
  useSubscription(POLL_UPDATED_SUBSCRIPTION, {
    variables: { pollId },
    skip: !pollId || !pollsEnabled,
    onData: ({ data }) => {
      if (data.data?.nchat_polls_by_pk) {
        store.setPoll(normalizePoll(data.data.nchat_polls_by_pk));
      }
    },
  });

  // Vote mutation
  const [voteMutation, { loading: voteLoading }] = useMutation(VOTE_POLL);
  const [unvoteMutation] = useMutation(REMOVE_VOTE);
  const [removeAllVotesMutation] = useMutation(REMOVE_USER_VOTES);

  const poll =
    cachedPoll ||
    (data?.nchat_polls_by_pk
      ? normalizePoll(data.nchat_polls_by_pk)
      : undefined);

  const votedOptions = useMemo(() => {
    if (!pollId) return [];
    return store.getUserVotedOptions(pollId);
  }, [pollId, store.userVotes]);

  const hasVoted = votedOptions.length > 0;

  const isEnded = poll ? isPollEnded(poll) : false;
  const timeRemaining = poll
    ? getPollTimeRemaining(poll)
    : getPollTimeRemaining({ status: "closed" } as Poll);

  const canVote = useMemo(() => {
    if (!poll || !user) return false;
    if (isEnded) return false;
    if (!poll.settings.allowMultipleVotes && hasVoted) return false;
    return true;
  }, [poll, user, isEnded, hasVoted]);

  const canManage = useMemo(() => {
    if (!poll || !user) return false;
    return poll.creator_id === user.id;
  }, [poll, user]);

  const winningOptions = useMemo(() => {
    return poll ? findWinningOptions(poll) : [];
  }, [poll]);

  const getOptionPercentage = useCallback(
    (optionId: string) => {
      if (!poll) return 0;
      const option = poll.options.find((o) => o.id === optionId);
      if (!option) return 0;
      return calculateVotePercentage(option.vote_count, poll.total_votes);
    },
    [poll],
  );

  const vote = useCallback(
    async (optionId: string) => {
      if (!poll || !user || !pollId) return;

      const currentUser: PollUser = {
        id: user.id,
        username: user.username || user.email || "",
        display_name: user.displayName || user.email || "",
        avatar_url: user.avatarUrl || null,
      };

      // Optimistic update
      store.setVotingPoll(pollId, true);

      // If not allowing multiple votes and user has voted, remove previous vote first
      if (!poll.settings.allowMultipleVotes && hasVoted) {
        store.clearUserVotes(pollId);
        try {
          await removeAllVotesMutation({
            variables: { pollId, userId: user.id },
          });
        } catch (err) {
          logger.error("Failed to remove previous votes:", err);
        }
      }

      store.optimisticVote(pollId, optionId, user.id, currentUser);

      try {
        await voteMutation({
          variables: {
            pollId,
            optionId,
            userId: user.id,
          },
        });
        // Refetch to get accurate data
        refetch();
      } catch (err) {
        // Revert optimistic update on error
        store.revertVote(pollId, optionId, user.id);
        throw err;
      } finally {
        store.setVotingPoll(pollId, false);
      }
    },
    [
      poll,
      user,
      pollId,
      hasVoted,
      voteMutation,
      removeAllVotesMutation,
      refetch,
    ],
  );

  const unvote = useCallback(
    async (optionId: string) => {
      if (!poll || !user || !pollId) return;

      store.setVotingPoll(pollId, true);
      store.optimisticUnvote(pollId, optionId, user.id);

      try {
        await unvoteMutation({
          variables: {
            pollId,
            optionId,
            userId: user.id,
          },
        });
        refetch();
      } catch (err) {
        // Revert on error
        refetch();
        throw err;
      } finally {
        store.setVotingPoll(pollId, false);
      }
    },
    [poll, user, pollId, unvoteMutation, refetch],
  );

  return {
    poll,
    loading,
    error: error as Error | undefined,
    refetch,
    hasVoted,
    votedOptions,
    canVote,
    canManage,
    vote,
    unvote,
    getOptionPercentage,
    winningOptions,
    isEnded,
    timeRemaining,
    isVoting: voteLoading || store.votingPolls.has(pollId || ""),
  };
}

// ============================================================================
// Hook: usePollByMessage
// ============================================================================

/**
 * Hook for getting a poll associated with a message
 */
export function usePollByMessage(messageId: string | undefined) {
  const pollsEnabled = useFeatureEnabled(FEATURES.POLLS);
  const [pollId, setPollId] = useState<string | undefined>();

  const { data, loading } = useQuery(GET_POLL_BY_MESSAGE, {
    variables: { messageId },
    skip: !messageId || !pollsEnabled,
    fetchPolicy: "cache-and-network",
    onCompleted: (data) => {
      if (data?.nchat_polls?.[0]) {
        setPollId(data.nchat_polls[0].id);
      }
    },
  });

  const pollResult = usePoll(pollId);

  return {
    ...pollResult,
    pollId,
    messageHasPoll: !!data?.nchat_polls?.[0],
    loadingMessage: loading,
  };
}

// ============================================================================
// Hook: usePolls
// ============================================================================

/**
 * Hook for fetching multiple polls for a channel
 */
export function usePolls(
  channelId: string | undefined,
  limit = 20,
): UsePollsResult {
  const pollsEnabled = useFeatureEnabled(FEATURES.POLLS);
  const store = usePollStore();
  const [offset, setOffset] = useState(0);

  const { data, loading, error, refetch, fetchMore } = useQuery(
    GET_POLLS_BY_CHANNEL,
    {
      variables: { channelId, limit, offset: 0 },
      skip: !channelId || !pollsEnabled,
      fetchPolicy: "cache-and-network",
      onCompleted: (data) => {
        if (data?.nchat_polls) {
          const normalizedPolls = data.nchat_polls.map(normalizePoll);
          store.setPolls(normalizedPolls);
        }
      },
    },
  );

  const polls = useMemo(() => {
    if (!channelId) return [];
    return store.getPollsForChannel(channelId);
  }, [channelId, store.polls, store.pollsByChannel]);

  const totalCount = data?.nchat_polls_aggregate?.aggregate?.count || 0;
  const hasMore = polls.length < totalCount;

  const loadMore = useCallback(() => {
    if (!hasMore || loading) return;
    const newOffset = offset + limit;
    setOffset(newOffset);
    fetchMore({
      variables: { offset: newOffset },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev;
        const newPolls = fetchMoreResult.nchat_polls.map(normalizePoll);
        store.setPolls(newPolls);
        return {
          ...prev,
          nchat_polls: [...prev.nchat_polls, ...fetchMoreResult.nchat_polls],
        };
      },
    });
  }, [hasMore, loading, offset, limit, fetchMore]);

  return {
    polls,
    loading,
    error: error as Error | undefined,
    refetch,
    hasMore,
    loadMore,
  };
}

// ============================================================================
// Hook: useCreatePoll
// ============================================================================

/**
 * Hook for creating new polls
 */
export function useCreatePoll(): UseCreatePollResult {
  const { user } = useAuth();
  const store = usePollStore();

  const [createMutation, { loading, error }] = useMutation(CREATE_POLL);

  const createPoll = useCallback(
    async (input: CreatePollInput): Promise<Poll | null> => {
      if (!user) return null;

      const options = input.options
        .filter((o) => o.trim())
        .map((text, index) => ({
          text: text.trim(),
          position: index,
        }));

      try {
        const { data } = await createMutation({
          variables: {
            channelId: input.channelId,
            messageId: input.messageId,
            creatorId: user.id,
            question: input.question.trim(),
            settings: input.settings,
            endsAt: input.endsAt?.toISOString() || null,
            options,
          },
        });

        if (data?.insert_nchat_polls_one) {
          const poll = normalizePoll(data.insert_nchat_polls_one);
          store.setPoll(poll);
          return poll;
        }
        return null;
      } catch (err) {
        logger.error("Failed to create poll:", err);
        throw err;
      }
    },
    [user, createMutation],
  );

  return {
    createPoll,
    creating: loading,
    error: error as Error | undefined,
  };
}

// ============================================================================
// Hook: usePollCreator
// ============================================================================

/**
 * Hook for managing the poll creator modal state
 */
export function usePollCreator(): UsePollCreatorResult {
  const store = usePollStore();
  const { createPoll, creating } = useCreatePoll();

  const { isOpen, channelId, question, options, settings, endsAt, step } =
    store.creator;

  const validation = useMemo(
    () => validatePollCreator(store.creator),
    [store.creator],
  );

  const submit = useCallback(async (): Promise<Poll | null> => {
    if (!channelId || !validation.valid) return null;

    // Generate a temporary message ID (in real app, this would come from message creation)
    const messageId = `temp-${Date.now()}`;

    try {
      const poll = await createPoll({
        channelId,
        messageId,
        question,
        options: options.filter((o) => o.trim()),
        settings,
        endsAt,
      });

      if (poll) {
        store.closeCreator();
        store.resetCreator();
      }

      return poll;
    } catch (err) {
      logger.error("Failed to submit poll:", err);
      return null;
    }
  }, [
    channelId,
    validation.valid,
    question,
    options,
    settings,
    endsAt,
    createPoll,
  ]);

  return {
    isOpen,
    channelId,
    question,
    options,
    settings,
    endsAt,
    step,
    isValid: validation.valid,
    errors: validation.errors,
    open: store.openCreator,
    close: store.closeCreator,
    setQuestion: store.setCreatorQuestion,
    setOptions: store.setCreatorOptions,
    addOption: store.addCreatorOption,
    removeOption: store.removeCreatorOption,
    updateOption: store.updateCreatorOption,
    setSettings: store.setCreatorSettings,
    setEndsAt: store.setCreatorEndsAt,
    setStep: store.setCreatorStep,
    reset: store.resetCreator,
    submit,
  };
}

// ============================================================================
// Hook: usePollActions
// ============================================================================

/**
 * Hook for poll management actions (close, reopen, etc.)
 */
export function usePollActions(pollId: string | undefined) {
  const store = usePollStore();

  const [closeMutation, { loading: closing }] = useMutation(CLOSE_POLL);
  const [reopenMutation, { loading: reopening }] = useMutation(REOPEN_POLL);
  const [addOptionMutation, { loading: addingOption }] =
    useMutation(ADD_POLL_OPTION);

  const closePoll = useCallback(async () => {
    if (!pollId) return;

    try {
      await closeMutation({ variables: { pollId } });
      store.updatePollStatus(pollId, "closed");
    } catch (err) {
      logger.error("Failed to close poll:", err);
      throw err;
    }
  }, [pollId, closeMutation]);

  const reopenPoll = useCallback(
    async (newEndDate?: Date) => {
      if (!pollId) return;

      try {
        await reopenMutation({
          variables: { pollId, endsAt: newEndDate?.toISOString() || null },
        });
        store.updatePollStatus(pollId, "active");
      } catch (err) {
        logger.error("Failed to reopen poll:", err);
        throw err;
      }
    },
    [pollId, reopenMutation],
  );

  const addOption = useCallback(
    async (text: string) => {
      if (!pollId) return;

      const poll = store.getPoll(pollId);
      const position = poll ? poll.options.length : 0;

      try {
        await addOptionMutation({
          variables: { pollId, text, position },
        });
      } catch (err) {
        logger.error("Failed to add option:", err);
        throw err;
      }
    },
    [pollId, addOptionMutation],
  );

  return {
    closePoll,
    reopenPoll,
    addOption,
    closing,
    reopening,
    addingOption,
  };
}

// ============================================================================
// Hook: usePollResults
// ============================================================================

/**
 * Hook for fetching detailed poll results
 */
export function usePollResults(pollId: string | undefined) {
  const { data, loading, error, refetch } = useQuery(GET_POLL_RESULTS, {
    variables: { pollId },
    skip: !pollId,
    fetchPolicy: "cache-and-network",
  });

  const results = useMemo(() => {
    if (!data?.nchat_polls_by_pk) return null;

    const poll = data.nchat_polls_by_pk;
    const totalVotes = poll.votes_aggregate?.aggregate?.count || 0;

    return {
      id: poll.id,
      question: poll.question,
      settings: poll.settings,
      status: poll.status,
      endsAt: poll.ends_at,
      createdAt: poll.created_at,
      closedAt: poll.closed_at,
      totalVotes,
      options: poll.options.map((opt: any) => ({
        id: opt.id,
        text: opt.text,
        position: opt.position,
        voteCount: opt.votes_aggregate?.aggregate?.count || 0,
        percentage: calculateVotePercentage(
          opt.votes_aggregate?.aggregate?.count || 0,
          totalVotes,
        ),
        voters: opt.votes.map((v: any) => v.user),
      })),
    };
  }, [data]);

  return {
    results,
    loading,
    error: error as Error | undefined,
    refetch,
  };
}

// ============================================================================
// Hook: useCanCreatePoll
// ============================================================================

/**
 * Hook to check if the current user can create polls
 */
export function useCanCreatePoll() {
  const { user, isAuthenticated } = useAuth();
  const pollsEnabled = useFeatureEnabled(FEATURES.POLLS);

  return isAuthenticated && pollsEnabled && !!user;
}

// ============================================================================
// Export types
// ============================================================================

export type {
  Poll,
  PollOptionData,
  PollSettings,
  PollUser,
} from "./poll-store";
