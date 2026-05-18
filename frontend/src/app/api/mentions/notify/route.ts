/**
 * Mentions Notification API Route
 *
 * POST /api/mentions/notify - Send notifications for message mentions
 *
 * Features:
 * - User mentions (@username)
 * - Channel mentions (#channel)
 * - Everyone mentions (@everyone)
 * - Here mentions (@here - online users only)
 * - Role mentions (@role)
 * - Notification batching
 * - Preference checking
 * - In-app Socket.io notification via APIEventBroadcaster
 * - Email notification via emailService
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { apolloClient } from "@/lib/apollo-client";
import { gql } from "@apollo/client";
import { getAPIEventBroadcaster } from "@/services/realtime/api-event-broadcaster";
import { getUserRoom, REALTIME_EVENTS } from "@/services/realtime/events.types";
import { emailService } from "@/lib/email/email.service";
import { v4 as uuidv4 } from "uuid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const NotifyMentionsSchema = z.object({
  messageId: z.string().uuid("Invalid message ID"),
  channelId: z.string().uuid("Invalid channel ID"),
  actorId: z.string().uuid("Invalid actor ID"),
  actorName: z.string().min(1),
  messagePreview: z.string().max(200),
  threadId: z.string().uuid().optional(),
  mentionedUsers: z.array(z.string().uuid()).optional(),
  mentionedChannels: z.array(z.string().uuid()).optional(),
  mentionsEveryone: z.boolean().default(false),
  mentionsHere: z.boolean().default(false),
  mentionedRoles: z.array(z.string()).optional(),
});

// ============================================================================
// GRAPHQL OPERATIONS
// ============================================================================

const CREATE_MENTION_NOTIFICATIONS = gql`
  mutation CreateMentionNotifications(
    $notifications: [nchat_notifications_insert_input!]!
  ) {
    insert_nchat_notifications(objects: $notifications) {
      affected_rows
      returning {
        id
        user_id
        type
      }
    }
  }
`;

const GET_ONLINE_USERS = gql`
  query GetOnlineUsers($channelId: uuid!) {
    nchat_channel_members(
      where: {
        channel_id: { _eq: $channelId }
        user: { nchat_presences: { status: { _in: ["online", "active"] } } }
      }
    ) {
      user_id
      user {
        id
        display_name
        email
      }
    }
  }
`;

const GET_CHANNEL_MEMBERS = gql`
  query GetChannelMembers($channelId: uuid!) {
    nchat_channel_members(where: { channel_id: { _eq: $channelId } }) {
      user_id
      notifications_enabled
      user {
        id
        display_name
        email
        preferences
      }
    }
  }
`;

const GET_USER_NOTIFICATION_PREFERENCES = gql`
  query GetUserNotificationPreferences($userIds: [uuid!]!) {
    nchat_users(where: { id: { _in: $userIds } }) {
      id
      email
      display_name
      preferences
    }
  }
`;

const GET_CHANNEL_INFO = gql`
  query GetChannelInfo($channelId: uuid!) {
    nchat_channels_by_pk(id: $channelId) {
      id
      name
      slug
      type
    }
  }
`;

// ============================================================================
// HELPERS
// ============================================================================

function shouldNotifyUser(
  userId: string,
  preferences: Record<string, unknown>,
  mentionType: string,
): boolean {
  // Check if mentions are enabled
  const mentionsEnabled = preferences.mentions_enabled !== false;

  // Check if specific mention type is enabled
  const mentionTypeKey = `notify_${mentionType}`;
  const mentionTypeEnabled = preferences[mentionTypeKey] !== false;

  return mentionsEnabled && mentionTypeEnabled;
}

// ============================================================================
// POST - Send mention notifications
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    logger.info("POST /api/mentions/notify");

    // Parse and validate request body
    const body = await request.json();
    const validation = NotifyMentionsSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const data = validation.data;

    // Get channel info
    const { data: channelData } = await apolloClient.query({
      query: GET_CHANNEL_INFO,
      variables: { channelId: data.channelId },
      fetchPolicy: "network-only",
    });

    const channel = channelData?.nchat_channels_by_pk;
    if (!channel) {
      return NextResponse.json(
        { success: false, error: "Channel not found" },
        { status: 404 },
      );
    }

    const notifications: Record<string, unknown>[] = [];
    const recipientIds = new Set<string>();

    // Handle @everyone mentions
    if (data.mentionsEveryone) {
      const { data: membersData } = await apolloClient.query({
        query: GET_CHANNEL_MEMBERS,
        variables: { channelId: data.channelId },
        fetchPolicy: "network-only",
      });

      const members = membersData?.nchat_channel_members || [];
      for (const member of members) {
        if (member.user_id === data.actorId) continue; // Don't notify the author
        if (!member.notifications_enabled) continue;

        if (
          shouldNotifyUser(
            member.user_id,
            member.user.preferences || {},
            "everyone",
          )
        ) {
          recipientIds.add(member.user_id);
        }
      }
    }

    // Handle @here mentions (online users only)
    if (data.mentionsHere) {
      const { data: onlineData } = await apolloClient.query({
        query: GET_ONLINE_USERS,
        variables: { channelId: data.channelId },
        fetchPolicy: "network-only",
      });

      const onlineUsers = onlineData?.nchat_channel_members || [];
      for (const member of onlineUsers) {
        if (member.user_id === data.actorId) continue;

        recipientIds.add(member.user_id);
      }
    }

    // Handle individual user mentions
    if (data.mentionedUsers && data.mentionedUsers.length > 0) {
      const { data: prefsData } = await apolloClient.query({
        query: GET_USER_NOTIFICATION_PREFERENCES,
        variables: { userIds: data.mentionedUsers },
        fetchPolicy: "network-only",
      });

      const users = prefsData?.nchat_users || [];
      for (const user of users) {
        if (user.id === data.actorId) continue;

        if (shouldNotifyUser(user.id, user.preferences || {}, "user")) {
          recipientIds.add(user.id);
        }
      }
    }

    // Build notification objects and collect user details for email/socket.
    // Fetch user email + display_name for all recipients in one query.
    const userDetailsMap = new Map<
      string,
      {
        id: string;
        email: string;
        display_name: string;
        preferences: Record<string, unknown>;
      }
    >();

    if (recipientIds.size > 0) {
      const { data: usersData } = await apolloClient.query({
        query: GET_USER_NOTIFICATION_PREFERENCES,
        variables: { userIds: Array.from(recipientIds) },
        fetchPolicy: "network-only",
      });
      for (const u of usersData?.nchat_users || []) {
        userDetailsMap.set(u.id, u);
      }
    }

    for (const userId of recipientIds) {
      const notificationType = data.mentionsEveryone
        ? "mention_everyone"
        : data.mentionsHere
          ? "mention_here"
          : "mention_user";

      notifications.push({
        user_id: userId,
        type: notificationType,
        title: `${data.actorName} mentioned you in #${channel.name}`,
        content: data.messagePreview,
        metadata: {
          message_id: data.messageId,
          channel_id: data.channelId,
          channel_name: channel.name,
          channel_slug: channel.slug,
          actor_id: data.actorId,
          actor_name: data.actorName,
          thread_id: data.threadId,
          mention_type: notificationType,
        },
      });
    }

    // Batch insert notifications
    let insertedIds: string[] = [];
    if (notifications.length > 0) {
      const { data: insertData, errors } = await apolloClient.mutate({
        mutation: CREATE_MENTION_NOTIFICATIONS,
        variables: { notifications },
      });

      if (errors) {
        throw new Error(errors[0].message);
      }

      insertedIds =
        insertData?.insert_nchat_notifications?.returning?.map(
          (n: { id: string }) => n.id,
        ) || [];

      logger.info("Mention notifications created", {
        messageId: data.messageId,
        recipientCount: notifications.length,
        affectedRows: insertData.insert_nchat_notifications.affected_rows,
      });
    }

    // Deliver real-time in-app notifications via Socket.io.
    // APIEventBroadcaster POSTs to the realtime server's /api/broadcast
    // endpoint which fans out to each user's personal Socket.io room.
    const broadcaster = getAPIEventBroadcaster();
    if (!broadcaster.initialized) {
      broadcaster.initialize();
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";

    for (const userId of recipientIds) {
      const userDetails = userDetailsMap.get(userId);

      // 1. In-app Socket.io notification — sent to user:<userId> room
      await broadcaster.broadcast(
        REALTIME_EVENTS.NOTIFICATION,
        [getUserRoom(userId)],
        {
          id: uuidv4(),
          type: "mention",
          title: `${data.actorName} mentioned you in #${channel.name}`,
          body: data.messagePreview.substring(0, 100),
          data: {
            channelId: data.channelId,
            messageId: data.messageId,
            threadId: data.threadId,
            actorId: data.actorId,
            actorName: data.actorName,
          },
          createdAt: new Date().toISOString(),
        },
      );

      // 2. Email notification — sent when user has an email and has not
      //    explicitly disabled email mentions via preferences.
      if (userDetails?.email) {
        const emailMentionsDisabled =
          (userDetails.preferences as Record<string, unknown>)
            ?.email_mentions === false;

        if (!emailMentionsDisabled) {
          const channelUrl = `${appUrl}/chat/${data.channelId}`;
          await emailService
            .send({
              to: userDetails.email,
              subject: `${data.actorName} mentioned you in #${channel.name}`,
              html: [
                `<p><strong>${data.actorName}</strong> mentioned you in <strong>#${channel.name}</strong>:</p>`,
                `<blockquote style="border-left:3px solid #ccc;margin:0;padding:0 12px;color:#555;">`,
                `  ${data.messagePreview}`,
                `</blockquote>`,
                `<p style="margin-top:16px;">`,
                `  <a href="${channelUrl}" style="background:#5865F2;color:#fff;padding:10px 20px;`,
                `     border-radius:4px;text-decoration:none;font-weight:600;">View message</a>`,
                `</p>`,
              ].join(""),
            })
            .catch((err: Error) => {
              // Non-fatal: log and continue so a failed email doesn't block
              // the API response or in-app notification delivery.
              logger.warn("Failed to send mention email notification", {
                userId,
                error: err.message,
              });
            });
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        recipientCount: notifications.length,
        notificationIds: insertedIds,
        messageId: data.messageId,
        channelId: data.channelId,
      },
    });
  } catch (error) {
    logger.error("POST /api/mentions/notify - Error", error as Error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to send mention notifications",
        message:
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
