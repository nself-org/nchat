/**
 * Slack Composer Configuration
 *
 * Defines the Slack message input/composer behavior and layout,
 * including the formatting toolbar, attachment menu, slash commands,
 * @ mentions, emoji picker, and scheduling controls.
 *
 * Key characteristics:
 *   - WYSIWYG formatting toolbar (bold, italic, strike, code, link,
 *     ordered list, unordered list, block quote, code block)
 *   - @mention autocomplete (users, channels, user groups)
 *   - /slash command autocomplete
 *   - Emoji picker with custom emoji support
 *   - Attachment menu (upload file, canvas, huddle, workflow, clip)
 *   - Scheduled send (long-press on send or dropdown)
 *   - Thread reply indicator
 *   - Drag-and-drop file upload
 *   - Paste images
 *   - No voice recording (Slack uses clips instead)
 *   - Composer border with focus ring
 *
 * @module lib/skins/platforms/slack/composer
 * @version 1.0.0
 */

// ============================================================================
// COMPOSER TYPES
// ============================================================================

/**
 * Formatting toolbar button configuration.
 */
export interface SlackFormattingButton {
  /** Unique identifier */
  id: string;
  /** Button icon */
  icon: string;
  /** Display label / tooltip */
  label: string;
  /** Keyboard shortcut (display string) */
  shortcut: string;
  /** Whether this is a toggle (active/inactive) */
  isToggle: boolean;
  /** Markdown syntax applied */
  syntax: string;
  /** Sort order */
  order: number;
}

/**
 * Attachment menu item in the Slack composer.
 */
export interface SlackAttachmentMenuItem {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Icon name */
  icon: string;
  /** Description text */
  description: string;
  /** Whether this action opens a system picker */
  systemPicker: boolean;
  /** File types accepted (MIME types) */
  acceptedTypes?: string[];
  /** Maximum file size in bytes (0 = workspace limit) */
  maxFileSize?: number;
  /** Sort order in the menu */
  order: number;
}

/**
 * Slash command configuration for the Slack composer.
 */
export interface SlackSlashCommandConfig {
  /** Whether slash commands are enabled */
  enabled: boolean;
  /** Whether autocomplete is shown */
  autocomplete: boolean;
  /** Built-in commands available */
  builtInCommands: string[];
  /** Whether custom app commands are shown */
  appCommands: boolean;
  /** Maximum command description length */
  maxDescriptionLength: number;
}

/**
 * Mention autocomplete configuration.
 */
export interface SlackMentionConfig {
  /** Whether @user mentions are supported */
  users: boolean;
  /** Whether @channel mentions are supported */
  channel: boolean;
  /** Whether @here mentions are supported */
  here: boolean;
  /** Whether @everyone mentions are supported */
  everyone: boolean;
  /** Whether #channel mentions are supported */
  channels: boolean;
  /** Whether @usergroup mentions are supported */
  userGroups: boolean;
  /** Maximum autocomplete results */
  maxResults: number;
  /** Whether autocomplete shows avatar */
  showAvatar: boolean;
  /** Whether autocomplete shows status */
  showStatus: boolean;
}

/**
 * Emoji picker configuration for Slack.
 */
export interface SlackEmojiPickerConfig {
  /** Whether emoji picker is available */
  enabled: boolean;
  /** How the picker is triggered */
  trigger: "icon" | "colon-syntax" | "both";
  /** Picker position relative to composer */
  position: "above" | "below" | "overlay";
  /** Whether recent emojis section is shown */
  recentEmojis: boolean;
  /** Maximum recent emojis stored */
  maxRecentEmojis: number;
  /** Whether emoji search is available */
  search: boolean;
  /** Whether custom emoji are available */
  customEmoji: boolean;
  /** Whether skin tone selector is available */
  skinToneSelector: boolean;
  /** Number of columns in the emoji grid */
  gridColumns: number;
  /** Whether emoji categories are shown */
  categories: boolean;
  /** Whether frequently used section is shown */
  frequentlyUsed: boolean;
}

/**
 * Reply/thread indicator configuration.
 */
export interface SlackReplyConfig {
  /** Whether reply indicator is shown above composer */
  enabled: boolean;
  /** Whether the reply shows quoted text */
  showQuotedText: boolean;
  /** Maximum characters shown in quote */
  maxQuoteChars: number;
  /** Whether media thumbnails are shown */
  showMediaThumbnail: boolean;
  /** Close/cancel button available */
  cancelButton: boolean;
  /** Background color */
  backgroundColor: string;
  /** Border style */
  borderStyle: string;
}

/**
 * Scheduled send configuration.
 */
export interface SlackScheduleConfig {
  /** Whether scheduled send is available */
  enabled: boolean;
  /** How scheduling is triggered */
  trigger: "dropdown" | "long-press" | "both";
  /** Preset schedule times */
  presetTimes: string[];
  /** Whether custom date/time is available */
  customDateTime: boolean;
  /** Timezone awareness */
  timezoneAware: boolean;
}

/**
 * Send button configuration for Slack.
 */
export interface SlackSendButtonConfig {
  /** Send button background color */
  backgroundColor: string;
  /** Send button icon color */
  iconColor: string;
  /** Button shape */
  shape: "circle" | "rounded" | "square";
  /** Button size */
  size: string;
  /** Whether send button has a dropdown for scheduling */
  scheduleDropdown: boolean;
  /** Whether send button is disabled when empty */
  disabledWhenEmpty: boolean;
  /** Disabled state background color */
  disabledBg: string;
  /** Disabled state icon color */
  disabledIconColor: string;
}

/**
 * Complete Slack composer configuration.
 */
export interface SlackComposerConfig {
  /** Composer container min height */
  minHeight: string;
  /** Composer container max height before scroll */
  maxHeight: string;
  /** Input background color */
  inputBg: string;
  /** Input text color */
  inputText: string;
  /** Placeholder text */
  placeholderText: string;
  /** Placeholder color */
  placeholderColor: string;
  /** Input border radius */
  inputBorderRadius: string;
  /** Input padding */
  inputPadding: string;
  /** Input font size */
  inputFontSize: string;
  /** Composer background color */
  composerBg: string;
  /** Input border color */
  inputBorder: string;
  /** Input focused border color */
  inputFocusBorder: string;
  /** Formatting toolbar buttons */
  formattingToolbar: SlackFormattingButton[];
  /** Whether formatting toolbar is shown */
  showFormattingToolbar: boolean;
  /** Attachment menu items */
  attachmentMenu: SlackAttachmentMenuItem[];
  /** Slash command configuration */
  slashCommands: SlackSlashCommandConfig;
  /** Mention autocomplete configuration */
  mentions: SlackMentionConfig;
  /** Emoji picker configuration */
  emojiPicker: SlackEmojiPickerConfig;
  /** Reply indicator configuration */
  replyIndicator: SlackReplyConfig;
  /** Scheduled send configuration */
  scheduledSend: SlackScheduleConfig;
  /** Send button configuration */
  sendButton: SlackSendButtonConfig;
  /** Whether paste-to-send images is supported */
  pasteImages: boolean;
  /** Whether drag-and-drop file sharing is supported */
  dragAndDrop: boolean;
  /** Character count display mode */
  characterCount: "none" | "always" | "near-limit";
  /** Character count warning threshold (percent of max) */
  characterCountThreshold: number;
}

// ============================================================================
// SLACK FORMATTING TOOLBAR
// ============================================================================

export const slackFormattingToolbar: SlackFormattingButton[] = [
  {
    id: "bold",
    icon: "bold",
    label: "Bold",
    shortcut: "Ctrl+B",
    isToggle: true,
    syntax: "**text**",
    order: 1,
  },
  {
    id: "italic",
    icon: "italic",
    label: "Italic",
    shortcut: "Ctrl+I",
    isToggle: true,
    syntax: "_text_",
    order: 2,
  },
  {
    id: "strikethrough",
    icon: "strikethrough",
    label: "Strikethrough",
    shortcut: "Ctrl+Shift+X",
    isToggle: true,
    syntax: "~text~",
    order: 3,
  },
  {
    id: "code",
    icon: "code",
    label: "Code",
    shortcut: "Ctrl+Shift+C",
    isToggle: true,
    syntax: "`text`",
    order: 4,
  },
  {
    id: "link",
    icon: "link",
    label: "Link",
    shortcut: "Ctrl+Shift+U",
    isToggle: false,
    syntax: "<url|text>",
    order: 5,
  },
  {
    id: "ordered-list",
    icon: "list-ordered",
    label: "Ordered list",
    shortcut: "Ctrl+Shift+7",
    isToggle: false,
    syntax: "1. text",
    order: 6,
  },
  {
    id: "unordered-list",
    icon: "list",
    label: "Bulleted list",
    shortcut: "Ctrl+Shift+8",
    isToggle: false,
    syntax: "- text",
    order: 7,
  },
  {
    id: "blockquote",
    icon: "text-quote",
    label: "Quote",
    shortcut: "Ctrl+Shift+9",
    isToggle: false,
    syntax: "> text",
    order: 8,
  },
  {
    id: "code-block",
    icon: "square-code",
    label: "Code block",
    shortcut: "Ctrl+Alt+Shift+C",
    isToggle: false,
    syntax: "```text```",
    order: 9,
  },
];

// ============================================================================
// SLACK ATTACHMENT MENU
// ============================================================================

export const slackAttachmentMenuLight: SlackAttachmentMenuItem[] = [
  {
    id: "upload-file",
    label: "Upload a file",
    icon: "upload",
    description: "Share a file from your computer",
    systemPicker: true,
    acceptedTypes: ["*/*"],
    maxFileSize: 0, // workspace limit
    order: 1,
  },
  {
    id: "create-canvas",
    label: "Create a canvas",
    icon: "file-text",
    description: "Create a rich document",
    systemPicker: false,
    order: 2,
  },
  {
    id: "start-huddle",
    label: "Start a huddle",
    icon: "headphones",
    description: "Start a live audio conversation",
    systemPicker: false,
    order: 3,
  },
  {
    id: "record-clip",
    label: "Record a clip",
    icon: "video",
    description: "Record an audio or video clip",
    systemPicker: false,
    order: 4,
  },
  {
    id: "start-workflow",
    label: "Start a workflow",
    icon: "zap",
    description: "Run a workflow in this channel",
    systemPicker: false,
    order: 5,
  },
];

export const slackAttachmentMenuDark: SlackAttachmentMenuItem[] =
  slackAttachmentMenuLight.map((item) => ({
    ...item,
  }));

// ============================================================================
// SLACK SLASH COMMANDS CONFIG
// ============================================================================

export const slackSlashCommandConfig: SlackSlashCommandConfig = {
  enabled: true,
  autocomplete: true,
  builtInCommands: [
    "/remind",
    "/topic",
    "/invite",
    "/remove",
    "/rename",
    "/archive",
    "/leave",
    "/join",
    "/mute",
    "/unmute",
    "/who",
    "/msg",
    "/dm",
    "/status",
    "/away",
    "/dnd",
    "/active",
    "/apps",
    "/search",
    "/shortcuts",
    "/feed",
    "/giphy",
    "/shrug",
    "/poll",
  ],
  appCommands: true,
  maxDescriptionLength: 100,
};

// ============================================================================
// SLACK MENTION CONFIG
// ============================================================================

export const slackMentionConfig: SlackMentionConfig = {
  users: true,
  channel: true,
  here: true,
  everyone: true,
  channels: true,
  userGroups: true,
  maxResults: 10,
  showAvatar: true,
  showStatus: true,
};

// ============================================================================
// SLACK EMOJI PICKER CONFIG
// ============================================================================

export const slackEmojiPickerConfig: SlackEmojiPickerConfig = {
  enabled: true,
  trigger: "both",
  position: "above",
  recentEmojis: true,
  maxRecentEmojis: 36,
  search: true,
  customEmoji: true,
  skinToneSelector: true,
  gridColumns: 9,
  categories: true,
  frequentlyUsed: true,
};

// ============================================================================
// SLACK REPLY CONFIG
// ============================================================================

export const slackReplyConfigLight: SlackReplyConfig = {
  enabled: true,
  showQuotedText: true,
  maxQuoteChars: 100,
  showMediaThumbnail: true,
  cancelButton: true,
  backgroundColor: "#F8F8F8",
  borderStyle: "2px solid #1264A3",
};

export const slackReplyConfigDark: SlackReplyConfig = {
  ...slackReplyConfigLight,
  backgroundColor: "#222529",
  borderStyle: "2px solid #36C5F0",
};

// ============================================================================
// SLACK SCHEDULE CONFIG
// ============================================================================

export const slackScheduleConfig: SlackScheduleConfig = {
  enabled: true,
  trigger: "dropdown",
  presetTimes: ["tomorrow-9am", "next-monday-9am", "custom"],
  customDateTime: true,
  timezoneAware: true,
};

// ============================================================================
// SLACK SEND BUTTON CONFIG
// ============================================================================

export const slackSendButtonLight: SlackSendButtonConfig = {
  backgroundColor: "#007A5A",
  iconColor: "#FFFFFF",
  shape: "rounded",
  size: "28px",
  scheduleDropdown: true,
  disabledWhenEmpty: true,
  disabledBg: "#DDDDDC",
  disabledIconColor: "#FFFFFF",
};

export const slackSendButtonDark: SlackSendButtonConfig = {
  ...slackSendButtonLight,
  backgroundColor: "#2BAC76",
  disabledBg: "#35383C",
  disabledIconColor: "#9B9C9E",
};

// ============================================================================
// ASSEMBLED SLACK COMPOSER CONFIGS
// ============================================================================

export const slackComposerLight: SlackComposerConfig = {
  minHeight: "44px",
  maxHeight: "350px",
  inputBg: "#FFFFFF",
  inputText: "#1D1C1D",
  placeholderText: "Message #channel",
  placeholderColor: "#696969",
  inputBorderRadius: "8px",
  inputPadding: "8px 12px",
  inputFontSize: "15px",
  composerBg: "#FFFFFF",
  inputBorder: "1px solid #DDDDDC",
  inputFocusBorder: "1px solid #1264A3",
  formattingToolbar: slackFormattingToolbar,
  showFormattingToolbar: true,
  attachmentMenu: slackAttachmentMenuLight,
  slashCommands: slackSlashCommandConfig,
  mentions: slackMentionConfig,
  emojiPicker: slackEmojiPickerConfig,
  replyIndicator: slackReplyConfigLight,
  scheduledSend: slackScheduleConfig,
  sendButton: slackSendButtonLight,
  pasteImages: true,
  dragAndDrop: true,
  characterCount: "near-limit",
  characterCountThreshold: 90,
};

export const slackComposerDark: SlackComposerConfig = {
  ...slackComposerLight,
  inputBg: "#222529",
  inputText: "#D1D2D3",
  placeholderColor: "#9B9C9E",
  composerBg: "#1A1D21",
  inputBorder: "1px solid #35383C",
  inputFocusBorder: "1px solid #36C5F0",
  attachmentMenu: slackAttachmentMenuDark,
  replyIndicator: slackReplyConfigDark,
  sendButton: slackSendButtonDark,
};

// ============================================================================
// COMPOSER HELPERS
// ============================================================================

/**
 * Get the Slack composer configuration for the given color mode.
 */
export function getSlackComposer(
  isDarkMode: boolean = false,
): SlackComposerConfig {
  return isDarkMode ? slackComposerDark : slackComposerLight;
}

/**
 * Get the attachment menu items sorted by their order.
 */
export function getSlackAttachmentMenu(
  isDarkMode: boolean = false,
): SlackAttachmentMenuItem[] {
  const menu = isDarkMode ? slackAttachmentMenuDark : slackAttachmentMenuLight;
  return [...menu].sort((a, b) => a.order - b.order);
}

/**
 * Find an attachment menu item by its ID.
 */
export function getSlackAttachmentById(
  id: string,
  isDarkMode: boolean = false,
): SlackAttachmentMenuItem | undefined {
  const menu = isDarkMode ? slackAttachmentMenuDark : slackAttachmentMenuLight;
  return menu.find((item) => item.id === id);
}

/**
 * Get the number of attachment menu items.
 */
export function getSlackAttachmentCount(): number {
  return slackAttachmentMenuLight.length;
}

/**
 * Get the number of formatting toolbar buttons.
 */
export function getSlackFormattingButtonCount(): number {
  return slackFormattingToolbar.length;
}

/**
 * Get the number of built-in slash commands.
 */
export function getSlackBuiltInCommandCount(): number {
  return slackSlashCommandConfig.builtInCommands.length;
}
