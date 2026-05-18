/**
 * Search Index Management Service
 *
 * Manages MeiliSearch indexes for nchat, including creation,
 * configuration, and statistics tracking.
 *
 * @module services/search/index.service
 */

import {
  getMeiliClient,
  getIndex,
  getMessagesIndex,
  getFilesIndex,
  getUsersIndex,
  getChannelsIndex,
  INDEXES,
  MESSAGES_INDEX_SETTINGS,
  FILES_INDEX_SETTINGS,
  USERS_INDEX_SETTINGS,
  CHANNELS_INDEX_SETTINGS,
  type IndexName,
  type MeiliMessageDocument,
  type MeiliFileDocument,
  type MeiliUserDocument,
  type MeiliChannelDocument,
} from "@/lib/search/meilisearch-config";
import type { Index, Task, Settings } from "meilisearch";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface IndexInfo {
  name: string;
  primaryKey: string | undefined;
  numberOfDocuments: number;
  isIndexing: boolean;
  fieldDistribution: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

export interface IndexHealth {
  healthy: boolean;
  name: string;
  error?: string;
  lastIndexedAt?: Date;
  pendingTasks: number;
  failedTasks: number;
}

export interface IndexOperationResult {
  success: boolean;
  taskId?: number;
  error?: string;
  duration?: number;
}

export interface BatchOperationResult {
  total: number;
  successful: number;
  failed: number;
  taskIds: number[];
  errors: { id: string; error: string }[];
  duration: number;
}

export interface IndexStats {
  messages: IndexInfo;
  files: IndexInfo;
  users: IndexInfo;
  channels: IndexInfo;
  totalDocuments: number;
  isHealthy: boolean;
}

// ============================================================================
// Index Service Class
// ============================================================================

export class IndexService {
  private client = getMeiliClient();

  // --------------------------------------------------------------------------
  // Index Initialization
  // --------------------------------------------------------------------------

  /**
   * Initialize all search indexes with their configurations
   */
  async initializeAllIndexes(): Promise<BatchOperationResult> {
    const startTime = Date.now();
    const errors: { id: string; error: string }[] = [];
    const taskIds: number[] = [];

    const indexConfigs = [
      { name: INDEXES.MESSAGES, settings: MESSAGES_INDEX_SETTINGS },
      { name: INDEXES.FILES, settings: FILES_INDEX_SETTINGS },
      { name: INDEXES.USERS, settings: USERS_INDEX_SETTINGS },
      { name: INDEXES.CHANNELS, settings: CHANNELS_INDEX_SETTINGS },
    ];

    for (const config of indexConfigs) {
      try {
        // Create index if it doesn't exist
        const createTask = await this.client
          .createIndex(config.name, { primaryKey: "id" })
          .catch(() => null);

        if (createTask) {
          taskIds.push(createTask.taskUid);
          await this.client.tasks.waitForTask(createTask.taskUid, {
            timeout: 10000,
          });
        }

        // Update index settings
        const index = this.client.index(config.name);
        const settingsTask = await index.updateSettings(config.settings);
        taskIds.push(settingsTask.taskUid);

        // REMOVED: console.log(`[IndexService] Index ${config.name} configured successfully`)
      } catch (error) {
        errors.push({
          id: config.name,
          error:
            error instanceof Error ? error.message : "Configuration failed",
        });
        logger.error(
          `[IndexService] Failed to configure ${config.name}:`,
          error,
        );
      }
    }

    return {
      total: indexConfigs.length,
      successful: indexConfigs.length - errors.length,
      failed: errors.length,
      taskIds,
      errors,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Initialize a specific index
   */
  async initializeIndex(indexName: IndexName): Promise<IndexOperationResult> {
    const startTime = Date.now();

    const settingsMap: Record<IndexName, Settings> = {
      [INDEXES.MESSAGES]: MESSAGES_INDEX_SETTINGS,
      [INDEXES.FILES]: FILES_INDEX_SETTINGS,
      [INDEXES.USERS]: USERS_INDEX_SETTINGS,
      [INDEXES.CHANNELS]: CHANNELS_INDEX_SETTINGS,
    };

    try {
      // Create index
      await this.client
        .createIndex(indexName, { primaryKey: "id" })
        .catch(() => null);

      // Update settings
      const index = this.client.index(indexName);
      const task = await index.updateSettings(settingsMap[indexName]);

      return {
        success: true,
        taskId: task.taskUid,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Initialization failed",
        duration: Date.now() - startTime,
      };
    }
  }

  // --------------------------------------------------------------------------
  // Index Information
  // --------------------------------------------------------------------------

  /**
   * Get information about a specific index
   */
  async getIndexInfo(indexName: IndexName): Promise<IndexInfo | null> {
    try {
      const index = this.client.index(indexName);
      const [info, stats] = await Promise.all([
        index.getRawInfo(),
        index.getStats(),
      ]);

      return {
        name: info.uid,
        primaryKey: info.primaryKey,
        numberOfDocuments: stats.numberOfDocuments,
        isIndexing: stats.isIndexing,
        fieldDistribution: stats.fieldDistribution,
        createdAt:
          typeof info.createdAt === "string"
            ? info.createdAt
            : new Date(info.createdAt).toISOString(),
        updatedAt:
          typeof info.updatedAt === "string"
            ? info.updatedAt
            : new Date(info.updatedAt).toISOString(),
      };
    } catch {
      return null;
    }
  }

  /**
   * Get information about all indexes
   */
  async getAllIndexesInfo(): Promise<IndexStats> {
    const [messages, files, users, channels] = await Promise.all([
      this.getIndexInfo(INDEXES.MESSAGES),
      this.getIndexInfo(INDEXES.FILES),
      this.getIndexInfo(INDEXES.USERS),
      this.getIndexInfo(INDEXES.CHANNELS),
    ]);

    const defaultInfo: IndexInfo = {
      name: "",
      primaryKey: "id",
      numberOfDocuments: 0,
      isIndexing: false,
      fieldDistribution: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return {
      messages: messages || { ...defaultInfo, name: INDEXES.MESSAGES },
      files: files || { ...defaultInfo, name: INDEXES.FILES },
      users: users || { ...defaultInfo, name: INDEXES.USERS },
      channels: channels || { ...defaultInfo, name: INDEXES.CHANNELS },
      totalDocuments:
        (messages?.numberOfDocuments || 0) +
        (files?.numberOfDocuments || 0) +
        (users?.numberOfDocuments || 0) +
        (channels?.numberOfDocuments || 0),
      isHealthy:
        messages !== null &&
        files !== null &&
        users !== null &&
        channels !== null,
    };
  }

  /**
   * Check health of a specific index
   */
  async checkIndexHealth(indexName: IndexName): Promise<IndexHealth> {
    try {
      const index = this.client.index(indexName);

      // Get pending and failed tasks
      const [pendingTasks, failedTasks] = await Promise.all([
        this.client.tasks.getTasks({
          indexUids: [indexName],
          statuses: ["enqueued", "processing"],
          limit: 100,
        }),
        this.client.tasks.getTasks({
          indexUids: [indexName],
          statuses: ["failed"],
          limit: 1,
        }),
      ]);

      // Get last successful task
      const successfulTasks = await this.client.tasks.getTasks({
        indexUids: [indexName],
        statuses: ["succeeded"],
        limit: 1,
      });

      return {
        healthy: true,
        name: indexName,
        lastIndexedAt:
          successfulTasks.results.length > 0
            ? new Date(successfulTasks.results[0].finishedAt || Date.now())
            : undefined,
        pendingTasks: pendingTasks.total,
        failedTasks: failedTasks.total,
      };
    } catch (error) {
      return {
        healthy: false,
        name: indexName,
        error: error instanceof Error ? error.message : "Health check failed",
        pendingTasks: 0,
        failedTasks: 0,
      };
    }
  }

  // --------------------------------------------------------------------------
  // Index Operations
  // --------------------------------------------------------------------------

  /**
   * Clear all documents from a specific index
   */
  async clearIndex(indexName: IndexName): Promise<IndexOperationResult> {
    const startTime = Date.now();

    try {
      const index = this.client.index(indexName);
      const task = await index.deleteAllDocuments();

      return {
        success: true,
        taskId: task.taskUid,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Clear failed",
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Clear all indexes
   */
  async clearAllIndexes(): Promise<BatchOperationResult> {
    const startTime = Date.now();
    const taskIds: number[] = [];
    const errors: { id: string; error: string }[] = [];

    for (const indexName of Object.values(INDEXES)) {
      const result = await this.clearIndex(indexName);
      if (result.success && result.taskId) {
        taskIds.push(result.taskId);
      } else if (result.error) {
        errors.push({ id: indexName, error: result.error });
      }
    }

    return {
      total: Object.values(INDEXES).length,
      successful: taskIds.length,
      failed: errors.length,
      taskIds,
      errors,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Delete a specific index
   */
  async deleteIndex(indexName: IndexName): Promise<IndexOperationResult> {
    const startTime = Date.now();

    try {
      const task = await this.client.deleteIndex(indexName);

      return {
        success: true,
        taskId: task.taskUid,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Delete failed",
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Delete all indexes
   */
  async deleteAllIndexes(): Promise<BatchOperationResult> {
    const startTime = Date.now();
    const taskIds: number[] = [];
    const errors: { id: string; error: string }[] = [];

    for (const indexName of Object.values(INDEXES)) {
      const result = await this.deleteIndex(indexName);
      if (result.success && result.taskId) {
        taskIds.push(result.taskId);
      } else if (result.error) {
        errors.push({ id: indexName, error: result.error });
      }
    }

    return {
      total: Object.values(INDEXES).length,
      successful: taskIds.length,
      failed: errors.length,
      taskIds,
      errors,
      duration: Date.now() - startTime,
    };
  }

  // --------------------------------------------------------------------------
  // Document Operations
  // --------------------------------------------------------------------------

  /**
   * Add documents to an index
   */
  async addDocuments<T extends Record<string, unknown>>(
    indexName: IndexName,
    documents: T[],
  ): Promise<IndexOperationResult> {
    const startTime = Date.now();

    if (documents.length === 0) {
      return { success: true, duration: 0 };
    }

    try {
      const index = this.client.index(indexName);
      const task = await index.addDocuments(documents);

      return {
        success: true,
        taskId: task.taskUid,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Add documents failed",
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Update documents in an index
   */
  async updateDocuments<T extends Record<string, unknown>>(
    indexName: IndexName,
    documents: T[],
  ): Promise<IndexOperationResult> {
    // MeiliSearch handles updates via addDocuments with same ID
    return this.addDocuments(indexName, documents);
  }

  /**
   * Delete documents from an index by IDs
   */
  async deleteDocuments(
    indexName: IndexName,
    documentIds: string[],
  ): Promise<IndexOperationResult> {
    const startTime = Date.now();

    if (documentIds.length === 0) {
      return { success: true, duration: 0 };
    }

    try {
      const index = this.client.index(indexName);
      const task = await index.deleteDocuments(documentIds);

      return {
        success: true,
        taskId: task.taskUid,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Delete documents failed",
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Delete documents by filter
   */
  async deleteDocumentsByFilter(
    indexName: IndexName,
    filter: string,
  ): Promise<IndexOperationResult> {
    const startTime = Date.now();

    try {
      const index = this.client.index(indexName);
      const task = await index.deleteDocuments({ filter });

      return {
        success: true,
        taskId: task.taskUid,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Delete by filter failed",
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Get a specific document by ID
   */
  async getDocument<T extends Record<string, unknown>>(
    indexName: IndexName,
    documentId: string,
  ): Promise<T | null> {
    try {
      const index = this.client.index(indexName);
      return (await index.getDocument(documentId)) as T;
    } catch {
      return null;
    }
  }

  // --------------------------------------------------------------------------
  // Task Management
  // --------------------------------------------------------------------------

  /**
   * Wait for a task to complete
   */
  async waitForTask(taskId: number, timeout = 30000): Promise<Task> {
    return this.client.tasks.waitForTask(taskId, { timeout: timeout });
  }

  /**
   * Wait for all pending tasks to complete
   */
  async waitForAllTasks(timeout = 60000): Promise<void> {
    for (const indexName of Object.values(INDEXES)) {
      const tasks = await this.client.tasks.getTasks({
        indexUids: [indexName],
        statuses: ["enqueued", "processing"],
      });

      for (const task of tasks.results) {
        await this.client.tasks.waitForTask(task.uid, { timeout: timeout });
      }
    }
  }

  /**
   * Get task status
   */
  async getTaskStatus(taskId: number): Promise<Task> {
    return this.client.tasks.getTask(taskId);
  }

  /**
   * Get pending tasks for an index
   */
  async getPendingTasks(indexName: IndexName): Promise<Task[]> {
    const tasks = await this.client.tasks.getTasks({
      indexUids: [indexName],
      statuses: ["enqueued", "processing"],
    });
    return tasks.results;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let indexServiceInstance: IndexService | null = null;

/**
 * Get the singleton IndexService instance
 */
export function getIndexService(): IndexService {
  if (!indexServiceInstance) {
    indexServiceInstance = new IndexService();
  }
  return indexServiceInstance;
}

/**
 * Create a new IndexService instance
 */
export function createIndexService(): IndexService {
  return new IndexService();
}

export default IndexService;
