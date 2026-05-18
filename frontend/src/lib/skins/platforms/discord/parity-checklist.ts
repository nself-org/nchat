/**
 * Discord Parity Acceptance Checklist
 *
 * Comprehensive checklist of Discord features and behaviors that must be
 * matched for the Discord skin + behavior preset to be considered at parity.
 *
 * Each checklist item maps to a specific Discord feature, with metadata about
 * the feature category, priority, and which config controls it.
 *
 * Categories (12):
 *   - servers: Server/Guild system
 *   - channels: Channel types and management
 *   - messaging: Text messaging features
 *   - voice: Voice channel features
 *   - stage: Stage channel features
 *   - forum: Forum channel features
 *   - permissions: Role and permission system
 *   - moderation: AutoMod and moderation tools
 *   - nitro: Nitro subscription features
 *   - events: Scheduled events
 *   - bots: Bots, apps, and slash commands
 *   - ui: UI and navigation elements
 *
 * @module lib/skins/platforms/discord/parity-checklist
 * @version 1.0.0
 */

// ============================================================================
// CHECKLIST TYPES
// ============================================================================

/**
 * Priority level for a parity feature.
 */
export type DiscordParityPriority = "critical" | "high" | "medium" | "low";

/**
 * Category of the parity feature.
 */
export type DiscordParityCategory =
  | "servers"
  | "channels"
  | "messaging"
  | "voice"
  | "stage"
  | "forum"
  | "permissions"
  | "moderation"
  | "nitro"
  | "events"
  | "bots"
  | "ui";

/**
 * Implementation status.
 */
export type DiscordParityStatus =
  | "implemented"
  | "partial"
  | "not-implemented"
  | "not-applicable";

/**
 * A single parity checklist item.
 */
export interface DiscordParityChecklistItem {
  /** Unique identifier */
  id: string;
  /** Human-readable description */
  description: string;
  /** Feature category */
  category: DiscordParityCategory;
  /** Priority level */
  priority: DiscordParityPriority;
  /** Implementation status */
  status: DiscordParityStatus;
  /** Which config property controls this (dot notation) */
  configPath: string;
  /** Expected value in the config */
  expectedValue: unknown;
  /** Notes about the implementation */
  notes?: string;
}

/**
 * Complete parity checklist.
 */
export interface DiscordParityChecklist {
  /** Platform name */
  platform: string;
  /** Version being compared against */
  targetVersion: string;
  /** Date of assessment */
  assessmentDate: string;
  /** Total items */
  totalItems: number;
  /** Items by status */
  statusCounts: Record<DiscordParityStatus, number>;
  /** Items by priority */
  priorityCounts: Record<DiscordParityPriority, number>;
  /** Parity percentage (implemented / (total - not-applicable)) */
  parityPercentage: number;
  /** All checklist items */
  items: DiscordParityChecklistItem[];
}

// ============================================================================
// SERVERS/GUILDS PARITY ITEMS
// ============================================================================

const serverItems: DiscordParityChecklistItem[] = [
  {
    id: "srv-001",
    description: "Server/Guild system with create, join, and settings",
    category: "servers",
    priority: "critical",
    status: "implemented",
    configPath: "extended.guild.enabled",
    expectedValue: true,
  },
  {
    id: "srv-002",
    description: "User can join up to 100 servers",
    category: "servers",
    priority: "high",
    status: "implemented",
    configPath: "extended.guild.maxServersPerUser",
    expectedValue: 100,
  },
  {
    id: "srv-003",
    description: "Server templates for quick setup",
    category: "servers",
    priority: "medium",
    status: "implemented",
    configPath: "extended.guild.templates",
    expectedValue: true,
  },
  {
    id: "srv-004",
    description: "Server discovery listing",
    category: "servers",
    priority: "medium",
    status: "implemented",
    configPath: "extended.guild.discovery",
    expectedValue: true,
  },
  {
    id: "srv-005",
    description: "Welcome screen for new members",
    category: "servers",
    priority: "high",
    status: "implemented",
    configPath: "extended.guild.welcomeScreen",
    expectedValue: true,
  },
  {
    id: "srv-006",
    description: "Server banner and invite splash",
    category: "servers",
    priority: "medium",
    status: "implemented",
    configPath: "extended.guild.banner",
    expectedValue: true,
  },
  {
    id: "srv-007",
    description: "Vanity invite URL",
    category: "servers",
    priority: "low",
    status: "implemented",
    configPath: "extended.guild.vanityUrl",
    expectedValue: true,
  },
  {
    id: "srv-008",
    description: "Community features and rules channel",
    category: "servers",
    priority: "high",
    status: "implemented",
    configPath: "extended.guild.communityFeatures",
    expectedValue: true,
  },
  {
    id: "srv-009",
    description: "Member verification gate",
    category: "servers",
    priority: "high",
    status: "implemented",
    configPath: "extended.guild.memberVerification",
    expectedValue: true,
  },
];

// ============================================================================
// CHANNELS PARITY ITEMS
// ============================================================================

const channelItems: DiscordParityChecklistItem[] = [
  {
    id: "ch-001",
    description: "Text channels with # prefix",
    category: "channels",
    priority: "critical",
    status: "implemented",
    configPath: "extended.channelTypes.text",
    expectedValue: true,
  },
  {
    id: "ch-002",
    description: "Voice channels (always-on)",
    category: "channels",
    priority: "critical",
    status: "implemented",
    configPath: "extended.channelTypes.voice",
    expectedValue: true,
  },
  {
    id: "ch-003",
    description: "Stage channels with speaker/audience model",
    category: "channels",
    priority: "high",
    status: "implemented",
    configPath: "extended.channelTypes.stage",
    expectedValue: true,
  },
  {
    id: "ch-004",
    description: "Forum channels with tags and sorting",
    category: "channels",
    priority: "high",
    status: "implemented",
    configPath: "extended.channelTypes.forum",
    expectedValue: true,
  },
  {
    id: "ch-005",
    description: "Announcement channels with cross-server follows",
    category: "channels",
    priority: "high",
    status: "implemented",
    configPath: "extended.channelTypes.announcement",
    expectedValue: true,
  },
  {
    id: "ch-006",
    description: "Category containers for organizing channels",
    category: "channels",
    priority: "critical",
    status: "implemented",
    configPath: "extended.channelTypes.categories",
    expectedValue: true,
  },
  {
    id: "ch-007",
    description: "Up to 500 channels per server",
    category: "channels",
    priority: "medium",
    status: "implemented",
    configPath: "extended.channelTypes.maxChannelsPerServer",
    expectedValue: 500,
  },
  {
    id: "ch-008",
    description: "Rules channel for server rules",
    category: "channels",
    priority: "medium",
    status: "implemented",
    configPath: "extended.channelTypes.rules",
    expectedValue: true,
  },
  {
    id: "ch-009",
    description: "DMs and Group DMs (up to 10)",
    category: "channels",
    priority: "critical",
    status: "implemented",
    configPath: "behavior.channels.maxGroupDmMembers",
    expectedValue: 10,
  },
  {
    id: "ch-010",
    description: "Slowmode per-channel (up to 6 hours)",
    category: "channels",
    priority: "medium",
    status: "implemented",
    configPath: "behavior.channels.slowMode",
    expectedValue: true,
  },
];

// ============================================================================
// MESSAGING PARITY ITEMS
// ============================================================================

const messagingItems: DiscordParityChecklistItem[] = [
  {
    id: "msg-001",
    description: "Cozy message layout (no bubbles, flat with hover bg)",
    category: "messaging",
    priority: "critical",
    status: "implemented",
    configPath: "skin.components.messageLayout",
    expectedValue: "cozy",
  },
  {
    id: "msg-002",
    description: "Rich embed messages with left-color border",
    category: "messaging",
    priority: "high",
    status: "implemented",
    configPath: "behavior.messaging.linkPreviews",
    expectedValue: true,
  },
  {
    id: "msg-003",
    description: "Full emoji picker with 20 reactions per message",
    category: "messaging",
    priority: "high",
    status: "implemented",
    configPath: "behavior.messaging.maxReactionsPerMessage",
    expectedValue: 20,
  },
  {
    id: "msg-004",
    description: "Inline threading model",
    category: "messaging",
    priority: "critical",
    status: "implemented",
    configPath: "behavior.messaging.threadingModel",
    expectedValue: "inline",
  },
  {
    id: "msg-005",
    description: "Public and private threads",
    category: "messaging",
    priority: "high",
    status: "implemented",
    configPath: "extended.threads.publicThreads",
    expectedValue: true,
  },
  {
    id: "msg-006",
    description: "Thread auto-archive (1h, 24h, 3d, 7d)",
    category: "messaging",
    priority: "medium",
    status: "implemented",
    configPath: "extended.threads.autoArchiveDurations",
    expectedValue: [60, 1440, 4320, 10080],
  },
  {
    id: "msg-007",
    description: "Unlimited edit window for messages",
    category: "messaging",
    priority: "high",
    status: "implemented",
    configPath: "behavior.messaging.editWindow",
    expectedValue: 0,
  },
  {
    id: "msg-008",
    description: "2000 character max message length",
    category: "messaging",
    priority: "high",
    status: "implemented",
    configPath: "behavior.messaging.maxMessageLength",
    expectedValue: 2000,
  },
  {
    id: "msg-009",
    description: "Pin messages in channels",
    category: "messaging",
    priority: "medium",
    status: "implemented",
    configPath: "behavior.messaging.pinning",
    expectedValue: true,
  },
  {
    id: "msg-010",
    description: "No message forwarding",
    category: "messaging",
    priority: "medium",
    status: "implemented",
    configPath: "behavior.messaging.forwarding",
    expectedValue: false,
  },
  {
    id: "msg-011",
    description:
      "Markdown formatting (bold, italic, code, spoiler, quote, headers)",
    category: "messaging",
    priority: "high",
    status: "implemented",
    configPath: "behavior.features.markdown",
    expectedValue: true,
  },
  {
    id: "msg-012",
    description: "File attachments up to 25MB (or 500MB with Nitro)",
    category: "messaging",
    priority: "high",
    status: "implemented",
    configPath: "extended.media.maxFileSizeMB",
    expectedValue: 25,
  },
  {
    id: "msg-013",
    description: "Edited message indicator",
    category: "messaging",
    priority: "medium",
    status: "implemented",
    configPath: "behavior.messaging.showEditedIndicator",
    expectedValue: true,
  },
];

// ============================================================================
// VOICE PARITY ITEMS
// ============================================================================

const voiceItems: DiscordParityChecklistItem[] = [
  {
    id: "vc-001",
    description: "Always-on voice channels (join/leave)",
    category: "voice",
    priority: "critical",
    status: "implemented",
    configPath: "extended.voice.alwaysOn",
    expectedValue: true,
  },
  {
    id: "vc-002",
    description: "Push-to-talk and voice activity detection",
    category: "voice",
    priority: "high",
    status: "implemented",
    configPath: "extended.voice.pushToTalk",
    expectedValue: true,
  },
  {
    id: "vc-003",
    description: "Screen sharing in voice channels",
    category: "voice",
    priority: "high",
    status: "implemented",
    configPath: "extended.voice.screenShare",
    expectedValue: true,
  },
  {
    id: "vc-004",
    description: "Video in voice channels",
    category: "voice",
    priority: "high",
    status: "implemented",
    configPath: "extended.voice.video",
    expectedValue: true,
  },
  {
    id: "vc-005",
    description: "Go Live streaming",
    category: "voice",
    priority: "high",
    status: "implemented",
    configPath: "extended.voice.goLive",
    expectedValue: true,
  },
  {
    id: "vc-006",
    description: "Noise suppression and echo cancellation",
    category: "voice",
    priority: "medium",
    status: "implemented",
    configPath: "extended.voice.noiseSuppression",
    expectedValue: true,
  },
  {
    id: "vc-007",
    description: "Soundboard in voice channels",
    category: "voice",
    priority: "medium",
    status: "implemented",
    configPath: "extended.voice.soundboard",
    expectedValue: true,
  },
  {
    id: "vc-008",
    description: "User limit per voice channel (up to 99)",
    category: "voice",
    priority: "medium",
    status: "implemented",
    configPath: "extended.voice.maxUsersPerChannel",
    expectedValue: 99,
  },
];

// ============================================================================
// STAGE PARITY ITEMS
// ============================================================================

const stageItems: DiscordParityChecklistItem[] = [
  {
    id: "stg-001",
    description: "Stage channels with speaker/audience model",
    category: "stage",
    priority: "high",
    status: "implemented",
    configPath: "extended.stage.enabled",
    expectedValue: true,
  },
  {
    id: "stg-002",
    description: "Request to speak (raise hand)",
    category: "stage",
    priority: "high",
    status: "implemented",
    configPath: "extended.stage.requestToSpeak",
    expectedValue: true,
  },
  {
    id: "stg-003",
    description: "Moderator controls for speakers",
    category: "stage",
    priority: "high",
    status: "implemented",
    configPath: "extended.stage.moderatorControls",
    expectedValue: true,
  },
  {
    id: "stg-004",
    description: "Stage topics and discovery",
    category: "stage",
    priority: "medium",
    status: "implemented",
    configPath: "extended.stage.topics",
    expectedValue: true,
  },
  {
    id: "stg-005",
    description: "Up to 50 speakers per stage",
    category: "stage",
    priority: "medium",
    status: "implemented",
    configPath: "extended.stage.maxSpeakers",
    expectedValue: 50,
  },
];

// ============================================================================
// FORUM PARITY ITEMS
// ============================================================================

const forumItems: DiscordParityChecklistItem[] = [
  {
    id: "frm-001",
    description: "Forum channels with post-based layout",
    category: "forum",
    priority: "high",
    status: "implemented",
    configPath: "extended.forum.enabled",
    expectedValue: true,
  },
  {
    id: "frm-002",
    description: "Tags for categorizing forum posts (up to 20)",
    category: "forum",
    priority: "high",
    status: "implemented",
    configPath: "extended.forum.tags",
    expectedValue: true,
  },
  {
    id: "frm-003",
    description: "Sorting by latest activity or creation date",
    category: "forum",
    priority: "medium",
    status: "implemented",
    configPath: "extended.forum.defaultSortOrder",
    expectedValue: "latest-activity",
  },
  {
    id: "frm-004",
    description: "Post guidelines/template for new posts",
    category: "forum",
    priority: "medium",
    status: "implemented",
    configPath: "extended.forum.postGuidelines",
    expectedValue: true,
  },
  {
    id: "frm-005",
    description: "Auto-archive inactive posts",
    category: "forum",
    priority: "medium",
    status: "implemented",
    configPath: "extended.forum.autoArchive",
    expectedValue: true,
  },
  {
    id: "frm-006",
    description: "Default reaction emoji for forum posts",
    category: "forum",
    priority: "low",
    status: "implemented",
    configPath: "extended.forum.defaultReactionEmoji",
    expectedValue: true,
  },
];

// ============================================================================
// PERMISSIONS PARITY ITEMS
// ============================================================================

const permissionItems: DiscordParityChecklistItem[] = [
  {
    id: "perm-001",
    description: "Hierarchical role-based permissions",
    category: "permissions",
    priority: "critical",
    status: "implemented",
    configPath: "extended.roles.hierarchical",
    expectedValue: true,
  },
  {
    id: "perm-002",
    description: "Role colors and icons",
    category: "permissions",
    priority: "high",
    status: "implemented",
    configPath: "extended.roles.roleColors",
    expectedValue: true,
  },
  {
    id: "perm-003",
    description: "Channel permission overrides",
    category: "permissions",
    priority: "critical",
    status: "implemented",
    configPath: "extended.roles.channelOverrides",
    expectedValue: true,
  },
  {
    id: "perm-004",
    description: "Category permission inheritance",
    category: "permissions",
    priority: "high",
    status: "implemented",
    configPath: "extended.roles.categoryInheritance",
    expectedValue: true,
  },
  {
    id: "perm-005",
    description: "@everyone role as base permissions",
    category: "permissions",
    priority: "critical",
    status: "implemented",
    configPath: "extended.roles.everyoneRole",
    expectedValue: true,
  },
  {
    id: "perm-006",
    description: "Role hoisting (display separately in member list)",
    category: "permissions",
    priority: "medium",
    status: "implemented",
    configPath: "extended.roles.hoisting",
    expectedValue: true,
  },
  {
    id: "perm-007",
    description: "Up to 250 roles per server",
    category: "permissions",
    priority: "medium",
    status: "implemented",
    configPath: "extended.guild.maxRolesPerServer",
    expectedValue: 250,
  },
  {
    id: "perm-008",
    description: "38+ granular permissions",
    category: "permissions",
    priority: "high",
    status: "implemented",
    configPath: "extended.roles.permissions.length",
    expectedValue: 38,
    notes: "Minimum 38 permissions tracked",
  },
];

// ============================================================================
// MODERATION PARITY ITEMS
// ============================================================================

const moderationItems: DiscordParityChecklistItem[] = [
  {
    id: "mod-001",
    description: "AutoMod with keyword filters",
    category: "moderation",
    priority: "high",
    status: "implemented",
    configPath: "extended.autoMod.keywordFilter",
    expectedValue: true,
  },
  {
    id: "mod-002",
    description: "AutoMod mention spam detection",
    category: "moderation",
    priority: "high",
    status: "implemented",
    configPath: "extended.autoMod.mentionSpamDetection",
    expectedValue: true,
  },
  {
    id: "mod-003",
    description: "AutoMod regex patterns",
    category: "moderation",
    priority: "medium",
    status: "implemented",
    configPath: "extended.autoMod.regexPatterns",
    expectedValue: true,
  },
  {
    id: "mod-004",
    description: "User timeout (mute for duration)",
    category: "moderation",
    priority: "high",
    status: "implemented",
    configPath: "behavior.moderation.userTimeout",
    expectedValue: true,
  },
  {
    id: "mod-005",
    description: "User ban with optional message purge",
    category: "moderation",
    priority: "high",
    status: "implemented",
    configPath: "behavior.moderation.userBan",
    expectedValue: true,
  },
  {
    id: "mod-006",
    description: "Audit log for moderation actions",
    category: "moderation",
    priority: "high",
    status: "implemented",
    configPath: "extended.roles.permissions",
    expectedValue: "VIEW_AUDIT_LOG",
    notes: "Audit log is a permission in the role system",
  },
  {
    id: "mod-007",
    description: "Exempt roles and channels from AutoMod",
    category: "moderation",
    priority: "medium",
    status: "implemented",
    configPath: "extended.autoMod.exemptRoles",
    expectedValue: true,
  },
  {
    id: "mod-008",
    description: "Slowmode per channel",
    category: "moderation",
    priority: "medium",
    status: "implemented",
    configPath: "behavior.moderation.slowMode",
    expectedValue: true,
  },
];

// ============================================================================
// NITRO PARITY ITEMS
// ============================================================================

const nitroItems: DiscordParityChecklistItem[] = [
  {
    id: "ntro-001",
    description: "Nitro subscription tiers (None, Basic, Full)",
    category: "nitro",
    priority: "high",
    status: "implemented",
    configPath: "extended.nitro.tiers",
    expectedValue: ["none", "nitro-basic", "nitro"],
  },
  {
    id: "ntro-002",
    description: "Cross-server custom emoji usage",
    category: "nitro",
    priority: "high",
    status: "implemented",
    configPath: "extended.nitro.crossServerEmoji",
    expectedValue: true,
  },
  {
    id: "ntro-003",
    description: "Animated avatar and banner",
    category: "nitro",
    priority: "medium",
    status: "implemented",
    configPath: "extended.nitro.animatedAvatar",
    expectedValue: true,
  },
  {
    id: "ntro-004",
    description: "500MB upload limit with Nitro",
    category: "nitro",
    priority: "high",
    status: "implemented",
    configPath: "extended.nitro.uploadLimitMB",
    expectedValue: 500,
  },
  {
    id: "ntro-005",
    description: "HD video streaming",
    category: "nitro",
    priority: "medium",
    status: "implemented",
    configPath: "extended.nitro.hdVideoStreaming",
    expectedValue: true,
  },
  {
    id: "ntro-006",
    description: "Custom profile theme",
    category: "nitro",
    priority: "medium",
    status: "implemented",
    configPath: "extended.nitro.customProfileTheme",
    expectedValue: true,
  },
  {
    id: "ntro-007",
    description: "Server boost included with Nitro",
    category: "nitro",
    priority: "medium",
    status: "implemented",
    configPath: "extended.nitro.serverBoostIncluded",
    expectedValue: 2,
  },
  {
    id: "ntro-008",
    description: "Super reactions (Nitro)",
    category: "nitro",
    priority: "low",
    status: "implemented",
    configPath: "extended.nitro.superReactions",
    expectedValue: true,
  },
];

// ============================================================================
// EVENTS PARITY ITEMS
// ============================================================================

const eventItems: DiscordParityChecklistItem[] = [
  {
    id: "evt-001",
    description: "Scheduled events with RSVP (interested count)",
    category: "events",
    priority: "high",
    status: "implemented",
    configPath: "extended.events.enabled",
    expectedValue: true,
  },
  {
    id: "evt-002",
    description: "Event types: voice, stage, external",
    category: "events",
    priority: "high",
    status: "implemented",
    configPath: "extended.events.eventTypes",
    expectedValue: ["voice", "stage", "external"],
  },
  {
    id: "evt-003",
    description: "Event reminders",
    category: "events",
    priority: "medium",
    status: "implemented",
    configPath: "extended.events.reminders",
    expectedValue: true,
  },
  {
    id: "evt-004",
    description: "Recurring events",
    category: "events",
    priority: "medium",
    status: "implemented",
    configPath: "extended.events.recurring",
    expectedValue: true,
  },
  {
    id: "evt-005",
    description: "Event cover images",
    category: "events",
    priority: "low",
    status: "implemented",
    configPath: "extended.events.coverImage",
    expectedValue: true,
  },
];

// ============================================================================
// BOTS/APPS PARITY ITEMS
// ============================================================================

const botItems: DiscordParityChecklistItem[] = [
  {
    id: "bot-001",
    description: "Slash commands (/command) with autocomplete",
    category: "bots",
    priority: "critical",
    status: "implemented",
    configPath: "behavior.features.slashCommands",
    expectedValue: true,
  },
  {
    id: "bot-002",
    description: "Bot/app integration",
    category: "bots",
    priority: "high",
    status: "implemented",
    configPath: "behavior.features.bots",
    expectedValue: true,
  },
  {
    id: "bot-003",
    description: "Message components (buttons, select menus)",
    category: "bots",
    priority: "high",
    status: "implemented",
    configPath: "behavior.features.messageComponents",
    expectedValue: true,
  },
  {
    id: "bot-004",
    description: "Embedded activities in voice channels",
    category: "bots",
    priority: "medium",
    status: "implemented",
    configPath: "behavior.features.activities",
    expectedValue: true,
  },
  {
    id: "bot-005",
    description: "Webhooks for integrations",
    category: "bots",
    priority: "high",
    status: "implemented",
    configPath: "behavior.features.webhooks",
    expectedValue: true,
  },
  {
    id: "bot-006",
    description: "App Directory for discovering apps",
    category: "bots",
    priority: "medium",
    status: "implemented",
    configPath: "behavior.features.appDirectory",
    expectedValue: true,
  },
];

// ============================================================================
// UI PARITY ITEMS
// ============================================================================

const uiItems: DiscordParityChecklistItem[] = [
  {
    id: "ui-001",
    description: "Server list column (72px vertical icon sidebar)",
    category: "ui",
    priority: "critical",
    status: "implemented",
    configPath: "navigation.serverList.width",
    expectedValue: "72px",
  },
  {
    id: "ui-002",
    description: "Channel sidebar (240px)",
    category: "ui",
    priority: "critical",
    status: "implemented",
    configPath: "skin.spacing.sidebarWidth",
    expectedValue: "240px",
  },
  {
    id: "ui-003",
    description: "Toggleable member list panel",
    category: "ui",
    priority: "high",
    status: "implemented",
    configPath: "navigation.membersPanel.toggleable",
    expectedValue: true,
  },
  {
    id: "ui-004",
    description: "User area with mic/deafen/settings controls",
    category: "ui",
    priority: "critical",
    status: "implemented",
    configPath: "navigation.userArea.microphoneToggle",
    expectedValue: true,
  },
  {
    id: "ui-005",
    description: "Dark mode as default color scheme",
    category: "ui",
    priority: "critical",
    status: "implemented",
    configPath: "navigation.defaultColorScheme",
    expectedValue: "dark",
  },
  {
    id: "ui-006",
    description: "Blurple (#5865F2) as primary accent color",
    category: "ui",
    priority: "critical",
    status: "implemented",
    configPath: "skin.colors.primary",
    expectedValue: "#5865F2",
  },
  {
    id: "ui-007",
    description: "gg sans font family",
    category: "ui",
    priority: "high",
    status: "implemented",
    configPath: "skin.typography.fontFamily",
    expectedValue: "gg sans",
    notes: "Font family string starts with gg sans",
  },
  {
    id: "ui-008",
    description: "Server icon pill indicators (selected/unread)",
    category: "ui",
    priority: "high",
    status: "implemented",
    configPath: "navigation.serverList.unreadIndicators",
    expectedValue: true,
  },
  {
    id: "ui-009",
    description: "Server folders for organizing servers",
    category: "ui",
    priority: "medium",
    status: "implemented",
    configPath: "navigation.serverList.folders",
    expectedValue: true,
  },
  {
    id: "ui-010",
    description: "Header bar with channel name, topic, and action icons",
    category: "ui",
    priority: "high",
    status: "implemented",
    configPath: "navigation.header.channelName",
    expectedValue: true,
  },
  {
    id: "ui-011",
    description: "Rounded-square avatar shape (not full circle)",
    category: "ui",
    priority: "high",
    status: "implemented",
    configPath: "skin.components.avatarShape",
    expectedValue: "rounded",
  },
  {
    id: "ui-012",
    description: "Status indicators (online, idle, dnd, offline, streaming)",
    category: "ui",
    priority: "high",
    status: "implemented",
    configPath: "behavior.presence.states",
    expectedValue: ["online", "idle", "dnd", "invisible", "offline"],
  },
  {
    id: "ui-013",
    description:
      "Server icon shape transition (rounded-square to circle on hover)",
    category: "ui",
    priority: "medium",
    status: "implemented",
    configPath: "navigation.serverList.iconShapeHover",
    expectedValue: "circle",
  },
];

// ============================================================================
// ASSEMBLED CHECKLIST
// ============================================================================

const allItems: DiscordParityChecklistItem[] = [
  ...serverItems,
  ...channelItems,
  ...messagingItems,
  ...voiceItems,
  ...stageItems,
  ...forumItems,
  ...permissionItems,
  ...moderationItems,
  ...nitroItems,
  ...eventItems,
  ...botItems,
  ...uiItems,
];

function countByStatus(
  items: DiscordParityChecklistItem[],
): Record<DiscordParityStatus, number> {
  const counts: Record<DiscordParityStatus, number> = {
    implemented: 0,
    partial: 0,
    "not-implemented": 0,
    "not-applicable": 0,
  };
  for (const item of items) {
    counts[item.status]++;
  }
  return counts;
}

function countByPriority(
  items: DiscordParityChecklistItem[],
): Record<DiscordParityPriority, number> {
  const counts: Record<DiscordParityPriority, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };
  for (const item of items) {
    counts[item.priority]++;
  }
  return counts;
}

function calculateParityPercentage(
  items: DiscordParityChecklistItem[],
): number {
  const applicable = items.filter((i) => i.status !== "not-applicable");
  if (applicable.length === 0) return 0;
  const implemented = applicable.filter((i) => i.status === "implemented");
  return Math.round((implemented.length / applicable.length) * 100);
}

/**
 * Complete Discord parity checklist with all items and computed stats.
 */
export const discordParityChecklist: DiscordParityChecklist = {
  platform: "Discord",
  targetVersion: "Discord 2024.x (2026)",
  assessmentDate: "2026-02-09",
  totalItems: allItems.length,
  statusCounts: countByStatus(allItems),
  priorityCounts: countByPriority(allItems),
  parityPercentage: calculateParityPercentage(allItems),
  items: allItems,
};

// ============================================================================
// CHECKLIST HELPERS
// ============================================================================

/**
 * Get all checklist items for a specific category.
 */
export function getDiscordParityItemsByCategory(
  category: DiscordParityCategory,
): DiscordParityChecklistItem[] {
  return discordParityChecklist.items.filter(
    (item) => item.category === category,
  );
}

/**
 * Get all checklist items for a specific priority.
 */
export function getDiscordParityItemsByPriority(
  priority: DiscordParityPriority,
): DiscordParityChecklistItem[] {
  return discordParityChecklist.items.filter(
    (item) => item.priority === priority,
  );
}

/**
 * Get all checklist items for a specific status.
 */
export function getDiscordParityItemsByStatus(
  status: DiscordParityStatus,
): DiscordParityChecklistItem[] {
  return discordParityChecklist.items.filter((item) => item.status === status);
}

/**
 * Get a specific checklist item by ID.
 */
export function getDiscordParityItemById(
  id: string,
): DiscordParityChecklistItem | undefined {
  return discordParityChecklist.items.find((item) => item.id === id);
}

/**
 * Verify that all critical items are implemented.
 */
export function verifyDiscordCriticalParity(): {
  passed: boolean;
  failedItems: DiscordParityChecklistItem[];
} {
  const criticalItems = getDiscordParityItemsByPriority("critical");
  const failedItems = criticalItems.filter(
    (item) => item.status !== "implemented" && item.status !== "not-applicable",
  );
  return {
    passed: failedItems.length === 0,
    failedItems,
  };
}

/**
 * Get parity percentage for a specific category.
 */
export function getDiscordCategoryParityPercentage(
  category: DiscordParityCategory,
): number {
  const items = getDiscordParityItemsByCategory(category);
  return calculateParityPercentage(items);
}
