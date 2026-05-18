/**
 * Unfurl - Main URL unfurling logic
 *
 * Coordinates parsing, domain handling, and data merging for link previews
 */

import type {
  LinkPreviewData,
  BasePreviewData,
  OpenGraphData,
  TwitterCardData,
  PreviewStatus,
} from "./preview-types";
import {
  parseOpenGraph,
  extractFallbackMetadata,
  mergeWithFallbacks,
} from "./og-parser";
import {
  parseTwitterCard,
  hasTwitterCard,
  mergeWithOpenGraph,
} from "./twitter-parser";
import {
  applyDomainHandler,
  detectUrlType,
  mapToPreviewType,
  isDirectImageUrl,
  isDirectVideoUrl,
} from "./domain-handlers";
import {
  sanitizePreviewData,
  sanitizeUrl,
  sanitizeTitle,
  sanitizeDescription,
  sanitizeImageUrl,
  extractDomain,
} from "./preview-sanitizer";

// ============================================================================
// Types
// ============================================================================

export interface UnfurlOptions {
  includeRawData?: boolean;
  timeout?: number;
  userAgent?: string;
}

export interface UnfurlResult {
  data: LinkPreviewData;
  ogData?: OpenGraphData;
  twitterData?: TwitterCardData;
  rawHtml?: string;
}

// ============================================================================
// Main Unfurl Function
// ============================================================================

/**
 * Unfurl a URL from HTML content
 * This is the main function used server-side to process HTML
 */
export function unfurlFromHtml(
  url: string,
  html: string,
  options: UnfurlOptions = {},
): UnfurlResult {
  const now = Date.now();

  // Initialize base preview
  const basePreview: BasePreviewData = {
    url,
    type: "generic",
    status: "success",
    domain: extractDomain(url) || "",
    isSecure: url.startsWith("https"),
    fetchedAt: now,
    expiresAt: now + 24 * 60 * 60 * 1000, // 24 hours default
  };

  // Parse Open Graph metadata
  const ogData = parseOpenGraph(html);
  const fallbackData = extractFallbackMetadata(html);
  const mergedOg = mergeWithFallbacks(ogData, fallbackData);

  // Parse Twitter Card metadata
  const twitterData = parseTwitterCard(html);
  const mergedTwitter = mergeWithOpenGraph(
    twitterData,
    mergedOg.title,
    mergedOg.description,
    mergedOg.image,
  );

  // Detect URL type and apply domain-specific handler
  const urlType = detectUrlType(url);
  const domainData = applyDomainHandler(url, html);

  // Build the preview data
  // Map internal URL types (like 'gist', 'codepen') to public PreviewType
  const previewType =
    domainData?.type ||
    (urlType === "generic"
      ? getTypeFromOg(mergedOg.type)
      : mapToPreviewType(urlType));

  let preview: LinkPreviewData = {
    ...basePreview,
    type: previewType,
    title: mergedOg.title,
    description: mergedOg.description,
    siteName: mergedOg.siteName,
    image: mergedOg.image,
    imageWidth: mergedOg.imageWidth,
    imageHeight: mergedOg.imageHeight,
    imageAlt: mergedOg.imageAlt,
    author: mergedOg.articleAuthor?.[0],
    publishedTime: mergedOg.articlePublishedTime,
    modifiedTime: mergedOg.articleModifiedTime,
    locale: mergedOg.locale,
  };

  // Apply domain-specific data (takes priority)
  if (domainData) {
    preview = {
      ...preview,
      ...domainData,
    };
  }

  // Apply Twitter Card data if it has player/app cards (takes highest priority)
  if (
    hasTwitterCard(mergedTwitter) &&
    (mergedTwitter.card === "player" || mergedTwitter.card === "app")
  ) {
    preview = {
      ...preview,
      title: mergedTwitter.title || preview.title,
      description: mergedTwitter.description || preview.description,
      image: mergedTwitter.image || preview.image,
      imageAlt: mergedTwitter.imageAlt || preview.imageAlt,
    };
  }

  // Extract favicon
  const favicon = extractFavicon(html, url);
  if (favicon) {
    preview.favicon = favicon;
  }

  // Sanitize the final preview data
  preview = sanitizePreviewData(preview, url);

  // Build result
  const result: UnfurlResult = {
    data: preview,
  };

  if (options.includeRawData) {
    result.ogData = ogData;
    result.twitterData = twitterData;
    result.rawHtml = html;
  }

  return result;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get preview type from Open Graph type
 */
function getTypeFromOg(ogType: string | undefined): BasePreviewData["type"] {
  if (!ogType) return "generic";

  const typeMap: Record<string, BasePreviewData["type"]> = {
    article: "article",
    "video.movie": "video",
    "video.episode": "video",
    "video.tv_show": "video",
    "video.other": "video",
    "music.song": "audio",
    "music.album": "audio",
    "music.playlist": "audio",
    "music.radio_station": "audio",
  };

  return typeMap[ogType] || "generic";
}

/**
 * Extract favicon from HTML
 */
function extractFavicon(html: string, baseUrl: string): string | undefined {
  // Try different favicon patterns
  const patterns = [
    // Apple touch icon (usually best quality)
    /<link[^>]+rel=["']apple-touch-icon["'][^>]+href=["']([^"']+)["'][^>]*>/i,
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']apple-touch-icon["'][^>]*>/i,

    // Standard icon
    /<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["'][^>]*>/i,
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:shortcut )?icon["'][^>]*>/i,

    // Favicon with type
    /<link[^>]+rel=["']icon["'][^>]+type=["']image\/[^"']+["'][^>]+href=["']([^"']+)["'][^>]*>/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      return sanitizeImageUrl(match[1], baseUrl);
    }
  }

  // Default favicon location
  try {
    const parsed = new URL(baseUrl);
    return `${parsed.protocol}//${parsed.host}/favicon.ico`;
  } catch {
    return undefined;
  }
}

/**
 * Determine if HTML has enough metadata for a preview
 */
export function hasPreviewMetadata(html: string): boolean {
  const ogData = parseOpenGraph(html);
  const fallback = extractFallbackMetadata(html);

  return !!(
    ogData.title ||
    ogData.description ||
    fallback.title ||
    fallback.description
  );
}

/**
 * Quick check if URL might have previewable content
 * Used for fast filtering before making HTTP requests
 */
export function mightHavePreview(url: string): boolean {
  // Direct media always has preview
  if (isDirectImageUrl(url) || isDirectVideoUrl(url)) {
    return true;
  }

  // Known previewable domains
  const knownDomains = [
    "twitter.com",
    "x.com",
    "youtube.com",
    "youtu.be",
    "github.com",
    "gist.github.com",
    "spotify.com",
    "codepen.io",
    "codesandbox.io",
    "medium.com",
    "dev.to",
    "reddit.com",
    "stackoverflow.com",
    "wikipedia.org",
    "nytimes.com",
    "bbc.com",
    "theguardian.com",
  ];

  const domain = extractDomain(url);
  if (domain) {
    return knownDomains.some(
      (known) => domain === known || domain.endsWith(`.${known}`),
    );
  }

  // Assume most URLs might have preview
  return true;
}

/**
 * Create an error preview
 */
export function createErrorPreview(
  url: string,
  errorCode: string,
  errorMessage: string,
): LinkPreviewData {
  return {
    url,
    type: "generic",
    status: "error",
    domain: extractDomain(url) || "",
    isSecure: url.startsWith("https"),
    fetchedAt: Date.now(),
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes for errors
    error: {
      code: errorCode,
      message: errorMessage,
      retryable: true,
    },
  };
}

/**
 * Create a blocked preview
 */
export function createBlockedPreview(url: string): LinkPreviewData {
  return {
    url,
    type: "generic",
    status: "blocked",
    domain: extractDomain(url) || "",
    isSecure: url.startsWith("https"),
    fetchedAt: Date.now(),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  };
}

/**
 * Create a removed preview marker
 */
export function createRemovedPreview(url: string): LinkPreviewData {
  return {
    url,
    type: "generic",
    status: "removed",
    domain: extractDomain(url) || "",
    isSecure: url.startsWith("https"),
    fetchedAt: Date.now(),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  };
}

/**
 * Merge preview data with oEmbed data
 */
export function mergeWithOembed(
  preview: LinkPreviewData,
  oembed: {
    title?: string;
    author_name?: string;
    thumbnail_url?: string;
    html?: string;
  },
): LinkPreviewData {
  return {
    ...preview,
    title: oembed.title || preview.title,
    author: oembed.author_name || preview.author,
    image: oembed.thumbnail_url || preview.image,
  };
}
