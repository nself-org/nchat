"use client";

/**
 * useLinkPreview - Hook for fetching and managing link previews
 *
 * Handles fetching preview data, caching, and state management
 */

import { useCallback, useEffect, useRef } from "react";
import {
  useLinkPreviewStore,
  selectPreview,
  selectIsLoading,
  selectSettings,
} from "@/stores/link-preview-store";
import { fetchPreview, extractUrls, isValidUrl } from "@/lib/link-preview";
import type { LinkPreviewData, FetchOptions } from "@/lib/link-preview";

// ============================================================================
// Types
// ============================================================================

export interface UseLinkPreviewOptions {
  /** Automatically fetch preview when URL changes */
  autoFetch?: boolean;
  /** Skip fetching if preview exists in cache */
  skipIfCached?: boolean;
  /** Message ID for tracking removed previews */
  messageId?: string;
  /** Callback when preview is loaded */
  onLoad?: (data: LinkPreviewData) => void;
  /** Callback when preview fetch fails */
  onError?: (error: string) => void;
}

export interface UseLinkPreviewResult {
  /** Preview data if available */
  preview: LinkPreviewData | null;
  /** Whether preview is currently loading */
  isLoading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Whether preview was removed by user */
  isRemoved: boolean;
  /** Fetch preview data */
  fetch: (forceRefresh?: boolean) => Promise<void>;
  /** Remove preview from display */
  remove: () => void;
  /** Restore removed preview */
  restore: () => void;
  /** Refresh preview data */
  refresh: () => Promise<void>;
}

// ============================================================================
// Hook
// ============================================================================

export function useLinkPreview(
  url: string | null | undefined,
  options: UseLinkPreviewOptions = {},
): UseLinkPreviewResult {
  const {
    autoFetch = true,
    skipIfCached = true,
    messageId = "default",
    onLoad,
    onError,
  } = options;

  const store = useLinkPreviewStore();
  const settings = useLinkPreviewStore(selectSettings);
  const previewEntry = useLinkPreviewStore(selectPreview(url || ""));
  const isLoading = useLinkPreviewStore(selectIsLoading(url || ""));

  // Track if we've already fetched for this URL
  const fetchedRef = useRef<string | null>(null);

  const isRemoved = url ? store.isPreviewRemoved(url, messageId) : false;

  // Fetch preview data
  const fetchPreviewData = useCallback(
    async (forceRefresh = false) => {
      if (!url || !isValidUrl(url)) return;
      if (!settings.enabled) return;
      if (store.isDomainBlocked(url)) return;

      // Skip if already loading
      if (store.isPreviewLoading(url) && !forceRefresh) return;

      // Skip if cached and not forcing refresh
      if (skipIfCached && !forceRefresh && previewEntry?.data) return;

      // Set loading state
      store.setPreviewLoading(url);

      try {
        const fetchOptions: FetchOptions = {
          forceRefresh,
          blockedDomains: settings.blockedDomains,
        };

        const result = await fetchPreview(url, fetchOptions);

        if (result.success && result.data) {
          store.setPreview(url, result.data, messageId);
          onLoad?.(result.data);
        } else {
          const errorMessage =
            result.error?.message || "Failed to fetch preview";
          store.setPreviewError(url, errorMessage);
          onError?.(errorMessage);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        store.setPreviewError(url, errorMessage);
        onError?.(errorMessage);
      }
    },
    [
      url,
      settings.enabled,
      settings.blockedDomains,
      skipIfCached,
      previewEntry?.data,
      messageId,
      onLoad,
      onError,
      store,
    ],
  );

  // Remove preview
  const remove = useCallback(() => {
    if (url) {
      store.removePreview(url, messageId);
    }
  }, [url, messageId, store]);

  // Restore removed preview
  const restore = useCallback(() => {
    if (url) {
      store.restorePreview(url, messageId);
    }
  }, [url, messageId, store]);

  // Refresh preview
  const refresh = useCallback(async () => {
    await fetchPreviewData(true);
  }, [fetchPreviewData]);

  // Auto-fetch on mount and URL change
  useEffect(() => {
    if (!autoFetch) return;
    if (!url || !isValidUrl(url)) return;
    if (!settings.autoUnfurl) return;

    // Don't fetch if we've already fetched this URL
    if (fetchedRef.current === url && !isLoading && previewEntry) return;

    fetchedRef.current = url;
    fetchPreviewData();
  }, [
    url,
    autoFetch,
    settings.autoUnfurl,
    fetchPreviewData,
    isLoading,
    previewEntry,
  ]);

  return {
    preview: previewEntry?.data ?? null,
    isLoading,
    error:
      previewEntry?.status === "error" ? (previewEntry.error ?? null) : null,
    isRemoved,
    fetch: fetchPreviewData,
    remove,
    restore,
    refresh,
  };
}

// ============================================================================
// Batch Hook
// ============================================================================

export interface UseMultipleLinkPreviewsOptions {
  /** Automatically fetch previews for URLs */
  autoFetch?: boolean;
  /** Message ID for tracking removed previews */
  messageId?: string;
  /** Maximum number of previews to fetch */
  maxPreviews?: number;
}

export interface UseMultipleLinkPreviewsResult {
  /** Map of URL to preview data */
  previews: Map<string, LinkPreviewData | null>;
  /** Set of URLs currently loading */
  loadingUrls: Set<string>;
  /** Whether any previews are loading */
  isLoading: boolean;
  /** Fetch all previews */
  fetchAll: (forceRefresh?: boolean) => Promise<void>;
  /** Remove preview for a URL */
  remove: (url: string) => void;
  /** Restore preview for a URL */
  restore: (url: string) => void;
}

export function useMultipleLinkPreviews(
  urls: string[],
  options: UseMultipleLinkPreviewsOptions = {},
): UseMultipleLinkPreviewsResult {
  const { autoFetch = true, messageId = "default", maxPreviews = 5 } = options;

  const store = useLinkPreviewStore();
  const settings = useLinkPreviewStore(selectSettings);

  // Track fetched URLs
  const fetchedRef = useRef<Set<string>>(new Set());

  // Get previews for all URLs
  const previews = new Map<string, LinkPreviewData | null>();
  const loadingUrls = new Set<string>();

  const validUrls = urls
    .filter((url) => isValidUrl(url))
    .filter((url) => !store.isDomainBlocked(url))
    .filter((url) => !store.isPreviewRemoved(url, messageId))
    .slice(0, maxPreviews);

  for (const url of validUrls) {
    const entry = store.getPreview(url);
    previews.set(url, entry?.data ?? null);
    if (store.isPreviewLoading(url)) {
      loadingUrls.add(url);
    }
  }

  const isLoading = loadingUrls.size > 0;

  // Fetch all previews
  const fetchAll = useCallback(
    async (forceRefresh = false) => {
      if (!settings.enabled || !settings.autoUnfurl) return;

      const urlsToFetch = validUrls.filter((url) => {
        if (forceRefresh) return true;
        if (fetchedRef.current.has(url)) return false;
        const entry = store.getPreview(url);
        return !entry?.data;
      });

      if (urlsToFetch.length === 0) return;

      // Mark as loading
      urlsToFetch.forEach((url) => {
        store.setPreviewLoading(url);
        fetchedRef.current.add(url);
      });

      // Fetch in parallel
      await Promise.all(
        urlsToFetch.map(async (url) => {
          try {
            const result = await fetchPreview(url, {
              forceRefresh,
              blockedDomains: settings.blockedDomains,
            });

            if (result.success && result.data) {
              store.setPreview(url, result.data, messageId);
            } else {
              store.setPreviewError(
                url,
                result.error?.message || "Failed to fetch",
              );
            }
          } catch (err) {
            store.setPreviewError(
              url,
              err instanceof Error ? err.message : "Unknown error",
            );
          }
        }),
      );
    },
    [validUrls, settings, messageId, store],
  );

  // Remove preview
  const remove = useCallback(
    (url: string) => {
      store.removePreview(url, messageId);
    },
    [messageId, store],
  );

  // Restore preview
  const restore = useCallback(
    (url: string) => {
      store.restorePreview(url, messageId);
    },
    [messageId, store],
  );

  // Auto-fetch on mount
  useEffect(() => {
    if (!autoFetch || !settings.enabled || !settings.autoUnfurl) return;
    fetchAll();
  }, [autoFetch, settings.enabled, settings.autoUnfurl, fetchAll]);

  return {
    previews,
    loadingUrls,
    isLoading,
    fetchAll,
    remove,
    restore,
  };
}

// ============================================================================
// Text Extraction Hook
// ============================================================================

export interface UseExtractedUrlsOptions {
  /** Maximum number of URLs to extract */
  maxUrls?: number;
  /** Automatically fetch previews */
  autoFetch?: boolean;
  /** Message ID */
  messageId?: string;
}

export function useExtractedUrls(
  text: string,
  options: UseExtractedUrlsOptions = {},
) {
  const { maxUrls = 5, autoFetch = true, messageId = "default" } = options;

  const urls = extractUrls(text).slice(0, maxUrls);

  return useMultipleLinkPreviews(urls, {
    autoFetch,
    messageId,
    maxPreviews: maxUrls,
  });
}

export default useLinkPreview;
