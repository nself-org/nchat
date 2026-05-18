"use client";

/**
 * Enhanced Message Operations Hooks
 *
 * React hooks for messaging features with real GraphQL integration,
 * optimistic updates, and comprehensive error handling.
 */

import {
  useQuery,
  useMutation,
  useSubscription,
  useApolloClient,
} from "@apollo/client";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useAuth } from "@/contexts/auth-context";
import { logger } from "@/lib/logger";
import { useToast } from "@/hooks/use-toast";
import type {
  Message,
  Reaction,
  MessageType,
  Attachment,
} from "@/types/message";

import {
  GET_MESSAGES,
  GET_MESSAGE,
  GET_THREAD_MESSAGES,
  GET_PINNED_MESSAGES,
  GET_MESSAGES_AROUND,
  SEARCH_MESSAGES,
} from "@/graphql/messages/queries";

import {
  SEND_MESSAGE,
  UPDATE_MESSAGE,
  SOFT_DELETE_MESSAGE,
  PIN_MESSAGE,
  UNPIN_MESSAGE,
  ADD_REACTION,
  REMOVE_REACTION,
  BOOKMARK_MESSAGE,
  REMOVE_BOOKMARK,
  MARK_MESSAGE_READ,
  FORWARD_MESSAGE,
} from "@/graphql/messages/mutations";

import {
  MESSAGE_SUBSCRIPTION,
  MESSAGE_UPDATED_SUBSCRIPTION,
  MESSAGE_DELETED_SUBSCRIPTION,
  MESSAGE_REACTIONS_SUBSCRIPTION,
  TYPING_SUBSCRIPTION,
} from "@/graphql/messages/subscriptions";

// ============================================================================
// TYPES
// ============================================================================

export interface UseMessagesOptions {
  channelId: string;
  limit?: number;
  enabled?: boolean;
}

export interface UseMessagesReturn {
  messages: Message[];
  loading: boolean;
  error: Error | null;
  totalCount: number;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  loadingMore: boolean;
  refetch: () => Promise<void>;
}

export interface UseMessageActionsReturn {
  sendMessage: (
    content: string,
    options?: SendMessageOptions,
  ) => Promise<Message | null>;
  updateMessage: (
    messageId: string,
    content: string,
  ) => Promise<Message | null>;
  deleteMessage: (messageId: string, soft?: boolean) => Promise<boolean>;
  pinMessage: (messageId: string) => Promise<boolean>;
  unpinMessage: (messageId: string) => Promise<boolean>;
  addReaction: (messageId: string, emoji: string) => Promise<boolean>;
  removeReaction: (messageId: string, emoji: string) => Promise<boolean>;
  toggleReaction: (messageId: string, emoji: string) => Promise<boolean>;
  bookmarkMessage: (messageId: string, note?: string) => Promise<boolean>;
  removeBookmark: (messageId: string) => Promise<boolean>;
  forwardMessage: (
    messageId: string,
    targetChannelId: string,
    comment?: string,
  ) => Promise<Message | null>;
  markAsRead: (messageId: string) => Promise<void>;
  sending: boolean;
  updating: boolean;
  deleting: boolean;
}

export interface SendMessageOptions {
  threadId?: string;
  parentMessageId?: string;
  mentions?: string[];
  metadata?: Record<string, unknown>;
}

// ============================================================================
// MAIN HOOK: useMessages
// ============================================================================

/**
 * Hook for fetching and managing messages in a channel
 */
export function useMessagesV2(options: UseMessagesOptions): UseMessagesReturn {
  const { channelId, limit = 50, enabled = true } = options;
  const [loadingMore, setLoadingMore] = useState(false);

  // Main query for messages
  const { data, loading, error, fetchMore, refetch } = useQuery(GET_MESSAGES, {
    variables: { channelId, limit, offset: 0 },
    skip: !channelId || !enabled,
    fetchPolicy: "cache-and-network",
    notifyOnNetworkStatusChange: true,
  });

  // Subscribe to new messages
  const { data: newMessageData } = useSubscription(MESSAGE_SUBSCRIPTION, {
    variables: { channelId },
    skip: !channelId || !enabled,
  });

  // Subscribe to message updates
  const { data: updatedMessageData } = useSubscription(
    MESSAGE_UPDATED_SUBSCRIPTION,
    {
      variables: { channelId },
      skip: !channelId || !enabled,
    },
  );

  // Subscribe to message deletions
  const { data: deletedMessageData } = useSubscription(
    MESSAGE_DELETED_SUBSCRIPTION,
    {
      variables: { channelId },
      skip: !channelId || !enabled,
    },
  );

  // Transform messages
  const messages = useMemo(() => {
    const rawMessages = data?.nchat_messages || [];
    return rawMessages.map(transformMessage);
  }, [data?.nchat_messages]);

  const totalCount = data?.nchat_messages_aggregate?.aggregate?.count || 0;
  const hasMore = messages.length < totalCount;

  // Load more messages
  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore) return;

    setLoadingMore(true);
    try {
      await fetchMore({
        variables: {
          offset: messages.length,
        },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult) return prev;
          return {
            ...prev,
            nchat_messages: [
              ...prev.nchat_messages,
              ...fetchMoreResult.nchat_messages,
            ],
          };
        },
      });
    } catch (err) {
      logger.error("Failed to load more messages", err as Error);
    } finally {
      setLoadingMore(false);
    }
  }, [fetchMore, hasMore, loadingMore, messages.length]);

  // Refetch handler
  const handleRefetch = useCallback(async () => {
    try {
      await refetch();
    } catch (err) {
      logger.error("Failed to refetch messages", err as Error);
    }
  }, [refetch]);

  return {
    messages,
    loading: loading && messages.length === 0,
    error: error || null,
    totalCount,
    hasMore,
    loadMore,
    loadingMore,
    refetch: handleRefetch,
  };
}

// ============================================================================
// HOOK: useMessageActions
// ============================================================================

/**
 * Hook for message actions (send, edit, delete, react, etc.)
 */
export function useMessageActions(channelId: string): UseMessageActionsReturn {
  const { user } = useAuth();
  const { toast } = useToast();
  const client = useApolloClient();

  // Mutations
  const [sendMutation, { loading: sending }] = useMutation(SEND_MESSAGE);
  const [updateMutation, { loading: updating }] = useMutation(UPDATE_MESSAGE);
  const [deleteMutation, { loading: deleting }] =
    useMutation(SOFT_DELETE_MESSAGE);
  const [pinMutation] = useMutation(PIN_MESSAGE);
  const [unpinMutation] = useMutation(UNPIN_MESSAGE);
  const [addReactionMutation] = useMutation(ADD_REACTION);
  const [removeReactionMutation] = useMutation(REMOVE_REACTION);
  const [bookmarkMutation] = useMutation(BOOKMARK_MESSAGE);
  const [removeBookmarkMutation] = useMutation(REMOVE_BOOKMARK);
  const [forwardMutation] = useMutation(FORWARD_MESSAGE);
  const [markReadMutation] = useMutation(MARK_MESSAGE_READ);

  // Send message
  const sendMessage = useCallback(
    async (
      content: string,
      options: SendMessageOptions = {},
    ): Promise<Message | null> => {
      if (!user?.id) {
        toast({
          title: "Error",
          description: "You must be logged in to send messages",
          variant: "destructive",
        });
        return null;
      }

      try {
        logger.debug("Sending message", { channelId, userId: user.id });

        const { data } = await sendMutation({
          variables: {
            channelId,
            userId: user.id,
            content,
            threadId: options.threadId,
            parentMessageId: options.parentMessageId,
            mentions: options.mentions,
            metadata: options.metadata,
          },
          optimisticResponse: {
            insert_nchat_messages_one: {
              __typename: "nchat_messages",
              id: `temp-${Date.now()}`,
              channel_id: channelId,
              user_id: user.id,
              content,
              type: "text",
              is_edited: false,
              is_pinned: false,
              is_deleted: false,
              created_at: new Date().toISOString(),
              edited_at: null,
              deleted_at: null,
              metadata: options.metadata || {},
              user: {
                __typename: "nchat_users",
                id: user.id,
                username: user.email?.split("@")[0] || "user",
                display_name: user.displayName || "User",
                avatar_url: user.avatarUrl || null,
              },
              reactions: [],
              reactions_aggregate: { aggregate: { count: 0 } },
              attachments: [],
              replies_aggregate: { aggregate: { count: 0 } },
              mentions: [],
              parent: null,
            },
          },
          update: (cache, { data: mutationData }) => {
            // Update the messages list in cache
            const existingData = cache.readQuery({
              query: GET_MESSAGES,
              variables: { channelId, limit: 50, offset: 0 },
            });

            if (existingData && mutationData?.insert_nchat_messages_one) {
              cache.writeQuery({
                query: GET_MESSAGES,
                variables: { channelId, limit: 50, offset: 0 },
                data: {
                  ...existingData,
                  nchat_messages: [
                    mutationData.insert_nchat_messages_one,
                    ...(existingData as { nchat_messages: unknown[] })
                      .nchat_messages,
                  ],
                },
              });
            }
          },
        });

        const message = transformMessage(data?.insert_nchat_messages_one);
        logger.info("Message sent", { messageId: message.id });
        return message;
      } catch (err) {
        logger.error("Failed to send message", err as Error);
        toast({
          title: "Failed to send message",
          description: "Please try again",
          variant: "destructive",
        });
        return null;
      }
    },
    [channelId, user, sendMutation, toast],
  );

  // Update message
  const updateMessage = useCallback(
    async (messageId: string, content: string): Promise<Message | null> => {
      if (!user?.id) return null;

      try {
        logger.debug("Updating message", { messageId });

        const { data } = await updateMutation({
          variables: { id: messageId, content },
          optimisticResponse: {
            update_nchat_messages_by_pk: {
              __typename: "nchat_messages",
              id: messageId,
              content,
              is_edited: true,
              edited_at: new Date().toISOString(),
            },
          },
        });

        toast({
          title: "Message updated",
          description: "Your message has been edited",
        });

        return transformMessage(data?.update_nchat_messages_by_pk);
      } catch (err) {
        logger.error("Failed to update message", err as Error);
        toast({
          title: "Failed to update message",
          description: "Please try again",
          variant: "destructive",
        });
        return null;
      }
    },
    [user, updateMutation, toast],
  );

  // Delete message
  const deleteMessage = useCallback(
    async (messageId: string, _soft = true): Promise<boolean> => {
      if (!user?.id) return false;

      try {
        logger.debug("Deleting message", { messageId });

        await deleteMutation({
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
              id: `nchat_messages:${messageId}`,
              fields: {
                is_deleted: () => true,
                content: () => "[This message has been deleted]",
              },
            });
          },
        });

        toast({
          title: "Message deleted",
          description: "Your message has been removed",
        });

        return true;
      } catch (err) {
        logger.error("Failed to delete message", err as Error);
        toast({
          title: "Failed to delete message",
          description: "Please try again",
          variant: "destructive",
        });
        return false;
      }
    },
    [user, deleteMutation, toast],
  );

  // Pin message
  const pinMessage = useCallback(
    async (messageId: string): Promise<boolean> => {
      if (!user?.id) return false;

      try {
        await pinMutation({
          variables: { messageId, channelId, userId: user.id },
        });

        toast({
          title: "Message pinned",
          description: "This message has been pinned to the channel",
        });

        return true;
      } catch (err) {
        logger.error("Failed to pin message", err as Error);
        toast({
          title: "Failed to pin message",
          description: "Please try again",
          variant: "destructive",
        });
        return false;
      }
    },
    [user, channelId, pinMutation, toast],
  );

  // Unpin message
  const unpinMessage = useCallback(
    async (messageId: string): Promise<boolean> => {
      if (!user?.id) return false;

      try {
        await unpinMutation({
          variables: { messageId, channelId },
        });

        toast({
          title: "Message unpinned",
          description: "This message has been unpinned",
        });

        return true;
      } catch (err) {
        logger.error("Failed to unpin message", err as Error);
        toast({
          title: "Failed to unpin message",
          description: "Please try again",
          variant: "destructive",
        });
        return false;
      }
    },
    [user, channelId, unpinMutation, toast],
  );

  // Add reaction
  const addReaction = useCallback(
    async (messageId: string, emoji: string): Promise<boolean> => {
      if (!user?.id) return false;

      try {
        await addReactionMutation({
          variables: { messageId, userId: user.id, emoji },
          optimisticResponse: {
            insert_nchat_reactions_one: {
              __typename: "nchat_reactions",
              id: `temp-${Date.now()}`,
              emoji,
              message_id: messageId,
              user_id: user.id,
              created_at: new Date().toISOString(),
              user: {
                __typename: "nchat_users",
                id: user.id,
                username: user.email?.split("@")[0] || "user",
                display_name: user.displayName || "User",
                avatar_url: user.avatarUrl || null,
              },
            },
            update_nchat_messages_by_pk: {
              __typename: "nchat_messages",
              id: messageId,
              reaction_count: 1,
            },
          },
        });

        return true;
      } catch (err) {
        logger.error("Failed to add reaction", err as Error);
        return false;
      }
    },
    [user, addReactionMutation],
  );

  // Remove reaction
  const removeReaction = useCallback(
    async (messageId: string, emoji: string): Promise<boolean> => {
      if (!user?.id) return false;

      try {
        await removeReactionMutation({
          variables: { messageId, userId: user.id, emoji },
        });

        return true;
      } catch (err) {
        logger.error("Failed to remove reaction", err as Error);
        return false;
      }
    },
    [user, removeReactionMutation],
  );

  // Toggle reaction
  const toggleReaction = useCallback(
    async (messageId: string, emoji: string): Promise<boolean> => {
      if (!user?.id) return false;

      // Check if user already reacted with this emoji
      // This would require checking the cache or making a query
      // For simplicity, try to add first, if it fails (duplicate), remove
      try {
        const added = await addReaction(messageId, emoji);
        return added;
      } catch {
        // Likely already reacted, try to remove
        return removeReaction(messageId, emoji);
      }
    },
    [user, addReaction, removeReaction],
  );

  // Bookmark message
  const bookmarkMessage = useCallback(
    async (messageId: string, note?: string): Promise<boolean> => {
      if (!user?.id) return false;

      try {
        await bookmarkMutation({
          variables: { messageId, userId: user.id, note },
        });

        toast({
          title: "Message bookmarked",
          description: "This message has been saved to your bookmarks",
        });

        return true;
      } catch (err) {
        logger.error("Failed to bookmark message", err as Error);
        toast({
          title: "Failed to bookmark",
          description: "Please try again",
          variant: "destructive",
        });
        return false;
      }
    },
    [user, bookmarkMutation, toast],
  );

  // Remove bookmark
  const removeBookmark = useCallback(
    async (messageId: string): Promise<boolean> => {
      if (!user?.id) return false;

      try {
        await removeBookmarkMutation({
          variables: { messageId, userId: user.id },
        });

        toast({
          title: "Bookmark removed",
          description: "This message has been removed from your bookmarks",
        });

        return true;
      } catch (err) {
        logger.error("Failed to remove bookmark", err as Error);
        return false;
      }
    },
    [user, removeBookmarkMutation, toast],
  );

  // Forward message
  const forwardMessage = useCallback(
    async (
      messageId: string,
      targetChannelId: string,
      comment?: string,
    ): Promise<Message | null> => {
      if (!user?.id) return null;

      try {
        const { data } = await forwardMutation({
          variables: {
            originalMessageId: messageId,
            targetChannelId,
            userId: user.id,
            comment,
          },
        });

        toast({
          title: "Message forwarded",
          description: "The message has been sent to the selected channel",
        });

        return transformMessage(data?.insert_nchat_messages_one);
      } catch (err) {
        logger.error("Failed to forward message", err as Error);
        toast({
          title: "Failed to forward",
          description: "Please try again",
          variant: "destructive",
        });
        return null;
      }
    },
    [user, forwardMutation, toast],
  );

  // Mark as read
  const markAsRead = useCallback(
    async (messageId: string): Promise<void> => {
      if (!user?.id) return;

      try {
        await markReadMutation({
          variables: { channelId, userId: user.id, messageId },
        });
      } catch (err) {
        logger.error("Failed to mark message as read", err as Error);
      }
    },
    [user, channelId, markReadMutation],
  );

  return {
    sendMessage,
    updateMessage,
    deleteMessage,
    pinMessage,
    unpinMessage,
    addReaction,
    removeReaction,
    toggleReaction,
    bookmarkMessage,
    removeBookmark,
    forwardMessage,
    markAsRead,
    sending,
    updating,
    deleting,
  };
}

// ============================================================================
// HOOK: useTypingIndicator
// ============================================================================

export interface TypingUser {
  id: string;
  displayName: string;
  avatarUrl?: string;
}

export function useTypingIndicator(channelId: string) {
  const { user } = useAuth();
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Subscribe to typing indicators
  const { data } = useSubscription(TYPING_SUBSCRIPTION, {
    variables: { channelId },
    skip: !channelId,
  });

  // Update typing users from subscription
  useEffect(() => {
    if (data?.nchat_typing_indicators) {
      const users = data.nchat_typing_indicators
        .filter((t: { user_id: string }) => t.user_id !== user?.id)
        .map(
          (t: {
            user: { id: string; display_name: string; avatar_url?: string };
          }) => ({
            id: t.user.id,
            displayName: t.user.display_name,
            avatarUrl: t.user.avatar_url,
          }),
        );
      setTypingUsers(users);
    }
  }, [data, user?.id]);

  // Format typing indicator text
  const typingText = useMemo(() => {
    if (typingUsers.length === 0) return "";
    if (typingUsers.length === 1)
      return `${typingUsers[0].displayName} is typing...`;
    if (typingUsers.length === 2) {
      return `${typingUsers[0].displayName} and ${typingUsers[1].displayName} are typing...`;
    }
    return `${typingUsers[0].displayName} and ${typingUsers.length - 1} others are typing...`;
  }, [typingUsers]);

  return {
    typingUsers,
    typingText,
    isTyping: typingUsers.length > 0,
  };
}

// ============================================================================
// HOOK: usePinnedMessages
// ============================================================================

export function usePinnedMessages(channelId: string) {
  const { data, loading, error, refetch } = useQuery(GET_PINNED_MESSAGES, {
    variables: { channelId },
    skip: !channelId,
  });

  const pinnedMessages = useMemo(() => {
    if (!data?.nchat_pinned_messages) return [];
    return data.nchat_pinned_messages.map((pin: unknown) => {
      const pinObj = pin as { message: unknown };
      return transformMessage(pinObj.message as Record<string, unknown>);
    });
  }, [data]);

  return {
    pinnedMessages,
    loading,
    error,
    refetch,
  };
}

// ============================================================================
// HOOK: useSearchMessages
// ============================================================================

export function useSearchMessages(channelId?: string) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const client = useApolloClient();

  const search = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const { data } = await client.query({
          query: SEARCH_MESSAGES,
          variables: {
            channelId,
            query: `%${searchQuery}%`,
            limit: 20,
            offset: 0,
          },
          fetchPolicy: "network-only",
        });

        setResults((data.nchat_messages || []).map(transformMessage));
      } catch (err) {
        logger.error("Search failed", err as Error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [client, channelId],
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      search(query);
    }, 300);

    return () => clearTimeout(timeout);
  }, [query, search]);

  return {
    query,
    setQuery,
    results,
    loading,
    search,
  };
}

// ============================================================================
// HELPER: Transform GraphQL data to Message type
// ============================================================================

function transformMessage(
  data: Record<string, unknown> | null | undefined,
): Message {
  if (!data) {
    return {
      id: "",
      channelId: "",
      content: "",
      type: "text",
      userId: "",
      user: { id: "", username: "", displayName: "" },
      createdAt: new Date(),
      isEdited: false,
    };
  }

  const messageType = (data.type as string) || "text";

  return {
    id: data.id as string,
    channelId: data.channel_id as string,
    content: data.content as string,
    contentHtml: data.content_html as string | undefined,
    type: messageType as MessageType,
    userId: data.user_id as string,
    user: transformUser(data.user as Record<string, unknown>),
    createdAt: new Date(data.created_at as string),
    updatedAt: data.updated_at
      ? new Date(data.updated_at as string)
      : undefined,
    isEdited: (data.is_edited as boolean) || false,
    editedAt: data.edited_at ? new Date(data.edited_at as string) : undefined,
    replyToId: data.parent_message_id as string | undefined,
    replyTo: data.parent
      ? transformMessage(data.parent as Record<string, unknown>)
      : undefined,
    parentThreadId: data.thread_id as string | undefined,
    attachments:
      data.attachments && Array.isArray(data.attachments as any)
        ? ((data.attachments as unknown[]) || []).map(transformAttachment)
        : [],
    reactions: data.reactions
      ? transformReactions(data.reactions as unknown[])
      : undefined,
    isPinned: (data.is_pinned as boolean) || false,
    isDeleted: (data.is_deleted as boolean) || false,
    deletedAt: data.deleted_at
      ? new Date(data.deleted_at as string)
      : undefined,
    mentionedUsers: data.mentions as string[] | undefined,
  };
}

function transformUser(
  data: Record<string, unknown> | null | undefined,
): Message["user"] {
  if (!data) {
    return { id: "", username: "", displayName: "" };
  }

  return {
    id: data.id as string,
    username: data.username as string,
    displayName: (data.display_name as string) || (data.username as string),
    avatarUrl: data.avatar_url as string | undefined,
  };
}

function transformAttachment(data: unknown): Attachment {
  const d = data as Record<string, unknown>;
  return {
    id: d.id as string,
    type: (d.type as "image" | "video" | "audio" | "file" | "link") || "file",
    url: (d.url as string) || (d.file_path as string),
    name: (d.filename as string) || (d.file_name as string),
    size: d.size_bytes as number | undefined,
    mimeType: d.mime_type as string | undefined,
    width: d.width as number | undefined,
    height: d.height as number | undefined,
    thumbnailUrl: d.thumbnail_url as string | undefined,
  };
}

function transformReactions(data: unknown[]): Reaction[] {
  const grouped = new Map<
    string,
    { emoji: string; users: Message["user"][] }
  >();

  for (const r of data as Record<string, unknown>[]) {
    const emoji = r.emoji as string;
    const user = transformUser(r.user as Record<string, unknown>);

    if (grouped.has(emoji)) {
      grouped.get(emoji)!.users.push(user);
    } else {
      grouped.set(emoji, { emoji, users: [user] });
    }
  }

  return Array.from(grouped.values()).map(({ emoji, users }) => ({
    emoji,
    count: users.length,
    users,
    hasReacted: false,
  }));
}

// Re-export the original hook name for backward compatibility
export { useMessagesV2 as useMessages };
