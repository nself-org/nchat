/**
 * Bot SDK Type Definitions
 * Shared types for the Bot SDK extension
 */

// ============================================================================
// CORE TYPES
// ============================================================================

export type BotId = string;
export type UserId = string;
export type ChannelId = string;
export type MessageId = string;

/**
 * Bot authentication token
 */
export interface BotToken {
  token: string;
  expiresAt: Date;
  refreshToken?: string;
}

/**
 * Bot authentication credentials
 */
export interface BotCredentials {
  botId: BotId;
  secret: string;
}

/**
 * Bot status types
 */
export type BotStatus =
  | "online"
  | "offline"
  | "error"
  | "initializing"
  | "rate_limited";

/**
 * Bot permission levels
 */
export type BotPermission =
  | "read_messages"
  | "send_messages"
  | "manage_messages"
  | "read_channels"
  | "manage_channels"
  | "read_users"
  | "mention_users"
  | "add_reactions"
  | "manage_reactions"
  | "upload_files"
  | "use_webhooks"
  | "admin";

// ============================================================================
// MESSAGE BLOCK TYPES
// ============================================================================

export type BlockType =
  | "text"
  | "image"
  | "button"
  | "divider"
  | "actions"
  | "context";

export interface TextBlock {
  type: "text";
  text: string;
  markdown?: boolean;
}

export interface ImageBlock {
  type: "image";
  url: string;
  alt?: string;
  title?: string;
}

export interface ButtonBlock {
  type: "button";
  text: string;
  actionId: string;
  style?: "primary" | "danger" | "default";
  url?: string;
  value?: string;
  disabled?: boolean;
}

export interface DividerBlock {
  type: "divider";
}

export interface ActionsBlock {
  type: "actions";
  elements: ButtonBlock[];
  blockId?: string;
}

export interface ContextBlock {
  type: "context";
  elements: (TextBlock | ImageBlock)[];
}

export type Block =
  | TextBlock
  | ImageBlock
  | ButtonBlock
  | DividerBlock
  | ActionsBlock
  | ContextBlock;

export interface RichMessage {
  text?: string;
  blocks?: Block[];
  threadTs?: string;
  replyBroadcast?: boolean;
  unfurlLinks?: boolean;
  unfurlMedia?: boolean;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// SLASH COMMAND TYPES
// ============================================================================

export type ParameterType =
  | "string"
  | "number"
  | "user"
  | "channel"
  | "boolean";

export interface CommandParameter {
  name: string;
  type: ParameterType;
  required: boolean;
  description: string;
  default?: unknown;
  choices?: { label: string; value: string }[];
}

export interface CommandContext {
  commandName: string;
  args: Record<string, unknown>;
  rawInput: string;
  userId: UserId;
  channelId: ChannelId;
  messageId?: MessageId;
  threadTs?: string;
  botId: BotId;
  respond: (message: RichMessage | string) => Promise<void>;
  ack: () => Promise<void>;
}

export interface SlashCommand {
  name: string;
  description: string;
  usage: string;
  parameters: CommandParameter[];
  handler: (ctx: CommandContext) => Promise<void>;
  aliases?: string[];
  cooldown?: number;
  permissions?: BotPermission[];
  hidden?: boolean;
}

export interface ParsedCommand {
  name: string;
  args: Record<string, unknown>;
  rawArgs: string;
  isValid: boolean;
  errors: string[];
}

// ============================================================================
// INTERACTION TYPES
// ============================================================================

export type InteractionType =
  | "button_click"
  | "form_submit"
  | "select_change"
  | "message_action";

export interface BaseInteraction {
  id: string;
  type: InteractionType;
  userId: UserId;
  channelId: ChannelId;
  messageId?: MessageId;
  timestamp: Date;
  botId: BotId;
}

export interface ButtonClickInteraction extends BaseInteraction {
  type: "button_click";
  actionId: string;
  value?: string;
  blockId?: string;
}

export interface FormField {
  name: string;
  value: string | string[] | boolean | number;
  type: "text" | "select" | "checkbox" | "radio" | "textarea";
}

export interface FormSubmitInteraction extends BaseInteraction {
  type: "form_submit";
  formId: string;
  fields: FormField[];
}

export interface SelectChangeInteraction extends BaseInteraction {
  type: "select_change";
  actionId: string;
  selectedOptions: { label: string; value: string }[];
  blockId?: string;
}

export interface MessageActionInteraction extends BaseInteraction {
  type: "message_action";
  actionId: string;
  messageText?: string;
  messageTs?: string;
}

export type Interaction =
  | ButtonClickInteraction
  | FormSubmitInteraction
  | SelectChangeInteraction
  | MessageActionInteraction;

export interface InteractionResponse {
  type: "update" | "replace" | "ephemeral" | "modal";
  message?: RichMessage;
  deleteOriginal?: boolean;
}

export type InteractionHandler<T extends Interaction = Interaction> = (
  interaction: T,
) => Promise<InteractionResponse | void>;

// ============================================================================
// WEBHOOK TYPES
// ============================================================================

export type WebhookEventType =
  | "message.created"
  | "message.updated"
  | "message.deleted"
  | "reaction.added"
  | "reaction.removed"
  | "member.joined"
  | "member.left"
  | "channel.created"
  | "channel.updated"
  | "channel.deleted";

export interface WebhookPayload<T = unknown> {
  id: string;
  type: WebhookEventType;
  timestamp: string;
  botId: BotId;
  data: T;
  signature?: string;
}

export interface WebhookConfig {
  url: string;
  secret: string;
  events: WebhookEventType[];
  enabled: boolean;
  retryCount?: number;
  retryDelay?: number;
}

export interface WebhookHandler<T = unknown> {
  eventType: WebhookEventType;
  handler: (payload: WebhookPayload<T>) => Promise<void>;
}

// ============================================================================
// EVENT TYPES
// ============================================================================

export type BotEventType =
  | "connected"
  | "disconnected"
  | "error"
  | "message"
  | "reaction"
  | "command"
  | "interaction"
  | "rate_limited";

export interface BotEvent<T = unknown> {
  type: BotEventType;
  timestamp: Date;
  data?: T;
}

export type EventListener<T = unknown> = (event: BotEvent<T>) => void;

// ============================================================================
// RATE LIMITING TYPES
// ============================================================================

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  retryAfterMs?: number;
}

export interface RateLimitState {
  remaining: number;
  resetAt: Date;
  isLimited: boolean;
}

// ============================================================================
// BOT CLIENT TYPES
// ============================================================================

export interface BotClientConfig {
  botId: BotId;
  secret: string;
  baseUrl?: string;
  timeout?: number;
  retryCount?: number;
  rateLimits?: {
    messages?: RateLimitConfig;
    reactions?: RateLimitConfig;
    api?: RateLimitConfig;
  };
}

export interface BotInfo {
  id: BotId;
  name: string;
  description?: string;
  avatar?: string;
  status: BotStatus;
  permissions: BotPermission[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SendMessageOptions {
  channelId: ChannelId;
  message: RichMessage | string;
  threadTs?: string;
  replyBroadcast?: boolean;
}

export interface SendMessageResult {
  messageId: MessageId;
  channelId: ChannelId;
  timestamp: string;
}

// ============================================================================
// BOT STORE TYPES
// ============================================================================

export interface InstalledBot {
  id: BotId;
  name: string;
  description?: string;
  avatar?: string;
  version: string;
  status: BotStatus;
  permissions: BotPermission[];
  installedAt: Date;
  installedBy: UserId;
  config?: Record<string, unknown>;
  channels?: ChannelId[];
}

export interface MarketplaceBot {
  id: BotId;
  name: string;
  description: string;
  longDescription?: string;
  avatar?: string;
  version: string;
  author: string;
  authorUrl?: string;
  category: string;
  tags: string[];
  rating: number;
  ratingCount: number;
  installCount: number;
  permissions: BotPermission[];
  features: string[];
  screenshots?: string[];
  createdAt: Date;
  updatedAt: Date;
  verified?: boolean;
  featured?: boolean;
}

export interface BotStoreState {
  installedBots: InstalledBot[];
  marketplaceBots: MarketplaceBot[];
  isLoading: boolean;
  error: string | null;
  selectedBotId: BotId | null;
  searchQuery: string;
  categoryFilter: string | null;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export type Result<T, E = ApiError> =
  | { success: true; data: T }
  | { success: false; error: E };
