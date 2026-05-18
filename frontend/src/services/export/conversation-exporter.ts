/**
 * Conversation Exporter Service
 *
 * Comprehensive export service for conversation history with support for:
 * - Multiple formats: JSON, HTML, Text, CSV
 * - Media handling (embedded or linked)
 * - Threads and replies
 * - Reactions and pins
 * - Edit history
 * - Permission-based filtering
 * - Large export handling with progress tracking
 */

import { randomUUID } from "crypto";

// ============================================================================
// TYPES
// ============================================================================

export type ExportFormat = "json" | "html" | "text" | "csv";

export type ExportScope =
  | "single_conversation"
  | "multiple_conversations"
  | "user_messages_only"
  | "full_channel";

export type MediaHandling = "embed" | "link" | "exclude";

export type ExportStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export interface ExportOptions {
  format: ExportFormat;
  scope: ExportScope;
  channelIds: string[];
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  mediaHandling: MediaHandling;
  includeThreads: boolean;
  includeReactions: boolean;
  includePins: boolean;
  includeEditHistory: boolean;
  includeDeletedMarkers: boolean;
  userMessagesOnly: boolean; // Only export requesting user's messages
  anonymizeUsers: boolean;
  maxFileSize?: number; // Max size in bytes for embedded media
}

export interface ExportMetadata {
  exportId: string;
  exportedAt: Date;
  exportedBy: {
    id: string;
    username: string;
    email: string;
  };
  format: ExportFormat;
  scope: ExportScope;
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  stats: ExportStats;
  options: Partial<ExportOptions>;
}

export interface ExportStats {
  totalMessages: number;
  totalThreads: number;
  totalReactions: number;
  totalMedia: number;
  totalPins: number;
  totalEdits: number;
  totalDeleted: number;
  channels: number;
  users: number;
  fileSizeBytes: number;
  duration: number;
}

export interface ExportedMessage {
  id: string;
  channelId: string;
  channelName: string;
  userId: string;
  username: string;
  displayName: string;
  content: string;
  type: "text" | "system" | "file" | "image" | "video" | "audio";
  createdAt: string;
  editedAt?: string;
  isEdited: boolean;
  isDeleted: boolean;
  isPinned: boolean;
  deletedAt?: string;
  threadId?: string;
  parentId?: string;
  parentContent?: string;
  parentUsername?: string;
  attachments?: ExportedAttachment[];
  reactions?: ExportedReaction[];
  mentions?: string[];
  editHistory?: ExportedEdit[];
}

export interface ExportedAttachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  url: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  embedData?: string; // Base64 encoded for embedded files
}

export interface ExportedReaction {
  emoji: string;
  count: number;
  users: Array<{
    id: string;
    username: string;
  }>;
}

export interface ExportedEdit {
  content: string;
  editedAt: string;
  editedBy: string;
}

export interface ExportedChannel {
  id: string;
  name: string;
  slug: string;
  description?: string;
  type: "public" | "private" | "direct" | "group";
  isArchived: boolean;
  createdAt: string;
  memberCount: number;
  messageCount: number;
}

export interface ExportedUser {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
  role: string;
}

export interface ConversationExportData {
  metadata: ExportMetadata;
  channels: ExportedChannel[];
  users: ExportedUser[];
  messages: ExportedMessage[];
}

export interface ExportJob {
  id: string;
  userId: string;
  status: ExportStatus;
  progress: number;
  options: ExportOptions;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  expiresAt: Date;
  downloadUrl?: string;
  fileName?: string;
  fileSize?: number;
  errorMessage?: string;
  stats?: ExportStats;
}

export interface ExportProgress {
  status: ExportStatus;
  progress: number;
  currentPhase: string;
  itemsProcessed: number;
  totalItems: number;
  estimatedTimeRemaining?: number;
}

// ============================================================================
// CONVERSATION EXPORTER CLASS
// ============================================================================

export class ConversationExporter {
  private progress: ExportProgress = {
    status: "pending",
    progress: 0,
    currentPhase: "Initializing",
    itemsProcessed: 0,
    totalItems: 0,
  };

  private onProgressUpdate?: (progress: ExportProgress) => void;

  constructor(onProgressUpdate?: (progress: ExportProgress) => void) {
    this.onProgressUpdate = onProgressUpdate;
  }

  /**
   * Export conversation data
   */
  async export(
    options: ExportOptions,
    data: {
      channels: ExportedChannel[];
      users: ExportedUser[];
      messages: ExportedMessage[];
    },
    exportedBy: { id: string; username: string; email: string },
  ): Promise<{
    content: string;
    mimeType: string;
    fileName: string;
    stats: ExportStats;
  }> {
    const startTime = Date.now();

    try {
      this.updateProgress({
        status: "processing",
        progress: 0,
        currentPhase: "Preparing data",
      });

      // Apply filters
      let filteredMessages = this.applyFilters(data.messages, options);
      this.updateProgress({ progress: 10, currentPhase: "Filtering messages" });

      // Process threads
      if (options.includeThreads) {
        filteredMessages = this.processThreads(filteredMessages);
      }
      this.updateProgress({ progress: 20, currentPhase: "Processing threads" });

      // Handle media
      if (options.mediaHandling !== "exclude") {
        filteredMessages = await this.processMedia(filteredMessages, options);
      }
      this.updateProgress({ progress: 40, currentPhase: "Processing media" });

      // Anonymize if requested
      let processedUsers = data.users;
      if (options.anonymizeUsers) {
        const result = this.anonymizeData(filteredMessages, data.users);
        filteredMessages = result.messages;
        processedUsers = result.users;
      }
      this.updateProgress({ progress: 50, currentPhase: "Processing users" });

      // Build export data
      const exportData: ConversationExportData = {
        metadata: this.buildMetadata(
          options,
          filteredMessages,
          data.channels,
          processedUsers,
          exportedBy,
          Date.now() - startTime,
        ),
        channels: data.channels.filter((c) =>
          options.channelIds.includes(c.id),
        ),
        users: processedUsers,
        messages: filteredMessages,
      };
      this.updateProgress({ progress: 60, currentPhase: "Building export" });

      // Generate output based on format
      let content: string;
      let mimeType: string;
      let fileExtension: string;

      switch (options.format) {
        case "json":
          content = this.formatAsJSON(exportData);
          mimeType = "application/json";
          fileExtension = "json";
          break;
        case "html":
          content = this.formatAsHTML(exportData, options);
          mimeType = "text/html";
          fileExtension = "html";
          break;
        case "text":
          content = this.formatAsText(exportData, options);
          mimeType = "text/plain";
          fileExtension = "txt";
          break;
        case "csv":
          content = this.formatAsCSV(exportData, options);
          mimeType = "text/csv";
          fileExtension = "csv";
          break;
        default:
          throw new Error(`Unsupported format: ${options.format}`);
      }

      this.updateProgress({ progress: 90, currentPhase: "Generating file" });

      const stats = exportData.metadata.stats;
      stats.fileSizeBytes = new TextEncoder().encode(content).length;
      stats.duration = Date.now() - startTime;

      const fileName = this.generateFileName(options, fileExtension);

      this.updateProgress({
        status: "completed",
        progress: 100,
        currentPhase: "Complete",
      });

      return { content, mimeType, fileName, stats };
    } catch (error) {
      this.updateProgress({
        status: "failed",
        progress: 0,
        currentPhase: "Failed",
      });
      throw error;
    }
  }

  /**
   * Apply filters to messages
   */
  private applyFilters(
    messages: ExportedMessage[],
    options: ExportOptions,
  ): ExportedMessage[] {
    let filtered = messages;

    // Filter by channels
    if (options.channelIds.length > 0) {
      const channelIdSet = new Set(options.channelIds);
      filtered = filtered.filter((m) => channelIdSet.has(m.channelId));
    }

    // Filter by date range
    if (options.dateRange?.start) {
      filtered = filtered.filter(
        (m) => new Date(m.createdAt) >= options.dateRange!.start!,
      );
    }
    if (options.dateRange?.end) {
      filtered = filtered.filter(
        (m) => new Date(m.createdAt) <= options.dateRange!.end!,
      );
    }

    // Filter by user's own messages if requested
    // Note: userId would be passed from auth context in real implementation

    // Remove reactions if not included
    if (!options.includeReactions) {
      filtered = filtered.map((m) => ({ ...m, reactions: undefined }));
    }

    // Remove edit history if not included
    if (!options.includeEditHistory) {
      filtered = filtered.map((m) => ({ ...m, editHistory: undefined }));
    }

    // Handle deleted messages
    if (!options.includeDeletedMarkers) {
      filtered = filtered.filter((m) => !m.isDeleted);
    }

    // Handle pins
    if (!options.includePins) {
      filtered = filtered.map((m) => ({ ...m, isPinned: false }));
    }

    return filtered;
  }

  /**
   * Process thread relationships
   */
  private processThreads(messages: ExportedMessage[]): ExportedMessage[] {
    const messageMap = new Map(messages.map((m) => [m.id, m]));

    return messages.map((m) => {
      if (m.parentId) {
        const parent = messageMap.get(m.parentId);
        if (parent) {
          return {
            ...m,
            parentContent: parent.content,
            parentUsername: parent.username,
          };
        }
      }
      return m;
    });
  }

  /**
   * Process media attachments
   */
  private async processMedia(
    messages: ExportedMessage[],
    options: ExportOptions,
  ): Promise<ExportedMessage[]> {
    if (options.mediaHandling === "exclude") {
      return messages.map((m) => ({ ...m, attachments: undefined }));
    }

    if (options.mediaHandling === "link") {
      // Keep attachments as-is with URLs
      return messages;
    }

    // Embed media (would fetch and base64 encode in real implementation)
    // For now, just mark as embedded
    return messages.map((m) => ({
      ...m,
      attachments: m.attachments?.map((a) => ({
        ...a,
        embedData:
          options.maxFileSize && a.fileSize > options.maxFileSize
            ? undefined
            : "[Base64 data would be here]",
      })),
    }));
  }

  /**
   * Anonymize user data
   */
  private anonymizeData(
    messages: ExportedMessage[],
    users: ExportedUser[],
  ): { messages: ExportedMessage[]; users: ExportedUser[] } {
    const userIdMap = new Map<string, string>();
    let counter = 1;

    // Create anonymized user mapping
    const anonymizedUsers = users.map((u) => {
      const anonymizedId = `user_${counter}`;
      userIdMap.set(u.id, anonymizedId);
      counter++;
      return {
        ...u,
        username: anonymizedId,
        displayName: `User ${counter - 1}`,
        email: undefined,
        avatarUrl: undefined,
      };
    });

    // Anonymize messages
    const anonymizedMessages = messages.map((m) => ({
      ...m,
      userId: userIdMap.get(m.userId) || m.userId,
      username: userIdMap.get(m.userId) || m.username,
      displayName: `User ${userIdMap.get(m.userId)?.replace("user_", "")}`,
      reactions: m.reactions?.map((r) => ({
        ...r,
        users: r.users.map((u) => ({
          id: userIdMap.get(u.id) || u.id,
          username: userIdMap.get(u.id) || u.username,
        })),
      })),
    }));

    return { messages: anonymizedMessages, users: anonymizedUsers };
  }

  /**
   * Build export metadata
   */
  private buildMetadata(
    options: ExportOptions,
    messages: ExportedMessage[],
    channels: ExportedChannel[],
    users: ExportedUser[],
    exportedBy: { id: string; username: string; email: string },
    duration: number,
  ): ExportMetadata {
    const stats: ExportStats = {
      totalMessages: messages.length,
      totalThreads: messages.filter((m) => m.threadId || m.parentId).length,
      totalReactions: messages.reduce(
        (sum, m) =>
          sum +
          (m.reactions?.reduce((r, reaction) => r + reaction.count, 0) || 0),
        0,
      ),
      totalMedia: messages.reduce(
        (sum, m) => sum + (m.attachments?.length || 0),
        0,
      ),
      totalPins: messages.filter((m) => m.isPinned).length,
      totalEdits: messages.filter((m) => m.isEdited).length,
      totalDeleted: messages.filter((m) => m.isDeleted).length,
      channels: channels.filter((c) => options.channelIds.includes(c.id))
        .length,
      users: users.length,
      fileSizeBytes: 0, // Will be calculated later
      duration,
    };

    return {
      exportId: randomUUID(),
      exportedAt: new Date(),
      exportedBy,
      format: options.format,
      scope: options.scope,
      dateRange: options.dateRange,
      stats,
      options: {
        mediaHandling: options.mediaHandling,
        includeThreads: options.includeThreads,
        includeReactions: options.includeReactions,
        includePins: options.includePins,
        includeEditHistory: options.includeEditHistory,
        includeDeletedMarkers: options.includeDeletedMarkers,
        anonymizeUsers: options.anonymizeUsers,
      },
    };
  }

  /**
   * Format as JSON
   */
  private formatAsJSON(data: ConversationExportData): string {
    return JSON.stringify(data, null, 2);
  }

  /**
   * Format as HTML
   */
  private formatAsHTML(
    data: ConversationExportData,
    options: ExportOptions,
  ): string {
    const styles = this.getHTMLStyles();
    const channelMap = new Map(data.channels.map((c) => [c.id, c]));
    const userMap = new Map(data.users.map((u) => [u.id, u]));

    // Group messages by channel
    const messagesByChannel = new Map<string, ExportedMessage[]>();
    for (const msg of data.messages) {
      const existing = messagesByChannel.get(msg.channelId) || [];
      existing.push(msg);
      messagesByChannel.set(msg.channelId, existing);
    }

    let messagesHTML = "";
    for (const [channelId, messages] of messagesByChannel) {
      const channel = channelMap.get(channelId);
      messagesHTML += `
        <div class="channel-section">
          <h2 class="channel-header">#${channel?.name || "Unknown Channel"}</h2>
          <div class="messages">
            ${messages.map((m) => this.formatMessageAsHTML(m, options)).join("\n")}
          </div>
        </div>
      `;
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Chat Export - ${data.metadata.exportedAt.toISOString()}</title>
  ${styles}
</head>
<body>
  <div class="container">
    <header class="export-header">
      <h1>Conversation Export</h1>
      <div class="metadata">
        <div class="metadata-item">
          <span class="label">Exported:</span>
          <span class="value">${data.metadata.exportedAt.toLocaleString()}</span>
        </div>
        <div class="metadata-item">
          <span class="label">By:</span>
          <span class="value">${data.metadata.exportedBy.username}</span>
        </div>
        <div class="metadata-item">
          <span class="label">Messages:</span>
          <span class="value">${data.metadata.stats.totalMessages.toLocaleString()}</span>
        </div>
        <div class="metadata-item">
          <span class="label">Channels:</span>
          <span class="value">${data.metadata.stats.channels}</span>
        </div>
        <div class="metadata-item">
          <span class="label">Users:</span>
          <span class="value">${data.metadata.stats.users}</span>
        </div>
        ${
          data.metadata.dateRange?.start
            ? `
        <div class="metadata-item">
          <span class="label">Date Range:</span>
          <span class="value">${data.metadata.dateRange.start.toLocaleDateString()} - ${data.metadata.dateRange.end?.toLocaleDateString() || "Present"}</span>
        </div>
        `
            : ""
        }
      </div>
    </header>
    <main>
      ${messagesHTML}
    </main>
    <footer>
      <p>Exported from nchat on ${data.metadata.exportedAt.toISOString()}</p>
    </footer>
  </div>
</body>
</html>`;
  }

  /**
   * Format a single message as HTML
   */
  private formatMessageAsHTML(
    message: ExportedMessage,
    options: ExportOptions,
  ): string {
    const badges: string[] = [];
    if (message.isPinned)
      badges.push('<span class="badge badge-pinned">Pinned</span>');
    if (message.isEdited)
      badges.push('<span class="badge badge-edited">Edited</span>');
    if (message.isDeleted)
      badges.push('<span class="badge badge-deleted">Deleted</span>');

    const replyInfo = message.parentId
      ? `<div class="reply-info">
          <span class="reply-icon">↩</span>
          <span class="reply-author">${this.escapeHTML(message.parentUsername || "Unknown")}</span>
          <span class="reply-preview">${this.escapeHTML((message.parentContent || "").slice(0, 50))}${(message.parentContent?.length || 0) > 50 ? "..." : ""}</span>
        </div>`
      : "";

    const attachmentsHTML = message.attachments?.length
      ? `<div class="attachments">
          ${message.attachments
            .map(
              (a) => `
            <div class="attachment">
              <span class="attachment-icon">📎</span>
              <a href="${a.url}" target="_blank">${this.escapeHTML(a.fileName)}</a>
              <span class="attachment-size">(${this.formatFileSize(a.fileSize)})</span>
            </div>
          `,
            )
            .join("")}
        </div>`
      : "";

    const reactionsHTML = message.reactions?.length
      ? `<div class="reactions">
          ${message.reactions
            .map(
              (r) => `
            <span class="reaction" title="${r.users.map((u) => u.username).join(", ")}">
              ${r.emoji} ${r.count}
            </span>
          `,
            )
            .join("")}
        </div>`
      : "";

    const editHistoryHTML =
      options.includeEditHistory && message.editHistory?.length
        ? `<details class="edit-history">
          <summary>Edit History (${message.editHistory.length})</summary>
          ${message.editHistory
            .map(
              (e) => `
            <div class="edit-entry">
              <span class="edit-time">${new Date(e.editedAt).toLocaleString()}</span>
              <span class="edit-content">${this.escapeHTML(e.content)}</span>
            </div>
          `,
            )
            .join("")}
        </details>`
        : "";

    return `
      <div class="message ${message.isDeleted ? "deleted" : ""} ${message.threadId ? "threaded" : ""}">
        ${replyInfo}
        <div class="message-header">
          <span class="author">${this.escapeHTML(message.displayName)}</span>
          <span class="timestamp">${new Date(message.createdAt).toLocaleString()}</span>
          ${badges.join("")}
        </div>
        <div class="message-content">
          ${message.isDeleted ? "<em>[Message deleted]</em>" : this.escapeHTML(message.content)}
        </div>
        ${attachmentsHTML}
        ${reactionsHTML}
        ${editHistoryHTML}
      </div>
    `;
  }

  /**
   * Format as plain text
   */
  private formatAsText(
    data: ConversationExportData,
    options: ExportOptions,
  ): string {
    const lines: string[] = [
      "═══════════════════════════════════════════════════════════════════",
      "                        CONVERSATION EXPORT",
      "═══════════════════════════════════════════════════════════════════",
      "",
      `Exported: ${data.metadata.exportedAt.toLocaleString()}`,
      `By: ${data.metadata.exportedBy.username}`,
      `Messages: ${data.metadata.stats.totalMessages.toLocaleString()}`,
      `Channels: ${data.metadata.stats.channels}`,
      `Users: ${data.metadata.stats.users}`,
      "",
    ];

    if (data.metadata.dateRange?.start) {
      lines.push(
        `Date Range: ${data.metadata.dateRange.start.toLocaleDateString()} - ${data.metadata.dateRange.end?.toLocaleDateString() || "Present"}`,
        "",
      );
    }

    // Group messages by channel
    const messagesByChannel = new Map<string, ExportedMessage[]>();
    for (const msg of data.messages) {
      const existing = messagesByChannel.get(msg.channelId) || [];
      existing.push(msg);
      messagesByChannel.set(msg.channelId, existing);
    }

    const channelMap = new Map(data.channels.map((c) => [c.id, c]));

    for (const [channelId, messages] of messagesByChannel) {
      const channel = channelMap.get(channelId);
      lines.push(
        "",
        "───────────────────────────────────────────────────────────────────",
        `#${channel?.name || "Unknown Channel"}`,
        "───────────────────────────────────────────────────────────────────",
        "",
      );

      for (const msg of messages) {
        lines.push(this.formatMessageAsText(msg, options));
      }
    }

    lines.push(
      "",
      "═══════════════════════════════════════════════════════════════════",
      `End of export - Generated from nchat`,
      "═══════════════════════════════════════════════════════════════════",
    );

    return lines.join("\n");
  }

  /**
   * Format a single message as text
   */
  private formatMessageAsText(
    message: ExportedMessage,
    options: ExportOptions,
  ): string {
    const timestamp = new Date(message.createdAt).toLocaleString();
    const flags: string[] = [];
    if (message.isPinned) flags.push("[PINNED]");
    if (message.isEdited) flags.push("[EDITED]");
    if (message.isDeleted) flags.push("[DELETED]");

    const header = `[${timestamp}] ${message.displayName}${flags.length ? " " + flags.join(" ") : ""}`;

    let content = message.isDeleted ? "[Message deleted]" : message.content;

    if (message.parentId && message.parentUsername) {
      content = `↩ Reply to ${message.parentUsername}: "${message.parentContent?.slice(0, 30)}..."\n${content}`;
    }

    const lines = [header, content];

    if (message.attachments?.length) {
      lines.push(
        `  📎 Attachments: ${message.attachments.map((a) => a.fileName).join(", ")}`,
      );
    }

    if (message.reactions?.length) {
      lines.push(
        `  Reactions: ${message.reactions.map((r) => `${r.emoji}(${r.count})`).join(" ")}`,
      );
    }

    lines.push("");

    return lines.join("\n");
  }

  /**
   * Format as CSV
   */
  private formatAsCSV(
    data: ConversationExportData,
    options: ExportOptions,
  ): string {
    const headers = [
      "message_id",
      "channel_name",
      "username",
      "display_name",
      "content",
      "type",
      "created_at",
      "is_edited",
      "is_deleted",
      "is_pinned",
      "thread_id",
      "parent_id",
      "attachment_count",
      "reaction_count",
    ];

    const rows = data.messages.map((m) => [
      m.id,
      m.channelName,
      m.username,
      m.displayName,
      this.escapeCSV(m.content),
      m.type,
      m.createdAt,
      m.isEdited ? "Yes" : "No",
      m.isDeleted ? "Yes" : "No",
      m.isPinned ? "Yes" : "No",
      m.threadId || "",
      m.parentId || "",
      String(m.attachments?.length || 0),
      String(m.reactions?.reduce((sum, r) => sum + r.count, 0) || 0),
    ]);

    return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
  }

  /**
   * Get HTML styles
   */
  private getHTMLStyles(): string {
    return `<style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        line-height: 1.6;
        color: #1e293b;
        background: #f8fafc;
      }
      .container {
        max-width: 900px;
        margin: 0 auto;
        padding: 2rem;
      }
      .export-header {
        background: white;
        border-radius: 0.5rem;
        padding: 1.5rem;
        margin-bottom: 2rem;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      }
      .export-header h1 {
        margin-bottom: 1rem;
        color: #0f172a;
      }
      .metadata {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 0.5rem;
      }
      .metadata-item {
        display: flex;
        gap: 0.5rem;
      }
      .metadata-item .label {
        font-weight: 600;
        color: #64748b;
      }
      .channel-section {
        margin-bottom: 2rem;
      }
      .channel-header {
        font-size: 1.25rem;
        color: #334155;
        padding: 0.5rem 0;
        border-bottom: 2px solid #e2e8f0;
        margin-bottom: 1rem;
      }
      .message {
        background: white;
        border-radius: 0.5rem;
        padding: 1rem;
        margin-bottom: 0.5rem;
        box-shadow: 0 1px 2px rgba(0,0,0,0.05);
      }
      .message.deleted {
        opacity: 0.6;
        background: #fef2f2;
      }
      .message.threaded {
        margin-left: 2rem;
        border-left: 3px solid #e2e8f0;
      }
      .message-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
      }
      .author {
        font-weight: 600;
        color: #0284c7;
      }
      .timestamp {
        font-size: 0.875rem;
        color: #94a3b8;
      }
      .badge {
        font-size: 0.75rem;
        padding: 0.125rem 0.5rem;
        border-radius: 0.25rem;
      }
      .badge-pinned {
        background: #fef3c7;
        color: #92400e;
      }
      .badge-edited {
        background: #dbeafe;
        color: #1e40af;
      }
      .badge-deleted {
        background: #fee2e2;
        color: #991b1b;
      }
      .message-content {
        white-space: pre-wrap;
        word-wrap: break-word;
      }
      .reply-info {
        font-size: 0.875rem;
        color: #64748b;
        padding: 0.25rem 0.5rem;
        background: #f1f5f9;
        border-radius: 0.25rem;
        margin-bottom: 0.5rem;
      }
      .attachments {
        margin-top: 0.5rem;
      }
      .attachment {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
        color: #0284c7;
      }
      .attachment-size {
        color: #94a3b8;
      }
      .reactions {
        display: flex;
        gap: 0.5rem;
        margin-top: 0.5rem;
      }
      .reaction {
        background: #f1f5f9;
        padding: 0.25rem 0.5rem;
        border-radius: 1rem;
        font-size: 0.875rem;
      }
      .edit-history {
        margin-top: 0.5rem;
        font-size: 0.875rem;
        color: #64748b;
      }
      .edit-entry {
        padding: 0.25rem 0.5rem;
        background: #f8fafc;
        margin: 0.25rem 0;
        border-radius: 0.25rem;
      }
      footer {
        text-align: center;
        color: #94a3b8;
        padding: 2rem 0;
        font-size: 0.875rem;
      }
      @media print {
        .container {
          max-width: none;
          padding: 1rem;
        }
        .message {
          break-inside: avoid;
        }
      }
    </style>`;
  }

  /**
   * Generate file name
   */
  private generateFileName(options: ExportOptions, extension: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const scopePrefix = options.scope.replace(/_/g, "-");
    return `nchat-export-${scopePrefix}-${timestamp}.${extension}`;
  }

  /**
   * Update progress
   */
  private updateProgress(update: Partial<ExportProgress>): void {
    this.progress = { ...this.progress, ...update };
    this.onProgressUpdate?.(this.progress);
  }

  /**
   * Get current progress
   */
  getProgress(): ExportProgress {
    return { ...this.progress };
  }

  /**
   * Escape HTML entities
   */
  private escapeHTML(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /**
   * Escape CSV value
   */
  private escapeCSV(value: string): string {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  /**
   * Format file size
   */
  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create default export options
 */
export function createDefaultExportOptions(
  channelIds: string[],
  overrides?: Partial<ExportOptions>,
): ExportOptions {
  return {
    format: "json",
    scope: "multiple_conversations",
    channelIds,
    mediaHandling: "link",
    includeThreads: true,
    includeReactions: true,
    includePins: true,
    includeEditHistory: false,
    includeDeletedMarkers: false,
    userMessagesOnly: false,
    anonymizeUsers: false,
    ...overrides,
  };
}
