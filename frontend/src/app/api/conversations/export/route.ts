/**
 * Conversation Export API Route
 *
 * Handles conversation history exports with:
 * - Multiple formats (JSON, HTML, Text, CSV)
 * - Permission-based access control
 * - Large export handling with background jobs
 * - Progress tracking for long-running exports
 *
 * @endpoint POST /api/conversations/export - Start export
 * @endpoint GET /api/conversations/export - Get job status / download
 */

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import {
  ConversationExporter,
  createDefaultExportOptions,
  type ExportOptions,
  type ExportJob,
  type ExportStats,
  type ExportedMessage,
  type ExportedChannel,
  type ExportedUser,
} from "@/services/export";
import {
  successResponse,
  badRequestResponse,
  forbiddenResponse,
  notFoundResponse,
  internalErrorResponse,
} from "@/lib/api/response";
import {
  withErrorHandler,
  withRateLimit,
  withAuth,
  compose,
  type AuthenticatedRequest,
} from "@/lib/api/middleware";
import { withCsrfProtection } from "@/lib/security/csrf";
import { getServerApolloClient } from "@/lib/apollo-client";
import { gql } from "@apollo/client";
import { logger } from "@/lib/logger";

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Max messages for direct export (above this, use background job)
  DIRECT_EXPORT_LIMIT: 10000,

  // Max messages for any export
  MAX_MESSAGES: 100000,

  // Export job expiry (24 hours)
  JOB_EXPIRY: 24 * 60 * 60 * 1000,

  // Rate limiting (10 exports per hour)
  RATE_LIMIT: {
    limit: 10,
    window: 3600,
  },

  // Valid formats
  VALID_FORMATS: ["json", "html", "text", "csv"] as const,
};

// ============================================================================
// GRAPHQL QUERIES
// ============================================================================

/**
 * Get messages for export with authorization check
 */
const GET_MESSAGES_FOR_EXPORT = gql`
  query GetMessagesForExport(
    $userId: uuid!
    $channelIds: [uuid!]!
    $dateFrom: timestamptz
    $dateTo: timestamptz
    $userMessagesOnly: Boolean!
    $limit: Int!
  ) {
    nchat_messages(
      where: {
        _and: [
          { channel_id: { _in: $channelIds } }
          { channel: { members: { user_id: { _eq: $userId } } } }
          { created_at: { _gte: $dateFrom } }
          { created_at: { _lte: $dateTo } }
          {
            _or: [
              { user_id: { _eq: $userId } }
              { _not: { _and: [{ user_id: { _is_null: false } }] } }
            ]
          }
        ]
      }
      order_by: { created_at: asc }
      limit: $limit
    ) @include(if: $userMessagesOnly) {
      id
      content
      type
      created_at
      edited_at
      is_edited
      is_deleted
      is_pinned
      deleted_at
      channel_id
      user_id
      parent_id
      thread_id
      channel {
        id
        name
        slug
      }
      user {
        id
        username
        display_name
        avatar_url
      }
      parent {
        id
        content
        user {
          id
          username
          display_name
        }
      }
      attachments {
        id
        file_name
        file_url
        file_type
        file_size
      }
      reactions {
        emoji
        user {
          id
          username
        }
      }
      message_edits(order_by: { edited_at: desc }) {
        content
        edited_at
        editor {
          username
        }
      }
    }
    all_messages: nchat_messages(
      where: {
        _and: [
          { channel_id: { _in: $channelIds } }
          { channel: { members: { user_id: { _eq: $userId } } } }
          { created_at: { _gte: $dateFrom } }
          { created_at: { _lte: $dateTo } }
        ]
      }
      order_by: { created_at: asc }
      limit: $limit
    ) @skip(if: $userMessagesOnly) {
      id
      content
      type
      created_at
      edited_at
      is_edited
      is_deleted
      is_pinned
      deleted_at
      channel_id
      user_id
      parent_id
      thread_id
      channel {
        id
        name
        slug
      }
      user {
        id
        username
        display_name
        avatar_url
      }
      parent {
        id
        content
        user {
          id
          username
          display_name
        }
      }
      attachments {
        id
        file_name
        file_url
        file_type
        file_size
      }
      reactions {
        emoji
        user {
          id
          username
        }
      }
      message_edits(order_by: { edited_at: desc }) {
        content
        edited_at
        editor {
          username
        }
      }
    }
  }
`;

/**
 * Get channels with access check
 */
const GET_ACCESSIBLE_CHANNELS = gql`
  query GetAccessibleChannels($userId: uuid!, $channelIds: [uuid!]!) {
    nchat_channels(
      where: {
        _and: [
          { id: { _in: $channelIds } }
          { members: { user_id: { _eq: $userId } } }
        ]
      }
    ) {
      id
      name
      slug
      description
      type
      is_private
      is_archived
      created_at
      members_aggregate {
        aggregate {
          count
        }
      }
      messages_aggregate {
        aggregate {
          count
        }
      }
    }
  }
`;

/**
 * Get users for export
 */
const GET_USERS_FOR_EXPORT = gql`
  query GetUsersForExport($channelIds: [uuid!]!) {
    nchat_users(
      where: { channel_memberships: { channel_id: { _in: $channelIds } } }
      distinct_on: id
    ) {
      id
      username
      display_name
      email
      avatar_url
      role {
        name
      }
    }
  }
`;

/**
 * Check if user is admin of channels
 */
const CHECK_CHANNEL_ADMIN = gql`
  query CheckChannelAdmin($userId: uuid!, $channelIds: [uuid!]!) {
    nchat_channel_members(
      where: {
        user_id: { _eq: $userId }
        channel_id: { _in: $channelIds }
        role: { _in: ["owner", "admin"] }
      }
    ) {
      channel_id
    }
  }
`;

// ============================================================================
// IN-MEMORY JOB STORAGE (Use Redis in production)
// ============================================================================

const exportJobs = new Map<string, ExportJob>();
const exportData = new Map<string, string>();

// Cleanup expired jobs periodically
setInterval(() => {
  const now = Date.now();
  for (const [id, job] of exportJobs.entries()) {
    if (now > job.expiresAt.getTime()) {
      exportJobs.delete(id);
      exportData.delete(id);
    }
  }
}, 60000);

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Check user permissions for export
 */
async function checkExportPermissions(
  userId: string,
  channelIds: string[],
  scope: string,
): Promise<{ allowed: boolean; allowedChannels: string[]; error?: string }> {
  const client = getServerApolloClient();

  // Get accessible channels
  const { data: channelData } = await client.query({
    query: GET_ACCESSIBLE_CHANNELS,
    variables: { userId, channelIds },
    fetchPolicy: "no-cache",
  });

  const accessibleChannelIds =
    channelData?.nchat_channels?.map((c: { id: string }) => c.id) || [];

  if (accessibleChannelIds.length === 0) {
    return {
      allowed: false,
      allowedChannels: [],
      error: "You do not have access to any of the requested channels",
    };
  }

  // For full channel export, check admin permissions
  if (scope === "full_channel") {
    const { data: adminData } = await client.query({
      query: CHECK_CHANNEL_ADMIN,
      variables: { userId, channelIds: accessibleChannelIds },
      fetchPolicy: "no-cache",
    });

    const adminChannelIds =
      adminData?.nchat_channel_members?.map(
        (m: { channel_id: string }) => m.channel_id,
      ) || [];

    if (adminChannelIds.length === 0) {
      return {
        allowed: false,
        allowedChannels: [],
        error: "Full channel export requires admin permissions",
      };
    }

    return { allowed: true, allowedChannels: adminChannelIds };
  }

  return { allowed: true, allowedChannels: accessibleChannelIds };
}

/**
 * Transform database messages to export format
 */
function transformMessages(
  dbMessages: unknown[],
  includeReactions: boolean,
  includeEditHistory: boolean,
): ExportedMessage[] {
  return (dbMessages as Array<Record<string, unknown>>).map((msg) => {
    // Group reactions by emoji
    const reactionsRaw = (msg.reactions || []) as Array<{
      emoji: string;
      user: { id: string; username: string };
    }>;
    const reactionMap = new Map<
      string,
      {
        emoji: string;
        count: number;
        users: Array<{ id: string; username: string }>;
      }
    >();

    if (includeReactions) {
      for (const r of reactionsRaw) {
        const existing = reactionMap.get(r.emoji) || {
          emoji: r.emoji,
          count: 0,
          users: [],
        };
        existing.count++;
        existing.users.push(r.user);
        reactionMap.set(r.emoji, existing);
      }
    }

    const user = msg.user as {
      id: string;
      username: string;
      display_name: string;
      avatar_url?: string;
    } | null;
    const channel = msg.channel as {
      id: string;
      name: string;
      slug: string;
    } | null;
    const parent = msg.parent as {
      id: string;
      content: string;
      user: { id: string; username: string; display_name: string };
    } | null;
    const attachments = (msg.attachments || []) as Array<{
      id: string;
      file_name: string;
      file_url: string;
      file_type: string;
      file_size: number;
    }>;
    const messageEdits = (msg.message_edits || []) as Array<{
      content: string;
      edited_at: string;
      editor: { username: string };
    }>;

    return {
      id: msg.id as string,
      channelId: msg.channel_id as string,
      channelName: channel?.name || "Unknown",
      userId: msg.user_id as string,
      username: user?.username || "Unknown",
      displayName: user?.display_name || "Unknown",
      content: msg.content as string,
      type:
        (msg.type as string) === "text"
          ? "text"
          : (msg.type as string as ExportedMessage["type"]),
      createdAt: msg.created_at as string,
      editedAt: msg.edited_at as string | undefined,
      isEdited: msg.is_edited as boolean,
      isDeleted: msg.is_deleted as boolean,
      isPinned: msg.is_pinned as boolean,
      deletedAt: msg.deleted_at as string | undefined,
      threadId: msg.thread_id as string | undefined,
      parentId: msg.parent_id as string | undefined,
      parentContent: parent?.content,
      parentUsername: parent?.user?.username,
      attachments: attachments.map((a) => ({
        id: a.id,
        fileName: a.file_name,
        fileType: a.file_type,
        fileSize: a.file_size,
        url: a.file_url,
      })),
      reactions: includeReactions
        ? Array.from(reactionMap.values())
        : undefined,
      editHistory: includeEditHistory
        ? messageEdits.map((e) => ({
            content: e.content,
            editedAt: e.edited_at,
            editedBy: e.editor?.username || "Unknown",
          }))
        : undefined,
    };
  });
}

// ============================================================================
// GET HANDLER - Job Status / Download
// ============================================================================

async function handleGet(request: AuthenticatedRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");
  const download = searchParams.get("download") === "true";

  if (!jobId) {
    // List user's export jobs
    const userJobs = Array.from(exportJobs.values())
      .filter((job) => job.userId === request.user.id)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 20);

    return successResponse({ jobs: userJobs });
  }

  // Get specific job
  const job = exportJobs.get(jobId);

  if (!job) {
    return notFoundResponse("Export job not found", "JOB_NOT_FOUND");
  }

  // Verify ownership
  if (job.userId !== request.user.id) {
    return forbiddenResponse("You do not have access to this export");
  }

  // Return status if not downloading
  if (!download) {
    return successResponse({ job });
  }

  // Check if ready for download
  if (job.status !== "completed") {
    return badRequestResponse(
      `Export is not ready. Status: ${job.status}`,
      "EXPORT_NOT_READY",
    );
  }

  // Get export data
  const content = exportData.get(jobId);

  if (!content) {
    return notFoundResponse(
      "Export data not found or expired",
      "DATA_NOT_FOUND",
    );
  }

  // Determine content type
  const mimeTypes: Record<string, string> = {
    json: "application/json",
    html: "text/html",
    text: "text/plain",
    csv: "text/csv",
  };

  return new NextResponse(content, {
    status: 200,
    headers: {
      "Content-Type":
        mimeTypes[job.options.format] || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${job.fileName}"`,
      "Content-Length": String(job.fileSize),
      "X-Export-Messages": String(job.stats?.totalMessages || 0),
    },
  });
}

// ============================================================================
// POST HANDLER - Start Export
// ============================================================================

async function handlePost(
  request: AuthenticatedRequest,
): Promise<NextResponse> {
  let body: ExportOptions;

  try {
    body = await request.json();
  } catch {
    return badRequestResponse("Invalid JSON body", "INVALID_JSON");
  }

  // Validate format
  if (
    !CONFIG.VALID_FORMATS.includes(
      body.format as (typeof CONFIG.VALID_FORMATS)[number],
    )
  ) {
    return badRequestResponse(
      `Invalid format. Valid formats: ${CONFIG.VALID_FORMATS.join(", ")}`,
      "INVALID_FORMAT",
    );
  }

  // Validate channel IDs
  if (!body.channelIds?.length) {
    return badRequestResponse(
      "At least one channel ID is required",
      "MISSING_CHANNELS",
    );
  }

  const { user } = request;

  try {
    // Check permissions
    const permissions = await checkExportPermissions(
      user.id,
      body.channelIds,
      body.scope,
    );

    if (!permissions.allowed) {
      return forbiddenResponse(permissions.error || "Access denied");
    }

    // Create export options with allowed channels only
    const options = createDefaultExportOptions(
      permissions.allowedChannels,
      body,
    );

    // Get Apollo client
    const client = getServerApolloClient();

    // Fetch messages
    const { data: messageData } = await client.query({
      query: GET_MESSAGES_FOR_EXPORT,
      variables: {
        userId: user.id,
        channelIds: permissions.allowedChannels,
        dateFrom: options.dateRange?.start?.toISOString() || null,
        dateTo: options.dateRange?.end?.toISOString() || null,
        userMessagesOnly: options.userMessagesOnly,
        limit: CONFIG.MAX_MESSAGES,
      },
      fetchPolicy: "no-cache",
    });

    const rawMessages = options.userMessagesOnly
      ? messageData?.nchat_messages || []
      : messageData?.all_messages || [];

    // Check if we should use background job
    if (rawMessages.length > CONFIG.DIRECT_EXPORT_LIMIT) {
      // Create background job
      const jobId = randomUUID();
      const job: ExportJob = {
        id: jobId,
        userId: user.id,
        status: "pending",
        progress: 0,
        options,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + CONFIG.JOB_EXPIRY),
      };

      exportJobs.set(jobId, job);

      // Start background processing (in production, use a job queue)
      processExportJob(jobId, user, options, rawMessages).catch((err) => {
        logger.error("Export job failed:", err);
      });

      return successResponse(
        {
          jobId,
          message:
            "Export started. Poll GET /api/conversations/export?jobId=" + jobId,
        },
        { status: 202 },
      );
    }

    // Direct export
    const messages = transformMessages(
      rawMessages,
      options.includeReactions,
      options.includeEditHistory,
    );

    // Fetch channels
    const { data: channelData } = await client.query({
      query: GET_ACCESSIBLE_CHANNELS,
      variables: { userId: user.id, channelIds: permissions.allowedChannels },
      fetchPolicy: "no-cache",
    });

    const channels: ExportedChannel[] = (channelData?.nchat_channels || []).map(
      (c: Record<string, unknown>) => ({
        id: c.id as string,
        name: c.name as string,
        slug: c.slug as string,
        description: c.description as string | undefined,
        type: (c.is_private ? "private" : "public") as ExportedChannel["type"],
        isArchived: c.is_archived as boolean,
        createdAt: c.created_at as string,
        memberCount:
          (c.members_aggregate as { aggregate: { count: number } })?.aggregate
            ?.count || 0,
        messageCount:
          (c.messages_aggregate as { aggregate: { count: number } })?.aggregate
            ?.count || 0,
      }),
    );

    // Fetch users
    const { data: userData } = await client.query({
      query: GET_USERS_FOR_EXPORT,
      variables: { channelIds: permissions.allowedChannels },
      fetchPolicy: "no-cache",
    });

    const users: ExportedUser[] = (userData?.nchat_users || []).map(
      (u: Record<string, unknown>) => ({
        id: u.id as string,
        username: u.username as string,
        displayName: u.display_name as string,
        email: options.anonymizeUsers ? undefined : (u.email as string),
        avatarUrl: options.anonymizeUsers
          ? undefined
          : (u.avatar_url as string),
        role: (u.role as { name: string })?.name || "member",
      }),
    );

    // Create exporter and generate output
    const exporter = new ConversationExporter();
    const result = await exporter.export(
      options,
      { channels, users, messages },
      {
        id: user.id,
        username: (user as unknown as { username?: string }).username || "",
        email: user.email || "",
      },
    );

    // Return file download
    return new NextResponse(result.content, {
      status: 200,
      headers: {
        "Content-Type": result.mimeType,
        "Content-Disposition": `attachment; filename="${result.fileName}"`,
        "Content-Length": String(result.stats.fileSizeBytes),
        "X-Export-Messages": String(result.stats.totalMessages),
      },
    });
  } catch (error) {
    logger.error("Export failed:", error);
    return internalErrorResponse(
      error instanceof Error
        ? error instanceof Error
          ? error.message
          : String(error)
        : "Export failed",
    );
  }
}

/**
 * Process export in background
 */
async function processExportJob(
  jobId: string,
  user: { id: string; username?: string; email?: string },
  options: ExportOptions,
  rawMessages: unknown[],
): Promise<void> {
  const job = exportJobs.get(jobId);
  if (!job) return;

  try {
    job.status = "processing";
    job.progress = 10;
    job.startedAt = new Date();
    exportJobs.set(jobId, job);

    const messages = transformMessages(
      rawMessages,
      options.includeReactions,
      options.includeEditHistory,
    );

    job.progress = 40;
    exportJobs.set(jobId, job);

    const client = getServerApolloClient();

    // Fetch channels
    const { data: channelData } = await client.query({
      query: GET_ACCESSIBLE_CHANNELS,
      variables: { userId: user.id, channelIds: options.channelIds },
      fetchPolicy: "no-cache",
    });

    const channels: ExportedChannel[] = (channelData?.nchat_channels || []).map(
      (c: Record<string, unknown>) => ({
        id: c.id as string,
        name: c.name as string,
        slug: c.slug as string,
        description: c.description as string | undefined,
        type: (c.is_private ? "private" : "public") as ExportedChannel["type"],
        isArchived: c.is_archived as boolean,
        createdAt: c.created_at as string,
        memberCount:
          (c.members_aggregate as { aggregate: { count: number } })?.aggregate
            ?.count || 0,
        messageCount:
          (c.messages_aggregate as { aggregate: { count: number } })?.aggregate
            ?.count || 0,
      }),
    );

    job.progress = 50;
    exportJobs.set(jobId, job);

    // Fetch users
    const { data: userData } = await client.query({
      query: GET_USERS_FOR_EXPORT,
      variables: { channelIds: options.channelIds },
      fetchPolicy: "no-cache",
    });

    const users: ExportedUser[] = (userData?.nchat_users || []).map(
      (u: Record<string, unknown>) => ({
        id: u.id as string,
        username: u.username as string,
        displayName: u.display_name as string,
        email: options.anonymizeUsers ? undefined : (u.email as string),
        avatarUrl: options.anonymizeUsers
          ? undefined
          : (u.avatar_url as string),
        role: (u.role as { name: string })?.name || "member",
      }),
    );

    job.progress = 60;
    exportJobs.set(jobId, job);

    // Generate export
    const exporter = new ConversationExporter();
    const result = await exporter.export(
      options,
      { channels, users, messages },
      { id: user.id, username: user.username || "", email: user.email || "" },
    );

    job.progress = 90;
    exportJobs.set(jobId, job);

    // Store result
    exportData.set(jobId, result.content);

    job.status = "completed";
    job.progress = 100;
    job.completedAt = new Date();
    job.downloadUrl = `/api/conversations/export?jobId=${jobId}&download=true`;
    job.fileName = result.fileName;
    job.fileSize = result.stats.fileSizeBytes;
    job.stats = result.stats;
    exportJobs.set(jobId, job);
  } catch (error) {
    job.status = "failed";
    job.errorMessage =
      error instanceof Error
        ? error instanceof Error
          ? error.message
          : String(error)
        : "Export failed";
    exportJobs.set(jobId, job);
  }
}

// ============================================================================
// ROUTE EXPORTS
// ============================================================================

export const GET = compose(withErrorHandler, withAuth)(handleGet);

export const POST = compose(
  withErrorHandler,
  withCsrfProtection,
  withRateLimit(CONFIG.RATE_LIMIT),
  withAuth,
)(handlePost);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
