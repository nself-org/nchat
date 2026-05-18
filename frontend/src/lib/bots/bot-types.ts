/**
 * Bot SDK Type Definitions
 * Core types for building bots in nchat
 */

// ============================================================================
// CORE BOT TYPES
// ============================================================================

export type BotId = string;
export type UserId = string;
export type ChannelId = string;
export type MessageId = string;

/**
 * Bot status states
 */
export type BotStatus = "active" | "inactive" | "error" | "initializing";

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

/**
 * Bot manifest - defines bot metadata and capabilities
 */
export interface BotManifest {
  id: BotId;
  name: string;
  description: string;
  version: string;
  author?: string;
  icon?: string;
  homepage?: string;
  repository?: string;
  permissions: BotPermission[];
  commands?: BotCommandDefinition[];
  triggers?: BotTriggerDefinition[];
  settings?: BotSettingDefinition[];
}

/**
 * Bot instance configuration
 */
export interface BotConfig {
  id: BotId;
  enabled: boolean;
  channels?: ChannelId[]; // Channels where bot is active (empty = all)
  settings?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Bot runtime state
 */
export interface BotState {
  status: BotStatus;
  lastActivity?: Date;
  errorMessage?: string;
  stats: {
    messagesProcessed: number;
    commandsExecuted: number;
    errorsCount: number;
  };
}

// ============================================================================
// COMMAND TYPES
// ============================================================================

/**
 * Command argument types
 */
export type CommandArgType =
  | "string"
  | "number"
  | "boolean"
  | "user"
  | "channel"
  | "duration"
  | "choice";

/**
 * Command argument definition
 */
export interface CommandArgument {
  name: string;
  description: string;
  type: CommandArgType;
  required?: boolean;
  default?: unknown;
  choices?: { label: string; value: string }[];
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
}

/**
 * Bot command definition
 */
export interface BotCommandDefinition {
  name: string;
  description: string;
  aliases?: string[];
  arguments?: CommandArgument[];
  examples?: string[];
  cooldown?: number; // Seconds between uses
  permissions?: BotPermission[];
  hidden?: boolean; // Hide from help
}

/**
 * Parsed command from message
 */
export interface ParsedCommand {
  name: string;
  args: Record<string, unknown>;
  rawArgs: string;
  prefix: string;
}

// ============================================================================
// TRIGGER TYPES
// ============================================================================

/**
 * Trigger event types
 */
export type TriggerEvent =
  | "message_created"
  | "message_edited"
  | "message_deleted"
  | "reaction_added"
  | "reaction_removed"
  | "user_joined"
  | "user_left"
  | "channel_created"
  | "channel_updated"
  | "mention"
  | "keyword"
  | "scheduled"
  | "webhook";

/**
 * Bot trigger definition
 */
export interface BotTriggerDefinition {
  id: string;
  name: string;
  event: TriggerEvent;
  description?: string;
  config?: {
    keywords?: string[];
    patterns?: string[];
    channels?: ChannelId[];
    users?: UserId[];
    schedule?: string; // Cron expression
    webhookPath?: string;
  };
}

// ============================================================================
// EVENT TYPES
// ============================================================================

/**
 * Base bot event
 */
export interface BotEvent {
  id: string;
  type: TriggerEvent;
  timestamp: Date;
  channelId?: ChannelId;
  userId?: UserId;
}

/**
 * Message event data
 */
export interface MessageEventData {
  messageId: MessageId;
  channelId: ChannelId;
  userId: UserId;
  content: string;
  type: "text" | "image" | "file" | "video" | "audio" | "system";
  threadId?: MessageId;
  mentions?: UserId[];
  attachments?: AttachmentData[];
  metadata?: Record<string, unknown>;
}

/**
 * User event data
 */
export interface UserEventData {
  userId: UserId;
  channelId: ChannelId;
  displayName: string;
  avatarUrl?: string;
  role?: string;
}

/**
 * Reaction event data
 */
export interface ReactionEventData {
  messageId: MessageId;
  channelId: ChannelId;
  userId: UserId;
  emoji: string;
  action: "add" | "remove";
}

/**
 * Channel event data
 */
export interface ChannelEventData {
  channelId: ChannelId;
  name: string;
  type: "public" | "private" | "direct";
  description?: string;
  createdBy?: UserId;
}

/**
 * Attachment data
 */
export interface AttachmentData {
  id: string;
  filename: string;
  url: string;
  mimeType: string;
  size: number;
}

// ============================================================================
// CONTEXT TYPES
// ============================================================================

/**
 * Message context for handlers
 */
export interface MessageContext {
  message: MessageEventData;
  channel: {
    id: ChannelId;
    name: string;
    type: "public" | "private" | "direct";
  };
  user: {
    id: UserId;
    displayName: string;
    avatarUrl?: string;
    role?: string;
  };
  isCommand: boolean;
  command?: ParsedCommand;
  isMention: boolean;
  isThread: boolean;
  isDirect: boolean;
}

/**
 * Command context extends message context
 */
export interface CommandContext extends MessageContext {
  command: ParsedCommand;
  args: Record<string, unknown>;
}

/**
 * User join/leave context
 */
export interface UserContext {
  user: UserEventData;
  channel: {
    id: ChannelId;
    name: string;
    type: "public" | "private" | "direct";
  };
  memberCount?: number;
}

/**
 * Reaction context
 */
export interface ReactionContext {
  reaction: ReactionEventData;
  message: MessageEventData;
  user: {
    id: UserId;
    displayName: string;
  };
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

/**
 * Response message options
 */
export interface ResponseOptions {
  ephemeral?: boolean; // Only visible to command user
  reply?: boolean; // Reply to the triggering message
  thread?: boolean; // Reply in thread
  mentionUser?: boolean; // Mention the user
  silent?: boolean; // No notification
}

/**
 * Message button
 */
export interface MessageButton {
  id: string;
  label: string;
  style?: "primary" | "secondary" | "success" | "danger";
  emoji?: string;
  url?: string;
  disabled?: boolean;
}

/**
 * Message action row
 */
export interface MessageActionRow {
  type: "buttons" | "select";
  components: MessageButton[] | MessageSelect;
}

/**
 * Message select menu
 */
export interface MessageSelect {
  id: string;
  placeholder?: string;
  options: {
    label: string;
    value: string;
    description?: string;
    emoji?: string;
  }[];
  minValues?: number;
  maxValues?: number;
}

/**
 * Rich message embed
 */
export interface MessageEmbed {
  title?: string;
  description?: string;
  url?: string;
  color?: string;
  timestamp?: Date;
  footer?: {
    text: string;
    iconUrl?: string;
  };
  author?: {
    name: string;
    url?: string;
    iconUrl?: string;
  };
  thumbnail?: {
    url: string;
  };
  image?: {
    url: string;
  };
  fields?: {
    name: string;
    value: string;
    inline?: boolean;
  }[];
}

/**
 * Complete response payload
 */
export interface BotResponse {
  type?: "message" | "error" | "help" | "embed";
  content?: string;
  embeds?: MessageEmbed[];
  actions?: MessageActionRow[];
  attachments?: AttachmentData[];
  options?: ResponseOptions;
}

// ============================================================================
// SETTINGS TYPES
// ============================================================================

/**
 * Bot setting types
 */
export type SettingType =
  | "string"
  | "number"
  | "boolean"
  | "select"
  | "multiselect"
  | "channel"
  | "role";

/**
 * Bot setting definition
 */
export interface BotSettingDefinition {
  key: string;
  label: string;
  description?: string;
  type: SettingType;
  default?: unknown;
  required?: boolean;
  options?: { label: string; value: string }[];
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
}

// ============================================================================
// HANDLER TYPES
// ============================================================================

/**
 * Handler result type
 */
export type HandlerResult = BotResponse | void | Promise<BotResponse | void>;

/**
 * Command handler function
 */
export type CommandHandler = (
  ctx: CommandContext,
  api: BotApi,
) => HandlerResult;

/**
 * Message handler function
 */
export type MessageHandler = (
  ctx: MessageContext,
  api: BotApi,
) => HandlerResult;

/**
 * User event handler function
 */
export type UserEventHandler = (ctx: UserContext, api: BotApi) => HandlerResult;

/**
 * Reaction handler function
 */
export type ReactionHandler = (
  ctx: ReactionContext,
  api: BotApi,
) => HandlerResult;

/**
 * Generic event handler
 */
export type EventHandler<T = unknown> = (
  event: T,
  api: BotApi,
) => HandlerResult;

// ============================================================================
// API TYPES
// ============================================================================

/**
 * Bot API interface - passed to handlers
 */
export interface BotApi {
  // Message operations
  sendMessage(channelId: ChannelId, response: BotResponse): Promise<MessageId>;
  replyToMessage(
    messageId: MessageId,
    response: BotResponse,
  ): Promise<MessageId>;
  editMessage(messageId: MessageId, response: BotResponse): Promise<void>;
  deleteMessage(messageId: MessageId): Promise<void>;

  // Reaction operations
  addReaction(messageId: MessageId, emoji: string): Promise<void>;
  removeReaction(messageId: MessageId, emoji: string): Promise<void>;

  // Channel operations
  getChannel(channelId: ChannelId): Promise<ChannelEventData | null>;
  getChannelMembers(channelId: ChannelId): Promise<UserEventData[]>;

  // User operations
  getUser(userId: UserId): Promise<UserEventData | null>;
  mentionUser(userId: UserId): string;

  // Storage operations
  getStorage<T = unknown>(key: string): Promise<T | null>;
  setStorage<T = unknown>(key: string, value: T): Promise<void>;
  deleteStorage(key: string): Promise<void>;

  // Scheduling
  scheduleMessage(
    channelId: ChannelId,
    response: BotResponse,
    delay: number,
  ): Promise<string>;
  cancelScheduledMessage(scheduleId: string): Promise<void>;

  // Bot info
  getBotInfo(): BotManifest;
  getBotConfig(): BotConfig;
}

// ============================================================================
// BUILDER TYPES
// ============================================================================

/**
 * Bot builder definition (for UI builder)
 */
export interface BotBuilderDefinition {
  id: string;
  name: string;
  description: string;
  icon?: string;
  triggers: BotBuilderTrigger[];
  actions: BotBuilderAction[];
  conditions?: BotBuilderCondition[];
}

/**
 * Builder trigger
 */
export interface BotBuilderTrigger {
  id: string;
  type: TriggerEvent;
  config: Record<string, unknown>;
}

/**
 * Builder action types
 */
export type BuilderActionType =
  | "send_message"
  | "reply_message"
  | "add_reaction"
  | "create_poll"
  | "set_reminder"
  | "store_data"
  | "call_webhook"
  | "run_javascript";

/**
 * Builder action
 */
export interface BotBuilderAction {
  id: string;
  type: BuilderActionType;
  config: Record<string, unknown>;
  order: number;
}

/**
 * Builder condition
 */
export interface BotBuilderCondition {
  id: string;
  field: string;
  operator:
    | "equals"
    | "contains"
    | "startsWith"
    | "endsWith"
    | "matches"
    | "greater"
    | "less";
  value: unknown;
  then: string[]; // Action IDs to execute
  else?: string[]; // Action IDs if condition fails
}

// ============================================================================
// BOT INTERFACE
// ============================================================================

/**
 * Context passed to bot handlers - union of all context types
 */
export type BotContext =
  | MessageContext
  | CommandContext
  | UserContext
  | ReactionContext;

/**
 * Bot interface - implement this to create a bot
 * Note: Method signatures are flexible to support various implementation patterns
 */
export interface Bot {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly avatar?: string;
  readonly version: string;

  /**
   * Initialize the bot
   */
  init?(config: BotConfig): Promise<void> | void;

  /**
   * Handle incoming messages
   */
  onMessage?(...args: unknown[]): unknown;

  /**
   * Handle commands
   */
  onCommand?(...args: unknown[]): unknown;

  /**
   * Handle user events
   */
  onUserJoin?(...args: unknown[]): unknown;
  onUserLeave?(...args: unknown[]): unknown;

  /**
   * Handle reactions
   */
  onReaction?(...args: unknown[]): unknown;

  /**
   * Cleanup when bot is disabled
   */
  destroy?(): Promise<void> | void;
}
