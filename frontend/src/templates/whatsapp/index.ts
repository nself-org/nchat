// ===============================================================================
// WhatsApp Template Exports
// ===============================================================================
//
// Central export file for all WhatsApp template components and utilities.
//
// ===============================================================================

// Template configuration
export { default as whatsappTemplate } from "./config";
export { WHATSAPP_COLORS } from "./config";

// Theme utilities
export {
  whatsappTheme,
  whatsappCSSVariables,
  applyWhatsAppTheme,
  getWhatsAppThemeStyle,
  getBubbleBackground,
  getCheckmarkColor,
  getChatBackground,
  getTextColor,
} from "./whatsapp-theme";

// Components
export { WhatsAppLayout } from "./components/WhatsAppLayout";
export type { WhatsAppLayoutProps } from "./components/WhatsAppLayout";

export { WhatsAppChatList } from "./components/WhatsAppChatList";
export type {
  WhatsAppChatListProps,
  WhatsAppChatData,
} from "./components/WhatsAppChatList";

export { WhatsAppChatView } from "./components/WhatsAppChatView";
export type { WhatsAppChatViewProps } from "./components/WhatsAppChatView";

export { WhatsAppMessage } from "./components/WhatsAppMessage";
export type {
  WhatsAppMessageProps,
  WhatsAppReaction,
  WhatsAppAttachment,
} from "./components/WhatsAppMessage";

export { WhatsAppComposer } from "./components/WhatsAppComposer";
export type { WhatsAppComposerProps } from "./components/WhatsAppComposer";

export { WhatsAppStatus } from "./components/WhatsAppStatus";
export type {
  WhatsAppStatusProps,
  WhatsAppStatusData,
} from "./components/WhatsAppStatus";

export { WhatsAppCalls } from "./components/WhatsAppCalls";
export type {
  WhatsAppCallsProps,
  WhatsAppCallData,
} from "./components/WhatsAppCalls";
