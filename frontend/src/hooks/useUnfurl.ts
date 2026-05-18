"use client";

/**
 * useUnfurl - Hook for URL unfurling operations
 *
 * Provides utilities for detecting and unfurling URLs in text
 */

import { useCallback, useMemo } from "react";
import {
  extractUrls,
  isValidUrl,
  detectUrlType,
  mightHavePreview,
} from "@/lib/link-preview";
import {
  useLinkPreviewStore,
  selectSettings,
  selectAllBlockedDomains,
} from "@/stores/link-preview-store";

// ============================================================================
// Types
// ============================================================================

export interface UrlInfo {
  url: string;
  type: ReturnType<typeof detectUrlType>;
  mightHavePreview: boolean;
  isBlocked: boolean;
}

export interface UseUnfurlResult {
  /** Extract URLs from text */
  extractUrls: (text: string) => string[];
  /** Get information about a URL */
  getUrlInfo: (url: string) => UrlInfo;
  /** Check if URL should be unfurled */
  shouldUnfurl: (url: string) => boolean;
  /** Check if URL is blocked */
  isBlocked: (url: string) => boolean;
  /** Detect URL type */
  detectType: (url: string) => ReturnType<typeof detectUrlType>;
  /** User settings */
  settings: ReturnType<typeof selectSettings>;
}

// ============================================================================
// Hook
// ============================================================================

export function useUnfurl(): UseUnfurlResult {
  const settings = useLinkPreviewStore(selectSettings);
  const blockedDomains = useLinkPreviewStore(selectAllBlockedDomains);

  // Check if URL is blocked
  const isBlocked = useCallback(
    (url: string): boolean => {
      if (!isValidUrl(url)) return true;

      try {
        const domain = new URL(url).hostname
          .toLowerCase()
          .replace(/^www\./, "");
        return blockedDomains.some(
          (blocked) => domain === blocked || domain.endsWith(`.${blocked}`),
        );
      } catch {
        return true;
      }
    },
    [blockedDomains],
  );

  // Check if URL should be unfurled
  const shouldUnfurl = useCallback(
    (url: string): boolean => {
      if (!settings.enabled) return false;
      if (!settings.autoUnfurl) return false;
      if (!isValidUrl(url)) return false;
      if (isBlocked(url)) return false;
      if (!mightHavePreview(url)) return false;
      return true;
    },
    [settings.enabled, settings.autoUnfurl, isBlocked],
  );

  // Get URL information
  const getUrlInfo = useCallback(
    (url: string): UrlInfo => {
      return {
        url,
        type: detectUrlType(url),
        mightHavePreview: mightHavePreview(url),
        isBlocked: isBlocked(url),
      };
    },
    [isBlocked],
  );

  // Detect URL type
  const detectType = useCallback((url: string) => {
    return detectUrlType(url);
  }, []);

  return {
    extractUrls,
    getUrlInfo,
    shouldUnfurl,
    isBlocked,
    detectType,
    settings,
  };
}

// ============================================================================
// URL Detection in Text Hook
// ============================================================================

export interface UseUrlDetectionOptions {
  /** Maximum URLs to detect */
  maxUrls?: number;
  /** Filter out blocked URLs */
  filterBlocked?: boolean;
}

export interface DetectedUrl extends UrlInfo {
  index: number;
  length: number;
}

export function useUrlDetection(
  text: string,
  options: UseUrlDetectionOptions = {},
): DetectedUrl[] {
  const { maxUrls = 10, filterBlocked = true } = options;
  const { isBlocked } = useUnfurl();

  return useMemo(() => {
    const urls = extractUrls(text);
    const detected: DetectedUrl[] = [];

    for (const url of urls) {
      if (detected.length >= maxUrls) break;

      const blocked = isBlocked(url);
      if (filterBlocked && blocked) continue;

      const index = text.indexOf(url);
      detected.push({
        url,
        type: detectUrlType(url),
        mightHavePreview: mightHavePreview(url),
        isBlocked: blocked,
        index,
        length: url.length,
      });
    }

    return detected;
  }, [text, maxUrls, filterBlocked, isBlocked]);
}

// ============================================================================
// URL Validation Hook
// ============================================================================

export interface UseUrlValidationResult {
  isValid: boolean;
  domain: string | null;
  protocol: string | null;
  type: ReturnType<typeof detectUrlType>;
  isBlocked: boolean;
  canPreview: boolean;
}

export function useUrlValidation(
  url: string | null | undefined,
): UseUrlValidationResult {
  const { isBlocked } = useUnfurl();
  const settings = useLinkPreviewStore(selectSettings);

  return useMemo(() => {
    if (!url) {
      return {
        isValid: false,
        domain: null,
        protocol: null,
        type: "generic" as const,
        isBlocked: false,
        canPreview: false,
      };
    }

    const valid = isValidUrl(url);
    if (!valid) {
      return {
        isValid: false,
        domain: null,
        protocol: null,
        type: "generic" as const,
        isBlocked: false,
        canPreview: false,
      };
    }

    try {
      const parsed = new URL(url);
      const blocked = isBlocked(url);
      const type = detectUrlType(url);

      return {
        isValid: true,
        domain: parsed.hostname.replace(/^www\./, ""),
        protocol: parsed.protocol.replace(":", ""),
        type,
        isBlocked: blocked,
        canPreview: settings.enabled && !blocked && mightHavePreview(url),
      };
    } catch {
      return {
        isValid: false,
        domain: null,
        protocol: null,
        type: "generic" as const,
        isBlocked: false,
        canPreview: false,
      };
    }
  }, [url, isBlocked, settings.enabled]);
}

export default useUnfurl;
