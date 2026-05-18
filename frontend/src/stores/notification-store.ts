/**
 * Notification Store - Manages all notification-related state for nself-chat
 *
 * Handles notifications, unread counts, preferences, and real-time updates
 */

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

// ============================================================================
// Types
// ============================================================================

export type NotificationType =
  | "mention"
  | "direct_message"
  | "thread_reply"
  | "reaction"
  | "channel_invite"
  | "channel_update"
  | "system"
  | "announcement";

export type NotificationPriority = "low" | "normal" | "high" | "urgent";

export type ChannelNotificationLevel = "all" | "mentions" | "nothing";

export interface NotificationActor {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  body: string;
  actor?: NotificationActor;
  channelId?: string;
  channelName?: string;
  messageId?: string;
  threadId?: string;
  isRead: boolean;
  isArchived: boolean;
  createdAt: string;
  readAt?: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface ChannelNotificationSettings {
  channelId: string;
  level: ChannelNotificationLevel;
  muteUntil?: string; // ISO date string
  customSound?: string;
  overrideGlobal: boolean;
}

export interface DoNotDisturbSchedule {
  enabled: boolean;
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  days: number[]; // 0-6 (Sunday-Saturday)
}

export interface NotificationPreferences {
  // Global toggles
  desktopEnabled: boolean;
  soundEnabled: boolean;
  emailEnabled: boolean;

  // Sound settings
  soundVolume: number; // 0-100
  customSoundUrl?: string;

  // Email settings
  emailDigestFrequency: "instant" | "hourly" | "daily" | "weekly" | "never";

  // Do Not Disturb
  dndSchedule: DoNotDisturbSchedule;

  // Type-specific settings
  mentionsEnabled: boolean;
  directMessagesEnabled: boolean;
  threadRepliesEnabled: boolean;
  reactionsEnabled: boolean;

  // Desktop notification settings
  showPreview: boolean;
  playSound: boolean;

  // Channel-specific overrides
  channelSettings: Record<string, ChannelNotificationSettings>;
}

export interface UnreadCounts {
  total: number;
  mentions: number;
  directMessages: number;
  threads: number;
  byChannel: Record<string, { unread: number; mentions: number }>;
}

export interface NotificationState {
  // Notifications
  notifications: Notification[];
  isLoading: boolean;
  error: string | null;

  // Filter state
  activeFilter: "all" | "mentions" | "threads" | "reactions" | "unread";

  // Unread counts
  unreadCounts: UnreadCounts;

  // Preferences
  preferences: NotificationPreferences;

  // UI State
  notificationCenterOpen: boolean;
  hasNewNotifications: boolean;
  lastSeenAt: string | null;

  // Desktop notification permission
  desktopPermission: NotificationPermission | "default";
}

export interface NotificationActions {
  // Notification CRUD
  addNotification: (notification: Notification) => void;
  addNotifications: (notifications: Notification[]) => void;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;

  // Read state management
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  markChannelAsRead: (channelId: string) => void;

  // Archive management
  archiveNotification: (id: string) => void;
  archiveAllRead: () => void;

  // Filter management
  setActiveFilter: (filter: NotificationState["activeFilter"]) => void;

  // Unread counts
  setUnreadCounts: (counts: UnreadCounts) => void;
  incrementUnreadCount: (channelId: string, isMention?: boolean) => void;
  decrementUnreadCount: (channelId: string, isMention?: boolean) => void;
  resetChannelUnread: (channelId: string) => void;

  // Preferences
  updatePreferences: (updates: Partial<NotificationPreferences>) => void;
  setChannelNotificationLevel: (
    channelId: string,
    level: ChannelNotificationLevel,
  ) => void;
  muteChannel: (channelId: string, until?: string) => void;
  unmuteChannel: (channelId: string) => void;

  // UI State
  setNotificationCenterOpen: (open: boolean) => void;
  toggleNotificationCenter: () => void;
  setHasNewNotifications: (hasNew: boolean) => void;
  updateLastSeenAt: () => void;

  // Desktop permission
  setDesktopPermission: (permission: NotificationPermission) => void;

  // Loading/Error state
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Utility
  getFilteredNotifications: () => Notification[];
  getUnreadNotifications: () => Notification[];
  reset: () => void;
}

export type NotificationStore = NotificationState & NotificationActions;

// ============================================================================
// Initial State
// ============================================================================

const defaultPreferences: NotificationPreferences = {
  desktopEnabled: true,
  soundEnabled: true,
  emailEnabled: false,
  soundVolume: 80,
  emailDigestFrequency: "daily",
  dndSchedule: {
    enabled: false,
    startTime: "22:00",
    endTime: "08:00",
    days: [0, 1, 2, 3, 4, 5, 6],
  },
  mentionsEnabled: true,
  directMessagesEnabled: true,
  threadRepliesEnabled: true,
  reactionsEnabled: false,
  showPreview: true,
  playSound: true,
  channelSettings: {},
};

const initialState: NotificationState = {
  notifications: [],
  isLoading: false,
  error: null,
  activeFilter: "all",
  unreadCounts: {
    total: 0,
    mentions: 0,
    directMessages: 0,
    threads: 0,
    byChannel: {},
  },
  preferences: defaultPreferences,
  notificationCenterOpen: false,
  hasNewNotifications: false,
  lastSeenAt: null,
  desktopPermission: "default",
};

// ============================================================================
// Store
// ============================================================================

export const useNotificationStore = create<NotificationStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        // Notification CRUD
        addNotification: (notification) =>
          set(
            (state) => {
              // Add to beginning of array (newest first)
              state.notifications.unshift(notification);
              state.hasNewNotifications = true;

              // Update unread counts
              if (!notification.isRead) {
                state.unreadCounts.total++;
                if (notification.type === "mention") {
                  state.unreadCounts.mentions++;
                }
                if (notification.type === "direct_message") {
                  state.unreadCounts.directMessages++;
                }
                if (notification.type === "thread_reply") {
                  state.unreadCounts.threads++;
                }
                if (notification.channelId) {
                  const channelCounts = state.unreadCounts.byChannel[
                    notification.channelId
                  ] || {
                    unread: 0,
                    mentions: 0,
                  };
                  channelCounts.unread++;
                  if (notification.type === "mention") {
                    channelCounts.mentions++;
                  }
                  state.unreadCounts.byChannel[notification.channelId] =
                    channelCounts;
                }
              }
            },
            false,
            "notifications/addNotification",
          ),

        addNotifications: (notifications) =>
          set(
            (state) => {
              state.notifications = [...notifications, ...state.notifications];
            },
            false,
            "notifications/addNotifications",
          ),

        removeNotification: (id) =>
          set(
            (state) => {
              const index = state.notifications.findIndex((n) => n.id === id);
              if (index !== -1) {
                const notification = state.notifications[index];
                // Update unread counts if notification was unread
                if (!notification.isRead) {
                  state.unreadCounts.total = Math.max(
                    0,
                    state.unreadCounts.total - 1,
                  );
                  if (notification.type === "mention") {
                    state.unreadCounts.mentions = Math.max(
                      0,
                      state.unreadCounts.mentions - 1,
                    );
                  }
                  if (notification.type === "direct_message") {
                    state.unreadCounts.directMessages = Math.max(
                      0,
                      state.unreadCounts.directMessages - 1,
                    );
                  }
                  if (notification.type === "thread_reply") {
                    state.unreadCounts.threads = Math.max(
                      0,
                      state.unreadCounts.threads - 1,
                    );
                  }
                }
                state.notifications.splice(index, 1);
              }
            },
            false,
            "notifications/removeNotification",
          ),

        clearAllNotifications: () =>
          set(
            (state) => {
              state.notifications = [];
              state.unreadCounts = {
                total: 0,
                mentions: 0,
                directMessages: 0,
                threads: 0,
                byChannel: {},
              };
              state.hasNewNotifications = false;
            },
            false,
            "notifications/clearAllNotifications",
          ),

        // Read state management
        markAsRead: (id) =>
          set(
            (state) => {
              const notification = state.notifications.find((n) => n.id === id);
              if (notification && !notification.isRead) {
                notification.isRead = true;
                notification.readAt = new Date().toISOString();

                // Update unread counts
                state.unreadCounts.total = Math.max(
                  0,
                  state.unreadCounts.total - 1,
                );
                if (notification.type === "mention") {
                  state.unreadCounts.mentions = Math.max(
                    0,
                    state.unreadCounts.mentions - 1,
                  );
                }
                if (notification.type === "direct_message") {
                  state.unreadCounts.directMessages = Math.max(
                    0,
                    state.unreadCounts.directMessages - 1,
                  );
                }
                if (notification.type === "thread_reply") {
                  state.unreadCounts.threads = Math.max(
                    0,
                    state.unreadCounts.threads - 1,
                  );
                }
                if (notification.channelId) {
                  const channelCounts =
                    state.unreadCounts.byChannel[notification.channelId];
                  if (channelCounts) {
                    channelCounts.unread = Math.max(
                      0,
                      channelCounts.unread - 1,
                    );
                    if (notification.type === "mention") {
                      channelCounts.mentions = Math.max(
                        0,
                        channelCounts.mentions - 1,
                      );
                    }
                  }
                }
              }
            },
            false,
            "notifications/markAsRead",
          ),

        markAllAsRead: () =>
          set(
            (state) => {
              const now = new Date().toISOString();
              state.notifications.forEach((notification) => {
                if (!notification.isRead) {
                  notification.isRead = true;
                  notification.readAt = now;
                }
              });
              state.unreadCounts = {
                total: 0,
                mentions: 0,
                directMessages: 0,
                threads: 0,
                byChannel: {},
              };
              state.hasNewNotifications = false;
            },
            false,
            "notifications/markAllAsRead",
          ),

        markChannelAsRead: (channelId) =>
          set(
            (state) => {
              const now = new Date().toISOString();
              state.notifications.forEach((notification) => {
                if (
                  notification.channelId === channelId &&
                  !notification.isRead
                ) {
                  notification.isRead = true;
                  notification.readAt = now;

                  // Update global counts
                  state.unreadCounts.total = Math.max(
                    0,
                    state.unreadCounts.total - 1,
                  );
                  if (notification.type === "mention") {
                    state.unreadCounts.mentions = Math.max(
                      0,
                      state.unreadCounts.mentions - 1,
                    );
                  }
                  if (notification.type === "direct_message") {
                    state.unreadCounts.directMessages = Math.max(
                      0,
                      state.unreadCounts.directMessages - 1,
                    );
                  }
                  if (notification.type === "thread_reply") {
                    state.unreadCounts.threads = Math.max(
                      0,
                      state.unreadCounts.threads - 1,
                    );
                  }
                }
              });
              // Reset channel-specific counts
              if (state.unreadCounts.byChannel[channelId]) {
                state.unreadCounts.byChannel[channelId] = {
                  unread: 0,
                  mentions: 0,
                };
              }
            },
            false,
            "notifications/markChannelAsRead",
          ),

        // Archive management
        archiveNotification: (id) =>
          set(
            (state) => {
              const notification = state.notifications.find((n) => n.id === id);
              if (notification) {
                notification.isArchived = true;
              }
            },
            false,
            "notifications/archiveNotification",
          ),

        archiveAllRead: () =>
          set(
            (state) => {
              state.notifications.forEach((notification) => {
                if (notification.isRead) {
                  notification.isArchived = true;
                }
              });
            },
            false,
            "notifications/archiveAllRead",
          ),

        // Filter management
        setActiveFilter: (filter) =>
          set(
            (state) => {
              state.activeFilter = filter;
            },
            false,
            "notifications/setActiveFilter",
          ),

        // Unread counts
        setUnreadCounts: (counts) =>
          set(
            (state) => {
              state.unreadCounts = counts;
            },
            false,
            "notifications/setUnreadCounts",
          ),

        incrementUnreadCount: (channelId, isMention = false) =>
          set(
            (state) => {
              state.unreadCounts.total++;
              if (isMention) {
                state.unreadCounts.mentions++;
              }

              const channelCounts = state.unreadCounts.byChannel[channelId] || {
                unread: 0,
                mentions: 0,
              };
              channelCounts.unread++;
              if (isMention) {
                channelCounts.mentions++;
              }
              state.unreadCounts.byChannel[channelId] = channelCounts;
            },
            false,
            "notifications/incrementUnreadCount",
          ),

        decrementUnreadCount: (channelId, isMention = false) =>
          set(
            (state) => {
              state.unreadCounts.total = Math.max(
                0,
                state.unreadCounts.total - 1,
              );
              if (isMention) {
                state.unreadCounts.mentions = Math.max(
                  0,
                  state.unreadCounts.mentions - 1,
                );
              }

              const channelCounts = state.unreadCounts.byChannel[channelId];
              if (channelCounts) {
                channelCounts.unread = Math.max(0, channelCounts.unread - 1);
                if (isMention) {
                  channelCounts.mentions = Math.max(
                    0,
                    channelCounts.mentions - 1,
                  );
                }
              }
            },
            false,
            "notifications/decrementUnreadCount",
          ),

        resetChannelUnread: (channelId) =>
          set(
            (state) => {
              const channelCounts = state.unreadCounts.byChannel[channelId];
              if (channelCounts) {
                state.unreadCounts.total = Math.max(
                  0,
                  state.unreadCounts.total - channelCounts.unread,
                );
                state.unreadCounts.mentions = Math.max(
                  0,
                  state.unreadCounts.mentions - channelCounts.mentions,
                );
                state.unreadCounts.byChannel[channelId] = {
                  unread: 0,
                  mentions: 0,
                };
              }
            },
            false,
            "notifications/resetChannelUnread",
          ),

        // Preferences
        updatePreferences: (updates) =>
          set(
            (state) => {
              state.preferences = { ...state.preferences, ...updates };
            },
            false,
            "notifications/updatePreferences",
          ),

        setChannelNotificationLevel: (channelId, level) =>
          set(
            (state) => {
              const existing = state.preferences.channelSettings[channelId] || {
                channelId,
                level: "all" as ChannelNotificationLevel,
                overrideGlobal: true,
              };
              state.preferences.channelSettings[channelId] = {
                ...existing,
                level,
                overrideGlobal: true,
              };
            },
            false,
            "notifications/setChannelNotificationLevel",
          ),

        muteChannel: (channelId, until) =>
          set(
            (state) => {
              const existing = state.preferences.channelSettings[channelId] || {
                channelId,
                level: "nothing" as ChannelNotificationLevel,
                overrideGlobal: true,
              };
              state.preferences.channelSettings[channelId] = {
                ...existing,
                level: "nothing",
                muteUntil: until,
                overrideGlobal: true,
              };
            },
            false,
            "notifications/muteChannel",
          ),

        unmuteChannel: (channelId) =>
          set(
            (state) => {
              const existing = state.preferences.channelSettings[channelId];
              if (existing) {
                existing.level = "all";
                existing.muteUntil = undefined;
              }
            },
            false,
            "notifications/unmuteChannel",
          ),

        // UI State
        setNotificationCenterOpen: (open) =>
          set(
            (state) => {
              state.notificationCenterOpen = open;
              if (open) {
                state.hasNewNotifications = false;
                state.lastSeenAt = new Date().toISOString();
              }
            },
            false,
            "notifications/setNotificationCenterOpen",
          ),

        toggleNotificationCenter: () =>
          set(
            (state) => {
              state.notificationCenterOpen = !state.notificationCenterOpen;
              if (state.notificationCenterOpen) {
                state.hasNewNotifications = false;
                state.lastSeenAt = new Date().toISOString();
              }
            },
            false,
            "notifications/toggleNotificationCenter",
          ),

        setHasNewNotifications: (hasNew) =>
          set(
            (state) => {
              state.hasNewNotifications = hasNew;
            },
            false,
            "notifications/setHasNewNotifications",
          ),

        updateLastSeenAt: () =>
          set(
            (state) => {
              state.lastSeenAt = new Date().toISOString();
            },
            false,
            "notifications/updateLastSeenAt",
          ),

        // Desktop permission
        setDesktopPermission: (permission) =>
          set(
            (state) => {
              state.desktopPermission = permission;
            },
            false,
            "notifications/setDesktopPermission",
          ),

        // Loading/Error state
        setLoading: (loading) =>
          set(
            (state) => {
              state.isLoading = loading;
            },
            false,
            "notifications/setLoading",
          ),

        setError: (error) =>
          set(
            (state) => {
              state.error = error;
            },
            false,
            "notifications/setError",
          ),

        // Utility
        getFilteredNotifications: () => {
          const state = get();
          const { notifications, activeFilter } = state;

          return notifications.filter((notification) => {
            if (notification.isArchived) return false;

            switch (activeFilter) {
              case "all":
                return true;
              case "mentions":
                return notification.type === "mention";
              case "threads":
                return notification.type === "thread_reply";
              case "reactions":
                return notification.type === "reaction";
              case "unread":
                return !notification.isRead;
              default:
                return true;
            }
          });
        },

        getUnreadNotifications: () => {
          const state = get();
          return state.notifications.filter((n) => !n.isRead && !n.isArchived);
        },

        reset: () => set(() => initialState, false, "notifications/reset"),
      })),
      {
        name: "nchat-notifications",
        partialize: (state) => ({
          preferences: state.preferences,
          lastSeenAt: state.lastSeenAt,
        }),
      },
    ),
    { name: "notification-store" },
  ),
);

// ============================================================================
// Selectors
// ============================================================================

export const selectUnreadTotal = (state: NotificationStore) =>
  state.unreadCounts.total;

export const selectUnreadMentions = (state: NotificationStore) =>
  state.unreadCounts.mentions;

export const selectChannelUnread =
  (channelId: string) => (state: NotificationStore) =>
    state.unreadCounts.byChannel[channelId] || { unread: 0, mentions: 0 };

export const selectIsChannelMuted =
  (channelId: string) => (state: NotificationStore) => {
    const settings = state.preferences.channelSettings[channelId];
    if (!settings) return false;
    if (settings.level === "nothing") return true;
    if (settings.muteUntil && new Date(settings.muteUntil) > new Date())
      return true;
    return false;
  };

export const selectNotificationPreferences = (state: NotificationStore) =>
  state.preferences;

export const selectHasUnread = (state: NotificationStore) =>
  state.unreadCounts.total > 0;
