/**
 * Notification Builder - Factory for creating notification payloads
 *
 * Provides builder functions for different notification types:
 * - Message notifications
 * - Mention notifications
 * - Call notifications
 * - System notifications
 * - Channel notifications
 * - Reaction notifications
 */

import type {
  NotificationType,
  NotificationPriority,
} from "./notification-types";

// ============================================================================
// Types
// ============================================================================

export interface NotificationPayload {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  body: string;
  actor?: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  channelId?: string;
  channelName?: string;
  messageId?: string;
  threadId?: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface MessageNotificationData {
  messageId: string;
  content: string;
  senderId: string;
  senderName: string;
  senderAvatarUrl?: string;
  channelId: string;
  channelName: string;
  threadId?: string;
}

export interface MentionNotificationData {
  messageId: string;
  content: string;
  senderId: string;
  senderName: string;
  senderAvatarUrl?: string;
  channelId: string;
  channelName: string;
  threadId?: string;
  mentionType: "user" | "here" | "channel" | "everyone";
}

export interface CallNotificationData {
  callId: string;
  callerId: string;
  callerName: string;
  callerAvatarUrl?: string;
  channelId?: string;
  channelName?: string;
  callType: "voice" | "video";
  isGroupCall: boolean;
}

export interface SystemNotificationData {
  type: "info" | "warning" | "error" | "success";
  title: string;
  message: string;
  actionUrl?: string;
  dismissable?: boolean;
}

export interface ChannelInviteNotificationData {
  channelId: string;
  channelName: string;
  channelType: "public" | "private";
  inviterId: string;
  inviterName: string;
  inviterAvatarUrl?: string;
  message?: string;
}

export interface ReactionNotificationData {
  messageId: string;
  messagePreview: string;
  reactorId: string;
  reactorName: string;
  reactorAvatarUrl?: string;
  emoji: string;
  channelId: string;
  channelName: string;
}

export interface ThreadReplyNotificationData {
  threadId: string;
  messageId: string;
  content: string;
  senderId: string;
  senderName: string;
  senderAvatarUrl?: string;
  channelId: string;
  channelName: string;
  threadTitle?: string;
}

export interface AnnouncementNotificationData {
  announcementId: string;
  title: string;
  content: string;
  authorId?: string;
  authorName?: string;
  authorAvatarUrl?: string;
  priority: NotificationPriority;
  actionUrl?: string;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a unique notification ID
 */
export function generateNotificationId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `notif-${timestamp}-${random}`;
}

/**
 * Truncate text to a maximum length
 */
export function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}

/**
 * Strip HTML tags from text
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

/**
 * Extract plain text from message content
 */
export function extractPlainText(content: string): string {
  return stripHtml(content).trim();
}

/**
 * Format relative time
 */
export function formatTimeAgo(date: Date | string): string {
  const now = new Date();
  const then = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return then.toLocaleDateString();
}

// ============================================================================
// Builder Functions
// ============================================================================

/**
 * Build a message notification
 */
export function buildMessageNotification(
  data: MessageNotificationData,
): NotificationPayload {
  const plainContent = extractPlainText(data.content);
  const truncatedContent = truncateText(plainContent, 100);

  return {
    id: generateNotificationId(),
    type: "direct_message",
    priority: "normal",
    title: data.senderName,
    body: truncatedContent,
    actor: {
      id: data.senderId,
      name: data.senderName,
      avatarUrl: data.senderAvatarUrl,
    },
    channelId: data.channelId,
    channelName: data.channelName,
    messageId: data.messageId,
    threadId: data.threadId,
    actionUrl: `/chat/${data.channelId}${data.threadId ? `?thread=${data.threadId}` : ""}#${data.messageId}`,
    metadata: {
      contentLength: plainContent.length,
    },
  };
}

/**
 * Build a mention notification
 */
export function buildMentionNotification(
  data: MentionNotificationData,
): NotificationPayload {
  const plainContent = extractPlainText(data.content);
  const truncatedContent = truncateText(plainContent, 100);

  let title: string;
  switch (data.mentionType) {
    case "user":
      title = `${data.senderName} mentioned you`;
      break;
    case "here":
      title = `${data.senderName} mentioned @here`;
      break;
    case "channel":
      title = `${data.senderName} mentioned @channel`;
      break;
    case "everyone":
      title = `${data.senderName} mentioned @everyone`;
      break;
    default:
      title = `${data.senderName} mentioned you`;
  }

  return {
    id: generateNotificationId(),
    type: "mention",
    priority: data.mentionType === "user" ? "high" : "normal",
    title,
    body: truncatedContent,
    actor: {
      id: data.senderId,
      name: data.senderName,
      avatarUrl: data.senderAvatarUrl,
    },
    channelId: data.channelId,
    channelName: data.channelName,
    messageId: data.messageId,
    threadId: data.threadId,
    actionUrl: `/chat/${data.channelId}${data.threadId ? `?thread=${data.threadId}` : ""}#${data.messageId}`,
    metadata: {
      mentionType: data.mentionType,
    },
  };
}

/**
 * Build a call notification
 */
export function buildCallNotification(
  data: CallNotificationData,
): NotificationPayload {
  const callTypeLabel = data.callType === "video" ? "Video call" : "Voice call";
  const title = data.isGroupCall
    ? `${callTypeLabel} in ${data.channelName || "a channel"}`
    : `${data.callerName} is calling`;

  const body = data.isGroupCall
    ? `${data.callerName} started a ${data.callType} call`
    : `Incoming ${data.callType} call`;

  return {
    id: generateNotificationId(),
    type: "system",
    priority: "urgent",
    title,
    body,
    actor: {
      id: data.callerId,
      name: data.callerName,
      avatarUrl: data.callerAvatarUrl,
    },
    channelId: data.channelId,
    channelName: data.channelName,
    actionUrl: data.channelId
      ? `/chat/${data.channelId}/call/${data.callId}`
      : `/call/${data.callId}`,
    metadata: {
      callId: data.callId,
      callType: data.callType,
      isGroupCall: data.isGroupCall,
    },
  };
}

/**
 * Build a system notification
 */
export function buildSystemNotification(
  data: SystemNotificationData,
): NotificationPayload {
  const priorityMap: Record<
    SystemNotificationData["type"],
    NotificationPriority
  > = {
    info: "low",
    success: "normal",
    warning: "high",
    error: "urgent",
  };

  return {
    id: generateNotificationId(),
    type: "system",
    priority: priorityMap[data.type],
    title: data.title,
    body: data.message,
    actionUrl: data.actionUrl,
    metadata: {
      systemType: data.type,
      dismissable: data.dismissable ?? true,
    },
  };
}

/**
 * Build a channel invite notification
 */
export function buildChannelInviteNotification(
  data: ChannelInviteNotificationData,
): NotificationPayload {
  const channelTypeLabel =
    data.channelType === "private" ? "private channel" : "channel";

  return {
    id: generateNotificationId(),
    type: "channel_invite",
    priority: "normal",
    title: `Invited to #${data.channelName}`,
    body: `${data.inviterName} invited you to join a ${channelTypeLabel}${data.message ? `: "${truncateText(data.message, 50)}"` : ""}`,
    actor: {
      id: data.inviterId,
      name: data.inviterName,
      avatarUrl: data.inviterAvatarUrl,
    },
    channelId: data.channelId,
    channelName: data.channelName,
    actionUrl: `/chat/${data.channelId}`,
    metadata: {
      channelType: data.channelType,
      inviteMessage: data.message,
    },
  };
}

/**
 * Build a reaction notification
 */
export function buildReactionNotification(
  data: ReactionNotificationData,
): NotificationPayload {
  const messagePreview = truncateText(
    extractPlainText(data.messagePreview),
    50,
  );

  return {
    id: generateNotificationId(),
    type: "reaction",
    priority: "low",
    title: `${data.reactorName} reacted ${data.emoji}`,
    body: `to: "${messagePreview}"`,
    actor: {
      id: data.reactorId,
      name: data.reactorName,
      avatarUrl: data.reactorAvatarUrl,
    },
    channelId: data.channelId,
    channelName: data.channelName,
    messageId: data.messageId,
    actionUrl: `/chat/${data.channelId}#${data.messageId}`,
    metadata: {
      emoji: data.emoji,
    },
  };
}

/**
 * Build a thread reply notification
 */
export function buildThreadReplyNotification(
  data: ThreadReplyNotificationData,
): NotificationPayload {
  const plainContent = extractPlainText(data.content);
  const truncatedContent = truncateText(plainContent, 100);

  const title = data.threadTitle
    ? `Reply in "${truncateText(data.threadTitle, 30)}"`
    : `${data.senderName} replied in thread`;

  return {
    id: generateNotificationId(),
    type: "thread_reply",
    priority: "normal",
    title,
    body: truncatedContent,
    actor: {
      id: data.senderId,
      name: data.senderName,
      avatarUrl: data.senderAvatarUrl,
    },
    channelId: data.channelId,
    channelName: data.channelName,
    messageId: data.messageId,
    threadId: data.threadId,
    actionUrl: `/chat/${data.channelId}?thread=${data.threadId}#${data.messageId}`,
    metadata: {
      threadTitle: data.threadTitle,
    },
  };
}

/**
 * Build an announcement notification
 */
export function buildAnnouncementNotification(
  data: AnnouncementNotificationData,
): NotificationPayload {
  const truncatedContent = truncateText(extractPlainText(data.content), 150);

  return {
    id: generateNotificationId(),
    type: "announcement",
    priority: data.priority,
    title: data.title,
    body: truncatedContent,
    actor: data.authorId
      ? {
          id: data.authorId,
          name: data.authorName || "Unknown",
          avatarUrl: data.authorAvatarUrl,
        }
      : undefined,
    actionUrl: data.actionUrl || `/announcements/${data.announcementId}`,
    metadata: {
      announcementId: data.announcementId,
      fullContent: data.content,
    },
  };
}

// ============================================================================
// Notification Builder Class
// ============================================================================

/**
 * NotificationBuilder - Fluent builder for creating notification payloads
 */
export class NotificationBuilder {
  private payload: Partial<NotificationPayload>;

  constructor() {
    this.payload = {
      id: generateNotificationId(),
      priority: "normal",
    };
  }

  /**
   * Set the notification type
   */
  type(type: NotificationType): this {
    this.payload.type = type;
    return this;
  }

  /**
   * Set the priority
   */
  priority(priority: NotificationPriority): this {
    this.payload.priority = priority;
    return this;
  }

  /**
   * Set the title
   */
  title(title: string): this {
    this.payload.title = title;
    return this;
  }

  /**
   * Set the body
   */
  body(body: string): this {
    this.payload.body = extractPlainText(body);
    return this;
  }

  /**
   * Set the actor (sender/initiator)
   */
  actor(id: string, name: string, avatarUrl?: string): this {
    this.payload.actor = { id, name, avatarUrl };
    return this;
  }

  /**
   * Set the channel context
   */
  channel(channelId: string, channelName?: string): this {
    this.payload.channelId = channelId;
    this.payload.channelName = channelName;
    return this;
  }

  /**
   * Set the message reference
   */
  message(messageId: string): this {
    this.payload.messageId = messageId;
    return this;
  }

  /**
   * Set the thread reference
   */
  thread(threadId: string): this {
    this.payload.threadId = threadId;
    return this;
  }

  /**
   * Set the action URL
   */
  actionUrl(url: string): this {
    this.payload.actionUrl = url;
    return this;
  }

  /**
   * Add metadata
   */
  metadata(data: Record<string, unknown>): this {
    this.payload.metadata = { ...this.payload.metadata, ...data };
    return this;
  }

  /**
   * Set a custom ID
   */
  id(id: string): this {
    this.payload.id = id;
    return this;
  }

  /**
   * Build the notification payload
   */
  build(): NotificationPayload {
    if (!this.payload.type) {
      throw new Error("Notification type is required");
    }
    if (!this.payload.title) {
      throw new Error("Notification title is required");
    }
    if (!this.payload.body) {
      throw new Error("Notification body is required");
    }

    return this.payload as NotificationPayload;
  }

  /**
   * Create a new builder instance
   */
  static create(): NotificationBuilder {
    return new NotificationBuilder();
  }
}
