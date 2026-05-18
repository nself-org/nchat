"use client";

/**
 * usePolls Hook
 *
 * Hook for creating polls, voting, and viewing results with GraphQL integration.
 */

import { useCallback, useMemo } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { gql } from "@apollo/client";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import {
  createPoll,
  processVote,
  closePoll,
  addPollOption,
  type Poll,
  type CreatePollInput,
  type VoteInput,
} from "@/lib/messages/polls";

const CREATE_POLL_MUTATION = gql`
  mutation CreatePoll($channelId: uuid!, $messageId: uuid!, $pollData: jsonb!) {
    insert_nchat_messages_one(
      object: {
        channel_id: $channelId
        message_id: $messageId
        metadata: { type: "poll", poll: $pollData }
      }
    ) {
      id
      metadata
      created_at
    }
  }
`;

const VOTE_ON_POLL_MUTATION = gql`
  mutation VoteOnPoll($pollId: String!, $userId: uuid!, $optionIds: jsonb!) {
    insert_nchat_poll_votes_one(
      object: { poll_id: $pollId, user_id: $userId, option_ids: $optionIds }
      on_conflict: {
        constraint: poll_votes_poll_id_user_id_key
        update_columns: [option_ids, updated_at]
      }
    ) {
      id
      option_ids
      created_at
      updated_at
    }
  }
`;

const CLOSE_POLL_MUTATION = gql`
  mutation ClosePoll($pollId: String!, $closedBy: uuid!) {
    update_nchat_polls_by_pk(
      pk_columns: { id: $pollId }
      _set: { status: "closed", closed_at: "now()", closed_by: $closedBy }
    ) {
      id
      status
      closed_at
      closed_by
    }
  }
`;

const ADD_POLL_OPTION_MUTATION = gql`
  mutation AddPollOption($pollId: String!, $optionText: String!) {
    insert_nchat_poll_options_one(
      object: { poll_id: $pollId, text: $optionText }
    ) {
      id
      text
      votes
    }
  }
`;

const GET_POLL_QUERY = gql`
  query GetPoll($pollId: String!) {
    nchat_polls_by_pk(id: $pollId) {
      id
      question
      created_by
      created_at
      expires_at
      is_anonymous
      allow_multiple
      total_votes
      status
      channel_id
      message_id
      allow_add_options
      max_choices
      closed_at
      closed_by
      options {
        id
        text
        votes
        percentage
        voters
      }
    }
  }
`;

const GET_USER_VOTE_QUERY = gql`
  query GetUserVote($pollId: String!, $userId: uuid!) {
    nchat_poll_votes(
      where: { poll_id: { _eq: $pollId }, user_id: { _eq: $userId } }
    ) {
      id
      option_ids
      created_at
    }
  }
`;

interface UsePollsOptions {
  channelId?: string;
  pollId?: string;
}

export function usePolls(options: UsePollsOptions = {}) {
  const { user } = useAuth();
  const { toast } = useToast();

  // Mutations
  const [createPollMutation, { loading: isCreating }] =
    useMutation(CREATE_POLL_MUTATION);
  const [voteMutation, { loading: isVoting }] = useMutation(
    VOTE_ON_POLL_MUTATION,
  );
  const [closePollMutation, { loading: isClosing }] =
    useMutation(CLOSE_POLL_MUTATION);
  const [addOptionMutation, { loading: isAddingOption }] = useMutation(
    ADD_POLL_OPTION_MUTATION,
  );

  // Queries
  const {
    data: pollData,
    loading: isLoadingPoll,
    refetch: refetchPoll,
  } = useQuery(GET_POLL_QUERY, {
    variables: { pollId: options.pollId },
    skip: !options.pollId,
  });

  const { data: voteData, refetch: refetchVote } = useQuery(
    GET_USER_VOTE_QUERY,
    {
      variables: { pollId: options.pollId, userId: user?.id },
      skip: !options.pollId || !user?.id,
    },
  );

  const poll = useMemo(
    () => pollData?.nchat_polls_by_pk as Poll | undefined,
    [pollData],
  );
  const userVote = useMemo(
    () => voteData?.nchat_poll_votes?.[0]?.option_ids as string[] | undefined,
    [voteData],
  );

  /**
   * Create a new poll
   */
  const createPollHandler = useCallback(
    async (input: CreatePollInput) => {
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to create a poll",
          variant: "destructive",
        });
        return;
      }

      try {
        logger.debug("Creating poll", { input });

        // Generate a message ID for the poll
        const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Create poll data
        const pollData = createPoll(input, user.id, messageId);

        await createPollMutation({
          variables: {
            channelId: input.channelId,
            messageId,
            pollData,
          },
        });

        toast({
          title: "Poll created",
          description: "Your poll has been posted to the channel",
        });

        logger.info("Poll created successfully", { pollId: pollData.id });
      } catch (error) {
        logger.error(
          "Failed to create poll",
          error instanceof Error ? error : new Error(String(error)),
        );
        toast({
          title: "Error",
          description:
            error instanceof Error ? error.message : "Failed to create poll",
          variant: "destructive",
        });
        throw error;
      }
    },
    [user, createPollMutation, toast],
  );

  /**
   * Vote on a poll
   */
  const vote = useCallback(
    async (pollId: string, optionIds: string[]) => {
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to vote",
          variant: "destructive",
        });
        return;
      }

      try {
        logger.debug("Voting on poll", { pollId, optionIds });

        await voteMutation({
          variables: {
            pollId,
            userId: user.id,
            optionIds,
          },
        });

        toast({
          title: "Vote recorded",
          description: "Your vote has been saved",
        });

        // Refetch poll data to update results
        await refetchPoll();
        await refetchVote();

        logger.info("Vote recorded successfully", { pollId, optionIds });
      } catch (error) {
        logger.error(
          "Failed to vote",
          error instanceof Error ? error : new Error(String(error)),
        );
        toast({
          title: "Error",
          description:
            error instanceof Error ? error.message : "Failed to record vote",
          variant: "destructive",
        });
        throw error;
      }
    },
    [user, voteMutation, refetchPoll, refetchVote, toast],
  );

  /**
   * Close a poll
   */
  const closePollHandler = useCallback(
    async (pollId: string) => {
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to close a poll",
          variant: "destructive",
        });
        return;
      }

      try {
        logger.debug("Closing poll", { pollId });

        await closePollMutation({
          variables: {
            pollId,
            closedBy: user.id,
          },
        });

        toast({
          title: "Poll closed",
          description: "The poll has been closed and voting is now disabled",
        });

        // Refetch poll data
        await refetchPoll();

        logger.info("Poll closed successfully", { pollId });
      } catch (error) {
        logger.error(
          "Failed to close poll",
          error instanceof Error ? error : new Error(String(error)),
        );
        toast({
          title: "Error",
          description:
            error instanceof Error ? error.message : "Failed to close poll",
          variant: "destructive",
        });
        throw error;
      }
    },
    [user, closePollMutation, refetchPoll, toast],
  );

  /**
   * Add an option to a poll
   */
  const addOption = useCallback(
    async (pollId: string, optionText: string) => {
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to add an option",
          variant: "destructive",
        });
        return;
      }

      try {
        logger.debug("Adding poll option", { pollId, optionText });

        await addOptionMutation({
          variables: {
            pollId,
            optionText,
          },
        });

        toast({
          title: "Option added",
          description: "Your option has been added to the poll",
        });

        // Refetch poll data
        await refetchPoll();

        logger.info("Poll option added successfully", { pollId, optionText });
      } catch (error) {
        logger.error(
          "Failed to add poll option",
          error instanceof Error ? error : new Error(String(error)),
        );
        toast({
          title: "Error",
          description:
            error instanceof Error ? error.message : "Failed to add option",
          variant: "destructive",
        });
        throw error;
      }
    },
    [user, addOptionMutation, refetchPoll, toast],
  );

  return {
    // Data
    poll,
    userVote,

    // Loading states
    isLoadingPoll,
    isCreating,
    isVoting,
    isClosing,
    isAddingOption,

    // Actions
    createPoll: createPollHandler,
    vote,
    closePoll: closePollHandler,
    addOption,

    // Utilities
    refetchPoll,
    refetchVote,
  };
}
