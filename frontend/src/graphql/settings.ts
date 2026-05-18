/**
 * User Settings GraphQL Operations
 *
 * GraphQL queries and mutations for user settings management.
 * Supports settings sync across devices with version control.
 *
 * Table: nchat_user_settings
 * Columns: user_id, settings (JSONB), version (int), updated_at
 */

import { gql } from "@apollo/client";

// ============================================================================
// Fragments
// ============================================================================

export const USER_SETTINGS_FRAGMENT = gql`
  fragment UserSettingsFields on nchat_user_settings {
    user_id
    settings
    version
    updated_at
    created_at
  }
`;

// ============================================================================
// Queries
// ============================================================================

/**
 * Get user settings by user ID
 */
export const GET_USER_SETTINGS = gql`
  ${USER_SETTINGS_FRAGMENT}
  query GetUserSettings($userId: uuid!) {
    nchat_user_settings_by_pk(user_id: $userId) {
      ...UserSettingsFields
    }
  }
`;

/**
 * Get user settings with version check
 * Returns settings only if server version is greater than client version
 */
export const GET_USER_SETTINGS_IF_NEWER = gql`
  ${USER_SETTINGS_FRAGMENT}
  query GetUserSettingsIfNewer($userId: uuid!, $clientVersion: Int!) {
    nchat_user_settings(
      where: { user_id: { _eq: $userId }, version: { _gt: $clientVersion } }
      limit: 1
    ) {
      ...UserSettingsFields
    }
  }
`;

/**
 * Get settings version only (for sync check)
 */
export const GET_SETTINGS_VERSION = gql`
  query GetSettingsVersion($userId: uuid!) {
    nchat_user_settings_by_pk(user_id: $userId) {
      user_id
      version
      updated_at
    }
  }
`;

// ============================================================================
// Mutations
// ============================================================================

/**
 * Update user settings
 * Increments version automatically
 */
export const UPDATE_USER_SETTINGS = gql`
  ${USER_SETTINGS_FRAGMENT}
  mutation UpdateUserSettings($userId: uuid!, $settings: jsonb!) {
    update_nchat_user_settings_by_pk(
      pk_columns: { user_id: $userId }
      _set: { settings: $settings, updated_at: "now()" }
      _inc: { version: 1 }
    ) {
      ...UserSettingsFields
    }
  }
`;

/**
 * Upsert user settings (create or update)
 * Used for initial settings creation or full replacement
 */
export const UPSERT_USER_SETTINGS = gql`
  ${USER_SETTINGS_FRAGMENT}
  mutation UpsertUserSettings(
    $userId: uuid!
    $settings: jsonb!
    $version: Int!
  ) {
    insert_nchat_user_settings_one(
      object: {
        user_id: $userId
        settings: $settings
        version: $version
        created_at: "now()"
        updated_at: "now()"
      }
      on_conflict: {
        constraint: nchat_user_settings_pkey
        update_columns: [settings, version, updated_at]
      }
    ) {
      ...UserSettingsFields
    }
  }
`;

/**
 * Partial update user settings (merge with existing)
 * Uses _append for JSONB merge
 */
export const MERGE_USER_SETTINGS = gql`
  ${USER_SETTINGS_FRAGMENT}
  mutation MergeUserSettings($userId: uuid!, $settings: jsonb!) {
    update_nchat_user_settings_by_pk(
      pk_columns: { user_id: $userId }
      _append: { settings: $settings }
      _inc: { version: 1 }
      _set: { updated_at: "now()" }
    ) {
      ...UserSettingsFields
    }
  }
`;

/**
 * Delete user settings
 */
export const DELETE_USER_SETTINGS = gql`
  mutation DeleteUserSettings($userId: uuid!) {
    delete_nchat_user_settings_by_pk(user_id: $userId) {
      user_id
    }
  }
`;

/**
 * Reset user settings to defaults
 * Sets version to 1 and clears settings
 */
export const RESET_USER_SETTINGS = gql`
  ${USER_SETTINGS_FRAGMENT}
  mutation ResetUserSettings($userId: uuid!, $defaultSettings: jsonb!) {
    update_nchat_user_settings_by_pk(
      pk_columns: { user_id: $userId }
      _set: { settings: $defaultSettings, version: 1, updated_at: "now()" }
    ) {
      ...UserSettingsFields
    }
  }
`;

// ============================================================================
// Types
// ============================================================================

/**
 * Theme settings
 */
export interface ThemeSettings {
  mode: "dark" | "light" | "system";
  preset?: string;
  accentColor?: string;
}

/**
 * Notification settings
 */
export interface NotificationSettings {
  sound: boolean;
  soundVolume: number;
  desktop: boolean;
  desktopPreview: boolean;
  email: boolean;
  emailDigest: "instant" | "daily" | "weekly" | "never";
  mentions: boolean;
  directMessages: boolean;
  channelMessages: boolean;
  threads: boolean;
  reactions: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string; // HH:mm format
  quietHoursEnd: string; // HH:mm format
  quietHoursTimezone: string;
}

/**
 * Privacy settings
 */
export interface PrivacySettings {
  onlineStatusVisible: boolean;
  lastSeenVisible: boolean;
  readReceipts: boolean;
  typingIndicators: boolean;
  profileVisible: "everyone" | "contacts" | "nobody";
  activityStatus: boolean;
}

/**
 * Accessibility settings
 */
export interface AccessibilitySettings {
  fontSize: "small" | "medium" | "large" | "extra-large";
  reducedMotion: boolean;
  highContrast: boolean;
  screenReaderOptimized: boolean;
  keyboardNavigation: boolean;
  focusIndicators: boolean;
  colorBlindMode: "none" | "protanopia" | "deuteranopia" | "tritanopia";
}

/**
 * Locale settings
 */
export interface LocaleSettings {
  language: string;
  timezone: string;
  dateFormat: "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD";
  timeFormat: "12h" | "24h";
  firstDayOfWeek: 0 | 1 | 6; // Sunday, Monday, Saturday
  numberFormat: string;
}

/**
 * Keyboard shortcut settings
 */
export interface KeyboardShortcutSettings {
  enabled: boolean;
  customShortcuts: Record<string, string>;
  // Common shortcuts
  sendMessage: string;
  newLine: string;
  search: string;
  quickSwitcher: string;
  markAsRead: string;
  toggleSidebar: string;
  nextChannel: string;
  prevChannel: string;
  toggleMute: string;
  uploadFile: string;
}

/**
 * Complete user settings structure
 */
export interface UserSettings {
  theme: ThemeSettings;
  notifications: NotificationSettings;
  privacy: PrivacySettings;
  accessibility: AccessibilitySettings;
  locale: LocaleSettings;
  keyboardShortcuts: KeyboardShortcutSettings;
  // Metadata
  _meta?: {
    lastSyncedAt?: string;
    lastSyncedDevice?: string;
    schemaVersion?: number;
  };
}

/**
 * Default user settings
 */
export const DEFAULT_USER_SETTINGS: UserSettings = {
  theme: {
    mode: "system",
    preset: "default",
  },
  notifications: {
    sound: true,
    soundVolume: 0.5,
    desktop: true,
    desktopPreview: true,
    email: true,
    emailDigest: "daily",
    mentions: true,
    directMessages: true,
    channelMessages: false,
    threads: true,
    reactions: false,
    quietHoursEnabled: false,
    quietHoursStart: "22:00",
    quietHoursEnd: "08:00",
    quietHoursTimezone: "UTC",
  },
  privacy: {
    onlineStatusVisible: true,
    lastSeenVisible: true,
    readReceipts: true,
    typingIndicators: true,
    profileVisible: "everyone",
    activityStatus: true,
  },
  accessibility: {
    fontSize: "medium",
    reducedMotion: false,
    highContrast: false,
    screenReaderOptimized: false,
    keyboardNavigation: true,
    focusIndicators: true,
    colorBlindMode: "none",
  },
  locale: {
    language: "en",
    timezone: "UTC",
    dateFormat: "YYYY-MM-DD",
    timeFormat: "24h",
    firstDayOfWeek: 1,
    numberFormat: "en-US",
  },
  keyboardShortcuts: {
    enabled: true,
    customShortcuts: {},
    sendMessage: "Enter",
    newLine: "Shift+Enter",
    search: "Ctrl+K",
    quickSwitcher: "Ctrl+G",
    markAsRead: "Escape",
    toggleSidebar: "Ctrl+Shift+D",
    nextChannel: "Alt+ArrowDown",
    prevChannel: "Alt+ArrowUp",
    toggleMute: "Ctrl+Shift+M",
    uploadFile: "Ctrl+U",
  },
};

/**
 * Settings categories that server wins on conflict (security-sensitive)
 */
export const SERVER_WINS_CATEGORIES: (keyof UserSettings)[] = ["privacy"];

/**
 * Settings categories that client wins on conflict (user preferences)
 */
export const CLIENT_WINS_CATEGORIES: (keyof UserSettings)[] = [
  "theme",
  "notifications",
  "accessibility",
  "locale",
  "keyboardShortcuts",
];

// ============================================================================
// GraphQL Response Types
// ============================================================================

export interface GetUserSettingsResponse {
  nchat_user_settings_by_pk: {
    user_id: string;
    settings: UserSettings;
    version: number;
    updated_at: string;
    created_at: string;
  } | null;
}

export interface GetUserSettingsIfNewerResponse {
  nchat_user_settings: Array<{
    user_id: string;
    settings: UserSettings;
    version: number;
    updated_at: string;
    created_at: string;
  }>;
}

export interface GetSettingsVersionResponse {
  nchat_user_settings_by_pk: {
    user_id: string;
    version: number;
    updated_at: string;
  } | null;
}

export interface UpdateUserSettingsResponse {
  update_nchat_user_settings_by_pk: {
    user_id: string;
    settings: UserSettings;
    version: number;
    updated_at: string;
    created_at: string;
  } | null;
}

export interface UpsertUserSettingsResponse {
  insert_nchat_user_settings_one: {
    user_id: string;
    settings: UserSettings;
    version: number;
    updated_at: string;
    created_at: string;
  };
}

export interface MergeUserSettingsResponse {
  update_nchat_user_settings_by_pk: {
    user_id: string;
    settings: UserSettings;
    version: number;
    updated_at: string;
    created_at: string;
  } | null;
}

export interface DeleteUserSettingsResponse {
  delete_nchat_user_settings_by_pk: {
    user_id: string;
  } | null;
}

export interface ResetUserSettingsResponse {
  update_nchat_user_settings_by_pk: {
    user_id: string;
    settings: UserSettings;
    version: number;
    updated_at: string;
    created_at: string;
  } | null;
}

// ============================================================================
// GraphQL Variable Types
// ============================================================================

export interface GetUserSettingsVariables {
  userId: string;
}

export interface GetUserSettingsIfNewerVariables {
  userId: string;
  clientVersion: number;
}

export interface GetSettingsVersionVariables {
  userId: string;
}

export interface UpdateUserSettingsVariables {
  userId: string;
  settings: UserSettings;
}

export interface UpsertUserSettingsVariables {
  userId: string;
  settings: UserSettings;
  version: number;
}

export interface MergeUserSettingsVariables {
  userId: string;
  settings: Partial<UserSettings>;
}

export interface DeleteUserSettingsVariables {
  userId: string;
}

export interface ResetUserSettingsVariables {
  userId: string;
  defaultSettings: UserSettings;
}
