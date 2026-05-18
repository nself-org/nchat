/**
 * Bot Types for nself-chat
 *
 * Type definitions for bots, bot permissions, commands, and bot interactions.
 * Supports custom bots, slash commands, and bot messaging.
 */

import type { UserBasicInfo, UserPermissions } from "./user";

// ============================================================================
// Bot Type Definitions
// ============================================================================

/**
 * Bot status values.
 */
export type BotStatus = "online" | "offline" | "maintenance" | "disabled";

/**
 * Bot visibility options.
 */
export type BotVisibility = "public" | "private" | "unlisted";

/**
 * Bot category types.
 */
export type BotCategory =
  | "productivity"
  | "moderation"
  | "fun"
  | "utility"
  | "integration"
  | "analytics"
  | "social"
  | "developer"
  | "other";

// ============================================================================
// Bot Permissions Types
// ============================================================================

/**
 * Bot permission scopes.
 */
export type BotPermissionScope =
  // Message permissions
  | "messages.read"
  | "messages.write"
  | "messages.delete"
  | "messages.history"
  // Channel permissions
  | "channels.read"
  | "channels.write"
  | "channels.manage"
  | "channels.join"
  // User permissions
  | "users.read"
  | "users.profile"
  // Reaction permissions
  | "reactions.read"
  | "reactions.write"
  // File permissions
  | "files.read"
  | "files.write"
  // Webhook permissions
  | "webhooks.read"
  | "webhooks.write"
  // Admin permissions
  | "admin.read"
  | "admin.write";

/**
 * Bot permissions configuration.
 */
export interface BotPermissions {
  /** Granted permission scopes */
  scopes: BotPermissionScope[];
  /** Channel-specific permissions */
  channelPermissions?: BotChannelPermission[];
  /** Rate limit overrides */
  rateLimit?: {
    messagesPerMinute: number;
    actionsPerMinute: number;
  };
  /** IP whitelist for API access */
  ipWhitelist?: string[];
}

/**
 * Channel-specific bot permission.
 */
export interface BotChannelPermission {
  /** Channel ID */
  channelId: string;
  /** Allowed scopes in this channel */
  allowedScopes: BotPermissionScope[];
  /** Denied scopes in this channel */
  deniedScopes: BotPermissionScope[];
}

/**
 * Permission scope descriptions.
 */
export const BotPermissionScopeDescriptions: Record<
  BotPermissionScope,
  string
> = {
  "messages.read": "Read messages in channels the bot has access to",
  "messages.write": "Send messages in channels the bot has access to",
  "messages.delete": "Delete bot's own messages",
  "messages.history": "Access message history",
  "channels.read": "View channel information",
  "channels.write": "Create and update channels",
  "channels.manage": "Manage channel settings and members",
  "channels.join": "Join channels when invited",
  "users.read": "View user information",
  "users.profile": "Access user profiles",
  "reactions.read": "View reactions on messages",
  "reactions.write": "Add and remove reactions",
  "files.read": "View file attachments",
  "files.write": "Upload files",
  "webhooks.read": "View webhook configurations",
  "webhooks.write": "Create and manage webhooks",
  "admin.read": "View administrative information",
  "admin.write": "Perform administrative actions",
};

// ============================================================================
// Bot Command Types
// ============================================================================

/**
 * Bot command option types.
 */
export type BotCommandOptionType =
  | "string"
  | "integer"
  | "boolean"
  | "user"
  | "channel"
  | "role"
  | "attachment"
  | "number";

/**
 * Bot command option.
 */
export interface BotCommandOption {
  /** Option name */
  name: string;
  /** Option description */
  description: string;
  /** Option type */
  type: BotCommandOptionType;
  /** Whether option is required */
  required: boolean;
  /** Choices for enum-like options */
  choices?: BotCommandChoice[];
  /** Min value (for number/integer) */
  minValue?: number;
  /** Max value (for number/integer) */
  maxValue?: number;
  /** Min length (for string) */
  minLength?: number;
  /** Max length (for string) */
  maxLength?: number;
  /** Autocomplete enabled */
  autocomplete?: boolean;
}

/**
 * Bot command choice.
 */
export interface BotCommandChoice {
  /** Display name */
  name: string;
  /** Value */
  value: string | number;
}

/**
 * Bot command definition.
 */
export interface BotCommand {
  /** Command name (without /) */
  name: string;
  /** Command description */
  description: string;
  /** Command options/arguments */
  options?: BotCommandOption[];
  /** Required permissions to use */
  requiredPermissions?: BotPermissionScope[];
  /** Whether command is enabled */
  isEnabled: boolean;
  /** Cooldown in seconds */
  cooldown?: number;
  /** Whether command can be used in DMs */
  allowInDM: boolean;
  /** Whether command is NSFW-only */
  isNsfw: boolean;
  /** Guild/channel restrictions */
  restrictions?: {
    channelIds?: string[];
    excludeChannelIds?: string[];
  };
  /** Usage examples */
  examples?: string[];
  /** Command category for grouping */
  category?: string;
}

/**
 * Bot command invocation.
 */
export interface BotCommandInvocation {
  /** Invocation ID */
  id: string;
  /** Command name */
  command: string;
  /** Parsed options */
  options: Record<string, unknown>;
  /** User who invoked */
  user: UserBasicInfo;
  /** Channel where invoked */
  channelId: string;
  /** Message ID (if from message) */
  messageId?: string;
  /** When invoked */
  invokedAt: Date;
}

// ============================================================================
// Main Bot Interface
// ============================================================================

/**
 * Core Bot interface.
 */
export interface Bot {
  /** Unique bot ID */
  id: string;
  /** Bot username */
  username: string;
  /** Bot display name */
  displayName: string;
  /** Bot description */
  description?: string;
  /** Detailed about text (markdown) */
  about?: string;
  /** Bot avatar URL */
  avatarUrl?: string;
  /** Bot banner URL */
  bannerUrl?: string;
  /** Bot category */
  category: BotCategory;
  /** Bot visibility */
  visibility: BotVisibility;
  /** Current status */
  status: BotStatus;
  /** Status message */
  statusMessage?: string;
  /** Bot permissions */
  permissions: BotPermissions;
  /** Bot commands */
  commands: BotCommand[];
  /** Bot owner user ID */
  ownerId: string;
  /** Bot owner info */
  owner?: UserBasicInfo;
  /** Team members (if team-owned) */
  teamIds?: string[];
  /** API token (hashed) */
  tokenHash?: string;
  /** Webhook URL for receiving events */
  webhookUrl?: string;
  /** Website URL */
  websiteUrl?: string;
  /** Support URL/email */
  supportUrl?: string;
  /** Privacy policy URL */
  privacyPolicyUrl?: string;
  /** Terms of service URL */
  termsOfServiceUrl?: string;
  /** Is verified/official bot */
  isVerified: boolean;
  /** Is featured bot */
  isFeatured: boolean;
  /** Install count */
  installCount: number;
  /** Server/channel count */
  serverCount?: number;
  /** When bot was created */
  createdAt: Date;
  /** When bot was last updated */
  updatedAt: Date;
  /** When bot was last active */
  lastActiveAt?: Date;
  /** Bot flags */
  flags?: BotFlags;
}

/**
 * Bot flags for special behaviors.
 */
export interface BotFlags {
  /** Bot requires privileged intents */
  requiresPrivilegedIntents: boolean;
  /** Bot supports interactions */
  supportsInteractions: boolean;
  /** Bot supports message content */
  supportsMessageContent: boolean;
  /** Bot is managed by platform */
  isPlatformManaged: boolean;
}

/**
 * Bot with installation status.
 */
export interface BotWithInstallStatus extends Bot {
  /** Whether bot is installed */
  isInstalled: boolean;
  /** Installation date */
  installedAt?: Date;
  /** Who installed the bot */
  installedBy?: UserBasicInfo;
  /** Channels bot is active in */
  activeChannels?: string[];
}

// ============================================================================
// Bot Installation Types
// ============================================================================

/**
 * Bot installation record.
 */
export interface BotInstallation {
  /** Installation ID */
  id: string;
  /** Bot ID */
  botId: string;
  /** Who installed the bot */
  installedBy: string;
  /** Installer info */
  installer?: UserBasicInfo;
  /** When installed */
  installedAt: Date;
  /** Granted permissions */
  grantedPermissions: BotPermissionScope[];
  /** Active channel IDs */
  channelIds: string[];
  /** Installation status */
  status: "active" | "suspended" | "uninstalled";
  /** Configuration */
  config?: Record<string, unknown>;
}

/**
 * Input for installing a bot.
 */
export interface InstallBotInput {
  /** Bot ID */
  botId: string;
  /** Permissions to grant */
  permissions: BotPermissionScope[];
  /** Channels to add bot to */
  channelIds?: string[];
}

// ============================================================================
// Bot Interaction Types
// ============================================================================

/**
 * Bot interaction types.
 */
export type BotInteractionType =
  | "command"
  | "button"
  | "select_menu"
  | "modal_submit"
  | "autocomplete";

/**
 * Bot interaction.
 */
export interface BotInteraction {
  /** Interaction ID */
  id: string;
  /** Interaction type */
  type: BotInteractionType;
  /** Bot ID */
  botId: string;
  /** User who triggered */
  user: UserBasicInfo;
  /** Channel ID */
  channelId: string;
  /** Message ID (if from message component) */
  messageId?: string;
  /** Custom ID (for components) */
  customId?: string;
  /** Interaction data */
  data: BotInteractionData;
  /** When interaction occurred */
  timestamp: Date;
}

/**
 * Bot interaction data.
 */
export type BotInteractionData =
  | { type: "command"; name: string; options: Record<string, unknown> }
  | { type: "button"; customId: string }
  | { type: "select_menu"; customId: string; values: string[] }
  | { type: "modal_submit"; customId: string; fields: Record<string, string> }
  | { type: "autocomplete"; name: string; focused: string; value: string };

/**
 * Bot interaction response.
 */
export interface BotInteractionResponse {
  /** Response type */
  type: "message" | "update" | "modal" | "autocomplete";
  /** Message content (for message/update) */
  content?: string;
  /** Components (for message/update) */
  components?: BotMessageComponent[];
  /** Embeds (for message/update) */
  embeds?: BotMessageEmbed[];
  /** Modal (for modal response) */
  modal?: BotModal;
  /** Autocomplete choices */
  choices?: BotCommandChoice[];
  /** Is ephemeral (only visible to user) */
  ephemeral?: boolean;
}

// ============================================================================
// Bot Message Component Types
// ============================================================================

/**
 * Bot message component types.
 */
export type BotMessageComponentType = "button" | "select_menu" | "text_input";

/**
 * Button styles.
 */
export type BotButtonStyle =
  | "primary"
  | "secondary"
  | "success"
  | "danger"
  | "link";

/**
 * Bot button component.
 */
export interface BotButton {
  type: "button";
  style: BotButtonStyle;
  label: string;
  customId?: string;
  url?: string; // For link buttons
  emoji?: string;
  disabled?: boolean;
}

/**
 * Bot select menu component.
 */
export interface BotSelectMenu {
  type: "select_menu";
  customId: string;
  placeholder?: string;
  minValues?: number;
  maxValues?: number;
  options: BotSelectOption[];
  disabled?: boolean;
}

/**
 * Bot select menu option.
 */
export interface BotSelectOption {
  label: string;
  value: string;
  description?: string;
  emoji?: string;
  default?: boolean;
}

/**
 * Bot text input component (for modals).
 */
export interface BotTextInput {
  type: "text_input";
  customId: string;
  label: string;
  style: "short" | "paragraph";
  placeholder?: string;
  value?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
}

/**
 * Bot action row (container for components).
 */
export interface BotActionRow {
  type: "action_row";
  components: (BotButton | BotSelectMenu | BotTextInput)[];
}

/**
 * Bot message component.
 */
export type BotMessageComponent = BotActionRow;

/**
 * Bot modal dialog.
 */
export interface BotModal {
  customId: string;
  title: string;
  components: BotActionRow[];
}

/**
 * Bot message embed.
 */
export interface BotMessageEmbed {
  title?: string;
  description?: string;
  url?: string;
  color?: string;
  timestamp?: Date;
  footer?: { text: string; iconUrl?: string };
  image?: { url: string };
  thumbnail?: { url: string };
  author?: { name: string; url?: string; iconUrl?: string };
  fields?: { name: string; value: string; inline?: boolean }[];
}

// ============================================================================
// Input Types
// ============================================================================

/**
 * Input for creating a bot.
 */
export interface CreateBotInput {
  username: string;
  displayName: string;
  description?: string;
  avatarUrl?: string;
  category: BotCategory;
  visibility?: BotVisibility;
  permissions?: Partial<BotPermissions>;
  commands?: Omit<BotCommand, "isEnabled">[];
  webhookUrl?: string;
  websiteUrl?: string;
  supportUrl?: string;
  privacyPolicyUrl?: string;
  termsOfServiceUrl?: string;
}

/**
 * Input for updating a bot.
 */
export interface UpdateBotInput {
  displayName?: string;
  description?: string;
  about?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  category?: BotCategory;
  visibility?: BotVisibility;
  status?: BotStatus;
  statusMessage?: string;
  webhookUrl?: string;
  websiteUrl?: string;
  supportUrl?: string;
  privacyPolicyUrl?: string;
  termsOfServiceUrl?: string;
}

/**
 * Input for updating bot commands.
 */
export interface UpdateBotCommandsInput {
  commands: BotCommand[];
}

// ============================================================================
// Bot Token Types
// ============================================================================

/**
 * Bot API token.
 */
export interface BotToken {
  /** Token ID */
  id: string;
  /** Bot ID */
  botId: string;
  /** Token name/label */
  name: string;
  /** Token prefix (for identification) */
  prefix: string;
  /** Scopes this token can access */
  scopes: BotPermissionScope[];
  /** When token was created */
  createdAt: Date;
  /** When token was last used */
  lastUsedAt?: Date;
  /** When token expires */
  expiresAt?: Date;
}

/**
 * New bot token response (only shown once).
 */
export interface NewBotToken extends BotToken {
  /** Full token value (only shown once) */
  token: string;
}

// ============================================================================
// Bot Analytics Types
// ============================================================================

/**
 * Bot usage analytics.
 */
export interface BotAnalytics {
  /** Bot ID */
  botId: string;
  /** Time period */
  period: "day" | "week" | "month";
  /** Command usage */
  commandUsage: { command: string; count: number }[];
  /** Total interactions */
  totalInteractions: number;
  /** Unique users */
  uniqueUsers: number;
  /** Active channels */
  activeChannels: number;
  /** Error rate */
  errorRate: number;
  /** Average response time (ms) */
  avgResponseTime: number;
  /** Usage over time */
  usageOverTime: { date: string; count: number }[];
}

// ============================================================================
// Bot Events
// ============================================================================

/**
 * Bot status change event.
 */
export interface BotStatusChangeEvent {
  botId: string;
  previousStatus: BotStatus;
  newStatus: BotStatus;
  timestamp: Date;
}

/**
 * Bot installed event.
 */
export interface BotInstalledEvent {
  botId: string;
  installation: BotInstallation;
  timestamp: Date;
}

/**
 * Bot uninstalled event.
 */
export interface BotUninstalledEvent {
  botId: string;
  installationId: string;
  uninstalledBy: UserBasicInfo;
  timestamp: Date;
}
