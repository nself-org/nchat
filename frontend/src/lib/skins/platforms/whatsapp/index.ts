/**
 * WhatsApp Platform Skin - Public API
 *
 * Barrel exports for the complete WhatsApp parity skin + behavior preset.
 * Import from `@/lib/skins/platforms/whatsapp` for all WhatsApp-specific
 * types, configs, and utilities.
 *
 * @example
 * ```ts
 * import {
 *   whatsappDetailedSkin,
 *   whatsappVisualConfig,
 *   whatsappDetailedBehavior,
 *   whatsappBehaviorConfig,
 *   getWhatsAppNavigation,
 *   getWhatsAppComposer,
 *   whatsappParityChecklist,
 * } from '@/lib/skins/platforms/whatsapp'
 * ```
 *
 * @module lib/skins/platforms/whatsapp
 * @version 1.0.0
 */

// ── Visual ──────────────────────────────────────────────────────────────
export {
  whatsappLightColors,
  whatsappDarkColors,
  whatsappExtendedLightColors,
  whatsappExtendedDarkColors,
  whatsappTypography,
  whatsappSpacing,
  whatsappBorderRadius,
  whatsappIcons,
  whatsappComponentStyles,
  whatsappLightShadows,
  whatsappDarkShadows,
  whatsappDetailedSkin,
  whatsappVisualConfig,
} from "./visual";

export type {
  WhatsAppExtendedColors,
  WhatsAppShadows,
  WhatsAppVisualConfig,
} from "./visual";

// ── Behavior ────────────────────────────────────────────────────────────
export {
  whatsappStatusConfig,
  whatsappCommunityConfig,
  whatsappCallConfig,
  whatsappFormattingConfig,
  whatsappChatListConfig,
  whatsappMediaConfig,
  whatsappGroupAdminConfig,
  whatsappDetailedBehavior,
  whatsappExtendedBehavior,
  whatsappBehaviorConfig,
} from "./behavior";

export type {
  WhatsAppStatusConfig,
  WhatsAppCommunityConfig,
  WhatsAppCallConfig,
  WhatsAppFormattingConfig,
  WhatsAppChatListConfig,
  WhatsAppMediaConfig,
  WhatsAppGroupAdminConfig,
  WhatsAppExtendedBehavior,
  WhatsAppBehaviorConfig,
} from "./behavior";

// ── Navigation ──────────────────────────────────────────────────────────
export {
  whatsappMobileTabs,
  whatsappDesktopTabs,
  whatsappMobileHeaderActions,
  whatsappDesktopHeaderActions,
  whatsappMobileNavigation,
  whatsappDesktopNavigation,
  whatsappMobileNavigationDark,
  whatsappDesktopNavigationDark,
  getWhatsAppNavigation,
  getWhatsAppDefaultTab,
  getWhatsAppTabCount,
  getWhatsAppTabById,
} from "./navigation";

export type {
  NavigationTab,
  NavigationLayout,
  HeaderBarConfig,
  HeaderAction,
  ChatListNavConfig,
  WhatsAppNavigationConfig,
} from "./navigation";

// ── Composer ────────────────────────────────────────────────────────────
export {
  whatsappAttachmentMenuLight,
  whatsappAttachmentMenuDark,
  whatsappVoiceRecordingLight,
  whatsappVoiceRecordingDark,
  whatsappEmojiPickerConfig,
  whatsappReplyPreviewLight,
  whatsappReplyPreviewDark,
  whatsappSendButtonLight,
  whatsappSendButtonDark,
  whatsappComposerLight,
  whatsappComposerDark,
  getWhatsAppComposer,
  getWhatsAppAttachmentMenu,
  getWhatsAppAttachmentById,
  getWhatsAppAttachmentCount,
} from "./composer";

export type {
  AttachmentMenuItem,
  VoiceRecordingConfig,
  EmojiPickerConfig,
  ReplyPreviewConfig,
  SendButtonConfig,
  WhatsAppComposerConfig,
} from "./composer";

// ── Parity Checklist ────────────────────────────────────────────────────
export {
  whatsappParityChecklist,
  getParityItemsByCategory,
  getParityItemsByPriority,
  getParityItemsByStatus,
  getParityItemById,
  verifyCriticalParity,
  getCategoryParityPercentage,
} from "./parity-checklist";

export type {
  ParityPriority,
  ParityCategory,
  ParityStatus,
  ParityChecklistItem,
  WhatsAppParityChecklist,
} from "./parity-checklist";
