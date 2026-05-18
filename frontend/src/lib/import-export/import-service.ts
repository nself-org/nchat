// ============================================================================
// IMPORT SERVICE
// ============================================================================
// Service for importing data from external sources into nchat.
// Handles validation, user/channel creation, and message import with
// proper error handling and progress tracking.

import type {
  ImportSource,
  ImportConfig,
  ImportOptions,
  ImportProgress,
  ImportResult,
  ImportStats,
  ImportError,
  ImportWarning,
  MappingConfig,
  UnifiedUser,
  UnifiedChannel,
  UnifiedMessage,
} from "./types";

// ============================================================================
// IMPORT SERVICE CLASS
// ============================================================================

export class ImportService {
  private progress: ImportProgress = {
    status: "pending",
    currentStep: 0,
    totalSteps: 5,
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
   * Run the complete import process
   */
  async import(
    config: ImportConfig,
    data: {
      users: UnifiedUser[];
      channels: UnifiedChannel[];
      messages: UnifiedMessage[];
    },
  ): Promise<ImportResult> {
    const startTime = Date.now();

    this.progress = {
      status: "validating",
      currentStep: 1,
      totalSteps: 5,
      itemsProcessed: 0,
      totalItems:
        data.users.length + data.channels.length + data.messages.length,
      errors: [],
      warnings: [],
    };
    this.updateProgress();

    const stats: ImportStats = {
      usersImported: 0,
      usersSkipped: 0,
      usersFailed: 0,
      channelsImported: 0,
      channelsSkipped: 0,
      channelsFailed: 0,
      messagesImported: 0,
      messagesSkipped: 0,
      messagesFailed: 0,
      attachmentsImported: 0,
      attachmentsFailed: 0,
      reactionsImported: 0,
      duration: 0,
    };

    try {
      // Step 1: Validate data
      this.progress.status = "validating";
      this.progress.currentStep = 1;
      this.updateProgress();

      const validationResult = this.validateData(data, config.options);
      if (!validationResult.valid) {
        return {
          success: false,
          stats,
          errors: validationResult.errors,
          warnings: validationResult.warnings,
          userIdMap: {},
          channelIdMap: {},
          messageIdMap: {},
        };
      }

      this.progress.warnings.push(...validationResult.warnings);

      // Step 2: Import users
      this.progress.status = "importing";
      this.progress.currentStep = 2;
      this.progress.currentItem = "users";
      this.updateProgress();

      if (config.options.importUsers) {
        const userStats = await this.importUsers(data.users, config);
        stats.usersImported = userStats.imported;
        stats.usersSkipped = userStats.skipped;
        stats.usersFailed = userStats.failed;
      }

      // Step 3: Import channels
      this.progress.currentStep = 3;
      this.progress.currentItem = "channels";
      this.updateProgress();

      if (config.options.importChannels) {
        const channelStats = await this.importChannels(data.channels, config);
        stats.channelsImported = channelStats.imported;
        stats.channelsSkipped = channelStats.skipped;
        stats.channelsFailed = channelStats.failed;
      }

      // Step 4: Import messages
      this.progress.currentStep = 4;
      this.progress.currentItem = "messages";
      this.updateProgress();

      if (config.options.importMessages) {
        const messageStats = await this.importMessages(data.messages, config);
        stats.messagesImported = messageStats.imported;
        stats.messagesSkipped = messageStats.skipped;
        stats.messagesFailed = messageStats.failed;
        stats.attachmentsImported = messageStats.attachmentsImported;
        stats.attachmentsFailed = messageStats.attachmentsFailed;
        stats.reactionsImported = messageStats.reactionsImported;
      }

      // Step 5: Complete
      this.progress.status = "completed";
      this.progress.currentStep = 5;
      this.updateProgress();

      stats.duration = Date.now() - startTime;

      return {
        success: true,
        stats,
        errors: this.progress.errors,
        warnings: this.progress.warnings,
        userIdMap: this.userIdMap,
        channelIdMap: this.channelIdMap,
        messageIdMap: this.messageIdMap,
      };
    } catch (error) {
      this.progress.status = "failed";
      this.progress.errors.push({
        code: "IMPORT_FAILED",
        message: error instanceof Error ? error.message : "Import failed",
      });
      this.updateProgress();

      stats.duration = Date.now() - startTime;

      return {
        success: false,
        stats,
        errors: this.progress.errors,
        warnings: this.progress.warnings,
        userIdMap: this.userIdMap,
        channelIdMap: this.channelIdMap,
        messageIdMap: this.messageIdMap,
      };
    }
  }

  /**
   * Validate import data
   */
  private validateData(
    data: {
      users: UnifiedUser[];
      channels: UnifiedChannel[];
      messages: UnifiedMessage[];
    },
    options: ImportOptions,
  ): { valid: boolean; errors: ImportError[]; warnings: ImportWarning[] } {
    const errors: ImportError[] = [];
    const warnings: ImportWarning[] = [];

    // Validate users
    if (options.importUsers) {
      for (const user of data.users) {
        if (!user.externalId) {
          errors.push({
            code: "MISSING_USER_ID",
            message: "User missing external ID",
            item: user.username,
          });
        }
        if (!user.username) {
          warnings.push({
            code: "MISSING_USERNAME",
            message: "User missing username, will generate one",
            item: user.externalId,
            suggestion: "Username will be generated from display name or ID",
          });
        }
      }

      // Check for duplicate external IDs
      const userIds = data.users.map((u) => u.externalId);
      const duplicateUserIds = userIds.filter(
        (id, index) => userIds.indexOf(id) !== index,
      );
      if (duplicateUserIds.length > 0) {
        warnings.push({
          code: "DUPLICATE_USER_IDS",
          message: `Found ${duplicateUserIds.length} duplicate user IDs`,
          suggestion: "Duplicates will be merged",
        });
      }
    }

    // Validate channels
    if (options.importChannels) {
      for (const channel of data.channels) {
        if (!channel.externalId) {
          errors.push({
            code: "MISSING_CHANNEL_ID",
            message: "Channel missing external ID",
            item: channel.name,
          });
        }
        if (!channel.name) {
          errors.push({
            code: "MISSING_CHANNEL_NAME",
            message: "Channel missing name",
            item: channel.externalId,
          });
        }
      }
    }

    // Validate messages
    if (options.importMessages) {
      let orphanedMessages = 0;
      let messagesWithoutUser = 0;

      for (const message of data.messages) {
        if (!message.externalId) {
          errors.push({
            code: "MISSING_MESSAGE_ID",
            message: "Message missing external ID",
          });
        }

        // Check if channel exists
        const channelExists = data.channels.some(
          (c) => c.externalId === message.channelId,
        );
        if (!channelExists && options.importChannels) {
          orphanedMessages++;
        }

        // Check if user exists
        const userExists = data.users.some(
          (u) => u.externalId === message.userId,
        );
        if (!userExists && options.importUsers) {
          messagesWithoutUser++;
        }
      }

      if (orphanedMessages > 0) {
        warnings.push({
          code: "ORPHANED_MESSAGES",
          message: `${orphanedMessages} messages reference non-existent channels`,
          suggestion:
            "These messages will be skipped unless channels are imported",
        });
      }

      if (messagesWithoutUser > 0) {
        warnings.push({
          code: "MESSAGES_WITHOUT_USER",
          message: `${messagesWithoutUser} messages reference non-existent users`,
          suggestion: "Messages will be attributed to a system user",
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Import users
   */
  private async importUsers(
    users: UnifiedUser[],
    config: ImportConfig,
  ): Promise<{ imported: number; skipped: number; failed: number }> {
    let imported = 0;
    let skipped = 0;
    let failed = 0;

    // Filter out bots if configured
    const filteredUsers = config.options.skipBots
      ? users.filter((u) => !u.isBot)
      : users;

    // Deduplicate if configured
    const processedUsers = config.options.deduplicateUsers
      ? this.deduplicateUsers(filteredUsers)
      : filteredUsers;

    for (const user of processedUsers) {
      try {
        this.progress.itemsProcessed++;
        this.progress.currentItem = user.displayName || user.username;
        this.updateProgress();

        // Check if user already exists (by email or external ID)
        const existingUserId = await this.findExistingUser(user);
        if (existingUserId) {
          this.userIdMap[user.externalId] = existingUserId;
          skipped++;
          continue;
        }

        // Create user via GraphQL mutation
        const newUserId = await this.createUser(user);
        if (newUserId) {
          this.userIdMap[user.externalId] = newUserId;
          imported++;
        } else {
          failed++;
        }
      } catch (error) {
        this.progress.errors.push({
          code: "USER_IMPORT_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to import user",
          item: user.externalId,
        });
        failed++;
      }
    }

    return { imported, skipped, failed };
  }

  /**
   * Import channels
   */
  private async importChannels(
    channels: UnifiedChannel[],
    config: ImportConfig,
  ): Promise<{ imported: number; skipped: number; failed: number }> {
    let imported = 0;
    let skipped = 0;
    let failed = 0;

    // Apply channel filter if specified
    const filteredChannels = config.options.channelFilter?.length
      ? channels.filter(
          (c) =>
            config.options.channelFilter!.includes(c.externalId) ||
            config.options.channelFilter!.includes(c.name),
        )
      : channels;

    for (const channel of filteredChannels) {
      try {
        this.progress.itemsProcessed++;
        this.progress.currentItem = channel.name;
        this.updateProgress();

        // Check if channel already exists (by slug or name)
        const existingChannelId = await this.findExistingChannel(channel);
        if (existingChannelId) {
          this.channelIdMap[channel.externalId] = existingChannelId;
          skipped++;
          continue;
        }

        // Create channel via GraphQL mutation
        const newChannelId = await this.createChannel(channel);
        if (newChannelId) {
          this.channelIdMap[channel.externalId] = newChannelId;
          imported++;
        } else {
          failed++;
        }
      } catch (error) {
        this.progress.errors.push({
          code: "CHANNEL_IMPORT_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to import channel",
          item: channel.externalId,
        });
        failed++;
      }
    }

    return { imported, skipped, failed };
  }

  /**
   * Import messages
   */
  private async importMessages(
    messages: UnifiedMessage[],
    config: ImportConfig,
  ): Promise<{
    imported: number;
    skipped: number;
    failed: number;
    attachmentsImported: number;
    attachmentsFailed: number;
    reactionsImported: number;
  }> {
    let imported = 0;
    let skipped = 0;
    let failed = 0;
    let attachmentsImported = 0;
    let attachmentsFailed = 0;
    let reactionsImported = 0;

    // Filter by date range if specified
    let filteredMessages = messages;
    if (config.options.dateRange) {
      const { start, end } = config.options.dateRange;
      filteredMessages = messages.filter((m) => {
        const msgDate = new Date(m.createdAt);
        if (start && msgDate < new Date(start)) return false;
        if (end && msgDate > new Date(end)) return false;
        return true;
      });
    }

    // Skip system messages if configured
    if (config.options.skipSystemMessages) {
      filteredMessages = filteredMessages.filter((m) => m.type !== "system");
    }

    // Sort messages by timestamp to maintain order
    filteredMessages.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    // Process in batches for performance
    const BATCH_SIZE = 100;
    for (let i = 0; i < filteredMessages.length; i += BATCH_SIZE) {
      const batch = filteredMessages.slice(i, i + BATCH_SIZE);

      for (const message of batch) {
        try {
          this.progress.itemsProcessed++;
          this.progress.currentItem = `Message ${i + 1} of ${filteredMessages.length}`;
          this.updateProgress();

          // Map channel and user IDs
          const mappedChannelId = this.channelIdMap[message.channelId];
          const mappedUserId = this.userIdMap[message.userId];

          if (!mappedChannelId) {
            skipped++;
            continue;
          }

          // Create message via GraphQL mutation
          const newMessageId = await this.createMessage(
            message,
            mappedChannelId,
            mappedUserId,
          );
          if (newMessageId) {
            this.messageIdMap[message.externalId] = newMessageId;
            imported++;

            // Import attachments if configured
            if (
              config.options.importAttachments &&
              message.attachments?.length
            ) {
              for (const attachment of message.attachments) {
                try {
                  await this.createAttachment(attachment, newMessageId);
                  attachmentsImported++;
                } catch {
                  attachmentsFailed++;
                }
              }
            }

            // Import reactions if configured
            if (config.options.importReactions && message.reactions?.length) {
              for (const reaction of message.reactions) {
                try {
                  await this.createReaction(reaction, newMessageId);
                  reactionsImported += reaction.count;
                } catch {
                  // Reactions are non-critical, just log warning
                  this.progress.warnings.push({
                    code: "REACTION_IMPORT_WARNING",
                    message: `Failed to import reaction ${reaction.emoji}`,
                    item: message.externalId,
                  });
                }
              }
            }
          } else {
            failed++;
          }
        } catch (error) {
          this.progress.errors.push({
            code: "MESSAGE_IMPORT_ERROR",
            message:
              error instanceof Error
                ? error.message
                : "Failed to import message",
            item: message.externalId,
          });
          failed++;
        }
      }

      // Small delay between batches to avoid overwhelming the server
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    return {
      imported,
      skipped,
      failed,
      attachmentsImported,
      attachmentsFailed,
      reactionsImported,
    };
  }

  /**
   * Deduplicate users by email or external ID
   */
  private deduplicateUsers(users: UnifiedUser[]): UnifiedUser[] {
    const seen = new Map<string, UnifiedUser>();

    for (const user of users) {
      const key = user.email || user.externalId;
      if (!seen.has(key)) {
        seen.set(key, user);
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Find existing user by email or external ID
   */
  private async findExistingUser(user: UnifiedUser): Promise<string | null> {
    // This would query the database
    // For now, return null to indicate no existing user
    // In production, implement GraphQL query to check
    return null;
  }

  /**
   * Create a new user
   */
  private async createUser(user: UnifiedUser): Promise<string | null> {
    // This would call the GraphQL mutation
    // For now, generate a UUID
    // In production, implement actual user creation
    const newId = crypto.randomUUID();

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 10));

    return newId;
  }

  /**
   * Find existing channel by slug or name
   */
  private async findExistingChannel(
    channel: UnifiedChannel,
  ): Promise<string | null> {
    // This would query the database
    // For now, return null to indicate no existing channel
    return null;
  }

  /**
   * Create a new channel
   */
  private async createChannel(channel: UnifiedChannel): Promise<string | null> {
    // This would call the GraphQL mutation
    // For now, generate a UUID
    const newId = crypto.randomUUID();

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 10));

    return newId;
  }

  /**
   * Create a new message
   */
  private async createMessage(
    message: UnifiedMessage,
    channelId: string,
    userId: string | undefined,
  ): Promise<string | null> {
    // This would call the GraphQL mutation
    // For now, generate a UUID
    const newId = crypto.randomUUID();

    // Map thread/parent IDs if they exist
    const threadId = message.threadId
      ? this.messageIdMap[message.threadId]
      : undefined;
    const parentId = message.parentId
      ? this.messageIdMap[message.parentId]
      : undefined;

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 5));

    return newId;
  }

  /**
   * Create an attachment
   */
  private async createAttachment(
    attachment: UnifiedMessage["attachments"] extends (infer T)[] | undefined
      ? T
      : never,
    messageId: string,
  ): Promise<string | null> {
    // This would upload the file and create the attachment record
    // For now, generate a UUID
    const newId = crypto.randomUUID();

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 5));

    return newId;
  }

  /**
   * Create a reaction
   */
  private async createReaction(
    reaction: UnifiedMessage["reactions"] extends (infer T)[] | undefined
      ? T
      : never,
    messageId: string,
  ): Promise<void> {
    // This would call the GraphQL mutation to add reactions
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 5));
  }

  /**
   * Update progress and notify listeners
   */
  private updateProgress() {
    this.onProgressUpdate?.(this.progress);
  }

  /**
   * Get current progress
   */
  getProgress(): ImportProgress {
    return this.progress;
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
      userIdMap: this.userIdMap,
      channelIdMap: this.channelIdMap,
      messageIdMap: this.messageIdMap,
    };
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create default import config
 */
export function createDefaultImportConfig(
  source: ImportSource,
  overrides?: Partial<ImportConfig>,
): ImportConfig {
  return {
    source,
    options: {
      importUsers: true,
      importChannels: true,
      importMessages: true,
      importAttachments: true,
      importReactions: true,
      preserveTimestamps: true,
      deduplicateUsers: true,
      skipBots: false,
      skipSystemMessages: true,
    },
    mapping: {
      users: [],
      channels: [],
      messages: [],
    },
    ...overrides,
  };
}

/**
 * Apply field mapping to data
 */
export function applyFieldMapping<T extends Record<string, unknown>>(
  data: T,
  mappings: MappingConfig["users"],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const mapping of mappings) {
    // Get value from source field (supports dot notation)
    const sourceParts = mapping.sourceField.split(".");
    let value: unknown = data;
    for (const part of sourceParts) {
      if (value && typeof value === "object" && part in value) {
        value = (value as Record<string, unknown>)[part];
      } else {
        value = undefined;
        break;
      }
    }

    // Apply transform if specified
    if (value !== undefined && mapping.transform) {
      value = applyTransform(value, mapping.transform);
    }

    // Set value in result
    if (value !== undefined) {
      result[mapping.targetField] = value;
    }
  }

  return result;
}

/**
 * Apply a transform to a value
 */
function applyTransform(
  value: unknown,
  transform: NonNullable<MappingConfig["users"][0]["transform"]>,
): unknown {
  if (value === null || value === undefined) return value;

  switch (transform) {
    case "lowercase":
      return String(value).toLowerCase();
    case "uppercase":
      return String(value).toUpperCase();
    case "trim":
      return String(value).trim();
    case "date":
      return new Date(String(value)).toISOString();
    case "timestamp":
      // Convert Unix timestamp to ISO string
      const num = Number(value);
      return new Date(num > 1e12 ? num : num * 1000).toISOString();
    case "markdown":
      // No-op for now, could add formatting conversion
      return value;
    case "html_to_markdown":
      // Simple HTML to Markdown conversion
      return String(value)
        .replace(/<strong>(.*?)<\/strong>/g, "**$1**")
        .replace(/<b>(.*?)<\/b>/g, "**$1**")
        .replace(/<em>(.*?)<\/em>/g, "*$1*")
        .replace(/<i>(.*?)<\/i>/g, "*$1*")
        .replace(/<a href="(.*?)">(.*?)<\/a>/g, "[$2]($1)")
        .replace(/<br\s*\/?>/g, "\n")
        .replace(/<[^>]+>/g, "");
    default:
      return value;
  }
}

/**
 * Estimate import duration based on item counts
 */
export function estimateImportDuration(
  userCount: number,
  channelCount: number,
  messageCount: number,
): number {
  // Rough estimates in milliseconds
  const userTime = userCount * 50;
  const channelTime = channelCount * 50;
  const messageTime = messageCount * 20;
  const overhead = 5000; // Base time for validation, setup, etc.

  return overhead + userTime + channelTime + messageTime;
}
