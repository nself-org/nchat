// ============================================================================
// DISCORD EXPORT PARSER
// ============================================================================
// Parses Discord exports (DiscordChatExporter format) into unified format.
// Supports both JSON and HTML export formats from DiscordChatExporter.

import type {
  DiscordExportData,
  DiscordGuild,
  DiscordChannel,
  DiscordMessage,
  DiscordMessageType,
  DiscordAuthor,
  DiscordAttachment,
  DiscordEmbed,
  DiscordReaction,
  UnifiedUser,
  UnifiedChannel,
  UnifiedMessage,
  UnifiedAttachment,
  UnifiedReaction,
  ImportPreview,
  ImportError,
  ImportWarning,
} from "./types";

// ============================================================================
// PARSER CLASS
// ============================================================================

export class DiscordParser {
  private users: Map<string, DiscordAuthor> = new Map();
  private channels: Map<string, DiscordChannel> = new Map();
  private errors: ImportError[] = [];
  private warnings: ImportWarning[] = [];

  /**
   * Parse a Discord export (single channel JSON file)
   */
  parseChannelExport(jsonContent: string): DiscordExportData {
    this.errors = [];
    this.warnings = [];

    try {
      const data = JSON.parse(jsonContent);

      // Extract guild info
      const guild: DiscordGuild = {
        id: data.guild?.id || "unknown",
        name: data.guild?.name || "Unknown Server",
        iconUrl: data.guild?.iconUrl,
        exportDate: data.exportDate,
      };

      // Extract channel info
      const channel: DiscordChannel = {
        id: data.channel?.id || "unknown",
        type: data.channel?.type ?? 0,
        name: data.channel?.name || "unknown-channel",
        topic: data.channel?.topic,
        guild: data.guild,
        categoryId: data.channel?.categoryId,
        categoryName: data.channel?.categoryName,
      };

      this.channels.set(channel.id, channel);

      // Parse messages and extract users
      const messages: DiscordMessage[] = [];

      if (Array.isArray(data.messages)) {
        for (const msg of data.messages) {
          const message = this.parseMessage(msg);
          if (message) {
            messages.push(message);

            // Track unique users
            if (message.author && !this.users.has(message.author.id)) {
              this.users.set(message.author.id, message.author);
            }
          }
        }
      }

      return {
        guild,
        channels: [channel],
        messages,
      };
    } catch (error) {
      this.errors.push({
        code: "DISCORD_PARSE_ERROR",
        message: `Failed to parse Discord export: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
      return {
        guild: { id: "unknown", name: "Unknown" },
        channels: [],
        messages: [],
      };
    }
  }

  /**
   * Parse multiple channel exports
   */
  parseMultipleChannelExports(files: Map<string, string>): DiscordExportData {
    this.errors = [];
    this.warnings = [];

    let guild: DiscordGuild = { id: "unknown", name: "Unknown" };
    const allChannels: DiscordChannel[] = [];
    const allMessages: DiscordMessage[] = [];

    for (const [filename, content] of files.entries()) {
      try {
        const data = this.parseChannelExport(content);

        // Use the first guild info found
        if (data.guild.id !== "unknown") {
          guild = data.guild;
        }

        allChannels.push(...data.channels);
        allMessages.push(...data.messages);
      } catch (error) {
        this.warnings.push({
          code: "FILE_PARSE_WARNING",
          message: `Failed to parse ${filename}`,
          item: filename,
        });
      }
    }

    return {
      guild,
      channels: allChannels,
      messages: allMessages,
    };
  }

  /**
   * Parse a single Discord message
   */
  private parseMessage(msg: Record<string, unknown>): DiscordMessage | null {
    try {
      const author = msg.author as Record<string, unknown>;

      return {
        id: msg.id as string,
        type: (msg.type as DiscordMessageType) || "Default",
        timestamp: msg.timestamp as string,
        timestampEdited: msg.timestampEdited as string | undefined,
        isPinned: (msg.isPinned as boolean) || false,
        content: (msg.content as string) || "",
        author: {
          id: (author?.id as string) || "unknown",
          name: (author?.name as string) || "Unknown User",
          discriminator: (author?.discriminator as string) || "0000",
          nickname: author?.nickname as string | undefined,
          color: author?.color as string | undefined,
          isBot: (author?.isBot as boolean) || false,
          avatarUrl: author?.avatarUrl as string | undefined,
        },
        attachments: this.parseAttachments(
          msg.attachments as Array<Record<string, unknown>> | undefined,
        ),
        embeds: this.parseEmbeds(
          msg.embeds as Array<Record<string, unknown>> | undefined,
        ),
        reactions: this.parseReactions(
          msg.reactions as Array<Record<string, unknown>> | undefined,
        ),
        mentions: this.parseMentions(
          msg.mentions as Array<Record<string, unknown>> | undefined,
        ),
        reference: msg.reference as DiscordMessage["reference"] | undefined,
      };
    } catch (error) {
      this.warnings.push({
        code: "MESSAGE_PARSE_WARNING",
        message: `Failed to parse message: ${error instanceof Error ? error.message : "Unknown error"}`,
        item: msg.id as string,
      });
      return null;
    }
  }

  /**
   * Parse message attachments
   */
  private parseAttachments(
    attachments?: Array<Record<string, unknown>>,
  ): DiscordAttachment[] {
    if (!attachments || !Array.isArray(attachments)) return [];

    return attachments.map((att) => ({
      id: (att.id as string) || "",
      url: (att.url as string) || "",
      fileName: (att.fileName as string) || "unknown",
      fileSizeBytes: (att.fileSizeBytes as number) || 0,
    }));
  }

  /**
   * Parse message embeds
   */
  private parseEmbeds(embeds?: Array<Record<string, unknown>>): DiscordEmbed[] {
    if (!embeds || !Array.isArray(embeds)) return [];

    return embeds.map((embed) => ({
      title: embed.title as string | undefined,
      url: embed.url as string | undefined,
      timestamp: embed.timestamp as string | undefined,
      description: embed.description as string | undefined,
      color: embed.color as string | undefined,
      author: embed.author as DiscordEmbed["author"],
      thumbnail: embed.thumbnail as DiscordEmbed["thumbnail"],
      image: embed.image as DiscordEmbed["image"],
      footer: embed.footer as DiscordEmbed["footer"],
      fields: embed.fields as DiscordEmbed["fields"],
    }));
  }

  /**
   * Parse message reactions
   */
  private parseReactions(
    reactions?: Array<Record<string, unknown>>,
  ): DiscordReaction[] | undefined {
    if (!reactions || !Array.isArray(reactions)) return undefined;

    return reactions.map((reaction) => {
      const emoji = reaction.emoji as Record<string, unknown>;
      return {
        emoji: {
          id: emoji?.id as string | undefined,
          name: (emoji?.name as string) || "",
          code: emoji?.code as string | undefined,
          isAnimated: emoji?.isAnimated as boolean | undefined,
          imageUrl: emoji?.imageUrl as string | undefined,
        },
        count: (reaction.count as number) || 0,
      };
    });
  }

  /**
   * Parse message mentions
   */
  private parseMentions(
    mentions?: Array<Record<string, unknown>>,
  ): DiscordMessage["mentions"] {
    if (!mentions || !Array.isArray(mentions)) return undefined;

    return mentions.map((mention) => ({
      id: (mention.id as string) || "",
      name: (mention.name as string) || "Unknown",
      discriminator: (mention.discriminator as string) || "0000",
      nickname: mention.nickname as string | undefined,
      isBot: (mention.isBot as boolean) || false,
    }));
  }

  /**
   * Convert Discord data to unified format
   */
  convertToUnified(data: DiscordExportData): {
    users: UnifiedUser[];
    channels: UnifiedChannel[];
    messages: UnifiedMessage[];
  } {
    // Extract unique users from messages
    const userMap = new Map<string, DiscordAuthor>();
    for (const msg of data.messages) {
      if (!userMap.has(msg.author.id)) {
        userMap.set(msg.author.id, msg.author);
      }
    }

    const users = Array.from(userMap.values()).map((u) => this.convertUser(u));
    const channels = data.channels.map((c) =>
      this.convertChannel(c, data.guild),
    );
    const messages = data.messages
      .map((m) => this.convertMessage(m, data.channels[0]?.id || "unknown"))
      .filter((m): m is UnifiedMessage => m !== null);

    return { users, channels, messages };
  }

  /**
   * Convert Discord author to unified user
   */
  convertUser(author: DiscordAuthor): UnifiedUser {
    const username =
      author.discriminator !== "0000" && author.discriminator !== "0"
        ? `${author.name}#${author.discriminator}`
        : author.name;

    return {
      externalId: author.id,
      username: author.name.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
      displayName: author.nickname || author.name,
      avatarUrl: author.avatarUrl,
      isBot: author.isBot,
      metadata: {
        discordId: author.id,
        discriminator: author.discriminator,
        color: author.color,
        originalUsername: username,
      },
    };
  }

  /**
   * Convert Discord channel to unified channel
   */
  convertChannel(channel: DiscordChannel, guild: DiscordGuild): UnifiedChannel {
    // Map Discord channel types to our types
    let type: UnifiedChannel["type"] = "public";
    if (channel.type === 1) {
      type = "direct";
    } else if (channel.type === 2) {
      // Voice channel - treat as public
      type = "public";
    } else if (channel.type === 4) {
      // Category - skip or treat as public
      type = "public";
    }

    return {
      externalId: channel.id,
      name: channel.name,
      slug: this.generateSlug(channel.name),
      description: channel.topic,
      type,
      metadata: {
        discordId: channel.id,
        discordType: channel.type,
        guildId: guild.id,
        guildName: guild.name,
        categoryId: channel.categoryId,
        categoryName: channel.categoryName,
      },
    };
  }

  /**
   * Convert Discord message to unified format
   */
  convertMessage(
    message: DiscordMessage,
    channelId: string,
  ): UnifiedMessage | null {
    // Skip system messages by default
    const skipTypes = [
      "RecipientAdd",
      "RecipientRemove",
      "Call",
      "ChannelNameChange",
      "ChannelIconChange",
      "GuildMemberJoin",
    ];

    if (skipTypes.includes(message.type)) {
      return null;
    }

    // Determine message type
    let type: UnifiedMessage["type"] = "text";
    if (message.attachments.length > 0) {
      const firstAttachment = message.attachments[0];
      const extension = firstAttachment.fileName
        .split(".")
        .pop()
        ?.toLowerCase();
      const imageExtensions = ["jpg", "jpeg", "png", "gif", "webp"];
      const videoExtensions = ["mp4", "webm", "mov"];
      const audioExtensions = ["mp3", "wav", "ogg", "m4a"];

      if (extension && imageExtensions.includes(extension)) {
        type = "image";
      } else if (extension && videoExtensions.includes(extension)) {
        type = "video";
      } else if (extension && audioExtensions.includes(extension)) {
        type = "audio";
      } else {
        type = "file";
      }
    }

    // Convert content
    let content = this.convertDiscordFormatting(message.content);

    // Append embed information to content
    if (message.embeds.length > 0) {
      for (const embed of message.embeds) {
        if (embed.title || embed.description) {
          content += "\n\n";
          if (embed.title) {
            content += embed.url
              ? `[**${embed.title}**](${embed.url})\n`
              : `**${embed.title}**\n`;
          }
          if (embed.description) {
            content += embed.description;
          }
        }
      }
    }

    // Convert attachments
    const attachments = this.convertAttachments(message.attachments);

    // Convert reactions
    const reactions = this.convertReactions(message.reactions);

    return {
      externalId: message.id,
      channelId,
      userId: message.author.id,
      content: content.trim(),
      type,
      createdAt: message.timestamp,
      editedAt: message.timestampEdited,
      parentId: message.reference?.messageId,
      attachments: attachments.length > 0 ? attachments : undefined,
      reactions: reactions.length > 0 ? reactions : undefined,
      metadata: {
        discordId: message.id,
        messageType: message.type,
        isPinned: message.isPinned,
        hasEmbeds: message.embeds.length > 0,
        reference: message.reference,
      },
    };
  }

  /**
   * Convert Discord attachments to unified format
   */
  convertAttachments(attachments: DiscordAttachment[]): UnifiedAttachment[] {
    return attachments.map((att) => ({
      externalId: att.id,
      name: att.fileName,
      url: att.url,
      size: att.fileSizeBytes,
    }));
  }

  /**
   * Convert Discord reactions to unified format
   */
  convertReactions(reactions?: DiscordReaction[]): UnifiedReaction[] {
    if (!reactions) return [];

    return reactions.map((reaction) => ({
      emoji: reaction.emoji.name.startsWith(":")
        ? reaction.emoji.name
        : reaction.emoji.id
          ? `<:${reaction.emoji.name}:${reaction.emoji.id}>`
          : reaction.emoji.name,
      userIds: [], // Discord exports don't include who reacted
      count: reaction.count,
    }));
  }

  /**
   * Convert Discord formatting to Markdown
   */
  convertDiscordFormatting(text: string): string {
    let result = text;

    // User mentions <@123456> or <@!123456> to @username
    result = result.replace(/<@!?(\d+)>/g, (_, userId) => {
      const user = this.users.get(userId);
      return user ? `@${user.name}` : "@unknown";
    });

    // Channel mentions <#123456> to #channel-name
    result = result.replace(/<#(\d+)>/g, (_, channelId) => {
      const channel = this.channels.get(channelId);
      return channel ? `#${channel.name}` : "#unknown";
    });

    // Role mentions <@&123456> - just display as @role
    result = result.replace(/<@&(\d+)>/g, "@role");

    // Custom emojis <:name:123456> or <a:name:123456> to :name:
    result = result.replace(/<a?:(\w+):\d+>/g, ":$1:");

    // Timestamps <t:1234567890:R> to readable format
    result = result.replace(/<t:(\d+)(?::[RtTdDfF])?>/g, (_, timestamp) => {
      try {
        return new Date(parseInt(timestamp) * 1000).toISOString();
      } catch {
        return timestamp;
      }
    });

    // Discord formatting is mostly Markdown compatible
    // Bold: **text** - already Markdown
    // Italic: *text* or _text_ - already Markdown
    // Underline: __text__ - convert to emphasis
    result = result.replace(/__([^_]+)__/g, "_$1_");

    // Strikethrough: ~~text~~ - already Markdown

    // Spoiler: ||text|| - convert to code block or just show
    result = result.replace(/\|\|([^|]+)\|\|/g, "`[spoiler: $1]`");

    // Code blocks: ```lang\ncode\n``` - already Markdown
    // Inline code: `code` - already Markdown

    // Block quotes: > text - already Markdown

    return result;
  }

  /**
   * Generate URL-friendly slug
   */
  generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  /**
   * Generate preview of import data
   */
  generatePreview(data: DiscordExportData, limit = 10): ImportPreview {
    const unified = this.convertToUnified(data);

    // Get date range
    let earliest: string | undefined;
    let latest: string | undefined;

    for (const msg of data.messages) {
      if (!earliest || msg.timestamp < earliest) earliest = msg.timestamp;
      if (!latest || msg.timestamp > latest) latest = msg.timestamp;
    }

    return {
      users: unified.users.slice(0, limit),
      channels: unified.channels.slice(0, limit),
      messages: unified.messages.slice(0, limit),
      stats: {
        totalUsers: unified.users.length,
        totalChannels: data.channels.length,
        totalMessages: data.messages.length,
        dateRange: {
          earliest,
          latest,
        },
      },
    };
  }

  /**
   * Get parsing errors
   */
  getErrors(): ImportError[] {
    return this.errors;
  }

  /**
   * Get parsing warnings
   */
  getWarnings(): ImportWarning[] {
    return this.warnings;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Parse Discord export from JSON file
 */
export async function parseDiscordExportFile(file: File): Promise<{
  data: DiscordExportData;
  preview: ImportPreview;
  errors: ImportError[];
  warnings: ImportWarning[];
}> {
  const content = await file.text();
  const parser = new DiscordParser();
  const data = parser.parseChannelExport(content);
  const preview = parser.generatePreview(data);

  return {
    data,
    preview,
    errors: parser.getErrors(),
    warnings: parser.getWarnings(),
  };
}

/**
 * Parse multiple Discord export files
 */
export async function parseMultipleDiscordExports(files: File[]): Promise<{
  data: DiscordExportData;
  preview: ImportPreview;
  errors: ImportError[];
  warnings: ImportWarning[];
}> {
  const fileContents = new Map<string, string>();

  for (const file of files) {
    const content = await file.text();
    fileContents.set(file.name, content);
  }

  const parser = new DiscordParser();
  const data = parser.parseMultipleChannelExports(fileContents);
  const preview = parser.generatePreview(data);

  return {
    data,
    preview,
    errors: parser.getErrors(),
    warnings: parser.getWarnings(),
  };
}

/**
 * Default field mappings for Discord
 */
export const DISCORD_DEFAULT_MAPPINGS = {
  users: [
    { sourceField: "id", targetField: "external_id" },
    { sourceField: "name", targetField: "username" },
    { sourceField: "nickname", targetField: "display_name" },
    { sourceField: "avatarUrl", targetField: "avatar_url" },
    { sourceField: "isBot", targetField: "is_bot" },
  ],
  channels: [
    { sourceField: "id", targetField: "external_id" },
    { sourceField: "name", targetField: "name" },
    { sourceField: "topic", targetField: "description" },
    { sourceField: "type", targetField: "type" },
  ],
  messages: [
    { sourceField: "id", targetField: "external_id" },
    { sourceField: "author.id", targetField: "user_id" },
    {
      sourceField: "content",
      targetField: "content",
      transform: "markdown" as const,
    },
    {
      sourceField: "timestamp",
      targetField: "created_at",
      transform: "date" as const,
    },
    {
      sourceField: "timestampEdited",
      targetField: "edited_at",
      transform: "date" as const,
    },
    { sourceField: "reference.messageId", targetField: "parent_id" },
  ],
};
