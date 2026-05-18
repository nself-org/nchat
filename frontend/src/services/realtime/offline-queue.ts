/**
 * Offline Queue Service
 *
 * Queues messages sent while offline and persists to localStorage.
 * Provides automatic retry with exponential backoff on reconnection.
 *
 * @module services/realtime/offline-queue
 * @version 1.0.0
 */

import { realtimeClient, RealtimeConnectionState } from "./realtime-client";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

/**
 * Message type for queued messages
 */
export type QueuedMessageType = "text" | "file" | "image" | "voice" | "system";

/**
 * Attachment reference for queued messages
 */
export interface QueuedAttachment {
  id: string;
  type: string;
  name: string;
  size: number;
  url?: string;
  localPath?: string;
}

/**
 * Queue item structure
 */
export interface QueuedMessage {
  /** Unique identifier for queue item */
  id: string;
  /** Channel ID where message should be sent */
  channelId: string;
  /** Message content */
  content: string;
  /** Message type */
  type: QueuedMessageType;
  /** Optional attachments */
  attachments?: QueuedAttachment[];
  /** Timestamp when queued */
  timestamp: number;
  /** Number of retry attempts */
  retries: number;
  /** Thread ID if reply */
  threadId?: string;
  /** Mentions in the message */
  mentions?: string[];
  /** Client-generated message ID for optimistic updates */
  clientMessageId?: string;
  /** Last retry timestamp */
  lastRetryAt?: number;
  /** Error message from last failed attempt */
  lastError?: string;
}

/**
 * Queue state for persistence
 */
interface QueueState {
  items: QueuedMessage[];
  version: number;
}

/**
 * Queue event types
 */
export type QueueEventType =
  | "message:queued"
  | "message:sent"
  | "message:failed"
  | "queue:flushing"
  | "queue:flushed"
  | "queue:cleared";

/**
 * Queue event listener
 */
export type QueueEventListener = (
  event: QueueEventType,
  data?: { message?: QueuedMessage; error?: string; count?: number },
) => void;

/**
 * Queue configuration
 */
export interface OfflineQueueConfig {
  /** Maximum number of messages to queue */
  maxQueueSize?: number;
  /** Maximum retry attempts per message */
  maxRetries?: number;
  /** Base delay for exponential backoff (ms) */
  baseRetryDelay?: number;
  /** Maximum delay between retries (ms) */
  maxRetryDelay?: number;
  /** Enable debug logging */
  debug?: boolean;
  /** LocalStorage key for persistence */
  storageKey?: string;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CONFIG: Required<OfflineQueueConfig> = {
  maxQueueSize: 100,
  maxRetries: 5,
  baseRetryDelay: 1000,
  maxRetryDelay: 30000,
  debug: false,
  storageKey: "nchat:offline-queue",
};

const QUEUE_VERSION = 1;

// ============================================================================
// Offline Queue Service Class
// ============================================================================

/**
 * OfflineQueueService - Manages offline message queue with localStorage persistence
 */
class OfflineQueueService {
  private config: Required<OfflineQueueConfig>;
  private queue: QueuedMessage[] = [];
  private listeners = new Set<QueueEventListener>();
  private unsubscribers: Array<() => void> = [];
  private isFlushing = false;
  private isInitialized = false;
  private flushTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(config: OfflineQueueConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  /**
   * Initialize the offline queue service
   */
  initialize(): void {
    if (this.isInitialized) {
      return;
    }

    // Load persisted queue from localStorage
    this.loadFromStorage();

    // Set up connection state listener
    this.setupConnectionListener();

    this.isInitialized = true;
    this.log(
      "Offline queue service initialized",
      `(${this.queue.length} queued items)`,
    );
  }

  /**
   * Destroy the offline queue service
   */
  destroy(): void {
    // Clear flush timeout
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = null;
    }

    // Cleanup listeners
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];
    this.listeners.clear();

    // Save queue before destroying
    this.saveToStorage();

    this.isInitialized = false;
    this.log("Offline queue service destroyed");
  }

  // ============================================================================
  // Queue Operations
  // ============================================================================

  /**
   * Add a message to the queue
   */
  queueMessage(
    message: Omit<QueuedMessage, "id" | "timestamp" | "retries">,
  ): QueuedMessage {
    // Check queue size limit
    if (this.queue.length >= this.config.maxQueueSize) {
      // Remove oldest message to make room
      const removed = this.queue.shift();
      if (removed) {
        this.log("Queue full, removed oldest message:", removed.id);
      }
    }

    const queuedMessage: QueuedMessage = {
      ...message,
      id: this.generateId(),
      timestamp: Date.now(),
      retries: 0,
    };

    this.queue.push(queuedMessage);
    this.saveToStorage();

    this.emit("message:queued", { message: queuedMessage });
    this.log("Message queued:", queuedMessage.id);

    // Try to send immediately if online
    if (realtimeClient.isConnected) {
      this.scheduleFlush();
    }

    return queuedMessage;
  }

  /**
   * Get all queued messages
   */
  getQueuedMessages(): QueuedMessage[] {
    return [...this.queue];
  }

  /**
   * Get queued messages for a specific channel
   */
  getQueuedMessagesForChannel(channelId: string): QueuedMessage[] {
    return this.queue.filter((m) => m.channelId === channelId);
  }

  /**
   * Get a specific queued message by ID
   */
  getQueuedMessage(id: string): QueuedMessage | undefined {
    return this.queue.find((m) => m.id === id);
  }

  /**
   * Remove a message from the queue
   */
  removeFromQueue(id: string): boolean {
    const index = this.queue.findIndex((m) => m.id === id);
    if (index === -1) {
      return false;
    }

    const removed = this.queue.splice(index, 1)[0];
    this.saveToStorage();
    this.log("Removed from queue:", id);

    return true;
  }

  /**
   * Update a queued message
   */
  updateQueuedMessage(id: string, updates: Partial<QueuedMessage>): boolean {
    const index = this.queue.findIndex((m) => m.id === id);
    if (index === -1) {
      return false;
    }

    this.queue[index] = { ...this.queue[index], ...updates };
    this.saveToStorage();

    return true;
  }

  /**
   * Get queue length
   */
  getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * Check if queue is empty
   */
  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  /**
   * Clear all queued messages
   */
  clearQueue(): void {
    const count = this.queue.length;
    this.queue = [];
    this.saveToStorage();

    this.emit("queue:cleared", { count });
    this.log("Queue cleared:", count, "messages removed");
  }

  // ============================================================================
  // Flush Operations
  // ============================================================================

  /**
   * Flush the queue - send all queued messages
   */
  async flushQueue(): Promise<{ sent: number; failed: number }> {
    if (this.isFlushing) {
      this.log("Flush already in progress");
      return { sent: 0, failed: 0 };
    }

    if (!realtimeClient.isConnected) {
      this.log("Cannot flush, not connected");
      return { sent: 0, failed: 0 };
    }

    if (this.queue.length === 0) {
      return { sent: 0, failed: 0 };
    }

    this.isFlushing = true;
    this.emit("queue:flushing", { count: this.queue.length });
    this.log("Flushing queue:", this.queue.length, "messages");

    let sent = 0;
    let failed = 0;

    // Process messages in order
    const messagesToProcess = [...this.queue];

    for (const message of messagesToProcess) {
      if (!realtimeClient.isConnected) {
        this.log("Connection lost during flush, stopping");
        break;
      }

      const success = await this.sendQueuedMessage(message);

      if (success) {
        sent++;
        this.removeFromQueue(message.id);
        this.emit("message:sent", { message });
      } else {
        failed++;

        // Update retry count
        const newRetries = message.retries + 1;
        if (newRetries >= this.config.maxRetries) {
          // Max retries reached, remove from queue
          this.removeFromQueue(message.id);
          this.emit("message:failed", {
            message,
            error: `Max retries (${this.config.maxRetries}) exceeded`,
          });
          this.log("Max retries exceeded, removed:", message.id);
        } else {
          // Update retry count and last retry time
          this.updateQueuedMessage(message.id, {
            retries: newRetries,
            lastRetryAt: Date.now(),
          });
        }
      }

      // Small delay between messages to avoid overwhelming the server
      await this.delay(100);
    }

    this.isFlushing = false;
    this.emit("queue:flushed", { count: sent });
    this.log("Flush complete:", sent, "sent,", failed, "failed");

    // If there are still messages and some failed, schedule another flush
    if (this.queue.length > 0 && failed > 0) {
      this.scheduleFlush();
    }

    return { sent, failed };
  }

  /**
   * Schedule a flush with delay
   */
  private scheduleFlush(delay?: number): void {
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
    }

    const flushDelay = delay ?? this.calculateRetryDelay();

    this.flushTimeout = setTimeout(() => {
      this.flushTimeout = null;
      this.flushQueue();
    }, flushDelay);

    this.log("Flush scheduled in", flushDelay, "ms");
  }

  /**
   * Send a single queued message
   */
  private async sendQueuedMessage(message: QueuedMessage): Promise<boolean> {
    try {
      await realtimeClient.emitAsync("message:send", {
        channelId: message.channelId,
        content: message.content,
        type: message.type,
        attachments: message.attachments,
        threadId: message.threadId,
        mentions: message.mentions,
        clientMessageId: message.clientMessageId || message.id,
      });

      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.updateQueuedMessage(message.id, { lastError: errorMessage });
      this.log("Failed to send message:", message.id, errorMessage);
      return false;
    }
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(): number {
    // Find the message with the most retries to calculate delay
    const maxRetries = Math.max(...this.queue.map((m) => m.retries), 0);

    // Exponential backoff: baseDelay * 2^retries
    const delay = Math.min(
      this.config.baseRetryDelay * Math.pow(2, maxRetries),
      this.config.maxRetryDelay,
    );

    // Add some jitter (0-10% random variation)
    const jitter = delay * Math.random() * 0.1;

    return Math.round(delay + jitter);
  }

  // ============================================================================
  // Event System
  // ============================================================================

  /**
   * Subscribe to queue events
   */
  subscribe(listener: QueueEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Emit an event to all listeners
   */
  private emit(
    event: QueueEventType,
    data?: { message?: QueuedMessage; error?: string; count?: number },
  ): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event, data);
      } catch (error) {
        logger.error("[OfflineQueue] Listener error:", error);
      }
    });
  }

  // ============================================================================
  // Persistence
  // ============================================================================

  /**
   * Load queue from localStorage
   */
  private loadFromStorage(): void {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const stored = localStorage.getItem(this.config.storageKey);
      if (!stored) {
        return;
      }

      const state: QueueState = JSON.parse(stored);

      // Validate version
      if (state.version !== QUEUE_VERSION) {
        this.log("Queue version mismatch, clearing stored queue");
        localStorage.removeItem(this.config.storageKey);
        return;
      }

      this.queue = state.items;
      this.log("Loaded", this.queue.length, "items from storage");
    } catch (error) {
      logger.error("[OfflineQueue] Failed to load from storage:", error);
      localStorage.removeItem(this.config.storageKey);
    }
  }

  /**
   * Save queue to localStorage
   */
  private saveToStorage(): void {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const state: QueueState = {
        items: this.queue,
        version: QUEUE_VERSION,
      };

      localStorage.setItem(this.config.storageKey, JSON.stringify(state));
    } catch (error) {
      logger.error("[OfflineQueue] Failed to save to storage:", error);
    }
  }

  // ============================================================================
  // Connection Handling
  // ============================================================================

  /**
   * Set up connection state listener
   */
  private setupConnectionListener(): void {
    const unsub = realtimeClient.onConnectionStateChange(
      (state: RealtimeConnectionState) => {
        if (state === "connected" || state === "authenticated") {
          // Flush queue on reconnection
          if (this.queue.length > 0) {
            this.log("Connection established, flushing queue");
            this.scheduleFlush(500); // Small delay to let connection stabilize
          }
        }
      },
    );

    this.unsubscribers.push(unsub);
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `q_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Log message if debug enabled
   */
  private log(...args: unknown[]): void {
    if (this.config.debug) {
      // REMOVED: console.log('[OfflineQueue]', ...args)
    }
  }

  /**
   * Check if initialized
   */
  get initialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Check if currently flushing
   */
  get flushing(): boolean {
    return this.isFlushing;
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

let offlineQueueInstance: OfflineQueueService | null = null;

/**
 * Get the offline queue service instance
 */
export function getOfflineQueueService(
  config?: OfflineQueueConfig,
): OfflineQueueService {
  if (!offlineQueueInstance) {
    offlineQueueInstance = new OfflineQueueService(config);
  }
  return offlineQueueInstance;
}

/**
 * Initialize the offline queue service
 */
export function initializeOfflineQueue(
  config?: OfflineQueueConfig,
): OfflineQueueService {
  const service = getOfflineQueueService(config);
  service.initialize();
  return service;
}

/**
 * Reset the offline queue service
 */
export function resetOfflineQueue(): void {
  if (offlineQueueInstance) {
    offlineQueueInstance.destroy();
    offlineQueueInstance = null;
  }
}

export { OfflineQueueService };
export default OfflineQueueService;
