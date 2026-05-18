/**
 * MeiliSearch Configuration
 *
 * Provides comprehensive MeiliSearch index configuration for nself-chat.
 * Supports messages, files, users, and channels indexes with proper
 * searchable, filterable, and sortable attributes.
 *
 * @module lib/search/meilisearch-config
 */

import { MeiliSearch, Index, Settings } from "meilisearch";

import { logger } from "@/lib/logger";

// ============================================================================
// Configuration Constants
// ============================================================================

/** MeiliSearch host URL */
const MEILISEARCH_HOST =
  process.env.NEXT_PUBLIC_MEILISEARCH_URL || "http://search.localhost:7700";

/** MeiliSearch API key */
const MEILISEARCH_API_KEY =
  process.env.MEILISEARCH_MASTER_KEY ||
  process.env.NEXT_PUBLIC_MEILISEARCH_KEY ||
  "";

/** Index names for the application */
export const INDEXES = {
  MESSAGES: "nchat_messages",
  FILES: "nchat_files",
  USERS: "nchat_users",
  CHANNELS: "nchat_channels",
} as const;

export type IndexName = (typeof INDEXES)[keyof typeof INDEXES];

// ============================================================================
// Index Settings Configuration
// ============================================================================

/** Settings for messages index */
export const MESSAGES_INDEX_SETTINGS: Settings = {
  searchableAttributes: [
    "content",
    "author_name",
    "author_username",
    "channel_name",
  ],
  filterableAttributes: [
    "channel_id",
    "author_id",
    "created_at",
    "updated_at",
    "has_attachment",
    "has_link",
    "has_image",
    "has_video",
    "has_file",
    "is_pinned",
    "is_edited",
    "is_deleted",
    "thread_id",
    "parent_thread_id",
    "message_type",
    "mentioned_users",
    "mentions_everyone",
    "mentions_here",
  ],
  sortableAttributes: ["created_at", "updated_at"],
  rankingRules: [
    "words",
    "typo",
    "proximity",
    "attribute",
    "sort",
    "exactness",
    "created_at:desc",
  ],
  distinctAttribute: "id",
  typoTolerance: {
    enabled: true,
    minWordSizeForTypos: {
      oneTypo: 4,
      twoTypos: 8,
    },
  },
  pagination: {
    maxTotalHits: 10000,
  },
};

/** Settings for files index */
export const FILES_INDEX_SETTINGS: Settings = {
  searchableAttributes: [
    "name",
    "original_name",
    "description",
    "uploader_name",
    "uploader_username",
    "extracted_text",
  ],
  filterableAttributes: [
    "uploader_id",
    "channel_id",
    "message_id",
    "mime_type",
    "file_type",
    "file_category",
    "created_at",
    "size",
    "extension",
  ],
  sortableAttributes: ["created_at", "size", "name"],
  rankingRules: [
    "words",
    "typo",
    "proximity",
    "attribute",
    "sort",
    "exactness",
  ],
  distinctAttribute: "id",
  typoTolerance: {
    enabled: true,
  },
};

/** Settings for users index */
export const USERS_INDEX_SETTINGS: Settings = {
  searchableAttributes: [
    "display_name",
    "username",
    "email",
    "bio",
    "job_title",
    "department",
  ],
  filterableAttributes: [
    "role",
    "is_active",
    "is_bot",
    "created_at",
    "last_seen_at",
  ],
  sortableAttributes: [
    "display_name",
    "username",
    "created_at",
    "last_seen_at",
  ],
  rankingRules: [
    "words",
    "typo",
    "proximity",
    "attribute",
    "sort",
    "exactness",
  ],
  distinctAttribute: "id",
  typoTolerance: {
    enabled: true,
    minWordSizeForTypos: {
      oneTypo: 3,
      twoTypos: 6,
    },
  },
};

/** Settings for channels index */
export const CHANNELS_INDEX_SETTINGS: Settings = {
  searchableAttributes: ["name", "description", "topic"],
  filterableAttributes: [
    "type",
    "is_private",
    "is_archived",
    "is_default",
    "created_by",
    "created_at",
    "category_id",
    "member_count",
  ],
  sortableAttributes: ["name", "created_at", "member_count", "last_message_at"],
  rankingRules: [
    "words",
    "typo",
    "proximity",
    "attribute",
    "sort",
    "exactness",
  ],
  distinctAttribute: "id",
  typoTolerance: {
    enabled: true,
  },
};

// ============================================================================
// Document Types
// ============================================================================

/** Message document structure for MeiliSearch */
export interface MeiliMessageDocument extends Record<string, unknown> {
  id: string;
  content: string;
  content_plain: string; // Plain text version for searching
  channel_id: string;
  channel_name: string;
  author_id: string;
  author_name: string;
  author_username: string;
  author_avatar_url?: string;
  created_at: number; // Unix timestamp
  updated_at?: number;
  message_type: string;
  has_attachment: boolean;
  has_link: boolean;
  has_image: boolean;
  has_video: boolean;
  has_file: boolean;
  is_pinned: boolean;
  is_edited: boolean;
  is_deleted: boolean;
  thread_id?: string;
  parent_thread_id?: string;
  mentioned_users: string[];
  mentions_everyone: boolean;
  mentions_here: boolean;
  attachment_count: number;
  reaction_count: number;
}

/** File document structure for MeiliSearch */
export interface MeiliFileDocument extends Record<string, unknown> {
  id: string;
  name: string;
  original_name: string;
  description?: string;
  mime_type: string;
  file_type: string; // 'image' | 'video' | 'audio' | 'document' | 'other'
  file_category: string; // More specific category
  extension: string;
  size: number;
  url: string;
  thumbnail_url?: string;
  uploader_id: string;
  uploader_name: string;
  uploader_username: string;
  channel_id: string;
  channel_name: string;
  message_id: string;
  created_at: number;
  extracted_text?: string; // Text extracted from PDFs, docs, etc.
  width?: number;
  height?: number;
  duration?: number; // For audio/video
}

/** User document structure for MeiliSearch */
export interface MeiliUserDocument extends Record<string, unknown> {
  id: string;
  username: string;
  display_name: string;
  email?: string;
  avatar_url?: string;
  bio?: string;
  job_title?: string;
  department?: string;
  role: string;
  is_active: boolean;
  is_bot: boolean;
  created_at: number;
  last_seen_at?: number;
}

/** Channel document structure for MeiliSearch */
export interface MeiliChannelDocument extends Record<string, unknown> {
  id: string;
  name: string;
  description?: string;
  topic?: string;
  type: string;
  is_private: boolean;
  is_archived: boolean;
  is_default: boolean;
  created_by: string;
  created_at: number;
  category_id?: string;
  member_count: number;
  last_message_at?: number;
  icon?: string;
}

// ============================================================================
// MeiliSearch Client
// ============================================================================

let meiliClient: MeiliSearch | null = null;

/**
 * Get or create the MeiliSearch client instance
 */
export function getMeiliClient(): MeiliSearch {
  if (!meiliClient) {
    meiliClient = new MeiliSearch({
      host: MEILISEARCH_HOST,
      apiKey: MEILISEARCH_API_KEY,
    });
  }
  return meiliClient;
}

/**
 * Get a specific index by name
 */
export function getIndex<
  T extends Record<string, unknown> = Record<string, unknown>,
>(indexName: IndexName): Index<T> {
  const client = getMeiliClient();
  return client.index<T>(indexName);
}

/**
 * Get the messages index
 */
export function getMessagesIndex(): Index<MeiliMessageDocument> {
  return getIndex<MeiliMessageDocument>(INDEXES.MESSAGES);
}

/**
 * Get the files index
 */
export function getFilesIndex(): Index<MeiliFileDocument> {
  return getIndex<MeiliFileDocument>(INDEXES.FILES);
}

/**
 * Get the users index
 */
export function getUsersIndex(): Index<MeiliUserDocument> {
  return getIndex<MeiliUserDocument>(INDEXES.USERS);
}

/**
 * Get the channels index
 */
export function getChannelsIndex(): Index<MeiliChannelDocument> {
  return getIndex<MeiliChannelDocument>(INDEXES.CHANNELS);
}

// ============================================================================
// Index Initialization
// ============================================================================

/**
 * Initialize all MeiliSearch indexes with their configurations
 */
export async function initializeIndexes(): Promise<{
  success: boolean;
  errors: string[];
}> {
  const client = getMeiliClient();
  const errors: string[] = [];

  const indexConfigs = [
    { name: INDEXES.MESSAGES, settings: MESSAGES_INDEX_SETTINGS },
    { name: INDEXES.FILES, settings: FILES_INDEX_SETTINGS },
    { name: INDEXES.USERS, settings: USERS_INDEX_SETTINGS },
    { name: INDEXES.CHANNELS, settings: CHANNELS_INDEX_SETTINGS },
  ];

  for (const config of indexConfigs) {
    try {
      // Create index if it doesn't exist
      await client.createIndex(config.name, { primaryKey: "id" }).catch(() => {
        // Index already exists, ignore error
      });

      // Update index settings
      const index = client.index(config.name);
      await index.updateSettings(config.settings);

      // REMOVED: console.log(`[MeiliSearch] Index ${config.name} configured successfully`)
    } catch (error) {
      const message = `Failed to configure index ${config.name}: ${error instanceof Error ? error.message : "Unknown error"}`;
      errors.push(message);
      logger.error(`[MeiliSearch] ${message}`);
    }
  }

  return {
    success: errors.length === 0,
    errors,
  };
}

/**
 * Wait for all pending index tasks to complete
 */
export async function waitForIndexTasks(timeout = 30000): Promise<void> {
  const client = getMeiliClient();

  for (const indexName of Object.values(INDEXES)) {
    try {
      const tasks = await client.tasks.getTasks({
        limit: 10,
        indexUids: [indexName],
        statuses: ["enqueued", "processing"],
      });

      for (const task of tasks.results) {
        await client.tasks.waitForTask(task.uid, { timeout: timeout });
      }
    } catch (error) {
      // Index might not exist yet, ignore
    }
  }
}

// ============================================================================
// Health Check
// ============================================================================

/**
 * Check MeiliSearch health and connectivity
 */
export async function checkHealth(): Promise<{
  healthy: boolean;
  version?: string;
  indexes: {
    name: string;
    documents: number;
    isIndexing: boolean;
  }[];
  error?: string;
}> {
  try {
    const client = getMeiliClient();

    // Check basic health
    const health = await client.health();
    if (health.status !== "available") {
      return {
        healthy: false,
        indexes: [],
        error: "MeiliSearch is not available",
      };
    }

    // Get version
    const version = await client.getVersion();

    // Get index stats
    const indexes: { name: string; documents: number; isIndexing: boolean }[] =
      [];

    for (const indexName of Object.values(INDEXES)) {
      try {
        const index = client.index(indexName);
        const stats = await index.getStats();

        indexes.push({
          name: indexName,
          documents: stats.numberOfDocuments,
          isIndexing: stats.isIndexing,
        });
      } catch {
        // Index doesn't exist yet
        indexes.push({
          name: indexName,
          documents: 0,
          isIndexing: false,
        });
      }
    }

    return {
      healthy: true,
      version: version.pkgVersion,
      indexes,
    };
  } catch (error) {
    return {
      healthy: false,
      indexes: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// Index Management
// ============================================================================

/**
 * Clear all documents from a specific index
 */
export async function clearIndex(indexName: IndexName): Promise<void> {
  const index = getIndex(indexName);
  await index.deleteAllDocuments();
}

/**
 * Clear all documents from all indexes
 */
export async function clearAllIndexes(): Promise<void> {
  for (const indexName of Object.values(INDEXES)) {
    await clearIndex(indexName);
  }
}

/**
 * Delete a specific index
 */
export async function deleteIndex(indexName: IndexName): Promise<void> {
  const client = getMeiliClient();
  await client.deleteIndex(indexName);
}

/**
 * Delete all indexes
 */
export async function deleteAllIndexes(): Promise<void> {
  const client = getMeiliClient();
  for (const indexName of Object.values(INDEXES)) {
    try {
      await client.deleteIndex(indexName);
    } catch {
      // Index might not exist
    }
  }
}

/**
 * Get statistics for all indexes
 */
export async function getIndexStats(): Promise<
  Record<
    IndexName,
    {
      documents: number;
      isIndexing: boolean;
      fieldDistribution: Record<string, number>;
    }
  >
> {
  const stats: Record<
    string,
    {
      documents: number;
      isIndexing: boolean;
      fieldDistribution: Record<string, number>;
    }
  > = {};

  for (const indexName of Object.values(INDEXES)) {
    try {
      const index = getIndex(indexName);
      const indexStats = await index.getStats();

      stats[indexName] = {
        documents: indexStats.numberOfDocuments,
        isIndexing: indexStats.isIndexing,
        fieldDistribution: indexStats.fieldDistribution,
      };
    } catch {
      stats[indexName] = {
        documents: 0,
        isIndexing: false,
        fieldDistribution: {},
      };
    }
  }

  return stats as Record<
    IndexName,
    {
      documents: number;
      isIndexing: boolean;
      fieldDistribution: Record<string, number>;
    }
  >;
}

// ============================================================================
// Export
// ============================================================================

export default {
  getMeiliClient,
  getIndex,
  getMessagesIndex,
  getFilesIndex,
  getUsersIndex,
  getChannelsIndex,
  initializeIndexes,
  checkHealth,
  clearIndex,
  clearAllIndexes,
  deleteIndex,
  deleteAllIndexes,
  getIndexStats,
  waitForIndexTasks,
  INDEXES,
  MESSAGES_INDEX_SETTINGS,
  FILES_INDEX_SETTINGS,
  USERS_INDEX_SETTINGS,
  CHANNELS_INDEX_SETTINGS,
};
