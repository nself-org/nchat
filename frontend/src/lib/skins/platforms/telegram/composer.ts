/**
 * Telegram Composer Configuration
 *
 * Defines the Telegram message input/composer behavior and layout,
 * including the attachment menu, voice recording, video message recording,
 * emoji/sticker picker, bot command suggestions, and formatting toolbar.
 *
 * Key characteristics:
 *   - Voice messages with waveform (tap-to-record, slide-to-cancel)
 *   - Video messages (circular viewfinder, tap to record)
 *   - Bot command suggestions (/ prefix)
 *   - Inline bot queries (@botname query)
 *   - Attachment menu: Photo/Video, File, Location, Contact, Poll
 *   - Sticker/GIF/Emoji tabs in picker
 *   - Scheduled send option
 *   - Silent send option
 *   - Formatting toolbar (bold, italic, underline, strikethrough, monospace, spoiler)
 *   - Reply/Forward/Edit bar above composer
 *   - Send button appears when text entered; mic/video-camera otherwise
 *
 * @module lib/skins/platforms/telegram/composer
 * @version 1.0.0
 */

// ============================================================================
// COMPOSER TYPES
// ============================================================================

/**
 * Attachment menu item in the Telegram composer.
 */
export interface TelegramAttachmentMenuItem {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Icon name */
  icon: string;
  /** Icon background color */
  iconBg: string;
  /** Icon foreground color */
  iconColor: string;
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
 * Voice message recording configuration for Telegram.
 */
export interface TelegramVoiceRecordingConfig {
  /** Whether voice messages are enabled */
  enabled: boolean;
  /** Maximum recording duration in seconds */
  maxDurationSec: number;
  /** Minimum recording duration in seconds */
  minDurationSec: number;
  /** Audio format */
  format: "opus" | "ogg" | "mp3";
  /** Sample rate in Hz */
  sampleRate: number;
  /** Whether waveform visualization is shown during recording */
  waveformVisualization: boolean;
  /** Whether slide-to-cancel is available */
  slideToCancel: boolean;
  /** Whether lock-to-hands-free is available */
  lockToHandsFree: boolean;
  /** Whether playback review before sending is available */
  playbackReview: boolean;
  /** Whether waveform is shown in the sent message */
  sentWaveform: boolean;
  /** Recording indicator color */
  indicatorColor: string;
  /** Waveform bar color */
  waveformColor: string;
  /** Waveform played color */
  waveformPlayedColor: string;
}

/**
 * Video message (circle) recording configuration for Telegram.
 */
export interface TelegramVideoMessageConfig {
  /** Whether video messages (circles) are enabled */
  enabled: boolean;
  /** Maximum recording duration in seconds */
  maxDurationSec: number;
  /** Viewfinder shape */
  viewfinderShape: "circle" | "square";
  /** Tap-to-record behavior */
  tapToRecord: boolean;
  /** Hold-to-record behavior */
  holdToRecord: boolean;
  /** Playback loop on receive */
  playbackLoop: boolean;
  /** Whether one-time playback option is available */
  oneTimePlayback: boolean;
  /** Video resolution */
  maxResolution: string;
  /** Ring color around viewfinder */
  ringColor: string;
}

/**
 * Emoji/sticker picker configuration for Telegram.
 */
export interface TelegramEmojiPickerConfig {
  /** Whether emoji picker is available */
  enabled: boolean;
  /** How the picker is triggered */
  trigger: "icon" | "keyboard-shortcut" | "both";
  /** Picker position relative to composer */
  position: "above" | "below" | "overlay";
  /** Whether recent emojis section is shown */
  recentEmojis: boolean;
  /** Maximum recent emojis stored */
  maxRecentEmojis: number;
  /** Whether emoji search is available */
  search: boolean;
  /** Whether sticker tab is included */
  stickersTab: boolean;
  /** Whether GIF tab is included */
  gifsTab: boolean;
  /** Whether custom emoji are available (Telegram Premium) */
  customEmoji: boolean;
  /** Skin tone selector */
  skinToneSelector: boolean;
  /** Number of columns in the emoji grid */
  gridColumns: number;
  /** Whether animated stickers are supported */
  animatedStickers: boolean;
  /** Whether sticker pack search is available */
  stickerPackSearch: boolean;
  /** Trending stickers section */
  trendingStickers: boolean;
}

/**
 * Reply/Forward/Edit preview configuration.
 */
export interface TelegramReplyPreviewConfig {
  /** Whether reply preview is shown */
  enabled: boolean;
  /** Whether the preview shows the quoted message text */
  showText: boolean;
  /** Maximum characters shown in the preview */
  maxPreviewChars: number;
  /** Whether media thumbnails are shown in the preview */
  showMediaThumbnail: boolean;
  /** Close/cancel button available */
  cancelButton: boolean;
  /** Color accent bar on the left of the preview */
  accentBar: boolean;
  /** Accent bar color (uses sender color) */
  accentBarColor: string;
  /** Background color */
  backgroundColor: string;
}

/**
 * Bot command suggestion configuration.
 */
export interface TelegramBotCommandConfig {
  /** Whether bot command suggestions are enabled */
  enabled: boolean;
  /** Trigger character */
  triggerChar: string;
  /** Inline bot trigger character */
  inlineBotTriggerChar: string;
  /** Whether bot menu button is shown */
  menuButton: boolean;
  /** Whether command descriptions are shown */
  showDescriptions: boolean;
  /** Maximum commands shown in suggestion list */
  maxSuggestions: number;
}

/**
 * Send button configuration for Telegram.
 */
export interface TelegramSendButtonConfig {
  /** Send button background color */
  backgroundColor: string;
  /** Send button icon color */
  iconColor: string;
  /** Button shape */
  shape: "circle" | "rounded" | "square";
  /** Button size */
  size: string;
  /** Whether the button toggles between send and mic/video */
  toggleWithMedia: boolean;
  /** Media toggle modes */
  mediaToggleModes: string[];
  /** Animation when switching between send and mic */
  toggleAnimation: boolean;
  /** Whether long-press shows scheduling options */
  longPressSchedule: boolean;
  /** Whether silent send option is available on long-press */
  longPressSilent: boolean;
}

/**
 * Formatting toolbar configuration for Telegram.
 */
export interface TelegramFormattingToolbarConfig {
  /** Whether formatting toolbar is available */
  enabled: boolean;
  /** Available formatting options */
  options: string[];
  /** Whether toolbar appears on text selection */
  showOnSelection: boolean;
  /** Toolbar position */
  position: "above-selection" | "above-composer" | "inline";
}

/**
 * Complete Telegram composer configuration.
 */
export interface TelegramComposerConfig {
  /** Composer bar height (min) */
  minHeight: string;
  /** Composer bar max height before scroll */
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
  /** Whether the composer has a border on top */
  topBorder: boolean;
  /** Top border color */
  topBorderColor: string;
  /** Attachment menu items */
  attachmentMenu: TelegramAttachmentMenuItem[];
  /** Voice recording configuration */
  voiceRecording: TelegramVoiceRecordingConfig;
  /** Video message configuration */
  videoMessage: TelegramVideoMessageConfig;
  /** Emoji picker configuration */
  emojiPicker: TelegramEmojiPickerConfig;
  /** Reply preview configuration */
  replyPreview: TelegramReplyPreviewConfig;
  /** Bot command configuration */
  botCommands: TelegramBotCommandConfig;
  /** Send button configuration */
  sendButton: TelegramSendButtonConfig;
  /** Formatting toolbar configuration */
  formattingToolbar: TelegramFormattingToolbarConfig;
  /** Whether paste-to-send images is supported */
  pasteImages: boolean;
  /** Whether drag-and-drop file sharing is supported */
  dragAndDrop: boolean;
  /** Whether mention suggestions are shown while typing */
  mentionSuggestions: boolean;
  /** Whether hashtag suggestions are shown */
  hashtagSuggestions: boolean;
  /** Character count display mode */
  characterCount: "none" | "always" | "near-limit";
  /** Character count warning threshold (percent of max) */
  characterCountThreshold: number;
}

// ============================================================================
// TELEGRAM ATTACHMENT MENU
// ============================================================================

export const telegramAttachmentMenuLight: TelegramAttachmentMenuItem[] = [
  {
    id: "photo-video",
    label: "Photo or Video",
    icon: "image",
    iconBg: "#3390EC",
    iconColor: "#FFFFFF",
    systemPicker: true,
    acceptedTypes: ["image/*", "video/*"],
    maxFileSize: 2 * 1024 * 1024 * 1024,
    order: 1,
  },
  {
    id: "file",
    label: "File",
    icon: "file",
    iconBg: "#6C5CE7",
    iconColor: "#FFFFFF",
    systemPicker: true,
    acceptedTypes: ["*/*"],
    maxFileSize: 2 * 1024 * 1024 * 1024,
    order: 2,
  },
  {
    id: "location",
    label: "Location",
    icon: "map-pin",
    iconBg: "#4FAE4E",
    iconColor: "#FFFFFF",
    systemPicker: false,
    order: 3,
  },
  {
    id: "contact",
    label: "Contact",
    icon: "user",
    iconBg: "#E6A817",
    iconColor: "#FFFFFF",
    systemPicker: false,
    order: 4,
  },
  {
    id: "poll",
    label: "Poll",
    icon: "bar-chart-2",
    iconBg: "#E53935",
    iconColor: "#FFFFFF",
    systemPicker: false,
    order: 5,
  },
];

export const telegramAttachmentMenuDark: TelegramAttachmentMenuItem[] =
  telegramAttachmentMenuLight.map((item) => ({
    ...item,
    // Dark mode uses same colored icon backgrounds
  }));

// ============================================================================
// TELEGRAM VOICE RECORDING CONFIG
// ============================================================================

export const telegramVoiceRecordingLight: TelegramVoiceRecordingConfig = {
  enabled: true,
  maxDurationSec: 30 * 60, // 30 minutes
  minDurationSec: 1,
  format: "ogg",
  sampleRate: 48000,
  waveformVisualization: true,
  slideToCancel: true,
  lockToHandsFree: true,
  playbackReview: true,
  sentWaveform: true,
  indicatorColor: "#E53935",
  waveformColor: "#B0BEC5",
  waveformPlayedColor: "#3390EC",
};

export const telegramVoiceRecordingDark: TelegramVoiceRecordingConfig = {
  ...telegramVoiceRecordingLight,
  indicatorColor: "#E53935",
  waveformColor: "#455A64",
  waveformPlayedColor: "#6AB2F2",
};

// ============================================================================
// TELEGRAM VIDEO MESSAGE CONFIG
// ============================================================================

export const telegramVideoMessageLight: TelegramVideoMessageConfig = {
  enabled: true,
  maxDurationSec: 60,
  viewfinderShape: "circle",
  tapToRecord: true,
  holdToRecord: true,
  playbackLoop: true,
  oneTimePlayback: true,
  maxResolution: "384x384",
  ringColor: "#3390EC",
};

export const telegramVideoMessageDark: TelegramVideoMessageConfig = {
  ...telegramVideoMessageLight,
  ringColor: "#6AB2F2",
};

// ============================================================================
// TELEGRAM EMOJI PICKER CONFIG
// ============================================================================

export const telegramEmojiPickerConfig: TelegramEmojiPickerConfig = {
  enabled: true,
  trigger: "icon",
  position: "above",
  recentEmojis: true,
  maxRecentEmojis: 48,
  search: true,
  stickersTab: true,
  gifsTab: true,
  customEmoji: true,
  skinToneSelector: true,
  gridColumns: 8,
  animatedStickers: true,
  stickerPackSearch: true,
  trendingStickers: true,
};

// ============================================================================
// TELEGRAM REPLY PREVIEW CONFIG
// ============================================================================

export const telegramReplyPreviewLight: TelegramReplyPreviewConfig = {
  enabled: true,
  showText: true,
  maxPreviewChars: 150,
  showMediaThumbnail: true,
  cancelButton: true,
  accentBar: true,
  accentBarColor: "#3390EC",
  backgroundColor: "#F0F2F5",
};

export const telegramReplyPreviewDark: TelegramReplyPreviewConfig = {
  ...telegramReplyPreviewLight,
  accentBarColor: "#6AB2F2",
  backgroundColor: "#242F3D",
};

// ============================================================================
// TELEGRAM BOT COMMAND CONFIG
// ============================================================================

export const telegramBotCommandConfig: TelegramBotCommandConfig = {
  enabled: true,
  triggerChar: "/",
  inlineBotTriggerChar: "@",
  menuButton: true,
  showDescriptions: true,
  maxSuggestions: 10,
};

// ============================================================================
// TELEGRAM SEND BUTTON CONFIG
// ============================================================================

export const telegramSendButtonLight: TelegramSendButtonConfig = {
  backgroundColor: "#3390EC",
  iconColor: "#FFFFFF",
  shape: "circle",
  size: "44px",
  toggleWithMedia: true,
  mediaToggleModes: ["mic", "video-message"],
  toggleAnimation: true,
  longPressSchedule: true,
  longPressSilent: true,
};

export const telegramSendButtonDark: TelegramSendButtonConfig = {
  ...telegramSendButtonLight,
  backgroundColor: "#6AB2F2",
  iconColor: "#212121",
};

// ============================================================================
// TELEGRAM FORMATTING TOOLBAR CONFIG
// ============================================================================

export const telegramFormattingToolbarConfig: TelegramFormattingToolbarConfig =
  {
    enabled: true,
    options: [
      "bold",
      "italic",
      "underline",
      "strikethrough",
      "monospace",
      "spoiler",
      "link",
      "quote",
    ],
    showOnSelection: true,
    position: "above-selection",
  };

// ============================================================================
// ASSEMBLED TELEGRAM COMPOSER CONFIGS
// ============================================================================

export const telegramComposerLight: TelegramComposerConfig = {
  minHeight: "50px",
  maxHeight: "220px",
  inputBg: "#FFFFFF",
  inputText: "#000000",
  placeholderText: "Message",
  placeholderColor: "#707579",
  inputBorderRadius: "12px",
  inputPadding: "8px 12px",
  inputFontSize: "14px",
  composerBg: "#FFFFFF",
  topBorder: true,
  topBorderColor: "#E6E6E6",
  attachmentMenu: telegramAttachmentMenuLight,
  voiceRecording: telegramVoiceRecordingLight,
  videoMessage: telegramVideoMessageLight,
  emojiPicker: telegramEmojiPickerConfig,
  replyPreview: telegramReplyPreviewLight,
  botCommands: telegramBotCommandConfig,
  sendButton: telegramSendButtonLight,
  formattingToolbar: telegramFormattingToolbarConfig,
  pasteImages: true,
  dragAndDrop: true,
  mentionSuggestions: true,
  hashtagSuggestions: true,
  characterCount: "near-limit",
  characterCountThreshold: 90,
};

export const telegramComposerDark: TelegramComposerConfig = {
  ...telegramComposerLight,
  inputBg: "#242F3D",
  inputText: "#F5F5F5",
  placeholderColor: "#6D7883",
  composerBg: "#17212B",
  topBorderColor: "#303030",
  attachmentMenu: telegramAttachmentMenuDark,
  voiceRecording: telegramVoiceRecordingDark,
  videoMessage: telegramVideoMessageDark,
  replyPreview: telegramReplyPreviewDark,
  sendButton: telegramSendButtonDark,
};

// ============================================================================
// COMPOSER HELPERS
// ============================================================================

/**
 * Get the Telegram composer configuration for the given color mode.
 */
export function getTelegramComposer(
  isDarkMode: boolean = false,
): TelegramComposerConfig {
  return isDarkMode ? telegramComposerDark : telegramComposerLight;
}

/**
 * Get the attachment menu items sorted by their order.
 */
export function getTelegramAttachmentMenu(
  isDarkMode: boolean = false,
): TelegramAttachmentMenuItem[] {
  const menu = isDarkMode
    ? telegramAttachmentMenuDark
    : telegramAttachmentMenuLight;
  return [...menu].sort((a, b) => a.order - b.order);
}

/**
 * Find an attachment menu item by its ID.
 */
export function getTelegramAttachmentById(
  id: string,
  isDarkMode: boolean = false,
): TelegramAttachmentMenuItem | undefined {
  const menu = isDarkMode
    ? telegramAttachmentMenuDark
    : telegramAttachmentMenuLight;
  return menu.find((item) => item.id === id);
}

/**
 * Get the number of attachment menu items.
 */
export function getTelegramAttachmentCount(): number {
  return telegramAttachmentMenuLight.length;
}
