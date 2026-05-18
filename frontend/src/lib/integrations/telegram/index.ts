/**
 * Telegram Integration
 *
 * Complete Telegram integration for the chat platform.
 * Provides Bot API client, webhook handling, and message formatting.
 *
 * Note: Telegram uses Bot API, not OAuth, for authentication.
 * Bots are created through @BotFather and configured with a token.
 */

// Export client
export {
  TelegramApiClient,
  TelegramApiError,
  TelegramIntegrationProvider,
  createTelegramProvider,
  TELEGRAM_API_BASE,
  verifyTelegramWebhook,
  type TelegramClientConfig,
} from "./telegram-client";

// Export formatter
export {
  formatTelegramNotification,
  convertTelegramMessageToChat,
  convertChatMessageToTelegram,
  buildInlineKeyboard,
  buildUrlButton,
  buildCallbackButton,
  buildWebAppButton,
  TELEGRAM_COLORS,
  type FormattedTelegramNotification,
  type TelegramNotificationIcon,
  type TelegramNotificationColor,
  type TelegramNotificationMetadata,
} from "./formatter";

// Export types
export type {
  TelegramUser,
  TelegramChat,
  TelegramMessage,
  TelegramImportOptions,
  TelegramSyncResult,
  TelegramUpdateType,
  TelegramUpdate,
  TelegramInlineQuery,
  TelegramChosenInlineResult,
  TelegramCallbackQuery,
  TelegramShippingQuery,
  TelegramPreCheckoutQuery,
  TelegramPoll,
  TelegramPollAnswer,
  TelegramChatMemberUpdated,
  TelegramChatMember,
  TelegramChatInviteLink,
  TelegramChatJoinRequest,
  TelegramLocation,
  TelegramMessageEntity,
  TelegramReplyKeyboardMarkup,
  TelegramKeyboardButton,
  TelegramInlineKeyboardMarkup,
  TelegramInlineKeyboardButton,
  TelegramChatAdministratorRights,
  TelegramSticker,
  TelegramPhotoSize,
  TelegramFile,
  TelegramChatNotificationSettings,
  TelegramIntegrationConfig,
  TelegramUnfurlResult,
} from "./types";
