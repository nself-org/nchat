"use client";

/**
 * Channel Initialization Hook
 *
 * Handles initialization when a channel changes including:
 * - Loading messages
 * - Subscribing to channel events
 * - Marking as read
 * - Updating URL
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { useQuery, useSubscription, useMutation } from "@apollo/client";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useChat } from "@/contexts/chat-context";
import { useChannelStore } from "@/stores/channel-store";
import { useMessageStore } from "@/stores/message-store";
import { useNotificationStore } from "@/stores/notification-store";
import { useTypingStore } from "@/stores/typing-store";
import { useAppStore } from "@/stores/app-store";
import { GET_MESSAGES, MESSAGE_SUBSCRIPTION } from "@/graphql/queries/messages";
import type { Message } from "@/types/message";

import { logger } from "@/lib/logger";

// =============================================================================
// Types
// =============================================================================

export interface UseChannelInitOptions {
  /**
   * Channel ID to initialize
   */
  channelId: string | null;

  /**
   * Skip initialization
   */
  skip?: boolean;

  /**
   * Number of messages to load initially
   * @default 50
   */
  initialMessageCount?: number;

  /**
   * Auto-mark channel as read
   * @default true
   */
  autoMarkRead?: boolean;

  /**
   * Update URL when channel changes
   * @default true
   */
  updateUrl?: boolean;

  /**
   * Callback when messages are loaded
   */
  onMessagesLoaded?: (messages: Message[]) => void;

  /**
   * Callback when new message arrives
   */
  onNewMessage?: (message: Message) => void;

  /**
   * Callback on error
   */
  onError?: (error: Error) => void;
}

export interface UseChannelInitReturn {
  /**
   * Whether channel is loading
   */
  isLoading: boolean;

  /**
   * Whether channel is ready
   */
  isReady: boolean;

  /**
   * Whether there was an error
   */
  hasError: boolean;

  /**
   * Error if initialization failed
   */
  error: Error | null;

  /**
   * Loaded messages
   */
  messages: Message[];

  /**
   * Whether there are more messages to load
   */
  hasMore: boolean;

  /**
   * Load more messages (older)
   */
  loadMoreMessages: () => Promise<void>;

  /**
   * Refresh messages
   */
  refreshMessages: () => Promise<void>;

  /**
   * Mark channel as read
   */
  markAsRead: () => void;

  /**
   * Channel typing users
   */
  typingUsers: { id: string; displayName: string; avatarUrl?: string }[];

  /**
   * Start typing indicator
   */
  startTyping: () => void;

  /**
   * Stop typing indicator
   */
  stopTyping: () => void;
}

// =============================================================================
// GraphQL Mutation for marking as read
// =============================================================================

const MARK_CHANNEL_READ = `
  mutation MarkChannelRead($channelId: uuid!, $userId: uuid!, $messageId: uuid!) {
    update_nchat_channel_members(
      where: {
        channel_id: { _eq: $channelId }
        user_id: { _eq: $userId }
      }
      _set: {
        last_read_message_id: $messageId
        last_read_at: "now()"
      }
    ) {
      affected_rows
    }
  }
`;

// =============================================================================
// Hook
// =============================================================================

export function useChannelInit(
  options: UseChannelInitOptions,
): UseChannelInitReturn {
  const {
    channelId,
    skip = false,
    initialMessageCount = 50,
    autoMarkRead = true,
    updateUrl = true,
    onMessagesLoaded,
    onNewMessage,
    onError,
  } = options;

  // Contexts
  const { user } = useAuth();
  const { startTyping: chatStartTyping, stopTyping: chatStopTyping } =
    useChat();
  const router = useRouter();
  const pathname = usePathname();

  // Stores
  const channelStore = useChannelStore();
  const messageStore = useMessageStore();
  const notificationStore = useNotificationStore();
  const typingStore = useTypingStore();
  const appStore = useAppStore();

  // Local state
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const prevChannelIdRef = useRef<string | null>(null);
  const markReadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // =============================================================================
  // Queries
  // =============================================================================

  // Fetch messages for channel
  const {
    data: messagesData,
    loading: messagesLoading,
    error: messagesError,
    fetchMore,
    refetch: refetchMessages,
  } = useQuery(GET_MESSAGES, {
    skip: skip || !channelId || !user,
    variables: {
      channelId,
      limit: initialMessageCount,
      offset: 0,
    },
    fetchPolicy: "cache-and-network",
    notifyOnNetworkStatusChange: true,
    onCompleted: (data) => {
      if (data?.nchat_messages && channelId) {
        processMessages(channelId, data.nchat_messages);
      }
    },
    onError: (err) => {
      logger.error("[ChannelInit] Failed to load messages:", err);
      setError(err);
      onError?.(err);
    },
  });

  // =============================================================================
  // Subscriptions
  // =============================================================================

  // Subscribe to new messages
  const { data: subscriptionData } = useSubscription(MESSAGE_SUBSCRIPTION, {
    skip: skip || !channelId || !user,
    variables: { channelId },
    onData: ({ data }) => {
      if (data?.data?.nchat_messages?.[0] && channelId) {
        const newMessage = data.data.nchat_messages[0];
        handleNewMessage(channelId, newMessage);
      }
    },
  });

  // =============================================================================
  // Message Processing
  // =============================================================================

  const processMessages = useCallback(
    (chId: string, rawMessages: unknown[]) => {
      if (!rawMessages || !chId) return;

      const messages: Message[] = rawMessages.map(mapRawMessage);

      // Store messages
      messageStore.setMessages(chId, messages);

      // Determine if there are more messages
      const hasMore = messages.length >= initialMessageCount;
      messageStore.setHasMore(chId, hasMore);

      // Notify callback
      onMessagesLoaded?.(messages);

      setIsReady(true);
    },
    [messageStore, initialMessageCount, onMessagesLoaded],
  );

  const mapRawMessage = (raw: unknown): Message => {
    const msg = raw as Record<string, unknown>;
    const user = msg.user as Record<string, unknown> | undefined;
    const parent = msg.parent as Record<string, unknown> | undefined;
    const reactions = msg.reactions as unknown[] | undefined;
    const attachments = msg.attachments as unknown[] | undefined;

    return {
      id: msg.id as string,
      channelId: (msg.channel_id as string) || "",
      content: msg.content as string,
      type: (msg.type as string) || "text",
      userId: (user?.id as string) || "",
      user: {
        id: (user?.id as string) || "",
        username: (user?.username as string) || "",
        displayName: (user?.display_name as string) || "",
        avatarUrl: user?.avatar_url as string | undefined,
      },
      createdAt: new Date(msg.created_at as string),
      updatedAt: msg.updated_at
        ? new Date(msg.updated_at as string)
        : undefined,
      isEdited: (msg.is_edited as boolean) || false,
      editedAt: msg.edited_at ? new Date(msg.edited_at as string) : undefined,
      replyToId: parent?.id as string | undefined,
      replyTo: parent
        ? {
            id: parent.id as string,
            content: parent.content as string,
            channelId: "",
            type: "text",
            userId: "",
            user: {
              id: "",
              username:
                ((parent.user as Record<string, unknown>)
                  ?.username as string) || "",
              displayName: "",
            },
            createdAt: new Date(),
            isEdited: false,
          }
        : undefined,
      reactions: reactions?.map((r: unknown) => {
        const reaction = r as Record<string, unknown>;
        return {
          emoji: reaction.emoji as string,
          count: 1,
          users: [],
          hasReacted: reaction.user_id === user?.id,
        };
      }),
      attachments: attachments?.map((a: unknown) => {
        const attachment = a as Record<string, unknown>;
        return {
          id: attachment.id as string,
          type: (attachment.file_type as string)?.startsWith("image/")
            ? ("image" as const)
            : ("file" as const),
          url: attachment.file_url as string,
          name: attachment.file_name as string,
          size: attachment.file_size as number | undefined,
          thumbnailUrl: attachment.thumbnail_url as string | undefined,
        };
      }),
    } as Message;
  };

  const handleNewMessage = useCallback(
    (chId: string, rawMessage: unknown) => {
      const message = mapRawMessage(rawMessage);

      // Don't add duplicate messages
      const existingMessages = messageStore.messagesByChannel[chId] || [];
      if (existingMessages.some((m) => m.id === message.id)) {
        return;
      }

      // Add to store
      messageStore.addMessage(chId, message);

      // Notify callback
      onNewMessage?.(message);

      // Remove typing indicator for this user
      if (message.userId !== user?.id) {
        typingStore.clearUserTyping(`channel:${chId}`, message.userId);
      }
    },
    [messageStore, user, typingStore, onNewMessage],
  );

  // =============================================================================
  // Load More Messages
  // =============================================================================

  const loadMoreMessages = useCallback(async () => {
    if (!channelId || !user) return;

    const currentMessages = messageStore.messagesByChannel[channelId] || [];
    const offset = currentMessages.length;

    try {
      const result = await fetchMore({
        variables: {
          channelId,
          limit: initialMessageCount,
          offset,
        },
      });

      if (result.data?.nchat_messages) {
        const newMessages = result.data.nchat_messages.map(mapRawMessage);

        // Prepend older messages
        messageStore.prependMessages(channelId, newMessages);

        // Update hasMore
        const hasMore = newMessages.length >= initialMessageCount;
        messageStore.setHasMore(channelId, hasMore);
      }
    } catch (err) {
      logger.error("[ChannelInit] Failed to load more messages:", err);
      throw err;
    }
  }, [channelId, user, messageStore, fetchMore, initialMessageCount]);

  // =============================================================================
  // Refresh Messages
  // =============================================================================

  const refreshMessages = useCallback(async () => {
    if (!channelId) return;

    try {
      const result = await refetchMessages();
      if (result.data?.nchat_messages) {
        processMessages(channelId, result.data.nchat_messages);
      }
    } catch (err) {
      logger.error("[ChannelInit] Failed to refresh messages:", err);
      throw err;
    }
  }, [channelId, refetchMessages, processMessages]);

  // =============================================================================
  // Mark as Read
  // =============================================================================

  const markAsRead = useCallback(() => {
    if (!channelId || !user) return;

    // Clear unread count
    notificationStore.markChannelAsRead(channelId);

    // Update read state on server (would use mutation)
    const messages = messageStore.messagesByChannel[channelId] || [];
    const latestMessage = messages[messages.length - 1];

    if (latestMessage) {
      // Emit event for server update
      window.dispatchEvent(
        new CustomEvent("nchat:mark-read", {
          detail: {
            channelId,
            userId: user.id,
            messageId: latestMessage.id,
          },
        }),
      );
    }
  }, [channelId, user, notificationStore, messageStore]);

  // =============================================================================
  // Typing Indicators
  // =============================================================================

  const startTyping = useCallback(() => {
    if (!channelId) return;
    chatStartTyping(channelId);
  }, [channelId, chatStartTyping]);

  const stopTyping = useCallback(() => {
    if (!channelId) return;
    chatStopTyping(channelId);
  }, [channelId, chatStopTyping]);

  // Get typing users for current channel
  const typingUsers = channelId
    ? typingStore.getTypingUsers(`channel:${channelId}`).map((t) => ({
        id: t.userId,
        displayName: t.userName,
        avatarUrl: t.userAvatar,
      }))
    : [];

  // =============================================================================
  // Effects
  // =============================================================================

  // Handle channel change
  useEffect(() => {
    if (skip || !channelId || channelId === prevChannelIdRef.current) return;

    prevChannelIdRef.current = channelId;

    // Clear previous state
    setIsReady(false);
    setError(null);

    // Update message store current channel
    messageStore.setCurrentChannel(channelId);

    // Save as last visited
    appStore.setLastVisitedChannel(channelId);

    // Update URL if needed
    if (updateUrl) {
      const channel = channelStore.getChannelById(channelId);
      if (channel && !pathname?.includes(`/chat/${channel.slug}`)) {
        router.push(`/chat/${channel.slug}`, { scroll: false });
      }
    }

    // Schedule mark as read
    if (autoMarkRead) {
      if (markReadTimeoutRef.current) {
        clearTimeout(markReadTimeoutRef.current);
      }
      markReadTimeoutRef.current = setTimeout(() => {
        markAsRead();
      }, 2000);
    }

    return () => {
      if (markReadTimeoutRef.current) {
        clearTimeout(markReadTimeoutRef.current);
      }
    };
  }, [
    channelId,
    skip,
    messageStore,
    appStore,
    channelStore,
    router,
    pathname,
    updateUrl,
    autoMarkRead,
    markAsRead,
  ]);

  // Subscribe to socket events for this channel
  useEffect(() => {
    if (skip || !channelId || !user) return;

    const handleTypingStart = (
      event: CustomEvent<{ userId: string; channelId: string; user: unknown }>,
    ) => {
      if (event.detail.channelId !== channelId) return;
      if (event.detail.userId === user.id) return;

      const typingUser = event.detail.user as Record<string, unknown>;
      typingStore.setUserTyping(`channel:${channelId}`, {
        userId: event.detail.userId,
        userName: (typingUser?.displayName as string) || "User",
        userAvatar: typingUser?.avatarUrl as string | undefined,
        startedAt: Date.now(),
      });
    };

    const handleTypingStop = (
      event: CustomEvent<{ userId: string; channelId: string }>,
    ) => {
      if (event.detail.channelId !== channelId) return;
      typingStore.clearUserTyping(`channel:${channelId}`, event.detail.userId);
    };

    window.addEventListener(
      "nchat:typing-start" as keyof WindowEventMap,
      handleTypingStart as EventListener,
    );
    window.addEventListener(
      "nchat:typing-stop" as keyof WindowEventMap,
      handleTypingStop as EventListener,
    );

    return () => {
      window.removeEventListener(
        "nchat:typing-start" as keyof WindowEventMap,
        handleTypingStart as EventListener,
      );
      window.removeEventListener(
        "nchat:typing-stop" as keyof WindowEventMap,
        handleTypingStop as EventListener,
      );
    };
  }, [channelId, skip, user, typingStore]);

  // =============================================================================
  // Return
  // =============================================================================

  const messages = channelId
    ? messageStore.messagesByChannel[channelId] || []
    : [];

  const hasMore = channelId
    ? (messageStore.hasMoreByChannel[channelId] ?? true)
    : false;

  return {
    isLoading: messagesLoading,
    isReady,
    hasError: !!error || !!messagesError,
    error: error || messagesError || null,
    messages,
    hasMore,
    loadMoreMessages,
    refreshMessages,
    markAsRead,
    typingUsers,
    startTyping,
    stopTyping,
  };
}

export default useChannelInit;
