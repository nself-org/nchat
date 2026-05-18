/**
 * Slack Platform Visual Skin
 *
 * Detailed visual skin matching Slack's design language across Web, Desktop,
 * and Mobile. All color values, typography, spacing, border radius, and
 * shadow tokens are derived from Slack's actual UI as of 2026.
 *
 * Key characteristics:
 *   - Aubergine/purple sidebar (#4A154B sidebar bg, #611F69 primary)
 *   - Flat message layout (no bubbles), compact and cozy modes
 *   - Lato / "Slack-Lato" typography with 15px base size
 *   - Side-panel threads, not inline threads
 *   - 260px sidebar width, 49px header height
 *   - Rounded-square avatars (4px radius)
 *   - ECB22E yellow accent for highlights, stars, and emoji reactions
 *   - Green (#007A5A / #2BAC76) for primary action buttons
 *
 * @module lib/skins/platforms/slack/visual
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
// SLACK COLOR PALETTES
// ============================================================================

/**
 * Slack light mode color palette.
 *
 * Derived from Slack Web/Desktop inspection (2026):
 * - Sidebar background: #4A154B (aubergine) -- this is always dark
 * - Main content background: #FFFFFF
 * - Message hover: #F8F8F8
 * - Primary action (buttons): #007A5A (green)
 * - Accent/highlights: #ECB22E (yellow)
 * - Primary text: #1D1C1D (near-black)
 * - Secondary text: #616061 (gray)
 * - Muted/meta: #696969
 * - Border/dividers: #DDDDDC
 * - Links: #1264A3 (blue)
 */
export const slackLightColors: SkinColorPalette = {
  primary: "#611F69",
  secondary: "#4A154B",
  accent: "#ECB22E",
  background: "#FFFFFF",
  surface: "#F8F8F8",
  text: "#1D1C1D",
  textSecondary: "#616061",
  muted: "#696969",
  border: "#DDDDDC",
  success: "#007A5A",
  warning: "#ECB22E",
  error: "#E01E5A",
  info: "#1264A3",
  buttonPrimaryBg: "#007A5A",
  buttonPrimaryText: "#FFFFFF",
  buttonSecondaryBg: "#FFFFFF",
  buttonSecondaryText: "#1D1C1D",
};

/**
 * Slack dark mode color palette.
 *
 * Derived from Slack dark mode (2026):
 * - Sidebar background: #1A1D21 (very dark)
 * - Main content background: #1A1D21
 * - Message hover: #222529
 * - Surface: #222529
 * - Primary text: #D1D2D3
 * - Secondary text: #ABABAD
 * - Borders: #35383C
 * - Links: #36C5F0
 */
export const slackDarkColors: SkinColorPalette = {
  primary: "#D1B3D3",
  secondary: "#9B6B9E",
  accent: "#ECB22E",
  background: "#1A1D21",
  surface: "#222529",
  text: "#D1D2D3",
  textSecondary: "#ABABAD",
  muted: "#9B9C9E",
  border: "#35383C",
  success: "#2BAC76",
  warning: "#ECB22E",
  error: "#E96379",
  info: "#36C5F0",
  buttonPrimaryBg: "#2BAC76",
  buttonPrimaryText: "#FFFFFF",
  buttonSecondaryBg: "#35383C",
  buttonSecondaryText: "#D1D2D3",
};

// ============================================================================
// SLACK-SPECIFIC EXTENDED COLORS
// ============================================================================

/**
 * Extended color tokens specific to Slack that go beyond the standard
 * SkinColorPalette. Used for Slack-specific UI elements.
 */
export interface SlackExtendedColors {
  /** Sidebar background (#4A154B aubergine -- always dark-themed) */
  sidebarBg: string;
  /** Sidebar text color */
  sidebarText: string;
  /** Sidebar text active/selected */
  sidebarTextActive: string;
  /** Sidebar item hover background */
  sidebarHoverBg: string;
  /** Sidebar selected item background */
  sidebarSelectedBg: string;
  /** Sidebar selected item text */
  sidebarSelectedText: string;
  /** Sidebar section header text */
  sidebarSectionText: string;
  /** Sidebar badge (unread count) background */
  sidebarBadgeBg: string;
  /** Sidebar badge text */
  sidebarBadgeText: string;
  /** Sidebar presence indicator (green dot) */
  sidebarPresenceDot: string;
  /** Workspace switcher background */
  workspaceSwitcherBg: string;
  /** Header bar background (channel header) */
  headerBg: string;
  /** Header bar text */
  headerText: string;
  /** Header bar icon color */
  headerIcon: string;
  /** Header bar border-bottom */
  headerBorder: string;
  /** Message hover background */
  messageHoverBg: string;
  /** Message action bar background (on hover) */
  messageActionBarBg: string;
  /** Thread panel background */
  threadPanelBg: string;
  /** Thread panel border */
  threadPanelBorder: string;
  /** Mention badge background */
  mentionBadgeBg: string;
  /** Mention badge text */
  mentionBadgeText: string;
  /** @mention highlight in message body */
  mentionHighlightBg: string;
  /** @mention highlight text */
  mentionHighlightText: string;
  /** Link color in messages */
  linkColor: string;
  /** Code block background */
  codeBlockBg: string;
  /** Code block border */
  codeBlockBorder: string;
  /** Inline code background */
  inlineCodeBg: string;
  /** Quote bar left-border color */
  quoteBarColor: string;
  /** Reaction bubble background */
  reactionBubbleBg: string;
  /** Reaction bubble border */
  reactionBubbleBorder: string;
  /** Reaction bubble hover */
  reactionBubbleHoverBg: string;
  /** Reaction bubble own-reaction */
  reactionBubbleOwnBg: string;
  /** Star/bookmark icon color */
  starColor: string;
  /** Composer area background */
  composerBg: string;
  /** Composer input border */
  composerBorder: string;
  /** Composer input focused border */
  composerFocusBorder: string;
  /** Typing indicator text color */
  typingIndicatorColor: string;
  /** Divider/date separator color */
  dateDividerColor: string;
  /** Date divider line color */
  dateDividerLineColor: string;
  /** Huddle active indicator */
  huddleActiveBg: string;
  /** Huddle active icon/text */
  huddleActiveText: string;
  /** Search highlight background */
  searchHighlightBg: string;
  /** Pin indicator color */
  pinIndicatorColor: string;
  /** Channel prefix hash color */
  channelHashColor: string;
  /** Online presence dot color */
  presenceOnline: string;
  /** Away presence dot color */
  presenceAway: string;
  /** DND presence icon color */
  presenceDnd: string;
}

export const slackExtendedLightColors: SlackExtendedColors = {
  sidebarBg: "#4A154B",
  sidebarText: "#FFFFFF",
  sidebarTextActive: "#FFFFFF",
  sidebarHoverBg: "#3A1040",
  sidebarSelectedBg: "#1264A3",
  sidebarSelectedText: "#FFFFFF",
  sidebarSectionText: "#CDB1CF",
  sidebarBadgeBg: "#E01E5A",
  sidebarBadgeText: "#FFFFFF",
  sidebarPresenceDot: "#2BAC76",
  workspaceSwitcherBg: "#350D36",
  headerBg: "#FFFFFF",
  headerText: "#1D1C1D",
  headerIcon: "#616061",
  headerBorder: "#DDDDDC",
  messageHoverBg: "#F8F8F8",
  messageActionBarBg: "#FFFFFF",
  threadPanelBg: "#FFFFFF",
  threadPanelBorder: "#DDDDDC",
  mentionBadgeBg: "#E01E5A",
  mentionBadgeText: "#FFFFFF",
  mentionHighlightBg: "#FCE8B2",
  mentionHighlightText: "#1D1C1D",
  linkColor: "#1264A3",
  codeBlockBg: "#F8F8F8",
  codeBlockBorder: "#DDDDDC",
  inlineCodeBg: "#F8F8F8",
  quoteBarColor: "#DDDDDC",
  reactionBubbleBg: "#F8F8F8",
  reactionBubbleBorder: "#DDDDDC",
  reactionBubbleHoverBg: "#E8E8E8",
  reactionBubbleOwnBg: "#E8F5FA",
  starColor: "#ECB22E",
  composerBg: "#FFFFFF",
  composerBorder: "#DDDDDC",
  composerFocusBorder: "#1264A3",
  typingIndicatorColor: "#616061",
  dateDividerColor: "#1D1C1D",
  dateDividerLineColor: "#DDDDDC",
  huddleActiveBg: "#F0F7EE",
  huddleActiveText: "#007A5A",
  searchHighlightBg: "#FCE8B2",
  pinIndicatorColor: "#ECB22E",
  channelHashColor: "#616061",
  presenceOnline: "#2BAC76",
  presenceAway: "#ECB22E",
  presenceDnd: "#E01E5A",
};

export const slackExtendedDarkColors: SlackExtendedColors = {
  sidebarBg: "#1A1D21",
  sidebarText: "#D1D2D3",
  sidebarTextActive: "#FFFFFF",
  sidebarHoverBg: "#27242C",
  sidebarSelectedBg: "#1164A3",
  sidebarSelectedText: "#FFFFFF",
  sidebarSectionText: "#9B9C9E",
  sidebarBadgeBg: "#E01E5A",
  sidebarBadgeText: "#FFFFFF",
  sidebarPresenceDot: "#2BAC76",
  workspaceSwitcherBg: "#121016",
  headerBg: "#222529",
  headerText: "#D1D2D3",
  headerIcon: "#D1D2D3",
  headerBorder: "#35383C",
  messageHoverBg: "#222529",
  messageActionBarBg: "#1A1D21",
  threadPanelBg: "#222529",
  threadPanelBorder: "#35383C",
  mentionBadgeBg: "#E01E5A",
  mentionBadgeText: "#FFFFFF",
  mentionHighlightBg: "#6D5008",
  mentionHighlightText: "#D1D2D3",
  linkColor: "#36C5F0",
  codeBlockBg: "#1A1D21",
  codeBlockBorder: "#35383C",
  inlineCodeBg: "#2D2F33",
  quoteBarColor: "#35383C",
  reactionBubbleBg: "#2D2F33",
  reactionBubbleBorder: "#35383C",
  reactionBubbleHoverBg: "#35383C",
  reactionBubbleOwnBg: "#1C3947",
  starColor: "#ECB22E",
  composerBg: "#222529",
  composerBorder: "#35383C",
  composerFocusBorder: "#36C5F0",
  typingIndicatorColor: "#ABABAD",
  dateDividerColor: "#D1D2D3",
  dateDividerLineColor: "#35383C",
  huddleActiveBg: "#1A3329",
  huddleActiveText: "#2BAC76",
  searchHighlightBg: "#6D5008",
  pinIndicatorColor: "#ECB22E",
  channelHashColor: "#ABABAD",
  presenceOnline: "#2BAC76",
  presenceAway: "#ECB22E",
  presenceDnd: "#E01E5A",
};

// ============================================================================
// SLACK TYPOGRAPHY
// ============================================================================

/**
 * Slack uses Lato (custom "Slack-Lato") as its primary font with a 15px
 * base size. Line height is distinctive at ~1.46668. Monospace uses
 * "Slack-Monaco" (Monaco on macOS, Consolas on Windows).
 */
export const slackTypography: SkinTypography = {
  fontFamily: '"Slack-Lato", "Lato", "appleLogo", sans-serif',
  fontFamilyMono:
    '"Slack-Monaco", "Monaco", "Menlo", "Consolas", "Courier New", monospace',
  fontSizeBase: "15px",
  fontSizeSm: "12px",
  fontSizeLg: "18px",
  fontSizeXl: "22px",
  fontWeightNormal: 400,
  fontWeightMedium: 500,
  fontWeightBold: 700,
  lineHeight: 1.46668,
  letterSpacing: "normal",
};

// ============================================================================
// SLACK SPACING
// ============================================================================

/**
 * Slack spacing tokens. Slack uses a 260px sidebar, 49px channel header,
 * and minimal message gap for compact feel.
 */
export const slackSpacing: SkinSpacing = {
  messageGap: "0px",
  messagePadding: "4px 20px",
  sidebarWidth: "260px",
  headerHeight: "49px",
  inputHeight: "44px",
  avatarSize: "36px",
  avatarSizeSm: "20px",
  avatarSizeLg: "48px",
};

// ============================================================================
// SLACK BORDER RADIUS
// ============================================================================

/**
 * Slack uses modest border radius. Message bubbles are not rounded (flat layout).
 * Buttons use 4-6px radius. Modals/dialogs use 8px.
 */
export const slackBorderRadius: SkinBorderRadius = {
  none: "0px",
  sm: "4px",
  md: "6px",
  lg: "8px",
  xl: "12px",
  full: "9999px",
};

// ============================================================================
// SLACK ICON STYLE
// ============================================================================

/**
 * Slack uses outline-style icons with 1.5 stroke width.
 */
export const slackIcons: SkinIconStyle = {
  style: "outline",
  set: "lucide",
  strokeWidth: 1.5,
};

// ============================================================================
// SLACK COMPONENT STYLES
// ============================================================================

/**
 * Slack component style config. Default flat message layout (no bubbles),
 * rounded-square avatars, outline inputs with border.
 */
export const slackComponentStyles: SkinComponentStyles = {
  messageLayout: "default",
  avatarShape: "rounded",
  buttonStyle: "default",
  inputStyle: "outline",
  sidebarStyle: "default",
  headerStyle: "default",
  scrollbarStyle: "default",
};

// ============================================================================
// SLACK SHADOW TOKENS
// ============================================================================

/**
 * Slack-specific shadow definitions. Slack uses subtle shadows on floating
 * elements, action bars, and modals. Message area is shadow-free.
 */
export interface SlackShadows {
  /** Header shadow (none; uses border instead) */
  header: string;
  /** Dropdown/popup shadow */
  dropdown: string;
  /** Modal/dialog shadow */
  modal: string;
  /** Message action bar shadow (hover toolbar) */
  messageActionBar: string;
  /** Toast notification shadow */
  toast: string;
  /** Thread panel shadow */
  threadPanel: string;
  /** Composer focus shadow */
  composerFocus: string;
}

export const slackLightShadows: SlackShadows = {
  header: "none",
  dropdown: "0 4px 12px rgba(0, 0, 0, 0.12)",
  modal: "0 18px 48px rgba(0, 0, 0, 0.18)",
  messageActionBar: "0 1px 3px rgba(0, 0, 0, 0.08)",
  toast: "0 4px 12px rgba(0, 0, 0, 0.15)",
  threadPanel: "-1px 0 0 0 #DDDDDC",
  composerFocus: "0 0 0 1px #1264A3",
};

export const slackDarkShadows: SlackShadows = {
  header: "none",
  dropdown: "0 4px 12px rgba(0, 0, 0, 0.36)",
  modal: "0 18px 48px rgba(0, 0, 0, 0.48)",
  messageActionBar: "0 1px 3px rgba(0, 0, 0, 0.24)",
  toast: "0 4px 12px rgba(0, 0, 0, 0.3)",
  threadPanel: "-1px 0 0 0 #35383C",
  composerFocus: "0 0 0 1px #36C5F0",
};

// ============================================================================
// ASSEMBLED SLACK VISUAL SKIN
// ============================================================================

/**
 * Complete Slack visual skin definition. This extends the base
 * VisualSkin with Slack's exact visual specifications.
 */
export const slackDetailedSkin: VisualSkin = {
  id: "slack-detailed",
  name: "Slack",
  description:
    "Detailed Slack-parity visual skin with exact colors, typography, spacing, and component styles matching Slack Web/Desktop/Mobile",
  version: "0.9.1",
  colors: slackLightColors,
  typography: slackTypography,
  spacing: slackSpacing,
  borderRadius: slackBorderRadius,
  icons: slackIcons,
  components: slackComponentStyles,
  darkMode: {
    colors: slackDarkColors,
  },
};

/**
 * Full Slack visual config including extended colors and shadows.
 * Use this for components that need Slack-specific styling beyond
 * the standard VisualSkin interface.
 */
export interface SlackVisualConfig {
  skin: VisualSkin;
  extendedColors: {
    light: SlackExtendedColors;
    dark: SlackExtendedColors;
  };
  shadows: {
    light: SlackShadows;
    dark: SlackShadows;
  };
}

export const slackVisualConfig: SlackVisualConfig = {
  skin: slackDetailedSkin,
  extendedColors: {
    light: slackExtendedLightColors,
    dark: slackExtendedDarkColors,
  },
  shadows: {
    light: slackLightShadows,
    dark: slackDarkShadows,
  },
};
