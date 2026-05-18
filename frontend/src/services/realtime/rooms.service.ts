/**
 * Rooms Service
 *
 * Manages room (channel, DM, thread) membership and events.
 * Integrates with the nself-plugins realtime server.
 *
 * @module services/realtime/rooms.service
 * @version 1.0.0
 */

import { realtimeClient, RealtimeError } from "./realtime-client";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

/**
 * Room types
 */
export type RoomType = "channel" | "dm" | "group-dm" | "thread" | "broadcast";

/**
 * Room visibility
 */
export type RoomVisibility = "public" | "private";

/**
 * Room information
 */
export interface Room {
  name: string;
  type: RoomType;
  visibility: RoomVisibility;
  memberCount?: number;
  createdAt?: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Room member
 */
export interface RoomMember {
  userId: string;
  userName?: string;
  userAvatar?: string;
  joinedAt: Date;
}

/**
 * Room join response
 */
interface RoomJoinResponse {
  roomName: string;
  type: RoomType;
  memberCount: number;
  members?: RoomMember[];
}

/**
 * Room event payload
 */
interface RoomEvent {
  roomName: string;
  userId: string;
  userName?: string;
  userAvatar?: string;
  timestamp: string;
}

/**
 * Message event from server
 */
export interface MessageEvent {
  roomName: string;
  messageId: string;
  userId: string;
  userName?: string;
  userAvatar?: string;
  content: string;
  threadId?: string;
  replyTo?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

/**
 * Room service configuration
 */
export interface RoomsServiceConfig {
  /** Auto-rejoin rooms on reconnection */
  autoRejoinOnReconnect?: boolean;
  /** Maximum rooms to track */
  maxTrackedRooms?: number;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Room event listeners
 */
export type RoomJoinListener = (roomName: string, member: RoomMember) => void;
export type RoomLeaveListener = (roomName: string, userId: string) => void;
export type MessageListener = (message: MessageEvent) => void;
export type RoomStateListener = (rooms: string[]) => void;

// ============================================================================
// Constants
// ============================================================================

const SOCKET_EVENTS = {
  ROOM_JOIN: "room:join",
  ROOM_LEAVE: "room:leave",
  ROOM_JOINED: "room:joined",
  USER_JOINED: "user:joined",
  USER_LEFT: "user:left",
  MESSAGE_NEW: "message:new",
  MESSAGE_SEND: "message:send",
  MESSAGE_UPDATE: "message:update",
  MESSAGE_DELETE: "message:delete",
} as const;

const DEFAULT_CONFIG: Required<RoomsServiceConfig> = {
  autoRejoinOnReconnect: true,
  maxTrackedRooms: 100,
  debug: false,
};

// ============================================================================
// Rooms Service Class
// ============================================================================

/**
 * RoomsService - Manages room membership and events
 */
class RoomsService {
  private config: Required<RoomsServiceConfig>;
  private joinedRooms = new Map<string, Room>();
  private roomMembers = new Map<string, Map<string, RoomMember>>();
  private pendingJoins = new Set<string>();
  private joinListeners = new Set<RoomJoinListener>();
  private leaveListeners = new Set<RoomLeaveListener>();
  private messageListeners = new Map<string, Set<MessageListener>>(); // roomName -> listeners
  private globalMessageListeners = new Set<MessageListener>();
  private roomStateListeners = new Set<RoomStateListener>();
  private unsubscribers: Array<() => void> = [];
  private isInitialized = false;

  constructor(config: RoomsServiceConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  /**
   * Initialize the rooms service
   */
  initialize(): void {
    if (this.isInitialized) {
      return;
    }

    this.setupEventListeners();
    this.isInitialized = true;
    this.log("Rooms service initialized");
  }

  /**
   * Destroy the rooms service
   */
  destroy(): void {
    // Leave all rooms
    for (const roomName of this.joinedRooms.keys()) {
      this.leaveRoom(roomName);
    }

    // Cleanup socket listeners
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];

    // Clear state
    this.joinedRooms.clear();
    this.roomMembers.clear();
    this.pendingJoins.clear();
    this.joinListeners.clear();
    this.leaveListeners.clear();
    this.messageListeners.clear();
    this.globalMessageListeners.clear();
    this.roomStateListeners.clear();

    this.isInitialized = false;
    this.log("Rooms service destroyed");
  }

  // ============================================================================
  // Room Management
  // ============================================================================

  /**
   * Join a room
   */
  async joinRoom(roomName: string): Promise<Room> {
    if (this.joinedRooms.has(roomName)) {
      this.log("Already in room:", roomName);
      return this.joinedRooms.get(roomName)!;
    }

    if (this.pendingJoins.has(roomName)) {
      this.log("Join already pending for room:", roomName);
      throw new Error(`Join pending for room: ${roomName}`);
    }

    if (!realtimeClient.isConnected) {
      throw new Error("Not connected to realtime server");
    }

    this.pendingJoins.add(roomName);

    try {
      const response = await realtimeClient.emitAsync<
        { roomName: string },
        RoomJoinResponse
      >(SOCKET_EVENTS.ROOM_JOIN, { roomName });

      const room: Room = {
        name: response.roomName,
        type: response.type || "channel",
        visibility: "public",
        memberCount: response.memberCount,
      };

      this.joinedRooms.set(roomName, room);

      // Store members if provided
      if (response.members) {
        const membersMap = new Map<string, RoomMember>();
        response.members.forEach((m) => {
          membersMap.set(m.userId, m);
        });
        this.roomMembers.set(roomName, membersMap);
      }

      this.notifyRoomStateListeners();
      this.log("Joined room:", roomName);

      return room;
    } finally {
      this.pendingJoins.delete(roomName);
    }
  }

  /**
   * Join multiple rooms
   */
  async joinRooms(roomNames: string[]): Promise<Map<string, Room>> {
    const results = new Map<string, Room>();

    await Promise.all(
      roomNames.map(async (roomName) => {
        try {
          const room = await this.joinRoom(roomName);
          results.set(roomName, room);
        } catch (error) {
          this.log("Failed to join room:", roomName, error);
        }
      }),
    );

    return results;
  }

  /**
   * Leave a room
   */
  leaveRoom(roomName: string): void {
    if (!this.joinedRooms.has(roomName)) {
      this.log("Not in room:", roomName);
      return;
    }

    if (realtimeClient.isConnected) {
      realtimeClient.emit(SOCKET_EVENTS.ROOM_LEAVE, { roomName });
    }

    this.joinedRooms.delete(roomName);
    this.roomMembers.delete(roomName);
    this.messageListeners.delete(roomName);

    this.notifyRoomStateListeners();
    this.log("Left room:", roomName);
  }

  /**
   * Leave multiple rooms
   */
  leaveRooms(roomNames: string[]): void {
    roomNames.forEach((roomName) => this.leaveRoom(roomName));
  }

  /**
   * Leave all rooms
   */
  leaveAllRooms(): void {
    const roomNames = Array.from(this.joinedRooms.keys());
    this.leaveRooms(roomNames);
  }

  /**
   * Check if in a room
   */
  isInRoom(roomName: string): boolean {
    return this.joinedRooms.has(roomName);
  }

  /**
   * Get joined rooms
   */
  getJoinedRooms(): Room[] {
    return Array.from(this.joinedRooms.values());
  }

  /**
   * Get joined room names
   */
  getJoinedRoomNames(): string[] {
    return Array.from(this.joinedRooms.keys());
  }

  /**
   * Get room by name
   */
  getRoom(roomName: string): Room | undefined {
    return this.joinedRooms.get(roomName);
  }

  /**
   * Get room members
   */
  getRoomMembers(roomName: string): RoomMember[] {
    const members = this.roomMembers.get(roomName);
    return members ? Array.from(members.values()) : [];
  }

  // ============================================================================
  // Messaging
  // ============================================================================

  /**
   * Send a message to a room
   */
  async sendMessage(
    roomName: string,
    content: string,
    options?: {
      threadId?: string;
      replyTo?: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<{ messageId: string }> {
    if (!realtimeClient.isConnected) {
      throw new Error("Not connected to realtime server");
    }

    if (!this.joinedRooms.has(roomName)) {
      throw new Error(`Not in room: ${roomName}`);
    }

    const payload = {
      roomName,
      content,
      threadId: options?.threadId,
      replyTo: options?.replyTo,
      metadata: options?.metadata,
    };

    const response = await realtimeClient.emitAsync<
      typeof payload,
      { messageId: string }
    >(SOCKET_EVENTS.MESSAGE_SEND, payload);

    this.log("Message sent:", response.messageId);
    return response;
  }

  // ============================================================================
  // Event Subscriptions
  // ============================================================================

  /**
   * Subscribe to user join events
   */
  onUserJoin(listener: RoomJoinListener): () => void {
    this.joinListeners.add(listener);
    return () => this.joinListeners.delete(listener);
  }

  /**
   * Subscribe to user leave events
   */
  onUserLeave(listener: RoomLeaveListener): () => void {
    this.leaveListeners.add(listener);
    return () => this.leaveListeners.delete(listener);
  }

  /**
   * Subscribe to messages in a specific room
   */
  onRoomMessage(roomName: string, listener: MessageListener): () => void {
    if (!this.messageListeners.has(roomName)) {
      this.messageListeners.set(roomName, new Set());
    }
    this.messageListeners.get(roomName)!.add(listener);
    return () => this.messageListeners.get(roomName)?.delete(listener);
  }

  /**
   * Subscribe to all messages
   */
  onMessage(listener: MessageListener): () => void {
    this.globalMessageListeners.add(listener);
    return () => this.globalMessageListeners.delete(listener);
  }

  /**
   * Subscribe to room state changes
   */
  onRoomStateChange(listener: RoomStateListener): () => void {
    this.roomStateListeners.add(listener);
    // Immediately notify of current state
    listener(this.getJoinedRoomNames());
    return () => this.roomStateListeners.delete(listener);
  }

  // ============================================================================
  // Socket Event Handlers
  // ============================================================================

  /**
   * Set up socket event listeners
   */
  private setupEventListeners(): void {
    // Handle user joined
    const unsubUserJoined = realtimeClient.on<RoomEvent>(
      SOCKET_EVENTS.USER_JOINED,
      this.handleUserJoined.bind(this),
    );
    this.unsubscribers.push(unsubUserJoined);

    // Handle user left
    const unsubUserLeft = realtimeClient.on<RoomEvent>(
      SOCKET_EVENTS.USER_LEFT,
      this.handleUserLeft.bind(this),
    );
    this.unsubscribers.push(unsubUserLeft);

    // Handle new message
    const unsubMessage = realtimeClient.on<MessageEvent>(
      SOCKET_EVENTS.MESSAGE_NEW,
      this.handleNewMessage.bind(this),
    );
    this.unsubscribers.push(unsubMessage);

    // Handle reconnection
    const unsubConnection = realtimeClient.onConnectionStateChange((state) => {
      if (state === "connected" || state === "authenticated") {
        if (this.config.autoRejoinOnReconnect && this.joinedRooms.size > 0) {
          this.rejoinRooms();
        }
      } else if (state === "disconnected") {
        // Clear room members on disconnect
        this.roomMembers.clear();
      }
    });
    this.unsubscribers.push(unsubConnection);
  }

  /**
   * Handle user joined event
   */
  private handleUserJoined(event: RoomEvent): void {
    const member: RoomMember = {
      userId: event.userId,
      userName: event.userName,
      userAvatar: event.userAvatar,
      joinedAt: new Date(event.timestamp),
    };

    // Update room members
    if (!this.roomMembers.has(event.roomName)) {
      this.roomMembers.set(event.roomName, new Map());
    }
    this.roomMembers.get(event.roomName)!.set(event.userId, member);

    // Update member count
    const room = this.joinedRooms.get(event.roomName);
    if (room && room.memberCount !== undefined) {
      room.memberCount++;
    }

    // Notify listeners
    this.joinListeners.forEach((listener) => {
      try {
        listener(event.roomName, member);
      } catch (error) {
        logger.error("[RoomsService] Join listener error:", error);
      }
    });

    this.log("User joined:", event.userId, "in", event.roomName);
  }

  /**
   * Handle user left event
   */
  private handleUserLeft(event: RoomEvent): void {
    // Update room members
    this.roomMembers.get(event.roomName)?.delete(event.userId);

    // Update member count
    const room = this.joinedRooms.get(event.roomName);
    if (room && room.memberCount !== undefined && room.memberCount > 0) {
      room.memberCount--;
    }

    // Notify listeners
    this.leaveListeners.forEach((listener) => {
      try {
        listener(event.roomName, event.userId);
      } catch (error) {
        logger.error("[RoomsService] Leave listener error:", error);
      }
    });

    this.log("User left:", event.userId, "from", event.roomName);
  }

  /**
   * Handle new message event
   */
  private handleNewMessage(message: MessageEvent): void {
    // Notify room-specific listeners
    const roomListeners = this.messageListeners.get(message.roomName);
    if (roomListeners) {
      roomListeners.forEach((listener) => {
        try {
          listener(message);
        } catch (error) {
          logger.error("[RoomsService] Room message listener error:", error);
        }
      });
    }

    // Notify global listeners
    this.globalMessageListeners.forEach((listener) => {
      try {
        listener(message);
      } catch (error) {
        logger.error("[RoomsService] Global message listener error:", error);
      }
    });

    this.log("New message in:", message.roomName);
  }

  /**
   * Rejoin rooms after reconnection
   */
  private async rejoinRooms(): Promise<void> {
    const roomNames = Array.from(this.joinedRooms.keys());
    this.joinedRooms.clear();

    this.log("Rejoining rooms:", roomNames);

    await Promise.all(
      roomNames.map(async (roomName) => {
        try {
          await this.joinRoom(roomName);
        } catch (error) {
          this.log("Failed to rejoin room:", roomName, error);
        }
      }),
    );
  }

  /**
   * Notify room state listeners
   */
  private notifyRoomStateListeners(): void {
    const rooms = this.getJoinedRoomNames();
    this.roomStateListeners.forEach((listener) => {
      try {
        listener(rooms);
      } catch (error) {
        logger.error("[RoomsService] Room state listener error:", error);
      }
    });
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  /**
   * Log message if debug enabled
   */
  private log(...args: unknown[]): void {
    if (this.config.debug) {
      // REMOVED: console.log('[RoomsService]', ...args)
    }
  }

  /**
   * Check if initialized
   */
  get initialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Get room count
   */
  get roomCount(): number {
    return this.joinedRooms.size;
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

let roomsServiceInstance: RoomsService | null = null;

/**
 * Get the rooms service instance
 */
export function getRoomsService(config?: RoomsServiceConfig): RoomsService {
  if (!roomsServiceInstance) {
    roomsServiceInstance = new RoomsService(config);
  }
  return roomsServiceInstance;
}

/**
 * Initialize the rooms service
 */
export function initializeRoomsService(
  config?: RoomsServiceConfig,
): RoomsService {
  const service = getRoomsService(config);
  service.initialize();
  return service;
}

/**
 * Reset the rooms service
 */
export function resetRoomsService(): void {
  if (roomsServiceInstance) {
    roomsServiceInstance.destroy();
    roomsServiceInstance = null;
  }
}

export { RoomsService };
export default RoomsService;
