/**
 * Notification Settings Store - Zustand store for comprehensive notification preferences
 *
 * This store manages all notification settings for the nself-chat application,
 * providing a central state management solution for notification preferences.
 */

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import type {
  NotificationPreferences,
  ChannelNotificationSetting,
  KeywordNotification,
  QuietHoursSchedule,
  DesktopNotificationSettings,
  PushNotificationSettings,
  EmailNotificationSettings,
  NotificationSoundSettings,
  MentionSettings,
  DMNotificationSettings,
  NotificationFilter,
  ChannelNotificationLevel,
  EmailDigestFrequency,
  DayOfWeek,
  NotificationType,
} from "@/lib/notifications/notification-types";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  DEFAULT_QUIET_HOURS,
  DEFAULT_SOUND_SETTINGS,
  DEFAULT_DESKTOP_SETTINGS,
  DEFAULT_PUSH_SETTINGS,
  DEFAULT_EMAIL_SETTINGS,
  DEFAULT_MENTION_SETTINGS,
  DEFAULT_DM_SETTINGS,
  MUTE_DURATIONS,
} from "@/lib/notifications/notification-types";

// ============================================================================
// Types
// ============================================================================

export interface NotificationSettingsState {
  /** All notification preferences */
  preferences: NotificationPreferences;

  /** Loading state */
  isLoading: boolean;

  /** Error state */
  error: string | null;

  /** Whether preferences have been modified */
  isDirty: boolean;

  /** Last saved timestamp */
  lastSavedAt: string | null;

  /** UI state */
  activeSection: string;
  isSettingsOpen: boolean;
}

export interface NotificationSettingsActions {
  // Global settings
  setGlobalEnabled: (enabled: boolean) => void;
  toggleGlobalEnabled: () => void;

  // Desktop settings
  updateDesktopSettings: (
    settings: Partial<DesktopNotificationSettings>,
  ) => void;
  setDesktopEnabled: (enabled: boolean) => void;
  setDesktopPermission: (permission: NotificationPermission) => void;
  setDesktopPreview: (show: boolean) => void;
  setDesktopDuration: (duration: number) => void;

  // Push settings
  updatePushSettings: (settings: Partial<PushNotificationSettings>) => void;
  setPushEnabled: (enabled: boolean) => void;
  setPushPreview: (show: boolean) => void;
  setPushVibrate: (vibrate: boolean) => void;

  // Email settings
  updateEmailSettings: (settings: Partial<EmailNotificationSettings>) => void;
  setEmailEnabled: (enabled: boolean) => void;
  setEmailFrequency: (frequency: EmailDigestFrequency) => void;
  setEmailDigestTime: (time: string) => void;
  setEmailDigestDay: (day: DayOfWeek) => void;
  toggleEmailType: (type: NotificationType) => void;

  // Sound settings
  updateSoundSettings: (settings: Partial<NotificationSoundSettings>) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setSoundVolume: (volume: number) => void;
  setNotificationSound: (
    type: "default" | "mention" | "dm" | "thread" | "reaction",
    soundId: string,
  ) => void;

  // Quiet hours
  updateQuietHours: (settings: Partial<QuietHoursSchedule>) => void;
  setQuietHoursEnabled: (enabled: boolean) => void;
  setQuietHoursTime: (startTime: string, endTime: string) => void;
  setQuietHoursDays: (days: DayOfWeek[]) => void;
  toggleQuietHoursDay: (day: DayOfWeek) => void;
  setQuietHoursBreakthrough: (allow: boolean) => void;
  setQuietHoursAutoStatus: (auto: boolean) => void;

  // Mention settings
  updateMentionSettings: (settings: Partial<MentionSettings>) => void;
  setMentionsEnabled: (enabled: boolean) => void;
  toggleMentionType: (type: "user" | "here" | "channel" | "everyone") => void;

  // DM settings
  updateDMSettings: (settings: Partial<DMNotificationSettings>) => void;
  setDMEnabled: (enabled: boolean) => void;
  muteDMConversation: (conversationId: string) => void;
  unmuteDMConversation: (conversationId: string) => void;

  // Type-specific toggles
  setThreadReplies: (enabled: boolean) => void;
  setReactions: (enabled: boolean) => void;
  setChannelInvites: (enabled: boolean) => void;
  setChannelUpdates: (enabled: boolean) => void;
  setAnnouncements: (enabled: boolean) => void;

  // Channel settings
  getChannelSettings: (
    channelId: string,
  ) => ChannelNotificationSetting | undefined;
  setChannelSettings: (
    channelId: string,
    settings: Partial<ChannelNotificationSetting>,
  ) => void;
  setChannelLevel: (channelId: string, level: ChannelNotificationLevel) => void;
  muteChannel: (channelId: string, duration?: string) => void;
  unmuteChannel: (channelId: string) => void;
  removeChannelSettings: (channelId: string) => void;

  // Keywords
  addKeyword: (keyword: KeywordNotification) => void;
  updateKeyword: (
    keywordId: string,
    updates: Partial<KeywordNotification>,
  ) => void;
  removeKeyword: (keywordId: string) => void;
  toggleKeyword: (keywordId: string) => void;
  reorderKeywords: (keywordIds: string[]) => void;

  // Filters
  addFilter: (filter: NotificationFilter) => void;
  updateFilter: (
    filterId: string,
    updates: Partial<NotificationFilter>,
  ) => void;
  removeFilter: (filterId: string) => void;

  // Preview settings
  setShowSenderName: (show: boolean) => void;
  setShowMessagePreview: (show: boolean) => void;

  // UI actions
  setActiveSection: (section: string) => void;
  openSettings: (section?: string) => void;
  closeSettings: () => void;

  // Persistence
  savePreferences: () => Promise<boolean>;
  loadPreferences: () => Promise<void>;
  resetToDefaults: () => void;
  importPreferences: (json: string) => boolean;
  exportPreferences: () => string;

  // Utility
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  markClean: () => void;
}

export type NotificationSettingsStore = NotificationSettingsState &
  NotificationSettingsActions;

// ============================================================================
// Initial State
// ============================================================================

const initialState: NotificationSettingsState = {
  preferences: DEFAULT_NOTIFICATION_PREFERENCES,
  isLoading: false,
  error: null,
  isDirty: false,
  lastSavedAt: null,
  activeSection: "general",
  isSettingsOpen: false,
};

// ============================================================================
// Store
// ============================================================================

export const useNotificationSettingsStore = create<NotificationSettingsStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        // Global settings
        setGlobalEnabled: (enabled) =>
          set(
            (state) => {
              state.preferences.globalEnabled = enabled;
              state.preferences.lastUpdated = new Date().toISOString();
              state.isDirty = true;
            },
            false,
            "notificationSettings/setGlobalEnabled",
          ),

        toggleGlobalEnabled: () =>
          set(
            (state) => {
              state.preferences.globalEnabled =
                !state.preferences.globalEnabled;
              state.preferences.lastUpdated = new Date().toISOString();
              state.isDirty = true;
            },
            false,
            "notificationSettings/toggleGlobalEnabled",
          ),

        // Desktop settings
        updateDesktopSettings: (settings) =>
          set(
            (state) => {
              state.preferences.desktop = {
                ...state.preferences.desktop,
                ...settings,
              };
              state.preferences.lastUpdated = new Date().toISOString();
              state.isDirty = true;
            },
            false,
            "notificationSettings/updateDesktopSettings",
          ),

        setDesktopEnabled: (enabled) =>
          set(
            (state) => {
              state.preferences.desktop.enabled = enabled;
              state.preferences.lastUpdated = new Date().toISOString();
              state.isDirty = true;
            },
            false,
            "notificationSettings/setDesktopEnabled",
          ),

        setDesktopPermission: (permission) =>
          set(
            (state) => {
              state.preferences.desktop.permission = permission;
            },
            false,
            "notificationSettings/setDesktopPermission",
          ),

        setDesktopPreview: (show) =>
          set(
            (state) => {
              state.preferences.desktop.showPreview = show;
              state.preferences.lastUpdated = new Date().toISOString();
              state.isDirty = true;
            },
            false,
            "notificationSettings/setDesktopPreview",
          ),

        setDesktopDuration: (duration) =>
          set(
            (state) => {
              state.preferences.desktop.duration = duration;
              state.preferences.lastUpdated = new Date().toISOString();
              state.isDirty = true;
            },
            false,
            "notificationSettings/setDesktopDuration",
          ),

        // Push settings
        updatePushSettings: (settings) =>
          set(
            (state) => {
              state.preferences.push = {
                ...state.preferences.push,
                ...settings,
              };
              state.preferences.lastUpdated = new Date().toISOString();
              state.isDirty = true;
            },
            false,
            "notificationSettings/updatePushSettings",
          ),

        setPushEnabled: (enabled) =>
          set(
            (state) => {
              state.preferences.push.enabled = enabled;
              state.preferences.lastUpdated = new Date().toISOString();
              state.isDirty = true;
            },
            false,
            "notificationSettings/setPushEnabled",
          ),

        setPushPreview: (show) =>
          set(
            (state) => {
              state.preferences.push.showPreview = show;
              state.preferences.lastUpdated = new Date().toISOString();
              state.isDirty = true;
            },
            false,
            "notificationSettings/setPushPreview",
          ),

        setPushVibrate: (vibrate) =>
          set(
            (state) => {
              state.preferences.push.vibrate = vibrate;
              state.preferences.lastUpdated = new Date().toISOString();
              state.isDirty = true;
            },
            false,
            "notificationSettings/setPushVibrate",
          ),

        // Email settings
        updateEmailSettings: (settings) =>
          set(
            (state) => {
              state.preferences.email = {
                ...state.preferences.email,
                ...settings,
              };
              state.preferences.lastUpdated = new Date().toISOString();
              state.isDirty = true;
            },
            false,
            "notificationSettings/updateEmailSettings",
          ),

        setEmailEnabled: (enabled) =>
          set(
            (state) => {
              state.preferences.email.enabled = enabled;
              state.preferences.lastUpdated = new Date().toISOString();
              state.isDirty = true;
            },
            false,
            "notificationSettings/setEmailEnabled",
          ),

        setEmailFrequency: (frequency) =>
          set(
            (state) => {
              state.preferences.email.digestFrequency = frequency;
              state.preferences.lastUpdated = new Date().toISOString();
              state.isDirty = true;
            },
            false,
            "notificationSettings/setEmailFrequency",
          ),

        setEmailDigestTime: (time) =>
          set(
            (state) => {
              state.preferences.email.digestTime = time;
              state.preferences.lastUpdated = new Date().toISOString();
              state.isDirty = true;
            },
            false,
            "notificationSettings/setEmailDigestTime",
          ),

        setEmailDigestDay: (day) =>
          set(
            (state) => {
              state.preferences.email.weeklyDigestDay = day;
              state.preferences.lastUpdated = new Date().toISOString();
              state.isDirty = true;
            },
            false,
            "notificationSettings/setEmailDigestDay",
          ),

        toggleEmailType: (type) =>
          set(
            (state) => {
              const types = state.preferences.email.enabledTypes;
              const index = types.indexOf(type);
              if (index === -1) {
                types.push(type);
              } else {
                types.splice(index, 1);
              }
              state.preferences.lastUpdated = new Date().toISOString();
              state.isDirty = true;
            },
            false,
            "notificationSettings/toggleEmailType",
          ),

        // Sound settings
        updateSoundSettings: (settings) =>
          set(
            (state) => {
              state.preferences.sound = {
                ...state.preferences.sound,
                ...settings,
              };
              state.preferences.lastUpdated = new Date().toISOString();
              state.isDirty = true;
            },
            false,
            "notificationSettings/updateSoundSettings",
          ),

        setSoundEnabled: (enabled) =>
          set(
            (state) => {
              state.preferences.sound.enabled = enabled;
              state.preferences.lastUpdated = new Date().toISOString();
              state.isDirty = true;
            },
            false,
            "notificationSettings/setSoundEnabled",
          ),

        setSoundVolume: (volume) =>
          set(
            (state) => {
              state.preferences.sound.volume = Math.max(
                0,
                Math.min(100, volume),
              );
              state.preferences.lastUpdated = new Date().toISOString();
              state.isDirty = true;
            },
            false,
            "notificationSettings/setSoundVolume",
          ),

        setNotificationSound: (type, soundId) =>
          set(
            (state) => {
              switch (type) {
                case "default":
                  state.preferences.sound.defaultSound = soundId;
                  break;
                case "mention":
                  state.preferences.sound.mentionSound = soundId;
                  break;
                case "dm":
                  state.preferences.sound.dmSound = soundId;
                  break;
                case "thread":
                  state.preferences.sound.threadSound = soundId;
                  break;
                case "reaction":
                  state.preferences.sound.reactionSound = soundId;
                  break;
              }
              state.preferences.lastUpdated = new Date().toISOString();
              state.isDirty = true;
            },
            false,
            "notificationSettings/setNotificationSound",
          ),

        // Quiet hours
        updateQuietHours: (settings) =>
          set(
            (state) => {
              state.preferences.quietHours = {
                ...state.preferences.quietHours,
                ...settings,
              };
              state.preferences.lastUpdated = new Date().toISOString();
              state.isDirty = true;
            },
            false,
            "notificationSettings/updateQuietHours",
          ),

        setQuietHoursEnabled: (enabled) =>
          set(
            (state) => {
              state.preferences.quietHours.enabled = enabled;
              state.preferences.lastUpdated = new Date().toISOString();
              state.isDirty = true;
            },
            false,
            "notificationSettings/setQuietHoursEnabled",
          ),

        setQuietHoursTime: (startTime, endTime) =>
          set(
            (state) => {
              state.preferences.quietHours.startTime = startTime;
              state.preferences.quietHours.endTime = endTime;
              state.preferences.lastUpdated = new Date().toISOString();
              state.isDirty = true;
            },
            false,
            "notificationSettings/setQuietHoursTime",
          ),

        setQuietHoursDays: (days) =>
          set(
            (state) => {
              state.preferences.quietHours.days = days;
              state.preferences.lastUpdated = new Date().toISOString();
              state.isDirty = true;
            },
            false,
            "notificationSettings/setQuietHoursDays",
          ),

        toggleQuietHoursDay: (day) =>
          set(
            (state) => {
              const days = state.preferences.quietHours.days;
              const index = days.indexOf(day);
              if (index === -1) {
                days.push(day);
                days.sort((a, b) => a - b);
              } else {
                days.splice(index, 1);
              }
              state.preferences.lastUpdated = new Date().toISOString();
              state.isDirty = true;
            },
            false,
            "notificationSettings/toggleQuietHoursDay",
          ),

        setQuietHoursBreakthrough: (allow) =>
          set(
            (state) => {
              state.preferences.quietHours.allowMentionsBreakthrough = allow;
              state.preferences.lastUpdated = new Date().toISOString();
              state.isDirty = true;
            },
            false,
            "notificationSettings/setQuietHoursBreakthrough",
          ),

        setQuietHoursAutoStatus: (auto) =>
          set(
            (state) => {
              state.preferences.quietHours.autoSetStatus = auto;
              state.preferences.lastUpdated = new Date().toISOString();
              state.isDirty = true;
            },
            false,
            "notificationSettings/setQuietHoursAutoStatus",
          ),

        // Mention settings
        updateMentionSettings: (settings) =>
          set(
            (state) => {
              state.preferences.mentions = {
                ...state.preferences.mentions,
                ...settings,
              };
              state.preferences.lastUpdated = new Date().toISOString();
              state.isDirty = true;
            },
            false,
            "notificationSettings/updateMentionSettings",
          ),

        setMentionsEnabled: (enabled) =>
          set(
            (state) => {
              state.preferences.mentions.enabled = enabled;
              state.preferences.lastUpdated = new Date().toISOString();
              state.isDirty = true;
            },
            false,
            "notificationSettings/setMentionsEnabled",
          ),

        toggleMentionType: (type) =>
          set(
            (state) => {
              const mentions = state.preferences.mentions;
              switch (type) {
                case "user":
                  mentions.notifyOnUserMention = !mentions.notifyOnUserMention;
                  break;
                case "here":
                  mentions.notifyOnHere = !mentions.notifyOnHere;
                  break;
                case "channel":
                  mentions.notifyOnChannel = !mentions.notifyOnChannel;
                  break;
                case "everyone":
                  mentions.notifyOnEveryone = !mentions.notifyOnEveryone;
                  break;
              }
              state.preferences.lastUpdated = new Date().toISOString();
              state.isDirty = true;
            },
            false,
            "notificationSettings/toggleMentionType",
          ),

        // DM settings
        updateDMSettings: (settings) =>
          set(
            (state) => {
              state.preferences.directMessages = {
                ...state.preferences.directMessages,
                ...settings,
              };
              state.preferences.lastUpdated = new Date().toISOString();
              state.isDirty = true;
            },
            false,
            "notificationSettings/updateDMSettings",
          ),

        setDMEnabled: (enabled) =>
          set(
            (state) => {
              state.preferences.directMessages.enabled = enabled;
              state.preferences.lastUpdated = new Date().toISOString();
              state.isDirty = true;
            },
            false,
            "notificationSettings/setDMEnabled",
          ),

        muteDMConversation: (conversationId) =>
          set(
            (state) => {
              if (
                !state.preferences.directMessages.mutedConversations.includes(
                  conversationId,
                )
              ) {
                state.preferences.directMessages.mutedConversations.push(
                  conversationId,
                );
                state.preferences.lastUpdated = new Date().toISOString();
                state.isDirty = true;
              }
            },
            false,
            "notificationSettings/muteDMConversation",
          ),

        unmuteDMConversation: (conversationId) =>
          set(
            (state) => {
              const index =
                state.preferences.directMessages.mutedConversations.indexOf(
                  conversationId,
                );
              if (index !== -1) {
                state.preferences.directMessages.mutedConversations.splice(
                  index,
                  1,
                );
                state.preferences.lastUpdated = new Date().toISOString();
                state.isDirty = true;
              }
            },
            false,
            "notificationSettings/unmuteDMConversation",
          ),

        // Type-specific toggles
        setThreadReplies: (enabled) =>
          set(
            (state) => {
              state.preferences.threadReplies = enabled;
              state.preferences.lastUpdated = new Date().toISOString();
              state.isDirty = true;
            },
            false,
            "notificationSettings/setThreadReplies",
          ),

        setReactions: (enabled) =>
          set(
            (state) => {
              state.preferences.reactions = enabled;
              state.preferences.lastUpdated = new Date().toISOString();
              state.isDirty = true;
            },
            false,
            "notificationSettings/setReactions",
          ),

        setChannelInvites: (enabled) =>
          set(
            (state) => {
              state.preferences.channelInvites = enabled;
              state.preferences.lastUpdated = new Date().toISOString();
              state.isDirty = true;
            },
            false,
            "notificationSettings/setChannelInvites",
          ),

        setChannelUpdates: (enabled) =>
          set(
            (state) => {
              state.preferences.channelUpdates = enabled;
              state.preferences.lastUpdated = new Date().toISOString();
              state.isDirty = true;
            },
            false,
            "notificationSettings/setChannelUpdates",
          ),

        setAnnouncements: (enabled) =>
          set(
            (state) => {
              state.preferences.announcements = enabled;
              state.preferences.lastUpdated = new Date().toISOString();
              state.isDirty = true;
            },
            false,
            "notificationSettings/setAnnouncements",
          ),

        // Channel settings
        getChannelSettings: (channelId) => {
          return get().preferences.channelSettings[channelId];
        },

        setChannelSettings: (channelId, settings) =>
          set(
            (state) => {
              const existing = state.preferences.channelSettings[channelId] || {
                channelId,
                level: "all" as ChannelNotificationLevel,
                overrideGlobal: false,
              };
              state.preferences.channelSettings[channelId] = {
                ...existing,
                ...settings,
              };
              state.preferences.lastUpdated = new Date().toISOString();
              state.isDirty = true;
            },
            false,
            "notificationSettings/setChannelSettings",
          ),

        setChannelLevel: (channelId, level) =>
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
                muteUntil: level === "nothing" ? null : existing.muteUntil,
              };
              state.preferences.lastUpdated = new Date().toISOString();
              state.isDirty = true;
            },
            false,
            "notificationSettings/setChannelLevel",
          ),

        muteChannel: (channelId, duration) =>
          set(
            (state) => {
              const existing = state.preferences.channelSettings[channelId] || {
                channelId,
                level: "nothing" as ChannelNotificationLevel,
                overrideGlobal: true,
              };

              let muteUntil: string | null = null;
              if (duration) {
                const durationConfig = MUTE_DURATIONS.find(
                  (d) => d.value === duration,
                );
                if (durationConfig && durationConfig.minutes !== Infinity) {
                  const until = new Date();
                  until.setMinutes(until.getMinutes() + durationConfig.minutes);
                  muteUntil = until.toISOString();
                }
              }

              state.preferences.channelSettings[channelId] = {
                ...existing,
                level: "nothing",
                muteUntil,
                overrideGlobal: true,
              };
              state.preferences.lastUpdated = new Date().toISOString();
              state.isDirty = true;
            },
            false,
            "notificationSettings/muteChannel",
          ),

        unmuteChannel: (channelId) =>
          set(
            (state) => {
              const existing = state.preferences.channelSettings[channelId];
              if (existing) {
                existing.level = "all";
                existing.muteUntil = null;
                state.preferences.lastUpdated = new Date().toISOString();
                state.isDirty = true;
              }
            },
            false,
            "notificationSettings/unmuteChannel",
          ),

        removeChannelSettings: (channelId) =>
          set(
            (state) => {
              delete state.preferences.channelSettings[channelId];
              state.preferences.lastUpdated = new Date().toISOString();
              state.isDirty = true;
            },
            false,
            "notificationSettings/removeChannelSettings",
          ),

        // Keywords
        addKeyword: (keyword) =>
          set(
            (state) => {
              state.preferences.keywords.push(keyword);
              state.preferences.lastUpdated = new Date().toISOString();
              state.isDirty = true;
            },
            false,
            "notificationSettings/addKeyword",
          ),

        updateKeyword: (keywordId, updates) =>
          set(
            (state) => {
              const index = state.preferences.keywords.findIndex(
                (k) => k.id === keywordId,
              );
              if (index !== -1) {
                state.preferences.keywords[index] = {
                  ...state.preferences.keywords[index],
                  ...updates,
                };
                state.preferences.lastUpdated = new Date().toISOString();
                state.isDirty = true;
              }
            },
            false,
            "notificationSettings/updateKeyword",
          ),

        removeKeyword: (keywordId) =>
          set(
            (state) => {
              const index = state.preferences.keywords.findIndex(
                (k) => k.id === keywordId,
              );
              if (index !== -1) {
                state.preferences.keywords.splice(index, 1);
                state.preferences.lastUpdated = new Date().toISOString();
                state.isDirty = true;
              }
            },
            false,
            "notificationSettings/removeKeyword",
          ),

        toggleKeyword: (keywordId) =>
          set(
            (state) => {
              const keyword = state.preferences.keywords.find(
                (k) => k.id === keywordId,
              );
              if (keyword) {
                keyword.enabled = !keyword.enabled;
                state.preferences.lastUpdated = new Date().toISOString();
                state.isDirty = true;
              }
            },
            false,
            "notificationSettings/toggleKeyword",
          ),

        reorderKeywords: (keywordIds) =>
          set(
            (state) => {
              const keywordMap = new Map(
                state.preferences.keywords.map((k) => [k.id, k]),
              );
              state.preferences.keywords = keywordIds
                .map((id) => keywordMap.get(id))
                .filter((k): k is KeywordNotification => k !== undefined);
              state.preferences.lastUpdated = new Date().toISOString();
              state.isDirty = true;
            },
            false,
            "notificationSettings/reorderKeywords",
          ),

        // Filters
        addFilter: (filter) =>
          set(
            (state) => {
              state.preferences.savedFilters.push(filter);
              state.preferences.lastUpdated = new Date().toISOString();
              state.isDirty = true;
            },
            false,
            "notificationSettings/addFilter",
          ),

        updateFilter: (filterId, updates) =>
          set(
            (state) => {
              const index = state.preferences.savedFilters.findIndex(
                (f) => f.id === filterId,
              );
              if (index !== -1) {
                state.preferences.savedFilters[index] = {
                  ...state.preferences.savedFilters[index],
                  ...updates,
                };
                state.preferences.lastUpdated = new Date().toISOString();
                state.isDirty = true;
              }
            },
            false,
            "notificationSettings/updateFilter",
          ),

        removeFilter: (filterId) =>
          set(
            (state) => {
              const index = state.preferences.savedFilters.findIndex(
                (f) => f.id === filterId,
              );
              if (index !== -1) {
                state.preferences.savedFilters.splice(index, 1);
                state.preferences.lastUpdated = new Date().toISOString();
                state.isDirty = true;
              }
            },
            false,
            "notificationSettings/removeFilter",
          ),

        // Preview settings
        setShowSenderName: (show) =>
          set(
            (state) => {
              state.preferences.showSenderName = show;
              state.preferences.lastUpdated = new Date().toISOString();
              state.isDirty = true;
            },
            false,
            "notificationSettings/setShowSenderName",
          ),

        setShowMessagePreview: (show) =>
          set(
            (state) => {
              state.preferences.showMessagePreview = show;
              state.preferences.lastUpdated = new Date().toISOString();
              state.isDirty = true;
            },
            false,
            "notificationSettings/setShowMessagePreview",
          ),

        // UI actions
        setActiveSection: (section) =>
          set(
            (state) => {
              state.activeSection = section;
            },
            false,
            "notificationSettings/setActiveSection",
          ),

        openSettings: (section) =>
          set(
            (state) => {
              state.isSettingsOpen = true;
              if (section) {
                state.activeSection = section;
              }
            },
            false,
            "notificationSettings/openSettings",
          ),

        closeSettings: () =>
          set(
            (state) => {
              state.isSettingsOpen = false;
            },
            false,
            "notificationSettings/closeSettings",
          ),

        // Persistence
        savePreferences: async () => {
          const state = get();
          set(
            (s) => {
              s.isLoading = true;
              s.error = null;
            },
            false,
            "notificationSettings/savePreferences/start",
          );

          try {
            // For now, just update the lastSavedAt
            set(
              (s) => {
                s.isLoading = false;
                s.isDirty = false;
                s.lastSavedAt = new Date().toISOString();
              },
              false,
              "notificationSettings/savePreferences/success",
            );
            return true;
          } catch (error) {
            set(
              (s) => {
                s.isLoading = false;
                s.error =
                  error instanceof Error
                    ? error.message
                    : "Failed to save preferences";
              },
              false,
              "notificationSettings/savePreferences/error",
            );
            return false;
          }
        },

        loadPreferences: async () => {
          set(
            (s) => {
              s.isLoading = true;
              s.error = null;
            },
            false,
            "notificationSettings/loadPreferences/start",
          );

          try {
            // For now, preferences are loaded from localStorage by persist middleware
            set(
              (s) => {
                s.isLoading = false;
              },
              false,
              "notificationSettings/loadPreferences/success",
            );
          } catch (error) {
            set(
              (s) => {
                s.isLoading = false;
                s.error =
                  error instanceof Error
                    ? error.message
                    : "Failed to load preferences";
              },
              false,
              "notificationSettings/loadPreferences/error",
            );
          }
        },

        resetToDefaults: () =>
          set(
            (state) => {
              state.preferences = { ...DEFAULT_NOTIFICATION_PREFERENCES };
              state.isDirty = true;
            },
            false,
            "notificationSettings/resetToDefaults",
          ),

        importPreferences: (json) => {
          try {
            const imported = JSON.parse(json);
            set(
              (state) => {
                state.preferences = {
                  ...DEFAULT_NOTIFICATION_PREFERENCES,
                  ...imported,
                  lastUpdated: new Date().toISOString(),
                };
                state.isDirty = true;
              },
              false,
              "notificationSettings/importPreferences",
            );
            return true;
          } catch {
            return false;
          }
        },

        exportPreferences: () => {
          return JSON.stringify(get().preferences, null, 2);
        },

        // Utility
        setLoading: (loading) =>
          set(
            (state) => {
              state.isLoading = loading;
            },
            false,
            "notificationSettings/setLoading",
          ),

        setError: (error) =>
          set(
            (state) => {
              state.error = error;
            },
            false,
            "notificationSettings/setError",
          ),

        markClean: () =>
          set(
            (state) => {
              state.isDirty = false;
            },
            false,
            "notificationSettings/markClean",
          ),
      })),
      {
        name: "nchat-notification-settings",
        partialize: (state) => ({
          preferences: state.preferences,
          lastSavedAt: state.lastSavedAt,
        }),
      },
    ),
    { name: "notification-settings-store" },
  ),
);

// ============================================================================
// Selectors
// ============================================================================

export const selectPreferences = (state: NotificationSettingsStore) =>
  state.preferences;
export const selectGlobalEnabled = (state: NotificationSettingsStore) =>
  state.preferences.globalEnabled;
export const selectDesktopSettings = (state: NotificationSettingsStore) =>
  state.preferences.desktop;
export const selectPushSettings = (state: NotificationSettingsStore) =>
  state.preferences.push;
export const selectEmailSettings = (state: NotificationSettingsStore) =>
  state.preferences.email;
export const selectSoundSettings = (state: NotificationSettingsStore) =>
  state.preferences.sound;
export const selectQuietHours = (state: NotificationSettingsStore) =>
  state.preferences.quietHours;
export const selectMentionSettings = (state: NotificationSettingsStore) =>
  state.preferences.mentions;
export const selectDMSettings = (state: NotificationSettingsStore) =>
  state.preferences.directMessages;
export const selectKeywords = (state: NotificationSettingsStore) =>
  state.preferences.keywords;
export const selectChannelSettings = (state: NotificationSettingsStore) =>
  state.preferences.channelSettings;
export const selectIsDirty = (state: NotificationSettingsStore) =>
  state.isDirty;
export const selectIsLoading = (state: NotificationSettingsStore) =>
  state.isLoading;
export const selectError = (state: NotificationSettingsStore) => state.error;
export const selectActiveSection = (state: NotificationSettingsStore) =>
  state.activeSection;
export const selectIsSettingsOpen = (state: NotificationSettingsStore) =>
  state.isSettingsOpen;

export const selectChannelSettingsById =
  (channelId: string) => (state: NotificationSettingsStore) =>
    state.preferences.channelSettings[channelId];

export const selectIsChannelMuted =
  (channelId: string) => (state: NotificationSettingsStore) => {
    const settings = state.preferences.channelSettings[channelId];
    if (!settings) return false;
    if (settings.level === "nothing") return true;
    if (settings.muteUntil && new Date(settings.muteUntil) > new Date())
      return true;
    return false;
  };

export const selectKeywordById =
  (keywordId: string) => (state: NotificationSettingsStore) =>
    state.preferences.keywords.find((k) => k.id === keywordId);

export const selectEnabledKeywords = (state: NotificationSettingsStore) =>
  state.preferences.keywords.filter((k) => k.enabled);

export const selectMutedChannelCount = (state: NotificationSettingsStore) =>
  Object.values(state.preferences.channelSettings).filter(
    (cs) =>
      cs.level === "nothing" ||
      (cs.muteUntil && new Date(cs.muteUntil) > new Date()),
  ).length;
