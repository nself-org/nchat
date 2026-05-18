/**
 * Real-time Search Sync
 *
 * Integrates search indexing with real-time Socket.io events.
 * Automatically indexes new content and updates/removes existing content.
 *
 * @module services/search/realtime-sync
 */

import { getSyncService, type SyncResult } from "./sync.service";
import type { Message } from "@/types/message";
import type { Channel } from "@/types/channel";
import type { User } from "@/types/user";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface RealtimeSyncConfig {
  /** Whether to enable real-time sync (default: true) */
  enabled?: boolean;
  /** Batch indexing interval in ms (default: 1000) */
  batchInterval?: number;
  /** Maximum batch size (default: 50) */
  maxBatchSize?: number;
  /** Whether to log sync events (default: false) */
  debug?: boolean;
}

export interface MessageEvent {
  type: "message:created" | "message:updated" | "message:deleted";
  message: Message;
  channel?: Pick<Channel, "id" | "name">;
  author?: Pick<User, "id" | "username" | "displayName" | "avatarUrl">;
}

export interface ChannelEvent {
  type: "channel:created" | "channel:updated" | "channel:deleted";
  channel: Channel;
}

export interface UserEvent {
  type: "user:created" | "user:updated" | "user:deleted";
  user: User;
}

export interface FileEvent {
  type: "file:uploaded" | "file:updated" | "file:deleted";
  file: {
    id: string;
    name: string;
    originalName?: string;
    description?: string;
    mimeType: string;
    size: number;
    url: string;
    thumbnailUrl?: string;
    channelId: string;
    channelName?: string;
    messageId: string;
    uploaderId: string;
    uploaderName?: string;
    uploaderUsername?: string;
    createdAt: Date | string;
    extractedText?: string;
  };
}

export type SyncEvent = MessageEvent | ChannelEvent | UserEvent | FileEvent;

export type SyncEventHandler = (result: SyncResult, event: SyncEvent) => void;

// ============================================================================
// Batch Queue
// ============================================================================

interface BatchItem {
  event: SyncEvent;
  timestamp: number;
}

class BatchQueue {
  private queue: BatchItem[] = [];
  private timer: NodeJS.Timeout | null = null;
  private processing = false;

  constructor(
    private maxSize: number,
    private interval: number,
    private processor: (items: SyncEvent[]) => Promise<void>,
  ) {}

  add(event: SyncEvent): void {
    this.queue.push({ event, timestamp: Date.now() });

    if (this.queue.length >= this.maxSize) {
      this.flush();
    } else if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), this.interval);
    }
  }

  async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.processing || this.queue.length === 0) return;

    this.processing = true;
    const items = [...this.queue];
    this.queue = [];

    try {
      await this.processor(items.map((i) => i.event));
    } finally {
      this.processing = false;
    }
  }

  clear(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.queue = [];
  }

  get length(): number {
    return this.queue.length;
  }
}

// ============================================================================
// Realtime Sync Service
// ============================================================================

export class RealtimeSyncService {
  private config: Required<RealtimeSyncConfig>;
  private syncService = getSyncService();
  private messageQueue: BatchQueue;
  private eventHandlers: Set<SyncEventHandler> = new Set();
  private unsubscribe: (() => void) | null = null;

  constructor(config: RealtimeSyncConfig = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      batchInterval: config.batchInterval ?? 1000,
      maxBatchSize: config.maxBatchSize ?? 50,
      debug: config.debug ?? false,
    };

    // Initialize batch queue for messages
    this.messageQueue = new BatchQueue(
      this.config.maxBatchSize,
      this.config.batchInterval,
      this.processBatch.bind(this),
    );
  }

  // --------------------------------------------------------------------------
  // Socket Event Handlers
  // --------------------------------------------------------------------------

  /**
   * Connect to socket events
   * Call this after socket connection is established
   */
  connect(socket: {
    on: (event: string, handler: (...args: unknown[]) => void) => void;
    off: (event: string, handler: (...args: unknown[]) => void) => void;
  }): void {
    if (!this.config.enabled) return;

    // Message events
    const handleMessageCreated = (data: unknown) => {
      this.handleMessageEvent({
        type: "message:created",
        ...(data as Omit<MessageEvent, "type">),
      });
    };

    const handleMessageUpdated = (data: unknown) => {
      this.handleMessageEvent({
        type: "message:updated",
        ...(data as Omit<MessageEvent, "type">),
      });
    };

    const handleMessageDeleted = (data: unknown) => {
      this.handleMessageEvent({
        type: "message:deleted",
        ...(data as Omit<MessageEvent, "type">),
      });
    };

    // Channel events
    const handleChannelCreated = (data: unknown) => {
      this.handleChannelEvent({
        type: "channel:created",
        channel: data as Channel,
      });
    };

    const handleChannelUpdated = (data: unknown) => {
      this.handleChannelEvent({
        type: "channel:updated",
        channel: data as Channel,
      });
    };

    const handleChannelDeleted = (data: unknown) => {
      this.handleChannelEvent({
        type: "channel:deleted",
        channel: data as Channel,
      });
    };

    // User events
    const handleUserCreated = (data: unknown) => {
      this.handleUserEvent({
        type: "user:created",
        user: data as User,
      });
    };

    const handleUserUpdated = (data: unknown) => {
      this.handleUserEvent({
        type: "user:updated",
        user: data as User,
      });
    };

    const handleUserDeleted = (data: unknown) => {
      this.handleUserEvent({
        type: "user:deleted",
        user: data as User,
      });
    };

    // File events
    const handleFileUploaded = (data: unknown) => {
      this.handleFileEvent({
        type: "file:uploaded",
        file: data as FileEvent["file"],
      });
    };

    const handleFileDeleted = (data: unknown) => {
      this.handleFileEvent({
        type: "file:deleted",
        file: data as FileEvent["file"],
      });
    };

    // Subscribe to events
    socket.on("message:created", handleMessageCreated);
    socket.on("message:updated", handleMessageUpdated);
    socket.on("message:deleted", handleMessageDeleted);
    socket.on("channel:created", handleChannelCreated);
    socket.on("channel:updated", handleChannelUpdated);
    socket.on("channel:deleted", handleChannelDeleted);
    socket.on("user:created", handleUserCreated);
    socket.on("user:updated", handleUserUpdated);
    socket.on("user:deleted", handleUserDeleted);
    socket.on("file:uploaded", handleFileUploaded);
    socket.on("file:deleted", handleFileDeleted);

    // Store unsubscribe function
    this.unsubscribe = () => {
      socket.off("message:created", handleMessageCreated);
      socket.off("message:updated", handleMessageUpdated);
      socket.off("message:deleted", handleMessageDeleted);
      socket.off("channel:created", handleChannelCreated);
      socket.off("channel:updated", handleChannelUpdated);
      socket.off("channel:deleted", handleChannelDeleted);
      socket.off("user:created", handleUserCreated);
      socket.off("user:updated", handleUserUpdated);
      socket.off("user:deleted", handleUserDeleted);
      socket.off("file:uploaded", handleFileUploaded);
      socket.off("file:deleted", handleFileDeleted);
    };

    this.log("Connected to socket events");
  }

  /**
   * Disconnect from socket events
   */
  disconnect(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    this.messageQueue.flush();
    this.log("Disconnected from socket events");
  }

  // --------------------------------------------------------------------------
  // Event Handlers
  // --------------------------------------------------------------------------

  private handleMessageEvent(event: MessageEvent): void {
    if (!this.config.enabled) return;

    // Use queue for create/update, immediate for delete
    if (event.type === "message:deleted") {
      this.processEvent(event);
    } else {
      this.messageQueue.add(event);
    }
  }

  private async handleChannelEvent(event: ChannelEvent): Promise<void> {
    if (!this.config.enabled) return;
    await this.processEvent(event);
  }

  private async handleUserEvent(event: UserEvent): Promise<void> {
    if (!this.config.enabled) return;
    await this.processEvent(event);
  }

  private async handleFileEvent(event: FileEvent): Promise<void> {
    if (!this.config.enabled) return;
    await this.processEvent(event);
  }

  // --------------------------------------------------------------------------
  // Processing
  // --------------------------------------------------------------------------

  private async processEvent(event: SyncEvent): Promise<void> {
    let result: SyncResult;

    try {
      switch (event.type) {
        case "message:created":
          result = await this.syncService.indexMessage(
            event.message,
            event.channel,
            event.author,
          );
          break;

        case "message:updated":
          result = await this.syncService.updateMessage(
            event.message,
            event.channel,
            event.author,
          );
          break;

        case "message:deleted":
          result = await this.syncService.removeMessage(event.message.id);
          break;

        case "channel:created":
          result = await this.syncService.indexChannel({
            id: event.channel.id,
            name: event.channel.name,
            description: event.channel.description,
            topic: event.channel.topic,
            type: event.channel.type,
            isPrivate: event.channel.type === "private",
            isArchived: event.channel.isArchived,
            isDefault: event.channel.isDefault,
            createdBy: event.channel.createdBy,
            createdAt: event.channel.createdAt,
            categoryId: event.channel.categoryId,
            memberCount: event.channel.memberCount,
            lastMessageAt: event.channel.lastMessageAt,
            icon: event.channel.icon,
          });
          break;

        case "channel:updated":
          result = await this.syncService.updateChannel({
            id: event.channel.id,
            name: event.channel.name,
            description: event.channel.description,
            topic: event.channel.topic,
            type: event.channel.type,
            isPrivate: event.channel.type === "private",
            isArchived: event.channel.isArchived,
            isDefault: event.channel.isDefault,
            createdBy: event.channel.createdBy,
            createdAt: event.channel.createdAt,
            categoryId: event.channel.categoryId,
            memberCount: event.channel.memberCount,
            lastMessageAt: event.channel.lastMessageAt,
            icon: event.channel.icon,
          });
          break;

        case "channel:deleted":
          result = await this.syncService.removeChannel(event.channel.id);
          break;

        case "user:created":
          result = await this.syncService.indexUser({
            id: event.user.id,
            username: event.user.username,
            displayName: event.user.displayName,
            email: event.user.email,
            avatarUrl: event.user.avatarUrl,
            bio: event.user.profile?.bio,
            jobTitle: event.user.profile?.jobTitle,
            department: event.user.profile?.department,
            role: event.user.role,
            isActive: event.user.isActive,
            isBot: event.user.isBot,
            createdAt: event.user.createdAt,
            lastSeenAt: event.user.presence?.lastSeenAt,
          });
          break;

        case "user:updated":
          result = await this.syncService.updateUser({
            id: event.user.id,
            username: event.user.username,
            displayName: event.user.displayName,
            email: event.user.email,
            avatarUrl: event.user.avatarUrl,
            bio: event.user.profile?.bio,
            jobTitle: event.user.profile?.jobTitle,
            department: event.user.profile?.department,
            role: event.user.role,
            isActive: event.user.isActive,
            isBot: event.user.isBot,
            createdAt: event.user.createdAt,
            lastSeenAt: event.user.presence?.lastSeenAt,
          });
          break;

        case "user:deleted":
          result = await this.syncService.removeUser(event.user.id);
          break;

        case "file:uploaded":
          result = await this.syncService.indexFile(event.file);
          break;

        case "file:updated":
          result = await this.syncService.updateFile(event.file);
          break;

        case "file:deleted":
          result = await this.syncService.removeFile(event.file.id);
          break;

        default:
          return;
      }

      this.log(`Processed ${event.type}:`, result);
      this.notifyHandlers(result, event);
    } catch (error) {
      this.log(`Error processing ${event.type}:`, error);
    }
  }

  private async processBatch(events: SyncEvent[]): Promise<void> {
    // Group events by type
    const messageCreates = events.filter(
      (e): e is MessageEvent => e.type === "message:created",
    );
    const messageUpdates = events.filter(
      (e): e is MessageEvent => e.type === "message:updated",
    );

    // Process creates in batch
    if (messageCreates.length > 0) {
      const result = await this.syncService.batchIndexMessages(
        messageCreates.map((e) => ({
          message: e.message,
          channel: e.channel,
          author: e.author,
        })),
      );
      this.log(`Batch indexed ${result.indexed} messages`);
    }

    // Process updates individually (could be optimized)
    for (const event of messageUpdates) {
      await this.processEvent(event);
    }
  }

  // --------------------------------------------------------------------------
  // Event Subscription
  // --------------------------------------------------------------------------

  /**
   * Subscribe to sync events
   */
  onSync(handler: SyncEventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => {
      this.eventHandlers.delete(handler);
    };
  }

  private notifyHandlers(result: SyncResult, event: SyncEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(result, event);
      } catch (error) {
        logger.error("[RealtimeSyncService] Handler error:", error);
      }
    }
  }

  // --------------------------------------------------------------------------
  // Utilities
  // --------------------------------------------------------------------------

  private log(...args: unknown[]): void {
    if (this.config.debug) {
      // REMOVED: console.log('[RealtimeSyncService]', ...args)
    }
  }

  /**
   * Get pending queue size
   */
  get pendingCount(): number {
    return this.messageQueue.length;
  }

  /**
   * Force flush the queue
   */
  async flush(): Promise<void> {
    await this.messageQueue.flush();
  }

  /**
   * Check if connected
   */
  get isConnected(): boolean {
    return this.unsubscribe !== null;
  }

  /**
   * Enable/disable real-time sync
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    if (!enabled) {
      this.messageQueue.clear();
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let realtimeSyncInstance: RealtimeSyncService | null = null;

/**
 * Get the singleton RealtimeSyncService instance
 */
export function getRealtimeSyncService(
  config?: RealtimeSyncConfig,
): RealtimeSyncService {
  if (!realtimeSyncInstance) {
    realtimeSyncInstance = new RealtimeSyncService(config);
  }
  return realtimeSyncInstance;
}

/**
 * Create a new RealtimeSyncService instance
 */
export function createRealtimeSyncService(
  config?: RealtimeSyncConfig,
): RealtimeSyncService {
  return new RealtimeSyncService(config);
}

export default RealtimeSyncService;
