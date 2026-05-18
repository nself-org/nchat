/**
 * Discord Platform Skin - Public API
 *
 * Barrel exports for the complete Discord parity skin + behavior preset.
 * Import from `@/lib/skins/platforms/discord` for all Discord-specific
 * types, configs, and utilities.
 *
 * @example
 * ```ts
 * import {
 *   discordDetailedSkin,
 *   discordVisualConfig,
 *   discordDetailedBehavior,
 *   discordBehaviorConfig,
 *   getDiscordNavigation,
 *   getDiscordComposer,
 *   discordParityChecklist,
 * } from '@/lib/skins/platforms/discord'
 * ```
 *
 * @module lib/skins/platforms/discord
 * @version 1.0.0
 */

// -- Visual ------------------------------------------------------------------
export {
  discordLightColors,
  discordDarkColors,
  discordExtendedLightColors,
  discordExtendedDarkColors,
  discordTypography,
  discordSpacing,
  discordBorderRadius,
  discordIcons,
  discordComponentStyles,
  discordLightShadows,
  discordDarkShadows,
  discordDetailedSkin,
  discordVisualConfig,
} from "./visual";

export type {
  DiscordExtendedColors,
  DiscordShadows,
  DiscordVisualConfig,
} from "./visual";

// -- Behavior ----------------------------------------------------------------
export {
  discordGuildConfig,
  discordChannelTypesConfig,
  discordThreadConfig,
  discordRoleConfig,
  discordNitroConfig,
  discordStageConfig,
  discordForumConfig,
  discordVoiceConfig,
  discordBoostConfig,
  discordAutoModConfig,
  discordEventsConfig,
  discordOnboardingConfig,
  discordFormattingConfig,
  discordMediaConfig,
  discordDetailedBehavior,
  discordExtendedBehavior,
  discordBehaviorConfig,
} from "./behavior";

export type {
  DiscordGuildConfig,
  DiscordChannelTypesConfig,
  DiscordThreadConfig,
  DiscordRoleConfig,
  DiscordNitroConfig,
  DiscordStageConfig,
  DiscordForumConfig,
  DiscordVoiceConfig,
  DiscordBoostConfig,
  DiscordAutoModConfig,
  DiscordEventsConfig,
  DiscordOnboardingConfig,
  DiscordFormattingConfig,
  DiscordMediaConfig,
  DiscordExtendedBehavior,
  DiscordBehaviorConfig,
} from "./behavior";

// -- Navigation --------------------------------------------------------------
export {
  discordServerListLight,
  discordServerListDark,
  discordDesktopHeaderActions,
  discordHeaderLight,
  discordHeaderDark,
  discordUserAreaLight,
  discordUserAreaDark,
  discordMembersPanelLight,
  discordMembersPanelDark,
  discordDesktopNavigation,
  discordDesktopNavigationDark,
  discordMobileNavigation,
  discordMobileNavigationDark,
  getDiscordNavigation,
  getDiscordServerList,
  getDiscordHeader,
  getDiscordUserArea,
  getDiscordHeaderActionCount,
  getDiscordHeaderActionById,
} from "./navigation";

export type {
  DiscordServerListItem,
  DiscordChannelItem,
  DiscordCategory,
  DiscordHeaderBarConfig,
  DiscordHeaderAction,
  DiscordUserAreaConfig,
  DiscordMembersPanelConfig,
  DiscordServerListConfig,
  DiscordNavigationConfig,
} from "./navigation";

// -- Composer ----------------------------------------------------------------
export {
  discordAttachmentMenu,
  discordSlashCommandConfig,
  discordEmojiPickerConfig,
  discordReplyLight,
  discordReplyDark,
  discordMessageActionBarLight,
  discordMessageActionBarDark,
  discordSendButtonConfig,
  discordComposerLight,
  discordComposerDark,
  getDiscordComposer,
  getDiscordAttachmentMenu,
  getDiscordAttachmentById,
  getDiscordAttachmentCount,
  getDiscordSlashCommands,
  getDiscordBuiltInCommandCount,
} from "./composer";

export type {
  DiscordAttachmentMenuItem,
  DiscordSlashCommandConfig,
  DiscordEmojiPickerConfig,
  DiscordReplyConfig,
  DiscordMessageActionBarConfig,
  DiscordSendButtonConfig,
  DiscordComposerConfig,
} from "./composer";

// -- Parity Checklist --------------------------------------------------------
export {
  discordParityChecklist,
  getDiscordParityItemsByCategory,
  getDiscordParityItemsByPriority,
  getDiscordParityItemsByStatus,
  getDiscordParityItemById,
  verifyDiscordCriticalParity,
  getDiscordCategoryParityPercentage,
} from "./parity-checklist";

export type {
  DiscordParityPriority,
  DiscordParityCategory,
  DiscordParityStatus,
  DiscordParityChecklistItem,
  DiscordParityChecklist,
} from "./parity-checklist";
