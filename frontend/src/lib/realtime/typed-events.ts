import type { MessagePayload, PresencePayload, TypingPayload } from "./events";

/**
 * Server to Client events - Events sent from server to connected clients
 */
export interface ServerToClientEvents {
  "message:new": (payload: MessagePayload) => void;
  "message:update": (payload: MessagePayload) => void;
  "message:delete": (payload: { messageId: string; channelId: string }) => void;
  "message:typing": (payload: TypingPayload) => void;
  "presence:update": (payload: PresencePayload) => void;
  "channel:update": (payload: {
    channelId: string;
    data: Record<string, unknown>;
  }) => void;
  "channel:member_join": (payload: {
    channelId: string;
    userId: string;
  }) => void;
  "channel:member_leave": (payload: {
    channelId: string;
    userId: string;
  }) => void;
  "reaction:add": (payload: {
    messageId: string;
    emoji: string;
    userId: string;
  }) => void;
  "reaction:remove": (payload: {
    messageId: string;
    emoji: string;
    userId: string;
  }) => void;
  notification: (payload: {
    type: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }) => void;
  error: (payload: { code: string; message: string }) => void;
}

/**
 * Client to Server events - Events sent from clients to the server
 */
export interface ClientToServerEvents {
  "message:send": (
    payload: { channelId: string; content: string; replyTo?: string },
    callback?: (ack: {
      success: boolean;
      messageId?: string;
      error?: string;
    }) => void,
  ) => void;
  "message:edit": (
    payload: { messageId: string; content: string },
    callback?: (ack: { success: boolean; error?: string }) => void,
  ) => void;
  "message:delete": (
    payload: { messageId: string },
    callback?: (ack: { success: boolean; error?: string }) => void,
  ) => void;
  "message:typing": (payload: { channelId: string; isTyping: boolean }) => void;
  "channel:join": (
    payload: { channelId: string },
    callback?: (ack: { success: boolean; error?: string }) => void,
  ) => void;
  "channel:leave": (payload: { channelId: string }) => void;
  "presence:update": (payload: {
    status: "online" | "away" | "dnd" | "offline";
  }) => void;
  "presence:subscribe": (payload: { userIds: string[] }) => void;
  "reaction:add": (payload: { messageId: string; emoji: string }) => void;
  "reaction:remove": (payload: { messageId: string; emoji: string }) => void;
}

/**
 * Inter-server events - Events for horizontal scaling with Redis adapter
 */
export interface InterServerEvents {
  ping: () => void;
}

/**
 * Socket data - Data attached to each socket connection
 */
export interface SocketData {
  userId: string;
  sessionId: string;
}

/**
 * Type helpers for extracting event payloads
 */
export type ServerEventName = keyof ServerToClientEvents;
export type ClientEventName = keyof ClientToServerEvents;

export type ServerEventPayload<E extends ServerEventName> = Parameters<
  ServerToClientEvents[E]
>[0];
export type ClientEventPayload<E extends ClientEventName> = Parameters<
  ClientToServerEvents[E]
>[0];
