/**
 * AI Request Queue
 * - Priority queue for AI requests
 * - Queue management (FIFO, priority-based)
 * - Batch processing
 * - Queue metrics (length, processing time)
 * - Dead letter queue for failed requests
 * - Redis-backed distributed queue
 */

import { getCache, type RedisCacheService } from "@/lib/redis-cache";
import { captureError, addSentryBreadcrumb } from "@/lib/sentry-utils";

// ============================================================================
// Types
// ============================================================================

export enum RequestPriority {
  CRITICAL = 0, // Highest priority
  HIGH = 1,
  NORMAL = 2,
  LOW = 3,
  BACKGROUND = 4, // Lowest priority
}

export interface QueuedRequest<T = any> {
  id: string;
  priority: RequestPriority;
  endpoint: string;
  payload: T;
  userId?: string;
  orgId?: string;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  processAfter: Date; // For delayed/scheduled requests
  timeout: number; // ms
  metadata?: Record<string, any>;
}

export interface QueueMetrics {
  queueName: string;
  totalQueued: number;
  processing: number;
  completed: number;
  failed: number;
  averageProcessingTime: number; // ms
  oldestRequest?: Date;
  queuedByPriority: Record<RequestPriority, number>;
}

export interface ProcessResult<T = any> {
  success: boolean;
  result?: T;
  error?: Error;
  processingTime: number;
}

export type RequestProcessor<T = any, R = any> = (
  request: QueuedRequest<T>,
) => Promise<R>;

// ============================================================================
// Request Queue Class
// ============================================================================

export class RequestQueue<T = any, R = any> {
  private cache: RedisCacheService;
  private queueName: string;
  private processor: RequestProcessor<T, R>;
  private isProcessing: boolean = false;
  private concurrency: number;
  private batchSize: number;
  private pollInterval: number;

  constructor(
    queueName: string,
    processor: RequestProcessor<T, R>,
    options?: {
      concurrency?: number; // Number of requests to process in parallel
      batchSize?: number; // Max requests per batch
      pollInterval?: number; // ms between queue polls
    },
  ) {
    this.queueName = queueName;
    this.processor = processor;
    this.cache = getCache();
    this.concurrency = options?.concurrency || 5;
    this.batchSize = options?.batchSize || 10;
    this.pollInterval = options?.pollInterval || 1000;
  }

  // ============================================================================
  // Queue Operations
  // ============================================================================

  async enqueue(
    payload: T,
    options?: {
      priority?: RequestPriority;
      userId?: string;
      orgId?: string;
      maxAttempts?: number;
      delay?: number; // ms to delay processing
      timeout?: number; // ms
      metadata?: Record<string, any>;
    },
  ): Promise<string> {
    const request: QueuedRequest<T> = {
      id: this.generateId(),
      priority: options?.priority || RequestPriority.NORMAL,
      endpoint: this.queueName,
      payload,
      userId: options?.userId,
      orgId: options?.orgId,
      attempts: 0,
      maxAttempts: options?.maxAttempts || 3,
      createdAt: new Date(),
      processAfter: new Date(Date.now() + (options?.delay || 0)),
      timeout: options?.timeout || 60000,
      metadata: options?.metadata,
    };

    addSentryBreadcrumb("ai", "Enqueuing AI request", {
      queueName: this.queueName,
      requestId: request.id,
      priority: request.priority,
    });

    await this.storeRequest(request);
    await this.addToQueue(request.id, request.priority);

    return request.id;
  }

  async dequeue(priority?: RequestPriority): Promise<QueuedRequest<T> | null> {
    // Get highest priority request
    const requestId = await this.getNextRequest(priority);
    if (!requestId) return null;

    const request = await this.getRequest(requestId);
    if (!request) return null;

    // Check if request should be processed yet
    if (request.processAfter > new Date()) {
      // Re-queue for later
      await this.addToQueue(request.id, request.priority);
      return null;
    }

    // Move to processing
    await this.markAsProcessing(request.id);

    return request;
  }

  async complete(requestId: string, result: R): Promise<void> {
    const request = await this.getRequest(requestId);
    if (!request) return;

    addSentryBreadcrumb("ai", "Request completed", {
      queueName: this.queueName,
      requestId,
    });

    await this.removeFromProcessing(requestId);
    await this.markAsCompleted(requestId, result);
    await this.deleteRequest(requestId);
  }

  async fail(requestId: string, error: Error): Promise<void> {
    const request = await this.getRequest(requestId);
    if (!request) return;

    request.attempts++;

    if (request.attempts >= request.maxAttempts) {
      // Move to dead letter queue
      addSentryBreadcrumb("ai", "Request failed permanently", {
        queueName: this.queueName,
        requestId,
        attempts: request.attempts,
      });

      await this.removeFromProcessing(requestId);
      await this.moveToDeadLetter(request, error);
      await this.deleteRequest(requestId);
    } else {
      // Retry with exponential backoff
      const delay = Math.min(1000 * Math.pow(2, request.attempts), 30000);
      request.processAfter = new Date(Date.now() + delay);

      addSentryBreadcrumb("ai", "Retrying failed request", {
        queueName: this.queueName,
        requestId,
        attempt: request.attempts,
        delay,
      });

      await this.removeFromProcessing(requestId);
      await this.storeRequest(request);
      await this.addToQueue(request.id, request.priority);
    }
  }

  // ============================================================================
  // Batch Operations
  // ============================================================================

  async dequeueBatch(
    size: number = this.batchSize,
    priority?: RequestPriority,
  ): Promise<QueuedRequest<T>[]> {
    const requests: QueuedRequest<T>[] = [];

    for (let i = 0; i < size; i++) {
      const request = await this.dequeue(priority);
      if (!request) break;
      requests.push(request);
    }

    return requests;
  }

  async processBatch(requests: QueuedRequest<T>[]): Promise<void> {
    const promises = requests.map(async (request) => {
      try {
        const startTime = Date.now();
        const result = await Promise.race([
          this.processor(request),
          this.timeout(request.timeout),
        ]);
        const processingTime = Date.now() - startTime;

        await this.complete(request.id, result);
        await this.recordMetric("processingTime", processingTime);
      } catch (error) {
        await this.fail(request.id, error as Error);
        captureError(error as Error, {
          tags: { feature: "ai-queue", queue: this.queueName },
          extra: { requestId: request.id },
        });
      }
    });

    await Promise.all(promises);
  }

  // ============================================================================
  // Queue Processing
  // ============================================================================

  start(): void {
    if (this.isProcessing) return;

    this.isProcessing = true;
    addSentryBreadcrumb("ai", "Started queue processing", {
      queueName: this.queueName,
    });

    this.processLoop();
  }

  stop(): void {
    this.isProcessing = false;
    addSentryBreadcrumb("ai", "Stopped queue processing", {
      queueName: this.queueName,
    });
  }

  private async processLoop(): Promise<void> {
    while (this.isProcessing) {
      try {
        const requests = await this.dequeueBatch(this.concurrency);

        if (requests.length > 0) {
          await this.processBatch(requests);
        } else {
          // No requests, wait before polling again
          await this.sleep(this.pollInterval);
        }
      } catch (error) {
        captureError(error as Error, {
          tags: { feature: "ai-queue-loop", queue: this.queueName },
        });
        await this.sleep(this.pollInterval);
      }
    }
  }

  // ============================================================================
  // Queue Metrics
  // ============================================================================

  async getMetrics(): Promise<QueueMetrics> {
    const [
      totalQueued,
      processing,
      completed,
      failed,
      processingTimes,
      queuedByPriority,
    ] = await Promise.all([
      this.getQueueLength(),
      this.getProcessingCount(),
      this.getCompletedCount(),
      this.getFailedCount(),
      this.getProcessingTimes(),
      this.getQueuedByPriority(),
    ]);

    const averageProcessingTime =
      processingTimes.length > 0
        ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length
        : 0;

    const oldestRequest = await this.getOldestRequest();

    return {
      queueName: this.queueName,
      totalQueued,
      processing,
      completed,
      failed,
      averageProcessingTime,
      oldestRequest,
      queuedByPriority,
    };
  }

  async getQueueLength(priority?: RequestPriority): Promise<number> {
    if (priority !== undefined) {
      const key = this.getQueueKey(priority);
      const members = await this.cache.smembers(key);
      return members.length;
    } else {
      // Count across all priorities
      let total = 0;
      for (const p of Object.values(RequestPriority)) {
        if (typeof p === "number") {
          total += await this.getQueueLength(p);
        }
      }
      return total;
    }
  }

  // ============================================================================
  // Private Methods - Redis Operations
  // ============================================================================

  private async storeRequest(request: QueuedRequest<T>): Promise<void> {
    const key = `ai:queue:${this.queueName}:request:${request.id}`;
    await this.cache.set(key, request, 86400); // 24 hours
  }

  private async getRequest(
    requestId: string,
  ): Promise<QueuedRequest<T> | null> {
    const key = `ai:queue:${this.queueName}:request:${requestId}`;
    return await this.cache.get<QueuedRequest<T>>(key);
  }

  private async deleteRequest(requestId: string): Promise<void> {
    const key = `ai:queue:${this.queueName}:request:${requestId}`;
    await this.cache.del(key);
  }

  private async addToQueue(
    requestId: string,
    priority: RequestPriority,
  ): Promise<void> {
    const key = this.getQueueKey(priority);
    await this.cache.sadd(key, requestId);
  }

  private async getNextRequest(
    priority?: RequestPriority,
  ): Promise<string | null> {
    // If priority specified, get from that queue
    if (priority !== undefined) {
      const key = this.getQueueKey(priority);
      const members = await this.cache.smembers(key);
      if (members.length === 0) return null;

      const requestId = members[0];
      await this.cache.srem(key, requestId);
      return requestId;
    }

    // Otherwise, get highest priority request
    for (const p of Object.values(RequestPriority)) {
      if (typeof p === "number") {
        const requestId = await this.getNextRequest(p);
        if (requestId) return requestId;
      }
    }

    return null;
  }

  private async markAsProcessing(requestId: string): Promise<void> {
    const key = `ai:queue:${this.queueName}:processing`;
    await this.cache.sadd(key, requestId);
  }

  private async removeFromProcessing(requestId: string): Promise<void> {
    const key = `ai:queue:${this.queueName}:processing`;
    await this.cache.srem(key, requestId);
  }

  private async markAsCompleted(requestId: string, result: R): Promise<void> {
    const key = `ai:queue:${this.queueName}:completed`;
    await this.cache.incr(key, 86400);
  }

  private async moveToDeadLetter(
    request: QueuedRequest<T>,
    error: Error,
  ): Promise<void> {
    const key = `ai:queue:${this.queueName}:dlq:${request.id}`;
    await this.cache.set(
      key,
      {
        request,
        error: {
          message: error.message,
          stack: error.stack,
        },
        failedAt: new Date(),
      },
      604800, // 7 days
    );

    const failedKey = `ai:queue:${this.queueName}:failed`;
    await this.cache.incr(failedKey, 86400);
  }

  private async getProcessingCount(): Promise<number> {
    const key = `ai:queue:${this.queueName}:processing`;
    const members = await this.cache.smembers(key);
    return members.length;
  }

  private async getCompletedCount(): Promise<number> {
    const key = `ai:queue:${this.queueName}:completed`;
    return (await this.cache.get<number>(key)) || 0;
  }

  private async getFailedCount(): Promise<number> {
    const key = `ai:queue:${this.queueName}:failed`;
    return (await this.cache.get<number>(key)) || 0;
  }

  private async getProcessingTimes(): Promise<number[]> {
    const key = `ai:queue:${this.queueName}:times`;
    return (await this.cache.get<number[]>(key)) || [];
  }

  private async recordMetric(metric: string, value: number): Promise<void> {
    const key = `ai:queue:${this.queueName}:${metric}s`;
    const values = (await this.cache.get<number[]>(key)) || [];
    values.push(value);

    // Keep only last 100 values
    if (values.length > 100) {
      values.shift();
    }

    await this.cache.set(key, values, 3600);
  }

  private async getQueuedByPriority(): Promise<
    Record<RequestPriority, number>
  > {
    const result: Record<RequestPriority, number> = {
      [RequestPriority.CRITICAL]: 0,
      [RequestPriority.HIGH]: 0,
      [RequestPriority.NORMAL]: 0,
      [RequestPriority.LOW]: 0,
      [RequestPriority.BACKGROUND]: 0,
    };

    for (const p of Object.values(RequestPriority)) {
      if (typeof p === "number") {
        result[p] = await this.getQueueLength(p);
      }
    }

    return result;
  }

  private async getOldestRequest(): Promise<Date | undefined> {
    for (const p of Object.values(RequestPriority)) {
      if (typeof p === "number") {
        const key = this.getQueueKey(p);
        const members = await this.cache.smembers(key);

        if (members.length > 0) {
          const request = await this.getRequest(members[0]);
          return request?.createdAt;
        }
      }
    }

    return undefined;
  }

  private getQueueKey(priority: RequestPriority): string {
    return `ai:queue:${this.queueName}:priority:${priority}`;
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Request timeout")), ms),
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }
}

// ============================================================================
// Queue Manager
// ============================================================================

const queues = new Map<string, RequestQueue<any, any>>();

export function getQueue<T = any, R = any>(
  name: string,
  processor: RequestProcessor<T, R>,
  options?: {
    concurrency?: number;
    batchSize?: number;
    pollInterval?: number;
  },
): RequestQueue<T, R> {
  if (!queues.has(name)) {
    const queue = new RequestQueue(name, processor, options);
    queues.set(name, queue);
  }
  return queues.get(name) as RequestQueue<T, R>;
}

export function getAllQueues(): Map<string, RequestQueue<any, any>> {
  return queues;
}
