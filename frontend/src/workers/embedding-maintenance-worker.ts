/**
 * Embedding Maintenance Worker - Periodic maintenance tasks
 *
 * Handles:
 * - Index optimization
 * - Queue cleanup
 * - Cache cleanup
 * - Statistics aggregation
 *
 * @module workers/embedding-maintenance-worker
 */

import { gql } from "@apollo/client";
import { apolloClient } from "@/lib/apollo-client";

import { logger } from "@/lib/logger";

// ========================================
// Configuration
// ========================================

const WORKER_ID = `maintenance-${process.pid}-${Date.now()}`;
const CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const CACHE_CLEANUP_DAYS = 90; // Clean cache entries unused for 90+ days

// ========================================
// GraphQL Queries
// ========================================

const CLEANUP_QUEUE = gql`
  mutation CleanupEmbeddingQueue {
    cleanup_embedding_queue: nchat_cleanup_embedding_queue {
      result
    }
  }
`;

const CLEANUP_CACHE = gql`
  mutation CleanupEmbeddingCache($daysUnused: Int!) {
    cleanup_embedding_cache: nchat_cleanup_embedding_cache(
      args: { days_unused: $daysUnused }
    ) {
      result
    }
  }
`;

const OPTIMIZE_INDEX = gql`
  mutation OptimizeEmbeddingIndex {
    optimize_embedding_index: nchat_optimize_embedding_index {
      result
    }
  }
`;

// ========================================
// Worker State
// ========================================

let isRunning = false;
let shouldStop = false;
let lastCleanup: Date | null = null;
let lastOptimization: Date | null = null;

// ========================================
// Worker Functions
// ========================================

/**
 * Start the maintenance worker
 */
export async function startMaintenanceWorker(): Promise<void> {
  if (isRunning) {
    // REMOVED: console.log('[Maintenance Worker] Already running')
    return;
  }

  isRunning = true;
  shouldStop = false;

  // REMOVED: console.log(`[Maintenance Worker] Started: ${WORKER_ID}`)

  // Run initial maintenance
  await runMaintenance();

  // Run periodic maintenance
  while (!shouldStop) {
    await sleep(CHECK_INTERVAL_MS);

    if (!shouldStop) {
      await runMaintenance();
    }
  }

  isRunning = false;
  // REMOVED: console.log('[Maintenance Worker] Stopped')
}

/**
 * Stop the maintenance worker
 */
export function stopMaintenanceWorker(): void {
  // REMOVED: console.log('[Maintenance Worker] Stopping...')
  shouldStop = true;
}

/**
 * Get worker status
 */
export function getMaintenanceWorkerStatus() {
  return {
    workerId: WORKER_ID,
    isRunning,
    lastCleanup,
    lastOptimization,
  };
}

/**
 * Run all maintenance tasks
 */
async function runMaintenance(): Promise<void> {
  // REMOVED: console.log('[Maintenance Worker] Running maintenance tasks...')

  try {
    // 1. Cleanup queue
    await cleanupQueue();

    // 2. Cleanup cache
    await cleanupCache();

    // 3. Optimize index (once per day)
    const shouldOptimize =
      !lastOptimization ||
      Date.now() - lastOptimization.getTime() > 24 * 60 * 60 * 1000;

    if (shouldOptimize) {
      await optimizeIndex();
    }

    lastCleanup = new Date();
    // REMOVED: console.log('[Maintenance Worker] Maintenance completed successfully')
  } catch (error) {
    logger.error("[Maintenance Worker] Maintenance error:", error);
  }
}

/**
 * Cleanup stale queue items
 */
async function cleanupQueue(): Promise<void> {
  try {
    // REMOVED: console.log('[Maintenance Worker] Cleaning up embedding queue...')

    const { data } = await apolloClient.mutate({
      mutation: CLEANUP_QUEUE,
    });

    const deleted = data?.cleanup_embedding_queue?.result || 0;
    // REMOVED: console.log(`[Maintenance Worker] Removed ${deleted} stale queue items`)
  } catch (error) {
    logger.error("[Maintenance Worker] Queue cleanup error:", error);
    throw error;
  }
}

/**
 * Cleanup old cache entries
 */
async function cleanupCache(): Promise<void> {
  try {
    // REMOVED: console.log(
    //   `[Maintenance Worker] Cleaning up cache entries unused for ${CACHE_CLEANUP_DAYS}+ days...`
    // )

    const { data } = await apolloClient.mutate({
      mutation: CLEANUP_CACHE,
      variables: { daysUnused: CACHE_CLEANUP_DAYS },
    });

    const deleted = data?.cleanup_embedding_cache?.result || 0;
    // REMOVED: console.log(`[Maintenance Worker] Removed ${deleted} old cache entries`)
  } catch (error) {
    logger.error("[Maintenance Worker] Cache cleanup error:", error);
    throw error;
  }
}

/**
 * Optimize vector index
 */
async function optimizeIndex(): Promise<void> {
  try {
    // REMOVED: console.log('[Maintenance Worker] Optimizing vector index...')

    const { data } = await apolloClient.mutate({
      mutation: OPTIMIZE_INDEX,
    });

    const result = data?.optimize_embedding_index?.result || "Unknown";
    // REMOVED: console.log(`[Maintenance Worker] Index optimization: ${result}`)

    lastOptimization = new Date();
  } catch (error) {
    logger.error("[Maintenance Worker] Index optimization error:", error);
    // Don't throw - optimization failure shouldn't stop maintenance
  }
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
    // REMOVED: console.log('\n[Maintenance Worker] Received SIGINT, shutting down...')
    stopMaintenanceWorker();
  });

  process.on("SIGTERM", () => {
    // REMOVED: console.log('\n[Maintenance Worker] Received SIGTERM, shutting down...')
    stopMaintenanceWorker();
  });

  // Start worker
  startMaintenanceWorker().catch((error) => {
    logger.error("[Maintenance Worker] Fatal error:", error);
    process.exit(1);
  });
}
