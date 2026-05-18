/**
 * Link Preview Types - TypeScript definitions for the link preview/unfurling system
 *
 * Supports Open Graph, Twitter Cards, oEmbed, and domain-specific previews
 */

// ============================================================================
// Preview Types
// ============================================================================

export type PreviewType =
  | "generic"
  | "article"
  | "video"
  | "audio"
  | "image"
  | "twitter"
  | "youtube"
  | "github"
  | "spotify"
  | "code"
  | "oembed";

export type PreviewStatus =
  | "pending"
  | "loading"
  | "success"
  | "error"
  | "blocked"
  | "removed";

export type OEmbedType = "photo" | "video" | "link" | "rich";

// ============================================================================
// Base Preview Data
// ============================================================================

export interface BasePreviewData {
  url: string;
  type: PreviewType;
  status: PreviewStatus;

  // Basic metadata
  title?: string;
  description?: string;
  siteName?: string;
  favicon?: string;

  // Image
  image?: string;
  imageWidth?: number;
  imageHeight?: number;
  imageAlt?: string;

  // Additional metadata
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  locale?: string;

  // Domain info
  domain: string;
  isSecure: boolean;

  // Cache info
  fetchedAt: number;
  expiresAt: number;

  // Error info
  error?: PreviewError;
}

export interface PreviewError {
  code: string;
  message: string;
  retryable: boolean;
}

// ============================================================================
// Open Graph Data
// ============================================================================

export interface OpenGraphData {
  // Required
  title?: string;
  type?: string;
  image?: string;
  url?: string;

  // Optional
  audio?: string;
  description?: string;
  determiner?: string;
  locale?: string;
  localeAlternate?: string[];
  siteName?: string;
  video?: string;

  // Image properties
  imageSecureUrl?: string;
  imageType?: string;
  imageWidth?: number;
  imageHeight?: number;
  imageAlt?: string;

  // Video properties
  videoSecureUrl?: string;
  videoType?: string;
  videoWidth?: number;
  videoHeight?: number;

  // Audio properties
  audioSecureUrl?: string;
  audioType?: string;

  // Article properties
  articlePublishedTime?: string;
  articleModifiedTime?: string;
  articleExpirationTime?: string;
  articleAuthor?: string[];
  articleSection?: string;
  articleTag?: string[];
}

// ============================================================================
// Twitter Card Data
// ============================================================================

export type TwitterCardType =
  | "summary"
  | "summary_large_image"
  | "app"
  | "player";

export interface TwitterCardData {
  card?: TwitterCardType;
  site?: string;
  siteId?: string;
  creator?: string;
  creatorId?: string;
  title?: string;
  description?: string;
  image?: string;
  imageAlt?: string;

  // Player card
  player?: string;
  playerWidth?: number;
  playerHeight?: number;
  playerStream?: string;

  // App card
  appIdIphone?: string;
  appIdIpad?: string;
  appIdGoogleplay?: string;
  appUrlIphone?: string;
  appUrlIpad?: string;
  appUrlGoogleplay?: string;
}

// ============================================================================
// oEmbed Data
// ============================================================================

export interface OEmbedData {
  type: OEmbedType;
  version: string;

  // Required for all
  title?: string;
  authorName?: string;
  authorUrl?: string;
  providerName?: string;
  providerUrl?: string;

  // Photo/Video/Rich specific
  html?: string;
  width?: number;
  height?: number;
  url?: string;

  // Optional
  cacheAge?: number;
  thumbnailUrl?: string;
  thumbnailWidth?: number;
  thumbnailHeight?: number;
}

// ============================================================================
// Domain-Specific Preview Data
// ============================================================================

// Twitter/X Post Preview
export interface TwitterPostData extends BasePreviewData {
  type: "twitter";
  tweetId: string;
  authorUsername: string;
  authorDisplayName: string;
  authorAvatar?: string;
  authorVerified?: boolean;
  content: string;
  mediaUrls?: string[];
  likeCount?: number;
  retweetCount?: number;
  replyCount?: number;
  postedAt?: string;
  quotedTweet?: TwitterPostData;
}

// YouTube Video Preview
export interface YouTubeVideoData extends BasePreviewData {
  type: "youtube";
  videoId: string;
  channelName?: string;
  channelId?: string;
  channelAvatar?: string;
  duration?: string;
  viewCount?: number;
  likeCount?: number;
  publishedAt?: string;
  embedHtml?: string;
  isLive?: boolean;
  category?: string;
}

// GitHub Repository Preview
export interface GitHubRepoData extends BasePreviewData {
  type: "github";
  owner: string;
  repo: string;
  fullName: string;
  isPrivate: boolean;
  isFork: boolean;
  isArchived: boolean;
  language?: string;
  languageColor?: string;
  starCount: number;
  forkCount: number;
  watcherCount: number;
  openIssueCount: number;
  topics?: string[];
  license?: string;
  defaultBranch: string;
  createdAt: string;
  updatedAt: string;
  pushedAt: string;
}

// GitHub Issue/PR Preview
export interface GitHubIssueData extends BasePreviewData {
  type: "github";
  owner: string;
  repo: string;
  number: number;
  isPullRequest: boolean;
  state: "open" | "closed" | "merged";
  author: string;
  authorAvatar?: string;
  labels?: Array<{ name: string; color: string }>;
  assignees?: string[];
  commentCount: number;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  mergedAt?: string;
}

// Spotify Track/Album/Playlist Preview
export interface SpotifyData extends BasePreviewData {
  type: "spotify";
  spotifyType: "track" | "album" | "playlist" | "artist" | "episode" | "show";
  spotifyId: string;
  embedUrl?: string;
  artistName?: string;
  albumName?: string;
  releaseDate?: string;
  duration?: number;
  trackCount?: number;
  previewUrl?: string;
}

// Code Snippet Preview (GitHub Gist, CodePen, etc.)
export interface CodePreviewData extends BasePreviewData {
  type: "code";
  platform: "gist" | "codepen" | "codesandbox" | "jsfiddle" | "replit";
  embedUrl?: string;
  embedHtml?: string;
  language?: string;
  fileName?: string;
  code?: string;
}

// Direct Image Preview
export interface ImagePreviewData extends BasePreviewData {
  type: "image";
  width: number;
  height: number;
  format: string;
  fileSize?: number;
}

// Direct Video Preview
export interface VideoPreviewData extends BasePreviewData {
  type: "video";
  width?: number;
  height?: number;
  duration?: number;
  format?: string;
  posterUrl?: string;
  fileSize?: number;
}

// Generic Article Preview
export interface ArticlePreviewData extends BasePreviewData {
  type: "article";
  readingTime?: number;
  wordCount?: number;
  tags?: string[];
  category?: string;
}

// ============================================================================
// Union Types
// ============================================================================

export type LinkPreviewData =
  | BasePreviewData
  | TwitterPostData
  | YouTubeVideoData
  | GitHubRepoData
  | GitHubIssueData
  | SpotifyData
  | CodePreviewData
  | ImagePreviewData
  | VideoPreviewData
  | ArticlePreviewData;

// Type guards
export function isTwitterPreview(
  data: LinkPreviewData,
): data is TwitterPostData {
  return data.type === "twitter";
}

export function isYouTubePreview(
  data: LinkPreviewData,
): data is YouTubeVideoData {
  return data.type === "youtube";
}

export function isGitHubRepoPreview(
  data: LinkPreviewData,
): data is GitHubRepoData {
  return data.type === "github" && "repo" in data && !("number" in data);
}

export function isGitHubIssuePreview(
  data: LinkPreviewData,
): data is GitHubIssueData {
  return data.type === "github" && "number" in data;
}

export function isSpotifyPreview(data: LinkPreviewData): data is SpotifyData {
  return data.type === "spotify";
}

export function isCodePreview(data: LinkPreviewData): data is CodePreviewData {
  return data.type === "code";
}

export function isImagePreview(
  data: LinkPreviewData,
): data is ImagePreviewData {
  return data.type === "image";
}

export function isVideoPreview(
  data: LinkPreviewData,
): data is VideoPreviewData {
  return data.type === "video";
}

export function isArticlePreview(
  data: LinkPreviewData,
): data is ArticlePreviewData {
  return data.type === "article";
}

// ============================================================================
// Fetch/API Types
// ============================================================================

export interface UnfurlRequest {
  url: string;
  forceRefresh?: boolean;
  timeout?: number;
}

export interface UnfurlResponse {
  success: boolean;
  data?: LinkPreviewData;
  error?: PreviewError;
  cached: boolean;
}

export interface BatchUnfurlRequest {
  urls: string[];
  forceRefresh?: boolean;
  timeout?: number;
}

export interface BatchUnfurlResponse {
  results: Record<string, UnfurlResponse>;
}

// ============================================================================
// Settings Types
// ============================================================================

export interface LinkPreviewSettings {
  // Global enable/disable
  enabled: boolean;
  autoUnfurl: boolean;

  // Display options
  showImages: boolean;
  showDescriptions: boolean;
  showFavicons: boolean;
  maxImageHeight: number;
  compactMode: boolean;

  // Domain controls
  blockedDomains: string[];
  allowedDomains: string[]; // Only used in whitelist mode
  whitelistMode: boolean;

  // Performance
  preloadImages: boolean;
  lazyLoadPreviews: boolean;

  // Privacy
  hideReferrer: boolean;
}

export interface AdminLinkPreviewSettings extends LinkPreviewSettings {
  // Admin-only settings
  globalEnabled: boolean;
  fetchTimeout: number;
  cacheDuration: number;
  maxCacheSize: number;
  rateLimitPerMinute: number;
  rateLimitPerHour: number;

  // Blocklist
  globalBlockedDomains: string[];

  // Logging
  logUnfurlRequests: boolean;
  logErrors: boolean;
}

// ============================================================================
// Cache Types
// ============================================================================

export interface CachedPreview {
  data: LinkPreviewData;
  fetchedAt: number;
  expiresAt: number;
  hitCount: number;
}

export interface PreviewCacheStats {
  totalEntries: number;
  hitCount: number;
  missCount: number;
  hitRate: number;
  oldestEntry: number;
  newestEntry: number;
  totalSize: number;
}

// ============================================================================
// Event Types
// ============================================================================

export interface PreviewLoadEvent {
  url: string;
  status: PreviewStatus;
  data?: LinkPreviewData;
  error?: PreviewError;
  duration: number;
}

export interface PreviewRemovedEvent {
  url: string;
  messageId: string;
  removedBy: string;
}

// ============================================================================
// Constants
// ============================================================================

export const DEFAULT_PREVIEW_SETTINGS: LinkPreviewSettings = {
  enabled: true,
  autoUnfurl: true,
  showImages: true,
  showDescriptions: true,
  showFavicons: true,
  maxImageHeight: 300,
  compactMode: false,
  blockedDomains: [],
  allowedDomains: [],
  whitelistMode: false,
  preloadImages: false,
  lazyLoadPreviews: true,
  hideReferrer: true,
};

export const DEFAULT_ADMIN_SETTINGS: AdminLinkPreviewSettings = {
  ...DEFAULT_PREVIEW_SETTINGS,
  globalEnabled: true,
  fetchTimeout: 10000,
  cacheDuration: 24 * 60 * 60 * 1000, // 24 hours
  maxCacheSize: 1000,
  rateLimitPerMinute: 30,
  rateLimitPerHour: 300,
  globalBlockedDomains: [],
  logUnfurlRequests: false,
  logErrors: true,
};

export const PREVIEW_ERROR_CODES = {
  FETCH_FAILED: "FETCH_FAILED",
  TIMEOUT: "TIMEOUT",
  INVALID_URL: "INVALID_URL",
  BLOCKED_DOMAIN: "BLOCKED_DOMAIN",
  RATE_LIMITED: "RATE_LIMITED",
  NO_METADATA: "NO_METADATA",
  PARSE_ERROR: "PARSE_ERROR",
  NETWORK_ERROR: "NETWORK_ERROR",
  SERVER_ERROR: "SERVER_ERROR",
  NOT_FOUND: "NOT_FOUND",
  FORBIDDEN: "FORBIDDEN",
} as const;

export type PreviewErrorCode =
  (typeof PREVIEW_ERROR_CODES)[keyof typeof PREVIEW_ERROR_CODES];

// ============================================================================
// URL Pattern Matchers
// ============================================================================

export const URL_PATTERNS = {
  twitter: /^https?:\/\/(?:www\.)?(twitter|x)\.com\/\w+\/status\/(\d+)/i,
  youtube:
    /^https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i,
  github:
    /^https?:\/\/(?:www\.)?github\.com\/([^/]+)(?:\/([^/]+)(?:\/(issues|pull|discussions)\/(\d+))?)?/i,
  spotify:
    /^https?:\/\/(?:open\.)?spotify\.com\/(track|album|playlist|artist|episode|show)\/([a-zA-Z0-9]+)/i,
  gist: /^https?:\/\/gist\.github\.com\/([^/]+)\/([a-f0-9]+)/i,
  codepen: /^https?:\/\/codepen\.io\/([^/]+)\/(?:pen|full|details)\/([^/]+)/i,
  codesandbox: /^https?:\/\/codesandbox\.io\/(?:s|embed)\/([^/?]+)/i,
  image: /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?.*)?$/i,
  video: /\.(mp4|webm|ogg|mov|avi|mkv)(\?.*)?$/i,
} as const;

// ============================================================================
// Domain Handlers Registry
// ============================================================================

export type DomainHandler = (
  url: string,
  html?: string,
) => Promise<Partial<LinkPreviewData> | null>;

export interface DomainHandlerConfig {
  pattern: RegExp;
  handler: string; // Handler function name
  requiresHtml: boolean;
  priority: number;
}
