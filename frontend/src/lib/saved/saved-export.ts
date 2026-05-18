/**
 * Saved Export
 *
 * Export functionality for saved messages.
 */

import type {
  SavedMessage,
  SavedCollection,
  ExportFormat,
  ExportOptions,
  ExportResult,
} from "./saved-types";

// ============================================================================
// Export Implementation
// ============================================================================

/**
 * Export saved messages in various formats.
 */
export function exportSavedMessages(
  messages: SavedMessage[],
  collections: SavedCollection[],
  options: ExportOptions,
): ExportResult {
  try {
    // Filter messages
    let filtered = [...messages];

    if (options.collectionId) {
      filtered = filtered.filter((m) =>
        m.collectionIds.includes(options.collectionId!),
      );
    }

    if (options.dateFrom) {
      filtered = filtered.filter((m) => m.savedAt >= options.dateFrom!);
    }

    if (options.dateTo) {
      filtered = filtered.filter((m) => m.savedAt <= options.dateTo!);
    }

    // Generate export based on format
    switch (options.format) {
      case "json":
        return exportAsJson(filtered, collections, options);
      case "markdown":
        return exportAsMarkdown(filtered, collections, options);
      case "html":
        return exportAsHtml(filtered, collections, options);
      case "csv":
        return exportAsCsv(filtered, options);
      default:
        return {
          success: false,
          filename: "",
          mimeType: "",
          error: "Invalid export format",
        };
    }
  } catch (error) {
    return {
      success: false,
      filename: "",
      mimeType: "",
      error: error instanceof Error ? error.message : "Export failed",
    };
  }
}

// ============================================================================
// JSON Export
// ============================================================================

function exportAsJson(
  messages: SavedMessage[],
  collections: SavedCollection[],
  options: ExportOptions,
): ExportResult {
  const data = {
    exportedAt: new Date().toISOString(),
    totalMessages: messages.length,
    collections: collections.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      itemCount: c.itemCount,
    })),
    messages: messages.map((m) => ({
      id: m.id,
      savedAt: m.savedAt.toISOString(),
      channelId: m.channelId,
      ...(options.includeContent && {
        content: m.message.content,
        author: m.message.user.displayName,
        messageDate: m.message.createdAt,
      }),
      ...(options.includeNotes && m.note && { note: m.note }),
      ...(options.includeTags && { tags: m.tags }),
      ...(options.includeAttachments &&
        m.message.attachments && {
          attachments: m.message.attachments.map((a) => ({
            name: a.name,
            type: a.type,
            url: a.url,
          })),
        }),
      collectionIds: m.collectionIds,
      isStarred: m.isStarred,
    })),
  };

  return {
    success: true,
    data: JSON.stringify(data, null, 2),
    filename: `saved-messages-${formatDate(new Date())}.json`,
    mimeType: "application/json",
  };
}

// ============================================================================
// Markdown Export
// ============================================================================

function exportAsMarkdown(
  messages: SavedMessage[],
  collections: SavedCollection[],
  options: ExportOptions,
): ExportResult {
  const lines: string[] = [];

  lines.push("# Saved Messages Export");
  lines.push("");
  lines.push(`Exported on: ${new Date().toLocaleString()}`);
  lines.push(`Total messages: ${messages.length}`);
  lines.push("");

  // Group by collection
  const byCollection = new Map<string | null, SavedMessage[]>();
  messages.forEach((m) => {
    if (m.collectionIds.length === 0) {
      const arr = byCollection.get(null) ?? [];
      arr.push(m);
      byCollection.set(null, arr);
    } else {
      m.collectionIds.forEach((cid) => {
        const arr = byCollection.get(cid) ?? [];
        arr.push(m);
        byCollection.set(cid, arr);
      });
    }
  });

  // Export each collection
  for (const [collId, collMessages] of byCollection) {
    const collection = collections.find((c) => c.id === collId);
    const collName = collection?.name ?? "Uncategorized";

    lines.push(`## ${collName}`);
    lines.push("");

    for (const msg of collMessages) {
      lines.push(
        `### ${msg.isStarred ? "*** " : ""}${msg.message.user.displayName}`,
      );
      lines.push(`*Saved: ${msg.savedAt.toLocaleDateString()}*`);
      lines.push("");

      if (options.includeContent) {
        lines.push(msg.message.content);
        lines.push("");
      }

      if (options.includeNotes && msg.note) {
        lines.push(`> **Note:** ${msg.note}`);
        lines.push("");
      }

      if (options.includeTags && msg.tags.length > 0) {
        lines.push(`Tags: ${msg.tags.map((t) => `\`${t}\``).join(", ")}`);
        lines.push("");
      }

      if (
        options.includeAttachments &&
        msg.message.attachments &&
        msg.message.attachments.length > 0
      ) {
        lines.push("**Attachments:**");
        msg.message.attachments.forEach((a) => {
          lines.push(`- [${a.name}](${a.url})`);
        });
        lines.push("");
      }

      lines.push("---");
      lines.push("");
    }
  }

  return {
    success: true,
    data: lines.join("\n"),
    filename: `saved-messages-${formatDate(new Date())}.md`,
    mimeType: "text/markdown",
  };
}

// ============================================================================
// HTML Export
// ============================================================================

function exportAsHtml(
  messages: SavedMessage[],
  collections: SavedCollection[],
  options: ExportOptions,
): ExportResult {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Saved Messages Export</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    h1 { color: #1a1a1a; }
    .message {
      background: white;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .message-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .author {
      font-weight: 600;
      color: #333;
    }
    .date {
      color: #666;
      font-size: 0.875rem;
    }
    .content {
      color: #1a1a1a;
      line-height: 1.5;
      white-space: pre-wrap;
    }
    .note {
      background: #fffbeb;
      border-left: 3px solid #f59e0b;
      padding: 8px 12px;
      margin-top: 12px;
      font-size: 0.875rem;
    }
    .tags {
      margin-top: 12px;
    }
    .tag {
      display: inline-block;
      background: #e5e7eb;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.75rem;
      margin-right: 4px;
    }
    .starred {
      color: #f59e0b;
    }
    .attachments {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid #e5e7eb;
    }
    .attachment {
      color: #3b82f6;
      text-decoration: none;
    }
    .collection-header {
      margin-top: 32px;
      padding-bottom: 8px;
      border-bottom: 2px solid #3b82f6;
    }
  </style>
</head>
<body>
  <h1>Saved Messages</h1>
  <p>Exported on ${new Date().toLocaleString()} - ${messages.length} messages</p>

  ${messages
    .map(
      (m) => `
    <div class="message">
      <div class="message-header">
        <span class="author">${m.isStarred ? '<span class="starred">&#9733;</span> ' : ""}${escapeHtml(m.message.user.displayName)}</span>
        <span class="date">${m.savedAt.toLocaleDateString()}</span>
      </div>
      ${options.includeContent ? `<div class="content">${escapeHtml(m.message.content)}</div>` : ""}
      ${options.includeNotes && m.note ? `<div class="note">${escapeHtml(m.note)}</div>` : ""}
      ${options.includeTags && m.tags.length > 0 ? `<div class="tags">${m.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("")}</div>` : ""}
      ${
        options.includeAttachments &&
        m.message.attachments &&
        m.message.attachments.length > 0
          ? `<div class="attachments">
              <strong>Attachments:</strong>
              ${m.message.attachments.map((a) => `<a class="attachment" href="${a.url}">${escapeHtml(a.name)}</a>`).join(", ")}
            </div>`
          : ""
      }
    </div>
  `,
    )
    .join("")}
</body>
</html>
  `.trim();

  return {
    success: true,
    data: html,
    filename: `saved-messages-${formatDate(new Date())}.html`,
    mimeType: "text/html",
  };
}

// ============================================================================
// CSV Export
// ============================================================================

function exportAsCsv(
  messages: SavedMessage[],
  options: ExportOptions,
): ExportResult {
  const headers = ["ID", "Saved At", "Author", "Channel"];

  if (options.includeContent) {
    headers.push("Content");
  }
  if (options.includeNotes) {
    headers.push("Note");
  }
  if (options.includeTags) {
    headers.push("Tags");
  }
  headers.push("Starred");

  const rows = messages.map((m) => {
    const row = [
      m.id,
      m.savedAt.toISOString(),
      m.message.user.displayName,
      m.channelId,
    ];

    if (options.includeContent) {
      row.push(csvEscape(m.message.content));
    }
    if (options.includeNotes) {
      row.push(csvEscape(m.note ?? ""));
    }
    if (options.includeTags) {
      row.push(m.tags.join(";"));
    }
    row.push(m.isStarred ? "Yes" : "No");

    return row;
  });

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

  return {
    success: true,
    data: csv,
    filename: `saved-messages-${formatDate(new Date())}.csv`,
    mimeType: "text/csv",
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

function csvEscape(text: string): string {
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

// ============================================================================
// Download Helper
// ============================================================================

/**
 * Trigger download of export result.
 */
export function downloadExport(result: ExportResult): void {
  if (!result.success || !result.data) return;

  const blob =
    result.data instanceof Blob
      ? result.data
      : new Blob([result.data], { type: result.mimeType });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = result.filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
