/**
 * Slack Message Formatter
 *
 * Formats messages between Slack and the chat platform.
 * Handles Block Kit, mrkdwn conversion, and notification formatting.
 */

import type {
  SlackMessage,
  SlackUser,
  SlackChannel,
  SlackFile,
} from "../types";

import type {
  SlackBlock,
  SlackTextObject,
  SlackAttachment,
  SlackEvent,
  SlackEventWrapper,
} from "./types";

// ============================================================================
// Types
// ============================================================================

export interface FormattedSlackNotification {
  title: string;
  body: string;
  url?: string;
  icon: SlackNotificationIcon;
  color: SlackNotificationColor;
  timestamp: string;
  metadata: SlackNotificationMetadata;
}

export type SlackNotificationIcon =
  | "message"
  | "mention"
  | "thread"
  | "reaction"
  | "file"
  | "channel"
  | "user"
  | "app"
  | "slack";

export type SlackNotificationColor =
  | "green" // success, online
  | "blue" // info, message
  | "purple" // app, bot
  | "red" // error, alert
  | "yellow" // warning, away
  | "gray"; // neutral

export interface SlackNotificationMetadata {
  eventType: string;
  channelId?: string;
  channelName?: string;
  userId?: string;
  userName?: string;
  userAvatarUrl?: string;
  teamId?: string;
  teamName?: string;
  messageTs?: string;
  threadTs?: string;
}

// ============================================================================
// Event Formatting
// ============================================================================

/**
 * Format a Slack event into a notification
 */
export function formatSlackNotification(
  eventWrapper: SlackEventWrapper,
): FormattedSlackNotification {
  const { event, team_id } = eventWrapper;

  switch (event.type) {
    case "message":
      return formatMessageEvent(event, team_id);
    case "app_mention":
      return formatMentionEvent(event, team_id);
    case "reaction_added":
    case "reaction_removed":
      return formatReactionEvent(event, team_id);
    case "member_joined_channel":
    case "member_left_channel":
      return formatMemberEvent(event, team_id);
    case "channel_created":
    case "channel_deleted":
    case "channel_archive":
    case "channel_unarchive":
    case "channel_rename":
      return formatChannelEvent(event, team_id);
    case "file_created":
    case "file_shared":
    case "file_deleted":
      return formatFileEvent(event, team_id);
    default:
      return formatUnknownEvent(event, team_id);
  }
}

/**
 * Format message event
 */
function formatMessageEvent(
  event: SlackEvent,
  teamId: string,
): FormattedSlackNotification {
  const { user, channel, text, ts, thread_ts, subtype } = event;

  // Handle different message subtypes
  let title: string;
  let body: string;
  let icon: SlackNotificationIcon = "message";

  if (thread_ts && thread_ts !== ts) {
    title = "Thread Reply";
    body = text ? truncate(text, 150) : "New reply in thread";
    icon = "thread";
  } else if (subtype === "file_share") {
    title = "File Shared";
    body = text || "A file was shared";
    icon = "file";
  } else if (subtype === "channel_join") {
    title = "User Joined";
    body = "A user joined the channel";
    icon = "user";
  } else if (subtype === "channel_leave") {
    title = "User Left";
    body = "A user left the channel";
    icon = "user";
  } else if (subtype === "bot_message") {
    title = "Bot Message";
    body = text ? truncate(text, 150) : "Message from a bot";
    icon = "app";
  } else {
    title = "New Message";
    body = text ? truncate(text, 150) : "New message";
  }

  return {
    title,
    body: convertMrkdwnToPlainText(body),
    icon,
    color: "blue",
    timestamp: ts ? tsToISOString(ts) : new Date().toISOString(),
    metadata: {
      eventType: subtype ? `message.${subtype}` : "message",
      channelId: channel,
      userId: user,
      teamId,
      messageTs: ts,
      threadTs: thread_ts,
    },
  };
}

/**
 * Format mention event
 */
function formatMentionEvent(
  event: SlackEvent,
  teamId: string,
): FormattedSlackNotification {
  const { user, channel, text, ts } = event;

  return {
    title: "You were mentioned",
    body: text
      ? truncate(convertMrkdwnToPlainText(text), 150)
      : "Someone mentioned you",
    icon: "mention",
    color: "yellow",
    timestamp: ts ? tsToISOString(ts) : new Date().toISOString(),
    metadata: {
      eventType: "app_mention",
      channelId: channel,
      userId: user,
      teamId,
      messageTs: ts,
    },
  };
}

/**
 * Format reaction event
 */
function formatReactionEvent(
  event: SlackEvent,
  teamId: string,
): FormattedSlackNotification {
  const { type, user, reaction, item } = event;
  const isAdded = type === "reaction_added";

  return {
    title: isAdded ? "Reaction Added" : "Reaction Removed",
    body: `${isAdded ? "Added" : "Removed"} :${reaction}:`,
    icon: "reaction",
    color: isAdded ? "green" : "gray",
    timestamp: new Date().toISOString(),
    metadata: {
      eventType: type,
      channelId: item?.channel,
      userId: user,
      teamId,
      messageTs: item?.ts,
    },
  };
}

/**
 * Format member event
 */
function formatMemberEvent(
  event: SlackEvent,
  teamId: string,
): FormattedSlackNotification {
  const { type, user, channel } = event;
  const isJoin = type === "member_joined_channel";

  return {
    title: isJoin ? "User Joined Channel" : "User Left Channel",
    body: `A user ${isJoin ? "joined" : "left"} the channel`,
    icon: "user",
    color: isJoin ? "green" : "gray",
    timestamp: new Date().toISOString(),
    metadata: {
      eventType: type,
      channelId: channel,
      userId: user,
      teamId,
    },
  };
}

/**
 * Format channel event
 */
function formatChannelEvent(
  event: SlackEvent,
  teamId: string,
): FormattedSlackNotification {
  const { type, channel } = event;

  let title: string;
  let color: SlackNotificationColor = "blue";

  switch (type) {
    case "channel_created":
      title = "Channel Created";
      color = "green";
      break;
    case "channel_deleted":
      title = "Channel Deleted";
      color = "red";
      break;
    case "channel_archive":
      title = "Channel Archived";
      color = "gray";
      break;
    case "channel_unarchive":
      title = "Channel Unarchived";
      color = "green";
      break;
    case "channel_rename":
      title = "Channel Renamed";
      break;
    default:
      title = "Channel Updated";
  }

  return {
    title,
    body: "A channel was updated",
    icon: "channel",
    color,
    timestamp: new Date().toISOString(),
    metadata: {
      eventType: type,
      channelId: channel,
      teamId,
    },
  };
}

/**
 * Format file event
 */
function formatFileEvent(
  event: SlackEvent,
  teamId: string,
): FormattedSlackNotification {
  const { type, user, channel } = event;

  let title: string;
  let color: SlackNotificationColor = "blue";

  switch (type) {
    case "file_created":
      title = "File Uploaded";
      color = "green";
      break;
    case "file_shared":
      title = "File Shared";
      color = "blue";
      break;
    case "file_deleted":
      title = "File Deleted";
      color = "red";
      break;
    default:
      title = "File Updated";
  }

  return {
    title,
    body: "A file was updated",
    icon: "file",
    color,
    timestamp: new Date().toISOString(),
    metadata: {
      eventType: type,
      channelId: channel,
      userId: user,
      teamId,
    },
  };
}

/**
 * Format unknown event
 */
function formatUnknownEvent(
  event: SlackEvent,
  teamId: string,
): FormattedSlackNotification {
  return {
    title: `Slack Event: ${event.type}`,
    body: "An event occurred in Slack",
    icon: "slack",
    color: "gray",
    timestamp: new Date().toISOString(),
    metadata: {
      eventType: event.type,
      channelId: event.channel,
      userId: event.user,
      teamId,
    },
  };
}

// ============================================================================
// Message Conversion (Slack -> Chat)
// ============================================================================

/**
 * Convert Slack message to chat message format
 */
export function convertSlackMessageToChat(
  message: SlackMessage,
  users: Map<string, SlackUser>,
  channels: Map<string, SlackChannel>,
): {
  content: string;
  html: string;
  author: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  timestamp: string;
  threadId?: string;
  attachments?: Array<{
    type: string;
    url: string;
    name: string;
    size?: number;
    mimeType?: string;
    thumbnailUrl?: string;
  }>;
} {
  const user = users.get(message.user);

  // Convert text
  let content = message.text || "";
  let html = message.text || "";

  // Expand user mentions
  content = expandUserMentions(content, users);
  html = expandUserMentionsHtml(html, users);

  // Expand channel mentions
  content = expandChannelMentions(content, channels);
  html = expandChannelMentionsHtml(html, channels);

  // Convert mrkdwn to HTML
  html = convertMrkdwnToHtml(html);

  // Process attachments
  const attachments = message.files?.map((file) => ({
    type: getFileType(file.mimetype),
    url: file.url_private || file.url_private_download || "",
    name: file.name || file.title,
    size: file.size,
    mimeType: file.mimetype,
    thumbnailUrl: file.thumb_360 || file.thumb_64,
  }));

  return {
    content: convertMrkdwnToPlainText(content),
    html,
    author: {
      id: message.user,
      name: user?.real_name || user?.name || message.user,
      avatarUrl: user?.profile?.image_72,
    },
    timestamp: tsToISOString(message.ts),
    threadId: message.thread_ts !== message.ts ? message.thread_ts : undefined,
    attachments,
  };
}

// ============================================================================
// Message Conversion (Chat -> Slack)
// ============================================================================

/**
 * Convert chat message to Slack message format
 */
export function convertChatMessageToSlack(
  content: string,
  options?: {
    username?: string;
    iconEmoji?: string;
    iconUrl?: string;
    threadTs?: string;
    blocks?: SlackBlock[];
    attachments?: SlackAttachment[];
  },
): {
  text: string;
  blocks?: SlackBlock[];
  attachments?: SlackAttachment[];
  thread_ts?: string;
  username?: string;
  icon_emoji?: string;
  icon_url?: string;
} {
  // Convert HTML to mrkdwn if needed
  const text = convertHtmlToMrkdwn(content);

  return {
    text,
    blocks: options?.blocks,
    attachments: options?.attachments,
    thread_ts: options?.threadTs,
    username: options?.username,
    icon_emoji: options?.iconEmoji,
    icon_url: options?.iconUrl,
  };
}

// ============================================================================
// Block Kit Builders
// ============================================================================

/**
 * Build a simple text section block
 */
export function buildTextBlock(
  text: string,
  mrkdwn: boolean = true,
): SlackBlock {
  return {
    type: "section",
    text: {
      type: mrkdwn ? "mrkdwn" : "plain_text",
      text,
    },
  };
}

/**
 * Build a divider block
 */
export function buildDividerBlock(): SlackBlock {
  return { type: "divider" };
}

/**
 * Build a header block
 */
export function buildHeaderBlock(text: string): SlackBlock {
  return {
    type: "header",
    text: {
      type: "plain_text",
      text,
    },
  };
}

/**
 * Build a context block with text elements
 */
export function buildContextBlock(elements: string[]): SlackBlock {
  return {
    type: "context",
    elements: elements.map((text) => ({
      type: "mrkdwn" as const,
      text,
    })) as unknown as import("./types").SlackElement[],
  };
}

/**
 * Build an image block
 */
export function buildImageBlock(
  imageUrl: string,
  altText: string,
  title?: string,
): SlackBlock {
  const block: SlackBlock = {
    type: "image",
    image_url: imageUrl,
    alt_text: altText,
  };

  if (title) {
    block.title = {
      type: "plain_text",
      text: title,
    };
  }

  return block;
}

// ============================================================================
// mrkdwn Conversion
// ============================================================================

/**
 * Convert Slack mrkdwn to plain text
 */
export function convertMrkdwnToPlainText(mrkdwn: string): string {
  let text = mrkdwn;

  // Remove bold markers
  text = text.replace(/\*([^*]+)\*/g, "$1");

  // Remove italic markers
  text = text.replace(/_([^_]+)_/g, "$1");

  // Remove strikethrough markers
  text = text.replace(/~([^~]+)~/g, "$1");

  // Remove code blocks
  text = text.replace(/```[\s\S]*?```/g, "[code block]");
  text = text.replace(/`([^`]+)`/g, "$1");

  // Convert links
  text = text.replace(/<([^|>]+)\|([^>]+)>/g, "$2");
  text = text.replace(/<([^>]+)>/g, "$1");

  // Remove emoji shortcodes (keep text)
  text = text.replace(/:([a-z0-9_+-]+):/g, "[$1]");

  return text.trim();
}

/**
 * Convert Slack mrkdwn to HTML
 */
export function convertMrkdwnToHtml(mrkdwn: string): string {
  let html = escapeHtml(mrkdwn);

  // Bold
  html = html.replace(/\*([^*]+)\*/g, "<strong>$1</strong>");

  // Italic
  html = html.replace(/_([^_]+)_/g, "<em>$1</em>");

  // Strikethrough
  html = html.replace(/~([^~]+)~/g, "<del>$1</del>");

  // Code blocks
  html = html.replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>");
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Links
  html = html.replace(
    /&lt;([^|&]+)\|([^&]+)&gt;/g,
    '<a href="$1" target="_blank">$2</a>',
  );
  html = html.replace(
    /&lt;(https?:[^&]+)&gt;/g,
    '<a href="$1" target="_blank">$1</a>',
  );

  // Line breaks
  html = html.replace(/\n/g, "<br>");

  return html;
}

/**
 * Convert HTML to Slack mrkdwn
 */
export function convertHtmlToMrkdwn(html: string): string {
  let mrkdwn = html;

  // Remove HTML tags we can convert
  mrkdwn = mrkdwn.replace(/<strong>([^<]+)<\/strong>/gi, "*$1*");
  mrkdwn = mrkdwn.replace(/<b>([^<]+)<\/b>/gi, "*$1*");
  mrkdwn = mrkdwn.replace(/<em>([^<]+)<\/em>/gi, "_$1_");
  mrkdwn = mrkdwn.replace(/<i>([^<]+)<\/i>/gi, "_$1_");
  mrkdwn = mrkdwn.replace(/<del>([^<]+)<\/del>/gi, "~$1~");
  mrkdwn = mrkdwn.replace(/<s>([^<]+)<\/s>/gi, "~$1~");
  mrkdwn = mrkdwn.replace(/<strike>([^<]+)<\/strike>/gi, "~$1~");
  mrkdwn = mrkdwn.replace(/<code>([^<]+)<\/code>/gi, "`$1`");
  mrkdwn = mrkdwn.replace(/<pre>([^<]+)<\/pre>/gi, "```$1```");
  mrkdwn = mrkdwn.replace(/<a href="([^"]+)"[^>]*>([^<]+)<\/a>/gi, "<$1|$2>");
  mrkdwn = mrkdwn.replace(/<br\s*\/?>/gi, "\n");
  mrkdwn = mrkdwn.replace(/<p>/gi, "");
  mrkdwn = mrkdwn.replace(/<\/p>/gi, "\n");

  // Strip remaining HTML tags
  mrkdwn = mrkdwn.replace(/<[^>]+>/g, "");

  // Decode HTML entities
  mrkdwn = decodeHtmlEntities(mrkdwn);

  return mrkdwn.trim();
}

// ============================================================================
// Helper Functions
// ============================================================================

function expandUserMentions(
  text: string,
  users: Map<string, SlackUser>,
): string {
  return text.replace(/<@([A-Z0-9]+)>/g, (_, userId) => {
    const user = users.get(userId);
    return user ? `@${user.real_name || user.name}` : `@${userId}`;
  });
}

function expandUserMentionsHtml(
  text: string,
  users: Map<string, SlackUser>,
): string {
  return text.replace(/<@([A-Z0-9]+)>/g, (_, userId) => {
    const user = users.get(userId);
    const name = user?.real_name || user?.name || userId;
    return `<span class="mention" data-user-id="${userId}">@${name}</span>`;
  });
}

function expandChannelMentions(
  text: string,
  channels: Map<string, SlackChannel>,
): string {
  return text.replace(
    /<#([A-Z0-9]+)\|?([^>]*)>/g,
    (_, channelId, channelName) => {
      const channel = channels.get(channelId);
      return `#${channelName || channel?.name || channelId}`;
    },
  );
}

function expandChannelMentionsHtml(
  text: string,
  channels: Map<string, SlackChannel>,
): string {
  return text.replace(
    /<#([A-Z0-9]+)\|?([^>]*)>/g,
    (_, channelId, channelName) => {
      const channel = channels.get(channelId);
      const name = channelName || channel?.name || channelId;
      return `<span class="channel-mention" data-channel-id="${channelId}">#${name}</span>`;
    },
  );
}

function tsToISOString(ts: string): string {
  const timestamp = parseFloat(ts) * 1000;
  return new Date(timestamp).toISOString();
}

function getFileType(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.includes("pdf")) return "pdf";
  return "file";
}

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

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}
