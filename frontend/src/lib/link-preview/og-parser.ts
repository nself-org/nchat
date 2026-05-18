/**
 * Open Graph Parser - Extracts Open Graph metadata from HTML
 *
 * Parses og: prefixed meta tags according to the Open Graph protocol
 * https://ogp.me/
 */

import type { OpenGraphData } from "./preview-types";

// ============================================================================
// Constants
// ============================================================================

const OG_PROPERTY_MAP: Record<string, keyof OpenGraphData> = {
  "og:title": "title",
  "og:type": "type",
  "og:image": "image",
  "og:url": "url",
  "og:audio": "audio",
  "og:description": "description",
  "og:determiner": "determiner",
  "og:locale": "locale",
  "og:site_name": "siteName",
  "og:video": "video",
  "og:image:secure_url": "imageSecureUrl",
  "og:image:type": "imageType",
  "og:image:width": "imageWidth",
  "og:image:height": "imageHeight",
  "og:image:alt": "imageAlt",
  "og:video:secure_url": "videoSecureUrl",
  "og:video:type": "videoType",
  "og:video:width": "videoWidth",
  "og:video:height": "videoHeight",
  "og:audio:secure_url": "audioSecureUrl",
  "og:audio:type": "audioType",
  "article:published_time": "articlePublishedTime",
  "article:modified_time": "articleModifiedTime",
  "article:expiration_time": "articleExpirationTime",
  "article:section": "articleSection",
};

const OG_ARRAY_PROPERTIES = [
  "og:locale:alternate",
  "article:author",
  "article:tag",
];

// ============================================================================
// Parser Functions
// ============================================================================

/**
 * Extract Open Graph metadata from HTML string
 */
export function parseOpenGraph(html: string): OpenGraphData {
  const ogData: OpenGraphData = {};
  const arrayData: Record<string, string[]> = {
    localeAlternate: [],
    articleAuthor: [],
    articleTag: [],
  };

  // Match all meta tags with property or name attributes
  const metaRegex =
    /<meta\s+(?:[^>]*?\s+)?(?:property|name)=["']([^"']+)["']\s+(?:[^>]*?\s+)?content=["']([^"']*)["'][^>]*>/gi;
  const metaRegexAlt =
    /<meta\s+(?:[^>]*?\s+)?content=["']([^"']*)["']\s+(?:[^>]*?\s+)?(?:property|name)=["']([^"']+)["'][^>]*>/gi;

  // Process standard order (property/name first)
  let match: RegExpExecArray | null;
  while ((match = metaRegex.exec(html)) !== null) {
    const [, property, content] = match;
    processMetaTag(property.toLowerCase(), content, ogData, arrayData);
  }

  // Process alternate order (content first)
  while ((match = metaRegexAlt.exec(html)) !== null) {
    const [, content, property] = match;
    processMetaTag(property.toLowerCase(), content, ogData, arrayData);
  }

  // Assign array properties
  if (arrayData.localeAlternate.length > 0) {
    ogData.localeAlternate = arrayData.localeAlternate;
  }
  if (arrayData.articleAuthor.length > 0) {
    ogData.articleAuthor = arrayData.articleAuthor;
  }
  if (arrayData.articleTag.length > 0) {
    ogData.articleTag = arrayData.articleTag;
  }

  return ogData;
}

/**
 * Process a single meta tag
 */
function processMetaTag(
  property: string,
  content: string,
  ogData: OpenGraphData,
  arrayData: Record<string, string[]>,
): void {
  // Handle array properties
  if (property === "og:locale:alternate") {
    arrayData.localeAlternate.push(content);
    return;
  }
  if (property === "article:author") {
    arrayData.articleAuthor.push(content);
    return;
  }
  if (property === "article:tag") {
    arrayData.articleTag.push(content);
    return;
  }

  // Handle mapped properties
  const mappedKey = OG_PROPERTY_MAP[property];
  if (mappedKey) {
    // Handle numeric properties
    if (mappedKey.includes("Width") || mappedKey.includes("Height")) {
      const numValue = parseInt(content, 10);
      if (!isNaN(numValue)) {
        (ogData as Record<string, unknown>)[mappedKey] = numValue;
      }
    } else {
      (ogData as Record<string, unknown>)[mappedKey] =
        decodeHtmlEntities(content);
    }
  }
}

/**
 * Decode HTML entities in a string
 */
function decodeHtmlEntities(text: string): string {
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
  };

  let result = text;
  for (const [entity, char] of Object.entries(entities)) {
    result = result.replace(new RegExp(entity, "g"), char);
  }

  // Handle numeric entities
  result = result.replace(/&#(\d+);/g, (_, code) =>
    String.fromCharCode(parseInt(code, 10)),
  );
  result = result.replace(/&#x([0-9a-f]+);/gi, (_, code) =>
    String.fromCharCode(parseInt(code, 16)),
  );

  return result;
}

/**
 * Extract fallback metadata from HTML if Open Graph is not present
 */
export function extractFallbackMetadata(html: string): Partial<OpenGraphData> {
  const fallback: Partial<OpenGraphData> = {};

  // Extract title from <title> tag
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  if (titleMatch) {
    fallback.title = decodeHtmlEntities(titleMatch[1].trim());
  }

  // Extract description from meta description
  const descMatch = html.match(
    /<meta\s+(?:[^>]*?\s+)?name=["']description["']\s+(?:[^>]*?\s+)?content=["']([^"']*)["'][^>]*>/i,
  );
  if (descMatch) {
    fallback.description = decodeHtmlEntities(descMatch[1].trim());
  }

  // Try alternate order
  const descMatchAlt = html.match(
    /<meta\s+(?:[^>]*?\s+)?content=["']([^"']*)["']\s+(?:[^>]*?\s+)?name=["']description["'][^>]*>/i,
  );
  if (!fallback.description && descMatchAlt) {
    fallback.description = decodeHtmlEntities(descMatchAlt[1].trim());
  }

  // Extract canonical URL
  const canonicalMatch = html.match(
    /<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["'][^>]*>/i,
  );
  if (canonicalMatch) {
    fallback.url = canonicalMatch[1];
  }

  // Extract first significant image
  const imgMatch = html.match(/<img\s+[^>]*src=["']([^"']+)["'][^>]*>/i);
  if (imgMatch && !imgMatch[1].includes("data:")) {
    const imgSrc = imgMatch[1];
    // Only use if it looks like a content image (not icon or small asset)
    if (
      !imgSrc.includes("icon") &&
      !imgSrc.includes("logo") &&
      !imgSrc.includes("avatar")
    ) {
      fallback.image = imgSrc;
    }
  }

  return fallback;
}

/**
 * Check if Open Graph data is complete enough for a preview
 */
export function hasMinimalOpenGraph(data: OpenGraphData): boolean {
  return !!(data.title || data.description);
}

/**
 * Merge Open Graph data with fallbacks
 */
export function mergeWithFallbacks(
  ogData: OpenGraphData,
  fallback: Partial<OpenGraphData>,
): OpenGraphData {
  return {
    ...fallback,
    ...ogData,
    title: ogData.title || fallback.title,
    description: ogData.description || fallback.description,
    image: ogData.image || fallback.image,
    url: ogData.url || fallback.url,
  };
}
