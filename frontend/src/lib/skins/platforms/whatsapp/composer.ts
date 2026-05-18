/**
 * WhatsApp Composer Configuration
 *
 * Defines the WhatsApp message input/composer behavior and layout,
 * including the attachment menu, voice recording, emoji picker, and
 * media capture affordances.
 *
 * Key characteristics:
 *   - Voice message recording with waveform visualization
 *   - Attachment menu with camera, gallery, document, location, contact options
 *   - Emoji picker accessible via icon (not keyboard shortcut)
 *   - Send button appears when text is entered; mic icon shown otherwise
 *   - No formatting toolbar (WhatsApp uses inline syntax: *bold*, _italic_)
 *   - Reply-to preview bar above composer
 *   - Paste support for images
 *
 * @module lib/skins/platforms/whatsapp/composer
 * @version 1.0.0
 */

// ============================================================================
// COMPOSER TYPES
// ============================================================================

/**
 * Attachment menu item in the WhatsApp composer.
 */
export interface AttachmentMenuItem {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Icon name */
  icon: string;
  /** Icon background color (WhatsApp uses colored circles) */
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
 * Voice message recording configuration.
 */
export interface VoiceRecordingConfig {
  /** Whether voice messages are enabled */
  enabled: boolean;
  /** Maximum recording duration in seconds */
  maxDurationSec: number;
  /** Minimum recording duration in seconds (below this is discarded) */
  minDurationSec: number;
  /** Audio format */
  format: "opus" | "aac" | "mp3";
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
 * Emoji picker configuration.
 */
export interface EmojiPickerConfig {
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
  /** Whether custom emoji are available (no for WhatsApp) */
  customEmoji: boolean;
  /** Skin tone selector */
  skinToneSelector: boolean;
  /** Number of columns in the emoji grid */
  gridColumns: number;
}

/**
 * Reply preview configuration shown above the composer.
 */
export interface ReplyPreviewConfig {
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
 * Send button configuration.
 */
export interface SendButtonConfig {
  /** Send button background color */
  backgroundColor: string;
  /** Send button icon color */
  iconColor: string;
  /** Button shape */
  shape: "circle" | "rounded" | "square";
  /** Button size */
  size: string;
  /** Whether the button toggles between send and mic */
  toggleWithMic: boolean;
  /** Animation when switching between send and mic */
  toggleAnimation: boolean;
  /** Whether long-press shows scheduling options */
  longPressSchedule: boolean;
}

/**
 * Complete WhatsApp composer configuration.
 */
export interface WhatsAppComposerConfig {
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
  attachmentMenu: AttachmentMenuItem[];
  /** Voice recording configuration */
  voiceRecording: VoiceRecordingConfig;
  /** Emoji picker configuration */
  emojiPicker: EmojiPickerConfig;
  /** Reply preview configuration */
  replyPreview: ReplyPreviewConfig;
  /** Send button configuration */
  sendButton: SendButtonConfig;
  /** Whether paste-to-send images is supported */
  pasteImages: boolean;
  /** Whether drag-and-drop file sharing is supported */
  dragAndDrop: boolean;
  /** Whether mention suggestions are shown while typing */
  mentionSuggestions: boolean;
  /** Character count display mode */
  characterCount: "none" | "always" | "near-limit";
  /** Character count warning threshold (percent of max) */
  characterCountThreshold: number;
}

// ============================================================================
// WHATSAPP ATTACHMENT MENU
// ============================================================================

export const whatsappAttachmentMenuLight: AttachmentMenuItem[] = [
  {
    id: "document",
    label: "Document",
    icon: "file-text",
    iconBg: "#5157AE",
    iconColor: "#FFFFFF",
    systemPicker: true,
    acceptedTypes: ["*/*"],
    maxFileSize: 2 * 1024 * 1024 * 1024, // 2 GB
    order: 1,
  },
  {
    id: "camera",
    label: "Camera",
    icon: "camera",
    iconBg: "#D3396D",
    iconColor: "#FFFFFF",
    systemPicker: true,
    order: 2,
  },
  {
    id: "gallery",
    label: "Gallery",
    icon: "image",
    iconBg: "#BF59CF",
    iconColor: "#FFFFFF",
    systemPicker: true,
    acceptedTypes: ["image/*", "video/*"],
    maxFileSize: 16 * 1024 * 1024, // 16 MB
    order: 3,
  },
  {
    id: "audio",
    label: "Audio",
    icon: "headphones",
    iconBg: "#EE7E34",
    iconColor: "#FFFFFF",
    systemPicker: true,
    acceptedTypes: ["audio/*"],
    maxFileSize: 16 * 1024 * 1024, // 16 MB
    order: 4,
  },
  {
    id: "location",
    label: "Location",
    icon: "map-pin",
    iconBg: "#1FA855",
    iconColor: "#FFFFFF",
    systemPicker: false,
    order: 5,
  },
  {
    id: "contact",
    label: "Contact",
    icon: "user",
    iconBg: "#0095F6",
    iconColor: "#FFFFFF",
    systemPicker: false,
    order: 6,
  },
  {
    id: "poll",
    label: "Poll",
    icon: "bar-chart-2",
    iconBg: "#02A698",
    iconColor: "#FFFFFF",
    systemPicker: false,
    order: 7,
  },
];

export const whatsappAttachmentMenuDark: AttachmentMenuItem[] =
  whatsappAttachmentMenuLight.map((item) => ({
    ...item,
    // Dark mode uses same icon background colors
  }));

// ============================================================================
// WHATSAPP VOICE RECORDING CONFIG
// ============================================================================

export const whatsappVoiceRecordingLight: VoiceRecordingConfig = {
  enabled: true,
  maxDurationSec: 15 * 60, // 15 minutes
  minDurationSec: 1,
  format: "opus",
  sampleRate: 48000,
  waveformVisualization: true,
  slideToCancel: true,
  lockToHandsFree: true,
  playbackReview: true,
  sentWaveform: true,
  indicatorColor: "#EA0038",
  waveformColor: "#A0AEB6",
  waveformPlayedColor: "#008069",
};

export const whatsappVoiceRecordingDark: VoiceRecordingConfig = {
  ...whatsappVoiceRecordingLight,
  indicatorColor: "#F15C6D",
  waveformColor: "#374955",
  waveformPlayedColor: "#00A884",
};

// ============================================================================
// WHATSAPP EMOJI PICKER CONFIG
// ============================================================================

export const whatsappEmojiPickerConfig: EmojiPickerConfig = {
  enabled: true,
  trigger: "icon",
  position: "above",
  recentEmojis: true,
  maxRecentEmojis: 36,
  search: true,
  stickersTab: true,
  gifsTab: true,
  customEmoji: false,
  skinToneSelector: true,
  gridColumns: 8,
};

// ============================================================================
// WHATSAPP REPLY PREVIEW CONFIG
// ============================================================================

export const whatsappReplyPreviewLight: ReplyPreviewConfig = {
  enabled: true,
  showText: true,
  maxPreviewChars: 120,
  showMediaThumbnail: true,
  cancelButton: true,
  accentBar: true,
  accentBarColor: "#008069",
  backgroundColor: "#F0F2F5",
};

export const whatsappReplyPreviewDark: ReplyPreviewConfig = {
  ...whatsappReplyPreviewLight,
  accentBarColor: "#00A884",
  backgroundColor: "#1F2C34",
};

// ============================================================================
// WHATSAPP SEND BUTTON CONFIG
// ============================================================================

export const whatsappSendButtonLight: SendButtonConfig = {
  backgroundColor: "#008069",
  iconColor: "#FFFFFF",
  shape: "circle",
  size: "40px",
  toggleWithMic: true,
  toggleAnimation: true,
  longPressSchedule: false,
};

export const whatsappSendButtonDark: SendButtonConfig = {
  ...whatsappSendButtonLight,
  backgroundColor: "#00A884",
};

// ============================================================================
// ASSEMBLED WHATSAPP COMPOSER CONFIGS
// ============================================================================

export const whatsappComposerLight: WhatsAppComposerConfig = {
  minHeight: "52px",
  maxHeight: "200px",
  inputBg: "#FFFFFF",
  inputText: "#111B21",
  placeholderText: "Type a message",
  placeholderColor: "#667781",
  inputBorderRadius: "8px",
  inputPadding: "9px 12px",
  inputFontSize: "15px",
  composerBg: "#F0F2F5",
  topBorder: false,
  topBorderColor: "#E9EDEF",
  attachmentMenu: whatsappAttachmentMenuLight,
  voiceRecording: whatsappVoiceRecordingLight,
  emojiPicker: whatsappEmojiPickerConfig,
  replyPreview: whatsappReplyPreviewLight,
  sendButton: whatsappSendButtonLight,
  pasteImages: true,
  dragAndDrop: true,
  mentionSuggestions: true,
  characterCount: "none",
  characterCountThreshold: 90,
};

export const whatsappComposerDark: WhatsAppComposerConfig = {
  ...whatsappComposerLight,
  inputBg: "#2A3942",
  inputText: "#E9EDEF",
  placeholderColor: "#8696A0",
  composerBg: "#202C33",
  topBorderColor: "#2A3942",
  attachmentMenu: whatsappAttachmentMenuDark,
  voiceRecording: whatsappVoiceRecordingDark,
  replyPreview: whatsappReplyPreviewDark,
  sendButton: whatsappSendButtonDark,
};

// ============================================================================
// COMPOSER HELPERS
// ============================================================================

/**
 * Get the WhatsApp composer configuration for the given color mode.
 */
export function getWhatsAppComposer(
  isDarkMode: boolean = false,
): WhatsAppComposerConfig {
  return isDarkMode ? whatsappComposerDark : whatsappComposerLight;
}

/**
 * Get the attachment menu items sorted by their order.
 */
export function getWhatsAppAttachmentMenu(
  isDarkMode: boolean = false,
): AttachmentMenuItem[] {
  const menu = isDarkMode
    ? whatsappAttachmentMenuDark
    : whatsappAttachmentMenuLight;
  return [...menu].sort((a, b) => a.order - b.order);
}

/**
 * Find an attachment menu item by its ID.
 */
export function getWhatsAppAttachmentById(
  id: string,
  isDarkMode: boolean = false,
): AttachmentMenuItem | undefined {
  const menu = isDarkMode
    ? whatsappAttachmentMenuDark
    : whatsappAttachmentMenuLight;
  return menu.find((item) => item.id === id);
}

/**
 * Get the number of attachment menu items.
 */
export function getWhatsAppAttachmentCount(): number {
  return whatsappAttachmentMenuLight.length;
}
