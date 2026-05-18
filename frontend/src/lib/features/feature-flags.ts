/**
 * Core Feature Flag Definitions
 *
 * This file defines all feature flags available in the nself-chat application.
 * Feature flags allow granular control over every feature, enabling white-label
 * customization and progressive feature rollout.
 *
 * Naming Convention:
 * - Category.featureName format (e.g., 'messages.edit')
 * - Categories: messages, channels, files, users, realtime, search, notifications, advanced
 *
 * @example
 * ```typescript
 * import { FEATURES } from '@/lib/features'
 *
 * if (isFeatureEnabled(FEATURES.MESSAGES_THREADS)) {
 *   // Show thread UI
 * }
 * ```
 */

export const FEATURES = {
  // ============================================================================
  // MESSAGING FEATURES
  // ============================================================================

  /** Allow users to edit their own messages */
  MESSAGES_EDIT: "messages.edit",

  /** Allow users to delete their own messages */
  MESSAGES_DELETE: "messages.delete",

  /** Enable emoji reactions on messages */
  MESSAGES_REACTIONS: "messages.reactions",

  /** Enable threaded replies on messages */
  MESSAGES_THREADS: "messages.threads",

  /** Allow pinning messages to channels */
  MESSAGES_PINS: "messages.pins",

  /** Allow users to bookmark messages for personal reference */
  MESSAGES_BOOKMARKS: "messages.bookmarks",

  /** Allow forwarding messages to other channels/users */
  MESSAGES_FORWARD: "messages.forward",

  /** Enable scheduled message sending */
  MESSAGES_SCHEDULE: "messages.schedule",

  /** Enable voice message recording and playback */
  MESSAGES_VOICE: "messages.voice",

  /** Enable syntax-highlighted code blocks in messages */
  MESSAGES_CODE_BLOCKS: "messages.codeBlocks",

  /** Enable Markdown formatting in messages */
  MESSAGES_MARKDOWN: "messages.markdown",

  /** Enable automatic URL previews/unfurling */
  MESSAGES_LINK_PREVIEWS: "messages.linkPreviews",

  /** Enable @mentions for users and channels */
  MESSAGES_MENTIONS: "messages.mentions",

  /** Enable message quoting/reply with preview */
  MESSAGES_QUOTES: "messages.quotes",

  // ============================================================================
  // CHANNEL FEATURES
  // ============================================================================

  /** Enable public channels visible to all members */
  CHANNELS_PUBLIC: "channels.public",

  /** Enable private/invite-only channels */
  CHANNELS_PRIVATE: "channels.private",

  /** Enable direct messages between two users */
  CHANNELS_DIRECT: "channels.direct",

  /** Enable group direct messages (3+ users) */
  CHANNELS_GROUP_DM: "channels.groupDm",

  /** Enable channel organization into categories */
  CHANNELS_CATEGORIES: "channels.categories",

  /** Enable channel topics/descriptions */
  CHANNELS_TOPICS: "channels.topics",

  /** Enable archiving channels instead of deleting */
  CHANNELS_ARCHIVE: "channels.archive",

  /** Enable channel starring/favoriting */
  CHANNELS_FAVORITES: "channels.favorites",

  /** Enable muting channels */
  CHANNELS_MUTE: "channels.mute",

  // ============================================================================
  // FILE FEATURES
  // ============================================================================

  /** Enable file uploading */
  FILES_UPLOAD: "files.upload",

  /** Enable image uploads and inline display */
  FILES_IMAGES: "files.images",

  /** Enable document uploads (PDF, DOC, etc.) */
  FILES_DOCUMENTS: "files.documents",

  /** Enable audio file uploads */
  FILES_AUDIO: "files.audio",

  /** Enable video file uploads */
  FILES_VIDEO: "files.video",

  /** Enable in-app file previews */
  FILES_PREVIEW: "files.preview",

  /** Enable drag-and-drop file upload */
  FILES_DRAG_DROP: "files.dragDrop",

  /** Enable clipboard paste for file upload */
  FILES_CLIPBOARD: "files.clipboard",

  // ============================================================================
  // USER FEATURES
  // ============================================================================

  /** Show online/offline/away presence indicators */
  USERS_PRESENCE: "users.presence",

  /** Allow custom status messages (e.g., "In a meeting") */
  USERS_CUSTOM_STATUS: "users.customStatus",

  /** Enable user profile pages */
  USERS_PROFILES: "users.profiles",

  /** Enable role-based access control */
  USERS_ROLES: "users.roles",

  /** Enable user blocking */
  USERS_BLOCKING: "users.blocking",

  /** Enable profile avatar uploads */
  USERS_AVATARS: "users.avatars",

  /** Enable display name customization */
  USERS_DISPLAY_NAMES: "users.displayNames",

  // ============================================================================
  // REAL-TIME FEATURES
  // ============================================================================

  /** Show typing indicators */
  REALTIME_TYPING: "realtime.typing",

  /** Show read receipts (who has seen messages) */
  REALTIME_READ_RECEIPTS: "realtime.readReceipts",

  /** Real-time presence updates */
  REALTIME_PRESENCE: "realtime.presence",

  /** Real-time message syncing */
  REALTIME_MESSAGES: "realtime.messages",

  /** Real-time notification delivery */
  REALTIME_NOTIFICATIONS: "realtime.notifications",

  // ============================================================================
  // SEARCH FEATURES
  // ============================================================================

  /** Enable message search */
  SEARCH_MESSAGES: "search.messages",

  /** Enable file search */
  SEARCH_FILES: "search.files",

  /** Enable user search */
  SEARCH_USERS: "search.users",

  /** Enable global search across all content */
  SEARCH_GLOBAL: "search.global",

  /** Enable search filters (date, from, in, etc.) */
  SEARCH_FILTERS: "search.filters",

  /** Enable search result highlighting */
  SEARCH_HIGHLIGHTING: "search.highlighting",

  // ============================================================================
  // NOTIFICATION FEATURES
  // ============================================================================

  /** Enable desktop/browser notifications */
  NOTIFICATIONS_DESKTOP: "notifications.desktop",

  /** Enable notification sounds */
  NOTIFICATIONS_SOUND: "notifications.sound",

  /** Enable email notifications */
  NOTIFICATIONS_EMAIL: "notifications.email",

  /** Enable mobile push notifications */
  NOTIFICATIONS_MOBILE: "notifications.mobile",

  /** Enable do-not-disturb mode */
  NOTIFICATIONS_DND: "notifications.dnd",

  /** Enable notification scheduling/quiet hours */
  NOTIFICATIONS_SCHEDULE: "notifications.schedule",

  // ============================================================================
  // ADVANCED FEATURES
  // ============================================================================

  /** Enable custom emoji creation and usage */
  CUSTOM_EMOJI: "advanced.customEmoji",

  /** Enable GIF picker integration (Giphy, Tenor) */
  GIF_PICKER: "advanced.gifPicker",

  /** Enable sticker packs */
  STICKERS: "advanced.stickers",

  /** Enable poll creation in messages */
  POLLS: "advanced.polls",

  /** Enable incoming/outgoing webhooks */
  WEBHOOKS: "advanced.webhooks",

  /** Enable bot accounts */
  BOTS: "advanced.bots",

  /** Enable slash commands */
  SLASH_COMMANDS: "advanced.slashCommands",

  /** Enable third-party integrations (Slack, GitHub, etc.) */
  INTEGRATIONS: "advanced.integrations",

  /** Enable message reminders */
  REMINDERS: "advanced.reminders",

  /** Enable workflow automation */
  WORKFLOWS: "advanced.workflows",

  /** Enable video calling */
  VIDEO_CALLS: "advanced.videoCalls",

  /** Enable screen sharing */
  SCREEN_SHARE: "advanced.screenShare",

  // ============================================================================
  // ADMIN FEATURES
  // ============================================================================

  /** Enable admin dashboard access */
  ADMIN_DASHBOARD: "admin.dashboard",

  /** Enable user management */
  ADMIN_USER_MANAGEMENT: "admin.userManagement",

  /** Enable analytics viewing */
  ADMIN_ANALYTICS: "admin.analytics",

  /** Enable audit log viewing */
  ADMIN_AUDIT_LOGS: "admin.auditLogs",

  /** Enable bulk operations */
  ADMIN_BULK_OPERATIONS: "admin.bulkOperations",

  /** Enable export functionality */
  ADMIN_EXPORT: "admin.export",

  // ============================================================================
  // MODERATION FEATURES
  // ============================================================================

  /** Enable content moderation tools */
  MODERATION_TOOLS: "moderation.tools",

  /** Enable message reporting */
  MODERATION_REPORTING: "moderation.reporting",

  /** Enable automatic content filtering */
  MODERATION_AUTO_FILTER: "moderation.autoFilter",

  /** Enable user warnings */
  MODERATION_WARNINGS: "moderation.warnings",

  /** Enable user banning */
  MODERATION_BANS: "moderation.bans",

  /** Enable slow mode for channels */
  MODERATION_SLOW_MODE: "moderation.slowMode",
} as const;

/**
 * Type representing all feature flag keys
 */
export type FeatureKey = keyof typeof FEATURES;

/**
 * Type representing all feature flag values (the string identifiers)
 */
export type FeatureFlag = (typeof FEATURES)[FeatureKey];

/**
 * Array of all feature flags for iteration
 */
export const ALL_FEATURES = Object.values(FEATURES);

/**
 * Array of all feature keys for iteration
 */
export const ALL_FEATURE_KEYS = Object.keys(FEATURES) as FeatureKey[];

/**
 * Get the category from a feature flag
 * @example getFeatureCategory('messages.edit') // 'messages'
 */
export function getFeatureCategory(feature: FeatureFlag): string {
  return feature.split(".")[0];
}

/**
 * Get all features in a specific category
 * @example getFeaturesByCategory('messages') // ['messages.edit', 'messages.delete', ...]
 */
export function getFeaturesByCategory(category: string): FeatureFlag[] {
  return ALL_FEATURES.filter((f) => f.startsWith(`${category}.`));
}

/**
 * Feature categories for organization
 */
export const FEATURE_CATEGORIES = {
  messages: "Messaging",
  channels: "Channels",
  files: "Files & Media",
  users: "Users & Profiles",
  realtime: "Real-time",
  search: "Search",
  notifications: "Notifications",
  advanced: "Advanced Features",
  admin: "Administration",
  moderation: "Moderation",
} as const;

export type FeatureCategory = keyof typeof FEATURE_CATEGORIES;
