/**
 * Single Broadcast List API
 * GET /api/channels/broadcast/[id] - Get broadcast list details
 * POST /api/channels/broadcast/[id] - Send message to broadcast list
 * DELETE /api/channels/broadcast/[id] - Delete broadcast list
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { gql } from "@apollo/client";
import { logger } from "@/lib/logger";
import { apolloClient } from "@/lib/apollo-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Schema validation
const sendMessageSchema = z.object({
  content: z.string().min(1).max(5000),
  attachments: z
    .array(
      z.object({
        type: z.enum(["image", "video", "audio", "file"]),
        url: z.string().url(),
        name: z.string(),
        size: z.number().int().positive(),
        mimeType: z.string(),
      }),
    )
    .default([]),
  scheduledFor: z.string().datetime().optional(),
  priority: z.enum(["low", "normal", "high"]).default("normal"),
});

// Helper functions
function getUserIdFromRequest(request: NextRequest): string | null {
  return request.headers.get("x-user-id") || null;
}

function validateBroadcastId(id: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

function transformBroadcastList(raw: Record<string, unknown>) {
  return {
    id: raw.id,
    workspaceId: raw.workspace_id,
    name: raw.name,
    description: raw.description,
    icon: raw.icon,
    ownerId: raw.owner_id,
    subscriptionMode: raw.subscription_mode,
    allowReplies: raw.allow_replies,
    showSenderName: raw.show_sender_name,
    trackDelivery: raw.track_delivery,
    trackReads: raw.track_reads,
    maxSubscribers: raw.max_subscribers,
    subscriberCount: raw.subscriber_count,
    totalMessagesSent: raw.total_messages_sent,
    lastBroadcastAt: raw.last_broadcast_at,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

/**
 * GET /api/channels/broadcast/[id]
 * Get broadcast list details with subscribers and recent messages
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: broadcastId } = await params;

    logger.info("GET /api/channels/broadcast/[id] - Get broadcast list", {
      broadcastId,
    });

    if (!validateBroadcastId(broadcastId)) {
      return NextResponse.json(
        { success: false, error: "Invalid broadcast list ID" },
        { status: 400 },
      );
    }

    const userId = getUserIdFromRequest(request);

    // Query params for pagination
    const { searchParams } = new URL(request.url);
    const includeMessages = searchParams.get("includeMessages") === "true";
    const includeSubscribers =
      searchParams.get("includeSubscribers") === "true";

    // Fetch broadcast list from database
    const { data } = await apolloClient.query({
      query: GET_BROADCAST_LIST_DETAILS_QUERY,
      variables: {
        broadcastId,
        includeMessages,
        includeSubscribers,
      },
      fetchPolicy: "network-only",
    });

    const broadcastList = data?.nchat_broadcast_lists_by_pk;
    if (!broadcastList) {
      return NextResponse.json(
        { success: false, error: "Broadcast list not found" },
        { status: 404 },
      );
    }

    // Build response
    const response: Record<string, unknown> = {
      success: true,
      broadcastList: transformBroadcastList(broadcastList),
    };

    // Include recent messages if requested
    if (includeMessages && broadcastList.messages) {
      response.recentMessages = broadcastList.messages.map(
        (msg: Record<string, unknown>) => ({
          id: msg.id,
          content: msg.content,
          sentAt: msg.sent_at,
          scheduledFor: msg.scheduled_for,
          isScheduled: msg.is_scheduled,
          totalRecipients: msg.total_recipients,
          deliveredCount: msg.delivered_count,
          readCount: msg.read_count,
          failedCount: msg.failed_count,
        }),
      );
    }

    // Include subscribers if requested and user is owner
    if (
      includeSubscribers &&
      broadcastList.owner_id === userId &&
      broadcastList.subscribers
    ) {
      response.subscribers = broadcastList.subscribers.map(
        (sub: Record<string, unknown>) => ({
          userId: sub.user_id,
          subscribedAt: sub.subscribed_at,
          subscribedBy: sub.subscribed_by,
          notificationsEnabled: sub.notifications_enabled,
          status: sub.status,
        }),
      );
    }

    logger.info("GET /api/channels/broadcast/[id] - Success", { broadcastId });

    return NextResponse.json(response);
  } catch (error) {
    const { id: broadcastId } = await params;
    logger.error("Error fetching broadcast list", error as Error, {
      broadcastId,
    });
    return NextResponse.json(
      { success: false, error: "Failed to fetch broadcast list" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/channels/broadcast/[id]
 * Send message to broadcast list
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: broadcastId } = await params;

    logger.info("POST /api/channels/broadcast/[id] - Send broadcast message", {
      broadcastId,
    });

    if (!validateBroadcastId(broadcastId)) {
      return NextResponse.json(
        { success: false, error: "Invalid broadcast list ID" },
        { status: 400 },
      );
    }

    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = sendMessageSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body",
          details: validation.error.errors,
        },
        { status: 400 },
      );
    }

    const data = validation.data;

    // Fetch broadcast list and verify ownership
    const { data: listData } = await apolloClient.query({
      query: GET_BROADCAST_LIST_OWNER_QUERY,
      variables: { broadcastId },
      fetchPolicy: "network-only",
    });

    const broadcastList = listData?.nchat_broadcast_lists_by_pk;
    if (!broadcastList) {
      return NextResponse.json(
        { success: false, error: "Broadcast list not found" },
        { status: 404 },
      );
    }

    if (broadcastList.owner_id !== userId) {
      return NextResponse.json(
        { success: false, error: "Only the list owner can send broadcasts" },
        { status: 403 },
      );
    }

    if (broadcastList.subscriber_count === 0) {
      return NextResponse.json(
        { success: false, error: "Broadcast list has no active subscribers" },
        { status: 400 },
      );
    }

    // Create broadcast message
    const { data: messageData } = await apolloClient.mutate({
      mutation: CREATE_BROADCAST_MESSAGE_MUTATION,
      variables: {
        broadcastListId: broadcastId,
        content: data.content,
        attachments: data.attachments,
        sentBy: userId,
        scheduledFor: data.scheduledFor,
        isScheduled: !!data.scheduledFor,
        totalRecipients: broadcastList.subscriber_count,
        priority: data.priority,
      },
    });

    const broadcastMessage = messageData?.insert_nchat_broadcast_messages_one;

    // Update broadcast list stats
    await apolloClient.mutate({
      mutation: UPDATE_BROADCAST_LIST_STATS_MUTATION,
      variables: {
        broadcastId,
        lastBroadcastAt: data.scheduledFor || new Date().toISOString(),
      },
    });

    logger.info("POST /api/channels/broadcast/[id] - Success", {
      broadcastId,
      messageId: broadcastMessage?.id,
      recipientCount: broadcastList.subscriber_count,
      scheduled: !!data.scheduledFor,
    });

    return NextResponse.json(
      {
        success: true,
        message: {
          id: broadcastMessage.id,
          broadcastListId: broadcastMessage.broadcast_list_id,
          content: broadcastMessage.content,
          attachments: broadcastMessage.attachments,
          sentBy: broadcastMessage.sent_by,
          sentAt: broadcastMessage.sent_at,
          scheduledFor: broadcastMessage.scheduled_for,
          isScheduled: broadcastMessage.is_scheduled,
          priority: broadcastMessage.priority,
          totalRecipients: broadcastMessage.total_recipients,
          deliveredCount: 0,
          readCount: 0,
          failedCount: 0,
          status: data.scheduledFor ? "scheduled" : "queued",
        },
        statusMessage: data.scheduledFor
          ? `Broadcast scheduled for ${data.scheduledFor}`
          : "Broadcast queued for delivery",
      },
      { status: 202 },
    );
  } catch (error) {
    const { id: broadcastId } = await params;
    logger.error("Error sending broadcast message", error as Error, {
      broadcastId,
    });
    return NextResponse.json(
      { success: false, error: "Failed to send broadcast message" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/channels/broadcast/[id]
 * Delete broadcast list
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: broadcastId } = await params;

    logger.info("DELETE /api/channels/broadcast/[id] - Delete broadcast list", {
      broadcastId,
    });

    if (!validateBroadcastId(broadcastId)) {
      return NextResponse.json(
        { success: false, error: "Invalid broadcast list ID" },
        { status: 400 },
      );
    }

    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    // Fetch broadcast list and verify ownership
    const { data: listData } = await apolloClient.query({
      query: GET_BROADCAST_LIST_OWNER_QUERY,
      variables: { broadcastId },
      fetchPolicy: "network-only",
    });

    const broadcastList = listData?.nchat_broadcast_lists_by_pk;
    if (!broadcastList) {
      return NextResponse.json(
        { success: false, error: "Broadcast list not found" },
        { status: 404 },
      );
    }

    if (broadcastList.owner_id !== userId) {
      return NextResponse.json(
        {
          success: false,
          error: "Only the list owner can delete the broadcast list",
        },
        { status: 403 },
      );
    }

    // Check for hard delete flag
    const { searchParams } = new URL(request.url);
    const hardDelete = searchParams.get("hardDelete") === "true";

    if (hardDelete) {
      // Delete subscribers first
      await apolloClient.mutate({
        mutation: DELETE_BROADCAST_SUBSCRIBERS_MUTATION,
        variables: { broadcastId },
      });

      // Delete messages
      await apolloClient.mutate({
        mutation: DELETE_BROADCAST_MESSAGES_MUTATION,
        variables: { broadcastId },
      });

      // Delete the list
      await apolloClient.mutate({
        mutation: DELETE_BROADCAST_LIST_MUTATION,
        variables: { broadcastId },
      });

      logger.warn("DELETE /api/channels/broadcast/[id] - Hard deleted", {
        broadcastId,
        deletedBy: userId,
      });
    } else {
      // Soft delete
      await apolloClient.mutate({
        mutation: SOFT_DELETE_BROADCAST_LIST_MUTATION,
        variables: { broadcastId },
      });

      logger.info("DELETE /api/channels/broadcast/[id] - Soft deleted", {
        broadcastId,
        deletedBy: userId,
      });
    }

    return NextResponse.json({
      success: true,
      message: hardDelete
        ? "Broadcast list deleted permanently"
        : "Broadcast list deactivated successfully",
      broadcastListId: broadcastId,
    });
  } catch (error) {
    const { id: broadcastId } = await params;
    logger.error("Error deleting broadcast list", error as Error, {
      broadcastId,
    });
    return NextResponse.json(
      { success: false, error: "Failed to delete broadcast list" },
      { status: 500 },
    );
  }
}

// =============================================================================
// GraphQL Queries and Mutations
// =============================================================================

const GET_BROADCAST_LIST_DETAILS_QUERY = gql`
  query GetBroadcastListDetails(
    $broadcastId: uuid!
    $includeMessages: Boolean!
    $includeSubscribers: Boolean!
  ) {
    nchat_broadcast_lists_by_pk(id: $broadcastId) {
      id
      workspace_id
      name
      description
      icon
      owner_id
      subscription_mode
      allow_replies
      show_sender_name
      track_delivery
      track_reads
      max_subscribers
      subscriber_count
      total_messages_sent
      last_broadcast_at
      created_at
      updated_at
      messages: nchat_broadcast_messages(
        order_by: { sent_at: desc }
        limit: 10
      ) @include(if: $includeMessages) {
        id
        content
        sent_at
        scheduled_for
        is_scheduled
        total_recipients
        delivered_count
        read_count
        failed_count
      }
      subscribers: nchat_broadcast_subscribers(
        where: { status: { _eq: "active" } }
        order_by: { subscribed_at: desc }
        limit: 100
      ) @include(if: $includeSubscribers) {
        user_id
        subscribed_at
        subscribed_by
        notifications_enabled
        status
      }
    }
  }
`;

const GET_BROADCAST_LIST_OWNER_QUERY = gql`
  query GetBroadcastListOwner($broadcastId: uuid!) {
    nchat_broadcast_lists_by_pk(id: $broadcastId) {
      id
      name
      owner_id
      subscriber_count
    }
  }
`;

const CREATE_BROADCAST_MESSAGE_MUTATION = gql`
  mutation CreateBroadcastMessage(
    $broadcastListId: uuid!
    $content: String!
    $attachments: jsonb
    $sentBy: uuid!
    $scheduledFor: timestamptz
    $isScheduled: Boolean!
    $totalRecipients: Int!
    $priority: String
  ) {
    insert_nchat_broadcast_messages_one(
      object: {
        broadcast_list_id: $broadcastListId
        content: $content
        attachments: $attachments
        sent_by: $sentBy
        scheduled_for: $scheduledFor
        is_scheduled: $isScheduled
        total_recipients: $totalRecipients
        priority: $priority
        delivered_count: 0
        read_count: 0
        failed_count: 0
      }
    ) {
      id
      broadcast_list_id
      content
      attachments
      sent_by
      sent_at
      scheduled_for
      is_scheduled
      priority
      total_recipients
      delivered_count
      read_count
      failed_count
    }
  }
`;

const UPDATE_BROADCAST_LIST_STATS_MUTATION = gql`
  mutation UpdateBroadcastListStats(
    $broadcastId: uuid!
    $lastBroadcastAt: timestamptz!
  ) {
    update_nchat_broadcast_lists_by_pk(
      pk_columns: { id: $broadcastId }
      _inc: { total_messages_sent: 1 }
      _set: { last_broadcast_at: $lastBroadcastAt }
    ) {
      id
    }
  }
`;

const DELETE_BROADCAST_SUBSCRIBERS_MUTATION = gql`
  mutation DeleteBroadcastSubscribers($broadcastId: uuid!) {
    delete_nchat_broadcast_subscribers(
      where: { broadcast_list_id: { _eq: $broadcastId } }
    ) {
      affected_rows
    }
  }
`;

const DELETE_BROADCAST_MESSAGES_MUTATION = gql`
  mutation DeleteBroadcastMessages($broadcastId: uuid!) {
    delete_nchat_broadcast_messages(
      where: { broadcast_list_id: { _eq: $broadcastId } }
    ) {
      affected_rows
    }
  }
`;

const DELETE_BROADCAST_LIST_MUTATION = gql`
  mutation DeleteBroadcastList($broadcastId: uuid!) {
    delete_nchat_broadcast_lists_by_pk(id: $broadcastId) {
      id
    }
  }
`;

const SOFT_DELETE_BROADCAST_LIST_MUTATION = gql`
  mutation SoftDeleteBroadcastList($broadcastId: uuid!) {
    update_nchat_broadcast_lists_by_pk(
      pk_columns: { id: $broadcastId }
      _set: { is_active: false, deleted_at: "now()" }
    ) {
      id
    }
  }
`;
