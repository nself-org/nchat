/**
 * Data Export Formatters
 *
 * Converts exported data into various formats (JSON, CSV, HTML, PDF).
 */

import type {
  ExportData,
  ExportedMessage,
  MessageCSVRow,
  HTMLExportOptions,
} from "./types";

// ============================================================================
// JSON Formatter
// ============================================================================

export class JSONFormatter {
  format(data: ExportData): string {
    return JSON.stringify(data, null, 2);
  }

  formatStream(data: ExportData): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder();
    let hasStarted = false;
    let messageIndex = 0;

    return new ReadableStream({
      start(controller) {
        // Start JSON object and metadata
        const header = JSON.stringify(
          {
            metadata: data.metadata,
            channels: data.channels || [],
            users: data.users || [],
          },
          null,
          2,
        );

        controller.enqueue(
          encoder.encode(header.slice(0, -1) + ',\n  "messages": [\n'),
        );
        hasStarted = true;
      },

      pull(controller) {
        if (messageIndex < data.messages.length) {
          const message = data.messages[messageIndex];
          const json = JSON.stringify(message, null, 4);
          const prefix = messageIndex > 0 ? ",\n" : "";
          const chunk = `${prefix}    ${json.split("\n").join("\n    ")}`;
          controller.enqueue(encoder.encode(chunk));
          messageIndex++;
        } else {
          // Close messages array and JSON object
          controller.enqueue(encoder.encode("\n  ]\n}"));
          controller.close();
        }
      },
    });
  }
}

// ============================================================================
// CSV Formatter
// ============================================================================

export class CSVFormatter {
  private escapeCSV(
    value: string | number | boolean | null | undefined,
  ): string {
    if (value === null || value === undefined) return "";
    const str = String(value);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  format(data: ExportData): string {
    const rows = this.convertToCSVRows(data.messages);
    const headers = Object.keys(rows[0] || {});

    const csvLines = [
      headers.join(","),
      ...rows.map((row) =>
        headers
          .map((header) => this.escapeCSV(row[header as keyof MessageCSVRow]))
          .join(","),
      ),
    ];

    return csvLines.join("\n");
  }

  formatStream(data: ExportData): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder();
    let headerSent = false;
    let messageIndex = 0;
    // Capture reference to this for use inside ReadableStream callbacks
    const self = this;

    return new ReadableStream({
      pull(controller) {
        if (!headerSent) {
          const headers = [
            "message_id",
            "channel_name",
            "username",
            "display_name",
            "content",
            "created_at",
            "is_edited",
            "is_deleted",
            "has_attachments",
            "reactions_count",
            "thread_replies_count",
          ];
          controller.enqueue(encoder.encode(headers.join(",") + "\n"));
          headerSent = true;
        }

        if (messageIndex < data.messages.length) {
          const message = data.messages[messageIndex];
          const row = self.convertMessageToCSVRow(message);
          const values = [
            row.message_id,
            row.channel_name,
            row.username,
            row.display_name,
            row.content,
            row.created_at,
            row.is_edited,
            row.is_deleted,
            row.has_attachments,
            row.reactions_count,
            row.thread_replies_count,
          ];
          const line = values.map((v) => self.escapeCSV(v)).join(",") + "\n";
          controller.enqueue(encoder.encode(line));
          messageIndex++;
        } else {
          controller.close();
        }
      },
    });
  }

  private convertMessageToCSVRow(message: ExportedMessage): MessageCSVRow {
    return {
      message_id: message.id,
      channel_name: message.channelName,
      username: message.username,
      display_name: message.displayName,
      content: message.content.replace(/\n/g, " "),
      created_at: message.createdAt,
      is_edited: message.isEdited ? "Yes" : "No",
      is_deleted: message.isDeleted ? "Yes" : "No",
      has_attachments:
        message.attachments && message.attachments.length > 0 ? "Yes" : "No",
      reactions_count: String(message.reactions?.length || 0),
      thread_replies_count: String(message.thread?.totalReplies || 0),
    };
  }

  private convertToCSVRows(messages: ExportedMessage[]): MessageCSVRow[] {
    return messages.map((msg) => this.convertMessageToCSVRow(msg));
  }
}

// ============================================================================
// HTML Formatter
// ============================================================================

export class HTMLFormatter {
  format(
    data: ExportData,
    options: HTMLExportOptions = {
      theme: "light",
      includeStyles: true,
      standalone: true,
    },
  ): string {
    const styles = options.includeStyles ? this.getStyles(options.theme) : "";
    const metadata = this.formatMetadata(data.metadata);
    const messages = this.formatMessages(data.messages, options.theme);

    if (options.standalone) {
      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Chat Export - ${data.metadata.exportedAt}</title>
  ${styles}
</head>
<body class="${options.theme}">
  <div class="export-container">
    ${metadata}
    ${messages}
  </div>
</body>
</html>`;
    }

    return `<div class="export-container">${metadata}${messages}</div>`;
  }

  private getStyles(theme: "light" | "dark"): string {
    const isDark = theme === "dark";
    return `<style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        line-height: 1.6;
        color: ${isDark ? "#f8fafc" : "#1e293b"};
        background: ${isDark ? "#0f172a" : "#ffffff"};
      }

      .export-container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 2rem;
      }

      .metadata {
        background: ${isDark ? "#1e293b" : "#f8fafc"};
        border: 1px solid ${isDark ? "#334155" : "#e2e8f0"};
        border-radius: 0.5rem;
        padding: 1.5rem;
        margin-bottom: 2rem;
      }

      .metadata h1 {
        font-size: 1.5rem;
        margin-bottom: 1rem;
        color: ${isDark ? "#38bdf8" : "#0284c7"};
      }

      .metadata-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
      }

      .metadata-item {
        display: flex;
        flex-direction: column;
      }

      .metadata-label {
        font-size: 0.875rem;
        color: ${isDark ? "#94a3b8" : "#64748b"};
        margin-bottom: 0.25rem;
      }

      .metadata-value {
        font-weight: 600;
      }

      .messages {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .message {
        background: ${isDark ? "#1e293b" : "#ffffff"};
        border: 1px solid ${isDark ? "#334155" : "#e2e8f0"};
        border-radius: 0.5rem;
        padding: 1rem;
        transition: box-shadow 0.2s;
      }

      .message:hover {
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      }

      .message-header {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 0.5rem;
      }

      .message-author {
        font-weight: 600;
        color: ${isDark ? "#38bdf8" : "#0284c7"};
      }

      .message-timestamp {
        font-size: 0.875rem;
        color: ${isDark ? "#94a3b8" : "#64748b"};
      }

      .message-channel {
        font-size: 0.875rem;
        color: ${isDark ? "#94a3b8" : "#64748b"};
        margin-left: auto;
      }

      .message-content {
        margin-bottom: 0.5rem;
        white-space: pre-wrap;
        word-wrap: break-word;
      }

      .message-attachments {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-top: 0.5rem;
      }

      .attachment {
        background: ${isDark ? "#334155" : "#f1f5f9"};
        padding: 0.5rem 0.75rem;
        border-radius: 0.375rem;
        font-size: 0.875rem;
        text-decoration: none;
        color: ${isDark ? "#38bdf8" : "#0284c7"};
      }

      .message-reactions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-top: 0.5rem;
      }

      .reaction {
        background: ${isDark ? "#334155" : "#f1f5f9"};
        padding: 0.25rem 0.5rem;
        border-radius: 0.375rem;
        font-size: 0.875rem;
      }

      .message-thread {
        margin-top: 0.5rem;
        padding-left: 1rem;
        border-left: 3px solid ${isDark ? "#334155" : "#e2e8f0"};
      }

      .thread-reply {
        padding: 0.5rem 0;
        font-size: 0.875rem;
      }

      .thread-reply-author {
        font-weight: 600;
        color: ${isDark ? "#94a3b8" : "#64748b"};
      }

      .badge {
        display: inline-block;
        font-size: 0.75rem;
        padding: 0.125rem 0.5rem;
        border-radius: 0.25rem;
        background: ${isDark ? "#334155" : "#e2e8f0"};
        color: ${isDark ? "#94a3b8" : "#64748b"};
        margin-left: 0.5rem;
      }

      .badge-edited {
        background: ${isDark ? "#064e3b" : "#d1fae5"};
        color: ${isDark ? "#6ee7b7" : "#065f46"};
      }

      .badge-deleted {
        background: ${isDark ? "#7f1d1d" : "#fee2e2"};
        color: ${isDark ? "#fca5a5" : "#991b1b"};
      }

      @media print {
        .export-container {
          padding: 0;
        }
        .message {
          break-inside: avoid;
        }
      }
    </style>`;
  }

  private formatMetadata(metadata: ExportData["metadata"]): string {
    return `
      <div class="metadata">
        <h1>Chat Export</h1>
        <div class="metadata-grid">
          <div class="metadata-item">
            <span class="metadata-label">Exported At</span>
            <span class="metadata-value">${new Date(metadata.exportedAt).toLocaleString()}</span>
          </div>
          <div class="metadata-item">
            <span class="metadata-label">Exported By</span>
            <span class="metadata-value">${metadata.exportedBy.username}</span>
          </div>
          <div class="metadata-item">
            <span class="metadata-label">Scope</span>
            <span class="metadata-value">${metadata.scope}</span>
          </div>
          <div class="metadata-item">
            <span class="metadata-label">Format</span>
            <span class="metadata-value">${metadata.format.toUpperCase()}</span>
          </div>
          <div class="metadata-item">
            <span class="metadata-label">Total Messages</span>
            <span class="metadata-value">${metadata.stats.totalMessages.toLocaleString()}</span>
          </div>
          <div class="metadata-item">
            <span class="metadata-label">Total Files</span>
            <span class="metadata-value">${metadata.stats.totalFiles.toLocaleString()}</span>
          </div>
          <div class="metadata-item">
            <span class="metadata-label">Total Users</span>
            <span class="metadata-value">${metadata.stats.totalUsers.toLocaleString()}</span>
          </div>
          <div class="metadata-item">
            <span class="metadata-label">Total Channels</span>
            <span class="metadata-value">${metadata.stats.totalChannels.toLocaleString()}</span>
          </div>
        </div>
      </div>
    `;
  }

  private formatMessages(
    messages: ExportedMessage[],
    theme: "light" | "dark",
  ): string {
    return `
      <div class="messages">
        ${messages.map((msg) => this.formatMessage(msg)).join("\n")}
      </div>
    `;
  }

  private formatMessage(message: ExportedMessage): string {
    const badges = [];
    if (message.isEdited)
      badges.push('<span class="badge badge-edited">Edited</span>');
    if (message.isDeleted)
      badges.push('<span class="badge badge-deleted">Deleted</span>');
    if (message.isPinned) badges.push('<span class="badge">Pinned</span>');

    const attachments = message.attachments?.length
      ? `<div class="message-attachments">
          ${message.attachments
            .map(
              (att) =>
                `<a href="${att.url}" class="attachment">${att.fileName}</a>`,
            )
            .join("")}
        </div>`
      : "";

    const reactions = message.reactions?.length
      ? `<div class="message-reactions">
          ${this.groupReactions(message.reactions)
            .map(
              ({ emoji, count }) =>
                `<span class="reaction">${emoji} ${count}</span>`,
            )
            .join("")}
        </div>`
      : "";

    const thread = message.thread?.totalReplies
      ? `<div class="message-thread">
          <strong>${message.thread.totalReplies} ${message.thread.totalReplies === 1 ? "reply" : "replies"}</strong>
          ${message.thread.replies
            .map(
              (reply) =>
                `<div class="thread-reply">
              <span class="thread-reply-author">${reply.username}:</span> ${reply.content}
            </div>`,
            )
            .join("")}
        </div>`
      : "";

    return `
      <div class="message">
        <div class="message-header">
          <span class="message-author">${message.displayName}</span>
          <span class="message-timestamp">${new Date(message.createdAt).toLocaleString()}</span>
          ${badges.join("")}
          <span class="message-channel">#${message.channelName}</span>
        </div>
        <div class="message-content">${this.escapeHTML(message.content)}</div>
        ${attachments}
        ${reactions}
        ${thread}
      </div>
    `;
  }

  private escapeHTML(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  private groupReactions(
    reactions: ExportedMessage["reactions"],
  ): Array<{ emoji: string; count: number }> {
    if (!reactions) return [];

    const grouped = reactions.reduce(
      (acc, reaction) => {
        acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.entries(grouped).map(([emoji, count]) => ({ emoji, count }));
  }
}

// ============================================================================
// PDF Formatter (Placeholder - requires server-side PDF generation)
// ============================================================================

export class PDFFormatter {
  format(data: ExportData): string {
    // PDF generation requires server-side processing with libraries like puppeteer or jsPDF
    // This is a placeholder that returns HTML that can be converted to PDF server-side
    const htmlFormatter = new HTMLFormatter();
    return htmlFormatter.format(data, {
      theme: "light",
      includeStyles: true,
      standalone: true,
    });
  }
}

// ============================================================================
// Factory
// ============================================================================

export function getFormatter(format: "json" | "csv" | "html" | "pdf") {
  switch (format) {
    case "json":
      return new JSONFormatter();
    case "csv":
      return new CSVFormatter();
    case "html":
      return new HTMLFormatter();
    case "pdf":
      return new PDFFormatter();
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}
