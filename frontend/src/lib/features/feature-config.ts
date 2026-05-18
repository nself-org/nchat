/**
 * Feature Configuration System
 *
 * This module handles loading feature flags from environment variables,
 * AppConfig, and provides runtime feature checking utilities.
 *
 * Environment Variable Convention:
 * - NEXT_PUBLIC_FEATURE_{CATEGORY}_{NAME}=true|false
 * - Example: NEXT_PUBLIC_FEATURE_MESSAGES_EDIT=true
 *
 * @example
 * ```typescript
 * import { isFeatureEnabled, getFeatureState } from '@/lib/features'
 *
 * if (isFeatureEnabled(FEATURES.MESSAGES_THREADS)) {
 *   // Enable thread functionality
 * }
 * ```
 */

import { FEATURES, type FeatureFlag, ALL_FEATURES } from "./feature-flags";
import type {
  FeatureState,
  FeatureSource,
  FeatureEnabledMap,
  FeatureStateMap,
  FeatureConfig,
} from "./types";

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

/**
 * Default enabled state for all features.
 * These are the production defaults when no environment variables are set.
 */
export const DEFAULT_FEATURE_STATES: FeatureEnabledMap = {
  // Messaging - Core features enabled by default
  [FEATURES.MESSAGES_EDIT]: true,
  [FEATURES.MESSAGES_DELETE]: true,
  [FEATURES.MESSAGES_REACTIONS]: true,
  [FEATURES.MESSAGES_THREADS]: true,
  [FEATURES.MESSAGES_PINS]: true,
  [FEATURES.MESSAGES_BOOKMARKS]: true,
  [FEATURES.MESSAGES_FORWARD]: false,
  [FEATURES.MESSAGES_SCHEDULE]: false,
  [FEATURES.MESSAGES_VOICE]: false,
  [FEATURES.MESSAGES_CODE_BLOCKS]: true,
  [FEATURES.MESSAGES_MARKDOWN]: true,
  [FEATURES.MESSAGES_LINK_PREVIEWS]: true,
  [FEATURES.MESSAGES_MENTIONS]: true,
  [FEATURES.MESSAGES_QUOTES]: true,

  // Channels - Core features enabled by default
  [FEATURES.CHANNELS_PUBLIC]: true,
  [FEATURES.CHANNELS_PRIVATE]: true,
  [FEATURES.CHANNELS_DIRECT]: true,
  [FEATURES.CHANNELS_GROUP_DM]: true,
  [FEATURES.CHANNELS_CATEGORIES]: true,
  [FEATURES.CHANNELS_TOPICS]: true,
  [FEATURES.CHANNELS_ARCHIVE]: true,
  [FEATURES.CHANNELS_FAVORITES]: true,
  [FEATURES.CHANNELS_MUTE]: true,

  // Files - Core features enabled by default
  [FEATURES.FILES_UPLOAD]: true,
  [FEATURES.FILES_IMAGES]: true,
  [FEATURES.FILES_DOCUMENTS]: true,
  [FEATURES.FILES_AUDIO]: true,
  [FEATURES.FILES_VIDEO]: true,
  [FEATURES.FILES_PREVIEW]: true,
  [FEATURES.FILES_DRAG_DROP]: true,
  [FEATURES.FILES_CLIPBOARD]: true,

  // Users - Core features enabled by default
  [FEATURES.USERS_PRESENCE]: true,
  [FEATURES.USERS_CUSTOM_STATUS]: true,
  [FEATURES.USERS_PROFILES]: true,
  [FEATURES.USERS_ROLES]: true,
  [FEATURES.USERS_BLOCKING]: true,
  [FEATURES.USERS_AVATARS]: true,
  [FEATURES.USERS_DISPLAY_NAMES]: true,

  // Real-time - Core features enabled by default
  [FEATURES.REALTIME_TYPING]: true,
  [FEATURES.REALTIME_READ_RECEIPTS]: false,
  [FEATURES.REALTIME_PRESENCE]: true,
  [FEATURES.REALTIME_MESSAGES]: true,
  [FEATURES.REALTIME_NOTIFICATIONS]: true,

  // Search - Core features enabled by default
  [FEATURES.SEARCH_MESSAGES]: true,
  [FEATURES.SEARCH_FILES]: true,
  [FEATURES.SEARCH_USERS]: true,
  [FEATURES.SEARCH_GLOBAL]: true,
  [FEATURES.SEARCH_FILTERS]: true,
  [FEATURES.SEARCH_HIGHLIGHTING]: true,

  // Notifications - Core features enabled by default
  [FEATURES.NOTIFICATIONS_DESKTOP]: true,
  [FEATURES.NOTIFICATIONS_SOUND]: true,
  [FEATURES.NOTIFICATIONS_EMAIL]: false,
  [FEATURES.NOTIFICATIONS_MOBILE]: false,
  [FEATURES.NOTIFICATIONS_DND]: true,
  [FEATURES.NOTIFICATIONS_SCHEDULE]: false,

  // Advanced - Disabled by default
  [FEATURES.CUSTOM_EMOJI]: false,
  [FEATURES.GIF_PICKER]: false,
  [FEATURES.STICKERS]: false,
  [FEATURES.POLLS]: false,
  [FEATURES.WEBHOOKS]: false,
  [FEATURES.BOTS]: false,
  [FEATURES.SLASH_COMMANDS]: true,
  [FEATURES.INTEGRATIONS]: false,
  [FEATURES.REMINDERS]: false,
  [FEATURES.WORKFLOWS]: false,
  [FEATURES.VIDEO_CALLS]: false,
  [FEATURES.SCREEN_SHARE]: false,

  // Admin - Enabled by default for admin users
  [FEATURES.ADMIN_DASHBOARD]: true,
  [FEATURES.ADMIN_USER_MANAGEMENT]: true,
  [FEATURES.ADMIN_ANALYTICS]: true,
  [FEATURES.ADMIN_AUDIT_LOGS]: true,
  [FEATURES.ADMIN_BULK_OPERATIONS]: false,
  [FEATURES.ADMIN_EXPORT]: true,

  // Moderation - Core features enabled by default
  [FEATURES.MODERATION_TOOLS]: true,
  [FEATURES.MODERATION_REPORTING]: true,
  [FEATURES.MODERATION_AUTO_FILTER]: false,
  [FEATURES.MODERATION_WARNINGS]: true,
  [FEATURES.MODERATION_BANS]: true,
  [FEATURES.MODERATION_SLOW_MODE]: true,
};

// ============================================================================
// ENVIRONMENT VARIABLE MAPPING
// ============================================================================

/**
 * Convert feature flag to environment variable name
 * @example featureFlagToEnvVar('messages.edit') -> 'NEXT_PUBLIC_FEATURE_MESSAGES_EDIT'
 */
export function featureFlagToEnvVar(flag: FeatureFlag): string {
  return `NEXT_PUBLIC_FEATURE_${flag.replace(".", "_").toUpperCase()}`;
}

/**
 * Convert environment variable name to feature flag
 * @example envVarToFeatureFlag('NEXT_PUBLIC_FEATURE_MESSAGES_EDIT') -> 'messages.edit'
 */
export function envVarToFeatureFlag(envVar: string): FeatureFlag | null {
  const match = envVar.match(/^NEXT_PUBLIC_FEATURE_(.+)$/);
  if (!match) return null;

  const flagPart = match[1].toLowerCase().replace("_", ".");
  return ALL_FEATURES.includes(flagPart as FeatureFlag)
    ? (flagPart as FeatureFlag)
    : null;
}

// ============================================================================
// FEATURE STATE MANAGEMENT
// ============================================================================

/**
 * Runtime feature overrides (for testing and admin overrides)
 */
const runtimeOverrides: Map<FeatureFlag, boolean> = new Map();

/**
 * Cached feature states
 */
let featureStateCache: FeatureStateMap | null = null;

/**
 * Get feature state from environment variable
 */
function getEnvFeatureState(flag: FeatureFlag): boolean | null {
  if (typeof process === "undefined") return null;

  const envVar = featureFlagToEnvVar(flag);
  const value = process.env[envVar];

  if (value === undefined || value === "") return null;

  return value.toLowerCase() === "true" || value === "1";
}

/**
 * Get the state of a single feature
 */
export function getFeatureState(flag: FeatureFlag): FeatureState {
  // 1. Check runtime overrides first (highest priority)
  if (runtimeOverrides.has(flag)) {
    return {
      flag,
      enabled: runtimeOverrides.get(flag)!,
      source: "override",
      updatedAt: Date.now(),
    };
  }

  // 2. Check environment variables
  const envValue = getEnvFeatureState(flag);
  if (envValue !== null) {
    return {
      flag,
      enabled: envValue,
      source: "env",
      updatedAt: Date.now(),
    };
  }

  // 3. Fall back to defaults
  return {
    flag,
    enabled: DEFAULT_FEATURE_STATES[flag] ?? false,
    source: "default",
    updatedAt: Date.now(),
  };
}

/**
 * Get all feature states
 */
export function getAllFeatureStates(): FeatureStateMap {
  if (featureStateCache) return featureStateCache;

  const states: Partial<FeatureStateMap> = {};
  for (const flag of ALL_FEATURES) {
    states[flag] = getFeatureState(flag);
  }

  featureStateCache = states as FeatureStateMap;
  return featureStateCache;
}

/**
 * Get all enabled features
 */
export function getEnabledFeatures(): FeatureFlag[] {
  const states = getAllFeatureStates();
  return ALL_FEATURES.filter((flag) => states[flag].enabled);
}

/**
 * Get all disabled features
 */
export function getDisabledFeatures(): FeatureFlag[] {
  const states = getAllFeatureStates();
  return ALL_FEATURES.filter((flag) => !states[flag].enabled);
}

// ============================================================================
// FEATURE CHECKING
// ============================================================================

/**
 * Check if a feature is enabled
 * This is the primary function for runtime feature checks
 */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return getFeatureState(flag).enabled;
}

/**
 * Check if all specified features are enabled
 */
export function areAllFeaturesEnabled(flags: FeatureFlag[]): boolean {
  return flags.every((flag) => isFeatureEnabled(flag));
}

/**
 * Check if any of the specified features are enabled
 */
export function isAnyFeatureEnabled(flags: FeatureFlag[]): boolean {
  return flags.some((flag) => isFeatureEnabled(flag));
}

/**
 * Get a simple enabled/disabled map for all features
 */
export function getFeatureEnabledMap(): FeatureEnabledMap {
  const states = getAllFeatureStates();
  const map: Partial<FeatureEnabledMap> = {};

  for (const flag of ALL_FEATURES) {
    map[flag] = states[flag].enabled;
  }

  return map as FeatureEnabledMap;
}

// ============================================================================
// RUNTIME OVERRIDES
// ============================================================================

/**
 * Set a runtime override for a feature
 * Useful for A/B testing, admin overrides, or development
 */
export function setFeatureOverride(
  flag: FeatureFlag,
  enabled: boolean,
): FeatureState {
  runtimeOverrides.set(flag, enabled);
  clearFeatureCache();
  return getFeatureState(flag);
}

/**
 * Remove a runtime override for a feature
 */
export function clearFeatureOverride(flag: FeatureFlag): void {
  runtimeOverrides.delete(flag);
  clearFeatureCache();
}

/**
 * Clear all runtime overrides
 */
export function clearAllFeatureOverrides(): void {
  runtimeOverrides.clear();
  clearFeatureCache();
}

/**
 * Get all current runtime overrides
 */
export function getFeatureOverrides(): Map<FeatureFlag, boolean> {
  return new Map(runtimeOverrides);
}

/**
 * Clear the feature state cache
 * Call this when feature states may have changed
 */
export function clearFeatureCache(): void {
  featureStateCache = null;
}

// ============================================================================
// FEATURE PRESETS
// ============================================================================

/**
 * Minimal feature preset - Basic chat functionality only
 */
export const PRESET_MINIMAL: FeatureFlag[] = [
  FEATURES.MESSAGES_EDIT,
  FEATURES.MESSAGES_DELETE,
  FEATURES.CHANNELS_PUBLIC,
  FEATURES.CHANNELS_DIRECT,
  FEATURES.FILES_UPLOAD,
  FEATURES.FILES_IMAGES,
  FEATURES.USERS_PRESENCE,
  FEATURES.SEARCH_MESSAGES,
  FEATURES.NOTIFICATIONS_DESKTOP,
];

/**
 * Standard feature preset - Most common features
 */
export const PRESET_STANDARD: FeatureFlag[] = [
  ...PRESET_MINIMAL,
  FEATURES.MESSAGES_REACTIONS,
  FEATURES.MESSAGES_THREADS,
  FEATURES.MESSAGES_PINS,
  FEATURES.MESSAGES_MARKDOWN,
  FEATURES.MESSAGES_LINK_PREVIEWS,
  FEATURES.MESSAGES_MENTIONS,
  FEATURES.CHANNELS_PRIVATE,
  FEATURES.CHANNELS_GROUP_DM,
  FEATURES.CHANNELS_TOPICS,
  FEATURES.FILES_DOCUMENTS,
  FEATURES.FILES_PREVIEW,
  FEATURES.USERS_CUSTOM_STATUS,
  FEATURES.USERS_PROFILES,
  FEATURES.REALTIME_TYPING,
  FEATURES.SEARCH_FILES,
  FEATURES.SEARCH_USERS,
  FEATURES.NOTIFICATIONS_SOUND,
];

/**
 * Full feature preset - All features enabled
 */
export const PRESET_FULL: FeatureFlag[] = [...ALL_FEATURES];

/**
 * Apply a feature preset
 */
export function applyFeaturePreset(
  preset: FeatureFlag[],
  options: { clearExisting?: boolean } = {},
): void {
  if (options.clearExisting) {
    clearAllFeatureOverrides();
  }

  // Disable all features first
  for (const flag of ALL_FEATURES) {
    if (!preset.includes(flag)) {
      setFeatureOverride(flag, false);
    }
  }

  // Enable preset features
  for (const flag of preset) {
    setFeatureOverride(flag, true);
  }
}

// ============================================================================
// FEATURE METADATA
// ============================================================================

/**
 * Detailed configuration for each feature
 */
export const FEATURE_CONFIGS: Record<FeatureFlag, FeatureConfig> = {
  // Messaging Features
  [FEATURES.MESSAGES_EDIT]: {
    flag: FEATURES.MESSAGES_EDIT,
    name: "Edit Messages",
    description: "Allow users to edit their own messages after sending",
    category: "messages",
    defaultEnabled: true,
    userConfigurable: false,
  },
  [FEATURES.MESSAGES_DELETE]: {
    flag: FEATURES.MESSAGES_DELETE,
    name: "Delete Messages",
    description: "Allow users to delete their own messages",
    category: "messages",
    defaultEnabled: true,
    userConfigurable: false,
  },
  [FEATURES.MESSAGES_REACTIONS]: {
    flag: FEATURES.MESSAGES_REACTIONS,
    name: "Emoji Reactions",
    description: "Allow users to react to messages with emoji",
    category: "messages",
    defaultEnabled: true,
    userConfigurable: true,
  },
  [FEATURES.MESSAGES_THREADS]: {
    flag: FEATURES.MESSAGES_THREADS,
    name: "Threaded Replies",
    description: "Enable threaded conversations on messages",
    category: "messages",
    defaultEnabled: true,
    userConfigurable: false,
  },
  [FEATURES.MESSAGES_PINS]: {
    flag: FEATURES.MESSAGES_PINS,
    name: "Pin Messages",
    description: "Allow pinning important messages to channels",
    category: "messages",
    defaultEnabled: true,
    userConfigurable: false,
  },
  [FEATURES.MESSAGES_BOOKMARKS]: {
    flag: FEATURES.MESSAGES_BOOKMARKS,
    name: "Bookmarks",
    description: "Allow users to bookmark messages for later reference",
    category: "messages",
    defaultEnabled: true,
    userConfigurable: true,
  },
  [FEATURES.MESSAGES_FORWARD]: {
    flag: FEATURES.MESSAGES_FORWARD,
    name: "Forward Messages",
    description: "Allow forwarding messages to other channels or users",
    category: "messages",
    defaultEnabled: false,
    userConfigurable: false,
  },
  [FEATURES.MESSAGES_SCHEDULE]: {
    flag: FEATURES.MESSAGES_SCHEDULE,
    name: "Scheduled Messages",
    description: "Allow scheduling messages to be sent later",
    category: "messages",
    defaultEnabled: false,
    userConfigurable: true,
    requiredPlan: "pro",
  },
  [FEATURES.MESSAGES_VOICE]: {
    flag: FEATURES.MESSAGES_VOICE,
    name: "Voice Messages",
    description: "Enable recording and sending voice messages",
    category: "messages",
    defaultEnabled: false,
    userConfigurable: true,
    requiredPlan: "pro",
  },
  [FEATURES.MESSAGES_CODE_BLOCKS]: {
    flag: FEATURES.MESSAGES_CODE_BLOCKS,
    name: "Code Blocks",
    description: "Enable syntax-highlighted code blocks in messages",
    category: "messages",
    defaultEnabled: true,
    userConfigurable: false,
  },
  [FEATURES.MESSAGES_MARKDOWN]: {
    flag: FEATURES.MESSAGES_MARKDOWN,
    name: "Markdown Formatting",
    description: "Enable Markdown formatting in messages",
    category: "messages",
    defaultEnabled: true,
    userConfigurable: true,
  },
  [FEATURES.MESSAGES_LINK_PREVIEWS]: {
    flag: FEATURES.MESSAGES_LINK_PREVIEWS,
    name: "Link Previews",
    description: "Automatically preview links shared in messages",
    category: "messages",
    defaultEnabled: true,
    userConfigurable: true,
  },
  [FEATURES.MESSAGES_MENTIONS]: {
    flag: FEATURES.MESSAGES_MENTIONS,
    name: "@Mentions",
    description: "Enable @mentions for users and channels",
    category: "messages",
    defaultEnabled: true,
    userConfigurable: false,
  },
  [FEATURES.MESSAGES_QUOTES]: {
    flag: FEATURES.MESSAGES_QUOTES,
    name: "Quote Messages",
    description: "Enable quoting messages in replies",
    category: "messages",
    defaultEnabled: true,
    userConfigurable: true,
  },

  // Channel Features
  [FEATURES.CHANNELS_PUBLIC]: {
    flag: FEATURES.CHANNELS_PUBLIC,
    name: "Public Channels",
    description: "Enable public channels visible to all workspace members",
    category: "channels",
    defaultEnabled: true,
    userConfigurable: false,
  },
  [FEATURES.CHANNELS_PRIVATE]: {
    flag: FEATURES.CHANNELS_PRIVATE,
    name: "Private Channels",
    description: "Enable invite-only private channels",
    category: "channels",
    defaultEnabled: true,
    userConfigurable: false,
  },
  [FEATURES.CHANNELS_DIRECT]: {
    flag: FEATURES.CHANNELS_DIRECT,
    name: "Direct Messages",
    description: "Enable one-on-one direct messaging",
    category: "channels",
    defaultEnabled: true,
    userConfigurable: false,
  },
  [FEATURES.CHANNELS_GROUP_DM]: {
    flag: FEATURES.CHANNELS_GROUP_DM,
    name: "Group DMs",
    description: "Enable group direct messages with 3+ users",
    category: "channels",
    defaultEnabled: true,
    userConfigurable: false,
    dependencies: [FEATURES.CHANNELS_DIRECT],
  },
  [FEATURES.CHANNELS_CATEGORIES]: {
    flag: FEATURES.CHANNELS_CATEGORIES,
    name: "Channel Categories",
    description: "Organize channels into collapsible categories",
    category: "channels",
    defaultEnabled: true,
    userConfigurable: false,
  },
  [FEATURES.CHANNELS_TOPICS]: {
    flag: FEATURES.CHANNELS_TOPICS,
    name: "Channel Topics",
    description: "Set topics/descriptions for channels",
    category: "channels",
    defaultEnabled: true,
    userConfigurable: false,
  },
  [FEATURES.CHANNELS_ARCHIVE]: {
    flag: FEATURES.CHANNELS_ARCHIVE,
    name: "Archive Channels",
    description: "Archive channels instead of deleting them",
    category: "channels",
    defaultEnabled: true,
    userConfigurable: false,
  },
  [FEATURES.CHANNELS_FAVORITES]: {
    flag: FEATURES.CHANNELS_FAVORITES,
    name: "Favorite Channels",
    description: "Allow users to star/favorite channels",
    category: "channels",
    defaultEnabled: true,
    userConfigurable: true,
  },
  [FEATURES.CHANNELS_MUTE]: {
    flag: FEATURES.CHANNELS_MUTE,
    name: "Mute Channels",
    description: "Allow users to mute channel notifications",
    category: "channels",
    defaultEnabled: true,
    userConfigurable: true,
  },

  // File Features
  [FEATURES.FILES_UPLOAD]: {
    flag: FEATURES.FILES_UPLOAD,
    name: "File Uploads",
    description: "Enable file uploading to messages",
    category: "files",
    defaultEnabled: true,
    userConfigurable: false,
  },
  [FEATURES.FILES_IMAGES]: {
    flag: FEATURES.FILES_IMAGES,
    name: "Image Uploads",
    description: "Allow uploading and displaying images",
    category: "files",
    defaultEnabled: true,
    userConfigurable: false,
    dependencies: [FEATURES.FILES_UPLOAD],
  },
  [FEATURES.FILES_DOCUMENTS]: {
    flag: FEATURES.FILES_DOCUMENTS,
    name: "Document Uploads",
    description: "Allow uploading documents (PDF, DOC, etc.)",
    category: "files",
    defaultEnabled: true,
    userConfigurable: false,
    dependencies: [FEATURES.FILES_UPLOAD],
  },
  [FEATURES.FILES_AUDIO]: {
    flag: FEATURES.FILES_AUDIO,
    name: "Audio Uploads",
    description: "Allow uploading audio files",
    category: "files",
    defaultEnabled: true,
    userConfigurable: false,
    dependencies: [FEATURES.FILES_UPLOAD],
  },
  [FEATURES.FILES_VIDEO]: {
    flag: FEATURES.FILES_VIDEO,
    name: "Video Uploads",
    description: "Allow uploading video files",
    category: "files",
    defaultEnabled: true,
    userConfigurable: false,
    dependencies: [FEATURES.FILES_UPLOAD],
  },
  [FEATURES.FILES_PREVIEW]: {
    flag: FEATURES.FILES_PREVIEW,
    name: "File Previews",
    description: "Enable in-app file previews",
    category: "files",
    defaultEnabled: true,
    userConfigurable: true,
    dependencies: [FEATURES.FILES_UPLOAD],
  },
  [FEATURES.FILES_DRAG_DROP]: {
    flag: FEATURES.FILES_DRAG_DROP,
    name: "Drag & Drop Upload",
    description: "Enable drag and drop file uploads",
    category: "files",
    defaultEnabled: true,
    userConfigurable: true,
    dependencies: [FEATURES.FILES_UPLOAD],
  },
  [FEATURES.FILES_CLIPBOARD]: {
    flag: FEATURES.FILES_CLIPBOARD,
    name: "Clipboard Paste",
    description: "Enable pasting images from clipboard",
    category: "files",
    defaultEnabled: true,
    userConfigurable: true,
    dependencies: [FEATURES.FILES_UPLOAD, FEATURES.FILES_IMAGES],
  },

  // User Features
  [FEATURES.USERS_PRESENCE]: {
    flag: FEATURES.USERS_PRESENCE,
    name: "Online Presence",
    description: "Show online/offline/away status indicators",
    category: "users",
    defaultEnabled: true,
    userConfigurable: true,
  },
  [FEATURES.USERS_CUSTOM_STATUS]: {
    flag: FEATURES.USERS_CUSTOM_STATUS,
    name: "Custom Status",
    description: "Allow setting custom status messages",
    category: "users",
    defaultEnabled: true,
    userConfigurable: true,
  },
  [FEATURES.USERS_PROFILES]: {
    flag: FEATURES.USERS_PROFILES,
    name: "User Profiles",
    description: "Enable detailed user profile pages",
    category: "users",
    defaultEnabled: true,
    userConfigurable: false,
  },
  [FEATURES.USERS_ROLES]: {
    flag: FEATURES.USERS_ROLES,
    name: "User Roles",
    description: "Enable role-based access control",
    category: "users",
    defaultEnabled: true,
    userConfigurable: false,
  },
  [FEATURES.USERS_BLOCKING]: {
    flag: FEATURES.USERS_BLOCKING,
    name: "User Blocking",
    description: "Allow users to block other users",
    category: "users",
    defaultEnabled: true,
    userConfigurable: false,
  },
  [FEATURES.USERS_AVATARS]: {
    flag: FEATURES.USERS_AVATARS,
    name: "Profile Avatars",
    description: "Allow uploading custom profile avatars",
    category: "users",
    defaultEnabled: true,
    userConfigurable: true,
    dependencies: [FEATURES.FILES_UPLOAD, FEATURES.FILES_IMAGES],
  },
  [FEATURES.USERS_DISPLAY_NAMES]: {
    flag: FEATURES.USERS_DISPLAY_NAMES,
    name: "Display Names",
    description: "Allow customizing display names",
    category: "users",
    defaultEnabled: true,
    userConfigurable: true,
  },

  // Real-time Features
  [FEATURES.REALTIME_TYPING]: {
    flag: FEATURES.REALTIME_TYPING,
    name: "Typing Indicators",
    description: "Show when other users are typing",
    category: "realtime",
    defaultEnabled: true,
    userConfigurable: true,
  },
  [FEATURES.REALTIME_READ_RECEIPTS]: {
    flag: FEATURES.REALTIME_READ_RECEIPTS,
    name: "Read Receipts",
    description: "Show who has read messages",
    category: "realtime",
    defaultEnabled: false,
    userConfigurable: true,
    requiredPlan: "pro",
  },
  [FEATURES.REALTIME_PRESENCE]: {
    flag: FEATURES.REALTIME_PRESENCE,
    name: "Real-time Presence",
    description: "Real-time presence status updates",
    category: "realtime",
    defaultEnabled: true,
    userConfigurable: false,
    dependencies: [FEATURES.USERS_PRESENCE],
  },
  [FEATURES.REALTIME_MESSAGES]: {
    flag: FEATURES.REALTIME_MESSAGES,
    name: "Real-time Messages",
    description: "Instant message delivery without refresh",
    category: "realtime",
    defaultEnabled: true,
    userConfigurable: false,
  },
  [FEATURES.REALTIME_NOTIFICATIONS]: {
    flag: FEATURES.REALTIME_NOTIFICATIONS,
    name: "Real-time Notifications",
    description: "Instant notification delivery",
    category: "realtime",
    defaultEnabled: true,
    userConfigurable: false,
  },

  // Search Features
  [FEATURES.SEARCH_MESSAGES]: {
    flag: FEATURES.SEARCH_MESSAGES,
    name: "Message Search",
    description: "Search through message history",
    category: "search",
    defaultEnabled: true,
    userConfigurable: false,
  },
  [FEATURES.SEARCH_FILES]: {
    flag: FEATURES.SEARCH_FILES,
    name: "File Search",
    description: "Search through uploaded files",
    category: "search",
    defaultEnabled: true,
    userConfigurable: false,
    dependencies: [FEATURES.FILES_UPLOAD],
  },
  [FEATURES.SEARCH_USERS]: {
    flag: FEATURES.SEARCH_USERS,
    name: "User Search",
    description: "Search for users in the workspace",
    category: "search",
    defaultEnabled: true,
    userConfigurable: false,
  },
  [FEATURES.SEARCH_GLOBAL]: {
    flag: FEATURES.SEARCH_GLOBAL,
    name: "Global Search",
    description: "Search across all content types",
    category: "search",
    defaultEnabled: true,
    userConfigurable: false,
  },
  [FEATURES.SEARCH_FILTERS]: {
    flag: FEATURES.SEARCH_FILTERS,
    name: "Search Filters",
    description: "Advanced search filters (date, from, in)",
    category: "search",
    defaultEnabled: true,
    userConfigurable: false,
  },
  [FEATURES.SEARCH_HIGHLIGHTING]: {
    flag: FEATURES.SEARCH_HIGHLIGHTING,
    name: "Result Highlighting",
    description: "Highlight search terms in results",
    category: "search",
    defaultEnabled: true,
    userConfigurable: true,
  },

  // Notification Features
  [FEATURES.NOTIFICATIONS_DESKTOP]: {
    flag: FEATURES.NOTIFICATIONS_DESKTOP,
    name: "Desktop Notifications",
    description: "Browser/desktop push notifications",
    category: "notifications",
    defaultEnabled: true,
    userConfigurable: true,
  },
  [FEATURES.NOTIFICATIONS_SOUND]: {
    flag: FEATURES.NOTIFICATIONS_SOUND,
    name: "Sound Notifications",
    description: "Play sound for new messages",
    category: "notifications",
    defaultEnabled: true,
    userConfigurable: true,
  },
  [FEATURES.NOTIFICATIONS_EMAIL]: {
    flag: FEATURES.NOTIFICATIONS_EMAIL,
    name: "Email Notifications",
    description: "Send email notifications for mentions",
    category: "notifications",
    defaultEnabled: false,
    userConfigurable: true,
    requiredPlan: "pro",
  },
  [FEATURES.NOTIFICATIONS_MOBILE]: {
    flag: FEATURES.NOTIFICATIONS_MOBILE,
    name: "Mobile Push",
    description: "Mobile push notifications",
    category: "notifications",
    defaultEnabled: false,
    userConfigurable: true,
    requiredPlan: "pro",
  },
  [FEATURES.NOTIFICATIONS_DND]: {
    flag: FEATURES.NOTIFICATIONS_DND,
    name: "Do Not Disturb",
    description: "Enable do not disturb mode",
    category: "notifications",
    defaultEnabled: true,
    userConfigurable: true,
  },
  [FEATURES.NOTIFICATIONS_SCHEDULE]: {
    flag: FEATURES.NOTIFICATIONS_SCHEDULE,
    name: "Quiet Hours",
    description: "Schedule notification quiet hours",
    category: "notifications",
    defaultEnabled: false,
    userConfigurable: true,
  },

  // Advanced Features
  [FEATURES.CUSTOM_EMOJI]: {
    flag: FEATURES.CUSTOM_EMOJI,
    name: "Custom Emoji",
    description: "Create and use custom emoji",
    category: "advanced",
    defaultEnabled: false,
    userConfigurable: false,
    requiredPlan: "pro",
  },
  [FEATURES.GIF_PICKER]: {
    flag: FEATURES.GIF_PICKER,
    name: "GIF Picker",
    description: "Search and send GIFs from Giphy/Tenor",
    category: "advanced",
    defaultEnabled: false,
    userConfigurable: true,
  },
  [FEATURES.STICKERS]: {
    flag: FEATURES.STICKERS,
    name: "Stickers",
    description: "Send sticker packs in messages",
    category: "advanced",
    defaultEnabled: false,
    userConfigurable: true,
  },
  [FEATURES.POLLS]: {
    flag: FEATURES.POLLS,
    name: "Polls",
    description: "Create polls in messages",
    category: "advanced",
    defaultEnabled: false,
    userConfigurable: false,
  },
  [FEATURES.WEBHOOKS]: {
    flag: FEATURES.WEBHOOKS,
    name: "Webhooks",
    description: "Incoming and outgoing webhooks",
    category: "advanced",
    defaultEnabled: false,
    userConfigurable: false,
    requiredPlan: "pro",
  },
  [FEATURES.BOTS]: {
    flag: FEATURES.BOTS,
    name: "Bot Accounts",
    description: "Create and manage bot users",
    category: "advanced",
    defaultEnabled: false,
    userConfigurable: false,
    requiredPlan: "enterprise",
  },
  [FEATURES.SLASH_COMMANDS]: {
    flag: FEATURES.SLASH_COMMANDS,
    name: "Slash Commands",
    description: "Use slash commands in messages",
    category: "advanced",
    defaultEnabled: true,
    userConfigurable: true,
  },
  [FEATURES.INTEGRATIONS]: {
    flag: FEATURES.INTEGRATIONS,
    name: "Third-party Integrations",
    description: "Connect to Slack, GitHub, Jira, etc.",
    category: "advanced",
    defaultEnabled: false,
    userConfigurable: false,
    requiredPlan: "pro",
  },
  [FEATURES.REMINDERS]: {
    flag: FEATURES.REMINDERS,
    name: "Reminders",
    description: "Set reminders for messages",
    category: "advanced",
    defaultEnabled: false,
    userConfigurable: true,
  },
  [FEATURES.WORKFLOWS]: {
    flag: FEATURES.WORKFLOWS,
    name: "Workflows",
    description: "Automate tasks with workflows",
    category: "advanced",
    defaultEnabled: false,
    userConfigurable: false,
    requiredPlan: "enterprise",
  },
  [FEATURES.VIDEO_CALLS]: {
    flag: FEATURES.VIDEO_CALLS,
    name: "Video Calls",
    description: "Start video calls from channels",
    category: "advanced",
    defaultEnabled: false,
    userConfigurable: false,
    requiredPlan: "pro",
  },
  [FEATURES.SCREEN_SHARE]: {
    flag: FEATURES.SCREEN_SHARE,
    name: "Screen Sharing",
    description: "Share screen during calls",
    category: "advanced",
    defaultEnabled: false,
    userConfigurable: false,
    requiredPlan: "pro",
    dependencies: [FEATURES.VIDEO_CALLS],
  },

  // Admin Features
  [FEATURES.ADMIN_DASHBOARD]: {
    flag: FEATURES.ADMIN_DASHBOARD,
    name: "Admin Dashboard",
    description: "Access to admin dashboard",
    category: "admin",
    defaultEnabled: true,
    userConfigurable: false,
  },
  [FEATURES.ADMIN_USER_MANAGEMENT]: {
    flag: FEATURES.ADMIN_USER_MANAGEMENT,
    name: "User Management",
    description: "Manage users and roles",
    category: "admin",
    defaultEnabled: true,
    userConfigurable: false,
  },
  [FEATURES.ADMIN_ANALYTICS]: {
    flag: FEATURES.ADMIN_ANALYTICS,
    name: "Analytics",
    description: "View workspace analytics",
    category: "admin",
    defaultEnabled: true,
    userConfigurable: false,
  },
  [FEATURES.ADMIN_AUDIT_LOGS]: {
    flag: FEATURES.ADMIN_AUDIT_LOGS,
    name: "Audit Logs",
    description: "View audit logs",
    category: "admin",
    defaultEnabled: true,
    userConfigurable: false,
    requiredPlan: "pro",
  },
  [FEATURES.ADMIN_BULK_OPERATIONS]: {
    flag: FEATURES.ADMIN_BULK_OPERATIONS,
    name: "Bulk Operations",
    description: "Perform bulk user/channel operations",
    category: "admin",
    defaultEnabled: false,
    userConfigurable: false,
    requiredPlan: "enterprise",
  },
  [FEATURES.ADMIN_EXPORT]: {
    flag: FEATURES.ADMIN_EXPORT,
    name: "Data Export",
    description: "Export workspace data",
    category: "admin",
    defaultEnabled: true,
    userConfigurable: false,
    requiredPlan: "pro",
  },

  // Moderation Features
  [FEATURES.MODERATION_TOOLS]: {
    flag: FEATURES.MODERATION_TOOLS,
    name: "Moderation Tools",
    description: "Access to moderation tools",
    category: "moderation",
    defaultEnabled: true,
    userConfigurable: false,
  },
  [FEATURES.MODERATION_REPORTING]: {
    flag: FEATURES.MODERATION_REPORTING,
    name: "Message Reporting",
    description: "Allow reporting messages",
    category: "moderation",
    defaultEnabled: true,
    userConfigurable: false,
  },
  [FEATURES.MODERATION_AUTO_FILTER]: {
    flag: FEATURES.MODERATION_AUTO_FILTER,
    name: "Auto Content Filter",
    description: "Automatic content filtering",
    category: "moderation",
    defaultEnabled: false,
    userConfigurable: false,
    requiredPlan: "pro",
  },
  [FEATURES.MODERATION_WARNINGS]: {
    flag: FEATURES.MODERATION_WARNINGS,
    name: "User Warnings",
    description: "Issue warnings to users",
    category: "moderation",
    defaultEnabled: true,
    userConfigurable: false,
  },
  [FEATURES.MODERATION_BANS]: {
    flag: FEATURES.MODERATION_BANS,
    name: "User Bans",
    description: "Ban users from workspace",
    category: "moderation",
    defaultEnabled: true,
    userConfigurable: false,
  },
  [FEATURES.MODERATION_SLOW_MODE]: {
    flag: FEATURES.MODERATION_SLOW_MODE,
    name: "Slow Mode",
    description: "Limit message frequency in channels",
    category: "moderation",
    defaultEnabled: true,
    userConfigurable: false,
  },
};

/**
 * Get feature configuration by flag
 */
export function getFeatureConfig(flag: FeatureFlag): FeatureConfig {
  return FEATURE_CONFIGS[flag];
}
