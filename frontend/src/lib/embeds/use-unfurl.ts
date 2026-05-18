"use client";

/**
 * React Hook for URL Unfurling
 *
 * This hook provides a convenient way to fetch and display link previews
 * in React components. It handles loading states, caching, and errors.
 *
 * @example
 * ```tsx
 * import { useUnfurl } from '@/lib/embeds/use-unfurl'
 *
 * function LinkPreview({ url }: { url: string }) {
 *   const { data, loading, error, refetch } = useUnfurl(url)
 *
 *   if (loading) return <Skeleton />
 *   if (error) return <ErrorDisplay error={error} />
 *   if (!data) return null
 *
 *   return (
 *     <div>
 *       <img src={data.image} alt={data.title} />
 *       <h3>{data.title}</h3>
 *       <p>{data.description}</p>
 *     </div>
 *   )
 * }
 * ```
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  unfurlUrl,
  type UnfurlData,
  type UnfurlResult,
  getCached,
} from "./unfurl-service";
import { detectEmbedType, type EmbedType } from "./embed-patterns";
import { useFeatureEnabled } from "@/lib/features/hooks/use-feature";
import { FEATURES } from "@/lib/features/feature-flags";

// ============================================================================
// TYPES
// ============================================================================

export interface UseUnfurlOptions {
  /**
   * Whether to skip the cache and always fetch fresh data
   * @default false
   */
  skipCache?: boolean;

  /**
   * Custom cache TTL in milliseconds
   * @default 3600000 (1 hour)
   */
  cacheTtl?: number;

  /**
   * Whether to automatically fetch on mount
   * @default true
   */
  autoFetch?: boolean;

  /**
   * Delay before fetching (useful for debouncing)
   * @default 0
   */
  delay?: number;

  /**
   * Whether to respect the feature flag
   * @default true
   */
  respectFeatureFlag?: boolean;

  /**
   * Callback when unfurl succeeds
   */
  onSuccess?: (data: UnfurlData) => void;

  /**
   * Callback when unfurl fails
   */
  onError?: (error: string) => void;
}

export interface UseUnfurlReturn {
  /**
   * The unfurled data, if available
   */
  data: UnfurlData | null;

  /**
   * Whether a fetch is in progress
   */
  loading: boolean;

  /**
   * Error message, if any
   */
  error: string | null;

  /**
   * Whether the data was served from cache
   */
  cached: boolean;

  /**
   * The detected embed type for this URL
   */
  embedType: EmbedType;

  /**
   * Manually trigger a refetch
   */
  refetch: () => Promise<void>;

  /**
   * Clear the current data and error
   */
  reset: () => void;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook to unfurl a URL and get preview data
 */
export function useUnfurl(
  url: string | null | undefined,
  options: UseUnfurlOptions = {},
): UseUnfurlReturn {
  const {
    skipCache = false,
    cacheTtl,
    autoFetch = true,
    delay = 0,
    respectFeatureFlag = true,
    onSuccess,
    onError,
  } = options;

  const [data, setData] = useState<UnfurlData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cached, setCached] = useState(false);

  // Check feature flag
  const linkPreviewsEnabled = useFeatureEnabled(
    FEATURES.MESSAGES_LINK_PREVIEWS,
  );
  const isEnabled = !respectFeatureFlag || linkPreviewsEnabled;

  // Detect embed type
  const embedType = url ? detectEmbedType(url) : "generic";

  // Track if component is mounted
  const mountedRef = useRef(true);

  // Track the current URL being fetched to avoid race conditions
  const currentUrlRef = useRef<string | null>(null);

  /**
   * Fetch unfurl data for the URL
   */
  const fetchData = useCallback(async () => {
    if (!url || !isEnabled) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    // Update current URL
    currentUrlRef.current = url;

    // Check cache first (synchronously)
    if (!skipCache) {
      const cachedData = getCached(url);
      if (cachedData) {
        if (mountedRef.current && currentUrlRef.current === url) {
          setData(cachedData);
          setCached(true);
          setError(null);
          setLoading(false);
          onSuccess?.(cachedData);
        }
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const result = await unfurlUrl(url, { skipCache, cacheTtl });

      // Only update state if still mounted and URL hasn't changed
      if (!mountedRef.current || currentUrlRef.current !== url) {
        return;
      }

      if (result.success) {
        setData(result.data);
        setCached(result.cached);
        setError(null);
        onSuccess?.(result.data);
      } else {
        setData(null);
        setCached(false);
        setError(result.error);
        onError?.(result.error);
      }
    } catch (err) {
      if (mountedRef.current && currentUrlRef.current === url) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        setData(null);
        setCached(false);
        setError(errorMessage);
        onError?.(errorMessage);
      }
    } finally {
      if (mountedRef.current && currentUrlRef.current === url) {
        setLoading(false);
      }
    }
  }, [url, skipCache, cacheTtl, isEnabled, onSuccess, onError]);

  /**
   * Refetch data
   */
  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
    setCached(false);
  }, []);

  // Auto-fetch on URL change
  useEffect(() => {
    if (!autoFetch) return;

    if (delay > 0) {
      const timer = setTimeout(fetchData, delay);
      return () => clearTimeout(timer);
    }

    fetchData();
  }, [url, autoFetch, delay, fetchData]);

  // Track mounted state
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    data,
    loading,
    error,
    cached,
    embedType,
    refetch,
    reset,
  };
}

// ============================================================================
// BATCH HOOK
// ============================================================================

export interface UseUnfurlBatchReturn {
  /**
   * Map of URL to unfurl data
   */
  results: Map<string, UnfurlData | null>;

  /**
   * Whether any URL is still loading
   */
  loading: boolean;

  /**
   * Map of URL to error message
   */
  errors: Map<string, string>;

  /**
   * Refetch all URLs
   */
  refetchAll: () => Promise<void>;

  /**
   * Refetch a specific URL
   */
  refetch: (url: string) => Promise<void>;
}

/**
 * Hook to unfurl multiple URLs at once
 */
export function useUnfurlBatch(
  urls: string[],
  options: Omit<UseUnfurlOptions, "onSuccess" | "onError"> = {},
): UseUnfurlBatchReturn {
  const {
    skipCache = false,
    cacheTtl,
    autoFetch = true,
    delay = 0,
    respectFeatureFlag = true,
  } = options;

  const [results, setResults] = useState<Map<string, UnfurlData | null>>(
    new Map(),
  );
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Map<string, string>>(new Map());

  // Check feature flag
  const linkPreviewsEnabled = useFeatureEnabled(
    FEATURES.MESSAGES_LINK_PREVIEWS,
  );
  const isEnabled = !respectFeatureFlag || linkPreviewsEnabled;

  const mountedRef = useRef(true);

  /**
   * Fetch all URLs
   */
  const fetchAll = useCallback(async () => {
    if (!isEnabled || urls.length === 0) {
      setResults(new Map());
      setErrors(new Map());
      setLoading(false);
      return;
    }

    setLoading(true);

    const newResults = new Map<string, UnfurlData | null>();
    const newErrors = new Map<string, string>();

    // Fetch all URLs in parallel (with some concurrency limit)
    const concurrency = 3;
    for (let i = 0; i < urls.length; i += concurrency) {
      const batch = urls.slice(i, i + concurrency);

      await Promise.all(
        batch.map(async (url) => {
          try {
            const result = await unfurlUrl(url, { skipCache, cacheTtl });
            if (result.success) {
              newResults.set(url, result.data);
            } else {
              newResults.set(url, null);
              newErrors.set(url, result.error);
            }
          } catch (err) {
            newResults.set(url, null);
            newErrors.set(
              url,
              err instanceof Error ? err.message : "Unknown error",
            );
          }
        }),
      );
    }

    if (mountedRef.current) {
      setResults(newResults);
      setErrors(newErrors);
      setLoading(false);
    }
  }, [urls, skipCache, cacheTtl, isEnabled]);

  /**
   * Refetch a specific URL
   */
  const refetch = useCallback(
    async (url: string) => {
      if (!isEnabled) return;

      try {
        const result = await unfurlUrl(url, { skipCache: true, cacheTtl });
        if (mountedRef.current) {
          setResults((prev) => {
            const next = new Map(prev);
            next.set(url, result.success ? result.data : null);
            return next;
          });
          if (!result.success) {
            setErrors((prev) => {
              const next = new Map(prev);
              next.set(url, result.error);
              return next;
            });
          }
        }
      } catch (err) {
        if (mountedRef.current) {
          setResults((prev) => {
            const next = new Map(prev);
            next.set(url, null);
            return next;
          });
          setErrors((prev) => {
            const next = new Map(prev);
            next.set(url, err instanceof Error ? err.message : "Unknown error");
            return next;
          });
        }
      }
    },
    [cacheTtl, isEnabled],
  );

  // Auto-fetch on URLs change
  useEffect(() => {
    if (!autoFetch) return;

    if (delay > 0) {
      const timer = setTimeout(fetchAll, delay);
      return () => clearTimeout(timer);
    }

    fetchAll();
  }, [urls.join(","), autoFetch, delay, fetchAll]);

  // Track mounted state
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    results,
    loading,
    errors,
    refetchAll: fetchAll,
    refetch,
  };
}

// ============================================================================
// LAZY UNFURL HOOK
// ============================================================================

/**
 * Hook that returns a function to unfurl URLs on demand
 * Useful when you want to control when unfurling happens
 */
export function useLazyUnfurl(
  options: Omit<UseUnfurlOptions, "autoFetch"> = {},
) {
  const {
    skipCache = false,
    cacheTtl,
    respectFeatureFlag = true,
    onSuccess,
    onError,
  } = options;

  const [loading, setLoading] = useState(false);

  // Check feature flag
  const linkPreviewsEnabled = useFeatureEnabled(
    FEATURES.MESSAGES_LINK_PREVIEWS,
  );
  const isEnabled = !respectFeatureFlag || linkPreviewsEnabled;

  /**
   * Unfurl a URL on demand
   */
  const unfurl = useCallback(
    async (url: string): Promise<UnfurlResult> => {
      if (!isEnabled) {
        return {
          success: false,
          error: "Link previews are disabled",
          errorCode: "FEATURE_DISABLED",
        };
      }

      setLoading(true);

      try {
        const result = await unfurlUrl(url, { skipCache, cacheTtl });

        if (result.success) {
          onSuccess?.(result.data);
        } else {
          onError?.(result.error);
        }

        return result;
      } catch (err) {
        const error = err instanceof Error ? err.message : "Unknown error";
        onError?.(error);
        return {
          success: false,
          error,
          errorCode: "UNKNOWN_ERROR",
        };
      } finally {
        setLoading(false);
      }
    },
    [skipCache, cacheTtl, isEnabled, onSuccess, onError],
  );

  return {
    unfurl,
    loading,
    isEnabled,
  };
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Hook to check if a URL is previewable
 */
export function useIsPreviewable(url: string | null | undefined): boolean {
  const linkPreviewsEnabled = useFeatureEnabled(
    FEATURES.MESSAGES_LINK_PREVIEWS,
  );

  if (!url || !linkPreviewsEnabled) return false;

  // Check if URL is valid
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Hook to get the embed type for a URL
 */
export function useEmbedType(url: string | null | undefined): EmbedType {
  return url ? detectEmbedType(url) : "generic";
}
