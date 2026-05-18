/**
 * Configurable Limits System
 *
 * This module defines all configurable limits for the nself-chat application.
 * Limits can be customized via environment variables with sensible defaults.
 *
 * Environment Variable Convention:
 * - NEXT_PUBLIC_{LIMIT_NAME}
 * - Example: NEXT_PUBLIC_MAX_MESSAGE_LENGTH=4000
 *
 * @example
 * ```typescript
 * import { LIMITS, getLimit } from '@/lib/features'
 *
 * if (message.length > LIMITS.MAX_MESSAGE_LENGTH) {
 *   // Show error
 * }
 * ```
 */

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parse an integer from environment variable with fallback
 */
function parseEnvInt(envVar: string | undefined, defaultValue: number): number {
  if (typeof envVar === "undefined" || envVar === "") {
    return defaultValue;
  }
  const parsed = parseInt(envVar, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Parse a boolean from environment variable with fallback
 */
function parseEnvBool(
  envVar: string | undefined,
  defaultValue: boolean,
): boolean {
  if (typeof envVar === "undefined" || envVar === "") {
    return defaultValue;
  }
  return envVar.toLowerCase() === "true" || envVar === "1";
}

// ============================================================================
// LIMIT DEFINITIONS
// ============================================================================

/**
 * All configurable limits for the application
 */
export const LIMITS = {
  // ============================================================================
  // MESSAGE LIMITS
  // ============================================================================

  /** Maximum length of a message in characters */
  MAX_MESSAGE_LENGTH: parseEnvInt(
    process.env.NEXT_PUBLIC_MAX_MESSAGE_LENGTH,
    4000,
  ),

  /** Maximum length of a message in edit mode (may be different from original) */
  MAX_MESSAGE_EDIT_LENGTH: parseEnvInt(
    process.env.NEXT_PUBLIC_MAX_MESSAGE_EDIT_LENGTH,
    4000,
  ),

  /** Time window for editing messages after sending (in milliseconds) */
  MESSAGE_EDIT_WINDOW: parseEnvInt(
    process.env.NEXT_PUBLIC_MESSAGE_EDIT_WINDOW,
    300000, // 5 minutes
  ),

  /** Time window for deleting messages after sending (in milliseconds, 0 = unlimited) */
  MESSAGE_DELETE_WINDOW: parseEnvInt(
    process.env.NEXT_PUBLIC_MESSAGE_DELETE_WINDOW,
    0, // Unlimited by default
  ),

  /** Maximum number of reactions per message */
  MAX_REACTIONS_PER_MESSAGE: parseEnvInt(
    process.env.NEXT_PUBLIC_MAX_REACTIONS_PER_MESSAGE,
    50,
  ),

  /** Maximum number of unique emoji reactions per message */
  MAX_REACTION_EMOJI: parseEnvInt(
    process.env.NEXT_PUBLIC_MAX_REACTION_EMOJI,
    20,
  ),

  /** Maximum number of users that can react with the same emoji */
  MAX_REACTIONS_PER_EMOJI: parseEnvInt(
    process.env.NEXT_PUBLIC_MAX_REACTIONS_PER_EMOJI,
    100,
  ),

  /** Maximum number of pinned messages per channel */
  MAX_PINNED_MESSAGES: parseEnvInt(
    process.env.NEXT_PUBLIC_MAX_PINNED_MESSAGES,
    50,
  ),

  /** Maximum number of bookmarks per user */
  MAX_BOOKMARKS: parseEnvInt(process.env.NEXT_PUBLIC_MAX_BOOKMARKS, 500),

  /** Maximum thread depth (1 = only direct replies, no nested threads) */
  MAX_THREAD_DEPTH: parseEnvInt(process.env.NEXT_PUBLIC_MAX_THREAD_DEPTH, 1),

  /** Maximum number of replies in a thread */
  MAX_THREAD_REPLIES: parseEnvInt(
    process.env.NEXT_PUBLIC_MAX_THREAD_REPLIES,
    1000,
  ),

  /** Maximum voice message duration in seconds */
  MAX_VOICE_MESSAGE_DURATION: parseEnvInt(
    process.env.NEXT_PUBLIC_MAX_VOICE_MESSAGE_DURATION,
    300, // 5 minutes
  ),

  /** Maximum code block length in characters */
  MAX_CODE_BLOCK_LENGTH: parseEnvInt(
    process.env.NEXT_PUBLIC_MAX_CODE_BLOCK_LENGTH,
    10000,
  ),

  // ============================================================================
  // FILE LIMITS
  // ============================================================================

  /** Maximum file size in bytes (default: 100MB) */
  MAX_FILE_SIZE: parseEnvInt(
    process.env.NEXT_PUBLIC_MAX_FILE_SIZE,
    104857600, // 100 MB
  ),

  /** Maximum image file size in bytes (default: 25MB) */
  MAX_IMAGE_SIZE: parseEnvInt(
    process.env.NEXT_PUBLIC_MAX_IMAGE_SIZE,
    26214400, // 25 MB
  ),

  /** Maximum video file size in bytes (default: 500MB) */
  MAX_VIDEO_SIZE: parseEnvInt(
    process.env.NEXT_PUBLIC_MAX_VIDEO_SIZE,
    524288000, // 500 MB
  ),

  /** Maximum audio file size in bytes (default: 100MB) */
  MAX_AUDIO_SIZE: parseEnvInt(
    process.env.NEXT_PUBLIC_MAX_AUDIO_SIZE,
    104857600, // 100 MB
  ),

  /** Maximum attachments per message */
  MAX_ATTACHMENTS: parseEnvInt(
    process.env.NEXT_PUBLIC_MAX_ATTACHMENTS_PER_MESSAGE,
    10,
  ),

  /** Maximum total attachments size per message in bytes (default: 200MB) */
  MAX_ATTACHMENTS_TOTAL_SIZE: parseEnvInt(
    process.env.NEXT_PUBLIC_MAX_ATTACHMENTS_TOTAL_SIZE,
    209715200, // 200 MB
  ),

  /** Maximum image dimensions (width or height) in pixels */
  MAX_IMAGE_DIMENSION: parseEnvInt(
    process.env.NEXT_PUBLIC_MAX_IMAGE_DIMENSION,
    4096,
  ),

  /** Maximum avatar file size in bytes (default: 5MB) */
  MAX_AVATAR_SIZE: parseEnvInt(
    process.env.NEXT_PUBLIC_MAX_AVATAR_SIZE,
    5242880, // 5 MB
  ),

  /** Maximum avatar dimensions in pixels */
  MAX_AVATAR_DIMENSION: parseEnvInt(
    process.env.NEXT_PUBLIC_MAX_AVATAR_DIMENSION,
    512,
  ),

  // ============================================================================
  // CHANNEL LIMITS
  // ============================================================================

  /** Maximum channel name length */
  MAX_CHANNEL_NAME_LENGTH: parseEnvInt(
    process.env.NEXT_PUBLIC_MAX_CHANNEL_NAME_LENGTH,
    80,
  ),

  /** Minimum channel name length */
  MIN_CHANNEL_NAME_LENGTH: parseEnvInt(
    process.env.NEXT_PUBLIC_MIN_CHANNEL_NAME_LENGTH,
    1,
  ),

  /** Maximum channel topic/description length */
  MAX_CHANNEL_TOPIC_LENGTH: parseEnvInt(
    process.env.NEXT_PUBLIC_MAX_CHANNEL_TOPIC_LENGTH,
    250,
  ),

  /** Maximum channels per workspace */
  MAX_CHANNELS_PER_WORKSPACE: parseEnvInt(
    process.env.NEXT_PUBLIC_MAX_CHANNELS_PER_WORKSPACE,
    500,
  ),

  /** Maximum private channels per workspace */
  MAX_PRIVATE_CHANNELS: parseEnvInt(
    process.env.NEXT_PUBLIC_MAX_PRIVATE_CHANNELS,
    250,
  ),

  /** Maximum members in a group DM */
  MAX_GROUP_DM_MEMBERS: parseEnvInt(
    process.env.NEXT_PUBLIC_MAX_GROUP_DM_MEMBERS,
    10,
  ),

  /** Maximum members in a channel */
  MAX_CHANNEL_MEMBERS: parseEnvInt(
    process.env.NEXT_PUBLIC_MAX_CHANNEL_MEMBERS,
    10000,
  ),

  /** Maximum categories per workspace */
  MAX_CATEGORIES: parseEnvInt(process.env.NEXT_PUBLIC_MAX_CATEGORIES, 50),

  /** Maximum channels per category */
  MAX_CHANNELS_PER_CATEGORY: parseEnvInt(
    process.env.NEXT_PUBLIC_MAX_CHANNELS_PER_CATEGORY,
    50,
  ),

  // ============================================================================
  // USER LIMITS
  // ============================================================================

  /** Maximum display name length */
  MAX_DISPLAY_NAME_LENGTH: parseEnvInt(
    process.env.NEXT_PUBLIC_MAX_DISPLAY_NAME_LENGTH,
    50,
  ),

  /** Minimum display name length */
  MIN_DISPLAY_NAME_LENGTH: parseEnvInt(
    process.env.NEXT_PUBLIC_MIN_DISPLAY_NAME_LENGTH,
    1,
  ),

  /** Maximum username length */
  MAX_USERNAME_LENGTH: parseEnvInt(
    process.env.NEXT_PUBLIC_MAX_USERNAME_LENGTH,
    30,
  ),

  /** Minimum username length */
  MIN_USERNAME_LENGTH: parseEnvInt(
    process.env.NEXT_PUBLIC_MIN_USERNAME_LENGTH,
    3,
  ),

  /** Maximum custom status length */
  MAX_STATUS_LENGTH: parseEnvInt(
    process.env.NEXT_PUBLIC_MAX_STATUS_LENGTH,
    100,
  ),

  /** Maximum bio/about length */
  MAX_BIO_LENGTH: parseEnvInt(process.env.NEXT_PUBLIC_MAX_BIO_LENGTH, 500),

  /** Maximum users per workspace */
  MAX_WORKSPACE_MEMBERS: parseEnvInt(
    process.env.NEXT_PUBLIC_MAX_WORKSPACE_MEMBERS,
    10000,
  ),

  /** Maximum blocked users per user */
  MAX_BLOCKED_USERS: parseEnvInt(
    process.env.NEXT_PUBLIC_MAX_BLOCKED_USERS,
    500,
  ),

  // ============================================================================
  // REAL-TIME LIMITS
  // ============================================================================

  /** Typing indicator timeout in milliseconds */
  TYPING_TIMEOUT: parseEnvInt(
    process.env.NEXT_PUBLIC_TYPING_TIMEOUT,
    5000, // 5 seconds
  ),

  /** Presence away timeout in milliseconds */
  PRESENCE_AWAY_TIMEOUT: parseEnvInt(
    process.env.NEXT_PUBLIC_PRESENCE_AWAY_TIMEOUT,
    300000, // 5 minutes
  ),

  /** Presence offline timeout in milliseconds */
  PRESENCE_OFFLINE_TIMEOUT: parseEnvInt(
    process.env.NEXT_PUBLIC_PRESENCE_OFFLINE_TIMEOUT,
    900000, // 15 minutes
  ),

  /** Real-time connection retry delay in milliseconds */
  REALTIME_RETRY_DELAY: parseEnvInt(
    process.env.NEXT_PUBLIC_REALTIME_RETRY_DELAY,
    3000,
  ),

  /** Maximum real-time connection retries */
  REALTIME_MAX_RETRIES: parseEnvInt(
    process.env.NEXT_PUBLIC_REALTIME_MAX_RETRIES,
    5,
  ),

  // ============================================================================
  // SEARCH LIMITS
  // ============================================================================

  /** Maximum search query length */
  MAX_SEARCH_QUERY_LENGTH: parseEnvInt(
    process.env.NEXT_PUBLIC_MAX_SEARCH_QUERY_LENGTH,
    500,
  ),

  /** Minimum search query length */
  MIN_SEARCH_QUERY_LENGTH: parseEnvInt(
    process.env.NEXT_PUBLIC_MIN_SEARCH_QUERY_LENGTH,
    2,
  ),

  /** Maximum search results per page */
  MAX_SEARCH_RESULTS: parseEnvInt(
    process.env.NEXT_PUBLIC_MAX_SEARCH_RESULTS,
    50,
  ),

  /** Search debounce delay in milliseconds */
  SEARCH_DEBOUNCE_DELAY: parseEnvInt(
    process.env.NEXT_PUBLIC_SEARCH_DEBOUNCE_DELAY,
    300,
  ),

  // ============================================================================
  // NOTIFICATION LIMITS
  // ============================================================================

  /** Maximum notifications to keep in history */
  MAX_NOTIFICATION_HISTORY: parseEnvInt(
    process.env.NEXT_PUBLIC_MAX_NOTIFICATION_HISTORY,
    100,
  ),

  /** Notification sound cooldown in milliseconds (prevent spam) */
  NOTIFICATION_SOUND_COOLDOWN: parseEnvInt(
    process.env.NEXT_PUBLIC_NOTIFICATION_SOUND_COOLDOWN,
    1000,
  ),

  // ============================================================================
  // ADVANCED FEATURE LIMITS
  // ============================================================================

  /** Maximum poll options */
  MAX_POLL_OPTIONS: parseEnvInt(process.env.NEXT_PUBLIC_MAX_POLL_OPTIONS, 10),

  /** Maximum poll question length */
  MAX_POLL_QUESTION_LENGTH: parseEnvInt(
    process.env.NEXT_PUBLIC_MAX_POLL_QUESTION_LENGTH,
    200,
  ),

  /** Maximum poll option length */
  MAX_POLL_OPTION_LENGTH: parseEnvInt(
    process.env.NEXT_PUBLIC_MAX_POLL_OPTION_LENGTH,
    100,
  ),

  /** Maximum custom emoji per workspace */
  MAX_CUSTOM_EMOJI: parseEnvInt(process.env.NEXT_PUBLIC_MAX_CUSTOM_EMOJI, 500),

  /** Maximum custom emoji name length */
  MAX_EMOJI_NAME_LENGTH: parseEnvInt(
    process.env.NEXT_PUBLIC_MAX_EMOJI_NAME_LENGTH,
    32,
  ),

  /** Maximum webhook integrations per channel */
  MAX_WEBHOOKS_PER_CHANNEL: parseEnvInt(
    process.env.NEXT_PUBLIC_MAX_WEBHOOKS_PER_CHANNEL,
    10,
  ),

  /** Maximum bot accounts per workspace */
  MAX_BOTS_PER_WORKSPACE: parseEnvInt(
    process.env.NEXT_PUBLIC_MAX_BOTS_PER_WORKSPACE,
    50,
  ),

  // ============================================================================
  // RATE LIMITS
  // ============================================================================

  /** Maximum messages per minute per user */
  RATE_LIMIT_MESSAGES_PER_MINUTE: parseEnvInt(
    process.env.NEXT_PUBLIC_RATE_LIMIT_MESSAGES_PER_MINUTE,
    30,
  ),

  /** Maximum file uploads per minute per user */
  RATE_LIMIT_UPLOADS_PER_MINUTE: parseEnvInt(
    process.env.NEXT_PUBLIC_RATE_LIMIT_UPLOADS_PER_MINUTE,
    10,
  ),

  /** Maximum API requests per minute */
  RATE_LIMIT_API_PER_MINUTE: parseEnvInt(
    process.env.NEXT_PUBLIC_RATE_LIMIT_API_PER_MINUTE,
    60,
  ),

  /** Slow mode minimum delay in seconds */
  SLOW_MODE_MIN_DELAY: parseEnvInt(
    process.env.NEXT_PUBLIC_SLOW_MODE_MIN_DELAY,
    1,
  ),

  /** Slow mode maximum delay in seconds */
  SLOW_MODE_MAX_DELAY: parseEnvInt(
    process.env.NEXT_PUBLIC_SLOW_MODE_MAX_DELAY,
    3600, // 1 hour
  ),

  // ============================================================================
  // UI LIMITS
  // ============================================================================

  /** Maximum messages to load initially */
  INITIAL_MESSAGES_LOAD: parseEnvInt(
    process.env.NEXT_PUBLIC_INITIAL_MESSAGES_LOAD,
    50,
  ),

  /** Messages to load when scrolling up */
  MESSAGES_LOAD_MORE: parseEnvInt(
    process.env.NEXT_PUBLIC_MESSAGES_LOAD_MORE,
    25,
  ),

  /** Maximum messages to keep in memory per channel */
  MAX_MESSAGES_IN_MEMORY: parseEnvInt(
    process.env.NEXT_PUBLIC_MAX_MESSAGES_IN_MEMORY,
    500,
  ),

  /** Maximum channels in sidebar before collapsing */
  SIDEBAR_COLLAPSE_THRESHOLD: parseEnvInt(
    process.env.NEXT_PUBLIC_SIDEBAR_COLLAPSE_THRESHOLD,
    30,
  ),

  /** Maximum recent channels to show */
  MAX_RECENT_CHANNELS: parseEnvInt(
    process.env.NEXT_PUBLIC_MAX_RECENT_CHANNELS,
    10,
  ),

  /** Maximum recent searches to save */
  MAX_RECENT_SEARCHES: parseEnvInt(
    process.env.NEXT_PUBLIC_MAX_RECENT_SEARCHES,
    10,
  ),
} as const;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Type for all limit keys
 */
export type LimitKey = keyof typeof LIMITS;

/**
 * Type for limit values (all numbers)
 */
export type LimitValue = (typeof LIMITS)[LimitKey];

// ============================================================================
// LIMIT METADATA
// ============================================================================

/**
 * Metadata for all limits including descriptions and validation
 */
export const LIMIT_METADATA: Record<
  LimitKey,
  {
    name: string;
    description: string;
    unit: "bytes" | "ms" | "seconds" | "minutes" | "count" | "characters";
    min: number;
    max: number;
    category: string;
  }
> = {
  // Message limits
  MAX_MESSAGE_LENGTH: {
    name: "Max Message Length",
    description: "Maximum number of characters in a message",
    unit: "characters",
    min: 100,
    max: 40000,
    category: "messages",
  },
  MAX_MESSAGE_EDIT_LENGTH: {
    name: "Max Edit Length",
    description: "Maximum characters when editing a message",
    unit: "characters",
    min: 100,
    max: 40000,
    category: "messages",
  },
  MESSAGE_EDIT_WINDOW: {
    name: "Edit Window",
    description: "Time allowed to edit a message after sending",
    unit: "ms",
    min: 0,
    max: 86400000,
    category: "messages",
  },
  MESSAGE_DELETE_WINDOW: {
    name: "Delete Window",
    description: "Time allowed to delete a message (0 = unlimited)",
    unit: "ms",
    min: 0,
    max: 86400000,
    category: "messages",
  },
  MAX_REACTIONS_PER_MESSAGE: {
    name: "Max Reactions",
    description: "Maximum total reactions on a message",
    unit: "count",
    min: 0,
    max: 1000,
    category: "messages",
  },
  MAX_REACTION_EMOJI: {
    name: "Max Emoji Types",
    description: "Maximum unique emoji per message",
    unit: "count",
    min: 1,
    max: 100,
    category: "messages",
  },
  MAX_REACTIONS_PER_EMOJI: {
    name: "Max Per Emoji",
    description: "Maximum users reacting with same emoji",
    unit: "count",
    min: 1,
    max: 10000,
    category: "messages",
  },
  MAX_PINNED_MESSAGES: {
    name: "Max Pinned",
    description: "Maximum pinned messages per channel",
    unit: "count",
    min: 0,
    max: 500,
    category: "messages",
  },
  MAX_BOOKMARKS: {
    name: "Max Bookmarks",
    description: "Maximum bookmarks per user",
    unit: "count",
    min: 0,
    max: 10000,
    category: "messages",
  },
  MAX_THREAD_DEPTH: {
    name: "Thread Depth",
    description: "Maximum nesting level for threads",
    unit: "count",
    min: 1,
    max: 10,
    category: "messages",
  },
  MAX_THREAD_REPLIES: {
    name: "Max Thread Replies",
    description: "Maximum replies in a thread",
    unit: "count",
    min: 10,
    max: 10000,
    category: "messages",
  },
  MAX_VOICE_MESSAGE_DURATION: {
    name: "Voice Duration",
    description: "Maximum voice message length",
    unit: "seconds",
    min: 10,
    max: 3600,
    category: "messages",
  },
  MAX_CODE_BLOCK_LENGTH: {
    name: "Code Block Length",
    description: "Maximum code block size",
    unit: "characters",
    min: 1000,
    max: 100000,
    category: "messages",
  },

  // File limits
  MAX_FILE_SIZE: {
    name: "Max File Size",
    description: "Maximum upload file size",
    unit: "bytes",
    min: 1048576,
    max: 5368709120,
    category: "files",
  },
  MAX_IMAGE_SIZE: {
    name: "Max Image Size",
    description: "Maximum image file size",
    unit: "bytes",
    min: 1048576,
    max: 104857600,
    category: "files",
  },
  MAX_VIDEO_SIZE: {
    name: "Max Video Size",
    description: "Maximum video file size",
    unit: "bytes",
    min: 1048576,
    max: 5368709120,
    category: "files",
  },
  MAX_AUDIO_SIZE: {
    name: "Max Audio Size",
    description: "Maximum audio file size",
    unit: "bytes",
    min: 1048576,
    max: 524288000,
    category: "files",
  },
  MAX_ATTACHMENTS: {
    name: "Max Attachments",
    description: "Maximum files per message",
    unit: "count",
    min: 1,
    max: 50,
    category: "files",
  },
  MAX_ATTACHMENTS_TOTAL_SIZE: {
    name: "Max Total Size",
    description: "Maximum combined attachment size",
    unit: "bytes",
    min: 1048576,
    max: 5368709120,
    category: "files",
  },
  MAX_IMAGE_DIMENSION: {
    name: "Max Image Dimension",
    description: "Maximum image width/height in pixels",
    unit: "count",
    min: 512,
    max: 8192,
    category: "files",
  },
  MAX_AVATAR_SIZE: {
    name: "Max Avatar Size",
    description: "Maximum avatar file size",
    unit: "bytes",
    min: 102400,
    max: 10485760,
    category: "files",
  },
  MAX_AVATAR_DIMENSION: {
    name: "Max Avatar Dimension",
    description: "Maximum avatar width/height",
    unit: "count",
    min: 64,
    max: 1024,
    category: "files",
  },

  // Channel limits
  MAX_CHANNEL_NAME_LENGTH: {
    name: "Channel Name Length",
    description: "Maximum channel name characters",
    unit: "characters",
    min: 1,
    max: 200,
    category: "channels",
  },
  MIN_CHANNEL_NAME_LENGTH: {
    name: "Min Channel Name",
    description: "Minimum channel name characters",
    unit: "characters",
    min: 1,
    max: 10,
    category: "channels",
  },
  MAX_CHANNEL_TOPIC_LENGTH: {
    name: "Topic Length",
    description: "Maximum channel topic characters",
    unit: "characters",
    min: 0,
    max: 1000,
    category: "channels",
  },
  MAX_CHANNELS_PER_WORKSPACE: {
    name: "Max Channels",
    description: "Maximum channels per workspace",
    unit: "count",
    min: 10,
    max: 10000,
    category: "channels",
  },
  MAX_PRIVATE_CHANNELS: {
    name: "Max Private Channels",
    description: "Maximum private channels",
    unit: "count",
    min: 0,
    max: 5000,
    category: "channels",
  },
  MAX_GROUP_DM_MEMBERS: {
    name: "Group DM Members",
    description: "Maximum users in group DM",
    unit: "count",
    min: 3,
    max: 50,
    category: "channels",
  },
  MAX_CHANNEL_MEMBERS: {
    name: "Channel Members",
    description: "Maximum members per channel",
    unit: "count",
    min: 10,
    max: 100000,
    category: "channels",
  },
  MAX_CATEGORIES: {
    name: "Max Categories",
    description: "Maximum channel categories",
    unit: "count",
    min: 1,
    max: 200,
    category: "channels",
  },
  MAX_CHANNELS_PER_CATEGORY: {
    name: "Channels Per Category",
    description: "Maximum channels in a category",
    unit: "count",
    min: 1,
    max: 200,
    category: "channels",
  },

  // User limits
  MAX_DISPLAY_NAME_LENGTH: {
    name: "Display Name Length",
    description: "Maximum display name characters",
    unit: "characters",
    min: 1,
    max: 100,
    category: "users",
  },
  MIN_DISPLAY_NAME_LENGTH: {
    name: "Min Display Name",
    description: "Minimum display name characters",
    unit: "characters",
    min: 1,
    max: 10,
    category: "users",
  },
  MAX_USERNAME_LENGTH: {
    name: "Username Length",
    description: "Maximum username characters",
    unit: "characters",
    min: 3,
    max: 50,
    category: "users",
  },
  MIN_USERNAME_LENGTH: {
    name: "Min Username",
    description: "Minimum username characters",
    unit: "characters",
    min: 1,
    max: 10,
    category: "users",
  },
  MAX_STATUS_LENGTH: {
    name: "Status Length",
    description: "Maximum custom status characters",
    unit: "characters",
    min: 0,
    max: 500,
    category: "users",
  },
  MAX_BIO_LENGTH: {
    name: "Bio Length",
    description: "Maximum profile bio characters",
    unit: "characters",
    min: 0,
    max: 2000,
    category: "users",
  },
  MAX_WORKSPACE_MEMBERS: {
    name: "Workspace Members",
    description: "Maximum users per workspace",
    unit: "count",
    min: 10,
    max: 1000000,
    category: "users",
  },
  MAX_BLOCKED_USERS: {
    name: "Blocked Users",
    description: "Maximum users a user can block",
    unit: "count",
    min: 0,
    max: 10000,
    category: "users",
  },

  // Real-time limits
  TYPING_TIMEOUT: {
    name: "Typing Timeout",
    description: "How long typing indicator shows",
    unit: "ms",
    min: 1000,
    max: 30000,
    category: "realtime",
  },
  PRESENCE_AWAY_TIMEOUT: {
    name: "Away Timeout",
    description: "Time before showing as away",
    unit: "ms",
    min: 60000,
    max: 3600000,
    category: "realtime",
  },
  PRESENCE_OFFLINE_TIMEOUT: {
    name: "Offline Timeout",
    description: "Time before showing as offline",
    unit: "ms",
    min: 300000,
    max: 7200000,
    category: "realtime",
  },
  REALTIME_RETRY_DELAY: {
    name: "Retry Delay",
    description: "Connection retry delay",
    unit: "ms",
    min: 1000,
    max: 30000,
    category: "realtime",
  },
  REALTIME_MAX_RETRIES: {
    name: "Max Retries",
    description: "Maximum connection retries",
    unit: "count",
    min: 1,
    max: 20,
    category: "realtime",
  },

  // Search limits
  MAX_SEARCH_QUERY_LENGTH: {
    name: "Query Length",
    description: "Maximum search query characters",
    unit: "characters",
    min: 100,
    max: 1000,
    category: "search",
  },
  MIN_SEARCH_QUERY_LENGTH: {
    name: "Min Query Length",
    description: "Minimum characters to search",
    unit: "characters",
    min: 1,
    max: 10,
    category: "search",
  },
  MAX_SEARCH_RESULTS: {
    name: "Max Results",
    description: "Maximum results per page",
    unit: "count",
    min: 10,
    max: 200,
    category: "search",
  },
  SEARCH_DEBOUNCE_DELAY: {
    name: "Debounce Delay",
    description: "Delay before searching",
    unit: "ms",
    min: 100,
    max: 1000,
    category: "search",
  },

  // Notification limits
  MAX_NOTIFICATION_HISTORY: {
    name: "Notification History",
    description: "Max notifications to keep",
    unit: "count",
    min: 10,
    max: 1000,
    category: "notifications",
  },
  NOTIFICATION_SOUND_COOLDOWN: {
    name: "Sound Cooldown",
    description: "Min time between notification sounds",
    unit: "ms",
    min: 0,
    max: 10000,
    category: "notifications",
  },

  // Advanced feature limits
  MAX_POLL_OPTIONS: {
    name: "Poll Options",
    description: "Maximum poll options",
    unit: "count",
    min: 2,
    max: 25,
    category: "advanced",
  },
  MAX_POLL_QUESTION_LENGTH: {
    name: "Poll Question Length",
    description: "Maximum poll question characters",
    unit: "characters",
    min: 10,
    max: 500,
    category: "advanced",
  },
  MAX_POLL_OPTION_LENGTH: {
    name: "Poll Option Length",
    description: "Maximum poll option characters",
    unit: "characters",
    min: 1,
    max: 200,
    category: "advanced",
  },
  MAX_CUSTOM_EMOJI: {
    name: "Custom Emoji",
    description: "Maximum custom emoji per workspace",
    unit: "count",
    min: 0,
    max: 5000,
    category: "advanced",
  },
  MAX_EMOJI_NAME_LENGTH: {
    name: "Emoji Name Length",
    description: "Maximum emoji name characters",
    unit: "characters",
    min: 2,
    max: 64,
    category: "advanced",
  },
  MAX_WEBHOOKS_PER_CHANNEL: {
    name: "Webhooks Per Channel",
    description: "Maximum webhooks per channel",
    unit: "count",
    min: 0,
    max: 50,
    category: "advanced",
  },
  MAX_BOTS_PER_WORKSPACE: {
    name: "Bots Per Workspace",
    description: "Maximum bot accounts",
    unit: "count",
    min: 0,
    max: 200,
    category: "advanced",
  },

  // Rate limits
  RATE_LIMIT_MESSAGES_PER_MINUTE: {
    name: "Messages Per Minute",
    description: "Maximum messages per minute",
    unit: "count",
    min: 1,
    max: 100,
    category: "rate_limits",
  },
  RATE_LIMIT_UPLOADS_PER_MINUTE: {
    name: "Uploads Per Minute",
    description: "Maximum uploads per minute",
    unit: "count",
    min: 1,
    max: 50,
    category: "rate_limits",
  },
  RATE_LIMIT_API_PER_MINUTE: {
    name: "API Requests",
    description: "Maximum API requests per minute",
    unit: "count",
    min: 10,
    max: 1000,
    category: "rate_limits",
  },
  SLOW_MODE_MIN_DELAY: {
    name: "Slow Mode Min",
    description: "Minimum slow mode delay",
    unit: "seconds",
    min: 1,
    max: 60,
    category: "rate_limits",
  },
  SLOW_MODE_MAX_DELAY: {
    name: "Slow Mode Max",
    description: "Maximum slow mode delay",
    unit: "seconds",
    min: 60,
    max: 86400,
    category: "rate_limits",
  },

  // UI limits
  INITIAL_MESSAGES_LOAD: {
    name: "Initial Messages",
    description: "Messages loaded initially",
    unit: "count",
    min: 10,
    max: 200,
    category: "ui",
  },
  MESSAGES_LOAD_MORE: {
    name: "Load More Count",
    description: "Messages loaded on scroll",
    unit: "count",
    min: 10,
    max: 100,
    category: "ui",
  },
  MAX_MESSAGES_IN_MEMORY: {
    name: "Messages In Memory",
    description: "Max messages kept in memory",
    unit: "count",
    min: 100,
    max: 5000,
    category: "ui",
  },
  SIDEBAR_COLLAPSE_THRESHOLD: {
    name: "Sidebar Collapse",
    description: "Channels before auto-collapse",
    unit: "count",
    min: 10,
    max: 100,
    category: "ui",
  },
  MAX_RECENT_CHANNELS: {
    name: "Recent Channels",
    description: "Recent channels to show",
    unit: "count",
    min: 3,
    max: 30,
    category: "ui",
  },
  MAX_RECENT_SEARCHES: {
    name: "Recent Searches",
    description: "Recent searches to save",
    unit: "count",
    min: 3,
    max: 50,
    category: "ui",
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get a specific limit value
 */
export function getLimit(key: LimitKey): number {
  return LIMITS[key];
}

/**
 * Get limit metadata
 */
export function getLimitMetadata(key: LimitKey) {
  return LIMIT_METADATA[key];
}

/**
 * Validate a value against a limit's constraints
 */
export function validateLimitValue(
  key: LimitKey,
  value: number,
): { valid: boolean; error?: string } {
  const metadata = LIMIT_METADATA[key];

  if (value < metadata.min) {
    return {
      valid: false,
      error: `${metadata.name} must be at least ${metadata.min}`,
    };
  }

  if (value > metadata.max) {
    return {
      valid: false,
      error: `${metadata.name} cannot exceed ${metadata.max}`,
    };
  }

  return { valid: true };
}

/**
 * Format a limit value with its unit
 */
export function formatLimitValue(key: LimitKey): string {
  const value = LIMITS[key];
  const metadata = LIMIT_METADATA[key];

  switch (metadata.unit) {
    case "bytes":
      return formatBytes(value);
    case "ms":
      return formatDuration(value);
    case "seconds":
      return `${value} seconds`;
    case "minutes":
      return `${value} minutes`;
    case "characters":
      return `${value} characters`;
    case "count":
    default:
      return value.toLocaleString();
  }
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Format milliseconds to human-readable string
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)} min`;
  return `${(ms / 3600000).toFixed(1)} hr`;
}

/**
 * Get all limits in a specific category
 */
export function getLimitsByCategory(category: string): Array<{
  key: LimitKey;
  value: number;
  metadata: (typeof LIMIT_METADATA)[LimitKey];
}> {
  return Object.entries(LIMIT_METADATA)
    .filter(([_, meta]) => meta.category === category)
    .map(([key, metadata]) => ({
      key: key as LimitKey,
      value: LIMITS[key as LimitKey],
      metadata,
    }));
}

/**
 * Get all limit categories
 */
export function getLimitCategories(): string[] {
  const categories = new Set(
    Object.values(LIMIT_METADATA).map((m) => m.category),
  );
  return Array.from(categories).sort();
}
