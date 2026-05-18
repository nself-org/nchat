/**
 * Channel Notification Settings - Per-channel notification configuration
 *
 * Provides granular control over notifications on a per-channel basis:
 * - Muting channels (temporary or permanent)
 * - Custom notification levels (all, mentions only, nothing)
 * - Override global settings per channel
 * - Custom sounds per channel
 * - Badge behavior settings
 */

import type {
  ChannelNotificationSetting,
  ChannelNotificationLevel,
  NotificationPreferences,
} from "./notification-types";

// ============================================================================
// Types
// ============================================================================

export interface ChannelMuteOptions {
  /** Duration in minutes (0 = permanent until manually unmuted) */
  duration?: number;
  /** Custom reason for muting */
  reason?: string;
  /** Whether to still show badge count */
  showBadge?: boolean;
}

export interface ChannelSettingsUpdate {
  level?: ChannelNotificationLevel;
  muteUntil?: string | null;
  overrideGlobal?: boolean;
  customSound?: string;
  desktopEnabled?: boolean;
  mobileEnabled?: boolean;
  emailEnabled?: boolean;
  activeKeywords?: string[];
}

export interface ChannelOverview {
  channelId: string;
  channelName?: string;
  level: ChannelNotificationLevel;
  isMuted: boolean;
  muteExpiresAt?: Date;
  hasCustomSettings: boolean;
}

// ============================================================================
// Constants
// ============================================================================

export const MUTE_PRESETS = {
  "15m": 15,
  "1h": 60,
  "2h": 120,
  "4h": 240,
  "8h": 480,
  "24h": 1440,
  "1w": 10080,
  forever: Infinity,
} as const;

export type MutePreset = keyof typeof MUTE_PRESETS;

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Get channel notification settings
 */
export function getChannelSettings(
  preferences: NotificationPreferences,
  channelId: string,
): ChannelNotificationSetting | null {
  return preferences.channelSettings[channelId] || null;
}

/**
 * Get effective notification level for a channel
 */
export function getEffectiveLevel(
  preferences: NotificationPreferences,
  channelId: string,
): ChannelNotificationLevel {
  const settings = preferences.channelSettings[channelId];

  if (!settings) {
    return "all"; // Default to all notifications
  }

  // Check if muted
  if (isChannelMuted(preferences, channelId)) {
    return "nothing";
  }

  return settings.level;
}

/**
 * Check if a channel is currently muted
 */
export function isChannelMuted(
  preferences: NotificationPreferences,
  channelId: string,
): boolean {
  const settings = preferences.channelSettings[channelId];

  if (!settings) {
    return false;
  }

  // Check mute status
  if (settings.level === "nothing") {
    return true;
  }

  // Check timed mute
  if (settings.muteUntil) {
    const muteExpiry = new Date(settings.muteUntil);
    if (muteExpiry > new Date()) {
      return true;
    }
  }

  return false;
}

/**
 * Get remaining mute time in minutes
 */
export function getMuteTimeRemaining(
  preferences: NotificationPreferences,
  channelId: string,
): number | null {
  const settings = preferences.channelSettings[channelId];

  if (!settings?.muteUntil) {
    return null;
  }

  const muteExpiry = new Date(settings.muteUntil);
  const now = new Date();

  if (muteExpiry <= now) {
    return null;
  }

  return Math.ceil((muteExpiry.getTime() - now.getTime()) / (1000 * 60));
}

// ============================================================================
// Mute/Unmute Functions
// ============================================================================

/**
 * Mute a channel
 */
export function muteChannel(
  preferences: NotificationPreferences,
  channelId: string,
  options: ChannelMuteOptions = {},
): NotificationPreferences {
  const { duration = 0 } = options;

  let muteUntil: string | null = null;

  if (duration > 0 && duration !== Infinity) {
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + duration);
    muteUntil = expiry.toISOString();
  }

  const existingSettings = preferences.channelSettings[channelId] || {
    channelId,
    level: "all" as ChannelNotificationLevel,
    overrideGlobal: false,
  };

  return {
    ...preferences,
    channelSettings: {
      ...preferences.channelSettings,
      [channelId]: {
        ...existingSettings,
        level: "nothing",
        muteUntil,
        overrideGlobal: true,
      },
    },
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Mute a channel using a preset duration
 */
export function muteChannelWithPreset(
  preferences: NotificationPreferences,
  channelId: string,
  preset: MutePreset,
): NotificationPreferences {
  const duration = MUTE_PRESETS[preset];
  return muteChannel(preferences, channelId, { duration });
}

/**
 * Unmute a channel
 */
export function unmuteChannel(
  preferences: NotificationPreferences,
  channelId: string,
): NotificationPreferences {
  const existingSettings = preferences.channelSettings[channelId];

  if (!existingSettings) {
    return preferences;
  }

  return {
    ...preferences,
    channelSettings: {
      ...preferences.channelSettings,
      [channelId]: {
        ...existingSettings,
        level: "all",
        muteUntil: null,
        overrideGlobal: true,
      },
    },
    lastUpdated: new Date().toISOString(),
  };
}

// ============================================================================
// Notification Level Functions
// ============================================================================

/**
 * Set notification level for a channel
 */
export function setChannelNotificationLevel(
  preferences: NotificationPreferences,
  channelId: string,
  level: ChannelNotificationLevel,
): NotificationPreferences {
  const existingSettings = preferences.channelSettings[channelId] || {
    channelId,
    level: "all" as ChannelNotificationLevel,
    overrideGlobal: false,
  };

  return {
    ...preferences,
    channelSettings: {
      ...preferences.channelSettings,
      [channelId]: {
        ...existingSettings,
        level,
        muteUntil: level === "nothing" ? existingSettings.muteUntil : null,
        overrideGlobal: true,
      },
    },
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Update channel settings
 */
export function updateChannelSettings(
  preferences: NotificationPreferences,
  channelId: string,
  updates: ChannelSettingsUpdate,
): NotificationPreferences {
  const existingSettings = preferences.channelSettings[channelId] || {
    channelId,
    level: "all" as ChannelNotificationLevel,
    overrideGlobal: false,
  };

  return {
    ...preferences,
    channelSettings: {
      ...preferences.channelSettings,
      [channelId]: {
        ...existingSettings,
        ...updates,
        overrideGlobal: updates.overrideGlobal ?? true,
      },
    },
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Remove channel-specific settings (revert to global)
 */
export function removeChannelSettings(
  preferences: NotificationPreferences,
  channelId: string,
): NotificationPreferences {
  const { [channelId]: removed, ...rest } = preferences.channelSettings;

  return {
    ...preferences,
    channelSettings: rest,
    lastUpdated: new Date().toISOString(),
  };
}

// ============================================================================
// Batch Operations
// ============================================================================

/**
 * Mute multiple channels
 */
export function muteMultipleChannels(
  preferences: NotificationPreferences,
  channelIds: string[],
  options: ChannelMuteOptions = {},
): NotificationPreferences {
  let result = preferences;

  for (const channelId of channelIds) {
    result = muteChannel(result, channelId, options);
  }

  return result;
}

/**
 * Unmute multiple channels
 */
export function unmuteMultipleChannels(
  preferences: NotificationPreferences,
  channelIds: string[],
): NotificationPreferences {
  let result = preferences;

  for (const channelId of channelIds) {
    result = unmuteChannel(result, channelId);
  }

  return result;
}

/**
 * Set notification level for multiple channels
 */
export function setMultipleChannelLevels(
  preferences: NotificationPreferences,
  channelIds: string[],
  level: ChannelNotificationLevel,
): NotificationPreferences {
  let result = preferences;

  for (const channelId of channelIds) {
    result = setChannelNotificationLevel(result, channelId, level);
  }

  return result;
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Get all muted channels
 */
export function getMutedChannels(
  preferences: NotificationPreferences,
): string[] {
  return Object.keys(preferences.channelSettings).filter((channelId) =>
    isChannelMuted(preferences, channelId),
  );
}

/**
 * Get all channels with custom settings
 */
export function getChannelsWithCustomSettings(
  preferences: NotificationPreferences,
): string[] {
  return Object.keys(preferences.channelSettings).filter(
    (channelId) => preferences.channelSettings[channelId].overrideGlobal,
  );
}

/**
 * Get channel overview for UI display
 */
export function getChannelOverview(
  preferences: NotificationPreferences,
  channelId: string,
  channelName?: string,
): ChannelOverview {
  const settings = preferences.channelSettings[channelId];
  const isMuted = isChannelMuted(preferences, channelId);

  return {
    channelId,
    channelName,
    level: settings?.level || "all",
    isMuted,
    muteExpiresAt: settings?.muteUntil
      ? new Date(settings.muteUntil)
      : undefined,
    hasCustomSettings: !!settings?.overrideGlobal,
  };
}

/**
 * Get all channel overviews
 */
export function getAllChannelOverviews(
  preferences: NotificationPreferences,
  channelNames?: Record<string, string>,
): ChannelOverview[] {
  return Object.keys(preferences.channelSettings).map((channelId) =>
    getChannelOverview(preferences, channelId, channelNames?.[channelId]),
  );
}

// ============================================================================
// Custom Sound Functions
// ============================================================================

/**
 * Set custom sound for a channel
 */
export function setChannelCustomSound(
  preferences: NotificationPreferences,
  channelId: string,
  soundId: string,
): NotificationPreferences {
  return updateChannelSettings(preferences, channelId, {
    customSound: soundId,
  });
}

/**
 * Remove custom sound from a channel
 */
export function removeChannelCustomSound(
  preferences: NotificationPreferences,
  channelId: string,
): NotificationPreferences {
  const settings = preferences.channelSettings[channelId];

  if (!settings) {
    return preferences;
  }

  const { customSound, ...rest } = settings;

  return {
    ...preferences,
    channelSettings: {
      ...preferences.channelSettings,
      [channelId]: rest as ChannelNotificationSetting,
    },
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Get custom sound for a channel
 */
export function getChannelCustomSound(
  preferences: NotificationPreferences,
  channelId: string,
): string | undefined {
  return preferences.channelSettings[channelId]?.customSound;
}

// ============================================================================
// Keyword Functions
// ============================================================================

/**
 * Add keyword to channel
 */
export function addKeywordToChannel(
  preferences: NotificationPreferences,
  channelId: string,
  keywordId: string,
): NotificationPreferences {
  const settings = preferences.channelSettings[channelId] || {
    channelId,
    level: "all" as ChannelNotificationLevel,
    overrideGlobal: false,
    activeKeywords: [],
  };

  const activeKeywords = settings.activeKeywords || [];

  if (activeKeywords.includes(keywordId)) {
    return preferences;
  }

  return {
    ...preferences,
    channelSettings: {
      ...preferences.channelSettings,
      [channelId]: {
        ...settings,
        activeKeywords: [...activeKeywords, keywordId],
      },
    },
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Remove keyword from channel
 */
export function removeKeywordFromChannel(
  preferences: NotificationPreferences,
  channelId: string,
  keywordId: string,
): NotificationPreferences {
  const settings = preferences.channelSettings[channelId];

  if (!settings?.activeKeywords) {
    return preferences;
  }

  return {
    ...preferences,
    channelSettings: {
      ...preferences.channelSettings,
      [channelId]: {
        ...settings,
        activeKeywords: settings.activeKeywords.filter(
          (id) => id !== keywordId,
        ),
      },
    },
    lastUpdated: new Date().toISOString(),
  };
}

// ============================================================================
// Expired Mute Cleanup
// ============================================================================

/**
 * Clean up expired mutes
 */
export function cleanupExpiredMutes(
  preferences: NotificationPreferences,
): NotificationPreferences {
  const now = new Date();
  let hasChanges = false;
  const updatedSettings = { ...preferences.channelSettings };

  for (const [channelId, settings] of Object.entries(updatedSettings)) {
    if (settings.muteUntil) {
      const muteExpiry = new Date(settings.muteUntil);
      if (muteExpiry <= now) {
        updatedSettings[channelId] = {
          ...settings,
          level: "all",
          muteUntil: null,
        };
        hasChanges = true;
      }
    }
  }

  if (!hasChanges) {
    return preferences;
  }

  return {
    ...preferences,
    channelSettings: updatedSettings,
    lastUpdated: new Date().toISOString(),
  };
}

// ============================================================================
// Statistics
// ============================================================================

/**
 * Get channel settings statistics
 */
export function getChannelSettingsStats(preferences: NotificationPreferences): {
  totalChannels: number;
  mutedChannels: number;
  mentionsOnlyChannels: number;
  customSoundChannels: number;
  overriddenChannels: number;
} {
  const channels = Object.values(preferences.channelSettings);

  return {
    totalChannels: channels.length,
    mutedChannels: getMutedChannels(preferences).length,
    mentionsOnlyChannels: channels.filter((c) => c.level === "mentions").length,
    customSoundChannels: channels.filter((c) => !!c.customSound).length,
    overriddenChannels: channels.filter((c) => c.overrideGlobal).length,
  };
}

/**
 * Format mute time remaining for display
 */
export function formatMuteTimeRemaining(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours !== 1 ? "s" : ""}`;
  }

  const days = Math.floor(hours / 24);
  return `${days} day${days !== 1 ? "s" : ""}`;
}
