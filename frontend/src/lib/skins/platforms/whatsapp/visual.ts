/**
 * WhatsApp Platform Visual Skin
 *
 * Detailed visual skin matching WhatsApp Web and Mobile design language.
 * All color values, typography, spacing, border radius, and shadow tokens
 * are derived from WhatsApp's actual UI as of 2026.
 *
 * Key characteristics:
 *   - Teal/green color palette (#075E54, #128C7E, #25D366)
 *   - Chat bubble layout with distinct sent/received styles
 *   - Segoe UI / Helvetica Neue typography
 *   - Wallpaper-style chat backgrounds (#E5DDD5 light, #0B141A dark)
 *   - Minimal border radius on bubbles (7.5px)
 *   - Tab-based navigation (mobile) / sidebar-based (desktop)
 *
 * @module lib/skins/platforms/whatsapp/visual
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
// WHATSAPP COLOR PALETTES
// ============================================================================

/**
 * WhatsApp light mode color palette.
 *
 * Derived from WhatsApp Web inspection (2026):
 * - Header bar: #008069 (teal green)
 * - Chat background wallpaper: #E5DDD5 (warm gray-beige)
 * - Sent bubble: #D9FDD3 (pale green)
 * - Received bubble: #FFFFFF (white)
 * - Primary text: #111B21 (near black)
 * - Secondary text: #667781 (gray-blue)
 * - Icon default: #54656F (dark gray-blue)
 * - Accent/links: #008069 (teal)
 * - Unread badge: #25D366 (green)
 */
export const whatsappLightColors: SkinColorPalette = {
  primary: "#008069",
  secondary: "#128C7E",
  accent: "#25D366",
  background: "#FFFFFF",
  surface: "#F0F2F5",
  text: "#111B21",
  textSecondary: "#667781",
  muted: "#8696A0",
  border: "#E9EDEF",
  success: "#25D366",
  warning: "#FFC107",
  error: "#EA0038",
  info: "#53BDEB",
  buttonPrimaryBg: "#008069",
  buttonPrimaryText: "#FFFFFF",
  buttonSecondaryBg: "#F0F2F5",
  buttonSecondaryText: "#111B21",
};

/**
 * WhatsApp dark mode color palette.
 *
 * Derived from WhatsApp Web dark mode (2026):
 * - Header bar: #202C33 (dark slate)
 * - Chat background: #0B141A (near-black navy)
 * - Sent bubble: #005C4B (dark teal)
 * - Received bubble: #202C33 (dark slate)
 * - Primary text: #E9EDEF (off-white)
 * - Secondary text: #8696A0 (muted blue-gray)
 * - Accent: #00A884 (bright teal)
 * - Unread badge: #00A884 (teal)
 */
export const whatsappDarkColors: SkinColorPalette = {
  primary: "#00A884",
  secondary: "#005C4B",
  accent: "#25D366",
  background: "#111B21",
  surface: "#202C33",
  text: "#E9EDEF",
  textSecondary: "#8696A0",
  muted: "#8696A0",
  border: "#2A3942",
  success: "#25D366",
  warning: "#FFC107",
  error: "#F15C6D",
  info: "#53BDEB",
  buttonPrimaryBg: "#00A884",
  buttonPrimaryText: "#111B21",
  buttonSecondaryBg: "#2A3942",
  buttonSecondaryText: "#E9EDEF",
};

// ============================================================================
// WHATSAPP-SPECIFIC EXTENDED COLORS
// ============================================================================

/**
 * Extended color tokens specific to WhatsApp that go beyond the standard
 * SkinColorPalette. Used for WhatsApp-specific UI elements.
 */
export interface WhatsAppExtendedColors {
  /** Header bar background (#008069 light, #202C33 dark) */
  headerBg: string;
  /** Header bar text color */
  headerText: string;
  /** Header bar icon color */
  headerIcon: string;
  /** Chat wallpaper background */
  chatWallpaper: string;
  /** Chat wallpaper pattern overlay */
  chatWallpaperOverlay: string;
  /** Sent message bubble background */
  sentBubbleBg: string;
  /** Sent message bubble text */
  sentBubbleText: string;
  /** Received message bubble background */
  receivedBubbleBg: string;
  /** Received message bubble text */
  receivedBubbleText: string;
  /** Message timestamp color */
  messageTimestamp: string;
  /** Read receipt checkmark color (blue ticks) */
  readReceiptColor: string;
  /** Delivered receipt checkmark color (gray ticks) */
  deliveredReceiptColor: string;
  /** Composer bar background */
  composerBg: string;
  /** Composer input background */
  composerInputBg: string;
  /** Composer icons color */
  composerIcon: string;
  /** Voice recording red dot */
  recordingIndicator: string;
  /** Search bar background */
  searchBarBg: string;
  /** Dropdown/popup menu background */
  dropdownBg: string;
  /** System message bubble (encrypted notice, date divider) */
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
  /** Starred message icon color */
  starredIconColor: string;
  /** Reaction bubble background */
  reactionBubbleBg: string;
  /** Media overlay background (image/video) */
  mediaOverlayBg: string;
}

export const whatsappExtendedLightColors: WhatsAppExtendedColors = {
  headerBg: "#008069",
  headerText: "#FFFFFF",
  headerIcon: "#FFFFFF",
  chatWallpaper: "#E5DDD5",
  chatWallpaperOverlay: "#D1D7DB4D",
  sentBubbleBg: "#D9FDD3",
  sentBubbleText: "#111B21",
  receivedBubbleBg: "#FFFFFF",
  receivedBubbleText: "#111B21",
  messageTimestamp: "#667781",
  readReceiptColor: "#53BDEB",
  deliveredReceiptColor: "#8696A0",
  composerBg: "#F0F2F5",
  composerInputBg: "#FFFFFF",
  composerIcon: "#54656F",
  recordingIndicator: "#EA0038",
  searchBarBg: "#F0F2F5",
  dropdownBg: "#FFFFFF",
  systemBubbleBg: "#FFECD2",
  systemBubbleText: "#54656F",
  unreadBadgeBg: "#25D366",
  unreadBadgeText: "#FFFFFF",
  mutedUnreadBadgeBg: "#8696A0",
  archivedBg: "#F0F2F5",
  linkColor: "#027EB5",
  onlineIndicator: "#25D366",
  typingIndicatorColor: "#25D366",
  selectedChatBg: "#F0F2F5",
  hoverChatBg: "#F5F6F6",
  forwardedLabelColor: "#667781",
  starredIconColor: "#F5C842",
  reactionBubbleBg: "#FFFFFF",
  mediaOverlayBg: "#00000066",
};

export const whatsappExtendedDarkColors: WhatsAppExtendedColors = {
  headerBg: "#202C33",
  headerText: "#E9EDEF",
  headerIcon: "#AEBAC1",
  chatWallpaper: "#0B141A",
  chatWallpaperOverlay: "#0D1418CC",
  sentBubbleBg: "#005C4B",
  sentBubbleText: "#E9EDEF",
  receivedBubbleBg: "#202C33",
  receivedBubbleText: "#E9EDEF",
  messageTimestamp: "#8696A099",
  readReceiptColor: "#53BDEB",
  deliveredReceiptColor: "#8696A0",
  composerBg: "#202C33",
  composerInputBg: "#2A3942",
  composerIcon: "#8696A0",
  recordingIndicator: "#F15C6D",
  searchBarBg: "#202C33",
  dropdownBg: "#233138",
  systemBubbleBg: "#182229",
  systemBubbleText: "#8696A0",
  unreadBadgeBg: "#00A884",
  unreadBadgeText: "#111B21",
  mutedUnreadBadgeBg: "#8696A0",
  archivedBg: "#202C33",
  linkColor: "#53BDEB",
  onlineIndicator: "#00A884",
  typingIndicatorColor: "#00A884",
  selectedChatBg: "#2A3942",
  hoverChatBg: "#202C33",
  forwardedLabelColor: "#8696A0",
  starredIconColor: "#F5C842",
  reactionBubbleBg: "#2A3942",
  mediaOverlayBg: "#00000099",
};

// ============================================================================
// WHATSAPP TYPOGRAPHY
// ============================================================================

/**
 * WhatsApp uses Segoe UI on Windows, Helvetica Neue on macOS, and system
 * fonts as fallbacks. Font sizes are slightly larger than many chat apps
 * at 14.2px base with tight line height.
 */
export const whatsappTypography: SkinTypography = {
  fontFamily:
    '"Segoe UI", "Helvetica Neue", Helvetica, "Lucida Grande", Arial, "Ubuntu", "Cantarell", "Fira Sans", sans-serif',
  fontFamilyMono:
    '"SFMono-Regular", "Consolas", "Liberation Mono", "Menlo", monospace',
  fontSizeBase: "14.2px",
  fontSizeSm: "12px",
  fontSizeLg: "16px",
  fontSizeXl: "19px",
  fontWeightNormal: 400,
  fontWeightMedium: 500,
  fontWeightBold: 600,
  lineHeight: 1.4,
  letterSpacing: "normal",
};

// ============================================================================
// WHATSAPP SPACING
// ============================================================================

/**
 * WhatsApp spacing tokens. WhatsApp uses a 340px sidebar, 59px header,
 * and specific avatar sizes that differ from other platforms.
 */
export const whatsappSpacing: SkinSpacing = {
  messageGap: "2px",
  messagePadding: "6px 7px 8px 9px",
  sidebarWidth: "340px",
  headerHeight: "59px",
  inputHeight: "42px",
  avatarSize: "40px",
  avatarSizeSm: "24px",
  avatarSizeLg: "49px",
};

// ============================================================================
// WHATSAPP BORDER RADIUS
// ============================================================================

/**
 * WhatsApp uses 7.5px for message bubbles (its signature rounded style),
 * and full rounding for avatars and badges.
 */
export const whatsappBorderRadius: SkinBorderRadius = {
  none: "0px",
  sm: "4px",
  md: "7.5px",
  lg: "7.5px",
  xl: "16px",
  full: "9999px",
};

// ============================================================================
// WHATSAPP ICON STYLE
// ============================================================================

/**
 * WhatsApp uses outline-style icons with consistent stroke weight.
 */
export const whatsappIcons: SkinIconStyle = {
  style: "outline",
  set: "lucide",
  strokeWidth: 1.5,
};

// ============================================================================
// WHATSAPP COMPONENT STYLES
// ============================================================================

/**
 * WhatsApp component style config. Bubbles layout, circular avatars,
 * pill buttons, and filled inputs define the WhatsApp feel.
 */
export const whatsappComponentStyles: SkinComponentStyles = {
  messageLayout: "bubbles",
  avatarShape: "circle",
  buttonStyle: "pill",
  inputStyle: "filled",
  sidebarStyle: "default",
  headerStyle: "default",
  scrollbarStyle: "thin",
};

// ============================================================================
// WHATSAPP SHADOW TOKENS
// ============================================================================

/**
 * WhatsApp-specific shadow definitions. WhatsApp uses subtle shadows
 * on dropdowns and floating elements, but avoids heavy shadows elsewhere.
 */
export interface WhatsAppShadows {
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
}

export const whatsappLightShadows: WhatsAppShadows = {
  header: "0 1px 3px rgba(11, 20, 26, 0.08)",
  dropdown:
    "0 2px 5px 0 rgba(11, 20, 26, 0.26), 0 2px 10px 0 rgba(11, 20, 26, 0.16)",
  fab: "0 1px 3px rgba(11, 20, 26, 0.4)",
  chatListHover: "none",
  modal: "0 3px 14px rgba(11, 20, 26, 0.2)",
  toast: "0 4px 12px rgba(11, 20, 26, 0.15)",
};

export const whatsappDarkShadows: WhatsAppShadows = {
  header: "0 1px 3px rgba(0, 0, 0, 0.16)",
  dropdown: "0 2px 5px 0 rgba(0, 0, 0, 0.3), 0 2px 10px 0 rgba(0, 0, 0, 0.2)",
  fab: "0 1px 3px rgba(0, 0, 0, 0.6)",
  chatListHover: "none",
  modal: "0 3px 14px rgba(0, 0, 0, 0.4)",
  toast: "0 4px 12px rgba(0, 0, 0, 0.3)",
};

// ============================================================================
// ASSEMBLED WHATSAPP VISUAL SKIN
// ============================================================================

/**
 * Complete WhatsApp visual skin definition. This extends the base
 * VisualSkin with WhatsApp's exact visual specifications.
 */
export const whatsappDetailedSkin: VisualSkin = {
  id: "whatsapp-detailed",
  name: "WhatsApp",
  description:
    "Detailed WhatsApp-parity visual skin with exact colors, typography, spacing, and component styles matching WhatsApp Web/Mobile",
  version: "0.9.1",
  colors: whatsappLightColors,
  typography: whatsappTypography,
  spacing: whatsappSpacing,
  borderRadius: whatsappBorderRadius,
  icons: whatsappIcons,
  components: whatsappComponentStyles,
  darkMode: {
    colors: whatsappDarkColors,
  },
};

/**
 * Full WhatsApp visual config including extended colors and shadows.
 * Use this for components that need WhatsApp-specific styling beyond
 * the standard VisualSkin interface.
 */
export interface WhatsAppVisualConfig {
  skin: VisualSkin;
  extendedColors: {
    light: WhatsAppExtendedColors;
    dark: WhatsAppExtendedColors;
  };
  shadows: {
    light: WhatsAppShadows;
    dark: WhatsAppShadows;
  };
}

export const whatsappVisualConfig: WhatsAppVisualConfig = {
  skin: whatsappDetailedSkin,
  extendedColors: {
    light: whatsappExtendedLightColors,
    dark: whatsappExtendedDarkColors,
  },
  shadows: {
    light: whatsappLightShadows,
    dark: whatsappDarkShadows,
  },
};
