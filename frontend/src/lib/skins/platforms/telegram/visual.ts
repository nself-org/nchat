/**
 * Telegram Platform Visual Skin
 *
 * Detailed visual skin matching Telegram Desktop and Mobile design language.
 * All color values, typography, spacing, border radius, and shadow tokens
 * are derived from Telegram's actual UI as of 2026.
 *
 * Key characteristics:
 *   - Blue accent color palette (#0088CC primary, #2B5278 dark accent)
 *   - Light green own-message bubbles (#EFFDDE light, #2B5278 dark)
 *   - System / Roboto font stack
 *   - 12px message bubble border radius
 *   - Rounded avatars with colored initials
 *   - Floating action button navigation
 *   - Distinct sidebar background (#F0F2F5 light, #17212B dark)
 *   - Inline keyboard button styles for bots
 *   - Grouped media messages with rounded corners
 *
 * @module lib/skins/platforms/telegram/visual
 * @version 1.0.0
 */

import type {
  VisualSkin,
  SkinColorPalette,
  SkinTypography,
  SkinSpacing,
  SkinBorderRadius,
  SkinIconStyle,
  SkinComponentStyles,
} from "../../types";

// ============================================================================
// TELEGRAM COLOR PALETTES
// ============================================================================

/**
 * Telegram light mode color palette.
 *
 * Derived from Telegram Desktop/Web inspection (2026):
 * - Primary blue: #0088CC (Telegram brand blue)
 * - Chat background: #FFFFFF
 * - Secondary background (sidebar): #F0F2F5
 * - Own message bubble: #EFFDDE (light green)
 * - Others message bubble: #FFFFFF (white)
 * - Primary text: #000000
 * - Secondary text: #707579 (gray)
 * - Accent/links: #3390EC (blue)
 * - Unread badge: #3390EC (blue)
 */
export const telegramLightColors: SkinColorPalette = {
  primary: "#0088CC",
  secondary: "#3390EC",
  accent: "#3390EC",
  background: "#FFFFFF",
  surface: "#F0F2F5",
  text: "#000000",
  textSecondary: "#707579",
  muted: "#A8A8A8",
  border: "#E6E6E6",
  success: "#4FAE4E",
  warning: "#E6A817",
  error: "#E53935",
  info: "#3390EC",
  buttonPrimaryBg: "#3390EC",
  buttonPrimaryText: "#FFFFFF",
  buttonSecondaryBg: "#F0F2F5",
  buttonSecondaryText: "#3390EC",
};

/**
 * Telegram dark mode color palette.
 *
 * Derived from Telegram Desktop/Web dark mode (2026):
 * - Background: #212121
 * - Sidebar: #17212B
 * - Chat background: #0E1621 (dark navy)
 * - Own message bubble: #2B5278 (dark blue)
 * - Others message bubble: #182533
 * - Primary text: #F5F5F5 (off-white)
 * - Secondary text: #AAAAAA
 * - Accent: #6AB2F2 (light blue)
 * - Unread badge: #6AB2F2
 */
export const telegramDarkColors: SkinColorPalette = {
  primary: "#6AB2F2",
  secondary: "#2B5278",
  accent: "#6AB2F2",
  background: "#212121",
  surface: "#17212B",
  text: "#F5F5F5",
  textSecondary: "#AAAAAA",
  muted: "#6D7883",
  border: "#303030",
  success: "#4FAE4E",
  warning: "#E6A817",
  error: "#E53935",
  info: "#6AB2F2",
  buttonPrimaryBg: "#6AB2F2",
  buttonPrimaryText: "#212121",
  buttonSecondaryBg: "#2B5278",
  buttonSecondaryText: "#F5F5F5",
};

// ============================================================================
// TELEGRAM-SPECIFIC EXTENDED COLORS
// ============================================================================

/**
 * Extended color tokens specific to Telegram that go beyond the standard
 * SkinColorPalette. Used for Telegram-specific UI elements.
 */
export interface TelegramExtendedColors {
  /** Header bar background */
  headerBg: string;
  /** Header bar text color */
  headerText: string;
  /** Header bar icon color */
  headerIcon: string;
  /** Chat background color */
  chatBg: string;
  /** Chat wallpaper pattern (Telegram uses subtle patterns) */
  chatWallpaperPattern: string;
  /** Sent message bubble background (own messages) */
  sentBubbleBg: string;
  /** Sent message bubble text */
  sentBubbleText: string;
  /** Received message bubble background (others) */
  receivedBubbleBg: string;
  /** Received message bubble text */
  receivedBubbleText: string;
  /** Message timestamp color */
  messageTimestamp: string;
  /** Read receipt checkmark color */
  readReceiptColor: string;
  /** Delivered receipt checkmark color */
  deliveredReceiptColor: string;
  /** Composer bar background */
  composerBg: string;
  /** Composer input background */
  composerInputBg: string;
  /** Composer icons color */
  composerIcon: string;
  /** Voice recording indicator */
  recordingIndicator: string;
  /** Search bar background */
  searchBarBg: string;
  /** Dropdown/popup menu background */
  dropdownBg: string;
  /** System message (date divider, action messages) */
  systemBubbleBg: string;
  /** System message text */
  systemBubbleText: string;
  /** Unread count badge background */
  unreadBadgeBg: string;
  /** Unread count badge text */
  unreadBadgeText: string;
  /** Muted chat unread badge */
  mutedUnreadBadgeBg: string;
  /** Archived indicator */
  archivedBg: string;
  /** Link color in messages */
  linkColor: string;
  /** Online status dot */
  onlineIndicator: string;
  /** Typing indicator dots color */
  typingIndicatorColor: string;
  /** Selected chat list item background */
  selectedChatBg: string;
  /** Hover chat list item background */
  hoverChatBg: string;
  /** Forwarded label color */
  forwardedLabelColor: string;
  /** Pinned message icon color */
  pinnedIconColor: string;
  /** Reaction bubble background */
  reactionBubbleBg: string;
  /** Media overlay background (image/video) */
  mediaOverlayBg: string;
  /** Inline keyboard button background (bot buttons) */
  inlineKeyboardBg: string;
  /** Inline keyboard button text */
  inlineKeyboardText: string;
  /** Chat folder tab active background */
  folderTabActiveBg: string;
  /** Chat folder tab inactive text */
  folderTabInactiveText: string;
  /** Secret chat indicator color (green lock) */
  secretChatIndicator: string;
  /** Admin badge color */
  adminBadgeColor: string;
  /** Sender name colors (Telegram uses multiple colors per sender) */
  senderNameColors: string[];
}

export const telegramExtendedLightColors: TelegramExtendedColors = {
  headerBg: "#4A8ECB",
  headerText: "#FFFFFF",
  headerIcon: "#FFFFFF",
  chatBg: "#FFFFFF",
  chatWallpaperPattern: "#DAEAF6",
  sentBubbleBg: "#EFFDDE",
  sentBubbleText: "#000000",
  receivedBubbleBg: "#FFFFFF",
  receivedBubbleText: "#000000",
  messageTimestamp: "#6EB06C",
  readReceiptColor: "#4FAE4E",
  deliveredReceiptColor: "#6EB06C",
  composerBg: "#FFFFFF",
  composerInputBg: "#FFFFFF",
  composerIcon: "#9E9E9E",
  recordingIndicator: "#E53935",
  searchBarBg: "#F0F2F5",
  dropdownBg: "#FFFFFF",
  systemBubbleBg: "#C1E3FC",
  systemBubbleText: "#4C7FA5",
  unreadBadgeBg: "#3390EC",
  unreadBadgeText: "#FFFFFF",
  mutedUnreadBadgeBg: "#A8A8A8",
  archivedBg: "#F0F2F5",
  linkColor: "#3390EC",
  onlineIndicator: "#0AC630",
  typingIndicatorColor: "#3390EC",
  selectedChatBg: "#3390EC",
  hoverChatBg: "#F0F2F5",
  forwardedLabelColor: "#3390EC",
  pinnedIconColor: "#A8A8A8",
  reactionBubbleBg: "#E8F5E9",
  mediaOverlayBg: "#00000066",
  inlineKeyboardBg: "#E8F0FE",
  inlineKeyboardText: "#3390EC",
  folderTabActiveBg: "#3390EC",
  folderTabInactiveText: "#707579",
  secretChatIndicator: "#4FAE4E",
  adminBadgeColor: "#3390EC",
  senderNameColors: [
    "#C03D33",
    "#4FAD2D",
    "#D09306",
    "#348CD4",
    "#8544D6",
    "#CD4073",
    "#2996AD",
    "#CE671B",
  ],
};

export const telegramExtendedDarkColors: TelegramExtendedColors = {
  headerBg: "#17212B",
  headerText: "#F5F5F5",
  headerIcon: "#AAAAAA",
  chatBg: "#0E1621",
  chatWallpaperPattern: "#0D1A26",
  sentBubbleBg: "#2B5278",
  sentBubbleText: "#F5F5F5",
  receivedBubbleBg: "#182533",
  receivedBubbleText: "#F5F5F5",
  messageTimestamp: "#6D96B8",
  readReceiptColor: "#6AB2F2",
  deliveredReceiptColor: "#6D96B8",
  composerBg: "#17212B",
  composerInputBg: "#242F3D",
  composerIcon: "#6D7883",
  recordingIndicator: "#E53935",
  searchBarBg: "#242F3D",
  dropdownBg: "#17212B",
  systemBubbleBg: "#1B3144",
  systemBubbleText: "#6D96B8",
  unreadBadgeBg: "#6AB2F2",
  unreadBadgeText: "#212121",
  mutedUnreadBadgeBg: "#6D7883",
  archivedBg: "#17212B",
  linkColor: "#6AB2F2",
  onlineIndicator: "#0AC630",
  typingIndicatorColor: "#6AB2F2",
  selectedChatBg: "#2B5278",
  hoverChatBg: "#1E2C3A",
  forwardedLabelColor: "#6AB2F2",
  pinnedIconColor: "#6D7883",
  reactionBubbleBg: "#1B3144",
  mediaOverlayBg: "#00000099",
  inlineKeyboardBg: "#2B5278",
  inlineKeyboardText: "#6AB2F2",
  folderTabActiveBg: "#6AB2F2",
  folderTabInactiveText: "#6D7883",
  secretChatIndicator: "#4FAE4E",
  adminBadgeColor: "#6AB2F2",
  senderNameColors: [
    "#FC5C51",
    "#4FAD2D",
    "#E6A817",
    "#6AB2F2",
    "#B485E0",
    "#CD4073",
    "#2996AD",
    "#CE671B",
  ],
};

// ============================================================================
// TELEGRAM TYPOGRAPHY
// ============================================================================

/**
 * Telegram uses system font with Roboto as primary fallback on Android/Web.
 * Apple system font on macOS/iOS. Font sizes are slightly smaller than
 * WhatsApp at 14px base.
 */
export const telegramTypography: SkinTypography = {
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Roboto", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
  fontFamilyMono:
    '"Roboto Mono", "SF Mono", "Menlo", "Monaco", "Consolas", monospace',
  fontSizeBase: "14px",
  fontSizeSm: "12px",
  fontSizeLg: "16px",
  fontSizeXl: "20px",
  fontWeightNormal: 400,
  fontWeightMedium: 500,
  fontWeightBold: 700,
  lineHeight: 1.375,
  letterSpacing: "normal",
};

// ============================================================================
// TELEGRAM SPACING
// ============================================================================

/**
 * Telegram spacing tokens. Telegram uses a 360px sidebar on desktop,
 * 56px header, and specific avatar sizes.
 */
export const telegramSpacing: SkinSpacing = {
  messageGap: "4px",
  messagePadding: "7px 11px 7px 11px",
  sidebarWidth: "360px",
  headerHeight: "56px",
  inputHeight: "44px",
  avatarSize: "42px",
  avatarSizeSm: "26px",
  avatarSizeLg: "54px",
};

// ============================================================================
// TELEGRAM BORDER RADIUS
// ============================================================================

/**
 * Telegram uses 12px for message bubbles (more rounded than WhatsApp),
 * fully rounded avatars and badges, and moderate rounding for cards.
 */
export const telegramBorderRadius: SkinBorderRadius = {
  none: "0px",
  sm: "6px",
  md: "12px",
  lg: "12px",
  xl: "16px",
  full: "9999px",
};

// ============================================================================
// TELEGRAM ICON STYLE
// ============================================================================

/**
 * Telegram uses a mix of outline and filled icons, with moderate stroke.
 */
export const telegramIcons: SkinIconStyle = {
  style: "outline",
  set: "lucide",
  strokeWidth: 1.75,
};

// ============================================================================
// TELEGRAM COMPONENT STYLES
// ============================================================================

/**
 * Telegram component style config. Bubbles layout, circular avatars,
 * default buttons, outline inputs define the Telegram feel.
 */
export const telegramComponentStyles: SkinComponentStyles = {
  messageLayout: "bubbles",
  avatarShape: "circle",
  buttonStyle: "default",
  inputStyle: "outline",
  sidebarStyle: "default",
  headerStyle: "default",
  scrollbarStyle: "thin",
};

// ============================================================================
// TELEGRAM SHADOW TOKENS
// ============================================================================

/**
 * Telegram-specific shadow definitions. Telegram uses a distinct elevation
 * system with more prominent shadows on floating elements like the compose
 * button and context menus.
 */
export interface TelegramShadows {
  /** Header shadow (subtle bottom edge) */
  header: string;
  /** Dropdown/popup shadow */
  dropdown: string;
  /** Floating action button shadow */
  fab: string;
  /** Chat list item hover shadow */
  chatListHover: string;
  /** Modal/dialog shadow */
  modal: string;
  /** Toast notification shadow */
  toast: string;
  /** Inline keyboard button shadow */
  inlineKeyboard: string;
  /** Media message shadow */
  mediaMessage: string;
}

export const telegramLightShadows: TelegramShadows = {
  header: "0 1px 2px rgba(0, 0, 0, 0.1)",
  dropdown: "0 2px 8px rgba(0, 0, 0, 0.15), 0 0px 1px rgba(0, 0, 0, 0.1)",
  fab: "0 2px 8px rgba(0, 0, 0, 0.25)",
  chatListHover: "none",
  modal: "0 4px 20px rgba(0, 0, 0, 0.16)",
  toast: "0 3px 10px rgba(0, 0, 0, 0.12)",
  inlineKeyboard: "0 1px 2px rgba(0, 0, 0, 0.08)",
  mediaMessage: "0 1px 3px rgba(0, 0, 0, 0.12)",
};

export const telegramDarkShadows: TelegramShadows = {
  header: "0 1px 2px rgba(0, 0, 0, 0.3)",
  dropdown: "0 2px 8px rgba(0, 0, 0, 0.4), 0 0px 1px rgba(0, 0, 0, 0.25)",
  fab: "0 2px 8px rgba(0, 0, 0, 0.5)",
  chatListHover: "none",
  modal: "0 4px 20px rgba(0, 0, 0, 0.4)",
  toast: "0 3px 10px rgba(0, 0, 0, 0.3)",
  inlineKeyboard: "0 1px 2px rgba(0, 0, 0, 0.2)",
  mediaMessage: "0 1px 3px rgba(0, 0, 0, 0.3)",
};

// ============================================================================
// ASSEMBLED TELEGRAM VISUAL SKIN
// ============================================================================

/**
 * Complete Telegram visual skin definition. This extends the base
 * VisualSkin with Telegram's exact visual specifications.
 */
export const telegramDetailedSkin: VisualSkin = {
  id: "telegram-detailed",
  name: "Telegram",
  description:
    "Detailed Telegram-parity visual skin with exact colors, typography, spacing, and component styles matching Telegram Desktop/Mobile",
  version: "0.9.1",
  colors: telegramLightColors,
  typography: telegramTypography,
  spacing: telegramSpacing,
  borderRadius: telegramBorderRadius,
  icons: telegramIcons,
  components: telegramComponentStyles,
  darkMode: {
    colors: telegramDarkColors,
  },
};

/**
 * Full Telegram visual config including extended colors and shadows.
 * Use this for components that need Telegram-specific styling beyond
 * the standard VisualSkin interface.
 */
export interface TelegramVisualConfig {
  skin: VisualSkin;
  extendedColors: {
    light: TelegramExtendedColors;
    dark: TelegramExtendedColors;
  };
  shadows: {
    light: TelegramShadows;
    dark: TelegramShadows;
  };
}

export const telegramVisualConfig: TelegramVisualConfig = {
  skin: telegramDetailedSkin,
  extendedColors: {
    light: telegramExtendedLightColors,
    dark: telegramExtendedDarkColors,
  },
  shadows: {
    light: telegramLightShadows,
    dark: telegramDarkShadows,
  },
};
