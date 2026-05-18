export * from "./config";
export * from "./events";
export * from "./socket-manager";
export * from "./typed-events";
export * from "./typed-socket";
export * from "./delivery-handler";
export * from "./broadcast-helpers";

// Re-export realtime services for convenience
export {
  realtimeClient,
  type RealtimeConnectionState,
  type RealtimeClientConfig,
  type RealtimeError,
} from "@/services/realtime/realtime-client";
export {
  getPresenceService,
  initializePresenceService,
  type PresenceStatus,
  type CustomStatus,
  type UserPresence,
} from "@/services/realtime/presence.service";
export {
  getTypingService,
  initializeTypingService,
  type TypingUser,
} from "@/services/realtime/typing.service";
export {
  getRoomsService,
  initializeRoomsService,
  type Room,
  type RoomMember,
  type MessageEvent,
} from "@/services/realtime/rooms.service";

// Re-export new services
export {
  getRoomManager,
  initializeRoomManager,
  type RoomInfo,
  type RoomJoinOptions,
} from "@/services/realtime/room-manager.service";
export {
  getEventDispatcher,
  initializeEventDispatcher,
} from "@/services/realtime/event-dispatcher.service";
export {
  getSubscriptionBridge,
  initializeSubscriptionBridge,
} from "@/services/realtime/subscription-bridge.service";
export {
  getAuthMiddleware,
  initializeAuthMiddleware,
  type AuthState,
  type UserSession,
} from "@/services/realtime/auth-middleware.service";
export {
  getAPIEventBroadcaster,
  initializeAPIEventBroadcaster,
} from "@/services/realtime/api-event-broadcaster";
export {
  REALTIME_EVENTS,
  getChannelRoom,
  getThreadRoom,
  getUserRoom,
  getDMRoom,
  parseRoomName,
  type RealtimeRoomType,
  type EventUser,
  type MessageNewEvent,
  type MessageUpdateEvent,
  type MessageDeleteEvent,
  type ReactionAddEvent,
  type ChannelMemberJoinEvent,
  type ChannelMemberLeaveEvent,
} from "@/services/realtime/events.types";
