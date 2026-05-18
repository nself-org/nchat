/**
 * Database Query Optimizer
 *
 * Provides utilities for optimizing database queries including:
 * - Query batching and deduplication
 * - DataLoader integration for N+1 prevention
 * - Query performance monitoring
 * - Index recommendations
 */

// =============================================================================
// Types
// =============================================================================

export interface QueryStats {
  query: string;
  count: number;
  totalTime: number;
  averageTime: number;
  maxTime: number;
  minTime: number;
  lastExecuted: Date;
}

export interface BatchOptions {
  maxBatchSize?: number;
  batchWindowMs?: number;
}

export interface QueryOptimization {
  query: string;
  issue: string;
  recommendation: string;
  estimatedImprovement: string;
}

// =============================================================================
// Query Batcher
// =============================================================================

/**
 * Generic query batcher for deduplication and batching
 */
export class QueryBatcher<K, V> {
  private pendingBatches: Map<string, Promise<V>> = new Map();
  private batchQueue: K[] = [];
  private batchTimer?: NodeJS.Timeout;
  private options: Required<BatchOptions>;

  constructor(
    private batchFn: (keys: K[]) => Promise<V[]>,
    options: BatchOptions = {},
  ) {
    this.options = {
      maxBatchSize: options.maxBatchSize || 100,
      batchWindowMs: options.batchWindowMs || 10,
    };
  }

  /**
   * Load a single item (will be batched)
   */
  async load(key: K): Promise<V> {
    const keyString = JSON.stringify(key);

    // Check if already pending
    const existing = this.pendingBatches.get(keyString);
    if (existing) {
      return existing;
    }

    // Create promise and add to queue
    const promise = new Promise<V>((resolve, reject) => {
      this.batchQueue.push(key);

      // Set timer to process batch
      if (!this.batchTimer) {
        this.batchTimer = setTimeout(() => {
          this.processBatch().catch(reject);
        }, this.options.batchWindowMs);
      }

      // Process immediately if batch is full
      if (this.batchQueue.length >= this.options.maxBatchSize) {
        if (this.batchTimer) {
          clearTimeout(this.batchTimer);
          this.batchTimer = undefined;
        }
        this.processBatch()
          .then(() => resolve(this.pendingBatches.get(keyString) as Promise<V>))
          .catch(reject);
      }
    });

    this.pendingBatches.set(keyString, promise);
    return promise;
  }

  /**
   * Process batched queries
   */
  private async processBatch(): Promise<void> {
    if (this.batchQueue.length === 0) return;

    const batch = [...this.batchQueue];
    this.batchQueue = [];
    this.batchTimer = undefined;

    try {
      const results = await this.batchFn(batch);

      // Resolve all pending promises
      batch.forEach((key, index) => {
        const keyString = JSON.stringify(key);
        const result = results[index];

        // Replace promise with resolved value
        this.pendingBatches.set(keyString, Promise.resolve(result));
      });
    } catch (error) {
      // Reject all pending promises
      batch.forEach((key) => {
        const keyString = JSON.stringify(key);
        this.pendingBatches.set(keyString, Promise.reject(error));
      });
    }
  }

  /**
   * Clear all pending batches
   */
  clear(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = undefined;
    }
    this.batchQueue = [];
    this.pendingBatches.clear();
  }
}

// =============================================================================
// Query Monitor
// =============================================================================

/**
 * Monitor query performance
 */
export class QueryMonitor {
  private stats: Map<string, QueryStats> = new Map();
  private enabled = process.env.NODE_ENV === "development";

  /**
   * Track query execution
   */
  async trackQuery<T>(query: string, executor: () => Promise<T>): Promise<T> {
    if (!this.enabled) {
      return executor();
    }

    const startTime = Date.now();

    try {
      const result = await executor();
      const duration = Date.now() - startTime;

      this.recordQuery(query, duration);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordQuery(query, duration);
      throw error;
    }
  }

  /**
   * Record query stats
   */
  private recordQuery(query: string, duration: number): void {
    const existing = this.stats.get(query);

    if (existing) {
      existing.count++;
      existing.totalTime += duration;
      existing.averageTime = existing.totalTime / existing.count;
      existing.maxTime = Math.max(existing.maxTime, duration);
      existing.minTime = Math.min(existing.minTime, duration);
      existing.lastExecuted = new Date();
    } else {
      this.stats.set(query, {
        query,
        count: 1,
        totalTime: duration,
        averageTime: duration,
        maxTime: duration,
        minTime: duration,
        lastExecuted: new Date(),
      });
    }
  }

  /**
   * Get all query stats
   */
  getStats(): QueryStats[] {
    return Array.from(this.stats.values());
  }

  /**
   * Get slow queries (> threshold ms)
   */
  getSlowQueries(thresholdMs = 1000): QueryStats[] {
    return this.getStats().filter((stat) => stat.averageTime > thresholdMs);
  }

  /**
   * Get most frequent queries
   */
  getMostFrequent(limit = 10): QueryStats[] {
    return this.getStats()
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Clear stats
   */
  clear(): void {
    this.stats.clear();
  }

  /**
   * Enable/disable monitoring
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}

// =============================================================================
// Query Optimizer
// =============================================================================

/**
 * Analyze queries and suggest optimizations
 */
export class QueryOptimizer {
  /**
   * Analyze query and suggest optimizations
   */
  analyze(query: string, stats?: QueryStats): QueryOptimization[] {
    const optimizations: QueryOptimization[] = [];

    // Check for SELECT *
    if (query.includes("SELECT *")) {
      optimizations.push({
        query,
        issue: "Using SELECT * fetches all columns",
        recommendation: "Specify only needed columns to reduce data transfer",
        estimatedImprovement: "10-50% faster",
      });
    }

    // Check for missing WHERE clause
    if (
      query.toUpperCase().includes("SELECT") &&
      !query.toUpperCase().includes("WHERE") &&
      !query.toUpperCase().includes("LIMIT")
    ) {
      optimizations.push({
        query,
        issue: "Query without WHERE or LIMIT clause",
        recommendation: "Add WHERE clause or LIMIT to prevent full table scans",
        estimatedImprovement: "50-90% faster",
      });
    }

    // Check for N+1 queries
    if (stats && stats.count > 100 && stats.averageTime < 50) {
      optimizations.push({
        query,
        issue: "Potential N+1 query detected (many fast queries)",
        recommendation:
          "Use batching or JOIN to fetch related data in one query",
        estimatedImprovement: "80-95% faster",
      });
    }

    // Check for slow queries
    if (stats && stats.averageTime > 1000) {
      optimizations.push({
        query,
        issue: `Slow query (avg ${stats.averageTime}ms)`,
        recommendation:
          "Add indexes on WHERE/JOIN columns or optimize query logic",
        estimatedImprovement: "60-90% faster",
      });
    }

    // Check for missing indexes on common patterns
    const whereMatch = query.match(/WHERE\s+(\w+)\s*=/i);
    if (whereMatch) {
      optimizations.push({
        query,
        issue: `Filtering on column: ${whereMatch[1]}`,
        recommendation: `Consider adding index: CREATE INDEX idx_${whereMatch[1]} ON table(${whereMatch[1]})`,
        estimatedImprovement: "70-95% faster",
      });
    }

    return optimizations;
  }

  /**
   * Generate index recommendations from query patterns
   */
  recommendIndexes(queries: QueryStats[]): string[] {
    const recommendations = new Set<string>();

    for (const stat of queries) {
      const optimizations = this.analyze(stat.query, stat);
      for (const opt of optimizations) {
        if (opt.recommendation.includes("CREATE INDEX")) {
          recommendations.add(opt.recommendation);
        }
      }
    }

    return Array.from(recommendations);
  }
}

// =============================================================================
// DataLoader Utilities (for GraphQL N+1 prevention)
// =============================================================================

/**
 * Create a simple DataLoader-like batcher
 */
export function createDataLoader<K, V>(
  batchFn: (keys: K[]) => Promise<(V | Error)[]>,
  options?: BatchOptions,
): (key: K) => Promise<V> {
  const batcher = new QueryBatcher<K, V | Error>(batchFn, options);

  return async (key: K): Promise<V> => {
    const result = await batcher.load(key);
    if (result instanceof Error) {
      throw result;
    }
    return result;
  };
}

// =============================================================================
// Singleton Instances
// =============================================================================

export const queryMonitor = new QueryMonitor();
export const queryOptimizer = new QueryOptimizer();

// =============================================================================
// Exports
// =============================================================================

export default {
  QueryBatcher,
  QueryMonitor,
  QueryOptimizer,
  queryMonitor,
  queryOptimizer,
  createDataLoader,
};
