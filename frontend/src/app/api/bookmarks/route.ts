/**
 * Bookmarks API Route
 *
 * REST API endpoints for bookmark operations including export functionality.
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

const GRAPHQL_URL =
  process.env.NEXT_PUBLIC_GRAPHQL_URL || "http://api.localhost/v1/graphql";
const ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;

interface HasuraBookmark {
  id: string;
  user_id: string;
  message_id: string;
  note: string | null;
  created_at: string;
  message?: {
    id: string;
    content: string;
    created_at: string;
    channel?: { id: string; name: string };
    user?: { id: string; display_name: string };
  };
}

async function fetchBookmarksFromDatabase(
  userId: string,
  limit = 50,
  offset = 0,
  channelId?: string,
): Promise<{ bookmarks: HasuraBookmark[]; total: number }> {
  if (!ADMIN_SECRET) {
    logger.warn("HASURA_ADMIN_SECRET not set, cannot fetch bookmarks");
    return { bookmarks: [], total: 0 };
  }

  const channelFilter = channelId
    ? ", message: { channel_id: { _eq: $channelId } }"
    : "";

  const query = `
    query GetBookmarksREST(
      $userId: uuid!
      $limit: Int!
      $offset: Int!
      ${channelId ? "$channelId: uuid" : ""}
    ) {
      nchat_bookmarks(
        where: {
          user_id: { _eq: $userId }
          message: { is_deleted: { _eq: false }${channelId ? ", channel_id: { _eq: $channelId }" : ""} }
        }
        order_by: { created_at: desc }
        limit: $limit
        offset: $offset
      ) {
        id
        user_id
        message_id
        note
        created_at
        message {
          id
          content
          created_at
          channel {
            id
            name
          }
          user {
            id
            display_name
          }
        }
      }
      nchat_bookmarks_aggregate(
        where: {
          user_id: { _eq: $userId }
          message: { is_deleted: { _eq: false }${channelFilter} }
        }
      ) {
        aggregate {
          count
        }
      }
    }
  `;

  const variables: Record<string, unknown> = { userId, limit, offset };
  if (channelId) variables.channelId = channelId;

  const response = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-hasura-admin-secret": ADMIN_SECRET,
    },
    body: JSON.stringify({ query, variables }),
  });

  const result = await response.json();

  if (result.errors) {
    logger.error("GraphQL error fetching bookmarks:", result.errors);
    return { bookmarks: [], total: 0 };
  }

  return {
    bookmarks: result.data?.nchat_bookmarks ?? [],
    total: result.data?.nchat_bookmarks_aggregate?.aggregate?.count ?? 0,
  };
}

// ============================================================================
// GET /api/bookmarks
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");
    const export_format = searchParams.get("export");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 },
      );
    }

    // If export parameter is provided, handle export
    if (export_format) {
      return handleExport(userId, export_format, searchParams);
    }

    const limit = Math.min(
      parseInt(searchParams.get("limit") || "50", 10),
      100,
    );
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const channelId = searchParams.get("channelId") || undefined;

    const { bookmarks, total } = await fetchBookmarksFromDatabase(
      userId,
      limit,
      offset,
      channelId,
    );

    return NextResponse.json({
      bookmarks: bookmarks.map((b) => ({
        id: b.id,
        messageId: b.message_id,
        userId: b.user_id,
        note: b.note,
        bookmarkedAt: b.created_at,
        message: b.message
          ? {
              id: b.message.id,
              content: b.message.content,
              createdAt: b.message.created_at,
              channel: b.message.channel,
              author: b.message.user
                ? {
                    id: b.message.user.id,
                    displayName: b.message.user.display_name,
                  }
                : null,
            }
          : null,
      })),
      total,
    });
  } catch (error) {
    logger.error("Failed to get bookmarks", error as Error);
    return NextResponse.json(
      { error: "Failed to get bookmarks", details: (error as Error).message },
      { status: 500 },
    );
  }
}

// ============================================================================
// POST /api/bookmarks
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case "add":
        return handleAddBookmark(data);
      case "remove":
        return handleRemoveBookmark(data);
      case "update":
        return handleUpdateBookmark(data);
      case "export":
        return handleExportBookmarks(data);
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    logger.error("Failed to process bookmark action", error as Error);
    return NextResponse.json(
      {
        error: "Failed to process bookmark action",
        details: (error as Error).message,
      },
      { status: 500 },
    );
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

async function handleAddBookmark(data: {
  userId: string;
  messageId: string;
  note?: string;
  tags?: string[];
  collectionIds?: string[];
}) {
  try {
    const { userId, messageId, note } = data;

    if (!userId || !messageId) {
      return NextResponse.json(
        { error: "userId and messageId are required" },
        { status: 400 },
      );
    }

    logger.info("Adding bookmark", { userId, messageId });

    if (!ADMIN_SECRET) {
      logger.warn("HASURA_ADMIN_SECRET not set, bookmark not persisted");
      return NextResponse.json(
        { error: "Bookmark service unavailable" },
        { status: 503 },
      );
    }

    const mutation = `
      mutation AddBookmark($userId: uuid!, $messageId: uuid!, $note: String) {
        insert_nchat_bookmarks_one(
          object: { user_id: $userId, message_id: $messageId, note: $note }
          on_conflict: {
            constraint: nchat_bookmarks_user_id_message_id_key
            update_columns: [note]
          }
        ) {
          id
          user_id
          message_id
          note
          created_at
        }
      }
    `;

    const response = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-hasura-admin-secret": ADMIN_SECRET,
      },
      body: JSON.stringify({
        query: mutation,
        variables: { userId, messageId, note },
      }),
    });

    const result = await response.json();

    if (result.errors) {
      logger.error("GraphQL error adding bookmark:", result.errors);
      return NextResponse.json(
        { error: "Failed to add bookmark" },
        { status: 500 },
      );
    }

    const bookmark = result.data?.insert_nchat_bookmarks_one;
    return NextResponse.json({
      success: true,
      message: "Bookmark added successfully",
      bookmark: {
        id: bookmark?.id,
        userId: bookmark?.user_id,
        messageId: bookmark?.message_id,
        note: bookmark?.note,
        bookmarkedAt: bookmark?.created_at,
      },
    });
  } catch (error) {
    logger.error("Failed to add bookmark", error as Error);
    throw error;
  }
}

async function handleRemoveBookmark(data: {
  bookmarkId?: string;
  userId?: string;
  messageId?: string;
}) {
  try {
    const { bookmarkId, userId, messageId } = data;

    if (!bookmarkId && !(userId && messageId)) {
      return NextResponse.json(
        { error: "bookmarkId or (userId + messageId) is required" },
        { status: 400 },
      );
    }

    logger.info("Removing bookmark", { bookmarkId, userId, messageId });

    if (!ADMIN_SECRET) {
      return NextResponse.json(
        { error: "Bookmark service unavailable" },
        { status: 503 },
      );
    }

    let mutation: string;
    let variables: Record<string, unknown>;

    if (bookmarkId) {
      mutation = `
        mutation RemoveBookmarkById($id: uuid!) {
          delete_nchat_bookmarks(where: { id: { _eq: $id } }) {
            affected_rows
          }
        }
      `;
      variables = { id: bookmarkId };
    } else {
      mutation = `
        mutation RemoveBookmarkByMessage($userId: uuid!, $messageId: uuid!) {
          delete_nchat_bookmarks(
            where: { user_id: { _eq: $userId }, message_id: { _eq: $messageId } }
          ) {
            affected_rows
          }
        }
      `;
      variables = { userId, messageId };
    }

    const response = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-hasura-admin-secret": ADMIN_SECRET,
      },
      body: JSON.stringify({ query: mutation, variables }),
    });

    const result = await response.json();

    if (result.errors) {
      logger.error("GraphQL error removing bookmark:", result.errors);
      return NextResponse.json(
        { error: "Failed to remove bookmark" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Bookmark removed successfully",
    });
  } catch (error) {
    logger.error("Failed to remove bookmark", error as Error);
    throw error;
  }
}

async function handleUpdateBookmark(data: {
  bookmarkId: string;
  note?: string;
  tags?: string[];
  collectionIds?: string[];
}) {
  try {
    const { bookmarkId, note } = data;

    if (!bookmarkId) {
      return NextResponse.json(
        { error: "bookmarkId is required" },
        { status: 400 },
      );
    }

    logger.info("Updating bookmark", { bookmarkId });

    if (!ADMIN_SECRET) {
      return NextResponse.json(
        { error: "Bookmark service unavailable" },
        { status: 503 },
      );
    }

    const mutation = `
      mutation UpdateBookmark($id: uuid!, $note: String) {
        update_nchat_bookmarks(
          where: { id: { _eq: $id } }
          _set: { note: $note }
        ) {
          returning {
            id
            user_id
            message_id
            note
            created_at
          }
        }
      }
    `;

    const response = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-hasura-admin-secret": ADMIN_SECRET,
      },
      body: JSON.stringify({
        query: mutation,
        variables: { id: bookmarkId, note },
      }),
    });

    const result = await response.json();

    if (result.errors) {
      logger.error("GraphQL error updating bookmark:", result.errors);
      return NextResponse.json(
        { error: "Failed to update bookmark" },
        { status: 500 },
      );
    }

    const updated = result.data?.update_nchat_bookmarks?.returning?.[0];
    return NextResponse.json({
      success: true,
      message: "Bookmark updated successfully",
      bookmark: updated
        ? {
            id: updated.id,
            userId: updated.user_id,
            messageId: updated.message_id,
            note: updated.note,
            bookmarkedAt: updated.created_at,
          }
        : null,
    });
  } catch (error) {
    logger.error("Failed to update bookmark", error as Error);
    throw error;
  }
}

async function handleExportBookmarks(data: {
  userId: string;
  format: "json" | "csv" | "markdown" | "html";
  options?: {
    includeContent?: boolean;
    includeAttachments?: boolean;
    includeMetadata?: boolean;
    collectionIds?: string[];
    channelIds?: string[];
  };
}) {
  try {
    const { userId, format } = data;

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 },
      );
    }

    logger.info("Exporting bookmarks", { userId, format });

    // Fetch all bookmarks for export (up to 1000)
    const { bookmarks, total } = await fetchBookmarksFromDatabase(
      userId,
      1000,
      0,
    );

    const exportData = {
      exportedAt: new Date().toISOString(),
      format,
      totalCount: total,
      bookmarks: bookmarks.map((b) => ({
        id: b.id,
        content: b.message?.content ?? "",
        bookmarkedAt: b.created_at,
        note: b.note,
        tags: [] as string[],
        channel: b.message?.channel ?? null,
        author: b.message?.user
          ? { displayName: b.message.user.display_name }
          : null,
      })),
    };

    return formatAndServeExport(exportData, format);
  } catch (error) {
    logger.error("Failed to export bookmarks", error as Error);
    throw error;
  }
}

async function handleExport(
  userId: string,
  format: string,
  searchParams: URLSearchParams,
) {
  try {
    logger.info("Exporting bookmarks via GET", { userId, format });

    const { bookmarks, total } = await fetchBookmarksFromDatabase(
      userId,
      1000,
      0,
    );

    const exportData = {
      exportedAt: new Date().toISOString(),
      format,
      totalCount: total,
      bookmarks: bookmarks.map((b) => ({
        id: b.id,
        content: b.message?.content ?? "",
        bookmarkedAt: b.created_at,
        note: b.note,
        tags: [] as string[],
        channel: b.message?.channel ?? null,
        author: b.message?.user
          ? { displayName: b.message.user.display_name }
          : null,
      })),
      options: {
        includeContent: searchParams.get("includeContent") !== "false",
        includeAttachments: searchParams.get("includeAttachments") === "true",
        includeMetadata: searchParams.get("includeMetadata") === "true",
      },
    };

    return formatAndServeExport(exportData, format);
  } catch (error) {
    logger.error("Failed to export bookmarks", error as Error);
    throw error;
  }
}

// ============================================================================
// Format helpers
// ============================================================================

interface ExportBookmark {
  id: string;
  content: string;
  bookmarkedAt: string;
  note: string | null;
  tags: string[];
  channel: { id: string; name: string } | null;
  author: { displayName: string } | null;
}

interface ExportData {
  exportedAt: string;
  format: string;
  totalCount: number;
  bookmarks: ExportBookmark[];
}

function formatAndServeExport(
  exportData: ExportData,
  format: string,
): NextResponse {
  let content: string;
  let mimeType: string;
  const filename = `bookmarks-${Date.now()}`;

  switch (format) {
    case "csv":
      content = convertToCSV(exportData);
      mimeType = "text/csv";
      return new NextResponse(content, {
        headers: {
          "Content-Type": mimeType,
          "Content-Disposition": `attachment; filename="${filename}.csv"`,
        },
      });
    case "markdown":
      content = convertToMarkdown(exportData);
      mimeType = "text/markdown";
      return new NextResponse(content, {
        headers: {
          "Content-Type": mimeType,
          "Content-Disposition": `attachment; filename="${filename}.md"`,
        },
      });
    case "html":
      content = convertToHTML(exportData);
      mimeType = "text/html";
      return new NextResponse(content, {
        headers: {
          "Content-Type": mimeType,
          "Content-Disposition": `attachment; filename="${filename}.html"`,
        },
      });
    case "json":
    default:
      content = JSON.stringify(exportData, null, 2);
      return new NextResponse(content, {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="${filename}.json"`,
        },
      });
  }
}

function convertToCSV(data: ExportData): string {
  const headers = [
    "ID",
    "Content",
    "Bookmarked At",
    "Note",
    "Tags",
    "Channel",
    "Author",
  ];
  const rows = data.bookmarks.map((b) => [
    b.id,
    `"${(b.content || "").replace(/"/g, '""')}"`,
    b.bookmarkedAt,
    `"${(b.note || "").replace(/"/g, '""')}"`,
    b.tags.join("; "),
    b.channel?.name || "",
    b.author?.displayName || "",
  ]);
  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

function convertToMarkdown(data: ExportData): string {
  let md = `# Bookmarks Export\n\nExported at: ${data.exportedAt}\nTotal bookmarks: ${data.totalCount}\n\n---\n\n`;
  if (data.bookmarks.length === 0) {
    md += "No bookmarks to export.\n";
  } else {
    data.bookmarks.forEach((b, index) => {
      md += `## ${index + 1}. ${b.channel?.name || "Unknown Channel"}\n\n`;
      md += `**Author:** ${b.author?.displayName || "Unknown"}\n`;
      md += `**Bookmarked:** ${b.bookmarkedAt}\n\n`;
      if (b.content) md += `${b.content}\n\n`;
      if (b.note) md += `> Note: ${b.note}\n\n`;
      if (b.tags.length > 0) md += `Tags: ${b.tags.join(", ")}\n\n`;
      md += `---\n\n`;
    });
  }
  return md;
}

function convertToHTML(data: ExportData): string {
  const bookmarkItems =
    data.bookmarks.length === 0
      ? "<p>No bookmarks to export.</p>"
      : data.bookmarks
          .map(
            (b) => `
  <div class="bookmark">
    <div class="bookmark-header">
      <span><strong>${b.author?.displayName || "Unknown"}</strong> in #${b.channel?.name || "unknown"}</span>
      <span>${b.bookmarkedAt}</span>
    </div>
    ${b.content ? `<div class="bookmark-content">${b.content}</div>` : ""}
    ${b.note ? `<div class="bookmark-note">Note: ${b.note}</div>` : ""}
    ${
      b.tags.length > 0
        ? `<div class="tags">${b.tags.map((t) => `<span class="tag">${t}</span>`).join("")}</div>`
        : ""
    }
  </div>`,
          )
          .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bookmarks Export</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; line-height: 1.6; }
    .header { border-bottom: 2px solid #e5e7eb; padding-bottom: 1rem; margin-bottom: 2rem; }
    .bookmark { border: 1px solid #e5e7eb; border-radius: .5rem; padding: 1rem; margin-bottom: 1rem; }
    .bookmark-header { display: flex; justify-content: space-between; margin-bottom: .5rem; font-size: .875rem; color: #6b7280; }
    .bookmark-content { margin-bottom: .5rem; }
    .bookmark-note { background: #f9fafb; padding: .5rem; border-radius: .25rem; margin-bottom: .5rem; font-size: .875rem; color: #6b7280; }
    .tags { display: flex; gap: .5rem; flex-wrap: wrap; }
    .tag { background: #e5e7eb; padding: .25rem .5rem; border-radius: .25rem; font-size: .75rem; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Bookmarks Export</h1>
    <p>Exported at: ${data.exportedAt}</p>
    <p>Total bookmarks: ${data.totalCount}</p>
  </div>
  ${bookmarkItems}
</body>
</html>`;
}
