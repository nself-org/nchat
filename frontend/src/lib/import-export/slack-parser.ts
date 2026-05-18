// ============================================================================
// SLACK EXPORT PARSER
// ============================================================================
// Parses Slack workspace exports into unified format for import into nchat.
// Supports standard Slack export format (ZIP file with JSON files).

import type {
  SlackExportData,
  SlackUser,
  SlackChannel,
  SlackMessage,
  SlackFile,
  SlackReaction,
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

export class SlackParser {
  private users: Map<string, SlackUser> = new Map();
  private channels: Map<string, SlackChannel> = new Map();
  private errors: ImportError[] = [];
  private warnings: ImportWarning[] = [];

  /**
   * Parse a complete Slack export
   */
  async parseExport(files: Map<string, string>): Promise<SlackExportData> {
    this.errors = [];
    this.warnings = [];

    // Parse users.json
    const usersJson = files.get("users.json");
    const users = usersJson ? this.parseUsers(usersJson) : [];

    // Parse channels.json
    const channelsJson = files.get("channels.json");
    const channels = channelsJson ? this.parseChannels(channelsJson) : [];

    // Parse private channels if available
    const groupsJson = files.get("groups.json");
    if (groupsJson) {
      const privateChannels = this.parseChannels(groupsJson, true);
      channels.push(...privateChannels);
    }

    // Parse DMs if available
    const dmsJson = files.get("dms.json");
    if (dmsJson) {
      const dmChannels = this.parseDMChannels(dmsJson);
      channels.push(...dmChannels);
    }

    // Store for reference
    users.forEach((u) => this.users.set(u.id, u));
    channels.forEach((c) => this.channels.set(c.id, c));

    // Parse messages for each channel
    const messagesByChannel: Record<string, SlackMessage[]> = {};

    for (const channel of channels) {
      const channelMessages = this.parseChannelMessages(
        files,
        channel.name,
        channel.id,
      );
      if (channelMessages.length > 0) {
        messagesByChannel[channel.id] = channelMessages;
      }
    }

    return {
      users,
      channels,
      messagesByChannel,
    };
  }

  /**
   * Parse users.json file
   */
  parseUsers(jsonContent: string): SlackUser[] {
    try {
      const data = JSON.parse(jsonContent);
      if (!Array.isArray(data)) {
        this.errors.push({
          code: "INVALID_USERS_FORMAT",
          message: "users.json must contain an array",
        });
        return [];
      }

      return data.map((user: SlackUser) => ({
        id: user.id,
        name: user.name || "unknown",
        real_name: user.real_name,
        profile: user.profile,
        is_admin: user.is_admin,
        is_owner: user.is_owner,
        is_bot: user.is_bot,
        deleted: user.deleted,
        tz: user.tz,
      }));
    } catch (error) {
      this.errors.push({
        code: "USERS_PARSE_ERROR",
        message: `Failed to parse users.json: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
      return [];
    }
  }

  /**
   * Parse channels.json or groups.json file
   */
  parseChannels(jsonContent: string, isPrivate = false): SlackChannel[] {
    try {
      const data = JSON.parse(jsonContent);
      if (!Array.isArray(data)) {
        this.errors.push({
          code: "INVALID_CHANNELS_FORMAT",
          message: "channels.json must contain an array",
        });
        return [];
      }

      return data.map((channel: SlackChannel) => ({
        id: channel.id,
        name: channel.name,
        purpose: channel.purpose,
        topic: channel.topic,
        is_private: isPrivate || channel.is_private,
        is_archived: channel.is_archived,
        is_general: channel.is_general,
        created: channel.created,
        creator: channel.creator,
        members: channel.members,
      }));
    } catch (error) {
      this.errors.push({
        code: "CHANNELS_PARSE_ERROR",
        message: `Failed to parse channels: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
      return [];
    }
  }

  /**
   * Parse DM channels
   */
  parseDMChannels(jsonContent: string): SlackChannel[] {
    try {
      const data = JSON.parse(jsonContent);
      if (!Array.isArray(data)) {
        return [];
      }

      return data.map((dm: { id: string; members?: string[] }) => ({
        id: dm.id,
        name: `dm-${dm.id}`,
        is_private: true,
        members: dm.members,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Parse messages for a specific channel
   */
  parseChannelMessages(
    files: Map<string, string>,
    channelName: string,
    channelId: string,
  ): SlackMessage[] {
    const messages: SlackMessage[] = [];

    // Slack exports messages in daily JSON files within channel folders
    // e.g., general/2024-01-01.json, general/2024-01-02.json
    const channelPrefix = `${channelName}/`;

    for (const [filename, content] of files.entries()) {
      if (filename.startsWith(channelPrefix) && filename.endsWith(".json")) {
        try {
          const dayMessages = JSON.parse(content);
          if (Array.isArray(dayMessages)) {
            messages.push(...dayMessages);
          }
        } catch (error) {
          this.warnings.push({
            code: "MESSAGE_FILE_PARSE_ERROR",
            message: `Failed to parse ${filename}`,
            item: filename,
          });
        }
      }
    }

    // Sort by timestamp
    messages.sort((a, b) => parseFloat(a.ts) - parseFloat(b.ts));

    return messages;
  }

  /**
   * Convert Slack data to unified format
   */
  convertToUnified(data: SlackExportData): {
    users: UnifiedUser[];
    channels: UnifiedChannel[];
    messages: UnifiedMessage[];
  } {
    const users = data.users.map((u) => this.convertUser(u));
    const channels = data.channels.map((c) => this.convertChannel(c));

    const messages: UnifiedMessage[] = [];
    for (const [channelId, channelMessages] of Object.entries(
      data.messagesByChannel,
    )) {
      for (const msg of channelMessages) {
        const unified = this.convertMessage(msg, channelId);
        if (unified) {
          messages.push(unified);
        }
      }
    }

    return { users, channels, messages };
  }

  /**
   * Convert a Slack user to unified format
   */
  convertUser(user: SlackUser): UnifiedUser {
    return {
      externalId: user.id,
      email: user.profile?.email,
      username: user.name,
      displayName: user.profile?.display_name || user.real_name || user.name,
      avatarUrl: user.profile?.image_192 || user.profile?.image_72,
      isBot: user.is_bot,
      isAdmin: user.is_admin || user.is_owner,
      timezone: user.tz,
      metadata: {
        slackId: user.id,
        deleted: user.deleted,
      },
    };
  }

  /**
   * Convert a Slack channel to unified format
   */
  convertChannel(channel: SlackChannel): UnifiedChannel {
    return {
      externalId: channel.id,
      name: channel.name,
      slug: this.generateSlug(channel.name),
      description: channel.purpose?.value,
      topic: channel.topic?.value,
      type: channel.is_private ? "private" : "public",
      isArchived: channel.is_archived,
      createdAt: channel.created
        ? new Date(channel.created * 1000).toISOString()
        : undefined,
      creatorId: channel.creator,
      memberIds: channel.members,
      metadata: {
        slackId: channel.id,
        isGeneral: channel.is_general,
      },
    };
  }

  /**
   * Convert a Slack message to unified format
   */
  convertMessage(
    message: SlackMessage,
    channelId: string,
  ): UnifiedMessage | null {
    // Skip certain message subtypes
    const skipSubtypes = [
      "channel_join",
      "channel_leave",
      "channel_purpose",
      "channel_topic",
      "channel_name",
      "bot_add",
      "bot_remove",
    ];

    if (message.subtype && skipSubtypes.includes(message.subtype)) {
      return null;
    }

    // Handle system messages
    const systemSubtypes = ["me_message", "reminder_add"];
    const isSystem =
      message.subtype && systemSubtypes.includes(message.subtype);

    // Determine message type
    let type: UnifiedMessage["type"] = "text";
    if (isSystem) {
      type = "system";
    } else if (message.files?.length) {
      const firstFile = message.files[0];
      if (firstFile.mimetype?.startsWith("image/")) {
        type = "image";
      } else if (firstFile.mimetype?.startsWith("video/")) {
        type = "video";
      } else if (firstFile.mimetype?.startsWith("audio/")) {
        type = "audio";
      } else {
        type = "file";
      }
    }

    // Convert attachments
    const attachments = this.convertAttachments(message.files);

    // Convert reactions
    const reactions = this.convertReactions(message.reactions);

    // Parse timestamp
    const createdAt = this.slackTsToIso(message.ts);
    const editedAt = message.edited
      ? this.slackTsToIso(message.edited.ts)
      : undefined;

    // Convert Slack formatting to Markdown
    const content = this.convertSlackFormatting(message.text || "");

    return {
      externalId: message.ts,
      channelId,
      userId: message.user || message.bot_id || "UNKNOWN",
      content,
      type,
      createdAt,
      editedAt,
      threadId:
        message.thread_ts && message.thread_ts !== message.ts
          ? message.thread_ts
          : undefined,
      attachments: attachments.length > 0 ? attachments : undefined,
      reactions: reactions.length > 0 ? reactions : undefined,
      metadata: {
        slackTs: message.ts,
        subtype: message.subtype,
        replyCount: message.reply_count,
        replyUsers: message.reply_users,
      },
    };
  }

  /**
   * Convert Slack files to unified attachments
   */
  convertAttachments(files?: SlackFile[]): UnifiedAttachment[] {
    if (!files) return [];

    return files.map((file) => ({
      externalId: file.id,
      name: file.name,
      url: file.url_private_download || file.url_private || "",
      mimeType: file.mimetype,
      size: file.size,
    }));
  }

  /**
   * Convert Slack reactions to unified format
   */
  convertReactions(reactions?: SlackReaction[]): UnifiedReaction[] {
    if (!reactions) return [];

    return reactions.map((reaction) => ({
      emoji: `:${reaction.name}:`,
      userIds: reaction.users,
      count: reaction.count,
    }));
  }

  /**
   * Convert Slack timestamp to ISO string
   */
  slackTsToIso(ts: string): string {
    const seconds = parseFloat(ts);
    return new Date(seconds * 1000).toISOString();
  }

  /**
   * Convert Slack formatting to Markdown
   */
  convertSlackFormatting(text: string): string {
    let result = text;

    // Convert user mentions <@U123> to @username
    result = result.replace(/<@([A-Z0-9]+)>/g, (_, userId) => {
      const user = this.users.get(userId);
      return user ? `@${user.name}` : `@unknown`;
    });

    // Convert channel mentions <#C123|channel-name> to #channel-name
    result = result.replace(/<#([A-Z0-9]+)\|([^>]+)>/g, "#$2");
    result = result.replace(/<#([A-Z0-9]+)>/g, (_, channelId) => {
      const channel = this.channels.get(channelId);
      return channel ? `#${channel.name}` : "#unknown";
    });

    // Convert links <url|text> to [text](url)
    result = result.replace(/<(https?:\/\/[^|>]+)\|([^>]+)>/g, "[$2]($1)");
    result = result.replace(/<(https?:\/\/[^>]+)>/g, "$1");

    // Convert bold *text* (already Markdown compatible)
    // Convert italic _text_ (already Markdown compatible)
    // Convert strikethrough ~text~ to ~~text~~
    result = result.replace(/~([^~]+)~/g, "~~$1~~");

    // Convert code blocks ```code``` (already Markdown compatible)
    // Convert inline code `code` (already Markdown compatible)

    // Convert special characters
    result = result.replace(/&lt;/g, "<");
    result = result.replace(/&gt;/g, ">");
    result = result.replace(/&amp;/g, "&");

    return result;
  }

  /**
   * Generate URL-friendly slug from channel name
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
  generatePreview(data: SlackExportData, limit = 10): ImportPreview {
    const unified = this.convertToUnified(data);

    // Get date range
    let earliest: string | undefined;
    let latest: string | undefined;

    for (const messages of Object.values(data.messagesByChannel)) {
      for (const msg of messages) {
        const date = this.slackTsToIso(msg.ts);
        if (!earliest || date < earliest) earliest = date;
        if (!latest || date > latest) latest = date;
      }
    }

    // Calculate total message count
    let totalMessages = 0;
    for (const messages of Object.values(data.messagesByChannel)) {
      totalMessages += messages.length;
    }

    return {
      users: unified.users.slice(0, limit),
      channels: unified.channels.slice(0, limit),
      messages: unified.messages.slice(0, limit),
      stats: {
        totalUsers: data.users.length,
        totalChannels: data.channels.length,
        totalMessages,
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
 * Extract files from a Slack export ZIP
 */
export async function extractSlackExport(
  file: File,
): Promise<Map<string, string>> {
  const files = new Map<string, string>();

  // Use JSZip or similar library to extract
  // This is a simplified version - in production, use proper ZIP handling
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(file);

  for (const [path, zipEntry] of Object.entries(zip.files)) {
    if (!zipEntry.dir && path.endsWith(".json")) {
      const content = await zipEntry.async("string");
      files.set(path, content);
    }
  }

  return files;
}

/**
 * Parse Slack export from file
 */
export async function parseSlackExportFile(file: File): Promise<{
  data: SlackExportData;
  preview: ImportPreview;
  errors: ImportError[];
  warnings: ImportWarning[];
}> {
  const files = await extractSlackExport(file);
  const parser = new SlackParser();
  const data = await parser.parseExport(files);
  const preview = parser.generatePreview(data);

  return {
    data,
    preview,
    errors: parser.getErrors(),
    warnings: parser.getWarnings(),
  };
}

/**
 * Default field mappings for Slack
 */
export const SLACK_DEFAULT_MAPPINGS = {
  users: [
    { sourceField: "id", targetField: "external_id" },
    { sourceField: "name", targetField: "username" },
    { sourceField: "profile.display_name", targetField: "display_name" },
    { sourceField: "profile.email", targetField: "email" },
    { sourceField: "profile.image_192", targetField: "avatar_url" },
    { sourceField: "is_bot", targetField: "is_bot" },
    {
      sourceField: "is_admin",
      targetField: "role",
      transform: "none" as const,
    },
  ],
  channels: [
    { sourceField: "id", targetField: "external_id" },
    { sourceField: "name", targetField: "name" },
    { sourceField: "purpose.value", targetField: "description" },
    { sourceField: "topic.value", targetField: "topic" },
    { sourceField: "is_private", targetField: "is_private" },
    { sourceField: "is_archived", targetField: "is_archived" },
    {
      sourceField: "created",
      targetField: "created_at",
      transform: "timestamp" as const,
    },
  ],
  messages: [
    { sourceField: "ts", targetField: "external_id" },
    { sourceField: "user", targetField: "user_id" },
    {
      sourceField: "text",
      targetField: "content",
      transform: "markdown" as const,
    },
    {
      sourceField: "ts",
      targetField: "created_at",
      transform: "timestamp" as const,
    },
    { sourceField: "thread_ts", targetField: "thread_id" },
  ],
};
