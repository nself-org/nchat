/**
 * Telegram Platform Behavior Preset
 *
 * Detailed behavior preset matching Telegram's interaction patterns,
 * feature flags, permissions, and platform-specific behaviors.
 *
 * Key characteristics:
 *   - Chat Folders (unlimited custom folders with smart filters)
 *   - Secret Chats (self-destruct timer, screenshot protection, forward restriction)
 *   - Channels (broadcast-only, sign messages, discussion groups)
 *   - Supergroups (up to 200K members, slow mode, granular admin rights)
 *   - Bot features (inline bots, custom keyboards, mini apps / web apps)
 *   - Scheduled + silent messages
 *   - Edit history visible
 *   - Cloud drafts and cross-device sync
 *   - Multiple accounts
 *   - Passcode lock
 *   - Nearby People discovery
 *   - Voice/Video messages (circular video messages)
 *
 * @module lib/skins/platforms/telegram/behavior
 * @version 1.0.0
 */

import type { BehaviorPreset } from "../../types";

// ============================================================================
// TELEGRAM-SPECIFIC BEHAVIOR TYPES
// ============================================================================

/**
 * Telegram Chat Folders behavior configuration.
 */
export interface TelegramChatFoldersConfig {
  /** Whether chat folders are enabled */
  enabled: boolean;
  /** Maximum custom folders a user can create */
  maxFolders: number;
  /** Maximum chats per folder */
  maxChatsPerFolder: number;
  /** Folder icon support */
  folderIcons: boolean;
  /** Smart filter types available */
  smartFilters: string[];
  /** Whether folder tabs are shown at top of chat list */
  folderTabs: boolean;
  /** Whether folders can include/exclude chat types */
  includeExcludeFilters: boolean;
  /** Shareable folder links */
  shareableFolderLinks: boolean;
}

/**
 * Telegram Secret Chats behavior configuration.
 */
export interface TelegramSecretChatsConfig {
  /** Whether secret chats are available */
  enabled: boolean;
  /** End-to-end encryption (client-to-client, not server-stored) */
  e2eeClientToClient: boolean;
  /** Self-destruct timer available */
  selfDestructTimer: boolean;
  /** Self-destruct timer options */
  selfDestructOptions: string[];
  /** Screenshot protection/notification */
  screenshotProtection: boolean;
  /** Forward restriction (cannot forward secret chat messages) */
  forwardRestriction: boolean;
  /** No cloud storage (messages stay on device) */
  noCloudStorage: boolean;
  /** Encryption indicator (lock icon) */
  encryptionIndicator: boolean;
  /** Key visualization (emoji grid for verification) */
  keyVisualization: boolean;
  /** Message auto-delete after read */
  autoDeleteAfterRead: boolean;
}

/**
 * Telegram Channel behavior configuration (broadcast channels).
 */
export interface TelegramChannelConfig {
  /** Whether channels (broadcast) are supported */
  enabled: boolean;
  /** Unlimited subscribers */
  unlimitedSubscribers: boolean;
  /** Sign messages option (show admin name) */
  signMessages: boolean;
  /** Discussion group linked to channel */
  discussionGroup: boolean;
  /** Channel admin roles granularity */
  adminRoles: string[];
  /** Post reactions */
  postReactions: boolean;
  /** Post comments (via discussion group) */
  postComments: boolean;
  /** Channel statistics / analytics */
  channelStatistics: boolean;
  /** Silent broadcast option */
  silentBroadcast: boolean;
  /** Scheduled posts */
  scheduledPosts: boolean;
  /** Post editing (no time limit) */
  postEditing: boolean;
  /** Post pinning */
  postPinning: boolean;
}

/**
 * Telegram Supergroup behavior configuration.
 */
export interface TelegramSupergroupConfig {
  /** Whether supergroups are supported */
  enabled: boolean;
  /** Maximum members */
  maxMembers: number;
  /** Slow mode available */
  slowMode: boolean;
  /** Slow mode interval options in seconds */
  slowModeIntervals: number[];
  /** Granular admin rights */
  adminRights: string[];
  /** Granular member restrictions */
  memberRestrictions: string[];
  /** Message pinning */
  pinning: boolean;
  /** Max pinned messages */
  maxPinnedMessages: number;
  /** Group sticker set */
  groupStickerSet: boolean;
  /** Anti-spam mode */
  antiSpamMode: boolean;
  /** Admin approval for new members */
  memberApproval: boolean;
  /** Topics/Forum mode */
  topicsMode: boolean;
  /** Group invite links with expiration */
  inviteLinksWithExpiry: boolean;
  /** Group statistics */
  groupStatistics: boolean;
}

/**
 * Telegram Bot behavior configuration.
 */
export interface TelegramBotConfig {
  /** Whether bots are supported */
  enabled: boolean;
  /** Inline bots (@bot query in any chat) */
  inlineBots: boolean;
  /** Custom keyboards (reply keyboards) */
  customKeyboards: boolean;
  /** Inline keyboards (buttons below messages) */
  inlineKeyboards: boolean;
  /** Bot commands (/ prefix) */
  botCommands: boolean;
  /** Mini Apps / Web Apps */
  miniApps: boolean;
  /** Bot payments */
  botPayments: boolean;
  /** Bot games */
  botGames: boolean;
  /** Bot API for custom development */
  botApi: boolean;
  /** Deep linking support */
  deepLinking: boolean;
  /** Bot menu button */
  menuButton: boolean;
}

/**
 * Telegram formatting options (rich text).
 */
export interface TelegramFormattingConfig {
  /** Bold (**text**) */
  bold: boolean;
  /** Italic (__text__) */
  italic: boolean;
  /** Underline */
  underline: boolean;
  /** Strikethrough (~~text~~) */
  strikethrough: boolean;
  /** Monospace / code (`text`) */
  monospace: boolean;
  /** Code blocks (```text```) */
  codeBlocks: boolean;
  /** Spoiler text (||text||) */
  spoiler: boolean;
  /** Quote (> text) */
  quote: boolean;
  /** Links with custom text [text](url) */
  customLinks: boolean;
  /** Formatting toolbar in UI */
  formattingToolbar: boolean;
  /** Markdown input support */
  markdownInput: boolean;
}

/**
 * Telegram media handling configuration.
 */
export interface TelegramMediaConfig {
  /** Maximum image size in MB */
  maxImageSizeMB: number;
  /** Maximum video size in MB */
  maxVideoSizeMB: number;
  /** Maximum file size in MB */
  maxFileSizeMB: number;
  /** Maximum audio size in MB */
  maxAudioSizeMB: number;
  /** Maximum photos in album (media group) */
  maxPhotosInAlbum: number;
  /** Media grouping (albums) */
  mediaGrouping: boolean;
  /** Instant View (formatted articles) */
  instantView: boolean;
  /** GIF search integration */
  gifSearch: boolean;
  /** Sticker packs */
  stickerPacks: boolean;
  /** Animated stickers (TGS format) */
  animatedStickers: boolean;
  /** Video stickers */
  videoStickers: boolean;
  /** Custom sticker creation */
  customStickers: boolean;
  /** Image compression before sending */
  imageCompression: boolean;
  /** Send as file (uncompressed) option */
  sendAsFile: boolean;
  /** Built-in photo editor */
  photoEditor: boolean;
  /** Video messages (circular bubbles) */
  videoMessages: boolean;
  /** Video message max duration in seconds */
  videoMessageMaxSec: number;
  /** Theme sharing */
  themeSharing: boolean;
}

/**
 * Telegram privacy behavior configuration.
 */
export interface TelegramPrivacyConfig {
  /** Phone number privacy (who can see) */
  phoneNumberPrivacy: boolean;
  /** Phone number privacy options */
  phoneNumberOptions: string[];
  /** Last seen granularity */
  lastSeenGranularity: boolean;
  /** Last seen options */
  lastSeenOptions: string[];
  /** Profile photo privacy */
  profilePhotoPrivacy: boolean;
  /** Profile photo options */
  profilePhotoOptions: string[];
  /** Who can forward your messages (show forwarded-from link) */
  forwardPrivacy: boolean;
  /** Forward privacy options */
  forwardOptions: string[];
  /** Who can call you */
  callPrivacy: boolean;
  /** Call privacy options */
  callOptions: string[];
  /** Who can add you to groups */
  groupPrivacy: boolean;
  /** Group privacy options */
  groupOptions: string[];
  /** Bio/about text privacy */
  bioPrivacy: boolean;
  /** Passcode lock */
  passcodeLock: boolean;
  /** Two-step verification (2FA) */
  twoStepVerification: boolean;
  /** Active sessions management */
  activeSessions: boolean;
  /** Delete account timer */
  deleteAccountTimer: boolean;
  /** Delete account timer options */
  deleteAccountOptions: string[];
}

/**
 * Telegram chat list behavior configuration.
 */
export interface TelegramChatListConfig {
  /** Whether chats can be pinned to the top */
  pinChats: boolean;
  /** Maximum number of pinned chats */
  maxPinnedChats: number;
  /** Whether chats can be archived */
  archiveChats: boolean;
  /** Whether archived chats auto-unarchive on new messages */
  autoUnarchive: boolean;
  /** Whether chats can be marked as unread */
  markUnread: boolean;
  /** Whether chat list has a search bar */
  searchBar: boolean;
  /** Whether chat list shows message preview */
  messagePreview: boolean;
  /** Whether chat list shows delivery status */
  deliveryStatus: boolean;
  /** Whether chat list shows timestamp */
  timestamp: boolean;
  /** Whether swipe actions are available */
  swipeActions: boolean;
  /** Whether chats can be muted */
  muteChats: boolean;
  /** Mute duration options */
  muteDurationOptions: string[];
  /** Whether chat can be marked as read */
  markRead: boolean;
}

/**
 * Telegram additional features configuration.
 */
export interface TelegramAdditionalFeaturesConfig {
  /** Multiple accounts support */
  multipleAccounts: boolean;
  /** Maximum accounts */
  maxAccounts: number;
  /** Cloud drafts synced across devices */
  cloudDrafts: boolean;
  /** Cross-device sync */
  crossDeviceSync: boolean;
  /** Nearby people discovery */
  nearbyPeople: boolean;
  /** People nearby / location-based groups */
  locationBasedGroups: boolean;
  /** Saved Messages (self-chat) */
  savedMessages: boolean;
  /** Recent actions log for admins */
  recentActions: boolean;
  /** Animated emoji */
  animatedEmoji: boolean;
  /** Custom emoji */
  customEmoji: boolean;
  /** Premium features tier */
  premiumTier: boolean;
  /** Translation feature */
  messageTranslation: boolean;
  /** Stories feature */
  stories: boolean;
  /** Username marketplace */
  usernameMarketplace: boolean;
}

/**
 * Complete Telegram extended behavior configuration.
 */
export interface TelegramExtendedBehavior {
  chatFolders: TelegramChatFoldersConfig;
  secretChats: TelegramSecretChatsConfig;
  channels: TelegramChannelConfig;
  supergroups: TelegramSupergroupConfig;
  bots: TelegramBotConfig;
  formatting: TelegramFormattingConfig;
  media: TelegramMediaConfig;
  privacy: TelegramPrivacyConfig;
  chatList: TelegramChatListConfig;
  additionalFeatures: TelegramAdditionalFeaturesConfig;
}

// ============================================================================
// TELEGRAM CHAT FOLDERS CONFIG
// ============================================================================

export const telegramChatFoldersConfig: TelegramChatFoldersConfig = {
  enabled: true,
  maxFolders: 10,
  maxChatsPerFolder: 200,
  folderIcons: true,
  smartFilters: [
    "unread",
    "unmuted",
    "personal",
    "non-contacts",
    "groups",
    "channels",
    "bots",
  ],
  folderTabs: true,
  includeExcludeFilters: true,
  shareableFolderLinks: true,
};

// ============================================================================
// TELEGRAM SECRET CHATS CONFIG
// ============================================================================

export const telegramSecretChatsConfig: TelegramSecretChatsConfig = {
  enabled: true,
  e2eeClientToClient: true,
  selfDestructTimer: true,
  selfDestructOptions: [
    "1s",
    "2s",
    "3s",
    "4s",
    "5s",
    "6s",
    "7s",
    "8s",
    "9s",
    "10s",
    "15s",
    "30s",
    "1m",
    "1h",
    "1d",
    "1w",
  ],
  screenshotProtection: true,
  forwardRestriction: true,
  noCloudStorage: true,
  encryptionIndicator: true,
  keyVisualization: true,
  autoDeleteAfterRead: true,
};

// ============================================================================
// TELEGRAM CHANNEL CONFIG
// ============================================================================

export const telegramChannelConfig: TelegramChannelConfig = {
  enabled: true,
  unlimitedSubscribers: true,
  signMessages: true,
  discussionGroup: true,
  adminRoles: [
    "change-channel-info",
    "post-messages",
    "edit-messages",
    "delete-messages",
    "invite-users",
    "manage-voice-chats",
    "add-admins",
  ],
  postReactions: true,
  postComments: true,
  channelStatistics: true,
  silentBroadcast: true,
  scheduledPosts: true,
  postEditing: true,
  postPinning: true,
};

// ============================================================================
// TELEGRAM SUPERGROUP CONFIG
// ============================================================================

export const telegramSupergroupConfig: TelegramSupergroupConfig = {
  enabled: true,
  maxMembers: 200000,
  slowMode: true,
  slowModeIntervals: [0, 10, 30, 60, 300, 900, 3600],
  adminRights: [
    "change-group-info",
    "delete-messages",
    "ban-users",
    "invite-users",
    "pin-messages",
    "manage-voice-chats",
    "add-admins",
    "remain-anonymous",
    "manage-topics",
  ],
  memberRestrictions: [
    "send-messages",
    "send-media",
    "send-stickers",
    "send-gifs",
    "send-games",
    "use-inline-bots",
    "embed-links",
    "send-polls",
    "change-info",
    "invite-users",
    "pin-messages",
    "manage-topics",
  ],
  pinning: true,
  maxPinnedMessages: 100,
  groupStickerSet: true,
  antiSpamMode: true,
  memberApproval: true,
  topicsMode: true,
  inviteLinksWithExpiry: true,
  groupStatistics: true,
};

// ============================================================================
// TELEGRAM BOT CONFIG
// ============================================================================

export const telegramBotConfig: TelegramBotConfig = {
  enabled: true,
  inlineBots: true,
  customKeyboards: true,
  inlineKeyboards: true,
  botCommands: true,
  miniApps: true,
  botPayments: true,
  botGames: true,
  botApi: true,
  deepLinking: true,
  menuButton: true,
};

// ============================================================================
// TELEGRAM FORMATTING CONFIG
// ============================================================================

export const telegramFormattingConfig: TelegramFormattingConfig = {
  bold: true,
  italic: true,
  underline: true,
  strikethrough: true,
  monospace: true,
  codeBlocks: true,
  spoiler: true,
  quote: true,
  customLinks: true,
  formattingToolbar: true,
  markdownInput: true,
};

// ============================================================================
// TELEGRAM MEDIA CONFIG
// ============================================================================

export const telegramMediaConfig: TelegramMediaConfig = {
  maxImageSizeMB: 10,
  maxVideoSizeMB: 2048,
  maxFileSizeMB: 2048,
  maxAudioSizeMB: 2048,
  maxPhotosInAlbum: 10,
  mediaGrouping: true,
  instantView: true,
  gifSearch: true,
  stickerPacks: true,
  animatedStickers: true,
  videoStickers: true,
  customStickers: true,
  imageCompression: true,
  sendAsFile: true,
  photoEditor: true,
  videoMessages: true,
  videoMessageMaxSec: 60,
  themeSharing: true,
};

// ============================================================================
// TELEGRAM PRIVACY CONFIG
// ============================================================================

export const telegramPrivacyConfig: TelegramPrivacyConfig = {
  phoneNumberPrivacy: true,
  phoneNumberOptions: ["everybody", "my-contacts", "nobody"],
  lastSeenGranularity: true,
  lastSeenOptions: ["everybody", "my-contacts", "nobody"],
  profilePhotoPrivacy: true,
  profilePhotoOptions: ["everybody", "my-contacts", "nobody"],
  forwardPrivacy: true,
  forwardOptions: ["everybody", "my-contacts", "nobody"],
  callPrivacy: true,
  callOptions: ["everybody", "my-contacts", "nobody"],
  groupPrivacy: true,
  groupOptions: ["everybody", "my-contacts", "nobody"],
  bioPrivacy: true,
  passcodeLock: true,
  twoStepVerification: true,
  activeSessions: true,
  deleteAccountTimer: true,
  deleteAccountOptions: ["1-month", "3-months", "6-months", "12-months"],
};

// ============================================================================
// TELEGRAM CHAT LIST CONFIG
// ============================================================================

export const telegramChatListConfig: TelegramChatListConfig = {
  pinChats: true,
  maxPinnedChats: 5,
  archiveChats: true,
  autoUnarchive: true,
  markUnread: true,
  searchBar: true,
  messagePreview: true,
  deliveryStatus: true,
  timestamp: true,
  swipeActions: true,
  muteChats: true,
  muteDurationOptions: [
    "1-hour",
    "4-hours",
    "8-hours",
    "1-day",
    "3-days",
    "forever",
  ],
  markRead: true,
};

// ============================================================================
// TELEGRAM ADDITIONAL FEATURES CONFIG
// ============================================================================

export const telegramAdditionalFeaturesConfig: TelegramAdditionalFeaturesConfig =
  {
    multipleAccounts: true,
    maxAccounts: 3,
    cloudDrafts: true,
    crossDeviceSync: true,
    nearbyPeople: true,
    locationBasedGroups: true,
    savedMessages: true,
    recentActions: true,
    animatedEmoji: true,
    customEmoji: true,
    premiumTier: true,
    messageTranslation: true,
    stories: true,
    usernameMarketplace: true,
  };

// ============================================================================
// TELEGRAM DETAILED BEHAVIOR PRESET
// ============================================================================

/**
 * Complete Telegram behavior preset that extends the standard BehaviorPreset
 * from the skin architecture. This represents Telegram's exact feature set
 * and interaction patterns.
 */
export const telegramDetailedBehavior: BehaviorPreset = {
  id: "telegram-detailed",
  name: "Telegram",
  description:
    "Detailed Telegram behavior preset with exact feature flags, limits, and interaction patterns matching Telegram as of 2026",
  version: "0.9.1",
  messaging: {
    editWindow: 0, // Unlimited edit window (48h for bots, unlimited for users)
    deleteWindow: 0, // Unlimited delete-for-self
    deleteForEveryone: true,
    deleteForEveryoneWindow: 0, // Unlimited (Telegram allows deleting any message at any time)
    showEditedIndicator: true,
    reactionStyle: "quick-reactions",
    maxReactionsPerMessage: 3,
    threadingModel: "reply-chain",
    maxMessageLength: 4096,
    forwarding: true,
    forwardLimit: 100, // Telegram allows forwarding to many chats
    pinning: true,
    bookmarking: true, // Saved Messages acts as bookmarks
    scheduling: true, // Telegram supports scheduled messages
    linkPreviews: true,
  },
  channels: {
    types: ["public", "private", "dm", "group-dm", "broadcast", "forum"],
    hierarchy: false,
    categories: false,
    forums: true, // Topics mode in supergroups
    maxGroupDmMembers: 200000, // Supergroups up to 200K
    maxGroupMembers: 200000,
    archiving: true,
    slowMode: true,
  },
  presence: {
    states: [
      "online",
      "offline",
      "recently",
      "within-week",
      "within-month",
      "long-time-ago",
    ],
    showLastSeen: true,
    lastSeenPrivacy: true,
    customStatus: true,
    activityStatus: false,
    typingIndicator: true,
    typingTimeout: 5000,
    autoAway: false,
    autoAwayTimeout: 0,
    invisibleMode: false,
  },
  calls: {
    supported: true,
    voiceCalls: true,
    videoCalls: true,
    groupCalls: true,
    groupMax: 5000, // Telegram group calls can have large audiences
    screenShare: true,
    recording: false, // Not built-in recording
    huddles: false,
  },
  notifications: {
    defaultLevel: "all",
    mentionRules: ["user", "everyone"],
    quietHours: true,
    threadNotifications: true,
    soundEnabled: true,
    badgeCount: true,
    emailDigest: false,
  },
  moderation: {
    profanityFilter: false,
    spamDetection: true, // Telegram has anti-spam mode
    automod: true, // Anti-spam for supergroups
    slowMode: true,
    appeals: false,
    reportSystem: true,
    userTimeout: true, // Restrict member for a period
    userBan: true,
  },
  privacy: {
    readReceipts: true,
    readReceiptsOptional: false, // Telegram always shows read receipts in 1-on-1
    lastSeen: true,
    lastSeenPrivacy: true,
    profileVisibility: "everyone",
    onlineStatusVisible: true,
    e2eeDefault: false, // Secret chats are opt-in, not default
    disappearingMessages: true,
    disappearingOptions: ["off", "1d", "1w", "1m"],
  },
  features: {
    richText: true, // Telegram supports rich text formatting
    markdown: true,
    codeBlocks: true,
    mentions: true,
    customEmoji: true, // Telegram Premium custom emoji
    gifs: true,
    stickers: true,
    polls: true,
    voiceMessages: true,
    fileUploads: true,
    imageUploads: true,
    videoUploads: true,
    locationSharing: true,
    contactSharing: true,
    stories: true,
    communities: false, // Telegram doesn't have WhatsApp-style communities
    viewOnce: false, // Telegram has self-destruct instead
    disappearingMessages: true,
    broadcasts: true, // Channels
    pinnedChats: true,
    starredMessages: false, // Uses Saved Messages instead
    chatWallpaper: true,
    paymentIntegration: true,
    chatLock: true, // Passcode lock
    screenLock: true,
    chatFolders: true,
    secretChats: true,
    inlineBots: true,
    botKeyboards: true,
    miniApps: true,
    scheduledMessages: true,
    silentMessages: true,
    videoMessages: true,
    instantView: true,
    multipleAccounts: true,
    cloudDrafts: true,
    nearbyPeople: true,
    customThemes: true,
    spoilerText: true,
    messageTranslation: true,
  },
};

// ============================================================================
// TELEGRAM EXTENDED BEHAVIOR CONFIG
// ============================================================================

export const telegramExtendedBehavior: TelegramExtendedBehavior = {
  chatFolders: telegramChatFoldersConfig,
  secretChats: telegramSecretChatsConfig,
  channels: telegramChannelConfig,
  supergroups: telegramSupergroupConfig,
  bots: telegramBotConfig,
  formatting: telegramFormattingConfig,
  media: telegramMediaConfig,
  privacy: telegramPrivacyConfig,
  chatList: telegramChatListConfig,
  additionalFeatures: telegramAdditionalFeaturesConfig,
};

/**
 * Complete Telegram behavior configuration including both the standard
 * BehaviorPreset and Telegram-specific extensions.
 */
export interface TelegramBehaviorConfig {
  preset: BehaviorPreset;
  extended: TelegramExtendedBehavior;
}

export const telegramBehaviorConfig: TelegramBehaviorConfig = {
  preset: telegramDetailedBehavior,
  extended: telegramExtendedBehavior,
};
