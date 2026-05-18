/**
 * Canonical Skin Architecture - Public API
 *
 * This barrel re-exports everything consumers need to work with skins,
 * behaviors, and profiles. Import from `@/lib/skins` rather than
 * individual files.
 *
 * @example
 * ```ts
 * import {
 *   getSkin,
 *   getBehavior,
 *   getProfile,
 *   applySkin,
 *   switchSkin,
 *   resolveIndependent,
 *   validateSkin,
 * } from '@/lib/skins'
 * ```
 *
 * @module lib/skins
 * @version 1.0.0
 */

// ── Types ──────────────────────────────────────────────────────────────────
export type {
  VisualSkin,
  BehaviorPreset,
  CompositeProfile,
  SkinColorPalette,
  SkinTypography,
  SkinSpacing,
  SkinBorderRadius,
  SkinIconStyle,
  SkinComponentStyles,
  BehaviorMessaging,
  BehaviorChannels,
  BehaviorPresence,
  BehaviorCalls,
  BehaviorNotifications,
  BehaviorModeration,
  BehaviorPrivacy,
  DeepPartial,
  SkinValidationResult,
  SkinRegistry,
  ResolvedSkinState,
} from "./types";

// ── Visual Skins ───────────────────────────────────────────────────────────
export {
  nchatSkin,
  whatsappSkin,
  telegramSkin,
  discordSkin,
  slackSkin,
  signalSkin,
  visualSkins,
  visualSkinIds,
  getVisualSkin,
} from "./visual-skins";

// ── Behavior Presets ───────────────────────────────────────────────────────
export {
  nchatBehavior,
  whatsappBehavior,
  telegramBehavior,
  discordBehavior,
  slackBehavior,
  signalBehavior,
  behaviorPresets,
  behaviorPresetIds,
  getBehaviorPreset,
} from "./behavior-presets";

// ── Composite Profiles ─────────────────────────────────────────────────────
export {
  nchatProfile,
  whatsappProfile,
  telegramProfile,
  discordProfile,
  slackProfile,
  signalProfile,
  compositeProfiles,
  compositeProfileIds,
  getCompositeProfile,
} from "./composite-profiles";

// ── Engine ─────────────────────────────────────────────────────────────────
export {
  deepMerge,
  createRegistry,
  registerSkin,
  registerBehavior,
  registerProfile,
  getSkin,
  getBehavior,
  getProfile,
  resolveIndependent,
  colorsToCSSVariables,
  skinToCSSVariables,
  applySkin,
  removeSkinVariables,
  applyBehavior,
  switchSkin,
  resetSkin,
  validateSkin,
  validateBehavior,
  validateProfile,
} from "./skin-engine";

// ── Design Tokens ────────────────────────────────────────────────────────
export {
  getDesignTokens,
  buildSpacingScale,
  buildTypeScale,
  buildTypeAliases,
  buildColorAliases,
  buildShadowScale,
  buildTransitionTokens,
  buildZIndexScale,
  designTokensToCSSVariables,
} from "./design-tokens";

export type {
  DesignTokens,
  SpacingScale,
  TypeScale,
  TypeScaleEntry,
  TypeAliases,
  ColorAliases,
  ShadowScale,
  TransitionDurations,
  TransitionEasings,
  TransitionTokens,
  ZIndexScale,
} from "./design-tokens";

// ── Responsive ───────────────────────────────────────────────────────────
export {
  getResponsiveConfig,
  buildBreakpoints,
  buildSemanticBreakpoints,
  buildTouchTargets,
  buildLayoutAdaptations,
  buildContainerQueries,
  buildSafeAreaTokens,
  responsiveConfigToCSSVariables,
  BREAKPOINT_ORDER,
} from "./responsive";

export type {
  ResponsiveConfig,
  Breakpoint,
  BreakpointScale,
  BreakpointName,
  SemanticBreakpoints,
  TouchTargetSizes,
  LayoutAdaptation,
  ContainerQueryTokens,
  SafeAreaTokens,
} from "./responsive";

// ── Motion ───────────────────────────────────────────────────────────────
export {
  getMotionTokens,
  buildAnimationCatalog,
  getKeyframeDefinitions,
  buildStaggerConfig,
  getStaggerDelay,
  buildSpringPresets,
  resolveAnimation,
} from "./motion";

export type {
  MotionTokens,
  AnimationPreset,
  ReducedMotionAlternative,
  AnimationCatalog,
  KeyframeDefinition,
  StaggerConfig,
  SpringConfig,
  SpringPresets,
} from "./motion";

// ── Accessibility ────────────────────────────────────────────────────────
export {
  getAccessibilityTokens,
  parseHexColor,
  relativeLuminance,
  contrastRatio,
  meetsContrastRequirement,
  buildFocusRingTokens,
  buildHighContrastOverrides,
  buildTouchTargetTokens,
  getScreenReaderOnlyStyle,
  getScreenReaderFocusableStyle,
  buildKeyboardNavigationTokens,
} from "./accessibility";

export type {
  AccessibilityTokens,
  FocusRingStyle,
  FocusRingTokens,
  HighContrastOverrides,
  TouchTargetTokens,
  ScreenReaderOnlyStyle,
  KeyboardNavigationTokens,
} from "./accessibility";

// ── Component Tokens ─────────────────────────────────────────────────────
export {
  getComponentTokens,
  componentTokensToCSSVariables,
  COMPONENT_NAMES,
} from "./component-tokens";

export type {
  ComponentTokens,
  ComponentName,
  MessageBubbleTokens,
  SidebarTokens,
  HeaderTokens,
  ComposerTokens,
  ModalTokens,
  TooltipTokens,
  DropdownTokens,
  AvatarTokens,
  BadgeTokens,
  ButtonTokens,
  InputTokens,
} from "./component-tokens";

// ── Platform Skins ──────────────────────────────────────────────────────

// WhatsApp Platform Skin (detailed parity implementation)
export {
  whatsappDetailedSkin,
  whatsappVisualConfig,
  whatsappDetailedBehavior,
  whatsappBehaviorConfig,
  whatsappExtendedBehavior,
  getWhatsAppNavigation,
  getWhatsAppDefaultTab,
  getWhatsAppTabCount,
  getWhatsAppTabById,
  getWhatsAppComposer,
  getWhatsAppAttachmentMenu,
  getWhatsAppAttachmentById,
  getWhatsAppAttachmentCount,
  whatsappParityChecklist,
  verifyCriticalParity,
  getParityItemsByCategory,
  getParityItemsByPriority,
  getParityItemsByStatus,
  getParityItemById,
  getCategoryParityPercentage,
} from "./platforms/whatsapp";

export type {
  WhatsAppExtendedColors,
  WhatsAppShadows,
  WhatsAppVisualConfig,
  WhatsAppStatusConfig,
  WhatsAppCommunityConfig,
  WhatsAppCallConfig,
  WhatsAppFormattingConfig,
  WhatsAppChatListConfig,
  WhatsAppMediaConfig,
  WhatsAppGroupAdminConfig,
  WhatsAppExtendedBehavior,
  WhatsAppBehaviorConfig,
  NavigationTab,
  NavigationLayout,
  HeaderBarConfig,
  HeaderAction,
  ChatListNavConfig,
  WhatsAppNavigationConfig,
  AttachmentMenuItem,
  VoiceRecordingConfig,
  EmojiPickerConfig,
  ReplyPreviewConfig,
  SendButtonConfig,
  WhatsAppComposerConfig,
  ParityPriority,
  ParityCategory,
  ParityStatus,
  ParityChecklistItem,
  WhatsAppParityChecklist,
} from "./platforms/whatsapp";

// Telegram Platform Skin (detailed parity implementation)
export {
  telegramDetailedSkin,
  telegramVisualConfig,
  telegramDetailedBehavior,
  telegramBehaviorConfig,
  telegramExtendedBehavior,
  getTelegramNavigation,
  getTelegramDefaultTab,
  getTelegramDrawerItemCount,
  getTelegramDrawerItemById,
  getTelegramDrawerDividers,
  getTelegramComposer,
  getTelegramAttachmentMenu,
  getTelegramAttachmentById,
  getTelegramAttachmentCount,
  telegramParityChecklist,
  verifyTelegramCriticalParity,
  getTelegramParityItemsByCategory,
  getTelegramParityItemsByPriority,
  getTelegramParityItemsByStatus,
  getTelegramParityItemById,
  getTelegramCategoryParityPercentage,
} from "./platforms/telegram";

export type {
  TelegramExtendedColors,
  TelegramShadows,
  TelegramVisualConfig,
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
  TelegramNavigationTab,
  TelegramDrawerItem,
  TelegramNavigationLayout,
  TelegramHeaderBarConfig,
  TelegramChatListNavConfig,
  TelegramNavigationConfig,
  TelegramAttachmentMenuItem,
  TelegramVoiceRecordingConfig,
  TelegramVideoMessageConfig,
  TelegramEmojiPickerConfig,
  TelegramReplyPreviewConfig,
  TelegramBotCommandConfig,
  TelegramSendButtonConfig,
  TelegramFormattingToolbarConfig,
  TelegramComposerConfig,
  TelegramParityPriority,
  TelegramParityCategory,
  TelegramParityStatus,
  TelegramParityChecklistItem,
  TelegramParityChecklist,
} from "./platforms/telegram";

// Discord Platform Skin (detailed parity implementation)
export {
  discordDetailedSkin,
  discordVisualConfig,
  discordDetailedBehavior,
  discordBehaviorConfig,
  discordExtendedBehavior,
  getDiscordNavigation,
  getDiscordServerList,
  getDiscordHeader,
  getDiscordUserArea,
  getDiscordHeaderActionCount,
  getDiscordHeaderActionById,
  getDiscordComposer,
  getDiscordAttachmentMenu,
  getDiscordAttachmentById,
  getDiscordAttachmentCount,
  getDiscordSlashCommands,
  getDiscordBuiltInCommandCount,
  discordParityChecklist,
  verifyDiscordCriticalParity,
  getDiscordParityItemsByCategory,
  getDiscordParityItemsByPriority,
  getDiscordParityItemsByStatus,
  getDiscordParityItemById,
  getDiscordCategoryParityPercentage,
} from "./platforms/discord";

export type {
  DiscordExtendedColors,
  DiscordShadows,
  DiscordVisualConfig,
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
  DiscordServerListItem,
  DiscordChannelItem,
  DiscordCategory,
  DiscordHeaderBarConfig,
  DiscordHeaderAction,
  DiscordUserAreaConfig,
  DiscordMembersPanelConfig,
  DiscordServerListConfig,
  DiscordNavigationConfig,
  DiscordAttachmentMenuItem,
  DiscordSlashCommandConfig,
  DiscordEmojiPickerConfig,
  DiscordReplyConfig,
  DiscordMessageActionBarConfig,
  DiscordSendButtonConfig,
  DiscordComposerConfig,
  DiscordParityPriority,
  DiscordParityCategory,
  DiscordParityStatus,
  DiscordParityChecklistItem,
  DiscordParityChecklist,
} from "./platforms/discord";

// Slack Platform Skin (detailed parity implementation)
export {
  slackDetailedSkin,
  slackVisualConfig,
  slackDetailedBehavior,
  slackBehaviorConfig,
  slackExtendedBehavior,
  getSlackNavigation,
  getSlackDefaultRailItem,
  getSlackRailItemCount,
  getSlackRailItemById,
  getSlackHeaderActionCount,
  getSlackHeaderActionById,
  getSlackDefaultSectionCount,
  getSlackComposer,
  getSlackAttachmentMenu,
  getSlackAttachmentById,
  getSlackAttachmentCount,
  getSlackFormattingButtonCount,
  getSlackBuiltInCommandCount,
  slackParityChecklist,
  verifySlackCriticalParity,
  getSlackParityItemsByCategory,
  getSlackParityItemsByPriority,
  getSlackParityItemsByStatus,
  getSlackParityItemById,
  getSlackCategoryParityPercentage,
} from "./platforms/slack";

export type {
  SlackExtendedColors,
  SlackShadows,
  SlackVisualConfig,
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
  SlackRailItem,
  SlackWorkspaceItem,
  SlackSidebarSection,
  SlackChannelListItem,
  SlackHeaderConfig,
  SlackHeaderAction,
  SlackRailConfig,
  SlackNavigationConfig,
  SlackFormattingButton,
  SlackAttachmentMenuItem,
  SlackSlashCommandConfig,
  SlackMentionConfig,
  SlackEmojiPickerConfig,
  SlackReplyConfig,
  SlackScheduleConfig,
  SlackSendButtonConfig,
  SlackComposerConfig,
  SlackParityPriority,
  SlackParityCategory,
  SlackParityStatus,
  SlackParityChecklistItem,
  SlackParityChecklist,
} from "./platforms/slack";
