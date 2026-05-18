/**
 * Discord Composer Configuration
 *
 * Defines the Discord message input/composer behavior and layout,
 * including the attachment menu, slash commands, markdown formatting,
 * emoji picker, and file upload.
 *
 * Key characteristics:
 *   - Attachment button (+) with upload file, sticker, GIF options
 *   - Slash commands (/command) with command palette
 *   - @mention user/role/everyone and #channel links
 *   - Markdown formatting (bold, italic, code, code blocks, spoiler, quote)
 *   - Thread creation from messages
 *   - Reply with quote (inline)
 *   - Emoji reactions (quick reaction bar on hover)
 *   - Edit/delete own messages
 *   - File upload with drag-and-drop
 *   - Nitro: larger file uploads, animated emojis
 *   - GIF search (Tenor)
 *   - Sticker picker
 *   - Voice message recording
 *
 * @module lib/skins/platforms/discord/composer
 * @version 1.0.0
 */

// ============================================================================
// COMPOSER TYPES
// ============================================================================

/**
 * Attachment menu item in the Discord composer.
 */
export interface DiscordAttachmentMenuItem {
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
  /** Maximum file size in bytes (0 = platform default) */
  maxFileSize?: number;
  /** Sort order in the menu */
  order: number;
}

/**
 * Slash command configuration.
 */
export interface DiscordSlashCommandConfig {
  /** Whether slash commands are enabled */
  enabled: boolean;
  /** Trigger character */
  trigger: string;
  /** Built-in commands */
  builtInCommands: string[];
  /** Bot command support */
  botCommands: boolean;
  /** Command autocomplete */
  autocomplete: boolean;
  /** Command categories */
  categories: string[];
  /** Maximum command name length */
  maxCommandNameLength: number;
  /** Maximum command description length */
  maxDescriptionLength: number;
}

/**
 * Emoji picker configuration for Discord.
 */
export interface DiscordEmojiPickerConfig {
  /** Whether emoji picker is available */
  enabled: boolean;
  /** How the picker is triggered */
  trigger: "icon" | "keyboard-shortcut" | "both" | "colon-syntax";
  /** Picker position relative to composer */
  position: "above" | "below" | "overlay";
  /** Whether recent emojis section is shown */
  recentEmojis: boolean;
  /** Maximum recent emojis stored */
  maxRecentEmojis: number;
  /** Whether emoji search is available */
  search: boolean;
  /** Whether custom server emoji are shown */
  customEmoji: boolean;
  /** Whether animated emoji are shown (Nitro) */
  animatedEmoji: boolean;
  /** Whether GIF tab is included */
  gifsTab: boolean;
  /** Whether sticker tab is included */
  stickersTab: boolean;
  /** Skin tone selector */
  skinToneSelector: boolean;
  /** Number of columns in the emoji grid */
  gridColumns: number;
  /** Emoji diversity/categories */
  categories: string[];
  /** Nitro upsell for locked emoji */
  nitroUpsell: boolean;
}

/**
 * Reply/thread configuration for Discord.
 */
export interface DiscordReplyConfig {
  /** Whether reply to message is enabled */
  enabled: boolean;
  /** Reply preview shown above composer */
  showPreview: boolean;
  /** Maximum preview text length */
  maxPreviewChars: number;
  /** Ping option (mention on reply) */
  pingOption: boolean;
  /** Default ping behavior */
  defaultPing: boolean;
  /** Cancel button */
  cancelButton: boolean;
  /** Background color for reply bar */
  backgroundColor: string;
}

/**
 * Message action bar shown on hover.
 */
export interface DiscordMessageActionBarConfig {
  /** Whether action bar is shown on hover */
  enabled: boolean;
  /** Actions available */
  actions: string[];
  /** Quick reaction slot */
  quickReaction: boolean;
  /** Number of quick reaction slots */
  quickReactionSlots: number;
  /** Background color */
  backgroundColor: string;
  /** Border radius */
  borderRadius: string;
  /** Shadow */
  shadow: string;
}

/**
 * Send button configuration for Discord.
 */
export interface DiscordSendButtonConfig {
  /** Send button visible (Discord uses Enter key primarily) */
  visible: boolean;
  /** Primary send method */
  primaryMethod: "enter" | "button" | "both";
  /** Shift+Enter for newline */
  shiftEnterNewline: boolean;
  /** Ctrl+Enter to send option */
  ctrlEnterToSend: boolean;
}

/**
 * Complete Discord composer configuration.
 */
export interface DiscordComposerConfig {
  /** Composer minimum height */
  minHeight: string;
  /** Composer maximum height before scroll */
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
  /** Composer margin (left/right/bottom) */
  composerMargin: string;
  /** Attachment menu items */
  attachmentMenu: DiscordAttachmentMenuItem[];
  /** Slash command configuration */
  slashCommands: DiscordSlashCommandConfig;
  /** Emoji picker configuration */
  emojiPicker: DiscordEmojiPickerConfig;
  /** Reply configuration */
  reply: DiscordReplyConfig;
  /** Message action bar */
  messageActionBar: DiscordMessageActionBarConfig;
  /** Send button configuration */
  sendButton: DiscordSendButtonConfig;
  /** Whether paste images is supported */
  pasteImages: boolean;
  /** Whether drag-and-drop file sharing is supported */
  dragAndDrop: boolean;
  /** Whether @mention suggestions are shown while typing */
  mentionSuggestions: boolean;
  /** Whether #channel suggestions are shown while typing */
  channelSuggestions: boolean;
  /** Whether :emoji: autocomplete is supported */
  emojiAutocomplete: boolean;
  /** Character count display mode */
  characterCount: "none" | "always" | "near-limit";
  /** Character count warning threshold (percent of max) */
  characterCountThreshold: number;
  /** Typing indicator shown to others */
  typingIndicator: boolean;
}

// ============================================================================
// DISCORD ATTACHMENT MENU
// ============================================================================

export const discordAttachmentMenu: DiscordAttachmentMenuItem[] = [
  {
    id: "upload-file",
    label: "Upload a File",
    icon: "file-up",
    description: "Upload a file from your device",
    systemPicker: true,
    acceptedTypes: ["*/*"],
    maxFileSize: 25 * 1024 * 1024, // 25 MB
    order: 1,
  },
  {
    id: "create-thread",
    label: "Create Thread",
    icon: "hash",
    description: "Start a new thread",
    systemPicker: false,
    order: 2,
  },
  {
    id: "use-apps",
    label: "Use Apps",
    icon: "grid",
    description: "Use an installed app",
    systemPicker: false,
    order: 3,
  },
  {
    id: "create-poll",
    label: "Create Poll",
    icon: "bar-chart-2",
    description: "Create a poll for the channel",
    systemPicker: false,
    order: 4,
  },
];

// ============================================================================
// DISCORD SLASH COMMAND CONFIG
// ============================================================================

export const discordSlashCommandConfig: DiscordSlashCommandConfig = {
  enabled: true,
  trigger: "/",
  builtInCommands: [
    "/giphy",
    "/tenor",
    "/tts",
    "/spoiler",
    "/shrug",
    "/tableflip",
    "/unflip",
    "/nick",
    "/thread",
    "/me",
  ],
  botCommands: true,
  autocomplete: true,
  categories: ["Built-in", "Bot Commands", "App Commands"],
  maxCommandNameLength: 32,
  maxDescriptionLength: 100,
};

// ============================================================================
// DISCORD EMOJI PICKER CONFIG
// ============================================================================

export const discordEmojiPickerConfig: DiscordEmojiPickerConfig = {
  enabled: true,
  trigger: "both",
  position: "above",
  recentEmojis: true,
  maxRecentEmojis: 36,
  search: true,
  customEmoji: true,
  animatedEmoji: true,
  gifsTab: true,
  stickersTab: true,
  skinToneSelector: true,
  gridColumns: 9,
  categories: [
    "Frequently Used",
    "People & Body",
    "Nature",
    "Food & Drink",
    "Activities",
    "Travel & Places",
    "Objects",
    "Symbols",
    "Flags",
  ],
  nitroUpsell: true,
};

// ============================================================================
// DISCORD REPLY CONFIG
// ============================================================================

export const discordReplyLight: DiscordReplyConfig = {
  enabled: true,
  showPreview: true,
  maxPreviewChars: 200,
  pingOption: true,
  defaultPing: true,
  cancelButton: true,
  backgroundColor: "#F2F3F5",
};

export const discordReplyDark: DiscordReplyConfig = {
  ...discordReplyLight,
  backgroundColor: "#2B2D31",
};

// ============================================================================
// DISCORD MESSAGE ACTION BAR CONFIG
// ============================================================================

export const discordMessageActionBarLight: DiscordMessageActionBarConfig = {
  enabled: true,
  actions: ["add-reaction", "edit", "reply", "create-thread", "pin", "more"],
  quickReaction: true,
  quickReactionSlots: 4,
  backgroundColor: "#FFFFFF",
  borderRadius: "4px",
  shadow: "0 0 0 1px rgba(4, 4, 5, 0.15)",
};

export const discordMessageActionBarDark: DiscordMessageActionBarConfig = {
  ...discordMessageActionBarLight,
  backgroundColor: "#313338",
  shadow: "0 0 0 1px rgba(4, 4, 5, 0.15)",
};

// ============================================================================
// DISCORD SEND BUTTON CONFIG
// ============================================================================

export const discordSendButtonConfig: DiscordSendButtonConfig = {
  visible: false,
  primaryMethod: "enter",
  shiftEnterNewline: true,
  ctrlEnterToSend: false,
};

// ============================================================================
// ASSEMBLED DISCORD COMPOSER CONFIGS
// ============================================================================

export const discordComposerLight: DiscordComposerConfig = {
  minHeight: "44px",
  maxHeight: "50vh",
  inputBg: "#EBEDEF",
  inputText: "#313338",
  placeholderText: "Message #channel-name",
  placeholderColor: "#80848E",
  inputBorderRadius: "8px",
  inputPadding: "11px 16px",
  inputFontSize: "16px",
  composerBg: "#FFFFFF",
  composerMargin: "0 16px 24px",
  attachmentMenu: discordAttachmentMenu,
  slashCommands: discordSlashCommandConfig,
  emojiPicker: discordEmojiPickerConfig,
  reply: discordReplyLight,
  messageActionBar: discordMessageActionBarLight,
  sendButton: discordSendButtonConfig,
  pasteImages: true,
  dragAndDrop: true,
  mentionSuggestions: true,
  channelSuggestions: true,
  emojiAutocomplete: true,
  characterCount: "near-limit",
  characterCountThreshold: 90,
  typingIndicator: true,
};

export const discordComposerDark: DiscordComposerConfig = {
  ...discordComposerLight,
  inputBg: "#383A40",
  inputText: "#DBDEE1",
  placeholderColor: "#6D6F78",
  composerBg: "#313338",
  reply: discordReplyDark,
  messageActionBar: discordMessageActionBarDark,
};

// ============================================================================
// COMPOSER HELPERS
// ============================================================================

/**
 * Get the Discord composer configuration for the given color mode.
 */
export function getDiscordComposer(
  isDarkMode: boolean = true,
): DiscordComposerConfig {
  return isDarkMode ? discordComposerDark : discordComposerLight;
}

/**
 * Get the attachment menu items sorted by their order.
 */
export function getDiscordAttachmentMenu(): DiscordAttachmentMenuItem[] {
  return [...discordAttachmentMenu].sort((a, b) => a.order - b.order);
}

/**
 * Find an attachment menu item by its ID.
 */
export function getDiscordAttachmentById(
  id: string,
): DiscordAttachmentMenuItem | undefined {
  return discordAttachmentMenu.find((item) => item.id === id);
}

/**
 * Get the number of attachment menu items.
 */
export function getDiscordAttachmentCount(): number {
  return discordAttachmentMenu.length;
}

/**
 * Get the slash command configuration.
 */
export function getDiscordSlashCommands(): DiscordSlashCommandConfig {
  return discordSlashCommandConfig;
}

/**
 * Get the count of built-in slash commands.
 */
export function getDiscordBuiltInCommandCount(): number {
  return discordSlashCommandConfig.builtInCommands.length;
}
