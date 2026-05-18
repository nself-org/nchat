/**
 * Settings Store - Zustand store for user settings management
 *
 * This store provides a reactive interface for managing user settings
 * with persistence, validation, and sync capabilities.
 */

import { create } from "zustand";
import { devtools, persist, subscribeWithSelector } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import type {
  UserSettings,
  AppearanceSettings,
  NotificationSettings,
  PrivacySettings,
  AccessibilitySettings,
  LanguageSettings,
  AdvancedSettings,
  ThemeMode,
  FontSize,
  MessageDensity,
  NotificationSound,
  SyncStatus,
} from "@/lib/settings/settings-types";

import {
  defaultUserSettings,
  defaultAppearanceSettings,
  defaultNotificationSettings,
  defaultPrivacySettings,
  defaultAccessibilitySettings,
  defaultLanguageSettings,
  defaultAdvancedSettings,
} from "@/lib/settings/settings-defaults";

// ============================================================================
// Types
// ============================================================================

export interface SettingsState {
  // Settings data
  settings: UserSettings;

  // UI State
  isLoading: boolean;
  isSaving: boolean;
  activeCategory: string;
  searchQuery: string;
  hasUnsavedChanges: boolean;

  // Sync state
  syncStatus: SyncStatus;

  // Error state
  error: string | null;
}

export interface SettingsActions {
  // Initialization
  initialize: () => Promise<void>;

  // General settings operations
  updateSettings: (updates: Partial<UserSettings>) => void;
  resetAllSettings: () => void;

  // Category-specific updates
  updateAppearance: (updates: Partial<AppearanceSettings>) => void;
  updateNotifications: (updates: Partial<NotificationSettings>) => void;
  updatePrivacy: (updates: Partial<PrivacySettings>) => void;
  updateAccessibility: (updates: Partial<AccessibilitySettings>) => void;
  updateLanguage: (updates: Partial<LanguageSettings>) => void;
  updateAdvanced: (updates: Partial<AdvancedSettings>) => void;

  // Category resets
  resetAppearance: () => void;
  resetNotifications: () => void;
  resetPrivacy: () => void;
  resetAccessibility: () => void;
  resetLanguage: () => void;
  resetAdvanced: () => void;

  // Quick setting updates
  setTheme: (theme: ThemeMode) => void;
  setAccentColor: (color: string) => void;
  setFontSize: (size: FontSize) => void;
  setMessageDensity: (density: MessageDensity) => void;
  setNotificationSound: (sound: NotificationSound) => void;
  toggleNotifications: (enabled: boolean) => void;
  toggleDoNotDisturb: (enabled: boolean) => void;
  toggleReduceMotion: (enabled: boolean) => void;
  toggleHighContrast: (enabled: boolean) => void;

  // Mute/Unmute
  muteChannel: (channelId: string) => void;
  unmuteChannel: (channelId: string) => void;
  muteUser: (userId: string) => void;
  unmuteUser: (userId: string) => void;

  // Block/Unblock
  blockUser: (userId: string) => void;
  unblockUser: (userId: string) => void;

  // UI actions
  setActiveCategory: (category: string) => void;
  setSearchQuery: (query: string) => void;
  setError: (error: string | null) => void;
  markSaved: () => void;

  // Sync actions
  setSyncStatus: (status: Partial<SyncStatus>) => void;

  // Export/Import
  exportSettings: () => string;
  importSettings: (json: string) => boolean;
}

export type SettingsStore = SettingsState & SettingsActions;

// ============================================================================
// Initial State
// ============================================================================

const initialState: SettingsState = {
  settings: defaultUserSettings,
  isLoading: true,
  isSaving: false,
  activeCategory: "appearance",
  searchQuery: "",
  hasUnsavedChanges: false,
  syncStatus: {
    lastSyncedAt: null,
    isSyncing: false,
    hasLocalChanges: false,
    error: null,
  },
  error: null,
};

// ============================================================================
// Store
// ============================================================================

export const useSettingsStore = create<SettingsStore>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer((set, get) => ({
          ...initialState,

          // ----------------------------------------------------------------
          // Initialization
          // ----------------------------------------------------------------

          initialize: async () => {
            set(
              (state) => {
                state.isLoading = false;
              },
              false,
              "settings/initialize",
            );
          },

          // ----------------------------------------------------------------
          // General Operations
          // ----------------------------------------------------------------

          updateSettings: (updates) =>
            set(
              (state) => {
                for (const key of Object.keys(
                  updates,
                ) as (keyof UserSettings)[]) {
                  if (updates[key]) {
                    // Type assertion needed due to TypeScript limitations with dynamic key assignment
                    (state.settings[key] as Record<string, unknown>) = {
                      ...state.settings[key],
                      ...updates[key],
                    };
                  }
                }
                state.hasUnsavedChanges = true;
              },
              false,
              "settings/updateSettings",
            ),

          resetAllSettings: () =>
            set(
              (state) => {
                state.settings = defaultUserSettings;
                state.hasUnsavedChanges = true;
              },
              false,
              "settings/resetAll",
            ),

          // ----------------------------------------------------------------
          // Category Updates
          // ----------------------------------------------------------------

          updateAppearance: (updates) =>
            set(
              (state) => {
                state.settings.appearance = {
                  ...state.settings.appearance,
                  ...updates,
                };
                state.hasUnsavedChanges = true;
              },
              false,
              "settings/updateAppearance",
            ),

          updateNotifications: (updates) =>
            set(
              (state) => {
                state.settings.notifications = {
                  ...state.settings.notifications,
                  ...updates,
                };
                state.hasUnsavedChanges = true;
              },
              false,
              "settings/updateNotifications",
            ),

          updatePrivacy: (updates) =>
            set(
              (state) => {
                state.settings.privacy = {
                  ...state.settings.privacy,
                  ...updates,
                };
                state.hasUnsavedChanges = true;
              },
              false,
              "settings/updatePrivacy",
            ),

          updateAccessibility: (updates) =>
            set(
              (state) => {
                state.settings.accessibility = {
                  ...state.settings.accessibility,
                  ...updates,
                };
                state.hasUnsavedChanges = true;
              },
              false,
              "settings/updateAccessibility",
            ),

          updateLanguage: (updates) =>
            set(
              (state) => {
                state.settings.language = {
                  ...state.settings.language,
                  ...updates,
                };
                state.hasUnsavedChanges = true;
              },
              false,
              "settings/updateLanguage",
            ),

          updateAdvanced: (updates) =>
            set(
              (state) => {
                state.settings.advanced = {
                  ...state.settings.advanced,
                  ...updates,
                };
                state.hasUnsavedChanges = true;
              },
              false,
              "settings/updateAdvanced",
            ),

          // ----------------------------------------------------------------
          // Category Resets
          // ----------------------------------------------------------------

          resetAppearance: () =>
            set(
              (state) => {
                state.settings.appearance = defaultAppearanceSettings;
                state.hasUnsavedChanges = true;
              },
              false,
              "settings/resetAppearance",
            ),

          resetNotifications: () =>
            set(
              (state) => {
                state.settings.notifications = defaultNotificationSettings;
                state.hasUnsavedChanges = true;
              },
              false,
              "settings/resetNotifications",
            ),

          resetPrivacy: () =>
            set(
              (state) => {
                state.settings.privacy = defaultPrivacySettings;
                state.hasUnsavedChanges = true;
              },
              false,
              "settings/resetPrivacy",
            ),

          resetAccessibility: () =>
            set(
              (state) => {
                state.settings.accessibility = defaultAccessibilitySettings;
                state.hasUnsavedChanges = true;
              },
              false,
              "settings/resetAccessibility",
            ),

          resetLanguage: () =>
            set(
              (state) => {
                state.settings.language = defaultLanguageSettings;
                state.hasUnsavedChanges = true;
              },
              false,
              "settings/resetLanguage",
            ),

          resetAdvanced: () =>
            set(
              (state) => {
                state.settings.advanced = defaultAdvancedSettings;
                state.hasUnsavedChanges = true;
              },
              false,
              "settings/resetAdvanced",
            ),

          // ----------------------------------------------------------------
          // Quick Settings
          // ----------------------------------------------------------------

          setTheme: (theme) =>
            set(
              (state) => {
                state.settings.appearance.theme = theme;
                state.hasUnsavedChanges = true;
              },
              false,
              "settings/setTheme",
            ),

          setAccentColor: (color) =>
            set(
              (state) => {
                state.settings.appearance.accentColor = color;
                state.hasUnsavedChanges = true;
              },
              false,
              "settings/setAccentColor",
            ),

          setFontSize: (size) =>
            set(
              (state) => {
                state.settings.appearance.fontSize = size;
                state.settings.accessibility.fontSize = size;
                state.hasUnsavedChanges = true;
              },
              false,
              "settings/setFontSize",
            ),

          setMessageDensity: (density) =>
            set(
              (state) => {
                state.settings.appearance.messageDensity = density;
                state.hasUnsavedChanges = true;
              },
              false,
              "settings/setMessageDensity",
            ),

          setNotificationSound: (sound) =>
            set(
              (state) => {
                state.settings.notifications.sound = sound;
                state.hasUnsavedChanges = true;
              },
              false,
              "settings/setNotificationSound",
            ),

          toggleNotifications: (enabled) =>
            set(
              (state) => {
                state.settings.notifications.enabled = enabled;
                state.hasUnsavedChanges = true;
              },
              false,
              "settings/toggleNotifications",
            ),

          toggleDoNotDisturb: (enabled) =>
            set(
              (state) => {
                state.settings.notifications.doNotDisturb = enabled;
                state.hasUnsavedChanges = true;
              },
              false,
              "settings/toggleDoNotDisturb",
            ),

          toggleReduceMotion: (enabled) =>
            set(
              (state) => {
                state.settings.appearance.reduceMotion = enabled;
                state.settings.accessibility.reduceMotion = enabled;
                state.hasUnsavedChanges = true;
              },
              false,
              "settings/toggleReduceMotion",
            ),

          toggleHighContrast: (enabled) =>
            set(
              (state) => {
                state.settings.accessibility.highContrast = enabled;
                state.hasUnsavedChanges = true;
              },
              false,
              "settings/toggleHighContrast",
            ),

          // ----------------------------------------------------------------
          // Mute/Unmute
          // ----------------------------------------------------------------

          muteChannel: (channelId) =>
            set(
              (state) => {
                if (
                  !state.settings.notifications.mutedChannels.includes(
                    channelId,
                  )
                ) {
                  state.settings.notifications.mutedChannels.push(channelId);
                  state.hasUnsavedChanges = true;
                }
              },
              false,
              "settings/muteChannel",
            ),

          unmuteChannel: (channelId) =>
            set(
              (state) => {
                const index =
                  state.settings.notifications.mutedChannels.indexOf(channelId);
                if (index > -1) {
                  state.settings.notifications.mutedChannels.splice(index, 1);
                  state.hasUnsavedChanges = true;
                }
              },
              false,
              "settings/unmuteChannel",
            ),

          muteUser: (userId) =>
            set(
              (state) => {
                if (!state.settings.notifications.mutedUsers.includes(userId)) {
                  state.settings.notifications.mutedUsers.push(userId);
                  state.hasUnsavedChanges = true;
                }
              },
              false,
              "settings/muteUser",
            ),

          unmuteUser: (userId) =>
            set(
              (state) => {
                const index =
                  state.settings.notifications.mutedUsers.indexOf(userId);
                if (index > -1) {
                  state.settings.notifications.mutedUsers.splice(index, 1);
                  state.hasUnsavedChanges = true;
                }
              },
              false,
              "settings/unmuteUser",
            ),

          // ----------------------------------------------------------------
          // Block/Unblock
          // ----------------------------------------------------------------

          blockUser: (userId) =>
            set(
              (state) => {
                if (!state.settings.privacy.blockList.includes(userId)) {
                  state.settings.privacy.blockList.push(userId);
                  state.hasUnsavedChanges = true;
                }
              },
              false,
              "settings/blockUser",
            ),

          unblockUser: (userId) =>
            set(
              (state) => {
                const index = state.settings.privacy.blockList.indexOf(userId);
                if (index > -1) {
                  state.settings.privacy.blockList.splice(index, 1);
                  state.hasUnsavedChanges = true;
                }
              },
              false,
              "settings/unblockUser",
            ),

          // ----------------------------------------------------------------
          // UI Actions
          // ----------------------------------------------------------------

          setActiveCategory: (category) =>
            set(
              (state) => {
                state.activeCategory = category;
              },
              false,
              "settings/setActiveCategory",
            ),

          setSearchQuery: (query) =>
            set(
              (state) => {
                state.searchQuery = query;
              },
              false,
              "settings/setSearchQuery",
            ),

          setError: (error) =>
            set(
              (state) => {
                state.error = error;
              },
              false,
              "settings/setError",
            ),

          markSaved: () =>
            set(
              (state) => {
                state.hasUnsavedChanges = false;
              },
              false,
              "settings/markSaved",
            ),

          // ----------------------------------------------------------------
          // Sync Actions
          // ----------------------------------------------------------------

          setSyncStatus: (status) =>
            set(
              (state) => {
                state.syncStatus = { ...state.syncStatus, ...status };
              },
              false,
              "settings/setSyncStatus",
            ),

          // ----------------------------------------------------------------
          // Export/Import
          // ----------------------------------------------------------------

          exportSettings: () => {
            const state = get();
            return JSON.stringify(
              {
                version: "1.0.0",
                exportedAt: new Date().toISOString(),
                settings: state.settings,
              },
              null,
              2,
            );
          },

          importSettings: (json) => {
            try {
              const data = JSON.parse(json);
              if (data.settings) {
                set(
                  (state) => {
                    state.settings = {
                      ...defaultUserSettings,
                      ...data.settings,
                    };
                    state.hasUnsavedChanges = true;
                  },
                  false,
                  "settings/importSettings",
                );
                return true;
              }
              return false;
            } catch {
              return false;
            }
          },
        })),
      ),
      {
        name: "nchat-settings-store",
        partialize: (state) => ({
          settings: state.settings,
        }),
      },
    ),
    { name: "settings-store" },
  ),
);

// ============================================================================
// Selectors
// ============================================================================

// Settings selectors
export const selectSettings = (state: SettingsStore) => state.settings;
export const selectAppearance = (state: SettingsStore) =>
  state.settings.appearance;
export const selectNotifications = (state: SettingsStore) =>
  state.settings.notifications;
export const selectPrivacy = (state: SettingsStore) => state.settings.privacy;
export const selectAccessibility = (state: SettingsStore) =>
  state.settings.accessibility;
export const selectLanguage = (state: SettingsStore) => state.settings.language;
export const selectAdvanced = (state: SettingsStore) => state.settings.advanced;

// Individual setting selectors
export const selectTheme = (state: SettingsStore) =>
  state.settings.appearance.theme;
export const selectAccentColor = (state: SettingsStore) =>
  state.settings.appearance.accentColor;
export const selectFontSize = (state: SettingsStore) =>
  state.settings.appearance.fontSize;
export const selectMessageDensity = (state: SettingsStore) =>
  state.settings.appearance.messageDensity;
export const selectNotificationsEnabled = (state: SettingsStore) =>
  state.settings.notifications.enabled;
export const selectDoNotDisturb = (state: SettingsStore) =>
  state.settings.notifications.doNotDisturb;
export const selectReduceMotion = (state: SettingsStore) =>
  state.settings.accessibility.reduceMotion;
export const selectHighContrast = (state: SettingsStore) =>
  state.settings.accessibility.highContrast;

// List selectors
export const selectMutedChannels = (state: SettingsStore) =>
  state.settings.notifications.mutedChannels;
export const selectMutedUsers = (state: SettingsStore) =>
  state.settings.notifications.mutedUsers;
export const selectBlockList = (state: SettingsStore) =>
  state.settings.privacy.blockList;

// UI state selectors
export const selectIsLoading = (state: SettingsStore) => state.isLoading;
export const selectIsSaving = (state: SettingsStore) => state.isSaving;
export const selectActiveCategory = (state: SettingsStore) =>
  state.activeCategory;
export const selectSearchQuery = (state: SettingsStore) => state.searchQuery;
export const selectHasUnsavedChanges = (state: SettingsStore) =>
  state.hasUnsavedChanges;
export const selectSyncStatus = (state: SettingsStore) => state.syncStatus;
export const selectError = (state: SettingsStore) => state.error;

// Computed selectors
export const selectIsChannelMuted =
  (channelId: string) => (state: SettingsStore) =>
    state.settings.notifications.mutedChannels.includes(channelId);

export const selectIsUserMuted = (userId: string) => (state: SettingsStore) =>
  state.settings.notifications.mutedUsers.includes(userId);

export const selectIsUserBlocked = (userId: string) => (state: SettingsStore) =>
  state.settings.privacy.blockList.includes(userId);
