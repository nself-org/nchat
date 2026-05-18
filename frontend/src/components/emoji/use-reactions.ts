"use client";

import { useCallback, useMemo } from "react";
import { useQuery, useMutation, useSubscription } from "@apollo/client";
import { useAuth } from "@/contexts/auth-context";
import {
  GET_MESSAGE_REACTIONS,
  GET_MESSAGE_REACTIONS_GROUPED,
  ADD_REACTION,
  REMOVE_REACTION,
  MESSAGE_REACTIONS_SUBSCRIPTION,
  CHANNEL_REACTIONS_SUBSCRIPTION,
} from "@/graphql/reactions";

// Types
export interface ReactionUser {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
}

export interface Reaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
  user: ReactionUser;
}

export interface GroupedReaction {
  emoji: string;
  count: number;
  users: ReactionUser[];
  hasReacted: boolean;
}

interface UseMessageReactionsOptions {
  messageId: string;
  enabled?: boolean;
  subscribe?: boolean;
}

interface UseMessageReactionsReturn {
  reactions: Reaction[];
  groupedReactions: GroupedReaction[];
  loading: boolean;
  error: Error | null;
  addReaction: (emoji: string) => Promise<void>;
  removeReaction: (emoji: string) => Promise<void>;
  toggleReaction: (emoji: string) => Promise<void>;
  hasUserReacted: (emoji: string) => boolean;
  getReactionCount: (emoji: string) => number;
  isProcessing: boolean;
}

// Hook for managing reactions on a single message
export function useMessageReactions(
  options: UseMessageReactionsOptions,
): UseMessageReactionsReturn {
  const { messageId, enabled = true, subscribe = true } = options;
  const { user } = useAuth();

  // Query reactions
  const { data, loading, error } = useQuery(GET_MESSAGE_REACTIONS_GROUPED, {
    variables: { messageId },
    skip: !enabled || !messageId,
  });

  // Subscribe to reaction changes
  useSubscription(MESSAGE_REACTIONS_SUBSCRIPTION, {
    variables: { messageId },
    skip: !enabled || !messageId || !subscribe,
  });

  // Mutations
  const [addReactionMutation, { loading: isAdding }] =
    useMutation(ADD_REACTION);
  const [removeReactionMutation, { loading: isRemoving }] =
    useMutation(REMOVE_REACTION);

  // Parse reactions from query
  const reactions: Reaction[] = useMemo(() => {
    return data?.nchat_reactions || [];
  }, [data]);

  // Group reactions by emoji
  const groupedReactions: GroupedReaction[] = useMemo(() => {
    const groups: Record<string, GroupedReaction> = {};

    reactions.forEach((reaction: Reaction) => {
      const { emoji, user: reactionUser, user_id } = reaction;

      if (!groups[emoji]) {
        groups[emoji] = {
          emoji,
          count: 0,
          users: [],
          hasReacted: false,
        };
      }

      groups[emoji].count++;
      groups[emoji].users.push({
        id: reactionUser.id,
        username: reactionUser.username,
        display_name: reactionUser.display_name,
        avatar_url: reactionUser.avatar_url,
      });

      if (user_id === user?.id) {
        groups[emoji].hasReacted = true;
      }
    });

    return Object.values(groups).sort((a, b) => b.count - a.count);
  }, [reactions, user?.id]);

  // Check if user has reacted with specific emoji
  const hasUserReacted = useCallback(
    (emoji: string): boolean => {
      return reactions.some(
        (r: Reaction) => r.emoji === emoji && r.user_id === user?.id,
      );
    },
    [reactions, user?.id],
  );

  // Get reaction count for specific emoji
  const getReactionCount = useCallback(
    (emoji: string): number => {
      return reactions.filter((r: Reaction) => r.emoji === emoji).length;
    },
    [reactions],
  );

  // Add reaction
  const addReaction = useCallback(
    async (emoji: string) => {
      if (!user?.id || !messageId) return;

      await addReactionMutation({
        variables: {
          messageId,
          userId: user.id,
          emoji,
        },
        optimisticResponse: {
          insert_nchat_reactions_one: {
            __typename: "nchat_reactions",
            id: `temp-${Date.now()}`,
            message_id: messageId,
            user_id: user.id,
            emoji,
            created_at: new Date().toISOString(),
            user: {
              __typename: "nchat_users",
              id: user.id,
              username: user.username,
              display_name: user.displayName,
              avatar_url: user.avatarUrl || null,
            },
            message: {
              __typename: "nchat_messages",
              id: messageId,
              reactions_aggregate: {
                __typename: "nchat_reactions_aggregate",
                aggregate: {
                  __typename: "nchat_reactions_aggregate_fields",
                  count: getReactionCount(emoji) + 1,
                },
              },
            },
          },
        },
        update: (cache, { data: mutationData }) => {
          // Update cache with new reaction
          const existingData = cache.readQuery({
            query: GET_MESSAGE_REACTIONS_GROUPED,
            variables: { messageId },
          }) as { nchat_reactions: Reaction[] } | null;

          if (existingData && mutationData?.insert_nchat_reactions_one) {
            cache.writeQuery({
              query: GET_MESSAGE_REACTIONS_GROUPED,
              variables: { messageId },
              data: {
                nchat_reactions: [
                  ...existingData.nchat_reactions,
                  mutationData.insert_nchat_reactions_one,
                ],
              },
            });
          }
        },
      });
    },
    [user, messageId, addReactionMutation, getReactionCount],
  );

  // Remove reaction
  const removeReaction = useCallback(
    async (emoji: string) => {
      if (!user?.id || !messageId) return;

      await removeReactionMutation({
        variables: {
          messageId,
          userId: user.id,
          emoji,
        },
        optimisticResponse: {
          delete_nchat_reactions: {
            __typename: "nchat_reactions_mutation_response",
            affected_rows: 1,
            returning: [
              {
                __typename: "nchat_reactions",
                id: `temp-${Date.now()}`,
                message_id: messageId,
                emoji,
              },
            ],
          },
        },
        update: (cache) => {
          // Remove reaction from cache
          const existingData = cache.readQuery({
            query: GET_MESSAGE_REACTIONS_GROUPED,
            variables: { messageId },
          }) as { nchat_reactions: Reaction[] } | null;

          if (existingData) {
            cache.writeQuery({
              query: GET_MESSAGE_REACTIONS_GROUPED,
              variables: { messageId },
              data: {
                nchat_reactions: existingData.nchat_reactions.filter(
                  (r: Reaction) =>
                    !(r.emoji === emoji && r.user_id === user.id),
                ),
              },
            });
          }
        },
      });
    },
    [user, messageId, removeReactionMutation],
  );

  // Toggle reaction
  const toggleReaction = useCallback(
    async (emoji: string) => {
      if (hasUserReacted(emoji)) {
        await removeReaction(emoji);
      } else {
        await addReaction(emoji);
      }
    },
    [hasUserReacted, addReaction, removeReaction],
  );

  return {
    reactions,
    groupedReactions,
    loading,
    error: error || null,
    addReaction,
    removeReaction,
    toggleReaction,
    hasUserReacted,
    getReactionCount,
    isProcessing: isAdding || isRemoving,
  };
}

// Hook for subscribing to all reactions in a channel
interface UseChannelReactionsOptions {
  channelId: string;
  enabled?: boolean;
}

interface UseChannelReactionsReturn {
  recentReactions: Reaction[];
  loading: boolean;
  error: Error | null;
}

export function useChannelReactions(
  options: UseChannelReactionsOptions,
): UseChannelReactionsReturn {
  const { channelId, enabled = true } = options;

  // Subscribe to channel reactions
  const { data, loading, error } = useSubscription(
    CHANNEL_REACTIONS_SUBSCRIPTION,
    {
      variables: { channelId },
      skip: !enabled || !channelId,
    },
  );

  const recentReactions: Reaction[] = useMemo(() => {
    return data?.nchat_reactions || [];
  }, [data]);

  return {
    recentReactions,
    loading,
    error: error || null,
  };
}

// Hook for batch loading reactions for multiple messages
interface UseBatchReactionsOptions {
  messageIds: string[];
  enabled?: boolean;
}

interface UseBatchReactionsReturn {
  reactionsByMessage: Record<string, Reaction[]>;
  loading: boolean;
  error: Error | null;
}

export function useBatchReactions(
  options: UseBatchReactionsOptions,
): UseBatchReactionsReturn {
  const { messageIds, enabled = true } = options;

  const { data, loading, error } = useQuery(GET_MESSAGE_REACTIONS, {
    variables: { messageIds },
    skip: !enabled || messageIds.length === 0,
  });

  const reactionsByMessage: Record<string, Reaction[]> = useMemo(() => {
    const reactions: Reaction[] = data?.nchat_reactions || [];
    const grouped: Record<string, Reaction[]> = {};

    reactions.forEach((reaction: Reaction) => {
      if (!grouped[reaction.message_id]) {
        grouped[reaction.message_id] = [];
      }
      grouped[reaction.message_id].push(reaction);
    });

    return grouped;
  }, [data]);

  return {
    reactionsByMessage,
    loading,
    error: error || null,
  };
}

// Utility function to group reactions
export function groupReactionsByEmoji(
  reactions: Reaction[],
  currentUserId?: string,
): GroupedReaction[] {
  const groups: Record<string, GroupedReaction> = {};

  reactions.forEach((reaction) => {
    const { emoji, user: reactionUser, user_id } = reaction;

    if (!groups[emoji]) {
      groups[emoji] = {
        emoji,
        count: 0,
        users: [],
        hasReacted: false,
      };
    }

    groups[emoji].count++;
    groups[emoji].users.push({
      id: reactionUser.id,
      username: reactionUser.username,
      display_name: reactionUser.display_name,
      avatar_url: reactionUser.avatar_url,
    });

    if (currentUserId && user_id === currentUserId) {
      groups[emoji].hasReacted = true;
    }
  });

  return Object.values(groups).sort((a, b) => b.count - a.count);
}

// Utility to check if user has reacted with specific emoji
export function hasUserReactedWithEmoji(
  reactions: Reaction[],
  userId: string,
  emoji: string,
): boolean {
  return reactions.some((r) => r.user_id === userId && r.emoji === emoji);
}

// Utility to get reaction count for specific emoji
export function getReactionCountForEmoji(
  reactions: Reaction[],
  emoji: string,
): number {
  return reactions.filter((r) => r.emoji === emoji).length;
}
