/**
 * Webhook Queue Service
 *
 * Manages outgoing and incoming webhooks using BullMQ and Redis.
 * Provides retry logic, rate limiting, and webhook delivery tracking.
 */

import {
  Queue,
  Worker,
  QueueEvents,
  Job,
  type ConnectionOptions,
} from "bullmq";
import { Redis } from "ioredis";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface OutgoingWebhookPayload {
  id: string;
  url: string;
  event: string;
  data: Record<string, unknown>;
  headers?: Record<string, string>;
  secret?: string;
  retryCount?: number;
  maxRetries?: number;
}

export interface WebhookDeliveryResult {
  success: boolean;
  statusCode?: number;
  response?: string;
  error?: string;
  attemptNumber: number;
  timestamp: string;
  duration: number;
}

export interface WebhookQueueConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  concurrency?: number;
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  rateLimit?: {
    max: number;
    duration: number;
  };
}

export interface WebhookStats {
  total: number;
  pending: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

// ============================================================================
// Webhook Queue Manager
// ============================================================================

/**
 * WebhookQueueManager handles all webhook delivery via Redis queue
 */
export class WebhookQueueManager {
  private redis: Redis;
  private queue: Queue<OutgoingWebhookPayload>;
  private worker: Worker<OutgoingWebhookPayload, WebhookDeliveryResult>;
  private events: QueueEvents;
  private config: WebhookQueueConfig;
  private deliveryCallbacks: Map<
    string,
    (result: WebhookDeliveryResult) => void
  > = new Map();

  constructor(config: WebhookQueueConfig) {
    this.config = {
      concurrency: 10,
      maxRetries: 3,
      retryDelay: 5000, // 5 seconds
      timeout: 30000, // 30 seconds
      ...config,
    };

    // Initialize Redis connection
    this.redis = new Redis({
      host: this.config.redis.host,
      port: this.config.redis.port,
      password: this.config.redis.password,
      db: this.config.redis.db || 0,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

    // Initialize queue
    this.queue = new Queue<OutgoingWebhookPayload>("webhooks", {
      connection: this.redis as unknown as ConnectionOptions,
      defaultJobOptions: {
        attempts: this.config.maxRetries,
        backoff: {
          type: "exponential",
          delay: this.config.retryDelay,
        },
        removeOnComplete: {
          age: 24 * 60 * 60, // Keep completed jobs for 24 hours
          count: 1000, // Keep last 1000 jobs
        },
        removeOnFail: {
          age: 7 * 24 * 60 * 60, // Keep failed jobs for 7 days
        },
      },
    });

    // Initialize worker
    this.worker = new Worker<OutgoingWebhookPayload, WebhookDeliveryResult>(
      "webhooks",
      async (job: Job<OutgoingWebhookPayload>) => {
        return this.processWebhook(job);
      },
      {
        connection: this.redis.duplicate() as unknown as ConnectionOptions,
        concurrency: this.config.concurrency,
      },
    );

    // Initialize events
    this.events = new QueueEvents("webhooks", {
      connection: this.redis.duplicate() as unknown as ConnectionOptions,
    });

    // Setup event listeners
    this.setupEventListeners();
  }

  /**
   * Setup queue event listeners
   */
  private setupEventListeners(): void {
    this.worker.on(
      "completed",
      (job: Job<OutgoingWebhookPayload>, result: WebhookDeliveryResult) => {
        // REMOVED: console.log(`Webhook ${job.data.id} delivered successfully to ${job.data.url}`)
        const callback = this.deliveryCallbacks.get(job.data.id);
        if (callback) {
          callback(result);
          this.deliveryCallbacks.delete(job.data.id);
        }
      },
    );

    this.worker.on(
      "failed",
      (job: Job<OutgoingWebhookPayload> | undefined, error: Error) => {
        if (job) {
          logger.error(`Webhook ${job.data.id} failed:`, error.message);
          const result: WebhookDeliveryResult = {
            success: false,
            error: error.message,
            attemptNumber: job.attemptsMade,
            timestamp: new Date().toISOString(),
            duration: 0,
          };
          const callback = this.deliveryCallbacks.get(job.data.id);
          if (callback) {
            callback(result);
            this.deliveryCallbacks.delete(job.data.id);
          }
        }
      },
    );

    this.worker.on("error", (error: Error) => {
      logger.error("Webhook worker error:", error);
    });
  }

  /**
   * Process a webhook delivery job
   */
  private async processWebhook(
    job: Job<OutgoingWebhookPayload>,
  ): Promise<WebhookDeliveryResult> {
    const startTime = Date.now();
    const payload = job.data;

    try {
      // Prepare headers
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "User-Agent": "nself-chat-webhook/1.0",
        "X-Webhook-ID": payload.id,
        "X-Webhook-Event": payload.event,
        "X-Webhook-Attempt": String(job.attemptsMade + 1),
        ...payload.headers,
      };

      // Add signature if secret is provided
      if (payload.secret) {
        const signature = await this.generateSignature(
          JSON.stringify(payload.data),
          payload.secret,
        );
        headers["X-Webhook-Signature"] = `sha256=${signature}`;
      }

      // Make the HTTP request
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.config.timeout,
      );

      const response = await fetch(payload.url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload.data),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const duration = Date.now() - startTime;
      const responseText = await response.text();

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}: ${response.statusText} - ${responseText.slice(0, 200)}`,
        );
      }

      return {
        success: true,
        statusCode: response.status,
        response: responseText.slice(0, 1000), // Limit response size
        attemptNumber: job.attemptsMade + 1,
        timestamp: new Date().toISOString(),
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      return {
        success: false,
        error: errorMessage,
        attemptNumber: job.attemptsMade + 1,
        timestamp: new Date().toISOString(),
        duration,
      };
    }
  }

  /**
   * Generate HMAC-SHA256 signature for webhook payload
   */
  private async generateSignature(
    payload: string,
    secret: string,
  ): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );

    const signature = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(payload),
    );
    return Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  // ==========================================================================
  // Public API
  // ==========================================================================

  /**
   * Send a webhook (add to queue)
   */
  async sendWebhook(
    payload: OutgoingWebhookPayload,
    onComplete?: (result: WebhookDeliveryResult) => void,
  ): Promise<string> {
    if (onComplete) {
      this.deliveryCallbacks.set(payload.id, onComplete);
    }

    const job = await this.queue.add("deliver", payload, {
      jobId: payload.id,
      attempts: payload.maxRetries || this.config.maxRetries,
    });

    return job.id || payload.id;
  }

  /**
   * Send multiple webhooks in batch
   */
  async sendWebhookBatch(
    payloads: OutgoingWebhookPayload[],
  ): Promise<string[]> {
    const jobs = await this.queue.addBulk(
      payloads.map((payload) => ({
        name: "deliver",
        data: payload,
        opts: {
          jobId: payload.id,
          attempts: payload.maxRetries || this.config.maxRetries,
        },
      })),
    );

    return jobs.map((job) => job.id || "");
  }

  /**
   * Get webhook job status
   */
  async getWebhookStatus(jobId: string): Promise<{
    state: string;
    progress: string | boolean | number | object;
    attemptsMade: number;
    result?: WebhookDeliveryResult;
    failedReason?: string;
  } | null> {
    const job = await this.queue.getJob(jobId);
    if (!job) {
      return null;
    }

    const state = await job.getState();
    return {
      state,
      progress: job.progress,
      attemptsMade: job.attemptsMade,
      result: job.returnvalue,
      failedReason: job.failedReason,
    };
  }

  /**
   * Cancel a webhook job
   */
  async cancelWebhook(jobId: string): Promise<boolean> {
    const job = await this.queue.getJob(jobId);
    if (!job) {
      return false;
    }

    await job.remove();
    return true;
  }

  /**
   * Retry a failed webhook
   */
  async retryWebhook(jobId: string): Promise<boolean> {
    const job = await this.queue.getJob(jobId);
    if (!job) {
      return false;
    }

    await job.retry();
    return true;
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<WebhookStats> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
    ]);

    return {
      total: waiting + active + completed + failed + delayed,
      pending: waiting,
      active,
      completed,
      failed,
      delayed,
    };
  }

  /**
   * Get recent webhook jobs
   */
  async getRecentWebhooks(
    status: "completed" | "failed" | "active" | "waiting",
    limit = 50,
  ): Promise<
    Array<{
      id: string;
      url: string;
      event: string;
      state: string;
      attemptsMade: number;
      timestamp: number;
      result?: WebhookDeliveryResult;
    }>
  > {
    let jobs: Job<OutgoingWebhookPayload>[] = [];

    switch (status) {
      case "completed":
        jobs = await this.queue.getCompleted(0, limit);
        break;
      case "failed":
        jobs = await this.queue.getFailed(0, limit);
        break;
      case "active":
        jobs = await this.queue.getActive(0, limit);
        break;
      case "waiting":
        jobs = await this.queue.getWaiting(0, limit);
        break;
    }

    return jobs.map((job) => ({
      id: job.id || "",
      url: job.data.url,
      event: job.data.event,
      state: status,
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp,
      result: job.returnvalue,
    }));
  }

  /**
   * Clear all completed webhooks
   */
  async clearCompleted(): Promise<void> {
    await this.queue.clean(0, 1000, "completed");
  }

  /**
   * Clear all failed webhooks
   */
  async clearFailed(): Promise<void> {
    await this.queue.clean(0, 1000, "failed");
  }

  /**
   * Pause webhook processing
   */
  async pause(): Promise<void> {
    await this.queue.pause();
    await this.worker.pause();
  }

  /**
   * Resume webhook processing
   */
  async resume(): Promise<void> {
    await this.queue.resume();
    this.worker.resume();
  }

  /**
   * Close all connections
   */
  async close(): Promise<void> {
    await this.worker.close();
    await this.queue.close();
    await this.events.close();
    await this.redis.quit();
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    redis: boolean;
    queue: boolean;
    worker: boolean;
  }> {
    try {
      // Check Redis connection
      const redisPing = await this.redis.ping();
      const redisHealthy = redisPing === "PONG";

      // Check queue
      const queueHealthy = this.queue !== null;

      // Check worker
      const workerHealthy = this.worker !== null && !this.worker.isPaused();

      return {
        healthy: redisHealthy && queueHealthy && workerHealthy,
        redis: redisHealthy,
        queue: queueHealthy,
        worker: workerHealthy,
      };
    } catch {
      return {
        healthy: false,
        redis: false,
        queue: false,
        worker: false,
      };
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

let managerInstance: WebhookQueueManager | null = null;

/**
 * Get the singleton webhook queue manager instance
 */
export function getWebhookQueueManager(
  config?: WebhookQueueConfig,
): WebhookQueueManager {
  if (!managerInstance && config) {
    managerInstance = new WebhookQueueManager(config);
  }
  if (!managerInstance) {
    throw new Error(
      "WebhookQueueManager not initialized. Please provide config on first call.",
    );
  }
  return managerInstance;
}

/**
 * Initialize webhook queue manager
 */
export function initializeWebhookQueue(
  config: WebhookQueueConfig,
): WebhookQueueManager {
  if (managerInstance) {
    logger.warn(
      "WebhookQueueManager already initialized. Returning existing instance.",
    );
    return managerInstance;
  }
  managerInstance = new WebhookQueueManager(config);
  return managerInstance;
}

/**
 * Close and reset webhook queue manager
 */
export async function closeWebhookQueue(): Promise<void> {
  if (managerInstance) {
    await managerInstance.close();
    managerInstance = null;
  }
}
