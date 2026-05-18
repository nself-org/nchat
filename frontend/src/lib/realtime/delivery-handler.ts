/**
 * Message Delivery WebSocket Handler
 *
 * Handles WebSocket events for message delivery status updates.
 * Integrates with the delivery status store to track message states.
 */

import { socketManager } from "./socket-manager";
import {
  SOCKET_EVENTS,
  type MessageSentPayload,
  type MessageDeliveredPayload,
  type MessageReadPayload,
  type MessageFailedPayload,
} from "./events";
import {
  useDeliveryStatusStore,
  handleMessageSent,
  handleMessageDelivered,
  handleMessageRead,
  handleMessageFailed,
} from "@/lib/messages/delivery-status";

// ============================================================================
// Types
// ============================================================================

export interface PendingMessage {
  clientMessageId: string;
  channelId: string;
  content: string;
  attachmentIds?: string[];
  replyToId?: string;
  timestamp: Date;
  retryCount: number;
}

export interface DeliveryHandlerOptions {
  /** Maximum retry attempts for failed messages */
  maxRetries?: number;
  /** Base delay for exponential backoff (ms) */
  baseRetryDelay?: number;
  /** Maximum delay for exponential backoff (ms) */
  maxRetryDelay?: number;
  /** Timeout for message acknowledgement (ms) */
  ackTimeout?: number;
  /** Callback when message is sent */
  onMessageSent?: (clientMessageId: string, messageId: string) => void;
  /** Callback when message fails */
  onMessageFailed?: (clientMessageId: string, error: string) => void;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_OPTIONS: Required<DeliveryHandlerOptions> = {
  maxRetries: 3,
  baseRetryDelay: 1000,
  maxRetryDelay: 30000,
  ackTimeout: 10000,
  onMessageSent: () => {},
  onMessageFailed: () => {},
};

// ============================================================================
// Delivery Handler Class
// ============================================================================

class MessageDeliveryHandler {
  private options: Required<DeliveryHandlerOptions>;
  private pendingMessages: Map<string, PendingMessage> = new Map();
  private ackTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private retryTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private isInitialized = false;

  constructor(options: DeliveryHandlerOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Initialize the delivery handler and set up WebSocket listeners
   */
  initialize(): void {
    if (this.isInitialized) return;

    // Set up WebSocket event listeners
    socketManager.on<MessageSentPayload>(
      SOCKET_EVENTS.MESSAGE_SENT,
      this.handleSentEvent.bind(this),
    );

    socketManager.on<MessageDeliveredPayload>(
      SOCKET_EVENTS.MESSAGE_DELIVERED,
      this.handleDeliveredEvent.bind(this),
    );

    socketManager.on<MessageReadPayload>(
      SOCKET_EVENTS.MESSAGE_READ,
      this.handleReadEvent.bind(this),
    );

    socketManager.on<MessageFailedPayload>(
      SOCKET_EVENTS.MESSAGE_FAILED,
      this.handleFailedEvent.bind(this),
    );

    this.isInitialized = true;
  }

  /**
   * Clean up and remove WebSocket listeners
   */
  cleanup(): void {
    // Clear all timeouts
    this.ackTimeouts.forEach((timeout) => clearTimeout(timeout));
    this.retryTimeouts.forEach((timeout) => clearTimeout(timeout));
    this.ackTimeouts.clear();
    this.retryTimeouts.clear();
    this.pendingMessages.clear();
    this.isInitialized = false;
  }

  /**
   * Track a message that's being sent
   */
  trackMessage(message: PendingMessage): void {
    this.pendingMessages.set(message.clientMessageId, message);

    // Mark as sending in the store
    useDeliveryStatusStore.getState().markSending(message.clientMessageId);

    // Set up ACK timeout
    const timeout = setTimeout(() => {
      this.handleAckTimeout(message.clientMessageId);
    }, this.options.ackTimeout);

    this.ackTimeouts.set(message.clientMessageId, timeout);
  }

  /**
   * Get a pending message by client ID
   */
  getPendingMessage(clientMessageId: string): PendingMessage | undefined {
    return this.pendingMessages.get(clientMessageId);
  }

  /**
   * Remove a pending message
   */
  removePendingMessage(clientMessageId: string): void {
    this.pendingMessages.delete(clientMessageId);
    this.clearTimeouts(clientMessageId);
  }

  /**
   * Retry sending a failed message
   */
  retryMessage(clientMessageId: string): boolean {
    const pending = this.pendingMessages.get(clientMessageId);
    if (!pending) return false;

    if (pending.retryCount >= this.options.maxRetries) {
      // Max retries reached, mark as permanently failed
      handleMessageFailed(clientMessageId, "Maximum retry attempts reached");
      this.removePendingMessage(clientMessageId);
      return false;
    }

    // Increment retry count
    pending.retryCount++;
    this.pendingMessages.set(clientMessageId, pending);

    // Calculate delay with exponential backoff
    const delay = this.calculateRetryDelay(pending.retryCount);

    // Schedule retry
    const timeout = setTimeout(() => {
      this.executeRetry(clientMessageId);
    }, delay);

    this.retryTimeouts.set(clientMessageId, timeout);

    // Update store
    useDeliveryStatusStore.getState().incrementRetryCount(clientMessageId);
    useDeliveryStatusStore.getState().markSending(clientMessageId);

    return true;
  }

  /**
   * Get all failed messages that can be retried
   */
  getRetryableMessages(): PendingMessage[] {
    return Array.from(this.pendingMessages.values()).filter(
      (msg) => msg.retryCount < this.options.maxRetries,
    );
  }

  /**
   * Retry all failed messages
   */
  retryAllFailed(): void {
    const retryable = this.getRetryableMessages();
    retryable.forEach((msg) => this.retryMessage(msg.clientMessageId));
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private handleSentEvent(payload: MessageSentPayload): void {
    const { clientMessageId, messageId, sentAt } = payload;

    // Clear ACK timeout
    this.clearAckTimeout(clientMessageId);

    // Update store
    handleMessageSent(clientMessageId);

    // Call callback
    this.options.onMessageSent(clientMessageId, messageId);

    // Keep tracking for delivery/read status using server message ID
    const pending = this.pendingMessages.get(clientMessageId);
    if (pending) {
      // Map server message ID to the pending message for delivery tracking
      this.pendingMessages.set(messageId, { ...pending, clientMessageId });
      this.pendingMessages.delete(clientMessageId);
    }
  }

  private handleDeliveredEvent(payload: MessageDeliveredPayload): void {
    const { messageId, deliveredCount, totalRecipients, deliveredAt } = payload;

    handleMessageDelivered(messageId, deliveredCount, totalRecipients);
  }

  private handleReadEvent(payload: MessageReadPayload): void {
    const { messageId, userId, readCount, totalRecipients, readAt } = payload;

    handleMessageRead(
      messageId,
      userId,
      new Date(readAt),
      readCount,
      totalRecipients,
    );
  }

  private handleFailedEvent(payload: MessageFailedPayload): void {
    const { clientMessageId, errorCode, errorMessage, retryable } = payload;

    // Clear ACK timeout
    this.clearAckTimeout(clientMessageId);

    if (retryable) {
      // Attempt retry
      const retried = this.retryMessage(clientMessageId);
      if (!retried) {
        handleMessageFailed(clientMessageId, errorMessage);
        this.options.onMessageFailed(clientMessageId, errorMessage);
      }
    } else {
      // Non-retryable error
      handleMessageFailed(clientMessageId, errorMessage);
      this.removePendingMessage(clientMessageId);
      this.options.onMessageFailed(clientMessageId, errorMessage);
    }
  }

  private handleAckTimeout(clientMessageId: string): void {
    const pending = this.pendingMessages.get(clientMessageId);
    if (!pending) return;

    // Connection might be lost, attempt retry
    const retried = this.retryMessage(clientMessageId);
    if (!retried) {
      handleMessageFailed(clientMessageId, "Message acknowledgement timeout");
      this.options.onMessageFailed(
        clientMessageId,
        "Message acknowledgement timeout",
      );
    }
  }

  private calculateRetryDelay(retryCount: number): number {
    // Exponential backoff with jitter
    const exponentialDelay =
      this.options.baseRetryDelay * Math.pow(2, retryCount - 1);
    const jitter = Math.random() * 0.3 * exponentialDelay; // 0-30% jitter
    const delay = exponentialDelay + jitter;

    return Math.min(delay, this.options.maxRetryDelay);
  }

  private executeRetry(clientMessageId: string): void {
    const pending = this.pendingMessages.get(clientMessageId);
    if (!pending) return;

    // Clear retry timeout
    this.clearRetryTimeout(clientMessageId);

    // Re-emit the message via socket
    socketManager.emit(SOCKET_EVENTS.MESSAGE_NEW, {
      clientMessageId: pending.clientMessageId,
      channelId: pending.channelId,
      content: pending.content,
      attachmentIds: pending.attachmentIds,
      replyToId: pending.replyToId,
    });

    // Set up new ACK timeout
    const timeout = setTimeout(() => {
      this.handleAckTimeout(clientMessageId);
    }, this.options.ackTimeout);

    this.ackTimeouts.set(clientMessageId, timeout);
  }

  private clearTimeouts(clientMessageId: string): void {
    this.clearAckTimeout(clientMessageId);
    this.clearRetryTimeout(clientMessageId);
  }

  private clearAckTimeout(clientMessageId: string): void {
    const timeout = this.ackTimeouts.get(clientMessageId);
    if (timeout) {
      clearTimeout(timeout);
      this.ackTimeouts.delete(clientMessageId);
    }
  }

  private clearRetryTimeout(clientMessageId: string): void {
    const timeout = this.retryTimeouts.get(clientMessageId);
    if (timeout) {
      clearTimeout(timeout);
      this.retryTimeouts.delete(clientMessageId);
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const deliveryHandler = new MessageDeliveryHandler();

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a unique client message ID
 */
export function generateClientMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a pending message object
 */
export function createPendingMessage(
  channelId: string,
  content: string,
  options?: {
    attachmentIds?: string[];
    replyToId?: string;
  },
): PendingMessage {
  return {
    clientMessageId: generateClientMessageId(),
    channelId,
    content,
    attachmentIds: options?.attachmentIds,
    replyToId: options?.replyToId,
    timestamp: new Date(),
    retryCount: 0,
  };
}

export default deliveryHandler;
