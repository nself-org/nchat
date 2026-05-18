/**
 * Telegram Message Formatter
 *
 * Formats messages between Telegram and the chat platform.
 * Handles entities, markdown conversion, and notification formatting.
 */

import type { TelegramUser, TelegramChat, TelegramMessage } from "../types";

import type {
  TelegramUpdate,
  TelegramMessageEntity,
  TelegramInlineKeyboardMarkup,
  TelegramInlineKeyboardButton,
} from "./types";

// ============================================================================
// Types
// ============================================================================

export interface FormattedTelegramNotification {
  title: string;
  body: string;
  url?: string;
  icon: TelegramNotificationIcon;
  color: TelegramNotificationColor;
  timestamp: string;
  metadata: TelegramNotificationMetadata;
}

export type TelegramNotificationIcon =
  | "message"
  | "photo"
  | "video"
  | "audio"
  | "voice"
  | "document"
  | "sticker"
  | "poll"
  | "location"
  | "contact"
  | "member-join"
  | "member-leave"
  | "channel"
  | "callback"
  | "telegram";

export type TelegramNotificationColor =
  | "green" // success, join
  | "blue" // message, telegram brand
  | "purple" // premium
  | "red" // error, leave
  | "yellow" // warning
  | "gray"; // neutral

export interface TelegramNotificationMetadata {
  updateType: string;
  chatId: number;
  chatType: string;
  chatTitle?: string;
  userId?: number;
  userName?: string;
  userFirstName?: string;
  messageId?: number;
}

// ============================================================================
// Update Formatting
// ============================================================================

/**
 * Format a Telegram update into a notification
 */
export function formatTelegramNotification(
  update: TelegramUpdate,
): FormattedTelegramNotification {
  if (update.message) {
    return formatMessageUpdate(update.message, "message");
  }
  if (update.edited_message) {
    return formatMessageUpdate(update.edited_message, "edited_message");
  }
  if (update.channel_post) {
    return formatMessageUpdate(update.channel_post, "channel_post");
  }
  if (update.edited_channel_post) {
    return formatMessageUpdate(
      update.edited_channel_post,
      "edited_channel_post",
    );
  }
  if (update.callback_query) {
    return formatCallbackQuery(update.callback_query);
  }
  if (update.my_chat_member || update.chat_member) {
    return formatChatMemberUpdate(update.my_chat_member || update.chat_member!);
  }
  if (update.chat_join_request) {
    return formatChatJoinRequest(update.chat_join_request);
  }
  if (update.poll) {
    return formatPollUpdate(update.poll);
  }

  return formatUnknownUpdate(update);
}

/**
 * Format message update
 */
function formatMessageUpdate(
  message: TelegramMessage,
  updateType: string,
): FormattedTelegramNotification {
  const chat = message.chat;
  const from = message.from;

  let title: string;
  let body: string;
  let icon: TelegramNotificationIcon = "message";
  let color: TelegramNotificationColor = "blue";

  // Determine message type
  if (message.text) {
    title = updateType === "edited_message" ? "Message Edited" : "New Message";
    body = truncate(message.text, 150);
  } else if (message.photo) {
    title = "Photo";
    body = message.caption ? truncate(message.caption, 100) : "Photo received";
    icon = "photo";
  } else if (message.video) {
    title = "Video";
    body = message.caption ? truncate(message.caption, 100) : "Video received";
    icon = "video";
  } else if (message.voice) {
    title = "Voice Message";
    body = `Duration: ${formatDuration(message.voice.duration)}`;
    icon = "voice";
  } else if (message.document) {
    title = "Document";
    body = message.document.file_name || "File received";
    icon = "document";
  } else if ((message as unknown as { sticker?: { emoji?: string } }).sticker) {
    title = "Sticker";
    body =
      (message as unknown as { sticker: { emoji?: string } }).sticker.emoji ||
      "Sticker received";
    icon = "sticker";
  } else if ((message as unknown as { poll?: { question: string } }).poll) {
    title = "Poll";
    body = (message as unknown as { poll: { question: string } }).poll.question;
    icon = "poll";
  } else if ((message as unknown as { location?: unknown }).location) {
    title = "Location";
    body = "Location shared";
    icon = "location";
  } else if (
    (message as unknown as { contact?: { first_name: string } }).contact
  ) {
    title = "Contact";
    body = (message as unknown as { contact: { first_name: string } }).contact
      .first_name;
    icon = "contact";
  } else if (
    (message as unknown as { new_chat_members?: TelegramUser[] })
      .new_chat_members?.length
  ) {
    title = "Member Joined";
    const members = (message as unknown as { new_chat_members: TelegramUser[] })
      .new_chat_members;
    body = members.map((u) => u.first_name).join(", ") + " joined";
    icon = "member-join";
    color = "green";
  } else if (
    (message as unknown as { left_chat_member?: TelegramUser }).left_chat_member
  ) {
    title = "Member Left";
    body = `${(message as unknown as { left_chat_member: TelegramUser }).left_chat_member.first_name} left`;
    icon = "member-leave";
    color = "red";
  } else {
    title = "Message";
    body = "New message received";
  }

  // Add chat context
  const chatTitle = chat.title || chat.first_name || "Private Chat";
  if (chat.type !== "private") {
    title = `${title} in ${chatTitle}`;
  }

  return {
    title,
    body,
    icon,
    color,
    timestamp: new Date(message.date * 1000).toISOString(),
    metadata: {
      updateType,
      chatId: chat.id,
      chatType: chat.type,
      chatTitle: chat.title,
      userId: from?.id,
      userName: from?.username,
      userFirstName: from?.first_name,
      messageId: message.message_id,
    },
  };
}

/**
 * Format callback query (button press)
 */
function formatCallbackQuery(
  query: TelegramUpdate["callback_query"],
): FormattedTelegramNotification {
  if (!query) {
    return formatUnknownUpdate({} as TelegramUpdate);
  }

  return {
    title: "Button Pressed",
    body: query.data
      ? `Callback: ${truncate(query.data, 50)}`
      : "Button interaction",
    icon: "callback",
    color: "blue",
    timestamp: new Date().toISOString(),
    metadata: {
      updateType: "callback_query",
      chatId: query.message?.chat.id || 0,
      chatType: query.message?.chat.type || "private",
      userId: query.from.id,
      userName: query.from.username,
      userFirstName: query.from.first_name,
      messageId: query.message?.message_id,
    },
  };
}

/**
 * Format chat member update
 */
function formatChatMemberUpdate(
  update: NonNullable<TelegramUpdate["chat_member"]>,
): FormattedTelegramNotification {
  const isJoin =
    update.old_chat_member.status === "left" &&
    update.new_chat_member.status !== "left";
  const isLeave =
    update.old_chat_member.status !== "left" &&
    update.new_chat_member.status === "left";

  let title: string;
  let icon: TelegramNotificationIcon;
  let color: TelegramNotificationColor;

  if (isJoin) {
    title = "Member Joined";
    icon = "member-join";
    color = "green";
  } else if (isLeave) {
    title = "Member Left";
    icon = "member-leave";
    color = "red";
  } else {
    title = "Member Updated";
    icon = "telegram";
    color = "blue";
  }

  return {
    title,
    body: `${update.new_chat_member.user.first_name} in ${update.chat.title || "chat"}`,
    icon,
    color,
    timestamp: new Date(update.date * 1000).toISOString(),
    metadata: {
      updateType: "chat_member",
      chatId: update.chat.id,
      chatType: update.chat.type,
      chatTitle: update.chat.title,
      userId: update.new_chat_member.user.id,
      userName: update.new_chat_member.user.username,
      userFirstName: update.new_chat_member.user.first_name,
    },
  };
}

/**
 * Format chat join request
 */
function formatChatJoinRequest(
  request: NonNullable<TelegramUpdate["chat_join_request"]>,
): FormattedTelegramNotification {
  return {
    title: "Join Request",
    body: `${request.from.first_name} requested to join ${request.chat.title || "chat"}`,
    icon: "member-join",
    color: "yellow",
    timestamp: new Date(request.date * 1000).toISOString(),
    metadata: {
      updateType: "chat_join_request",
      chatId: request.chat.id,
      chatType: request.chat.type,
      chatTitle: request.chat.title,
      userId: request.from.id,
      userName: request.from.username,
      userFirstName: request.from.first_name,
    },
  };
}

/**
 * Format poll update
 */
function formatPollUpdate(
  poll: NonNullable<TelegramUpdate["poll"]>,
): FormattedTelegramNotification {
  return {
    title: poll.is_closed ? "Poll Closed" : "Poll Update",
    body: poll.question,
    icon: "poll",
    color: poll.is_closed ? "gray" : "blue",
    timestamp: new Date().toISOString(),
    metadata: {
      updateType: "poll",
      chatId: 0,
      chatType: "unknown",
    },
  };
}

/**
 * Format unknown update
 */
function formatUnknownUpdate(
  update: TelegramUpdate,
): FormattedTelegramNotification {
  return {
    title: "Telegram Update",
    body: "An update was received",
    icon: "telegram",
    color: "gray",
    timestamp: new Date().toISOString(),
    metadata: {
      updateType: "unknown",
      chatId: 0,
      chatType: "unknown",
    },
  };
}

// ============================================================================
// Message Conversion (Telegram -> Chat)
// ============================================================================

/**
 * Convert Telegram message to chat message format
 */
export function convertTelegramMessageToChat(message: TelegramMessage): {
  content: string;
  html: string;
  author: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  timestamp: string;
  replyToId?: number;
  attachments?: Array<{
    type: string;
    fileId: string;
    fileName?: string;
    mimeType?: string;
    size?: number;
    thumbnailUrl?: string;
  }>;
} {
  const from = message.from;
  const text = message.text || message.caption || "";

  // Apply entity formatting
  let html = text;
  if ((message as unknown as { entities?: TelegramMessageEntity[] }).entities) {
    html = applyEntitiesToHtml(
      text,
      (message as unknown as { entities: TelegramMessageEntity[] }).entities,
    );
  } else if (
    (message as unknown as { caption_entities?: TelegramMessageEntity[] })
      .caption_entities
  ) {
    html = applyEntitiesToHtml(
      text,
      (message as unknown as { caption_entities: TelegramMessageEntity[] })
        .caption_entities,
    );
  }

  // Build attachments
  const attachments: Array<{
    type: string;
    fileId: string;
    fileName?: string;
    mimeType?: string;
    size?: number;
    thumbnailUrl?: string;
  }> = [];

  if (message.photo) {
    const largest = message.photo[message.photo.length - 1];
    attachments.push({
      type: "image",
      fileId: largest.file_id,
      size: largest.file_size,
    });
  }

  if (message.video) {
    attachments.push({
      type: "video",
      fileId: message.video.file_id,
      mimeType: (message.video as { mime_type?: string }).mime_type,
      size: message.video.file_size,
    });
  }

  if (message.voice) {
    attachments.push({
      type: "audio",
      fileId: message.voice.file_id,
      mimeType: message.voice.mime_type,
      size: message.voice.file_size,
    });
  }

  if (message.document) {
    attachments.push({
      type: "file",
      fileId: message.document.file_id,
      fileName: message.document.file_name,
      mimeType: message.document.mime_type,
      size: message.document.file_size,
    });
  }

  return {
    content: text,
    html,
    author: {
      id: String(from?.id || 0),
      name: from
        ? `${from.first_name}${from.last_name ? ` ${from.last_name}` : ""}`
        : "Unknown",
    },
    timestamp: new Date(message.date * 1000).toISOString(),
    replyToId: message.reply_to_message?.message_id,
    attachments: attachments.length ? attachments : undefined,
  };
}

// ============================================================================
// Message Conversion (Chat -> Telegram)
// ============================================================================

/**
 * Convert chat message to Telegram format
 */
export function convertChatMessageToTelegram(
  content: string,
  options?: {
    parseMode?: "Markdown" | "MarkdownV2" | "HTML";
    replyToMessageId?: number;
    disableNotification?: boolean;
    disableWebPagePreview?: boolean;
    replyMarkup?: TelegramInlineKeyboardMarkup;
  },
): {
  text: string;
  parse_mode?: string;
  reply_to_message_id?: number;
  disable_notification?: boolean;
  disable_web_page_preview?: boolean;
  reply_markup?: TelegramInlineKeyboardMarkup;
} {
  // Convert HTML to Telegram format if needed
  let text = content;
  if (options?.parseMode === "HTML") {
    text = convertToTelegramHtml(content);
  } else if (options?.parseMode === "MarkdownV2") {
    text = convertToTelegramMarkdownV2(content);
  }

  return {
    text,
    parse_mode: options?.parseMode,
    reply_to_message_id: options?.replyToMessageId,
    disable_notification: options?.disableNotification,
    disable_web_page_preview: options?.disableWebPagePreview,
    reply_markup: options?.replyMarkup,
  };
}

// ============================================================================
// Inline Keyboard Builders
// ============================================================================

/**
 * Build inline keyboard markup
 */
export function buildInlineKeyboard(
  buttons: Array<Array<TelegramInlineKeyboardButton>>,
): TelegramInlineKeyboardMarkup {
  return {
    inline_keyboard: buttons,
  };
}

/**
 * Build a URL button
 */
export function buildUrlButton(
  text: string,
  url: string,
): TelegramInlineKeyboardButton {
  return { text, url };
}

/**
 * Build a callback button
 */
export function buildCallbackButton(
  text: string,
  callbackData: string,
): TelegramInlineKeyboardButton {
  return { text, callback_data: callbackData };
}

/**
 * Build a web app button
 */
export function buildWebAppButton(
  text: string,
  webAppUrl: string,
): TelegramInlineKeyboardButton {
  return { text, web_app: { url: webAppUrl } };
}

// ============================================================================
// Entity Formatting
// ============================================================================

/**
 * Apply Telegram entities to create HTML
 */
function applyEntitiesToHtml(
  text: string,
  entities: TelegramMessageEntity[],
): string {
  if (!entities.length) return escapeHtml(text);

  // Sort entities by offset (descending) to apply from end to start
  const sorted = [...entities].sort((a, b) => b.offset - a.offset);

  let result = text;
  for (const entity of sorted) {
    const start = entity.offset;
    const end = entity.offset + entity.length;
    const content = text.slice(start, end);

    let replacement: string;
    switch (entity.type) {
      case "bold":
        replacement = `<strong>${escapeHtml(content)}</strong>`;
        break;
      case "italic":
        replacement = `<em>${escapeHtml(content)}</em>`;
        break;
      case "underline":
        replacement = `<u>${escapeHtml(content)}</u>`;
        break;
      case "strikethrough":
        replacement = `<del>${escapeHtml(content)}</del>`;
        break;
      case "spoiler":
        replacement = `<span class="spoiler">${escapeHtml(content)}</span>`;
        break;
      case "code":
        replacement = `<code>${escapeHtml(content)}</code>`;
        break;
      case "pre":
        replacement = `<pre>${escapeHtml(content)}</pre>`;
        break;
      case "text_link":
        replacement = `<a href="${escapeHtml(entity.url || "")}">${escapeHtml(content)}</a>`;
        break;
      case "mention":
        replacement = `<span class="mention">${escapeHtml(content)}</span>`;
        break;
      case "hashtag":
        replacement = `<span class="hashtag">${escapeHtml(content)}</span>`;
        break;
      case "url":
        replacement = `<a href="${escapeHtml(content)}">${escapeHtml(content)}</a>`;
        break;
      default:
        replacement = escapeHtml(content);
    }

    result = result.slice(0, start) + replacement + result.slice(end);
  }

  return result;
}

/**
 * Convert HTML to Telegram HTML format
 */
function convertToTelegramHtml(html: string): string {
  let result = html;

  // Telegram supports limited HTML tags
  // Keep: <b>, <strong>, <i>, <em>, <u>, <ins>, <s>, <strike>, <del>,
  //       <span class="tg-spoiler">, <tg-spoiler>, <a>, <code>, <pre>

  // Convert common tags
  result = result.replace(/<strong>/gi, "<b>");
  result = result.replace(/<\/strong>/gi, "</b>");
  result = result.replace(/<em>/gi, "<i>");
  result = result.replace(/<\/em>/gi, "</i>");
  result = result.replace(/<ins>/gi, "<u>");
  result = result.replace(/<\/ins>/gi, "</u>");
  result = result.replace(/<strike>/gi, "<s>");
  result = result.replace(/<\/strike>/gi, "</s>");
  result = result.replace(/<del>/gi, "<s>");
  result = result.replace(/<\/del>/gi, "</s>");

  // Strip unsupported tags
  result = result.replace(/<br\s*\/?>/gi, "\n");
  result = result.replace(/<p>/gi, "");
  result = result.replace(/<\/p>/gi, "\n");
  result = result.replace(/<div>/gi, "");
  result = result.replace(/<\/div>/gi, "\n");

  return result.trim();
}

/**
 * Convert to Telegram MarkdownV2 format
 */
function convertToTelegramMarkdownV2(text: string): string {
  // Escape special characters for MarkdownV2
  const specialChars = [
    "_",
    "*",
    "[",
    "]",
    "(",
    ")",
    "~",
    "`",
    ">",
    "#",
    "+",
    "-",
    "=",
    "|",
    "{",
    "}",
    ".",
    "!",
  ];

  let result = text;
  for (const char of specialChars) {
    result = result.replace(new RegExp(`\\${char}`, "g"), `\\${char}`);
  }

  return result;
}

// ============================================================================
// Helper Functions
// ============================================================================

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// ============================================================================
// Telegram Brand Colors
// ============================================================================

export const TELEGRAM_COLORS = {
  blue: "#0088cc",
  lightBlue: "#54a9eb",
  darkBlue: "#3d9ae8",
  green: "#62c554",
  red: "#ff4444",
  orange: "#f5a623",
  purple: "#8b5cf6",
} as const;
