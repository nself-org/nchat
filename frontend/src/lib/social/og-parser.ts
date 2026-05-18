/**
 * Open Graph Parser
 *
 * Complete implementation for parsing Open Graph protocol metadata from HTML.
 * Supports Open Graph, Twitter Cards, and basic HTML meta tags.
 *
 * Reference: https://ogp.me/
 */

export interface OpenGraphData {
  // Basic metadata
  title?: string;
  type?: string;
  url?: string;
  description?: string;
  siteName?: string;
  locale?: string;

  // Image metadata
  image?: string;
  imageSecureUrl?: string;
  imageType?: string;
  imageWidth?: number;
  imageHeight?: number;
  imageAlt?: string;

  // Video metadata
  video?: string;
  videoSecureUrl?: string;
  videoType?: string;
  videoWidth?: number;
  videoHeight?: number;

  // Audio metadata
  audio?: string;
  audioSecureUrl?: string;
  audioType?: string;

  // Article metadata
  articlePublishedTime?: string;
  articleModifiedTime?: string;
  articleExpirationTime?: string;
  articleAuthor?: string[];
  articleSection?: string;
  articleTag?: string[];

  // Book metadata
  bookAuthor?: string[];
  bookIsbn?: string;
  bookReleaseDate?: string;
  bookTag?: string[];

  // Profile metadata
  profileFirstName?: string;
  profileLastName?: string;
  profileUsername?: string;
  profileGender?: string;
}

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

export interface BasicMetadata {
  title?: string;
  description?: string;
  author?: string;
  keywords?: string[];
  canonicalUrl?: string;
  favicon?: string;
  themeColor?: string;
  publishedTime?: string;
  modifiedTime?: string;
}

// ============================================================================
// HTML Entity Decoder
// ============================================================================

const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&#x27;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
  "&#160;": " ",
  "&#8217;": "'",
  "&#8216;": "'",
  "&#8220;": '"',
  "&#8221;": '"',
  "&#8211;": "–",
  "&#8212;": "—",
  "&#8230;": "…",
};

/**
 * Decode HTML entities in a string
 */
export function decodeHtmlEntities(text: string): string {
  if (!text) return "";

  let result = text;

  // Replace named entities
  for (const [entity, char] of Object.entries(HTML_ENTITIES)) {
    result = result.replace(new RegExp(entity, "g"), char);
  }

  // Replace numeric entities (decimal)
  result = result.replace(/&#(\d+);/g, (_, dec) => {
    const code = parseInt(dec, 10);
    return isNaN(code) ? _ : String.fromCharCode(code);
  });

  // Replace numeric entities (hexadecimal)
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
    const code = parseInt(hex, 16);
    return isNaN(code) ? _ : String.fromCharCode(code);
  });

  return result;
}

// ============================================================================
// Meta Tag Extraction
// ============================================================================

/**
 * Extract meta tag content by property or name
 */
function extractMetaTag(html: string, property: string): string | undefined {
  // Try property attribute first (Open Graph standard)
  const propertyRegex = new RegExp(
    `<meta\\s+[^>]*property=["']${escapeRegex(property)}["'][^>]*content=["']([^"']*)["'][^>]*>`,
    "i",
  );
  let match = html.match(propertyRegex);
  if (match) return decodeHtmlEntities(match[1]);

  // Try reversed order (content first, then property)
  const propertyReversedRegex = new RegExp(
    `<meta\\s+[^>]*content=["']([^"']*)["'][^>]*property=["']${escapeRegex(property)}["'][^>]*>`,
    "i",
  );
  match = html.match(propertyReversedRegex);
  if (match) return decodeHtmlEntities(match[1]);

  // Try name attribute (fallback)
  const nameRegex = new RegExp(
    `<meta\\s+[^>]*name=["']${escapeRegex(property)}["'][^>]*content=["']([^"']*)["'][^>]*>`,
    "i",
  );
  match = html.match(nameRegex);
  if (match) return decodeHtmlEntities(match[1]);

  // Try reversed order (content first, then name)
  const nameReversedRegex = new RegExp(
    `<meta\\s+[^>]*content=["']([^"']*)["'][^>]*name=["']${escapeRegex(property)}["'][^>]*>`,
    "i",
  );
  match = html.match(nameReversedRegex);
  if (match) return decodeHtmlEntities(match[1]);

  return undefined;
}

/**
 * Extract all meta tags with a given prefix
 */
function extractMetaTagsWithPrefix(
  html: string,
  prefix: string,
): Array<{ property: string; content: string }> {
  const tags: Array<{ property: string; content: string }> = [];
  const regex = new RegExp(
    `<meta\\s+[^>]*(?:property|name)=["'](${escapeRegex(prefix)}[^"']*)["'][^>]*content=["']([^"']*)["'][^>]*>`,
    "gi",
  );

  let match;
  while ((match = regex.exec(html)) !== null) {
    tags.push({
      property: match[1],
      content: decodeHtmlEntities(match[2]),
    });
  }

  return tags;
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ============================================================================
// Open Graph Parser
// ============================================================================

/**
 * Parse Open Graph metadata from HTML
 */
export function parseOpenGraph(html: string): OpenGraphData {
  const og: OpenGraphData = {};

  // Basic properties
  og.title = extractMetaTag(html, "og:title");
  og.type = extractMetaTag(html, "og:type");
  og.url = extractMetaTag(html, "og:url");
  og.description = extractMetaTag(html, "og:description");
  og.siteName = extractMetaTag(html, "og:site_name");
  og.locale = extractMetaTag(html, "og:locale");

  // Image properties
  og.image = extractMetaTag(html, "og:image");
  og.imageSecureUrl = extractMetaTag(html, "og:image:secure_url");
  og.imageType = extractMetaTag(html, "og:image:type");
  og.imageAlt = extractMetaTag(html, "og:image:alt");

  const imageWidth = extractMetaTag(html, "og:image:width");
  if (imageWidth) og.imageWidth = parseInt(imageWidth, 10) || undefined;

  const imageHeight = extractMetaTag(html, "og:image:height");
  if (imageHeight) og.imageHeight = parseInt(imageHeight, 10) || undefined;

  // Video properties
  og.video = extractMetaTag(html, "og:video");
  og.videoSecureUrl = extractMetaTag(html, "og:video:secure_url");
  og.videoType = extractMetaTag(html, "og:video:type");

  const videoWidth = extractMetaTag(html, "og:video:width");
  if (videoWidth) og.videoWidth = parseInt(videoWidth, 10) || undefined;

  const videoHeight = extractMetaTag(html, "og:video:height");
  if (videoHeight) og.videoHeight = parseInt(videoHeight, 10) || undefined;

  // Audio properties
  og.audio = extractMetaTag(html, "og:audio");
  og.audioSecureUrl = extractMetaTag(html, "og:audio:secure_url");
  og.audioType = extractMetaTag(html, "og:audio:type");

  // Article properties
  og.articlePublishedTime = extractMetaTag(html, "article:published_time");
  og.articleModifiedTime = extractMetaTag(html, "article:modified_time");
  og.articleExpirationTime = extractMetaTag(html, "article:expiration_time");
  og.articleSection = extractMetaTag(html, "article:section");

  // Article authors (array)
  const articleAuthorTags = extractMetaTagsWithPrefix(html, "article:author");
  if (articleAuthorTags.length > 0) {
    og.articleAuthor = articleAuthorTags.map((tag) => tag.content);
  }

  // Article tags (array)
  const articleTagTags = extractMetaTagsWithPrefix(html, "article:tag");
  if (articleTagTags.length > 0) {
    og.articleTag = articleTagTags.map((tag) => tag.content);
  }

  // Book properties
  const bookAuthorTags = extractMetaTagsWithPrefix(html, "book:author");
  if (bookAuthorTags.length > 0) {
    og.bookAuthor = bookAuthorTags.map((tag) => tag.content);
  }

  og.bookIsbn = extractMetaTag(html, "book:isbn");
  og.bookReleaseDate = extractMetaTag(html, "book:release_date");

  const bookTagTags = extractMetaTagsWithPrefix(html, "book:tag");
  if (bookTagTags.length > 0) {
    og.bookTag = bookTagTags.map((tag) => tag.content);
  }

  // Profile properties
  og.profileFirstName = extractMetaTag(html, "profile:first_name");
  og.profileLastName = extractMetaTag(html, "profile:last_name");
  og.profileUsername = extractMetaTag(html, "profile:username");
  og.profileGender = extractMetaTag(html, "profile:gender");

  return og;
}

// ============================================================================
// Twitter Card Parser
// ============================================================================

/**
 * Parse Twitter Card metadata from HTML
 */
export function parseTwitterCard(html: string): TwitterCardData {
  const twitter: TwitterCardData = {};

  twitter.card = extractMetaTag(
    html,
    "twitter:card",
  ) as TwitterCardData["card"];
  twitter.site = extractMetaTag(html, "twitter:site");
  twitter.siteId = extractMetaTag(html, "twitter:site:id");
  twitter.creator = extractMetaTag(html, "twitter:creator");
  twitter.creatorId = extractMetaTag(html, "twitter:creator:id");
  twitter.title = extractMetaTag(html, "twitter:title");
  twitter.description = extractMetaTag(html, "twitter:description");
  twitter.image = extractMetaTag(html, "twitter:image");
  twitter.imageAlt = extractMetaTag(html, "twitter:image:alt");
  twitter.player = extractMetaTag(html, "twitter:player");
  twitter.playerStream = extractMetaTag(html, "twitter:player:stream");

  const playerWidth = extractMetaTag(html, "twitter:player:width");
  if (playerWidth) twitter.playerWidth = parseInt(playerWidth, 10) || undefined;

  const playerHeight = extractMetaTag(html, "twitter:player:height");
  if (playerHeight)
    twitter.playerHeight = parseInt(playerHeight, 10) || undefined;

  return twitter;
}

// ============================================================================
// Basic Metadata Parser
// ============================================================================

/**
 * Parse basic HTML metadata (title, description, etc.)
 */
export function parseBasicMetadata(
  html: string,
  baseUrl: string,
): BasicMetadata {
  const basic: BasicMetadata = {};

  // Title from <title> tag
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) {
    basic.title = decodeHtmlEntities(titleMatch[1].trim());
  }

  // Description
  basic.description = extractMetaTag(html, "description");

  // Author
  basic.author = extractMetaTag(html, "author");

  // Keywords
  const keywords = extractMetaTag(html, "keywords");
  if (keywords) {
    basic.keywords = keywords.split(",").map((k) => k.trim());
  }

  // Canonical URL
  const canonicalMatch = html.match(
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["'][^>]*>/i,
  );
  if (canonicalMatch) {
    basic.canonicalUrl = canonicalMatch[1];
  }

  // Theme color
  basic.themeColor = extractMetaTag(html, "theme-color");

  // Published/Modified time
  basic.publishedTime =
    extractMetaTag(html, "article:published_time") ||
    extractMetaTag(html, "datePublished");
  basic.modifiedTime =
    extractMetaTag(html, "article:modified_time") ||
    extractMetaTag(html, "dateModified");

  // Favicon
  const faviconPatterns = [
    /<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["'][^>]*>/i,
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:shortcut )?icon["'][^>]*>/i,
    /<link[^>]+rel=["']apple-touch-icon["'][^>]+href=["']([^"']+)["'][^>]*>/i,
  ];

  for (const pattern of faviconPatterns) {
    const match = html.match(pattern);
    if (match) {
      basic.favicon = resolveUrl(match[1], baseUrl);
      break;
    }
  }

  // Default favicon fallback
  if (!basic.favicon) {
    try {
      const url = new URL(baseUrl);
      basic.favicon = `${url.protocol}//${url.host}/favicon.ico`;
    } catch {
      // Ignore
    }
  }

  return basic;
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Resolve a relative URL to absolute
 */
function resolveUrl(url: string, baseUrl: string): string {
  if (!url) return "";

  // Already absolute
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  // Protocol-relative URL
  if (url.startsWith("//")) {
    return `https:${url}`;
  }

  try {
    const base = new URL(baseUrl);

    // Absolute path
    if (url.startsWith("/")) {
      return `${base.protocol}//${base.host}${url}`;
    }

    // Relative path
    return new URL(url, baseUrl).href;
  } catch {
    return url;
  }
}

/**
 * Merge Open Graph and Twitter Card data, preferring Twitter when available
 */
export function mergeMetadata(
  og: OpenGraphData,
  twitter: TwitterCardData,
  basic: BasicMetadata,
): {
  title?: string;
  description?: string;
  image?: string;
  imageWidth?: number;
  imageHeight?: number;
  imageAlt?: string;
  siteName?: string;
  author?: string;
  publishedTime?: string;
} {
  return {
    title: twitter.title || og.title || basic.title,
    description: twitter.description || og.description || basic.description,
    image: twitter.image || og.image,
    imageWidth: og.imageWidth,
    imageHeight: og.imageHeight,
    imageAlt: twitter.imageAlt || og.imageAlt,
    siteName: og.siteName,
    author: basic.author || og.articleAuthor?.[0],
    publishedTime: og.articlePublishedTime || basic.publishedTime,
  };
}

/**
 * Check if metadata is sufficient for a preview
 */
export function hasMinimalMetadata(data: {
  title?: string;
  description?: string;
  image?: string;
}): boolean {
  return !!(data.title || data.description || data.image);
}
