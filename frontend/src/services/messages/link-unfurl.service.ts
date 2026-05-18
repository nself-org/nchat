/**
 * Link Unfurl Service
 *
 * Provides secure URL unfurling with comprehensive SSRF protection.
 * Fetches and parses Open Graph, Twitter Card, and basic HTML metadata.
 *
 * SSRF Protection includes:
 * - Block private IP ranges (10.x.x.x, 172.16-31.x.x, 192.168.x.x)
 * - Block localhost (127.0.0.1, ::1, localhost)
 * - Block link-local addresses (169.254.x.x)
 * - Block multicast addresses (224.x.x.x - 239.x.x.x)
 * - DNS resolution validation before fetch
 * - Redirect limit enforcement
 * - Request timeout enforcement
 * - User agent identification
 *
 * @module services/messages/link-unfurl
 */

import { logger } from "@/lib/logger";
import * as dns from "dns";
import { promisify } from "util";
import * as crypto from "crypto";

// ============================================================================
// Types
// ============================================================================

/**
 * Link preview content type
 */
export type LinkPreviewType =
  | "article"
  | "video"
  | "image"
  | "website"
  | "audio"
  | "product"
  | "profile";

/**
 * Link preview data structure
 */
export interface LinkPreviewData {
  /** The original URL */
  url: string;
  /** SHA-256 hash of the URL for caching */
  urlHash: string;
  /** Page title */
  title: string;
  /** Page description */
  description?: string;
  /** Preview image URL */
  imageUrl?: string;
  /** Image width in pixels */
  imageWidth?: number;
  /** Image height in pixels */
  imageHeight?: number;
  /** Image alt text */
  imageAlt?: string;
  /** Site name (e.g., "YouTube", "Twitter") */
  siteName?: string;
  /** Favicon URL */
  faviconUrl?: string;
  /** Content type */
  type: LinkPreviewType;
  /** Video URL for video content */
  videoUrl?: string;
  /** Video width */
  videoWidth?: number;
  /** Video height */
  videoHeight?: number;
  /** Audio URL for audio content */
  audioUrl?: string;
  /** Author name */
  author?: string;
  /** Author URL */
  authorUrl?: string;
  /** Publication date */
  publishedAt?: string;
  /** Domain of the URL */
  domain: string;
  /** Theme/brand color */
  themeColor?: string;
  /** When the preview was fetched */
  fetchedAt: Date;
  /** When the preview expires */
  expiresAt: Date;
}

/**
 * Open Graph metadata
 */
export interface OpenGraphData {
  title?: string;
  type?: string;
  url?: string;
  description?: string;
  image?: string;
  imageWidth?: number;
  imageHeight?: number;
  imageAlt?: string;
  siteName?: string;
  locale?: string;
  audio?: string;
  video?: string;
  videoWidth?: number;
  videoHeight?: number;
  videoType?: string;
}

/**
 * Twitter Card metadata
 */
export interface TwitterCardData {
  card?: "summary" | "summary_large_image" | "app" | "player";
  site?: string;
  siteId?: string;
  creator?: string;
  creatorId?: string;
  title?: string;
  description?: string;
  image?: string;
  imageAlt?: string;
  player?: string;
  playerWidth?: number;
  playerHeight?: number;
  playerStream?: string;
}

/**
 * Basic HTML metadata
 */
export interface BasicMetaData {
  title?: string;
  description?: string;
  favicon?: string;
  themeColor?: string;
  author?: string;
  publishedAt?: string;
}

/**
 * Unfurl result
 */
export interface UnfurlResult {
  success: boolean;
  data?: LinkPreviewData;
  error?: string;
  errorCode?: UnfurlErrorCode;
  cached?: boolean;
}

/**
 * Error codes for unfurl failures
 */
export type UnfurlErrorCode =
  | "INVALID_URL"
  | "SSRF_BLOCKED"
  | "DNS_RESOLUTION_FAILED"
  | "FETCH_FAILED"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "TOO_MANY_REDIRECTS"
  | "PARSE_ERROR"
  | "NOT_FOUND"
  | "CONTENT_TOO_LARGE"
  | "INVALID_CONTENT_TYPE"
  | "UNKNOWN";

/**
 * Unfurl options
 */
export interface UnfurlOptions {
  /** Request timeout in milliseconds (default: 5000) */
  timeout?: number;
  /** Maximum redirects to follow (default: 5) */
  maxRedirects?: number;
  /** Maximum content size in bytes (default: 5MB) */
  maxContentSize?: number;
  /** Cache TTL in hours (default: 24) */
  cacheTtlHours?: number;
  /** Skip cache lookup */
  skipCache?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

/** Default request timeout (5 seconds) */
const DEFAULT_TIMEOUT = 5000;

/** Maximum redirects to follow */
const MAX_REDIRECTS = 5;

/** Maximum content size (5 MB) */
const MAX_CONTENT_SIZE = 5 * 1024 * 1024;

/** Default cache TTL (24 hours) */
const DEFAULT_CACHE_TTL_HOURS = 24;

/** User agent for requests */
const USER_AGENT = "nchat-link-unfurl/1.0 (+https://nself.org/bot)";

/** Known site names for special domains */
const KNOWN_SITES: Record<string, string> = {
  "youtube.com": "YouTube",
  "www.youtube.com": "YouTube",
  "youtu.be": "YouTube",
  "twitter.com": "Twitter",
  "x.com": "X",
  "github.com": "GitHub",
  "linkedin.com": "LinkedIn",
  "www.linkedin.com": "LinkedIn",
  "facebook.com": "Facebook",
  "www.facebook.com": "Facebook",
  "instagram.com": "Instagram",
  "www.instagram.com": "Instagram",
  "tiktok.com": "TikTok",
  "www.tiktok.com": "TikTok",
  "reddit.com": "Reddit",
  "www.reddit.com": "Reddit",
  "medium.com": "Medium",
  "discord.com": "Discord",
  "discord.gg": "Discord",
  "twitch.tv": "Twitch",
  "www.twitch.tv": "Twitch",
  "spotify.com": "Spotify",
  "open.spotify.com": "Spotify",
  "soundcloud.com": "SoundCloud",
  "vimeo.com": "Vimeo",
  "player.vimeo.com": "Vimeo",
  "notion.so": "Notion",
  "www.notion.so": "Notion",
  "figma.com": "Figma",
  "www.figma.com": "Figma",
  "stackoverflow.com": "Stack Overflow",
  "npmjs.com": "npm",
  "www.npmjs.com": "npm",
  "pypi.org": "PyPI",
};

// ============================================================================
// SSRF Protection
// ============================================================================

/**
 * Check if an IP address is a private/reserved address
 */
function isPrivateIp(ip: string): boolean {
  // Handle IPv6 addresses
  if (ip.includes(":")) {
    return isPrivateIpv6(ip);
  }

  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return true; // Invalid IP, treat as private for safety
  }

  const [a, b, c, d] = parts;

  // 0.0.0.0/8 - Current network
  if (a === 0) return true;

  // 10.0.0.0/8 - Private (Class A)
  if (a === 10) return true;

  // 100.64.0.0/10 - Carrier-grade NAT
  if (a === 100 && b >= 64 && b <= 127) return true;

  // 127.0.0.0/8 - Loopback
  if (a === 127) return true;

  // 169.254.0.0/16 - Link-local
  if (a === 169 && b === 254) return true;

  // 172.16.0.0/12 - Private (Class B)
  if (a === 172 && b >= 16 && b <= 31) return true;

  // 192.0.0.0/24 - IETF Protocol Assignments
  if (a === 192 && b === 0 && c === 0) return true;

  // 192.0.2.0/24 - TEST-NET-1 (Documentation)
  if (a === 192 && b === 0 && c === 2) return true;

  // 192.88.99.0/24 - 6to4 relay
  if (a === 192 && b === 88 && c === 99) return true;

  // 192.168.0.0/16 - Private (Class C)
  if (a === 192 && b === 168) return true;

  // 198.18.0.0/15 - Network benchmark tests
  if (a === 198 && (b === 18 || b === 19)) return true;

  // 198.51.100.0/24 - TEST-NET-2 (Documentation)
  if (a === 198 && b === 51 && c === 100) return true;

  // 203.0.113.0/24 - TEST-NET-3 (Documentation)
  if (a === 203 && b === 0 && c === 113) return true;

  // 224.0.0.0/4 - Multicast
  if (a >= 224 && a <= 239) return true;

  // 233.252.0.0/24 - MCAST-TEST-NET
  if (a === 233 && b === 252 && c === 0) return true;

  // 240.0.0.0/4 - Reserved for future use
  if (a >= 240) return true;

  // 255.255.255.255 - Broadcast
  if (a === 255 && b === 255 && c === 255 && d === 255) return true;

  return false;
}

/**
 * Check if an IPv6 address is private/reserved
 */
function isPrivateIpv6(ip: string): boolean {
  const normalizedIp = ip.toLowerCase();

  // Loopback (::1)
  if (normalizedIp === "::1" || normalizedIp === "0:0:0:0:0:0:0:1") return true;

  // Unspecified (::)
  if (normalizedIp === "::" || normalizedIp === "0:0:0:0:0:0:0:0") return true;

  // IPv4-mapped IPv6 (::ffff:x.x.x.x)
  if (normalizedIp.startsWith("::ffff:")) {
    const ipv4Part = normalizedIp.substring(7);
    if (ipv4Part.includes(".")) {
      return isPrivateIp(ipv4Part);
    }
  }

  // Link-local (fe80::/10)
  if (
    normalizedIp.startsWith("fe8") ||
    normalizedIp.startsWith("fe9") ||
    normalizedIp.startsWith("fea") ||
    normalizedIp.startsWith("feb")
  ) {
    return true;
  }

  // Unique local (fc00::/7)
  if (normalizedIp.startsWith("fc") || normalizedIp.startsWith("fd"))
    return true;

  // Multicast (ff00::/8)
  if (normalizedIp.startsWith("ff")) return true;

  return false;
}

/**
 * Check if a hostname is blocked
 */
function isBlockedHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase();

  // Block localhost variations
  if (lower === "localhost" || lower === "localhost.localdomain") return true;

  // Block IP literals that are private
  if (lower.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) {
    return isPrivateIp(lower);
  }

  // Block IPv6 literals
  if (lower.startsWith("[") && lower.endsWith("]")) {
    const ipv6 = lower.slice(1, -1);
    return isPrivateIpv6(ipv6);
  }

  // Block common internal hostnames
  const blockedPatterns = [
    /^localhost$/i,
    /^127\./,
    /^10\./,
    /^172\.(1[6-9]|2\d|3[01])\./,
    /^192\.168\./,
    /^169\.254\./,
    /^0\./,
    /\.local$/i,
    /\.localhost$/i,
    /\.internal$/i,
    /\.localdomain$/i,
    /^metadata\./i,
    /^instance-data$/i,
    /^kubernetes\./i,
    /^k8s\./i,
  ];

  return blockedPatterns.some((pattern) => pattern.test(lower));
}

// Promisify DNS lookup for Node.js runtime
let dnsLookup: ((hostname: string) => Promise<string[]>) | null = null;

// Initialize DNS lookup based on runtime
if (typeof dns !== "undefined" && dns.promises) {
  dnsLookup = async (hostname: string): Promise<string[]> => {
    try {
      const addresses = await dns.promises.resolve4(hostname);
      return addresses;
    } catch {
      try {
        // Try IPv6 if IPv4 fails
        const addresses = await dns.promises.resolve6(hostname);
        return addresses;
      } catch {
        throw new Error(`DNS resolution failed for ${hostname}`);
      }
    }
  };
}

/**
 * Validate URL for SSRF protection
 */
export async function validateUrl(
  url: string,
): Promise<{ valid: boolean; error?: string }> {
  // Parse URL
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }

  // Only allow HTTP and HTTPS
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { valid: false, error: "Only HTTP and HTTPS protocols are allowed" };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Check hostname against blocklist
  if (isBlockedHostname(hostname)) {
    logger.warn("SSRF blocked: hostname", { hostname, url });
    return { valid: false, error: "Hostname is blocked (private/reserved)" };
  }

  // If hostname is an IP, check directly
  if (hostname.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) {
    if (isPrivateIp(hostname)) {
      logger.warn("SSRF blocked: private IP", { ip: hostname, url });
      return { valid: false, error: "Private IP addresses are blocked" };
    }
    return { valid: true };
  }

  // Resolve DNS and check IP addresses (only in Node.js runtime)
  if (dnsLookup) {
    try {
      const addresses = await dnsLookup(hostname);

      for (const ip of addresses) {
        if (isPrivateIp(ip)) {
          logger.warn("SSRF blocked: DNS resolved to private IP", {
            hostname,
            ip,
            url,
          });
          return {
            valid: false,
            error: "DNS resolved to a private IP address",
          };
        }
      }
    } catch (error) {
      logger.debug("DNS resolution failed, proceeding with caution", {
        hostname,
        error,
      });
      // In edge runtime, DNS lookup may not be available
      // We already checked hostname patterns, so allow the request
    }
  }

  return { valid: true };
}

// ============================================================================
// URL Utilities
// ============================================================================

/**
 * Generate SHA-256 hash of URL for caching
 */
export function hashUrl(url: string): string {
  return crypto.createHash("sha256").update(url.toLowerCase()).digest("hex");
}

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

/**
 * Get known site name for domain
 */
export function getKnownSiteName(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    return KNOWN_SITES[hostname] || KNOWN_SITES[hostname.replace(/^www\./, "")];
  } catch {
    return undefined;
  }
}

/**
 * Resolve relative URL to absolute
 */
export function resolveUrl(base: string, relative: string): string {
  if (!relative) return "";
  if (relative.startsWith("http://") || relative.startsWith("https://")) {
    return relative;
  }
  if (relative.startsWith("//")) {
    return `https:${relative}`;
  }
  if (relative.startsWith("data:")) {
    return ""; // Don't return data URLs
  }

  try {
    return new URL(relative, base).href;
  } catch {
    return "";
  }
}

/**
 * Decode HTML entities
 */
export function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
    "&#x27;": "'",
    "&#x2F;": "/",
    "&#47;": "/",
    "&nbsp;": " ",
    "&#160;": " ",
  };

  // Handle numeric entities
  let result = text.replace(/&#(\d+);/g, (_, dec) =>
    String.fromCharCode(parseInt(dec, 10)),
  );

  // Handle hex entities
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16)),
  );

  // Handle named entities
  return result.replace(/&[#\w]+;/g, (entity) => entities[entity] || entity);
}

// ============================================================================
// HTML Parsing
// ============================================================================

/**
 * Parse Open Graph meta tags from HTML
 */
export function parseOpenGraph(html: string): OpenGraphData {
  const og: OpenGraphData = {};

  // Match og: prefixed meta tags (property="og:xxx" content="...")
  const ogRegex =
    /<meta\s+(?:[^>]*?\s)?(?:property|name)=["']og:([^"']+)["']\s+(?:[^>]*?\s)?content=["']([^"']*)["']/gi;
  let match: RegExpExecArray | null;

  while ((match = ogRegex.exec(html)) !== null) {
    const [, property, content] = match;
    const value = decodeHtmlEntities(content);

    switch (property) {
      case "title":
        og.title = value;
        break;
      case "type":
        og.type = value;
        break;
      case "url":
        og.url = value;
        break;
      case "description":
        og.description = value;
        break;
      case "image":
        og.image = value;
        break;
      case "image:width":
        og.imageWidth = parseInt(value, 10) || undefined;
        break;
      case "image:height":
        og.imageHeight = parseInt(value, 10) || undefined;
        break;
      case "image:alt":
        og.imageAlt = value;
        break;
      case "site_name":
        og.siteName = value;
        break;
      case "locale":
        og.locale = value;
        break;
      case "audio":
        og.audio = value;
        break;
      case "video":
        og.video = value;
        break;
      case "video:width":
        og.videoWidth = parseInt(value, 10) || undefined;
        break;
      case "video:height":
        og.videoHeight = parseInt(value, 10) || undefined;
        break;
      case "video:type":
        og.videoType = value;
        break;
    }
  }

  // Also check for content="" property="" format (reversed attribute order)
  const ogRegexReversed =
    /<meta\s+(?:[^>]*?\s)?content=["']([^"']*)["']\s+(?:[^>]*?\s)?(?:property|name)=["']og:([^"']+)["']/gi;

  while ((match = ogRegexReversed.exec(html)) !== null) {
    const [, content, property] = match;
    const value = decodeHtmlEntities(content);

    // Only set if not already set
    switch (property) {
      case "title":
        og.title = og.title || value;
        break;
      case "type":
        og.type = og.type || value;
        break;
      case "description":
        og.description = og.description || value;
        break;
      case "image":
        og.image = og.image || value;
        break;
      case "site_name":
        og.siteName = og.siteName || value;
        break;
    }
  }

  return og;
}

/**
 * Parse Twitter Card meta tags from HTML
 */
export function parseTwitterCard(html: string): TwitterCardData {
  const twitter: TwitterCardData = {};

  // Match twitter: prefixed meta tags
  const twitterRegex =
    /<meta\s+(?:[^>]*?\s)?(?:property|name)=["']twitter:([^"']+)["']\s+(?:[^>]*?\s)?content=["']([^"']*)["']/gi;
  let match: RegExpExecArray | null;

  while ((match = twitterRegex.exec(html)) !== null) {
    const [, property, content] = match;
    const value = decodeHtmlEntities(content);

    switch (property) {
      case "card":
        twitter.card = value as TwitterCardData["card"];
        break;
      case "site":
        twitter.site = value;
        break;
      case "site:id":
        twitter.siteId = value;
        break;
      case "creator":
        twitter.creator = value;
        break;
      case "creator:id":
        twitter.creatorId = value;
        break;
      case "title":
        twitter.title = value;
        break;
      case "description":
        twitter.description = value;
        break;
      case "image":
        twitter.image = value;
        break;
      case "image:alt":
        twitter.imageAlt = value;
        break;
      case "player":
        twitter.player = value;
        break;
      case "player:width":
        twitter.playerWidth = parseInt(value, 10) || undefined;
        break;
      case "player:height":
        twitter.playerHeight = parseInt(value, 10) || undefined;
        break;
      case "player:stream":
        twitter.playerStream = value;
        break;
    }
  }

  // Reversed format
  const twitterRegexReversed =
    /<meta\s+(?:[^>]*?\s)?content=["']([^"']*)["']\s+(?:[^>]*?\s)?(?:property|name)=["']twitter:([^"']+)["']/gi;

  while ((match = twitterRegexReversed.exec(html)) !== null) {
    const [, content, property] = match;
    const value = decodeHtmlEntities(content);

    switch (property) {
      case "card":
        twitter.card = twitter.card || (value as TwitterCardData["card"]);
        break;
      case "title":
        twitter.title = twitter.title || value;
        break;
      case "description":
        twitter.description = twitter.description || value;
        break;
      case "image":
        twitter.image = twitter.image || value;
        break;
    }
  }

  return twitter;
}

/**
 * Extract basic HTML metadata
 */
export function extractBasicMeta(html: string, url: string): BasicMetaData {
  const data: BasicMetaData = {};

  // Title from <title> tag
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) {
    data.title = decodeHtmlEntities(titleMatch[1].trim());
  }

  // Description from meta tag
  const descMatch = html.match(
    /<meta\s+(?:[^>]*?\s)?name=["']description["']\s+(?:[^>]*?\s)?content=["']([^"']*)["']/i,
  );
  if (descMatch) {
    data.description = decodeHtmlEntities(descMatch[1]);
  }

  // Reversed format
  const descMatchReversed = html.match(
    /<meta\s+(?:[^>]*?\s)?content=["']([^"']*)["']\s+(?:[^>]*?\s)?name=["']description["']/i,
  );
  if (descMatchReversed && !data.description) {
    data.description = decodeHtmlEntities(descMatchReversed[1]);
  }

  // Favicon - try multiple patterns
  const faviconPatterns = [
    /<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i,
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:shortcut )?icon["']/i,
    /<link[^>]+rel=["']icon["'][^>]+href=["']([^"']+)["']/i,
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']icon["']/i,
  ];

  for (const pattern of faviconPatterns) {
    const match = html.match(pattern);
    if (match) {
      data.favicon = resolveUrl(url, match[1]);
      break;
    }
  }

  // Apple touch icon as fallback favicon
  if (!data.favicon) {
    const appleTouchMatch = html.match(
      /<link[^>]+rel=["']apple-touch-icon["'][^>]+href=["']([^"']+)["']/i,
    );
    if (appleTouchMatch) {
      data.favicon = resolveUrl(url, appleTouchMatch[1]);
    }
  }

  // Default favicon fallback
  if (!data.favicon) {
    data.favicon = resolveUrl(url, "/favicon.ico");
  }

  // Theme color
  const themeColorMatch = html.match(
    /<meta\s+(?:[^>]*?\s)?name=["']theme-color["']\s+(?:[^>]*?\s)?content=["']([^"']*)["']/i,
  );
  if (themeColorMatch) {
    data.themeColor = themeColorMatch[1];
  }

  // Author
  const authorMatch = html.match(
    /<meta\s+(?:[^>]*?\s)?name=["']author["']\s+(?:[^>]*?\s)?content=["']([^"']*)["']/i,
  );
  if (authorMatch) {
    data.author = decodeHtmlEntities(authorMatch[1]);
  }

  // Published date
  const dateMatch = html.match(
    /<meta\s+(?:[^>]*?\s)?(?:property|name)=["'](?:article:published_time|datePublished|pubdate)["']\s+(?:[^>]*?\s)?content=["']([^"']*)["']/i,
  );
  if (dateMatch) {
    data.publishedAt = dateMatch[1];
  }

  return data;
}

/**
 * Determine content type from metadata
 */
export function determineContentType(
  og: OpenGraphData,
  twitter: TwitterCardData,
): LinkPreviewType {
  // Check Open Graph type
  if (og.type) {
    if (og.type.includes("video")) return "video";
    if (og.type.includes("music") || og.type.includes("audio")) return "audio";
    if (og.type.includes("article") || og.type.includes("blog"))
      return "article";
    if (og.type.includes("product")) return "product";
    if (og.type.includes("profile")) return "profile";
  }

  // Check Twitter card type
  if (twitter.card === "player") return "video";
  if (twitter.card === "summary_large_image") return "article";

  // Check for video content
  if (og.video || twitter.player) return "video";

  // Check for audio content
  if (og.audio) return "audio";

  // Default to website
  return "website";
}

// ============================================================================
// Link Unfurl Service Class
// ============================================================================

/**
 * Link Unfurl Service
 *
 * Provides secure URL unfurling with SSRF protection.
 */
export class LinkUnfurlService {
  private readonly log = logger.scope("LinkUnfurlService");

  /**
   * Unfurl a URL and extract metadata
   */
  async unfurlUrl(
    url: string,
    options: UnfurlOptions = {},
  ): Promise<UnfurlResult> {
    const {
      timeout = DEFAULT_TIMEOUT,
      maxRedirects = MAX_REDIRECTS,
      maxContentSize = MAX_CONTENT_SIZE,
      cacheTtlHours = DEFAULT_CACHE_TTL_HOURS,
    } = options;

    this.log.debug("Unfurling URL", { url, timeout, maxRedirects });

    // Validate URL for SSRF
    const validation = await validateUrl(url);
    if (!validation.valid) {
      this.log.warn("SSRF validation failed", { url, error: validation.error });
      return {
        success: false,
        error: validation.error,
        errorCode: "SSRF_BLOCKED",
      };
    }

    try {
      // Fetch with timeout and redirect tracking
      const html = await this.fetchWithProtection(url, {
        timeout,
        maxRedirects,
        maxContentSize,
      });

      // Parse metadata
      const og = parseOpenGraph(html);
      const twitter = parseTwitterCard(html);
      const basic = extractBasicMeta(html, url);

      // Determine content type
      const type = determineContentType(og, twitter);
      const domain = extractDomain(url);

      // Build preview data
      const now = new Date();
      const expiresAt = new Date(
        now.getTime() + cacheTtlHours * 60 * 60 * 1000,
      );

      const imageUrl = resolveUrl(url, twitter.image || og.image || "");
      const videoUrl = resolveUrl(url, og.video || twitter.player || "");
      const audioUrl = resolveUrl(url, og.audio || "");

      const data: LinkPreviewData = {
        url,
        urlHash: hashUrl(url),
        title: twitter.title || og.title || basic.title || domain,
        description: twitter.description || og.description || basic.description,
        imageUrl: imageUrl || undefined,
        imageWidth: og.imageWidth,
        imageHeight: og.imageHeight,
        imageAlt: twitter.imageAlt || og.imageAlt,
        siteName: getKnownSiteName(url) || og.siteName || domain,
        faviconUrl: basic.favicon,
        type,
        videoUrl: videoUrl || undefined,
        videoWidth: og.videoWidth || twitter.playerWidth,
        videoHeight: og.videoHeight || twitter.playerHeight,
        audioUrl: audioUrl || undefined,
        author: basic.author || twitter.creator,
        publishedAt: basic.publishedAt,
        domain,
        themeColor: basic.themeColor,
        fetchedAt: now,
        expiresAt,
      };

      this.log.info("URL unfurled successfully", {
        url,
        title: data.title,
        type: data.type,
        hasImage: !!data.imageUrl,
      });

      return {
        success: true,
        data,
        cached: false,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const errorCode = this.mapErrorToCode(error);

      this.log.error(
        "Failed to unfurl URL",
        error instanceof Error ? error : new Error(errorMessage),
        { url },
      );

      return {
        success: false,
        error: errorMessage,
        errorCode,
      };
    }
  }

  /**
   * Validate URL for SSRF protection
   */
  async validateUrl(url: string): Promise<{ valid: boolean; error?: string }> {
    return validateUrl(url);
  }

  /**
   * Parse Open Graph metadata from HTML
   */
  parseOpenGraph(html: string): OpenGraphData {
    return parseOpenGraph(html);
  }

  /**
   * Parse Twitter Card metadata from HTML
   */
  parseTwitterCard(html: string): TwitterCardData {
    return parseTwitterCard(html);
  }

  /**
   * Extract basic metadata from HTML
   */
  extractBasicMeta(html: string, url: string): BasicMetaData {
    return extractBasicMeta(html, url);
  }

  /**
   * Fetch URL with SSRF protection
   */
  private async fetchWithProtection(
    url: string,
    options: {
      timeout: number;
      maxRedirects: number;
      maxContentSize: number;
    },
  ): Promise<string> {
    const { timeout, maxRedirects, maxContentSize } = options;
    let redirectCount = 0;
    let currentUrl = url;

    while (redirectCount <= maxRedirects) {
      // Validate each URL in redirect chain
      const validation = await validateUrl(currentUrl);
      if (!validation.valid) {
        throw new Error(`SSRF blocked during redirect: ${validation.error}`);
      }

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(currentUrl, {
          method: "GET",
          headers: {
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "User-Agent": USER_AGENT,
            "Cache-Control": "no-cache",
          },
          signal: controller.signal,
          redirect: "manual", // Handle redirects manually for SSRF protection
        });

        clearTimeout(timeoutId);

        // Handle redirects manually
        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get("location");
          if (!location) {
            throw new Error("Redirect without location header");
          }

          currentUrl = resolveUrl(currentUrl, location);
          redirectCount++;

          if (redirectCount > maxRedirects) {
            throw new Error(`Too many redirects (max: ${maxRedirects})`);
          }

          continue;
        }

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Page not found");
          }
          throw new Error(`HTTP error: ${response.status}`);
        }

        // Check content type
        const contentType = response.headers.get("content-type") || "";
        if (
          !contentType.includes("text/html") &&
          !contentType.includes("application/xhtml+xml")
        ) {
          throw new Error(`Invalid content type: ${contentType}`);
        }

        // Check content length
        const contentLength = response.headers.get("content-length");
        if (contentLength && parseInt(contentLength, 10) > maxContentSize) {
          throw new Error(`Content too large: ${contentLength} bytes`);
        }

        // Read response with size limit
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response body");
        }

        const chunks: Uint8Array[] = [];
        let totalSize = 0;

        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          totalSize += value.length;
          if (totalSize > maxContentSize) {
            reader.cancel();
            throw new Error(
              `Content too large (exceeded ${maxContentSize} bytes)`,
            );
          }

          chunks.push(value);
        }

        const decoder = new TextDecoder("utf-8");
        return (
          chunks
            .map((chunk) => decoder.decode(chunk, { stream: true }))
            .join("") + decoder.decode()
        );
      } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof Error && error.name === "AbortError") {
          throw new Error("Request timed out");
        }

        throw error;
      }
    }

    throw new Error(`Too many redirects (max: ${maxRedirects})`);
  }

  /**
   * Map error to error code
   */
  private mapErrorToCode(error: unknown): UnfurlErrorCode {
    if (!(error instanceof Error)) return "UNKNOWN";

    const message = error.message.toLowerCase();

    if (message.includes("ssrf")) return "SSRF_BLOCKED";
    if (message.includes("dns")) return "DNS_RESOLUTION_FAILED";
    if (message.includes("timeout")) return "TIMEOUT";
    if (message.includes("too many redirects")) return "TOO_MANY_REDIRECTS";
    if (message.includes("not found") || message.includes("404"))
      return "NOT_FOUND";
    if (message.includes("too large")) return "CONTENT_TOO_LARGE";
    if (message.includes("content type")) return "INVALID_CONTENT_TYPE";
    if (message.includes("rate limit")) return "RATE_LIMITED";

    return "FETCH_FAILED";
  }
}

// ============================================================================
// Singleton and Factory
// ============================================================================

let linkUnfurlServiceInstance: LinkUnfurlService | null = null;

/**
 * Get or create the link unfurl service singleton
 */
export function getLinkUnfurlService(): LinkUnfurlService {
  if (!linkUnfurlServiceInstance) {
    linkUnfurlServiceInstance = new LinkUnfurlService();
  }
  return linkUnfurlServiceInstance;
}

/**
 * Create a new link unfurl service instance (for testing)
 */
export function createLinkUnfurlService(): LinkUnfurlService {
  return new LinkUnfurlService();
}

export default LinkUnfurlService;
