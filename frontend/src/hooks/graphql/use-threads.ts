"use client";

import { useCallback, useEffect, useMemo } from "react";
import {
  useQuery,
  useMutation,
  useSubscription,
  type ApolloError,
} from "@apollo/client";
import { useAuth } from "@/contexts/auth-context";
import {
  GET_THREAD,
  GET_THREAD_MESSAGES,
  GET_THREAD_PARTICIPANTS,
  GET_CHANNEL_THREADS,
  GET_USER_THREADS,
  GET_UNREAD_THREADS_COUNT,
  CREATE_THREAD,
  REPLY_TO_THREAD,
  JOIN_THREAD,
  LEAVE_THREAD,
  UPDATE_THREAD_NOTIFICATIONS,
  MARK_THREAD_READ,
  DELETE_THREAD,
  THREAD_SUBSCRIPTION,
  THREAD_MESSAGES_SUBSCRIPTION,
  THREAD_PARTICIPANTS_SUBSCRIPTION,
  USER_THREADS_SUBSCRIPTION,
  type CreateThreadVariables,
  type ReplyToThreadVariables,
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
  parent_message: ThreadMessage;
  participants: ThreadParticipant[];
}

export interface ChannelThread extends Thread {
  latest_replies?: ThreadMessage[];
}

export interface UserThread {
  thread: Thread & {
    channel?: {
      id: string;
      name: string;
      slug: string;
    };
    latest_reply?: ThreadMessage[];
  };
  last_read_at?: string;
  has_unread?: boolean;
}

// Hook return types
export interface UseThreadOptions {
  threadId: string;
  limit?: number;
  autoSubscribe?: boolean;
}

export interface UseThreadReturn {
  thread: Thread | null;
  parentMessage: ThreadMessage | null;
  messages: ThreadMessage[];
  participants: ThreadParticipant[];
  totalCount: number;
  hasMore: boolean;
  loading: boolean;
  loadingMessages: boolean;
  error: ApolloError | undefined;
  sendReply: (content: string, type?: string) => Promise<ThreadMessage | null>;
  loadMore: () => Promise<void>;
  markAsRead: () => Promise<void>;
  joinThread: () => Promise<boolean>;
  leaveThread: () => Promise<boolean>;
  toggleNotifications: (enabled: boolean) => Promise<boolean>;
  isParticipant: boolean;
  hasUnread: boolean;
  unreadCount: number;
}

export interface UseThreadRepliesReturn {
  replies: ThreadMessage[];
  totalCount: number;
  hasMore: boolean;
  loading: boolean;
  error: ApolloError | undefined;
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;
}

export interface UseCreateThreadReturn {
  createThread: (
    channelId: string,
    parentMessageId: string,
    content: string,
  ) => Promise<Thread | null>;
  loading: boolean;
  error: ApolloError | undefined;
}

export interface UseSendThreadReplyReturn {
  sendReply: (
    threadId: string,
    channelId: string,
    content: string,
    type?: string,
  ) => Promise<ThreadMessage | null>;
  loading: boolean;
  error: ApolloError | undefined;
}

export interface UseChannelThreadsReturn {
  threads: ChannelThread[];
  loading: boolean;
  error: ApolloError | undefined;
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;
  hasMore: boolean;
}

export interface UseUserThreadsReturn {
  threads: UserThread[];
  unreadCount: number;
  loading: boolean;
  error: ApolloError | undefined;
  refetch: () => Promise<void>;
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Comprehensive thread hook with messages, participants, and actions
 */
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
    fetchPolicy: "cache-and-network",
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
        const newMessage = data.data.nchat_messages[0];

        client.cache.modify({
          fields: {
            nchat_messages(existingMessages = [], { readField, toReference }) {
              const exists = existingMessages.some(
                (msgRef: { __ref: string }) =>
                  readField("id", msgRef) === newMessage.id,
              );
              if (exists) return existingMessages;

              const newRef = toReference(newMessage);
              return [...existingMessages, newRef];
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

  // Subscribe to thread updates
  useSubscription(THREAD_SUBSCRIPTION, {
    variables: { threadId },
    skip: !threadId || !autoSubscribe,
  });

  // Mutations
  const [replyToThreadMutation, { loading: replying }] =
    useMutation(REPLY_TO_THREAD);
  const [markThreadReadMutation] = useMutation(MARK_THREAD_READ);
  const [joinThreadMutation] = useMutation(JOIN_THREAD);
  const [leaveThreadMutation] = useMutation(LEAVE_THREAD);
  const [updateNotificationsMutation] = useMutation(
    UPDATE_THREAD_NOTIFICATIONS,
  );

  // Derived data
  const thread = threadData?.nchat_threads_by_pk ?? null;

  const messages = useMemo(() => {
    const msgs = messagesData?.nchat_messages ?? [];
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

  // Send reply action
  const sendReply = useCallback(
    async (content: string, type = "text"): Promise<ThreadMessage | null> => {
      if (!user || !thread) {
        throw new Error("Cannot send reply: missing user or thread");
      }

      const result = await replyToThreadMutation({
        variables: {
          threadId,
          channelId: thread.channel_id,
          userId: user.id,
          content,
          type,
        },
        optimisticResponse: {
          insert_nchat_messages_one: {
            __typename: "nchat_messages",
            id: `temp-${Date.now()}`,
            channel_id: thread.channel_id,
            user_id: user.id,
            thread_id: threadId,
            content,
            type,
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
              email: user.email,
              bio: null,
              status: null,
              status_emoji: null,
              status_expires_at: null,
              timezone: null,
              locale: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
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
            replies_aggregate: {
              __typename: "nchat_messages_aggregate",
              aggregate: {
                __typename: "nchat_messages_aggregate_fields",
                count: 0,
              },
            },
            mentions: [],
            parent: null,
            parent_id: null,
            forwarded_from_id: null,
            deleted_at: null,
            metadata: null,
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
                  return [...existingMessages, newRef];
                },
              },
            });
          }
        },
      });

      return result.data?.insert_nchat_messages_one ?? null;
    },
    [user, thread, threadId, replyToThreadMutation],
  );

  // Load more messages
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

  // Mark thread as read
  const markAsRead = useCallback(async () => {
    if (!user) return;

    await markThreadReadMutation({
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
  }, [user, threadId, markThreadReadMutation]);

  // Join thread
  const joinThread = useCallback(async (): Promise<boolean> => {
    if (!user) {
      throw new Error("Must be logged in to join a thread");
    }

    const result = await joinThreadMutation({
      variables: {
        threadId,
        userId: user.id,
      },
    });

    return !!result.data?.insert_nchat_thread_participants_one;
  }, [user, threadId, joinThreadMutation]);

  // Leave thread
  const leaveThread = useCallback(async (): Promise<boolean> => {
    if (!user) {
      throw new Error("Must be logged in to leave a thread");
    }

    const result = await leaveThreadMutation({
      variables: {
        threadId,
        userId: user.id,
      },
    });

    return (
      (result.data?.delete_nchat_thread_participants?.affected_rows ?? 0) > 0
    );
  }, [user, threadId, leaveThreadMutation]);

  // Toggle notifications
  const toggleNotifications = useCallback(
    async (enabled: boolean): Promise<boolean> => {
      if (!user) {
        throw new Error("Must be logged in to update notifications");
      }

      const result = await updateNotificationsMutation({
        variables: {
          threadId,
          userId: user.id,
          enabled,
        },
      });

      return (
        (result.data?.update_nchat_thread_participants?.affected_rows ?? 0) > 0
      );
    },
    [user, threadId, updateNotificationsMutation],
  );

  // Auto-mark as read when thread is opened
  useEffect(() => {
    if (thread && user && isParticipant && hasUnread) {
      markAsRead();
    }
  }, [thread, user, isParticipant, hasUnread, markAsRead]);

  return {
    thread,
    parentMessage,
    messages,
    participants,
    totalCount,
    hasMore,
    loading: loadingThread || loadingParticipants,
    loadingMessages: loadingMessages || replying,
    error: threadError ?? messagesError,
    sendReply,
    loadMore,
    markAsRead,
    joinThread,
    leaveThread,
    toggleNotifications,
    isParticipant,
    hasUnread,
    unreadCount,
  };
}

/**
 * Fetch thread replies with pagination (standalone hook)
 */
export function useThreadReplies(
  threadId: string,
  limit = 50,
): UseThreadRepliesReturn {
  const { data, loading, error, fetchMore, refetch } = useQuery(
    GET_THREAD_MESSAGES,
    {
      variables: { threadId, limit },
      skip: !threadId,
    },
  );

  const replies = useMemo(() => {
    const msgs = data?.nchat_messages ?? [];
    return [...msgs].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
  }, [data]);

  const totalCount = data?.nchat_messages_aggregate?.aggregate?.count ?? 0;
  const hasMore = replies.length < totalCount;

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;

    const oldestReply = replies[0];

    await fetchMore({
      variables: {
        threadId,
        limit,
        before: oldestReply?.created_at,
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
  }, [hasMore, loading, replies, threadId, limit, fetchMore]);

  return {
    replies,
    totalCount,
    hasMore,
    loading,
    error,
    loadMore,
    refetch: async () => {
      await refetch();
    },
  };
}

/**
 * Create a new thread
 */
export function useCreateThread(): UseCreateThreadReturn {
  const { user } = useAuth();
  const [createThreadMutation, { loading, error }] = useMutation(CREATE_THREAD);

  const createThread = useCallback(
    async (
      channelId: string,
      parentMessageId: string,
      content: string,
    ): Promise<Thread | null> => {
      if (!user) {
        throw new Error("Must be logged in to create a thread");
      }

      const result = await createThreadMutation({
        variables: {
          channelId,
          parentMessageId,
          userId: user.id,
          content,
        },
      });

      return result.data?.insert_nchat_threads_one ?? null;
    },
    [user, createThreadMutation],
  );

  return {
    createThread,
    loading,
    error,
  };
}

/**
 * Send a reply to a thread (standalone mutation)
 */
export function useSendThreadReply(): UseSendThreadReplyReturn {
  const { user } = useAuth();
  const [replyMutation, { loading, error }] = useMutation(REPLY_TO_THREAD);

  const sendReply = useCallback(
    async (
      threadId: string,
      channelId: string,
      content: string,
      type = "text",
    ): Promise<ThreadMessage | null> => {
      if (!user) {
        throw new Error("Must be logged in to send a reply");
      }

      const result = await replyMutation({
        variables: {
          threadId,
          channelId,
          userId: user.id,
          content,
          type,
        },
      });

      return result.data?.insert_nchat_messages_one ?? null;
    },
    [user, replyMutation],
  );

  return {
    sendReply,
    loading,
    error,
  };
}

/**
 * Get threads for a channel
 */
export function useChannelThreads(
  channelId: string,
  limit = 20,
): UseChannelThreadsReturn {
  const { data, loading, error, fetchMore, refetch } = useQuery(
    GET_CHANNEL_THREADS,
    {
      variables: { channelId, limit, offset: 0 },
      skip: !channelId,
    },
  );

  const threads = useMemo(() => {
    return data?.nchat_threads ?? [];
  }, [data]);

  const hasMore = threads.length >= limit; // Simplified check

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;

    await fetchMore({
      variables: {
        channelId,
        limit,
        offset: threads.length,
      },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev;

        return {
          nchat_threads: [
            ...prev.nchat_threads,
            ...fetchMoreResult.nchat_threads,
          ],
        };
      },
    });
  }, [hasMore, loading, threads.length, channelId, limit, fetchMore]);

  return {
    threads,
    loading,
    error,
    loadMore,
    hasMore,
    refetch: async () => {
      await refetch();
    },
  };
}

/**
 * Get threads the current user is participating in
 */
export function useUserThreads(): UseUserThreadsReturn {
  const { user } = useAuth();

  const { data, loading, error, refetch } = useQuery(GET_USER_THREADS, {
    variables: { userId: user?.id, limit: 20 },
    skip: !user?.id,
  });

  const { data: unreadData, loading: unreadLoading } = useQuery(
    GET_UNREAD_THREADS_COUNT,
    {
      variables: { userId: user?.id },
      skip: !user?.id,
    },
  );

  // Subscribe to user's threads
  useSubscription(USER_THREADS_SUBSCRIPTION, {
    variables: { userId: user?.id },
    skip: !user?.id,
  });

  const threads = useMemo(() => {
    return data?.nchat_thread_participants ?? [];
  }, [data]);

  const unreadCount =
    unreadData?.nchat_thread_participants_aggregate?.aggregate?.count ?? 0;

  return {
    threads,
    unreadCount,
    loading: loading || unreadLoading,
    error,
    refetch: async () => {
      await refetch();
    },
  };
}

/**
 * Subscribe to thread updates
 */
export function useThreadSubscription(
  threadId: string,
  options?: {
    onNewReply?: (message: ThreadMessage) => void;
    onParticipantJoined?: (participant: ThreadParticipant) => void;
    onParticipantLeft?: (userId: string) => void;
    onThreadUpdated?: (thread: Thread) => void;
  },
) {
  // New messages
  useSubscription(THREAD_MESSAGES_SUBSCRIPTION, {
    variables: { threadId },
    skip: !threadId,
    onData: ({ data }) => {
      if (data.data?.nchat_messages?.[0] && options?.onNewReply) {
        options.onNewReply(data.data.nchat_messages[0]);
      }
    },
  });

  // Thread updates
  useSubscription(THREAD_SUBSCRIPTION, {
    variables: { threadId },
    skip: !threadId,
    onData: ({ data }) => {
      if (data.data?.nchat_threads_by_pk && options?.onThreadUpdated) {
        options.onThreadUpdated(data.data.nchat_threads_by_pk);
      }
    },
  });

  // Participant changes
  useSubscription(THREAD_PARTICIPANTS_SUBSCRIPTION, {
    variables: { threadId },
    skip: !threadId,
  });
}

export default useThread;
