/**
 * Link Unfurl Library
 *
 * Complete URL parsing, unfurling, and embed system for nself-chat.
 *
 * Features:
 * - Robust URL detection with international domain support
 * - Provider-specific handlers (Twitter, YouTube, GitHub, etc.)
 * - SSRF-safe URL fetching
 * - Per-domain configuration rules
 * - URL shortener resolution
 * - User preference management
 *
 * @example
 * ```typescript
 * import {
 *   extractUrls,
 *   parseProviderUrl,
 *   resolveUrl,
 *   useUnfurlPreferences
 * } from '@/lib/unfurl'
 *
 * // Extract URLs from text
 * const { urls, count } = extractUrls('Check out https://github.com/org/repo')
 *
 * // Parse provider-specific data
 * const data = parseProviderUrl('https://twitter.com/user/status/123')
 *
 * // Resolve shortened URLs
 * const resolved = await resolveUrl('https://bit.ly/abc')
 *
 * // Use preferences hook in components
 * const { preferences, blockDomain } = useUnfurlPreferences()
 * ```
 *
 * @module lib/unfurl
 */

// ============================================================================
// URL Parser
// ============================================================================

export {
  // Types
  type ParsedUrlInfo,
  type UrlProvider,
  type UrlExtractionResult,
  // Constants
  URL_SHORTENERS,
  PROVIDER_DOMAINS,
  COMMON_TLDS,
  URL_REGEX,
  STRICT_URL_REGEX,
  PROVIDER_PATTERNS,
  // Functions
  parseUrl,
  detectProvider,
  extractUrls,
  extractUrlsWithPositions,
  isValidUrl,
  isShortUrl,
  normalizeUrl,
  getDisplayDomain,
  shouldUnfurl,
  punycodeToUnicode,
  unicodeToPunycode,
  parseProviderUrl,
} from "./url-parser";

// ============================================================================
// Domain Rules
// ============================================================================

export {
  // Types
  type UnfurlBehavior,
  type EmbedStyle,
  type DomainRule,
  type DomainRulesConfig,
  type ProviderSettings,
  // Constants
  DEFAULT_PROVIDER_SETTINGS,
  DEFAULT_BLOCKED_DOMAINS,
  // Functions
  createDefaultDomainRulesConfig,
  matchDomainPattern,
  findMatchingRule,
  isDomainAllowed,
  getDomainSettings,
  addDomainRule,
  updateDomainRule,
  removeDomainRule,
  setUserDomainOverride,
  removeUserDomainOverride,
  setChannelRules,
  updateProviderSettings,
  serializeDomainRulesConfig,
  deserializeDomainRulesConfig,
  exportRules,
  importRules,
} from "./domain-rules";

// ============================================================================
// Provider Handlers
// ============================================================================

export {
  // Types
  type ProviderData,
  type ProviderHandler,
  // Handlers
  redditHandler,
  twitchHandler,
  vimeoHandler,
  loomHandler,
  figmaHandler,
  linkedinHandler,
  tiktokHandler,
  mediumHandler,
  stackoverflowHandler,
  instagramHandler,
  PROVIDER_HANDLERS,
  // Functions
  getProviderHandler,
  extractProviderData,
  getOembedUrlForProvider,
  getEmbedUrlForProvider,
  parseHtmlWithProvider,
} from "./provider-handlers";

// ============================================================================
// URL Resolver
// ============================================================================

export {
  // Types
  type UrlResolutionResult,
  type UrlResolverOptions,
  // Functions
  isShortenerUrl,
  resolveUrl,
  resolveUrls,
  getCanonicalUrl,
  expandShortenedUrls,
  resolveUrlCached,
  clearResolutionCache,
  getResolutionCacheStats,
} from "./url-resolver";

// ============================================================================
// Re-exports from other modules
// ============================================================================

// Re-export the main unfurl service
export {
  getLinkUnfurlService,
  createLinkUnfurlService,
} from "@/services/messages/link-unfurl.service";

export type {
  LinkPreviewData,
  LinkPreviewType,
  UnfurlResult,
  UnfurlOptions,
  OpenGraphData,
  TwitterCardData,
} from "@/services/messages/link-unfurl.service";

// Re-export preferences hook (using dynamic import in components)
// Note: The hook is exported from its own file for tree-shaking
