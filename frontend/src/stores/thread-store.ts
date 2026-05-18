/**
 * Thread Store - Manages thread state for the nself-chat application
 *
 * Handles active threads, thread messages, and thread navigation
 */

import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

// ============================================================================
// Types
// ============================================================================

export interface ThreadParticipant {
  userId: string;
  userName: string;
  userAvatar?: string;
  lastReplyAt: string;
  replyCount: number;
}

export interface ThreadMessage {
  id: string;
  threadId: string;
  userId: string;
  content: string;
  contentHtml?: string;
  createdAt: string;
  updatedAt: string;
  editedAt: string | null;
  isDeleted: boolean;
  attachments: Array<{
    id: string;
    type: string;
    name: string;
    url: string;
    size: number;
    thumbnailUrl?: string;
  }>;
  reactions: Array<{
    emoji: string;
    count: number;
    users: string[];
    hasReacted: boolean;
  }>;
  mentions: Array<{
    type: "user" | "channel" | "everyone";
    id?: string;
    name: string;
  }>;
  // Denormalized user info
  userName?: string;
  userAvatar?: string;
  userDisplayName?: string;
  // Optimistic state
  isPending?: boolean;
  isFailed?: boolean;
  localId?: string;
}

export interface Thread {
  id: string;
  parentMessageId: string;
  channelId: string;
  channelName?: string;
  createdAt: string;
  updatedAt: string;
  replyCount: number;
  lastReplyAt: string | null;
  participants: ThreadParticipant[];
  isFollowing: boolean;
  isMuted: boolean;
  unreadCount: number;
  lastReadMessageId: string | null;
  // Parent message info
  parentMessage?: {
    id: string;
    content: string;
    userId: string;
    userName?: string;
    userAvatar?: string;
    createdAt: string;
  };
}

export interface ThreadState {
  // Active thread
  activeThreadId: string | null;
  activeThread: Thread | null;

  // Thread list (all threads user is participating in)
  threads: Map<string, Thread>;
  threadIds: string[]; // Ordered by lastReplyAt

  // Thread messages by thread ID
  threadMessages: Map<string, Map<string, ThreadMessage>>;

  // Followed threads
  followedThreadIds: Set<string>;

  // Muted threads
  mutedThreadIds: Set<string>;

  // Unread thread counts
  unreadThreadIds: Set<string>;
  totalUnreadCount: number;

  // Loading states
  isLoadingThreads: boolean;
  isLoadingThread: string | null;
  isLoadingMessages: string | null;
  isSendingReply: boolean;

  // Pagination
  hasMoreThreads: boolean;
  threadsCursor: string | null;
  hasMoreMessages: Map<string, boolean>;
  messagesCursor: Map<string, string | null>;

  // UI state
  threadPanelOpen: boolean;
  threadListOpen: boolean;

  // Error state
  error: string | null;
}

export interface ThreadActions {
  // Active thread
  setActiveThread: (thread: Thread | null) => void;
  setActiveThreadById: (threadId: string | null) => void;
  openThread: (threadId: string) => void;
  closeThread: () => void;

  // Thread list
  setThreads: (threads: Thread[]) => void;
  addThread: (thread: Thread) => void;
  updateThread: (threadId: string, updates: Partial<Thread>) => void;
  removeThread: (threadId: string) => void;
  getThreadById: (threadId: string) => Thread | undefined;

  // Thread messages
  setThreadMessages: (threadId: string, messages: ThreadMessage[]) => void;
  addThreadMessages: (
    threadId: string,
    messages: ThreadMessage[],
    prepend?: boolean,
  ) => void;
  addThreadMessage: (threadId: string, message: ThreadMessage) => void;
  updateThreadMessage: (
    threadId: string,
    messageId: string,
    updates: Partial<ThreadMessage>,
  ) => void;
  removeThreadMessage: (threadId: string, messageId: string) => void;
  getThreadMessages: (threadId: string) => ThreadMessage[];

  // Following
  followThread: (threadId: string) => void;
  unfollowThread: (threadId: string) => void;
  setFollowedThreads: (threadIds: string[]) => void;

  // Muting
  muteThread: (threadId: string) => void;
  unmuteThread: (threadId: string) => void;
  setMutedThreads: (threadIds: string[]) => void;

  // Unread management
  markThreadAsRead: (threadId: string, lastReadMessageId?: string) => void;
  markAllThreadsAsRead: () => void;
  incrementThreadUnread: (threadId: string) => void;
  setThreadUnreadCount: (threadId: string, count: number) => void;

  // Loading states
  setLoadingThreads: (loading: boolean) => void;
  setLoadingThread: (threadId: string | null) => void;
  setLoadingMessages: (threadId: string | null) => void;
  setSendingReply: (sending: boolean) => void;

  // Pagination
  setHasMoreThreads: (hasMore: boolean) => void;
  setThreadsCursor: (cursor: string | null) => void;
  setHasMoreMessages: (threadId: string, hasMore: boolean) => void;
  setMessagesCursor: (threadId: string, cursor: string | null) => void;

  // UI state
  setThreadPanelOpen: (open: boolean) => void;
  toggleThreadPanel: () => void;
  setThreadListOpen: (open: boolean) => void;
  toggleThreadList: () => void;

  // Error
  setError: (error: string | null) => void;

  // Utility
  resetThreadStore: () => void;
  clearThreadMessages: (threadId: string) => void;
}

export type ThreadStore = ThreadState & ThreadActions;

// ============================================================================
// Initial State
// ============================================================================

const initialState: ThreadState = {
  activeThreadId: null,
  activeThread: null,
  threads: new Map(),
  threadIds: [],
  threadMessages: new Map(),
  followedThreadIds: new Set(),
  mutedThreadIds: new Set(),
  unreadThreadIds: new Set(),
  totalUnreadCount: 0,
  isLoadingThreads: false,
  isLoadingThread: null,
  isLoadingMessages: null,
  isSendingReply: false,
  hasMoreThreads: false,
  threadsCursor: null,
  hasMoreMessages: new Map(),
  messagesCursor: new Map(),
  threadPanelOpen: false,
  threadListOpen: false,
  error: null,
};

// ============================================================================
// Store
// ============================================================================

export const useThreadStore = create<ThreadStore>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        ...initialState,

        // Active thread
        setActiveThread: (thread) =>
          set(
            (state) => {
              state.activeThread = thread;
              state.activeThreadId = thread?.id ?? null;
              if (thread) {
                state.threadPanelOpen = true;
              }
            },
            false,
            "thread/setActiveThread",
          ),

        setActiveThreadById: (threadId) =>
          set(
            (state) => {
              state.activeThreadId = threadId;
              state.activeThread = threadId
                ? (state.threads.get(threadId) ?? null)
                : null;
              if (threadId) {
                state.threadPanelOpen = true;
              }
            },
            false,
            "thread/setActiveThreadById",
          ),

        openThread: (threadId) =>
          set(
            (state) => {
              state.activeThreadId = threadId;
              state.activeThread = state.threads.get(threadId) ?? null;
              state.threadPanelOpen = true;
            },
            false,
            "thread/openThread",
          ),

        closeThread: () =>
          set(
            (state) => {
              state.activeThreadId = null;
              state.activeThread = null;
              state.threadPanelOpen = false;
            },
            false,
            "thread/closeThread",
          ),

        // Thread list
        setThreads: (threads) =>
          set(
            (state) => {
              state.threads = new Map(threads.map((t) => [t.id, t]));
              state.threadIds = threads
                .sort((a, b) => {
                  const aTime = a.lastReplyAt
                    ? new Date(a.lastReplyAt).getTime()
                    : 0;
                  const bTime = b.lastReplyAt
                    ? new Date(b.lastReplyAt).getTime()
                    : 0;
                  return bTime - aTime;
                })
                .map((t) => t.id);
            },
            false,
            "thread/setThreads",
          ),

        addThread: (thread) =>
          set(
            (state) => {
              state.threads.set(thread.id, thread);
              // Add to beginning if it's new
              if (!state.threadIds.includes(thread.id)) {
                state.threadIds.unshift(thread.id);
              }
            },
            false,
            "thread/addThread",
          ),

        updateThread: (threadId, updates) =>
          set(
            (state) => {
              const thread = state.threads.get(threadId);
              if (thread) {
                state.threads.set(threadId, { ...thread, ...updates });
                // Update active thread if it's the same
                if (state.activeThreadId === threadId) {
                  state.activeThread = state.threads.get(threadId) ?? null;
                }
              }
            },
            false,
            "thread/updateThread",
          ),

        removeThread: (threadId) =>
          set(
            (state) => {
              state.threads.delete(threadId);
              state.threadIds = state.threadIds.filter((id) => id !== threadId);
              state.threadMessages.delete(threadId);
              state.followedThreadIds.delete(threadId);
              state.mutedThreadIds.delete(threadId);
              state.unreadThreadIds.delete(threadId);
              state.hasMoreMessages.delete(threadId);
              state.messagesCursor.delete(threadId);

              if (state.activeThreadId === threadId) {
                state.activeThreadId = null;
                state.activeThread = null;
              }
            },
            false,
            "thread/removeThread",
          ),

        getThreadById: (threadId) => get().threads.get(threadId),

        // Thread messages
        setThreadMessages: (threadId, messages) =>
          set(
            (state) => {
              const messageMap = new Map(messages.map((m) => [m.id, m]));
              state.threadMessages.set(threadId, messageMap);
            },
            false,
            "thread/setThreadMessages",
          ),

        addThreadMessages: (threadId, messages, prepend = false) =>
          set(
            (state) => {
              let threadMsgs = state.threadMessages.get(threadId);
              if (!threadMsgs) {
                threadMsgs = new Map();
                state.threadMessages.set(threadId, threadMsgs);
              }
              messages.forEach((msg) => threadMsgs!.set(msg.id, msg));
            },
            false,
            "thread/addThreadMessages",
          ),

        addThreadMessage: (threadId, message) =>
          set(
            (state) => {
              let threadMsgs = state.threadMessages.get(threadId);
              if (!threadMsgs) {
                threadMsgs = new Map();
                state.threadMessages.set(threadId, threadMsgs);
              }
              threadMsgs.set(message.id, message);

              // Update thread reply count and last reply time
              const thread = state.threads.get(threadId);
              if (thread) {
                thread.replyCount++;
                thread.lastReplyAt = message.createdAt;
              }
            },
            false,
            "thread/addThreadMessage",
          ),

        updateThreadMessage: (threadId, messageId, updates) =>
          set(
            (state) => {
              const threadMsgs = state.threadMessages.get(threadId);
              if (threadMsgs) {
                const message = threadMsgs.get(messageId);
                if (message) {
                  threadMsgs.set(messageId, { ...message, ...updates });
                }
              }
            },
            false,
            "thread/updateThreadMessage",
          ),

        removeThreadMessage: (threadId, messageId) =>
          set(
            (state) => {
              const threadMsgs = state.threadMessages.get(threadId);
              if (threadMsgs) {
                threadMsgs.delete(messageId);

                // Update thread reply count
                const thread = state.threads.get(threadId);
                if (thread && thread.replyCount > 0) {
                  thread.replyCount--;
                }
              }
            },
            false,
            "thread/removeThreadMessage",
          ),

        getThreadMessages: (threadId) => {
          const threadMsgs = get().threadMessages.get(threadId);
          if (!threadMsgs) return [];
          return Array.from(threadMsgs.values()).sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          );
        },

        // Following
        followThread: (threadId) =>
          set(
            (state) => {
              state.followedThreadIds.add(threadId);
              const thread = state.threads.get(threadId);
              if (thread) {
                thread.isFollowing = true;
              }
            },
            false,
            "thread/followThread",
          ),

        unfollowThread: (threadId) =>
          set(
            (state) => {
              state.followedThreadIds.delete(threadId);
              const thread = state.threads.get(threadId);
              if (thread) {
                thread.isFollowing = false;
              }
            },
            false,
            "thread/unfollowThread",
          ),

        setFollowedThreads: (threadIds) =>
          set(
            (state) => {
              state.followedThreadIds = new Set(threadIds);
            },
            false,
            "thread/setFollowedThreads",
          ),

        // Muting
        muteThread: (threadId) =>
          set(
            (state) => {
              state.mutedThreadIds.add(threadId);
              const thread = state.threads.get(threadId);
              if (thread) {
                thread.isMuted = true;
              }
            },
            false,
            "thread/muteThread",
          ),

        unmuteThread: (threadId) =>
          set(
            (state) => {
              state.mutedThreadIds.delete(threadId);
              const thread = state.threads.get(threadId);
              if (thread) {
                thread.isMuted = false;
              }
            },
            false,
            "thread/unmuteThread",
          ),

        setMutedThreads: (threadIds) =>
          set(
            (state) => {
              state.mutedThreadIds = new Set(threadIds);
            },
            false,
            "thread/setMutedThreads",
          ),

        // Unread management
        markThreadAsRead: (threadId, lastReadMessageId) =>
          set(
            (state) => {
              state.unreadThreadIds.delete(threadId);
              const thread = state.threads.get(threadId);
              if (thread) {
                state.totalUnreadCount = Math.max(
                  0,
                  state.totalUnreadCount - thread.unreadCount,
                );
                thread.unreadCount = 0;
                if (lastReadMessageId) {
                  thread.lastReadMessageId = lastReadMessageId;
                }
              }
            },
            false,
            "thread/markThreadAsRead",
          ),

        markAllThreadsAsRead: () =>
          set(
            (state) => {
              state.unreadThreadIds.clear();
              state.totalUnreadCount = 0;
              state.threads.forEach((thread) => {
                thread.unreadCount = 0;
              });
            },
            false,
            "thread/markAllThreadsAsRead",
          ),

        incrementThreadUnread: (threadId) =>
          set(
            (state) => {
              state.unreadThreadIds.add(threadId);
              const thread = state.threads.get(threadId);
              if (thread) {
                thread.unreadCount++;
                state.totalUnreadCount++;
              }
            },
            false,
            "thread/incrementThreadUnread",
          ),

        setThreadUnreadCount: (threadId, count) =>
          set(
            (state) => {
              const thread = state.threads.get(threadId);
              if (thread) {
                const diff = count - thread.unreadCount;
                thread.unreadCount = count;
                state.totalUnreadCount = Math.max(
                  0,
                  state.totalUnreadCount + diff,
                );

                if (count > 0) {
                  state.unreadThreadIds.add(threadId);
                } else {
                  state.unreadThreadIds.delete(threadId);
                }
              }
            },
            false,
            "thread/setThreadUnreadCount",
          ),

        // Loading states
        setLoadingThreads: (loading) =>
          set(
            (state) => {
              state.isLoadingThreads = loading;
            },
            false,
            "thread/setLoadingThreads",
          ),

        setLoadingThread: (threadId) =>
          set(
            (state) => {
              state.isLoadingThread = threadId;
            },
            false,
            "thread/setLoadingThread",
          ),

        setLoadingMessages: (threadId) =>
          set(
            (state) => {
              state.isLoadingMessages = threadId;
            },
            false,
            "thread/setLoadingMessages",
          ),

        setSendingReply: (sending) =>
          set(
            (state) => {
              state.isSendingReply = sending;
            },
            false,
            "thread/setSendingReply",
          ),

        // Pagination
        setHasMoreThreads: (hasMore) =>
          set(
            (state) => {
              state.hasMoreThreads = hasMore;
            },
            false,
            "thread/setHasMoreThreads",
          ),

        setThreadsCursor: (cursor) =>
          set(
            (state) => {
              state.threadsCursor = cursor;
            },
            false,
            "thread/setThreadsCursor",
          ),

        setHasMoreMessages: (threadId, hasMore) =>
          set(
            (state) => {
              state.hasMoreMessages.set(threadId, hasMore);
            },
            false,
            "thread/setHasMoreMessages",
          ),

        setMessagesCursor: (threadId, cursor) =>
          set(
            (state) => {
              state.messagesCursor.set(threadId, cursor);
            },
            false,
            "thread/setMessagesCursor",
          ),

        // UI state
        setThreadPanelOpen: (open) =>
          set(
            (state) => {
              state.threadPanelOpen = open;
              if (!open) {
                state.activeThreadId = null;
                state.activeThread = null;
              }
            },
            false,
            "thread/setThreadPanelOpen",
          ),

        toggleThreadPanel: () =>
          set(
            (state) => {
              state.threadPanelOpen = !state.threadPanelOpen;
              if (!state.threadPanelOpen) {
                state.activeThreadId = null;
                state.activeThread = null;
              }
            },
            false,
            "thread/toggleThreadPanel",
          ),

        setThreadListOpen: (open) =>
          set(
            (state) => {
              state.threadListOpen = open;
            },
            false,
            "thread/setThreadListOpen",
          ),

        toggleThreadList: () =>
          set(
            (state) => {
              state.threadListOpen = !state.threadListOpen;
            },
            false,
            "thread/toggleThreadList",
          ),

        // Error
        setError: (error) =>
          set(
            (state) => {
              state.error = error;
            },
            false,
            "thread/setError",
          ),

        // Utility
        resetThreadStore: () =>
          set(
            () => ({
              ...initialState,
              threads: new Map(),
              threadMessages: new Map(),
              followedThreadIds: new Set(),
              mutedThreadIds: new Set(),
              unreadThreadIds: new Set(),
              hasMoreMessages: new Map(),
              messagesCursor: new Map(),
            }),
            false,
            "thread/resetThreadStore",
          ),

        clearThreadMessages: (threadId) =>
          set(
            (state) => {
              state.threadMessages.delete(threadId);
              state.hasMoreMessages.delete(threadId);
              state.messagesCursor.delete(threadId);
            },
            false,
            "thread/clearThreadMessages",
          ),
      })),
    ),
    { name: "thread-store" },
  ),
);

// ============================================================================
// Selectors
// ============================================================================

export const selectActiveThread = (state: ThreadStore) => state.activeThread;

export const selectThreadList = (state: ThreadStore) =>
  state.threadIds
    .map((id) => state.threads.get(id))
    .filter((t): t is Thread => t !== undefined);

export const selectFollowedThreads = (state: ThreadStore) =>
  Array.from(state.followedThreadIds)
    .map((id) => state.threads.get(id))
    .filter((t): t is Thread => t !== undefined);

export const selectUnreadThreads = (state: ThreadStore) =>
  Array.from(state.unreadThreadIds)
    .map((id) => state.threads.get(id))
    .filter((t): t is Thread => t !== undefined && t.unreadCount > 0);

export const selectThreadsByChannel =
  (channelId: string) => (state: ThreadStore) =>
    Array.from(state.threads.values()).filter((t) => t.channelId === channelId);

export const selectThreadMessagesForThread =
  (threadId: string) => (state: ThreadStore) => {
    const threadMsgs = state.threadMessages.get(threadId);
    if (!threadMsgs) return [];
    return Array.from(threadMsgs.values()).sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  };

export const selectIsThreadFollowed =
  (threadId: string) => (state: ThreadStore) =>
    state.followedThreadIds.has(threadId);

export const selectIsThreadMuted = (threadId: string) => (state: ThreadStore) =>
  state.mutedThreadIds.has(threadId);

export const selectHasMoreThreadMessages =
  (threadId: string) => (state: ThreadStore) =>
    state.hasMoreMessages.get(threadId) ?? true;

export const selectTotalUnreadThreadCount = (state: ThreadStore) =>
  state.totalUnreadCount;
