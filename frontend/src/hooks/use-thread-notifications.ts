"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useSubscription } from "@apollo/client";
import { useAuth } from "@/contexts/auth-context";
import { useNotificationStore } from "@/stores/notification-store";
import { useThreadStore } from "@/stores/thread-store";
import {
  USER_THREADS_SUBSCRIPTION,
  THREAD_MESSAGES_SUBSCRIPTION,
} from "@/graphql/threads";
import type { Notification } from "@/stores/notification-store";

// ============================================================================
// TYPES
// ============================================================================

export interface ThreadNotificationOptions {
  /** Whether to enable desktop notifications */
  desktopNotifications?: boolean;
  /** Whether to play sounds for new thread replies */
  playSounds?: boolean;
  /** Callback when a new thread reply is received */
  onNewReply?: (
    threadId: string,
    messageContent: string,
    authorName: string,
  ) => void;
}

export interface UseThreadNotificationsReturn {
  /** Total unread thread count */
  unreadThreadCount: number;
  /** Mark a specific thread as read */
  markThreadAsRead: (threadId: string) => void;
  /** Mark all threads as read */
  markAllThreadsAsRead: () => void;
  /** Check if a thread has unread messages */
  hasUnreadInThread: (threadId: string) => boolean;
  /** Enable/disable notifications for a specific thread */
  toggleThreadNotifications: (threadId: string, enabled: boolean) => void;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useThreadNotifications(
  options: ThreadNotificationOptions = {},
): UseThreadNotificationsReturn {
  const {
    desktopNotifications = true,
    playSounds = true,
    onNewReply,
  } = options;

  const { user } = useAuth();

  // Stores
  const notificationStore = useNotificationStore();
  const threadStore = useThreadStore();

  const { addNotification, preferences, unreadCounts } = notificationStore;

  const {
    unreadThreadIds,
    totalUnreadCount,
    markThreadAsRead: markThreadReadInStore,
    markAllThreadsAsRead: markAllReadInStore,
    incrementThreadUnread,
    followedThreadIds,
    mutedThreadIds,
    muteThread,
    unmuteThread,
  } = threadStore;

  // Subscribe to user's threads for real-time updates
  useSubscription(USER_THREADS_SUBSCRIPTION, {
    variables: { userId: user?.id },
    skip: !user?.id,
    onData: ({ data }) => {
      if (data.data?.nchat_thread_participants) {
        // Process thread updates
        const participations = data.data.nchat_thread_participants;

        participations.forEach(
          (participation: {
            thread: {
              id: string;
              message_count: number;
              last_reply_at: string;
              parent_message?: {
                id: string;
                content: string;
                channel?: {
                  id: string;
                  name: string;
                  slug: string;
                };
              };
            };
            last_read_at?: string;
          }) => {
            const { thread, last_read_at } = participation;

            if (!thread || !last_read_at) return;

            // Check if there are new messages since last read
            const lastReplyTime = new Date(thread.last_reply_at).getTime();
            const lastReadTime = new Date(last_read_at).getTime();

            if (lastReplyTime > lastReadTime) {
              // Thread has unread messages
              incrementThreadUnread(thread.id);
            }
          },
        );
      }
    },
  });

  // Create a thread notification
  const createThreadNotification = useCallback(
    (
      threadId: string,
      channelId: string,
      channelName: string,
      messageContent: string,
      author: { id: string; name: string; avatar?: string },
    ) => {
      // Check if notifications are enabled for this thread
      if (mutedThreadIds.has(threadId)) {
        return;
      }

      // Check global thread notification preference
      if (!preferences.threadRepliesEnabled) {
        return;
      }

      // Create notification
      const notification: Notification = {
        id: `thread-reply-${threadId}-${Date.now()}`,
        type: "thread_reply",
        priority: "normal",
        title: `New reply in thread`,
        body: messageContent,
        actor: {
          id: author.id,
          name: author.name,
          avatarUrl: author.avatar,
        },
        channelId,
        channelName,
        threadId,
        isRead: false,
        isArchived: false,
        createdAt: new Date().toISOString(),
        actionUrl: `/chat/channel/${channelName}?thread=${threadId}`,
      };

      addNotification(notification);

      // Trigger callback if provided
      if (onNewReply) {
        onNewReply(threadId, messageContent, author.name);
      }

      // Desktop notification
      if (
        desktopNotifications &&
        preferences.desktopEnabled &&
        preferences.showPreview
      ) {
        if (typeof window !== "undefined" && "Notification" in window) {
          if (Notification.permission === "granted") {
            const desktopNotif = new Notification(`Reply from ${author.name}`, {
              body: messageContent.slice(0, 100),
              icon: author.avatar || "/favicon.ico",
              tag: `thread-${threadId}`,
              silent: !playSounds || !preferences.soundEnabled,
            });

            desktopNotif.onclick = () => {
              window.focus();
              // Navigate to thread
              window.location.href = `/chat/channel/${channelName}?thread=${threadId}`;
            };
          }
        }
      }

      // Play sound
      if (playSounds && preferences.soundEnabled && preferences.playSound) {
        // Sound would be played here using the notification sound system
        // This is handled by the notification-sounds.ts utility
      }
    },
    [
      addNotification,
      desktopNotifications,
      mutedThreadIds,
      onNewReply,
      playSounds,
      preferences,
    ],
  );

  // Mark a thread as read
  const markThreadAsRead = useCallback(
    (threadId: string) => {
      markThreadReadInStore(threadId);

      // Also update the notification store
      notificationStore.notifications
        .filter((n) => n.threadId === threadId && !n.isRead)
        .forEach((n) => {
          notificationStore.markAsRead(n.id);
        });
    },
    [markThreadReadInStore, notificationStore],
  );

  // Mark all threads as read
  const markAllThreadsAsRead = useCallback(() => {
    markAllReadInStore();

    // Also mark all thread notifications as read
    notificationStore.notifications
      .filter((n) => n.type === "thread_reply" && !n.isRead)
      .forEach((n) => {
        notificationStore.markAsRead(n.id);
      });
  }, [markAllReadInStore, notificationStore]);

  // Check if a thread has unread messages
  const hasUnreadInThread = useCallback(
    (threadId: string) => {
      return unreadThreadIds.has(threadId);
    },
    [unreadThreadIds],
  );

  // Toggle thread notifications
  const toggleThreadNotifications = useCallback(
    (threadId: string, enabled: boolean) => {
      if (enabled) {
        unmuteThread(threadId);
      } else {
        muteThread(threadId);
      }
    },
    [muteThread, unmuteThread],
  );

  // Unread thread count
  const unreadThreadCount = useMemo(() => {
    return totalUnreadCount;
  }, [totalUnreadCount]);

  return {
    unreadThreadCount,
    markThreadAsRead,
    markAllThreadsAsRead,
    hasUnreadInThread,
    toggleThreadNotifications,
  };
}

// ============================================================================
// THREAD REPLY NOTIFICATION HOOK (for single thread)
// ============================================================================

export interface UseThreadReplyNotificationsOptions {
  threadId: string;
  onNewMessage?: (content: string, authorName: string) => void;
}

export function useThreadReplyNotifications({
  threadId,
  onNewMessage,
}: UseThreadReplyNotificationsOptions) {
  const { user } = useAuth();
  const { incrementThreadUnread } = useThreadStore();

  // Subscribe to new messages in this specific thread
  useSubscription(THREAD_MESSAGES_SUBSCRIPTION, {
    variables: { threadId },
    skip: !threadId,
    onData: ({ data }) => {
      if (data.data?.nchat_messages?.[0]) {
        const newMessage = data.data.nchat_messages[0];

        // Don't notify for own messages
        if (newMessage.user_id === user?.id) {
          return;
        }

        // Increment unread count
        incrementThreadUnread(threadId);

        // Trigger callback
        if (onNewMessage) {
          const authorName =
            newMessage.user?.display_name ||
            newMessage.user?.username ||
            "Unknown";
          onNewMessage(newMessage.content, authorName);
        }
      }
    },
  });
}

export default useThreadNotifications;
