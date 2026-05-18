/**
 * Notification Preferences - User preference management
 *
 * Provides utilities for managing and persisting notification preferences.
 */

import type {
  NotificationPreferences,
  ChannelNotificationSetting,
  KeywordNotification,
  QuietHoursSchedule,
  EmailDigestFrequency,
  ChannelNotificationLevel,
  DayOfWeek,
  NotificationType,
} from "./notification-types";

import { logger } from "@/lib/logger";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  DEFAULT_QUIET_HOURS,
  DEFAULT_SOUND_SETTINGS,
  DEFAULT_DESKTOP_SETTINGS,
  DEFAULT_PUSH_SETTINGS,
  DEFAULT_EMAIL_SETTINGS,
  DEFAULT_MENTION_SETTINGS,
  DEFAULT_DM_SETTINGS,
} from "./notification-types";

// ============================================================================
// Storage Keys
// ============================================================================

const STORAGE_KEY = "nchat-notification-preferences";
const VERSION_KEY = "nchat-notification-preferences-version";
const CURRENT_VERSION = 1;

// ============================================================================
// Load/Save Functions
// ============================================================================

/**
 * Load preferences from localStorage
 */
export function loadPreferences(): NotificationPreferences {
  if (typeof window === "undefined") {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return DEFAULT_NOTIFICATION_PREFERENCES;
    }

    const parsed = JSON.parse(stored);
    const migrated = migratePreferences(parsed);

    return mergeWithDefaults(migrated);
  } catch (error) {
    logger.warn("Failed to load notification preferences:", {
      error: error instanceof Error ? error.message : String(error),
    });
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
}

/**
 * Save preferences to localStorage
 */
export function savePreferences(preferences: NotificationPreferences): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const toSave = {
      ...preferences,
      lastUpdated: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    localStorage.setItem(VERSION_KEY, String(CURRENT_VERSION));
    return true;
  } catch (error) {
    logger.warn("Failed to save notification preferences:", {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Clear all preferences
 */
export function clearPreferences(): void {
  if (typeof window === "undefined") return;

  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(VERSION_KEY);
}

// ============================================================================
// Migration
// ============================================================================

/**
 * Migrate preferences from older versions
 */
function migratePreferences(
  preferences: Partial<NotificationPreferences>,
): Partial<NotificationPreferences> {
  const version =
    typeof window !== "undefined"
      ? parseInt(localStorage.getItem(VERSION_KEY) || "0", 10)
      : 0;

  let migrated = { ...preferences };

  // Migration logic for future versions
  if (version < 1) {
    // Initial migration - just ensure structure
    migrated = {
      ...migrated,
      keywords: migrated.keywords || [],
      channelSettings: migrated.channelSettings || {},
      savedFilters: migrated.savedFilters || [],
    };
  }

  return migrated;
}

/**
 * Merge loaded preferences with defaults
 */
function mergeWithDefaults(
  loaded: Partial<NotificationPreferences>,
): NotificationPreferences {
  return {
    globalEnabled:
      loaded.globalEnabled ?? DEFAULT_NOTIFICATION_PREFERENCES.globalEnabled,
    desktop: { ...DEFAULT_DESKTOP_SETTINGS, ...loaded.desktop },
    push: { ...DEFAULT_PUSH_SETTINGS, ...loaded.push },
    email: { ...DEFAULT_EMAIL_SETTINGS, ...loaded.email },
    sound: { ...DEFAULT_SOUND_SETTINGS, ...loaded.sound },
    quietHours: { ...DEFAULT_QUIET_HOURS, ...loaded.quietHours },
    weekendQuietHours: loaded.weekendQuietHours,
    mentions: { ...DEFAULT_MENTION_SETTINGS, ...loaded.mentions },
    directMessages: { ...DEFAULT_DM_SETTINGS, ...loaded.directMessages },
    threadReplies:
      loaded.threadReplies ?? DEFAULT_NOTIFICATION_PREFERENCES.threadReplies,
    reactions: loaded.reactions ?? DEFAULT_NOTIFICATION_PREFERENCES.reactions,
    channelInvites:
      loaded.channelInvites ?? DEFAULT_NOTIFICATION_PREFERENCES.channelInvites,
    channelUpdates:
      loaded.channelUpdates ?? DEFAULT_NOTIFICATION_PREFERENCES.channelUpdates,
    announcements:
      loaded.announcements ?? DEFAULT_NOTIFICATION_PREFERENCES.announcements,
    keywords: loaded.keywords || [],
    channelSettings: loaded.channelSettings || {},
    savedFilters: loaded.savedFilters || [],
    showSenderName:
      loaded.showSenderName ?? DEFAULT_NOTIFICATION_PREFERENCES.showSenderName,
    showMessagePreview:
      loaded.showMessagePreview ??
      DEFAULT_NOTIFICATION_PREFERENCES.showMessagePreview,
    lastUpdated: loaded.lastUpdated || new Date().toISOString(),
  };
}

// ============================================================================
// Preference Update Helpers
// ============================================================================

/**
 * Update global notification toggle
 */
export function updateGlobalEnabled(
  preferences: NotificationPreferences,
  enabled: boolean,
): NotificationPreferences {
  return {
    ...preferences,
    globalEnabled: enabled,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Update desktop notification settings
 */
export function updateDesktopSettings(
  preferences: NotificationPreferences,
  settings: Partial<NotificationPreferences["desktop"]>,
): NotificationPreferences {
  return {
    ...preferences,
    desktop: { ...preferences.desktop, ...settings },
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Update push notification settings
 */
export function updatePushSettings(
  preferences: NotificationPreferences,
  settings: Partial<NotificationPreferences["push"]>,
): NotificationPreferences {
  return {
    ...preferences,
    push: { ...preferences.push, ...settings },
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Update email notification settings
 */
export function updateEmailSettings(
  preferences: NotificationPreferences,
  settings: Partial<NotificationPreferences["email"]>,
): NotificationPreferences {
  return {
    ...preferences,
    email: { ...preferences.email, ...settings },
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Update sound settings
 */
export function updateSoundSettings(
  preferences: NotificationPreferences,
  settings: Partial<NotificationPreferences["sound"]>,
): NotificationPreferences {
  return {
    ...preferences,
    sound: { ...preferences.sound, ...settings },
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Update quiet hours settings
 */
export function updateQuietHours(
  preferences: NotificationPreferences,
  settings: Partial<QuietHoursSchedule>,
): NotificationPreferences {
  return {
    ...preferences,
    quietHours: { ...preferences.quietHours, ...settings },
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Update mention settings
 */
export function updateMentionSettings(
  preferences: NotificationPreferences,
  settings: Partial<NotificationPreferences["mentions"]>,
): NotificationPreferences {
  return {
    ...preferences,
    mentions: { ...preferences.mentions, ...settings },
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Update DM settings
 */
export function updateDMSettings(
  preferences: NotificationPreferences,
  settings: Partial<NotificationPreferences["directMessages"]>,
): NotificationPreferences {
  return {
    ...preferences,
    directMessages: { ...preferences.directMessages, ...settings },
    lastUpdated: new Date().toISOString(),
  };
}

// ============================================================================
// Channel Settings Helpers
// ============================================================================

/**
 * Get channel notification settings
 */
export function getChannelSettings(
  preferences: NotificationPreferences,
  channelId: string,
): ChannelNotificationSetting | undefined {
  return preferences.channelSettings[channelId];
}

/**
 * Update channel notification settings
 */
export function updateChannelSettings(
  preferences: NotificationPreferences,
  channelId: string,
  settings: Partial<ChannelNotificationSetting>,
): NotificationPreferences {
  const existing = preferences.channelSettings[channelId] || {
    channelId,
    level: "all" as ChannelNotificationLevel,
    overrideGlobal: false,
  };

  return {
    ...preferences,
    channelSettings: {
      ...preferences.channelSettings,
      [channelId]: { ...existing, ...settings },
    },
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Remove channel notification settings
 */
export function removeChannelSettings(
  preferences: NotificationPreferences,
  channelId: string,
): NotificationPreferences {
  const { [channelId]: _, ...rest } = preferences.channelSettings;
  return {
    ...preferences,
    channelSettings: rest,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Mute a channel
 */
export function muteChannel(
  preferences: NotificationPreferences,
  channelId: string,
  until?: string,
): NotificationPreferences {
  return updateChannelSettings(preferences, channelId, {
    level: "nothing",
    muteUntil: until || null,
    overrideGlobal: true,
  });
}

/**
 * Unmute a channel
 */
export function unmuteChannel(
  preferences: NotificationPreferences,
  channelId: string,
): NotificationPreferences {
  return updateChannelSettings(preferences, channelId, {
    level: "all",
    muteUntil: null,
    overrideGlobal: true,
  });
}

/**
 * Set channel notification level
 */
export function setChannelLevel(
  preferences: NotificationPreferences,
  channelId: string,
  level: ChannelNotificationLevel,
): NotificationPreferences {
  return updateChannelSettings(preferences, channelId, {
    level,
    muteUntil: level === "nothing" ? null : undefined,
    overrideGlobal: true,
  });
}

// ============================================================================
// Keyword Helpers
// ============================================================================

/**
 * Add a keyword
 */
export function addKeyword(
  preferences: NotificationPreferences,
  keyword: KeywordNotification,
): NotificationPreferences {
  return {
    ...preferences,
    keywords: [...preferences.keywords, keyword],
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Update a keyword
 */
export function updateKeyword(
  preferences: NotificationPreferences,
  keywordId: string,
  updates: Partial<KeywordNotification>,
): NotificationPreferences {
  return {
    ...preferences,
    keywords: preferences.keywords.map((k) =>
      k.id === keywordId ? { ...k, ...updates } : k,
    ),
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Remove a keyword
 */
export function removeKeyword(
  preferences: NotificationPreferences,
  keywordId: string,
): NotificationPreferences {
  return {
    ...preferences,
    keywords: preferences.keywords.filter((k) => k.id !== keywordId),
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Toggle keyword enabled state
 */
export function toggleKeyword(
  preferences: NotificationPreferences,
  keywordId: string,
): NotificationPreferences {
  return {
    ...preferences,
    keywords: preferences.keywords.map((k) =>
      k.id === keywordId ? { ...k, enabled: !k.enabled } : k,
    ),
    lastUpdated: new Date().toISOString(),
  };
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate preferences structure
 */
export function validatePreferences(
  preferences: Partial<NotificationPreferences>,
): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate quiet hours
  if (preferences.quietHours) {
    const { startTime, endTime } = preferences.quietHours;
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

    if (startTime && !timeRegex.test(startTime)) {
      errors.push("Invalid quiet hours start time format");
    }
    if (endTime && !timeRegex.test(endTime)) {
      errors.push("Invalid quiet hours end time format");
    }
  }

  // Validate sound volume
  if (preferences.sound?.volume !== undefined) {
    if (preferences.sound.volume < 0 || preferences.sound.volume > 100) {
      errors.push("Sound volume must be between 0 and 100");
    }
  }

  // Validate email settings
  if (preferences.email?.digestTime) {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(preferences.email.digestTime)) {
      errors.push("Invalid email digest time format");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// Export/Import
// ============================================================================

/**
 * Export preferences to JSON string
 */
export function exportPreferences(
  preferences: NotificationPreferences,
): string {
  return JSON.stringify(preferences, null, 2);
}

/**
 * Import preferences from JSON string
 */
export function importPreferences(json: string): {
  preferences: NotificationPreferences | null;
  error?: string;
} {
  try {
    const parsed = JSON.parse(json);
    const validation = validatePreferences(parsed);

    if (!validation.valid) {
      return {
        preferences: null,
        error: `Invalid preferences: ${validation.errors.join(", ")}`,
      };
    }

    const merged = mergeWithDefaults(parsed);
    return { preferences: merged };
  } catch (error) {
    return {
      preferences: null,
      error: "Failed to parse preferences JSON",
    };
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get effective notification settings for a notification type
 */
export function getEffectiveSettings(
  preferences: NotificationPreferences,
  type: NotificationType,
  channelId?: string,
): {
  desktop: boolean;
  mobile: boolean;
  email: boolean;
  sound: boolean;
} {
  // Start with defaults based on type
  let desktop = preferences.desktop.enabled;
  let mobile = preferences.push.enabled;
  let email =
    preferences.email.enabled && preferences.email.enabledTypes.includes(type);
  let sound = preferences.sound.enabled;

  // Apply type-specific settings
  switch (type) {
    case "mention":
      desktop = desktop && preferences.mentions.desktop;
      mobile = mobile && preferences.mentions.mobile;
      email = email && preferences.mentions.email;
      break;
    case "direct_message":
      desktop = desktop && preferences.directMessages.desktop;
      mobile = mobile && preferences.directMessages.mobile;
      email = email && preferences.directMessages.email;
      sound = sound && preferences.directMessages.playSound;
      break;
    case "thread_reply":
      if (!preferences.threadReplies) {
        desktop = false;
        mobile = false;
        email = false;
        sound = false;
      }
      break;
    case "reaction":
      if (!preferences.reactions) {
        desktop = false;
        mobile = false;
        email = false;
        sound = false;
      }
      break;
  }

  // Apply channel-specific overrides
  if (channelId) {
    const channelSettings = preferences.channelSettings[channelId];
    if (channelSettings?.overrideGlobal) {
      if (channelSettings.desktopEnabled !== undefined) {
        desktop = desktop && channelSettings.desktopEnabled;
      }
      if (channelSettings.mobileEnabled !== undefined) {
        mobile = mobile && channelSettings.mobileEnabled;
      }
      if (channelSettings.emailEnabled !== undefined) {
        email = email && channelSettings.emailEnabled;
      }
    }
  }

  return { desktop, mobile, email, sound };
}

/**
 * Check if any notification method is enabled
 */
export function hasAnyNotificationEnabled(
  preferences: NotificationPreferences,
): boolean {
  return (
    preferences.globalEnabled &&
    (preferences.desktop.enabled ||
      preferences.push.enabled ||
      preferences.email.enabled)
  );
}

/**
 * Get summary of notification settings
 */
export function getPreferencesSummary(preferences: NotificationPreferences): {
  globalEnabled: boolean;
  desktopEnabled: boolean;
  pushEnabled: boolean;
  emailEnabled: boolean;
  soundEnabled: boolean;
  quietHoursEnabled: boolean;
  keywordCount: number;
  mutedChannelsCount: number;
} {
  const mutedChannels = Object.values(preferences.channelSettings).filter(
    (cs) =>
      cs.level === "nothing" ||
      (cs.muteUntil && new Date(cs.muteUntil) > new Date()),
  );

  return {
    globalEnabled: preferences.globalEnabled,
    desktopEnabled: preferences.desktop.enabled,
    pushEnabled: preferences.push.enabled,
    emailEnabled: preferences.email.enabled,
    soundEnabled: preferences.sound.enabled,
    quietHoursEnabled: preferences.quietHours.enabled,
    keywordCount: preferences.keywords.filter((k) => k.enabled).length,
    mutedChannelsCount: mutedChannels.length,
  };
}
