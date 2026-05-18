/**
 * MeiliSearch Client
 *
 * Provides a configured MeiliSearch client for full-text search
 * across messages, files, users, and channels.
 */

import { MeiliSearch, Index } from "meilisearch";

import { logger } from "@/lib/logger";

// MeiliSearch configuration
const MEILISEARCH_HOST =
  process.env.NEXT_PUBLIC_MEILISEARCH_URL || "http://search.localhost:7700";
const MEILISEARCH_API_KEY =
  process.env.MEILISEARCH_MASTER_KEY || "nchat-search-dev-key-32-chars-long";

// Index names
export const INDEX_NAMES = {
  MESSAGES: "messages",
  FILES: "files",
  USERS: "users",
  CHANNELS: "channels",
} as const;

export type IndexName = (typeof INDEX_NAMES)[keyof typeof INDEX_NAMES];

// Initialize MeiliSearch client
let client: MeiliSearch | null = null;

export function getMeiliSearchClient(): MeiliSearch {
  if (!client) {
    client = new MeiliSearch({
      host: MEILISEARCH_HOST,
      apiKey: MEILISEARCH_API_KEY,
    });
  }
  return client;
}

// Get specific index
export function getIndex(indexName: IndexName): Index {
  const client = getMeiliSearchClient();
  return client.index(indexName);
}

/**
 * Initialize all indexes with their configuration
 */
export async function initializeIndexes(): Promise<void> {
  const client = getMeiliSearchClient();

  try {
    // Create indexes if they don't exist
    await Promise.all(
      [
        client.createIndex(INDEX_NAMES.MESSAGES, { primaryKey: "id" }),
        client.createIndex(INDEX_NAMES.FILES, { primaryKey: "id" }),
        client.createIndex(INDEX_NAMES.USERS, { primaryKey: "id" }),
        client.createIndex(INDEX_NAMES.CHANNELS, { primaryKey: "id" }),
      ].map((p) =>
        p.catch(() => {
          // Ignore errors if index already exists
        }),
      ),
    );

    // Configure messages index
    const messagesIndex = getIndex(INDEX_NAMES.MESSAGES);
    await Promise.all([
      messagesIndex.updateSearchableAttributes([
        "content",
        "author_name",
        "channel_name",
      ]),
      messagesIndex.updateFilterableAttributes([
        "channel_id",
        "author_id",
        "created_at",
        "has_link",
        "has_file",
        "has_image",
        "is_pinned",
        "is_starred",
        "thread_id",
      ]),
      messagesIndex.updateSortableAttributes(["created_at"]),
      messagesIndex.updateRankingRules([
        "words",
        "typo",
        "proximity",
        "attribute",
        "sort",
        "exactness",
        "created_at:desc",
      ]),
    ]);

    // Configure files index
    const filesIndex = getIndex(INDEX_NAMES.FILES);
    await Promise.all([
      filesIndex.updateSearchableAttributes([
        "name",
        "original_name",
        "description",
        "uploader_name",
      ]),
      filesIndex.updateFilterableAttributes([
        "uploader_id",
        "channel_id",
        "mime_type",
        "file_type",
        "created_at",
        "size",
      ]),
      filesIndex.updateSortableAttributes(["created_at", "size"]),
    ]);

    // Configure users index
    const usersIndex = getIndex(INDEX_NAMES.USERS);
    await Promise.all([
      usersIndex.updateSearchableAttributes([
        "display_name",
        "username",
        "email",
        "bio",
      ]),
      usersIndex.updateFilterableAttributes([
        "role",
        "is_active",
        "created_at",
      ]),
      usersIndex.updateSortableAttributes(["created_at"]),
    ]);

    // Configure channels index
    const channelsIndex = getIndex(INDEX_NAMES.CHANNELS);
    await Promise.all([
      channelsIndex.updateSearchableAttributes([
        "name",
        "description",
        "topic",
      ]),
      channelsIndex.updateFilterableAttributes([
        "is_private",
        "is_archived",
        "created_by",
        "created_at",
      ]),
      channelsIndex.updateSortableAttributes(["created_at"]),
    ]);
  } catch (error) {
    logger.error("Error initializing MeiliSearch indexes:", error);
    throw error;
  }
}

/**
 * Search across a specific index
 */
export interface SearchOptions {
  filters?: string;
  sort?: string[];
  limit?: number;
  offset?: number;
  attributesToHighlight?: string[];
  attributesToCrop?: string[];
  cropLength?: number;
}

export async function searchIndex<T = unknown>(
  indexName: IndexName,
  query: string,
  options: SearchOptions = {},
): Promise<{
  hits: T[];
  estimatedTotalHits: number;
  processingTimeMs: number;
}> {
  const index = getIndex(indexName);

  const result = await index.search(query, {
    filter: options.filters,
    sort: options.sort,
    limit: options.limit || 20,
    offset: options.offset || 0,
    attributesToHighlight: options.attributesToHighlight || ["*"],
    attributesToCrop: options.attributesToCrop,
    cropLength: options.cropLength || 200,
    showMatchesPosition: true,
  });

  return {
    hits: result.hits as T[],
    estimatedTotalHits: result.estimatedTotalHits || 0,
    processingTimeMs: result.processingTimeMs || 0,
  };
}

/**
 * Search across all indexes
 */
export async function searchAll(
  query: string,
  options: SearchOptions = {},
): Promise<{
  messages: unknown[];
  files: unknown[];
  users: unknown[];
  channels: unknown[];
  totalHits: number;
  processingTimeMs: number;
}> {
  const startTime = Date.now();

  const [messagesResult, filesResult, usersResult, channelsResult] =
    await Promise.all([
      searchIndex(INDEX_NAMES.MESSAGES, query, options),
      searchIndex(INDEX_NAMES.FILES, query, options),
      searchIndex(INDEX_NAMES.USERS, query, options),
      searchIndex(INDEX_NAMES.CHANNELS, query, options),
    ]);

  return {
    messages: messagesResult.hits,
    files: filesResult.hits,
    users: usersResult.hits,
    channels: channelsResult.hits,
    totalHits:
      messagesResult.estimatedTotalHits +
      filesResult.estimatedTotalHits +
      usersResult.estimatedTotalHits +
      channelsResult.estimatedTotalHits,
    processingTimeMs: Date.now() - startTime,
  };
}

/**
 * Get index stats
 */
export async function getIndexStats(indexName: IndexName) {
  const index = getIndex(indexName);
  return await index.getStats();
}

/**
 * Clear all documents from an index
 */
export async function clearIndex(indexName: IndexName): Promise<void> {
  const index = getIndex(indexName);
  await index.deleteAllDocuments();
}

/**
 * Delete all indexes (use with caution!)
 */
export async function deleteAllIndexes(): Promise<void> {
  const client = getMeiliSearchClient();
  await Promise.all(
    Object.values(INDEX_NAMES).map((indexName) =>
      client.deleteIndex(indexName).catch(() => {
        // Ignore errors if index doesn't exist
      }),
    ),
  );
}

/**
 * Health check for MeiliSearch
 */
export async function healthCheck(): Promise<{
  healthy: boolean;
  version?: string;
  error?: string;
}> {
  try {
    const client = getMeiliSearchClient();
    const health = await client.health();
    const version = await client.getVersion();

    return {
      healthy: health.status === "available",
      version: version.pkgVersion,
    };
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export default getMeiliSearchClient;
