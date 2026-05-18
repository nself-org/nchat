/**
 * Slack Platform Skin - Public API
 *
 * Barrel exports for the complete Slack parity skin + behavior preset.
 * Import from `@/lib/skins/platforms/slack` for all Slack-specific
 * types, configs, and utilities.
 *
 * @example
 * ```ts
 * import {
 *   slackDetailedSkin,
 *   slackVisualConfig,
 *   slackDetailedBehavior,
 *   slackBehaviorConfig,
 *   getSlackNavigation,
 *   getSlackComposer,
 *   slackParityChecklist,
 * } from '@/lib/skins/platforms/slack'
 * ```
 *
 * @module lib/skins/platforms/slack
 * @version 1.0.0
 */

// ── Visual ──────────────────────────────────────────────────────────────
export {
  slackLightColors,
  slackDarkColors,
  slackExtendedLightColors,
  slackExtendedDarkColors,
  slackTypography,
  slackSpacing,
  slackBorderRadius,
  slackIcons,
  slackComponentStyles,
  slackLightShadows,
  slackDarkShadows,
  slackDetailedSkin,
  slackVisualConfig,
} from "./visual";

export type {
  SlackExtendedColors,
  SlackShadows,
  SlackVisualConfig,
} from "./visual";

// ── Behavior ────────────────────────────────────────────────────────────
export {
  slackWorkspaceConfig,
  slackSectionsConfig,
  slackHuddleConfig,
  slackCanvasConfig,
  slackWorkflowConfig,
  slackFormattingConfig,
  slackSearchConfig,
  slackAppConfig,
  slackRemindersConfig,
  slackDmConfig,
  slackDetailedBehavior,
  slackExtendedBehavior,
  slackBehaviorConfig,
} from "./behavior";

export type {
  SlackWorkspaceConfig,
  SlackSectionsConfig,
  SlackHuddleConfig,
  SlackCanvasConfig,
  SlackWorkflowConfig,
  SlackFormattingConfig,
  SlackSearchConfig,
  SlackAppConfig,
  SlackRemindersConfig,
  SlackDmConfig,
  SlackExtendedBehavior,
  SlackBehaviorConfig,
} from "./behavior";

// ── Navigation ──────────────────────────────────────────────────────────
export {
  slackRailItems,
  slackMobileRailItems,
  slackHeaderActions,
  slackDefaultSections,
  slackDesktopNavigation,
  slackMobileNavigation,
  slackDesktopNavigationDark,
  slackMobileNavigationDark,
  getSlackNavigation,
  getSlackDefaultRailItem,
  getSlackRailItemCount,
  getSlackRailItemById,
  getSlackHeaderActionCount,
  getSlackHeaderActionById,
  getSlackDefaultSectionCount,
} from "./navigation";

export type {
  SlackRailItem,
  SlackWorkspaceItem,
  SlackSidebarSection,
  SlackChannelListItem,
  SlackHeaderConfig,
  SlackHeaderAction,
  SlackRailConfig,
  SlackNavigationConfig,
} from "./navigation";

// ── Composer ────────────────────────────────────────────────────────────
export {
  slackFormattingToolbar,
  slackAttachmentMenuLight,
  slackAttachmentMenuDark,
  slackSlashCommandConfig,
  slackMentionConfig,
  slackEmojiPickerConfig,
  slackReplyConfigLight,
  slackReplyConfigDark,
  slackScheduleConfig,
  slackSendButtonLight,
  slackSendButtonDark,
  slackComposerLight,
  slackComposerDark,
  getSlackComposer,
  getSlackAttachmentMenu,
  getSlackAttachmentById,
  getSlackAttachmentCount,
  getSlackFormattingButtonCount,
  getSlackBuiltInCommandCount,
} from "./composer";

export type {
  SlackFormattingButton,
  SlackAttachmentMenuItem,
  SlackSlashCommandConfig,
  SlackMentionConfig,
  SlackEmojiPickerConfig,
  SlackReplyConfig,
  SlackScheduleConfig,
  SlackSendButtonConfig,
  SlackComposerConfig,
} from "./composer";

// ── Parity Checklist ────────────────────────────────────────────────────
export {
  slackParityChecklist,
  getSlackParityItemsByCategory,
  getSlackParityItemsByPriority,
  getSlackParityItemsByStatus,
  getSlackParityItemById,
  verifySlackCriticalParity,
  getSlackCategoryParityPercentage,
} from "./parity-checklist";

export type {
  SlackParityPriority,
  SlackParityCategory,
  SlackParityStatus,
  SlackParityChecklistItem,
  SlackParityChecklist,
} from "./parity-checklist";
