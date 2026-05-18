/**
 * nchat Bot SDK
 *
 * A comprehensive SDK for building bots in nchat.
 *
 * @example
 * ```typescript
 * import { bot, command, response, embed } from '@/lib/bots'
 *
 * const myBot = bot('my-bot')
 *   .name('My Bot')
 *   .description('A simple bot')
 *   .command('greet', 'Greet a user', (ctx) => {
 *     return response()
 *       .text(`Hello, ${ctx.user.displayName}!`)
 *       .build()
 *   })
 *   .build()
 * ```
 */

// ============================================================================
// BOT STORE (existing)
// ============================================================================

export {
  useBotStore,
  mockBots,
  mockCategories,
  selectInstalledBots,
  selectInstalledBotsLoading,
  selectMarketplaceBots,
  selectMarketplaceLoading,
  selectFeaturedBots,
  selectCategories,
  selectSelectedBot,
  selectAddBotModalOpen,
  selectSettingsModalOpen,
  selectMarketplaceOpen,
} from "./bot-store";
export type { BotState, BotCategory, BotFilters } from "./bot-store";

// ============================================================================
// BOT HOOKS (existing)
// ============================================================================

export { useBots, useBot, useBotCommands, useBotReviews } from "./use-bots";
export type { UseBotsOptions, UseBotsResult } from "./use-bots";

// ============================================================================
// BOT SDK CORE
// ============================================================================

// SDK Builder
export {
  bot,
  quickBot,
  BotBuilder,
  command,
  CommandBuilder,
  response,
  embed,
  button,
  select,
  text,
  error,
  success,
  info,
  warning,
  confirm,
  list,
  code,
  quote,
  parseDuration,
  formatDuration,
  matchesKeyword,
  matchesPattern,
  getRuntime,
  createBot,
  BotInstance,
  BaseBot,
  Command,
  createEchoBot,
  createPingBot,
} from "./bot-sdk";

// Response builders
export {
  ResponseBuilder,
  EmbedBuilder,
  ButtonBuilder,
  SelectBuilder,
  bold,
  italic,
  strikethrough,
  inlineCode,
  codeBlock,
  blockQuote,
  mentionUser,
  mentionChannel,
  mentionRole,
  timestamp,
  link,
  spoiler,
  separator,
} from "./bot-responses";

// Command system
export { CommandRegistry, createHelpCommand } from "./bot-commands";

// Event system
export {
  BotEventEmitter,
  createBaseEvent,
  createMessageEvent,
  createUserEvent,
  createReactionEvent,
  isAllowed,
  EVENT_TYPES,
} from "./bot-events";

// Runtime
export { BotRuntime, createRuntime, setRuntime } from "./bot-runtime";
export type { CreateBotOptions } from "./bot-runtime";

// API
export {
  createBotApi,
  createMockServices,
  hasPermission,
  validatePermission,
  withRateLimit,
  withLogging,
} from "./bot-api";
export type {
  BotServices,
  MessagingService,
  ReactionService,
  ChannelService,
  UserService,
  StorageService,
  SchedulerService,
} from "./bot-api";

// ============================================================================
// BOT SDK TYPES
// ============================================================================

export type {
  // Core types
  BotId,
  UserId,
  ChannelId,
  MessageId,
  BotStatus,
  BotPermission,
  BotManifest,
  BotConfig,

  // Command types
  CommandArgType,
  CommandArgument,
  BotCommandDefinition,
  ParsedCommand,

  // Trigger types
  TriggerEvent,
  BotTriggerDefinition,

  // Event types
  BotEvent,
  MessageEventData,
  UserEventData,
  ReactionEventData,
  ChannelEventData,
  AttachmentData,

  // Context types
  MessageContext,
  CommandContext,
  UserContext,
  ReactionContext,

  // Response types
  ResponseOptions,
  MessageButton,
  MessageActionRow,
  MessageSelect,
  MessageEmbed,
  BotResponse,

  // Handler types
  HandlerResult,
  CommandHandler,
  MessageHandler,
  UserEventHandler,
  ReactionHandler,
  EventHandler,

  // API types
  BotApi,

  // Setting types
  SettingType,
  BotSettingDefinition,

  // Builder types
  BotBuilderDefinition,
  BotBuilderTrigger,
  BuilderActionType,
  BotBuilderAction,
  BotBuilderCondition,
} from "./bot-types";

// ============================================================================
// BOT API - Token Management
// ============================================================================

export {
  generateBotToken,
  hashToken,
  verifyToken,
  extractTokenFromHeader,
  isValidTokenFormat,
  maskToken,
  isTokenExpired,
  generateWebhookSecret,
  signWebhookPayload,
  verifyWebhookSignature,
  checkRateLimit,
  clearRateLimitCache,
  BOT_TOKEN_PREFIX,
} from "./tokens";

// ============================================================================
// BOT API - Permissions
// ============================================================================

export {
  BotPermission as BotApiPermission,
  PermissionCategory,
  PERMISSION_DEFINITIONS,
  getPermissionsByCategory,
  getPermissionDefinition,
  isDangerousPermission,
  checkBotPermission,
  checkBotPermissions,
  getBotPermissions,
  grantBotPermission,
  revokeBotPermission,
  grantBotPermissions,
  revokeBotPermissions,
  isValidPermissionFormat,
  tokenHasPermission,
} from "./permissions";
export type { PermissionDefinition } from "./permissions";

// ============================================================================
// BOT API - Webhooks
// ============================================================================

export {
  WebhookEvent,
  triggerWebhooks,
  testWebhook,
  triggerMessageCreated,
  triggerMessageDeleted,
  triggerChannelCreated,
  triggerUserJoined,
  triggerReactionAdded,
} from "./webhooks";
export type { WebhookPayload, WebhookDeliveryResult } from "./webhooks";
