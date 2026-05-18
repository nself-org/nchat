/**
 * Typing Store - Manages typing indicator state for the nself-chat application
 *
 * Handles typing indicators for channels, threads, and direct messages
 */

import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

// ============================================================================
// Types
// ============================================================================

export interface TypingUser {
  userId: string;
  userName: string;
  userAvatar?: string;
  startedAt: number; // timestamp
}

export interface TypingState {
  // Typing users by context
  // Key format: "channel:{channelId}" or "thread:{threadId}" or "dm:{conversationId}"
  typingByContext: Map<string, Map<string, TypingUser>>;

  // Current user's typing state
  isTyping: boolean;
  typingInContext: string | null; // current context where user is typing

  // Configuration
  typingTimeout: number; // ms before typing indicator expires
  debounceDelay: number; // ms to debounce typing updates
}

export interface TypingActions {
  // Set typing for a user in a context
  setUserTyping: (contextKey: string, user: TypingUser) => void;

  // Remove typing for a user in a context
  clearUserTyping: (contextKey: string, userId: string) => void;

  // Set all typing users for a context (from server sync)
  setTypingUsers: (contextKey: string, users: TypingUser[]) => void;

  // Clear all typing for a context
  clearContextTyping: (contextKey: string) => void;

  // Get typing users for a context
  getTypingUsers: (contextKey: string) => TypingUser[];

  // Current user typing actions
  startTyping: (contextKey: string) => void;
  stopTyping: () => void;

  // Cleanup expired typing indicators
  cleanupExpired: () => void;

  // Configuration
  setTypingTimeout: (timeout: number) => void;
  setDebounceDelay: (delay: number) => void;

  // Utility
  reset: () => void;
}

export type TypingStore = TypingState & TypingActions;

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_TYPING_TIMEOUT = 5000; // 5 seconds
const DEFAULT_DEBOUNCE_DELAY = 300; // 300ms

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a context key for a channel
 */
export const getChannelContextKey = (channelId: string): string =>
  `channel:${channelId}`;

/**
 * Create a context key for a thread
 */
export const getThreadContextKey = (threadId: string): string =>
  `thread:${threadId}`;

/**
 * Create a context key for a direct message conversation
 */
export const getDMContextKey = (conversationId: string): string =>
  `dm:${conversationId}`;

/**
 * Parse a context key to get type and ID
 */
export const parseContextKey = (
  contextKey: string,
): { type: "channel" | "thread" | "dm"; id: string } | null => {
  const [type, id] = contextKey.split(":");
  if (!type || !id) return null;
  if (type !== "channel" && type !== "thread" && type !== "dm") return null;
  return { type, id };
};

// ============================================================================
// Initial State
// ============================================================================

const initialState: TypingState = {
  typingByContext: new Map(),
  isTyping: false,
  typingInContext: null,
  typingTimeout: DEFAULT_TYPING_TIMEOUT,
  debounceDelay: DEFAULT_DEBOUNCE_DELAY,
};

// ============================================================================
// Store
// ============================================================================

export const useTypingStore = create<TypingStore>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        ...initialState,

        // Set typing for a user in a context
        setUserTyping: (contextKey, user) =>
          set(
            (state) => {
              let contextTyping = state.typingByContext.get(contextKey);
              if (!contextTyping) {
                contextTyping = new Map();
                state.typingByContext.set(contextKey, contextTyping);
              }
              contextTyping.set(user.userId, {
                ...user,
                startedAt: Date.now(),
              });
            },
            false,
            "typing/setUserTyping",
          ),

        // Remove typing for a user in a context
        clearUserTyping: (contextKey, userId) =>
          set(
            (state) => {
              const contextTyping = state.typingByContext.get(contextKey);
              if (contextTyping) {
                contextTyping.delete(userId);
                // Clean up empty context maps
                if (contextTyping.size === 0) {
                  state.typingByContext.delete(contextKey);
                }
              }
            },
            false,
            "typing/clearUserTyping",
          ),

        // Set all typing users for a context (from server sync)
        setTypingUsers: (contextKey, users) =>
          set(
            (state) => {
              if (users.length === 0) {
                state.typingByContext.delete(contextKey);
              } else {
                const contextTyping = new Map<string, TypingUser>();
                users.forEach((user) => {
                  contextTyping.set(user.userId, {
                    ...user,
                    startedAt: user.startedAt || Date.now(),
                  });
                });
                state.typingByContext.set(contextKey, contextTyping);
              }
            },
            false,
            "typing/setTypingUsers",
          ),

        // Clear all typing for a context
        clearContextTyping: (contextKey) =>
          set(
            (state) => {
              state.typingByContext.delete(contextKey);
            },
            false,
            "typing/clearContextTyping",
          ),

        // Get typing users for a context
        getTypingUsers: (contextKey) => {
          const contextTyping = get().typingByContext.get(contextKey);
          if (!contextTyping) return [];
          return Array.from(contextTyping.values());
        },

        // Current user starts typing
        startTyping: (contextKey) =>
          set(
            (state) => {
              state.isTyping = true;
              state.typingInContext = contextKey;
            },
            false,
            "typing/startTyping",
          ),

        // Current user stops typing
        stopTyping: () =>
          set(
            (state) => {
              state.isTyping = false;
              state.typingInContext = null;
            },
            false,
            "typing/stopTyping",
          ),

        // Cleanup expired typing indicators
        cleanupExpired: () =>
          set(
            (state) => {
              const now = Date.now();
              const timeout = state.typingTimeout;

              state.typingByContext.forEach((contextTyping, contextKey) => {
                contextTyping.forEach((user, userId) => {
                  if (now - user.startedAt > timeout) {
                    contextTyping.delete(userId);
                  }
                });

                // Clean up empty context maps
                if (contextTyping.size === 0) {
                  state.typingByContext.delete(contextKey);
                }
              });
            },
            false,
            "typing/cleanupExpired",
          ),

        // Configuration
        setTypingTimeout: (timeout) =>
          set(
            (state) => {
              state.typingTimeout = timeout;
            },
            false,
            "typing/setTypingTimeout",
          ),

        setDebounceDelay: (delay) =>
          set(
            (state) => {
              state.debounceDelay = delay;
            },
            false,
            "typing/setDebounceDelay",
          ),

        // Utility
        reset: () =>
          set(
            () => ({
              ...initialState,
              typingByContext: new Map(),
            }),
            false,
            "typing/reset",
          ),
      })),
    ),
    { name: "typing-store" },
  ),
);

// ============================================================================
// Selectors
// ============================================================================

/**
 * Select typing users for a specific channel
 */
export const selectChannelTypingUsers =
  (channelId: string) => (state: TypingStore) => {
    const contextKey = getChannelContextKey(channelId);
    const contextTyping = state.typingByContext.get(contextKey);
    if (!contextTyping) return [];
    return Array.from(contextTyping.values());
  };

/**
 * Select typing users for a specific thread
 */
export const selectThreadTypingUsers =
  (threadId: string) => (state: TypingStore) => {
    const contextKey = getThreadContextKey(threadId);
    const contextTyping = state.typingByContext.get(contextKey);
    if (!contextTyping) return [];
    return Array.from(contextTyping.values());
  };

/**
 * Select typing users for a specific DM conversation
 */
export const selectDMTypingUsers =
  (conversationId: string) => (state: TypingStore) => {
    const contextKey = getDMContextKey(conversationId);
    const contextTyping = state.typingByContext.get(contextKey);
    if (!contextTyping) return [];
    return Array.from(contextTyping.values());
  };

/**
 * Check if any users are typing in a context
 */
export const selectIsAnyoneTyping =
  (contextKey: string) => (state: TypingStore) => {
    const contextTyping = state.typingByContext.get(contextKey);
    return contextTyping ? contextTyping.size > 0 : false;
  };

/**
 * Get count of typing users in a context
 */
export const selectTypingCount =
  (contextKey: string) => (state: TypingStore) => {
    const contextTyping = state.typingByContext.get(contextKey);
    return contextTyping?.size ?? 0;
  };

/**
 * Select current user's typing state
 */
export const selectCurrentUserTyping = (state: TypingStore) => ({
  isTyping: state.isTyping,
  context: state.typingInContext,
});

// ============================================================================
// Typing Indicator Text Helper
// ============================================================================

/**
 * Generate typing indicator text from typing users
 */
export const getTypingIndicatorText = (typingUsers: TypingUser[]): string => {
  if (typingUsers.length === 0) return "";

  if (typingUsers.length === 1) {
    return `${typingUsers[0].userName} is typing...`;
  }

  if (typingUsers.length === 2) {
    return `${typingUsers[0].userName} and ${typingUsers[1].userName} are typing...`;
  }

  if (typingUsers.length === 3) {
    return `${typingUsers[0].userName}, ${typingUsers[1].userName}, and ${typingUsers[2].userName} are typing...`;
  }

  return `${typingUsers[0].userName}, ${typingUsers[1].userName}, and ${typingUsers.length - 2} others are typing...`;
};
