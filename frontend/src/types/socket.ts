/**
 * Socket Types for nself-chat
 *
 * Type definitions for Socket.io event payloads, connection states, and real-time communication.
 * Supports all real-time features including messages, presence, typing, and notifications.
 */

import type { UserBasicInfo, UserPresence, UserPresenceStatus } from "./user";
import type { Channel, ChannelMember } from "./channel";
import type { Message, TypingUser } from "./message";
import type { Notification } from "./notification";
import type { Reaction } from "./emoji";

// ============================================================================
// Socket Connection Types
// ============================================================================

/**
 * Socket connection states.
 */
export type SocketConnectionState =
  | "connecting"
  | "connected"
  | "disconnected"
  | "reconnecting"
  | "error";

/**
 * Socket connection info.
 */
export interface SocketConnectionInfo {
  /** Current connection state */
  state: SocketConnectionState;
  /** Socket ID (when connected) */
  socketId?: string;
  /** Connection timestamp */
  connectedAt?: Date;
  /** Disconnection timestamp */
  disconnectedAt?: Date;
  /** Reconnection attempt count */
  reconnectAttempts: number;
  /** Last error */
  lastError?: SocketError;
  /** Latency in milliseconds */
  latency?: number;
  /** Transport type */
  transport?: "websocket" | "polling";
}

/**
 * Socket error.
 */
export interface SocketError {
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** Error details */
  details?: unknown;
  /** Timestamp */
  timestamp: Date;
}

/**
 * Socket connection options.
 */
export interface SocketConnectionOptions {
  /** Authentication token */
  token?: string;
  /** Auto-reconnect on disconnect */
  autoReconnect: boolean;
  /** Maximum reconnection attempts */
  maxReconnectAttempts: number;
  /** Reconnection delay in ms */
  reconnectDelay: number;
  /** Reconnection delay max in ms */
  reconnectDelayMax: number;
  /** Connection timeout in ms */
  connectionTimeout: number;
  /** Enable heartbeat */
  heartbeat: boolean;
  /** Heartbeat interval in ms */
  heartbeatInterval: number;
  /** Transport priority */
  transports: ("websocket" | "polling")[];
}

/**
 * Default socket connection options.
 */
export const DefaultSocketConnectionOptions: SocketConnectionOptions = {
  autoReconnect: true,
  maxReconnectAttempts: 10,
  reconnectDelay: 1000,
  reconnectDelayMax: 30000,
  connectionTimeout: 20000,
  heartbeat: true,
  heartbeatInterval: 25000,
  transports: ["websocket", "polling"],
};

// ============================================================================
// Socket Event Names
// ============================================================================

/**
 * Client-to-server event names.
 */
export type ClientToServerEvent =
  // Connection events
  | "authenticate"
  | "disconnect"
  | "ping"
  // Channel events
  | "channel:join"
  | "channel:leave"
  | "channel:subscribe"
  | "channel:unsubscribe"
  // Message events
  | "message:send"
  | "message:edit"
  | "message:delete"
  | "message:read"
  | "message:typing_start"
  | "message:typing_stop"
  // Reaction events
  | "reaction:add"
  | "reaction:remove"
  // Presence events
  | "presence:update"
  | "presence:subscribe"
  | "presence:unsubscribe"
  // Thread events
  | "thread:subscribe"
  | "thread:unsubscribe";

/**
 * Server-to-client event names.
 */
export type ServerToClientEvent =
  // Connection events
  | "connected"
  | "authenticated"
  | "authentication_error"
  | "disconnected"
  | "pong"
  | "error"
  // Channel events
  | "channel:joined"
  | "channel:left"
  | "channel:created"
  | "channel:updated"
  | "channel:deleted"
  | "channel:member_joined"
  | "channel:member_left"
  | "channel:member_updated"
  // Message events
  | "message:new"
  | "message:updated"
  | "message:deleted"
  | "message:pinned"
  | "message:unpinned"
  | "message:typing"
  | "message:read_receipt"
  // Reaction events
  | "reaction:added"
  | "reaction:removed"
  // Presence events
  | "presence:changed"
  | "presence:bulk_update"
  // Thread events
  | "thread:new"
  | "thread:reply"
  | "thread:updated"
  // Notification events
  | "notification:new"
  | "notification:read"
  | "notification:count_update"
  // User events
  | "user:updated"
  | "user:status_changed";

// ============================================================================
// Client-to-Server Event Payloads
// ============================================================================

/**
 * Authentication payload.
 */
export interface AuthenticatePayload {
  /** JWT token */
  token: string;
  /** Device info */
  device?: {
    type: "desktop" | "mobile" | "web";
    os?: string;
    browser?: string;
  };
}

/**
 * Channel join payload.
 */
export interface ChannelJoinPayload {
  /** Channel ID */
  channelId: string;
  /** Last message ID (for sync) */
  lastMessageId?: string;
}

/**
 * Channel leave payload.
 */
export interface ChannelLeavePayload {
  /** Channel ID */
  channelId: string;
}

/**
 * Message send payload.
 */
export interface MessageSendPayload {
  /** Channel ID */
  channelId: string;
  /** Message content */
  content: string;
  /** Reply to message ID */
  replyToId?: string;
  /** Thread ID */
  threadId?: string;
  /** Client-generated message ID (for optimistic updates) */
  clientMessageId?: string;
  /** Attachments (IDs of already uploaded files) */
  attachmentIds?: string[];
}

/**
 * Message edit payload.
 */
export interface MessageEditPayload {
  /** Message ID */
  messageId: string;
  /** New content */
  content: string;
}

/**
 * Message delete payload.
 */
export interface MessageDeletePayload {
  /** Message ID */
  messageId: string;
}

/**
 * Message read payload.
 */
export interface MessageReadPayload {
  /** Channel ID */
  channelId: string;
  /** Last read message ID */
  messageId: string;
}

/**
 * Typing indicator payload.
 */
export interface TypingPayload {
  /** Channel ID */
  channelId: string;
  /** Thread ID (if typing in thread) */
  threadId?: string;
}

/**
 * Reaction payload.
 */
export interface ReactionPayload {
  /** Message ID */
  messageId: string;
  /** Channel ID */
  channelId: string;
  /** Emoji character or custom emoji ID */
  emoji: string;
  /** Is custom emoji */
  isCustom?: boolean;
}

/**
 * Presence update payload.
 */
export interface PresenceUpdatePayload {
  /** Presence status */
  status: UserPresenceStatus;
  /** Custom status */
  customStatus?: {
    emoji?: string;
    text: string;
    expiresAt?: Date;
  };
}

/**
 * Presence subscribe payload.
 */
export interface PresenceSubscribePayload {
  /** User IDs to subscribe to */
  userIds: string[];
}

/**
 * Thread subscribe payload.
 */
export interface ThreadSubscribePayload {
  /** Thread ID */
  threadId: string;
}

// ============================================================================
// Server-to-Client Event Payloads
// ============================================================================

/**
 * Connected event payload.
 */
export interface ConnectedPayload {
  /** Socket ID */
  socketId: string;
  /** Server timestamp */
  serverTime: Date;
  /** Protocol version */
  protocolVersion: string;
}

/**
 * Authenticated event payload.
 */
export interface AuthenticatedPayload {
  /** User info */
  user: UserBasicInfo;
  /** Session ID */
  sessionId: string;
  /** Channels to auto-join */
  channels: { id: string; name: string }[];
}

/**
 * Authentication error payload.
 */
export interface AuthenticationErrorPayload {
  /** Error code */
  code: "invalid_token" | "expired_token" | "missing_token" | "unauthorized";
  /** Error message */
  message: string;
}

/**
 * New message event payload.
 */
export interface MessageNewPayload {
  /** The message */
  message: Message;
  /** Channel ID */
  channelId: string;
  /** Thread ID (if in thread) */
  threadId?: string;
}

/**
 * Message updated event payload.
 */
export interface MessageUpdatedPayload {
  /** Updated message */
  message: Message;
  /** Channel ID */
  channelId: string;
  /** Previous content */
  previousContent?: string;
}

/**
 * Message deleted event payload.
 */
export interface MessageDeletedPayload {
  /** Message ID */
  messageId: string;
  /** Channel ID */
  channelId: string;
  /** Who deleted it */
  deletedBy: string;
  /** Timestamp */
  deletedAt: Date;
}

/**
 * Typing event payload.
 */
export interface TypingEventPayload {
  /** Channel ID */
  channelId: string;
  /** Thread ID (if in thread) */
  threadId?: string;
  /** Users currently typing */
  users: TypingUser[];
}

/**
 * Read receipt payload.
 */
export interface ReadReceiptPayload {
  /** Channel ID */
  channelId: string;
  /** User who read */
  userId: string;
  /** Message ID read up to */
  messageId: string;
  /** Timestamp */
  readAt: Date;
}

/**
 * Reaction added event payload.
 */
export interface ReactionAddedPayload {
  /** Message ID */
  messageId: string;
  /** Channel ID */
  channelId: string;
  /** Reaction */
  reaction: Reaction;
  /** User who added */
  user: UserBasicInfo;
}

/**
 * Reaction removed event payload.
 */
export interface ReactionRemovedPayload {
  /** Message ID */
  messageId: string;
  /** Channel ID */
  channelId: string;
  /** Emoji that was removed */
  emoji: string;
  /** User who removed */
  userId: string;
}

/**
 * Presence changed event payload.
 */
export interface PresenceChangedPayload {
  /** User ID */
  userId: string;
  /** New presence */
  presence: UserPresence;
  /** Previous status */
  previousStatus?: UserPresenceStatus;
}

/**
 * Bulk presence update payload.
 */
export interface PresenceBulkUpdatePayload {
  /** Presence updates by user ID */
  presences: { userId: string; presence: UserPresence }[];
}

/**
 * Channel created event payload.
 */
export interface ChannelCreatedPayload {
  /** The channel */
  channel: Channel;
  /** Who created it */
  createdBy: UserBasicInfo;
}

/**
 * Channel updated event payload.
 */
export interface ChannelUpdatedPayload {
  /** Channel ID */
  channelId: string;
  /** Updated fields */
  updates: Partial<Channel>;
  /** Who updated it */
  updatedBy: UserBasicInfo;
}

/**
 * Channel member event payload.
 */
export interface ChannelMemberEventPayload {
  /** Channel ID */
  channelId: string;
  /** The member */
  member: ChannelMember;
  /** Event actor (who added/removed) */
  actor?: UserBasicInfo;
}

/**
 * Notification event payload.
 */
export interface NotificationEventPayload {
  /** The notification */
  notification: Notification;
}

/**
 * Notification count update payload.
 */
export interface NotificationCountUpdatePayload {
  /** Total unread count */
  total: number;
  /** Unread by type */
  byType: Record<string, number>;
}

/**
 * User status changed payload.
 */
export interface UserStatusChangedPayload {
  /** User ID */
  userId: string;
  /** User info */
  user: UserBasicInfo;
  /** New status */
  status: {
    emoji?: string;
    text: string;
    expiresAt?: Date;
  } | null;
}

// ============================================================================
// Socket Event Maps
// ============================================================================

/**
 * Client-to-server event map.
 */
export interface ClientToServerEvents {
  authenticate: (payload: AuthenticatePayload) => void;
  disconnect: () => void;
  ping: () => void;
  "channel:join": (payload: ChannelJoinPayload) => void;
  "channel:leave": (payload: ChannelLeavePayload) => void;
  "channel:subscribe": (payload: ChannelJoinPayload) => void;
  "channel:unsubscribe": (payload: ChannelLeavePayload) => void;
  "message:send": (
    payload: MessageSendPayload,
    callback: (response: SocketResponse<Message>) => void,
  ) => void;
  "message:edit": (
    payload: MessageEditPayload,
    callback: (response: SocketResponse<Message>) => void,
  ) => void;
  "message:delete": (
    payload: MessageDeletePayload,
    callback: (response: SocketResponse<void>) => void,
  ) => void;
  "message:read": (payload: MessageReadPayload) => void;
  "message:typing_start": (payload: TypingPayload) => void;
  "message:typing_stop": (payload: TypingPayload) => void;
  "reaction:add": (payload: ReactionPayload) => void;
  "reaction:remove": (payload: ReactionPayload) => void;
  "presence:update": (payload: PresenceUpdatePayload) => void;
  "presence:subscribe": (payload: PresenceSubscribePayload) => void;
  "presence:unsubscribe": (payload: PresenceSubscribePayload) => void;
  "thread:subscribe": (payload: ThreadSubscribePayload) => void;
  "thread:unsubscribe": (payload: ThreadSubscribePayload) => void;
}

/**
 * Server-to-client event map.
 */
export interface ServerToClientEvents {
  connected: (payload: ConnectedPayload) => void;
  authenticated: (payload: AuthenticatedPayload) => void;
  authentication_error: (payload: AuthenticationErrorPayload) => void;
  disconnected: (reason: string) => void;
  pong: () => void;
  error: (error: SocketError) => void;
  "channel:joined": (payload: { channelId: string }) => void;
  "channel:left": (payload: { channelId: string }) => void;
  "channel:created": (payload: ChannelCreatedPayload) => void;
  "channel:updated": (payload: ChannelUpdatedPayload) => void;
  "channel:deleted": (payload: { channelId: string }) => void;
  "channel:member_joined": (payload: ChannelMemberEventPayload) => void;
  "channel:member_left": (payload: ChannelMemberEventPayload) => void;
  "channel:member_updated": (payload: ChannelMemberEventPayload) => void;
  "message:new": (payload: MessageNewPayload) => void;
  "message:updated": (payload: MessageUpdatedPayload) => void;
  "message:deleted": (payload: MessageDeletedPayload) => void;
  "message:pinned": (payload: MessageNewPayload) => void;
  "message:unpinned": (payload: {
    messageId: string;
    channelId: string;
  }) => void;
  "message:typing": (payload: TypingEventPayload) => void;
  "message:read_receipt": (payload: ReadReceiptPayload) => void;
  "reaction:added": (payload: ReactionAddedPayload) => void;
  "reaction:removed": (payload: ReactionRemovedPayload) => void;
  "presence:changed": (payload: PresenceChangedPayload) => void;
  "presence:bulk_update": (payload: PresenceBulkUpdatePayload) => void;
  "thread:new": (payload: {
    threadId: string;
    channelId: string;
    rootMessage: Message;
  }) => void;
  "thread:reply": (payload: MessageNewPayload) => void;
  "thread:updated": (payload: {
    threadId: string;
    replyCount: number;
    lastReplyAt: Date;
  }) => void;
  "notification:new": (payload: NotificationEventPayload) => void;
  "notification:read": (payload: { notificationId: string }) => void;
  "notification:count_update": (
    payload: NotificationCountUpdatePayload,
  ) => void;
  "user:updated": (payload: { user: UserBasicInfo }) => void;
  "user:status_changed": (payload: UserStatusChangedPayload) => void;
}

// ============================================================================
// Socket Response Types
// ============================================================================

/**
 * Socket response wrapper.
 */
export interface SocketResponse<T = unknown> {
  /** Success indicator */
  success: boolean;
  /** Response data */
  data?: T;
  /** Error (if failed) */
  error?: SocketError;
}

/**
 * Socket acknowledgement callback.
 */
export type SocketAck<T = unknown> = (response: SocketResponse<T>) => void;

// ============================================================================
// Socket State Types
// ============================================================================

/**
 * Complete socket state.
 */
export interface SocketState {
  /** Connection info */
  connection: SocketConnectionInfo;
  /** Authenticated user */
  user?: UserBasicInfo;
  /** Joined channel IDs */
  joinedChannels: Set<string>;
  /** Subscribed thread IDs */
  subscribedThreads: Set<string>;
  /** Subscribed user presence IDs */
  subscribedPresence: Set<string>;
  /** Pending messages (optimistic updates) */
  pendingMessages: Map<string, Message>;
  /** Typing states by channel */
  typingStates: Map<string, TypingUser[]>;
  /** Presence cache */
  presenceCache: Map<string, UserPresence>;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Socket event handler type.
 */
export type SocketEventHandler<T> = (payload: T) => void | Promise<void>;

/**
 * Socket event listener cleanup function.
 */
export type SocketEventCleanup = () => void;

/**
 * Extract payload type from event map.
 */
export type ExtractEventPayload<
  TEvents,
  TEvent extends keyof TEvents,
> = TEvents[TEvent] extends (payload: infer P) => void ? P : never;
