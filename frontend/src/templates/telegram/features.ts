// ===============================================================================
// Telegram Feature Set - Complete Feature Parity
// ===============================================================================
//
// This file defines all Telegram features organized by category. Each feature
// includes metadata about its implementation status, dependencies, and settings.
//
// Feature Categories:
// - Chat Types: Private, Group, Supergroup, Channel, Secret Chat
// - Messaging: Voice, Video, Stickers, GIFs, Polls, Quizzes
// - Privacy: Secret Chats, Self-destruct, Hidden Media
// - Communication: Read Receipts, Online Status, Last Seen
// - Content: Location, Contacts, Files, Media
// - Organization: Scheduled Messages, Pinned, Bookmarks
//
// ===============================================================================

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FeatureStatus = "enabled" | "disabled";

export interface TelegramFeature {
  id: string;
  name: string;
  description: string;
  status: FeatureStatus;
  category: TelegramFeatureCategory;
  icon: string;
  dependencies?: string[];
  settings?: Record<string, unknown>;
  /** Reason why the feature is disabled (only present when status is 'disabled') */
  disabledReason?: string;
}

export type TelegramFeatureCategory =
  | "chat_types"
  | "messaging"
  | "voice_video"
  | "media"
  | "privacy"
  | "presence"
  | "organization"
  | "interaction"
  | "profile";

// ---------------------------------------------------------------------------
// Chat Types
// ---------------------------------------------------------------------------

export const CHAT_TYPES: TelegramFeature[] = [
  {
    id: "private_chat",
    name: "Private Chats",
    description: "One-on-one conversations between two users",
    status: "enabled",
    category: "chat_types",
    icon: "user",
    settings: {
      maxMessageLength: 4096,
      supportedMedia: [
        "photo",
        "video",
        "audio",
        "document",
        "sticker",
        "gif",
        "voice",
        "video_note",
      ],
    },
  },
  {
    id: "group",
    name: "Groups",
    description: "Group conversations with up to 200 members",
    status: "enabled",
    category: "chat_types",
    icon: "users",
    settings: {
      maxMembers: 200,
      adminRoles: ["creator", "admin"],
      permissions: [
        "send_messages",
        "send_media",
        "send_stickers",
        "add_members",
      ],
    },
  },
  {
    id: "supergroup",
    name: "Supergroups",
    description:
      "Large groups with up to 200,000 members and advanced features",
    status: "enabled",
    category: "chat_types",
    icon: "users-2",
    settings: {
      maxMembers: 200000,
      features: [
        "pinned_messages",
        "slow_mode",
        "linked_channel",
        "discussion_group",
      ],
      adminRoles: ["creator", "admin", "moderator"],
      permissions: [
        "send_messages",
        "send_media",
        "send_stickers",
        "send_polls",
        "embed_links",
        "add_members",
        "pin_messages",
        "change_info",
      ],
    },
  },
  {
    id: "channel",
    name: "Channels",
    description: "Broadcast channels for unlimited subscribers",
    status: "enabled",
    category: "chat_types",
    icon: "megaphone",
    settings: {
      unlimited_subscribers: true,
      features: [
        "linked_discussion",
        "silent_broadcast",
        "signatures",
        "view_count",
      ],
      adminRoles: ["creator", "admin", "editor"],
    },
  },
  {
    id: "secret_chat",
    name: "Secret Chats",
    description:
      "End-to-end encrypted conversations with self-destructing messages",
    status: "enabled",
    category: "chat_types",
    icon: "lock",
    settings: {
      encryption: "end-to-end",
      features: ["self_destruct", "no_forwarding", "no_screenshots"],
      selfDestructTimers: [1, 2, 3, 4, 5, 6, 7, 15, 30, 60], // seconds
    },
  },
  {
    id: "saved_messages",
    name: "Saved Messages",
    description: "Personal cloud storage for messages and files",
    status: "enabled",
    category: "chat_types",
    icon: "bookmark",
  },
  {
    id: "bot_chat",
    name: "Bot Conversations",
    description: "Conversations with Telegram bots",
    status: "enabled",
    category: "chat_types",
    icon: "bot",
    settings: {
      features: ["inline_keyboards", "custom_commands", "webhooks"],
    },
  },
];

// ---------------------------------------------------------------------------
// Messaging Features
// ---------------------------------------------------------------------------

export const MESSAGING_FEATURES: TelegramFeature[] = [
  {
    id: "text_messages",
    name: "Text Messages",
    description: "Send text messages with formatting support",
    status: "enabled",
    category: "messaging",
    icon: "message-square",
    settings: {
      maxLength: 4096,
      formatting: [
        "bold",
        "italic",
        "underline",
        "strikethrough",
        "monospace",
        "spoiler",
        "link",
      ],
    },
  },
  {
    id: "reply_to",
    name: "Reply to Messages",
    description: "Reply to specific messages in a conversation",
    status: "enabled",
    category: "messaging",
    icon: "reply",
    settings: {
      showPreview: true,
      jumpToOriginal: true,
    },
  },
  {
    id: "forward_messages",
    name: "Forward Messages",
    description: "Forward messages to other chats",
    status: "enabled",
    category: "messaging",
    icon: "forward",
    settings: {
      showOriginalSender: true,
      allowAnonymous: true,
      multiSelect: true,
    },
  },
  {
    id: "edit_messages",
    name: "Edit Messages",
    description: "Edit sent messages within 48 hours",
    status: "enabled",
    category: "messaging",
    icon: "pencil",
    settings: {
      timeLimit: 48 * 60 * 60 * 1000, // 48 hours in ms
      showEditedIndicator: true,
    },
  },
  {
    id: "delete_messages",
    name: "Delete Messages",
    description: "Delete messages for yourself or everyone",
    status: "enabled",
    category: "messaging",
    icon: "trash-2",
    settings: {
      deleteForBoth: true,
      timeLimit: 48 * 60 * 60 * 1000, // 48 hours
      adminDeleteAlways: true,
    },
  },
  {
    id: "copy_messages",
    name: "Copy Messages",
    description: "Copy message text to clipboard",
    status: "enabled",
    category: "messaging",
    icon: "copy",
  },
  {
    id: "select_messages",
    name: "Select Multiple Messages",
    description: "Select multiple messages for bulk actions",
    status: "enabled",
    category: "messaging",
    icon: "check-square",
    settings: {
      actions: ["forward", "delete", "copy"],
    },
  },
  {
    id: "message_search",
    name: "Message Search",
    description: "Search through message history",
    status: "enabled",
    category: "messaging",
    icon: "search",
    settings: {
      searchTypes: ["text", "sender", "date", "media_type"],
    },
  },
];

// ---------------------------------------------------------------------------
// Voice & Video Features
// ---------------------------------------------------------------------------

export const VOICE_VIDEO_FEATURES: TelegramFeature[] = [
  {
    id: "voice_messages",
    name: "Voice Messages",
    description: "Record and send voice messages with waveform visualization",
    status: "enabled",
    category: "voice_video",
    icon: "mic",
    settings: {
      maxDuration: 60 * 60 * 1000, // 1 hour
      waveformBars: 32,
      playbackSpeeds: [0.5, 1, 1.5, 2],
      showDuration: true,
      showPlayedIndicator: true,
    },
  },
  {
    id: "video_messages",
    name: "Video Messages (Video Notes)",
    description: "Record and send round video messages",
    status: "enabled",
    category: "voice_video",
    icon: "video",
    settings: {
      maxDuration: 60 * 1000, // 60 seconds
      shape: "circle",
      diameter: 240,
      quality: "720p",
    },
  },
  {
    id: "voice_chat",
    name: "Voice Chats",
    description: "Live voice conversations in groups",
    status: "enabled",
    category: "voice_video",
    icon: "headphones",
    settings: {
      maxParticipants: "unlimited",
      features: ["raise_hand", "record", "share_screen"],
    },
  },
  {
    id: "video_chat",
    name: "Video Chats",
    description: "Live video conversations in groups",
    status: "enabled",
    category: "voice_video",
    icon: "video",
    settings: {
      maxParticipants: 1000,
      features: ["screen_share", "background_blur", "virtual_background"],
    },
  },
];

// ---------------------------------------------------------------------------
// Media Features
// ---------------------------------------------------------------------------

export const MEDIA_FEATURES: TelegramFeature[] = [
  {
    id: "stickers",
    name: "Stickers",
    description: "Send static and animated stickers",
    status: "enabled",
    category: "media",
    icon: "sticker",
    settings: {
      types: ["static", "animated", "video"],
      stickerPacks: true,
      favorites: true,
      recent: true,
      search: true,
      maxSize: 512 * 1024, // 512KB for static
    },
  },
  {
    id: "gifs",
    name: "GIFs",
    description: "Send animated GIFs",
    status: "enabled",
    category: "media",
    icon: "image",
    settings: {
      providers: ["giphy", "tenor"],
      search: true,
      saved: true,
      trending: true,
    },
  },
  {
    id: "photos",
    name: "Photos",
    description: "Send photos with optional compression",
    status: "enabled",
    category: "media",
    icon: "image",
    settings: {
      maxFileSize: 10 * 1024 * 1024, // 10MB
      compression: true,
      sendAsFile: true,
      grouping: true, // Media albums
      maxGroupSize: 10,
    },
  },
  {
    id: "videos",
    name: "Videos",
    description: "Send videos up to 2GB",
    status: "enabled",
    category: "media",
    icon: "film",
    settings: {
      maxFileSize: 2 * 1024 * 1024 * 1024, // 2GB
      compression: true,
      streaming: true,
      thumbnail: true,
    },
  },
  {
    id: "documents",
    name: "Documents",
    description: "Send files up to 2GB",
    status: "enabled",
    category: "media",
    icon: "file",
    settings: {
      maxFileSize: 2 * 1024 * 1024 * 1024, // 2GB
      preview: ["pdf", "doc", "docx", "xls", "xlsx"],
    },
  },
  {
    id: "music",
    name: "Music",
    description: "Send audio files with cover art",
    status: "enabled",
    category: "media",
    icon: "music",
    settings: {
      formats: ["mp3", "flac", "wav", "ogg", "m4a"],
      showCoverArt: true,
      showWaveform: true,
    },
  },
  {
    id: "location",
    name: "Location Sharing",
    description: "Share your current location or a location on the map",
    status: "enabled",
    category: "media",
    icon: "map-pin",
    settings: {
      types: ["current", "live", "static"],
      liveDurations: [15 * 60, 60 * 60, 8 * 60 * 60], // 15min, 1hr, 8hr
      nearbyPlaces: true,
    },
  },
  {
    id: "contacts",
    name: "Contact Sharing",
    description: "Share contact cards",
    status: "enabled",
    category: "media",
    icon: "user-plus",
    settings: {
      fields: ["name", "phone", "username"],
    },
  },
  {
    id: "polls",
    name: "Polls",
    description: "Create polls with multiple options",
    status: "enabled",
    category: "media",
    icon: "bar-chart-2",
    settings: {
      maxOptions: 10,
      maxOptionLength: 100,
      features: ["anonymous", "multiple_answers", "public_votes"],
    },
  },
  {
    id: "quizzes",
    name: "Quizzes",
    description: "Create quiz-style polls with correct answers",
    status: "enabled",
    category: "media",
    icon: "help-circle",
    settings: {
      showCorrectAnswer: true,
      explanation: true,
      maxExplanationLength: 200,
    },
  },
];

// ---------------------------------------------------------------------------
// Privacy Features
// ---------------------------------------------------------------------------

export const PRIVACY_FEATURES: TelegramFeature[] = [
  {
    id: "read_receipts",
    name: "Read Receipts",
    description: "Double checkmarks when message is read",
    status: "enabled",
    category: "privacy",
    icon: "check-check",
    settings: {
      showInPrivate: true,
      showInGroups: false, // Telegram doesn't show read receipts in groups
      checkmarkColors: {
        sent: "#A0B8C9",
        delivered: "#A0B8C9",
        read: "#4FAE4E",
      },
    },
  },
  {
    id: "online_status",
    name: "Online Status",
    description: "Show when users are online",
    status: "enabled",
    category: "privacy",
    icon: "circle",
    settings: {
      showOnlineIndicator: true,
      indicatorColor: "#4DCD5E",
    },
  },
  {
    id: "last_seen",
    name: "Last Seen",
    description: "Show when user was last online",
    status: "enabled",
    category: "privacy",
    icon: "clock",
    settings: {
      privacyOptions: ["everyone", "contacts", "nobody"],
      approximations: ["recently", "within_week", "within_month", "long_ago"],
    },
  },
  {
    id: "typing_indicator",
    name: "Typing Indicator",
    description: "Show when someone is typing",
    status: "enabled",
    category: "privacy",
    icon: "more-horizontal",
    settings: {
      showInPrivate: true,
      showInGroups: true,
      timeout: 5000, // 5 seconds
    },
  },
  {
    id: "self_destruct",
    name: "Self-Destructing Messages",
    description: "Messages that delete after being viewed",
    status: "enabled",
    category: "privacy",
    icon: "timer",
    dependencies: ["secret_chat"],
    settings: {
      timers: [1, 2, 3, 4, 5, 6, 7, 15, 30, 60],
      unit: "seconds",
    },
  },
  {
    id: "screenshot_notification",
    name: "Screenshot Notification",
    description: "Notify when screenshot is taken in secret chat",
    status: "disabled",
    category: "privacy",
    icon: "camera",
    dependencies: ["secret_chat"],
    disabledReason:
      "Web platform limitation: browsers do not expose a reliable API to detect screenshots. " +
      "Native mobile/desktop builds may re-enable this via platform-specific screen-capture detection.",
  },
  {
    id: "hidden_media",
    name: "Hidden Media (Spoiler)",
    description: "Send photos and videos as hidden spoilers",
    status: "enabled",
    category: "privacy",
    icon: "eye-off",
    settings: {
      blurAmount: "20px",
      tapToReveal: true,
    },
  },
  {
    id: "block_users",
    name: "Block Users",
    description: "Block users from contacting you",
    status: "enabled",
    category: "privacy",
    icon: "user-x",
  },
  {
    id: "mute_notifications",
    name: "Mute Notifications",
    description: "Mute notifications for specific chats",
    status: "enabled",
    category: "privacy",
    icon: "bell-off",
    settings: {
      durations: [
        1 * 60 * 60 * 1000, // 1 hour
        8 * 60 * 60 * 1000, // 8 hours
        2 * 24 * 60 * 60 * 1000, // 2 days
        "forever",
      ],
    },
  },
];

// ---------------------------------------------------------------------------
// Presence Features
// ---------------------------------------------------------------------------

export const PRESENCE_FEATURES: TelegramFeature[] = [
  {
    id: "bio",
    name: "Bio",
    description: "Short description visible in profile",
    status: "enabled",
    category: "profile",
    icon: "file-text",
    settings: {
      maxLength: 70,
    },
  },
  {
    id: "username",
    name: "Username",
    description: "Unique @username for your account",
    status: "enabled",
    category: "profile",
    icon: "at-sign",
    settings: {
      minLength: 5,
      maxLength: 32,
      pattern: /^[a-zA-Z][a-zA-Z0-9_]{4,31}$/,
    },
  },
  {
    id: "phone_number",
    name: "Phone Number",
    description: "Phone number associated with account",
    status: "enabled",
    category: "profile",
    icon: "phone",
    settings: {
      privacyOptions: ["everyone", "contacts", "nobody"],
    },
  },
  {
    id: "profile_photo",
    name: "Profile Photo",
    description: "Profile picture with multiple photo history",
    status: "enabled",
    category: "profile",
    icon: "camera",
    settings: {
      maxPhotos: "unlimited",
      formats: ["jpg", "png"],
      maxSize: 5 * 1024 * 1024, // 5MB
    },
  },
  {
    id: "profile_video",
    name: "Profile Video",
    description: "Animated profile picture",
    status: "enabled",
    category: "profile",
    icon: "video",
    settings: {
      maxDuration: 10000, // 10 seconds
      shape: "circle",
    },
  },
];

// ---------------------------------------------------------------------------
// Organization Features
// ---------------------------------------------------------------------------

export const ORGANIZATION_FEATURES: TelegramFeature[] = [
  {
    id: "scheduled_messages",
    name: "Scheduled Messages",
    description: "Schedule messages to be sent later",
    status: "enabled",
    category: "organization",
    icon: "calendar",
    settings: {
      maxFutureTime: 365 * 24 * 60 * 60 * 1000, // 1 year
      showInChat: true,
      editBeforeSend: true,
    },
  },
  {
    id: "pinned_messages",
    name: "Pinned Messages",
    description: "Pin important messages in chat",
    status: "enabled",
    category: "organization",
    icon: "pin",
    settings: {
      maxPinned: "unlimited",
      notifyOnPin: true,
    },
  },
  {
    id: "chat_folders",
    name: "Chat Folders",
    description: "Organize chats into custom folders",
    status: "enabled",
    category: "organization",
    icon: "folder",
    settings: {
      maxFolders: 10,
      filters: [
        "unread",
        "unmuted",
        "groups",
        "channels",
        "contacts",
        "non_contacts",
        "bots",
      ],
    },
  },
  {
    id: "archive",
    name: "Archive Chats",
    description: "Archive chats to hide them from main list",
    status: "enabled",
    category: "organization",
    icon: "archive",
    settings: {
      autoArchive: true,
      unarchiveOnNewMessage: true,
    },
  },
  {
    id: "chat_history_export",
    name: "Export Chat History",
    description: "Export chat history as JSON or HTML",
    status: "enabled",
    category: "organization",
    icon: "download",
    settings: {
      formats: ["json", "html"],
      includeMedia: true,
    },
  },
];

// ---------------------------------------------------------------------------
// Interaction Features
// ---------------------------------------------------------------------------

export const INTERACTION_FEATURES: TelegramFeature[] = [
  {
    id: "reactions",
    name: "Message Reactions",
    description: "React to messages with emoji",
    status: "enabled",
    category: "interaction",
    icon: "smile",
    settings: {
      quickReactions: ["👍", "❤️", "🔥", "🎉", "😢", "👎", "🤔"],
      customReactions: true,
      maxReactionsPerMessage: "unlimited",
      showReactors: true,
    },
  },
  {
    id: "mentions",
    name: "Mentions",
    description: "Mention users with @username",
    status: "enabled",
    category: "interaction",
    icon: "at-sign",
    settings: {
      notifyOnMention: true,
      highlightMention: true,
    },
  },
  {
    id: "hashtags",
    name: "Hashtags",
    description: "Searchable hashtags in messages",
    status: "enabled",
    category: "interaction",
    icon: "hash",
    settings: {
      clickToSearch: true,
    },
  },
  {
    id: "link_previews",
    name: "Link Previews",
    description: "Show previews for shared links",
    status: "enabled",
    category: "interaction",
    icon: "link",
    settings: {
      showImage: true,
      showTitle: true,
      showDescription: true,
      aboveBelowToggle: true,
    },
  },
];

// ---------------------------------------------------------------------------
// Feature Collections
// ---------------------------------------------------------------------------

export const ALL_TELEGRAM_FEATURES: TelegramFeature[] = [
  ...CHAT_TYPES,
  ...MESSAGING_FEATURES,
  ...VOICE_VIDEO_FEATURES,
  ...MEDIA_FEATURES,
  ...PRIVACY_FEATURES,
  ...PRESENCE_FEATURES,
  ...ORGANIZATION_FEATURES,
  ...INTERACTION_FEATURES,
];

// ---------------------------------------------------------------------------
// Feature Helpers
// ---------------------------------------------------------------------------

export function getFeatureById(id: string): TelegramFeature | undefined {
  return ALL_TELEGRAM_FEATURES.find((f) => f.id === id);
}

export function getFeaturesByCategory(
  category: TelegramFeatureCategory,
): TelegramFeature[] {
  return ALL_TELEGRAM_FEATURES.filter((f) => f.category === category);
}

export function getEnabledFeatures(): TelegramFeature[] {
  return ALL_TELEGRAM_FEATURES.filter((f) => f.status === "enabled");
}

export function getDisabledFeatures(): TelegramFeature[] {
  return ALL_TELEGRAM_FEATURES.filter((f) => f.status === "disabled");
}

/**
 * @deprecated No placeholder features remain. Use getDisabledFeatures() instead.
 * Returns an empty array - all features are now either 'enabled' or 'disabled'.
 */
export function getPlaceholderFeatures(): TelegramFeature[] {
  return [];
}

export function isFeatureEnabled(id: string): boolean {
  const feature = getFeatureById(id);
  return feature?.status === "enabled";
}

export function getFeatureDependencies(id: string): TelegramFeature[] {
  const feature = getFeatureById(id);
  if (!feature?.dependencies) return [];
  return feature.dependencies
    .map((depId) => getFeatureById(depId))
    .filter((f): f is TelegramFeature => f !== undefined);
}

// ---------------------------------------------------------------------------
// Feature Configuration Export
// ---------------------------------------------------------------------------

export const telegramFeatureConfig = {
  chatTypes: CHAT_TYPES,
  messaging: MESSAGING_FEATURES,
  voiceVideo: VOICE_VIDEO_FEATURES,
  media: MEDIA_FEATURES,
  privacy: PRIVACY_FEATURES,
  presence: PRESENCE_FEATURES,
  organization: ORGANIZATION_FEATURES,
  interaction: INTERACTION_FEATURES,
  all: ALL_TELEGRAM_FEATURES,
  helpers: {
    getFeatureById,
    getFeaturesByCategory,
    getEnabledFeatures,
    getDisabledFeatures,
    getPlaceholderFeatures,
    isFeatureEnabled,
    getFeatureDependencies,
  },
};

export default telegramFeatureConfig;
