"use client";

/**
 * useLinkPreviews Hook
 *
 * Hook for fetching and caching link previews.
 */

import { useState, useCallback, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import {
  fetchLinkPreviewViaApi,
  extractUrls,
  getCachedPreview,
  type LinkPreview,
  type LinkPreviewResult,
} from "@/lib/messages/link-preview";

interface UseLinkPreviewsOptions {
  autoFetch?: boolean;
  skipCache?: boolean;
}

export function useLinkPreviews(
  text?: string,
  options: UseLinkPreviewsOptions = {},
) {
  const { autoFetch = true, skipCache = false } = options;
  const { toast } = useToast();

  const [previews, setPreviews] = useState<Map<string, LinkPreview>>(new Map());
  const [loading, setLoading] = useState<Map<string, boolean>>(new Map());
  const [errors, setErrors] = useState<Map<string, string>>(new Map());

  const urls = text ? extractUrls(text) : [];

  const fetchPreview = useCallback(
    async (url: string) => {
      try {
        logger.debug("Fetching link preview", { url });

        // Check cache first if not skipping
        if (!skipCache) {
          const cached = getCachedPreview(url);
          if (cached) {
            setPreviews((prev) => new Map(prev).set(url, cached));
            return cached;
          }
        }

        setLoading((prev) => new Map(prev).set(url, true));
        setErrors((prev) => {
          const next = new Map(prev);
          next.delete(url);
          return next;
        });

        const result: LinkPreviewResult = await fetchLinkPreviewViaApi(url, {
          skipCache,
        });

        if (result.success && result.preview) {
          setPreviews((prev) => new Map(prev).set(url, result.preview!));
          logger.info("Link preview fetched successfully", {
            url,
            cached: result.cached,
          });
          return result.preview;
        } else {
          const errorMsg = result.error || "Failed to fetch preview";
          setErrors((prev) => new Map(prev).set(url, errorMsg));
          logger.warn("Failed to fetch link preview", {
            url,
            error: errorMsg,
            errorCode: result.errorCode,
          });
          return null;
        }
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : "Unknown error";
        setErrors((prev) => new Map(prev).set(url, errorMsg));
        logger.error(
          "Error fetching link preview",
          error instanceof Error ? error : undefined,
          {
            url,
            errorMessage: errorMsg,
          },
        );
        return null;
      } finally {
        setLoading((prev) => {
          const next = new Map(prev);
          next.delete(url);
          return next;
        });
      }
    },
    [skipCache, toast],
  );

  const dismissPreview = useCallback((url: string) => {
    setPreviews((prev) => {
      const next = new Map(prev);
      next.delete(url);
      return next;
    });
  }, []);

  const refetchPreview = useCallback(
    (url: string) => {
      return fetchPreview(url);
    },
    [fetchPreview],
  );

  // Auto-fetch previews for URLs in text
  useEffect(() => {
    if (!autoFetch || urls.length === 0) return;

    urls.forEach((url) => {
      // Only fetch if not already fetched, loading, or errored
      if (!previews.has(url) && !loading.get(url) && !errors.has(url)) {
        fetchPreview(url);
      }
    });
  }, [urls.join(","), autoFetch, fetchPreview]);

  return {
    // Data
    urls,
    previews,
    loading,
    errors,

    // Actions
    fetchPreview,
    dismissPreview,
    refetchPreview,

    // Helpers
    getPreview: (url: string) => previews.get(url),
    isLoading: (url: string) => loading.get(url) || false,
    getError: (url: string) => errors.get(url),
  };
}
