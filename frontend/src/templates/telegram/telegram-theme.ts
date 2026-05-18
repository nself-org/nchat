// ===============================================================================
// Telegram Theme Utilities
// ===============================================================================
//
// Theme-related utilities and CSS custom properties for the Telegram template.
//
// ===============================================================================

import {
  TELEGRAM_COLORS,
  TELEGRAM_TYPOGRAPHY,
  TELEGRAM_BUBBLES,
  TELEGRAM_ANIMATIONS,
} from "./config";

// -------------------------------------------------------------------------------
// CSS Custom Properties
// -------------------------------------------------------------------------------

export const telegramCSSVariables = {
  // Primary colors
  "--telegram-blue": TELEGRAM_COLORS.telegramBlue,
  "--telegram-blue-dark": TELEGRAM_COLORS.telegramBlueDark,
  "--telegram-blue-deep": TELEGRAM_COLORS.telegramBlueDeep,
  "--telegram-blue-light": TELEGRAM_COLORS.telegramBlueLight,

  // Message bubbles
  "--telegram-bubble-outgoing": TELEGRAM_COLORS.bubbleOutgoing,
  "--telegram-bubble-outgoing-dark": TELEGRAM_COLORS.bubbleOutgoingDark,
  "--telegram-bubble-incoming": TELEGRAM_COLORS.bubbleIncoming,
  "--telegram-bubble-incoming-dark": TELEGRAM_COLORS.bubbleIncomingDark,

  // Status colors
  "--telegram-online": TELEGRAM_COLORS.online,
  "--telegram-typing": TELEGRAM_COLORS.typing,

  // Checkmarks
  "--telegram-check-sent": TELEGRAM_COLORS.checkSent,
  "--telegram-check-delivered": TELEGRAM_COLORS.checkDelivered,
  "--telegram-check-read": TELEGRAM_COLORS.checkRead,

  // Dark mode
  "--telegram-dark-bg": TELEGRAM_COLORS.darkBackground,
  "--telegram-dark-surface": TELEGRAM_COLORS.darkSurface,
  "--telegram-dark-card": TELEGRAM_COLORS.darkCard,
  "--telegram-dark-border": TELEGRAM_COLORS.darkBorder,

  // Typography
  "--telegram-font-primary": TELEGRAM_TYPOGRAPHY.fontFamily.primary,
  "--telegram-font-mono": TELEGRAM_TYPOGRAPHY.fontFamily.monospace,

  // Bubble dimensions
  "--telegram-bubble-radius": TELEGRAM_BUBBLES.borderRadius,
  "--telegram-bubble-max-width": TELEGRAM_BUBBLES.maxWidth,
  "--telegram-bubble-min-width": TELEGRAM_BUBBLES.minWidth,

  // Animation durations
  "--telegram-transition-fast": TELEGRAM_ANIMATIONS.duration.fast,
  "--telegram-transition-normal": TELEGRAM_ANIMATIONS.duration.normal,
  "--telegram-transition-slow": TELEGRAM_ANIMATIONS.duration.slow,
};

// -------------------------------------------------------------------------------
// Theme Application
// -------------------------------------------------------------------------------

/**
 * Apply Telegram theme CSS variables to an element
 */
export function applyTelegramTheme(element: HTMLElement): void {
  Object.entries(telegramCSSVariables).forEach(([key, value]) => {
    element.style.setProperty(key, value);
  });
}

/**
 * Generate inline style object for Telegram theme
 */
export function getTelegramThemeStyle(): Record<string, string> {
  const style: Record<string, string> = {};
  Object.entries(telegramCSSVariables).forEach(([key, value]) => {
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
 * Get avatar background color based on user ID
 */
export function getAvatarColor(userId: string): string {
  const colors = [
    "#E17076", // Red
    "#FAA74A", // Orange
    "#7BC862", // Green
    "#6EC9CB", // Teal
    "#65AADD", // Blue
    "#A695E7", // Purple
    "#EE7AAE", // Pink
  ];
  const index = userId.charCodeAt(0) % colors.length;
  return colors[index];
}

/**
 * Get message bubble background based on ownership and mode
 */
export function getBubbleBackground(
  isOwn: boolean,
  isDarkMode: boolean,
): string {
  if (isOwn) {
    return isDarkMode
      ? TELEGRAM_COLORS.bubbleOutgoingDark
      : TELEGRAM_COLORS.bubbleOutgoing;
  }
  return isDarkMode
    ? TELEGRAM_COLORS.bubbleIncomingDark
    : TELEGRAM_COLORS.bubbleIncoming;
}

/**
 * Get checkmark color based on status
 */
export function getCheckmarkColor(
  status: "sent" | "delivered" | "read",
): string {
  switch (status) {
    case "read":
      return TELEGRAM_COLORS.checkRead;
    case "delivered":
      return TELEGRAM_COLORS.checkDelivered;
    case "sent":
    default:
      return TELEGRAM_COLORS.checkSent;
  }
}

/**
 * Get online status color
 */
export function getOnlineColor(): string {
  return TELEGRAM_COLORS.online;
}

// -------------------------------------------------------------------------------
// Export theme configuration
// -------------------------------------------------------------------------------

export const telegramTheme = {
  colors: TELEGRAM_COLORS,
  typography: TELEGRAM_TYPOGRAPHY,
  bubbles: TELEGRAM_BUBBLES,
  animations: TELEGRAM_ANIMATIONS,
  cssVariables: telegramCSSVariables,
  applyTheme: applyTelegramTheme,
  getThemeStyle: getTelegramThemeStyle,
  getAvatarColor,
  getBubbleBackground,
  getCheckmarkColor,
  getOnlineColor,
};

export default telegramTheme;
