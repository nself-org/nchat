/**
 * Discord Platform Behavior Preset
 *
 * Detailed behavior preset matching Discord's interaction patterns,
 * feature flags, permissions, and platform-specific behaviors.
 *
 * Key characteristics:
 *   - Server/Guild hierarchy with categories and channels
 *   - Role-based permissions with hierarchical overrides
 *   - Channel types: text, voice, stage, forum, announcement, rules
 *   - Inline threading (not side-panel)
 *   - Full emoji picker with custom emoji support (Nitro)
 *   - No E2EE, no read receipts, no last seen
 *   - AutoMod for content moderation
 *   - Voice channels (always-on) with screen share
 *   - Stage channels with speaker/audience model
 *   - Forum channels with tags and sorting
 *   - Nitro features (higher upload limits, custom profiles, animated emoji)
 *   - Server boost system with tier perks
 *   - Scheduled events with RSVP
 *   - Markdown formatting (bold, italic, code, spoiler, quote)
 *
 * @module lib/skins/platforms/discord/behavior
 * @version 1.0.0
 */

import type { BehaviorPreset } from "../../types";

// ============================================================================
// DISCORD-SPECIFIC BEHAVIOR TYPES
// ============================================================================

/**
 * Discord Server/Guild configuration.
 */
export interface DiscordGuildConfig {
  /** Whether servers/guilds are supported */
  enabled: boolean;
  /** Maximum servers a user can join */
  maxServersPerUser: number;
  /** Maximum members per server (with boosts) */
  maxMembersPerServer: number;
  /** Maximum roles per server */
  maxRolesPerServer: number;
  /** Maximum custom emoji per server (base) */
  maxEmoji: number;
  /** Maximum custom emoji per server (with boosts) */
  maxEmojiBoosted: number;
  /** Maximum stickers per server */
  maxStickers: number;
  /** Maximum stickers per server (with boosts) */
  maxStickersBoosted: number;
  /** Server templates */
  templates: boolean;
  /** Server discovery listing */
  discovery: boolean;
  /** Server banner */
  banner: boolean;
  /** Server invite splash screen */
  inviteSplash: boolean;
  /** Vanity URL */
  vanityUrl: boolean;
  /** Welcome screen */
  welcomeScreen: boolean;
  /** Server rules channel */
  rulesChannel: boolean;
  /** Community features */
  communityFeatures: boolean;
  /** Member verification gate */
  memberVerification: boolean;
}

/**
 * Discord channel type configuration.
 */
export interface DiscordChannelTypesConfig {
  /** Text channels (#) */
  text: boolean;
  /** Voice channels (always-on) */
  voice: boolean;
  /** Stage channels (speaker/audience) */
  stage: boolean;
  /** Forum channels (post-based) */
  forum: boolean;
  /** Announcement channels (cross-server follows) */
  announcement: boolean;
  /** Rules channel */
  rules: boolean;
  /** Category containers */
  categories: boolean;
  /** DMs */
  dm: boolean;
  /** Group DMs (max 10) */
  groupDm: boolean;
  /** Maximum channels per server */
  maxChannelsPerServer: number;
  /** Maximum categories per server */
  maxCategoriesPerServer: number;
  /** Maximum channels per category */
  maxChannelsPerCategory: number;
}

/**
 * Discord thread system configuration.
 */
export interface DiscordThreadConfig {
  /** Public threads */
  publicThreads: boolean;
  /** Private threads */
  privateThreads: boolean;
  /** Auto-archive durations available (in minutes) */
  autoArchiveDurations: number[];
  /** Default auto-archive duration (in minutes) */
  defaultAutoArchiveDuration: number;
  /** Maximum thread members (non-boosted) */
  maxThreadMembers: number;
  /** Thread creation from any message */
  createFromMessage: boolean;
  /** Thread count limit per channel */
  maxActiveThreadsPerChannel: number;
}

/**
 * Discord role and permission configuration.
 */
export interface DiscordRoleConfig {
  /** Hierarchical role system */
  hierarchical: boolean;
  /** Role colors */
  roleColors: boolean;
  /** Role icons (Nitro/Boost) */
  roleIcons: boolean;
  /** Role hoisting (display separately) */
  hoisting: boolean;
  /** Role mentioning */
  mentionable: boolean;
  /** @everyone role */
  everyoneRole: boolean;
  /** Channel permission overrides */
  channelOverrides: boolean;
  /** Category permission inheritance */
  categoryInheritance: boolean;
  /** Permission calculator (hierarchical) */
  permissionCalculation: "hierarchical";
  /** Key Discord permissions */
  permissions: string[];
}

/**
 * Discord Nitro feature configuration.
 */
export interface DiscordNitroConfig {
  /** Nitro subscription tiers */
  tiers: ("none" | "nitro-basic" | "nitro")[];
  /** Custom emoji from any server */
  crossServerEmoji: boolean;
  /** Animated avatar */
  animatedAvatar: boolean;
  /** Animated banner */
  animatedBanner: boolean;
  /** Custom profile theme */
  customProfileTheme: boolean;
  /** Higher upload limit in MB (Nitro) */
  uploadLimitMB: number;
  /** Base upload limit in MB */
  baseUploadLimitMB: number;
  /** HD video streaming */
  hdVideoStreaming: boolean;
  /** Custom stickers */
  customStickers: boolean;
  /** Server boosting included */
  serverBoostIncluded: number;
  /** Profile badge */
  profileBadge: boolean;
  /** Custom app icons */
  customAppIcons: boolean;
  /** Super reactions */
  superReactions: boolean;
}

/**
 * Discord Stage channel configuration.
 */
export interface DiscordStageConfig {
  /** Stage channels enabled */
  enabled: boolean;
  /** Speaker/audience model */
  speakerAudienceModel: boolean;
  /** Request to speak (raise hand) */
  requestToSpeak: boolean;
  /** Moderator controls */
  moderatorControls: boolean;
  /** Auto-move to audience on join */
  autoMoveToAudience: boolean;
  /** Stage instance topics */
  topics: boolean;
  /** Stage discovery */
  discovery: boolean;
  /** Maximum speakers */
  maxSpeakers: number;
}

/**
 * Discord Forum channel configuration.
 */
export interface DiscordForumConfig {
  /** Forum channels enabled */
  enabled: boolean;
  /** Tags for categorizing posts */
  tags: boolean;
  /** Maximum tags per forum */
  maxTags: number;
  /** Required tags on new posts */
  requireTags: boolean;
  /** Default sort order */
  defaultSortOrder: "latest-activity" | "creation-date";
  /** Default layout */
  defaultLayout: "list" | "gallery";
  /** Post guidelines/template */
  postGuidelines: boolean;
  /** Auto-archive inactive posts */
  autoArchive: boolean;
  /** Reactions on posts */
  reactions: boolean;
  /** Default reaction emoji */
  defaultReactionEmoji: boolean;
}

/**
 * Discord Voice channel configuration.
 */
export interface DiscordVoiceConfig {
  /** Always-on voice channels */
  alwaysOn: boolean;
  /** Push-to-talk option */
  pushToTalk: boolean;
  /** Voice activity detection */
  voiceActivityDetection: boolean;
  /** Screen share in voice */
  screenShare: boolean;
  /** Video in voice */
  video: boolean;
  /** Go Live streaming */
  goLive: boolean;
  /** Maximum video quality */
  maxVideoQuality: "720p" | "1080p";
  /** Noise suppression */
  noiseSuppression: boolean;
  /** Echo cancellation */
  echoCancellation: boolean;
  /** User limit per voice channel (0 = unlimited) */
  maxUsersPerChannel: number;
  /** Bitrate range (kbps) */
  bitrateMin: number;
  bitrateMax: number;
  /** Soundboard */
  soundboard: boolean;
}

/**
 * Discord Server Boost configuration.
 */
export interface DiscordBoostConfig {
  /** Boost system enabled */
  enabled: boolean;
  /** Boost tiers */
  tiers: number[];
  /** Boosts needed for tier 1 */
  tier1Threshold: number;
  /** Boosts needed for tier 2 */
  tier2Threshold: number;
  /** Boosts needed for tier 3 */
  tier3Threshold: number;
  /** Tier 1 perks */
  tier1Perks: string[];
  /** Tier 2 perks */
  tier2Perks: string[];
  /** Tier 3 perks */
  tier3Perks: string[];
}

/**
 * Discord AutoMod configuration.
 */
export interface DiscordAutoModConfig {
  /** AutoMod enabled */
  enabled: boolean;
  /** Keyword filtering */
  keywordFilter: boolean;
  /** Mention spam detection */
  mentionSpamDetection: boolean;
  /** Regex patterns */
  regexPatterns: boolean;
  /** Maximum keyword filter rules */
  maxKeywordRules: number;
  /** Maximum regex rules */
  maxRegexRules: number;
  /** Block message action */
  blockMessage: boolean;
  /** Send alert action */
  sendAlert: boolean;
  /** Timeout action */
  timeout: boolean;
  /** Exempt roles */
  exemptRoles: boolean;
  /** Exempt channels */
  exemptChannels: boolean;
}

/**
 * Discord Events configuration.
 */
export interface DiscordEventsConfig {
  /** Scheduled events enabled */
  enabled: boolean;
  /** RSVP (interested count) */
  rsvp: boolean;
  /** Event types */
  eventTypes: ("voice" | "stage" | "external")[];
  /** Recurring events */
  recurring: boolean;
  /** Event cover image */
  coverImage: boolean;
  /** Event reminders */
  reminders: boolean;
  /** Event description */
  description: boolean;
  /** Maximum scheduled events */
  maxEvents: number;
}

/**
 * Discord Onboarding configuration.
 */
export interface DiscordOnboardingConfig {
  /** Server onboarding enabled */
  enabled: boolean;
  /** Verification levels */
  verificationLevels: ("none" | "low" | "medium" | "high" | "highest")[];
  /** Default verification level */
  defaultVerificationLevel: "none" | "low" | "medium" | "high" | "highest";
  /** Server rules acceptance */
  rulesAcceptance: boolean;
  /** Onboarding prompts/questions */
  onboardingPrompts: boolean;
  /** Default channels selection */
  defaultChannels: boolean;
}

/**
 * Discord formatting options (rich markdown).
 */
export interface DiscordFormattingConfig {
  /** Bold (**text**) */
  bold: boolean;
  /** Italic (*text* or _text_) */
  italic: boolean;
  /** Underline (__text__) */
  underline: boolean;
  /** Strikethrough (~~text~~) */
  strikethrough: boolean;
  /** Code inline (`code`) */
  inlineCode: boolean;
  /** Code blocks (```code```) */
  codeBlocks: boolean;
  /** Code block syntax highlighting */
  syntaxHighlighting: boolean;
  /** Spoiler tags (||text||) */
  spoiler: boolean;
  /** Block quote (> text or >>> text) */
  blockQuote: boolean;
  /** Headings (# ## ###) */
  headings: boolean;
  /** Bulleted lists (- or *) */
  bulletedLists: boolean;
  /** Numbered lists (1.) */
  numberedLists: boolean;
  /** Masked links [text](url) */
  maskedLinks: boolean;
  /** Timestamp formatting (<t:unix:style>) */
  timestamps: boolean;
  /** Custom emoji in text */
  customEmoji: boolean;
  /** Animated emoji (Nitro) */
  animatedEmoji: boolean;
}

/**
 * Discord media sharing configuration.
 */
export interface DiscordMediaConfig {
  /** Maximum file upload size (MB) - standard */
  maxFileSizeMB: number;
  /** Maximum file upload size (MB) - Nitro */
  maxFileSizeNitroMB: number;
  /** Maximum file upload size (MB) - Nitro Basic */
  maxFileSizeNitroBasicMB: number;
  /** Image embeds */
  imageEmbeds: boolean;
  /** Video embeds */
  videoEmbeds: boolean;
  /** Tenor GIF integration */
  tenorGifs: boolean;
  /** Custom sticker packs */
  customStickers: boolean;
  /** Voice messages */
  voiceMessages: boolean;
  /** Maximum attachments per message */
  maxAttachmentsPerMessage: number;
  /** Image spoiler tags */
  imageSpoilers: boolean;
  /** Drag and drop upload */
  dragAndDrop: boolean;
  /** Clipboard paste upload */
  clipboardPaste: boolean;
}

/**
 * Complete Discord extended behavior configuration.
 * Includes all Discord-specific features beyond the standard BehaviorPreset.
 */
export interface DiscordExtendedBehavior {
  guild: DiscordGuildConfig;
  channelTypes: DiscordChannelTypesConfig;
  threads: DiscordThreadConfig;
  roles: DiscordRoleConfig;
  nitro: DiscordNitroConfig;
  stage: DiscordStageConfig;
  forum: DiscordForumConfig;
  voice: DiscordVoiceConfig;
  boost: DiscordBoostConfig;
  autoMod: DiscordAutoModConfig;
  events: DiscordEventsConfig;
  onboarding: DiscordOnboardingConfig;
  formatting: DiscordFormattingConfig;
  media: DiscordMediaConfig;
}

// ============================================================================
// DISCORD GUILD CONFIG
// ============================================================================

export const discordGuildConfig: DiscordGuildConfig = {
  enabled: true,
  maxServersPerUser: 100,
  maxMembersPerServer: 500000,
  maxRolesPerServer: 250,
  maxEmoji: 50,
  maxEmojiBoosted: 250,
  maxStickers: 5,
  maxStickersBoosted: 60,
  templates: true,
  discovery: true,
  banner: true,
  inviteSplash: true,
  vanityUrl: true,
  welcomeScreen: true,
  rulesChannel: true,
  communityFeatures: true,
  memberVerification: true,
};

// ============================================================================
// DISCORD CHANNEL TYPES CONFIG
// ============================================================================

export const discordChannelTypesConfig: DiscordChannelTypesConfig = {
  text: true,
  voice: true,
  stage: true,
  forum: true,
  announcement: true,
  rules: true,
  categories: true,
  dm: true,
  groupDm: true,
  maxChannelsPerServer: 500,
  maxCategoriesPerServer: 50,
  maxChannelsPerCategory: 50,
};

// ============================================================================
// DISCORD THREAD CONFIG
// ============================================================================

export const discordThreadConfig: DiscordThreadConfig = {
  publicThreads: true,
  privateThreads: true,
  autoArchiveDurations: [60, 1440, 4320, 10080],
  defaultAutoArchiveDuration: 1440,
  maxThreadMembers: 1000,
  createFromMessage: true,
  maxActiveThreadsPerChannel: 1000,
};

// ============================================================================
// DISCORD ROLE CONFIG
// ============================================================================

export const discordRoleConfig: DiscordRoleConfig = {
  hierarchical: true,
  roleColors: true,
  roleIcons: true,
  hoisting: true,
  mentionable: true,
  everyoneRole: true,
  channelOverrides: true,
  categoryInheritance: true,
  permissionCalculation: "hierarchical",
  permissions: [
    "VIEW_CHANNEL",
    "MANAGE_CHANNELS",
    "MANAGE_ROLES",
    "MANAGE_EMOJI_AND_STICKERS",
    "VIEW_AUDIT_LOG",
    "MANAGE_WEBHOOKS",
    "MANAGE_SERVER",
    "CREATE_INVITE",
    "CHANGE_NICKNAME",
    "MANAGE_NICKNAMES",
    "KICK_MEMBERS",
    "BAN_MEMBERS",
    "TIMEOUT_MEMBERS",
    "SEND_MESSAGES",
    "SEND_MESSAGES_IN_THREADS",
    "CREATE_PUBLIC_THREADS",
    "CREATE_PRIVATE_THREADS",
    "EMBED_LINKS",
    "ATTACH_FILES",
    "ADD_REACTIONS",
    "USE_EXTERNAL_EMOJI",
    "USE_EXTERNAL_STICKERS",
    "MENTION_EVERYONE",
    "MANAGE_MESSAGES",
    "MANAGE_THREADS",
    "READ_MESSAGE_HISTORY",
    "SEND_TTS_MESSAGES",
    "USE_APPLICATION_COMMANDS",
    "CONNECT",
    "SPEAK",
    "VIDEO",
    "USE_VOICE_ACTIVITY",
    "PRIORITY_SPEAKER",
    "MUTE_MEMBERS",
    "DEAFEN_MEMBERS",
    "MOVE_MEMBERS",
    "USE_SOUNDBOARD",
    "MANAGE_EVENTS",
    "ADMINISTRATOR",
  ],
};

// ============================================================================
// DISCORD NITRO CONFIG
// ============================================================================

export const discordNitroConfig: DiscordNitroConfig = {
  tiers: ["none", "nitro-basic", "nitro"],
  crossServerEmoji: true,
  animatedAvatar: true,
  animatedBanner: true,
  customProfileTheme: true,
  uploadLimitMB: 500,
  baseUploadLimitMB: 25,
  hdVideoStreaming: true,
  customStickers: true,
  serverBoostIncluded: 2,
  profileBadge: true,
  customAppIcons: true,
  superReactions: true,
};

// ============================================================================
// DISCORD STAGE CONFIG
// ============================================================================

export const discordStageConfig: DiscordStageConfig = {
  enabled: true,
  speakerAudienceModel: true,
  requestToSpeak: true,
  moderatorControls: true,
  autoMoveToAudience: true,
  topics: true,
  discovery: true,
  maxSpeakers: 50,
};

// ============================================================================
// DISCORD FORUM CONFIG
// ============================================================================

export const discordForumConfig: DiscordForumConfig = {
  enabled: true,
  tags: true,
  maxTags: 20,
  requireTags: true,
  defaultSortOrder: "latest-activity",
  defaultLayout: "list",
  postGuidelines: true,
  autoArchive: true,
  reactions: true,
  defaultReactionEmoji: true,
};

// ============================================================================
// DISCORD VOICE CONFIG
// ============================================================================

export const discordVoiceConfig: DiscordVoiceConfig = {
  alwaysOn: true,
  pushToTalk: true,
  voiceActivityDetection: true,
  screenShare: true,
  video: true,
  goLive: true,
  maxVideoQuality: "1080p",
  noiseSuppression: true,
  echoCancellation: true,
  maxUsersPerChannel: 99,
  bitrateMin: 8,
  bitrateMax: 384,
  soundboard: true,
};

// ============================================================================
// DISCORD BOOST CONFIG
// ============================================================================

export const discordBoostConfig: DiscordBoostConfig = {
  enabled: true,
  tiers: [1, 2, 3],
  tier1Threshold: 2,
  tier2Threshold: 7,
  tier3Threshold: 14,
  tier1Perks: [
    "50 extra emoji slots",
    "15 extra sticker slots",
    "128kbps audio quality",
    "Animated server icon",
    "Custom invite splash",
    "Stream at 720p 60fps",
  ],
  tier2Perks: [
    "100 extra emoji slots",
    "30 extra sticker slots",
    "256kbps audio quality",
    "Server banner",
    "50MB upload limit for everyone",
    "Stream at 1080p 60fps",
    "Custom role icons",
  ],
  tier3Perks: [
    "200 extra emoji slots",
    "60 extra sticker slots",
    "384kbps audio quality",
    "Animated server banner",
    "100MB upload limit for everyone",
    "Vanity URL",
  ],
};

// ============================================================================
// DISCORD AUTOMOD CONFIG
// ============================================================================

export const discordAutoModConfig: DiscordAutoModConfig = {
  enabled: true,
  keywordFilter: true,
  mentionSpamDetection: true,
  regexPatterns: true,
  maxKeywordRules: 6,
  maxRegexRules: 1,
  blockMessage: true,
  sendAlert: true,
  timeout: true,
  exemptRoles: true,
  exemptChannels: true,
};

// ============================================================================
// DISCORD EVENTS CONFIG
// ============================================================================

export const discordEventsConfig: DiscordEventsConfig = {
  enabled: true,
  rsvp: true,
  eventTypes: ["voice", "stage", "external"],
  recurring: true,
  coverImage: true,
  reminders: true,
  description: true,
  maxEvents: 100,
};

// ============================================================================
// DISCORD ONBOARDING CONFIG
// ============================================================================

export const discordOnboardingConfig: DiscordOnboardingConfig = {
  enabled: true,
  verificationLevels: ["none", "low", "medium", "high", "highest"],
  defaultVerificationLevel: "medium",
  rulesAcceptance: true,
  onboardingPrompts: true,
  defaultChannels: true,
};

// ============================================================================
// DISCORD FORMATTING CONFIG
// ============================================================================

export const discordFormattingConfig: DiscordFormattingConfig = {
  bold: true,
  italic: true,
  underline: true,
  strikethrough: true,
  inlineCode: true,
  codeBlocks: true,
  syntaxHighlighting: true,
  spoiler: true,
  blockQuote: true,
  headings: true,
  bulletedLists: true,
  numberedLists: true,
  maskedLinks: true,
  timestamps: true,
  customEmoji: true,
  animatedEmoji: true,
};

// ============================================================================
// DISCORD MEDIA CONFIG
// ============================================================================

export const discordMediaConfig: DiscordMediaConfig = {
  maxFileSizeMB: 25,
  maxFileSizeNitroMB: 500,
  maxFileSizeNitroBasicMB: 50,
  imageEmbeds: true,
  videoEmbeds: true,
  tenorGifs: true,
  customStickers: true,
  voiceMessages: true,
  maxAttachmentsPerMessage: 10,
  imageSpoilers: true,
  dragAndDrop: true,
  clipboardPaste: true,
};

// ============================================================================
// DISCORD DETAILED BEHAVIOR PRESET
// ============================================================================

/**
 * Complete Discord behavior preset that extends the standard BehaviorPreset
 * from the skin architecture. This represents Discord's exact feature set
 * and interaction patterns.
 */
export const discordDetailedBehavior: BehaviorPreset = {
  id: "discord-detailed",
  name: "Discord",
  description:
    "Detailed Discord behavior preset with exact feature flags, limits, and interaction patterns matching Discord as of 2026",
  version: "0.9.1",
  messaging: {
    editWindow: 0, // unlimited
    deleteWindow: 0, // unlimited
    deleteForEveryone: false, // only mods can manage messages
    deleteForEveryoneWindow: 0,
    showEditedIndicator: true,
    reactionStyle: "full-picker",
    maxReactionsPerMessage: 20,
    threadingModel: "inline",
    maxMessageLength: 2000,
    forwarding: false,
    forwardLimit: 0,
    pinning: true,
    bookmarking: false,
    scheduling: false,
    linkPreviews: true,
  },
  channels: {
    types: [
      "public",
      "private",
      "dm",
      "group-dm",
      "forum",
      "voice",
      "stage",
      "announcement",
    ],
    hierarchy: true,
    categories: true,
    forums: true,
    maxGroupDmMembers: 10,
    maxGroupMembers: 500000,
    archiving: false,
    slowMode: true,
  },
  presence: {
    states: ["online", "idle", "dnd", "invisible", "offline"],
    showLastSeen: false,
    lastSeenPrivacy: false,
    customStatus: true,
    activityStatus: true,
    typingIndicator: true,
    typingTimeout: 8000,
    autoAway: true,
    autoAwayTimeout: 600000, // 10 minutes
    invisibleMode: true,
  },
  calls: {
    supported: true,
    voiceCalls: true,
    videoCalls: true,
    groupCalls: true,
    groupMax: 25,
    screenShare: true,
    recording: false,
    huddles: false,
  },
  notifications: {
    defaultLevel: "mentions",
    mentionRules: ["user", "role", "here", "everyone"],
    quietHours: false,
    threadNotifications: true,
    soundEnabled: true,
    badgeCount: true,
    emailDigest: false,
  },
  moderation: {
    profanityFilter: false,
    spamDetection: true,
    automod: true,
    slowMode: true,
    appeals: false,
    reportSystem: true,
    userTimeout: true,
    userBan: true,
  },
  privacy: {
    readReceipts: false,
    readReceiptsOptional: false,
    lastSeen: false,
    lastSeenPrivacy: false,
    profileVisibility: "everyone",
    onlineStatusVisible: true,
    e2eeDefault: false,
    disappearingMessages: false,
    disappearingOptions: [],
  },
  features: {
    richText: true,
    markdown: true,
    codeBlocks: true,
    mentions: true,
    customEmoji: true,
    gifs: true,
    stickers: true,
    polls: false,
    voiceMessages: true,
    fileUploads: true,
    imageUploads: true,
    videoUploads: true,
    locationSharing: false,
    contactSharing: false,
    stories: false,
    serverSystem: true,
    voiceChannels: true,
    stageChannels: true,
    forumChannels: true,
    threads: true,
    roles: true,
    automod: true,
    serverBoost: true,
    nitro: true,
    activities: true,
    scheduledEvents: true,
    webhooks: true,
    bots: true,
    slashCommands: true,
    messageComponents: true,
    appDirectory: true,
    soundboard: true,
  },
};

// ============================================================================
// DISCORD EXTENDED BEHAVIOR CONFIG
// ============================================================================

export const discordExtendedBehavior: DiscordExtendedBehavior = {
  guild: discordGuildConfig,
  channelTypes: discordChannelTypesConfig,
  threads: discordThreadConfig,
  roles: discordRoleConfig,
  nitro: discordNitroConfig,
  stage: discordStageConfig,
  forum: discordForumConfig,
  voice: discordVoiceConfig,
  boost: discordBoostConfig,
  autoMod: discordAutoModConfig,
  events: discordEventsConfig,
  onboarding: discordOnboardingConfig,
  formatting: discordFormattingConfig,
  media: discordMediaConfig,
};

/**
 * Complete Discord behavior configuration including both the standard
 * BehaviorPreset and Discord-specific extensions.
 */
export interface DiscordBehaviorConfig {
  preset: BehaviorPreset;
  extended: DiscordExtendedBehavior;
}

export const discordBehaviorConfig: DiscordBehaviorConfig = {
  preset: discordDetailedBehavior,
  extended: discordExtendedBehavior,
};
