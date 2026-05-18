/**
 * Behavior Preset Definitions
 *
 * Each preset captures the interaction patterns, feature flags, and permission
 * defaults of a specific messaging platform. Presets are purely behavioral --
 * they carry no visual/color information.
 *
 * @module lib/skins/behavior-presets
 * @version 1.0.0
 */

import type { BehaviorPreset } from "./types";

// ============================================================================
// NCHAT BEHAVIOR (Default)
// ============================================================================

export const nchatBehavior: BehaviorPreset = {
  id: "nchat",
  name: "nChat",
  description: "Balanced defaults combining the best of all platforms",
  version: "0.9.1",
  messaging: {
    editWindow: 0, // unlimited
    deleteWindow: 0, // unlimited
    deleteForEveryone: true,
    deleteForEveryoneWindow: 24 * 60 * 60 * 1000, // 24 hours
    showEditedIndicator: true,
    reactionStyle: "full-picker",
    maxReactionsPerMessage: 20,
    threadingModel: "side-panel",
    maxMessageLength: 10000,
    forwarding: true,
    forwardLimit: 10,
    pinning: true,
    bookmarking: true,
    scheduling: true,
    linkPreviews: true,
  },
  channels: {
    types: [
      "public",
      "private",
      "dm",
      "group-dm",
      "broadcast",
      "forum",
      "voice",
    ],
    hierarchy: true,
    categories: true,
    forums: true,
    maxGroupDmMembers: 10,
    maxGroupMembers: 100000,
    archiving: true,
    slowMode: true,
  },
  presence: {
    states: ["online", "away", "busy", "dnd", "invisible", "offline"],
    showLastSeen: true,
    lastSeenPrivacy: true,
    customStatus: true,
    activityStatus: false,
    typingIndicator: true,
    typingTimeout: 5000,
    autoAway: true,
    autoAwayTimeout: 300000, // 5 minutes
    invisibleMode: true,
  },
  calls: {
    supported: true,
    voiceCalls: true,
    videoCalls: true,
    groupCalls: true,
    groupMax: 50,
    screenShare: true,
    recording: true,
    huddles: false,
  },
  notifications: {
    defaultLevel: "mentions",
    mentionRules: ["user", "role", "channel", "here", "everyone"],
    quietHours: true,
    threadNotifications: true,
    soundEnabled: true,
    badgeCount: true,
    emailDigest: true,
  },
  moderation: {
    profanityFilter: false,
    spamDetection: true,
    automod: true,
    slowMode: true,
    appeals: true,
    reportSystem: true,
    userTimeout: true,
    userBan: true,
  },
  privacy: {
    readReceipts: true,
    readReceiptsOptional: true,
    lastSeen: true,
    lastSeenPrivacy: true,
    profileVisibility: "everyone",
    onlineStatusVisible: true,
    e2eeDefault: false,
    disappearingMessages: true,
    disappearingOptions: ["off", "24h", "7d", "30d"],
  },
  features: {
    richText: true,
    markdown: true,
    codeBlocks: true,
    mentions: true,
    customEmoji: true,
    gifs: true,
    stickers: true,
    polls: true,
    voiceMessages: true,
    fileUploads: true,
    imageUploads: true,
    videoUploads: true,
    locationSharing: false,
    contactSharing: false,
    stories: false,
  },
};

// ============================================================================
// WHATSAPP BEHAVIOR
// ============================================================================

export const whatsappBehavior: BehaviorPreset = {
  id: "whatsapp",
  name: "WhatsApp",
  description: "WhatsApp-style E2EE messaging with strict privacy defaults",
  version: "0.9.1",
  messaging: {
    editWindow: 15 * 60 * 1000, // 15 minutes
    deleteWindow: 0, // unlimited delete for self
    deleteForEveryone: true,
    deleteForEveryoneWindow: 48 * 60 * 60 * 1000 + 8 * 60 * 1000, // ~2 days
    showEditedIndicator: true,
    reactionStyle: "quick-reactions",
    maxReactionsPerMessage: 1, // WhatsApp allows 1 reaction per user
    threadingModel: "reply-chain",
    maxMessageLength: 4096,
    forwarding: true,
    forwardLimit: 5,
    pinning: true,
    bookmarking: true, // star messages
    scheduling: false,
    linkPreviews: true,
  },
  channels: {
    types: ["dm", "group-dm", "broadcast"],
    hierarchy: false,
    categories: false,
    forums: false,
    maxGroupDmMembers: 1024,
    maxGroupMembers: 1024,
    archiving: true,
    slowMode: false,
  },
  presence: {
    states: ["online", "offline"],
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
    groupMax: 32,
    screenShare: false,
    recording: false,
    huddles: false,
  },
  notifications: {
    defaultLevel: "all",
    mentionRules: ["user"],
    quietHours: true,
    threadNotifications: false,
    soundEnabled: true,
    badgeCount: true,
    emailDigest: false,
  },
  moderation: {
    profanityFilter: false,
    spamDetection: false,
    automod: false,
    slowMode: false,
    appeals: false,
    reportSystem: true,
    userTimeout: false,
    userBan: false,
  },
  privacy: {
    readReceipts: true,
    readReceiptsOptional: true,
    lastSeen: true,
    lastSeenPrivacy: true,
    profileVisibility: "contacts",
    onlineStatusVisible: true,
    e2eeDefault: true,
    disappearingMessages: true,
    disappearingOptions: ["off", "24h", "7d", "90d"],
  },
  features: {
    richText: false,
    markdown: false,
    codeBlocks: false,
    mentions: true,
    customEmoji: false,
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
  },
};

// ============================================================================
// TELEGRAM BEHAVIOR
// ============================================================================

export const telegramBehavior: BehaviorPreset = {
  id: "telegram",
  name: "Telegram",
  description:
    "Telegram-style fast messaging with bots, channels, and supergroups",
  version: "0.9.1",
  messaging: {
    editWindow: 48 * 60 * 60 * 1000, // 48 hours
    deleteWindow: 0, // unlimited
    deleteForEveryone: true,
    deleteForEveryoneWindow: 48 * 60 * 60 * 1000, // 48 hours
    showEditedIndicator: true,
    reactionStyle: "quick-reactions",
    maxReactionsPerMessage: 3,
    threadingModel: "reply-chain",
    maxMessageLength: 4096,
    forwarding: true,
    forwardLimit: 0, // unlimited
    pinning: true,
    bookmarking: true, // saved messages
    scheduling: true,
    linkPreviews: true,
  },
  channels: {
    types: ["dm", "group-dm", "broadcast"],
    hierarchy: false,
    categories: false,
    forums: false,
    maxGroupDmMembers: 200000,
    maxGroupMembers: 200000,
    archiving: true,
    slowMode: true,
  },
  presence: {
    states: ["online", "offline"],
    showLastSeen: true,
    lastSeenPrivacy: true,
    customStatus: true,
    activityStatus: false,
    typingIndicator: true,
    typingTimeout: 5000,
    autoAway: false,
    autoAwayTimeout: 0,
    invisibleMode: true,
  },
  calls: {
    supported: true,
    voiceCalls: true,
    videoCalls: true,
    groupCalls: true,
    groupMax: 1000,
    screenShare: true,
    recording: false,
    huddles: false,
  },
  notifications: {
    defaultLevel: "all",
    mentionRules: ["user"],
    quietHours: true,
    threadNotifications: false,
    soundEnabled: true,
    badgeCount: true,
    emailDigest: false,
  },
  moderation: {
    profanityFilter: false,
    spamDetection: true,
    automod: false,
    slowMode: true,
    appeals: false,
    reportSystem: true,
    userTimeout: true,
    userBan: true,
  },
  privacy: {
    readReceipts: true,
    readReceiptsOptional: false,
    lastSeen: true,
    lastSeenPrivacy: true,
    profileVisibility: "everyone",
    onlineStatusVisible: true,
    e2eeDefault: false,
    disappearingMessages: true,
    disappearingOptions: ["off", "24h", "7d", "1m"],
  },
  features: {
    richText: true,
    markdown: true,
    codeBlocks: true,
    mentions: true,
    customEmoji: true,
    gifs: true,
    stickers: true,
    polls: true,
    voiceMessages: true,
    fileUploads: true,
    imageUploads: true,
    videoUploads: true,
    locationSharing: true,
    contactSharing: true,
    stories: false,
  },
};

// ============================================================================
// DISCORD BEHAVIOR
// ============================================================================

export const discordBehavior: BehaviorPreset = {
  id: "discord",
  name: "Discord",
  description:
    "Discord-style server hierarchy with roles, voice channels, and rich presence",
  version: "0.9.1",
  messaging: {
    editWindow: 0, // unlimited
    deleteWindow: 0, // unlimited
    deleteForEveryone: false, // only mods manage messages
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
  },
};

// ============================================================================
// SLACK BEHAVIOR
// ============================================================================

export const slackBehavior: BehaviorPreset = {
  id: "slack",
  name: "Slack",
  description:
    "Slack-style workspace messaging with threads, huddles, and rich integrations",
  version: "0.9.1",
  messaging: {
    editWindow: 0, // unlimited
    deleteWindow: 0, // unlimited
    deleteForEveryone: false, // admins only
    deleteForEveryoneWindow: 0,
    showEditedIndicator: true,
    reactionStyle: "full-picker",
    maxReactionsPerMessage: 23,
    threadingModel: "side-panel",
    maxMessageLength: 40000,
    forwarding: true,
    forwardLimit: 0, // unlimited
    pinning: true,
    bookmarking: true, // save to Later
    scheduling: true,
    linkPreviews: true,
  },
  channels: {
    types: ["public", "private", "dm", "group-dm"],
    hierarchy: false,
    categories: false, // uses "sections" instead
    forums: false,
    maxGroupDmMembers: 9,
    maxGroupMembers: 500000,
    archiving: true,
    slowMode: false,
  },
  presence: {
    states: ["online", "away", "dnd", "offline"],
    showLastSeen: false,
    lastSeenPrivacy: false,
    customStatus: true,
    activityStatus: true,
    typingIndicator: true,
    typingTimeout: 5000,
    autoAway: true,
    autoAwayTimeout: 1800000, // 30 minutes
    invisibleMode: false,
  },
  calls: {
    supported: true,
    voiceCalls: true,
    videoCalls: true,
    groupCalls: true,
    groupMax: 50,
    screenShare: true,
    recording: false,
    huddles: true,
  },
  notifications: {
    defaultLevel: "mentions",
    mentionRules: ["user", "channel", "here", "everyone"],
    quietHours: true,
    threadNotifications: true,
    soundEnabled: true,
    badgeCount: true,
    emailDigest: true,
  },
  moderation: {
    profanityFilter: false,
    spamDetection: false,
    automod: false,
    slowMode: false,
    appeals: false,
    reportSystem: false,
    userTimeout: false,
    userBan: false,
  },
  privacy: {
    readReceipts: true,
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
    stickers: false,
    polls: false,
    voiceMessages: false,
    fileUploads: true,
    imageUploads: true,
    videoUploads: true,
    locationSharing: false,
    contactSharing: false,
    stories: false,
  },
};

// ============================================================================
// SIGNAL BEHAVIOR
// ============================================================================

export const signalBehavior: BehaviorPreset = {
  id: "signal",
  name: "Signal",
  description:
    "Signal-style privacy-first encrypted messaging with minimal metadata",
  version: "0.9.1",
  messaging: {
    editWindow: 0, // unlimited (recent addition)
    deleteWindow: 0, // unlimited for self
    deleteForEveryone: true,
    deleteForEveryoneWindow: 3 * 60 * 60 * 1000, // 3 hours
    showEditedIndicator: true,
    reactionStyle: "limited-set",
    maxReactionsPerMessage: 1,
    threadingModel: "reply-chain",
    maxMessageLength: 8000,
    forwarding: true,
    forwardLimit: 1,
    pinning: false,
    bookmarking: false,
    scheduling: false,
    linkPreviews: true,
  },
  channels: {
    types: ["dm", "group-dm"],
    hierarchy: false,
    categories: false,
    forums: false,
    maxGroupDmMembers: 1000,
    maxGroupMembers: 1000,
    archiving: true,
    slowMode: false,
  },
  presence: {
    states: ["online", "offline"],
    showLastSeen: false,
    lastSeenPrivacy: false,
    customStatus: false,
    activityStatus: false,
    typingIndicator: true,
    typingTimeout: 4000,
    autoAway: false,
    autoAwayTimeout: 0,
    invisibleMode: false,
  },
  calls: {
    supported: true,
    voiceCalls: true,
    videoCalls: true,
    groupCalls: true,
    groupMax: 40,
    screenShare: false,
    recording: false,
    huddles: false,
  },
  notifications: {
    defaultLevel: "all",
    mentionRules: ["user"],
    quietHours: false,
    threadNotifications: false,
    soundEnabled: true,
    badgeCount: true,
    emailDigest: false,
  },
  moderation: {
    profanityFilter: false,
    spamDetection: false,
    automod: false,
    slowMode: false,
    appeals: false,
    reportSystem: true,
    userTimeout: false,
    userBan: false,
  },
  privacy: {
    readReceipts: true,
    readReceiptsOptional: true,
    lastSeen: false,
    lastSeenPrivacy: false,
    profileVisibility: "contacts",
    onlineStatusVisible: false,
    e2eeDefault: true,
    disappearingMessages: true,
    disappearingOptions: ["off", "30s", "5m", "1h", "8h", "24h", "7d", "4w"],
  },
  features: {
    richText: false,
    markdown: false,
    codeBlocks: false,
    mentions: true,
    customEmoji: false,
    gifs: true,
    stickers: true,
    polls: false,
    voiceMessages: true,
    fileUploads: true,
    imageUploads: true,
    videoUploads: true,
    locationSharing: false,
    contactSharing: true,
    stories: true,
  },
};

// ============================================================================
// BEHAVIOR REGISTRY
// ============================================================================

/**
 * All built-in behavior presets keyed by their id.
 */
export const behaviorPresets: Record<string, BehaviorPreset> = {
  nchat: nchatBehavior,
  whatsapp: whatsappBehavior,
  telegram: telegramBehavior,
  discord: discordBehavior,
  slack: slackBehavior,
  signal: signalBehavior,
};

/**
 * List of all built-in behavior preset IDs.
 */
export const behaviorPresetIds = Object.keys(behaviorPresets);

/**
 * Retrieve a behavior preset by ID, or undefined if not found.
 */
export function getBehaviorPreset(id: string): BehaviorPreset | undefined {
  return behaviorPresets[id];
}
