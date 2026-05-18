/**
 * Realtime Event Types
 *
 * Comprehensive TypeScript interfaces for all realtime event payloads.
 * These types are used for type-safe event handling between the server
 * and Socket.io clients.
 *
 * @module services/realtime/events.types
 * @version 1.0.0
 */

// ============================================================================
// Base Types
// ============================================================================

/**
 * Base metadata included with all events
 */
export interface EventMetadata {
  /** Unique event ID for deduplication */
  eventId: string;
  /** Timestamp when event was generated */
  timestamp: string;
  /** Server version that generated the event */
  serverVersion?: string;
}

/**
 * User reference in events
 */
export interface EventUser {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
}

/**
 * Channel reference in events
 */
export interface EventChannel {
  id: string;
  name: string;
  type: "public" | "private" | "direct" | "group-dm";
}

// ============================================================================
// Message Events
// ============================================================================

/**
 * Attachment in a message event
 */
export interface MessageEventAttachment {
  id: string;
  type: "image" | "video" | "audio" | "file" | "code";
  url: string;
  filename: string;
  size?: number;
  mimeType?: string;
  width?: number;
  height?: number;
  duration?: number;
  thumbnailUrl?: string;
}

/**
 * Reaction summary in a message event
 */
export interface MessageEventReaction {
  emoji: string;
  count: number;
  userIds: string[];
}

/**
 * Thread info in a message event
 */
export interface MessageEventThread {
  threadId: string;
  replyCount: number;
  lastReplyAt: string;
  participantIds: string[];
}

/**
 * New message event payload
 */
export interface MessageNewEvent {
  /** Event metadata */
  meta: EventMetadata;
  /** Message ID */
  id: string;
  /** Channel where message was sent */
  channelId: string;
  /** Author of the message */
  user: EventUser;
  /** Message content (plain text) */
  content: string;
  /** Message content (HTML rendered) */
  contentHtml?: string;
  /** Message type */
  type: "text" | "system" | "image" | "file" | "code" | "embed";
  /** Thread ID if this is a thread reply */
  threadId?: string;
  /** Parent message ID if this is a reply */
  parentMessageId?: string;
  /** User IDs mentioned in the message */
  mentionedUserIds?: string[];
  /** Role names mentioned in the message */
  mentionedRoles?: string[];
  /** Channel IDs mentioned in the message */
  mentionedChannelIds?: string[];
  /** Message attachments */
  attachments?: MessageEventAttachment[];
  /** Message metadata */
  metadata?: Record<string, unknown>;
  /** When the message was created */
  createdAt: string;
  /** Time-to-live in seconds (for ephemeral messages) */
  ttlSeconds?: number;
  /** When the message expires */
  expiresAt?: string;
}

/**
 * Message update (edit) event payload
 */
export interface MessageUpdateEvent {
  /** Event metadata */
  meta: EventMetadata;
  /** Message ID */
  id: string;
  /** Channel where message exists */
  channelId: string;
  /** Updated content */
  content: string;
  /** Updated HTML content */
  contentHtml?: string;
  /** Who edited the message */
  editedBy: EventUser;
  /** When it was edited */
  editedAt: string;
  /** Edit version number */
  editVersion?: number;
  /** Updated mentions */
  mentionedUserIds?: string[];
  /** Updated metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Message delete event payload
 */
export interface MessageDeleteEvent {
  /** Event metadata */
  meta: EventMetadata;
  /** Message ID */
  id: string;
  /** Channel where message was */
  channelId: string;
  /** Thread ID if message was in a thread */
  threadId?: string;
  /** Who deleted the message */
  deletedBy?: EventUser;
  /** When it was deleted */
  deletedAt: string;
  /** Whether this was a hard delete (permanent) */
  hardDelete: boolean;
}

/**
 * Message pin event payload
 */
export interface MessagePinEvent {
  /** Event metadata */
  meta: EventMetadata;
  /** Message ID */
  messageId: string;
  /** Channel where message is pinned */
  channelId: string;
  /** Who pinned it */
  pinnedBy: EventUser;
  /** When it was pinned */
  pinnedAt: string;
  /** Whether the message was pinned or unpinned */
  action: "pin" | "unpin";
}

// ============================================================================
// Reaction Events
// ============================================================================

/**
 * Reaction add event payload
 */
export interface ReactionAddEvent {
  /** Event metadata */
  meta: EventMetadata;
  /** Message ID */
  messageId: string;
  /** Channel ID */
  channelId: string;
  /** The emoji used */
  emoji: string;
  /** User who added the reaction */
  user: EventUser;
  /** Total count for this emoji on this message */
  totalCount: number;
  /** When the reaction was added */
  createdAt: string;
}

/**
 * Reaction remove event payload
 */
export interface ReactionRemoveEvent {
  /** Event metadata */
  meta: EventMetadata;
  /** Message ID */
  messageId: string;
  /** Channel ID */
  channelId: string;
  /** The emoji removed */
  emoji: string;
  /** User who removed the reaction */
  userId: string;
  /** Remaining count for this emoji on this message */
  remainingCount: number;
}

/**
 * Reaction update event (for bulk changes)
 */
export interface ReactionUpdateEvent {
  /** Event metadata */
  meta: EventMetadata;
  /** Message ID */
  messageId: string;
  /** Channel ID */
  channelId: string;
  /** All current reactions on the message */
  reactions: MessageEventReaction[];
}

// ============================================================================
// Channel Events
// ============================================================================

/**
 * Channel update event payload
 */
export interface ChannelUpdateEvent {
  /** Event metadata */
  meta: EventMetadata;
  /** Channel ID */
  channelId: string;
  /** Updated channel data */
  updates: {
    name?: string;
    description?: string;
    topic?: string;
    icon?: string;
    color?: string;
    isReadonly?: boolean;
    isArchived?: boolean;
    slowmodeSeconds?: number;
    metadata?: Record<string, unknown>;
  };
  /** Who made the update */
  updatedBy: EventUser;
  /** When the update was made */
  updatedAt: string;
}

/**
 * Channel member join event payload
 */
export interface ChannelMemberJoinEvent {
  /** Event metadata */
  meta: EventMetadata;
  /** Channel ID */
  channelId: string;
  /** Channel name */
  channelName: string;
  /** User who joined */
  user: EventUser;
  /** Their role in the channel */
  role: "owner" | "admin" | "moderator" | "member" | "guest";
  /** Who added them (if invited) */
  addedBy?: EventUser;
  /** When they joined */
  joinedAt: string;
  /** Updated member count */
  memberCount: number;
}

/**
 * Channel member leave event payload
 */
export interface ChannelMemberLeaveEvent {
  /** Event metadata */
  meta: EventMetadata;
  /** Channel ID */
  channelId: string;
  /** Channel name */
  channelName: string;
  /** User who left */
  userId: string;
  /** Username for display */
  username?: string;
  /** Whether they were removed by someone else */
  removedBy?: EventUser;
  /** Reason for leaving/removal */
  reason?: "left" | "kicked" | "banned";
  /** When they left */
  leftAt: string;
  /** Updated member count */
  memberCount: number;
}

/**
 * Channel member role update event
 */
export interface ChannelMemberRoleUpdateEvent {
  /** Event metadata */
  meta: EventMetadata;
  /** Channel ID */
  channelId: string;
  /** User whose role changed */
  userId: string;
  /** Username for display */
  username?: string;
  /** Previous role */
  previousRole: "owner" | "admin" | "moderator" | "member" | "guest";
  /** New role */
  newRole: "owner" | "admin" | "moderator" | "member" | "guest";
  /** Who changed the role */
  changedBy: EventUser;
  /** When the role was changed */
  changedAt: string;
}

/**
 * Channel archive/unarchive event
 */
export interface ChannelArchiveEvent {
  /** Event metadata */
  meta: EventMetadata;
  /** Channel ID */
  channelId: string;
  /** Channel name */
  channelName: string;
  /** Whether archived or unarchived */
  action: "archive" | "unarchive";
  /** Who performed the action */
  actionBy: EventUser;
  /** When the action was performed */
  actionAt: string;
}

/**
 * Channel delete event
 */
export interface ChannelDeleteEvent {
  /** Event metadata */
  meta: EventMetadata;
  /** Channel ID */
  channelId: string;
  /** Channel name */
  channelName: string;
  /** Who deleted it */
  deletedBy: EventUser;
  /** When it was deleted */
  deletedAt: string;
}

// ============================================================================
// Thread Events
// ============================================================================

/**
 * Thread created event
 */
export interface ThreadCreatedEvent {
  /** Event metadata */
  meta: EventMetadata;
  /** Thread ID */
  threadId: string;
  /** Parent channel ID */
  channelId: string;
  /** Parent message ID */
  parentMessageId: string;
  /** Who started the thread */
  startedBy: EventUser;
  /** Thread title (if any) */
  title?: string;
  /** When the thread was created */
  createdAt: string;
}

/**
 * Thread update event
 */
export interface ThreadUpdateEvent {
  /** Event metadata */
  meta: EventMetadata;
  /** Thread ID */
  threadId: string;
  /** Parent channel ID */
  channelId: string;
  /** Updates to the thread */
  updates: {
    isLocked?: boolean;
    isArchived?: boolean;
    title?: string;
  };
  /** Who made the update */
  updatedBy: EventUser;
  /** When updated */
  updatedAt: string;
}

/**
 * Thread stats update (message count, participants)
 */
export interface ThreadStatsUpdateEvent {
  /** Event metadata */
  meta: EventMetadata;
  /** Thread ID */
  threadId: string;
  /** Parent channel ID */
  channelId: string;
  /** Current message count */
  messageCount: number;
  /** Current participant count */
  participantCount: number;
  /** Last message timestamp */
  lastMessageAt: string;
  /** Participant user IDs (limited to recent) */
  recentParticipantIds: string[];
}

// ============================================================================
// Typing Events
// ============================================================================

/**
 * Typing indicator event
 */
export interface TypingEvent {
  /** Channel or thread room name */
  roomName: string;
  /** Thread ID if typing in a thread */
  threadId?: string;
  /** Users currently typing */
  typingUsers: Array<{
    userId: string;
    userName?: string;
    startedAt: string;
  }>;
}

// ============================================================================
// Presence Events
// ============================================================================

/**
 * User presence update event
 */
export interface PresenceUpdateEvent {
  /** User ID */
  userId: string;
  /** Current status */
  status: "online" | "away" | "busy" | "offline";
  /** Custom status */
  customStatus?: {
    text?: string;
    emoji?: string;
    expiresAt?: string;
  };
  /** Last seen timestamp */
  lastSeenAt?: string;
  /** Device type */
  device?: "web" | "ios" | "android" | "desktop";
}

/**
 * Bulk presence update event
 */
export interface BulkPresenceUpdateEvent {
  /** Array of presence updates */
  presences: PresenceUpdateEvent[];
}

// ============================================================================
// Read Receipt Events
// ============================================================================

/**
 * Read receipt event
 */
export interface ReadReceiptEvent {
  /** Channel ID */
  channelId: string;
  /** User who read */
  userId: string;
  /** Last message ID they've read up to */
  lastReadMessageId: string;
  /** When they read it */
  readAt: string;
  /** Updated unread count for this user in this channel */
  unreadCount: number;
}

// ============================================================================
// Delivery Status Events
// ============================================================================

/**
 * Message sent acknowledgement
 */
export interface MessageSentAckEvent {
  /** Client-side temporary message ID */
  clientMessageId: string;
  /** Server-assigned message ID */
  serverMessageId: string;
  /** When the server received it */
  sentAt: string;
}

/**
 * Message delivered event
 */
export interface MessageDeliveredEvent {
  /** Message ID */
  messageId: string;
  /** Number of recipients who received it */
  deliveredCount: number;
  /** Total recipients */
  totalRecipients: number;
  /** When it was delivered */
  deliveredAt: string;
}

/**
 * Message read by recipient event
 */
export interface MessageReadByEvent {
  /** Message ID */
  messageId: string;
  /** User who read it */
  userId: string;
  /** Total read count */
  readCount: number;
  /** Total recipients */
  totalRecipients: number;
  /** When they read it */
  readAt: string;
}

/**
 * Message send failed event
 */
export interface MessageFailedEvent {
  /** Client message ID */
  clientMessageId: string;
  /** Error code */
  errorCode: string;
  /** Error message */
  errorMessage: string;
  /** Whether retry is possible */
  retryable: boolean;
}

// ============================================================================
// Notification Events
// ============================================================================

/**
 * Notification event
 */
export interface NotificationEvent {
  /** Notification ID */
  id: string;
  /** Notification type */
  type: "mention" | "reply" | "reaction" | "channel_invite" | "dm" | "system";
  /** Title */
  title: string;
  /** Body */
  body: string;
  /** Action URL */
  actionUrl?: string;
  /** Related data */
  data?: {
    channelId?: string;
    messageId?: string;
    threadId?: string;
    userId?: string;
  };
  /** When created */
  createdAt: string;
}

// ============================================================================
// Event Union Types
// ============================================================================

/**
 * All server-to-client event types
 */
export type ServerToClientEvent =
  | { type: "message:new"; payload: MessageNewEvent }
  | { type: "message:update"; payload: MessageUpdateEvent }
  | { type: "message:delete"; payload: MessageDeleteEvent }
  | { type: "message:pin"; payload: MessagePinEvent }
  | { type: "reaction:add"; payload: ReactionAddEvent }
  | { type: "reaction:remove"; payload: ReactionRemoveEvent }
  | { type: "reaction:update"; payload: ReactionUpdateEvent }
  | { type: "channel:update"; payload: ChannelUpdateEvent }
  | { type: "channel:member_join"; payload: ChannelMemberJoinEvent }
  | { type: "channel:member_leave"; payload: ChannelMemberLeaveEvent }
  | {
      type: "channel:member_role_update";
      payload: ChannelMemberRoleUpdateEvent;
    }
  | { type: "channel:archive"; payload: ChannelArchiveEvent }
  | { type: "channel:delete"; payload: ChannelDeleteEvent }
  | { type: "thread:created"; payload: ThreadCreatedEvent }
  | { type: "thread:update"; payload: ThreadUpdateEvent }
  | { type: "thread:stats_update"; payload: ThreadStatsUpdateEvent }
  | { type: "typing:update"; payload: TypingEvent }
  | { type: "presence:update"; payload: PresenceUpdateEvent }
  | { type: "presence:bulk_update"; payload: BulkPresenceUpdateEvent }
  | { type: "read_receipt:update"; payload: ReadReceiptEvent }
  | { type: "message:sent_ack"; payload: MessageSentAckEvent }
  | { type: "message:delivered"; payload: MessageDeliveredEvent }
  | { type: "message:read_by"; payload: MessageReadByEvent }
  | { type: "message:failed"; payload: MessageFailedEvent }
  | { type: "notification"; payload: NotificationEvent };

/**
 * Event type names
 */
export type EventTypeName = ServerToClientEvent["type"];

/**
 * Get payload type for a specific event
 */
export type EventPayload<T extends EventTypeName> = Extract<
  ServerToClientEvent,
  { type: T }
>["payload"];

// ============================================================================
// Socket Event Names
// ============================================================================

/**
 * Socket.io event name constants
 */
export const REALTIME_EVENTS = {
  // Messages
  MESSAGE_NEW: "message:new",
  MESSAGE_UPDATE: "message:update",
  MESSAGE_DELETE: "message:delete",
  MESSAGE_PIN: "message:pin",
  MESSAGE_SENT_ACK: "message:sent_ack",
  MESSAGE_DELIVERED: "message:delivered",
  MESSAGE_READ_BY: "message:read_by",
  MESSAGE_FAILED: "message:failed",

  // Reactions
  REACTION_ADD: "reaction:add",
  REACTION_REMOVE: "reaction:remove",
  REACTION_UPDATE: "reaction:update",

  // Channels
  CHANNEL_UPDATE: "channel:update",
  CHANNEL_MEMBER_JOIN: "channel:member_join",
  CHANNEL_MEMBER_LEAVE: "channel:member_leave",
  CHANNEL_MEMBER_ROLE_UPDATE: "channel:member_role_update",
  CHANNEL_ARCHIVE: "channel:archive",
  CHANNEL_DELETE: "channel:delete",

  // Threads
  THREAD_CREATED: "thread:created",
  THREAD_UPDATE: "thread:update",
  THREAD_STATS_UPDATE: "thread:stats_update",

  // Typing
  TYPING_UPDATE: "typing:update",

  // Presence
  PRESENCE_UPDATE: "presence:update",
  PRESENCE_BULK_UPDATE: "presence:bulk_update",

  // Read Receipts
  READ_RECEIPT_UPDATE: "read_receipt:update",

  // Notifications
  NOTIFICATION: "notification",

  // Room Management
  ROOM_JOIN: "room:join",
  ROOM_LEAVE: "room:leave",
  ROOM_JOINED: "room:joined",

  // Connection
  CONNECT: "connect",
  DISCONNECT: "disconnect",
  RECONNECT: "reconnect",
  ERROR: "error",
  AUTH: "auth",
  AUTH_SUCCESS: "auth:success",
  AUTH_ERROR: "auth:error",
} as const;

export type RealtimeEventName =
  (typeof REALTIME_EVENTS)[keyof typeof REALTIME_EVENTS];

// ============================================================================
// Room Types
// ============================================================================

/**
 * Room name formats:
 * - channel:{channelId} - Channel room
 * - thread:{threadId} - Thread room
 * - user:{userId} - User's personal room (for notifications)
 * - dm:{dmId} - Direct message room
 */
export type RealtimeRoomType = "channel" | "thread" | "user" | "dm";

/**
 * Get room name for a channel
 */
export function getChannelRoom(channelId: string): string {
  return `channel:${channelId}`;
}

/**
 * Get room name for a thread
 */
export function getThreadRoom(threadId: string): string {
  return `thread:${threadId}`;
}

/**
 * Get room name for a user's personal room
 */
export function getUserRoom(userId: string): string {
  return `user:${userId}`;
}

/**
 * Get room name for a DM
 */
export function getDMRoom(dmId: string): string {
  return `dm:${dmId}`;
}

/**
 * Parse a room name to get its type and ID
 */
export function parseRoomName(
  roomName: string,
): { type: RealtimeRoomType; id: string } | null {
  const parts = roomName.split(":");
  if (parts.length !== 2) return null;

  const [type, id] = parts;
  if (!["channel", "thread", "user", "dm"].includes(type)) return null;

  return { type: type as RealtimeRoomType, id };
}
