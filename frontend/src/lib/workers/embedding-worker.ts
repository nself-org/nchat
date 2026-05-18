/**
 * Embedding Worker
 * Background job processor for generating message embeddings
 * Processes the embedding queue and stores results in the database
 */

import { getVectorStore } from "@/lib/database/vector-store";
import { getEmbeddingService } from "@/lib/ai/embeddings";
import { captureError, addSentryBreadcrumb } from "@/lib/sentry-utils";
import { Pool } from "pg";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface WorkerConfig {
  batchSize?: number;
  pollIntervalMs?: number;
  maxRetries?: number;
  concurrency?: number;
  idleDelayMs?: number;
}

export interface WorkerStats {
  totalProcessed: number;
  totalSuccess: number;
  totalFailed: number;
  currentBatchSize: number;
  uptime: number;
  averageProcessingTime: number;
  isRunning: boolean;
}

// ============================================================================
// Embedding Worker
// ============================================================================

export class EmbeddingWorker {
  private config: Required<WorkerConfig>;
  private vectorStore: ReturnType<typeof getVectorStore>;
  private embeddingService: ReturnType<typeof getEmbeddingService>;
  private isRunning: boolean = false;
  private shouldStop: boolean = false;
  private stats: WorkerStats;
  private startTime: number = 0;
  private processingTimes: number[] = [];

  constructor(config?: WorkerConfig) {
    this.config = {
      batchSize: config?.batchSize || 10,
      pollIntervalMs: config?.pollIntervalMs || 5000,
      maxRetries: config?.maxRetries || 3,
      concurrency: config?.concurrency || 1,
      idleDelayMs: config?.idleDelayMs || 30000, // 30 seconds when idle
    };

    this.vectorStore = getVectorStore();
    this.embeddingService = getEmbeddingService();

    this.stats = {
      totalProcessed: 0,
      totalSuccess: 0,
      totalFailed: 0,
      currentBatchSize: 0,
      uptime: 0,
      averageProcessingTime: 0,
      isRunning: false,
    };
  }

  /**
   * Start the worker
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn("Embedding worker is already running");
      return;
    }

    this.isRunning = true;
    this.shouldStop = false;
    this.startTime = Date.now();
    this.stats.isRunning = true;

    addSentryBreadcrumb("embedding-worker", "Worker started", {
      config: this.config,
    });

    // REMOVED: console.log('[EmbeddingWorker] Started with config:', this.config)

    await this.processLoop();
  }

  /**
   * Stop the worker gracefully
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn("Embedding worker is not running");
      return;
    }

    // REMOVED: console.log('[EmbeddingWorker] Stopping...')
    this.shouldStop = true;

    // Wait for current processing to finish (max 30 seconds)
    const timeout = 30000;
    const startWait = Date.now();

    while (this.isRunning && Date.now() - startWait < timeout) {
      await this.sleep(100);
    }

    if (this.isRunning) {
      logger.warn("[EmbeddingWorker] Force stopped after timeout");
      this.isRunning = false;
    }

    this.stats.isRunning = false;
    addSentryBreadcrumb("embedding-worker", "Worker stopped", {
      stats: this.stats,
    });

    // REMOVED: console.log('[EmbeddingWorker] Stopped')
  }

  /**
   * Main processing loop
   */
  private async processLoop(): Promise<void> {
    while (!this.shouldStop) {
      try {
        const batch = await this.vectorStore.getQueueBatch(
          this.config.batchSize,
        );

        if (batch.length === 0) {
          // No items in queue, wait longer
          await this.sleep(this.config.idleDelayMs);
          continue;
        }

        this.stats.currentBatchSize = batch.length;
        await this.processBatch(batch);

        // Update uptime
        this.stats.uptime = Date.now() - this.startTime;

        // Short delay before next batch
        await this.sleep(this.config.pollIntervalMs);
      } catch (error) {
        logger.error("[EmbeddingWorker] Error in processing loop:", error);
        captureError(error as Error, {
          tags: { worker: "embedding-worker" },
        });

        // Wait before retrying
        await this.sleep(this.config.pollIntervalMs * 2);
      }
    }

    this.isRunning = false;
  }

  /**
   * Process a batch of queue items
   */
  private async processBatch(
    batch: Array<{
      id: string;
      messageId: string;
      priority: number;
      status: string;
      retryCount: number;
    }>,
  ): Promise<void> {
    const startTime = Date.now();

    addSentryBreadcrumb("embedding-worker", "Processing batch", {
      size: batch.length,
    });

    // Fetch message contents
    const messageIds = batch.map((item) => item.messageId);
    const messages = await this.fetchMessages(messageIds);

    if (messages.length === 0) {
      logger.warn("[EmbeddingWorker] No messages found for batch");
      for (const item of batch) {
        await this.vectorStore.markQueueFailed(item.id, "Message not found");
      }
      return;
    }

    // Generate embeddings in batch
    try {
      const texts = messages.map((m) => m.content);
      const result = await this.embeddingService.generateBatchEmbeddings({
        texts,
      });

      // Store embeddings
      const embeddingsToStore = messages.map((msg, index) => ({
        messageId: msg.id,
        embedding: result.embeddings[index],
        model: result.model,
      }));

      await this.vectorStore.storeBatchEmbeddings(embeddingsToStore);

      // Mark queue items as completed
      for (const item of batch) {
        await this.vectorStore.markQueueCompleted(item.id);
        this.stats.totalSuccess++;
      }

      this.stats.totalProcessed += batch.length;

      // Track processing time
      const processingTime = Date.now() - startTime;
      this.processingTimes.push(processingTime);
      if (this.processingTimes.length > 100) {
        this.processingTimes.shift();
      }
      this.stats.averageProcessingTime =
        this.processingTimes.reduce((a, b) => a + b, 0) /
        this.processingTimes.length;

      // REMOVED: console.log(
      //   `[EmbeddingWorker] Processed ${batch.length} embeddings in ${processingTime}ms (${result.cached} cached, ${result.generated} generated)`
      // )
    } catch (error) {
      logger.error("[EmbeddingWorker] Error generating embeddings:", error);
      captureError(error as Error, {
        tags: { worker: "embedding-worker", operation: "generate-batch" },
        extra: { batchSize: batch.length },
      });

      // Mark all items in batch as failed
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      for (const item of batch) {
        await this.vectorStore.markQueueFailed(item.id, errorMessage);
        this.stats.totalFailed++;
      }

      this.stats.totalProcessed += batch.length;
    }
  }

  /**
   * Fetch message contents from database
   */
  private async fetchMessages(
    messageIds: string[],
  ): Promise<Array<{ id: string; content: string }>> {
    const pool = new Pool({
      connectionString:
        process.env.DATABASE_URL ||
        "postgresql://postgres:postgres@localhost:5432/postgres",
      max: 5,
    });

    try {
      const placeholders = messageIds.map((_, i) => `$${i + 1}`).join(", ");
      const sql = `
        SELECT id, content
        FROM nchat_messages
        WHERE id IN (${placeholders})
        AND content IS NOT NULL
        AND type = 'text'
      `;

      const client = await pool.connect();
      try {
        const result = await client.query(sql, messageIds);
        return result.rows;
      } finally {
        client.release();
      }
    } finally {
      await pool.end();
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get worker statistics
   */
  public getStats(): WorkerStats {
    return {
      ...this.stats,
      uptime: this.isRunning ? Date.now() - this.startTime : this.stats.uptime,
    };
  }

  /**
   * Check if worker is running
   */
  public isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Reset statistics
   */
  public resetStats(): void {
    this.stats = {
      totalProcessed: 0,
      totalSuccess: 0,
      totalFailed: 0,
      currentBatchSize: 0,
      uptime: 0,
      averageProcessingTime: 0,
      isRunning: this.isRunning,
    };
    this.processingTimes = [];
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let embeddingWorker: EmbeddingWorker | null = null;

/**
 * Get or create the global embedding worker instance
 */
export function getEmbeddingWorker(config?: WorkerConfig): EmbeddingWorker {
  if (!embeddingWorker) {
    embeddingWorker = new EmbeddingWorker(config);
  }
  return embeddingWorker;
}

/**
 * Start the embedding worker
 */
export async function startEmbeddingWorker(
  config?: WorkerConfig,
): Promise<EmbeddingWorker> {
  const worker = getEmbeddingWorker(config);
  await worker.start();
  return worker;
}

/**
 * Stop the embedding worker
 */
export async function stopEmbeddingWorker(): Promise<void> {
  if (embeddingWorker) {
    await embeddingWorker.stop();
  }
}

export default EmbeddingWorker;
