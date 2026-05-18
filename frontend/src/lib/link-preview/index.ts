/**
 * Link Preview Library - Public API
 *
 * Export all public functions and types for link preview/unfurling
 */

// Types
export type {
  PreviewType,
  PreviewStatus,
  OEmbedType,
  BasePreviewData,
  OpenGraphData,
  TwitterCardType,
  TwitterCardData,
  OEmbedData,
  TwitterPostData,
  YouTubeVideoData,
  GitHubRepoData,
  GitHubIssueData,
  SpotifyData,
  CodePreviewData,
  ImagePreviewData,
  VideoPreviewData,
  ArticlePreviewData,
  LinkPreviewData,
  UnfurlRequest,
  UnfurlResponse,
  BatchUnfurlRequest,
  BatchUnfurlResponse,
  LinkPreviewSettings,
  AdminLinkPreviewSettings,
  CachedPreview,
  PreviewCacheStats,
  PreviewLoadEvent,
  PreviewRemovedEvent,
  PreviewError,
  PreviewErrorCode,
} from "./preview-types";

// Type guards
export {
  isTwitterPreview,
  isYouTubePreview,
  isGitHubRepoPreview,
  isGitHubIssuePreview,
  isSpotifyPreview,
  isCodePreview,
  isImagePreview,
  isVideoPreview,
  isArticlePreview,
} from "./preview-types";

// Constants
export {
  DEFAULT_PREVIEW_SETTINGS,
  DEFAULT_ADMIN_SETTINGS,
  PREVIEW_ERROR_CODES,
  URL_PATTERNS,
} from "./preview-types";

// Unfurl functions
export {
  unfurlFromHtml,
  hasPreviewMetadata,
  mightHavePreview,
  createErrorPreview,
  createBlockedPreview,
  createRemovedPreview,
  mergeWithOembed,
} from "./unfurl";
export type { UnfurlOptions, UnfurlResult } from "./unfurl";

// Fetcher functions
export {
  fetchPreview,
  fetchPreviews,
  prefetchPreviews,
  extractUrls,
  isValidUrl,
  shouldUnfurl,
  createImagePreview,
  createVideoPreview,
  createPreviewError,
  isRetryableError,
  getErrorMessage,
} from "./preview-fetcher";
export type { FetchOptions } from "./preview-fetcher";

// Cache
export {
  PreviewCache,
  getPreviewCache,
  configurePreviewCache,
} from "./preview-cache";

// Parsers
export {
  parseOpenGraph,
  extractFallbackMetadata,
  hasMinimalOpenGraph,
  mergeWithFallbacks,
} from "./og-parser";

export {
  parseTwitterCard,
  hasTwitterCard,
  shouldPreferTwitterCard,
  getTwitterImage,
  normalizeTwitterHandle,
  extractTwitterUsername as extractTwitterUsernameFromParser,
  extractTweetId,
  buildTwitterEmbedUrl,
  mergeWithOpenGraph,
} from "./twitter-parser";

// Domain handlers
export {
  detectUrlType,
  extractTwitterId,
  extractTwitterUsername,
  buildTwitterPreview,
  getTwitterOembedUrl,
  extractYouTubeId,
  buildYouTubePreview,
  getYouTubeOembedUrl,
  getYouTubeEmbedUrl,
  parseGitHubUrl,
  buildGitHubRepoPreview,
  buildGitHubIssuePreview,
  getGitHubRepoApiUrl,
  getGitHubIssueApiUrl,
  parseSpotifyUrl,
  buildSpotifyPreview,
  getSpotifyOembedUrl,
  parseGistUrl,
  buildGistPreview,
  parseCodePenUrl,
  buildCodePenPreview,
  parseCodeSandboxUrl,
  buildCodeSandboxPreview,
  isDirectImageUrl,
  isDirectVideoUrl,
  getImageFormat,
  getVideoFormat,
  getHandler,
  applyDomainHandler,
} from "./domain-handlers";

// Sanitizers
export {
  sanitizeUrl,
  sanitizeImageUrl,
  sanitizeText,
  sanitizeTitle,
  sanitizeDescription,
  sanitizeAuthor,
  sanitizeSiteName,
  stripHtml,
  decodeHtmlEntities,
  normalizeWhitespace,
  sanitizePreviewData,
  isPreviewDataSafe,
  extractDomain,
  isDomainBlocked,
  isDomainAllowed,
} from "./preview-sanitizer";
