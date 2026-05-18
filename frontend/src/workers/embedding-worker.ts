/**
 * Embedding Worker - Background processing for embedding generation
 *
 * Continuously processes the embedding queue to generate embeddings
 * for new and edited messages.
 *
 * @module workers/embedding-worker
 */

import { embeddingPipeline } from "@/lib/ai/embedding-pipeline";

import { logger } from "@/lib/logger";

// ========================================
// Configuration
// ========================================

const WORKER_ID = `worker-${process.pid}-${Date.now()}`;
const POLL_INTERVAL_MS = 5000; // 5 seconds
const BATCH_SIZE = 50;
const MAX_CONSECUTIVE_ERRORS = 5;

// ========================================
// Worker State
// ========================================

let isRunning = false;
let shouldStop = false;
let consecutiveErrors = 0;
let totalProcessed = 0;
let totalSuccessful = 0;
let totalFailed = 0;

// ========================================
// Worker Functions
// ========================================

/**
 * Start the embedding worker
 */
export async function startEmbeddingWorker(): Promise<void> {
  if (isRunning) {
    // REMOVED: console.log('[Embedding Worker] Already running')
    return;
  }

  isRunning = true;
  shouldStop = false;
  consecutiveErrors = 0;

  // REMOVED: console.log(`[Embedding Worker] Started: ${WORKER_ID}`)

  while (!shouldStop) {
    try {
      // Process queue
      const result = await embeddingPipeline.processQueue(
        WORKER_ID,
        BATCH_SIZE,
      );

      totalProcessed += result.processed;
      totalSuccessful += result.successful;
      totalFailed += result.failed;

      if (result.processed > 0) {
        // REMOVED: console.log(
        //   `[Embedding Worker] Processed ${result.processed} messages ` +
        //     `(${result.successful} successful, ${result.failed} failed)`
        // )
        consecutiveErrors = 0;
      }

      // Wait before next poll
      await sleep(POLL_INTERVAL_MS);
    } catch (error) {
      consecutiveErrors++;
      console.error(
        `[Embedding Worker] Error (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}):`,
        error,
      );

      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        logger.error(
          "[Embedding Worker] Too many consecutive errors,  stopping",
        );
        break;
      }

      // Exponential backoff
      const backoffMs = Math.min(
        POLL_INTERVAL_MS * Math.pow(2, consecutiveErrors),
        60000,
      );
      await sleep(backoffMs);
    }
  }

  isRunning = false;
  // REMOVED: console.log(
  //   `[Embedding Worker] Stopped. Stats: ` +
  //     `${totalProcessed} processed, ${totalSuccessful} successful, ${totalFailed} failed`
  // )
}

/**
 * Stop the embedding worker
 */
export function stopEmbeddingWorker(): void {
  // REMOVED: console.log('[Embedding Worker] Stopping...')
  shouldStop = true;
}

/**
 * Get worker status
 */
export function getWorkerStatus() {
  return {
    workerId: WORKER_ID,
    isRunning,
    totalProcessed,
    totalSuccessful,
    totalFailed,
    consecutiveErrors,
  };
}

/**
 * Reset worker statistics
 */
export function resetWorkerStats(): void {
  totalProcessed = 0;
  totalSuccessful = 0;
  totalFailed = 0;
  consecutiveErrors = 0;
}

// ========================================
// Helper Functions
// ========================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ========================================
// CLI Entry Point
// ========================================

if (require.main === module) {
  // Handle graceful shutdown
  process.on("SIGINT", () => {
    // REMOVED: console.log('\n[Embedding Worker] Received SIGINT, shutting down...')
    stopEmbeddingWorker();
  });

  process.on("SIGTERM", () => {
    // REMOVED: console.log('\n[Embedding Worker] Received SIGTERM, shutting down...')
    stopEmbeddingWorker();
  });

  // Start worker
  startEmbeddingWorker().catch((error) => {
    logger.error("[Embedding Worker] Fatal error:", error);
    process.exit(1);
  });
}
