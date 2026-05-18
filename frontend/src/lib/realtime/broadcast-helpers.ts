/**
 * Realtime Broadcast Helpers
 *
 * Helper functions for broadcasting realtime events from API routes.
 * These functions simplify the process of notifying connected clients
 * of data changes.
 *
 * @module lib/realtime/broadcast-helpers
 * @version 1.0.0
 */

import { getAPIEventBroadcaster } from "@/services/realtime/api-event-broadcaster";
import type { EventUser } from "@/services/realtime/events.types";
import type { Message } from "@/types/message";

// ============================================================================
// Types
// ============================================================================

/**
 * User data from database for conversion to EventUser
 */
export interface DBUser {
  id: string;
  username: string;
  display_name?: string;
  displayName?: string;
  avatar_url?: string;
  avatarUrl?: string;
}

/**
 * Channel data for broadcasts
 */
export interface DBChannel {
  id: string;
  name: string;
  member_count?: number;
  memberCount?: number;
}

// ============================================================================
// Conversion Helpers
// ============================================================================

/**
 * Convert database user to EventUser
 */
export function toEventUser(user: DBUser): EventUser {
  return {
    id: user.id,
    username: user.username,
    displayName: user.display_name || user.displayName,
    avatarUrl: user.avatar_url || user.avatarUrl,
  };
}

/**
 * Convert Message type to broadcast data
 */
export function messageToEventData(message: Message) {
  return {
    id: message.id,
    channelId: message.channelId,
    content: message.content,
    contentHtml: message.contentHtml,
    type: message.type,
    threadId: message.parentThreadId,
    parentMessageId: message.replyToId,
    mentions: message.mentionedUsers,
    mentionedChannels: message.mentionedChannels,
    attachments: message.attachments?.map((a) => ({
      id: a.id,
      type: a.type,
      url: a.url,
      filename: a.name,
      size: a.size,
      mimeType: a.mimeType,
    })),
    metadata: {},
    createdAt: message.createdAt.toISOString(),
    user: {
      id: message.user.id,
      username: message.user.username,
      displayName: message.user.displayName,
      avatarUrl: message.user.avatarUrl,
    },
  };
}

// ============================================================================
// Message Broadcasting
// ============================================================================

/**
 * Broadcast a new message to all channel subscribers
 */
export async function broadcastNewMessage(message: Message): Promise<void> {
  const broadcaster = getAPIEventBroadcaster();

  if (!broadcaster.initialized) {
    broadcaster.initialize();
  }

  await broadcaster.broadcastMessageNew(messageToEventData(message));
}

/**
 * Broadcast a message update (edit)
 */
export async function broadcastMessageEdit(
  messageId: string,
  channelId: string,
  newContent: string,
  newContentHtml: string | undefined,
  editedBy: EventUser,
  threadId?: string,
): Promise<void> {
  const broadcaster = getAPIEventBroadcaster();

  if (!broadcaster.initialized) {
    broadcaster.initialize();
  }

  await broadcaster.broadcastMessageUpdate({
    id: messageId,
    channelId,
    content: newContent,
    contentHtml: newContentHtml,
    editedBy,
    threadId,
  });
}

/**
 * Broadcast a message deletion
 */
export async function broadcastMessageDelete(
  messageId: string,
  channelId: string,
  deletedBy?: EventUser,
  threadId?: string,
  hardDelete = false,
): Promise<void> {
  const broadcaster = getAPIEventBroadcaster();

  if (!broadcaster.initialized) {
    broadcaster.initialize();
  }

  await broadcaster.broadcastMessageDelete({
    id: messageId,
    channelId,
    deletedBy,
    threadId,
    hardDelete,
  });
}

// ============================================================================
// Reaction Broadcasting
// ============================================================================

/**
 * Broadcast a reaction added to a message
 */
export async function broadcastReactionAdded(
  messageId: string,
  channelId: string,
  emoji: string,
  user: EventUser,
  totalCount: number,
): Promise<void> {
  const broadcaster = getAPIEventBroadcaster();

  if (!broadcaster.initialized) {
    broadcaster.initialize();
  }

  await broadcaster.broadcastReactionAdd({
    messageId,
    channelId,
    emoji,
    user,
    totalCount,
  });
}

/**
 * Broadcast a reaction removed from a message
 */
export async function broadcastReactionRemoved(
  messageId: string,
  channelId: string,
  emoji: string,
  userId: string,
  remainingCount: number,
): Promise<void> {
  const broadcaster = getAPIEventBroadcaster();

  if (!broadcaster.initialized) {
    broadcaster.initialize();
  }

  await broadcaster.broadcastReactionRemove({
    messageId,
    channelId,
    emoji,
    userId,
    remainingCount,
  });
}

// ============================================================================
// Channel Broadcasting
// ============================================================================

/**
 * Broadcast a channel update
 */
export async function broadcastChannelUpdated(
  channelId: string,
  updates: Record<string, unknown>,
  updatedBy: EventUser,
): Promise<void> {
  const broadcaster = getAPIEventBroadcaster();

  if (!broadcaster.initialized) {
    broadcaster.initialize();
  }

  await broadcaster.broadcastChannelUpdate({
    channelId,
    updates,
    updatedBy,
  });
}

/**
 * Broadcast a member joining a channel
 */
export async function broadcastMemberJoined(
  channel: DBChannel,
  user: DBUser,
  role: "owner" | "admin" | "moderator" | "member" | "guest",
  addedBy?: DBUser,
): Promise<void> {
  const broadcaster = getAPIEventBroadcaster();

  if (!broadcaster.initialized) {
    broadcaster.initialize();
  }

  await broadcaster.broadcastMemberJoin({
    channelId: channel.id,
    channelName: channel.name,
    user: toEventUser(user),
    role,
    addedBy: addedBy ? toEventUser(addedBy) : undefined,
    memberCount: (channel.member_count || channel.memberCount || 0) + 1,
  });
}

/**
 * Broadcast a member leaving a channel
 */
export async function broadcastMemberLeft(
  channel: DBChannel,
  userId: string,
  username?: string,
  removedBy?: DBUser,
  reason?: "left" | "kicked" | "banned",
): Promise<void> {
  const broadcaster = getAPIEventBroadcaster();

  if (!broadcaster.initialized) {
    broadcaster.initialize();
  }

  await broadcaster.broadcastMemberLeave({
    channelId: channel.id,
    channelName: channel.name,
    userId,
    username,
    removedBy: removedBy ? toEventUser(removedBy) : undefined,
    reason,
    memberCount: Math.max(
      0,
      (channel.member_count || channel.memberCount || 1) - 1,
    ),
  });
}

// ============================================================================
// Pin Broadcasting
// ============================================================================

/**
 * Broadcast a message being pinned
 */
export async function broadcastMessagePinned(
  messageId: string,
  channelId: string,
  pinnedBy: EventUser,
): Promise<void> {
  const broadcaster = getAPIEventBroadcaster();

  if (!broadcaster.initialized) {
    broadcaster.initialize();
  }

  await broadcaster.broadcast("message:pin", [`channel:${channelId}`], {
    meta: { eventId: crypto.randomUUID(), timestamp: new Date().toISOString() },
    messageId,
    channelId,
    pinnedBy,
    pinnedAt: new Date().toISOString(),
    action: "pin",
  });
}

/**
 * Broadcast a message being unpinned
 */
export async function broadcastMessageUnpinned(
  messageId: string,
  channelId: string,
  unpinnedBy: EventUser,
): Promise<void> {
  const broadcaster = getAPIEventBroadcaster();

  if (!broadcaster.initialized) {
    broadcaster.initialize();
  }

  await broadcaster.broadcast("message:pin", [`channel:${channelId}`], {
    meta: { eventId: crypto.randomUUID(), timestamp: new Date().toISOString() },
    messageId,
    channelId,
    pinnedBy: unpinnedBy,
    pinnedAt: new Date().toISOString(),
    action: "unpin",
  });
}

// ============================================================================
// Thread Broadcasting
// ============================================================================

/**
 * Broadcast thread stats update
 */
export async function broadcastThreadStatsUpdated(
  threadId: string,
  channelId: string,
  messageCount: number,
  participantCount: number,
  lastMessageAt: Date,
  recentParticipantIds: string[],
): Promise<void> {
  const broadcaster = getAPIEventBroadcaster();

  if (!broadcaster.initialized) {
    broadcaster.initialize();
  }

  await broadcaster.broadcast(
    "thread:stats_update",
    [`channel:${channelId}`, `thread:${threadId}`],
    {
      meta: {
        eventId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      },
      threadId,
      channelId,
      messageCount,
      participantCount,
      lastMessageAt: lastMessageAt.toISOString(),
      recentParticipantIds,
    },
  );
}

// ============================================================================
// Read Receipt Broadcasting
// ============================================================================

/**
 * Broadcast a read receipt update
 */
export async function broadcastReadReceipt(
  channelId: string,
  userId: string,
  lastReadMessageId: string,
  unreadCount: number,
): Promise<void> {
  const broadcaster = getAPIEventBroadcaster();

  if (!broadcaster.initialized) {
    broadcaster.initialize();
  }

  await broadcaster.broadcast("read_receipt:update", [`channel:${channelId}`], {
    channelId,
    userId,
    lastReadMessageId,
    readAt: new Date().toISOString(),
    unreadCount,
  });
}
