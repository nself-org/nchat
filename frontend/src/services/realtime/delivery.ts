/**
 * Delivery Event Handler Service
 *
 * Handles real-time delivery status events from Socket.io.
 * Processes message sent, delivered, read, and failed events.
 *
 * @module services/realtime/delivery
 * @version 1.0.0
 */

import { socketManager } from "@/lib/realtime/socket-manager";
import { SOCKET_EVENTS } from "@/lib/realtime/events";
import type {
  MessageSentPayload,
  MessageDeliveredPayload,
  MessageReadPayload,
  MessageFailedPayload,
} from "@/lib/realtime/events";

import { logger } from "@/lib/logger";
import {
  useDeliveryStateStore,
  markSending,
  markSent,
  markDelivered,
  markRead,
  markFailed,
  createDeliveryRecord,
} from "@/lib/messaging/delivery-state";

// ============================================================================
// Types
// ============================================================================

/**
 * Delivery event types
 */
export type DeliveryEventType =
  | "message:sent"
  | "message:delivered"
  | "message:read"
  | "message:failed"
  | "message:ack";

/**
 * Batch read event payload
 */
export interface BatchReadPayload {
  channelId: string;
  userId: string;
  messageIds: string[];
  readAt: string;
}

/**
 * Delivery sync request
 */
export interface DeliverySyncRequest {
  messageIds: string[];
  since?: string;
}

/**
 * Delivery sync response
 */
export interface DeliverySyncResponse {
  statuses: Array<{
    messageId: string;
    state: "sent" | "delivered" | "read" | "failed";
    deliveredCount?: number;
    readCount?: number;
    totalRecipients?: number;
    updatedAt: string;
  }>;
}

/**
 * Delivery event listener
 */
export type DeliveryEventListener = (
  event: DeliveryEventType,
  data: unknown,
) => void;

/**
 * Delivery handler configuration
 */
export interface DeliveryHandlerConfig {
  /** Enable debug logging */
  debug?: boolean;
  /** Auto-sync on reconnect */
  autoSyncOnReconnect?: boolean;
  /** Batch read acknowledgements */
  batchReadAck?: boolean;
  /** Batch read interval (ms) */
  batchReadInterval?: number;
}

// ============================================================================
// Delivery Event Handler Class
// ============================================================================

/**
 * DeliveryEventHandler - Manages real-time delivery status updates
 */
export class DeliveryEventHandler {
  private config: Required<DeliveryHandlerConfig>;
  private listeners: Set<DeliveryEventListener> = new Set();
  private unsubscribers: Array<() => void> = [];
  private pendingReadAcks: Map<string, Set<string>> = new Map(); // channelId -> messageIds
  private readAckTimer: ReturnType<typeof setTimeout> | null = null;
  private isInitialized = false;

  constructor(config: DeliveryHandlerConfig = {}) {
    this.config = {
      debug: config.debug ?? false,
      autoSyncOnReconnect: config.autoSyncOnReconnect ?? true,
      batchReadAck: config.batchReadAck ?? true,
      batchReadInterval: config.batchReadInterval ?? 1000,
    };
  }

  /**
   * Initialize the delivery event handler
   */
  initialize(): void {
    if (this.isInitialized) {
      return;
    }

    this.setupSocketListeners();
    this.isInitialized = true;
    this.log("Delivery event handler initialized");
  }

  /**
   * Destroy the delivery event handler
   */
  destroy(): void {
    // Flush pending read acks
    this.flushPendingReadAcks();

    // Cleanup timers
    if (this.readAckTimer) {
      clearTimeout(this.readAckTimer);
      this.readAckTimer = null;
    }

    // Cleanup socket listeners
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];

    // Clear listeners
    this.listeners.clear();

    this.isInitialized = false;
    this.log("Delivery event handler destroyed");
  }

  /**
   * Check if initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  // ===========================================================================
  // Event Subscription
  // ===========================================================================

  /**
   * Subscribe to delivery events
   */
  subscribe(listener: DeliveryEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Emit an event to all listeners
   */
  private emit(event: DeliveryEventType, data: unknown): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event, data);
      } catch (error) {
        logger.error("[DeliveryHandler] Listener error:", error);
      }
    });
  }

  // ===========================================================================
  // Message Sending
  // ===========================================================================

  /**
   * Track a new outgoing message
   */
  trackOutgoingMessage(
    clientMessageId: string,
    channelId: string,
    totalRecipients: number = 1,
  ): void {
    createDeliveryRecord(
      clientMessageId,
      channelId,
      clientMessageId,
      totalRecipients,
    );
    markSending(clientMessageId);
    this.log(`Tracking outgoing message: ${clientMessageId}`);
  }

  /**
   * Send a read acknowledgement for a message
   */
  acknowledgeRead(messageId: string, channelId: string): void {
    if (this.config.batchReadAck) {
      // Add to batch
      if (!this.pendingReadAcks.has(channelId)) {
        this.pendingReadAcks.set(channelId, new Set());
      }
      this.pendingReadAcks.get(channelId)!.add(messageId);

      // Schedule flush
      this.scheduleBatchReadAck();
    } else {
      // Send immediately
      this.sendReadAck(messageId, channelId);
    }
  }

  /**
   * Request delivery status sync for specific messages
   */
  async syncDeliveryStatus(messageIds: string[]): Promise<void> {
    if (!socketManager.isConnected) {
      this.log("Socket not connected, skipping sync");
      return;
    }

    socketManager.emit(
      "delivery:sync" as never,
      { messageIds } as DeliverySyncRequest,
    );
    this.log(`Requested sync for ${messageIds.length} messages`);
  }

  // ===========================================================================
  // Socket Event Handlers
  // ===========================================================================

  /**
   * Setup socket event listeners
   */
  private setupSocketListeners(): void {
    // Message sent acknowledgement
    const unsubSent = socketManager.on<MessageSentPayload>(
      SOCKET_EVENTS.MESSAGE_SENT,
      this.handleMessageSent.bind(this),
    );
    this.unsubscribers.push(unsubSent);

    // Message delivered
    const unsubDelivered = socketManager.on<MessageDeliveredPayload>(
      SOCKET_EVENTS.MESSAGE_DELIVERED,
      this.handleMessageDelivered.bind(this),
    );
    this.unsubscribers.push(unsubDelivered);

    // Message read
    const unsubRead = socketManager.on<MessageReadPayload>(
      SOCKET_EVENTS.MESSAGE_READ,
      this.handleMessageRead.bind(this),
    );
    this.unsubscribers.push(unsubRead);

    // Message failed
    const unsubFailed = socketManager.on<MessageFailedPayload>(
      SOCKET_EVENTS.MESSAGE_FAILED,
      this.handleMessageFailed.bind(this),
    );
    this.unsubscribers.push(unsubFailed);

    // Message ack (generic acknowledgement)
    const unsubAck = socketManager.on<{ messageId: string; status: string }>(
      SOCKET_EVENTS.MESSAGE_ACK,
      this.handleMessageAck.bind(this),
    );
    this.unsubscribers.push(unsubAck);

    // Batch read event
    const unsubBatchRead = socketManager.on<BatchReadPayload>(
      "message:batch-read" as never,
      this.handleBatchRead.bind(this),
    );
    this.unsubscribers.push(unsubBatchRead);

    // Delivery sync response
    const unsubSync = socketManager.on<DeliverySyncResponse>(
      "delivery:sync-response" as never,
      this.handleSyncResponse.bind(this),
    );
    this.unsubscribers.push(unsubSync);

    // Handle reconnection
    const unsubConnect = socketManager.on(
      SOCKET_EVENTS.CONNECT as never,
      this.handleReconnect.bind(this),
    );
    this.unsubscribers.push(unsubConnect);
  }

  /**
   * Handle message sent event
   */
  private handleMessageSent(payload: MessageSentPayload): void {
    this.log(
      `Message sent: ${payload.clientMessageId} -> ${payload.messageId}`,
    );

    const store = useDeliveryStateStore.getState();

    // Map client ID to server ID
    store.mapClientToServer(payload.clientMessageId, payload.messageId);

    // Transition to sent state
    markSent(payload.messageId);

    this.emit("message:sent", payload);
  }

  /**
   * Handle message delivered event
   */
  private handleMessageDelivered(payload: MessageDeliveredPayload): void {
    this.log(
      `Message delivered: ${payload.messageId} (${payload.deliveredCount}/${payload.totalRecipients})`,
    );

    // For direct messages, just mark as delivered
    // For group messages, we track the count
    markDelivered(payload.messageId);

    // Update counts if provided
    if (payload.deliveredCount !== undefined) {
      const store = useDeliveryStateStore.getState();
      const record = store.getRecord(payload.messageId);
      if (record) {
        // Update the record with new counts through state transition
        // The state machine will handle the transition
      }
    }

    this.emit("message:delivered", payload);
  }

  /**
   * Handle message read event
   */
  private handleMessageRead(payload: MessageReadPayload): void {
    this.log(
      `Message read: ${payload.messageId} by ${payload.userId} (${payload.readCount}/${payload.totalRecipients})`,
    );

    // Track who read the message
    markRead(payload.messageId, payload.userId, new Date(payload.readAt));

    this.emit("message:read", payload);
  }

  /**
   * Handle message failed event
   */
  private handleMessageFailed(payload: MessageFailedPayload): void {
    this.log(
      `Message failed: ${payload.clientMessageId} - ${payload.errorMessage}`,
    );

    // Get the server message ID if available
    const store = useDeliveryStateStore.getState();
    const record = store.getRecordByClientId(payload.clientMessageId);
    const messageId = record?.messageId ?? payload.clientMessageId;

    markFailed(messageId, payload.errorMessage);

    this.emit("message:failed", payload);
  }

  /**
   * Handle generic message acknowledgement
   */
  private handleMessageAck(payload: {
    messageId: string;
    status: string;
  }): void {
    this.log(`Message ack: ${payload.messageId} - ${payload.status}`);

    switch (payload.status) {
      case "sent":
        markSent(payload.messageId);
        break;
      case "delivered":
        markDelivered(payload.messageId);
        break;
      case "read":
        markRead(payload.messageId);
        break;
    }

    this.emit("message:ack", payload);
  }

  /**
   * Handle batch read event
   */
  private handleBatchRead(payload: BatchReadPayload): void {
    this.log(
      `Batch read: ${payload.messageIds.length} messages by ${payload.userId} in ${payload.channelId}`,
    );

    const readAt = new Date(payload.readAt);
    payload.messageIds.forEach((messageId) => {
      markRead(messageId, payload.userId, readAt);
    });
  }

  /**
   * Handle delivery sync response
   */
  private handleSyncResponse(response: DeliverySyncResponse): void {
    this.log(`Sync response received: ${response.statuses.length} statuses`);

    const store = useDeliveryStateStore.getState();

    response.statuses.forEach((status) => {
      const record = store.getRecord(status.messageId);
      if (!record) {
        // Create a placeholder record if it doesn't exist
        // This can happen if the message was sent from another device
        return;
      }

      switch (status.state) {
        case "sent":
          markSent(status.messageId);
          break;
        case "delivered":
          markDelivered(status.messageId);
          break;
        case "read":
          markRead(status.messageId);
          break;
        case "failed":
          markFailed(status.messageId, "Sync reported failure");
          break;
      }
    });
  }

  /**
   * Handle reconnection
   */
  private handleReconnect(): void {
    this.log("Socket reconnected");

    if (this.config.autoSyncOnReconnect) {
      // Sync pending and recently sent messages
      const store = useDeliveryStateStore.getState();
      const pendingMessages = store.getPendingMessages();
      const messageIds = pendingMessages.map((m) => m.messageId);

      if (messageIds.length > 0) {
        this.syncDeliveryStatus(messageIds);
      }
    }
  }

  // ===========================================================================
  // Read Acknowledgement Batching
  // ===========================================================================

  /**
   * Schedule batch read acknowledgement
   */
  private scheduleBatchReadAck(): void {
    if (this.readAckTimer) {
      return;
    }

    this.readAckTimer = setTimeout(() => {
      this.flushPendingReadAcks();
      this.readAckTimer = null;
    }, this.config.batchReadInterval);
  }

  /**
   * Flush pending read acknowledgements
   */
  private flushPendingReadAcks(): void {
    if (this.pendingReadAcks.size === 0) {
      return;
    }

    for (const [channelId, messageIds] of this.pendingReadAcks.entries()) {
      if (messageIds.size > 0) {
        this.sendBatchReadAck(Array.from(messageIds), channelId);
      }
    }

    this.pendingReadAcks.clear();
  }

  /**
   * Send single read acknowledgement
   */
  private sendReadAck(messageId: string, channelId: string): void {
    if (!socketManager.isConnected) {
      return;
    }

    socketManager.emit("message:read-ack" as never, {
      messageId,
      channelId,
      readAt: new Date().toISOString(),
    });

    this.log(`Sent read ack: ${messageId}`);
  }

  /**
   * Send batch read acknowledgement
   */
  private sendBatchReadAck(messageIds: string[], channelId: string): void {
    if (!socketManager.isConnected || messageIds.length === 0) {
      return;
    }

    socketManager.emit("message:batch-read-ack" as never, {
      messageIds,
      channelId,
      readAt: new Date().toISOString(),
    });

    this.log(
      `Sent batch read ack: ${messageIds.length} messages in ${channelId}`,
    );
  }

  // ===========================================================================
  // Utilities
  // ===========================================================================

  /**
   * Log a debug message
   */
  private log(message: string): void {
    if (this.config.debug) {
      // REMOVED: console.log(`[DeliveryHandler] ${message}`)
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let deliveryHandlerInstance: DeliveryEventHandler | null = null;

/**
 * Get the delivery event handler instance
 */
export function getDeliveryEventHandler(
  config?: DeliveryHandlerConfig,
): DeliveryEventHandler {
  if (!deliveryHandlerInstance) {
    deliveryHandlerInstance = new DeliveryEventHandler(config);
  }
  return deliveryHandlerInstance;
}

/**
 * Initialize the delivery event handler
 */
export function initializeDeliveryHandler(
  config?: DeliveryHandlerConfig,
): DeliveryEventHandler {
  const handler = getDeliveryEventHandler(config);
  handler.initialize();
  return handler;
}

/**
 * Reset the delivery event handler
 */
export function resetDeliveryHandler(): void {
  if (deliveryHandlerInstance) {
    deliveryHandlerInstance.destroy();
    deliveryHandlerInstance = null;
  }
}

export default DeliveryEventHandler;
