/**
 * Preview Sanitizer - Sanitizes and validates preview data
 *
 * Ensures safe content, removes potentially malicious data,
 * and normalizes URLs and metadata
 */

import type { LinkPreviewData, BasePreviewData } from "./preview-types";

// ============================================================================
// Constants
// ============================================================================

const MAX_TITLE_LENGTH = 300;
const MAX_DESCRIPTION_LENGTH = 1000;
const MAX_AUTHOR_LENGTH = 100;
const MAX_SITE_NAME_LENGTH = 100;
const MAX_IMAGE_URL_LENGTH = 2048;
const MAX_URL_LENGTH = 4096;

// Dangerous URL schemes
const DANGEROUS_SCHEMES = ["javascript:", "data:", "vbscript:", "file:"];

// Dangerous HTML patterns
const DANGEROUS_PATTERNS = [
  /<script/i,
  /javascript:/i,
  /on\w+\s*=/i,
  /data:/i,
  /<iframe/i,
  /<object/i,
  /<embed/i,
];

// Allowed image extensions
const ALLOWED_IMAGE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".svg",
  ".ico",
  ".bmp",
];

// ============================================================================
// URL Sanitization
// ============================================================================

/**
 * Validate if a string is a valid HTTP/HTTPS URL
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Sanitize a URL for safe usage
 */
export function sanitizeUrl(
  url: string | undefined,
  baseUrl?: string,
): string | undefined {
  if (!url) return undefined;

  // Trim whitespace
  url = url.trim();

  // Check for dangerous schemes
  const lowerUrl = url.toLowerCase();
  for (const scheme of DANGEROUS_SCHEMES) {
    if (lowerUrl.startsWith(scheme)) {
      return undefined;
    }
  }

  // Handle protocol-relative URLs
  if (url.startsWith("//")) {
    url = `https:${url}`;
  }

  // Handle relative URLs
  if (url.startsWith("/") && baseUrl) {
    try {
      const base = new URL(baseUrl);
      url = `${base.protocol}//${base.host}${url}`;
    } catch {
      return undefined;
    }
  }

  // Validate URL structure
  try {
    const parsed = new URL(url);

    // Only allow http and https
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return undefined;
    }

    // Enforce length limit
    if (url.length > MAX_URL_LENGTH) {
      return undefined;
    }

    return parsed.href;
  } catch {
    return undefined;
  }
}

/**
 * Sanitize an image URL with additional validation
 */
export function sanitizeImageUrl(
  url: string | undefined,
  baseUrl?: string,
): string | undefined {
  const sanitized = sanitizeUrl(url, baseUrl);
  if (!sanitized) return undefined;

  // Check length
  if (sanitized.length > MAX_IMAGE_URL_LENGTH) {
    return undefined;
  }

  // Allow common image CDNs and services
  const trustedDomains = [
    "imgur.com",
    "i.imgur.com",
    "pbs.twimg.com",
    "abs.twimg.com",
    "youtube.com",
    "i.ytimg.com",
    "yt3.ggpht.com",
    "github.com",
    "githubusercontent.com",
    "avatars.githubusercontent.com",
    "raw.githubusercontent.com",
    "opengraph.githubassets.com",
    "i.scdn.co",
    "mosaic.scdn.co",
    "upload.wikimedia.org",
    "cloudinary.com",
    "res.cloudinary.com",
  ];

  try {
    const parsed = new URL(sanitized);

    // Check if it's a trusted domain
    const isTrusted = trustedDomains.some(
      (domain) =>
        parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`),
    );

    if (isTrusted) {
      return sanitized;
    }

    // For other domains, check file extension
    const pathLower = parsed.pathname.toLowerCase();
    const hasImageExtension = ALLOWED_IMAGE_EXTENSIONS.some((ext) =>
      pathLower.endsWith(ext),
    );

    // Also allow query-based images (common in CDNs)
    const hasImageParam =
      parsed.searchParams.has("format") ||
      parsed.searchParams.has("fm") ||
      parsed.searchParams.has("auto");

    if (hasImageExtension || hasImageParam) {
      return sanitized;
    }

    // Allow if it looks like an image path
    if (
      pathLower.includes("/image") ||
      pathLower.includes("/photo") ||
      pathLower.includes("/media")
    ) {
      return sanitized;
    }

    // Default: allow it (could be an image served without extension)
    return sanitized;
  } catch {
    return undefined;
  }
}

// ============================================================================
// Text Sanitization
// ============================================================================

/**
 * Sanitize text content
 */
export function sanitizeText(
  text: string | undefined,
  maxLength: number,
): string | undefined {
  if (!text) return undefined;

  // Decode HTML entities
  let sanitized = decodeHtmlEntities(text);

  // Remove HTML tags
  sanitized = stripHtml(sanitized);

  // Normalize whitespace
  sanitized = normalizeWhitespace(sanitized);

  // Check for dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(sanitized)) {
      sanitized = sanitized.replace(pattern, "");
    }
  }

  // Truncate if too long
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength - 3) + "...";
  }

  return sanitized || undefined;
}

/**
 * Sanitize title text
 */
export function sanitizeTitle(title: string | undefined): string | undefined {
  return sanitizeText(title, MAX_TITLE_LENGTH);
}

/**
 * Sanitize description text
 */
export function sanitizeDescription(
  description: string | undefined,
): string | undefined {
  return sanitizeText(description, MAX_DESCRIPTION_LENGTH);
}

/**
 * Sanitize author name
 */
export function sanitizeAuthor(author: string | undefined): string | undefined {
  return sanitizeText(author, MAX_AUTHOR_LENGTH);
}

/**
 * Sanitize site name
 */
export function sanitizeSiteName(
  siteName: string | undefined,
): string | undefined {
  return sanitizeText(siteName, MAX_SITE_NAME_LENGTH);
}

// ============================================================================
// HTML Utilities
// ============================================================================

/**
 * Strip HTML tags from text
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();
}

/**
 * Decode common HTML entities
 */
export function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&#x27;": "'",
    "&apos;": "'",
    "&nbsp;": " ",
    "&#8217;": "'",
    "&#8216;": "'",
    "&#8220;": '"',
    "&#8221;": '"',
    "&#8211;": "-",
    "&#8212;": "--",
    "&hellip;": "...",
    "&mdash;": "--",
    "&ndash;": "-",
    "&copy;": "(c)",
    "&reg;": "(R)",
    "&trade;": "(TM)",
  };

  let result = text;
  for (const [entity, char] of Object.entries(entities)) {
    result = result.replace(new RegExp(entity, "gi"), char);
  }

  // Handle numeric entities
  result = result.replace(/&#(\d+);/g, (_, code) => {
    const num = parseInt(code, 10);
    return num > 31 && num < 127 ? String.fromCharCode(num) : "";
  });
  result = result.replace(/&#x([0-9a-f]+);/gi, (_, code) => {
    const num = parseInt(code, 16);
    return num > 31 && num < 127 ? String.fromCharCode(num) : "";
  });

  return result;
}

/**
 * Normalize whitespace in text
 */
export function normalizeWhitespace(text: string): string {
  return text
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ============================================================================
// Preview Data Sanitization
// ============================================================================

/**
 * Sanitize complete preview data
 */
export function sanitizePreviewData(
  data: LinkPreviewData,
  originalUrl: string,
): LinkPreviewData {
  const sanitized: LinkPreviewData = {
    ...data,
    url: sanitizeUrl(data.url, originalUrl) || originalUrl,
    title: sanitizeTitle(data.title),
    description: sanitizeDescription(data.description),
    siteName: sanitizeSiteName(data.siteName),
    author: sanitizeAuthor(data.author),
    image: sanitizeImageUrl(data.image, originalUrl),
    favicon: sanitizeImageUrl(data.favicon, originalUrl),
  };

  // Sanitize image dimensions
  if (sanitized.imageWidth !== undefined) {
    sanitized.imageWidth = Math.max(0, Math.min(10000, sanitized.imageWidth));
  }
  if (sanitized.imageHeight !== undefined) {
    sanitized.imageHeight = Math.max(0, Math.min(10000, sanitized.imageHeight));
  }

  return sanitized;
}

/**
 * Validate that preview data is safe to display
 */
export function isPreviewDataSafe(data: BasePreviewData): boolean {
  // Check URL safety
  if (!data.url || !sanitizeUrl(data.url)) {
    return false;
  }

  // Check for XSS patterns in text fields
  const textFields = [data.title, data.description, data.siteName, data.author];
  for (const field of textFields) {
    if (field) {
      for (const pattern of DANGEROUS_PATTERNS) {
        if (pattern.test(field)) {
          return false;
        }
      }
    }
  }

  return true;
}

// ============================================================================
// Domain Validation
// ============================================================================

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

/**
 * Check if a domain is blocked
 */
export function isDomainBlocked(
  url: string,
  blockedDomains: string[],
): boolean {
  const domain = extractDomain(url);
  if (!domain) return false;

  return blockedDomains.some((blocked) => {
    const normalizedBlocked = blocked.toLowerCase().replace(/^www\./, "");
    return (
      domain === normalizedBlocked || domain.endsWith(`.${normalizedBlocked}`)
    );
  });
}

/**
 * Check if a domain is allowed (whitelist mode)
 */
export function isDomainAllowed(
  url: string,
  allowedDomains: string[],
): boolean {
  if (allowedDomains.length === 0) return true;

  const domain = extractDomain(url);
  if (!domain) return false;

  return allowedDomains.some((allowed) => {
    const normalizedAllowed = allowed.toLowerCase().replace(/^www\./, "");
    return (
      domain === normalizedAllowed || domain.endsWith(`.${normalizedAllowed}`)
    );
  });
}
