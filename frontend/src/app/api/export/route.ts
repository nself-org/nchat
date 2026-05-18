/**
 * Data Export API Route
 *
 * Allows users to export their data including messages and files.
 * Supports multiple formats (JSON, CSV) and filtering options.
 *
 * This route supports two modes:
 * 1. Legacy mode: Using type/format parameters with job-based processing
 * 2. New mode: Using ExportConfig from import-export library for direct download
 *
 * @endpoint POST /api/export - Request data export
 * @endpoint GET /api/export/:jobId - Get export status/download
 *
 * @example
 * ```typescript
 * // Legacy: Request message export with job
 * const response = await fetch('/api/export', {
 *   method: 'POST',
 *   headers: {
 *     'Content-Type': 'application/json',
 *     'Authorization': 'Bearer <token>'
 *   },
 *   body: JSON.stringify({
 *     type: 'messages',
 *     format: 'json',
 *     channelIds: ['channel-1'],
 *     dateFrom: '2024-01-01',
 *     dateTo: '2024-12-31'
 *   })
 * })
 *
 * // New: Direct export with ExportConfig
 * const response = await fetch('/api/export', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     format: 'json',
 *     options: { includeUsers: true, includeChannels: true, includeMessages: true },
 *     filters: { dateRange: { start: '2024-01-01' } }
 *   })
 * })
 * // Returns file download directly
 * ```
 */

import { NextRequest, NextResponse } from "next/server";
import { gql } from "@apollo/client";
import type { ExportConfig } from "@/lib/import-export/types";
import { randomUUID } from "crypto";
import {
  successResponse,
  badRequestResponse,
  notFoundResponse,
  forbiddenResponse,
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
import { logger } from "@/lib/logger";

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  // Maximum export size (100MB)
  MAX_EXPORT_SIZE: 100 * 1024 * 1024,

  // Maximum messages per export
  MAX_MESSAGES: 50000,

  // Export job expiry (24 hours)
  JOB_EXPIRY: 24 * 60 * 60 * 1000,

  // Rate limiting (5 exports per hour)
  RATE_LIMIT: {
    limit: 5,
    window: 3600,
  },

  // Valid export types
  VALID_TYPES: ["messages", "channel", "user", "all"] as const,

  // Valid formats
  VALID_FORMATS: ["json", "csv"] as const,
};

// ============================================================================
// GraphQL Queries for Export
// ============================================================================

/**
 * Query to get messages for export with full authorization check.
 * Only returns messages from channels where the user is a member.
 */
const GET_MESSAGES_FOR_EXPORT = gql`
  query GetMessagesForExport(
    $userId: uuid!
    $channelIds: [uuid!]
    $dateFrom: timestamptz
    $dateTo: timestamptz
    $limit: Int = 50000
  ) {
    nchat_messages(
      where: {
        _and: [
          { is_deleted: { _eq: false } }
          { channel: { members: { user_id: { _eq: $userId } } } }
          { channel_id: { _in: $channelIds } }
          { created_at: { _gte: $dateFrom } }
          { created_at: { _lte: $dateTo } }
        ]
      }
      order_by: { created_at: desc }
      limit: $limit
    ) {
      id
      content
      type
      created_at
      edited_at
      is_pinned
      channel_id
      user_id
      channel {
        id
        name
        slug
      }
      user {
        id
        username
        display_name
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
        }
      }
    }
  }
`;

/**
 * Query to get user's channels for export.
 * Only returns channels where the user is a member.
 */
const GET_USER_CHANNELS_FOR_EXPORT = gql`
  query GetUserChannelsForExport($userId: uuid!, $channelIds: [uuid!]) {
    nchat_channels(
      where: {
        _and: [
          { members: { user_id: { _eq: $userId } } }
          { id: { _in: $channelIds } }
        ]
      }
      order_by: { name: asc }
    ) {
      id
      name
      slug
      description
      type
      is_private
      is_archived
      created_at
    }
  }
`;

/**
 * Query to get users in channels the requesting user has access to.
 * Returns users from shared channels only.
 */
const GET_USERS_FOR_EXPORT = gql`
  query GetUsersForExport($userId: uuid!, $channelIds: [uuid!]) {
    nchat_users(
      where: {
        channel_memberships: {
          channel: {
            _and: [
              { members: { user_id: { _eq: $userId } } }
              { id: { _in: $channelIds } }
            ]
          }
        }
      }
      order_by: { display_name: asc }
    ) {
      id
      username
      display_name
      email
      avatar_url
      created_at
      role {
        name
      }
    }
  }
`;

// ============================================================================
// Types
// ============================================================================

type ExportType = (typeof CONFIG.VALID_TYPES)[number];
type ExportFormat = (typeof CONFIG.VALID_FORMATS)[number];
type ExportStatus = "pending" | "processing" | "completed" | "failed";

interface ExportRequest {
  type: ExportType;
  format?: ExportFormat;
  channelIds?: string[];
  dateFrom?: string;
  dateTo?: string;
  includeAttachments?: boolean;
}

interface ExportJob {
  id: string;
  userId: string;
  type: ExportType;
  format: ExportFormat;
  status: ExportStatus;
  progress: number;
  error?: string;
  downloadUrl?: string;
  fileSize?: number;
  createdAt: string;
  completedAt?: string;
  expiresAt: string;
  metadata: {
    channelIds?: string[];
    dateFrom?: string;
    dateTo?: string;
    includeAttachments?: boolean;
    messageCount?: number;
    fileCount?: number;
  };
}

interface ExportedMessage {
  id: string;
  content: string;
  channelId: string;
  channelName: string;
  userId: string;
  userName: string;
  createdAt: string;
  editedAt?: string;
  attachments?: Array<{
    id: string;
    filename: string;
    url: string;
    mimeType: string;
    size: number;
  }>;
  reactions?: Array<{
    emoji: string;
    count: number;
    users: string[];
  }>;
}

// Types for database results
interface DbMessage {
  id: string;
  content: string;
  type: string;
  created_at: string;
  edited_at?: string;
  is_pinned: boolean;
  channel_id: string;
  user_id: string;
  channel: {
    id: string;
    name: string;
    slug: string;
  };
  user: {
    id: string;
    username: string;
    display_name: string;
  };
  attachments: Array<{
    id: string;
    file_name: string;
    file_url: string;
    file_type: string;
    file_size: number;
  }>;
  reactions: Array<{
    emoji: string;
    user: { id: string };
  }>;
}

interface DbChannel {
  id: string;
  name: string;
  slug: string;
  description: string;
  type: string;
  is_private: boolean;
  is_archived: boolean;
  created_at: string;
}

interface DbUser {
  id: string;
  username: string;
  display_name: string;
  email: string;
  avatar_url?: string;
  created_at: string;
  role?: { name: string };
}

// ============================================================================
// In-Memory Storage (Job queue - in production, use Redis or database)
// ============================================================================

const exportJobs = new Map<string, ExportJob>();
const exportData = new Map<string, ExportedMessage[]>();

// Clean up expired jobs periodically
setInterval(() => {
  const now = Date.now();
  for (const [id, job] of exportJobs.entries()) {
    if (now > new Date(job.expiresAt).getTime()) {
      exportJobs.delete(id);
      exportData.delete(id);
    }
  }
}, 60000); // Every minute

// ============================================================================
// Helpers
// ============================================================================

/**
 * Validate export request
 */
function validateExportRequest(
  body: unknown,
): { valid: true; request: ExportRequest } | { valid: false; error: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Invalid request body" };
  }

  const data = body as Record<string, unknown>;

  // Validate type
  if (!data.type || !CONFIG.VALID_TYPES.includes(data.type as ExportType)) {
    return {
      valid: false,
      error: `Invalid export type. Valid types: ${CONFIG.VALID_TYPES.join(", ")}`,
    };
  }

  // Validate format
  const format = (data.format as ExportFormat) || "json";
  if (!CONFIG.VALID_FORMATS.includes(format)) {
    return {
      valid: false,
      error: `Invalid format. Valid formats: ${CONFIG.VALID_FORMATS.join(", ")}`,
    };
  }

  // Validate dates
  if (
    data.dateFrom &&
    (typeof data.dateFrom !== "string" || isNaN(Date.parse(data.dateFrom)))
  ) {
    return { valid: false, error: "Invalid dateFrom format" };
  }

  if (
    data.dateTo &&
    (typeof data.dateTo !== "string" || isNaN(Date.parse(data.dateTo)))
  ) {
    return { valid: false, error: "Invalid dateTo format" };
  }

  return {
    valid: true,
    request: {
      type: data.type as ExportType,
      format,
      channelIds: Array.isArray(data.channelIds)
        ? (data.channelIds as string[])
        : undefined,
      dateFrom: data.dateFrom as string | undefined,
      dateTo: data.dateTo as string | undefined,
      includeAttachments: data.includeAttachments === true,
    },
  };
}

/**
 * Fetch messages for export from database.
 * Enforces authorization - only returns messages from channels user is a member of.
 */
async function fetchMessagesForExport(
  userId: string,
  request: ExportRequest,
): Promise<ExportedMessage[]> {
  const client = getServerApolloClient();

  try {
    const { data } = await client.query({
      query: GET_MESSAGES_FOR_EXPORT,
      variables: {
        userId,
        channelIds: request.channelIds?.length ? request.channelIds : null,
        dateFrom: request.dateFrom || null,
        dateTo: request.dateTo || null,
        limit: CONFIG.MAX_MESSAGES,
      },
      fetchPolicy: "no-cache",
    });

    const dbMessages: DbMessage[] = data?.nchat_messages || [];

    // Transform database results to export format
    const messages: ExportedMessage[] = dbMessages.map((msg) => {
      // Group reactions by emoji
      const reactionMap = new Map<string, string[]>();
      for (const r of msg.reactions || []) {
        const users = reactionMap.get(r.emoji) || [];
        users.push(r.user.id);
        reactionMap.set(r.emoji, users);
      }
      const reactions = Array.from(reactionMap.entries()).map(
        ([emoji, users]) => ({
          emoji,
          count: users.length,
          users,
        }),
      );

      const message: ExportedMessage = {
        id: msg.id,
        content: msg.content,
        channelId: msg.channel_id,
        channelName: msg.channel?.name || "unknown",
        userId: msg.user_id,
        userName: msg.user?.display_name || msg.user?.username || "unknown",
        createdAt: msg.created_at,
        editedAt: msg.edited_at || undefined,
        reactions: reactions.length > 0 ? reactions : undefined,
      };

      // Include attachments if requested
      if (request.includeAttachments && msg.attachments?.length > 0) {
        message.attachments = msg.attachments.map((a) => ({
          id: a.id,
          filename: a.file_name,
          url: a.file_url,
          mimeType: a.file_type,
          size: a.file_size,
        }));
      }

      return message;
    });

    return messages;
  } catch (error) {
    logger.error("Error fetching messages for export:", error);
    throw new Error("Failed to fetch messages for export");
  }
}

/**
 * Fetch channels for export from database.
 * Only returns channels where user is a member.
 */
async function fetchChannelsForExport(
  userId: string,
  channelIds?: string[],
): Promise<DbChannel[]> {
  const client = getServerApolloClient();

  try {
    const { data } = await client.query({
      query: GET_USER_CHANNELS_FOR_EXPORT,
      variables: {
        userId,
        channelIds: channelIds?.length ? channelIds : null,
      },
      fetchPolicy: "no-cache",
    });

    return data?.nchat_channels || [];
  } catch (error) {
    logger.error("Error fetching channels for export:", error);
    throw new Error("Failed to fetch channels for export");
  }
}

/**
 * Fetch users for export from database.
 * Only returns users from channels where requesting user is also a member.
 */
async function fetchUsersForExport(
  userId: string,
  channelIds?: string[],
): Promise<DbUser[]> {
  const client = getServerApolloClient();

  try {
    const { data } = await client.query({
      query: GET_USERS_FOR_EXPORT,
      variables: {
        userId,
        channelIds: channelIds?.length ? channelIds : null,
      },
      fetchPolicy: "no-cache",
    });

    return data?.nchat_users || [];
  } catch (error) {
    logger.error("Error fetching users for export:", error);
    throw new Error("Failed to fetch users for export");
  }
}

/**
 * Convert messages to CSV format
 */
function messagesToCsv(messages: ExportedMessage[]): string {
  const headers = [
    "id",
    "content",
    "channel_id",
    "channel_name",
    "user_id",
    "user_name",
    "created_at",
    "edited_at",
    "attachment_count",
    "reaction_count",
  ];

  const rows = messages.map((msg) => [
    msg.id,
    `"${(msg.content || "").replace(/"/g, '""')}"`,
    msg.channelId,
    msg.channelName,
    msg.userId,
    msg.userName,
    msg.createdAt,
    msg.editedAt || "",
    String(msg.attachments?.length || 0),
    String(msg.reactions?.length || 0),
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

/**
 * Process export job asynchronously
 */
async function processExportJob(jobId: string, job: ExportJob): Promise<void> {
  try {
    // Update status to processing
    job.status = "processing";
    job.progress = 10;
    exportJobs.set(jobId, job);

    // Fetch data from database
    const messages = await fetchMessagesForExport(job.userId, {
      type: job.type,
      format: job.format,
      channelIds: job.metadata.channelIds,
      dateFrom: job.metadata.dateFrom,
      dateTo: job.metadata.dateTo,
      includeAttachments: job.metadata.includeAttachments,
    });

    job.progress = 50;
    exportJobs.set(jobId, job);

    // Store data
    exportData.set(jobId, messages);

    // Update job metadata
    job.metadata.messageCount = messages.length;
    job.metadata.fileCount = messages.reduce(
      (count, m) => count + (m.attachments?.length || 0),
      0,
    );

    job.progress = 80;
    exportJobs.set(jobId, job);

    // Generate download URL
    job.downloadUrl = `/api/export?jobId=${jobId}&download=true`;

    // Calculate file size
    const content =
      job.format === "csv"
        ? messagesToCsv(messages)
        : JSON.stringify(messages, null, 2);
    job.fileSize = new TextEncoder().encode(content).length;

    // Mark as completed
    job.status = "completed";
    job.progress = 100;
    job.completedAt = new Date().toISOString();
    exportJobs.set(jobId, job);
  } catch (error) {
    logger.error("Export job failed:", error);
    job.status = "failed";
    job.error =
      error instanceof Error
        ? error instanceof Error
          ? error.message
          : String(error)
        : "Export failed";
    exportJobs.set(jobId, job);
  }
}

// ============================================================================
// GET Handler - Download/Status
// ============================================================================

async function handleGet(request: AuthenticatedRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");
  const download = searchParams.get("download") === "true";

  if (!jobId) {
    // List user's export jobs
    const userJobs = Array.from(exportJobs.values())
      .filter((job) => job.userId === request.user.id)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 10);

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
  const messages = exportData.get(jobId);

  if (!messages) {
    return notFoundResponse("Export data not found", "DATA_NOT_FOUND");
  }

  // Generate content
  let content: string;
  let contentType: string;
  let filename: string;

  if (job.format === "csv") {
    content = messagesToCsv(messages);
    contentType = "text/csv";
    filename = `nchat-export-${jobId}.csv`;
  } else {
    content = JSON.stringify(
      {
        exportedAt: job.completedAt,
        messageCount: messages.length,
        messages,
      },
      null,
      2,
    );
    contentType = "application/json";
    filename = `nchat-export-${jobId}.json`;
  }

  // Return file download
  return new NextResponse(content, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(new TextEncoder().encode(content).length),
    },
  });
}

// ============================================================================
// POST Handler - Create Export
// ============================================================================

async function handlePost(
  request: AuthenticatedRequest,
): Promise<NextResponse> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return badRequestResponse("Invalid JSON body", "INVALID_JSON");
  }

  // Check if this is a new-style ExportConfig request
  const isNewStyleExport =
    body && typeof body === "object" && "options" in body && "filters" in body;

  if (isNewStyleExport) {
    return handleNewStyleExport(request.user.id, body as ExportConfig);
  }

  const validation = validateExportRequest(body);
  if (!validation.valid) {
    return badRequestResponse(
      (validation as { valid: false; error: string }).error,
      "VALIDATION_ERROR",
    );
  }

  const { user } = request;
  const exportRequest = validation.request;

  // Check for existing pending/processing exports
  const existingJobs = Array.from(exportJobs.values()).filter(
    (job) =>
      job.userId === user.id &&
      (job.status === "pending" || job.status === "processing"),
  );

  if (existingJobs.length >= 2) {
    return badRequestResponse(
      "You have too many pending exports. Please wait for them to complete.",
      "TOO_MANY_EXPORTS",
    );
  }

  // Create export job
  const jobId = randomUUID();
  const now = new Date();

  const job: ExportJob = {
    id: jobId,
    userId: user.id,
    type: exportRequest.type,
    format: exportRequest.format || "json",
    status: "pending",
    progress: 0,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + CONFIG.JOB_EXPIRY).toISOString(),
    metadata: {
      channelIds: exportRequest.channelIds,
      dateFrom: exportRequest.dateFrom,
      dateTo: exportRequest.dateTo,
      includeAttachments: exportRequest.includeAttachments,
    },
  };

  exportJobs.set(jobId, job);

  // Start processing (in production, this would be queued)
  processExportJob(jobId, job).catch((error) => {
    logger.error("Export processing error:", error);
  });

  return successResponse(
    {
      job: {
        id: job.id,
        status: job.status,
        createdAt: job.createdAt,
        expiresAt: job.expiresAt,
      },
      message:
        "Export job created. Check status with GET /api/export?jobId=" + jobId,
    },
    { status: 202 },
  );
}

// ============================================================================
// New-Style Export Handler (Direct Download)
// ============================================================================

// Types for export data
interface ExportUser {
  id: string;
  username: string;
  display_name: string;
  email: string;
  role: string;
  created_at: string;
}

interface ExportChannel {
  id: string;
  name: string;
  slug: string;
  description: string;
  type: string;
  is_private: boolean;
  is_archived: boolean;
  created_at: string;
}

interface ExportMessage {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  type: string;
  created_at: string;
  is_pinned: boolean;
}

async function handleNewStyleExport(
  userId: string,
  config: ExportConfig,
): Promise<NextResponse> {
  try {
    // Fetch real data from database with authorization
    let users: ExportUser[] = [];
    let channels: ExportChannel[] = [];
    let messages: ExportMessage[] = [];

    const channelIds = config.filters.channelIds;

    // Fetch channels the user has access to
    if (config.options.includeChannels || config.options.includeMessages) {
      const dbChannels = await fetchChannelsForExport(userId, channelIds);
      channels = dbChannels.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        type: c.type,
        is_private: c.is_private,
        is_archived: c.is_archived,
        created_at: c.created_at,
      }));
    }

    // If no channels found that user has access to, return empty
    if (channelIds?.length && channels.length === 0) {
      return forbiddenResponse(
        "You do not have access to the requested channels",
      );
    }

    // Get valid channel IDs for subsequent queries
    const validChannelIds = channels.map((c) => c.id);

    // Fetch users from accessible channels
    if (config.options.includeUsers) {
      const dbUsers = await fetchUsersForExport(userId, validChannelIds);
      users = dbUsers.map((u) => ({
        id: u.id,
        username: u.username,
        display_name: u.display_name,
        email: u.email,
        role: u.role?.name || "member",
        created_at: u.created_at,
      }));
    }

    // Fetch messages from accessible channels
    if (config.options.includeMessages) {
      const exportedMessages = await fetchMessagesForExport(userId, {
        type: "messages",
        channelIds: validChannelIds,
        dateFrom: config.filters.dateRange?.start,
        dateTo: config.filters.dateRange?.end,
        includeAttachments: config.options.includeAttachments,
      });

      messages = exportedMessages.map((m) => ({
        id: m.id,
        channel_id: m.channelId,
        user_id: m.userId,
        content: m.content,
        type: "text",
        created_at: m.createdAt,
        is_pinned: false,
      }));
    }

    // Don't include channels if not requested
    if (!config.options.includeChannels) {
      channels = [];
    }

    // Apply date range filter for messages (already handled in query, but double-check)
    if (config.filters.dateRange) {
      const { start, end } = config.filters.dateRange;
      messages = messages.filter((m) => {
        const msgDate = new Date(m.created_at);
        if (start && msgDate < new Date(start)) return false;
        if (end && msgDate > new Date(end)) return false;
        return true;
      });
    }

    // Anonymize users if requested
    if (config.options.anonymizeUsers) {
      const userIdMap = new Map(
        users.map((u, index) => [u.id, `user_${index + 1}`]),
      );
      users = users.map((u, index) => ({
        ...u,
        username: `user_${index + 1}`,
        display_name: `User ${index + 1}`,
        email: `user${index + 1}@anonymized.local`,
      }));
      messages = messages.map((m) => ({
        ...m,
        user_id: userIdMap.get(m.user_id) || m.user_id,
      }));
    }

    // Generate export content
    let content: string;
    let contentType: string;
    let filename: string;

    if (config.format === "csv") {
      content = generateExportCsv(users, channels, messages, config.options);
      contentType = "text/csv";
      filename = `nchat-export-${Date.now()}.csv`;
    } else {
      content = JSON.stringify(
        {
          metadata: {
            exportedAt: new Date().toISOString(),
            format: "json",
            version: "1.0.0",
            filters: config.filters,
            stats: {
              usersExported: users.length,
              channelsExported: channels.length,
              messagesExported: messages.length,
            },
          },
          ...(config.options.includeUsers && { users }),
          ...(config.options.includeChannels && { channels }),
          ...(config.options.includeMessages && { messages }),
        },
        null,
        2,
      );
      contentType = "application/json";
      filename = `nchat-export-${Date.now()}.json`;
    }

    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    logger.error("Export failed:", error);
    return internalErrorResponse("Failed to export data");
  }
}

function generateExportCsv(
  users: ExportUser[],
  channels: ExportChannel[],
  messages: ExportMessage[],
  options: ExportConfig["options"],
): string {
  const sections: string[] = [];

  if (options.includeUsers && users.length) {
    const header = "id,username,display_name,email,role,created_at";
    const rows = users.map(
      (u) =>
        `${u.id},${escapeExportCsv(u.username)},${escapeExportCsv(u.display_name)},${escapeExportCsv(u.email)},${u.role},${u.created_at}`,
    );
    sections.push("# USERS\n" + header + "\n" + rows.join("\n"));
  }

  if (options.includeChannels && channels.length) {
    const header =
      "id,name,slug,description,type,is_private,is_archived,created_at";
    const rows = channels.map(
      (c) =>
        `${c.id},${escapeExportCsv(c.name)},${escapeExportCsv(c.slug)},${escapeExportCsv(c.description)},${c.type},${c.is_private},${c.is_archived},${c.created_at}`,
    );
    sections.push("# CHANNELS\n" + header + "\n" + rows.join("\n"));
  }

  if (options.includeMessages && messages.length) {
    const header = "id,channel_id,user_id,content,type,created_at,is_pinned";
    const rows = messages.map(
      (m) =>
        `${m.id},${m.channel_id},${m.user_id},${escapeExportCsv(m.content)},${m.type},${m.created_at},${m.is_pinned}`,
    );
    sections.push("# MESSAGES\n" + header + "\n" + rows.join("\n"));
  }

  return sections.join("\n\n");
}

function escapeExportCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// ============================================================================
// Export Handlers
// ============================================================================

export const GET = compose(withErrorHandler, withAuth)(handleGet);

export const POST = compose(
  withErrorHandler,
  withCsrfProtection,
  withRateLimit(CONFIG.RATE_LIMIT),
  withAuth,
)(handlePost);

// ============================================================================
// Route Configuration
// ============================================================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
