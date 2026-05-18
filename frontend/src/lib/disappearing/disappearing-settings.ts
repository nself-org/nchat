/**
 * Disappearing Messages Settings Management
 *
 * Manages disappearing message settings for channels, DMs, and user preferences.
 */

import {
  DisappearingSettings,
  DisappearingUserPreferences,
  SecretChatSettings,
  DEFAULT_DISAPPEARING_SETTINGS,
  DEFAULT_SECRET_CHAT_SETTINGS,
  DEFAULT_USER_PREFERENCES,
  DISAPPEARING_TIMER_OPTIONS,
} from "./disappearing-types";

// ============================================================================
// Local Storage Keys
// ============================================================================

const STORAGE_KEYS = {
  CHANNEL_SETTINGS: "nchat-disappearing-channel-settings",
  USER_PREFERENCES: "nchat-disappearing-user-preferences",
  SECRET_CHATS: "nchat-secret-chats",
} as const;

// ============================================================================
// Channel Settings Management
// ============================================================================

/**
 * Get disappearing settings for a channel.
 */
export function getChannelSettings(channelId: string): DisappearingSettings {
  if (typeof window === "undefined") {
    return DEFAULT_DISAPPEARING_SETTINGS;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CHANNEL_SETTINGS);
    if (!stored) return DEFAULT_DISAPPEARING_SETTINGS;

    const settings = JSON.parse(stored) as Record<string, DisappearingSettings>;
    return settings[channelId] || DEFAULT_DISAPPEARING_SETTINGS;
  } catch {
    return DEFAULT_DISAPPEARING_SETTINGS;
  }
}

/**
 * Save disappearing settings for a channel.
 */
export function saveChannelSettings(
  channelId: string,
  settings: Partial<DisappearingSettings>,
  userId?: string,
): DisappearingSettings {
  if (typeof window === "undefined") {
    return { ...DEFAULT_DISAPPEARING_SETTINGS, ...settings };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CHANNEL_SETTINGS);
    const allSettings = stored
      ? (JSON.parse(stored) as Record<string, DisappearingSettings>)
      : {};

    const current = allSettings[channelId] || DEFAULT_DISAPPEARING_SETTINGS;
    const updated: DisappearingSettings = {
      ...current,
      ...settings,
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
    };

    allSettings[channelId] = updated;
    localStorage.setItem(
      STORAGE_KEYS.CHANNEL_SETTINGS,
      JSON.stringify(allSettings),
    );

    return updated;
  } catch {
    return { ...DEFAULT_DISAPPEARING_SETTINGS, ...settings };
  }
}

/**
 * Enable disappearing messages for a channel.
 */
export function enableDisappearing(
  channelId: string,
  duration: number,
  userId?: string,
): DisappearingSettings {
  return saveChannelSettings(
    channelId,
    {
      enabled: true,
      defaultDuration: duration,
    },
    userId,
  );
}

/**
 * Disable disappearing messages for a channel.
 */
export function disableDisappearing(
  channelId: string,
  userId?: string,
): DisappearingSettings {
  return saveChannelSettings(
    channelId,
    {
      enabled: false,
    },
    userId,
  );
}

/**
 * Check if a channel has disappearing messages enabled.
 */
export function isDisappearingEnabled(channelId: string): boolean {
  const settings = getChannelSettings(channelId);
  return settings.enabled;
}

/**
 * Get default duration for a channel.
 */
export function getDefaultDuration(channelId: string): number {
  const settings = getChannelSettings(channelId);
  return settings.defaultDuration;
}

// ============================================================================
// Secret Chat Management
// ============================================================================

/**
 * Get secret chat settings for a channel.
 */
export function getSecretChatSettings(
  channelId: string,
): SecretChatSettings | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SECRET_CHATS);
    if (!stored) return null;

    const settings = JSON.parse(stored) as Record<string, SecretChatSettings>;
    return settings[channelId] || null;
  } catch {
    return null;
  }
}

/**
 * Create or update secret chat settings.
 */
export function saveSecretChatSettings(
  channelId: string,
  settings: Partial<SecretChatSettings>,
): SecretChatSettings {
  if (typeof window === "undefined") {
    return { ...DEFAULT_SECRET_CHAT_SETTINGS, ...settings };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SECRET_CHATS);
    const allSettings = stored
      ? (JSON.parse(stored) as Record<string, SecretChatSettings>)
      : {};

    const current = allSettings[channelId] || DEFAULT_SECRET_CHAT_SETTINGS;
    const updated: SecretChatSettings = {
      ...current,
      ...settings,
      enabled: true, // Secret chats are always enabled
      updatedAt: new Date().toISOString(),
    };

    allSettings[channelId] = updated;
    localStorage.setItem(
      STORAGE_KEYS.SECRET_CHATS,
      JSON.stringify(allSettings),
    );

    return updated;
  } catch {
    return { ...DEFAULT_SECRET_CHAT_SETTINGS, ...settings };
  }
}

/**
 * Check if a channel is a secret chat.
 */
export function isSecretChat(channelId: string): boolean {
  return getSecretChatSettings(channelId) !== null;
}

/**
 * Remove secret chat settings (convert to regular chat).
 */
export function removeSecretChat(channelId: string): void {
  if (typeof window === "undefined") return;

  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SECRET_CHATS);
    if (!stored) return;

    const settings = JSON.parse(stored) as Record<string, SecretChatSettings>;
    delete settings[channelId];
    localStorage.setItem(STORAGE_KEYS.SECRET_CHATS, JSON.stringify(settings));
  } catch {
    // Ignore errors
  }
}

// ============================================================================
// User Preferences Management
// ============================================================================

/**
 * Get user's disappearing message preferences.
 */
export function getUserPreferences(): DisappearingUserPreferences {
  if (typeof window === "undefined") {
    return DEFAULT_USER_PREFERENCES;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
    if (!stored) return DEFAULT_USER_PREFERENCES;

    return { ...DEFAULT_USER_PREFERENCES, ...JSON.parse(stored) };
  } catch {
    return DEFAULT_USER_PREFERENCES;
  }
}

/**
 * Save user's disappearing message preferences.
 */
export function saveUserPreferences(
  preferences: Partial<DisappearingUserPreferences>,
): DisappearingUserPreferences {
  if (typeof window === "undefined") {
    return { ...DEFAULT_USER_PREFERENCES, ...preferences };
  }

  try {
    const current = getUserPreferences();
    const updated = { ...current, ...preferences };
    localStorage.setItem(
      STORAGE_KEYS.USER_PREFERENCES,
      JSON.stringify(updated),
    );
    return updated;
  } catch {
    return { ...DEFAULT_USER_PREFERENCES, ...preferences };
  }
}

// ============================================================================
// Permission Checks
// ============================================================================

/**
 * Check if a user can modify disappearing settings.
 */
export function canModifySettings(
  settings: DisappearingSettings,
  userRole: "owner" | "admin" | "moderator" | "member" | "guest",
): boolean {
  switch (settings.canModify) {
    case "owner":
      return userRole === "owner";
    case "admin":
      return userRole === "owner" || userRole === "admin";
    case "all":
      return userRole !== "guest";
    default:
      return false;
  }
}

/**
 * Get available timer options for display.
 */
export function getTimerOptions() {
  return DISAPPEARING_TIMER_OPTIONS;
}

/**
 * Validate a custom timer duration.
 */
export function isValidDuration(duration: number): boolean {
  // Allow presets or custom durations between 1 minute and 1 year
  return duration === 0 || (duration >= 60 && duration <= 31536000);
}

// ============================================================================
// Settings Sync (placeholder for future GraphQL integration)
// ============================================================================

/**
 * Sync local settings with server (called after mutations).
 */
export async function syncSettingsFromServer(
  channelId: string,
  serverSettings: DisappearingSettings,
): Promise<void> {
  saveChannelSettings(channelId, serverSettings);
}

/**
 * Push local settings to server (called when settings change).
 */
export async function syncSettingsToServer(
  _channelId: string,
  _settings: DisappearingSettings,
): Promise<boolean> {
  // For now, just return true (local-only mode)
  return true;
}
