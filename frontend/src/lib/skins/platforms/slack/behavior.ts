/**
 * Slack Platform Behavior Preset
 *
 * Detailed behavior preset matching Slack's interaction patterns,
 * feature flags, permissions, and platform-specific behaviors.
 *
 * Key characteristics:
 *   - Workspace-centric organization (not server hierarchy)
 *   - Side-panel threading model
 *   - Unlimited edit/delete for own messages
 *   - Full emoji reaction picker (max 23 per message)
 *   - Max 40,000 character messages
 *   - Huddles (lightweight audio/video)
 *   - Sections (user-defined channel grouping, not categories)
 *   - Scheduled send and reminders
 *   - Canvas and Lists productivity tools
 *   - Workflow Builder automation
 *   - Slash commands and app interactions
 *   - @channel, @here, @everyone mention rules
 *   - Email digest notifications
 *   - No E2EE by default
 *   - No disappearing messages
 *   - No stickers, voice messages, or stories
 *
 * @module lib/skins/platforms/slack/behavior
 * @version 1.0.0
 */

import type { BehaviorPreset } from "../../types";

// ============================================================================
// SLACK-SPECIFIC BEHAVIOR TYPES
// ============================================================================

/**
 * Slack workspace configuration.
 */
export interface SlackWorkspaceConfig {
  /** Whether multi-workspace switching is enabled */
  multiWorkspace: boolean;
  /** Maximum members per workspace (Enterprise Grid: unlimited) */
  maxMembers: number;
  /** Workspace-level default notification preferences */
  defaultNotifyLevel: "all" | "mentions" | "none";
  /** Whether workspace admins can restrict channel creation */
  restrictChannelCreation: boolean;
  /** Whether workspace admins can restrict file uploads */
  restrictFileUploads: boolean;
  /** Custom emoji creation */
  customEmojiCreation: boolean;
  /** Workspace-wide retention policies */
  retentionPolicies: boolean;
  /** SSO/SAML enforcement */
  ssoEnforcement: boolean;
  /** Workspace analytics */
  analytics: boolean;
  /** Domain claiming */
  domainClaiming: boolean;
}

/**
 * Slack sidebar sections (user-defined channel grouping).
 */
export interface SlackSectionsConfig {
  /** Whether user-defined sections are enabled */
  enabled: boolean;
  /** Maximum sections per user */
  maxSections: number;
  /** Default sections */
  defaultSections: string[];
  /** Whether sections are collapsible */
  collapsible: boolean;
  /** Whether sections can be reordered */
  reorderable: boolean;
  /** Whether starred section is always shown */
  starredSection: boolean;
  /** Whether DMs section is always shown */
  dmsSection: boolean;
}

/**
 * Slack huddle configuration (lightweight audio/video).
 */
export interface SlackHuddleConfig {
  /** Whether huddles are enabled */
  enabled: boolean;
  /** Maximum participants */
  maxParticipants: number;
  /** Whether video is available in huddles */
  video: boolean;
  /** Whether screen sharing is available */
  screenShare: boolean;
  /** Whether huddles have threads */
  threads: boolean;
  /** Whether huddles can be started in channels */
  inChannel: boolean;
  /** Whether huddles can be started in DMs */
  inDm: boolean;
  /** Whether huddles show live captions */
  liveCaptions: boolean;
  /** Whether huddle can have a drawing board */
  drawingBoard: boolean;
  /** Whether huddle notes are shared */
  sharedNotes: boolean;
  /** Huddle reactions (emoji reactions during call) */
  reactions: boolean;
  /** Whether background noise suppression is available */
  noiseSuppression: boolean;
}

/**
 * Slack Canvas and Lists configuration.
 */
export interface SlackCanvasConfig {
  /** Whether Canvas is enabled */
  canvasEnabled: boolean;
  /** Whether Lists is enabled */
  listsEnabled: boolean;
  /** Maximum canvas size (characters) */
  maxCanvasSize: number;
  /** Whether canvas supports rich formatting */
  richFormatting: boolean;
  /** Whether canvas supports code blocks */
  codeBlocks: boolean;
  /** Whether canvas supports embedded media */
  embeddedMedia: boolean;
  /** Whether canvas supports checkboxes */
  checkboxes: boolean;
  /** Whether canvas supports mentions */
  mentions: boolean;
  /** Whether canvas supports comments */
  comments: boolean;
  /** Whether lists support custom fields */
  customFields: boolean;
  /** Whether lists support status tracking */
  statusTracking: boolean;
}

/**
 * Slack Workflow Builder configuration.
 */
export interface SlackWorkflowConfig {
  /** Whether workflows are enabled */
  enabled: boolean;
  /** Maximum steps per workflow */
  maxSteps: number;
  /** Trigger types */
  triggerTypes: string[];
  /** Whether custom steps are available */
  customSteps: boolean;
  /** Whether webhooks can trigger workflows */
  webhookTriggers: boolean;
  /** Whether scheduled triggers are available */
  scheduledTriggers: boolean;
  /** Whether workflows can send messages */
  messageSending: boolean;
  /** Whether workflows can collect form data */
  formCollection: boolean;
}

/**
 * Slack message formatting configuration.
 */
export interface SlackFormattingConfig {
  /** Bold (**text** or Ctrl+B) */
  bold: boolean;
  /** Italic (_text_ or Ctrl+I) */
  italic: boolean;
  /** Strikethrough (~text~) */
  strikethrough: boolean;
  /** Inline code (`text`) */
  inlineCode: boolean;
  /** Code blocks (```text```) */
  codeBlocks: boolean;
  /** Code blocks with syntax highlighting */
  syntaxHighlighting: boolean;
  /** Block quotes (> text) */
  blockQuotes: boolean;
  /** Ordered lists (1. text) */
  orderedLists: boolean;
  /** Unordered lists (- text or * text) */
  unorderedLists: boolean;
  /** Links with display text */
  links: boolean;
  /** @mentions */
  mentions: boolean;
  /** #channel mentions */
  channelMentions: boolean;
  /** Custom emoji (:emoji:) */
  customEmoji: boolean;
  /** Rich text editor (WYSIWYG toolbar) */
  richTextEditor: boolean;
  /** Markdown rendering in messages */
  markdownRendering: boolean;
}

/**
 * Slack search configuration.
 */
export interface SlackSearchConfig {
  /** Whether search is enabled */
  enabled: boolean;
  /** in: modifier (search within channel) */
  inModifier: boolean;
  /** from: modifier (search by sender) */
  fromModifier: boolean;
  /** before: modifier (date-based) */
  beforeModifier: boolean;
  /** after: modifier (date-based) */
  afterModifier: boolean;
  /** has: modifier (has:link, has:file, has:reaction, has:pin, has:star) */
  hasModifier: boolean;
  /** is: modifier (is:thread, is:saved) */
  isModifier: boolean;
  /** to: modifier (DMs to specific user) */
  toModifier: boolean;
  /** Saved searches */
  savedSearches: boolean;
  /** Recent searches */
  recentSearches: boolean;
  /** Search result filters (messages, files, channels, people) */
  resultFilters: string[];
  /** Search result sorting */
  sortOptions: string[];
  /** Whether search supports regex */
  regexSupport: boolean;
}

/**
 * Slack app and integration configuration.
 */
export interface SlackAppConfig {
  /** Whether slash commands are enabled */
  slashCommands: boolean;
  /** Whether message shortcuts/actions are available */
  messageActions: boolean;
  /** Whether modal dialogs from apps are supported */
  modalDialogs: boolean;
  /** Whether app home tabs are supported */
  homeTab: boolean;
  /** Whether interactive messages (buttons, selects) work */
  interactiveMessages: boolean;
  /** Whether unfurl previews from apps are shown */
  unfurlPreviews: boolean;
  /** Whether incoming webhooks are supported */
  incomingWebhooks: boolean;
  /** Whether outgoing webhooks are supported */
  outgoingWebhooks: boolean;
  /** Whether bot users are supported */
  botUsers: boolean;
  /** Whether OAuth app installation is supported */
  oauthApps: boolean;
  /** Whether the app directory is accessible */
  appDirectory: boolean;
}

/**
 * Slack reminder and scheduling configuration.
 */
export interface SlackRemindersConfig {
  /** Whether reminders are enabled */
  enabled: boolean;
  /** Whether scheduled messages are supported */
  scheduledMessages: boolean;
  /** Whether /remind slash command works */
  slashRemind: boolean;
  /** Whether message-level "remind me" action works */
  remindMeAction: boolean;
  /** Preset reminder times */
  presetTimes: string[];
  /** Custom date/time selection */
  customDateTime: boolean;
  /** Whether recurring reminders are supported */
  recurring: boolean;
}

/**
 * Slack DM and multi-party DM configuration.
 */
export interface SlackDmConfig {
  /** Whether 1:1 DMs are supported */
  directMessages: boolean;
  /** Whether multi-party DMs (MPDM) are supported */
  multiPartyDms: boolean;
  /** Maximum MPDM participants */
  maxMpdmMembers: number;
  /** Whether DMs can be converted to channels */
  convertToChannel: boolean;
  /** Whether DMs show typing indicators */
  typingIndicator: boolean;
  /** Whether DMs show online/away status */
  presenceStatus: boolean;
}

/**
 * Complete Slack extended behavior configuration.
 * Includes all Slack-specific features beyond the standard BehaviorPreset.
 */
export interface SlackExtendedBehavior {
  workspace: SlackWorkspaceConfig;
  sections: SlackSectionsConfig;
  huddles: SlackHuddleConfig;
  canvas: SlackCanvasConfig;
  workflows: SlackWorkflowConfig;
  formatting: SlackFormattingConfig;
  search: SlackSearchConfig;
  apps: SlackAppConfig;
  reminders: SlackRemindersConfig;
  dms: SlackDmConfig;
}

// ============================================================================
// SLACK WORKSPACE CONFIG
// ============================================================================

export const slackWorkspaceConfig: SlackWorkspaceConfig = {
  multiWorkspace: true,
  maxMembers: 500000,
  defaultNotifyLevel: "mentions",
  restrictChannelCreation: false,
  restrictFileUploads: false,
  customEmojiCreation: true,
  retentionPolicies: true,
  ssoEnforcement: false,
  analytics: true,
  domainClaiming: true,
};

// ============================================================================
// SLACK SECTIONS CONFIG
// ============================================================================

export const slackSectionsConfig: SlackSectionsConfig = {
  enabled: true,
  maxSections: 100,
  defaultSections: ["Channels", "Direct messages"],
  collapsible: true,
  reorderable: true,
  starredSection: true,
  dmsSection: true,
};

// ============================================================================
// SLACK HUDDLE CONFIG
// ============================================================================

export const slackHuddleConfig: SlackHuddleConfig = {
  enabled: true,
  maxParticipants: 50,
  video: true,
  screenShare: true,
  threads: true,
  inChannel: true,
  inDm: true,
  liveCaptions: true,
  drawingBoard: false,
  sharedNotes: true,
  reactions: true,
  noiseSuppression: true,
};

// ============================================================================
// SLACK CANVAS CONFIG
// ============================================================================

export const slackCanvasConfig: SlackCanvasConfig = {
  canvasEnabled: true,
  listsEnabled: true,
  maxCanvasSize: 100000,
  richFormatting: true,
  codeBlocks: true,
  embeddedMedia: true,
  checkboxes: true,
  mentions: true,
  comments: true,
  customFields: true,
  statusTracking: true,
};

// ============================================================================
// SLACK WORKFLOW CONFIG
// ============================================================================

export const slackWorkflowConfig: SlackWorkflowConfig = {
  enabled: true,
  maxSteps: 100,
  triggerTypes: [
    "shortcut",
    "new-channel-member",
    "emoji-reaction",
    "webhook",
    "schedule",
  ],
  customSteps: true,
  webhookTriggers: true,
  scheduledTriggers: true,
  messageSending: true,
  formCollection: true,
};

// ============================================================================
// SLACK FORMATTING CONFIG
// ============================================================================

export const slackFormattingConfig: SlackFormattingConfig = {
  bold: true,
  italic: true,
  strikethrough: true,
  inlineCode: true,
  codeBlocks: true,
  syntaxHighlighting: true,
  blockQuotes: true,
  orderedLists: true,
  unorderedLists: true,
  links: true,
  mentions: true,
  channelMentions: true,
  customEmoji: true,
  richTextEditor: true,
  markdownRendering: true,
};

// ============================================================================
// SLACK SEARCH CONFIG
// ============================================================================

export const slackSearchConfig: SlackSearchConfig = {
  enabled: true,
  inModifier: true,
  fromModifier: true,
  beforeModifier: true,
  afterModifier: true,
  hasModifier: true,
  isModifier: true,
  toModifier: true,
  savedSearches: true,
  recentSearches: true,
  resultFilters: ["messages", "files", "channels", "people"],
  sortOptions: ["relevance", "recent"],
  regexSupport: false,
};

// ============================================================================
// SLACK APP CONFIG
// ============================================================================

export const slackAppConfig: SlackAppConfig = {
  slashCommands: true,
  messageActions: true,
  modalDialogs: true,
  homeTab: true,
  interactiveMessages: true,
  unfurlPreviews: true,
  incomingWebhooks: true,
  outgoingWebhooks: true,
  botUsers: true,
  oauthApps: true,
  appDirectory: true,
};

// ============================================================================
// SLACK REMINDERS CONFIG
// ============================================================================

export const slackRemindersConfig: SlackRemindersConfig = {
  enabled: true,
  scheduledMessages: true,
  slashRemind: true,
  remindMeAction: true,
  presetTimes: ["20min", "1h", "3h", "tomorrow-9am", "next-week"],
  customDateTime: true,
  recurring: true,
};

// ============================================================================
// SLACK DM CONFIG
// ============================================================================

export const slackDmConfig: SlackDmConfig = {
  directMessages: true,
  multiPartyDms: true,
  maxMpdmMembers: 9,
  convertToChannel: true,
  typingIndicator: true,
  presenceStatus: true,
};

// ============================================================================
// SLACK DETAILED BEHAVIOR PRESET
// ============================================================================

/**
 * Complete Slack behavior preset that extends the standard BehaviorPreset
 * from the skin architecture. This represents Slack's exact feature set
 * and interaction patterns.
 */
export const slackDetailedBehavior: BehaviorPreset = {
  id: "slack-detailed",
  name: "Slack",
  description:
    "Detailed Slack behavior preset with exact feature flags, limits, and interaction patterns matching Slack as of 2026",
  version: "0.9.1",
  messaging: {
    editWindow: 0, // unlimited
    deleteWindow: 0, // unlimited
    deleteForEveryone: false, // only admins can delete others' messages
    deleteForEveryoneWindow: 0,
    showEditedIndicator: true,
    reactionStyle: "full-picker",
    maxReactionsPerMessage: 23,
    threadingModel: "side-panel",
    maxMessageLength: 40000,
    forwarding: true,
    forwardLimit: 0, // unlimited
    pinning: true,
    bookmarking: true, // "Save for later"
    scheduling: true,
    linkPreviews: true,
  },
  channels: {
    types: ["public", "private", "dm", "group-dm"],
    hierarchy: false,
    categories: false, // uses "sections" instead (user-defined)
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
    huddles: true,
    canvas: true,
    lists: true,
    workflows: true,
    slashCommands: true,
    appDirectory: true,
    scheduledMessages: true,
    reminders: true,
    bookmarks: true,
    savedItems: true,
    channelSections: true,
    threads: true,
    searchModifiers: true,
    emailDigest: true,
    keywordAlerts: true,
    channelBookmarks: true,
    pinnedItems: true,
  },
};

// ============================================================================
// SLACK EXTENDED BEHAVIOR CONFIG
// ============================================================================

export const slackExtendedBehavior: SlackExtendedBehavior = {
  workspace: slackWorkspaceConfig,
  sections: slackSectionsConfig,
  huddles: slackHuddleConfig,
  canvas: slackCanvasConfig,
  workflows: slackWorkflowConfig,
  formatting: slackFormattingConfig,
  search: slackSearchConfig,
  apps: slackAppConfig,
  reminders: slackRemindersConfig,
  dms: slackDmConfig,
};

/**
 * Complete Slack behavior configuration including both the standard
 * BehaviorPreset and Slack-specific extensions.
 */
export interface SlackBehaviorConfig {
  preset: BehaviorPreset;
  extended: SlackExtendedBehavior;
}

export const slackBehaviorConfig: SlackBehaviorConfig = {
  preset: slackDetailedBehavior,
  extended: slackExtendedBehavior,
};
