/**
 * Discord Message Formatter
 *
 * Formats messages between Discord and the chat platform.
 * Handles embeds, markdown conversion, and notification formatting.
 */

import type {
  DiscordUser,
  DiscordGuild,
  DiscordChannel,
  DiscordMessage,
} from "../types";

import type {
  DiscordEmbed,
  DiscordComponent,
  DiscordGatewayEventType,
} from "./types";

// ============================================================================
// Types
// ============================================================================

export interface FormattedDiscordNotification {
  title: string;
  body: string;
  url?: string;
  icon: DiscordNotificationIcon;
  color: DiscordNotificationColor;
  timestamp: string;
  metadata: DiscordNotificationMetadata;
}

export type DiscordNotificationIcon =
  | "message"
  | "mention"
  | "reply"
  | "reaction"
  | "thread"
  | "voice"
  | "member-join"
  | "member-leave"
  | "channel"
  | "role"
  | "server"
  | "discord";

export type DiscordNotificationColor =
  | "green" // success, join
  | "blue" // info, message
  | "purple" // discord brand
  | "red" // error, leave
  | "yellow" // warning
  | "gray"; // neutral

export interface DiscordNotificationMetadata {
  eventType: string;
  guildId?: string;
  guildName?: string;
  channelId?: string;
  channelName?: string;
  userId?: string;
  userName?: string;
  userAvatarUrl?: string;
  messageId?: string;
}

// ============================================================================
// Gateway Event Formatting
// ============================================================================

/**
 * Format a Discord gateway event into a notification
 */
export function formatDiscordNotification(
  eventType: DiscordGatewayEventType,
  data: Record<string, unknown>,
): FormattedDiscordNotification {
  switch (eventType) {
    case "MESSAGE_CREATE":
      return formatMessageCreate(
        data as { message: DiscordMessage; guild?: DiscordGuild },
      );
    case "MESSAGE_UPDATE":
      return formatMessageUpdate(
        data as { message: DiscordMessage; guild?: DiscordGuild },
      );
    case "MESSAGE_DELETE":
      return formatMessageDelete(data);
    case "MESSAGE_REACTION_ADD":
      return formatReactionAdd(data);
    case "MESSAGE_REACTION_REMOVE":
      return formatReactionRemove(data);
    case "GUILD_MEMBER_ADD":
      return formatMemberAdd(data);
    case "GUILD_MEMBER_REMOVE":
      return formatMemberRemove(data);
    case "CHANNEL_CREATE":
      return formatChannelCreate(data);
    case "CHANNEL_DELETE":
      return formatChannelDelete(data);
    case "GUILD_ROLE_CREATE":
      return formatRoleCreate(data);
    case "GUILD_ROLE_DELETE":
      return formatRoleDelete(data);
    default:
      return formatUnknownEvent(eventType, data);
  }
}

/**
 * Format MESSAGE_CREATE event
 */
function formatMessageCreate(data: {
  message: DiscordMessage;
  guild?: DiscordGuild;
}): FormattedDiscordNotification {
  const { message, guild } = data;
  const author = message.author;

  return {
    title: "New Message",
    body: message.content
      ? truncate(convertDiscordMarkdownToPlainText(message.content), 150)
      : "[Attachment or embed]",
    url: guild
      ? `https://discord.com/channels/${guild.id}/${message.channel_id}/${message.id}`
      : undefined,
    icon: "message",
    color: "blue",
    timestamp: message.timestamp,
    metadata: {
      eventType: "MESSAGE_CREATE",
      guildId: guild?.id,
      guildName: guild?.name,
      channelId: message.channel_id,
      userId: author.id,
      userName: author.username,
      userAvatarUrl: author.avatar
        ? `https://cdn.discordapp.com/avatars/${author.id}/${author.avatar}.png`
        : undefined,
      messageId: message.id,
    },
  };
}

/**
 * Format MESSAGE_UPDATE event
 */
function formatMessageUpdate(data: {
  message: DiscordMessage;
  guild?: DiscordGuild;
}): FormattedDiscordNotification {
  const { message, guild } = data;
  const author = message.author;

  return {
    title: "Message Edited",
    body: message.content
      ? truncate(convertDiscordMarkdownToPlainText(message.content), 150)
      : "[Message edited]",
    url: guild
      ? `https://discord.com/channels/${guild.id}/${message.channel_id}/${message.id}`
      : undefined,
    icon: "message",
    color: "yellow",
    timestamp: message.edited_timestamp || message.timestamp,
    metadata: {
      eventType: "MESSAGE_UPDATE",
      guildId: guild?.id,
      guildName: guild?.name,
      channelId: message.channel_id,
      userId: author.id,
      userName: author.username,
      userAvatarUrl: author.avatar
        ? `https://cdn.discordapp.com/avatars/${author.id}/${author.avatar}.png`
        : undefined,
      messageId: message.id,
    },
  };
}

/**
 * Format MESSAGE_DELETE event
 */
function formatMessageDelete(
  data: Record<string, unknown>,
): FormattedDiscordNotification {
  return {
    title: "Message Deleted",
    body: "A message was deleted",
    icon: "message",
    color: "red",
    timestamp: new Date().toISOString(),
    metadata: {
      eventType: "MESSAGE_DELETE",
      guildId: data.guild_id as string | undefined,
      channelId: data.channel_id as string | undefined,
      messageId: data.id as string | undefined,
    },
  };
}

/**
 * Format MESSAGE_REACTION_ADD event
 */
function formatReactionAdd(
  data: Record<string, unknown>,
): FormattedDiscordNotification {
  const emoji = data.emoji as { name: string; id?: string } | undefined;
  const emojiDisplay = emoji?.id
    ? `<:${emoji.name}:${emoji.id}>`
    : emoji?.name || "reaction";

  return {
    title: "Reaction Added",
    body: `Added ${emojiDisplay}`,
    icon: "reaction",
    color: "green",
    timestamp: new Date().toISOString(),
    metadata: {
      eventType: "MESSAGE_REACTION_ADD",
      guildId: data.guild_id as string | undefined,
      channelId: data.channel_id as string | undefined,
      userId: data.user_id as string | undefined,
      messageId: data.message_id as string | undefined,
    },
  };
}

/**
 * Format MESSAGE_REACTION_REMOVE event
 */
function formatReactionRemove(
  data: Record<string, unknown>,
): FormattedDiscordNotification {
  const emoji = data.emoji as { name: string; id?: string } | undefined;
  const emojiDisplay = emoji?.id
    ? `<:${emoji.name}:${emoji.id}>`
    : emoji?.name || "reaction";

  return {
    title: "Reaction Removed",
    body: `Removed ${emojiDisplay}`,
    icon: "reaction",
    color: "gray",
    timestamp: new Date().toISOString(),
    metadata: {
      eventType: "MESSAGE_REACTION_REMOVE",
      guildId: data.guild_id as string | undefined,
      channelId: data.channel_id as string | undefined,
      userId: data.user_id as string | undefined,
      messageId: data.message_id as string | undefined,
    },
  };
}

/**
 * Format GUILD_MEMBER_ADD event
 */
function formatMemberAdd(
  data: Record<string, unknown>,
): FormattedDiscordNotification {
  const user = data.user as DiscordUser | undefined;

  return {
    title: "Member Joined",
    body: user ? `${user.username} joined the server` : "A new member joined",
    icon: "member-join",
    color: "green",
    timestamp: new Date().toISOString(),
    metadata: {
      eventType: "GUILD_MEMBER_ADD",
      guildId: data.guild_id as string | undefined,
      userId: user?.id,
      userName: user?.username,
      userAvatarUrl: user?.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
        : undefined,
    },
  };
}

/**
 * Format GUILD_MEMBER_REMOVE event
 */
function formatMemberRemove(
  data: Record<string, unknown>,
): FormattedDiscordNotification {
  const user = data.user as DiscordUser | undefined;

  return {
    title: "Member Left",
    body: user ? `${user.username} left the server` : "A member left",
    icon: "member-leave",
    color: "red",
    timestamp: new Date().toISOString(),
    metadata: {
      eventType: "GUILD_MEMBER_REMOVE",
      guildId: data.guild_id as string | undefined,
      userId: user?.id,
      userName: user?.username,
    },
  };
}

/**
 * Format CHANNEL_CREATE event
 */
function formatChannelCreate(
  data: Record<string, unknown>,
): FormattedDiscordNotification {
  const channel = data as { name?: string; guild_id?: string; id?: string };

  return {
    title: "Channel Created",
    body: channel.name
      ? `#${channel.name} was created`
      : "A new channel was created",
    icon: "channel",
    color: "green",
    timestamp: new Date().toISOString(),
    metadata: {
      eventType: "CHANNEL_CREATE",
      guildId: channel.guild_id,
      channelId: channel.id,
      channelName: channel.name,
    },
  };
}

/**
 * Format CHANNEL_DELETE event
 */
function formatChannelDelete(
  data: Record<string, unknown>,
): FormattedDiscordNotification {
  const channel = data as { name?: string; guild_id?: string; id?: string };

  return {
    title: "Channel Deleted",
    body: channel.name
      ? `#${channel.name} was deleted`
      : "A channel was deleted",
    icon: "channel",
    color: "red",
    timestamp: new Date().toISOString(),
    metadata: {
      eventType: "CHANNEL_DELETE",
      guildId: channel.guild_id,
      channelId: channel.id,
      channelName: channel.name,
    },
  };
}

/**
 * Format GUILD_ROLE_CREATE event
 */
function formatRoleCreate(
  data: Record<string, unknown>,
): FormattedDiscordNotification {
  const role = data.role as { name?: string; id?: string } | undefined;

  return {
    title: "Role Created",
    body: role?.name ? `@${role.name} was created` : "A new role was created",
    icon: "role",
    color: "green",
    timestamp: new Date().toISOString(),
    metadata: {
      eventType: "GUILD_ROLE_CREATE",
      guildId: data.guild_id as string | undefined,
    },
  };
}

/**
 * Format GUILD_ROLE_DELETE event
 */
function formatRoleDelete(
  data: Record<string, unknown>,
): FormattedDiscordNotification {
  return {
    title: "Role Deleted",
    body: "A role was deleted",
    icon: "role",
    color: "red",
    timestamp: new Date().toISOString(),
    metadata: {
      eventType: "GUILD_ROLE_DELETE",
      guildId: data.guild_id as string | undefined,
    },
  };
}

/**
 * Format unknown event
 */
function formatUnknownEvent(
  eventType: string,
  data: Record<string, unknown>,
): FormattedDiscordNotification {
  return {
    title: `Discord Event: ${eventType}`,
    body: "An event occurred in Discord",
    icon: "discord",
    color: "gray",
    timestamp: new Date().toISOString(),
    metadata: {
      eventType,
      guildId: data.guild_id as string | undefined,
      channelId: data.channel_id as string | undefined,
    },
  };
}

// ============================================================================
// Message Conversion (Discord -> Chat)
// ============================================================================

/**
 * Convert Discord message to chat message format
 */
export function convertDiscordMessageToChat(
  message: DiscordMessage,
  guild?: DiscordGuild,
): {
  content: string;
  html: string;
  author: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  timestamp: string;
  attachments?: Array<{
    type: string;
    url: string;
    name: string;
    size?: number;
    proxyUrl?: string;
  }>;
  embeds?: Array<{
    title?: string;
    description?: string;
    url?: string;
    color?: string;
    fields?: Array<{ name: string; value: string; inline?: boolean }>;
  }>;
} {
  const author = message.author;

  return {
    content: convertDiscordMarkdownToPlainText(message.content),
    html: convertDiscordMarkdownToHtml(message.content),
    author: {
      id: author.id,
      name: author.username,
      avatarUrl: author.avatar
        ? `https://cdn.discordapp.com/avatars/${author.id}/${author.avatar}.png`
        : undefined,
    },
    timestamp: message.timestamp,
    attachments: message.attachments.map((att) => ({
      type: getAttachmentType(att.filename),
      url: att.url,
      name: att.filename,
      size: att.size,
      proxyUrl: att.proxy_url,
    })),
    embeds: message.embeds.map((embed) => ({
      title: (embed as DiscordEmbed).title,
      description: (embed as DiscordEmbed).description,
      url: (embed as DiscordEmbed).url,
      color: (embed as DiscordEmbed).color
        ? `#${(embed as DiscordEmbed).color!.toString(16).padStart(6, "0")}`
        : undefined,
      fields: (embed as DiscordEmbed).fields,
    })),
  };
}

// ============================================================================
// Message Conversion (Chat -> Discord)
// ============================================================================

/**
 * Convert chat message to Discord message format
 */
export function convertChatMessageToDiscord(
  content: string,
  options?: {
    username?: string;
    avatarUrl?: string;
    embeds?: DiscordEmbed[];
    components?: DiscordComponent[];
  },
): {
  content: string;
  username?: string;
  avatar_url?: string;
  embeds?: DiscordEmbed[];
  components?: DiscordComponent[];
} {
  return {
    content: convertHtmlToDiscordMarkdown(content),
    username: options?.username,
    avatar_url: options?.avatarUrl,
    embeds: options?.embeds,
    components: options?.components,
  };
}

// ============================================================================
// Embed Builders
// ============================================================================

/**
 * Build a simple embed
 */
export function buildEmbed(options: {
  title?: string;
  description?: string;
  url?: string;
  color?: number | string;
  timestamp?: string | Date;
  footer?: { text: string; icon_url?: string };
  author?: { name: string; url?: string; icon_url?: string };
  thumbnail?: { url: string };
  image?: { url: string };
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
}): DiscordEmbed {
  const embed: DiscordEmbed = {
    type: "rich",
  };

  if (options.title) embed.title = options.title;
  if (options.description) embed.description = options.description;
  if (options.url) embed.url = options.url;
  if (options.color) {
    embed.color =
      typeof options.color === "string"
        ? parseInt(options.color.replace("#", ""), 16)
        : options.color;
  }
  if (options.timestamp) {
    embed.timestamp =
      options.timestamp instanceof Date
        ? options.timestamp.toISOString()
        : options.timestamp;
  }
  if (options.footer) embed.footer = options.footer;
  if (options.author) embed.author = options.author;
  if (options.thumbnail) embed.thumbnail = options.thumbnail;
  if (options.image) embed.image = options.image;
  if (options.fields) embed.fields = options.fields;

  return embed;
}

// ============================================================================
// Markdown Conversion
// ============================================================================

/**
 * Convert Discord markdown to plain text
 */
export function convertDiscordMarkdownToPlainText(markdown: string): string {
  let text = markdown;

  // Remove bold
  text = text.replace(/\*\*([^*]+)\*\*/g, "$1");

  // Remove italic
  text = text.replace(/\*([^*]+)\*/g, "$1");
  text = text.replace(/_([^_]+)_/g, "$1");

  // Remove underline
  text = text.replace(/__([^_]+)__/g, "$1");

  // Remove strikethrough
  text = text.replace(/~~([^~]+)~~/g, "$1");

  // Remove spoilers
  text = text.replace(/\|\|([^|]+)\|\|/g, "[spoiler]");

  // Remove code blocks
  text = text.replace(/```[\s\S]*?```/g, "[code block]");
  text = text.replace(/`([^`]+)`/g, "$1");

  // Convert user mentions
  text = text.replace(/<@!?(\d+)>/g, "@user");

  // Convert channel mentions
  text = text.replace(/<#(\d+)>/g, "#channel");

  // Convert role mentions
  text = text.replace(/<@&(\d+)>/g, "@role");

  // Convert custom emoji
  text = text.replace(/<a?:(\w+):\d+>/g, ":$1:");

  return text.trim();
}

/**
 * Convert Discord markdown to HTML
 */
export function convertDiscordMarkdownToHtml(markdown: string): string {
  let html = escapeHtml(markdown);

  // Bold
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  // Italic
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  html = html.replace(/_([^_]+)_/g, "<em>$1</em>");

  // Underline
  html = html.replace(/__([^_]+)__/g, "<u>$1</u>");

  // Strikethrough
  html = html.replace(/~~([^~]+)~~/g, "<del>$1</del>");

  // Spoilers
  html = html.replace(/\|\|([^|]+)\|\|/g, '<span class="spoiler">$1</span>');

  // Code blocks
  html = html.replace(
    /```(\w*)\n?([\s\S]*?)```/g,
    '<pre><code class="language-$1">$2</code></pre>',
  );
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Line breaks
  html = html.replace(/\n/g, "<br>");

  return html;
}

/**
 * Convert HTML to Discord markdown
 */
export function convertHtmlToDiscordMarkdown(html: string): string {
  let markdown = html;

  // Convert tags
  markdown = markdown.replace(/<strong>([^<]+)<\/strong>/gi, "**$1**");
  markdown = markdown.replace(/<b>([^<]+)<\/b>/gi, "**$1**");
  markdown = markdown.replace(/<em>([^<]+)<\/em>/gi, "*$1*");
  markdown = markdown.replace(/<i>([^<]+)<\/i>/gi, "*$1*");
  markdown = markdown.replace(/<u>([^<]+)<\/u>/gi, "__$1__");
  markdown = markdown.replace(/<del>([^<]+)<\/del>/gi, "~~$1~~");
  markdown = markdown.replace(/<s>([^<]+)<\/s>/gi, "~~$1~~");
  markdown = markdown.replace(/<code>([^<]+)<\/code>/gi, "`$1`");
  markdown = markdown.replace(/<pre>([^<]+)<\/pre>/gi, "```$1```");
  markdown = markdown.replace(
    /<a href="([^"]+)"[^>]*>([^<]+)<\/a>/gi,
    "[$2]($1)",
  );
  markdown = markdown.replace(/<br\s*\/?>/gi, "\n");
  markdown = markdown.replace(/<p>/gi, "");
  markdown = markdown.replace(/<\/p>/gi, "\n");

  // Strip remaining HTML tags
  markdown = markdown.replace(/<[^>]+>/g, "");

  // Decode entities
  markdown = decodeHtmlEntities(markdown);

  return markdown.trim();
}

// ============================================================================
// Helper Functions
// ============================================================================

function getAttachmentType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext || "")) return "image";
  if (["mp4", "webm", "mov"].includes(ext || "")) return "video";
  if (["mp3", "wav", "ogg"].includes(ext || "")) return "audio";
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

// ============================================================================
// Discord Color Utilities
// ============================================================================

/**
 * Convert hex color to Discord integer format
 */
export function hexToDiscordColor(hex: string): number {
  return parseInt(hex.replace("#", ""), 16);
}

/**
 * Convert Discord integer color to hex
 */
export function discordColorToHex(color: number): string {
  return "#" + color.toString(16).padStart(6, "0");
}

/**
 * Discord brand colors
 */
export const DISCORD_COLORS = {
  blurple: 0x5865f2,
  green: 0x57f287,
  yellow: 0xfee75c,
  fuchsia: 0xeb459e,
  red: 0xed4245,
  white: 0xffffff,
  black: 0x23272a,
} as const;
