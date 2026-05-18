/**
 * Cached HTTP Client
 *
 * HTTP client wrapper with intelligent caching for API requests.
 * Integrates with Apollo Client and Next.js fetch.
 */

import { getApiCache, type CacheOptions, CACHE_TTL } from "./cache-manager";

// =============================================================================
// Types
// =============================================================================

export interface FetchOptions extends Omit<RequestInit, "cache"> {
  cacheOptions?: CacheOptions;
  baseURL?: string;
}

export interface CachedResponse<T = unknown> {
  data: T;
  cached: boolean;
  cacheAge?: number;
}

// =============================================================================
// Cached Fetch
// =============================================================================

/**
 * Fetch with caching support
 */
export async function cachedFetch<T = unknown>(
  url: string,
  options: FetchOptions = {},
): Promise<CachedResponse<T>> {
  const cache = getApiCache();
  const { cacheOptions, baseURL, ...fetchOptions } = options;

  // Build full URL
  const fullURL = baseURL ? `${baseURL}${url}` : url;

  // Generate cache key from URL and relevant options
  const cacheKey = generateCacheKey(fullURL, fetchOptions);

  // Check if we should skip cache
  const skipCache = cacheOptions?.skipCache || cacheOptions?.forceRefresh;
  const ttl = cacheOptions?.ttl ?? CACHE_TTL.STATIC;

  // Try to get from cache (unless skipping)
  if (!skipCache && ttl > 0) {
    const cached = cache.get<T>(cacheKey);
    if (cached !== null) {
      return {
        data: cached,
        cached: true,
        cacheAge: Date.now() - (cache.getStats().hits > 0 ? 0 : Date.now()),
      };
    }
  }

  // Fetch from API
  const response = await fetch(fullURL, fetchOptions);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = (await response.json()) as T;

  // Store in cache
  if (ttl > 0) {
    cache.set(cacheKey, data, cacheOptions);
  }

  return {
    data,
    cached: false,
  };
}

/**
 * Cached GET request
 */
export async function cachedGet<T = unknown>(
  url: string,
  options: FetchOptions = {},
): Promise<CachedResponse<T>> {
  return cachedFetch<T>(url, { ...options, method: "GET" });
}

/**
 * Cached POST request (typically not cached, but can be)
 */
export async function cachedPost<T = unknown>(
  url: string,
  body?: unknown,
  options: FetchOptions = {},
): Promise<CachedResponse<T>> {
  return cachedFetch<T>(url, {
    ...options,
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
}

// =============================================================================
// GraphQL Caching
// =============================================================================

/**
 * Cache GraphQL query result
 */
export function cacheGraphQLQuery<T = unknown>(
  operationName: string,
  variables: Record<string, unknown>,
  data: T,
  options?: CacheOptions,
): void {
  const cache = getApiCache();
  const cacheKey = `graphql:${operationName}:${JSON.stringify(variables)}`;
  cache.set(cacheKey, data, options);
}

/**
 * Get cached GraphQL query result
 */
export function getCachedGraphQLQuery<T = unknown>(
  operationName: string,
  variables: Record<string, unknown>,
): T | null {
  const cache = getApiCache();
  const cacheKey = `graphql:${operationName}:${JSON.stringify(variables)}`;
  return cache.get<T>(cacheKey);
}

/**
 * Invalidate GraphQL query cache
 */
export function invalidateGraphQLQuery(
  operationName: string,
  variables?: Record<string, unknown>,
): void {
  const cache = getApiCache();
  if (variables) {
    const cacheKey = `graphql:${operationName}:${JSON.stringify(variables)}`;
    cache.delete(cacheKey);
  } else {
    // Invalidate all queries for this operation
    const prefix = `graphql:${operationName}:`;
    for (const key of cache.keys()) {
      if (key.startsWith(prefix)) {
        cache.delete(key);
      }
    }
  }
}

// =============================================================================
// Cache Helpers
// =============================================================================

/**
 * Generate cache key from URL and options
 */
function generateCacheKey(url: string, options: RequestInit): string {
  const method = options.method || "GET";
  const body = options.body ? `:${hashString(String(options.body))}` : "";
  return `fetch:${method}:${url}${body}`;
}

/**
 * Simple string hash function
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

// =============================================================================
// Cache Warming
// =============================================================================

/**
 * Warm cache with common queries
 */
export async function warmCache(options: {
  userId?: string;
  channelIds?: string[];
}): Promise<void> {
  const { userId, channelIds } = options;

  const promises: Promise<unknown>[] = [];

  // Warm user data
  if (userId) {
    promises.push(
      cachedGet(`/api/users/${userId}`, {
        cacheOptions: {
          ttl: CACHE_TTL.USER_PROFILE,
          tags: ["user", `user:${userId}`],
        },
      }),
    );
  }

  // Warm channel data
  if (channelIds && channelIds.length > 0) {
    for (const channelId of channelIds) {
      promises.push(
        cachedGet(`/api/channels/${channelId}`, {
          cacheOptions: {
            ttl: CACHE_TTL.CHANNEL_LIST,
            tags: ["channel", `channel:${channelId}`],
          },
        }),
      );
    }
  }

  await Promise.allSettled(promises);
}

/**
 * Prefetch data for faster navigation
 */
export async function prefetchData(
  urls: string[],
  ttl?: number,
): Promise<void> {
  const promises = urls.map((url) =>
    cachedGet(url, {
      cacheOptions: { ttl: ttl ?? CACHE_TTL.STATIC },
    }),
  );

  await Promise.allSettled(promises);
}

// =============================================================================
// Cache Invalidation Patterns
// =============================================================================

/**
 * Invalidate user-related cache
 */
export function invalidateUserCache(userId: string): void {
  const cache = getApiCache();
  cache.invalidateByTag(`user:${userId}`);
}

/**
 * Invalidate channel-related cache
 */
export function invalidateChannelCache(channelId: string): void {
  const cache = getApiCache();
  cache.invalidateByTag(`channel:${channelId}`);
}

/**
 * Invalidate message-related cache
 */
export function invalidateMessageCache(channelId?: string): void {
  const cache = getApiCache();
  if (channelId) {
    cache.invalidateByTag(`channel:${channelId}:messages`);
  } else {
    cache.invalidateByTag("messages");
  }
}

/**
 * Invalidate all cache
 */
export function invalidateAllCache(): void {
  const cache = getApiCache();
  cache.clear();
}
