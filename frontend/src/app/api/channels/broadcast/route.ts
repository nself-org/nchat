/**
 * Broadcast List Management API (WhatsApp-style)
 * GET /api/channels/broadcast - List broadcast lists
 * POST /api/channels/broadcast - Create broadcast list
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { gql } from "@apollo/client";
import { logger } from "@/lib/logger";
import { apolloClient } from "@/lib/apollo-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Schema validation
const createBroadcastListSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  icon: z.string().url().optional(),
  subscriptionMode: z.enum(["open", "invite", "admin"]).default("invite"),
  allowReplies: z.boolean().default(false),
  showSenderName: z.boolean().default(true),
  trackDelivery: z.boolean().default(true),
  trackReads: z.boolean().default(false),
  maxSubscribers: z.number().int().min(10).max(100000).default(1000),
  initialSubscriberIds: z.array(z.string().uuid()).default([]),
});

const sendBroadcastSchema = z.object({
  broadcastListId: z.string().uuid(),
  content: z.string().min(1).max(5000),
  attachments: z.array(z.unknown()).default([]),
  scheduledFor: z.string().datetime().optional(),
});

const broadcastFiltersSchema = z.object({
  workspaceId: z.string().uuid().optional(),
  ownerId: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

// Helper functions
function getUserIdFromRequest(request: NextRequest): string | null {
  return request.headers.get("x-user-id") || null;
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
 * GET /api/channels/broadcast
 * List broadcast lists for the workspace
 */
export async function GET(request: NextRequest) {
  try {
    logger.info("GET /api/channels/broadcast - List broadcast lists");

    const { searchParams } = new URL(request.url);
    const filters = broadcastFiltersSchema.parse({
      workspaceId: searchParams.get("workspaceId") || undefined,
      ownerId: searchParams.get("ownerId") || undefined,
      limit: Number(searchParams.get("limit")) || 20,
      offset: Number(searchParams.get("offset")) || 0,
    });

    if (!filters.workspaceId) {
      return NextResponse.json(
        { success: false, error: "workspaceId is required" },
        { status: 400 },
      );
    }

    const userId = getUserIdFromRequest(request);

    // Fetch broadcast lists from database
    const { data } = await apolloClient.query({
      query: GET_BROADCAST_LISTS_QUERY,
      variables: {
        workspaceId: filters.workspaceId,
        ownerId: filters.ownerId,
        limit: filters.limit,
        offset: filters.offset,
      },
      fetchPolicy: "network-only",
    });

    const broadcastLists = (data?.nchat_broadcast_lists || []).map(
      transformBroadcastList,
    );
    const total =
      data?.nchat_broadcast_lists_aggregate?.aggregate?.count ||
      broadcastLists.length;

    logger.info("GET /api/channels/broadcast - Success", {
      total,
      returned: broadcastLists.length,
    });

    return NextResponse.json({
      success: true,
      broadcastLists,
      pagination: {
        limit: filters.limit,
        offset: filters.offset,
        total,
        hasMore: filters.offset + filters.limit < total,
      },
    });
  } catch (error) {
    logger.error("Error fetching broadcast lists:", error as Error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid query parameters",
          details: error.errors,
        },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to fetch broadcast lists" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/channels/broadcast
 * Create a new broadcast list
 */
export async function POST(request: NextRequest) {
  try {
    logger.info("POST /api/channels/broadcast - Create broadcast list");

    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    // Parse and validate request body
    const body = await request.json();

    // Check if this is a broadcast send request or create request
    const isSendRequest = "broadcastListId" in body && "content" in body;

    if (isSendRequest) {
      return handleSendBroadcast(request, body, userId);
    }

    const validation = createBroadcastListSchema.safeParse(body);

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

    // Create broadcast list
    const { data: insertData } = await apolloClient.mutate({
      mutation: CREATE_BROADCAST_LIST_MUTATION,
      variables: {
        workspaceId: data.workspaceId,
        name: data.name,
        description: data.description,
        icon: data.icon,
        ownerId: userId,
        subscriptionMode: data.subscriptionMode,
        allowReplies: data.allowReplies,
        showSenderName: data.showSenderName,
        trackDelivery: data.trackDelivery,
        trackReads: data.trackReads,
        maxSubscribers: data.maxSubscribers,
        subscriberCount: data.initialSubscriberIds.length,
      },
    });

    const broadcastList = insertData?.insert_nchat_broadcast_lists_one;
    if (!broadcastList) {
      throw new Error("Failed to create broadcast list");
    }

    // Add initial subscribers if provided
    if (data.initialSubscriberIds.length > 0) {
      const subscribers = data.initialSubscriberIds.map((subId) => ({
        broadcast_list_id: broadcastList.id,
        user_id: subId,
        subscribed_by: userId,
        notifications_enabled: true,
        status: "active",
      }));

      await apolloClient.mutate({
        mutation: ADD_BROADCAST_SUBSCRIBERS_MUTATION,
        variables: { subscribers },
      });
    }

    logger.info("POST /api/channels/broadcast - Success", {
      broadcastListId: broadcastList.id,
      name: data.name,
      createdBy: userId,
    });

    return NextResponse.json(
      {
        success: true,
        broadcastList: transformBroadcastList(broadcastList),
        message: "Broadcast list created successfully",
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error("Error creating broadcast list:", error as Error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body",
          details: error.errors,
        },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to create broadcast list" },
      { status: 500 },
    );
  }
}

/**
 * Handle sending a broadcast message
 */
async function handleSendBroadcast(
  request: NextRequest,
  body: unknown,
  userId: string,
): Promise<NextResponse> {
  const validation = sendBroadcastSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid broadcast data",
        details: validation.error.errors,
      },
      { status: 400 },
    );
  }

  const data = validation.data;

  // Verify user is owner of the broadcast list
  const { data: listData } = await apolloClient.query({
    query: GET_BROADCAST_LIST_OWNER_QUERY,
    variables: { broadcastListId: data.broadcastListId },
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
        error: "Not authorized to send broadcasts to this list",
      },
      { status: 403 },
    );
  }

  // Create broadcast message
  const { data: messageData } = await apolloClient.mutate({
    mutation: CREATE_BROADCAST_MESSAGE_MUTATION,
    variables: {
      broadcastListId: data.broadcastListId,
      content: data.content,
      attachments: data.attachments,
      sentBy: userId,
      scheduledFor: data.scheduledFor,
      isScheduled: !!data.scheduledFor,
      totalRecipients: broadcastList.subscriber_count,
    },
  });

  const broadcastMessage = messageData?.insert_nchat_broadcast_messages_one;

  // Update broadcast list stats
  await apolloClient.mutate({
    mutation: UPDATE_BROADCAST_LIST_STATS_MUTATION,
    variables: {
      broadcastListId: data.broadcastListId,
      lastBroadcastAt: data.scheduledFor || new Date().toISOString(),
    },
  });

  logger.info("POST /api/channels/broadcast - Broadcast sent", {
    broadcastListId: data.broadcastListId,
    messageId: broadcastMessage?.id,
    scheduled: !!data.scheduledFor,
  });

  return NextResponse.json(
    {
      success: true,
      broadcastMessage: {
        id: broadcastMessage.id,
        broadcastListId: broadcastMessage.broadcast_list_id,
        content: broadcastMessage.content,
        attachments: broadcastMessage.attachments,
        sentBy: broadcastMessage.sent_by,
        sentAt: broadcastMessage.sent_at,
        scheduledFor: broadcastMessage.scheduled_for,
        isScheduled: broadcastMessage.is_scheduled,
        totalRecipients: broadcastMessage.total_recipients,
        deliveredCount: 0,
        readCount: 0,
        failedCount: 0,
      },
      message: data.scheduledFor
        ? "Broadcast scheduled successfully"
        : "Broadcast queued for delivery",
    },
    { status: 202 },
  );
}

// =============================================================================
// GraphQL Queries and Mutations
// =============================================================================

const GET_BROADCAST_LISTS_QUERY = gql`
  query GetBroadcastLists(
    $workspaceId: uuid!
    $ownerId: uuid
    $limit: Int!
    $offset: Int!
  ) {
    nchat_broadcast_lists(
      where: {
        workspace_id: { _eq: $workspaceId }
        owner_id: { _eq: $ownerId }
      }
      order_by: { created_at: desc }
      limit: $limit
      offset: $offset
    ) {
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
    }
    nchat_broadcast_lists_aggregate(
      where: {
        workspace_id: { _eq: $workspaceId }
        owner_id: { _eq: $ownerId }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`;

const GET_BROADCAST_LIST_OWNER_QUERY = gql`
  query GetBroadcastListOwner($broadcastListId: uuid!) {
    nchat_broadcast_lists_by_pk(id: $broadcastListId) {
      id
      owner_id
      subscriber_count
    }
  }
`;

const CREATE_BROADCAST_LIST_MUTATION = gql`
  mutation CreateBroadcastList(
    $workspaceId: uuid!
    $name: String!
    $description: String
    $icon: String
    $ownerId: uuid!
    $subscriptionMode: String!
    $allowReplies: Boolean!
    $showSenderName: Boolean!
    $trackDelivery: Boolean!
    $trackReads: Boolean!
    $maxSubscribers: Int!
    $subscriberCount: Int!
  ) {
    insert_nchat_broadcast_lists_one(
      object: {
        workspace_id: $workspaceId
        name: $name
        description: $description
        icon: $icon
        owner_id: $ownerId
        subscription_mode: $subscriptionMode
        allow_replies: $allowReplies
        show_sender_name: $showSenderName
        track_delivery: $trackDelivery
        track_reads: $trackReads
        max_subscribers: $maxSubscribers
        subscriber_count: $subscriberCount
        total_messages_sent: 0
      }
    ) {
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
    }
  }
`;

const ADD_BROADCAST_SUBSCRIBERS_MUTATION = gql`
  mutation AddBroadcastSubscribers(
    $subscribers: [nchat_broadcast_subscribers_insert_input!]!
  ) {
    insert_nchat_broadcast_subscribers(objects: $subscribers) {
      affected_rows
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
      total_recipients
      delivered_count
      read_count
      failed_count
    }
  }
`;

const UPDATE_BROADCAST_LIST_STATS_MUTATION = gql`
  mutation UpdateBroadcastListStats(
    $broadcastListId: uuid!
    $lastBroadcastAt: timestamptz!
  ) {
    update_nchat_broadcast_lists_by_pk(
      pk_columns: { id: $broadcastListId }
      _inc: { total_messages_sent: 1 }
      _set: { last_broadcast_at: $lastBroadcastAt }
    ) {
      id
    }
  }
`;
