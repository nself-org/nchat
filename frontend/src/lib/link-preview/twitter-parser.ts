/**
 * Twitter Card Parser - Extracts Twitter Card metadata from HTML
 *
 * Parses twitter: prefixed meta tags according to Twitter Card specification
 * https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/markup
 */

import type { TwitterCardData, TwitterCardType } from "./preview-types";

// ============================================================================
// Constants
// ============================================================================

const TWITTER_PROPERTY_MAP: Record<string, keyof TwitterCardData> = {
  "twitter:card": "card",
  "twitter:site": "site",
  "twitter:site:id": "siteId",
  "twitter:creator": "creator",
  "twitter:creator:id": "creatorId",
  "twitter:title": "title",
  "twitter:description": "description",
  "twitter:image": "image",
  "twitter:image:alt": "imageAlt",
  "twitter:player": "player",
  "twitter:player:width": "playerWidth",
  "twitter:player:height": "playerHeight",
  "twitter:player:stream": "playerStream",
  "twitter:app:id:iphone": "appIdIphone",
  "twitter:app:id:ipad": "appIdIpad",
  "twitter:app:id:googleplay": "appIdGoogleplay",
  "twitter:app:url:iphone": "appUrlIphone",
  "twitter:app:url:ipad": "appUrlIpad",
  "twitter:app:url:googleplay": "appUrlGoogleplay",
};

const VALID_CARD_TYPES: TwitterCardType[] = [
  "summary",
  "summary_large_image",
  "app",
  "player",
];

// ============================================================================
// Parser Functions
// ============================================================================

/**
 * Extract Twitter Card metadata from HTML string
 */
export function parseTwitterCard(html: string): TwitterCardData {
  const twitterData: TwitterCardData = {};

  // Match all meta tags with name or property attributes
  const metaRegex =
    /<meta\s+(?:[^>]*?\s+)?(?:property|name)=["']([^"']+)["']\s+(?:[^>]*?\s+)?content=["']([^"']*)["'][^>]*>/gi;
  const metaRegexAlt =
    /<meta\s+(?:[^>]*?\s+)?content=["']([^"']*)["']\s+(?:[^>]*?\s+)?(?:property|name)=["']([^"']+)["'][^>]*>/gi;

  // Process standard order (property/name first)
  let match: RegExpExecArray | null;
  while ((match = metaRegex.exec(html)) !== null) {
    const [, property, content] = match;
    processTwitterTag(property.toLowerCase(), content, twitterData);
  }

  // Process alternate order (content first)
  while ((match = metaRegexAlt.exec(html)) !== null) {
    const [, content, property] = match;
    processTwitterTag(property.toLowerCase(), content, twitterData);
  }

  // Validate card type
  if (twitterData.card && !VALID_CARD_TYPES.includes(twitterData.card)) {
    twitterData.card = "summary";
  }

  return twitterData;
}

/**
 * Process a single Twitter meta tag
 */
function processTwitterTag(
  property: string,
  content: string,
  twitterData: TwitterCardData,
): void {
  const mappedKey = TWITTER_PROPERTY_MAP[property];
  if (!mappedKey) return;

  // Handle numeric properties
  if (mappedKey === "playerWidth" || mappedKey === "playerHeight") {
    const numValue = parseInt(content, 10);
    if (!isNaN(numValue)) {
      twitterData[mappedKey] = numValue;
    }
  } else if (mappedKey === "card") {
    twitterData.card = content as TwitterCardType;
  } else {
    (twitterData as Record<string, unknown>)[mappedKey] =
      decodeHtmlEntities(content);
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
  };

  let result = text;
  for (const [entity, char] of Object.entries(entities)) {
    result = result.replace(new RegExp(entity, "g"), char);
  }

  return result;
}

/**
 * Check if Twitter Card data is present
 */
export function hasTwitterCard(data: TwitterCardData): boolean {
  return !!(data.card || data.title || data.description || data.image);
}

/**
 * Determine if Twitter Card should be used over Open Graph
 * Twitter-specific features like player cards take priority
 */
export function shouldPreferTwitterCard(data: TwitterCardData): boolean {
  return data.card === "player" || data.card === "app";
}

/**
 * Get the effective image from Twitter Card data
 * Handles various image property combinations
 */
export function getTwitterImage(data: TwitterCardData): string | undefined {
  return data.image;
}

/**
 * Parse Twitter handle to ensure @ prefix
 */
export function normalizeTwitterHandle(
  handle: string | undefined,
): string | undefined {
  if (!handle) return undefined;
  return handle.startsWith("@") ? handle : `@${handle}`;
}

/**
 * Extract Twitter username from URL
 */
export function extractTwitterUsername(url: string): string | null {
  const match = url.match(/(?:twitter|x)\.com\/(@?[\w]+)/i);
  if (match) {
    return normalizeTwitterHandle(match[1]) || null;
  }
  return null;
}

/**
 * Extract tweet ID from URL
 */
export function extractTweetId(url: string): string | null {
  const match = url.match(/(?:twitter|x)\.com\/\w+\/status\/(\d+)/i);
  return match ? match[1] : null;
}

/**
 * Build Twitter embed URL
 */
export function buildTwitterEmbedUrl(tweetId: string): string {
  return `https://platform.twitter.com/embed/Tweet.html?id=${tweetId}`;
}

/**
 * Merge Twitter Card data with Open Graph as fallback
 */
export function mergeWithOpenGraph(
  twitterData: TwitterCardData,
  ogTitle?: string,
  ogDescription?: string,
  ogImage?: string,
): TwitterCardData {
  return {
    ...twitterData,
    title: twitterData.title || ogTitle,
    description: twitterData.description || ogDescription,
    image: twitterData.image || ogImage,
  };
}
