/**
 * Room Manager Service
 *
 * Enhanced room management service that coordinates Socket.io room membership
 * with GraphQL subscriptions. Handles join/leave operations, reconnection logic,
 * and ensures proper cleanup.
 *
 * @module services/realtime/room-manager.service
 * @version 1.0.0
 */

import { realtimeClient, RealtimeConnectionState } from "./realtime-client";
import { getSubscriptionBridge } from "./subscription-bridge.service";
import { getEventDispatcher } from "./event-dispatcher.service";
import { logger } from "@/lib/logger";
import {
  REALTIME_EVENTS,
  getChannelRoom,
  getThreadRoom,
  getUserRoom,
  parseRoomName,
  type RealtimeRoomType,
} from "./events.types";

// ============================================================================
// Types
// ============================================================================

/**
 * Room manager configuration
 */
export interface RoomManagerConfig {
  /** Enable debug logging */
  debug?: boolean;
  /** Auto-rejoin rooms on reconnection */
  autoRejoinOnReconnect?: boolean;
  /** Maximum rooms to track */
  maxRooms?: number;
  /** Room join timeout in milliseconds */
  joinTimeout?: number;
  /** Enable subscription bridging for rooms */
  enableSubscriptionBridge?: boolean;
}

/**
 * Room information
 */
export interface RoomInfo {
  /** Room name (e.g., "channel:uuid") */
  name: string;
  /** Room type */
  type: RealtimeRoomType;
  /** Resource ID (channel ID, thread ID, etc.) */
  resourceId: string;
  /** When the room was joined */
  joinedAt: number;
  /** Whether currently in the room */
  isJoined: boolean;
  /** Number of local listeners for this room */
  listenerCount: number;
  /** Metadata about the room */
  metadata?: Record<string, unknown>;
}

/**
 * Room join options
 */
export interface RoomJoinOptions {
  /** Whether to subscribe to GraphQL subscriptions for this room */
  subscribeToUpdates?: boolean;
  /** Room metadata */
  metadata?: Record<string, unknown>;
  /** Force rejoin even if already joined */
  force?: boolean;
}

/**
 * Room event listeners
 */
export type RoomJoinedListener = (roomInfo: RoomInfo) => void;
export type RoomLeftListener = (roomName: string) => void;
export type RoomErrorListener = (roomName: string, error: Error) => void;
export type RoomReconnectedListener = (roomNames: string[]) => void;

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CONFIG: Required<RoomManagerConfig> = {
  debug: false,
  autoRejoinOnReconnect: true,
  maxRooms: 100,
  joinTimeout: 10000,
  enableSubscriptionBridge: true,
};

// ============================================================================
// Room Manager Class
// ============================================================================

/**
 * RoomManagerService - Manages room membership and subscriptions
 */
class RoomManagerService {
  private config: Required<RoomManagerConfig>;
  private rooms = new Map<string, RoomInfo>();
  private pendingJoins = new Set<string>();
  private pendingLeaves = new Set<string>();
  private joinListeners = new Set<RoomJoinedListener>();
  private leaveListeners = new Set<RoomLeftListener>();
  private errorListeners = new Set<RoomErrorListener>();
  private reconnectListeners = new Set<RoomReconnectedListener>();
  private unsubscribers: Array<() => void> = [];
  private isInitialized = false;
  private currentUserId: string | null = null;
  private wasDisconnected = false;

  constructor(config: RoomManagerConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  /**
   * Initialize the room manager
   */
  initialize(): void {
    if (this.isInitialized) {
      return;
    }

    this.setupConnectionListener();
    this.setupSocketEventListeners();

    this.isInitialized = true;
    this.log("Room manager initialized");
  }

  /**
   * Set the current user ID
   */
  setCurrentUserId(userId: string | null): void {
    const previousUserId = this.currentUserId;
    this.currentUserId = userId;

    // If user changed, leave old user room and join new one
    if (previousUserId && previousUserId !== userId) {
      this.leaveRoom(getUserRoom(previousUserId));
    }

    if (userId) {
      // Join user's personal room for notifications
      this.joinRoom(getUserRoom(userId), { subscribeToUpdates: false });
    }
  }

  /**
   * Destroy the room manager
   */
  destroy(): void {
    // Leave all rooms
    const roomNames = Array.from(this.rooms.keys());
    for (const roomName of roomNames) {
      this.leaveRoom(roomName);
    }

    // Cleanup listeners
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];

    // Clear state
    this.rooms.clear();
    this.pendingJoins.clear();
    this.pendingLeaves.clear();
    this.joinListeners.clear();
    this.leaveListeners.clear();
    this.errorListeners.clear();
    this.reconnectListeners.clear();

    this.isInitialized = false;
    this.log("Room manager destroyed");
  }

  // ============================================================================
  // Connection Management
  // ============================================================================

  /**
   * Set up connection state listener
   */
  private setupConnectionListener(): void {
    const unsub = realtimeClient.onConnectionStateChange(
      (state: RealtimeConnectionState) => {
        if (
          state === "disconnected" ||
          state === "reconnecting" ||
          state === "offline"
        ) {
          this.wasDisconnected = true;

          // Mark all rooms as not joined
          for (const room of this.rooms.values()) {
            room.isJoined = false;
          }
        } else if (
          (state === "connected" || state === "authenticated") &&
          this.wasDisconnected
        ) {
          this.wasDisconnected = false;

          // Rejoin all rooms
          if (this.config.autoRejoinOnReconnect) {
            this.rejoinAllRooms();
          }
        }
      },
    );

    this.unsubscribers.push(unsub);
  }

  /**
   * Set up socket event listeners
   */
  private setupSocketEventListeners(): void {
    // Handle room joined confirmation from server
    const unsubJoined = realtimeClient.on<{
      roomName: string;
      success: boolean;
      error?: string;
    }>(REALTIME_EVENTS.ROOM_JOINED, (data) => {
      this.handleRoomJoinedConfirmation(
        data.roomName,
        data.success,
        data.error,
      );
    });
    this.unsubscribers.push(unsubJoined);
  }

  /**
   * Rejoin all rooms after reconnection
   */
  private async rejoinAllRooms(): Promise<void> {
    const roomNames = Array.from(this.rooms.keys());

    if (roomNames.length === 0) {
      return;
    }

    this.log("Rejoining", roomNames.length, "rooms after reconnection");

    const rejoined: string[] = [];

    for (const roomName of roomNames) {
      try {
        await this.joinRoom(roomName, { force: true });
        rejoined.push(roomName);
      } catch (error) {
        this.log("Failed to rejoin room:", roomName, error);
        this.notifyError(roomName, error as Error);
      }
    }

    // Notify reconnect listeners
    if (rejoined.length > 0) {
      this.reconnectListeners.forEach((listener) => {
        try {
          listener(rejoined);
        } catch (error) {
          logger.error("[RoomManager] Reconnect listener error:", error);
        }
      });
    }
  }

  // ============================================================================
  // Room Operations
  // ============================================================================

  /**
   * Join a room
   */
  async joinRoom(
    roomName: string,
    options: RoomJoinOptions = {},
  ): Promise<RoomInfo> {
    const {
      subscribeToUpdates = this.config.enableSubscriptionBridge,
      metadata,
      force = false,
    } = options;

    // Check if already joined
    const existingRoom = this.rooms.get(roomName);
    if (existingRoom?.isJoined && !force) {
      this.log("Already in room:", roomName);
      return existingRoom;
    }

    // Check pending joins
    if (this.pendingJoins.has(roomName)) {
      throw new Error(`Join already pending for room: ${roomName}`);
    }

    // Check max rooms
    if (this.rooms.size >= this.config.maxRooms && !existingRoom) {
      throw new Error(`Maximum room limit (${this.config.maxRooms}) reached`);
    }

    // Parse room name
    const parsed = parseRoomName(roomName);
    if (!parsed) {
      throw new Error(`Invalid room name: ${roomName}`);
    }

    // Check connection
    if (!realtimeClient.isConnected) {
      // Store room info for later joining
      const roomInfo: RoomInfo = {
        name: roomName,
        type: parsed.type,
        resourceId: parsed.id,
        joinedAt: Date.now(),
        isJoined: false,
        listenerCount: existingRoom?.listenerCount ?? 0,
        metadata,
      };
      this.rooms.set(roomName, roomInfo);
      return roomInfo;
    }

    this.pendingJoins.add(roomName);

    try {
      // Emit join request to server
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Room join timeout"));
        }, this.config.joinTimeout);

        realtimeClient.emit<{ roomName: string }, void>(
          REALTIME_EVENTS.ROOM_JOIN,
          { roomName },
          (response) => {
            clearTimeout(timeout);

            if (response.success) {
              resolve();
            } else {
              reject(
                new Error(response.error?.message || "Failed to join room"),
              );
            }
          },
        );
      });

      // Create or update room info
      const roomInfo: RoomInfo = {
        name: roomName,
        type: parsed.type,
        resourceId: parsed.id,
        joinedAt: Date.now(),
        isJoined: true,
        listenerCount: existingRoom?.listenerCount ?? 0,
        metadata,
      };

      this.rooms.set(roomName, roomInfo);

      // Subscribe to GraphQL subscriptions if enabled
      if (subscribeToUpdates) {
        const bridge = getSubscriptionBridge();
        if (bridge.initialized) {
          bridge.subscribeToRoom(roomName);
        }
      }

      // Notify listeners
      this.notifyJoined(roomInfo);

      this.log("Joined room:", roomName);

      return roomInfo;
    } finally {
      this.pendingJoins.delete(roomName);
    }
  }

  /**
   * Leave a room
   */
  leaveRoom(roomName: string): void {
    const room = this.rooms.get(roomName);
    if (!room) {
      this.log("Not in room:", roomName);
      return;
    }

    // Check if there are still listeners
    if (room.listenerCount > 0) {
      this.log("Room still has listeners, not leaving:", roomName);
      return;
    }

    if (this.pendingLeaves.has(roomName)) {
      return;
    }

    this.pendingLeaves.add(roomName);

    try {
      // Emit leave request to server
      if (realtimeClient.isConnected) {
        realtimeClient.emit(REALTIME_EVENTS.ROOM_LEAVE, { roomName });
      }

      // Unsubscribe from GraphQL subscriptions
      if (this.config.enableSubscriptionBridge) {
        const bridge = getSubscriptionBridge();
        if (bridge.initialized) {
          bridge.unsubscribeFromRoom(roomName);
        }
      }

      // Remove room
      this.rooms.delete(roomName);

      // Notify listeners
      this.notifyLeft(roomName);

      this.log("Left room:", roomName);
    } finally {
      this.pendingLeaves.delete(roomName);
    }
  }

  /**
   * Join a channel room
   */
  async joinChannel(
    channelId: string,
    options?: RoomJoinOptions,
  ): Promise<RoomInfo> {
    const roomName = getChannelRoom(channelId);
    return this.joinRoom(roomName, options);
  }

  /**
   * Leave a channel room
   */
  leaveChannel(channelId: string): void {
    const roomName = getChannelRoom(channelId);
    this.leaveRoom(roomName);
  }

  /**
   * Join a thread room
   */
  async joinThread(
    threadId: string,
    options?: RoomJoinOptions,
  ): Promise<RoomInfo> {
    const roomName = getThreadRoom(threadId);
    return this.joinRoom(roomName, options);
  }

  /**
   * Leave a thread room
   */
  leaveThread(threadId: string): void {
    const roomName = getThreadRoom(threadId);
    this.leaveRoom(roomName);
  }

  // ============================================================================
  // Room Queries
  // ============================================================================

  /**
   * Check if in a room
   */
  isInRoom(roomName: string): boolean {
    const room = this.rooms.get(roomName);
    return room?.isJoined ?? false;
  }

  /**
   * Get room info
   */
  getRoom(roomName: string): RoomInfo | undefined {
    return this.rooms.get(roomName);
  }

  /**
   * Get all joined rooms
   */
  getJoinedRooms(): RoomInfo[] {
    return Array.from(this.rooms.values()).filter((r) => r.isJoined);
  }

  /**
   * Get all room names
   */
  getRoomNames(): string[] {
    return Array.from(this.rooms.keys());
  }

  /**
   * Get rooms by type
   */
  getRoomsByType(type: RealtimeRoomType): RoomInfo[] {
    return Array.from(this.rooms.values()).filter((r) => r.type === type);
  }

  // ============================================================================
  // Listener Management
  // ============================================================================

  /**
   * Increment listener count for a room
   * Call this when a component starts listening to a room's events
   */
  addRoomListener(roomName: string): void {
    const room = this.rooms.get(roomName);
    if (room) {
      room.listenerCount++;
    }
  }

  /**
   * Decrement listener count for a room
   * Call this when a component stops listening to a room's events
   */
  removeRoomListener(roomName: string): void {
    const room = this.rooms.get(roomName);
    if (room && room.listenerCount > 0) {
      room.listenerCount--;

      // Auto-leave if no listeners and room is not a user room
      if (room.listenerCount === 0 && room.type !== "user") {
        // Delay leave to allow for component re-renders
        setTimeout(() => {
          const currentRoom = this.rooms.get(roomName);
          if (currentRoom && currentRoom.listenerCount === 0) {
            this.leaveRoom(roomName);
          }
        }, 5000);
      }
    }
  }

  // ============================================================================
  // Event Subscriptions
  // ============================================================================

  /**
   * Subscribe to room joined events
   */
  onRoomJoined(listener: RoomJoinedListener): () => void {
    this.joinListeners.add(listener);
    return () => this.joinListeners.delete(listener);
  }

  /**
   * Subscribe to room left events
   */
  onRoomLeft(listener: RoomLeftListener): () => void {
    this.leaveListeners.add(listener);
    return () => this.leaveListeners.delete(listener);
  }

  /**
   * Subscribe to room error events
   */
  onRoomError(listener: RoomErrorListener): () => void {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  /**
   * Subscribe to reconnection events
   */
  onReconnected(listener: RoomReconnectedListener): () => void {
    this.reconnectListeners.add(listener);
    return () => this.reconnectListeners.delete(listener);
  }

  // ============================================================================
  // Notification Helpers
  // ============================================================================

  /**
   * Notify joined listeners
   */
  private notifyJoined(roomInfo: RoomInfo): void {
    this.joinListeners.forEach((listener) => {
      try {
        listener(roomInfo);
      } catch (error) {
        logger.error("[RoomManager] Join listener error:", error);
      }
    });
  }

  /**
   * Notify left listeners
   */
  private notifyLeft(roomName: string): void {
    this.leaveListeners.forEach((listener) => {
      try {
        listener(roomName);
      } catch (error) {
        logger.error("[RoomManager] Leave listener error:", error);
      }
    });
  }

  /**
   * Notify error listeners
   */
  private notifyError(roomName: string, error: Error): void {
    this.errorListeners.forEach((listener) => {
      try {
        listener(roomName, error);
      } catch (e) {
        logger.error("[RoomManager] Error listener error:", e);
      }
    });
  }

  /**
   * Handle room joined confirmation from server
   */
  private handleRoomJoinedConfirmation(
    roomName: string,
    success: boolean,
    error?: string,
  ): void {
    const room = this.rooms.get(roomName);
    if (room) {
      room.isJoined = success;

      if (!success && error) {
        this.notifyError(roomName, new Error(error));
      }
    }
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  /**
   * Log message if debug enabled
   */
  private log(...args: unknown[]): void {
    if (this.config.debug) {
      // REMOVED: console.log('[RoomManager]', ...args)
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
    return this.rooms.size;
  }

  /**
   * Get joined room count
   */
  get joinedRoomCount(): number {
    return Array.from(this.rooms.values()).filter((r) => r.isJoined).length;
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

let roomManagerInstance: RoomManagerService | null = null;

/**
 * Get the room manager instance
 */
export function getRoomManager(config?: RoomManagerConfig): RoomManagerService {
  if (!roomManagerInstance) {
    roomManagerInstance = new RoomManagerService(config);
  }
  return roomManagerInstance;
}

/**
 * Initialize the room manager
 */
export function initializeRoomManager(
  config?: RoomManagerConfig,
): RoomManagerService {
  const manager = getRoomManager(config);
  manager.initialize();
  return manager;
}

/**
 * Reset the room manager
 */
export function resetRoomManager(): void {
  if (roomManagerInstance) {
    roomManagerInstance.destroy();
    roomManagerInstance = null;
  }
}

export { RoomManagerService };
export default RoomManagerService;
