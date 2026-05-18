/**
 * WhatsApp Platform Behavior Preset
 *
 * Detailed behavior preset matching WhatsApp's interaction patterns,
 * feature flags, permissions, and platform-specific behaviors.
 *
 * Key characteristics:
 *   - E2EE on by default (Signal Protocol)
 *   - Reply-chain threading (not side-panel)
 *   - 15-minute edit window
 *   - Forward limit of 5 chats
 *   - Single reaction per user
 *   - Disappearing messages (24h, 7d, 90d)
 *   - Status/Stories feature
 *   - Communities (groups of groups)
 *   - Voice messages with waveform
 *   - Location and contact sharing
 *   - No rich text/markdown (plain text with basic formatting)
 *
 * @module lib/skins/platforms/whatsapp/behavior
 * @version 1.0.0
 */

import type { BehaviorPreset } from "../../types";

// ============================================================================
// WHATSAPP-SPECIFIC BEHAVIOR TYPES
// ============================================================================

/**
 * WhatsApp Status (Stories) behavior configuration.
 */
export interface WhatsAppStatusConfig {
  /** Whether status/stories feature is enabled */
  enabled: boolean;
  /** Maximum status duration in seconds (for images) */
  imageDurationSec: number;
  /** Maximum video status length in seconds */
  maxVideoDurationSec: number;
  /** Status expiration time in hours */
  expirationHours: number;
  /** Whether text statuses are supported */
  textStatus: boolean;
  /** Whether image statuses are supported */
  imageStatus: boolean;
  /** Whether video statuses are supported */
  videoStatus: boolean;
  /** Whether voice note statuses are supported */
  voiceStatus: boolean;
  /** Maximum status updates per day (0 = unlimited) */
  maxPerDay: number;
  /** Who can see statuses */
  defaultAudience: "contacts" | "contacts-except" | "selected-contacts";
  /** Whether status viewers list is visible */
  viewersList: boolean;
  /** Whether status reactions are supported */
  reactions: boolean;
  /** Whether status replies are supported */
  replies: boolean;
}

/**
 * WhatsApp Communities behavior configuration.
 */
export interface WhatsAppCommunityConfig {
  /** Whether communities feature is enabled */
  enabled: boolean;
  /** Maximum groups per community */
  maxGroups: number;
  /** Maximum members per community */
  maxMembers: number;
  /** Announcement group (read-only for non-admins) */
  announcementGroup: boolean;
  /** Community description max length */
  descriptionMaxLength: number;
  /** Whether community admins can add groups */
  adminCanAddGroups: boolean;
  /** Whether community has its own profile picture */
  profilePicture: boolean;
  /** Whether community invites via link are supported */
  inviteLinks: boolean;
}

/**
 * WhatsApp-specific call affordances.
 */
export interface WhatsAppCallConfig {
  /** Voice calls supported */
  voiceCalls: boolean;
  /** Video calls supported */
  videoCalls: boolean;
  /** Group voice calls */
  groupVoiceCalls: boolean;
  /** Group video calls */
  groupVideoCalls: boolean;
  /** Maximum participants in group call */
  groupCallMax: number;
  /** Whether call can be upgraded from voice to video */
  voiceToVideoSwitch: boolean;
  /** Whether call waiting is supported */
  callWaiting: boolean;
  /** End-to-end encrypted calls */
  e2eeCalls: boolean;
  /** Whether call recording is available (not on WhatsApp) */
  recording: boolean;
  /** Whether screen sharing is available in calls */
  screenShare: boolean;
  /** Whether call links are supported */
  callLinks: boolean;
  /** Whether ringtone customization is available */
  customRingtone: boolean;
}

/**
 * WhatsApp message formatting options (basic WhatsApp formatting).
 */
export interface WhatsAppFormattingConfig {
  /** Bold (*text*) */
  bold: boolean;
  /** Italic (_text_) */
  italic: boolean;
  /** Strikethrough (~text~) */
  strikethrough: boolean;
  /** Monospace (```text```) */
  monospace: boolean;
  /** Bulleted lists */
  bulletedLists: boolean;
  /** Numbered lists */
  numberedLists: boolean;
  /** Inline code (backtick) */
  inlineCode: boolean;
  /** Quote (> text) */
  quote: boolean;
  /** Rich text editor (NO - WhatsApp uses plain text) */
  richTextEditor: boolean;
  /** Markdown rendering (NO - WhatsApp uses its own format) */
  markdownRendering: boolean;
}

/**
 * WhatsApp chat list behavior.
 */
export interface WhatsAppChatListConfig {
  /** Whether chats can be pinned to the top */
  pinChats: boolean;
  /** Maximum number of pinned chats */
  maxPinnedChats: number;
  /** Whether chats can be archived */
  archiveChats: boolean;
  /** Whether archived chats stay archived on new messages */
  keepArchived: boolean;
  /** Whether chats can be marked as unread */
  markUnread: boolean;
  /** Whether chat list has a search bar */
  searchBar: boolean;
  /** Whether unread filter is available */
  unreadFilter: boolean;
  /** Whether chat list shows message preview */
  messagePreview: boolean;
  /** Whether chat list shows delivery status */
  deliveryStatus: boolean;
  /** Whether chat list shows timestamp */
  timestamp: boolean;
  /** Whether swipe actions are available (mobile) */
  swipeActions: boolean;
}

/**
 * WhatsApp media sharing configuration.
 */
export interface WhatsAppMediaConfig {
  /** Maximum image size in MB */
  maxImageSizeMB: number;
  /** Maximum video size in MB */
  maxVideoSizeMB: number;
  /** Maximum file size in MB */
  maxFileSizeMB: number;
  /** Maximum audio size in MB */
  maxAudioSizeMB: number;
  /** Maximum images per message (album) */
  maxImagesPerMessage: number;
  /** View-once media */
  viewOnce: boolean;
  /** Image compression before sending */
  imageCompression: boolean;
  /** Send as document (uncompressed) option */
  sendAsDocument: boolean;
  /** Camera integration */
  camera: boolean;
  /** Gallery/photo picker */
  gallery: boolean;
  /** Document picker */
  documentPicker: boolean;
  /** Audio file sharing */
  audioSharing: boolean;
  /** GIF search and sharing */
  gifSearch: boolean;
  /** Sticker packs */
  stickerPacks: boolean;
  /** Custom sticker creation */
  customStickers: boolean;
}

/**
 * WhatsApp group administration features.
 */
export interface WhatsAppGroupAdminConfig {
  /** Whether group description can be changed */
  editDescription: boolean;
  /** Whether group name can be changed */
  editGroupName: boolean;
  /** Whether group icon can be changed */
  editGroupIcon: boolean;
  /** Who can edit group info */
  editInfoPermission: "admins" | "everyone";
  /** Who can send messages */
  sendMessagesPermission: "admins" | "everyone";
  /** Who can add members */
  addMembersPermission: "admins" | "everyone";
  /** Approve new members */
  memberApproval: boolean;
  /** Disappearing messages timer setting */
  disappearingMessages: boolean;
  /** Admin can remove members */
  removeMember: boolean;
  /** Admin can promote/demote admins */
  manageAdmins: boolean;
  /** Group invite link generation */
  inviteLink: boolean;
  /** QR code invite */
  qrCodeInvite: boolean;
}

/**
 * Complete WhatsApp extended behavior configuration.
 * Includes all WhatsApp-specific features beyond the standard BehaviorPreset.
 */
export interface WhatsAppExtendedBehavior {
  status: WhatsAppStatusConfig;
  communities: WhatsAppCommunityConfig;
  callAffordances: WhatsAppCallConfig;
  formatting: WhatsAppFormattingConfig;
  chatList: WhatsAppChatListConfig;
  media: WhatsAppMediaConfig;
  groupAdmin: WhatsAppGroupAdminConfig;
}

// ============================================================================
// WHATSAPP STATUS CONFIG
// ============================================================================

export const whatsappStatusConfig: WhatsAppStatusConfig = {
  enabled: true,
  imageDurationSec: 7,
  maxVideoDurationSec: 30,
  expirationHours: 24,
  textStatus: true,
  imageStatus: true,
  videoStatus: true,
  voiceStatus: true,
  maxPerDay: 0, // unlimited
  defaultAudience: "contacts",
  viewersList: true,
  reactions: true,
  replies: true,
};

// ============================================================================
// WHATSAPP COMMUNITY CONFIG
// ============================================================================

export const whatsappCommunityConfig: WhatsAppCommunityConfig = {
  enabled: true,
  maxGroups: 50,
  maxMembers: 5000,
  announcementGroup: true,
  descriptionMaxLength: 2048,
  adminCanAddGroups: true,
  profilePicture: true,
  inviteLinks: true,
};

// ============================================================================
// WHATSAPP CALL CONFIG
// ============================================================================

export const whatsappCallConfig: WhatsAppCallConfig = {
  voiceCalls: true,
  videoCalls: true,
  groupVoiceCalls: true,
  groupVideoCalls: true,
  groupCallMax: 32,
  voiceToVideoSwitch: true,
  callWaiting: true,
  e2eeCalls: true,
  recording: false,
  screenShare: false,
  callLinks: true,
  customRingtone: true,
};

// ============================================================================
// WHATSAPP FORMATTING CONFIG
// ============================================================================

export const whatsappFormattingConfig: WhatsAppFormattingConfig = {
  bold: true,
  italic: true,
  strikethrough: true,
  monospace: true,
  bulletedLists: true,
  numberedLists: true,
  inlineCode: true,
  quote: true,
  richTextEditor: false,
  markdownRendering: false,
};

// ============================================================================
// WHATSAPP CHAT LIST CONFIG
// ============================================================================

export const whatsappChatListConfig: WhatsAppChatListConfig = {
  pinChats: true,
  maxPinnedChats: 3,
  archiveChats: true,
  keepArchived: true,
  markUnread: true,
  searchBar: true,
  unreadFilter: true,
  messagePreview: true,
  deliveryStatus: true,
  timestamp: true,
  swipeActions: true,
};

// ============================================================================
// WHATSAPP MEDIA CONFIG
// ============================================================================

export const whatsappMediaConfig: WhatsAppMediaConfig = {
  maxImageSizeMB: 16,
  maxVideoSizeMB: 16,
  maxFileSizeMB: 2048,
  maxAudioSizeMB: 16,
  maxImagesPerMessage: 30,
  viewOnce: true,
  imageCompression: true,
  sendAsDocument: true,
  camera: true,
  gallery: true,
  documentPicker: true,
  audioSharing: true,
  gifSearch: true,
  stickerPacks: true,
  customStickers: true,
};

// ============================================================================
// WHATSAPP GROUP ADMIN CONFIG
// ============================================================================

export const whatsappGroupAdminConfig: WhatsAppGroupAdminConfig = {
  editDescription: true,
  editGroupName: true,
  editGroupIcon: true,
  editInfoPermission: "admins",
  sendMessagesPermission: "everyone",
  addMembersPermission: "admins",
  memberApproval: true,
  disappearingMessages: true,
  removeMember: true,
  manageAdmins: true,
  inviteLink: true,
  qrCodeInvite: true,
};

// ============================================================================
// WHATSAPP DETAILED BEHAVIOR PRESET
// ============================================================================

/**
 * Complete WhatsApp behavior preset that extends the standard BehaviorPreset
 * from the skin architecture. This represents WhatsApp's exact feature set
 * and interaction patterns.
 */
export const whatsappDetailedBehavior: BehaviorPreset = {
  id: "whatsapp-detailed",
  name: "WhatsApp",
  description:
    "Detailed WhatsApp behavior preset with exact feature flags, limits, and interaction patterns matching WhatsApp as of 2026",
  version: "0.9.1",
  messaging: {
    editWindow: 15 * 60 * 1000, // 15 minutes
    deleteWindow: 0, // unlimited delete-for-self
    deleteForEveryone: true,
    deleteForEveryoneWindow: 2 * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000, // ~2.5 days (60 hours)
    showEditedIndicator: true,
    reactionStyle: "quick-reactions",
    maxReactionsPerMessage: 1,
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
    communities: true,
    viewOnce: true,
    disappearingMessages: true,
    broadcasts: true,
    pinnedChats: true,
    starredMessages: true,
    chatWallpaper: true,
    paymentIntegration: true,
    chatLock: true,
    screenLock: true,
  },
};

// ============================================================================
// WHATSAPP EXTENDED BEHAVIOR CONFIG
// ============================================================================

export const whatsappExtendedBehavior: WhatsAppExtendedBehavior = {
  status: whatsappStatusConfig,
  communities: whatsappCommunityConfig,
  callAffordances: whatsappCallConfig,
  formatting: whatsappFormattingConfig,
  chatList: whatsappChatListConfig,
  media: whatsappMediaConfig,
  groupAdmin: whatsappGroupAdminConfig,
};

/**
 * Complete WhatsApp behavior configuration including both the standard
 * BehaviorPreset and WhatsApp-specific extensions.
 */
export interface WhatsAppBehaviorConfig {
  preset: BehaviorPreset;
  extended: WhatsAppExtendedBehavior;
}

export const whatsappBehaviorConfig: WhatsAppBehaviorConfig = {
  preset: whatsappDetailedBehavior,
  extended: whatsappExtendedBehavior,
};
