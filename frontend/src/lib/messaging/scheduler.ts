/**
 * Message Scheduler
 *
 * Production-ready message scheduling system with job queue, retry logic,
 * and failure handling.
 */

import { logger } from "@/lib/logger";

export interface ScheduledMessage {
  id: string;
  channelId: string;
  userId: string;
  content: string;
  scheduledAt: number; // Unix timestamp
  status: "pending" | "processing" | "sent" | "failed" | "cancelled";
  replyToId?: string;
  threadId?: string;
  attachments?: unknown[];
  mentions?: unknown[];
  metadata?: Record<string, unknown>;
  retryCount: number;
  maxRetries: number;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

export interface SchedulerConfig {
  pollInterval: number; // How often to check for due messages (ms)
  maxRetries: number; // Maximum retry attempts
  retryDelay: number; // Delay between retries (ms)
  batchSize: number; // Number of messages to process per batch
  gracePeriod: number; // Grace period before scheduled time (ms)
}

export interface SendMessageFunction {
  (
    message: Omit<
      ScheduledMessage,
      "id" | "status" | "retryCount" | "createdAt" | "updatedAt"
    >,
  ): Promise<{ id: string }>;
}

export interface SchedulerCallbacks {
  onMessageSent?: (message: ScheduledMessage) => void;
  onMessageFailed?: (message: ScheduledMessage, error: Error) => void;
  onMessageCancelled?: (message: ScheduledMessage) => void;
}

const DEFAULT_CONFIG: SchedulerConfig = {
  pollInterval: 30000, // 30 seconds
  maxRetries: 3,
  retryDelay: 60000, // 1 minute
  batchSize: 10,
  gracePeriod: 5000, // 5 seconds
};

/**
 * Message Scheduler Service
 *
 * Handles scheduling, queueing, and sending of scheduled messages
 */
export class MessageScheduler {
  private config: SchedulerConfig;
  private queue: Map<string, ScheduledMessage> = new Map();
  private processingTimer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private sendMessage: SendMessageFunction;
  private callbacks: SchedulerCallbacks;

  constructor(
    sendMessage: SendMessageFunction,
    config: Partial<SchedulerConfig> = {},
    callbacks: SchedulerCallbacks = {},
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sendMessage = sendMessage;
    this.callbacks = callbacks;
    this.loadFromStorage();
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.isRunning) {
      logger.warn("Scheduler already running");
      return;
    }

    this.isRunning = true;
    logger.info("Message scheduler started", {
      pollInterval: this.config.pollInterval,
      queueSize: this.queue.size,
    });

    this.processQueue();
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      logger.warn("Scheduler not running");
      return;
    }

    this.isRunning = false;
    if (this.processingTimer) {
      clearTimeout(this.processingTimer);
      this.processingTimer = null;
    }

    logger.info("Message scheduler stopped", { queueSize: this.queue.size });
  }

  /**
   * Schedule a new message
   */
  async scheduleMessage(
    message: Omit<
      ScheduledMessage,
      "id" | "status" | "retryCount" | "createdAt" | "updatedAt"
    >,
  ): Promise<ScheduledMessage> {
    const now = Date.now();
    const scheduledMessage: ScheduledMessage = {
      ...message,
      id: this.generateId(),
      status: "pending",
      retryCount: 0,
      maxRetries: message.maxRetries ?? this.config.maxRetries,
      createdAt: now,
      updatedAt: now,
    };

    // Validate scheduled time
    if (scheduledMessage.scheduledAt <= now) {
      throw new Error("Scheduled time must be in the future");
    }

    this.queue.set(scheduledMessage.id, scheduledMessage);
    this.saveToStorage();

    logger.info("Message scheduled", {
      id: scheduledMessage.id,
      channelId: scheduledMessage.channelId,
      scheduledAt: new Date(scheduledMessage.scheduledAt).toISOString(),
    });

    return scheduledMessage;
  }

  /**
   * Update a scheduled message
   */
  async updateScheduledMessage(
    messageId: string,
    updates: Partial<
      Pick<
        ScheduledMessage,
        "content" | "scheduledAt" | "attachments" | "mentions"
      >
    >,
  ): Promise<ScheduledMessage> {
    const message = this.queue.get(messageId);
    if (!message) {
      throw new Error("Scheduled message not found");
    }

    if (message.status !== "pending") {
      throw new Error(`Cannot update message with status: ${message.status}`);
    }

    const updatedMessage: ScheduledMessage = {
      ...message,
      ...updates,
      updatedAt: Date.now(),
    };

    this.queue.set(messageId, updatedMessage);
    this.saveToStorage();

    logger.info("Scheduled message updated", { id: messageId, updates });

    return updatedMessage;
  }

  /**
   * Cancel a scheduled message
   */
  async cancelScheduledMessage(messageId: string): Promise<void> {
    const message = this.queue.get(messageId);
    if (!message) {
      throw new Error("Scheduled message not found");
    }

    if (message.status === "sent") {
      throw new Error("Cannot cancel a message that has already been sent");
    }

    message.status = "cancelled";
    message.updatedAt = Date.now();
    this.queue.set(messageId, message);
    this.saveToStorage();

    logger.info("Scheduled message cancelled", { id: messageId });

    this.callbacks.onMessageCancelled?.(message);
  }

  /**
   * Send a scheduled message immediately
   */
  async sendNow(messageId: string): Promise<void> {
    const message = this.queue.get(messageId);
    if (!message) {
      throw new Error("Scheduled message not found");
    }

    if (message.status !== "pending") {
      throw new Error(`Cannot send message with status: ${message.status}`);
    }

    logger.info("Sending scheduled message immediately", { id: messageId });

    await this.processSingleMessage(message);
  }

  /**
   * Get a scheduled message by ID
   */
  getScheduledMessage(messageId: string): ScheduledMessage | undefined {
    return this.queue.get(messageId);
  }

  /**
   * Get all scheduled messages for a channel
   */
  getChannelScheduledMessages(
    channelId: string,
    includeAll = false,
  ): ScheduledMessage[] {
    return Array.from(this.queue.values()).filter(
      (msg) =>
        msg.channelId === channelId &&
        (includeAll || msg.status === "pending" || msg.status === "processing"),
    );
  }

  /**
   * Get all scheduled messages for a user
   */
  getUserScheduledMessages(
    userId: string,
    includeAll = false,
  ): ScheduledMessage[] {
    return Array.from(this.queue.values()).filter(
      (msg) =>
        msg.userId === userId &&
        (includeAll || msg.status === "pending" || msg.status === "processing"),
    );
  }

  /**
   * Get all scheduled messages
   */
  getAllScheduledMessages(): ScheduledMessage[] {
    return Array.from(this.queue.values());
  }

  /**
   * Clear completed and cancelled messages
   */
  clearCompleted(): number {
    let cleared = 0;
    const now = Date.now();
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000; // 7 days

    for (const [id, message] of this.queue.entries()) {
      if (
        (message.status === "sent" ||
          message.status === "cancelled" ||
          message.status === "failed") &&
        message.updatedAt < oneWeekAgo
      ) {
        this.queue.delete(id);
        cleared++;
      }
    }

    if (cleared > 0) {
      this.saveToStorage();
      logger.info("Cleared completed messages", { count: cleared });
    }

    return cleared;
  }

  /**
   * Process the message queue
   */
  private async processQueue(): Promise<void> {
    if (!this.isRunning) return;

    try {
      const now = Date.now();
      const dueMessages = Array.from(this.queue.values())
        .filter(
          (msg) =>
            msg.status === "pending" &&
            msg.scheduledAt - this.config.gracePeriod <= now,
        )
        .sort((a, b) => a.scheduledAt - b.scheduledAt)
        .slice(0, this.config.batchSize);

      if (dueMessages.length > 0) {
        logger.info("Processing due messages", { count: dueMessages.length });

        for (const message of dueMessages) {
          await this.processSingleMessage(message);
        }
      }
    } catch (error) {
      logger.error("Error processing message queue", error as Error);
    } finally {
      // Schedule next processing cycle
      if (this.isRunning) {
        this.processingTimer = setTimeout(() => {
          this.processQueue();
        }, this.config.pollInterval);
      }
    }
  }

  /**
   * Process a single message
   */
  private async processSingleMessage(message: ScheduledMessage): Promise<void> {
    try {
      // Mark as processing
      message.status = "processing";
      message.updatedAt = Date.now();
      this.queue.set(message.id, message);
      this.saveToStorage();

      logger.info("Sending scheduled message", {
        id: message.id,
        channelId: message.channelId,
        scheduledAt: new Date(message.scheduledAt).toISOString(),
      });

      // Send the message
      await this.sendMessage({
        channelId: message.channelId,
        userId: message.userId,
        content: message.content,
        scheduledAt: message.scheduledAt,
        replyToId: message.replyToId,
        threadId: message.threadId,
        attachments: message.attachments,
        mentions: message.mentions,
        metadata: {
          ...message.metadata,
          wasScheduled: true,
          originalScheduledAt: message.scheduledAt,
        },
        maxRetries: message.maxRetries,
      });

      // Mark as sent
      message.status = "sent";
      message.updatedAt = Date.now();
      this.queue.set(message.id, message);
      this.saveToStorage();

      logger.info("Scheduled message sent successfully", { id: message.id });

      this.callbacks.onMessageSent?.(message);
    } catch (error) {
      await this.handleSendError(message, error as Error);
    }
  }

  /**
   * Handle send error with retry logic
   */
  private async handleSendError(
    message: ScheduledMessage,
    error: Error,
  ): Promise<void> {
    message.retryCount++;
    message.error = error.message;
    message.updatedAt = Date.now();

    if (message.retryCount < message.maxRetries) {
      // Schedule retry
      message.status = "pending";
      message.scheduledAt = Date.now() + this.config.retryDelay;

      logger.warn("Scheduled message failed, will retry", {
        id: message.id,
        retryCount: message.retryCount,
        maxRetries: message.maxRetries,
        nextRetry: new Date(message.scheduledAt).toISOString(),
        error: error.message,
      });
    } else {
      // Mark as failed
      message.status = "failed";

      logger.error("Scheduled message failed permanently", error, {
        id: message.id,
        retryCount: message.retryCount,
      });

      this.callbacks.onMessageFailed?.(message, error);
    }

    this.queue.set(message.id, message);
    this.saveToStorage();
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `sched_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Save queue to localStorage
   */
  private saveToStorage(): void {
    try {
      if (typeof window === "undefined") return;

      const data = Array.from(this.queue.entries());
      localStorage.setItem("nchat_scheduled_messages", JSON.stringify(data));
    } catch (error) {
      logger.error(
        "Failed to save scheduled messages to storage",
        error as Error,
      );
    }
  }

  /**
   * Load queue from localStorage
   */
  private loadFromStorage(): void {
    try {
      if (typeof window === "undefined") return;

      const data = localStorage.getItem("nchat_scheduled_messages");
      if (data) {
        const entries: [string, ScheduledMessage][] = JSON.parse(data);
        this.queue = new Map(entries);

        logger.info("Loaded scheduled messages from storage", {
          count: this.queue.size,
        });

        // Clean up old messages
        this.clearCompleted();
      }
    } catch (error) {
      logger.error(
        "Failed to load scheduled messages from storage",
        error as Error,
      );
      this.queue = new Map();
    }
  }
}

/**
 * Create a singleton scheduler instance
 */
let schedulerInstance: MessageScheduler | null = null;

export function getScheduler(
  sendMessage: SendMessageFunction,
  config?: Partial<SchedulerConfig>,
  callbacks?: SchedulerCallbacks,
): MessageScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new MessageScheduler(sendMessage, config, callbacks);
  }
  return schedulerInstance;
}

/**
 * Destroy the scheduler instance
 */
export function destroyScheduler(): void {
  if (schedulerInstance) {
    schedulerInstance.stop();
    schedulerInstance = null;
  }
}
