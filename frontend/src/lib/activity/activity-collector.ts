/**
 * Activity Collector
 *
 * Utilities for collecting and transforming raw data into activities
 */

import type {
  Activity,
  ActivityType,
  ActivityCategory,
  ActivityPriority,
  ActivityActor,
  ActivityChannel,
  ActivityMessage,
  ActivityThread,
  ActivityFile,
  ActivityCall,
  ActivityTask,
  ActivityIntegration,
  MessageActivity,
  ReactionActivity,
  MentionActivity,
  ReplyActivity,
  ThreadReplyActivity,
  ChannelCreatedActivity,
  ChannelArchivedActivity,
  ChannelUnarchivedActivity,
  MemberJoinedActivity,
  MemberLeftActivity,
  MemberInvitedActivity,
  FileSharedActivity,
  CallStartedActivity,
  CallEndedActivity,
  ReminderDueActivity,
  TaskCompletedActivity,
  TaskAssignedActivity,
  IntegrationEventActivity,
  SystemActivity,
} from "./activity-types";

// =============================================================================
// Types for Raw Data
// =============================================================================

export interface RawUser {
  id: string;
  username?: string;
  display_name?: string;
  displayName?: string;
  avatar_url?: string;
  avatarUrl?: string;
  email?: string;
}

export interface RawChannel {
  id: string;
  name: string;
  slug: string;
  type: string;
  is_archived?: boolean;
  isArchived?: boolean;
}

export interface RawMessage {
  id: string;
  content: string;
  user_id?: string;
  userId?: string;
  channel_id?: string;
  channelId?: string;
  thread_id?: string;
  threadId?: string;
  created_at?: string;
  createdAt?: string;
  user?: RawUser;
}

export interface RawThread {
  id: string;
  channel_id?: string;
  channelId?: string;
  parent_message_id?: string;
  parentMessageId?: string;
  message_count?: number;
  messageCount?: number;
  reply_count?: number;
  replyCount?: number;
  participant_count?: number;
  participantCount?: number;
}

export interface RawFile {
  id: string;
  name?: string;
  file_name?: string;
  fileName?: string;
  type?: string;
  file_type?: string;
  fileType?: string;
  mime_type?: string;
  mimeType?: string;
  size?: number;
  file_size?: number;
  fileSize?: number;
  url?: string;
  file_url?: string;
  fileUrl?: string;
  thumbnail_url?: string;
  thumbnailUrl?: string;
}

export interface RawNotification {
  id: string;
  type: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
  is_read?: boolean;
  isRead?: boolean;
  read_at?: string;
  readAt?: string;
  created_at?: string;
  createdAt?: string;
  actor?: RawUser;
  channel?: RawChannel;
  message?: RawMessage;
  thread?: RawThread;
}

// =============================================================================
// Transformation Functions
// =============================================================================

/**
 * Transform raw user data to ActivityActor
 */
export function transformUser(raw: RawUser): ActivityActor {
  return {
    id: raw.id,
    username: raw.username,
    displayName:
      raw.display_name || raw.displayName || raw.username || "Unknown",
    avatarUrl: raw.avatar_url || raw.avatarUrl,
    email: raw.email,
  };
}

/**
 * Transform raw channel data to ActivityChannel
 */
export function transformChannel(raw: RawChannel): ActivityChannel {
  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    type: raw.type as "public" | "private" | "direct",
    isArchived: raw.is_archived || raw.isArchived,
  };
}

/**
 * Transform raw message data to ActivityMessage
 */
export function transformMessage(raw: RawMessage): ActivityMessage {
  const content = raw.content || "";
  return {
    id: raw.id,
    content,
    contentPreview:
      content.length > 100 ? content.slice(0, 100) + "..." : content,
    userId: raw.user_id || raw.userId || "",
    channelId: raw.channel_id || raw.channelId || "",
    threadId: raw.thread_id || raw.threadId,
    createdAt: raw.created_at || raw.createdAt || new Date().toISOString(),
    user: raw.user ? transformUser(raw.user) : undefined,
  };
}

/**
 * Transform raw thread data to ActivityThread
 */
export function transformThread(raw: RawThread): ActivityThread {
  return {
    id: raw.id,
    channelId: raw.channel_id || raw.channelId || "",
    parentMessageId: raw.parent_message_id || raw.parentMessageId || "",
    replyCount:
      raw.message_count ||
      raw.messageCount ||
      raw.reply_count ||
      raw.replyCount ||
      0,
    participantCount: raw.participant_count || raw.participantCount || 0,
  };
}

/**
 * Transform raw file data to ActivityFile
 */
export function transformFile(raw: RawFile): ActivityFile {
  return {
    id: raw.id,
    name: raw.name || raw.file_name || raw.fileName || "Untitled",
    type: raw.type || raw.file_type || raw.fileType || "unknown",
    mimeType: raw.mime_type || raw.mimeType || "application/octet-stream",
    size: raw.size || raw.file_size || raw.fileSize || 0,
    url: raw.url || raw.file_url || raw.fileUrl || "",
    thumbnailUrl: raw.thumbnail_url || raw.thumbnailUrl,
  };
}

// =============================================================================
// Activity Factory Functions
// =============================================================================

/**
 * Generate a unique activity ID
 */
export function generateActivityId(type: ActivityType, refId: string): string {
  return `${type}-${refId}-${Date.now()}`;
}

/**
 * Determine priority from notification type
 */
export function determinePriority(
  type: ActivityType,
  data?: Record<string, unknown>,
): ActivityPriority {
  // High priority types
  if (type === "mention") {
    const mentionType = data?.mentionType;
    if (mentionType === "everyone" || mentionType === "here") {
      return "high";
    }
    return "normal";
  }

  if (type === "reminder_due" || type === "task_assigned") {
    return "high";
  }

  // Low priority types
  if (
    type === "member_joined" ||
    type === "member_left" ||
    type === "reaction"
  ) {
    return "low";
  }

  return "normal";
}

/**
 * Determine category from activity type
 */
export function determineCategory(type: ActivityType): ActivityCategory {
  const categoryMap: Record<ActivityType, ActivityCategory> = {
    message: "all",
    reaction: "reactions",
    mention: "mentions",
    reply: "threads",
    thread_reply: "threads",
    channel_created: "channels",
    channel_archived: "channels",
    channel_unarchived: "channels",
    member_joined: "members",
    member_left: "members",
    member_invited: "members",
    file_shared: "files",
    call_started: "calls",
    call_ended: "calls",
    reminder_due: "all",
    task_completed: "tasks",
    task_assigned: "tasks",
    integration_event: "integrations",
    system: "all",
  };

  return categoryMap[type] || "all";
}

// =============================================================================
// Activity Builders
// =============================================================================

/**
 * Create a message activity
 */
export function createMessageActivity(
  actor: ActivityActor,
  message: ActivityMessage,
  channel: ActivityChannel,
  options?: { id?: string; createdAt?: string; isRead?: boolean },
): MessageActivity {
  return {
    id: options?.id || generateActivityId("message", message.id),
    type: "message",
    category: "all",
    priority: "normal",
    actor,
    message,
    channel,
    createdAt: options?.createdAt || new Date().toISOString(),
    isRead: options?.isRead ?? false,
  };
}

/**
 * Create a reaction activity
 */
export function createReactionActivity(
  actor: ActivityActor,
  emoji: string,
  message: ActivityMessage,
  channel: ActivityChannel,
  options?: { id?: string; createdAt?: string; isRead?: boolean },
): ReactionActivity {
  return {
    id: options?.id || generateActivityId("reaction", message.id),
    type: "reaction",
    category: "reactions",
    priority: "low",
    actor,
    emoji,
    message,
    channel,
    createdAt: options?.createdAt || new Date().toISOString(),
    isRead: options?.isRead ?? false,
  };
}

/**
 * Create a mention activity
 */
export function createMentionActivity(
  actor: ActivityActor,
  mentionType: "user" | "everyone" | "here" | "channel",
  message: ActivityMessage,
  channel: ActivityChannel,
  thread?: ActivityThread,
  options?: { id?: string; createdAt?: string; isRead?: boolean },
): MentionActivity {
  return {
    id: options?.id || generateActivityId("mention", message.id),
    type: "mention",
    category: "mentions",
    priority:
      mentionType === "everyone" || mentionType === "here" ? "high" : "normal",
    actor,
    mentionType,
    message,
    channel,
    thread,
    createdAt: options?.createdAt || new Date().toISOString(),
    isRead: options?.isRead ?? false,
  };
}

/**
 * Create a reply activity
 */
export function createReplyActivity(
  actor: ActivityActor,
  message: ActivityMessage,
  parentMessage: ActivityMessage,
  channel: ActivityChannel,
  options?: { id?: string; createdAt?: string; isRead?: boolean },
): ReplyActivity {
  return {
    id: options?.id || generateActivityId("reply", message.id),
    type: "reply",
    category: "threads",
    priority: "normal",
    actor,
    message,
    parentMessage,
    channel,
    createdAt: options?.createdAt || new Date().toISOString(),
    isRead: options?.isRead ?? false,
  };
}

/**
 * Create a thread reply activity
 */
export function createThreadReplyActivity(
  actor: ActivityActor,
  message: ActivityMessage,
  thread: ActivityThread,
  channel: ActivityChannel,
  options?: { id?: string; createdAt?: string; isRead?: boolean },
): ThreadReplyActivity {
  return {
    id: options?.id || generateActivityId("thread_reply", message.id),
    type: "thread_reply",
    category: "threads",
    priority: "normal",
    actor,
    message,
    thread,
    channel,
    createdAt: options?.createdAt || new Date().toISOString(),
    isRead: options?.isRead ?? false,
  };
}

/**
 * Create a channel created activity
 */
export function createChannelCreatedActivity(
  actor: ActivityActor,
  channel: ActivityChannel,
  options?: { id?: string; createdAt?: string; isRead?: boolean },
): ChannelCreatedActivity {
  return {
    id: options?.id || generateActivityId("channel_created", channel.id),
    type: "channel_created",
    category: "channels",
    priority: "normal",
    actor,
    channel,
    createdAt: options?.createdAt || new Date().toISOString(),
    isRead: options?.isRead ?? false,
  };
}

/**
 * Create a channel archived activity
 */
export function createChannelArchivedActivity(
  actor: ActivityActor,
  channel: ActivityChannel,
  options?: { id?: string; createdAt?: string; isRead?: boolean },
): ChannelArchivedActivity {
  return {
    id: options?.id || generateActivityId("channel_archived", channel.id),
    type: "channel_archived",
    category: "channels",
    priority: "normal",
    actor,
    channel,
    createdAt: options?.createdAt || new Date().toISOString(),
    isRead: options?.isRead ?? false,
  };
}

/**
 * Create a member joined activity
 */
export function createMemberJoinedActivity(
  actor: ActivityActor,
  channel: ActivityChannel,
  invitedBy?: ActivityActor,
  options?: { id?: string; createdAt?: string; isRead?: boolean },
): MemberJoinedActivity {
  return {
    id:
      options?.id ||
      generateActivityId("member_joined", `${channel.id}-${actor.id}`),
    type: "member_joined",
    category: "members",
    priority: "low",
    actor,
    channel,
    invitedBy,
    createdAt: options?.createdAt || new Date().toISOString(),
    isRead: options?.isRead ?? false,
  };
}

/**
 * Create a member left activity
 */
export function createMemberLeftActivity(
  actor: ActivityActor,
  channel: ActivityChannel,
  reason: "left" | "kicked" | "banned" = "left",
  removedBy?: ActivityActor,
  options?: { id?: string; createdAt?: string; isRead?: boolean },
): MemberLeftActivity {
  return {
    id:
      options?.id ||
      generateActivityId("member_left", `${channel.id}-${actor.id}`),
    type: "member_left",
    category: "members",
    priority: "low",
    actor,
    channel,
    reason,
    removedBy,
    createdAt: options?.createdAt || new Date().toISOString(),
    isRead: options?.isRead ?? false,
  };
}

/**
 * Create a file shared activity
 */
export function createFileSharedActivity(
  actor: ActivityActor,
  file: ActivityFile,
  channel: ActivityChannel,
  message?: ActivityMessage,
  options?: { id?: string; createdAt?: string; isRead?: boolean },
): FileSharedActivity {
  return {
    id: options?.id || generateActivityId("file_shared", file.id),
    type: "file_shared",
    category: "files",
    priority: "normal",
    actor,
    file,
    channel,
    message,
    createdAt: options?.createdAt || new Date().toISOString(),
    isRead: options?.isRead ?? false,
  };
}

/**
 * Create a call started activity
 */
export function createCallStartedActivity(
  actor: ActivityActor,
  call: ActivityCall,
  channel: ActivityChannel,
  options?: { id?: string; createdAt?: string; isRead?: boolean },
): CallStartedActivity {
  return {
    id: options?.id || generateActivityId("call_started", call.id),
    type: "call_started",
    category: "calls",
    priority: "normal",
    actor,
    call,
    channel,
    createdAt: options?.createdAt || new Date().toISOString(),
    isRead: options?.isRead ?? false,
  };
}

/**
 * Create a call ended activity
 */
export function createCallEndedActivity(
  actor: ActivityActor,
  call: ActivityCall,
  channel: ActivityChannel,
  options?: { id?: string; createdAt?: string; isRead?: boolean },
): CallEndedActivity {
  return {
    id: options?.id || generateActivityId("call_ended", call.id),
    type: "call_ended",
    category: "calls",
    priority: "low",
    actor,
    call,
    channel,
    createdAt: options?.createdAt || new Date().toISOString(),
    isRead: options?.isRead ?? false,
  };
}

/**
 * Create a reminder due activity
 */
export function createReminderDueActivity(
  actor: ActivityActor,
  reminderText: string,
  message?: ActivityMessage,
  channel?: ActivityChannel,
  options?: { id?: string; createdAt?: string; isRead?: boolean },
): ReminderDueActivity {
  return {
    id:
      options?.id || generateActivityId("reminder_due", Date.now().toString()),
    type: "reminder_due",
    category: "all",
    priority: "high",
    actor,
    reminderText,
    message,
    channel,
    createdAt: options?.createdAt || new Date().toISOString(),
    isRead: options?.isRead ?? false,
  };
}

/**
 * Create a task completed activity
 */
export function createTaskCompletedActivity(
  actor: ActivityActor,
  task: ActivityTask,
  channel?: ActivityChannel,
  options?: { id?: string; createdAt?: string; isRead?: boolean },
): TaskCompletedActivity {
  return {
    id: options?.id || generateActivityId("task_completed", task.id),
    type: "task_completed",
    category: "tasks",
    priority: "normal",
    actor,
    task,
    channel,
    createdAt: options?.createdAt || new Date().toISOString(),
    isRead: options?.isRead ?? false,
  };
}

/**
 * Create a task assigned activity
 */
export function createTaskAssignedActivity(
  actor: ActivityActor,
  task: ActivityTask,
  assignedBy: ActivityActor,
  channel?: ActivityChannel,
  options?: { id?: string; createdAt?: string; isRead?: boolean },
): TaskAssignedActivity {
  return {
    id: options?.id || generateActivityId("task_assigned", task.id),
    type: "task_assigned",
    category: "tasks",
    priority: "high",
    actor,
    task,
    assignedBy,
    channel,
    createdAt: options?.createdAt || new Date().toISOString(),
    isRead: options?.isRead ?? false,
  };
}

/**
 * Create an integration event activity
 */
export function createIntegrationEventActivity(
  actor: ActivityActor,
  integration: ActivityIntegration,
  channel?: ActivityChannel,
  options?: { id?: string; createdAt?: string; isRead?: boolean },
): IntegrationEventActivity {
  return {
    id: options?.id || generateActivityId("integration_event", integration.id),
    type: "integration_event",
    category: "integrations",
    priority: "normal",
    actor,
    integration,
    channel,
    createdAt: options?.createdAt || new Date().toISOString(),
    isRead: options?.isRead ?? false,
  };
}

/**
 * Create a system activity
 */
export function createSystemActivity(
  title: string,
  body: string,
  actionUrl?: string,
  options?: { id?: string; createdAt?: string; isRead?: boolean },
): SystemActivity {
  return {
    id: options?.id || generateActivityId("system", Date.now().toString()),
    type: "system",
    category: "all",
    priority: "normal",
    actor: {
      id: "system",
      displayName: "System",
    },
    title,
    body,
    actionUrl,
    createdAt: options?.createdAt || new Date().toISOString(),
    isRead: options?.isRead ?? false,
  };
}

// =============================================================================
// Notification to Activity Converter
// =============================================================================

/**
 * Convert a raw notification to an activity
 */
export function notificationToActivity(
  notification: RawNotification,
): Activity | null {
  const type = notification.type as ActivityType;
  const actor = notification.actor
    ? transformUser(notification.actor)
    : { id: "unknown", displayName: "Unknown" };
  const channel = notification.channel
    ? transformChannel(notification.channel)
    : null;
  const message = notification.message
    ? transformMessage(notification.message)
    : null;
  const thread = notification.thread
    ? transformThread(notification.thread)
    : null;

  const baseOptions = {
    id: notification.id,
    createdAt: notification.created_at || notification.createdAt,
    isRead: notification.is_read || notification.isRead || false,
  };

  switch (type) {
    case "message":
      if (!message || !channel) return null;
      return createMessageActivity(actor, message, channel, baseOptions);

    case "reaction":
      if (!message || !channel) return null;
      const emoji = (notification.data?.emoji as string) || "";
      return createReactionActivity(
        actor,
        emoji,
        message,
        channel,
        baseOptions,
      );

    case "mention":
      if (!message || !channel) return null;
      const mentionType =
        (notification.data?.mentionType as
          | "user"
          | "everyone"
          | "here"
          | "channel") || "user";
      return createMentionActivity(
        actor,
        mentionType,
        message,
        channel,
        thread || undefined,
        baseOptions,
      );

    case "reply":
      if (!message || !channel) return null;
      const parentMessage = notification.data?.parentMessage
        ? transformMessage(notification.data.parentMessage as RawMessage)
        : message;
      return createReplyActivity(
        actor,
        message,
        parentMessage,
        channel,
        baseOptions,
      );

    case "thread_reply":
      if (!message || !channel || !thread) return null;
      return createThreadReplyActivity(
        actor,
        message,
        thread,
        channel,
        baseOptions,
      );

    case "channel_created":
      if (!channel) return null;
      return createChannelCreatedActivity(actor, channel, baseOptions);

    case "member_joined":
      if (!channel) return null;
      const invitedBy = notification.data?.invitedBy
        ? transformUser(notification.data.invitedBy as RawUser)
        : undefined;
      return createMemberJoinedActivity(actor, channel, invitedBy, baseOptions);

    case "member_left":
      if (!channel) return null;
      const reason =
        (notification.data?.reason as "left" | "kicked" | "banned") || "left";
      const removedBy = notification.data?.removedBy
        ? transformUser(notification.data.removedBy as RawUser)
        : undefined;
      return createMemberLeftActivity(
        actor,
        channel,
        reason,
        removedBy,
        baseOptions,
      );

    case "file_shared":
      if (!channel) return null;
      const file = notification.data?.file
        ? transformFile(notification.data.file as RawFile)
        : {
            id: "",
            name: "Unknown",
            type: "file",
            mimeType: "",
            size: 0,
            url: "",
          };
      return createFileSharedActivity(
        actor,
        file,
        channel,
        message || undefined,
        baseOptions,
      );

    case "system":
      return createSystemActivity(
        notification.title || "System Notification",
        notification.body || "",
        notification.data?.actionUrl as string | undefined,
        baseOptions,
      );

    default:
      // For unknown types, create a system activity
      return createSystemActivity(
        notification.title || type,
        notification.body || "",
        undefined,
        baseOptions,
      );
  }
}

/**
 * Convert multiple notifications to activities
 */
export function notificationsToActivities(
  notifications: RawNotification[],
): Activity[] {
  return notifications
    .map(notificationToActivity)
    .filter((activity): activity is Activity => activity !== null);
}
