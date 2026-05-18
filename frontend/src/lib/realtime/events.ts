export const SOCKET_EVENTS = {
  // Connection
  CONNECT: "connect",
  DISCONNECT: "disconnect",
  ERROR: "error",

  // Messages
  MESSAGE_NEW: "message:new",
  MESSAGE_UPDATE: "message:update",
  MESSAGE_DELETE: "message:delete",
  MESSAGE_TYPING: "message:typing",

  // Message Delivery Status
  MESSAGE_SENT: "message:sent",
  MESSAGE_DELIVERED: "message:delivered",
  MESSAGE_READ: "message:read",
  MESSAGE_FAILED: "message:failed",
  MESSAGE_ACK: "message:ack",

  // Presence
  PRESENCE_UPDATE: "presence:update",
  PRESENCE_SUBSCRIBE: "presence:subscribe",

  // Channels
  CHANNEL_JOIN: "channel:join",
  CHANNEL_LEAVE: "channel:leave",
  CHANNEL_UPDATE: "channel:update",

  // Reactions
  REACTION_ADD: "reaction:add",
  REACTION_REMOVE: "reaction:remove",

  // Live Streaming
  STREAM_START: "stream:start",
  STREAM_END: "stream:end",
  STREAM_QUALITY_UPDATE: "stream:quality-update",
  STREAM_VIEWER_JOINED: "stream:viewer-joined",
  STREAM_VIEWER_LEFT: "stream:viewer-left",
  STREAM_VIEWER_COUNT: "stream:viewer-count",
  STREAM_CHAT_MESSAGE: "stream:chat-message",
  STREAM_CHAT_DELETED: "stream:chat-deleted",
  STREAM_CHAT_PINNED: "stream:chat-pinned",
  STREAM_REACTION: "stream:reaction",
  STREAM_ERROR: "stream:error",
} as const;

export type SocketEvent = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];

export interface MessagePayload {
  id: string;
  channelId: string;
  content: string;
  authorId: string;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Message sent acknowledgement payload
 */
export interface MessageSentPayload {
  /** Client-side message ID (used for optimistic updates) */
  clientMessageId: string;
  /** Server-assigned message ID */
  messageId: string;
  /** Timestamp when server received the message */
  sentAt: string;
}

/**
 * Message delivered payload
 */
export interface MessageDeliveredPayload {
  messageId: string;
  /** For group chats: number of recipients who received */
  deliveredCount?: number;
  /** Total recipients in the channel */
  totalRecipients?: number;
  /** Timestamp of delivery */
  deliveredAt: string;
}

/**
 * Message read payload
 */
export interface MessageReadPayload {
  messageId: string;
  /** User who read the message */
  userId: string;
  /** For group chats: total read count */
  readCount?: number;
  /** Total recipients in the channel */
  totalRecipients?: number;
  /** Timestamp when read */
  readAt: string;
}

/**
 * Message failed payload
 */
export interface MessageFailedPayload {
  /** Client-side message ID */
  clientMessageId: string;
  /** Error code */
  errorCode: string;
  /** Error message */
  errorMessage: string;
  /** Whether the message can be retried */
  retryable: boolean;
}

export interface PresencePayload {
  userId: string;
  status: "online" | "away" | "dnd" | "offline";
  lastSeen?: string;
}

export interface TypingPayload {
  channelId: string;
  userId: string;
  isTyping: boolean;
}
