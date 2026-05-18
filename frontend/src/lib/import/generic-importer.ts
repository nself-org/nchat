/**
 * Generic Import Service
 *
 * Flexible importer for CSV and JSON formats with field mapping.
 * Supports custom data structures and transformations.
 */

import {
  ImportOptions,
  ImportProgress,
  ImportResult,
  ImportStats,
  ImportError,
  ImportWarning,
  GenericImportData,
  GenericUser,
  GenericChannel,
  GenericMessage,
  ImportMapping,
} from "./types";
// Papa parse will be dynamically imported when needed
// import Papa from 'papaparse'

export class GenericImporter {
  private options: ImportOptions;
  private progress: ImportProgress;
  private stats: ImportStats;
  private cancelled = false;
  private mapping?: ImportMapping;

  constructor(options: ImportOptions, mapping?: ImportMapping) {
    this.options = {
      ...{
        importUsers: true,
        importChannels: true,
        importMessages: true,
        importFiles: false,
        importReactions: false,
        importThreads: false,
        preserveIds: false,
        overwriteExisting: false,
      },
      ...options,
    };

    this.mapping = mapping;

    this.progress = {
      status: "idle",
      currentStep: "Initializing",
      totalSteps: 4,
      currentStepNumber: 0,
      progress: 0,
      itemsProcessed: 0,
      itemsTotal: 0,
      errors: [],
      warnings: [],
    };

    this.stats = {
      usersImported: 0,
      usersSkipped: 0,
      usersFailed: 0,
      channelsImported: 0,
      channelsSkipped: 0,
      channelsFailed: 0,
      messagesImported: 0,
      messagesSkipped: 0,
      messagesFailed: 0,
      filesImported: 0,
      filesSkipped: 0,
      filesFailed: 0,
      reactionsImported: 0,
      threadsImported: 0,
      totalDuration: 0,
    };
  }

  /**
   * Parse CSV file
   */
  async parseCSV(file: File): Promise<GenericImportData> {
    return new Promise(async (resolve, reject) => {
      try {
        // Dynamic import to avoid bundling papaparse when not needed
        const Papa = await import("papaparse");
        Papa.default.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results: { data: unknown }) => {
            try {
              const data = this.convertCSVToGenericData(
                results.data as Record<string, unknown>[],
              );
              resolve(data);
            } catch (error) {
              reject(error);
            }
          },
          error: (error: Error) => {
            reject(new Error(`CSV parse error: ${error.message}`));
          },
        });
      } catch (error) {
        reject(new Error("Failed to load CSV parser"));
      }
    });
  }

  /**
   * Parse JSON file
   */
  async parseJSON(file: File): Promise<GenericImportData> {
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Validate and convert to GenericImportData format
      return this.convertJSONToGenericData(data);
    } catch (error) {
      this.addError({
        type: "validation",
        message: "Failed to parse JSON file",
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
        recoverable: false,
      });
      throw error;
    }
  }

  /**
   * Convert CSV data to generic format
   */
  private convertCSVToGenericData(
    rows: Record<string, unknown>[],
  ): GenericImportData {
    const data: GenericImportData = {
      users: [],
      channels: [],
      messages: [],
    };

    // Detect entity type from column names
    const firstRow = rows[0];
    if (!firstRow) return data;

    const columns = Object.keys(firstRow);

    // Detect if this is user data
    if (columns.some((col) => /email|username|user/i.test(col))) {
      data.users = rows.map((row) => this.mapUser(row));
    }
    // Detect if this is channel data
    else if (columns.some((col) => /channel|room/i.test(col))) {
      data.channels = rows.map((row) => this.mapChannel(row));
    }
    // Detect if this is message data
    else if (columns.some((col) => /message|content|text/i.test(col))) {
      data.messages = rows.map((row) => this.mapMessage(row));
    }

    return data;
  }

  /**
   * Convert JSON data to generic format
   */
  private convertJSONToGenericData(data: unknown): GenericImportData {
    const result: GenericImportData = {};

    // Handle array format
    if (Array.isArray(data)) {
      // Try to detect type from first item
      const firstItem = data[0];
      if (firstItem && typeof firstItem === "object") {
        const keys = Object.keys(firstItem);
        if (keys.some((k) => /email|username/i.test(k))) {
          result.users = data.map((item) =>
            this.mapUser(item as Record<string, unknown>),
          );
        } else if (keys.some((k) => /channel|room/i.test(k))) {
          result.channels = data.map((item) =>
            this.mapChannel(item as Record<string, unknown>),
          );
        } else if (keys.some((k) => /message|content/i.test(k))) {
          result.messages = data.map((item) =>
            this.mapMessage(item as Record<string, unknown>),
          );
        }
      }
    }
    // Handle object format with explicit keys
    else if (typeof data === "object" && data !== null) {
      const obj = data as Record<string, unknown>;
      if (Array.isArray(obj.users)) {
        result.users = obj.users.map((item: Record<string, unknown>) =>
          this.mapUser(item),
        );
      }
      if (Array.isArray(obj.channels)) {
        result.channels = obj.channels.map((item: Record<string, unknown>) =>
          this.mapChannel(item),
        );
      }
      if (Array.isArray(obj.messages)) {
        result.messages = obj.messages.map((item: Record<string, unknown>) =>
          this.mapMessage(item),
        );
      }
    }

    return result;
  }

  /**
   * Map row to user object using field mapping
   */
  private mapUser(row: Record<string, unknown>): GenericUser {
    const mapping = this.mapping?.users || this.detectUserMapping(row);

    return {
      id: this.getField(row, mapping.id || "id") as string,
      email: this.getField(row, mapping.email || "email") as string,
      username: this.getField(row, mapping.username || "username") as string,
      displayName: this.getField(
        row,
        mapping.displayName || "display_name",
      ) as string,
      avatarUrl: this.getField(
        row,
        mapping.avatarUrl || "avatar_url",
      ) as string,
      role: this.getField(row, mapping.role || "role") as string,
      createdAt: this.getField(
        row,
        mapping.createdAt || "created_at",
      ) as string,
    };
  }

  /**
   * Map row to channel object
   */
  private mapChannel(row: Record<string, unknown>): GenericChannel {
    const mapping = this.mapping?.channels || this.detectChannelMapping(row);

    return {
      id: this.getField(row, mapping.id || "id") as string,
      name: this.getField(row, mapping.name || "name") as string,
      description: this.getField(
        row,
        mapping.description || "description",
      ) as string,
      isPrivate: this.getField(
        row,
        mapping.isPrivate || "is_private",
      ) as boolean,
      createdBy: this.getField(
        row,
        mapping.createdBy || "created_by",
      ) as string,
      createdAt: this.getField(
        row,
        mapping.createdAt || "created_at",
      ) as string,
    };
  }

  /**
   * Map row to message object
   */
  private mapMessage(row: Record<string, unknown>): GenericMessage {
    const mapping = this.mapping?.messages || this.detectMessageMapping(row);

    return {
      id: this.getField(row, mapping.id || "id") as string,
      channelId: this.getField(
        row,
        mapping.channelId || "channel_id",
      ) as string,
      userId: this.getField(row, mapping.userId || "user_id") as string,
      content: this.getField(row, mapping.content || "content") as string,
      createdAt: this.getField(
        row,
        mapping.createdAt || "created_at",
      ) as string,
      editedAt: this.getField(row, mapping.editedAt || "edited_at") as string,
      parentId: this.getField(row, mapping.parentId || "parent_id") as string,
    };
  }

  /**
   * Get field value with fallback to similar field names
   */
  private getField(row: Record<string, unknown>, fieldName: string): unknown {
    // Direct match
    if (fieldName in row) {
      return row[fieldName];
    }

    // Case-insensitive match
    const lowerFieldName = fieldName.toLowerCase();
    for (const [key, value] of Object.entries(row)) {
      if (key.toLowerCase() === lowerFieldName) {
        return value;
      }
    }

    return undefined;
  }

  /**
   * Auto-detect user field mapping
   */
  private detectUserMapping(
    row: Record<string, unknown>,
  ): Record<string, string> {
    const mapping: Record<string, string> = {};
    const keys = Object.keys(row);

    mapping.id = keys.find((k) => /^id$/i.test(k)) || keys[0];
    mapping.email = keys.find((k) => /email/i.test(k)) || "";
    mapping.username =
      keys.find((k) => /username|user_name|login/i.test(k)) || "";
    mapping.displayName =
      keys.find((k) => /display.*name|full.*name|name/i.test(k)) || "";
    mapping.avatarUrl =
      keys.find((k) => /avatar|photo|picture|image/i.test(k)) || "";
    mapping.role = keys.find((k) => /role|type|level/i.test(k)) || "";
    mapping.createdAt =
      keys.find((k) => /created.*at|created.*date|joined/i.test(k)) || "";

    return mapping;
  }

  /**
   * Auto-detect channel field mapping
   */
  private detectChannelMapping(
    row: Record<string, unknown>,
  ): Record<string, string> {
    const mapping: Record<string, string> = {};
    const keys = Object.keys(row);

    mapping.id = keys.find((k) => /^id$/i.test(k)) || keys[0];
    mapping.name = keys.find((k) => /^name$|channel.*name/i.test(k)) || "";
    mapping.description =
      keys.find((k) => /description|desc|topic|purpose/i.test(k)) || "";
    mapping.isPrivate = keys.find((k) => /private|is.*private/i.test(k)) || "";
    mapping.createdBy =
      keys.find((k) => /created.*by|creator|owner/i.test(k)) || "";
    mapping.createdAt =
      keys.find((k) => /created.*at|created.*date/i.test(k)) || "";

    return mapping;
  }

  /**
   * Auto-detect message field mapping
   */
  private detectMessageMapping(
    row: Record<string, unknown>,
  ): Record<string, string> {
    const mapping: Record<string, string> = {};
    const keys = Object.keys(row);

    mapping.id = keys.find((k) => /^id$|message.*id/i.test(k)) || keys[0];
    mapping.channelId = keys.find((k) => /channel.*id|room.*id/i.test(k)) || "";
    mapping.userId =
      keys.find((k) => /user.*id|author.*id|sender.*id/i.test(k)) || "";
    mapping.content =
      keys.find((k) => /content|text|message|body/i.test(k)) || "";
    mapping.createdAt =
      keys.find((k) => /created.*at|timestamp|sent.*at/i.test(k)) || "";
    mapping.editedAt =
      keys.find((k) => /edited.*at|updated.*at/i.test(k)) || "";
    mapping.parentId =
      keys.find((k) => /parent.*id|thread.*id|reply.*to/i.test(k)) || "";

    return mapping;
  }

  /**
   * Main import method
   */
  async import(
    data: GenericImportData,
    onProgress?: (progress: ImportProgress) => void,
  ): Promise<ImportResult> {
    const startTime = Date.now();
    this.progress.status = "importing";
    this.progress.startedAt = new Date();

    try {
      // Step 1: Validate data
      await this.validateData(data, onProgress);

      // Step 2: Import users
      if (this.options.importUsers && data.users) {
        await this.importUsers(data.users, onProgress);
      }

      // Step 3: Import channels
      if (this.options.importChannels && data.channels) {
        await this.importChannels(data.channels, onProgress);
      }

      // Step 4: Import messages
      if (this.options.importMessages && data.messages) {
        await this.importMessages(data.messages, onProgress);
      }

      this.progress.status = "completed";
      this.progress.completedAt = new Date();
      this.progress.progress = 100;
      this.stats.totalDuration = Date.now() - startTime;

      return {
        success: true,
        progress: this.progress,
        stats: this.stats,
      };
    } catch (error) {
      this.progress.status = "error";
      this.addError({
        type: "unknown",
        message: "Import failed",
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
        recoverable: false,
      });

      return {
        success: false,
        progress: this.progress,
        stats: this.stats,
      };
    }
  }

  /**
   * Validate import data
   */
  private async validateData(
    data: GenericImportData,
    onProgress?: (progress: ImportProgress) => void,
  ): Promise<void> {
    this.updateProgress(1, "Validating data", onProgress);

    let hasData = false;

    if (data.users && data.users.length > 0) {
      hasData = true;
      // Validate required fields
      for (const user of data.users) {
        if (!user.id || !user.username) {
          this.addWarning({
            type: "modified",
            message: "User missing required fields (id, username)",
            item: user,
            timestamp: new Date(),
          });
        }
      }
    }

    if (data.channels && data.channels.length > 0) {
      hasData = true;
      for (const channel of data.channels) {
        if (!channel.id || !channel.name) {
          this.addWarning({
            type: "modified",
            message: "Channel missing required fields (id, name)",
            item: channel,
            timestamp: new Date(),
          });
        }
      }
    }

    if (data.messages && data.messages.length > 0) {
      hasData = true;
      for (const message of data.messages) {
        if (!message.id || !message.content || !message.userId) {
          this.addWarning({
            type: "modified",
            message: "Message missing required fields (id, content, userId)",
            item: message,
            timestamp: new Date(),
          });
        }
      }
    }

    if (!hasData) {
      throw new Error("No valid data found to import");
    }
  }

  /**
   * Import users
   */
  private async importUsers(
    users: GenericImportData["users"],
    onProgress?: (progress: ImportProgress) => void,
  ): Promise<void> {
    if (!users) return;

    this.updateProgress(2, "Importing users", onProgress);
    this.progress.itemsTotal = users.length;

    for (let i = 0; i < users.length; i++) {
      if (this.cancelled) break;

      const user = users[i];

      try {
        // Validate required fields
        if (!user.id || !user.username) {
          this.stats.usersSkipped++;
          continue;
        }

        await this.createUser({
          email: user.email || `${user.username}@imported.generic`,
          username: user.username,
          displayName: user.displayName || user.username,
          avatarUrl: user.avatarUrl,
          metadata: {
            importedId: user.id,
            importSource: "generic",
            importedAt: new Date().toISOString(),
          },
        });

        this.stats.usersImported++;
      } catch (error) {
        this.stats.usersFailed++;
        this.addError({
          type: "user",
          message: `Failed to import user: ${user.username}`,
          details: error instanceof Error ? error.message : String(error),
          item: user,
          timestamp: new Date(),
          recoverable: true,
        });
      }

      this.progress.itemsProcessed = i + 1;
      this.updateProgressPercentage(2, users.length, i + 1, onProgress);
    }
  }

  /**
   * Import channels
   */
  private async importChannels(
    channels: GenericImportData["channels"],
    onProgress?: (progress: ImportProgress) => void,
  ): Promise<void> {
    if (!channels) return;

    this.updateProgress(3, "Importing channels", onProgress);
    this.progress.itemsTotal = channels.length;

    for (let i = 0; i < channels.length; i++) {
      if (this.cancelled) break;

      const channel = channels[i];

      try {
        // Validate required fields
        if (!channel.id || !channel.name) {
          this.stats.channelsSkipped++;
          continue;
        }

        await this.createChannel({
          name: channel.name,
          description: channel.description || "",
          isPrivate: channel.isPrivate || false,
          createdBy: channel.createdBy || "system",
          metadata: {
            importedId: channel.id,
            importSource: "generic",
            importedAt: new Date().toISOString(),
          },
        });

        this.stats.channelsImported++;
      } catch (error) {
        this.stats.channelsFailed++;
        this.addError({
          type: "channel",
          message: `Failed to import channel: ${channel.name}`,
          details: error instanceof Error ? error.message : String(error),
          item: channel,
          timestamp: new Date(),
          recoverable: true,
        });
      }

      this.progress.itemsProcessed = i + 1;
      this.updateProgressPercentage(3, channels.length, i + 1, onProgress);
    }
  }

  /**
   * Import messages
   */
  private async importMessages(
    messages: GenericImportData["messages"],
    onProgress?: (progress: ImportProgress) => void,
  ): Promise<void> {
    if (!messages) return;

    this.updateProgress(4, "Importing messages", onProgress);
    this.progress.itemsTotal = messages.length;

    for (let i = 0; i < messages.length; i++) {
      if (this.cancelled) break;

      const message = messages[i];

      try {
        // Validate required fields
        if (!message.id || !message.content || !message.userId) {
          this.stats.messagesSkipped++;
          continue;
        }

        await this.createMessage({
          content: message.content,
          userId: message.userId,
          channelId: message.channelId,
          parentId: message.parentId,
          createdAt: message.createdAt
            ? new Date(message.createdAt)
            : new Date(),
          metadata: {
            importedId: message.id,
            importSource: "generic",
            importedAt: new Date().toISOString(),
          },
        });

        this.stats.messagesImported++;
      } catch (error) {
        this.stats.messagesFailed++;
        this.addError({
          type: "message",
          message: "Failed to import message",
          details: error instanceof Error ? error.message : String(error),
          item: message,
          timestamp: new Date(),
          recoverable: true,
        });
      }

      this.progress.itemsProcessed = i + 1;
      this.updateProgressPercentage(4, messages.length, i + 1, onProgress);
    }
  }

  /**
   * Cancel import
   */
  cancel(): void {
    this.cancelled = true;
    this.progress.status = "cancelled";
  }

  /**
   * Get current progress
   */
  getProgress(): ImportProgress {
    return { ...this.progress };
  }

  // Helper methods for database operations

  private async createUser(data: {
    email: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    metadata?: Record<string, unknown>;
  }): Promise<string> {
    return `user_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async createChannel(data: {
    name: string;
    description: string;
    isPrivate: boolean;
    createdBy: string;
    metadata?: Record<string, unknown>;
  }): Promise<string> {
    return `channel_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async createMessage(data: {
    content: string;
    userId: string;
    channelId: string;
    parentId?: string;
    createdAt: Date;
    metadata?: Record<string, unknown>;
  }): Promise<string> {
    return `message_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Progress tracking helpers

  private updateProgress(
    step: number,
    message: string,
    onProgress?: (progress: ImportProgress) => void,
  ): void {
    this.progress.currentStepNumber = step;
    this.progress.currentStep = message;
    this.progress.itemsProcessed = 0;
    onProgress?.(this.progress);
  }

  private updateProgressPercentage(
    step: number,
    total: number,
    current: number,
    onProgress?: (progress: ImportProgress) => void,
  ): void {
    const stepProgress = (current / total) * 100;
    const overallProgress =
      ((step - 1) / this.progress.totalSteps) * 100 +
      stepProgress / this.progress.totalSteps;
    this.progress.progress = Math.min(100, Math.round(overallProgress));
    onProgress?.(this.progress);
  }

  private addError(error: ImportError): void {
    this.progress.errors.push(error);
  }

  private addWarning(warning: ImportWarning): void {
    this.progress.warnings.push(warning);
  }
}
