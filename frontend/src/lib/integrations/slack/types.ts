/**
 * Slack Integration Types
 *
 * Platform-specific types for Slack integration.
 * Re-exports common types from parent and adds Slack-specific types.
 */

// Import types from parent for local use
import type { SlackMessage, SlackFile } from "../types";

// Re-export types from parent
export type {
  SlackChannel,
  SlackUser,
  SlackMessage,
  SlackFile,
  SlackImportOptions,
  SlackSyncResult,
} from "../types";

// ============================================================================
// Slack-Specific Types
// ============================================================================

/**
 * Slack event types for webhook/Events API
 */
export type SlackEventType =
  | "app_home_opened"
  | "app_mention"
  | "app_rate_limited"
  | "app_uninstalled"
  | "channel_archive"
  | "channel_created"
  | "channel_deleted"
  | "channel_history_changed"
  | "channel_id_changed"
  | "channel_left"
  | "channel_rename"
  | "channel_shared"
  | "channel_unarchive"
  | "channel_unshared"
  | "file_change"
  | "file_created"
  | "file_deleted"
  | "file_public"
  | "file_shared"
  | "file_unshared"
  | "group_archive"
  | "group_close"
  | "group_deleted"
  | "group_history_changed"
  | "group_left"
  | "group_open"
  | "group_rename"
  | "group_unarchive"
  | "im_close"
  | "im_created"
  | "im_history_changed"
  | "im_open"
  | "link_shared"
  | "member_joined_channel"
  | "member_left_channel"
  | "message"
  | "message.app_home"
  | "message.channels"
  | "message.groups"
  | "message.im"
  | "message.mpim"
  | "pin_added"
  | "pin_removed"
  | "reaction_added"
  | "reaction_removed"
  | "star_added"
  | "star_removed"
  | "subteam_created"
  | "subteam_members_changed"
  | "subteam_self_added"
  | "subteam_self_removed"
  | "subteam_updated"
  | "team_domain_change"
  | "team_join"
  | "team_rename"
  | "tokens_revoked"
  | "url_verification"
  | "user_change"
  | "user_profile_changed"
  | "workflow_step_execute";

/**
 * Slack message subtype
 */
export type SlackMessageSubtype =
  | "bot_message"
  | "channel_archive"
  | "channel_join"
  | "channel_leave"
  | "channel_name"
  | "channel_purpose"
  | "channel_topic"
  | "channel_unarchive"
  | "ekm_access_denied"
  | "file_comment"
  | "file_mention"
  | "file_share"
  | "group_archive"
  | "group_join"
  | "group_leave"
  | "group_name"
  | "group_purpose"
  | "group_topic"
  | "group_unarchive"
  | "me_message"
  | "message_changed"
  | "message_deleted"
  | "message_replied"
  | "pinned_item"
  | "reply_broadcast"
  | "thread_broadcast"
  | "unpinned_item";

/**
 * Slack Events API event wrapper
 */
export interface SlackEventWrapper {
  token: string;
  team_id: string;
  api_app_id: string;
  event: SlackEvent;
  type: "event_callback";
  event_id: string;
  event_time: number;
  authorizations?: Array<{
    enterprise_id: string | null;
    team_id: string;
    user_id: string;
    is_bot: boolean;
    is_enterprise_install: boolean;
  }>;
  is_ext_shared_channel?: boolean;
  event_context?: string;
}

/**
 * Slack event payload
 */
export interface SlackEvent {
  type: SlackEventType;
  user?: string;
  channel?: string;
  channel_type?: string;
  text?: string;
  ts?: string;
  event_ts?: string;
  subtype?: SlackMessageSubtype;
  thread_ts?: string;
  hidden?: boolean;
  deleted_ts?: string;
  previous_message?: SlackMessage;
  message?: SlackMessage;
  item?: {
    type: string;
    channel?: string;
    ts?: string;
    file?: string;
    comment?: string;
  };
  reaction?: string;
  item_user?: string;
  files?: SlackFile[];
}

/**
 * Slack URL verification challenge
 */
export interface SlackUrlVerification {
  token: string;
  challenge: string;
  type: "url_verification";
}

/**
 * Slack interactive payload (from buttons, modals, etc.)
 */
export interface SlackInteractivePayload {
  type:
    | "block_actions"
    | "view_submission"
    | "view_closed"
    | "shortcut"
    | "message_action";
  user: {
    id: string;
    username: string;
    name: string;
    team_id: string;
  };
  team: {
    id: string;
    domain: string;
  };
  channel?: {
    id: string;
    name: string;
  };
  container?: {
    type: string;
    message_ts?: string;
    channel_id?: string;
  };
  message?: SlackMessage;
  actions?: Array<{
    type: string;
    action_id: string;
    block_id: string;
    value?: string;
    selected_option?: {
      text: { type: string; text: string };
      value: string;
    };
    action_ts: string;
  }>;
  response_url?: string;
  trigger_id: string;
}

/**
 * Slack Block Kit element types
 */
export type SlackBlockType =
  | "section"
  | "divider"
  | "image"
  | "actions"
  | "context"
  | "input"
  | "file"
  | "header"
  | "video";

/**
 * Slack Block Kit block
 */
export interface SlackBlock {
  type: SlackBlockType;
  block_id?: string;
  text?: SlackTextObject;
  accessory?: SlackElement;
  elements?: SlackElement[];
  fields?: SlackTextObject[];
  image_url?: string;
  alt_text?: string;
  title?: SlackTextObject;
}

/**
 * Slack text object
 */
export interface SlackTextObject {
  type: "plain_text" | "mrkdwn";
  text: string;
  emoji?: boolean;
  verbatim?: boolean;
}

/**
 * Slack element (button, select, etc.)
 */
export interface SlackElement {
  type: string;
  action_id?: string;
  text?: SlackTextObject;
  value?: string;
  url?: string;
  style?: "primary" | "danger";
  confirm?: SlackConfirmObject;
  options?: SlackOptionObject[];
  initial_option?: SlackOptionObject;
  placeholder?: SlackTextObject;
}

/**
 * Slack confirm dialog object
 */
export interface SlackConfirmObject {
  title: SlackTextObject;
  text: SlackTextObject;
  confirm: SlackTextObject;
  deny: SlackTextObject;
  style?: "primary" | "danger";
}

/**
 * Slack option object (for selects)
 */
export interface SlackOptionObject {
  text: SlackTextObject;
  value: string;
  description?: SlackTextObject;
  url?: string;
}

/**
 * Slack attachment (legacy)
 */
export interface SlackAttachment {
  color?: string;
  fallback?: string;
  callback_id?: string;
  attachment_type?: string;
  pretext?: string;
  author_name?: string;
  author_link?: string;
  author_icon?: string;
  title?: string;
  title_link?: string;
  text?: string;
  fields?: Array<{
    title: string;
    value: string;
    short?: boolean;
  }>;
  image_url?: string;
  thumb_url?: string;
  footer?: string;
  footer_icon?: string;
  ts?: number;
  mrkdwn_in?: string[];
  actions?: Array<{
    name: string;
    text: string;
    type: string;
    value?: string;
    style?: string;
    confirm?: {
      title: string;
      text: string;
      ok_text: string;
      dismiss_text: string;
    };
  }>;
}

/**
 * Slack team info
 */
export interface SlackTeam {
  id: string;
  name: string;
  domain: string;
  email_domain?: string;
  icon?: {
    image_34?: string;
    image_44?: string;
    image_68?: string;
    image_88?: string;
    image_102?: string;
    image_132?: string;
    image_230?: string;
    image_original?: string;
  };
  enterprise_id?: string;
  enterprise_name?: string;
}

/**
 * Slack conversation (unified channel/DM/group type)
 */
export interface SlackConversation {
  id: string;
  name?: string;
  is_channel: boolean;
  is_group: boolean;
  is_im: boolean;
  is_mpim: boolean;
  is_private: boolean;
  is_archived: boolean;
  is_general: boolean;
  is_shared: boolean;
  is_org_shared: boolean;
  is_ext_shared: boolean;
  is_pending_ext_shared: boolean;
  is_member: boolean;
  is_open?: boolean;
  creator?: string;
  created?: number;
  unlinked?: number;
  name_normalized?: string;
  num_members?: number;
  topic?: {
    value: string;
    creator: string;
    last_set: number;
  };
  purpose?: {
    value: string;
    creator: string;
    last_set: number;
  };
  user?: string; // For DMs
}

/**
 * Slack notification settings for a channel mapping
 */
export interface SlackChannelNotificationSettings {
  slackChannelId: string;
  slackChannelName: string;
  localChannelId: string;
  localChannelName: string;
  syncDirection: "incoming" | "outgoing" | "bidirectional";
  enabled: boolean;
  filters?: {
    excludeBots?: boolean;
    excludeSubtypes?: SlackMessageSubtype[];
    includeThreads?: boolean;
  };
}

/**
 * Slack integration config stored in database
 */
export interface SlackIntegrationConfig {
  teamId: string;
  teamName: string;
  userId: string;
  userName: string;
  botUserId?: string;
  botAccessToken?: string;
  incomingWebhookUrl?: string;
  incomingWebhookChannel?: string;
  channelMappings?: SlackChannelNotificationSettings[];
}

/**
 * Import/export from slack-client
 */
export type { SlackClientConfig } from "./slack-client";
