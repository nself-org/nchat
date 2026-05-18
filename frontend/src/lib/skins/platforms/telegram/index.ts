/**
 * Telegram Platform Skin - Public API
 *
 * Barrel exports for the complete Telegram parity skin + behavior preset.
 * Import from `@/lib/skins/platforms/telegram` for all Telegram-specific
 * types, configs, and utilities.
 *
 * @example
 * ```ts
 * import {
 *   telegramDetailedSkin,
 *   telegramVisualConfig,
 *   telegramDetailedBehavior,
 *   telegramBehaviorConfig,
 *   getTelegramNavigation,
 *   getTelegramComposer,
 *   telegramParityChecklist,
 * } from '@/lib/skins/platforms/telegram'
 * ```
 *
 * @module lib/skins/platforms/telegram
 * @version 1.0.0
 */

// -- Visual ------------------------------------------------------------------
export {
  telegramLightColors,
  telegramDarkColors,
  telegramExtendedLightColors,
  telegramExtendedDarkColors,
  telegramTypography,
  telegramSpacing,
  telegramBorderRadius,
  telegramIcons,
  telegramComponentStyles,
  telegramLightShadows,
  telegramDarkShadows,
  telegramDetailedSkin,
  telegramVisualConfig,
} from "./visual";

export type {
  TelegramExtendedColors,
  TelegramShadows,
  TelegramVisualConfig,
} from "./visual";

// -- Behavior ----------------------------------------------------------------
export {
  telegramChatFoldersConfig,
  telegramSecretChatsConfig,
  telegramChannelConfig,
  telegramSupergroupConfig,
  telegramBotConfig,
  telegramFormattingConfig,
  telegramMediaConfig,
  telegramPrivacyConfig,
  telegramChatListConfig,
  telegramAdditionalFeaturesConfig,
  telegramDetailedBehavior,
  telegramExtendedBehavior,
  telegramBehaviorConfig,
} from "./behavior";

export type {
  TelegramChatFoldersConfig,
  TelegramSecretChatsConfig,
  TelegramChannelConfig,
  TelegramSupergroupConfig,
  TelegramBotConfig,
  TelegramFormattingConfig,
  TelegramMediaConfig,
  TelegramPrivacyConfig,
  TelegramChatListConfig,
  TelegramAdditionalFeaturesConfig,
  TelegramExtendedBehavior,
  TelegramBehaviorConfig,
} from "./behavior";

// -- Navigation --------------------------------------------------------------
export {
  telegramDrawerItems,
  telegramDefaultFolderTabs,
  telegramMobileNavigation,
  telegramDesktopNavigation,
  telegramMobileNavigationDark,
  telegramDesktopNavigationDark,
  getTelegramNavigation,
  getTelegramDefaultTab,
  getTelegramDrawerItemCount,
  getTelegramDrawerItemById,
  getTelegramDrawerDividers,
} from "./navigation";

export type {
  TelegramNavigationTab,
  TelegramDrawerItem,
  TelegramNavigationLayout,
  TelegramHeaderBarConfig,
  TelegramChatListNavConfig,
  TelegramNavigationConfig,
} from "./navigation";

// -- Composer ----------------------------------------------------------------
export {
  telegramAttachmentMenuLight,
  telegramAttachmentMenuDark,
  telegramVoiceRecordingLight,
  telegramVoiceRecordingDark,
  telegramVideoMessageLight,
  telegramVideoMessageDark,
  telegramEmojiPickerConfig,
  telegramReplyPreviewLight,
  telegramReplyPreviewDark,
  telegramBotCommandConfig,
  telegramSendButtonLight,
  telegramSendButtonDark,
  telegramFormattingToolbarConfig,
  telegramComposerLight,
  telegramComposerDark,
  getTelegramComposer,
  getTelegramAttachmentMenu,
  getTelegramAttachmentById,
  getTelegramAttachmentCount,
} from "./composer";

export type {
  TelegramAttachmentMenuItem,
  TelegramVoiceRecordingConfig,
  TelegramVideoMessageConfig,
  TelegramEmojiPickerConfig,
  TelegramReplyPreviewConfig,
  TelegramBotCommandConfig,
  TelegramSendButtonConfig,
  TelegramFormattingToolbarConfig,
  TelegramComposerConfig,
} from "./composer";

// -- Parity Checklist --------------------------------------------------------
export {
  telegramParityChecklist,
  getTelegramParityItemsByCategory,
  getTelegramParityItemsByPriority,
  getTelegramParityItemsByStatus,
  getTelegramParityItemById,
  verifyTelegramCriticalParity,
  getTelegramCategoryParityPercentage,
} from "./parity-checklist";

export type {
  TelegramParityPriority,
  TelegramParityCategory,
  TelegramParityStatus,
  TelegramParityChecklistItem,
  TelegramParityChecklist,
} from "./parity-checklist";
