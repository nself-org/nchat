/**
 * Store Mocks
 *
 * Utilities for mocking and resetting Zustand stores in tests
 */

// ============================================================================
// Store Reset Utilities
// ============================================================================

/**
 * Reset all application stores to their initial state
 */
export function resetAllStores() {
  resetMessageStore();
  resetChannelStore();
  resetUIStore();
  resetUserStore();
  resetNotificationStore();
  resetPresenceStore();
  resetTypingStore();
}

/**
 * Reset message store
 */
export function resetMessageStore() {
  try {
    const { useMessageStore } = require("@/stores/message-store");
    const store = useMessageStore.getState();
    if (typeof store.reset === "function") {
      store.reset();
    }
  } catch (e) {
    // Store may not exist in some test environments
  }
}

/**
 * Reset channel store
 */
export function resetChannelStore() {
  try {
    const { useChannelStore } = require("@/stores/channel-store");
    const store = useChannelStore.getState();
    if (typeof store.resetChannelStore === "function") {
      store.resetChannelStore();
    } else if (typeof store.reset === "function") {
      store.reset();
    }
  } catch (e) {
    // Store may not exist in some test environments
  }
}

/**
 * Reset UI store
 */
export function resetUIStore() {
  try {
    const { useUIStore } = require("@/stores/ui-store");
    const store = useUIStore.getState();
    if (typeof store.reset === "function") {
      store.reset();
    }
  } catch (e) {
    // Store may not exist in some test environments
  }
}

/**
 * Reset user store
 */
export function resetUserStore() {
  try {
    const { useUserStore } = require("@/stores/user-store");
    const store = useUserStore.getState();
    if (typeof store.reset === "function") {
      store.reset();
    }
  } catch (e) {
    // Store may not exist in some test environments
  }
}

/**
 * Reset notification store
 */
export function resetNotificationStore() {
  try {
    const { useNotificationStore } = require("@/stores/notification-store");
    const store = useNotificationStore.getState();
    if (typeof store.reset === "function") {
      store.reset();
    }
  } catch (e) {
    // Store may not exist in some test environments
  }
}

/**
 * Reset presence store
 */
export function resetPresenceStore() {
  try {
    const { usePresenceStore } = require("@/stores/presence-store");
    const store = usePresenceStore.getState();
    if (typeof store.reset === "function") {
      store.reset();
    }
  } catch (e) {
    // Store may not exist in some test environments
  }
}

/**
 * Reset typing store
 */
export function resetTypingStore() {
  try {
    const { useTypingStore } = require("@/stores/typing-store");
    const store = useTypingStore.getState();
    if (typeof store.reset === "function") {
      store.reset();
    }
  } catch (e) {
    // Store may not exist in some test environments
  }
}

// ============================================================================
// Store Snapshot Utilities
// ============================================================================

/**
 * Get a snapshot of all stores for debugging
 */
export function getStoresSnapshot() {
  const snapshot: Record<string, any> = {};

  try {
    const { useMessageStore } = require("@/stores/message-store");
    snapshot.message = useMessageStore.getState();
  } catch (e) {
    snapshot.message = null;
  }

  try {
    const { useChannelStore } = require("@/stores/channel-store");
    snapshot.channel = useChannelStore.getState();
  } catch (e) {
    snapshot.channel = null;
  }

  try {
    const { useUIStore } = require("@/stores/ui-store");
    snapshot.ui = useUIStore.getState();
  } catch (e) {
    snapshot.ui = null;
  }

  try {
    const { useUserStore } = require("@/stores/user-store");
    snapshot.user = useUserStore.getState();
  } catch (e) {
    snapshot.user = null;
  }

  try {
    const { useNotificationStore } = require("@/stores/notification-store");
    snapshot.notification = useNotificationStore.getState();
  } catch (e) {
    snapshot.notification = null;
  }

  return snapshot;
}

// ============================================================================
// Store Setup Utilities
// ============================================================================

import type { TestChannel, TestMessage, TestUser } from "../render";

/**
 * Setup message store with initial data
 */
export function setupMessageStore(
  messagesByChannel: Record<string, TestMessage[]>,
) {
  try {
    const { useMessageStore } = require("@/stores/message-store");
    const store = useMessageStore.getState();

    Object.entries(messagesByChannel).forEach(([channelId, messages]) => {
      const formattedMessages = messages.map((m) => ({
        id: m.id,
        channelId,
        content: m.content,
        type: m.type || "text",
        userId: m.userId,
        user: m.user
          ? {
              id: m.user.id || m.userId,
              username: m.user.username || "user",
              displayName: m.user.displayName || "User",
              avatarUrl: m.user.avatarUrl,
            }
          : undefined,
        createdAt: m.createdAt || new Date(),
        isEdited: m.isEdited || false,
        reactions: m.reactions || [],
      }));

      if (typeof store.setMessages === "function") {
        store.setMessages(channelId, formattedMessages);
      }
    });

    return store;
  } catch (e) {
    return null;
  }
}

/**
 * Setup channel store with initial data
 */
export function setupChannelStore(
  channels: TestChannel[],
  activeChannelId?: string,
) {
  try {
    const { useChannelStore } = require("@/stores/channel-store");
    const store = useChannelStore.getState();

    const formattedChannels = channels.map((ch) => ({
      id: ch.id,
      name: ch.name,
      slug: ch.slug,
      description: ch.description || null,
      type: ch.type,
      categoryId: null,
      createdBy: "user-owner",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      topic: null,
      icon: null,
      color: null,
      isArchived: ch.isArchived || false,
      isDefault: ch.isDefault || false,
      memberCount: ch.memberCount || 0,
      lastMessageAt: null,
      lastMessagePreview: null,
    }));

    if (typeof store.setChannels === "function") {
      store.setChannels(formattedChannels);
    }

    if (activeChannelId && typeof store.setActiveChannel === "function") {
      store.setActiveChannel(activeChannelId);
    }

    return store;
  } catch (e) {
    return null;
  }
}

/**
 * Setup user store with online users
 */
export function setupUserStore(users: TestUser[]) {
  try {
    const { useUserStore } = require("@/stores/user-store");
    const store = useUserStore.getState();

    users.forEach((user) => {
      if (typeof store.setUser === "function") {
        store.setUser(user);
      }
    });

    return store;
  } catch (e) {
    return null;
  }
}

// ============================================================================
// Store Mock Creators
// ============================================================================

/**
 * Create a mock message store for testing
 */
export function createMockMessageStore(initialState?: {
  messagesByChannel?: Record<string, any[]>;
  currentChannelId?: string;
  isLoading?: boolean;
}) {
  return {
    messagesByChannel: initialState?.messagesByChannel || {},
    currentChannelId: initialState?.currentChannelId || null,
    isLoading: initialState?.isLoading || false,
    error: null,
    setMessages: jest.fn(),
    addMessage: jest.fn(),
    updateMessage: jest.fn(),
    deleteMessage: jest.fn(),
    setCurrentChannel: jest.fn(),
    setLoading: jest.fn(),
    setError: jest.fn(),
    reset: jest.fn(),
  };
}

/**
 * Create a mock channel store for testing
 */
export function createMockChannelStore(initialState?: {
  channels?: any[];
  activeChannelId?: string;
  isLoading?: boolean;
}) {
  return {
    channels: initialState?.channels || [],
    activeChannelId: initialState?.activeChannelId || null,
    isLoading: initialState?.isLoading || false,
    error: null,
    setChannels: jest.fn(),
    addChannel: jest.fn(),
    updateChannel: jest.fn(),
    deleteChannel: jest.fn(),
    setActiveChannel: jest.fn(),
    setLoading: jest.fn(),
    setError: jest.fn(),
    resetChannelStore: jest.fn(),
  };
}

/**
 * Create a mock UI store for testing
 */
export function createMockUIStore(initialState?: {
  sidebarOpen?: boolean;
  threadOpen?: boolean;
  settingsOpen?: boolean;
  searchOpen?: boolean;
}) {
  return {
    sidebarOpen: initialState?.sidebarOpen ?? true,
    threadOpen: initialState?.threadOpen ?? false,
    settingsOpen: initialState?.settingsOpen ?? false,
    searchOpen: initialState?.searchOpen ?? false,
    activeThreadId: null,
    modalStack: [],
    setSidebarOpen: jest.fn(),
    setThreadOpen: jest.fn(),
    setSettingsOpen: jest.fn(),
    setSearchOpen: jest.fn(),
    setActiveThreadId: jest.fn(),
    pushModal: jest.fn(),
    popModal: jest.fn(),
    reset: jest.fn(),
  };
}
