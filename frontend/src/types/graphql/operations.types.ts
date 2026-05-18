/**
 * GraphQL Operation Types for nself-chat
 *
 * Type definitions for GraphQL queries, mutations, and subscriptions.
 * These types represent the shape of GraphQL operation responses and variables.
 */

import type {
  UserBasicInfo,
  UserPresence,
  UserProfile,
  UserSettings,
} from "../user";
import type {
  Channel,
  ChannelMember,
  ChannelSettings,
  Thread,
} from "../channel";
import type { Message, Attachment, Reaction, ThreadInfo } from "../message";
import type { Notification, NotificationPreferences } from "../notification";

// ============================================================================
// Common GraphQL Types
// ============================================================================

/**
 * GraphQL UUID scalar type.
 */
export type GqlUUID = string;

/**
 * GraphQL DateTime scalar type (ISO 8601).
 */
export type GqlDateTime = string;

/**
 * GraphQL JSON scalar type.
 */
export type GqlJson = Record<string, unknown>;

/**
 * Hasura order by direction.
 */
export type OrderBy =
  | "asc"
  | "asc_nulls_first"
  | "asc_nulls_last"
  | "desc"
  | "desc_nulls_first"
  | "desc_nulls_last";

/**
 * Hasura comparison operators for filtering.
 */
export interface WhereComparison<T> {
  _eq?: T;
  _neq?: T;
  _gt?: T;
  _gte?: T;
  _lt?: T;
  _lte?: T;
  _in?: T[];
  _nin?: T[];
  _is_null?: boolean;
  _like?: string;
  _ilike?: string;
  _similar?: string;
}

/**
 * Hasura boolean expression.
 */
export interface BoolExp<T> {
  _and?: BoolExp<T>[];
  _or?: BoolExp<T>[];
  _not?: BoolExp<T>;
  [key: string]:
    | WhereComparison<unknown>
    | BoolExp<T>[]
    | BoolExp<T>
    | undefined;
}

// ============================================================================
// User Query Types
// ============================================================================

/**
 * Get user query variables.
 */
export interface GetUserVars {
  id: GqlUUID;
}

/**
 * Get user query result.
 */
export interface GetUserResult {
  nchat_users_by_pk: GqlUser | null;
}

/**
 * GraphQL User type.
 */
export interface GqlUser {
  id: GqlUUID;
  email: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  status: string;
  email_verified: boolean;
  locale: string;
  timezone: string;
  metadata: GqlJson;
  last_seen_at: GqlDateTime | null;
  created_at: GqlDateTime;
  updated_at: GqlDateTime;
  deleted_at: GqlDateTime | null;
  // Relations
  profile?: GqlProfile;
  presence?: GqlPresence;
  settings?: GqlUserSettings;
}

/**
 * GraphQL Profile type.
 */
export interface GqlProfile {
  id: GqlUUID;
  user_id: GqlUUID;
  bio: string | null;
  title: string | null;
  company: string | null;
  location: string | null;
  website: string | null;
  social_links: GqlJson;
  pronouns: string | null;
  banner_url: string | null;
  theme_preference: string;
  custom_status: string | null;
  custom_status_emoji: string | null;
  custom_status_expires_at: GqlDateTime | null;
  created_at: GqlDateTime;
  updated_at: GqlDateTime;
}

/**
 * GraphQL Presence type.
 */
export interface GqlPresence {
  id: GqlUUID;
  user_id: GqlUUID;
  status: string;
  custom_message: string | null;
  last_heartbeat_at: GqlDateTime;
  current_channel_id: GqlUUID | null;
  device_info: GqlJson;
  is_mobile: boolean;
  created_at: GqlDateTime;
  updated_at: GqlDateTime;
}

/**
 * GraphQL User Settings type.
 */
export interface GqlUserSettings {
  id: GqlUUID;
  user_id: GqlUUID;
  notifications_enabled: boolean;
  notification_sound: boolean;
  notification_desktop: boolean;
  notification_mobile: boolean;
  notification_email: boolean;
  show_online_status: boolean;
  show_typing_indicator: boolean;
  read_receipts: boolean;
  compact_mode: boolean;
  theme: string;
  font_size: string;
  created_at: GqlDateTime;
  updated_at: GqlDateTime;
}

/**
 * Users list query variables.
 */
export interface GetUsersVars {
  where?: BoolExp<GqlUser>;
  order_by?: Array<{ [key: string]: OrderBy }>;
  limit?: number;
  offset?: number;
}

/**
 * Users list query result.
 */
export interface GetUsersResult {
  nchat_users: GqlUser[];
  nchat_users_aggregate: {
    aggregate: {
      count: number;
    };
  };
}

// ============================================================================
// Channel Query Types
// ============================================================================

/**
 * Get channel query variables.
 */
export interface GetChannelVars {
  id: GqlUUID;
}

/**
 * Get channel query result.
 */
export interface GetChannelResult {
  nchat_channels_by_pk: GqlChannel | null;
}

/**
 * GraphQL Channel type.
 */
export interface GqlChannel {
  id: GqlUUID;
  workspace_id: GqlUUID | null;
  category_id: GqlUUID | null;
  name: string;
  slug: string;
  description: string | null;
  topic: string | null;
  type: string;
  icon: string | null;
  color: string | null;
  position: number | null;
  is_default: boolean;
  is_archived: boolean;
  is_readonly: boolean;
  is_nsfw: boolean;
  slowmode_seconds: number;
  max_members: number | null;
  member_count: number;
  message_count: number;
  last_message_at: GqlDateTime | null;
  last_message_id: GqlUUID | null;
  created_by: GqlUUID | null;
  created_at: GqlDateTime;
  updated_at: GqlDateTime;
  archived_at: GqlDateTime | null;
  // Relations
  members?: GqlChannelMember[];
  messages?: GqlMessage[];
  category?: GqlCategory;
  creator?: GqlUser;
}

/**
 * GraphQL Category type.
 */
export interface GqlCategory {
  id: GqlUUID;
  workspace_id: GqlUUID | null;
  name: string;
  description: string | null;
  position: number;
  is_collapsed: boolean;
  created_by: GqlUUID | null;
  created_at: GqlDateTime;
  updated_at: GqlDateTime;
  // Relations
  channels?: GqlChannel[];
}

/**
 * GraphQL Channel Member type.
 */
export interface GqlChannelMember {
  id: GqlUUID;
  channel_id: GqlUUID;
  user_id: GqlUUID;
  role: string;
  nickname: string | null;
  can_read: boolean | null;
  can_write: boolean | null;
  can_manage: boolean | null;
  is_muted: boolean;
  muted_until: GqlDateTime | null;
  is_pinned: boolean;
  notification_level: string;
  last_read_message_id: GqlUUID | null;
  last_read_at: GqlDateTime | null;
  unread_count: number;
  mention_count: number;
  joined_at: GqlDateTime;
  invited_by: GqlUUID | null;
  created_at: GqlDateTime;
  updated_at: GqlDateTime;
  // Relations
  user?: GqlUser;
  channel?: GqlChannel;
}

/**
 * Channels list query variables.
 */
export interface GetChannelsVars {
  where?: BoolExp<GqlChannel>;
  order_by?: Array<{ [key: string]: OrderBy }>;
  limit?: number;
  offset?: number;
}

/**
 * Channels list query result.
 */
export interface GetChannelsResult {
  nchat_channels: GqlChannel[];
  nchat_channels_aggregate: {
    aggregate: {
      count: number;
    };
  };
}

// ============================================================================
// Message Query Types
// ============================================================================

/**
 * Get message query variables.
 */
export interface GetMessageVars {
  id: GqlUUID;
}

/**
 * Get message query result.
 */
export interface GetMessageResult {
  nchat_messages_by_pk: GqlMessage | null;
}

/**
 * GraphQL Message type.
 */
export interface GqlMessage {
  id: GqlUUID;
  channel_id: GqlUUID;
  user_id: GqlUUID | null;
  thread_id: GqlUUID | null;
  parent_message_id: GqlUUID | null;
  content: string | null;
  content_html: string | null;
  content_plain: string | null;
  type: string;
  metadata: GqlJson;
  mentions: GqlUUID[];
  mentioned_roles: string[];
  mentioned_channels: GqlUUID[];
  embeds: GqlJson[];
  is_edited: boolean;
  is_pinned: boolean;
  is_deleted: boolean;
  is_system: boolean;
  reaction_count: number;
  reply_count: number;
  scheduled_at: GqlDateTime | null;
  published_at: GqlDateTime | null;
  edited_at: GqlDateTime | null;
  deleted_at: GqlDateTime | null;
  created_at: GqlDateTime;
  updated_at: GqlDateTime;
  // Relations
  user?: GqlUser;
  channel?: GqlChannel;
  thread?: GqlThread;
  parent_message?: GqlMessage;
  attachments?: GqlAttachment[];
  reactions?: GqlReaction[];
  replies?: GqlMessage[];
}

/**
 * GraphQL Thread type.
 */
export interface GqlThread {
  id: GqlUUID;
  channel_id: GqlUUID;
  root_message_id: GqlUUID;
  name: string | null;
  message_count: number;
  participant_count: number;
  is_locked: boolean;
  is_archived: boolean;
  auto_archive_duration: number;
  last_message_at: GqlDateTime | null;
  last_message_id: GqlUUID | null;
  archived_at: GqlDateTime | null;
  created_by: GqlUUID | null;
  created_at: GqlDateTime;
  updated_at: GqlDateTime;
  // Relations
  channel?: GqlChannel;
  root_message?: GqlMessage;
  messages?: GqlMessage[];
  members?: GqlThreadMember[];
}

/**
 * GraphQL Thread Member type.
 */
export interface GqlThreadMember {
  id: GqlUUID;
  thread_id: GqlUUID;
  user_id: GqlUUID;
  last_read_message_id: GqlUUID | null;
  last_read_at: GqlDateTime | null;
  unread_count: number;
  is_subscribed: boolean;
  joined_at: GqlDateTime;
  created_at: GqlDateTime;
  updated_at: GqlDateTime;
  // Relations
  user?: GqlUser;
  thread?: GqlThread;
}

/**
 * GraphQL Attachment type.
 */
export interface GqlAttachment {
  id: GqlUUID;
  message_id: GqlUUID | null;
  user_id: GqlUUID;
  filename: string;
  original_filename: string;
  file_path: string;
  url: string;
  type: string;
  mime_type: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  thumbnail_url: string | null;
  thumbnail_width: number | null;
  thumbnail_height: number | null;
  is_processed: boolean;
  processing_error: string | null;
  blurhash: string | null;
  metadata: GqlJson;
  created_at: GqlDateTime;
  updated_at: GqlDateTime;
}

/**
 * GraphQL Reaction type.
 */
export interface GqlReaction {
  id: GqlUUID;
  message_id: GqlUUID;
  user_id: GqlUUID;
  emoji: string;
  emoji_id: GqlUUID | null;
  created_at: GqlDateTime;
  // Relations
  user?: GqlUser;
  message?: GqlMessage;
}

/**
 * Messages list query variables.
 */
export interface GetMessagesVars {
  channel_id: GqlUUID;
  before?: GqlDateTime;
  after?: GqlDateTime;
  limit?: number;
}

/**
 * Messages list query result.
 */
export interface GetMessagesResult {
  nchat_messages: GqlMessage[];
}

// ============================================================================
// Notification Query Types
// ============================================================================

/**
 * GraphQL Notification type.
 */
export interface GqlNotification {
  id: GqlUUID;
  user_id: GqlUUID;
  type: string;
  channel_id: GqlUUID | null;
  message_id: GqlUUID | null;
  thread_id: GqlUUID | null;
  actor_id: GqlUUID | null;
  title: string;
  body: string | null;
  data: GqlJson;
  action_url: string | null;
  is_read: boolean;
  read_at: GqlDateTime | null;
  is_seen: boolean;
  seen_at: GqlDateTime | null;
  push_sent: boolean;
  push_sent_at: GqlDateTime | null;
  email_sent: boolean;
  email_sent_at: GqlDateTime | null;
  created_at: GqlDateTime;
  // Relations
  actor?: GqlUser;
  channel?: GqlChannel;
  message?: GqlMessage;
}

/**
 * Notifications list query variables.
 */
export interface GetNotificationsVars {
  where?: BoolExp<GqlNotification>;
  order_by?: Array<{ [key: string]: OrderBy }>;
  limit?: number;
  offset?: number;
}

/**
 * Notifications list query result.
 */
export interface GetNotificationsResult {
  nchat_notifications: GqlNotification[];
  nchat_notifications_aggregate: {
    aggregate: {
      count: number;
    };
  };
}

// ============================================================================
// Mutation Types
// ============================================================================

/**
 * Insert user mutation variables.
 */
export interface InsertUserVars {
  object: Partial<Omit<GqlUser, "id" | "created_at" | "updated_at">>;
}

/**
 * Insert user mutation result.
 */
export interface InsertUserResult {
  insert_nchat_users_one: GqlUser | null;
}

/**
 * Update user mutation variables.
 */
export interface UpdateUserVars {
  id: GqlUUID;
  _set: Partial<Omit<GqlUser, "id" | "created_at">>;
}

/**
 * Update user mutation result.
 */
export interface UpdateUserResult {
  update_nchat_users_by_pk: GqlUser | null;
}

/**
 * Insert message mutation variables.
 */
export interface InsertMessageVars {
  object: {
    channel_id: GqlUUID;
    user_id?: GqlUUID;
    content: string;
    content_html?: string;
    content_plain?: string;
    type?: string;
    thread_id?: GqlUUID;
    parent_message_id?: GqlUUID;
    metadata?: GqlJson;
    mentions?: GqlUUID[];
    mentioned_channels?: GqlUUID[];
  };
}

/**
 * Insert message mutation result.
 */
export interface InsertMessageResult {
  insert_nchat_messages_one: GqlMessage | null;
}

/**
 * Update message mutation variables.
 */
export interface UpdateMessageVars {
  id: GqlUUID;
  _set: {
    content?: string;
    content_html?: string;
    content_plain?: string;
    is_edited?: boolean;
    edited_at?: GqlDateTime;
    is_pinned?: boolean;
    is_deleted?: boolean;
    deleted_at?: GqlDateTime;
  };
}

/**
 * Update message mutation result.
 */
export interface UpdateMessageResult {
  update_nchat_messages_by_pk: GqlMessage | null;
}

/**
 * Insert reaction mutation variables.
 */
export interface InsertReactionVars {
  object: {
    message_id: GqlUUID;
    user_id: GqlUUID;
    emoji: string;
    emoji_id?: GqlUUID;
  };
}

/**
 * Insert reaction mutation result.
 */
export interface InsertReactionResult {
  insert_nchat_reactions_one: GqlReaction | null;
}

/**
 * Delete reaction mutation variables.
 */
export interface DeleteReactionVars {
  message_id: GqlUUID;
  user_id: GqlUUID;
  emoji: string;
}

/**
 * Delete reaction mutation result.
 */
export interface DeleteReactionResult {
  delete_nchat_reactions: {
    affected_rows: number;
  };
}

/**
 * Update channel member mutation variables.
 */
export interface UpdateChannelMemberVars {
  channel_id: GqlUUID;
  user_id: GqlUUID;
  _set: {
    last_read_message_id?: GqlUUID;
    last_read_at?: GqlDateTime;
    unread_count?: number;
    mention_count?: number;
    is_muted?: boolean;
    muted_until?: GqlDateTime;
    is_pinned?: boolean;
    notification_level?: string;
  };
}

/**
 * Update channel member mutation result.
 */
export interface UpdateChannelMemberResult {
  update_nchat_channel_members: {
    affected_rows: number;
    returning: GqlChannelMember[];
  };
}

/**
 * Update presence mutation variables.
 */
export interface UpdatePresenceVars {
  user_id: GqlUUID;
  _set: {
    status?: string;
    custom_message?: string;
    last_heartbeat_at?: GqlDateTime;
    current_channel_id?: GqlUUID | null;
    device_info?: GqlJson;
    is_mobile?: boolean;
  };
}

/**
 * Update presence mutation result.
 */
export interface UpdatePresenceResult {
  update_nchat_presence: {
    affected_rows: number;
    returning: GqlPresence[];
  };
}

// ============================================================================
// Subscription Types
// ============================================================================

/**
 * Messages subscription variables.
 */
export interface MessagesSubscriptionVars {
  channel_id: GqlUUID;
}

/**
 * Messages subscription result.
 */
export interface MessagesSubscriptionResult {
  nchat_messages: GqlMessage[];
}

/**
 * Typing indicator subscription variables.
 */
export interface TypingSubscriptionVars {
  channel_id: GqlUUID;
}

/**
 * Typing indicator subscription result.
 */
export interface TypingSubscriptionResult {
  nchat_typing_indicators: {
    user_id: GqlUUID;
    channel_id: GqlUUID;
    user: GqlUser;
    started_at: GqlDateTime;
  }[];
}

/**
 * Presence subscription variables.
 */
export interface PresenceSubscriptionVars {
  user_ids: GqlUUID[];
}

/**
 * Presence subscription result.
 */
export interface PresenceSubscriptionResult {
  nchat_presence: GqlPresence[];
}

/**
 * Notifications subscription variables.
 */
export interface NotificationsSubscriptionVars {
  user_id: GqlUUID;
}

/**
 * Notifications subscription result.
 */
export interface NotificationsSubscriptionResult {
  nchat_notifications: GqlNotification[];
}

/**
 * Channel members subscription variables.
 */
export interface ChannelMembersSubscriptionVars {
  channel_id: GqlUUID;
}

/**
 * Channel members subscription result.
 */
export interface ChannelMembersSubscriptionResult {
  nchat_channel_members: GqlChannelMember[];
}

/**
 * Reactions subscription variables.
 */
export interface ReactionsSubscriptionVars {
  message_id: GqlUUID;
}

/**
 * Reactions subscription result.
 */
export interface ReactionsSubscriptionResult {
  nchat_reactions: GqlReaction[];
}
