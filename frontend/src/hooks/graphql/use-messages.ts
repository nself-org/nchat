"use client";

import { useCallback, useMemo } from "react";
import {
  useQuery,
  useMutation,
  useSubscription,
  type ApolloError,
} from "@apollo/client";
import { useAuth } from "@/contexts/auth-context";
import {
  GET_MESSAGES,
  GET_MESSAGE,
  GET_PINNED_MESSAGES,
  GET_MESSAGES_AROUND,
  SEND_MESSAGE,
  EDIT_MESSAGE,
  DELETE_MESSAGE,
  PIN_MESSAGE,
  UNPIN_MESSAGE,
  FORWARD_MESSAGE,
  BULK_DELETE_MESSAGES,
  MESSAGE_SUBSCRIPTION,
  MESSAGE_UPDATED_SUBSCRIPTION,
  MESSAGE_DELETED_SUBSCRIPTION,
  type GetMessagesVariables,
  type SendMessageVariables,
  type EditMessageVariables,
  type PinMessageVariables,
} from "@/graphql/messages";
import { MESSAGE_FULL_FRAGMENT } from "@/graphql/fragments";

// ============================================================================
// TYPES
// ============================================================================

export interface MessageUser {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  email?: string;
  bio?: string;
  status?: string;
  status_emoji?: string;
}

export interface MessageAttachment {
  id: string;
  message_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  thumbnail_url?: string;
  width?: number;
  height?: number;
  duration?: number;
  metadata?: Record<string, unknown>;
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
  user: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
}

export interface MessageMention {
  id: string;
  user_id: string;
  user: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
}

export interface Message {
  id: string;
  channel_id: string;
  user_id: string;
  thread_id?: string;
  parent_id?: string;
  forwarded_from_id?: string;
  content: string;
  type:
    | "text"
    | "image"
    | "file"
    | "video"
    | "audio"
    | "system"
    | "code"
    | "forwarded";
  is_edited: boolean;
  is_pinned: boolean;
  is_deleted: boolean;
  metadata?: Record<string, unknown>;
  created_at: string;
  edited_at?: string;
  deleted_at?: string;
  user: MessageUser;
  parent?: {
    id: string;
    content: string;
    user: {
      id: string;
      username: string;
      display_name: string;
      avatar_url?: string;
    };
  };
  attachments: MessageAttachment[];
  reactions: MessageReaction[];
  reactions_aggregate?: {
    aggregate: {
      count: number;
    };
  };
  replies_aggregate?: {
    aggregate: {
      count: number;
    };
  };
  mentions: MessageMention[];
}

export interface UseMessagesOptions {
  channelId: string;
  limit?: number;
  autoSubscribe?: boolean;
}

export interface UseMessagesReturn {
  messages: Message[];
  totalCount: number;
  hasMore: boolean;
  loading: boolean;
  error: ApolloError | undefined;
  loadMore: () => Promise<void>;
  loadPrevious: () => Promise<void>;
  refetch: () => Promise<void>;
}

export interface UseMessageReturn {
  message: Message | null;
  loading: boolean;
  error: ApolloError | undefined;
  refetch: () => Promise<void>;
}

export interface UseSendMessageReturn {
  sendMessage: (
    variables: Omit<SendMessageVariables, "userId">,
  ) => Promise<Message | null>;
  loading: boolean;
  error: ApolloError | undefined;
}

export interface UseEditMessageReturn {
  editMessage: (variables: EditMessageVariables) => Promise<Message | null>;
  loading: boolean;
  error: ApolloError | undefined;
}

export interface UseDeleteMessageReturn {
  deleteMessage: (messageId: string) => Promise<boolean>;
  bulkDeleteMessages: (messageIds: string[]) => Promise<number>;
  loading: boolean;
  error: ApolloError | undefined;
}

export interface UsePinMessageReturn {
  pinMessage: (messageId: string) => Promise<boolean>;
  unpinMessage: (messageId: string) => Promise<boolean>;
  loading: boolean;
  error: ApolloError | undefined;
}

export interface UseForwardMessageReturn {
  forwardMessage: (
    originalMessageId: string,
    targetChannelId: string,
    comment?: string,
  ) => Promise<Message | null>;
  loading: boolean;
  error: ApolloError | undefined;
}

export interface UsePinnedMessagesReturn {
  pinnedMessages: Message[];
  loading: boolean;
  error: ApolloError | undefined;
  refetch: () => Promise<void>;
}

export interface UseMessagesAroundReturn {
  before: Message[];
  target: Message | null;
  after: Message[];
  loading: boolean;
  error: ApolloError | undefined;
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Fetch messages for a channel with pagination and real-time updates
 */
export function useMessages({
  channelId,
  limit = 50,
  autoSubscribe = true,
}: UseMessagesOptions): UseMessagesReturn {
  // Fetch messages
  const { data, loading, error, fetchMore, refetch } = useQuery(GET_MESSAGES, {
    variables: { channelId, limit, offset: 0 },
    skip: !channelId,
    fetchPolicy: "cache-and-network",
  });

  // Subscribe to new messages
  useSubscription(MESSAGE_SUBSCRIPTION, {
    variables: { channelId },
    skip: !channelId || !autoSubscribe,
    onData: ({ client, data: subData }) => {
      if (subData.data?.nchat_messages?.[0]) {
        const newMessage = subData.data.nchat_messages[0];

        // Update cache with new message
        client.cache.modify({
          fields: {
            nchat_messages(existingMessages = [], { readField, toReference }) {
              const exists = existingMessages.some(
                (msgRef: { __ref: string }) =>
                  readField("id", msgRef) === newMessage.id,
              );
              if (exists) return existingMessages;

              const newRef = toReference(newMessage);
              return [newRef, ...existingMessages];
            },
          },
        });
      }
    },
  });

  // Subscribe to message updates
  useSubscription(MESSAGE_UPDATED_SUBSCRIPTION, {
    variables: { channelId },
    skip: !channelId || !autoSubscribe,
  });

  // Subscribe to message deletions
  useSubscription(MESSAGE_DELETED_SUBSCRIPTION, {
    variables: { channelId },
    skip: !channelId || !autoSubscribe,
  });

  // Sort messages by created_at descending (newest first)
  const messages = useMemo(() => {
    const msgs = data?.nchat_messages ?? [];
    return [...msgs].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [data]);

  const totalCount = data?.nchat_messages_aggregate?.aggregate?.count ?? 0;
  const hasMore = messages.length < totalCount;

  // Load more messages (older)
  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;

    await fetchMore({
      variables: {
        channelId,
        limit,
        offset: messages.length,
      },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev;

        return {
          ...fetchMoreResult,
          nchat_messages: [
            ...prev.nchat_messages,
            ...fetchMoreResult.nchat_messages,
          ],
          nchat_messages_aggregate: fetchMoreResult.nchat_messages_aggregate,
        };
      },
    });
  }, [channelId, limit, messages.length, hasMore, loading, fetchMore]);

  // Load previous messages (for bidirectional scrolling)
  const loadPrevious = useCallback(async () => {
    const newestMessage = messages[0];
    if (!newestMessage) return;

    await fetchMore({
      variables: {
        channelId,
        limit,
        after: newestMessage.created_at,
      },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev;

        return {
          ...fetchMoreResult,
          nchat_messages: [
            ...fetchMoreResult.nchat_messages,
            ...prev.nchat_messages,
          ],
          nchat_messages_aggregate: prev.nchat_messages_aggregate,
        };
      },
    });
  }, [channelId, limit, messages, fetchMore]);

  return {
    messages,
    totalCount,
    hasMore,
    loading,
    error,
    loadMore,
    loadPrevious,
    refetch: async () => {
      await refetch();
    },
  };
}

/**
 * Fetch a single message by ID
 */
export function useMessage(messageId: string): UseMessageReturn {
  const { data, loading, error, refetch } = useQuery(GET_MESSAGE, {
    variables: { id: messageId },
    skip: !messageId,
  });

  return {
    message: data?.nchat_messages_by_pk ?? null,
    loading,
    error,
    refetch: async () => {
      await refetch();
    },
  };
}

/**
 * Send a new message
 */
export function useSendMessage(): UseSendMessageReturn {
  const { user } = useAuth();
  const [sendMessageMutation, { loading, error }] = useMutation(SEND_MESSAGE);

  const sendMessage = useCallback(
    async (
      variables: Omit<SendMessageVariables, "userId">,
    ): Promise<Message | null> => {
      if (!user) {
        throw new Error("Must be logged in to send a message");
      }

      const result = await sendMessageMutation({
        variables: {
          ...variables,
          userId: user.id,
        },
        optimisticResponse: {
          insert_nchat_messages_one: {
            __typename: "nchat_messages",
            id: `temp-${Date.now()}`,
            channel_id: variables.channelId,
            user_id: user.id,
            thread_id: variables.threadId ?? null,
            parent_id: variables.parentId ?? null,
            forwarded_from_id: null,
            content: variables.content,
            type: variables.type ?? "text",
            is_edited: false,
            is_pinned: false,
            is_deleted: false,
            metadata: variables.metadata ?? null,
            created_at: new Date().toISOString(),
            edited_at: null,
            deleted_at: null,
            user: {
              __typename: "nchat_users",
              id: user.id,
              username: user.username,
              display_name: user.displayName,
              email: user.email,
              avatar_url: user.avatarUrl,
              bio: null,
              status: null,
              status_emoji: null,
              status_expires_at: null,
              timezone: null,
              locale: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            parent: null,
            attachments: [],
            reactions: [],
            reactions_aggregate: {
              __typename: "nchat_reactions_aggregate",
              aggregate: {
                __typename: "nchat_reactions_aggregate_fields",
                count: 0,
              },
            },
            replies_aggregate: {
              __typename: "nchat_messages_aggregate",
              aggregate: {
                __typename: "nchat_messages_aggregate_fields",
                count: 0,
              },
            },
            mentions: [],
          },
        },
        update: (cache, { data }) => {
          if (data?.insert_nchat_messages_one) {
            const newMessage = data.insert_nchat_messages_one;

            // Add to channel messages
            cache.modify({
              fields: {
                nchat_messages(
                  existingMessages = [],
                  { readField, toReference },
                ) {
                  const exists = existingMessages.some(
                    (msgRef: { __ref: string }) =>
                      readField("id", msgRef) === newMessage.id,
                  );
                  if (exists) return existingMessages;

                  const newRef = toReference(newMessage);
                  return [newRef, ...existingMessages];
                },
              },
            });
          }
        },
      });

      return result.data?.insert_nchat_messages_one ?? null;
    },
    [user, sendMessageMutation],
  );

  return {
    sendMessage,
    loading,
    error,
  };
}

/**
 * Edit an existing message
 */
export function useEditMessage(): UseEditMessageReturn {
  const [editMessageMutation, { loading, error }] = useMutation(EDIT_MESSAGE);

  const editMessage = useCallback(
    async (variables: EditMessageVariables): Promise<Message | null> => {
      const result = await editMessageMutation({
        variables,
        optimisticResponse: {
          update_nchat_messages_by_pk: {
            __typename: "nchat_messages",
            id: variables.id,
            content: variables.content,
            is_edited: true,
            edited_at: new Date().toISOString(),
          },
        },
      });

      return result.data?.update_nchat_messages_by_pk ?? null;
    },
    [editMessageMutation],
  );

  return {
    editMessage,
    loading,
    error,
  };
}

/**
 * Delete messages (soft delete or bulk delete)
 */
export function useDeleteMessage(): UseDeleteMessageReturn {
  const [
    deleteMessageMutation,
    { loading: deleteLoading, error: deleteError },
  ] = useMutation(DELETE_MESSAGE);
  const [bulkDeleteMutation, { loading: bulkLoading, error: bulkError }] =
    useMutation(BULK_DELETE_MESSAGES);

  const deleteMessage = useCallback(
    async (messageId: string): Promise<boolean> => {
      const result = await deleteMessageMutation({
        variables: { id: messageId },
        optimisticResponse: {
          update_nchat_messages_by_pk: {
            __typename: "nchat_messages",
            id: messageId,
            is_deleted: true,
            deleted_at: new Date().toISOString(),
          },
        },
        update: (cache) => {
          cache.modify({
            fields: {
              nchat_messages(existingMessages = [], { readField }) {
                return existingMessages.filter(
                  (msgRef: { __ref: string }) =>
                    readField("id", msgRef) !== messageId,
                );
              },
            },
          });
        },
      });

      return result.data?.update_nchat_messages_by_pk?.is_deleted ?? false;
    },
    [deleteMessageMutation],
  );

  const bulkDeleteMessages = useCallback(
    async (messageIds: string[]): Promise<number> => {
      const result = await bulkDeleteMutation({
        variables: { ids: messageIds },
        update: (cache) => {
          cache.modify({
            fields: {
              nchat_messages(existingMessages = [], { readField }) {
                return existingMessages.filter(
                  (msgRef: { __ref: string }) =>
                    !messageIds.includes(readField("id", msgRef) as string),
                );
              },
            },
          });
        },
      });

      return result.data?.update_nchat_messages?.affected_rows ?? 0;
    },
    [bulkDeleteMutation],
  );

  return {
    deleteMessage,
    bulkDeleteMessages,
    loading: deleteLoading || bulkLoading,
    error: deleteError ?? bulkError,
  };
}

/**
 * Pin/unpin messages
 */
export function usePinMessage(): UsePinMessageReturn {
  const [pinMutation, { loading: pinLoading, error: pinError }] =
    useMutation(PIN_MESSAGE);
  const [unpinMutation, { loading: unpinLoading, error: unpinError }] =
    useMutation(UNPIN_MESSAGE);

  const pinMessage = useCallback(
    async (messageId: string): Promise<boolean> => {
      const result = await pinMutation({
        variables: { id: messageId },
        optimisticResponse: {
          update_nchat_messages_by_pk: {
            __typename: "nchat_messages",
            id: messageId,
            is_pinned: true,
          },
        },
      });

      return result.data?.update_nchat_messages_by_pk?.is_pinned ?? false;
    },
    [pinMutation],
  );

  const unpinMessage = useCallback(
    async (messageId: string): Promise<boolean> => {
      const result = await unpinMutation({
        variables: { id: messageId },
        optimisticResponse: {
          update_nchat_messages_by_pk: {
            __typename: "nchat_messages",
            id: messageId,
            is_pinned: false,
          },
        },
      });

      return !(result.data?.update_nchat_messages_by_pk?.is_pinned ?? true);
    },
    [unpinMutation],
  );

  return {
    pinMessage,
    unpinMessage,
    loading: pinLoading || unpinLoading,
    error: pinError ?? unpinError,
  };
}

/**
 * Forward a message to another channel
 */
export function useForwardMessage(): UseForwardMessageReturn {
  const { user } = useAuth();
  const [forwardMutation, { loading, error }] = useMutation(FORWARD_MESSAGE);

  const forwardMessage = useCallback(
    async (
      originalMessageId: string,
      targetChannelId: string,
      comment?: string,
    ): Promise<Message | null> => {
      if (!user) {
        throw new Error("Must be logged in to forward a message");
      }

      const result = await forwardMutation({
        variables: {
          originalMessageId,
          targetChannelId,
          userId: user.id,
          comment,
        },
      });

      return result.data?.insert_nchat_messages_one ?? null;
    },
    [user, forwardMutation],
  );

  return {
    forwardMessage,
    loading,
    error,
  };
}

/**
 * Get pinned messages for a channel
 */
export function usePinnedMessages(channelId: string): UsePinnedMessagesReturn {
  const { data, loading, error, refetch } = useQuery(GET_PINNED_MESSAGES, {
    variables: { channelId },
    skip: !channelId,
  });

  return {
    pinnedMessages: data?.nchat_messages ?? [],
    loading,
    error,
    refetch: async () => {
      await refetch();
    },
  };
}

/**
 * Get messages around a specific message (for jump-to-message)
 */
export function useMessagesAround(
  channelId: string,
  messageId: string,
  limit = 25,
): UseMessagesAroundReturn {
  const { data, loading, error } = useQuery(GET_MESSAGES_AROUND, {
    variables: { channelId, messageId, limit },
    skip: !channelId || !messageId,
  });

  return {
    before: data?.before ?? [],
    target: data?.target ?? null,
    after: data?.after ?? [],
    loading,
    error,
  };
}

/**
 * Subscribe to real-time message updates for a channel
 */
export function useMessageSubscription(
  channelId: string,
  options?: {
    onNewMessage?: (message: Message) => void;
    onMessageUpdated?: (message: Message) => void;
    onMessageDeleted?: (messageId: string) => void;
  },
) {
  // New messages
  useSubscription(MESSAGE_SUBSCRIPTION, {
    variables: { channelId },
    skip: !channelId,
    onData: ({ data }) => {
      if (data.data?.nchat_messages?.[0] && options?.onNewMessage) {
        options.onNewMessage(data.data.nchat_messages[0]);
      }
    },
  });

  // Updated messages
  useSubscription(MESSAGE_UPDATED_SUBSCRIPTION, {
    variables: { channelId },
    skip: !channelId,
    onData: ({ data }) => {
      if (data.data?.nchat_messages?.[0] && options?.onMessageUpdated) {
        options.onMessageUpdated(data.data.nchat_messages[0]);
      }
    },
  });

  // Deleted messages
  useSubscription(MESSAGE_DELETED_SUBSCRIPTION, {
    variables: { channelId },
    skip: !channelId,
    onData: ({ data }) => {
      if (data.data?.nchat_messages?.[0] && options?.onMessageDeleted) {
        options.onMessageDeleted(data.data.nchat_messages[0].id);
      }
    },
  });
}

export default useMessages;
