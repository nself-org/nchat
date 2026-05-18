"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation, useSubscription } from "@apollo/client";
import { useAuth } from "@/contexts/auth-context";
import {
  GET_THREAD,
  GET_THREAD_MESSAGES,
  GET_THREAD_PARTICIPANTS,
  REPLY_TO_THREAD,
  CREATE_THREAD,
  MARK_THREAD_READ,
  JOIN_THREAD,
  LEAVE_THREAD,
  UPDATE_THREAD_NOTIFICATIONS,
  THREAD_MESSAGES_SUBSCRIPTION,
  THREAD_PARTICIPANTS_SUBSCRIPTION,
} from "@/graphql/threads";
import { MESSAGE_FULL_FRAGMENT } from "@/graphql/fragments";

// ============================================================================
// TYPES
// ============================================================================

export interface ThreadUser {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  status?: string;
}

export interface ThreadAttachment {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  thumbnail_url?: string;
  width?: number;
  height?: number;
}

export interface ThreadReaction {
  id: string;
  emoji: string;
  user_id: string;
  user: ThreadUser;
}

export interface ThreadMessage {
  id: string;
  channel_id: string;
  user_id: string;
  thread_id?: string;
  content: string;
  type: string;
  is_edited: boolean;
  is_pinned: boolean;
  is_deleted: boolean;
  created_at: string;
  edited_at?: string;
  user: ThreadUser;
  attachments: ThreadAttachment[];
  reactions: ThreadReaction[];
  reactions_aggregate?: {
    aggregate: {
      count: number;
    };
  };
}

export interface ThreadParticipant {
  id: string;
  user_id: string;
  joined_at: string;
  last_read_at?: string;
  notifications_enabled: boolean;
  user: ThreadUser;
}

export interface Thread {
  id: string;
  channel_id: string;
  parent_message_id: string;
  message_count: number;
  last_reply_at: string;
  created_at: string;
  is_locked?: boolean;
  parent_message: ThreadMessage;
  participants: ThreadParticipant[];
}

export interface UseThreadOptions {
  threadId: string;
  limit?: number;
  autoSubscribe?: boolean;
}

export interface UseThreadReturn {
  // Data
  thread: Thread | null;
  parentMessage: ThreadMessage | null;
  messages: ThreadMessage[];
  participants: ThreadParticipant[];
  totalCount: number;
  hasMore: boolean;

  // Loading states
  loading: boolean;
  loadingMessages: boolean;
  loadingMore: boolean;

  // Error states
  error: Error | null;

  // Actions
  sendReply: (content: string, attachments?: File[]) => Promise<void>;
  loadMore: () => Promise<void>;
  markAsRead: () => Promise<void>;
  joinThread: () => Promise<void>;
  leaveThread: () => Promise<void>;
  toggleNotifications: (enabled: boolean) => Promise<void>;

  // Helpers
  isParticipant: boolean;
  hasUnread: boolean;
  unreadCount: number;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useThread({
  threadId,
  limit = 50,
  autoSubscribe = true,
}: UseThreadOptions): UseThreadReturn {
  const { user } = useAuth();

  // Fetch thread details
  const {
    data: threadData,
    loading: loadingThread,
    error: threadError,
  } = useQuery(GET_THREAD, {
    variables: { threadId },
    skip: !threadId,
  });

  // Fetch thread messages with pagination
  const {
    data: messagesData,
    loading: loadingMessages,
    error: messagesError,
    fetchMore,
  } = useQuery(GET_THREAD_MESSAGES, {
    variables: { threadId, limit },
    skip: !threadId,
  });

  // Fetch thread participants
  const { data: participantsData, loading: loadingParticipants } = useQuery(
    GET_THREAD_PARTICIPANTS,
    {
      variables: { threadId },
      skip: !threadId,
    },
  );

  // Subscribe to new messages in thread
  useSubscription(THREAD_MESSAGES_SUBSCRIPTION, {
    variables: { threadId },
    skip: !threadId || !autoSubscribe,
    onData: ({ client, data }) => {
      if (data.data?.nchat_messages?.[0]) {
        // Update cache with new message
        const newMessage = data.data.nchat_messages[0];

        client.cache.modify({
          fields: {
            nchat_messages(existingMessages = [], { readField }) {
              const exists = existingMessages.some(
                (msgRef: { __ref: string }) =>
                  readField("id", msgRef) === newMessage.id,
              );
              if (exists) return existingMessages;

              return [
                ...existingMessages,
                { __ref: `nchat_messages:${newMessage.id}` },
              ];
            },
          },
        });
      }
    },
  });

  // Subscribe to participant changes
  useSubscription(THREAD_PARTICIPANTS_SUBSCRIPTION, {
    variables: { threadId },
    skip: !threadId || !autoSubscribe,
  });

  // Mutations
  const [replyToThread, { loading: replying }] = useMutation(REPLY_TO_THREAD);
  const [markThreadRead] = useMutation(MARK_THREAD_READ);
  const [joinThreadMutation] = useMutation(JOIN_THREAD);
  const [leaveThreadMutation] = useMutation(LEAVE_THREAD);
  const [updateNotifications] = useMutation(UPDATE_THREAD_NOTIFICATIONS);

  // Derived data
  const thread = threadData?.nchat_threads_by_pk ?? null;
  const messages = useMemo(() => {
    const msgs = messagesData?.nchat_messages ?? [];
    // Sort by created_at ascending (oldest first)
    return [...msgs].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
  }, [messagesData]);

  const parentMessage =
    messagesData?.nchat_threads_by_pk?.parent_message ??
    thread?.parent_message ??
    null;

  const participants =
    participantsData?.nchat_thread_participants ?? thread?.participants ?? [];

  const totalCount =
    messagesData?.nchat_messages_aggregate?.aggregate?.count ?? 0;
  const hasMore = messages.length < totalCount;

  // Check if current user is a participant
  const isParticipant = useMemo(() => {
    if (!user) return false;
    return participants.some((p: ThreadParticipant) => p.user_id === user.id);
  }, [participants, user]);

  // Check for unread messages
  const { hasUnread, unreadCount } = useMemo(() => {
    if (!user || !isParticipant) return { hasUnread: false, unreadCount: 0 };

    const userParticipation = participants.find(
      (p: ThreadParticipant) => p.user_id === user.id,
    );

    if (!userParticipation?.last_read_at) {
      return { hasUnread: messages.length > 0, unreadCount: messages.length };
    }

    const lastReadTime = new Date(userParticipation.last_read_at).getTime();
    const unreadMessages = messages.filter(
      (m: ThreadMessage) => new Date(m.created_at).getTime() > lastReadTime,
    );

    return {
      hasUnread: unreadMessages.length > 0,
      unreadCount: unreadMessages.length,
    };
  }, [participants, messages, user, isParticipant]);

  // Actions
  const sendReply = useCallback(
    async (content: string, _attachments?: File[]) => {
      if (!user || !thread) {
        throw new Error("Cannot send reply: missing user or thread");
      }

      await replyToThread({
        variables: {
          threadId,
          channelId: thread.channel_id,
          userId: user.id,
          content,
          type: "text",
        },
        optimisticResponse: {
          insert_nchat_messages_one: {
            __typename: "nchat_messages",
            id: `temp-${Date.now()}`,
            channel_id: thread.channel_id,
            user_id: user.id,
            thread_id: threadId,
            content,
            type: "text",
            is_edited: false,
            is_pinned: false,
            is_deleted: false,
            created_at: new Date().toISOString(),
            edited_at: null,
            user: {
              __typename: "nchat_users",
              id: user.id,
              username: user.username,
              display_name: user.displayName,
              avatar_url: user.avatarUrl,
            },
            attachments: [],
            reactions: [],
            reactions_aggregate: {
              __typename: "nchat_reactions_aggregate",
              aggregate: {
                __typename: "nchat_reactions_aggregate_fields",
                count: 0,
              },
            },
          },
          update_nchat_threads_by_pk: {
            __typename: "nchat_threads",
            id: threadId,
            message_count: (thread.message_count ?? 0) + 1,
            last_reply_at: new Date().toISOString(),
          },
          insert_nchat_thread_participants_one: {
            __typename: "nchat_thread_participants",
            id: `participant-${user.id}`,
          },
        },
        update: (cache, { data }) => {
          if (data?.insert_nchat_messages_one) {
            const newMessage = data.insert_nchat_messages_one;

            // Add to messages list
            cache.modify({
              fields: {
                nchat_messages(existingMessages = [], { readField }) {
                  const exists = existingMessages.some(
                    (msgRef: { __ref: string }) =>
                      readField("id", msgRef) === newMessage.id,
                  );
                  if (exists) return existingMessages;

                  const newRef = cache.writeFragment({
                    data: newMessage,
                    fragment: MESSAGE_FULL_FRAGMENT,
                    fragmentName: "MessageFull",
                  });

                  return [...existingMessages, newRef];
                },
              },
            });
          }
        },
      });
    },
    [user, thread, threadId, replyToThread],
  );

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMessages) return;

    const oldestMessage = messages[0];

    await fetchMore({
      variables: {
        threadId,
        limit,
        before: oldestMessage?.created_at,
      },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev;

        return {
          ...fetchMoreResult,
          nchat_messages: [
            ...fetchMoreResult.nchat_messages,
            ...prev.nchat_messages,
          ],
        };
      },
    });
  }, [hasMore, loadingMessages, messages, threadId, limit, fetchMore]);

  const markAsRead = useCallback(async () => {
    if (!user) return;

    await markThreadRead({
      variables: {
        threadId,
        userId: user.id,
      },
      optimisticResponse: {
        update_nchat_thread_participants: {
          __typename: "nchat_thread_participants_mutation_response",
          affected_rows: 1,
          returning: [
            {
              __typename: "nchat_thread_participants",
              id: `participant-${user.id}`,
              last_read_at: new Date().toISOString(),
            },
          ],
        },
      },
    });
  }, [user, threadId, markThreadRead]);

  const joinThread = useCallback(async () => {
    if (!user) return;

    await joinThreadMutation({
      variables: {
        threadId,
        userId: user.id,
      },
    });
  }, [user, threadId, joinThreadMutation]);

  const leaveThread = useCallback(async () => {
    if (!user) return;

    await leaveThreadMutation({
      variables: {
        threadId,
        userId: user.id,
      },
    });
  }, [user, threadId, leaveThreadMutation]);

  const toggleNotifications = useCallback(
    async (enabled: boolean) => {
      if (!user) return;

      await updateNotifications({
        variables: {
          threadId,
          userId: user.id,
          enabled,
        },
      });
    },
    [user, threadId, updateNotifications],
  );

  // Auto-mark as read when thread is opened
  useEffect(() => {
    if (thread && user && isParticipant && hasUnread) {
      markAsRead();
    }
  }, [thread, user, isParticipant, hasUnread, markAsRead]);

  return {
    // Data
    thread,
    parentMessage,
    messages,
    participants,
    totalCount,
    hasMore,

    // Loading states
    loading: loadingThread || loadingParticipants,
    loadingMessages: loadingMessages || replying,
    loadingMore: false, // Will be set by fetchMore

    // Error
    error: threadError ?? messagesError ?? null,

    // Actions
    sendReply,
    loadMore,
    markAsRead,
    joinThread,
    leaveThread,
    toggleNotifications,

    // Helpers
    isParticipant,
    hasUnread,
    unreadCount,
  };
}

// ============================================================================
// CREATE THREAD HOOK
// ============================================================================

export interface UseCreateThreadOptions {
  channelId: string;
  parentMessageId: string;
  onSuccess?: (thread: Thread) => void;
}

export function useCreateThread({
  channelId,
  parentMessageId,
  onSuccess,
}: UseCreateThreadOptions) {
  const { user } = useAuth();
  const [createThread, { loading, error }] = useMutation(CREATE_THREAD);

  const create = useCallback(
    async (content: string) => {
      if (!user) {
        throw new Error("Must be logged in to create a thread");
      }

      const result = await createThread({
        variables: {
          channelId,
          parentMessageId,
          userId: user.id,
          content,
        },
      });

      const thread = result.data?.insert_nchat_threads_one;
      if (thread && onSuccess) {
        onSuccess(thread);
      }

      return thread;
    },
    [user, channelId, parentMessageId, createThread, onSuccess],
  );

  return {
    createThread: create,
    loading,
    error,
  };
}
