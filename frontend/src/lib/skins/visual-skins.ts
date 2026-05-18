/**
 * Visual Skin Definitions
 *
 * Each skin defines colors, typography, spacing, icons, and component styles
 * for a specific platform aesthetic. Skins are purely visual -- they carry no
 * behavioral semantics.
 *
 * @module lib/skins/visual-skins
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
} from "./types";

// ============================================================================
// SHARED DEFAULTS
// ============================================================================

const defaultTypography: SkinTypography = {
  fontFamily: "Inter, system-ui, -apple-system, sans-serif",
  fontFamilyMono: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
  fontSizeBase: "14px",
  fontSizeSm: "12px",
  fontSizeLg: "16px",
  fontSizeXl: "20px",
  fontWeightNormal: 400,
  fontWeightMedium: 500,
  fontWeightBold: 700,
  lineHeight: 1.5,
  letterSpacing: "normal",
};

const defaultSpacing: SkinSpacing = {
  messageGap: "4px",
  messagePadding: "8px 16px",
  sidebarWidth: "260px",
  headerHeight: "48px",
  inputHeight: "44px",
  avatarSize: "36px",
  avatarSizeSm: "24px",
  avatarSizeLg: "48px",
};

const defaultBorderRadius: SkinBorderRadius = {
  none: "0px",
  sm: "4px",
  md: "8px",
  lg: "12px",
  xl: "16px",
  full: "9999px",
};

const defaultIcons: SkinIconStyle = {
  style: "outline",
  set: "lucide",
  strokeWidth: 1.5,
};

// ============================================================================
// NCHAT SKIN (Default)
// ============================================================================

const nchatLightColors: SkinColorPalette = {
  primary: "#00D4FF",
  secondary: "#0EA5E9",
  accent: "#38BDF8",
  background: "#FFFFFF",
  surface: "#F4F4F5",
  text: "#18181B",
  textSecondary: "#52525B",
  muted: "#71717A",
  border: "#18181B1A",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  info: "#00D4FF",
  buttonPrimaryBg: "#18181B",
  buttonPrimaryText: "#FFFFFF",
  buttonSecondaryBg: "#F4F4F5",
  buttonSecondaryText: "#18181B",
};

const nchatDarkColors: SkinColorPalette = {
  primary: "#00D4FF",
  secondary: "#0EA5E9",
  accent: "#38BDF8",
  background: "#18181B",
  surface: "#27272A",
  text: "#F4F4F5",
  textSecondary: "#A1A1AA",
  muted: "#A1A1AA",
  border: "#FFFFFF1A",
  success: "#34D399",
  warning: "#FBBF24",
  error: "#F87171",
  info: "#00D4FF",
  buttonPrimaryBg: "#00D4FF",
  buttonPrimaryText: "#18181B",
  buttonSecondaryBg: "#3F3F461A",
  buttonSecondaryText: "#A1A1AA",
};

export const nchatSkin: VisualSkin = {
  id: "nchat",
  name: "nChat",
  description: "nself protocol theme with glowing cyan accents",
  version: "0.9.1",
  colors: nchatLightColors,
  typography: {
    ...defaultTypography,
  },
  spacing: {
    ...defaultSpacing,
  },
  borderRadius: {
    ...defaultBorderRadius,
    lg: "12px",
  },
  icons: {
    ...defaultIcons,
  },
  components: {
    messageLayout: "default",
    avatarShape: "circle",
    buttonStyle: "default",
    inputStyle: "outline",
    sidebarStyle: "default",
    headerStyle: "default",
    scrollbarStyle: "thin",
  },
  darkMode: {
    colors: nchatDarkColors,
  },
};

// ============================================================================
// WHATSAPP SKIN
// ============================================================================

const whatsappLightColors: SkinColorPalette = {
  primary: "#25D366",
  secondary: "#128C7E",
  accent: "#075E54",
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
  buttonPrimaryBg: "#25D366",
  buttonPrimaryText: "#FFFFFF",
  buttonSecondaryBg: "#F0F2F5",
  buttonSecondaryText: "#111B21",
};

const whatsappDarkColors: SkinColorPalette = {
  primary: "#25D366",
  secondary: "#00A884",
  accent: "#005C4B",
  background: "#111B21",
  surface: "#1F2C34",
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

export const whatsappSkin: VisualSkin = {
  id: "whatsapp",
  name: "WhatsApp",
  description: "WhatsApp-style green and teal theme with chat bubbles",
  version: "0.9.1",
  colors: whatsappLightColors,
  typography: {
    ...defaultTypography,
    fontFamily:
      "Segoe UI, Helvetica Neue, Helvetica, Lucida Grande, Arial, sans-serif",
    fontSizeBase: "14.2px",
    lineHeight: 1.4,
  },
  spacing: {
    ...defaultSpacing,
    messageGap: "2px",
    messagePadding: "6px 7px 8px 9px",
    sidebarWidth: "340px",
    headerHeight: "59px",
    avatarSize: "40px",
    avatarSizeSm: "24px",
    avatarSizeLg: "49px",
  },
  borderRadius: {
    none: "0px",
    sm: "4px",
    md: "7.5px",
    lg: "7.5px",
    xl: "16px",
    full: "9999px",
  },
  icons: {
    style: "outline",
    set: "lucide",
    strokeWidth: 1.5,
  },
  components: {
    messageLayout: "bubbles",
    avatarShape: "circle",
    buttonStyle: "pill",
    inputStyle: "filled",
    sidebarStyle: "default",
    headerStyle: "default",
    scrollbarStyle: "thin",
  },
  darkMode: {
    colors: whatsappDarkColors,
  },
};

// ============================================================================
// TELEGRAM SKIN
// ============================================================================

const telegramLightColors: SkinColorPalette = {
  primary: "#2AABEE",
  secondary: "#229ED9",
  accent: "#3390EC",
  background: "#FFFFFF",
  surface: "#F4F4F5",
  text: "#000000",
  textSecondary: "#707579",
  muted: "#707579",
  border: "#E7E7E7",
  success: "#4FAE4E",
  warning: "#E6A700",
  error: "#E53935",
  info: "#2AABEE",
  buttonPrimaryBg: "#3390EC",
  buttonPrimaryText: "#FFFFFF",
  buttonSecondaryBg: "#E7F3FF",
  buttonSecondaryText: "#3390EC",
};

const telegramDarkColors: SkinColorPalette = {
  primary: "#2AABEE",
  secondary: "#229ED9",
  accent: "#3390EC",
  background: "#17212B",
  surface: "#1E2C3A",
  text: "#F5F5F5",
  textSecondary: "#708499",
  muted: "#708499",
  border: "#2B3F52",
  success: "#4FAE4E",
  warning: "#E6A700",
  error: "#E53935",
  info: "#2AABEE",
  buttonPrimaryBg: "#3390EC",
  buttonPrimaryText: "#FFFFFF",
  buttonSecondaryBg: "#2B3F52",
  buttonSecondaryText: "#3390EC",
};

export const telegramSkin: VisualSkin = {
  id: "telegram",
  name: "Telegram",
  description: "Telegram-style blue theme with chat bubbles and round avatars",
  version: "0.9.1",
  colors: telegramLightColors,
  typography: {
    ...defaultTypography,
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Roboto", "Apple Color Emoji", "Helvetica Neue", sans-serif',
    fontSizeBase: "14px",
    lineHeight: 1.375,
  },
  spacing: {
    ...defaultSpacing,
    messageGap: "4px",
    messagePadding: "7px 9px 7px 9px",
    sidebarWidth: "330px",
    headerHeight: "56px",
    avatarSize: "42px",
    avatarSizeSm: "26px",
    avatarSizeLg: "54px",
  },
  borderRadius: {
    none: "0px",
    sm: "6px",
    md: "10px",
    lg: "14px",
    xl: "18px",
    full: "9999px",
  },
  icons: {
    style: "outline",
    set: "lucide",
    strokeWidth: 1.75,
  },
  components: {
    messageLayout: "bubbles",
    avatarShape: "circle",
    buttonStyle: "pill",
    inputStyle: "filled",
    sidebarStyle: "default",
    headerStyle: "default",
    scrollbarStyle: "overlay",
  },
  darkMode: {
    colors: telegramDarkColors,
  },
};

// ============================================================================
// DISCORD SKIN
// ============================================================================

const discordLightColors: SkinColorPalette = {
  primary: "#5865F2",
  secondary: "#4752C4",
  accent: "#EB459E",
  background: "#FFFFFF",
  surface: "#F2F3F5",
  text: "#2E3338",
  textSecondary: "#4F5660",
  muted: "#747F8D",
  border: "#E3E5E8",
  success: "#3BA55D",
  warning: "#FAA81A",
  error: "#ED4245",
  info: "#5865F2",
  buttonPrimaryBg: "#5865F2",
  buttonPrimaryText: "#FFFFFF",
  buttonSecondaryBg: "#E3E5E8",
  buttonSecondaryText: "#2E3338",
};

const discordDarkColors: SkinColorPalette = {
  primary: "#5865F2",
  secondary: "#4752C4",
  accent: "#EB459E",
  background: "#313338",
  surface: "#2B2D31",
  text: "#DBDEE1",
  textSecondary: "#B5BAC1",
  muted: "#949BA4",
  border: "#3F4147",
  success: "#3BA55D",
  warning: "#FAA81A",
  error: "#ED4245",
  info: "#5865F2",
  buttonPrimaryBg: "#5865F2",
  buttonPrimaryText: "#FFFFFF",
  buttonSecondaryBg: "#4E5058",
  buttonSecondaryText: "#DBDEE1",
};

export const discordSkin: VisualSkin = {
  id: "discord",
  name: "Discord",
  description: "Discord-style blurple theme with compact message layout",
  version: "0.9.1",
  colors: discordLightColors,
  typography: {
    ...defaultTypography,
    fontFamily:
      '"gg sans", "Noto Sans", "Helvetica Neue", Helvetica, Arial, sans-serif',
    fontSizeBase: "16px",
    fontSizeSm: "12px",
    fontWeightMedium: 500,
    lineHeight: 1.375,
  },
  spacing: {
    ...defaultSpacing,
    messageGap: "0px",
    messagePadding: "2px 16px",
    sidebarWidth: "240px",
    headerHeight: "48px",
    avatarSize: "40px",
    avatarSizeSm: "24px",
    avatarSizeLg: "80px",
  },
  borderRadius: {
    none: "0px",
    sm: "3px",
    md: "4px",
    lg: "8px",
    xl: "16px",
    full: "50%",
  },
  icons: {
    style: "filled",
    set: "lucide",
    strokeWidth: 2,
  },
  components: {
    messageLayout: "cozy",
    avatarShape: "rounded",
    buttonStyle: "default",
    inputStyle: "filled",
    sidebarStyle: "compact",
    headerStyle: "minimal",
    scrollbarStyle: "thin",
  },
  darkMode: {
    colors: discordDarkColors,
  },
};

// ============================================================================
// SLACK SKIN
// ============================================================================

const slackLightColors: SkinColorPalette = {
  primary: "#4A154B",
  secondary: "#350D36",
  accent: "#007A5A",
  background: "#FFFFFF",
  surface: "#F4EDE4",
  text: "#1D1C1D",
  textSecondary: "#616061",
  muted: "#696969",
  border: "#DDDDDC",
  success: "#007A5A",
  warning: "#ECB22E",
  error: "#CC2E45",
  info: "#1164A3",
  buttonPrimaryBg: "#007A5A",
  buttonPrimaryText: "#FFFFFF",
  buttonSecondaryBg: "#FFFFFF",
  buttonSecondaryText: "#4A154B",
};

const slackDarkColors: SkinColorPalette = {
  primary: "#D1B3D3",
  secondary: "#9B6B9E",
  accent: "#2BAC76",
  background: "#1A1D21",
  surface: "#222529",
  text: "#D1D2D3",
  textSecondary: "#ABABAD",
  muted: "#BCBCBC",
  border: "#35383C",
  success: "#2BAC76",
  warning: "#FCB400",
  error: "#E96379",
  info: "#36C5F0",
  buttonPrimaryBg: "#2BAC76",
  buttonPrimaryText: "#1A1D21",
  buttonSecondaryBg: "#4A4D52",
  buttonSecondaryText: "#D1D2D3",
};

export const slackSkin: VisualSkin = {
  id: "slack",
  name: "Slack",
  description:
    "Slack-style aubergine theme with compact messages and side panel threads",
  version: "0.9.1",
  colors: slackLightColors,
  typography: {
    ...defaultTypography,
    fontFamily: '"Lato", "Noto Sans", "Helvetica Neue", Arial, sans-serif',
    fontSizeBase: "15px",
    fontSizeSm: "12px",
    fontWeightNormal: 400,
    fontWeightBold: 700,
    lineHeight: 1.46668,
    letterSpacing: "normal",
  },
  spacing: {
    ...defaultSpacing,
    messageGap: "0px",
    messagePadding: "4px 20px",
    sidebarWidth: "260px",
    headerHeight: "49px",
    avatarSize: "36px",
    avatarSizeSm: "20px",
    avatarSizeLg: "48px",
  },
  borderRadius: {
    none: "0px",
    sm: "4px",
    md: "6px",
    lg: "8px",
    xl: "12px",
    full: "9999px",
  },
  icons: {
    style: "outline",
    set: "lucide",
    strokeWidth: 1.5,
  },
  components: {
    messageLayout: "default",
    avatarShape: "rounded",
    buttonStyle: "default",
    inputStyle: "outline",
    sidebarStyle: "default",
    headerStyle: "default",
    scrollbarStyle: "default",
  },
  darkMode: {
    colors: slackDarkColors,
  },
};

// ============================================================================
// SIGNAL SKIN
// ============================================================================

const signalLightColors: SkinColorPalette = {
  primary: "#3A76F0",
  secondary: "#2C6BED",
  accent: "#6191F3",
  background: "#FFFFFF",
  surface: "#F6F6F6",
  text: "#000000",
  textSecondary: "#5E5E5E",
  muted: "#999999",
  border: "#E4E4E4",
  success: "#4CAF50",
  warning: "#FFB300",
  error: "#F44336",
  info: "#3A76F0",
  buttonPrimaryBg: "#3A76F0",
  buttonPrimaryText: "#FFFFFF",
  buttonSecondaryBg: "#F6F6F6",
  buttonSecondaryText: "#000000",
};

const signalDarkColors: SkinColorPalette = {
  primary: "#3A76F0",
  secondary: "#2C6BED",
  accent: "#6191F3",
  background: "#1B1C1F",
  surface: "#2C2D31",
  text: "#EEEEEE",
  textSecondary: "#B9B9B9",
  muted: "#87878A",
  border: "#3A3B3F",
  success: "#4CAF50",
  warning: "#FFB300",
  error: "#F44336",
  info: "#3A76F0",
  buttonPrimaryBg: "#3A76F0",
  buttonPrimaryText: "#FFFFFF",
  buttonSecondaryBg: "#3A3B3F",
  buttonSecondaryText: "#EEEEEE",
};

export const signalSkin: VisualSkin = {
  id: "signal",
  name: "Signal",
  description: "Signal-style minimal blue theme with privacy-first design",
  version: "0.9.1",
  colors: signalLightColors,
  typography: {
    ...defaultTypography,
    fontFamily:
      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontSizeBase: "14px",
    lineHeight: 1.45,
  },
  spacing: {
    ...defaultSpacing,
    messageGap: "2px",
    messagePadding: "8px 12px",
    sidebarWidth: "300px",
    headerHeight: "52px",
    avatarSize: "36px",
    avatarSizeSm: "24px",
    avatarSizeLg: "80px",
  },
  borderRadius: {
    none: "0px",
    sm: "4px",
    md: "10px",
    lg: "18px",
    xl: "20px",
    full: "9999px",
  },
  icons: {
    style: "outline",
    set: "lucide",
    strokeWidth: 1.5,
  },
  components: {
    messageLayout: "bubbles",
    avatarShape: "circle",
    buttonStyle: "pill",
    inputStyle: "filled",
    sidebarStyle: "default",
    headerStyle: "minimal",
    scrollbarStyle: "hidden",
  },
  darkMode: {
    colors: signalDarkColors,
  },
};

// ============================================================================
// SKIN REGISTRY
// ============================================================================

/**
 * All built-in visual skins keyed by their id.
 */
export const visualSkins: Record<string, VisualSkin> = {
  nchat: nchatSkin,
  whatsapp: whatsappSkin,
  telegram: telegramSkin,
  discord: discordSkin,
  slack: slackSkin,
  signal: signalSkin,
};

/**
 * List of all built-in skin IDs.
 */
export const visualSkinIds = Object.keys(visualSkins);

/**
 * Retrieve a skin by ID, or undefined if not found.
 */
export function getVisualSkin(id: string): VisualSkin | undefined {
  return visualSkins[id];
}
