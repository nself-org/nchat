"use client";

// ===============================================================================
// useDemo Hook
// ===============================================================================
//
// React hook for accessing and managing demo mode state. Provides access to
// demo data, template switching, and demo user operations.
//
// ===============================================================================

import { useState, useEffect, useCallback, useMemo } from "react";
import type { TemplateId } from "@/templates/types";
import {
  isDemoModeEnabled,
  getDemoState,
  enableDemoMode,
  disableDemoMode,
  switchDemoTemplate,
  getCurrentDemoTemplate,
  getDemoUser,
  getDemoSession,
  switchDemoUser,
  addDemoMessage,
  addDemoReaction,
  resetDemoData,
  getDemoMessages,
  getDemoChannels,
  getDemoUsers,
  getDemoReactions,
  type DemoState,
  type DemoSession,
} from "@/lib/demo/demo-mode";
import {
  getDemoUser as getUserById,
  getDemoChannel,
  getChannelMessages,
  getThreadReplies,
  getCurrentDemoUser,
  getCurrentUserChannels,
  getCurrentUserDMs,
  getCurrentUserGroups,
  getTotalUnreadCount,
  getTotalMentionCount,
  type DemoUser,
  type DemoChannel,
  type DemoMessage,
  type DemoFile,
} from "@/lib/demo/sample-data";

// -------------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------------

export interface UseDemoReturn {
  // Demo State
  isDemo: boolean;
  isLoading: boolean;
  demoState: DemoState | null;
  session: DemoSession | null;

  // Template
  currentTemplate: TemplateId;
  switchTemplate: (templateId: TemplateId) => void;

  // User
  currentUser: DemoUser | null;
  switchUser: (userId: string) => void;
  allUsers: DemoUser[];

  // Channels
  channels: DemoChannel[];
  directMessages: DemoChannel[];
  groupChannels: DemoChannel[];
  getChannel: (channelId: string) => DemoChannel | undefined;
  totalUnread: number;
  totalMentions: number;

  // Messages
  messages: DemoMessage[];
  getMessagesForChannel: (channelId: string) => DemoMessage[];
  getThreadMessages: (messageId: string) => DemoMessage[];
  sendMessage: (
    channelId: string,
    content: string,
    options?: SendMessageOptions,
  ) => DemoMessage | null;
  toggleReaction: (messageId: string, emoji: string) => boolean;

  // Demo Control
  enableDemo: (templateId?: TemplateId) => void;
  disableDemo: () => void;
  resetData: () => void;
}

export interface SendMessageOptions {
  attachments?: DemoFile[];
  replyTo?: string;
  threadId?: string;
}

// -------------------------------------------------------------------------------
// Hook Implementation
// -------------------------------------------------------------------------------

export function useDemo(): UseDemoReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [demoState, setDemoState] = useState<DemoState | null>(null);
  const [session, setSession] = useState<DemoSession | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Load demo state on mount
  useEffect(() => {
    const loadState = () => {
      setDemoState(getDemoState());
      setSession(getDemoSession());
      setIsLoading(false);
    };

    loadState();

    // Listen for storage changes (for multi-tab support)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.startsWith("nchat-demo")) {
        loadState();
        setRefreshKey((k) => k + 1);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Check if demo mode is active
  const isDemo = useMemo(() => {
    return demoState?.isEnabled === true;
  }, [demoState]);

  // Get current template
  const currentTemplate = useMemo(() => {
    return demoState?.currentTemplate ?? "default";
  }, [demoState]);

  // Switch template
  const switchTemplate = useCallback((templateId: TemplateId) => {
    const newState = switchDemoTemplate(templateId);
    setDemoState(newState);
  }, []);

  // Get current user
  const currentUser = useMemo(() => {
    return demoState?.currentUser ?? null;
  }, [demoState]);

  // Switch user
  const switchUser = useCallback((userId: string) => {
    const newUser = switchDemoUser(userId);
    if (newUser) {
      setDemoState(getDemoState());
    }
  }, []);

  // Get all users
  const allUsers = useMemo(() => {
    return getDemoUsers();
  }, [refreshKey]);

  // Get channels
  const channels = useMemo(() => {
    if (!isDemo) return [];
    return getCurrentUserChannels();
  }, [isDemo, refreshKey]);

  // Get DMs
  const directMessages = useMemo(() => {
    if (!isDemo) return [];
    return getCurrentUserDMs();
  }, [isDemo, refreshKey]);

  // Get group channels
  const groupChannels = useMemo(() => {
    if (!isDemo) return [];
    return getCurrentUserGroups();
  }, [isDemo, refreshKey]);

  // Get channel by ID
  const getChannel = useCallback((channelId: string) => {
    return getDemoChannel(channelId);
  }, []);

  // Get unread counts
  const totalUnread = useMemo(() => {
    if (!isDemo) return 0;
    return getTotalUnreadCount();
  }, [isDemo, refreshKey]);

  const totalMentions = useMemo(() => {
    if (!isDemo) return 0;
    return getTotalMentionCount();
  }, [isDemo, refreshKey]);

  // Get all messages
  const messages = useMemo(() => {
    if (!isDemo) return [];
    return getDemoMessages();
  }, [isDemo, refreshKey]);

  // Get messages for a channel
  const getMessagesForChannel = useCallback(
    (channelId: string): DemoMessage[] => {
      const allMessages = getDemoMessages();
      return allMessages.filter(
        (msg) => msg.channelId === channelId && !msg.threadId,
      );
    },
    [refreshKey],
  );

  // Get thread messages
  const getThreadMessages = useCallback(
    (messageId: string): DemoMessage[] => {
      return getThreadReplies(messageId);
    },
    [refreshKey],
  );

  // Send a message
  const sendMessage = useCallback(
    (
      channelId: string,
      content: string,
      options?: SendMessageOptions,
    ): DemoMessage | null => {
      if (!isDemo || !currentUser) return null;

      const message = addDemoMessage({
        channelId,
        userId: currentUser.id,
        content,
        createdAt: new Date(),
        attachments: options?.attachments,
        threadId: options?.threadId,
        replyTo: options?.replyTo,
      });

      if (message) {
        setRefreshKey((k) => k + 1);
      }

      return message;
    },
    [isDemo, currentUser],
  );

  // Toggle reaction
  const toggleReaction = useCallback(
    (messageId: string, emoji: string): boolean => {
      if (!isDemo) return false;

      const success = addDemoReaction(messageId, emoji);
      if (success) {
        setRefreshKey((k) => k + 1);
      }

      return success;
    },
    [isDemo],
  );

  // Enable demo mode
  const enableDemo = useCallback((templateId: TemplateId = "default") => {
    const newState = enableDemoMode(templateId);
    setDemoState(newState);
    setSession(getDemoSession());
  }, []);

  // Disable demo mode
  const disableDemo = useCallback(() => {
    disableDemoMode();
    setDemoState(null);
    setSession(null);
  }, []);

  // Reset demo data
  const resetData = useCallback(() => {
    resetDemoData();
    setRefreshKey((k) => k + 1);
  }, []);

  return {
    // Demo State
    isDemo,
    isLoading,
    demoState,
    session,

    // Template
    currentTemplate,
    switchTemplate,

    // User
    currentUser,
    switchUser,
    allUsers,

    // Channels
    channels,
    directMessages,
    groupChannels,
    getChannel,
    totalUnread,
    totalMentions,

    // Messages
    messages,
    getMessagesForChannel,
    getThreadMessages,
    sendMessage,
    toggleReaction,

    // Demo Control
    enableDemo,
    disableDemo,
    resetData,
  };
}

// -------------------------------------------------------------------------------
// Convenience Hooks
// -------------------------------------------------------------------------------

/**
 * Check if currently in demo mode
 */
export function useDemoCheck(): boolean {
  const { isDemo } = useDemo();
  return isDemo;
}

/**
 * Get the current demo template
 */
export function useDemoTemplate(): TemplateId {
  const { currentTemplate } = useDemo();
  return currentTemplate;
}

/**
 * Get the current demo user
 */
export function useDemoUser(): DemoUser | null {
  const { currentUser } = useDemo();
  return currentUser;
}

/**
 * Get demo channels
 */
export function useDemoChannels(): DemoChannel[] {
  const { channels } = useDemo();
  return channels;
}

/**
 * Get messages for a specific channel
 */
export function useDemoMessages(channelId: string): DemoMessage[] {
  const { getMessagesForChannel } = useDemo();
  return getMessagesForChannel(channelId);
}

export default useDemo;
