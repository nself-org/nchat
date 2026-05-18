// ===============================================================================
// Slack Feature Set - Complete Feature Parity
// ===============================================================================
//
// Complete enumeration of all Slack features with resolved implementation status.
// Every feature is either 'enabled' or 'disabled' with a documented policy reason.
//
// Previously this file used 'placeholder' and 'partial' statuses. Task 117
// resolved all ambiguous entries to match the pattern established by Task 118
// (Telegram) and Task 119 (Discord).
//
// ===============================================================================

// ---------------------------------------------------------------------------
// Feature Status Types (narrowed - no placeholder/partial)
// ---------------------------------------------------------------------------

export type FeatureStatus = "enabled" | "disabled";

export interface SlackFeature {
  id: string;
  name: string;
  description: string;
  status: FeatureStatus;
  category: SlackFeatureCategory;
  icon: string;
  dependencies?: string[];
  settings?: Record<string, unknown>;
  /** Reason why the feature is disabled (only present when status is 'disabled') */
  disabledReason?: string;
}

export type SlackFeatureCategory =
  | "channels"
  | "dms"
  | "messaging"
  | "threads"
  | "search"
  | "files"
  | "apps"
  | "calls"
  | "workflow"
  | "admin"
  | "notifications"
  | "accessibility";

// ---------------------------------------------------------------------------
// Channel Features
// ---------------------------------------------------------------------------

export const CHANNEL_FEATURES: SlackFeature[] = [
  {
    id: "public-channels",
    name: "Public Channels",
    description: "Open channels anyone in the workspace can join",
    status: "enabled",
    category: "channels",
    icon: "Hash",
  },
  {
    id: "private-channels",
    name: "Private Channels",
    description: "Invite-only channels with restricted access",
    status: "enabled",
    category: "channels",
    icon: "Lock",
  },
  {
    id: "channel-sections",
    name: "Channel Sections",
    description: "Organize channels into custom sections in the sidebar",
    status: "enabled",
    category: "channels",
    icon: "LayoutList",
  },
  {
    id: "channel-bookmarks",
    name: "Channel Bookmarks",
    description: "Pin links and files to the top of a channel",
    status: "enabled",
    category: "channels",
    icon: "Bookmark",
  },
  {
    id: "channel-description",
    name: "Channel Description",
    description: "Set a description and topic for channels",
    status: "enabled",
    category: "channels",
    icon: "FileText",
  },
  {
    id: "channel-settings",
    name: "Channel Settings",
    description: "Configure notifications, posting permissions, and more",
    status: "enabled",
    category: "channels",
    icon: "Settings",
  },
  {
    id: "shared-channels",
    name: "Shared Channels",
    description: "Connect channels across different workspaces",
    status: "disabled",
    category: "channels",
    icon: "Share2",
    disabledReason:
      "Cross-workspace channel federation requires a multi-tenant routing layer and trust " +
      "establishment protocol that is outside the scope of the current single-workspace architecture. " +
      "This is a Slack Enterprise Grid feature with no equivalent in the current deployment model.",
  },
  {
    id: "channel-archive",
    name: "Channel Archive",
    description: "Archive inactive channels to keep workspace organized",
    status: "enabled",
    category: "channels",
    icon: "Archive",
  },
  {
    id: "default-channels",
    name: "Default Channels",
    description: "Channels new members automatically join",
    status: "enabled",
    category: "channels",
    icon: "UserPlus",
  },
];

// ---------------------------------------------------------------------------
// Direct Message Features
// ---------------------------------------------------------------------------

export const DM_FEATURES: SlackFeature[] = [
  {
    id: "direct-messages",
    name: "Direct Messages",
    description: "Private 1:1 conversations",
    status: "enabled",
    category: "dms",
    icon: "MessageSquare",
  },
  {
    id: "group-dms",
    name: "Group Direct Messages",
    description: "Private conversations with up to 9 people",
    status: "enabled",
    category: "dms",
    icon: "Users",
    settings: { maxMembers: 9 },
  },
  {
    id: "dm-mute",
    name: "Mute DMs",
    description: "Silence notifications from specific conversations",
    status: "enabled",
    category: "dms",
    icon: "BellOff",
  },
  {
    id: "dm-star",
    name: "Star DMs",
    description: "Keep important conversations easily accessible",
    status: "enabled",
    category: "dms",
    icon: "Star",
  },
];

// ---------------------------------------------------------------------------
// Messaging Features
// ---------------------------------------------------------------------------

export const MESSAGING_FEATURES: SlackFeature[] = [
  {
    id: "rich-text",
    name: "Rich Text Formatting",
    description: "Bold, italic, strikethrough, code, and more",
    status: "enabled",
    category: "messaging",
    icon: "Type",
    settings: {
      formatting: [
        "bold",
        "italic",
        "strikethrough",
        "code",
        "blockquote",
        "ordered_list",
        "unordered_list",
      ],
    },
  },
  {
    id: "markdown",
    name: "Markdown Support",
    description: "Write messages using markdown syntax",
    status: "enabled",
    category: "messaging",
    icon: "Code",
  },
  {
    id: "emoji",
    name: "Emoji",
    description: "Express yourself with emoji",
    status: "enabled",
    category: "messaging",
    icon: "Smile",
  },
  {
    id: "custom-emoji",
    name: "Custom Emoji",
    description: "Upload and use custom emoji in your workspace",
    status: "enabled",
    category: "messaging",
    icon: "ImagePlus",
  },
  {
    id: "reactions",
    name: "Message Reactions",
    description: "React to messages with emoji",
    status: "enabled",
    category: "messaging",
    icon: "SmilePlus",
  },
  {
    id: "mentions",
    name: "@Mentions",
    description: "Mention users, channels, @here, and @channel",
    status: "enabled",
    category: "messaging",
    icon: "AtSign",
  },
  {
    id: "mention-here",
    name: "@here Mention",
    description: "Notify all active members in a channel",
    status: "enabled",
    category: "messaging",
    icon: "AtSign",
    dependencies: ["mentions"],
  },
  {
    id: "mention-channel",
    name: "@channel Mention",
    description: "Notify all members in a channel",
    status: "enabled",
    category: "messaging",
    icon: "AtSign",
    dependencies: ["mentions"],
  },
  {
    id: "mention-everyone",
    name: "@everyone Mention",
    description: "Notify everyone in the workspace",
    status: "enabled",
    category: "messaging",
    icon: "AtSign",
    dependencies: ["mentions"],
  },
  {
    id: "link-previews",
    name: "Link Previews",
    description: "Automatically unfurl links with rich previews",
    status: "enabled",
    category: "messaging",
    icon: "Link",
  },
  {
    id: "code-blocks",
    name: "Code Blocks",
    description: "Share code with syntax highlighting",
    status: "enabled",
    category: "messaging",
    icon: "Code2",
  },
  {
    id: "code-snippets",
    name: "Code Snippets",
    description: "Create titled code snippets with language selection",
    status: "enabled",
    category: "messaging",
    icon: "FileCode",
  },
  {
    id: "message-edit",
    name: "Edit Messages",
    description: "Edit your sent messages",
    status: "enabled",
    category: "messaging",
    icon: "Pencil",
  },
  {
    id: "message-delete",
    name: "Delete Messages",
    description: "Delete your sent messages",
    status: "enabled",
    category: "messaging",
    icon: "Trash2",
  },
  {
    id: "message-pin",
    name: "Pin Messages",
    description: "Pin important messages to a channel",
    status: "enabled",
    category: "messaging",
    icon: "Pin",
  },
  {
    id: "message-bookmark",
    name: "Save Messages",
    description: "Save messages to your Later list",
    status: "enabled",
    category: "messaging",
    icon: "Bookmark",
  },
  {
    id: "message-share",
    name: "Share Messages",
    description: "Forward messages to other channels or DMs",
    status: "enabled",
    category: "messaging",
    icon: "Forward",
  },
  {
    id: "message-link",
    name: "Copy Message Link",
    description: "Get a direct link to any message",
    status: "enabled",
    category: "messaging",
    icon: "Link2",
  },
  {
    id: "scheduled-messages",
    name: "Scheduled Messages",
    description: "Schedule messages to send later",
    status: "enabled",
    category: "messaging",
    icon: "Calendar",
  },
  {
    id: "message-reminders",
    name: "Message Reminders",
    description: "Set reminders for messages",
    status: "enabled",
    category: "messaging",
    icon: "Bell",
  },
  {
    id: "typing-indicators",
    name: "Typing Indicators",
    description: "See when others are typing",
    status: "enabled",
    category: "messaging",
    icon: "MoreHorizontal",
  },
];

// ---------------------------------------------------------------------------
// Thread Features
// ---------------------------------------------------------------------------

export const THREAD_FEATURES: SlackFeature[] = [
  {
    id: "threads",
    name: "Message Threads",
    description: "Reply to messages in threads to keep conversations organized",
    status: "enabled",
    category: "threads",
    icon: "MessageSquare",
  },
  {
    id: "thread-panel",
    name: "Thread Panel",
    description: "View and reply to threads in a dedicated side panel",
    status: "enabled",
    category: "threads",
    icon: "PanelRight",
    dependencies: ["threads"],
  },
  {
    id: "thread-broadcast",
    name: "Also Send to Channel",
    description: "Post thread replies to the main channel",
    status: "enabled",
    category: "threads",
    icon: "Send",
    dependencies: ["threads"],
  },
  {
    id: "thread-notifications",
    name: "Thread Notifications",
    description: "Get notified about new replies in threads you follow",
    status: "enabled",
    category: "threads",
    icon: "Bell",
    dependencies: ["threads"],
  },
  {
    id: "threads-view",
    name: "Threads View",
    description: "See all threads you're following in one place",
    status: "enabled",
    category: "threads",
    icon: "List",
    dependencies: ["threads"],
  },
  {
    id: "thread-unfollow",
    name: "Unfollow Thread",
    description: "Stop receiving notifications for a thread",
    status: "enabled",
    category: "threads",
    icon: "BellOff",
    dependencies: ["threads"],
  },
];

// ---------------------------------------------------------------------------
// Search Features
// ---------------------------------------------------------------------------

export const SEARCH_FEATURES: SlackFeature[] = [
  {
    id: "global-search",
    name: "Global Search",
    description: "Search messages, files, and people across the workspace",
    status: "enabled",
    category: "search",
    icon: "Search",
  },
  {
    id: "search-filters",
    name: "Search Filters",
    description: "Filter search by date, person, channel, and file type",
    status: "enabled",
    category: "search",
    icon: "Filter",
    dependencies: ["global-search"],
  },
  {
    id: "search-modifiers",
    name: "Search Modifiers",
    description: "Use from:, in:, has:, before:, after: and more",
    status: "enabled",
    category: "search",
    icon: "Terminal",
    dependencies: ["global-search"],
    settings: {
      modifiers: [
        "from:",
        "in:",
        "has:",
        "before:",
        "after:",
        "during:",
        "to:",
      ],
    },
  },
  {
    id: "quick-switcher",
    name: "Quick Switcher",
    description: "Quickly navigate to channels, DMs, and more with Cmd+K",
    status: "enabled",
    category: "search",
    icon: "Command",
    settings: {
      shortcut: { mac: "Cmd+K", windows: "Ctrl+K" },
    },
  },
  {
    id: "recent-searches",
    name: "Recent Searches",
    description: "Access your recent search queries",
    status: "enabled",
    category: "search",
    icon: "Clock",
    dependencies: ["global-search"],
  },
  {
    id: "saved-searches",
    name: "Saved Searches",
    description: "Save frequently used search queries",
    status: "enabled",
    category: "search",
    icon: "BookmarkPlus",
    dependencies: ["global-search"],
    settings: {
      maxSaved: 50,
      syncAcrossDevices: true,
    },
  },
];

// ---------------------------------------------------------------------------
// File Features
// ---------------------------------------------------------------------------

export const FILE_FEATURES: SlackFeature[] = [
  {
    id: "file-upload",
    name: "File Upload",
    description: "Upload and share files up to 1GB",
    status: "enabled",
    category: "files",
    icon: "Upload",
    settings: { maxFileSizeMB: 1024 },
  },
  {
    id: "drag-drop-upload",
    name: "Drag & Drop Upload",
    description: "Drag files directly into a channel to upload",
    status: "enabled",
    category: "files",
    icon: "MousePointerClick",
    dependencies: ["file-upload"],
  },
  {
    id: "clipboard-upload",
    name: "Paste from Clipboard",
    description: "Paste images and files directly from clipboard",
    status: "enabled",
    category: "files",
    icon: "Clipboard",
    dependencies: ["file-upload"],
  },
  {
    id: "file-preview",
    name: "File Preview",
    description: "Preview images, PDFs, and documents inline",
    status: "enabled",
    category: "files",
    icon: "Eye",
  },
  {
    id: "image-gallery",
    name: "Image Gallery",
    description: "View multiple images in a gallery view",
    status: "enabled",
    category: "files",
    icon: "GalleryHorizontal",
  },
  {
    id: "file-comments",
    name: "File Comments",
    description: "Add comments to uploaded files",
    status: "enabled",
    category: "files",
    icon: "MessageCircle",
  },
  {
    id: "file-search",
    name: "File Search",
    description: "Search for files by name, type, or content",
    status: "enabled",
    category: "files",
    icon: "FileSearch",
  },
  {
    id: "file-browser",
    name: "File Browser",
    description: "Browse all files shared in the workspace",
    status: "enabled",
    category: "files",
    icon: "FolderOpen",
  },
  {
    id: "external-files",
    name: "External Files",
    description: "Connect Google Drive, Dropbox, and other services",
    status: "disabled",
    category: "files",
    icon: "Cloud",
    disabledReason:
      "Third-party cloud storage integration (Google Drive, Dropbox, OneDrive) requires OAuth consent " +
      "flows and per-provider API adapters. The file upload system handles all storage natively via " +
      "MinIO/S3. External provider integration is a post-v1.0 enhancement.",
  },
];

// ---------------------------------------------------------------------------
// App & Integration Features
// ---------------------------------------------------------------------------

export const APP_FEATURES: SlackFeature[] = [
  {
    id: "slash-commands",
    name: "Slash Commands",
    description: "Trigger actions with / commands",
    status: "enabled",
    category: "apps",
    icon: "Terminal",
    settings: {
      builtIn: [
        "/giphy",
        "/remind",
        "/poll",
        "/mute",
        "/unmute",
        "/invite",
        "/leave",
        "/topic",
      ],
      customCommands: true,
    },
  },
  {
    id: "webhooks",
    name: "Incoming Webhooks",
    description: "Post messages from external services via webhook URLs",
    status: "enabled",
    category: "apps",
    icon: "Webhook",
    settings: {
      maxPerWorkspace: 100,
      payloadFormats: ["json", "form"],
    },
  },
  {
    id: "message-buttons",
    name: "Interactive Messages",
    description: "Messages with buttons, menus, and other interactive elements",
    status: "enabled",
    category: "apps",
    icon: "ToggleLeft",
    settings: {
      componentTypes: ["button", "select", "overflow", "datepicker"],
    },
  },
  {
    id: "bots",
    name: "Bot Users",
    description: "Automated bot users that can interact with members",
    status: "enabled",
    category: "apps",
    icon: "Bot",
    settings: {
      botApi: true,
      events: ["message", "reaction", "member_join", "channel_create"],
    },
  },
  {
    id: "app-directory",
    name: "App Directory",
    description: "Browse and install apps from a curated marketplace",
    status: "disabled",
    category: "apps",
    icon: "LayoutGrid",
    disabledReason:
      "A public app marketplace requires a review/approval pipeline, sandboxed execution, and a " +
      "developer portal. The bot SDK and webhook system provide extensibility without a marketplace. " +
      "App directory is a post-v1.0 platform feature.",
  },
  {
    id: "modals",
    name: "App Modals",
    description: "Full-featured modal dialogs for app interactions",
    status: "disabled",
    category: "apps",
    icon: "SquareStack",
    disabledReason:
      "App modals require a Block Kit renderer and modal lifecycle manager tied to the app directory " +
      "framework. Interactive messages provide equivalent inline interaction capability. " +
      "Modal support will be added alongside the app directory in a future release.",
    dependencies: ["app-directory"],
  },
  {
    id: "app-home",
    name: "App Home",
    description: "Dedicated tab for app interactions and settings",
    status: "disabled",
    category: "apps",
    icon: "Home",
    disabledReason:
      "App Home tabs require the app directory and Block Kit surface rendering. " +
      "Bot users can present configuration via slash commands and interactive messages. " +
      "App Home will be implemented alongside the app directory.",
    dependencies: ["app-directory"],
  },
];

// ---------------------------------------------------------------------------
// Calls & Huddles Features
// ---------------------------------------------------------------------------

export const CALL_FEATURES: SlackFeature[] = [
  {
    id: "huddles",
    name: "Huddles",
    description: "Lightweight audio calls in any channel or DM",
    status: "enabled",
    category: "calls",
    icon: "Headphones",
    settings: {
      maxParticipants: 50,
      alwaysOn: false,
      startFromChannel: true,
      startFromDM: true,
    },
  },
  {
    id: "huddle-video",
    name: "Huddle Video",
    description: "Turn on video during a huddle",
    status: "enabled",
    category: "calls",
    icon: "Video",
    dependencies: ["huddles"],
    settings: {
      maxVideoQuality: "720p",
    },
  },
  {
    id: "huddle-screenshare",
    name: "Huddle Screen Share",
    description: "Share your screen during a huddle",
    status: "enabled",
    category: "calls",
    icon: "Monitor",
    dependencies: ["huddles"],
  },
  {
    id: "huddle-thread",
    name: "Huddle Thread",
    description: "Text chat during a huddle",
    status: "enabled",
    category: "calls",
    icon: "MessageSquare",
    dependencies: ["huddles"],
  },
  {
    id: "huddle-reactions",
    name: "Huddle Reactions",
    description: "React with emoji during a huddle",
    status: "enabled",
    category: "calls",
    icon: "Smile",
    dependencies: ["huddles"],
  },
  {
    id: "clips",
    name: "Clips",
    description: "Record and share audio and video messages",
    status: "enabled",
    category: "calls",
    icon: "Clapperboard",
    settings: {
      maxDuration: 5 * 60 * 1000, // 5 minutes
      formats: ["audio", "video"],
      transcription: true,
    },
  },
];

// ---------------------------------------------------------------------------
// Workflow Features
// ---------------------------------------------------------------------------

export const WORKFLOW_FEATURES: SlackFeature[] = [
  {
    id: "workflow-builder",
    name: "Workflow Builder",
    description: "Create automated workflows without code",
    status: "disabled",
    category: "workflow",
    icon: "Workflow",
    disabledReason:
      "Workflow Builder requires a visual DAG editor, a step registry, and a server-side execution " +
      "engine. The webhook and bot SDK provide automation hooks. A no-code workflow builder is " +
      "planned as a premium post-v1.0 feature.",
  },
  {
    id: "workflow-forms",
    name: "Workflow Forms",
    description: "Collect information with custom forms",
    status: "disabled",
    category: "workflow",
    icon: "ClipboardList",
    dependencies: ["workflow-builder"],
    disabledReason:
      "Workflow forms depend on the Workflow Builder runtime to render, validate, and route form " +
      "submissions. They will be enabled when the Workflow Builder ships.",
  },
  {
    id: "workflow-triggers",
    name: "Workflow Triggers",
    description: "Start workflows from messages, emoji, or schedules",
    status: "disabled",
    category: "workflow",
    icon: "Zap",
    dependencies: ["workflow-builder"],
    disabledReason:
      "Workflow triggers are part of the Workflow Builder execution engine. Event-based automation " +
      "is currently available via webhooks and bot event subscriptions.",
  },
  {
    id: "canvas",
    name: "Canvas",
    description: "Collaborative documents within the workspace",
    status: "disabled",
    category: "workflow",
    icon: "FileText",
    disabledReason:
      "Canvas is a collaborative document editor requiring real-time CRDT synchronization, a block-based " +
      "document model, and inline embedding. This is a standalone product feature planned for post-v1.0. " +
      "Rich text messages and file sharing serve current documentation needs.",
  },
  {
    id: "lists",
    name: "Lists",
    description: "Track projects and tasks with collaborative lists",
    status: "disabled",
    category: "workflow",
    icon: "ListTodo",
    disabledReason:
      "Lists require a structured data store, real-time collaboration, and a dedicated UI surface. " +
      "This is a Slack-specific productivity tool planned for post-v1.0. Pinned messages and " +
      "bookmarks provide lightweight task tracking in the current release.",
  },
];

// ---------------------------------------------------------------------------
// Admin Features
// ---------------------------------------------------------------------------

export const ADMIN_FEATURES: SlackFeature[] = [
  {
    id: "user-management",
    name: "User Management",
    description: "Invite, manage, and remove workspace members",
    status: "enabled",
    category: "admin",
    icon: "Users",
  },
  {
    id: "user-groups",
    name: "User Groups",
    description: "Create groups of users for easier mentioning",
    status: "enabled",
    category: "admin",
    icon: "UsersRound",
  },
  {
    id: "custom-roles",
    name: "Custom Roles",
    description: "Create custom admin roles with specific permissions",
    status: "enabled",
    category: "admin",
    icon: "Shield",
    settings: {
      builtInRoles: ["owner", "admin", "moderator", "member", "guest"],
      customRolesEnabled: true,
      maxCustomRoles: 25,
    },
  },
  {
    id: "workspace-settings",
    name: "Workspace Settings",
    description: "Configure workspace-wide settings and defaults",
    status: "enabled",
    category: "admin",
    icon: "Settings",
  },
  {
    id: "analytics",
    name: "Analytics",
    description: "View workspace usage and engagement metrics",
    status: "enabled",
    category: "admin",
    icon: "BarChart3",
    settings: {
      metrics: [
        "messages_sent",
        "active_users",
        "channel_activity",
        "file_uploads",
      ],
      exportFormats: ["csv", "json"],
    },
  },
  {
    id: "audit-logs",
    name: "Audit Logs",
    description: "Track security and compliance events",
    status: "enabled",
    category: "admin",
    icon: "ScrollText",
    settings: {
      retentionDays: 90,
      eventTypes: ["auth", "channel", "message", "role", "settings", "file"],
      exportEnabled: true,
    },
  },
  {
    id: "data-export",
    name: "Data Export",
    description: "Export workspace data and messages",
    status: "enabled",
    category: "admin",
    icon: "Download",
    settings: {
      formats: ["json", "csv"],
      includeFiles: true,
      includeMessages: true,
      complianceExport: true,
    },
  },
  {
    id: "retention-policies",
    name: "Retention Policies",
    description: "Set message and file retention policies",
    status: "enabled",
    category: "admin",
    icon: "Timer",
    settings: {
      presets: ["30d", "90d", "1y", "forever"],
      perChannelOverride: true,
      fileRetentionSeparate: true,
    },
  },
];

// ---------------------------------------------------------------------------
// Notification Features
// ---------------------------------------------------------------------------

export const NOTIFICATION_FEATURES: SlackFeature[] = [
  {
    id: "push-notifications",
    name: "Push Notifications",
    description: "Receive notifications on desktop and mobile",
    status: "enabled",
    category: "notifications",
    icon: "Bell",
  },
  {
    id: "notification-preferences",
    name: "Notification Preferences",
    description: "Customize when and how you receive notifications",
    status: "enabled",
    category: "notifications",
    icon: "SlidersHorizontal",
  },
  {
    id: "channel-notifications",
    name: "Channel Notifications",
    description: "Set notification preferences per channel",
    status: "enabled",
    category: "notifications",
    icon: "BellRing",
  },
  {
    id: "keyword-notifications",
    name: "Keyword Notifications",
    description: "Get notified when specific words are mentioned",
    status: "enabled",
    category: "notifications",
    icon: "Key",
    settings: {
      maxKeywords: 50,
      caseSensitive: false,
    },
  },
  {
    id: "do-not-disturb",
    name: "Do Not Disturb",
    description: "Pause notifications on a schedule or manually",
    status: "enabled",
    category: "notifications",
    icon: "Moon",
    settings: {
      quickDurations: [20, 60, 120, "until_tomorrow"],
    },
  },
  {
    id: "notification-schedule",
    name: "Notification Schedule",
    description: "Set work hours when notifications are active",
    status: "enabled",
    category: "notifications",
    icon: "CalendarClock",
  },
  {
    id: "email-notifications",
    name: "Email Notifications",
    description: "Receive email digests for missed messages",
    status: "enabled",
    category: "notifications",
    icon: "Mail",
    settings: {
      digestFrequency: ["immediately", "hourly", "daily"],
    },
  },
];

// ---------------------------------------------------------------------------
// Accessibility Features
// ---------------------------------------------------------------------------

export const ACCESSIBILITY_FEATURES: SlackFeature[] = [
  {
    id: "keyboard-navigation",
    name: "Keyboard Navigation",
    description: "Full keyboard support for all actions",
    status: "enabled",
    category: "accessibility",
    icon: "Keyboard",
  },
  {
    id: "screen-reader",
    name: "Screen Reader Support",
    description: "Compatible with popular screen readers",
    status: "enabled",
    category: "accessibility",
    icon: "Accessibility",
    settings: {
      ariaLabels: true,
      liveRegions: true,
      semanticHTML: true,
    },
  },
  {
    id: "high-contrast",
    name: "High Contrast Mode",
    description: "Increase contrast for better visibility",
    status: "enabled",
    category: "accessibility",
    icon: "Contrast",
    settings: {
      contrastRatio: 7,
      wcagLevel: "AAA",
    },
  },
  {
    id: "reduced-motion",
    name: "Reduced Motion",
    description: "Minimize animations for accessibility",
    status: "enabled",
    category: "accessibility",
    icon: "Minimize2",
    settings: {
      respectsPrefersReducedMotion: true,
    },
  },
  {
    id: "font-scaling",
    name: "Font Scaling",
    description: "Adjust text size for readability",
    status: "enabled",
    category: "accessibility",
    icon: "ZoomIn",
    settings: {
      scaleRange: [0.8, 1.0, 1.2, 1.4, 1.6],
    },
  },
];

// ---------------------------------------------------------------------------
// Combined Feature List
// ---------------------------------------------------------------------------

export const ALL_SLACK_FEATURES: SlackFeature[] = [
  ...CHANNEL_FEATURES,
  ...DM_FEATURES,
  ...MESSAGING_FEATURES,
  ...THREAD_FEATURES,
  ...SEARCH_FEATURES,
  ...FILE_FEATURES,
  ...APP_FEATURES,
  ...CALL_FEATURES,
  ...WORKFLOW_FEATURES,
  ...ADMIN_FEATURES,
  ...NOTIFICATION_FEATURES,
  ...ACCESSIBILITY_FEATURES,
];

// ---------------------------------------------------------------------------
// Legacy Aliases (backward compatibility)
// ---------------------------------------------------------------------------

/** @deprecated Use CHANNEL_FEATURES instead */
export const channelFeatures = CHANNEL_FEATURES;

/** @deprecated Use DM_FEATURES instead */
export const dmFeatures = DM_FEATURES;

/** @deprecated Use MESSAGING_FEATURES instead */
export const messagingFeatures = MESSAGING_FEATURES;

/** @deprecated Use THREAD_FEATURES instead */
export const threadFeatures = THREAD_FEATURES;

/** @deprecated Use SEARCH_FEATURES instead */
export const searchFeatures = SEARCH_FEATURES;

/** @deprecated Use FILE_FEATURES instead */
export const fileFeatures = FILE_FEATURES;

/** @deprecated Use APP_FEATURES instead */
export const appFeatures = APP_FEATURES;

/** @deprecated Use CALL_FEATURES instead */
export const callFeatures = CALL_FEATURES;

/** @deprecated Use WORKFLOW_FEATURES instead */
export const workflowFeatures = WORKFLOW_FEATURES;

/** @deprecated Use ADMIN_FEATURES instead */
export const adminFeatures = ADMIN_FEATURES;

/** @deprecated Use NOTIFICATION_FEATURES instead */
export const notificationFeatures = NOTIFICATION_FEATURES;

/** @deprecated Use ACCESSIBILITY_FEATURES instead */
export const accessibilityFeatures = ACCESSIBILITY_FEATURES;

/** @deprecated Use ALL_SLACK_FEATURES instead */
export const allSlackFeatures = ALL_SLACK_FEATURES;

// ---------------------------------------------------------------------------
// Legacy Feature Flags (backward compatibility - derived from SlackFeature[])
// ---------------------------------------------------------------------------

export const slackFeatureFlags = {
  // Channels
  publicChannels: true,
  privateChannels: true,
  channelSections: true,
  channelBookmarks: true,
  channelDescription: true,
  channelSettings: true,
  sharedChannels: false, // disabled - requires multi-tenant federation
  channelArchive: true,
  defaultChannels: true,

  // DMs
  directMessages: true,
  groupDMs: true,
  dmMute: true,
  dmStar: true,

  // Messaging (all enabled)
  richText: true,
  markdown: true,
  emoji: true,
  customEmoji: true,
  reactions: true,
  mentions: true,
  linkPreviews: true,
  codeBlocks: true,
  codeSnippets: true,
  messageEdit: true,
  messageDelete: true,
  messagePin: true,
  messageBookmark: true,
  messageShare: true,
  messageLink: true,
  scheduledMessages: true,
  messageReminders: true,
  typingIndicators: true,

  // Threads
  threads: true,
  threadPanel: true,
  threadBroadcast: true,
  threadNotifications: true,
  threadsView: true,
  threadUnfollow: true,

  // Search
  globalSearch: true,
  searchFilters: true,
  searchModifiers: true,
  quickSwitcher: true,
  recentSearches: true,
  savedSearches: true,

  // Files
  fileUpload: true,
  dragDropUpload: true,
  clipboardUpload: true,
  filePreview: true,
  imageGallery: true,
  fileComments: true,
  fileSearch: true,
  fileBrowser: true,
  externalFiles: false, // disabled - third-party cloud integration post-v1.0

  // Apps & Integrations
  slashCommands: true,
  webhooks: true,
  messageButtons: true,
  bots: true,
  appDirectory: false, // disabled - marketplace not yet built
  modals: false, // disabled - depends on app directory
  appHome: false, // disabled - depends on app directory

  // Calls & Huddles
  huddles: true,
  huddleVideo: true,
  huddleScreenshare: true,
  huddleThread: true,
  huddleReactions: true,
  clips: true,

  // Workflow (all disabled - post-v1.0)
  workflowBuilder: false,
  workflowForms: false,
  workflowTriggers: false,
  canvas: false,
  lists: false,

  // Admin
  userManagement: true,
  userGroups: true,
  customRoles: true,
  workspaceSettings: true,
  analytics: true,
  auditLogs: true,
  dataExport: true,
  retentionPolicies: true,

  // Notifications
  pushNotifications: true,
  notificationPreferences: true,
  channelNotifications: true,
  keywordNotifications: true,
  doNotDisturb: true,
  notificationSchedule: true,
  emailNotifications: true,

  // Accessibility
  keyboardNavigation: true,
  screenReader: true,
  highContrast: true,
  reducedMotion: true,
  fontScaling: true,
} as const;

export type SlackFeatureFlag = keyof typeof slackFeatureFlags;

// ---------------------------------------------------------------------------
// Feature Helpers
// ---------------------------------------------------------------------------

export function getSlackFeatureById(id: string): SlackFeature | undefined {
  return ALL_SLACK_FEATURES.find((f) => f.id === id);
}

export function getSlackFeaturesByCategory(
  category: SlackFeatureCategory,
): SlackFeature[] {
  return ALL_SLACK_FEATURES.filter((f) => f.category === category);
}

export function getSlackEnabledFeatures(): SlackFeature[] {
  return ALL_SLACK_FEATURES.filter((f) => f.status === "enabled");
}

export function getSlackDisabledFeatures(): SlackFeature[] {
  return ALL_SLACK_FEATURES.filter((f) => f.status === "disabled");
}

/**
 * @deprecated No placeholder features remain. Use getSlackDisabledFeatures() instead.
 * Returns an empty array - all features are now either 'enabled' or 'disabled'.
 */
export function getSlackPlaceholderFeatures(): SlackFeature[] {
  return [];
}

export function isSlackFeatureEnabled(id: string): boolean {
  const feature = getSlackFeatureById(id);
  return feature?.status === "enabled";
}

export function getSlackFeatureDependencies(id: string): SlackFeature[] {
  const feature = getSlackFeatureById(id);
  if (!feature?.dependencies) return [];
  return feature.dependencies
    .map((depId) => getSlackFeatureById(depId))
    .filter((f): f is SlackFeature => f !== undefined);
}

// ---------------------------------------------------------------------------
// Legacy Helper Aliases (backward compatibility)
// ---------------------------------------------------------------------------

/** @deprecated Use getSlackFeaturesByCategory instead */
export const getFeaturesByCategory = getSlackFeaturesByCategory;

/** @deprecated Use getSlackFeatureById instead */
export const getFeatureById = getSlackFeatureById;

/** @deprecated Use getSlackEnabledFeatures instead */
export const getEnabledFeatures = getSlackEnabledFeatures;

/** @deprecated Use isSlackFeatureEnabled instead */
export const isFeatureEnabled = isSlackFeatureEnabled;

// ---------------------------------------------------------------------------
// Keyboard Shortcuts (unchanged)
// ---------------------------------------------------------------------------

export const slackKeyboardShortcuts = {
  // Navigation
  quickSwitcher: {
    mac: "Cmd+K",
    windows: "Ctrl+K",
    description: "Open quick switcher",
  },
  search: { mac: "Cmd+G", windows: "Ctrl+G", description: "Search messages" },
  jumpToConversation: {
    mac: "Cmd+Shift+K",
    windows: "Ctrl+Shift+K",
    description: "Open DM browser",
  },
  browseChannels: {
    mac: "Cmd+Shift+L",
    windows: "Ctrl+Shift+L",
    description: "Browse channels",
  },
  threads: {
    mac: "Cmd+Shift+T",
    windows: "Ctrl+Shift+T",
    description: "Open threads view",
  },
  activity: {
    mac: "Cmd+Shift+M",
    windows: "Ctrl+Shift+M",
    description: "Open activity",
  },
  later: {
    mac: "Cmd+Shift+S",
    windows: "Ctrl+Shift+S",
    description: "Open saved items",
  },
  previousChannel: {
    mac: "Alt+Up",
    windows: "Alt+Up",
    description: "Previous channel",
  },
  nextChannel: {
    mac: "Alt+Down",
    windows: "Alt+Down",
    description: "Next channel",
  },
  previousUnread: {
    mac: "Alt+Shift+Up",
    windows: "Alt+Shift+Up",
    description: "Previous unread",
  },
  nextUnread: {
    mac: "Alt+Shift+Down",
    windows: "Alt+Shift+Down",
    description: "Next unread",
  },

  // Messaging
  sendMessage: { mac: "Enter", windows: "Enter", description: "Send message" },
  newLine: {
    mac: "Shift+Enter",
    windows: "Shift+Enter",
    description: "New line",
  },
  bold: { mac: "Cmd+B", windows: "Ctrl+B", description: "Bold text" },
  italic: { mac: "Cmd+I", windows: "Ctrl+I", description: "Italic text" },
  strikethrough: {
    mac: "Cmd+Shift+X",
    windows: "Ctrl+Shift+X",
    description: "Strikethrough",
  },
  code: {
    mac: "Cmd+Shift+C",
    windows: "Ctrl+Shift+C",
    description: "Code format",
  },
  link: {
    mac: "Cmd+Shift+U",
    windows: "Ctrl+Shift+U",
    description: "Create link",
  },
  emoji: {
    mac: "Cmd+Shift+\\",
    windows: "Ctrl+Shift+\\",
    description: "Open emoji picker",
  },
  uploadFile: { mac: "Cmd+U", windows: "Ctrl+U", description: "Upload file" },
  editLastMessage: {
    mac: "Up",
    windows: "Up",
    description: "Edit last message",
  },

  // Actions
  markAsRead: {
    mac: "Esc",
    windows: "Esc",
    description: "Mark channel as read",
  },
  markAllAsRead: {
    mac: "Shift+Esc",
    windows: "Shift+Esc",
    description: "Mark all as read",
  },
  toggleSidebar: {
    mac: "Cmd+.",
    windows: "Ctrl+.",
    description: "Toggle sidebar",
  },
  openPreferences: {
    mac: "Cmd+,",
    windows: "Ctrl+,",
    description: "Open preferences",
  },
  shortcutsHelp: {
    mac: "Cmd+/",
    windows: "Ctrl+/",
    description: "Show keyboard shortcuts",
  },
};

// ---------------------------------------------------------------------------
// Feature Configuration Export
// ---------------------------------------------------------------------------

export const slackFeatureConfig = {
  channels: CHANNEL_FEATURES,
  dms: DM_FEATURES,
  messaging: MESSAGING_FEATURES,
  threads: THREAD_FEATURES,
  search: SEARCH_FEATURES,
  files: FILE_FEATURES,
  apps: APP_FEATURES,
  calls: CALL_FEATURES,
  workflow: WORKFLOW_FEATURES,
  admin: ADMIN_FEATURES,
  notifications: NOTIFICATION_FEATURES,
  accessibility: ACCESSIBILITY_FEATURES,
  all: ALL_SLACK_FEATURES,
  flags: slackFeatureFlags,
  helpers: {
    getSlackFeatureById,
    getSlackFeaturesByCategory,
    getSlackEnabledFeatures,
    getSlackDisabledFeatures,
    getSlackPlaceholderFeatures,
    isSlackFeatureEnabled,
    getSlackFeatureDependencies,
  },
};

export default slackFeatureConfig;

// ---------------------------------------------------------------------------
// Legacy Exports (backward compatibility for old imports)
// ---------------------------------------------------------------------------

/** @deprecated Use getSlackFeatureById instead */
export function getFeaturesByStatus(status: FeatureStatus): SlackFeature[] {
  return ALL_SLACK_FEATURES.filter((f) => f.status === status);
}

/** @deprecated Use slackFeatureConfig instead */
export const featureStats = {
  total: ALL_SLACK_FEATURES.length,
  enabled: ALL_SLACK_FEATURES.filter((f) => f.status === "enabled").length,
  disabled: ALL_SLACK_FEATURES.filter((f) => f.status === "disabled").length,
};

/** @deprecated Use getSlackEnabledFeatures() instead */
export function getPremiumFeatures(): SlackFeature[] {
  return [];
}

/** @deprecated Use getSlackEnabledFeatures() instead */
export function getBetaFeatures(): SlackFeature[] {
  return [];
}
