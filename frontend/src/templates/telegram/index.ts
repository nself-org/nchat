// ===============================================================================
// Telegram Template Exports
// ===============================================================================
//
// Central export file for all Telegram template components and utilities.
//
// ===============================================================================

// Template configuration
export { default as telegramTemplate } from "./config";
export {
  TELEGRAM_COLORS,
  TELEGRAM_TYPOGRAPHY,
  TELEGRAM_BUBBLES,
  TELEGRAM_ICONS,
  TELEGRAM_ANIMATIONS,
} from "./config";

// Theme utilities
export {
  telegramTheme,
  telegramCSSVariables,
  applyTelegramTheme,
  getTelegramThemeStyle,
  getAvatarColor,
  getBubbleBackground,
  getCheckmarkColor,
  getOnlineColor,
} from "./telegram-theme";

// Components
export { TelegramLayout } from "./components/TelegramLayout";
export type { TelegramLayoutProps } from "./components/TelegramLayout";

export { TelegramChatList } from "./components/TelegramChatList";
export type {
  TelegramChatListProps,
  TelegramChatData,
} from "./components/TelegramChatList";

export { TelegramChatView } from "./components/TelegramChatView";
export type { TelegramChatViewProps } from "./components/TelegramChatView";

export { TelegramMessage } from "./components/TelegramMessage";
export type {
  TelegramMessageProps,
  TelegramReaction,
  TelegramAttachment,
} from "./components/TelegramMessage";

export { TelegramComposer } from "./components/TelegramComposer";
export type { TelegramComposerProps } from "./components/TelegramComposer";

export { TelegramFolders } from "./components/TelegramFolders";
export type {
  TelegramFoldersProps,
  TelegramFolder,
} from "./components/TelegramFolders";

export { TelegramVoiceMessage } from "./components/TelegramVoiceMessage";
export type { TelegramVoiceMessageProps } from "./components/TelegramVoiceMessage";
