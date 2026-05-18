"use client";

import { useCallback, useMemo } from "react";
import {
  useQuery,
  useMutation,
  useSubscription,
  useLazyQuery,
  type ApolloError,
} from "@apollo/client";
import { useAuth } from "@/contexts/auth-context";
import {
  GET_MESSAGE_REACTIONS,
  GET_MESSAGE_REACTIONS_GROUPED,
  GET_MESSAGES_REACTIONS,
  CHECK_USER_REACTION,
  GET_POPULAR_REACTIONS,
  GET_USER_FREQUENT_REACTIONS,
  ADD_REACTION,
  REMOVE_REACTION,
  TOGGLE_REACTION,
  CLEAR_MESSAGE_REACTIONS,
  REMOVE_USER_REACTIONS,
  MESSAGE_REACTIONS_SUBSCRIPTION,
  CHANNEL_REACTIONS_SUBSCRIPTION,
  type AddReactionVariables,
  type RemoveReactionVariables,
  type ReactionCount,
} from "@/graphql/reactions";

// ============================================================================
// TYPES
// ============================================================================

export interface ReactionUser {
  id: string;
  username: string;
  display_name: string;
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

// Hook return types
export interface UseMessageReactionsReturn {
  reactions: Reaction[];
  groupedReactions: GroupedReaction[];
  totalCount: number;
  loading: boolean;
  error: ApolloError | undefined;
  refetch: () => Promise<void>;
}

export interface UseAddReactionReturn {
  addReaction: (messageId: string, emoji: string) => Promise<Reaction | null>;
  loading: boolean;
  error: ApolloError | undefined;
}

export interface UseRemoveReactionReturn {
  removeReaction: (messageId: string, emoji: string) => Promise<boolean>;
  loading: boolean;
  error: ApolloError | undefined;
}

export interface UseToggleReactionReturn {
  toggleReaction: (messageId: string, emoji: string) => Promise<boolean>;
  addReaction: (messageId: string, emoji: string) => Promise<Reaction | null>;
  removeReaction: (messageId: string, emoji: string) => Promise<boolean>;
  loading: boolean;
  error: ApolloError | undefined;
}

export interface UseReactionsReturn {
  addReaction: (messageId: string, emoji: string) => Promise<Reaction | null>;
  removeReaction: (messageId: string, emoji: string) => Promise<boolean>;
  toggleReaction: (messageId: string, emoji: string) => Promise<boolean>;
  clearReactions: (messageId: string) => Promise<number>;
  removeUserReactions: (messageId: string) => Promise<number>;
  checkUserReaction: (messageId: string, emoji: string) => Promise<boolean>;
  loading: boolean;
  error: ApolloError | undefined;
}

export interface UsePopularReactionsReturn {
  popularEmojis: string[];
  loading: boolean;
  error: ApolloError | undefined;
}

export interface UseFrequentReactionsReturn {
  frequentEmojis: string[];
  loading: boolean;
  error: ApolloError | undefined;
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Fetch reactions for a specific message
 */
export function useMessageReactions(
  messageId: string,
  options?: { autoSubscribe?: boolean },
): UseMessageReactionsReturn {
  const { autoSubscribe = true } = options ?? {};
  const { user } = useAuth();

  const { data, loading, error, refetch } = useQuery(GET_MESSAGE_REACTIONS, {
    variables: { messageId },
    skip: !messageId,
  });

  // Subscribe to reaction changes
  useSubscription(MESSAGE_REACTIONS_SUBSCRIPTION, {
    variables: { messageId },
    skip: !messageId || !autoSubscribe,
  });

  const reactions = useMemo(() => {
    return data?.nchat_reactions ?? [];
  }, [data]);

  // Group reactions by emoji
  const groupedReactions = useMemo(() => {
    if (!reactions.length) return [];

    const groups = new Map<string, { users: ReactionUser[]; count: number }>();

    reactions.forEach((reaction: Reaction) => {
      const existing = groups.get(reaction.emoji);
      if (existing) {
        existing.users.push(reaction.user);
        existing.count++;
      } else {
        groups.set(reaction.emoji, {
          users: [reaction.user],
          count: 1,
        });
      }
    });

    return Array.from(groups.entries()).map(([emoji, data]) => ({
      emoji,
      count: data.count,
      users: data.users,
      hasReacted: user ? data.users.some((u) => u.id === user.id) : false,
    }));
  }, [reactions, user]);

  const totalCount =
    data?.nchat_reactions_aggregate?.aggregate?.count ?? reactions.length;

  return {
    reactions,
    groupedReactions,
    totalCount,
    loading,
    error,
    refetch: async () => {
      await refetch();
    },
  };
}

/**
 * Fetch reactions for multiple messages (batch)
 */
export function useMessagesReactions(messageIds: string[]) {
  const { user } = useAuth();

  const { data, loading, error, refetch } = useQuery(GET_MESSAGES_REACTIONS, {
    variables: { messageIds },
    skip: !messageIds.length,
  });

  // Group reactions by message and emoji
  const reactionsByMessage = useMemo(() => {
    const reactions = data?.nchat_reactions ?? [];
    const byMessage = new Map<string, Map<string, GroupedReaction>>();

    reactions.forEach((reaction: Reaction) => {
      if (!byMessage.has(reaction.message_id)) {
        byMessage.set(reaction.message_id, new Map());
      }

      const messageReactions = byMessage.get(reaction.message_id)!;
      const existing = messageReactions.get(reaction.emoji);

      if (existing) {
        existing.users.push(reaction.user);
        existing.count++;
        if (user && reaction.user_id === user.id) {
          existing.hasReacted = true;
        }
      } else {
        messageReactions.set(reaction.emoji, {
          emoji: reaction.emoji,
          count: 1,
          users: [reaction.user],
          hasReacted: user ? reaction.user_id === user.id : false,
        });
      }
    });

    // Convert to object for easier access
    const result: Record<string, GroupedReaction[]> = {};
    byMessage.forEach((emojiMap, messageId) => {
      result[messageId] = Array.from(emojiMap.values());
    });

    return result;
  }, [data, user]);

  return {
    reactionsByMessage,
    loading,
    error,
    refetch: async () => {
      await refetch();
    },
  };
}

/**
 * Add a reaction to a message
 */
export function useAddReaction(): UseAddReactionReturn {
  const { user } = useAuth();
  const [addReactionMutation, { loading, error }] = useMutation(ADD_REACTION);

  const addReaction = useCallback(
    async (messageId: string, emoji: string): Promise<Reaction | null> => {
      if (!user) {
        throw new Error("Must be logged in to add a reaction");
      }

      const result = await addReactionMutation({
        variables: {
          messageId,
          userId: user.id,
          emoji,
        },
        optimisticResponse: {
          insert_nchat_reactions_one: {
            __typename: "nchat_reactions",
            id: `temp-${Date.now()}`,
            emoji,
            created_at: new Date().toISOString(),
            user: {
              __typename: "nchat_users",
              id: user.id,
              username: user.username,
              display_name: user.displayName,
              avatar_url: user.avatarUrl,
            },
            message: {
              __typename: "nchat_messages",
              id: messageId,
              reactions_aggregate: {
                __typename: "nchat_reactions_aggregate",
                aggregate: {
                  __typename: "nchat_reactions_aggregate_fields",
                  count: 1, // Incremented in actual response
                },
              },
            },
          },
        },
        update: (cache, { data }) => {
          if (data?.insert_nchat_reactions_one) {
            cache.modify({
              id: cache.identify({
                __typename: "nchat_messages",
                id: messageId,
              }),
              fields: {
                reactions(existingReactions = []) {
                  return [
                    ...existingReactions,
                    data.insert_nchat_reactions_one,
                  ];
                },
              },
            });
          }
        },
      });

      return result.data?.insert_nchat_reactions_one ?? null;
    },
    [user, addReactionMutation],
  );

  return {
    addReaction,
    loading,
    error,
  };
}

/**
 * Remove a reaction from a message
 */
export function useRemoveReaction(): UseRemoveReactionReturn {
  const { user } = useAuth();
  const [removeReactionMutation, { loading, error }] =
    useMutation(REMOVE_REACTION);

  const removeReaction = useCallback(
    async (messageId: string, emoji: string): Promise<boolean> => {
      if (!user) {
        throw new Error("Must be logged in to remove a reaction");
      }

      const result = await removeReactionMutation({
        variables: {
          messageId,
          userId: user.id,
          emoji,
        },
        update: (cache, { data }) => {
          if (data?.delete_nchat_reactions?.affected_rows) {
            cache.modify({
              id: cache.identify({
                __typename: "nchat_messages",
                id: messageId,
              }),
              fields: {
                reactions(existingReactions = [], { readField }) {
                  return existingReactions.filter(
                    (reactionRef: { __ref: string }) => {
                      const reactionEmoji = readField("emoji", reactionRef);
                      const reactionUserId = readField("user_id", reactionRef);
                      return !(
                        reactionEmoji === emoji && reactionUserId === user.id
                      );
                    },
                  );
                },
              },
            });
          }
        },
      });

      return (result.data?.delete_nchat_reactions?.affected_rows ?? 0) > 0;
    },
    [user, removeReactionMutation],
  );

  return {
    removeReaction,
    loading,
    error,
  };
}

/**
 * Toggle a reaction (add if not exists, remove if exists)
 */
export function useToggleReaction(): UseToggleReactionReturn {
  const { user } = useAuth();
  const [addReactionMutation, { loading: addLoading, error: addError }] =
    useMutation(ADD_REACTION);
  const [
    removeReactionMutation,
    { loading: removeLoading, error: removeError },
  ] = useMutation(REMOVE_REACTION);
  const [checkReaction] = useLazyQuery(CHECK_USER_REACTION);

  const addReaction = useCallback(
    async (messageId: string, emoji: string): Promise<Reaction | null> => {
      if (!user) {
        throw new Error("Must be logged in to add a reaction");
      }

      const result = await addReactionMutation({
        variables: {
          messageId,
          userId: user.id,
          emoji,
        },
      });

      return result.data?.insert_nchat_reactions_one ?? null;
    },
    [user, addReactionMutation],
  );

  const removeReaction = useCallback(
    async (messageId: string, emoji: string): Promise<boolean> => {
      if (!user) {
        throw new Error("Must be logged in to remove a reaction");
      }

      const result = await removeReactionMutation({
        variables: {
          messageId,
          userId: user.id,
          emoji,
        },
      });

      return (result.data?.delete_nchat_reactions?.affected_rows ?? 0) > 0;
    },
    [user, removeReactionMutation],
  );

  const toggleReaction = useCallback(
    async (messageId: string, emoji: string): Promise<boolean> => {
      if (!user) {
        throw new Error("Must be logged in to toggle a reaction");
      }

      // Check if user has already reacted
      const { data } = await checkReaction({
        variables: {
          messageId,
          userId: user.id,
          emoji,
        },
      });

      const hasReacted = (data?.nchat_reactions?.length ?? 0) > 0;

      if (hasReacted) {
        await removeReaction(messageId, emoji);
        return false; // Removed
      } else {
        await addReaction(messageId, emoji);
        return true; // Added
      }
    },
    [user, checkReaction, addReaction, removeReaction],
  );

  return {
    toggleReaction,
    addReaction,
    removeReaction,
    loading: addLoading || removeLoading,
    error: addError ?? removeError,
  };
}

/**
 * Combined reactions hook with all operations
 */
export function useReactions(): UseReactionsReturn {
  const { user } = useAuth();

  const [addMutation, { loading: addLoading, error: addError }] =
    useMutation(ADD_REACTION);
  const [removeMutation, { loading: removeLoading, error: removeError }] =
    useMutation(REMOVE_REACTION);
  const [clearMutation, { loading: clearLoading, error: clearError }] =
    useMutation(CLEAR_MESSAGE_REACTIONS);
  const [
    removeUserMutation,
    { loading: removeUserLoading, error: removeUserError },
  ] = useMutation(REMOVE_USER_REACTIONS);
  const [checkReaction] = useLazyQuery(CHECK_USER_REACTION);

  const addReaction = useCallback(
    async (messageId: string, emoji: string): Promise<Reaction | null> => {
      if (!user) {
        throw new Error("Must be logged in to add a reaction");
      }

      const result = await addMutation({
        variables: {
          messageId,
          userId: user.id,
          emoji,
        },
      });

      return result.data?.insert_nchat_reactions_one ?? null;
    },
    [user, addMutation],
  );

  const removeReaction = useCallback(
    async (messageId: string, emoji: string): Promise<boolean> => {
      if (!user) {
        throw new Error("Must be logged in to remove a reaction");
      }

      const result = await removeMutation({
        variables: {
          messageId,
          userId: user.id,
          emoji,
        },
      });

      return (result.data?.delete_nchat_reactions?.affected_rows ?? 0) > 0;
    },
    [user, removeMutation],
  );

  const toggleReaction = useCallback(
    async (messageId: string, emoji: string): Promise<boolean> => {
      if (!user) {
        throw new Error("Must be logged in to toggle a reaction");
      }

      const { data } = await checkReaction({
        variables: {
          messageId,
          userId: user.id,
          emoji,
        },
      });

      const hasReacted = (data?.nchat_reactions?.length ?? 0) > 0;

      if (hasReacted) {
        await removeReaction(messageId, emoji);
        return false;
      } else {
        await addReaction(messageId, emoji);
        return true;
      }
    },
    [user, checkReaction, addReaction, removeReaction],
  );

  const clearReactions = useCallback(
    async (messageId: string): Promise<number> => {
      const result = await clearMutation({
        variables: { messageId },
        update: (cache) => {
          cache.modify({
            id: cache.identify({ __typename: "nchat_messages", id: messageId }),
            fields: {
              reactions() {
                return [];
              },
            },
          });
        },
      });

      return result.data?.delete_nchat_reactions?.affected_rows ?? 0;
    },
    [clearMutation],
  );

  const removeUserReactions = useCallback(
    async (messageId: string): Promise<number> => {
      if (!user) {
        throw new Error("Must be logged in to remove reactions");
      }

      const result = await removeUserMutation({
        variables: {
          messageId,
          userId: user.id,
        },
        update: (cache, { data }) => {
          if (data?.delete_nchat_reactions?.affected_rows) {
            cache.modify({
              id: cache.identify({
                __typename: "nchat_messages",
                id: messageId,
              }),
              fields: {
                reactions(existingReactions = [], { readField }) {
                  return existingReactions.filter(
                    (reactionRef: { __ref: string }) =>
                      readField("user_id", reactionRef) !== user.id,
                  );
                },
              },
            });
          }
        },
      });

      return result.data?.delete_nchat_reactions?.affected_rows ?? 0;
    },
    [user, removeUserMutation],
  );

  const checkUserReaction = useCallback(
    async (messageId: string, emoji: string): Promise<boolean> => {
      if (!user) return false;

      const { data } = await checkReaction({
        variables: {
          messageId,
          userId: user.id,
          emoji,
        },
      });

      return (data?.nchat_reactions?.length ?? 0) > 0;
    },
    [user, checkReaction],
  );

  return {
    addReaction,
    removeReaction,
    toggleReaction,
    clearReactions,
    removeUserReactions,
    checkUserReaction,
    loading: addLoading || removeLoading || clearLoading || removeUserLoading,
    error: addError ?? removeError ?? clearError ?? removeUserError,
  };
}

/**
 * Get popular reactions used in a channel
 */
export function usePopularReactions(
  channelId: string,
  limit = 10,
): UsePopularReactionsReturn {
  const { data, loading, error } = useQuery(GET_POPULAR_REACTIONS, {
    variables: { channelId, limit },
    skip: !channelId,
  });

  const popularEmojis = useMemo(() => {
    return data?.nchat_reactions?.map((r: { emoji: string }) => r.emoji) ?? [];
  }, [data]);

  return {
    popularEmojis,
    loading,
    error,
  };
}

/**
 * Get user's frequently used reactions
 */
export function useFrequentReactions(limit = 10): UseFrequentReactionsReturn {
  const { user } = useAuth();

  const { data, loading, error } = useQuery(GET_USER_FREQUENT_REACTIONS, {
    variables: { userId: user?.id, limit },
    skip: !user?.id,
  });

  const frequentEmojis = useMemo(() => {
    return data?.nchat_reactions?.map((r: { emoji: string }) => r.emoji) ?? [];
  }, [data]);

  return {
    frequentEmojis,
    loading,
    error,
  };
}

/**
 * Subscribe to reaction changes in a channel
 */
export function useChannelReactionsSubscription(
  channelId: string,
  options?: {
    onReactionAdded?: (reaction: Reaction) => void;
    onReactionRemoved?: (reactionId: string, messageId: string) => void;
  },
) {
  useSubscription(CHANNEL_REACTIONS_SUBSCRIPTION, {
    variables: { channelId },
    skip: !channelId,
    onData: ({ data }) => {
      if (data.data?.nchat_reactions?.[0] && options?.onReactionAdded) {
        options.onReactionAdded(data.data.nchat_reactions[0]);
      }
    },
  });
}

export default useReactions;
