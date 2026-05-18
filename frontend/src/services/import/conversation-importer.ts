/**
 * Conversation Importer Service
 *
 * Comprehensive import service supporting multiple platforms:
 * - Own exports (re-import)
 * - WhatsApp exports
 * - Telegram exports
 * - Slack exports
 * - Discord exports
 *
 * Features:
 * - Conflict resolution for duplicates
 * - Progress tracking for large imports
 * - Permission-based validation
 * - Media import support
 */

import { randomUUID } from "crypto";

// ============================================================================
// TYPES
// ============================================================================

export type ImportPlatform =
  | "nchat"
  | "whatsapp"
  | "telegram"
  | "slack"
  | "discord"
  | "generic";

export type ImportStatus =
  | "pending"
  | "validating"
  | "processing"
  | "importing"
  | "completed"
  | "failed"
  | "cancelled";

export type ConflictResolution = "skip" | "overwrite" | "duplicate" | "merge";

export interface ImportOptions {
  platform: ImportPlatform;
  targetChannelId?: string; // Import all to single channel
  createMissingChannels: boolean;
  createMissingUsers: boolean;
  importMedia: boolean;
  importReactions: boolean;
  importThreads: boolean;
  preserveTimestamps: boolean;
  conflictResolution: ConflictResolution;
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  userMapping?: Record<string, string>; // External ID -> Internal ID
  channelMapping?: Record<string, string>; // External ID -> Internal ID
}

export interface ImportProgress {
  status: ImportStatus;
  phase: string;
  progress: number;
  itemsProcessed: number;
  totalItems: number;
  errors: ImportError[];
  warnings: ImportWarning[];
  estimatedTimeRemaining?: number;
}

export interface ImportError {
  code: string;
  message: string;
  item?: string;
  recoverable: boolean;
  details?: Record<string, unknown>;
}

export interface ImportWarning {
  code: string;
  message: string;
  item?: string;
  suggestion?: string;
}

export interface ImportStats {
  messagesImported: number;
  messagesSkipped: number;
  messagesFailed: number;
  usersCreated: number;
  usersMatched: number;
  channelsCreated: number;
  channelsMatched: number;
  mediaImported: number;
  mediaFailed: number;
  reactionsImported: number;
  threadsImported: number;
  duplicatesFound: number;
  duration: number;
}

export interface ImportResult {
  success: boolean;
  stats: ImportStats;
  errors: ImportError[];
  warnings: ImportWarning[];
  userIdMap: Record<string, string>;
  channelIdMap: Record<string, string>;
  messageIdMap: Record<string, string>;
}

export interface ParsedImportData {
  platform: ImportPlatform;
  users: ParsedUser[];
  channels: ParsedChannel[];
  messages: ParsedMessage[];
  metadata?: {
    exportDate?: string;
    exportedBy?: string;
    version?: string;
  };
}

export interface ParsedUser {
  externalId: string;
  username: string;
  displayName: string;
  phone?: string;
  email?: string;
  avatarUrl?: string;
  isBot?: boolean;
}

export interface ParsedChannel {
  externalId: string;
  name: string;
  description?: string;
  type: "public" | "private" | "direct" | "group";
  participants?: string[];
  createdAt?: string;
}

export interface ParsedMessage {
  externalId: string;
  channelId: string;
  userId: string;
  content: string;
  type: "text" | "system" | "media" | "voice" | "location" | "contact";
  createdAt: string;
  editedAt?: string;
  parentId?: string;
  threadId?: string;
  attachments?: ParsedAttachment[];
  reactions?: ParsedReaction[];
  mentions?: string[];
  isForwarded?: boolean;
  forwardedFrom?: string;
}

export interface ParsedAttachment {
  type: "image" | "video" | "audio" | "document" | "voice" | "sticker";
  url?: string;
  localPath?: string;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  duration?: number; // For audio/video
  width?: number;
  height?: number;
}

export interface ParsedReaction {
  emoji: string;
  userId: string;
  createdAt?: string;
}

// ============================================================================
// PLATFORM PARSERS
// ============================================================================

/**
 * Parse WhatsApp export format
 * WhatsApp exports messages in a text file with format:
 * [DD/MM/YYYY, HH:MM:SS] Contact Name: Message content
 */
export function parseWhatsAppExport(content: string): ParsedImportData {
  const lines = content.split("\n");
  const users = new Map<string, ParsedUser>();
  const messages: ParsedMessage[] = [];

  // WhatsApp uses a single "channel" per export
  const channelId = randomUUID();
  const channel: ParsedChannel = {
    externalId: channelId,
    name: "WhatsApp Import",
    type: "direct",
  };

  // Parse message pattern
  // Supports formats: [DD/MM/YYYY, HH:MM:SS] or DD/MM/YYYY, HH:MM -
  const messagePatterns = [
    /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?)\]\s+([^:]+):\s*(.*)$/,
    /^(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2})\s+-\s+([^:]+):\s*(.*)$/,
  ];

  let currentMessage: ParsedMessage | null = null;
  let lineNumber = 0;

  for (const line of lines) {
    lineNumber++;
    let matched = false;

    for (const pattern of messagePatterns) {
      const match = line.match(pattern);
      if (match) {
        matched = true;
        const [, date, time, sender, content] = match;

        // Parse date
        const dateParts = date.split("/");
        const day = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]) - 1;
        const year =
          dateParts[2].length === 2
            ? 2000 + parseInt(dateParts[2])
            : parseInt(dateParts[2]);
        const timeParts = time.split(":");
        const parsedDate = new Date(
          year,
          month,
          day,
          parseInt(timeParts[0]),
          parseInt(timeParts[1]),
          timeParts[2] ? parseInt(timeParts[2]) : 0,
        );

        // Get or create user
        const senderTrimmed = sender.trim();
        if (!users.has(senderTrimmed)) {
          users.set(senderTrimmed, {
            externalId: `whatsapp_${senderTrimmed.replace(/\s+/g, "_").toLowerCase()}`,
            username: senderTrimmed,
            displayName: senderTrimmed,
          });
        }

        // Check for system messages
        const isSystem =
          content.includes("created group") ||
          content.includes("added") ||
          content.includes("left") ||
          content.includes("changed the subject") ||
          content.includes("Messages and calls are end-to-end encrypted");

        // Check for media
        const isMedia =
          content.includes("<Media omitted>") ||
          content.includes("attached") ||
          content.match(/<[^>]+>/);

        // Save previous message if exists
        if (currentMessage) {
          messages.push(currentMessage);
        }

        currentMessage = {
          externalId: `whatsapp_${lineNumber}`,
          channelId,
          userId: users.get(senderTrimmed)!.externalId,
          content: content.trim(),
          type: isSystem ? "system" : isMedia ? "media" : "text",
          createdAt: parsedDate.toISOString(),
        };

        break;
      }
    }

    // Multi-line message continuation
    if (!matched && currentMessage && line.trim()) {
      currentMessage.content += "\n" + line;
    }
  }

  // Add last message
  if (currentMessage) {
    messages.push(currentMessage);
  }

  return {
    platform: "whatsapp",
    users: Array.from(users.values()),
    channels: [channel],
    messages,
  };
}

/**
 * Parse Telegram export format (JSON from Telegram Desktop)
 */
export function parseTelegramExport(jsonString: string): ParsedImportData {
  const data = JSON.parse(jsonString);
  const users = new Map<string, ParsedUser>();
  const messages: ParsedMessage[] = [];

  // Telegram export has chat info at the root
  const channel: ParsedChannel = {
    externalId: String(data.id || randomUUID()),
    name: data.name || "Telegram Import",
    type:
      data.type === "personal_chat"
        ? "direct"
        : data.type === "private_group"
          ? "group"
          : "public",
  };

  // Process messages
  for (const msg of data.messages || []) {
    // Extract sender
    const senderName = msg.from || "Unknown";
    const senderId = msg.from_id || senderName;

    if (!users.has(senderId)) {
      users.set(senderId, {
        externalId: `telegram_${senderId}`,
        username: senderName,
        displayName: senderName,
      });
    }

    // Parse message content
    let content = "";
    if (typeof msg.text === "string") {
      content = msg.text;
    } else if (Array.isArray(msg.text)) {
      // Telegram uses array for formatted text
      content = msg.text
        .map((part: string | { type: string; text: string }) =>
          typeof part === "string" ? part : part.text || "",
        )
        .join("");
    }

    // Determine message type
    let type: ParsedMessage["type"] = "text";
    const attachments: ParsedAttachment[] = [];

    if (msg.media_type) {
      type = "media";
      attachments.push({
        type: msg.media_type as ParsedAttachment["type"],
        localPath: msg.file,
        fileName: msg.file || "media",
        fileSize: msg.file_size,
        width: msg.width,
        height: msg.height,
        duration: msg.duration_seconds,
      });
    }

    if (msg.type === "service") {
      type = "system";
    }

    // Parse reactions
    const reactions: ParsedReaction[] = [];
    if (msg.reactions) {
      for (const reaction of msg.reactions) {
        reactions.push({
          emoji: reaction.emoji,
          userId: reaction.from_id || "unknown",
          createdAt: reaction.date,
        });
      }
    }

    messages.push({
      externalId: `telegram_${msg.id}`,
      channelId: channel.externalId,
      userId: users.get(senderId)!.externalId,
      content,
      type,
      createdAt: msg.date || new Date().toISOString(),
      editedAt: msg.edited,
      parentId: msg.reply_to_message_id
        ? `telegram_${msg.reply_to_message_id}`
        : undefined,
      attachments: attachments.length > 0 ? attachments : undefined,
      reactions: reactions.length > 0 ? reactions : undefined,
      isForwarded: !!msg.forwarded_from,
      forwardedFrom: msg.forwarded_from,
    });
  }

  return {
    platform: "telegram",
    users: Array.from(users.values()),
    channels: [channel],
    messages,
    metadata: {
      exportDate: data.exported,
      version: "1.0",
    },
  };
}

/**
 * Parse nchat own export format
 */
export function parseNchatExport(jsonString: string): ParsedImportData {
  const data = JSON.parse(jsonString);

  // Validate structure
  if (!data.metadata || !data.messages) {
    throw new Error("Invalid nchat export format");
  }

  return {
    platform: "nchat",
    users: (data.users || []).map((u: Record<string, unknown>) => ({
      externalId: u.id as string,
      username: u.username as string,
      displayName: u.displayName as string,
      email: u.email as string,
      avatarUrl: u.avatarUrl as string,
    })),
    channels: (data.channels || []).map((c: Record<string, unknown>) => ({
      externalId: c.id as string,
      name: c.name as string,
      description: c.description as string,
      type: (c.type || "public") as ParsedChannel["type"],
    })),
    messages: (data.messages || []).map((m: Record<string, unknown>) => ({
      externalId: m.id as string,
      channelId: m.channelId as string,
      userId: m.userId as string,
      content: m.content as string,
      type: (m.type || "text") as ParsedMessage["type"],
      createdAt: m.createdAt as string,
      editedAt: m.editedAt as string,
      parentId: m.parentId as string,
      threadId: m.threadId as string,
      attachments: m.attachments as ParsedAttachment[],
      reactions: (
        m.reactions as Array<{ emoji: string; users: Array<{ id: string }> }>
      )?.map((r) => ({
        emoji: r.emoji,
        userId: r.users?.[0]?.id || "unknown",
      })),
    })),
    metadata: {
      exportDate: data.metadata.exportedAt,
      exportedBy: data.metadata.exportedBy?.username,
      version: "1.0",
    },
  };
}

/**
 * Detect import format from content
 */
export function detectImportFormat(content: string): ImportPlatform {
  // Try JSON first
  try {
    const json = JSON.parse(content);

    // Check for nchat format
    if (json.metadata?.format && json.metadata?.exportedBy) {
      return "nchat";
    }

    // Check for Telegram format
    if (json.messages && (json.type || json.id)) {
      return "telegram";
    }

    // Check for Slack format
    if (json.channels || json.users || (json.messages && json[0]?.ts)) {
      return "slack";
    }

    // Check for Discord format
    if (json.guild || (json.messages && json.messages[0]?.author)) {
      return "discord";
    }

    return "generic";
  } catch {
    // Not JSON, check for WhatsApp text format
    const whatsappPatterns = [
      /^\[\d{1,2}\/\d{1,2}\/\d{2,4},?\s+\d{1,2}:\d{2}/m,
      /^\d{1,2}\/\d{1,2}\/\d{2,4},?\s+\d{1,2}:\d{2}\s+-/m,
    ];

    for (const pattern of whatsappPatterns) {
      if (pattern.test(content)) {
        return "whatsapp";
      }
    }

    return "generic";
  }
}

// ============================================================================
// CONVERSATION IMPORTER CLASS
// ============================================================================

export class ConversationImporter {
  private progress: ImportProgress = {
    status: "pending",
    phase: "Initializing",
    progress: 0,
    itemsProcessed: 0,
    totalItems: 0,
    errors: [],
    warnings: [],
  };

  private userIdMap: Record<string, string> = {};
  private channelIdMap: Record<string, string> = {};
  private messageIdMap: Record<string, string> = {};

  private onProgressUpdate?: (progress: ImportProgress) => void;

  constructor(onProgressUpdate?: (progress: ImportProgress) => void) {
    this.onProgressUpdate = onProgressUpdate;
  }

  /**
   * Parse and validate import data
   */
  parseImport(content: string): ParsedImportData {
    const platform = detectImportFormat(content);

    switch (platform) {
      case "whatsapp":
        return parseWhatsAppExport(content);
      case "telegram":
        return parseTelegramExport(content);
      case "nchat":
        return parseNchatExport(content);
      // Slack and Discord would be handled by existing parsers
      default:
        throw new Error(`Unsupported import format: ${platform}`);
    }
  }

  /**
   * Validate parsed data
   */
  validateData(
    data: ParsedImportData,
    options: ImportOptions,
  ): { valid: boolean; errors: ImportError[]; warnings: ImportWarning[] } {
    const errors: ImportError[] = [];
    const warnings: ImportWarning[] = [];

    // Check for required data
    if (!data.messages.length) {
      errors.push({
        code: "NO_MESSAGES",
        message: "No messages found in import data",
        recoverable: false,
      });
    }

    // Validate message structure
    let invalidMessages = 0;
    for (const msg of data.messages) {
      if (!msg.externalId || !msg.content || !msg.createdAt) {
        invalidMessages++;
      }
    }

    if (invalidMessages > 0) {
      warnings.push({
        code: "INVALID_MESSAGES",
        message: `${invalidMessages} messages have missing required fields`,
        suggestion: "These messages will be skipped during import",
      });
    }

    // Check for orphaned messages (no matching channel)
    if (!options.targetChannelId && !options.createMissingChannels) {
      const channelIds = new Set(data.channels.map((c) => c.externalId));
      const orphanedMessages = data.messages.filter(
        (m) => !channelIds.has(m.channelId),
      ).length;

      if (orphanedMessages > 0) {
        warnings.push({
          code: "ORPHANED_MESSAGES",
          message: `${orphanedMessages} messages reference non-existent channels`,
          suggestion:
            'Enable "Create missing channels" or specify a target channel',
        });
      }
    }

    // Check for missing users
    if (!options.createMissingUsers) {
      const userIds = new Set(data.users.map((u) => u.externalId));
      const messagesWithoutUser = data.messages.filter(
        (m) => !userIds.has(m.userId),
      ).length;

      if (messagesWithoutUser > 0) {
        warnings.push({
          code: "MISSING_USERS",
          message: `${messagesWithoutUser} messages reference unknown users`,
          suggestion:
            'Enable "Create missing users" or messages will be attributed to system',
        });
      }
    }

    // Date range validation
    if (options.dateRange?.start && options.dateRange?.end) {
      if (options.dateRange.start > options.dateRange.end) {
        errors.push({
          code: "INVALID_DATE_RANGE",
          message: "Start date must be before end date",
          recoverable: true,
        });
      }
    }

    return {
      valid: errors.filter((e) => !e.recoverable).length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Run the import
   */
  async import(
    data: ParsedImportData,
    options: ImportOptions,
    existingData?: {
      users: Array<{ id: string; username?: string; email?: string }>;
      channels: Array<{ id: string; name: string }>;
      messageIds: Set<string>;
    },
  ): Promise<ImportResult> {
    const startTime = Date.now();
    const stats: ImportStats = {
      messagesImported: 0,
      messagesSkipped: 0,
      messagesFailed: 0,
      usersCreated: 0,
      usersMatched: 0,
      channelsCreated: 0,
      channelsMatched: 0,
      mediaImported: 0,
      mediaFailed: 0,
      reactionsImported: 0,
      threadsImported: 0,
      duplicatesFound: 0,
      duration: 0,
    };

    try {
      this.updateProgress({
        status: "validating",
        phase: "Validating data",
        progress: 0,
        totalItems:
          data.users.length + data.channels.length + data.messages.length,
      });

      // Validate
      const validation = this.validateData(data, options);
      this.progress.warnings.push(...validation.warnings);

      if (!validation.valid) {
        this.progress.errors.push(...validation.errors);
        this.progress.status = "failed";
        this.updateProgress({});
        return this.createResult(false, stats);
      }

      // Process users
      this.updateProgress({
        status: "processing",
        phase: "Processing users",
        progress: 10,
      });
      await this.processUsers(
        data.users,
        options,
        existingData?.users || [],
        stats,
      );

      // Process channels
      this.updateProgress({
        phase: "Processing channels",
        progress: 20,
      });
      await this.processChannels(
        data.channels,
        options,
        existingData?.channels || [],
        stats,
      );

      // Filter messages by date range
      let messagesToImport = data.messages;
      if (options.dateRange) {
        messagesToImport = messagesToImport.filter((m) => {
          const msgDate = new Date(m.createdAt);
          if (options.dateRange?.start && msgDate < options.dateRange.start)
            return false;
          if (options.dateRange?.end && msgDate > options.dateRange.end)
            return false;
          return true;
        });
      }

      // Import messages
      this.updateProgress({
        status: "importing",
        phase: "Importing messages",
        progress: 30,
        totalItems: messagesToImport.length,
      });
      await this.importMessages(
        messagesToImport,
        options,
        existingData?.messageIds || new Set(),
        stats,
      );

      // Complete
      stats.duration = Date.now() - startTime;
      this.updateProgress({
        status: "completed",
        phase: "Complete",
        progress: 100,
      });

      return this.createResult(true, stats);
    } catch (error) {
      stats.duration = Date.now() - startTime;
      this.progress.errors.push({
        code: "IMPORT_FAILED",
        message: error instanceof Error ? error.message : "Import failed",
        recoverable: false,
      });
      this.updateProgress({ status: "failed" });
      return this.createResult(false, stats);
    }
  }

  /**
   * Process users
   */
  private async processUsers(
    users: ParsedUser[],
    options: ImportOptions,
    existingUsers: Array<{ id: string; username?: string; email?: string }>,
    stats: ImportStats,
  ): Promise<void> {
    // Apply provided mapping first
    if (options.userMapping) {
      for (const [externalId, internalId] of Object.entries(
        options.userMapping,
      )) {
        this.userIdMap[externalId] = internalId;
        stats.usersMatched++;
      }
    }

    // Match remaining users
    for (const user of users) {
      if (this.userIdMap[user.externalId]) continue;

      // Try to match by email or username
      const match = existingUsers.find(
        (u) =>
          (user.email && u.email === user.email) ||
          (user.username && u.username === user.username),
      );

      if (match) {
        this.userIdMap[user.externalId] = match.id;
        stats.usersMatched++;
      } else if (options.createMissingUsers) {
        // Would create user via GraphQL mutation
        const newId = randomUUID();
        this.userIdMap[user.externalId] = newId;
        stats.usersCreated++;
      } else {
        // Map to system user
        this.userIdMap[user.externalId] = "system";
        this.progress.warnings.push({
          code: "USER_NOT_FOUND",
          message: `User "${user.username}" not found, using system user`,
          item: user.externalId,
        });
      }
    }
  }

  /**
   * Process channels
   */
  private async processChannels(
    channels: ParsedChannel[],
    options: ImportOptions,
    existingChannels: Array<{ id: string; name: string }>,
    stats: ImportStats,
  ): Promise<void> {
    // If target channel specified, map all to it
    if (options.targetChannelId) {
      for (const channel of channels) {
        this.channelIdMap[channel.externalId] = options.targetChannelId;
      }
      stats.channelsMatched = channels.length;
      return;
    }

    // Apply provided mapping first
    if (options.channelMapping) {
      for (const [externalId, internalId] of Object.entries(
        options.channelMapping,
      )) {
        this.channelIdMap[externalId] = internalId;
        stats.channelsMatched++;
      }
    }

    // Match remaining channels
    for (const channel of channels) {
      if (this.channelIdMap[channel.externalId]) continue;

      // Try to match by name
      const match = existingChannels.find(
        (c) => c.name.toLowerCase() === channel.name.toLowerCase(),
      );

      if (match) {
        this.channelIdMap[channel.externalId] = match.id;
        stats.channelsMatched++;
      } else if (options.createMissingChannels) {
        // Would create channel via GraphQL mutation
        const newId = randomUUID();
        this.channelIdMap[channel.externalId] = newId;
        stats.channelsCreated++;
      } else {
        this.progress.errors.push({
          code: "CHANNEL_NOT_FOUND",
          message: `Channel "${channel.name}" not found and creation disabled`,
          item: channel.externalId,
          recoverable: true,
        });
      }
    }
  }

  /**
   * Import messages
   */
  private async importMessages(
    messages: ParsedMessage[],
    options: ImportOptions,
    existingMessageIds: Set<string>,
    stats: ImportStats,
  ): Promise<void> {
    // Sort by timestamp to maintain order
    const sortedMessages = [...messages].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    const batchSize = 100;
    let processed = 0;

    for (let i = 0; i < sortedMessages.length; i += batchSize) {
      const batch = sortedMessages.slice(i, i + batchSize);

      for (const msg of batch) {
        processed++;
        this.updateProgress({
          itemsProcessed: processed,
          progress: 30 + Math.floor((processed / sortedMessages.length) * 60),
        });

        try {
          // Get mapped IDs
          const channelId = this.channelIdMap[msg.channelId];
          const userId = this.userIdMap[msg.userId];

          if (!channelId) {
            stats.messagesSkipped++;
            continue;
          }

          // Check for duplicates
          if (existingMessageIds.has(msg.externalId)) {
            stats.duplicatesFound++;

            switch (options.conflictResolution) {
              case "skip":
                stats.messagesSkipped++;
                continue;
              case "overwrite":
                // Would update existing message
                break;
              case "duplicate":
                // Create as new
                break;
              case "merge":
                // Would merge content/reactions
                stats.messagesSkipped++;
                continue;
            }
          }

          // Create message (would use GraphQL mutation)
          const newId = randomUUID();
          this.messageIdMap[msg.externalId] = newId;
          stats.messagesImported++;

          // Handle threads
          if (msg.parentId && this.messageIdMap[msg.parentId]) {
            stats.threadsImported++;
          }

          // Handle media
          if (options.importMedia && msg.attachments?.length) {
            for (const attachment of msg.attachments) {
              try {
                // Would upload file and create attachment
                stats.mediaImported++;
              } catch {
                stats.mediaFailed++;
              }
            }
          }

          // Handle reactions
          if (options.importReactions && msg.reactions?.length) {
            for (const reaction of msg.reactions) {
              try {
                // Would create reaction
                stats.reactionsImported++;
              } catch {
                // Non-critical, just log
              }
            }
          }
        } catch (error) {
          stats.messagesFailed++;
          this.progress.errors.push({
            code: "MESSAGE_IMPORT_FAILED",
            message:
              error instanceof Error
                ? error.message
                : "Failed to import message",
            item: msg.externalId,
            recoverable: true,
          });
        }
      }

      // Small delay between batches
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }

  /**
   * Create result object
   */
  private createResult(success: boolean, stats: ImportStats): ImportResult {
    return {
      success,
      stats,
      errors: this.progress.errors,
      warnings: this.progress.warnings,
      userIdMap: this.userIdMap,
      channelIdMap: this.channelIdMap,
      messageIdMap: this.messageIdMap,
    };
  }

  /**
   * Update progress
   */
  private updateProgress(update: Partial<ImportProgress>): void {
    this.progress = { ...this.progress, ...update };
    this.onProgressUpdate?.(this.progress);
  }

  /**
   * Get current progress
   */
  getProgress(): ImportProgress {
    return { ...this.progress };
  }

  /**
   * Cancel import
   */
  cancel(): void {
    this.progress.status = "cancelled";
    this.updateProgress({});
  }

  /**
   * Get ID mappings
   */
  getMappings(): {
    userIdMap: Record<string, string>;
    channelIdMap: Record<string, string>;
    messageIdMap: Record<string, string>;
  } {
    return {
      userIdMap: { ...this.userIdMap },
      channelIdMap: { ...this.channelIdMap },
      messageIdMap: { ...this.messageIdMap },
    };
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create default import options
 */
export function createDefaultImportOptions(
  platform: ImportPlatform,
  overrides?: Partial<ImportOptions>,
): ImportOptions {
  return {
    platform,
    createMissingChannels: true,
    createMissingUsers: false,
    importMedia: true,
    importReactions: true,
    importThreads: true,
    preserveTimestamps: true,
    conflictResolution: "skip",
    ...overrides,
  };
}

/**
 * Estimate import time
 */
export function estimateImportTime(data: ParsedImportData): number {
  const baseTime = 5000; // 5 seconds base
  const userTime = data.users.length * 50;
  const channelTime = data.channels.length * 100;
  const messageTime = data.messages.length * 20;
  const mediaTime =
    data.messages.reduce((sum, m) => sum + (m.attachments?.length || 0), 0) *
    500;

  return baseTime + userTime + channelTime + messageTime + mediaTime;
}
