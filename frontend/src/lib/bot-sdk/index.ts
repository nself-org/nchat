/**
 * Bot SDK Extension
 * Complete SDK for building and integrating bots with nchat
 */

// ============================================================================
// TYPES
// ============================================================================

export type {
  // Core types
  BotId,
  UserId,
  ChannelId,
  MessageId,
  BotToken,
  BotCredentials,
  BotStatus,
  BotPermission,

  // Block types
  BlockType,
  TextBlock,
  ImageBlock,
  ButtonBlock,
  DividerBlock,
  ActionsBlock,
  ContextBlock,
  Block,
  RichMessage,

  // Command types
  ParameterType,
  CommandParameter,
  CommandContext,
  SlashCommand,
  ParsedCommand,

  // Interaction types
  InteractionType,
  BaseInteraction,
  ButtonClickInteraction,
  FormField,
  FormSubmitInteraction,
  SelectChangeInteraction,
  MessageActionInteraction,
  Interaction,
  InteractionResponse,
  InteractionHandler,

  // Webhook types
  WebhookEventType,
  WebhookPayload,
  WebhookConfig,
  WebhookHandler,

  // Event types
  BotEventType,
  BotEvent,
  EventListener,

  // Rate limiting types
  RateLimitConfig,
  RateLimitState,

  // Client types
  BotClientConfig,
  BotInfo,
  SendMessageOptions,
  SendMessageResult,

  // Store types
  InstalledBot,
  MarketplaceBot,
  BotStoreState,

  // Utility types
  PaginatedResponse,
  ApiError,
  Result,
} from "./types";

// ============================================================================
// BOT CLIENT
// ============================================================================

export {
  BotClient,
  RateLimiter,
  BotEventEmitter,
  createBotClient,
  createAuthenticatedBotClient,
} from "./bot-client";

// ============================================================================
// COMMAND REGISTRY
// ============================================================================

export {
  CommandRegistry,
  createCommandRegistry,
  defineCommand,
  param,
} from "./command-registry";

export type {
  RegisteredCommand,
  CommandValidationResult,
  CommandRegistryConfig,
} from "./command-registry";

// ============================================================================
// MESSAGE BUILDER
// ============================================================================

export {
  // Block builders
  TextBlockBuilder,
  ImageBlockBuilder,
  ButtonBlockBuilder,
  ActionsBlockBuilder,
  ContextBlockBuilder,

  // Message builder
  MessageBuilder,

  // Factory functions
  message,
  textMessage,
  textBlock,
  createTextBlock,
  imageBlock,
  createImageBlock,
  button,
  createButton,
  actions,
  context,
  divider,

  // Formatting helpers
  bold,
  italic,
  strikethrough,
  inlineCode,
  codeBlock,
  blockquote,
  mentionUser,
  mentionChannel,
  link,
  unorderedList,
  orderedList,
  lines,

  // Template messages
  successMessage,
  errorMessage,
  warningMessage,
  infoMessage,
  confirmPrompt,
  loadingMessage,
} from "./message-builder";

// ============================================================================
// INTERACTION HANDLER
// ============================================================================

export {
  InteractionRouter,
  InteractionBuilder,
  createInteractionRouter,
  interaction,

  // Response builders
  updateResponse,
  replaceResponse,
  ephemeralResponse,
  modalResponse,
  deleteResponse,

  // Middleware
  loggingMiddleware,
  rateLimitMiddleware,
  authMiddleware,
  validationMiddleware,
} from "./interaction-handler";

export type {
  HandlerRegistration,
  MiddlewareContext,
  InteractionMiddleware,
  InteractionRouterConfig,
} from "./interaction-handler";

// ============================================================================
// WEBHOOK HANDLER
// ============================================================================

export {
  WebhookRouter,
  WebhookPayloadBuilder,
  WebhookRequestBuilder,
  createWebhookRouter,
  webhookPayload,
  webhookRequest,

  // Signature utilities
  computeSignature,
  verifySignature,
  verifyTimestamp,

  // Event constants
  WEBHOOK_EVENTS,

  // Framework handlers
  createExpressHandler,
  createNextHandler,
} from "./webhook-handler";

export type {
  WebhookValidationResult,
  WebhookRouterConfig,
  WebhookRequest,
  WebhookResponse,
} from "./webhook-handler";
