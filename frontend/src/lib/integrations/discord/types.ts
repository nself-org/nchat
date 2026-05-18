/**
 * Discord Integration Types
 *
 * Platform-specific types for Discord integration.
 * Re-exports common types from parent and adds Discord-specific types.
 */

// Import types from parent for local use
import type { DiscordUser, DiscordChannel, DiscordMessage } from "../types";

// Re-export types from parent
export type {
  DiscordUser,
  DiscordGuild,
  DiscordChannel,
  DiscordMessage,
  DiscordImportOptions,
  DiscordSyncResult,
} from "../types";

// ============================================================================
// Discord-Specific Types
// ============================================================================

/**
 * Discord channel types
 */
export enum DiscordChannelType {
  GUILD_TEXT = 0,
  DM = 1,
  GUILD_VOICE = 2,
  GROUP_DM = 3,
  GUILD_CATEGORY = 4,
  GUILD_ANNOUNCEMENT = 5,
  ANNOUNCEMENT_THREAD = 10,
  PUBLIC_THREAD = 11,
  PRIVATE_THREAD = 12,
  GUILD_STAGE_VOICE = 13,
  GUILD_DIRECTORY = 14,
  GUILD_FORUM = 15,
}

/**
 * Discord gateway event types
 */
export type DiscordGatewayEventType =
  | "READY"
  | "RESUMED"
  | "APPLICATION_COMMAND_PERMISSIONS_UPDATE"
  | "AUTO_MODERATION_RULE_CREATE"
  | "AUTO_MODERATION_RULE_UPDATE"
  | "AUTO_MODERATION_RULE_DELETE"
  | "AUTO_MODERATION_ACTION_EXECUTION"
  | "CHANNEL_CREATE"
  | "CHANNEL_UPDATE"
  | "CHANNEL_DELETE"
  | "CHANNEL_PINS_UPDATE"
  | "THREAD_CREATE"
  | "THREAD_UPDATE"
  | "THREAD_DELETE"
  | "THREAD_LIST_SYNC"
  | "THREAD_MEMBER_UPDATE"
  | "THREAD_MEMBERS_UPDATE"
  | "GUILD_CREATE"
  | "GUILD_UPDATE"
  | "GUILD_DELETE"
  | "GUILD_BAN_ADD"
  | "GUILD_BAN_REMOVE"
  | "GUILD_EMOJIS_UPDATE"
  | "GUILD_STICKERS_UPDATE"
  | "GUILD_INTEGRATIONS_UPDATE"
  | "GUILD_MEMBER_ADD"
  | "GUILD_MEMBER_REMOVE"
  | "GUILD_MEMBER_UPDATE"
  | "GUILD_MEMBERS_CHUNK"
  | "GUILD_ROLE_CREATE"
  | "GUILD_ROLE_UPDATE"
  | "GUILD_ROLE_DELETE"
  | "GUILD_SCHEDULED_EVENT_CREATE"
  | "GUILD_SCHEDULED_EVENT_UPDATE"
  | "GUILD_SCHEDULED_EVENT_DELETE"
  | "GUILD_SCHEDULED_EVENT_USER_ADD"
  | "GUILD_SCHEDULED_EVENT_USER_REMOVE"
  | "INTEGRATION_CREATE"
  | "INTEGRATION_UPDATE"
  | "INTEGRATION_DELETE"
  | "INTERACTION_CREATE"
  | "INVITE_CREATE"
  | "INVITE_DELETE"
  | "MESSAGE_CREATE"
  | "MESSAGE_UPDATE"
  | "MESSAGE_DELETE"
  | "MESSAGE_DELETE_BULK"
  | "MESSAGE_REACTION_ADD"
  | "MESSAGE_REACTION_REMOVE"
  | "MESSAGE_REACTION_REMOVE_ALL"
  | "MESSAGE_REACTION_REMOVE_EMOJI"
  | "PRESENCE_UPDATE"
  | "STAGE_INSTANCE_CREATE"
  | "STAGE_INSTANCE_UPDATE"
  | "STAGE_INSTANCE_DELETE"
  | "TYPING_START"
  | "USER_UPDATE"
  | "VOICE_STATE_UPDATE"
  | "VOICE_SERVER_UPDATE"
  | "WEBHOOKS_UPDATE";

/**
 * Discord embed object
 */
export interface DiscordEmbed {
  title?: string;
  type?: "rich" | "image" | "video" | "gifv" | "article" | "link";
  description?: string;
  url?: string;
  timestamp?: string;
  color?: number;
  footer?: {
    text: string;
    icon_url?: string;
    proxy_icon_url?: string;
  };
  image?: {
    url: string;
    proxy_url?: string;
    height?: number;
    width?: number;
  };
  thumbnail?: {
    url: string;
    proxy_url?: string;
    height?: number;
    width?: number;
  };
  video?: {
    url?: string;
    proxy_url?: string;
    height?: number;
    width?: number;
  };
  provider?: {
    name?: string;
    url?: string;
  };
  author?: {
    name: string;
    url?: string;
    icon_url?: string;
    proxy_icon_url?: string;
  };
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
}

/**
 * Discord role
 */
export interface DiscordRole {
  id: string;
  name: string;
  color: number;
  hoist: boolean;
  icon?: string | null;
  unicode_emoji?: string | null;
  position: number;
  permissions: string;
  managed: boolean;
  mentionable: boolean;
  tags?: {
    bot_id?: string;
    integration_id?: string;
    premium_subscriber?: null;
  };
}

/**
 * Discord guild member
 */
export interface DiscordGuildMember {
  user?: DiscordUser;
  nick?: string | null;
  avatar?: string | null;
  roles: string[];
  joined_at: string;
  premium_since?: string | null;
  deaf: boolean;
  mute: boolean;
  pending?: boolean;
  permissions?: string;
  communication_disabled_until?: string | null;
}

/**
 * Discord webhook
 */
export interface DiscordWebhook {
  id: string;
  type: 1 | 2 | 3; // 1 = Incoming, 2 = Channel Follower, 3 = Application
  guild_id?: string;
  channel_id: string | null;
  user?: DiscordUser;
  name: string | null;
  avatar: string | null;
  token?: string;
  application_id: string | null;
  source_guild?: {
    id: string;
    name: string;
    icon: string | null;
  };
  source_channel?: {
    id: string;
    name: string;
  };
  url?: string;
}

/**
 * Discord interaction (slash commands, buttons, etc.)
 */
export interface DiscordInteraction {
  id: string;
  application_id: string;
  type: 1 | 2 | 3 | 4 | 5; // PING, APPLICATION_COMMAND, MESSAGE_COMPONENT, AUTOCOMPLETE, MODAL_SUBMIT
  data?: {
    id: string;
    name: string;
    type: number;
    resolved?: {
      users?: Record<string, DiscordUser>;
      members?: Record<string, DiscordGuildMember>;
      roles?: Record<string, DiscordRole>;
      channels?: Record<string, DiscordChannel>;
      messages?: Record<string, DiscordMessage>;
    };
    options?: Array<{
      name: string;
      type: number;
      value?: string | number | boolean;
      options?: Array<{
        name: string;
        type: number;
        value?: string | number | boolean;
      }>;
      focused?: boolean;
    }>;
    custom_id?: string;
    component_type?: number;
    values?: string[];
  };
  guild_id?: string;
  channel_id?: string;
  member?: DiscordGuildMember;
  user?: DiscordUser;
  token: string;
  version: number;
  message?: DiscordMessage;
  app_permissions?: string;
  locale?: string;
  guild_locale?: string;
}

/**
 * Discord component (buttons, select menus, etc.)
 */
export interface DiscordComponent {
  type: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8; // ACTION_ROW, BUTTON, STRING_SELECT, TEXT_INPUT, USER_SELECT, ROLE_SELECT, MENTIONABLE_SELECT, CHANNEL_SELECT
  custom_id?: string;
  disabled?: boolean;
  style?: 1 | 2 | 3 | 4 | 5; // PRIMARY, SECONDARY, SUCCESS, DANGER, LINK
  label?: string;
  emoji?: {
    id?: string | null;
    name?: string | null;
    animated?: boolean;
  };
  url?: string;
  options?: Array<{
    label: string;
    value: string;
    description?: string;
    emoji?: {
      id?: string | null;
      name?: string | null;
      animated?: boolean;
    };
    default?: boolean;
  }>;
  placeholder?: string;
  min_values?: number;
  max_values?: number;
  components?: DiscordComponent[];
  min_length?: number;
  max_length?: number;
  required?: boolean;
  value?: string;
}

/**
 * Discord activity
 */
export interface DiscordActivity {
  name: string;
  type: 0 | 1 | 2 | 3 | 4 | 5; // PLAYING, STREAMING, LISTENING, WATCHING, CUSTOM, COMPETING
  url?: string | null;
  created_at?: number;
  timestamps?: {
    start?: number;
    end?: number;
  };
  application_id?: string;
  details?: string | null;
  state?: string | null;
  emoji?: {
    name: string;
    id?: string;
    animated?: boolean;
  } | null;
  party?: {
    id?: string;
    size?: [number, number];
  };
  assets?: {
    large_image?: string;
    large_text?: string;
    small_image?: string;
    small_text?: string;
  };
  secrets?: {
    join?: string;
    spectate?: string;
    match?: string;
  };
  instance?: boolean;
  flags?: number;
  buttons?: Array<{
    label: string;
    url: string;
  }>;
}

/**
 * Discord presence
 */
export interface DiscordPresence {
  user: { id: string };
  guild_id: string;
  status: "idle" | "dnd" | "online" | "offline";
  activities: DiscordActivity[];
  client_status: {
    desktop?: string;
    mobile?: string;
    web?: string;
  };
}

/**
 * Discord notification settings for a guild/channel mapping
 */
export interface DiscordChannelNotificationSettings {
  discordGuildId: string;
  discordGuildName: string;
  discordChannelId: string;
  discordChannelName: string;
  localChannelId: string;
  localChannelName: string;
  syncDirection: "incoming" | "outgoing" | "bidirectional";
  enabled: boolean;
  webhookId?: string;
  webhookToken?: string;
  filters?: {
    excludeBots?: boolean;
    includeEmbeds?: boolean;
    includeAttachments?: boolean;
  };
}

/**
 * Discord integration config stored in database
 */
export interface DiscordIntegrationConfig {
  userId: string;
  username: string;
  discriminator: string;
  avatarUrl?: string;
  guilds?: Array<{
    id: string;
    name: string;
    icon?: string;
    permissions?: string;
  }>;
  botUserId?: string;
  channelMappings?: DiscordChannelNotificationSettings[];
}

/**
 * Discord link unfurl result
 */
export interface DiscordUnfurlResult {
  type: "message" | "channel" | "guild" | "user" | "invite" | "unknown";
  title: string;
  description?: string;
  avatarUrl?: string;
  url: string;
  metadata?: Record<string, unknown>;
}

/**
 * Import/export from discord-client
 */
export type { DiscordClientConfig } from "./discord-client";
