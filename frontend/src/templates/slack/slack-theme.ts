// ===============================================================================
// Slack Theme Utilities
// ===============================================================================
//
// Theme-related utilities and CSS custom properties for the Slack template.
//
// ===============================================================================

import { slackColors, slackTypography, slackComponentStyles } from "./config";

// -------------------------------------------------------------------------------
// CSS Custom Properties
// -------------------------------------------------------------------------------

export const slackCSSVariables = {
  // Colors
  "--slack-aubergine": slackColors.aubergine,
  "--slack-aubergine-dark": slackColors.aubergineDark,
  "--slack-aubergine-light": slackColors.aubergineLight,
  "--slack-green": slackColors.green,
  "--slack-green-hover": slackColors.greenHover,
  "--slack-green-light": slackColors.greenLight,
  "--slack-blue": slackColors.blue,
  "--slack-blue-light": slackColors.blueLight,
  "--slack-yellow": slackColors.yellow,
  "--slack-red": slackColors.red,
  "--slack-black": slackColors.black,
  "--slack-dark-gray": slackColors.darkGray,
  "--slack-medium-gray": slackColors.mediumGray,
  "--slack-light-gray": slackColors.lightGray,
  "--slack-pale-gray": slackColors.paleGray,
  "--slack-off-white": slackColors.offWhite,
  "--slack-white": slackColors.white,

  // Sidebar
  "--slack-sidebar-bg": slackColors.sidebarBg,
  "--slack-sidebar-text": slackColors.sidebarText,
  "--slack-sidebar-text-muted": slackColors.sidebarTextMuted,
  "--slack-sidebar-hover": slackColors.sidebarHover,
  "--slack-sidebar-active": slackColors.sidebarActive,
  "--slack-sidebar-presence": slackColors.sidebarPresence,

  // Messages
  "--slack-message-bg": slackColors.messageBg,
  "--slack-message-hover": slackColors.messageHover,
  "--slack-mention-bg": slackColors.mentionBg,
  "--slack-mention-border": slackColors.mentionBorder,

  // Dark mode
  "--slack-dark-bg": slackColors.dark.bg,
  "--slack-dark-surface": slackColors.dark.surface,
  "--slack-dark-card": slackColors.dark.card,
  "--slack-dark-border": slackColors.dark.border,
  "--slack-dark-text": slackColors.dark.text,
  "--slack-dark-text-muted": slackColors.dark.textMuted,

  // Typography
  "--slack-font-sans": slackTypography.fontFamily.sans,
  "--slack-font-mono": slackTypography.fontFamily.mono,

  // Layout
  "--slack-sidebar-width": `${slackComponentStyles.sidebar.width}px`,
  "--slack-sidebar-collapsed-width": `${slackComponentStyles.sidebar.collapsedWidth}px`,
  "--slack-header-height": `${slackComponentStyles.header.height}px`,
  "--slack-thread-width": `${slackComponentStyles.thread.width}px`,
  "--slack-avatar-size": `${slackComponentStyles.message.avatarSize}px`,
};

// -------------------------------------------------------------------------------
// Theme Application
// -------------------------------------------------------------------------------

/**
 * Apply Slack theme CSS variables to an element
 */
export function applySlackTheme(element: HTMLElement): void {
  Object.entries(slackCSSVariables).forEach(([key, value]) => {
    element.style.setProperty(key, value);
  });
}

/**
 * Generate inline style object for Slack theme
 */
export function getSlackThemeStyle(): Record<string, string> {
  const style: Record<string, string> = {};
  Object.entries(slackCSSVariables).forEach(([key, value]) => {
    // Convert CSS variable name to React style key
    const reactKey = key
      .replace(/^--/, "")
      .replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    style[reactKey] = value;
  });
  return style;
}

// -------------------------------------------------------------------------------
// Color Utilities
// -------------------------------------------------------------------------------

/**
 * Get the appropriate text color based on background
 */
export function getContrastText(backgroundColor: string): string {
  // Simple luminance calculation
  const hex = backgroundColor.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? slackColors.black : slackColors.white;
}

/**
 * Get presence color based on status
 */
export function getPresenceColor(
  status: "online" | "away" | "dnd" | "offline",
): string {
  const colors = {
    online: slackColors.sidebarPresence,
    away: slackColors.yellow,
    dnd: slackColors.red,
    offline: slackColors.mediumGray,
  };
  return colors[status];
}

/**
 * Get message background based on state
 */
export function getMessageBackground(
  isHighlighted: boolean,
  isHovered: boolean,
  isDarkMode: boolean,
): string {
  if (isHighlighted) {
    return isDarkMode ? "#5C4C0B" : slackColors.mentionBg;
  }
  if (isHovered) {
    return isDarkMode ? slackColors.dark.card : slackColors.offWhite;
  }
  return isDarkMode ? slackColors.dark.bg : slackColors.white;
}

// -------------------------------------------------------------------------------
// Export theme configuration
// -------------------------------------------------------------------------------

export const slackTheme = {
  colors: slackColors,
  typography: slackTypography,
  components: slackComponentStyles,
  cssVariables: slackCSSVariables,
  applyTheme: applySlackTheme,
  getThemeStyle: getSlackThemeStyle,
  getContrastText,
  getPresenceColor,
  getMessageBackground,
};

export default slackTheme;
