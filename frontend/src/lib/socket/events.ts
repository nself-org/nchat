/**
 * Socket.io Event Definitions
 *
 * Defines all event names as constants and TypeScript interfaces
 * for all event payloads used in the real-time system.
 */

// =============================================================================
// Event Name Constants
// =============================================================================

export const SocketEvents = {
  // Presence events
  PRESENCE_UPDATE: "presence:update",
  PRESENCE_SUBSCRIBE: "presence:subscribe",
  PRESENCE_UNSUBSCRIBE: "presence:unsubscribe",
  PRESENCE_BULK: "presence:bulk",
  PRESENCE_SYNC: "presence:sync",

  // Typing events
  TYPING_START: "typing:start",
  TYPING_STOP: "typing:stop",
  TYPING_CHANNEL: "typing:channel",

  // Message events
  MESSAGE_NEW: "message:new",
  MESSAGE_UPDATE: "message:update",
  MESSAGE_DELETE: "message:delete",
  MESSAGE_SEND: "message:send",

  // Reaction events
  REACTION_ADD: "reaction:add",
  REACTION_REMOVE: "reaction:remove",

  // Channel events
  CHANNEL_JOIN: "channel:join",
  CHANNEL_LEAVE: "channel:leave",
  CHANNEL_UPDATE: "channel:update",
  CHANNEL_MEMBER_JOIN: "channel:member:join",
  CHANNEL_MEMBER_LEAVE: "channel:member:leave",
  CHANNEL_CREATED: "channel:created",
  CHANNEL_DELETED: "channel:deleted",

  // Notification events
  NOTIFICATION_NEW: "notification:new",
  NOTIFICATION_READ: "notification:read",
  NOTIFICATION_READ_ALL: "notification:read:all",

  // Read receipt events
  READ_UPDATE: "read:update",
  READ_CHANNEL: "read:channel",
  READ_MESSAGE: "read:message",

  // User status events
  USER_STATUS: "user:status",
  USER_PROFILE_UPDATE: "user:profile:update",

  // Thread events
  THREAD_NEW: "thread:new",
  THREAD_UPDATE: "thread:update",
  THREAD_REPLY: "thread:reply",

  // Disappearing message events
  DISAPPEARING_TIMER_STARTED: "disappearing:timer:started",
  DISAPPEARING_MESSAGE_EXPIRED: "disappearing:message:expired",
  DISAPPEARING_MESSAGE_VIEWED: "disappearing:message:viewed",
  DISAPPEARING_BURN_STARTED: "disappearing:burn:started",
  DISAPPEARING_SETTINGS_CHANGED: "disappearing:settings:changed",
  DISAPPEARING_SCREENSHOT_DETECTED: "disappearing:screenshot:detected",

  // Location events
  LOCATION_UPDATE: "location:update",
  LOCATION_STARTED: "location:started",
  LOCATION_STOPPED: "location:stopped",

  // Connection events
  CONNECT: "connect",
  DISCONNECT: "disconnect",
  ERROR: "error",
} as const;

// Type for event names
export type SocketEventName = (typeof SocketEvents)[keyof typeof SocketEvents];

// =============================================================================
// Common Types
// =============================================================================

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
}

export interface Channel {
  id: string;
  name: string;
  type: "public" | "private" | "direct";
  description?: string;
}

// =============================================================================
// Presence Types
// =============================================================================

export type PresenceStatus = "online" | "away" | "dnd" | "offline";

export interface PresenceEvent {
  userId: string;
  status: PresenceStatus;
  lastSeen?: string; // ISO date string
  customStatus?: string;
  customEmoji?: string;
}

export interface PresenceSubscribeEvent {
  userIds: string[];
}

export interface PresenceBulkEvent {
  presences: PresenceEvent[];
}

export interface PresenceSyncEvent {
  userId: string;
  status: PresenceStatus;
  timestamp: string;
}

// =============================================================================
// Typing Types
// =============================================================================

export interface TypingEvent {
  userId: string;
  channelId: string;
  threadId?: string;
  user?: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
}

export interface TypingStartEvent extends TypingEvent {
  startedAt: string;
}

export interface TypingStopEvent extends TypingEvent {
  stoppedAt: string;
}

export interface TypingChannelEvent {
  channelId: string;
  threadId?: string;
  users: Array<{
    userId: string;
    displayName: string;
    avatarUrl?: string;
    startedAt: string;
  }>;
}

// =============================================================================
// Message Types
// =============================================================================

export interface MessageAttachment {
  id: string;
  type: "image" | "video" | "audio" | "file";
  url: string;
  name: string;
  size: number;
  mimeType: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  duration?: number;
}

export interface MessageMention {
  type: "user" | "channel" | "everyone" | "here";
  id?: string;
  display: string;
  startIndex: number;
  endIndex: number;
}

export interface MessageReaction {
  emoji: string;
  count: number;
  users: string[];
  hasReacted: boolean;
}

export interface MessageEvent {
  id: string;
  channelId: string;
  threadId?: string;
  parentMessageId?: string;
  userId: string;
  content: string;
  contentHtml?: string;
  attachments?: MessageAttachment[];
  mentions?: MessageMention[];
  reactions?: MessageReaction[];
  replyCount?: number;
  isEdited?: boolean;
  isPinned?: boolean;
  isDeleted?: boolean;
  createdAt: string;
  updatedAt?: string;
  user?: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
}

export interface MessageNewEvent extends MessageEvent {
  tempId?: string; // For optimistic updates
}

export interface MessageUpdateEvent {
  id: string;
  channelId: string;
  threadId?: string;
  content?: string;
  contentHtml?: string;
  attachments?: MessageAttachment[];
  mentions?: MessageMention[];
  isEdited: boolean;
  updatedAt: string;
}

export interface MessageDeleteEvent {
  id: string;
  channelId: string;
  threadId?: string;
  deletedAt: string;
  deletedBy: string;
}

export interface MessageSendEvent {
  tempId: string;
  channelId: string;
  threadId?: string;
  parentMessageId?: string;
  content: string;
  attachments?: Array<{
    id: string;
    type: string;
    url: string;
    name: string;
    size: number;
    mimeType: string;
  }>;
  mentions?: Array<{
    type: "user" | "channel" | "everyone" | "here";
    id?: string;
  }>;
}

// =============================================================================
// Reaction Types
// =============================================================================

export interface ReactionEvent {
  messageId: string;
  channelId: string;
  threadId?: string;
  userId: string;
  emoji: string;
  user?: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
}

export interface ReactionAddEvent extends ReactionEvent {
  addedAt: string;
}

export interface ReactionRemoveEvent extends ReactionEvent {
  removedAt: string;
}

// =============================================================================
// Channel Types
// =============================================================================

export interface ChannelEvent {
  id: string;
  name: string;
  type: "public" | "private" | "direct";
  description?: string;
  topic?: string;
  iconUrl?: string;
  memberCount?: number;
  isArchived?: boolean;
  isMuted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

export interface ChannelJoinEvent {
  channelId: string;
}

export interface ChannelLeaveEvent {
  channelId: string;
}

export interface ChannelUpdateEvent extends Partial<ChannelEvent> {
  id: string;
  updatedAt: string;
  updatedBy: string;
}

export interface ChannelMemberEvent {
  channelId: string;
  userId: string;
  user?: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
  joinedAt?: string;
  leftAt?: string;
  role?: "owner" | "admin" | "member";
}

export interface ChannelCreatedEvent extends ChannelEvent {
  createdBy: string;
  members?: string[];
}

export interface ChannelDeletedEvent {
  id: string;
  deletedAt: string;
  deletedBy: string;
}

// =============================================================================
// Notification Types
// =============================================================================

export type NotificationType =
  | "message"
  | "mention"
  | "reaction"
  | "thread_reply"
  | "channel_invite"
  | "direct_message"
  | "system";

export interface NotificationEvent {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  iconUrl?: string;
  imageUrl?: string;
  channelId?: string;
  messageId?: string;
  threadId?: string;
  senderId?: string;
  sender?: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
  data?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationReadEvent {
  notificationId: string;
  readAt: string;
}

export interface NotificationReadAllEvent {
  readAt: string;
  count: number;
}

// =============================================================================
// Read Receipt Types
// =============================================================================

export interface ReadReceiptEvent {
  userId: string;
  channelId: string;
  threadId?: string;
  messageId: string;
  readAt: string;
  user?: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
}

export interface ReadChannelEvent {
  channelId: string;
  threadId?: string;
  readers: Array<{
    userId: string;
    messageId: string;
    readAt: string;
  }>;
}

export interface ReadMessageEvent {
  messageId: string;
  readers: Array<{
    userId: string;
    readAt: string;
    user?: {
      id: string;
      displayName: string;
      avatarUrl?: string;
    };
  }>;
}

// =============================================================================
// User Status Types
// =============================================================================

export interface UserStatusEvent {
  userId: string;
  status: PresenceStatus;
  customStatus?: string;
  customEmoji?: string;
  expiresAt?: string;
  updatedAt: string;
}

export interface UserProfileUpdateEvent {
  userId: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  timezone?: string;
  updatedAt: string;
}

// =============================================================================
// Thread Types
// =============================================================================

export interface ThreadEvent {
  id: string;
  channelId: string;
  parentMessageId: string;
  replyCount: number;
  participantIds: string[];
  lastReplyAt?: string;
  createdAt: string;
}

export interface ThreadNewEvent extends ThreadEvent {
  firstReply: MessageEvent;
}

export interface ThreadUpdateEvent {
  id: string;
  channelId: string;
  parentMessageId: string;
  replyCount: number;
  participantIds: string[];
  lastReplyAt: string;
}

export interface ThreadReplyEvent {
  threadId: string;
  channelId: string;
  parentMessageId: string;
  message: MessageEvent;
}

// =============================================================================
// Error Types
// =============================================================================

export interface SocketError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// =============================================================================
// Server to Client Events (events the client receives)
// =============================================================================

export interface ServerToClientEvents {
  // Presence
  [SocketEvents.PRESENCE_UPDATE]: (event: PresenceEvent) => void;
  [SocketEvents.PRESENCE_BULK]: (event: PresenceBulkEvent) => void;
  [SocketEvents.PRESENCE_SYNC]: (event: PresenceSyncEvent) => void;

  // Typing
  [SocketEvents.TYPING_START]: (event: TypingStartEvent) => void;
  [SocketEvents.TYPING_STOP]: (event: TypingStopEvent) => void;
  [SocketEvents.TYPING_CHANNEL]: (event: TypingChannelEvent) => void;

  // Messages
  [SocketEvents.MESSAGE_NEW]: (event: MessageNewEvent) => void;
  [SocketEvents.MESSAGE_UPDATE]: (event: MessageUpdateEvent) => void;
  [SocketEvents.MESSAGE_DELETE]: (event: MessageDeleteEvent) => void;

  // Reactions
  [SocketEvents.REACTION_ADD]: (event: ReactionAddEvent) => void;
  [SocketEvents.REACTION_REMOVE]: (event: ReactionRemoveEvent) => void;

  // Channels
  [SocketEvents.CHANNEL_UPDATE]: (event: ChannelUpdateEvent) => void;
  [SocketEvents.CHANNEL_MEMBER_JOIN]: (event: ChannelMemberEvent) => void;
  [SocketEvents.CHANNEL_MEMBER_LEAVE]: (event: ChannelMemberEvent) => void;
  [SocketEvents.CHANNEL_CREATED]: (event: ChannelCreatedEvent) => void;
  [SocketEvents.CHANNEL_DELETED]: (event: ChannelDeletedEvent) => void;

  // Notifications
  [SocketEvents.NOTIFICATION_NEW]: (event: NotificationEvent) => void;
  [SocketEvents.NOTIFICATION_READ]: (event: NotificationReadEvent) => void;
  [SocketEvents.NOTIFICATION_READ_ALL]: (
    event: NotificationReadAllEvent,
  ) => void;

  // Read receipts
  [SocketEvents.READ_UPDATE]: (event: ReadReceiptEvent) => void;
  [SocketEvents.READ_CHANNEL]: (event: ReadChannelEvent) => void;
  [SocketEvents.READ_MESSAGE]: (event: ReadMessageEvent) => void;

  // User status
  [SocketEvents.USER_STATUS]: (event: UserStatusEvent) => void;
  [SocketEvents.USER_PROFILE_UPDATE]: (event: UserProfileUpdateEvent) => void;

  // Threads
  [SocketEvents.THREAD_NEW]: (event: ThreadNewEvent) => void;
  [SocketEvents.THREAD_UPDATE]: (event: ThreadUpdateEvent) => void;
  [SocketEvents.THREAD_REPLY]: (event: ThreadReplyEvent) => void;

  // Connection
  [SocketEvents.ERROR]: (error: SocketError) => void;
}

// =============================================================================
// Client to Server Events (events the client sends)
// =============================================================================

export interface ClientToServerEvents {
  // Presence
  [SocketEvents.PRESENCE_UPDATE]: (
    event: Pick<PresenceEvent, "status" | "customStatus" | "customEmoji">,
  ) => void;
  [SocketEvents.PRESENCE_SUBSCRIBE]: (event: PresenceSubscribeEvent) => void;
  [SocketEvents.PRESENCE_UNSUBSCRIBE]: (event: PresenceSubscribeEvent) => void;

  // Typing
  [SocketEvents.TYPING_START]: (
    event: Pick<TypingEvent, "channelId" | "threadId">,
  ) => void;
  [SocketEvents.TYPING_STOP]: (
    event: Pick<TypingEvent, "channelId" | "threadId">,
  ) => void;

  // Messages
  [SocketEvents.MESSAGE_SEND]: (event: MessageSendEvent) => void;

  // Reactions
  [SocketEvents.REACTION_ADD]: (
    event: Pick<
      ReactionEvent,
      "messageId" | "channelId" | "threadId" | "emoji"
    >,
  ) => void;
  [SocketEvents.REACTION_REMOVE]: (
    event: Pick<
      ReactionEvent,
      "messageId" | "channelId" | "threadId" | "emoji"
    >,
  ) => void;

  // Channels
  [SocketEvents.CHANNEL_JOIN]: (event: ChannelJoinEvent) => void;
  [SocketEvents.CHANNEL_LEAVE]: (event: ChannelLeaveEvent) => void;

  // Notifications
  [SocketEvents.NOTIFICATION_READ]: (
    event: Pick<NotificationReadEvent, "notificationId">,
  ) => void;
  [SocketEvents.NOTIFICATION_READ_ALL]: () => void;

  // Read receipts
  [SocketEvents.READ_UPDATE]: (
    event: Pick<ReadReceiptEvent, "channelId" | "threadId" | "messageId">,
  ) => void;

  // User status
  [SocketEvents.USER_STATUS]: (
    event: Pick<
      UserStatusEvent,
      "status" | "customStatus" | "customEmoji" | "expiresAt"
    >,
  ) => void;
}
