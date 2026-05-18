/**
 * Telegram Integration Types
 *
 * Platform-specific types for Telegram integration.
 * Re-exports common types from parent and adds Telegram-specific types.
 */

// Import types from parent for local use
import type { TelegramUser, TelegramChat, TelegramMessage } from "../types";

// Re-export types from parent for consumers
export type {
  TelegramUser,
  TelegramChat,
  TelegramMessage,
  TelegramImportOptions,
  TelegramSyncResult,
} from "../types";

// ============================================================================
// Telegram-Specific Types
// ============================================================================

/**
 * Telegram update types
 */
export type TelegramUpdateType =
  | "message"
  | "edited_message"
  | "channel_post"
  | "edited_channel_post"
  | "inline_query"
  | "chosen_inline_result"
  | "callback_query"
  | "shipping_query"
  | "pre_checkout_query"
  | "poll"
  | "poll_answer"
  | "my_chat_member"
  | "chat_member"
  | "chat_join_request";

/**
 * Telegram update object
 */
export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
  channel_post?: TelegramMessage;
  edited_channel_post?: TelegramMessage;
  inline_query?: TelegramInlineQuery;
  chosen_inline_result?: TelegramChosenInlineResult;
  callback_query?: TelegramCallbackQuery;
  shipping_query?: TelegramShippingQuery;
  pre_checkout_query?: TelegramPreCheckoutQuery;
  poll?: TelegramPoll;
  poll_answer?: TelegramPollAnswer;
  my_chat_member?: TelegramChatMemberUpdated;
  chat_member?: TelegramChatMemberUpdated;
  chat_join_request?: TelegramChatJoinRequest;
}

/**
 * Telegram inline query
 */
export interface TelegramInlineQuery {
  id: string;
  from: TelegramUser;
  query: string;
  offset: string;
  chat_type?: "sender" | "private" | "group" | "supergroup" | "channel";
  location?: TelegramLocation;
}

/**
 * Telegram chosen inline result
 */
export interface TelegramChosenInlineResult {
  result_id: string;
  from: TelegramUser;
  location?: TelegramLocation;
  inline_message_id?: string;
  query: string;
}

/**
 * Telegram callback query (from inline keyboards)
 */
export interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  inline_message_id?: string;
  chat_instance: string;
  data?: string;
  game_short_name?: string;
}

/**
 * Telegram shipping query
 */
export interface TelegramShippingQuery {
  id: string;
  from: TelegramUser;
  invoice_payload: string;
  shipping_address: {
    country_code: string;
    state: string;
    city: string;
    street_line1: string;
    street_line2: string;
    post_code: string;
  };
}

/**
 * Telegram pre-checkout query
 */
export interface TelegramPreCheckoutQuery {
  id: string;
  from: TelegramUser;
  currency: string;
  total_amount: number;
  invoice_payload: string;
  shipping_option_id?: string;
  order_info?: {
    name?: string;
    phone_number?: string;
    email?: string;
    shipping_address?: {
      country_code: string;
      state: string;
      city: string;
      street_line1: string;
      street_line2: string;
      post_code: string;
    };
  };
}

/**
 * Telegram poll
 */
export interface TelegramPoll {
  id: string;
  question: string;
  options: Array<{
    text: string;
    voter_count: number;
  }>;
  total_voter_count: number;
  is_closed: boolean;
  is_anonymous: boolean;
  type: "regular" | "quiz";
  allows_multiple_answers: boolean;
  correct_option_id?: number;
  explanation?: string;
  explanation_entities?: TelegramMessageEntity[];
  open_period?: number;
  close_date?: number;
}

/**
 * Telegram poll answer
 */
export interface TelegramPollAnswer {
  poll_id: string;
  user: TelegramUser;
  option_ids: number[];
}

/**
 * Telegram chat member updated
 */
export interface TelegramChatMemberUpdated {
  chat: TelegramChat;
  from: TelegramUser;
  date: number;
  old_chat_member: TelegramChatMember;
  new_chat_member: TelegramChatMember;
  invite_link?: TelegramChatInviteLink;
}

/**
 * Telegram chat member
 */
export interface TelegramChatMember {
  status:
    | "creator"
    | "administrator"
    | "member"
    | "restricted"
    | "left"
    | "kicked";
  user: TelegramUser;
  is_anonymous?: boolean;
  custom_title?: string;
  can_be_edited?: boolean;
  can_manage_chat?: boolean;
  can_delete_messages?: boolean;
  can_manage_video_chats?: boolean;
  can_restrict_members?: boolean;
  can_promote_members?: boolean;
  can_change_info?: boolean;
  can_invite_users?: boolean;
  can_post_messages?: boolean;
  can_edit_messages?: boolean;
  can_pin_messages?: boolean;
  is_member?: boolean;
  can_send_messages?: boolean;
  can_send_media_messages?: boolean;
  can_send_polls?: boolean;
  can_send_other_messages?: boolean;
  can_add_web_page_previews?: boolean;
  until_date?: number;
}

/**
 * Telegram chat invite link
 */
export interface TelegramChatInviteLink {
  invite_link: string;
  creator: TelegramUser;
  creates_join_request: boolean;
  is_primary: boolean;
  is_revoked: boolean;
  name?: string;
  expire_date?: number;
  member_limit?: number;
  pending_join_request_count?: number;
}

/**
 * Telegram chat join request
 */
export interface TelegramChatJoinRequest {
  chat: TelegramChat;
  from: TelegramUser;
  date: number;
  bio?: string;
  invite_link?: TelegramChatInviteLink;
}

/**
 * Telegram location
 */
export interface TelegramLocation {
  longitude: number;
  latitude: number;
  horizontal_accuracy?: number;
  live_period?: number;
  heading?: number;
  proximity_alert_radius?: number;
}

/**
 * Telegram message entity
 */
export interface TelegramMessageEntity {
  type:
    | "mention"
    | "hashtag"
    | "cashtag"
    | "bot_command"
    | "url"
    | "email"
    | "phone_number"
    | "bold"
    | "italic"
    | "underline"
    | "strikethrough"
    | "spoiler"
    | "code"
    | "pre"
    | "text_link"
    | "text_mention"
    | "custom_emoji";
  offset: number;
  length: number;
  url?: string;
  user?: TelegramUser;
  language?: string;
  custom_emoji_id?: string;
}

/**
 * Telegram reply keyboard markup
 */
export interface TelegramReplyKeyboardMarkup {
  keyboard: TelegramKeyboardButton[][];
  resize_keyboard?: boolean;
  one_time_keyboard?: boolean;
  input_field_placeholder?: string;
  selective?: boolean;
}

/**
 * Telegram keyboard button
 */
export interface TelegramKeyboardButton {
  text: string;
  request_user?: {
    request_id: number;
    user_is_bot?: boolean;
    user_is_premium?: boolean;
  };
  request_chat?: {
    request_id: number;
    chat_is_channel: boolean;
    chat_is_forum?: boolean;
    chat_has_username?: boolean;
    chat_is_created?: boolean;
    user_administrator_rights?: TelegramChatAdministratorRights;
    bot_administrator_rights?: TelegramChatAdministratorRights;
    bot_is_member?: boolean;
  };
  request_contact?: boolean;
  request_location?: boolean;
  request_poll?: { type?: "regular" | "quiz" };
  web_app?: { url: string };
}

/**
 * Telegram inline keyboard markup
 */
export interface TelegramInlineKeyboardMarkup {
  inline_keyboard: TelegramInlineKeyboardButton[][];
}

/**
 * Telegram inline keyboard button
 */
export interface TelegramInlineKeyboardButton {
  text: string;
  url?: string;
  callback_data?: string;
  web_app?: { url: string };
  login_url?: {
    url: string;
    forward_text?: string;
    bot_username?: string;
    request_write_access?: boolean;
  };
  switch_inline_query?: string;
  switch_inline_query_current_chat?: string;
  callback_game?: Record<string, never>;
  pay?: boolean;
}

/**
 * Telegram chat administrator rights
 */
export interface TelegramChatAdministratorRights {
  is_anonymous: boolean;
  can_manage_chat: boolean;
  can_delete_messages: boolean;
  can_manage_video_chats: boolean;
  can_restrict_members: boolean;
  can_promote_members: boolean;
  can_change_info: boolean;
  can_invite_users: boolean;
  can_post_messages?: boolean;
  can_edit_messages?: boolean;
  can_pin_messages?: boolean;
  can_manage_topics?: boolean;
}

/**
 * Telegram sticker
 */
export interface TelegramSticker {
  file_id: string;
  file_unique_id: string;
  type: "regular" | "mask" | "custom_emoji";
  width: number;
  height: number;
  is_animated: boolean;
  is_video: boolean;
  thumbnail?: TelegramPhotoSize;
  emoji?: string;
  set_name?: string;
  premium_animation?: TelegramFile;
  mask_position?: {
    point: "forehead" | "eyes" | "mouth" | "chin";
    x_shift: number;
    y_shift: number;
    scale: number;
  };
  custom_emoji_id?: string;
  needs_repainting?: boolean;
  file_size?: number;
}

/**
 * Telegram photo size
 */
export interface TelegramPhotoSize {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
}

/**
 * Telegram file
 */
export interface TelegramFile {
  file_id: string;
  file_unique_id: string;
  file_size?: number;
  file_path?: string;
}

/**
 * Telegram notification settings for a chat
 */
export interface TelegramChatNotificationSettings {
  chatId: number | string;
  chatName: string;
  chatType: "private" | "group" | "supergroup" | "channel";
  localChannelId: string;
  localChannelName: string;
  syncDirection: "incoming" | "outgoing" | "bidirectional";
  enabled: boolean;
  filters?: {
    includeMedia?: boolean;
    includeStickers?: boolean;
    includeForwarded?: boolean;
  };
}

/**
 * Telegram integration config stored in database
 */
export interface TelegramIntegrationConfig {
  botId: number;
  botUsername: string;
  botName: string;
  webhookUrl?: string;
  webhookSecret?: string;
  linkedChats?: TelegramChatNotificationSettings[];
}

/**
 * Telegram link unfurl result
 */
export interface TelegramUnfurlResult {
  type: "user" | "channel" | "group" | "message" | "sticker" | "unknown";
  title: string;
  description?: string;
  avatarUrl?: string;
  url: string;
  metadata?: Record<string, unknown>;
}

/**
 * Import/export from telegram-client
 */
export type { TelegramClientConfig } from "./telegram-client";
