/**
 * Presence Store - Manages user presence state for the nself-chat application
 *
 * Handles presence status, custom status, typing indicators, and online users.
 */

import { create } from "zustand";
import { devtools, subscribeWithSelector, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type {
  PresenceStatus,
  CustomStatus,
  UserPresence,
  PresenceSettings,
  TypingStatus,
} from "@/lib/presence/presence-types";
import { DEFAULT_PRESENCE_SETTINGS } from "@/lib/presence/presence-types";

// ============================================================================
// Types
// ============================================================================

export interface PresenceState {
  // Current user's presence
  myStatus: PresenceStatus;
  myCustomStatus: CustomStatus | null;
  myPreviousStatus: PresenceStatus;
  isIdle: boolean;

  // Other users' presence
  presenceMap: Record<string, UserPresence>;

  // Typing indicators by context key
  typingMap: Record<string, Record<string, TypingStatus>>;

  // Current user's typing state
  isTyping: boolean;
  typingInContext: string | null;

  // Online users cache
  onlineUserIds: string[];
  onlineCount: number;

  // Settings
  settings: PresenceSettings;

  // Connection state
  isConnected: boolean;
  lastSyncAt: Date | null;

  // Loading states
  isInitializing: boolean;
  isSyncing: boolean;
}

export interface PresenceActions {
  // My presence actions
  setMyStatus: (status: PresenceStatus) => void;
  setMyCustomStatus: (status: CustomStatus | null) => void;
  clearMyCustomStatus: () => void;
  setIdle: (isIdle: boolean) => void;
  restorePreviousStatus: () => void;

  // Other users' presence actions
  setUserPresence: (userId: string, presence: Partial<UserPresence>) => void;
  setUsersPresence: (
    presences: Array<{ userId: string } & Partial<UserPresence>>,
  ) => void;
  removeUserPresence: (userId: string) => void;
  clearAllPresence: () => void;

  // Typing actions
  setUserTyping: (contextKey: string, user: TypingStatus) => void;
  clearUserTyping: (contextKey: string, userId: string) => void;
  setContextTyping: (contextKey: string, users: TypingStatus[]) => void;
  clearContextTyping: (contextKey: string) => void;
  setMyTyping: (contextKey: string | null) => void;

  // Online users actions
  setOnlineUserIds: (userIds: string[]) => void;
  addOnlineUser: (userId: string) => void;
  removeOnlineUser: (userId: string) => void;
  setOnlineCount: (count: number) => void;

  // Settings actions
  updateSettings: (settings: Partial<PresenceSettings>) => void;

  // Connection actions
  setConnected: (connected: boolean) => void;
  setSyncing: (syncing: boolean) => void;
  setLastSyncAt: (date: Date | null) => void;

  // Initialization
  setInitializing: (initializing: boolean) => void;
  initialize: (options: {
    status?: PresenceStatus;
    customStatus?: CustomStatus | null;
    settings?: Partial<PresenceSettings>;
  }) => void;

  // Utility actions
  reset: () => void;
  cleanupExpired: () => void;
}

export type PresenceStore = PresenceState & PresenceActions;

// ============================================================================
// Initial State
// ============================================================================

const initialState: PresenceState = {
  myStatus: "online",
  myCustomStatus: null,
  myPreviousStatus: "online",
  isIdle: false,
  presenceMap: {},
  typingMap: {},
  isTyping: false,
  typingInContext: null,
  onlineUserIds: [],
  onlineCount: 0,
  settings: DEFAULT_PRESENCE_SETTINGS,
  isConnected: false,
  lastSyncAt: null,
  isInitializing: true,
  isSyncing: false,
};

// ============================================================================
// Store
// ============================================================================

export const usePresenceStore = create<PresenceStore>()(
  devtools(
    subscribeWithSelector(
      persist(
        immer((set, get) => ({
          ...initialState,

          // ====================================================================
          // My Presence Actions
          // ====================================================================

          setMyStatus: (status) =>
            set(
              (state) => {
                // Save previous status if changing from active status
                if (state.myStatus !== "away" || !state.isIdle) {
                  state.myPreviousStatus = state.myStatus;
                }
                state.myStatus = status;
                state.isIdle = false;
              },
              false,
              "presence/setMyStatus",
            ),

          setMyCustomStatus: (status) =>
            set(
              (state) => {
                state.myCustomStatus = status;
              },
              false,
              "presence/setMyCustomStatus",
            ),

          clearMyCustomStatus: () =>
            set(
              (state) => {
                state.myCustomStatus = null;
              },
              false,
              "presence/clearMyCustomStatus",
            ),

          setIdle: (isIdle) =>
            set(
              (state) => {
                state.isIdle = isIdle;
                if (isIdle && state.settings.autoAway.enabled) {
                  state.myPreviousStatus = state.myStatus;
                  state.myStatus = state.settings.autoAway.setStatus;
                }
              },
              false,
              "presence/setIdle",
            ),

          restorePreviousStatus: () =>
            set(
              (state) => {
                state.myStatus = state.myPreviousStatus;
                state.isIdle = false;
              },
              false,
              "presence/restorePreviousStatus",
            ),

          // ====================================================================
          // Other Users' Presence Actions
          // ====================================================================

          setUserPresence: (userId, presence) =>
            set(
              (state) => {
                const existing = state.presenceMap[userId] || { userId };
                state.presenceMap[userId] = {
                  ...existing,
                  ...presence,
                  userId,
                };
              },
              false,
              "presence/setUserPresence",
            ),

          setUsersPresence: (presences) =>
            set(
              (state) => {
                presences.forEach(({ userId, ...presence }) => {
                  const existing = state.presenceMap[userId] || { userId };
                  state.presenceMap[userId] = {
                    ...existing,
                    ...presence,
                    userId,
                  };
                });
              },
              false,
              "presence/setUsersPresence",
            ),

          removeUserPresence: (userId) =>
            set(
              (state) => {
                delete state.presenceMap[userId];
              },
              false,
              "presence/removeUserPresence",
            ),

          clearAllPresence: () =>
            set(
              (state) => {
                state.presenceMap = {};
              },
              false,
              "presence/clearAllPresence",
            ),

          // ====================================================================
          // Typing Actions
          // ====================================================================

          setUserTyping: (contextKey, user) =>
            set(
              (state) => {
                if (!state.typingMap[contextKey]) {
                  state.typingMap[contextKey] = {};
                }
                state.typingMap[contextKey][user.userId] = {
                  ...user,
                  startedAt: new Date(),
                };
              },
              false,
              "presence/setUserTyping",
            ),

          clearUserTyping: (contextKey, userId) =>
            set(
              (state) => {
                if (state.typingMap[contextKey]) {
                  delete state.typingMap[contextKey][userId];
                  if (Object.keys(state.typingMap[contextKey]).length === 0) {
                    delete state.typingMap[contextKey];
                  }
                }
              },
              false,
              "presence/clearUserTyping",
            ),

          setContextTyping: (contextKey, users) =>
            set(
              (state) => {
                if (users.length === 0) {
                  delete state.typingMap[contextKey];
                } else {
                  state.typingMap[contextKey] = {};
                  users.forEach((user) => {
                    state.typingMap[contextKey][user.userId] = user;
                  });
                }
              },
              false,
              "presence/setContextTyping",
            ),

          clearContextTyping: (contextKey) =>
            set(
              (state) => {
                delete state.typingMap[contextKey];
              },
              false,
              "presence/clearContextTyping",
            ),

          setMyTyping: (contextKey) =>
            set(
              (state) => {
                state.isTyping = contextKey !== null;
                state.typingInContext = contextKey;
              },
              false,
              "presence/setMyTyping",
            ),

          // ====================================================================
          // Online Users Actions
          // ====================================================================

          setOnlineUserIds: (userIds) =>
            set(
              (state) => {
                state.onlineUserIds = userIds;
                state.onlineCount = userIds.length;
              },
              false,
              "presence/setOnlineUserIds",
            ),

          addOnlineUser: (userId) =>
            set(
              (state) => {
                if (!state.onlineUserIds.includes(userId)) {
                  state.onlineUserIds.push(userId);
                  state.onlineCount = state.onlineUserIds.length;
                }
              },
              false,
              "presence/addOnlineUser",
            ),

          removeOnlineUser: (userId) =>
            set(
              (state) => {
                state.onlineUserIds = state.onlineUserIds.filter(
                  (id) => id !== userId,
                );
                state.onlineCount = state.onlineUserIds.length;
              },
              false,
              "presence/removeOnlineUser",
            ),

          setOnlineCount: (count) =>
            set(
              (state) => {
                state.onlineCount = count;
              },
              false,
              "presence/setOnlineCount",
            ),

          // ====================================================================
          // Settings Actions
          // ====================================================================

          updateSettings: (settings) =>
            set(
              (state) => {
                state.settings = {
                  ...state.settings,
                  ...settings,
                  autoAway: {
                    ...state.settings.autoAway,
                    ...settings.autoAway,
                  },
                  idleDetection: {
                    ...state.settings.idleDetection,
                    ...settings.idleDetection,
                  },
                  privacy: {
                    ...state.settings.privacy,
                    ...settings.privacy,
                  },
                  dndSchedule: {
                    ...state.settings.dndSchedule,
                    ...settings.dndSchedule,
                  },
                };
              },
              false,
              "presence/updateSettings",
            ),

          // ====================================================================
          // Connection Actions
          // ====================================================================

          setConnected: (connected) =>
            set(
              (state) => {
                state.isConnected = connected;
              },
              false,
              "presence/setConnected",
            ),

          setSyncing: (syncing) =>
            set(
              (state) => {
                state.isSyncing = syncing;
              },
              false,
              "presence/setSyncing",
            ),

          setLastSyncAt: (date) =>
            set(
              (state) => {
                state.lastSyncAt = date;
              },
              false,
              "presence/setLastSyncAt",
            ),

          // ====================================================================
          // Initialization
          // ====================================================================

          setInitializing: (initializing) =>
            set(
              (state) => {
                state.isInitializing = initializing;
              },
              false,
              "presence/setInitializing",
            ),

          initialize: ({ status, customStatus, settings }) =>
            set(
              (state) => {
                if (status) {
                  state.myStatus = status;
                  state.myPreviousStatus = status;
                }
                if (customStatus !== undefined) {
                  state.myCustomStatus = customStatus;
                }
                if (settings) {
                  state.settings = {
                    ...state.settings,
                    ...settings,
                  };
                }
                state.isInitializing = false;
              },
              false,
              "presence/initialize",
            ),

          // ====================================================================
          // Utility Actions
          // ====================================================================

          reset: () => set(() => initialState, false, "presence/reset"),

          cleanupExpired: () =>
            set(
              (state) => {
                const now = Date.now();
                const typingTimeout = 5000; // 5 seconds

                // Cleanup expired typing indicators
                Object.keys(state.typingMap).forEach((contextKey) => {
                  Object.keys(state.typingMap[contextKey]).forEach((userId) => {
                    const typing = state.typingMap[contextKey][userId];
                    if (
                      now - new Date(typing.startedAt).getTime() >
                      typingTimeout
                    ) {
                      delete state.typingMap[contextKey][userId];
                    }
                  });

                  if (Object.keys(state.typingMap[contextKey]).length === 0) {
                    delete state.typingMap[contextKey];
                  }
                });

                // Cleanup expired custom status
                if (state.myCustomStatus?.expiresAt) {
                  if (new Date(state.myCustomStatus.expiresAt) < new Date()) {
                    state.myCustomStatus = null;
                  }
                }
              },
              false,
              "presence/cleanupExpired",
            ),
        })),
        {
          name: "nchat-presence",
          partialize: (state) => ({
            myStatus: state.myStatus,
            myCustomStatus: state.myCustomStatus,
            settings: state.settings,
          }),
        },
      ),
    ),
    { name: "presence-store" },
  ),
);

// ============================================================================
// Selectors
// ============================================================================

export const selectMyPresence = (state: PresenceStore) => ({
  status: state.myStatus,
  customStatus: state.myCustomStatus,
  isIdle: state.isIdle,
});

export const selectMyStatus = (state: PresenceStore) => state.myStatus;

export const selectMyCustomStatus = (state: PresenceStore) =>
  state.myCustomStatus;

export const selectUserPresence = (userId: string) => (state: PresenceStore) =>
  state.presenceMap[userId];

export const selectUserStatus = (userId: string) => (state: PresenceStore) =>
  state.presenceMap[userId]?.status ?? "offline";

export const selectIsUserOnline =
  (userId: string) => (state: PresenceStore) => {
    const status = state.presenceMap[userId]?.status;
    return status === "online" || status === "dnd";
  };

export const selectOnlineUsers = (state: PresenceStore) =>
  Object.values(state.presenceMap).filter(
    (p) => p.status === "online" || p.status === "away" || p.status === "dnd",
  );

export const selectOnlineCount = (state: PresenceStore) => state.onlineCount;

export const selectTypingUsers =
  (contextKey: string) => (state: PresenceStore) => {
    const context = state.typingMap[contextKey];
    if (!context) return [];
    return Object.values(context);
  };

export const selectChannelTypingUsers =
  (channelId: string) => (state: PresenceStore) =>
    selectTypingUsers(`channel:${channelId}`)(state);

export const selectThreadTypingUsers =
  (threadId: string) => (state: PresenceStore) =>
    selectTypingUsers(`thread:${threadId}`)(state);

export const selectIsAnyoneTyping =
  (contextKey: string) => (state: PresenceStore) => {
    const context = state.typingMap[contextKey];
    return !!context && Object.keys(context).length > 0;
  };

export const selectSettings = (state: PresenceStore) => state.settings;

export const selectIsConnected = (state: PresenceStore) => state.isConnected;

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
 * Create a context key for a DM conversation
 */
export const getDMContextKey = (conversationId: string): string =>
  `dm:${conversationId}`;
