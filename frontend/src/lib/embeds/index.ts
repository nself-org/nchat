/**
 * Embeds Library Exports
 *
 * This module exports all URL unfurling and embed-related utilities
 * for the nself-chat application.
 *
 * @example
 * ```typescript
 * import {
 *   detectEmbedType,
 *   parseUrl,
 *   useUnfurl,
 *   unfurlUrl
 * } from '@/lib/embeds'
 *
 * // Detect embed type from URL
 * const type = detectEmbedType('https://twitter.com/user/status/123')
 * // Returns: 'twitter'
 *
 * // Parse URL for structured data
 * const parsed = parseUrl('https://youtube.com/watch?v=abc')
 * // Returns: { type: 'youtube', videoId: 'abc', ... }
 *
 * // Use unfurl hook in components
 * const { data, loading, error } = useUnfurl('https://example.com')
 * ```
 */

// URL Pattern Matching
export {
  // Types
  type EmbedType,
  type ParsedTwitterUrl,
  type ParsedYouTubeUrl,
  type ParsedGitHubUrl,
  type ParsedSpotifyUrl,
  type ParsedImageUrl,
  type ParsedVideoUrl,
  type ParsedGenericUrl,
  type ParsedUrl,
  // URL patterns
  TWITTER_PATTERNS,
  YOUTUBE_PATTERNS,
  GITHUB_PATTERNS,
  SPOTIFY_PATTERNS,
  MEDIA_PATTERNS,
  GENERIC_URL_PATTERN,
  // Detection & parsing functions
  detectEmbedType,
  parseUrl,
  parseTwitterUrl,
  parseYouTubeUrl,
  parseGitHubUrl,
  parseSpotifyUrl,
  parseMediaUrl,
  // URL extraction utilities
  extractUrls,
  extractUrlsWithPositions,
  isValidUrl,
  getDomain,
  isEmbeddable,
} from "./embed-patterns";

// Unfurl Service
export {
  // Types
  type OpenGraphData,
  type TwitterCardData,
  type OEmbedData,
  type UnfurlData,
  type UnfurlSuccess,
  type UnfurlError,
  type UnfurlResult,
  // Main unfurl function
  unfurlUrl,
  unfurlUrls,
  // Parsing functions
  parseHtmlForUnfurl,
  parseOpenGraph,
  parseTwitterCard,
  parseBasicMeta,
  fetchOEmbed,
  resolveUrl,
  // Cache functions
  getCached,
  setCache,
  clearCache,
  getCacheStats,
  // Rate limiting
  isRateLimited,
  recordRequest,
} from "./unfurl-service";

// React Hooks
export {
  // Main hooks
  useUnfurl,
  useUnfurlBatch,
  useLazyUnfurl,
  // Utility hooks
  useIsPreviewable,
  useEmbedType,
  // Types
  type UseUnfurlOptions,
  type UseUnfurlReturn,
  type UseUnfurlBatchReturn,
} from "./use-unfurl";
