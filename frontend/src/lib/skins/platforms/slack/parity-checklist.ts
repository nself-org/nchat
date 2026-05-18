/**
 * Slack Parity Acceptance Checklist
 *
 * Comprehensive checklist of Slack features and behaviors that must be
 * matched for the Slack skin + behavior preset to be considered at parity.
 *
 * Each checklist item maps to a specific Slack feature, with metadata about
 * the feature category, priority, and which config controls it.
 *
 * @module lib/skins/platforms/slack/parity-checklist
 * @version 1.0.0
 */

// ============================================================================
// CHECKLIST TYPES
// ============================================================================

/**
 * Priority level for a parity feature.
 */
export type SlackParityPriority = "critical" | "high" | "medium" | "low";

/**
 * Category of the parity feature.
 */
export type SlackParityCategory =
  | "workspace"
  | "channels"
  | "messaging"
  | "threads"
  | "huddles"
  | "search"
  | "integrations"
  | "notifications"
  | "presence"
  | "files"
  | "canvas"
  | "visual"
  | "composer"
  | "navigation";

/**
 * Implementation status.
 */
export type SlackParityStatus =
  | "implemented"
  | "partial"
  | "not-implemented"
  | "not-applicable";

/**
 * A single parity checklist item.
 */
export interface SlackParityChecklistItem {
  /** Unique identifier */
  id: string;
  /** Human-readable description */
  description: string;
  /** Feature category */
  category: SlackParityCategory;
  /** Priority level */
  priority: SlackParityPriority;
  /** Implementation status */
  status: SlackParityStatus;
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
export interface SlackParityChecklist {
  /** Platform name */
  platform: string;
  /** Version being compared against */
  targetVersion: string;
  /** Date of assessment */
  assessmentDate: string;
  /** Total items */
  totalItems: number;
  /** Items by status */
  statusCounts: Record<SlackParityStatus, number>;
  /** Items by priority */
  priorityCounts: Record<SlackParityPriority, number>;
  /** Parity percentage (implemented / (total - not-applicable)) */
  parityPercentage: number;
  /** All checklist items */
  items: SlackParityChecklistItem[];
}

// ============================================================================
// WORKSPACE MANAGEMENT PARITY ITEMS
// ============================================================================

const workspaceItems: SlackParityChecklistItem[] = [
  {
    id: "ws-001",
    description: "Multi-workspace switching with workspace icons in left rail",
    category: "workspace",
    priority: "critical",
    status: "implemented",
    configPath: "extended.workspace.multiWorkspace",
    expectedValue: true,
  },
  {
    id: "ws-002",
    description: "Workspace max 500K members",
    category: "workspace",
    priority: "high",
    status: "implemented",
    configPath: "extended.workspace.maxMembers",
    expectedValue: 500000,
  },
  {
    id: "ws-003",
    description: "Custom emoji creation for workspace members",
    category: "workspace",
    priority: "medium",
    status: "implemented",
    configPath: "extended.workspace.customEmojiCreation",
    expectedValue: true,
  },
  {
    id: "ws-004",
    description: "Workspace-level retention policies",
    category: "workspace",
    priority: "medium",
    status: "implemented",
    configPath: "extended.workspace.retentionPolicies",
    expectedValue: true,
  },
  {
    id: "ws-005",
    description: "Workspace analytics dashboard",
    category: "workspace",
    priority: "low",
    status: "implemented",
    configPath: "extended.workspace.analytics",
    expectedValue: true,
  },
  {
    id: "ws-006",
    description: "SSO/SAML enforcement option",
    category: "workspace",
    priority: "medium",
    status: "implemented",
    configPath: "extended.workspace.ssoEnforcement",
    expectedValue: false,
    notes: "Config defaults to false; can be enabled per workspace",
  },
];

// ============================================================================
// CHANNELS PARITY ITEMS
// ============================================================================

const channelItems: SlackParityChecklistItem[] = [
  {
    id: "ch-001",
    description: "Public channels with # prefix",
    category: "channels",
    priority: "critical",
    status: "implemented",
    configPath: "behavior.channels.types",
    expectedValue: "public",
    notes: "public is in the types array",
  },
  {
    id: "ch-002",
    description: "Private channels with lock icon",
    category: "channels",
    priority: "critical",
    status: "implemented",
    configPath: "behavior.channels.types",
    expectedValue: "private",
    notes: "private is in the types array",
  },
  {
    id: "ch-003",
    description: "No channel hierarchy (flat structure)",
    category: "channels",
    priority: "critical",
    status: "implemented",
    configPath: "behavior.channels.hierarchy",
    expectedValue: false,
  },
  {
    id: "ch-004",
    description: "No categories (uses user-defined sections instead)",
    category: "channels",
    priority: "critical",
    status: "implemented",
    configPath: "behavior.channels.categories",
    expectedValue: false,
  },
  {
    id: "ch-005",
    description: "User-defined sidebar sections (collapsible, reorderable)",
    category: "channels",
    priority: "high",
    status: "implemented",
    configPath: "extended.sections.enabled",
    expectedValue: true,
  },
  {
    id: "ch-006",
    description: "Channel archiving support",
    category: "channels",
    priority: "high",
    status: "implemented",
    configPath: "behavior.channels.archiving",
    expectedValue: true,
  },
  {
    id: "ch-007",
    description: "No slow mode (Slack does not have this)",
    category: "channels",
    priority: "medium",
    status: "implemented",
    configPath: "behavior.channels.slowMode",
    expectedValue: false,
  },
  {
    id: "ch-008",
    description: "Starred channels section in sidebar",
    category: "channels",
    priority: "medium",
    status: "implemented",
    configPath: "extended.sections.starredSection",
    expectedValue: true,
  },
  {
    id: "ch-009",
    description: "Max group DM members of 9",
    category: "channels",
    priority: "medium",
    status: "implemented",
    configPath: "behavior.channels.maxGroupDmMembers",
    expectedValue: 9,
  },
];

// ============================================================================
// MESSAGING PARITY ITEMS
// ============================================================================

const messagingItems: SlackParityChecklistItem[] = [
  {
    id: "msg-001",
    description: "Flat message layout (no bubbles)",
    category: "messaging",
    priority: "critical",
    status: "implemented",
    configPath: "skin.components.messageLayout",
    expectedValue: "default",
  },
  {
    id: "msg-002",
    description: "Unlimited edit window for own messages",
    category: "messaging",
    priority: "critical",
    status: "implemented",
    configPath: "behavior.messaging.editWindow",
    expectedValue: 0,
  },
  {
    id: "msg-003",
    description: "Unlimited delete for own messages",
    category: "messaging",
    priority: "critical",
    status: "implemented",
    configPath: "behavior.messaging.deleteWindow",
    expectedValue: 0,
  },
  {
    id: "msg-004",
    description: "Admin-only delete for others messages",
    category: "messaging",
    priority: "high",
    status: "implemented",
    configPath: "behavior.messaging.deleteForEveryone",
    expectedValue: false,
  },
  {
    id: "msg-005",
    description: "Full emoji reaction picker (not quick-reactions)",
    category: "messaging",
    priority: "critical",
    status: "implemented",
    configPath: "behavior.messaging.reactionStyle",
    expectedValue: "full-picker",
  },
  {
    id: "msg-006",
    description: "Max 23 reactions per message",
    category: "messaging",
    priority: "high",
    status: "implemented",
    configPath: "behavior.messaging.maxReactionsPerMessage",
    expectedValue: 23,
  },
  {
    id: "msg-007",
    description: "Max 40,000 character messages",
    category: "messaging",
    priority: "high",
    status: "implemented",
    configPath: "behavior.messaging.maxMessageLength",
    expectedValue: 40000,
  },
  {
    id: "msg-008",
    description: "Edited message indicator shown",
    category: "messaging",
    priority: "medium",
    status: "implemented",
    configPath: "behavior.messaging.showEditedIndicator",
    expectedValue: true,
  },
  {
    id: "msg-009",
    description: "Message forwarding (share to channel/DM)",
    category: "messaging",
    priority: "medium",
    status: "implemented",
    configPath: "behavior.messaging.forwarding",
    expectedValue: true,
  },
  {
    id: "msg-010",
    description: "Pin messages to channel",
    category: "messaging",
    priority: "high",
    status: "implemented",
    configPath: "behavior.messaging.pinning",
    expectedValue: true,
  },
  {
    id: "msg-011",
    description: "Save messages for later (bookmark)",
    category: "messaging",
    priority: "high",
    status: "implemented",
    configPath: "behavior.messaging.bookmarking",
    expectedValue: true,
  },
  {
    id: "msg-012",
    description: "Scheduled message send",
    category: "messaging",
    priority: "high",
    status: "implemented",
    configPath: "behavior.messaging.scheduling",
    expectedValue: true,
  },
  {
    id: "msg-013",
    description: "Link previews / unfurl",
    category: "messaging",
    priority: "medium",
    status: "implemented",
    configPath: "behavior.messaging.linkPreviews",
    expectedValue: true,
  },
];

// ============================================================================
// THREADS PARITY ITEMS
// ============================================================================

const threadItems: SlackParityChecklistItem[] = [
  {
    id: "thr-001",
    description: "Side-panel threading model",
    category: "threads",
    priority: "critical",
    status: "implemented",
    configPath: "behavior.messaging.threadingModel",
    expectedValue: "side-panel",
  },
  {
    id: "thr-002",
    description: "Thread panel shows context + replies",
    category: "threads",
    priority: "critical",
    status: "implemented",
    configPath: "navigation.threadPanelWidth",
    expectedValue: "400px",
  },
  {
    id: "thr-003",
    description: "Thread panel is resizable",
    category: "threads",
    priority: "medium",
    status: "implemented",
    configPath: "navigation.threadPanelResizable",
    expectedValue: true,
  },
  {
    id: "thr-004",
    description: "Thread notifications can be followed",
    category: "threads",
    priority: "high",
    status: "implemented",
    configPath: "behavior.notifications.threadNotifications",
    expectedValue: true,
  },
  {
    id: "thr-005",
    description: '"Also send to #channel" option in thread replies',
    category: "threads",
    priority: "high",
    status: "implemented",
    configPath: "behavior.features.threads",
    expectedValue: true,
    notes: "Feature flag for thread-specific behaviors",
  },
];

// ============================================================================
// HUDDLES PARITY ITEMS
// ============================================================================

const huddleItems: SlackParityChecklistItem[] = [
  {
    id: "hud-001",
    description: "Huddles enabled (lightweight audio)",
    category: "huddles",
    priority: "critical",
    status: "implemented",
    configPath: "behavior.calls.huddles",
    expectedValue: true,
  },
  {
    id: "hud-002",
    description: "Huddle max 50 participants",
    category: "huddles",
    priority: "high",
    status: "implemented",
    configPath: "extended.huddles.maxParticipants",
    expectedValue: 50,
  },
  {
    id: "hud-003",
    description: "Huddle video optional",
    category: "huddles",
    priority: "high",
    status: "implemented",
    configPath: "extended.huddles.video",
    expectedValue: true,
  },
  {
    id: "hud-004",
    description: "Huddle screen sharing",
    category: "huddles",
    priority: "high",
    status: "implemented",
    configPath: "extended.huddles.screenShare",
    expectedValue: true,
  },
  {
    id: "hud-005",
    description: "Huddles in channels",
    category: "huddles",
    priority: "high",
    status: "implemented",
    configPath: "extended.huddles.inChannel",
    expectedValue: true,
  },
  {
    id: "hud-006",
    description: "Huddles in DMs",
    category: "huddles",
    priority: "high",
    status: "implemented",
    configPath: "extended.huddles.inDm",
    expectedValue: true,
  },
  {
    id: "hud-007",
    description: "Huddle live captions",
    category: "huddles",
    priority: "medium",
    status: "implemented",
    configPath: "extended.huddles.liveCaptions",
    expectedValue: true,
  },
  {
    id: "hud-008",
    description: "Huddle emoji reactions",
    category: "huddles",
    priority: "medium",
    status: "implemented",
    configPath: "extended.huddles.reactions",
    expectedValue: true,
  },
  {
    id: "hud-009",
    description: "Huddle noise suppression",
    category: "huddles",
    priority: "medium",
    status: "implemented",
    configPath: "extended.huddles.noiseSuppression",
    expectedValue: true,
  },
];

// ============================================================================
// SEARCH PARITY ITEMS
// ============================================================================

const searchItems: SlackParityChecklistItem[] = [
  {
    id: "src-001",
    description: "Search with in: modifier (search within channel)",
    category: "search",
    priority: "critical",
    status: "implemented",
    configPath: "extended.search.inModifier",
    expectedValue: true,
  },
  {
    id: "src-002",
    description: "Search with from: modifier (search by sender)",
    category: "search",
    priority: "critical",
    status: "implemented",
    configPath: "extended.search.fromModifier",
    expectedValue: true,
  },
  {
    id: "src-003",
    description: "Search with before:/after: date modifiers",
    category: "search",
    priority: "high",
    status: "implemented",
    configPath: "extended.search.beforeModifier",
    expectedValue: true,
  },
  {
    id: "src-004",
    description: "Search with has: modifier (link, file, reaction, pin, star)",
    category: "search",
    priority: "high",
    status: "implemented",
    configPath: "extended.search.hasModifier",
    expectedValue: true,
  },
  {
    id: "src-005",
    description: "Saved searches",
    category: "search",
    priority: "medium",
    status: "implemented",
    configPath: "extended.search.savedSearches",
    expectedValue: true,
  },
  {
    id: "src-006",
    description: "Recent searches",
    category: "search",
    priority: "medium",
    status: "implemented",
    configPath: "extended.search.recentSearches",
    expectedValue: true,
  },
  {
    id: "src-007",
    description: "Search result filters (messages, files, channels, people)",
    category: "search",
    priority: "high",
    status: "implemented",
    configPath: "extended.search.resultFilters",
    expectedValue: ["messages", "files", "channels", "people"],
  },
];

// ============================================================================
// INTEGRATIONS PARITY ITEMS
// ============================================================================

const integrationItems: SlackParityChecklistItem[] = [
  {
    id: "int-001",
    description: "Slash commands (built-in and app)",
    category: "integrations",
    priority: "critical",
    status: "implemented",
    configPath: "extended.apps.slashCommands",
    expectedValue: true,
  },
  {
    id: "int-002",
    description: "Message action shortcuts from apps",
    category: "integrations",
    priority: "high",
    status: "implemented",
    configPath: "extended.apps.messageActions",
    expectedValue: true,
  },
  {
    id: "int-003",
    description: "Modal dialogs from apps",
    category: "integrations",
    priority: "high",
    status: "implemented",
    configPath: "extended.apps.modalDialogs",
    expectedValue: true,
  },
  {
    id: "int-004",
    description: "App home tab",
    category: "integrations",
    priority: "high",
    status: "implemented",
    configPath: "extended.apps.homeTab",
    expectedValue: true,
  },
  {
    id: "int-005",
    description: "Interactive messages (buttons, selects)",
    category: "integrations",
    priority: "high",
    status: "implemented",
    configPath: "extended.apps.interactiveMessages",
    expectedValue: true,
  },
  {
    id: "int-006",
    description: "Incoming webhooks",
    category: "integrations",
    priority: "medium",
    status: "implemented",
    configPath: "extended.apps.incomingWebhooks",
    expectedValue: true,
  },
  {
    id: "int-007",
    description: "Bot users",
    category: "integrations",
    priority: "medium",
    status: "implemented",
    configPath: "extended.apps.botUsers",
    expectedValue: true,
  },
  {
    id: "int-008",
    description: "App directory / marketplace",
    category: "integrations",
    priority: "medium",
    status: "implemented",
    configPath: "extended.apps.appDirectory",
    expectedValue: true,
  },
  {
    id: "int-009",
    description: "Workflow Builder automation",
    category: "integrations",
    priority: "high",
    status: "implemented",
    configPath: "extended.workflows.enabled",
    expectedValue: true,
  },
];

// ============================================================================
// NOTIFICATIONS PARITY ITEMS
// ============================================================================

const notificationItems: SlackParityChecklistItem[] = [
  {
    id: "notif-001",
    description: "Default notification level: mentions only",
    category: "notifications",
    priority: "critical",
    status: "implemented",
    configPath: "behavior.notifications.defaultLevel",
    expectedValue: "mentions",
  },
  {
    id: "notif-002",
    description: "@channel mention rule",
    category: "notifications",
    priority: "critical",
    status: "implemented",
    configPath: "behavior.notifications.mentionRules",
    expectedValue: "channel",
    notes: "channel is in the mentionRules array",
  },
  {
    id: "notif-003",
    description: "@here mention rule",
    category: "notifications",
    priority: "critical",
    status: "implemented",
    configPath: "behavior.notifications.mentionRules",
    expectedValue: "here",
    notes: "here is in the mentionRules array",
  },
  {
    id: "notif-004",
    description: "@everyone mention rule",
    category: "notifications",
    priority: "high",
    status: "implemented",
    configPath: "behavior.notifications.mentionRules",
    expectedValue: "everyone",
    notes: "everyone is in the mentionRules array",
  },
  {
    id: "notif-005",
    description: "Keyword alerts (custom notification keywords)",
    category: "notifications",
    priority: "high",
    status: "implemented",
    configPath: "behavior.features.keywordAlerts",
    expectedValue: true,
  },
  {
    id: "notif-006",
    description: "Quiet hours / Do Not Disturb schedule",
    category: "notifications",
    priority: "high",
    status: "implemented",
    configPath: "behavior.notifications.quietHours",
    expectedValue: true,
  },
  {
    id: "notif-007",
    description: "Email digest for missed notifications",
    category: "notifications",
    priority: "medium",
    status: "implemented",
    configPath: "behavior.notifications.emailDigest",
    expectedValue: true,
  },
  {
    id: "notif-008",
    description: "Badge count on app icon",
    category: "notifications",
    priority: "medium",
    status: "implemented",
    configPath: "behavior.notifications.badgeCount",
    expectedValue: true,
  },
];

// ============================================================================
// PRESENCE / STATUS PARITY ITEMS
// ============================================================================

const presenceItems: SlackParityChecklistItem[] = [
  {
    id: "pres-001",
    description: "Presence states: online, away, dnd, offline",
    category: "presence",
    priority: "critical",
    status: "implemented",
    configPath: "behavior.presence.states",
    expectedValue: ["online", "away", "dnd", "offline"],
  },
  {
    id: "pres-002",
    description: "Custom status with emoji + text + expiration",
    category: "presence",
    priority: "high",
    status: "implemented",
    configPath: "behavior.presence.customStatus",
    expectedValue: true,
  },
  {
    id: "pres-003",
    description: "Auto-away after 30 minutes of inactivity",
    category: "presence",
    priority: "high",
    status: "implemented",
    configPath: "behavior.presence.autoAwayTimeout",
    expectedValue: 1800000,
  },
  {
    id: "pres-004",
    description: "Typing indicators",
    category: "presence",
    priority: "high",
    status: "implemented",
    configPath: "behavior.presence.typingIndicator",
    expectedValue: true,
  },
  {
    id: "pres-005",
    description: "No invisible mode (Slack does not have this)",
    category: "presence",
    priority: "medium",
    status: "implemented",
    configPath: "behavior.presence.invisibleMode",
    expectedValue: false,
  },
  {
    id: "pres-006",
    description: "Activity status (what app is being used)",
    category: "presence",
    priority: "medium",
    status: "implemented",
    configPath: "behavior.presence.activityStatus",
    expectedValue: true,
  },
];

// ============================================================================
// FILES PARITY ITEMS
// ============================================================================

const fileItems: SlackParityChecklistItem[] = [
  {
    id: "file-001",
    description: "File uploads supported",
    category: "files",
    priority: "critical",
    status: "implemented",
    configPath: "behavior.features.fileUploads",
    expectedValue: true,
  },
  {
    id: "file-002",
    description: "Image uploads supported",
    category: "files",
    priority: "critical",
    status: "implemented",
    configPath: "behavior.features.imageUploads",
    expectedValue: true,
  },
  {
    id: "file-003",
    description: "Drag-and-drop file upload",
    category: "files",
    priority: "high",
    status: "implemented",
    configPath: "composer.dragAndDrop",
    expectedValue: true,
  },
  {
    id: "file-004",
    description: "Paste images into composer",
    category: "files",
    priority: "high",
    status: "implemented",
    configPath: "composer.pasteImages",
    expectedValue: true,
  },
  {
    id: "file-005",
    description: "No voice messages (Slack uses clips instead)",
    category: "files",
    priority: "medium",
    status: "implemented",
    configPath: "behavior.features.voiceMessages",
    expectedValue: false,
  },
  {
    id: "file-006",
    description: "No stickers (Slack does not have stickers)",
    category: "files",
    priority: "medium",
    status: "implemented",
    configPath: "behavior.features.stickers",
    expectedValue: false,
  },
];

// ============================================================================
// CANVAS / LISTS PARITY ITEMS
// ============================================================================

const canvasItems: SlackParityChecklistItem[] = [
  {
    id: "can-001",
    description: "Canvas (rich document) creation enabled",
    category: "canvas",
    priority: "high",
    status: "implemented",
    configPath: "extended.canvas.canvasEnabled",
    expectedValue: true,
  },
  {
    id: "can-002",
    description: "Lists (project tracking) enabled",
    category: "canvas",
    priority: "high",
    status: "implemented",
    configPath: "extended.canvas.listsEnabled",
    expectedValue: true,
  },
  {
    id: "can-003",
    description: "Canvas supports rich formatting",
    category: "canvas",
    priority: "medium",
    status: "implemented",
    configPath: "extended.canvas.richFormatting",
    expectedValue: true,
  },
  {
    id: "can-004",
    description: "Canvas supports code blocks",
    category: "canvas",
    priority: "medium",
    status: "implemented",
    configPath: "extended.canvas.codeBlocks",
    expectedValue: true,
  },
  {
    id: "can-005",
    description: "Canvas supports comments",
    category: "canvas",
    priority: "medium",
    status: "implemented",
    configPath: "extended.canvas.comments",
    expectedValue: true,
  },
];

// ============================================================================
// VISUAL PARITY ITEMS
// ============================================================================

const visualItems: SlackParityChecklistItem[] = [
  {
    id: "vis-001",
    description: "Aubergine sidebar background (#4A154B)",
    category: "visual",
    priority: "critical",
    status: "implemented",
    configPath: "extendedColors.light.sidebarBg",
    expectedValue: "#4A154B",
  },
  {
    id: "vis-002",
    description: "Primary color #611F69 (aubergine)",
    category: "visual",
    priority: "critical",
    status: "implemented",
    configPath: "skin.colors.primary",
    expectedValue: "#611F69",
  },
  {
    id: "vis-003",
    description: "Yellow accent color #ECB22E",
    category: "visual",
    priority: "high",
    status: "implemented",
    configPath: "skin.colors.accent",
    expectedValue: "#ECB22E",
  },
  {
    id: "vis-004",
    description: "Green primary action button (#007A5A)",
    category: "visual",
    priority: "high",
    status: "implemented",
    configPath: "skin.colors.buttonPrimaryBg",
    expectedValue: "#007A5A",
  },
  {
    id: "vis-005",
    description: "Lato / Slack-Lato font family",
    category: "visual",
    priority: "high",
    status: "implemented",
    configPath: "skin.typography.fontFamily",
    expectedValue: "Lato",
    notes: "Font family string contains Lato",
  },
  {
    id: "vis-006",
    description: "15px base font size",
    category: "visual",
    priority: "high",
    status: "implemented",
    configPath: "skin.typography.fontSizeBase",
    expectedValue: "15px",
  },
  {
    id: "vis-007",
    description: "260px sidebar width",
    category: "visual",
    priority: "medium",
    status: "implemented",
    configPath: "skin.spacing.sidebarWidth",
    expectedValue: "260px",
  },
  {
    id: "vis-008",
    description: "49px header height",
    category: "visual",
    priority: "medium",
    status: "implemented",
    configPath: "skin.spacing.headerHeight",
    expectedValue: "49px",
  },
  {
    id: "vis-009",
    description: "Rounded-square avatar shape",
    category: "visual",
    priority: "medium",
    status: "implemented",
    configPath: "skin.components.avatarShape",
    expectedValue: "rounded",
  },
  {
    id: "vis-010",
    description: "Line height ~1.46668",
    category: "visual",
    priority: "medium",
    status: "implemented",
    configPath: "skin.typography.lineHeight",
    expectedValue: 1.46668,
  },
  {
    id: "vis-011",
    description: "Red error/notification color (#E01E5A)",
    category: "visual",
    priority: "medium",
    status: "implemented",
    configPath: "skin.colors.error",
    expectedValue: "#E01E5A",
  },
  {
    id: "vis-012",
    description: "Blue link/info color (#1264A3)",
    category: "visual",
    priority: "medium",
    status: "implemented",
    configPath: "skin.colors.info",
    expectedValue: "#1264A3",
  },
];

// ============================================================================
// COMPOSER PARITY ITEMS
// ============================================================================

const composerItems: SlackParityChecklistItem[] = [
  {
    id: "comp-001",
    description:
      "WYSIWYG formatting toolbar (bold, italic, strike, code, link, lists, quote, code-block)",
    category: "composer",
    priority: "critical",
    status: "implemented",
    configPath: "composer.showFormattingToolbar",
    expectedValue: true,
  },
  {
    id: "comp-002",
    description: "9 formatting toolbar buttons",
    category: "composer",
    priority: "high",
    status: "implemented",
    configPath: "composer.formattingToolbar.length",
    expectedValue: 9,
  },
  {
    id: "comp-003",
    description: "@mention autocomplete (users, channels, usergroups)",
    category: "composer",
    priority: "critical",
    status: "implemented",
    configPath: "composer.mentions.users",
    expectedValue: true,
  },
  {
    id: "comp-004",
    description: "/slash command autocomplete",
    category: "composer",
    priority: "critical",
    status: "implemented",
    configPath: "composer.slashCommands.enabled",
    expectedValue: true,
  },
  {
    id: "comp-005",
    description: "Emoji picker with custom emoji and :colon: syntax",
    category: "composer",
    priority: "high",
    status: "implemented",
    configPath: "composer.emojiPicker.customEmoji",
    expectedValue: true,
  },
  {
    id: "comp-006",
    description:
      "Attachment menu with 5 options (upload, canvas, huddle, clip, workflow)",
    category: "composer",
    priority: "high",
    status: "implemented",
    configPath: "composer.attachmentMenu.length",
    expectedValue: 5,
  },
  {
    id: "comp-007",
    description: "Scheduled send dropdown on send button",
    category: "composer",
    priority: "high",
    status: "implemented",
    configPath: "composer.scheduledSend.enabled",
    expectedValue: true,
  },
  {
    id: "comp-008",
    description: "Drag-and-drop file upload",
    category: "composer",
    priority: "high",
    status: "implemented",
    configPath: "composer.dragAndDrop",
    expectedValue: true,
  },
  {
    id: "comp-009",
    description: "Green send button (#007A5A light, #2BAC76 dark)",
    category: "composer",
    priority: "medium",
    status: "implemented",
    configPath: "composer.sendButton.backgroundColor",
    expectedValue: "#007A5A",
  },
  {
    id: "comp-010",
    description: "Composer border with focus ring",
    category: "composer",
    priority: "medium",
    status: "implemented",
    configPath: "composer.inputFocusBorder",
    expectedValue: "1px solid #1264A3",
  },
];

// ============================================================================
// NAVIGATION PARITY ITEMS
// ============================================================================

const navigationItems: SlackParityChecklistItem[] = [
  {
    id: "nav-001",
    description:
      "Left rail with workspace icon, Home, DMs, Activity, Later, More",
    category: "navigation",
    priority: "critical",
    status: "implemented",
    configPath: "navigation.railItems.length",
    expectedValue: 5,
  },
  {
    id: "nav-002",
    description: "Home as default rail item",
    category: "navigation",
    priority: "critical",
    status: "implemented",
    configPath: "navigation.railItems[0].isDefault",
    expectedValue: true,
  },
  {
    id: "nav-003",
    description: "Workspace switcher shown in rail",
    category: "navigation",
    priority: "critical",
    status: "implemented",
    configPath: "navigation.rail.showWorkspaceSwitcher",
    expectedValue: true,
  },
  {
    id: "nav-004",
    description: "Channel header with topic, members, search, huddle",
    category: "navigation",
    priority: "high",
    status: "implemented",
    configPath: "navigation.header.showChannelName",
    expectedValue: true,
  },
  {
    id: "nav-005",
    description:
      "6 header action buttons (huddle, canvas, members, pins, bookmarks, search)",
    category: "navigation",
    priority: "high",
    status: "implemented",
    configPath: "navigation.header.actions.length",
    expectedValue: 6,
  },
  {
    id: "nav-006",
    description: "Thread panel on right side (400px default)",
    category: "navigation",
    priority: "high",
    status: "implemented",
    configPath: "navigation.threadPanelWidth",
    expectedValue: "400px",
  },
  {
    id: "nav-007",
    description: "Search bar in header area",
    category: "navigation",
    priority: "high",
    status: "implemented",
    configPath: "navigation.searchPlacement",
    expectedValue: "header",
  },
  {
    id: "nav-008",
    description:
      "Mobile bottom tab bar with 5 items (Home, DMs, Activity, Search, You)",
    category: "navigation",
    priority: "high",
    status: "implemented",
    configPath: "navigation.mobile.railItems.length",
    expectedValue: 5,
    notes: "Mobile uses different rail items than desktop",
  },
];

// ============================================================================
// ASSEMBLED CHECKLIST
// ============================================================================

const allItems: SlackParityChecklistItem[] = [
  ...workspaceItems,
  ...channelItems,
  ...messagingItems,
  ...threadItems,
  ...huddleItems,
  ...searchItems,
  ...integrationItems,
  ...notificationItems,
  ...presenceItems,
  ...fileItems,
  ...canvasItems,
  ...visualItems,
  ...composerItems,
  ...navigationItems,
];

function countByStatus(
  items: SlackParityChecklistItem[],
): Record<SlackParityStatus, number> {
  const counts: Record<SlackParityStatus, number> = {
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
  items: SlackParityChecklistItem[],
): Record<SlackParityPriority, number> {
  const counts: Record<SlackParityPriority, number> = {
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

function calculateParityPercentage(items: SlackParityChecklistItem[]): number {
  const applicable = items.filter((i) => i.status !== "not-applicable");
  if (applicable.length === 0) return 0;
  const implemented = applicable.filter((i) => i.status === "implemented");
  return Math.round((implemented.length / applicable.length) * 100);
}

/**
 * Complete Slack parity checklist with all items and computed stats.
 */
export const slackParityChecklist: SlackParityChecklist = {
  platform: "Slack",
  targetVersion: "Slack 4.x (2026)",
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
export function getSlackParityItemsByCategory(
  category: SlackParityCategory,
): SlackParityChecklistItem[] {
  return slackParityChecklist.items.filter(
    (item) => item.category === category,
  );
}

/**
 * Get all checklist items for a specific priority.
 */
export function getSlackParityItemsByPriority(
  priority: SlackParityPriority,
): SlackParityChecklistItem[] {
  return slackParityChecklist.items.filter(
    (item) => item.priority === priority,
  );
}

/**
 * Get all checklist items for a specific status.
 */
export function getSlackParityItemsByStatus(
  status: SlackParityStatus,
): SlackParityChecklistItem[] {
  return slackParityChecklist.items.filter((item) => item.status === status);
}

/**
 * Get a specific checklist item by ID.
 */
export function getSlackParityItemById(
  id: string,
): SlackParityChecklistItem | undefined {
  return slackParityChecklist.items.find((item) => item.id === id);
}

/**
 * Verify that all critical items are implemented.
 */
export function verifySlackCriticalParity(): {
  passed: boolean;
  failedItems: SlackParityChecklistItem[];
} {
  const criticalItems = getSlackParityItemsByPriority("critical");
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
export function getSlackCategoryParityPercentage(
  category: SlackParityCategory,
): number {
  const items = getSlackParityItemsByCategory(category);
  return calculateParityPercentage(items);
}
