/**
 * Provider-Specific Handlers for Link Unfurling
 *
 * Specialized handlers for extracting rich metadata from
 * popular platforms like Reddit, Twitch, Vimeo, etc.
 *
 * @module lib/unfurl/provider-handlers
 */

import { UrlProvider, parseProviderUrl, PROVIDER_PATTERNS } from "./url-parser";

// ============================================================================
// Types
// ============================================================================

export interface ProviderData {
  provider: UrlProvider;
  type: string;
  id: string;
  title?: string;
  description?: string;
  author?: string;
  authorUrl?: string;
  authorAvatar?: string;
  image?: string;
  imageWidth?: number;
  imageHeight?: number;
  embedUrl?: string;
  embedHtml?: string;
  videoUrl?: string;
  videoWidth?: number;
  videoHeight?: number;
  duration?: number;
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  createdAt?: string;
  isLive?: boolean;
  extra?: Record<string, unknown>;
}

export interface ProviderHandler {
  /** Provider name */
  name: UrlProvider;
  /** Check if this handler can handle the URL */
  canHandle: (url: string) => boolean;
  /** Extract provider data from URL (without fetch) */
  extractFromUrl: (url: string) => ProviderData | null;
  /** Get oEmbed URL if supported */
  getOembedUrl?: (url: string) => string | null;
  /** Build embed URL for iframe */
  getEmbedUrl?: (id: string, options?: Record<string, string>) => string;
  /** Extract data from HTML page */
  parseHtml?: (html: string, url: string) => Partial<ProviderData>;
}

// ============================================================================
// Reddit Handler
// ============================================================================

export const redditHandler: ProviderHandler = {
  name: "reddit",

  canHandle: (url: string) => {
    return (
      /reddit\.com|redd\.it/.test(url) &&
      parseProviderUrl(url)?.provider === "reddit"
    );
  },

  extractFromUrl: (url: string) => {
    const parsed = parseProviderUrl(url);
    if (!parsed || parsed.provider !== "reddit") return null;

    const { type, id, extra } = parsed;

    return {
      provider: "reddit",
      type,
      id,
      extra: {
        subreddit: extra?.subreddit,
      },
    };
  },

  getOembedUrl: (url: string) => {
    // Reddit uses oEmbed
    return `https://www.reddit.com/oembed?url=${encodeURIComponent(url)}`;
  },

  parseHtml: (html: string, url: string) => {
    const data: Partial<ProviderData> = {};

    // Extract title from og:title
    const titleMatch = html.match(
      /<meta[^>]+(?:property|name)=["']og:title["'][^>]+content=["']([^"']+)["']/i,
    );
    if (titleMatch) data.title = titleMatch[1];

    // Extract description
    const descMatch = html.match(
      /<meta[^>]+(?:property|name)=["']og:description["'][^>]+content=["']([^"']+)["']/i,
    );
    if (descMatch) data.description = descMatch[1];

    // Extract image
    const imageMatch = html.match(
      /<meta[^>]+(?:property|name)=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    );
    if (imageMatch) data.image = imageMatch[1];

    // Extract author from URL or page
    const subredditMatch = url.match(/\/r\/([^/]+)/);
    if (subredditMatch) {
      data.author = `r/${subredditMatch[1]}`;
      data.authorUrl = `https://reddit.com/r/${subredditMatch[1]}`;
    }

    return data;
  },
};

// ============================================================================
// Twitch Handler
// ============================================================================

export const twitchHandler: ProviderHandler = {
  name: "twitch",

  canHandle: (url: string) => {
    return (
      /twitch\.tv/.test(url) && parseProviderUrl(url)?.provider === "twitch"
    );
  },

  extractFromUrl: (url: string) => {
    const parsed = parseProviderUrl(url);
    if (!parsed || parsed.provider !== "twitch") return null;

    return {
      provider: "twitch",
      type: parsed.type,
      id: parsed.id,
    };
  },

  getEmbedUrl: (id: string, options: Record<string, string> = {}) => {
    const parent = options.parent || "localhost";

    // Determine if it's a channel or video
    if (/^\d+$/.test(id)) {
      // Video ID
      return `https://player.twitch.tv/?video=${id}&parent=${parent}`;
    } else {
      // Channel name
      return `https://player.twitch.tv/?channel=${id}&parent=${parent}`;
    }
  },

  parseHtml: (html: string) => {
    const data: Partial<ProviderData> = {};

    // Extract title
    const titleMatch = html.match(
      /<meta[^>]+(?:property|name)=["']og:title["'][^>]+content=["']([^"']+)["']/i,
    );
    if (titleMatch) data.title = titleMatch[1];

    // Extract description
    const descMatch = html.match(
      /<meta[^>]+(?:property|name)=["']og:description["'][^>]+content=["']([^"']+)["']/i,
    );
    if (descMatch) data.description = descMatch[1];

    // Extract image
    const imageMatch = html.match(
      /<meta[^>]+(?:property|name)=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    );
    if (imageMatch) data.image = imageMatch[1];

    // Check if live
    data.isLive =
      html.includes('"isLiveBroadcast":true') ||
      html.includes('data-a-target="watch-live"');

    return data;
  },
};

// ============================================================================
// Vimeo Handler
// ============================================================================

export const vimeoHandler: ProviderHandler = {
  name: "vimeo",

  canHandle: (url: string) => {
    return (
      /vimeo\.com/.test(url) && parseProviderUrl(url)?.provider === "vimeo"
    );
  },

  extractFromUrl: (url: string) => {
    const match = url.match(PROVIDER_PATTERNS.vimeo.video);
    if (!match) return null;

    return {
      provider: "vimeo",
      type: "video",
      id: match[1],
      image: `https://vumbnail.com/${match[1]}.jpg`,
    };
  },

  getOembedUrl: (url: string) => {
    return `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`;
  },

  getEmbedUrl: (id: string) => {
    return `https://player.vimeo.com/video/${id}`;
  },
};

// ============================================================================
// Loom Handler
// ============================================================================

export const loomHandler: ProviderHandler = {
  name: "loom",

  canHandle: (url: string) => {
    return /loom\.com/.test(url) && parseProviderUrl(url)?.provider === "loom";
  },

  extractFromUrl: (url: string) => {
    const match = url.match(PROVIDER_PATTERNS.loom.video);
    if (!match) return null;

    return {
      provider: "loom",
      type: "video",
      id: match[1],
    };
  },

  getOembedUrl: (url: string) => {
    return `https://www.loom.com/v1/oembed?url=${encodeURIComponent(url)}`;
  },

  getEmbedUrl: (id: string) => {
    return `https://www.loom.com/embed/${id}`;
  },
};

// ============================================================================
// Figma Handler
// ============================================================================

export const figmaHandler: ProviderHandler = {
  name: "figma",

  canHandle: (url: string) => {
    return (
      /figma\.com/.test(url) && parseProviderUrl(url)?.provider === "figma"
    );
  },

  extractFromUrl: (url: string) => {
    for (const [type, pattern] of Object.entries(PROVIDER_PATTERNS.figma)) {
      const match = url.match(pattern);
      if (match) {
        return {
          provider: "figma",
          type,
          id: match[1],
        };
      }
    }
    return null;
  },

  getOembedUrl: (url: string) => {
    return `https://www.figma.com/api/oembed?url=${encodeURIComponent(url)}`;
  },

  getEmbedUrl: (id: string) => {
    return `https://www.figma.com/embed?embed_host=nchat&url=https://www.figma.com/file/${id}`;
  },
};

// ============================================================================
// LinkedIn Handler
// ============================================================================

export const linkedinHandler: ProviderHandler = {
  name: "linkedin",

  canHandle: (url: string) => {
    return /linkedin\.com|lnkd\.in/.test(url);
  },

  extractFromUrl: (url: string) => {
    // LinkedIn post
    const postMatch = url.match(
      /linkedin\.com\/(?:feed\/update|posts)\/([^/?]+)/i,
    );
    if (postMatch) {
      return {
        provider: "linkedin",
        type: "post",
        id: postMatch[1],
      };
    }

    // LinkedIn profile
    const profileMatch = url.match(/linkedin\.com\/in\/([^/?]+)/i);
    if (profileMatch) {
      return {
        provider: "linkedin",
        type: "profile",
        id: profileMatch[1],
      };
    }

    // Company page
    const companyMatch = url.match(/linkedin\.com\/company\/([^/?]+)/i);
    if (companyMatch) {
      return {
        provider: "linkedin",
        type: "company",
        id: companyMatch[1],
      };
    }

    return null;
  },

  parseHtml: (html: string) => {
    const data: Partial<ProviderData> = {};

    // Extract from Open Graph
    const titleMatch = html.match(
      /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
    );
    if (titleMatch) data.title = titleMatch[1];

    const descMatch = html.match(
      /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
    );
    if (descMatch) data.description = descMatch[1];

    const imageMatch = html.match(
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    );
    if (imageMatch) data.image = imageMatch[1];

    return data;
  },
};

// ============================================================================
// TikTok Handler
// ============================================================================

export const tiktokHandler: ProviderHandler = {
  name: "tiktok",

  canHandle: (url: string) => {
    return /tiktok\.com/.test(url);
  },

  extractFromUrl: (url: string) => {
    // TikTok video
    const videoMatch = url.match(/tiktok\.com\/@([^/]+)\/video\/(\d+)/i);
    if (videoMatch) {
      return {
        provider: "tiktok",
        type: "video",
        id: videoMatch[2],
        author: videoMatch[1],
        authorUrl: `https://www.tiktok.com/@${videoMatch[1]}`,
      };
    }

    // Short URL
    const shortMatch = url.match(/vm\.tiktok\.com\/([^/?]+)/i);
    if (shortMatch) {
      return {
        provider: "tiktok",
        type: "video",
        id: shortMatch[1],
      };
    }

    // User profile
    const userMatch = url.match(/tiktok\.com\/@([^/?]+)/i);
    if (userMatch) {
      return {
        provider: "tiktok",
        type: "profile",
        id: userMatch[1],
        author: userMatch[1],
      };
    }

    return null;
  },

  getOembedUrl: (url: string) => {
    return `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
  },
};

// ============================================================================
// Medium Handler
// ============================================================================

export const mediumHandler: ProviderHandler = {
  name: "medium",

  canHandle: (url: string) => {
    return /medium\.com/.test(url) || url.includes(".medium.com");
  },

  extractFromUrl: (url: string) => {
    // Medium article
    const articleMatch = url.match(/medium\.com\/(?:@)?([^/]+)\/([^/?]+)/i);
    if (articleMatch) {
      return {
        provider: "medium",
        type: "article",
        id: articleMatch[2],
        author: articleMatch[1],
      };
    }

    // Custom domain article
    const customMatch = url.match(/([^.]+)\.medium\.com\/([^/?]+)/i);
    if (customMatch) {
      return {
        provider: "medium",
        type: "article",
        id: customMatch[2],
        extra: { publication: customMatch[1] },
      };
    }

    return null;
  },

  parseHtml: (html: string) => {
    const data: Partial<ProviderData> = {};

    // Extract from meta tags
    const titleMatch = html.match(
      /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
    );
    if (titleMatch) data.title = titleMatch[1];

    const descMatch = html.match(
      /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
    );
    if (descMatch) data.description = descMatch[1];

    const imageMatch = html.match(
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    );
    if (imageMatch) data.image = imageMatch[1];

    // Extract author
    const authorMatch = html.match(
      /<meta[^>]+name=["']author["'][^>]+content=["']([^"']+)["']/i,
    );
    if (authorMatch) data.author = authorMatch[1];

    // Extract reading time
    const readingTimeMatch = html.match(/(\d+)\s*min\s*read/i);
    if (readingTimeMatch) {
      data.extra = {
        ...data.extra,
        readingTime: parseInt(readingTimeMatch[1], 10),
      };
    }

    return data;
  },
};

// ============================================================================
// Stack Overflow Handler
// ============================================================================

export const stackoverflowHandler: ProviderHandler = {
  name: "stackoverflow",

  canHandle: (url: string) => {
    return /stackoverflow\.com|stackexchange\.com/.test(url);
  },

  extractFromUrl: (url: string) => {
    // Question
    const questionMatch = url.match(/stackoverflow\.com\/questions\/(\d+)/i);
    if (questionMatch) {
      return {
        provider: "stackoverflow",
        type: "question",
        id: questionMatch[1],
      };
    }

    // Answer
    const answerMatch = url.match(/stackoverflow\.com\/a\/(\d+)/i);
    if (answerMatch) {
      return {
        provider: "stackoverflow",
        type: "answer",
        id: answerMatch[1],
      };
    }

    // User
    const userMatch = url.match(/stackoverflow\.com\/users\/(\d+)/i);
    if (userMatch) {
      return {
        provider: "stackoverflow",
        type: "user",
        id: userMatch[1],
      };
    }

    return null;
  },

  parseHtml: (html: string) => {
    const data: Partial<ProviderData> = {};

    // Extract from meta tags
    const titleMatch = html.match(
      /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
    );
    if (titleMatch) data.title = titleMatch[1];

    const descMatch = html.match(
      /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
    );
    if (descMatch) data.description = descMatch[1];

    // Extract vote count
    const voteMatch = html.match(/itemprop=["']upvoteCount["'][^>]*>(\d+)</i);
    if (voteMatch) {
      data.likeCount = parseInt(voteMatch[1], 10);
    }

    // Extract answer count
    const answerMatch = html.match(
      /itemprop=["']answerCount["'][^>]*content=["'](\d+)["']/i,
    );
    if (answerMatch) {
      data.commentCount = parseInt(answerMatch[1], 10);
    }

    return data;
  },
};

// ============================================================================
// Instagram Handler
// ============================================================================

export const instagramHandler: ProviderHandler = {
  name: "instagram",

  canHandle: (url: string) => {
    return /instagram\.com/.test(url);
  },

  extractFromUrl: (url: string) => {
    // Post
    const postMatch = url.match(/instagram\.com\/p\/([^/?]+)/i);
    if (postMatch) {
      return {
        provider: "instagram",
        type: "post",
        id: postMatch[1],
      };
    }

    // Reel
    const reelMatch = url.match(/instagram\.com\/reel\/([^/?]+)/i);
    if (reelMatch) {
      return {
        provider: "instagram",
        type: "reel",
        id: reelMatch[1],
      };
    }

    // Story
    const storyMatch = url.match(/instagram\.com\/stories\/([^/?]+)\/(\d+)/i);
    if (storyMatch) {
      return {
        provider: "instagram",
        type: "story",
        id: storyMatch[2],
        author: storyMatch[1],
      };
    }

    // Profile
    const profileMatch = url.match(/instagram\.com\/([^/?]+)\/?$/i);
    if (
      profileMatch &&
      !["p", "reel", "stories", "explore", "direct"].includes(profileMatch[1])
    ) {
      return {
        provider: "instagram",
        type: "profile",
        id: profileMatch[1],
        author: profileMatch[1],
      };
    }

    return null;
  },

  getOembedUrl: (url: string) => {
    return `https://graph.facebook.com/v12.0/instagram_oembed?url=${encodeURIComponent(url)}`;
  },
};

// ============================================================================
// Handler Registry
// ============================================================================

export const PROVIDER_HANDLERS: Record<
  UrlProvider,
  ProviderHandler | undefined
> = {
  twitter: undefined, // Use existing handler
  youtube: undefined, // Use existing handler
  github: undefined, // Use existing handler
  spotify: undefined, // Use existing handler
  reddit: redditHandler,
  twitch: twitchHandler,
  vimeo: vimeoHandler,
  loom: loomHandler,
  figma: figmaHandler,
  notion: undefined, // Limited API access
  slack: undefined, // Requires authentication
  discord: undefined, // Requires authentication
  linkedin: linkedinHandler,
  instagram: instagramHandler,
  tiktok: tiktokHandler,
  medium: mediumHandler,
  "dev.to": undefined, // Uses standard OG
  stackoverflow: stackoverflowHandler,
  codesandbox: undefined, // Use existing handler
  codepen: undefined, // Use existing handler
  jsfiddle: undefined, // Uses standard OG
  replit: undefined, // Uses standard OG
  generic: undefined,
};

/**
 * Get the handler for a provider
 */
export function getProviderHandler(
  provider: UrlProvider,
): ProviderHandler | undefined {
  return PROVIDER_HANDLERS[provider];
}

/**
 * Extract data from URL using the appropriate handler
 */
export function extractProviderData(url: string): ProviderData | null {
  for (const handler of Object.values(PROVIDER_HANDLERS)) {
    if (handler?.canHandle(url)) {
      return handler.extractFromUrl(url);
    }
  }
  return null;
}

/**
 * Get oEmbed URL for a URL
 */
export function getOembedUrlForProvider(url: string): string | null {
  for (const handler of Object.values(PROVIDER_HANDLERS)) {
    if (handler?.canHandle(url) && handler.getOembedUrl) {
      return handler.getOembedUrl(url);
    }
  }
  return null;
}

/**
 * Get embed URL for player display
 */
export function getEmbedUrlForProvider(
  provider: UrlProvider,
  id: string,
  options?: Record<string, string>,
): string | null {
  const handler = PROVIDER_HANDLERS[provider];
  if (handler?.getEmbedUrl) {
    return handler.getEmbedUrl(id, options);
  }
  return null;
}

/**
 * Parse HTML with the appropriate handler
 */
export function parseHtmlWithProvider(
  url: string,
  html: string,
  provider: UrlProvider,
): Partial<ProviderData> {
  const handler = PROVIDER_HANDLERS[provider];
  if (handler?.parseHtml) {
    return handler.parseHtml(html, url);
  }
  return {};
}
