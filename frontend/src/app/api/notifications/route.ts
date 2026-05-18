/**
 * Notifications API Route
 *
 * Provides REST API endpoints for managing notifications:
 * - GET: Fetch notifications with filtering, pagination
 * - POST: Create/send new notification
 * - PUT: Mark notification(s) as read
 * - DELETE: Delete notification(s)
 *
 * Integrates with GraphQL for persistent storage and real-time updates
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { logger } from "@/lib/logger";

// ============================================================================
// Types & Validation Schemas
// ============================================================================

const NotificationTypeSchema = z.enum([
  "mention",
  "direct_message",
  "thread_reply",
  "reaction",
  "channel_invite",
  "channel_update",
  "system",
  "announcement",
  "keyword",
]);

const NotificationPrioritySchema = z.enum(["low", "normal", "high", "urgent"]);

const CreateNotificationSchema = z.object({
  type: NotificationTypeSchema,
  priority: NotificationPrioritySchema.optional().default("normal"),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(1000),
  userId: z.string().uuid(),
  actor: z
    .object({
      id: z.string().uuid(),
      name: z.string(),
      avatarUrl: z.string().url().optional(),
    })
    .optional(),
  channelId: z.string().uuid().optional(),
  channelName: z.string().optional(),
  messageId: z.string().uuid().optional(),
  threadId: z.string().uuid().optional(),
  actionUrl: z.string().url().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const UpdateNotificationSchema = z.object({
  notificationIds: z.array(z.string()).min(1),
  isRead: z.boolean().optional(),
  isArchived: z.boolean().optional(),
});

const QueryNotificationsSchema = z.object({
  userId: z.string().uuid(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
  filter: z
    .enum(["all", "mentions", "threads", "reactions", "dms", "unread"])
    .optional()
    .default("all"),
  unreadOnly: z.coerce.boolean().optional().default(false),
  includeArchived: z.coerce.boolean().optional().default(false),
  channelId: z.string().uuid().optional(),
  type: NotificationTypeSchema.optional(),
  priority: NotificationPrioritySchema.optional(),
});

type CreateNotificationInput = z.infer<typeof CreateNotificationSchema>;
type UpdateNotificationInput = z.infer<typeof UpdateNotificationSchema>;
type QueryNotificationsInput = z.infer<typeof QueryNotificationsSchema>;

// ============================================================================
// GraphQL Queries & Mutations
// ============================================================================

const GET_NOTIFICATIONS_QUERY = `
  query GetNotifications(
    $userId: uuid!
    $limit: Int!
    $offset: Int!
    $unreadOnly: Boolean
    $includeArchived: Boolean
    $channelId: uuid
    $type: String
  ) {
    nchat_notifications(
      where: {
        user_id: { _eq: $userId }
        _and: [
          { is_archived: { _eq: $includeArchived } }
          { is_read: { _eq: $unreadOnly } }
          { channel_id: { _eq: $channelId } }
          { type: { _eq: $type } }
        ]
      }
      order_by: { created_at: desc }
      limit: $limit
      offset: $offset
    ) {
      id
      type
      priority
      title
      body
      user_id
      actor_id
      actor {
        id
        display_name
        avatar_url
      }
      channel_id
      channel {
        id
        name
      }
      message_id
      thread_id
      is_read
      is_archived
      created_at
      read_at
      action_url
      metadata
    }
    nchat_notifications_aggregate(
      where: {
        user_id: { _eq: $userId }
        is_read: { _eq: false }
        is_archived: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`;

const CREATE_NOTIFICATION_MUTATION = `
  mutation CreateNotification($notification: nchat_notifications_insert_input!) {
    insert_nchat_notifications_one(object: $notification) {
      id
      type
      priority
      title
      body
      user_id
      actor_id
      channel_id
      message_id
      thread_id
      is_read
      is_archived
      created_at
      action_url
      metadata
    }
  }
`;

const UPDATE_NOTIFICATIONS_MUTATION = `
  mutation UpdateNotifications(
    $notificationIds: [uuid!]!
    $isRead: Boolean
    $isArchived: Boolean
  ) {
    update_nchat_notifications(
      where: { id: { _in: $notificationIds } }
      _set: {
        is_read: $isRead
        is_archived: $isArchived
        read_at: "now()"
      }
    ) {
      affected_rows
      returning {
        id
        is_read
        is_archived
        read_at
      }
    }
  }
`;

const DELETE_NOTIFICATIONS_MUTATION = `
  mutation DeleteNotifications($notificationIds: [uuid!]!) {
    delete_nchat_notifications(where: { id: { _in: $notificationIds } }) {
      affected_rows
    }
  }
`;

const MARK_ALL_READ_MUTATION = `
  mutation MarkAllNotificationsRead($userId: uuid!) {
    update_nchat_notifications(
      where: {
        user_id: { _eq: $userId }
        is_read: { _eq: false }
      }
      _set: {
        is_read: true
        read_at: "now()"
      }
    ) {
      affected_rows
    }
  }
`;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Execute GraphQL query against Hasura
 */
async function executeGraphQL<T = unknown>(
  query: string,
  variables: Record<string, unknown> = {},
  authToken?: string,
): Promise<{ data?: T; errors?: Array<{ message: string }> }> {
  const hasuraUrl =
    process.env.NEXT_PUBLIC_GRAPHQL_URL || "http://localhost:8080/v1/graphql";
  const hasuraAdminSecret = process.env.HASURA_ADMIN_SECRET;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  // Use admin secret if available, otherwise use auth token
  if (hasuraAdminSecret) {
    headers["x-hasura-admin-secret"] = hasuraAdminSecret;
  } else if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  try {
    const response = await fetch(hasuraUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new Error(`GraphQL request failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    logger.error("GraphQL execution error:", error);
    throw error;
  }
}

/**
 * Get auth token from request headers
 */
function getAuthToken(request: NextRequest): string | undefined {
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }
  return undefined;
}

/**
 * Transform GraphQL notification to API format
 */
function transformNotification(notification: unknown): unknown {
  const n = notification as {
    id: string;
    type: string;
    priority: string;
    title: string;
    body: string;
    user_id: string;
    actor?: { id: string; display_name: string; avatar_url?: string };
    channel?: { id: string; name: string };
    channel_id?: string;
    message_id?: string;
    thread_id?: string;
    is_read: boolean;
    is_archived: boolean;
    created_at: string;
    read_at?: string;
    action_url?: string;
    metadata?: Record<string, unknown>;
  };

  return {
    id: n.id,
    type: n.type,
    priority: n.priority,
    title: n.title,
    body: n.body,
    actor: n.actor
      ? {
          id: n.actor.id,
          name: n.actor.display_name,
          avatarUrl: n.actor.avatar_url,
        }
      : undefined,
    channelId: n.channel_id,
    channelName: n.channel?.name,
    messageId: n.message_id,
    threadId: n.thread_id,
    isRead: n.is_read,
    isArchived: n.is_archived,
    createdAt: n.created_at,
    readAt: n.read_at,
    actionUrl: n.action_url,
    metadata: n.metadata,
  };
}

// ============================================================================
// API Route Handlers
// ============================================================================

/**
 * GET /api/notifications
 * Fetch notifications for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const authToken = getAuthToken(request);

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    const parsed = QueryNotificationsSchema.safeParse(queryParams);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid query parameters",
          details: parsed.error.errors,
        },
        { status: 400 },
      );
    }

    const {
      userId,
      limit,
      offset,
      filter,
      unreadOnly,
      includeArchived,
      channelId,
      type,
      priority,
    } = parsed.data;

    // Execute GraphQL query
    const result = await executeGraphQL<{
      nchat_notifications: unknown[];
      nchat_notifications_aggregate: { aggregate: { count: number } };
    }>(
      GET_NOTIFICATIONS_QUERY,
      {
        userId,
        limit,
        offset,
        unreadOnly: unreadOnly ? false : undefined,
        includeArchived: includeArchived || false,
        channelId: channelId || undefined,
        type: type || undefined,
      },
      authToken,
    );

    if (result.errors) {
      return NextResponse.json(
        {
          success: false,
          error: "GraphQL query failed",
          details: result.errors,
        },
        { status: 500 },
      );
    }

    const notifications = result.data?.nchat_notifications || [];
    const totalUnread =
      result.data?.nchat_notifications_aggregate?.aggregate?.count || 0;

    // Apply filter transformations
    let filteredNotifications = notifications;

    if (filter === "mentions") {
      filteredNotifications = (notifications as any[]).filter(
        (n: { type: string }) => n.type === "mention",
      );
    } else if (filter === "threads") {
      filteredNotifications = (notifications as any[]).filter(
        (n: { type: string }) => n.type === "thread_reply",
      );
    } else if (filter === "reactions") {
      filteredNotifications = (notifications as any[]).filter(
        (n: { type: string }) => n.type === "reaction",
      );
    } else if (filter === "dms") {
      filteredNotifications = (notifications as any[]).filter(
        (n: { type: string }) => n.type === "direct_message",
      );
    } else if (filter === "unread") {
      filteredNotifications = (notifications as any[]).filter(
        (n: { is_read: boolean }) => !n.is_read,
      );
    }

    // Transform to API format
    const transformedNotifications = filteredNotifications.map(
      transformNotification,
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          notifications: transformedNotifications,
          pagination: {
            limit,
            offset,
            total: filteredNotifications.length,
            hasMore: filteredNotifications.length === limit,
          },
          unreadCount: totalUnread,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    logger.error("GET /api/notifications error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/notifications
 * Create a new notification
 */
export async function POST(request: NextRequest) {
  try {
    const authToken = getAuthToken(request);
    const body = await request.json();

    const parsed = CreateNotificationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid notification data",
          details: parsed.error.errors,
        },
        { status: 400 },
      );
    }

    const data = parsed.data;

    // Build notification object for GraphQL
    const notification = {
      type: data.type,
      priority: data.priority,
      title: data.title,
      body: data.body,
      user_id: data.userId,
      actor_id: data.actor?.id,
      channel_id: data.channelId,
      message_id: data.messageId,
      thread_id: data.threadId,
      action_url: data.actionUrl,
      metadata: data.metadata,
      is_read: false,
      is_archived: false,
    };

    const result = await executeGraphQL<{
      insert_nchat_notifications_one: unknown;
    }>(CREATE_NOTIFICATION_MUTATION, { notification }, authToken);

    if (result.errors) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to create notification",
          details: result.errors,
        },
        { status: 500 },
      );
    }

    const createdNotification = result.data?.insert_nchat_notifications_one;

    return NextResponse.json(
      {
        success: true,
        data: transformNotification(createdNotification),
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error("POST /api/notifications error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/notifications
 * Update notification(s) - mark as read/archived
 */
export async function PUT(request: NextRequest) {
  try {
    const authToken = getAuthToken(request);
    const body = await request.json();

    const parsed = UpdateNotificationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid update data",
          details: parsed.error.errors,
        },
        { status: 400 },
      );
    }

    const { notificationIds, isRead, isArchived } = parsed.data;

    const result = await executeGraphQL<{
      update_nchat_notifications: {
        affected_rows: number;
        returning: unknown[];
      };
    }>(
      UPDATE_NOTIFICATIONS_MUTATION,
      {
        notificationIds,
        isRead,
        isArchived,
      },
      authToken,
    );

    if (result.errors) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to update notifications",
          details: result.errors,
        },
        { status: 500 },
      );
    }

    const affectedRows =
      result.data?.update_nchat_notifications?.affected_rows || 0;
    const updatedNotifications =
      result.data?.update_nchat_notifications?.returning || [];

    return NextResponse.json(
      {
        success: true,
        data: {
          affectedRows,
          notifications: updatedNotifications.map(transformNotification),
        },
      },
      { status: 200 },
    );
  } catch (error) {
    logger.error("PUT /api/notifications error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/notifications
 * Delete notification(s)
 */
export async function DELETE(request: NextRequest) {
  try {
    const authToken = getAuthToken(request);
    const { searchParams } = new URL(request.url);
    const notificationIds = searchParams.get("ids")?.split(",") || [];

    if (notificationIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No notification IDs provided",
        },
        { status: 400 },
      );
    }

    const result = await executeGraphQL<{
      delete_nchat_notifications: {
        affected_rows: number;
      };
    }>(DELETE_NOTIFICATIONS_MUTATION, { notificationIds }, authToken);

    if (result.errors) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to delete notifications",
          details: result.errors,
        },
        { status: 500 },
      );
    }

    const affectedRows =
      result.data?.delete_nchat_notifications?.affected_rows || 0;

    return NextResponse.json(
      {
        success: true,
        data: {
          affectedRows,
          deletedIds: notificationIds,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    logger.error("DELETE /api/notifications error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/notifications/mark-all-read
 * Mark all notifications as read for a user
 */
export async function PATCH(request: NextRequest) {
  try {
    const authToken = getAuthToken(request);
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "userId is required",
        },
        { status: 400 },
      );
    }

    const result = await executeGraphQL<{
      update_nchat_notifications: {
        affected_rows: number;
      };
    }>(MARK_ALL_READ_MUTATION, { userId }, authToken);

    if (result.errors) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to mark all as read",
          details: result.errors,
        },
        { status: 500 },
      );
    }

    const affectedRows =
      result.data?.update_nchat_notifications?.affected_rows || 0;

    return NextResponse.json(
      {
        success: true,
        data: {
          affectedRows,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    logger.error("PATCH /api/notifications error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Unknown error",
      },
      { status: 500 },
    );
  }
}
