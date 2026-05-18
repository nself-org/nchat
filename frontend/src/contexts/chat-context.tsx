"use client";

/**
 * Chat Context
 *
 * Provides chat-related state and actions for the entire application.
 * Includes active channel, active thread, online users, typing users,
 * and unread counts.
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  ReactNode,
} from "react";
import { useAuth } from "./auth-context";
import { useChannelStore } from "@/stores/channel-store";
import { useMessageStore } from "@/stores/message-store";
import { useUserStore } from "@/stores/user-store";
import { useNotificationStore } from "@/stores/notification-store";
import type { Channel } from "@/stores/channel-store";
import type { Message } from "@/types/message";

// =============================================================================
// Types
// =============================================================================

export interface ThreadState {
  threadId: string;
  parentMessage: Message;
  channelId: string;
}

export interface OnlineUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  presence: "online" | "away" | "dnd" | "offline" | "invisible";
  lastSeenAt?: Date;
}

export interface TypingUser {
  id: string;
  displayName: string;
  avatarUrl?: string;
  channelId: string;
  startedAt: Date;
}

export interface UnreadState {
  total: number;
  byChannel: Record<string, number>;
  mentions: number;
  mentionsByChannel: Record<string, number>;
}

export interface ChatContextValue {
  // Active States
  activeChannel: Channel | null;
  activeChannelId: string | null;
  activeThread: ThreadState | null;

  // Channel Actions
  setActiveChannel: (channelId: string | null) => void;
  switchChannel: (channelId: string) => Promise<void>;

  // Thread Actions
  openThread: (message: Message) => void;
  closeThread: () => void;
  isThreadOpen: boolean;

  // Online Users
  onlineUsers: OnlineUser[];
  isUserOnline: (userId: string) => boolean;
  getUserPresence: (
    userId: string,
  ) => "online" | "away" | "dnd" | "offline" | "invisible";

  // Typing Indicators
  typingUsers: Record<string, TypingUser[]>;
  getTypingUsersForChannel: (channelId: string) => TypingUser[];
  startTyping: (channelId: string) => void;
  stopTyping: (channelId: string) => void;

  // Unread Counts
  unreadState: UnreadState;
  getUnreadCount: (channelId: string) => number;
  getMentionCount: (channelId: string) => number;
  markChannelAsRead: (channelId: string) => void;
  markAllAsRead: () => void;

  // UI State
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Connection State
  isConnected: boolean;
  isReconnecting: boolean;

  // Loading States
  isLoadingChannel: boolean;
  isLoadingMessages: boolean;
}

// =============================================================================
// Context
// =============================================================================

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

// =============================================================================
// Provider
// =============================================================================

export interface ChatProviderProps {
  children: ReactNode;
}

export function ChatProvider({ children }: ChatProviderProps) {
  const { user } = useAuth();

  // External stores
  const channelStore = useChannelStore();
  const messageStore = useMessageStore();
  const userStore = useUserStore();
  const notificationStore = useNotificationStore();

  // Local state
  const [activeThread, setActiveThread] = useState<ThreadState | null>(null);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Record<string, TypingUser[]>>(
    {},
  );
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isLoadingChannel, setIsLoadingChannel] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Typing timeout refs
  const typingTimeouts = React.useRef<Record<string, NodeJS.Timeout>>({});
  const typingUserTimeouts = React.useRef<NodeJS.Timeout[]>([]);
  const channelReadTimeout = React.useRef<NodeJS.Timeout | null>(null);

  // =============================================================================
  // Derived State
  // =============================================================================

  const activeChannel = useMemo(() => {
    return channelStore.activeChannelId
      ? channelStore.getChannelById(channelStore.activeChannelId) || null
      : null;
  }, [channelStore.activeChannelId, channelStore.channels]);

  const onlineUsers = useMemo(() => {
    const users: OnlineUser[] = [];
    onlineUserIds.forEach((userId) => {
      const user = userStore.getUser(userId);
      if (user) {
        users.push({
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          presence: user.presence,
          lastSeenAt: user.lastSeenAt,
        });
      }
    });
    return users;
  }, [onlineUserIds, userStore.users]);

  const unreadState = useMemo((): UnreadState => {
    const byChannel: Record<string, number> = {};
    const mentionsByChannel: Record<string, number> = {};
    let total = 0;
    let mentions = 0;

    // Get from notification store
    Object.entries(notificationStore.unreadCounts).forEach(
      ([channelId, counts]) => {
        byChannel[channelId] = counts.messages;
        mentionsByChannel[channelId] = counts.mentions;
        total += counts.messages;
        mentions += counts.mentions;
      },
    );

    return { total, byChannel, mentions, mentionsByChannel };
  }, [notificationStore.unreadCounts]);

  // =============================================================================
  // Channel Actions
  // =============================================================================

  const setActiveChannel = useCallback(
    (channelId: string | null) => {
      channelStore.setActiveChannel(channelId);
      messageStore.setCurrentChannel(channelId);

      // Close thread when switching channels
      if (activeThread && channelId && activeThread.channelId !== channelId) {
        setActiveThread(null);
      }
    },
    [channelStore, messageStore, activeThread],
  );

  const switchChannel = useCallback(
    async (channelId: string) => {
      setIsLoadingChannel(true);
      try {
        setActiveChannel(channelId);
        // Clear any existing timeout
        if (channelReadTimeout.current) {
          clearTimeout(channelReadTimeout.current);
        }
        // Mark as read after a short delay
        channelReadTimeout.current = setTimeout(() => {
          notificationStore.markChannelAsRead(channelId);
          channelReadTimeout.current = null;
        }, 1000);
      } finally {
        setIsLoadingChannel(false);
      }
    },
    [setActiveChannel, notificationStore],
  );

  // =============================================================================
  // Thread Actions
  // =============================================================================

  const openThread = useCallback(
    (message: Message) => {
      if (!channelStore.activeChannelId) return;

      setActiveThread({
        threadId: message.id,
        parentMessage: message,
        channelId: channelStore.activeChannelId,
      });
    },
    [channelStore.activeChannelId],
  );

  const closeThread = useCallback(() => {
    setActiveThread(null);
  }, []);

  // =============================================================================
  // Online User Actions
  // =============================================================================

  const isUserOnline = useCallback(
    (userId: string) => {
      return onlineUserIds.has(userId);
    },
    [onlineUserIds],
  );

  const getUserPresence = useCallback(
    (userId: string): "online" | "away" | "dnd" | "offline" | "invisible" => {
      const user = userStore.getUser(userId);
      return user?.presence || "offline";
    },
    [userStore],
  );

  // =============================================================================
  // Typing Actions
  // =============================================================================

  const getTypingUsersForChannel = useCallback(
    (channelId: string): TypingUser[] => {
      return typingUsers[channelId] || [];
    },
    [typingUsers],
  );

  const startTyping = useCallback(
    (channelId: string) => {
      if (!user) return;

      // Clear existing timeout
      if (typingTimeouts.current[channelId]) {
        clearTimeout(typingTimeouts.current[channelId]);
      }

      // Auto-stop typing after 5 seconds
      typingTimeouts.current[channelId] = setTimeout(() => {
        // Emit stop typing event would go here
        delete typingTimeouts.current[channelId];
      }, 5000);

      // Emit start typing event would go here via socket
    },
    [user],
  );

  const stopTyping = useCallback((channelId: string) => {
    if (typingTimeouts.current[channelId]) {
      clearTimeout(typingTimeouts.current[channelId]);
      delete typingTimeouts.current[channelId];
    }
    // Emit stop typing event would go here via socket
  }, []);

  // =============================================================================
  // Unread Actions
  // =============================================================================

  const getUnreadCount = useCallback(
    (channelId: string) => {
      return unreadState.byChannel[channelId] || 0;
    },
    [unreadState],
  );

  const getMentionCount = useCallback(
    (channelId: string) => {
      return unreadState.mentionsByChannel[channelId] || 0;
    },
    [unreadState],
  );

  const markChannelAsRead = useCallback(
    (channelId: string) => {
      notificationStore.markChannelAsRead(channelId);
    },
    [notificationStore],
  );

  const markAllAsRead = useCallback(() => {
    notificationStore.markAllAsRead();
  }, [notificationStore]);

  // =============================================================================
  // Sidebar Actions
  // =============================================================================

  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((prev) => !prev);
  }, []);

  const setSidebarCollapsed = useCallback((collapsed: boolean) => {
    setIsSidebarCollapsed(collapsed);
  }, []);

  // =============================================================================
  // Effects
  // =============================================================================

  // Update online users based on presence changes from socket
  useEffect(() => {
    const handlePresenceUpdate = (
      event: CustomEvent<{ userId: string; status: string }>,
    ) => {
      const { userId, status } = event.detail;
      setOnlineUserIds((prev) => {
        const updated = new Set(prev);
        if (status === "online" || status === "away" || status === "dnd") {
          updated.add(userId);
        } else {
          updated.delete(userId);
        }
        return updated;
      });
    };

    window.addEventListener(
      "nchat:presence-update" as keyof WindowEventMap,
      handlePresenceUpdate as EventListener,
    );
    return () => {
      window.removeEventListener(
        "nchat:presence-update" as keyof WindowEventMap,
        handlePresenceUpdate as EventListener,
      );
    };
  }, []);

  // Update typing users based on socket events
  useEffect(() => {
    const handleTypingStart = (event: CustomEvent<TypingUser>) => {
      const typingUser = event.detail;
      setTypingUsers((prev) => ({
        ...prev,
        [typingUser.channelId]: [
          ...(prev[typingUser.channelId] || []).filter(
            (u) => u.id !== typingUser.id,
          ),
          typingUser,
        ],
      }));

      // Auto-remove after 5 seconds
      const timer = setTimeout(() => {
        setTypingUsers((prev) => ({
          ...prev,
          [typingUser.channelId]: (prev[typingUser.channelId] || []).filter(
            (u) => u.id !== typingUser.id,
          ),
        }));
      }, 5000);
      typingUserTimeouts.current.push(timer);
    };

    const handleTypingStop = (
      event: CustomEvent<{ userId: string; channelId: string }>,
    ) => {
      const { userId, channelId } = event.detail;
      setTypingUsers((prev) => ({
        ...prev,
        [channelId]: (prev[channelId] || []).filter((u) => u.id !== userId),
      }));
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
  }, []);

  // Handle connection state changes
  useEffect(() => {
    const handleConnect = () => {
      setIsConnected(true);
      setIsReconnecting(false);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    const handleReconnecting = () => {
      setIsReconnecting(true);
    };

    window.addEventListener("nchat:connected", handleConnect);
    window.addEventListener("nchat:disconnected", handleDisconnect);
    window.addEventListener("nchat:reconnecting", handleReconnecting);

    return () => {
      window.removeEventListener("nchat:connected", handleConnect);
      window.removeEventListener("nchat:disconnected", handleDisconnect);
      window.removeEventListener("nchat:reconnecting", handleReconnecting);
    };
  }, []);

  // Clean up typing timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(typingTimeouts.current).forEach(clearTimeout);
      typingUserTimeouts.current.forEach(clearTimeout);
      if (channelReadTimeout.current) {
        clearTimeout(channelReadTimeout.current);
      }
    };
  }, []);

  // =============================================================================
  // Context Value
  // =============================================================================

  const value = useMemo(
    (): ChatContextValue => ({
      // Active States
      activeChannel,
      activeChannelId: channelStore.activeChannelId,
      activeThread,

      // Channel Actions
      setActiveChannel,
      switchChannel,

      // Thread Actions
      openThread,
      closeThread,
      isThreadOpen: activeThread !== null,

      // Online Users
      onlineUsers,
      isUserOnline,
      getUserPresence,

      // Typing Indicators
      typingUsers,
      getTypingUsersForChannel,
      startTyping,
      stopTyping,

      // Unread Counts
      unreadState,
      getUnreadCount,
      getMentionCount,
      markChannelAsRead,
      markAllAsRead,

      // UI State
      isSidebarCollapsed,
      toggleSidebar,
      setSidebarCollapsed,

      // Connection State
      isConnected,
      isReconnecting,

      // Loading States
      isLoadingChannel,
      isLoadingMessages,
    }),
    [
      activeChannel,
      channelStore.activeChannelId,
      activeThread,
      setActiveChannel,
      switchChannel,
      openThread,
      closeThread,
      onlineUsers,
      isUserOnline,
      getUserPresence,
      typingUsers,
      getTypingUsersForChannel,
      startTyping,
      stopTyping,
      unreadState,
      getUnreadCount,
      getMentionCount,
      markChannelAsRead,
      markAllAsRead,
      isSidebarCollapsed,
      toggleSidebar,
      setSidebarCollapsed,
      isConnected,
      isReconnecting,
      isLoadingChannel,
      isLoadingMessages,
    ],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

// =============================================================================
// Hook
// =============================================================================

export function useChat(): ChatContextValue {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}

// =============================================================================
// Convenience Hooks
// =============================================================================

/**
 * Get the active channel
 */
export function useActiveChannel(): Channel | null {
  const { activeChannel } = useChat();
  return activeChannel;
}

/**
 * Get the active thread
 */
export function useActiveThread(): ThreadState | null {
  const { activeThread } = useChat();
  return activeThread;
}

/**
 * Get typing users for a channel
 */
export function useTypingUsers(channelId: string): TypingUser[] {
  const { getTypingUsersForChannel } = useChat();
  return getTypingUsersForChannel(channelId);
}

/**
 * Get unread counts
 */
export function useUnreadCounts() {
  const { unreadState, getUnreadCount, getMentionCount } = useChat();
  return { unreadState, getUnreadCount, getMentionCount };
}

/**
 * Get connection state
 */
export function useConnectionState() {
  const { isConnected, isReconnecting } = useChat();
  return { isConnected, isReconnecting };
}

export default ChatContext;
