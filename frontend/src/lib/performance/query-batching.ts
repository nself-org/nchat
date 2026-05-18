/**
 * GraphQL Query Batching and Optimization
 *
 * Utilities for batching GraphQL queries, reducing over-fetching,
 * and optimizing database access patterns.
 */

import { ApolloClient, gql, DocumentNode } from "@apollo/client";

// =============================================================================
// Types
// =============================================================================

interface BatchedQuery {
  id: string;
  query: DocumentNode;
  variables?: Record<string, any>;
  resolve: (data: any) => void;
  reject: (error: any) => void;
}

interface DataLoaderOptions {
  /** Maximum batch size */
  maxBatchSize?: number;
  /** Batch window in milliseconds */
  batchWindowMs?: number;
  /** Cache results */
  cache?: boolean;
  /** Cache TTL in milliseconds */
  cacheTTL?: number;
}

// =============================================================================
// Query Batcher
// =============================================================================

/**
 * Batches multiple GraphQL queries into a single request
 */
export class QueryBatcher {
  private queue: BatchedQuery[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private readonly batchWindowMs: number;
  private readonly maxBatchSize: number;

  constructor(
    private client: ApolloClient<any>,
    options: DataLoaderOptions = {},
  ) {
    this.batchWindowMs = options.batchWindowMs ?? 10;
    this.maxBatchSize = options.maxBatchSize ?? 50;
  }

  /**
   * Add query to batch
   */
  async query<T = any>(
    query: DocumentNode,
    variables?: Record<string, any>,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        id: Math.random().toString(36).substring(7),
        query,
        variables,
        resolve,
        reject,
      });

      // Start batch timer if not already running
      if (!this.batchTimer) {
        this.batchTimer = setTimeout(() => this.flush(), this.batchWindowMs);
      }

      // Flush immediately if max batch size reached
      if (this.queue.length >= this.maxBatchSize) {
        this.flush();
      }
    });
  }

  /**
   * Execute all queued queries
   */
  private async flush() {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    if (this.queue.length === 0) {
      return;
    }

    const batch = this.queue.splice(0, this.maxBatchSize);

    // Execute all queries in parallel
    const results = await Promise.allSettled(
      batch.map(({ query, variables }) =>
        this.client.query({ query, variables, fetchPolicy: "network-only" }),
      ),
    );

    // Resolve/reject promises
    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        batch[index].resolve(result.value.data);
      } else {
        batch[index].reject(result.reason);
      }
    });

    // If there are more queries, flush again
    if (this.queue.length > 0) {
      setTimeout(() => this.flush(), 0);
    }
  }
}

// =============================================================================
// DataLoader Pattern Implementation
// =============================================================================

/**
 * Generic DataLoader for batching and caching
 */
export class DataLoader<K, V> {
  private queue: Array<{
    key: K;
    resolve: (value: V) => void;
    reject: (error: any) => void;
  }> = [];
  private cache = new Map<string, { value: V; timestamp: number }>();
  private batchTimer: NodeJS.Timeout | null = null;
  private readonly options: Required<DataLoaderOptions>;

  constructor(
    private batchLoadFn: (keys: K[]) => Promise<V[]>,
    options: DataLoaderOptions = {},
  ) {
    this.options = {
      maxBatchSize: options.maxBatchSize ?? 100,
      batchWindowMs: options.batchWindowMs ?? 10,
      cache: options.cache ?? true,
      cacheTTL: options.cacheTTL ?? 60000, // 1 minute default
    };
  }

  /**
   * Load a single item (batched)
   */
  async load(key: K): Promise<V> {
    // Check cache
    if (this.options.cache) {
      const cached = this.getCached(key);
      if (cached !== null) {
        return cached;
      }
    }

    return new Promise((resolve, reject) => {
      this.queue.push({ key, resolve, reject });

      // Start batch timer
      if (!this.batchTimer) {
        this.batchTimer = setTimeout(
          () => this.flush(),
          this.options.batchWindowMs,
        );
      }

      // Flush if max batch size reached
      if (this.queue.length >= this.options.maxBatchSize) {
        this.flush();
      }
    });
  }

  /**
   * Load multiple items (batched)
   */
  async loadMany(keys: K[]): Promise<V[]> {
    return Promise.all(keys.map((key) => this.load(key)));
  }

  /**
   * Clear cache
   */
  clearCache(key?: K) {
    if (key) {
      this.cache.delete(this.getCacheKey(key));
    } else {
      this.cache.clear();
    }
  }

  /**
   * Flush batch queue
   */
  private async flush() {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    if (this.queue.length === 0) {
      return;
    }

    const batch = this.queue.splice(0, this.options.maxBatchSize);
    const keys = batch.map((item) => item.key);

    try {
      const results = await this.batchLoadFn(keys);

      // Cache and resolve results
      results.forEach((result, index) => {
        const key = keys[index];
        if (this.options.cache) {
          this.setCached(key, result);
        }
        batch[index].resolve(result);
      });
    } catch (error) {
      // Reject all promises on error
      batch.forEach((item) => item.reject(error));
    }

    // Continue flushing if more items in queue
    if (this.queue.length > 0) {
      setTimeout(() => this.flush(), 0);
    }
  }

  private getCacheKey(key: K): string {
    return JSON.stringify(key);
  }

  private getCached(key: K): V | null {
    const cacheKey = this.getCacheKey(key);
    const cached = this.cache.get(cacheKey);

    if (!cached) {
      return null;
    }

    // Check TTL
    if (Date.now() - cached.timestamp > this.options.cacheTTL) {
      this.cache.delete(cacheKey);
      return null;
    }

    return cached.value;
  }

  private setCached(key: K, value: V) {
    this.cache.set(this.getCacheKey(key), {
      value,
      timestamp: Date.now(),
    });
  }
}

// =============================================================================
// Pre-configured DataLoaders
// =============================================================================

/**
 * User DataLoader - batch load users by ID
 */
export function createUserLoader(client: ApolloClient<any>) {
  return new DataLoader<string, any>(
    async (userIds) => {
      const { data } = await client.query({
        query: gql`
          query GetUsersByIds($ids: [uuid!]!) {
            nchat_users(where: { id: { _in: $ids } }) {
              id
              username
              display_name
              avatar_url
              role
              presence
              created_at
            }
          }
        `,
        variables: { ids: userIds },
      });

      // Map results back to input order
      const userMap = new Map(data.nchat_users.map((u: any) => [u.id, u]));
      return userIds.map((id) => userMap.get(id) || null);
    },
    { cacheTTL: 30000 }, // 30 seconds
  );
}

/**
 * Channel DataLoader - batch load channels by ID
 */
export function createChannelLoader(client: ApolloClient<any>) {
  return new DataLoader<string, any>(
    async (channelIds) => {
      const { data } = await client.query({
        query: gql`
          query GetChannelsByIds($ids: [uuid!]!) {
            nchat_channels(where: { id: { _in: $ids } }) {
              id
              name
              slug
              description
              type
              is_archived
              member_count
              created_at
            }
          }
        `,
        variables: { ids: channelIds },
      });

      const channelMap = new Map(
        data.nchat_channels.map((c: any) => [c.id, c]),
      );
      return channelIds.map((id) => channelMap.get(id) || null);
    },
    { cacheTTL: 60000 }, // 1 minute
  );
}

/**
 * Message DataLoader - batch load messages by ID
 */
export function createMessageLoader(client: ApolloClient<any>) {
  return new DataLoader<string, any>(
    async (messageIds) => {
      const { data } = await client.query({
        query: gql`
          query GetMessagesByIds($ids: [uuid!]!) {
            nchat_messages(where: { id: { _in: $ids } }) {
              id
              content
              type
              channel_id
              user_id
              created_at
              is_edited
              reactions
            }
          }
        `,
        variables: { ids: messageIds },
      });

      const messageMap = new Map(
        data.nchat_messages.map((m: any) => [m.id, m]),
      );
      return messageIds.map((id) => messageMap.get(id) || null);
    },
    { cacheTTL: 10000 }, // 10 seconds (messages change frequently)
  );
}

// =============================================================================
// Query Optimization Helpers
// =============================================================================

/**
 * Optimize GraphQL query fragments
 */
export const OPTIMIZED_FRAGMENTS = {
  // Minimal user fields for lists
  userListItem: gql`
    fragment UserListItem on nchat_users {
      id
      username
      display_name
      avatar_url
      presence
    }
  `,

  // Full user profile
  userProfile: gql`
    fragment UserProfile on nchat_users {
      id
      username
      display_name
      avatar_url
      role
      presence
      email
      created_at
      custom_status
    }
  `,

  // Minimal message fields for lists
  messageListItem: gql`
    fragment MessageListItem on nchat_messages {
      id
      content
      type
      user_id
      created_at
      is_edited
      reactions
    }
  `,

  // Channel summary
  channelSummary: gql`
    fragment ChannelSummary on nchat_channels {
      id
      name
      slug
      type
      member_count
      last_message_at
    }
  `,
};

/**
 * Create paginated query with cursor
 */
export function createPaginatedQuery(
  baseQuery: DocumentNode,
  limit: number = 50,
) {
  return {
    query: baseQuery,
    variables: {
      limit,
      offset: 0,
    },
    fetchPolicy: "network-only" as const,
  };
}

/**
 * Prefetch critical data on app load
 */
export async function prefetchCriticalData(client: ApolloClient<any>) {
  const queries = [
    // Prefetch current user
    client.query({
      query: gql`
        query GetCurrentUser {
          nchat_users(limit: 1) {
            id
            username
            display_name
            avatar_url
            role
          }
        }
      `,
    }),

    // Prefetch default channels
    client.query({
      query: gql`
        query GetDefaultChannels {
          nchat_channels(where: { is_default: { _eq: true } }, limit: 5) {
            id
            name
            slug
            type
            member_count
          }
        }
      `,
    }),
  ];

  await Promise.allSettled(queries);
}
