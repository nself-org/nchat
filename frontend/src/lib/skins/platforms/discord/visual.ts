/**
 * Discord Platform Visual Skin
 *
 * Detailed visual skin matching Discord's design language across Web and Desktop.
 * All color values, typography, spacing, border radius, and shadow tokens
 * are derived from Discord's actual UI as of 2026.
 *
 * Key characteristics:
 *   - Blurple (#5865F2) primary color, dark-first design
 *   - No chat bubbles (flat messages with hover background)
 *   - gg sans / Noto Sans typography
 *   - Dark sidebar (#1E1F22) with lighter chat area (#313338)
 *   - Compact/cozy message layout with grouped messages
 *   - Rounded square avatars (rounded-lg, not full circle)
 *   - Server icon column (72px) + channel sidebar (240px)
 *   - Embed messages with left-color border
 *
 * @module lib/skins/platforms/discord/visual
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
// DISCORD COLOR PALETTES
// ============================================================================

/**
 * Discord light mode color palette.
 *
 * Derived from Discord Web light theme (2026):
 * - Background: #FFFFFF (white)
 * - Secondary bg: #F2F3F5 (light gray)
 * - Sidebar: #F2F3F5 (light gray)
 * - Primary: #5865F2 (blurple)
 * - Text: #313338 (dark gray)
 * - Secondary text: #5C5E66 (medium gray)
 * - Muted: #80848E (gray)
 */
export const discordLightColors: SkinColorPalette = {
  primary: "#5865F2",
  secondary: "#4752C4",
  accent: "#5865F2",
  background: "#FFFFFF",
  surface: "#F2F3F5",
  text: "#313338",
  textSecondary: "#5C5E66",
  muted: "#80848E",
  border: "#E1E2E4",
  success: "#57F287",
  warning: "#FEE75C",
  error: "#ED4245",
  info: "#5865F2",
  buttonPrimaryBg: "#5865F2",
  buttonPrimaryText: "#FFFFFF",
  buttonSecondaryBg: "#6D6F78",
  buttonSecondaryText: "#FFFFFF",
};

/**
 * Discord dark mode color palette.
 *
 * Derived from Discord Web dark theme (2026):
 * - Chat background: #313338 (dark gray)
 * - Secondary bg: #2B2D31 (darker gray)
 * - Sidebar: #1E1F22 (near black)
 * - Primary: #5865F2 (blurple)
 * - Text: #DBDEE1 (light gray)
 * - Secondary text: #B5BAC1 (medium gray)
 * - Muted: #949BA4 (muted gray)
 */
export const discordDarkColors: SkinColorPalette = {
  primary: "#5865F2",
  secondary: "#4752C4",
  accent: "#5865F2",
  background: "#313338",
  surface: "#2B2D31",
  text: "#DBDEE1",
  textSecondary: "#B5BAC1",
  muted: "#949BA4",
  border: "#3F4147",
  success: "#57F287",
  warning: "#FEE75C",
  error: "#ED4245",
  info: "#5865F2",
  buttonPrimaryBg: "#5865F2",
  buttonPrimaryText: "#FFFFFF",
  buttonSecondaryBg: "#4E5058",
  buttonSecondaryText: "#DBDEE1",
};

// ============================================================================
// DISCORD-SPECIFIC EXTENDED COLORS
// ============================================================================

/**
 * Extended color tokens specific to Discord that go beyond the standard
 * SkinColorPalette. Used for Discord-specific UI elements.
 */
export interface DiscordExtendedColors {
  /** Server list sidebar background */
  serverListBg: string;
  /** Channel sidebar background */
  channelSidebarBg: string;
  /** Chat area background */
  chatBg: string;
  /** Members panel background */
  membersPanelBg: string;
  /** Header bar background */
  headerBg: string;
  /** Header text color */
  headerText: string;
  /** Header icon color */
  headerIcon: string;
  /** Message hover background */
  messageHoverBg: string;
  /** Mentioned message background */
  mentionedMessageBg: string;
  /** Mentioned message left border */
  mentionedMessageBorder: string;
  /** Embed left border default color */
  embedBorderDefault: string;
  /** Embed background */
  embedBg: string;
  /** Code block background */
  codeBlockBg: string;
  /** Inline code background */
  inlineCodeBg: string;
  /** Spoiler background */
  spoilerBg: string;
  /** Spoiler revealed background */
  spoilerRevealedBg: string;
  /** Link color in messages */
  linkColor: string;
  /** Channel text icon color (#) */
  channelIconColor: string;
  /** Voice channel icon color */
  voiceChannelIconColor: string;
  /** Stage channel icon color */
  stageChannelIconColor: string;
  /** Forum channel icon color */
  forumChannelIconColor: string;
  /** Announcement channel icon color */
  announcementChannelIconColor: string;
  /** Category text color */
  categoryTextColor: string;
  /** Unread channel indicator */
  unreadIndicator: string;
  /** Unread mentions badge */
  unreadMentionsBadgeBg: string;
  /** Unread mentions badge text */
  unreadMentionsBadgeText: string;
  /** Voice connected indicator */
  voiceConnectedBg: string;
  /** Nitro gradient start */
  nitroGradientStart: string;
  /** Nitro gradient end */
  nitroGradientEnd: string;
  /** Boost gradient start */
  boostGradientStart: string;
  /** Boost gradient end */
  boostGradientEnd: string;
  /** Role colors (sample set) */
  roleAdmin: string;
  roleModerator: string;
  roleDefault: string;
  /** Status indicator online */
  statusOnline: string;
  /** Status indicator idle */
  statusIdle: string;
  /** Status indicator DND */
  statusDnd: string;
  /** Status indicator offline/invisible */
  statusOffline: string;
  /** Status indicator streaming */
  statusStreaming: string;
  /** Typing indicator dots */
  typingIndicatorColor: string;
  /** User area background (bottom left panel) */
  userAreaBg: string;
  /** Input field background */
  inputBg: string;
  /** Thread sidebar background */
  threadSidebarBg: string;
  /** Pinned message highlight */
  pinnedMessageBg: string;
  /** Server icon selected indicator (white pill) */
  serverIconIndicator: string;
  /** Server folder background */
  serverFolderBg: string;
  /** Reaction button background */
  reactionBg: string;
  /** Reaction button active (self-reacted) */
  reactionActiveBg: string;
  /** Reaction button active border */
  reactionActiveBorder: string;
  /** Tooltip background */
  tooltipBg: string;
  /** Tooltip text */
  tooltipText: string;
  /** Blurple accent colors */
  blurple: string;
  green: string;
  yellow: string;
  fuchsia: string;
  red: string;
}

export const discordExtendedLightColors: DiscordExtendedColors = {
  serverListBg: "#E3E5E8",
  channelSidebarBg: "#F2F3F5",
  chatBg: "#FFFFFF",
  membersPanelBg: "#F2F3F5",
  headerBg: "#FFFFFF",
  headerText: "#313338",
  headerIcon: "#4E5058",
  messageHoverBg: "#F2F3F5",
  mentionedMessageBg: "#FDF5E8",
  mentionedMessageBorder: "#F0B232",
  embedBorderDefault: "#E1E2E4",
  embedBg: "#F2F3F5",
  codeBlockBg: "#F2F3F5",
  inlineCodeBg: "#E8E8EB",
  spoilerBg: "#C4C9CE",
  spoilerRevealedBg: "#E8E8EB",
  linkColor: "#006CE7",
  channelIconColor: "#6D6F78",
  voiceChannelIconColor: "#6D6F78",
  stageChannelIconColor: "#6D6F78",
  forumChannelIconColor: "#6D6F78",
  announcementChannelIconColor: "#6D6F78",
  categoryTextColor: "#5C5E66",
  unreadIndicator: "#313338",
  unreadMentionsBadgeBg: "#ED4245",
  unreadMentionsBadgeText: "#FFFFFF",
  voiceConnectedBg: "#57F287",
  nitroGradientStart: "#FF73FA",
  nitroGradientEnd: "#5865F2",
  boostGradientStart: "#FF73FA",
  boostGradientEnd: "#F47FFF",
  roleAdmin: "#E74C3C",
  roleModerator: "#3498DB",
  roleDefault: "#99AAB5",
  statusOnline: "#57F287",
  statusIdle: "#FEE75C",
  statusDnd: "#ED4245",
  statusOffline: "#80848E",
  statusStreaming: "#593695",
  typingIndicatorColor: "#313338",
  userAreaBg: "#EBEDEF",
  inputBg: "#EBEDEF",
  threadSidebarBg: "#FFFFFF",
  pinnedMessageBg: "#F2F3F5",
  serverIconIndicator: "#313338",
  serverFolderBg: "#E1E2E4",
  reactionBg: "#F2F3F5",
  reactionActiveBg: "#DEE0FC",
  reactionActiveBorder: "#5865F2",
  tooltipBg: "#313338",
  tooltipText: "#DBDEE1",
  blurple: "#5865F2",
  green: "#57F287",
  yellow: "#FEE75C",
  fuchsia: "#EB459E",
  red: "#ED4245",
};

export const discordExtendedDarkColors: DiscordExtendedColors = {
  serverListBg: "#1E1F22",
  channelSidebarBg: "#2B2D31",
  chatBg: "#313338",
  membersPanelBg: "#2B2D31",
  headerBg: "#313338",
  headerText: "#F2F3F5",
  headerIcon: "#B5BAC1",
  messageHoverBg: "#2E3035",
  mentionedMessageBg: "#444037",
  mentionedMessageBorder: "#F0B232",
  embedBorderDefault: "#202225",
  embedBg: "#2B2D31",
  codeBlockBg: "#2B2D31",
  inlineCodeBg: "#3B3D44",
  spoilerBg: "#3B3D44",
  spoilerRevealedBg: "#3B3D44",
  linkColor: "#00A8FC",
  channelIconColor: "#949BA4",
  voiceChannelIconColor: "#949BA4",
  stageChannelIconColor: "#949BA4",
  forumChannelIconColor: "#949BA4",
  announcementChannelIconColor: "#949BA4",
  categoryTextColor: "#949BA4",
  unreadIndicator: "#F2F3F5",
  unreadMentionsBadgeBg: "#ED4245",
  unreadMentionsBadgeText: "#FFFFFF",
  voiceConnectedBg: "#57F287",
  nitroGradientStart: "#FF73FA",
  nitroGradientEnd: "#5865F2",
  boostGradientStart: "#FF73FA",
  boostGradientEnd: "#F47FFF",
  roleAdmin: "#E74C3C",
  roleModerator: "#3498DB",
  roleDefault: "#99AAB5",
  statusOnline: "#57F287",
  statusIdle: "#FEE75C",
  statusDnd: "#ED4245",
  statusOffline: "#80848E",
  statusStreaming: "#593695",
  typingIndicatorColor: "#DBDEE1",
  userAreaBg: "#232428",
  inputBg: "#383A40",
  threadSidebarBg: "#2B2D31",
  pinnedMessageBg: "#2E3035",
  serverIconIndicator: "#FFFFFF",
  serverFolderBg: "#2B2D31",
  reactionBg: "#3B3D44",
  reactionActiveBg: "#2A2D56",
  reactionActiveBorder: "#5865F2",
  tooltipBg: "#111214",
  tooltipText: "#DBDEE1",
  blurple: "#5865F2",
  green: "#57F287",
  yellow: "#FEE75C",
  fuchsia: "#EB459E",
  red: "#ED4245",
};

// ============================================================================
// DISCORD TYPOGRAPHY
// ============================================================================

/**
 * Discord uses "gg sans" as its primary font, falling back to Noto Sans
 * and Helvetica Neue. The base font size is 16px with a 1.375 line height.
 * Discord uses slightly heavier weight for headers (600-700).
 */
export const discordTypography: SkinTypography = {
  fontFamily:
    '"gg sans", "Noto Sans", "Helvetica Neue", Helvetica, Arial, sans-serif',
  fontFamilyMono:
    '"gg sans Mono", "Source Code Pro", "Consolas", "Andale Mono WT", "Andale Mono", "Menlo", monospace',
  fontSizeBase: "16px",
  fontSizeSm: "12px",
  fontSizeLg: "20px",
  fontSizeXl: "24px",
  fontWeightNormal: 400,
  fontWeightMedium: 500,
  fontWeightBold: 700,
  lineHeight: 1.375,
  letterSpacing: "normal",
};

// ============================================================================
// DISCORD SPACING
// ============================================================================

/**
 * Discord spacing tokens. Discord uses a 240px channel sidebar, 48px header,
 * and a 72px server list column. Messages have very tight spacing
 * (0px gap for grouped messages).
 */
export const discordSpacing: SkinSpacing = {
  messageGap: "0px",
  messagePadding: "2px 16px",
  sidebarWidth: "240px",
  headerHeight: "48px",
  inputHeight: "44px",
  avatarSize: "40px",
  avatarSizeSm: "24px",
  avatarSizeLg: "80px",
};

// ============================================================================
// DISCORD BORDER RADIUS
// ============================================================================

/**
 * Discord uses small border radii for most elements, with larger rounding
 * for server icons (50% for circular icons, 16px for hovered/selected).
 * Message reactions and buttons use 4px radius.
 */
export const discordBorderRadius: SkinBorderRadius = {
  none: "0px",
  sm: "3px",
  md: "4px",
  lg: "8px",
  xl: "16px",
  full: "50%",
};

// ============================================================================
// DISCORD ICON STYLE
// ============================================================================

/**
 * Discord uses filled-style icons with a 2px stroke for most UI elements.
 * Channel type icons use specific filled designs.
 */
export const discordIcons: SkinIconStyle = {
  style: "filled",
  set: "lucide",
  strokeWidth: 2,
};

// ============================================================================
// DISCORD COMPONENT STYLES
// ============================================================================

/**
 * Discord component style config. Cozy message layout (no bubbles),
 * rounded-square avatars, compact sidebar, and minimal header.
 */
export const discordComponentStyles: SkinComponentStyles = {
  messageLayout: "cozy",
  avatarShape: "rounded",
  buttonStyle: "default",
  inputStyle: "filled",
  sidebarStyle: "compact",
  headerStyle: "minimal",
  scrollbarStyle: "thin",
};

// ============================================================================
// DISCORD SHADOW TOKENS
// ============================================================================

/**
 * Discord-specific shadow definitions. Discord uses elevation-based shadows
 * for popups, modals, and some floating elements.
 */
export interface DiscordShadows {
  /** Header shadow (subtle bottom edge) */
  header: string;
  /** Dropdown/popup shadow */
  dropdown: string;
  /** Modal/dialog shadow */
  modal: string;
  /** Toast notification shadow */
  toast: string;
  /** Context menu shadow */
  contextMenu: string;
  /** Server icon tooltip shadow */
  tooltip: string;
}

export const discordLightShadows: DiscordShadows = {
  header: "0 1px 0 rgba(6, 6, 7, 0.08)",
  dropdown: "0 8px 16px rgba(0, 0, 0, 0.24)",
  modal: "0 0 0 1px rgba(6, 6, 7, 0.08), 0 8px 16px rgba(0, 0, 0, 0.16)",
  toast: "0 4px 12px rgba(0, 0, 0, 0.15)",
  contextMenu: "0 8px 16px rgba(0, 0, 0, 0.24)",
  tooltip: "0 8px 16px rgba(0, 0, 0, 0.24)",
};

export const discordDarkShadows: DiscordShadows = {
  header:
    "0 1px 0 rgba(4, 4, 5, 0.2), 0 1.5px 0 rgba(6, 6, 7, 0.05), 0 2px 0 rgba(4, 4, 5, 0.05)",
  dropdown: "0 8px 16px rgba(0, 0, 0, 0.24)",
  modal: "0 0 0 1px rgba(4, 4, 5, 0.15), 0 8px 16px rgba(0, 0, 0, 0.24)",
  toast: "0 4px 12px rgba(0, 0, 0, 0.3)",
  contextMenu: "0 8px 16px rgba(0, 0, 0, 0.24)",
  tooltip: "0 8px 16px rgba(0, 0, 0, 0.24)",
};

// ============================================================================
// ASSEMBLED DISCORD VISUAL SKIN
// ============================================================================

/**
 * Complete Discord visual skin definition. This extends the base
 * VisualSkin with Discord's exact visual specifications.
 */
export const discordDetailedSkin: VisualSkin = {
  id: "discord-detailed",
  name: "Discord",
  description:
    "Detailed Discord-parity visual skin with exact colors, typography, spacing, and component styles matching Discord Web/Desktop",
  version: "0.9.1",
  colors: discordLightColors,
  typography: discordTypography,
  spacing: discordSpacing,
  borderRadius: discordBorderRadius,
  icons: discordIcons,
  components: discordComponentStyles,
  darkMode: {
    colors: discordDarkColors,
  },
};

/**
 * Full Discord visual config including extended colors and shadows.
 * Use this for components that need Discord-specific styling beyond
 * the standard VisualSkin interface.
 */
export interface DiscordVisualConfig {
  skin: VisualSkin;
  extendedColors: {
    light: DiscordExtendedColors;
    dark: DiscordExtendedColors;
  };
  shadows: {
    light: DiscordShadows;
    dark: DiscordShadows;
  };
}

export const discordVisualConfig: DiscordVisualConfig = {
  skin: discordDetailedSkin,
  extendedColors: {
    light: discordExtendedLightColors,
    dark: discordExtendedDarkColors,
  },
  shadows: {
    light: discordLightShadows,
    dark: discordDarkShadows,
  },
};
