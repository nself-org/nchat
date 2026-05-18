// ===============================================================================
// WhatsApp Theme Utilities
// ===============================================================================
//
// Theme-related utilities and CSS custom properties for the WhatsApp template.
//
// ===============================================================================

import { WHATSAPP_COLORS } from "./config";

// -------------------------------------------------------------------------------
// CSS Custom Properties
// -------------------------------------------------------------------------------

export const whatsappCSSVariables = {
  // Primary colors
  "--whatsapp-primary": WHATSAPP_COLORS.primaryGreen,
  "--whatsapp-secondary": WHATSAPP_COLORS.secondaryGreen,
  "--whatsapp-dark": WHATSAPP_COLORS.darkGreen,

  // Message bubbles
  "--whatsapp-bubble-outgoing": WHATSAPP_COLORS.bubbleOutgoing,
  "--whatsapp-bubble-outgoing-dark": WHATSAPP_COLORS.bubbleOutgoingDark,
  "--whatsapp-bubble-incoming": WHATSAPP_COLORS.bubbleIncoming,
  "--whatsapp-bubble-incoming-dark": WHATSAPP_COLORS.bubbleIncomingDark,

  // Background
  "--whatsapp-chat-bg-light": WHATSAPP_COLORS.chatBgLight,
  "--whatsapp-chat-bg-dark": WHATSAPP_COLORS.chatBgDark,

  // Text
  "--whatsapp-text-primary": WHATSAPP_COLORS.textPrimary,
  "--whatsapp-text-secondary": WHATSAPP_COLORS.textSecondary,
  "--whatsapp-text-primary-dark": WHATSAPP_COLORS.textPrimaryDark,
  "--whatsapp-text-secondary-dark": WHATSAPP_COLORS.textSecondaryDark,

  // Checkmarks
  "--whatsapp-check-gray": WHATSAPP_COLORS.checkGray,
  "--whatsapp-check-blue": WHATSAPP_COLORS.checkBlue,

  // Status
  "--whatsapp-online": WHATSAPP_COLORS.online,
  "--whatsapp-typing": WHATSAPP_COLORS.typing,

  // Borders
  "--whatsapp-border-light": WHATSAPP_COLORS.borderLight,
  "--whatsapp-border-dark": WHATSAPP_COLORS.borderDark,
};

// -------------------------------------------------------------------------------
// Theme Application
// -------------------------------------------------------------------------------

/**
 * Apply WhatsApp theme CSS variables to an element
 */
export function applyWhatsAppTheme(element: HTMLElement): void {
  Object.entries(whatsappCSSVariables).forEach(([key, value]) => {
    element.style.setProperty(key, value);
  });
}

/**
 * Generate inline style object for WhatsApp theme
 */
export function getWhatsAppThemeStyle(): Record<string, string> {
  const style: Record<string, string> = {};
  Object.entries(whatsappCSSVariables).forEach(([key, value]) => {
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
 * Get message bubble background based on ownership and mode
 */
export function getBubbleBackground(
  isOwn: boolean,
  isDarkMode: boolean,
): string {
  if (isOwn) {
    return isDarkMode
      ? WHATSAPP_COLORS.bubbleOutgoingDark
      : WHATSAPP_COLORS.bubbleOutgoing;
  }
  return isDarkMode
    ? WHATSAPP_COLORS.bubbleIncomingDark
    : WHATSAPP_COLORS.bubbleIncoming;
}

/**
 * Get checkmark color based on status
 */
export function getCheckmarkColor(
  status: "sent" | "delivered" | "read",
): string {
  return status === "read"
    ? WHATSAPP_COLORS.checkBlue
    : WHATSAPP_COLORS.checkGray;
}

/**
 * Get chat background color
 */
export function getChatBackground(isDarkMode: boolean): string {
  return isDarkMode ? WHATSAPP_COLORS.chatBgDark : WHATSAPP_COLORS.chatBgLight;
}

/**
 * Get text color
 */
export function getTextColor(
  isDarkMode: boolean,
  isMuted: boolean = false,
): string {
  if (isDarkMode) {
    return isMuted
      ? WHATSAPP_COLORS.textSecondaryDark
      : WHATSAPP_COLORS.textPrimaryDark;
  }
  return isMuted ? WHATSAPP_COLORS.textSecondary : WHATSAPP_COLORS.textPrimary;
}

// -------------------------------------------------------------------------------
// Export theme configuration
// -------------------------------------------------------------------------------

export const whatsappTheme = {
  colors: WHATSAPP_COLORS,
  cssVariables: whatsappCSSVariables,
  applyTheme: applyWhatsAppTheme,
  getThemeStyle: getWhatsAppThemeStyle,
  getBubbleBackground,
  getCheckmarkColor,
  getChatBackground,
  getTextColor,
};

export default whatsappTheme;
