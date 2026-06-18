/**
 * Search Reindex API Route
 *
 * POST /api/search/reindex - Trigger full reindexing (admin only)
 * POST /api/search/reindex/batch - Batch index specific documents
 * GET /api/search/reindex/status - Get reindexing status
 *
 * @module app/api/search/reindex
 */

import { NextRequest, NextResponse } from "next/server";
import { gql } from "@apollo/client";
import { getSyncService, getIndexService } from "@/services/search";
import { getApolloClient } from "@/lib/apollo-server";
import {
  getAuthenticatedUser,
  withErrorHandler,
  withRateLimit,
  compose,
} from "@/lib/api/middleware";
import { captureError } from "@/lib/sentry-utils";
import type { Message } from "@/types/message";
import type { Channel } from "@/types/channel";
import type { User } from "@/types/user";
import type { FileInput, UserInput, ChannelInput } from "@/services/search/sync.service";

import { logger } from "@/lib/logger";

// ============================================================================
// Bulk GraphQL Queries for Reindex
// ============================================================================

const REINDEX_MESSAGES_QUERY = gql`
  query ReindexMessages($limit: Int = 500, $offset: Int = 0) {
    nchat_messages(
      where: { is_deleted: { _eq: false } }
      order_by: { created_at: asc }
      limit: $limit
      offset: $offset
    ) {
      id
      content
      type
      channel_id
      user_id
      created_at
      updated_at
      is_pinned
      channel {
        id
        name
      }
      user {
        id
        username
        display_name
        avatar_url
      }
    }
    nchat_messages_aggregate(where: { is_deleted: { _eq: false } }) {
      aggregate { count }
    }
  }
`;

const REINDEX_USERS_QUERY = gql`
  query ReindexUsers($limit: Int = 500, $offset: Int = 0) {
    nchat_users(
      order_by: { created_at: asc }
      limit: $limit
      offset: $offset
    ) {
      id
      username
      display_name
      email
      avatar_url
      bio
      role
      is_active
      is_bot
      created_at
      last_seen_at
    }
  }
`;

const REINDEX_CHANNELS_QUERY = gql`
  query ReindexChannels($limit: Int = 500, $offset: Int = 0) {
    nchat_channels(
      where: { is_deleted: { _eq: false } }
      order_by: { created_at: asc }
      limit: $limit
      offset: $offset
    ) {
      id
      name
      description
      topic
      type
      is_private
      is_archived
      is_default
      created_by
      created_at
      category_id
      member_count
      last_message_at
      icon
    }
  }
`;

const REINDEX_FILES_QUERY = gql`
  query ReindexFiles($limit: Int = 500, $offset: Int = 0) {
    nchat_attachments(
      order_by: { created_at: asc }
      limit: $limit
      offset: $offset
    ) {
      id
      name
      original_name
      mime_type
      size
      url
      thumbnail_url
      channel_id
      message_id
      user_id
      created_at
      extracted_text
      channel { id name }
      user { id username display_name }
    }
  }
`;

// ============================================================================
// Data Fetchers (paginated bulk pulls via Hasura admin)
// ============================================================================

async function fetchAllMessages(): Promise<Array<{
  message: Message;
  channel?: Pick<Channel, "id" | "name">;
  author?: Pick<User, "id" | "username" | "displayName" | "avatarUrl">;
}>> {
  const client = getApolloClient();
  const PAGE_SIZE = 500;
  const results: Array<{
    message: Message;
    channel?: Pick<Channel, "id" | "name">;
    author?: Pick<User, "id" | "username" | "displayName" | "avatarUrl">;
  }> = [];

  let offset = 0;
  while (true) {
    const { data } = await client.query({
      query: REINDEX_MESSAGES_QUERY,
      variables: { limit: PAGE_SIZE, offset },
    });
    const rows: any[] = data?.nchat_messages ?? [];
    for (const r of rows) {
      results.push({
        message: r as unknown as Message,
        channel: r.channel ? { id: r.channel.id, name: r.channel.name } : undefined,
        author: r.user
          ? {
              id: r.user.id,
              username: r.user.username,
              displayName: r.user.display_name,
              avatarUrl: r.user.avatar_url,
            }
          : undefined,
      });
    }
    if (rows.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return results;
}

async function fetchAllUsers(): Promise<UserInput[]> {
  const client = getApolloClient();
  const PAGE_SIZE = 500;
  const results: UserInput[] = [];
  let offset = 0;
  while (true) {
    const { data } = await client.query({
      query: REINDEX_USERS_QUERY,
      variables: { limit: PAGE_SIZE, offset },
    });
    const rows: any[] = data?.nchat_users ?? [];
    for (const r of rows) {
      results.push({
        id: r.id,
        username: r.username,
        displayName: r.display_name,
        email: r.email,
        avatarUrl: r.avatar_url,
        bio: r.bio,
        role: r.role ?? "member",
        isActive: r.is_active ?? true,
        isBot: r.is_bot ?? false,
        createdAt: r.created_at,
        lastSeenAt: r.last_seen_at,
      });
    }
    if (rows.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return results;
}

async function fetchAllChannels(): Promise<ChannelInput[]> {
  const client = getApolloClient();
  const PAGE_SIZE = 500;
  const results: ChannelInput[] = [];
  let offset = 0;
  while (true) {
    const { data } = await client.query({
      query: REINDEX_CHANNELS_QUERY,
      variables: { limit: PAGE_SIZE, offset },
    });
    const rows: any[] = data?.nchat_channels ?? [];
    for (const r of rows) {
      results.push({
        id: r.id,
        name: r.name,
        description: r.description,
        topic: r.topic,
        type: r.type,
        isPrivate: r.is_private,
        isArchived: r.is_archived,
        isDefault: r.is_default,
        createdBy: r.created_by,
        createdAt: r.created_at,
        categoryId: r.category_id,
        memberCount: r.member_count ?? 0,
        lastMessageAt: r.last_message_at,
        icon: r.icon,
      });
    }
    if (rows.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return results;
}

async function fetchAllFiles(): Promise<FileInput[]> {
  const client = getApolloClient();
  const PAGE_SIZE = 500;
  const results: FileInput[] = [];
  let offset = 0;
  while (true) {
    const { data } = await client.query({
      query: REINDEX_FILES_QUERY,
      variables: { limit: PAGE_SIZE, offset },
    });
    const rows: any[] = data?.nchat_attachments ?? [];
    for (const r of rows) {
      results.push({
        id: r.id,
        name: r.name ?? r.original_name ?? r.id,
        originalName: r.original_name,
        mimeType: r.mime_type ?? "application/octet-stream",
        size: r.size ?? 0,
        url: r.url ?? "",
        thumbnailUrl: r.thumbnail_url,
        channelId: r.channel_id,
        channelName: r.channel?.name,
        messageId: r.message_id ?? "",
        uploaderId: r.user_id ?? "",
        uploaderName: r.user?.display_name,
        uploaderUsername: r.user?.username,
        createdAt: r.created_at,
        extractedText: r.extracted_text,
      });
    }
    if (rows.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return results;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================================
// Types
// ============================================================================

interface ReindexRequest {
  indexNames?: ("messages" | "files" | "users" | "channels")[];
  forceRebuild?: boolean;
  batchSize?: number;
}

interface BatchIndexRequest {
  indexName: "messages" | "files" | "users" | "channels";
  documents: Record<string, unknown>[];
}

// ============================================================================
// POST - Trigger Full Reindexing
// ============================================================================

async function handlePost(request: NextRequest): Promise<NextResponse> {
  try {
    // Check authentication and admin role
    const user = await getAuthenticatedUser(request);
    if (!user || (user.role !== "admin" && user.role !== "owner")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Admin access required." },
        { status: 403 },
      );
    }

    const body: ReindexRequest = await request.json().catch(() => ({}));
    const syncService = getSyncService();
    const indexService = getIndexService();

    const indexNames = body.indexNames || [
      "messages",
      "files",
      "users",
      "channels",
    ];
    const results: Record<string, unknown> = {};

    // If forceRebuild, clear indexes first
    if (body.forceRebuild) {
      // REMOVED: console.log('[Reindex] Clearing indexes...')
      for (const indexName of indexNames) {
        await indexService.clearIndex(`nchat_${indexName}` as any);
      }
    }

    // Trigger reindexing for each index — fetch from Hasura and push to MeiliSearch
    for (const indexName of indexNames) {
      try {
        switch (indexName) {
          case "messages": {
            const syncResult = await syncService.reindexMessages(fetchAllMessages);
            results[indexName] = {
              success: syncResult.success,
              indexed: syncResult.indexed,
              failed: syncResult.failed,
              errors: syncResult.errors,
            };
            break;
          }

          case "files": {
            const files = await fetchAllFiles();
            const syncResult = await syncService.batchIndexFiles(files);
            results[indexName] = {
              success: syncResult.success,
              indexed: syncResult.indexed,
              failed: syncResult.failed,
            };
            break;
          }

          case "users": {
            const users = await fetchAllUsers();
            const syncResult = await syncService.batchIndexUsers(users);
            results[indexName] = {
              success: syncResult.success,
              indexed: syncResult.indexed,
              failed: syncResult.failed,
            };
            break;
          }

          case "channels": {
            const channels = await fetchAllChannels();
            const syncResult = await syncService.batchIndexChannels(channels);
            results[indexName] = {
              success: syncResult.success,
              indexed: syncResult.indexed,
              failed: syncResult.failed,
            };
            break;
          }
        }
      } catch (error) {
        results[indexName] = {
          success: false,
          error: error instanceof Error ? error.message : "Reindex failed",
        };
      }
    }

    // Check if all succeeded
    const allSucceeded = Object.values(results).every((r: any) => r.success);

    return NextResponse.json({
      success: allSucceeded,
      message: allSucceeded
        ? "All indexes reindexed successfully"
        : "Some indexes failed to reindex",
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Reindex error:", error);
    captureError(error as Error, { tags: { api: "search-reindex" } });

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Reindex failed",
      },
      { status: 500 },
    );
  }
}

// ============================================================================
// GET - Get Reindexing Status
// ============================================================================

async function handleGet(request: NextRequest): Promise<NextResponse> {
  try {
    const indexService = getIndexService();
    const stats = await indexService.getAllIndexesInfo();

    // Get health for each index
    const [messagesHealth, filesHealth, usersHealth, channelsHealth] =
      await Promise.all([
        indexService.checkIndexHealth("nchat_messages" as any),
        indexService.checkIndexHealth("nchat_files" as any),
        indexService.checkIndexHealth("nchat_users" as any),
        indexService.checkIndexHealth("nchat_channels" as any),
      ]);

    return NextResponse.json({
      success: true,
      stats,
      health: {
        messages: messagesHealth,
        files: filesHealth,
        users: usersHealth,
        channels: channelsHealth,
      },
      isReindexing:
        stats.messages.isIndexing ||
        stats.files.isIndexing ||
        stats.users.isIndexing ||
        stats.channels.isIndexing,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Status check error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Failed to get status",
      },
      { status: 500 },
    );
  }
}

// ============================================================================
// Export Handlers
// ============================================================================

export const POST = compose(
  withErrorHandler,
  withRateLimit({ limit: 10, window: 60 }), // 10 requests per minute
)(handlePost);

export const GET = compose(
  withErrorHandler,
  withRateLimit({ limit: 60, window: 60 }), // 60 requests per minute
)(handleGet);

// ============================================================================
// OPTIONS for CORS
// ============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": process.env.NEXT_PUBLIC_APP_URL ?? "",
      Vary: "Origin",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
