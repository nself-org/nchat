// ============================================================================
// EXPORT SERVICE
// ============================================================================
// Service for exporting nchat data to various formats (JSON, CSV).
// Supports filtering, date ranges, and streaming for large datasets.

import type {
  ExportConfig,
  ExportFormat,
  ExportOptions,
  ExportFilters,
  ExportProgress,
  ExportResult,
  ExportStats,
} from "./types";

// ============================================================================
// TYPES
// ============================================================================

export interface ExportableUser {
  id: string;
  username: string;
  display_name: string;
  email?: string;
  avatar_url?: string;
  role: string;
  status?: string;
  created_at: string;
  last_active_at?: string;
}

export interface ExportableChannel {
  id: string;
  name: string;
  slug: string;
  description?: string;
  topic?: string;
  type: string;
  is_private: boolean;
  is_archived: boolean;
  created_at: string;
  creator_id?: string;
  member_count?: number;
}

export interface ExportableMessage {
  id: string;
  channel_id: string;
  channel_name?: string;
  user_id: string;
  username?: string;
  content: string;
  type: string;
  created_at: string;
  edited_at?: string;
  is_pinned: boolean;
  thread_id?: string;
  parent_id?: string;
  attachments?: ExportableAttachment[];
  reactions?: ExportableReaction[];
}

export interface ExportableAttachment {
  id: string;
  name: string;
  url: string;
  mime_type?: string;
  size?: number;
}

export interface ExportableReaction {
  emoji: string;
  count: number;
  user_ids: string[];
}

export interface ExportData {
  metadata: {
    exportedAt: string;
    format: ExportFormat;
    version: string;
    filters: ExportFilters;
    stats: ExportStats;
  };
  users?: ExportableUser[];
  channels?: ExportableChannel[];
  messages?: ExportableMessage[];
}

// ============================================================================
// EXPORT SERVICE CLASS
// ============================================================================

export class ExportService {
  private progress: ExportProgress = {
    status: "pending",
    progress: 0,
  };

  private onProgressUpdate?: (progress: ExportProgress) => void;

  constructor(onProgressUpdate?: (progress: ExportProgress) => void) {
    this.onProgressUpdate = onProgressUpdate;
  }

  /**
   * Export data based on configuration
   */
  async exportData(
    config: ExportConfig,
    data: {
      users?: ExportableUser[];
      channels?: ExportableChannel[];
      messages?: ExportableMessage[];
    },
  ): Promise<ExportResult> {
    const startTime = Date.now();

    try {
      this.updateProgress({ status: "generating", progress: 0 });

      // Apply filters
      const filteredData = this.applyFilters(
        data,
        config.filters,
        config.options,
      );
      this.updateProgress({ progress: 20 });

      // Process data based on options
      const processedData = this.processData(filteredData, config.options);
      this.updateProgress({ progress: 40 });

      // Generate export based on format
      let exportContent: string;
      let mimeType: string;
      let fileExtension: string;

      if (config.format === "csv") {
        exportContent = this.generateCSV(processedData, config.options);
        mimeType = "text/csv";
        fileExtension = "csv";
      } else {
        exportContent = this.generateJSON(processedData);
        mimeType = "application/json";
        fileExtension = "json";
      }
      this.updateProgress({ progress: 80 });

      // Create downloadable file
      const blob = new Blob([exportContent], { type: mimeType });
      const downloadUrl = URL.createObjectURL(blob);

      const duration = Date.now() - startTime;

      const stats: ExportStats = {
        usersExported: processedData.users?.length || 0,
        channelsExported: processedData.channels?.length || 0,
        messagesExported: processedData.messages?.length || 0,
        attachmentsExported:
          processedData.messages?.reduce(
            (count, msg) => count + (msg.attachments?.length || 0),
            0,
          ) || 0,
        fileSizeBytes: new Blob([exportContent]).size,
        duration,
      };

      this.updateProgress({ status: "completed", progress: 100, downloadUrl });

      return {
        success: true,
        downloadUrl,
        stats,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Export failed";
      this.updateProgress({
        status: "failed",
        progress: 0,
        error: errorMessage,
      });

      return {
        success: false,
        stats: {
          usersExported: 0,
          channelsExported: 0,
          messagesExported: 0,
          attachmentsExported: 0,
          fileSizeBytes: 0,
          duration: Date.now() - startTime,
        },
        error: errorMessage,
      };
    }
  }

  /**
   * Apply filters to data
   */
  private applyFilters(
    data: {
      users?: ExportableUser[];
      channels?: ExportableChannel[];
      messages?: ExportableMessage[];
    },
    filters: ExportFilters,
    options: ExportOptions,
  ): typeof data {
    let { users, channels, messages } = data;

    // Filter by channel IDs
    if (filters.channelIds?.length) {
      const channelIdSet = new Set(filters.channelIds);
      channels = channels?.filter((c) => channelIdSet.has(c.id));
      messages = messages?.filter((m) => channelIdSet.has(m.channel_id));
    }

    // Filter by user IDs
    if (filters.userIds?.length) {
      const userIdSet = new Set(filters.userIds);
      users = users?.filter((u) => userIdSet.has(u.id));
      messages = messages?.filter((m) => userIdSet.has(m.user_id));
    }

    // Filter by date range
    if (filters.dateRange) {
      const { start, end } = filters.dateRange;

      messages = messages?.filter((m) => {
        const msgDate = new Date(m.created_at);
        if (start && msgDate < new Date(start)) return false;
        if (end && msgDate > new Date(end)) return false;
        return true;
      });
    }

    // Filter by message types
    if (filters.messageTypes?.length) {
      const typeSet = new Set(filters.messageTypes);
      messages = messages?.filter((m) => typeSet.has(m.type));
    }

    // Filter by search query
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      messages = messages?.filter((m) =>
        m.content.toLowerCase().includes(query),
      );
    }

    // Apply options filters
    if (!options.includeUsers) users = undefined;
    if (!options.includeChannels) channels = undefined;
    if (!options.includeMessages) messages = undefined;

    if (messages && !options.includeAttachments) {
      messages = messages.map((m) => ({ ...m, attachments: undefined }));
    }

    if (messages && !options.includeReactions) {
      messages = messages.map((m) => ({ ...m, reactions: undefined }));
    }

    if (messages && !options.includeThreads) {
      messages = messages.filter((m) => !m.thread_id);
    }

    return { users, channels, messages };
  }

  /**
   * Process data based on options
   */
  private processData(
    data: {
      users?: ExportableUser[];
      channels?: ExportableChannel[];
      messages?: ExportableMessage[];
    },
    options: ExportOptions,
  ): typeof data {
    let { users, channels, messages } = data;

    // Anonymize users if requested
    if (options.anonymizeUsers && users) {
      users = users.map((u, index) => ({
        ...u,
        username: `user_${index + 1}`,
        display_name: `User ${index + 1}`,
        email: undefined,
        avatar_url: undefined,
      }));

      // Also anonymize in messages
      const userIdMap = new Map(
        users.map((u, index) => [data.users![index].id, `user_${index + 1}`]),
      );

      if (messages) {
        messages = messages.map((m) => ({
          ...m,
          user_id: userIdMap.get(m.user_id) || m.user_id,
          username: userIdMap.get(m.user_id) || m.username,
        }));
      }
    }

    // Flatten threads if requested
    if (options.flattenThreads && messages) {
      messages = messages.map((m) => ({
        ...m,
        thread_id: undefined,
        parent_id: undefined,
      }));
    }

    // Remove metadata if not requested
    if (!options.includeMetadata && messages) {
      messages = messages.map((m) => {
        const { ...rest } = m;
        return rest;
      });
    }

    return { users, channels, messages };
  }

  /**
   * Generate JSON export
   */
  private generateJSON(data: {
    users?: ExportableUser[];
    channels?: ExportableChannel[];
    messages?: ExportableMessage[];
  }): string {
    const exportData: ExportData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        format: "json",
        version: "1.0.0",
        filters: {},
        stats: {
          usersExported: data.users?.length || 0,
          channelsExported: data.channels?.length || 0,
          messagesExported: data.messages?.length || 0,
          attachmentsExported:
            data.messages?.reduce(
              (count, msg) => count + (msg.attachments?.length || 0),
              0,
            ) || 0,
          fileSizeBytes: 0,
          duration: 0,
        },
      },
      ...data,
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Generate CSV export
   */
  private generateCSV(
    data: {
      users?: ExportableUser[];
      channels?: ExportableChannel[];
      messages?: ExportableMessage[];
    },
    options: ExportOptions,
  ): string {
    const sections: string[] = [];

    // Users CSV section
    if (data.users?.length) {
      const userHeaders = [
        "id",
        "username",
        "display_name",
        "email",
        "role",
        "created_at",
      ];
      const userRows = data.users.map((u) => [
        u.id,
        u.username,
        u.display_name,
        u.email || "",
        u.role,
        u.created_at,
      ]);
      sections.push("# USERS\n" + this.arrayToCSV([userHeaders, ...userRows]));
    }

    // Channels CSV section
    if (data.channels?.length) {
      const channelHeaders = [
        "id",
        "name",
        "slug",
        "description",
        "type",
        "is_private",
        "created_at",
      ];
      const channelRows = data.channels.map((c) => [
        c.id,
        c.name,
        c.slug,
        c.description || "",
        c.type,
        String(c.is_private),
        c.created_at,
      ]);
      sections.push(
        "# CHANNELS\n" + this.arrayToCSV([channelHeaders, ...channelRows]),
      );
    }

    // Messages CSV section
    if (data.messages?.length) {
      const messageHeaders = [
        "id",
        "channel_id",
        "user_id",
        "content",
        "type",
        "created_at",
        "is_pinned",
      ];

      if (options.includeThreads) {
        messageHeaders.push("thread_id", "parent_id");
      }

      const messageRows = data.messages.map((m) => {
        const row = [
          m.id,
          m.channel_id,
          m.user_id,
          m.content,
          m.type,
          m.created_at,
          String(m.is_pinned),
        ];

        if (options.includeThreads) {
          row.push(m.thread_id || "", m.parent_id || "");
        }

        return row;
      });
      sections.push(
        "# MESSAGES\n" + this.arrayToCSV([messageHeaders, ...messageRows]),
      );
    }

    return sections.join("\n\n");
  }

  /**
   * Convert 2D array to CSV string
   */
  private arrayToCSV(data: (string | number | boolean)[][]): string {
    return data
      .map((row) =>
        row
          .map((cell) => {
            const str = String(cell);
            // Escape quotes and wrap in quotes if contains comma, quote, or newline
            if (str.includes(",") || str.includes('"') || str.includes("\n")) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          })
          .join(","),
      )
      .join("\n");
  }

  /**
   * Update progress and notify listeners
   */
  private updateProgress(update: Partial<ExportProgress>) {
    this.progress = { ...this.progress, ...update };
    this.onProgressUpdate?.(this.progress);
  }

  /**
   * Get current progress
   */
  getProgress(): ExportProgress {
    return this.progress;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create default export config
 */
export function createDefaultExportConfig(
  overrides?: Partial<ExportConfig>,
): ExportConfig {
  return {
    format: "json",
    options: {
      includeUsers: true,
      includeChannels: true,
      includeMessages: true,
      includeAttachments: true,
      includeReactions: true,
      includeThreads: true,
      includeMetadata: true,
      flattenThreads: false,
      anonymizeUsers: false,
    },
    filters: {},
    ...overrides,
  };
}

/**
 * Generate filename for export
 */
export function generateExportFilename(
  format: ExportFormat,
  prefix = "nchat-export",
): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `${prefix}-${timestamp}.${format}`;
}

/**
 * Download export file
 */
export function downloadExport(
  content: string,
  filename: string,
  mimeType: string,
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Stream large export (for server-side use)
 */
export async function* streamExport(
  messages: AsyncIterable<ExportableMessage>,
  format: ExportFormat,
): AsyncGenerator<string> {
  if (format === "json") {
    yield '{\n  "messages": [\n';
    let first = true;
    for await (const message of messages) {
      if (!first) yield ",\n";
      yield "    " + JSON.stringify(message);
      first = false;
    }
    yield "\n  ]\n}";
  } else {
    // CSV header
    yield "id,channel_id,user_id,content,type,created_at,is_pinned\n";
    for await (const message of messages) {
      const escapedContent =
        message.content.includes(",") || message.content.includes('"')
          ? `"${message.content.replace(/"/g, '""')}"`
          : message.content;
      yield `${message.id},${message.channel_id},${message.user_id},${escapedContent},${message.type},${message.created_at},${message.is_pinned}\n`;
    }
  }
}

/**
 * Estimate export size
 */
export function estimateExportSize(
  userCount: number,
  channelCount: number,
  messageCount: number,
  format: ExportFormat,
): number {
  // Rough estimates per item in bytes
  const userSize = format === "json" ? 300 : 150;
  const channelSize = format === "json" ? 250 : 120;
  const messageSize = format === "json" ? 500 : 200;

  const overhead = format === "json" ? 1000 : 100;

  return (
    overhead +
    userCount * userSize +
    channelCount * channelSize +
    messageCount * messageSize
  );
}
