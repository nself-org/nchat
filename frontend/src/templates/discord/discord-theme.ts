// ===============================================================================
// Discord Theme Utilities
// ===============================================================================
//
// Theme-related utilities and CSS custom properties for the Discord template.
//
// ===============================================================================

import {
  discordColors,
  discordTypography,
  discordLayout,
  discordAnimations,
} from "./config";

// -------------------------------------------------------------------------------
// CSS Custom Properties
// -------------------------------------------------------------------------------

export const discordCSSVariables = {
  // Brand colors
  "--discord-blurple": discordColors.blurple,
  "--discord-blurple-light": discordColors.blurpleLight,
  "--discord-green": discordColors.green,
  "--discord-yellow": discordColors.yellow,
  "--discord-fuchsia": discordColors.fuchsia,
  "--discord-red": discordColors.red,

  // Gray scale
  "--discord-gray-950": discordColors.gray950,
  "--discord-gray-900": discordColors.gray900,
  "--discord-gray-850": discordColors.gray850,
  "--discord-gray-800": discordColors.gray800,
  "--discord-gray-750": discordColors.gray750,
  "--discord-gray-700": discordColors.gray700,
  "--discord-gray-650": discordColors.gray650,
  "--discord-gray-600": discordColors.gray600,
  "--discord-gray-550": discordColors.gray550,
  "--discord-gray-500": discordColors.gray500,
  "--discord-gray-400": discordColors.gray400,
  "--discord-gray-300": discordColors.gray300,
  "--discord-gray-200": discordColors.gray200,
  "--discord-gray-100": discordColors.gray100,
  "--discord-gray-50": discordColors.gray50,

  // Status colors
  "--discord-status-online": discordColors.statusOnline,
  "--discord-status-idle": discordColors.statusIdle,
  "--discord-status-dnd": discordColors.statusDnd,
  "--discord-status-offline": discordColors.statusOffline,
  "--discord-status-streaming": discordColors.statusStreaming,

  // Role colors
  "--discord-role-red": discordColors.roleRed,
  "--discord-role-orange": discordColors.roleOrange,
  "--discord-role-yellow": discordColors.roleYellow,
  "--discord-role-green": discordColors.roleGreen,
  "--discord-role-teal": discordColors.roleTeal,
  "--discord-role-blue": discordColors.roleBlue,
  "--discord-role-purple": discordColors.rolePurple,
  "--discord-role-pink": discordColors.rolePink,
  "--discord-role-gray": discordColors.roleGray,

  // Typography
  "--discord-font-primary": discordTypography.fontFamily,
  "--discord-font-code": discordTypography.fontFamilyCode,
  "--discord-font-headline": discordTypography.fontFamilyHeadline,

  // Layout
  "--discord-server-list-width": `${discordLayout.serverListWidth}px`,
  "--discord-channel-list-width": `${discordLayout.channelListWidth}px`,
  "--discord-member-list-width": `${discordLayout.memberListWidth}px`,
  "--discord-header-height": `${discordLayout.headerHeight}px`,
  "--discord-server-icon-size": `${discordLayout.serverIconSize}px`,
  "--discord-avatar-size": `${discordLayout.avatarSize}px`,
  "--discord-thread-panel-width": `${discordLayout.threadPanelWidth}px`,
  "--discord-user-panel-height": `${discordLayout.userPanelHeight}px`,

  // Animations
  "--discord-transition-fast": discordAnimations.transitionFast,
  "--discord-transition-normal": discordAnimations.transitionNormal,
  "--discord-transition-slow": discordAnimations.transitionSlow,
};

// -------------------------------------------------------------------------------
// Theme Application
// -------------------------------------------------------------------------------

/**
 * Apply Discord theme CSS variables to an element
 */
export function applyDiscordTheme(element: HTMLElement): void {
  Object.entries(discordCSSVariables).forEach(([key, value]) => {
    element.style.setProperty(key, value);
  });
}

/**
 * Generate inline style object for Discord theme
 */
export function getDiscordThemeStyle(): Record<string, string> {
  const style: Record<string, string> = {};
  Object.entries(discordCSSVariables).forEach(([key, value]) => {
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
  const hex = backgroundColor.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? discordColors.black : discordColors.white;
}

/**
 * Get status color based on presence
 */
export function getStatusColor(
  status: "online" | "idle" | "dnd" | "offline" | "streaming",
): string {
  const colors = {
    online: discordColors.statusOnline,
    idle: discordColors.statusIdle,
    dnd: discordColors.statusDnd,
    offline: discordColors.statusOffline,
    streaming: discordColors.statusStreaming,
  };
  return colors[status];
}

/**
 * Get message hover background
 */
export function getMessageHoverBackground(): string {
  return discordColors.gray650;
}

/**
 * Get role color from predefined palette
 */
export function getRoleColor(roleIndex: number): string {
  const roleColors = [
    discordColors.roleRed,
    discordColors.roleOrange,
    discordColors.roleYellow,
    discordColors.roleGreen,
    discordColors.roleTeal,
    discordColors.roleBlue,
    discordColors.rolePurple,
    discordColors.rolePink,
  ];
  return roleColors[roleIndex % roleColors.length];
}

// -------------------------------------------------------------------------------
// Export theme configuration
// -------------------------------------------------------------------------------

export const discordTheme = {
  colors: discordColors,
  typography: discordTypography,
  layout: discordLayout,
  animations: discordAnimations,
  cssVariables: discordCSSVariables,
  applyTheme: applyDiscordTheme,
  getThemeStyle: getDiscordThemeStyle,
  getContrastText,
  getStatusColor,
  getMessageHoverBackground,
  getRoleColor,
};

export default discordTheme;
