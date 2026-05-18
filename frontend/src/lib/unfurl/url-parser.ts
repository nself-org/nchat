/**
 * Enhanced URL Parser for Link Unfurling
 *
 * Provides robust URL detection and parsing with support for:
 * - International domain names (IDN/Punycode)
 * - URL shorteners
 * - Complex URL formats
 * - Position tracking in text
 *
 * @module lib/unfurl/url-parser
 */

// ============================================================================
// Types
// ============================================================================

export interface ParsedUrlInfo {
  /** Original URL string */
  url: string;
  /** Normalized URL (resolved shorteners, etc.) */
  normalizedUrl: string;
  /** Domain without www prefix */
  domain: string;
  /** Top-level domain */
  tld: string;
  /** Protocol (http/https) */
  protocol: "http" | "https";
  /** Path portion */
  path: string;
  /** Query string */
  query: string;
  /** Hash/fragment */
  hash: string;
  /** Whether this is a shortened URL */
  isShortened: boolean;
  /** Whether this is an internationalized domain */
  isInternational: boolean;
  /** Provider type if known */
  provider?: UrlProvider;
  /** Start position in original text */
  startIndex?: number;
  /** End position in original text */
  endIndex?: number;
}

export type UrlProvider =
  | "twitter"
  | "youtube"
  | "github"
  | "spotify"
  | "reddit"
  | "twitch"
  | "vimeo"
  | "loom"
  | "figma"
  | "notion"
  | "slack"
  | "discord"
  | "linkedin"
  | "instagram"
  | "tiktok"
  | "medium"
  | "dev.to"
  | "stackoverflow"
  | "codesandbox"
  | "codepen"
  | "jsfiddle"
  | "replit"
  | "generic";

export interface UrlExtractionResult {
  /** Extracted URLs with metadata */
  urls: ParsedUrlInfo[];
  /** Plain URLs (strings only) */
  plainUrls: string[];
  /** Count of URLs found */
  count: number;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * URL shortener services
 */
export const URL_SHORTENERS = new Set([
  "bit.ly",
  "goo.gl",
  "t.co",
  "tinyurl.com",
  "ow.ly",
  "is.gd",
  "buff.ly",
  "j.mp",
  "fb.me",
  "lnkd.in",
  "youtu.be",
  "amzn.to",
  "amzn.com",
  "rb.gy",
  "cutt.ly",
  "shorturl.at",
  "tiny.cc",
  "shorte.st",
  "v.gd",
  "po.st",
  "dlvr.it",
  "spr.ly",
  "rebrand.ly",
  "qr.ae",
  "adf.ly",
]);

/**
 * Provider domain mappings
 */
export const PROVIDER_DOMAINS: Record<string, UrlProvider> = {
  // Twitter/X
  "twitter.com": "twitter",
  "x.com": "twitter",
  "t.co": "twitter",
  "mobile.twitter.com": "twitter",

  // YouTube
  "youtube.com": "youtube",
  "www.youtube.com": "youtube",
  "m.youtube.com": "youtube",
  "youtu.be": "youtube",
  "youtube-nocookie.com": "youtube",

  // GitHub
  "github.com": "github",
  "gist.github.com": "github",
  "raw.githubusercontent.com": "github",
  "github.io": "github",

  // Spotify
  "spotify.com": "spotify",
  "open.spotify.com": "spotify",

  // Reddit
  "reddit.com": "reddit",
  "www.reddit.com": "reddit",
  "old.reddit.com": "reddit",
  "redd.it": "reddit",

  // Twitch
  "twitch.tv": "twitch",
  "www.twitch.tv": "twitch",
  "clips.twitch.tv": "twitch",

  // Vimeo
  "vimeo.com": "vimeo",
  "player.vimeo.com": "vimeo",

  // Loom
  "loom.com": "loom",
  "www.loom.com": "loom",

  // Figma
  "figma.com": "figma",
  "www.figma.com": "figma",

  // Notion
  "notion.so": "notion",
  "www.notion.so": "notion",
  "notion.site": "notion",

  // Slack
  "slack.com": "slack",

  // Discord
  "discord.com": "discord",
  "discord.gg": "discord",
  "discordapp.com": "discord",

  // LinkedIn
  "linkedin.com": "linkedin",
  "www.linkedin.com": "linkedin",
  "lnkd.in": "linkedin",

  // Instagram
  "instagram.com": "instagram",
  "www.instagram.com": "instagram",

  // TikTok
  "tiktok.com": "tiktok",
  "www.tiktok.com": "tiktok",
  "vm.tiktok.com": "tiktok",

  // Medium
  "medium.com": "medium",

  // Dev.to
  "dev.to": "dev.to",

  // Stack Overflow
  "stackoverflow.com": "stackoverflow",
  "stackexchange.com": "stackoverflow",

  // Code sharing
  "codesandbox.io": "codesandbox",
  "codepen.io": "codepen",
  "jsfiddle.net": "jsfiddle",
  "replit.com": "replit",
  "repl.it": "replit",
};

/**
 * Common TLDs for validation
 */
export const COMMON_TLDS = new Set([
  "com",
  "org",
  "net",
  "edu",
  "gov",
  "io",
  "co",
  "ai",
  "dev",
  "app",
  "me",
  "info",
  "biz",
  "tv",
  "fm",
  "ly",
  "to",
  "gg",
  "xyz",
  "sh",
  "cloud",
  "tech",
  "online",
  "site",
  "store",
  "blog",
  "page",
  "so",
  "run",
]);

// ============================================================================
// URL Detection Regex
// ============================================================================

/**
 * Enhanced URL regex with international domain support
 *
 * Matches:
 * - Standard HTTP/HTTPS URLs
 * - URLs with international characters
 * - URLs with complex query strings
 * - URLs with fragments
 */
export const URL_REGEX = new RegExp(
  // Protocol
  "(https?:\\/\\/)?" +
    // Optional authentication
    "(?:([\\w-]+:[\\w-]+)@)?" +
    // Domain (including IDN support)
    "(" +
    // IP address
    "(?:\\d{1,3}\\.){3}\\d{1,3}|" +
    // Domain with Unicode support
    "(?:[\\w\\u00a1-\\uffff][-\\w\\u00a1-\\uffff]*\\.)+" +
    // TLD
    "[a-z\\u00a1-\\uffff]{2,}" +
    ")" +
    // Port
    "(?::\\d{2,5})?" +
    // Path
    "(?:\\/[-\\w\\u00a1-\\uffff@:%+.~#?&/=]*)?" +
    // Fragment
    "(?:#[-\\w\\u00a1-\\uffff@:%+.~#?&/=]*)?",
  "gi",
);

/**
 * Stricter URL regex for extraction (requires protocol or www)
 */
export const STRICT_URL_REGEX =
  /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)/gi;

// ============================================================================
// URL Parsing Functions
// ============================================================================

/**
 * Parse a URL string into structured information
 */
export function parseUrl(url: string): ParsedUrlInfo | null {
  // Normalize URL
  let normalizedUrl = url.trim();

  // Add protocol if missing
  if (!normalizedUrl.match(/^https?:\/\//i)) {
    normalizedUrl = "https://" + normalizedUrl;
  }

  try {
    const parsed = new URL(normalizedUrl);

    // Validate protocol
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    // Extract domain parts
    const hostname = parsed.hostname.toLowerCase();
    const domainWithoutWww = hostname.replace(/^www\./, "");
    const tldMatch = domainWithoutWww.match(/\.([^.]+)$/);
    const tld = tldMatch ? tldMatch[1] : "";

    // Check if it's a shortener
    const isShortened = URL_SHORTENERS.has(domainWithoutWww);

    // Check for international characters
    const isInternational =
      /[^\x00-\x7F]/.test(url) || hostname.startsWith("xn--");

    // Detect provider
    const provider = detectProvider(hostname, parsed.pathname);

    return {
      url: url,
      normalizedUrl: parsed.href,
      domain: domainWithoutWww,
      tld,
      protocol: parsed.protocol.slice(0, -1) as "http" | "https",
      path: parsed.pathname,
      query: parsed.search,
      hash: parsed.hash,
      isShortened,
      isInternational,
      provider,
    };
  } catch {
    return null;
  }
}

/**
 * Detect the provider from hostname and path
 */
export function detectProvider(
  hostname: string,
  pathname: string,
): UrlProvider {
  // Check direct hostname mapping
  const normalizedHost = hostname.toLowerCase().replace(/^www\./, "");
  if (PROVIDER_DOMAINS[normalizedHost]) {
    return PROVIDER_DOMAINS[normalizedHost];
  }

  // Check for subdomain patterns
  for (const [domain, provider] of Object.entries(PROVIDER_DOMAINS)) {
    if (normalizedHost.endsWith("." + domain)) {
      return provider;
    }
  }

  return "generic";
}

/**
 * Extract all URLs from a text string
 */
export function extractUrls(text: string): UrlExtractionResult {
  if (!text || typeof text !== "string") {
    return { urls: [], plainUrls: [], count: 0 };
  }

  const urls: ParsedUrlInfo[] = [];
  const plainUrls: string[] = [];
  const seen = new Set<string>();

  // Use strict regex for extraction
  let match: RegExpExecArray | null;
  const regex = new RegExp(STRICT_URL_REGEX.source, "gi");

  while ((match = regex.exec(text)) !== null) {
    const urlStr = match[0];

    // Skip if we've already seen this URL
    if (seen.has(urlStr.toLowerCase())) continue;
    seen.add(urlStr.toLowerCase());

    const parsed = parseUrl(urlStr);
    if (parsed) {
      parsed.startIndex = match.index;
      parsed.endIndex = match.index + urlStr.length;
      urls.push(parsed);
      plainUrls.push(urlStr);
    }
  }

  return { urls, plainUrls, count: urls.length };
}

/**
 * Extract URLs with their positions for rich text rendering
 */
export function extractUrlsWithPositions(
  text: string,
): Array<{ url: string; start: number; end: number; parsed: ParsedUrlInfo }> {
  const result = extractUrls(text);
  return result.urls.map((parsed) => ({
    url: parsed.url,
    start: parsed.startIndex!,
    end: parsed.endIndex!,
    parsed,
  }));
}

/**
 * Check if a string is a valid URL
 */
export function isValidUrl(str: string): boolean {
  const parsed = parseUrl(str);
  return parsed !== null;
}

/**
 * Check if a URL uses a known shortener
 */
export function isShortUrl(url: string): boolean {
  const parsed = parseUrl(url);
  return parsed?.isShortened ?? false;
}

/**
 * Normalize a URL for comparison/caching
 */
export function normalizeUrl(url: string): string {
  const parsed = parseUrl(url);
  if (!parsed) return url;

  try {
    const urlObj = new URL(parsed.normalizedUrl);

    // Remove common tracking parameters
    const trackingParams = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "fbclid",
      "gclid",
      "ref",
      "source",
    ];
    for (const param of trackingParams) {
      urlObj.searchParams.delete(param);
    }

    // Normalize trailing slashes
    if (urlObj.pathname !== "/" && urlObj.pathname.endsWith("/")) {
      urlObj.pathname = urlObj.pathname.slice(0, -1);
    }

    // Remove default ports
    if (urlObj.port === "80" || urlObj.port === "443") {
      urlObj.port = "";
    }

    return urlObj.href;
  } catch {
    return url;
  }
}

/**
 * Get the domain from a URL for display
 */
export function getDisplayDomain(url: string): string {
  const parsed = parseUrl(url);
  return parsed?.domain ?? url;
}

/**
 * Check if URL should be unfurled based on domain and type
 */
export function shouldUnfurl(url: string): boolean {
  const parsed = parseUrl(url);
  if (!parsed) return false;

  // Always unfurl known providers
  if (parsed.provider !== "generic") return true;

  // Skip certain file types
  const skipExtensions = [".pdf", ".zip", ".exe", ".dmg", ".pkg", ".msi"];
  if (skipExtensions.some((ext) => parsed.path.toLowerCase().endsWith(ext))) {
    return false;
  }

  // Skip very long URLs (likely tracking/generated)
  if (parsed.normalizedUrl.length > 2000) return false;

  return true;
}

/**
 * Convert Punycode domain to Unicode for display
 */
export function punycodeToUnicode(domain: string): string {
  try {
    if (!domain.includes("xn--")) return domain;

    const parts = domain.split(".");
    const decoded = parts.map((part) => {
      if (part.startsWith("xn--")) {
        // This is a simplified Punycode decoder
        // In production, use the 'punycode' library
        try {
          return new URL(`https://${part}.com`).hostname.split(".")[0];
        } catch {
          return part;
        }
      }
      return part;
    });
    return decoded.join(".");
  } catch {
    return domain;
  }
}

/**
 * Convert Unicode domain to Punycode for processing
 */
export function unicodeToPunycode(domain: string): string {
  try {
    // Check if already ASCII
    if (!/[^\x00-\x7F]/.test(domain)) return domain;

    // Use URL API for encoding
    const url = new URL(`https://${domain}`);
    return url.hostname;
  } catch {
    return domain;
  }
}

// ============================================================================
// Provider-Specific URL Patterns
// ============================================================================

/**
 * URL patterns for specific providers
 */
export const PROVIDER_PATTERNS = {
  twitter: {
    tweet: /^https?:\/\/(?:www\.)?(twitter|x)\.com\/(\w+)\/status\/(\d+)/i,
    profile: /^https?:\/\/(?:www\.)?(twitter|x)\.com\/(\w+)\/?$/i,
  },
  youtube: {
    video:
      /^https?:\/\/(?:www\.)?youtube\.com\/watch\?(?:.*&)?v=([a-zA-Z0-9_-]{11})/i,
    shortVideo: /^https?:\/\/youtu\.be\/([a-zA-Z0-9_-]{11})/i,
    shorts: /^https?:\/\/(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/i,
    live: /^https?:\/\/(?:www\.)?youtube\.com\/live\/([a-zA-Z0-9_-]{11})/i,
    channel: /^https?:\/\/(?:www\.)?youtube\.com\/(?:c\/|channel\/|@)([^/]+)/i,
    playlist:
      /^https?:\/\/(?:www\.)?youtube\.com\/playlist\?(?:.*&)?list=([a-zA-Z0-9_-]+)/i,
  },
  github: {
    repo: /^https?:\/\/github\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)\/?$/i,
    issue:
      /^https?:\/\/github\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)\/issues\/(\d+)/i,
    pr: /^https?:\/\/github\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)\/pull\/(\d+)/i,
    gist: /^https?:\/\/gist\.github\.com\/([a-zA-Z0-9_-]+)\/([a-fA-F0-9]+)/i,
    file: /^https?:\/\/github\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)\/blob\/([^#]+)(?:#L(\d+)(?:-L(\d+))?)?$/i,
    commit:
      /^https?:\/\/github\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)\/commit\/([a-fA-F0-9]+)/i,
  },
  spotify: {
    track: /^https?:\/\/open\.spotify\.com\/track\/([a-zA-Z0-9]+)/i,
    album: /^https?:\/\/open\.spotify\.com\/album\/([a-zA-Z0-9]+)/i,
    playlist: /^https?:\/\/open\.spotify\.com\/playlist\/([a-zA-Z0-9]+)/i,
    artist: /^https?:\/\/open\.spotify\.com\/artist\/([a-zA-Z0-9]+)/i,
  },
  reddit: {
    post: /^https?:\/\/(?:www\.|old\.)?reddit\.com\/r\/([^/]+)\/comments\/([a-zA-Z0-9]+)/i,
    subreddit: /^https?:\/\/(?:www\.|old\.)?reddit\.com\/r\/([^/]+)\/?$/i,
    user: /^https?:\/\/(?:www\.|old\.)?reddit\.com\/(?:u|user)\/([^/]+)/i,
    shortPost: /^https?:\/\/redd\.it\/([a-zA-Z0-9]+)/i,
  },
  twitch: {
    channel: /^https?:\/\/(?:www\.)?twitch\.tv\/([a-zA-Z0-9_]+)\/?$/i,
    video: /^https?:\/\/(?:www\.)?twitch\.tv\/videos\/(\d+)/i,
    clip: /^https?:\/\/clips\.twitch\.tv\/([a-zA-Z0-9_-]+)/i,
  },
  vimeo: {
    video: /^https?:\/\/(?:www\.)?vimeo\.com\/(\d+)/i,
    channel: /^https?:\/\/(?:www\.)?vimeo\.com\/channels\/([a-zA-Z0-9_-]+)/i,
  },
  loom: {
    video: /^https?:\/\/(?:www\.)?loom\.com\/share\/([a-zA-Z0-9]+)/i,
  },
  figma: {
    file: /^https?:\/\/(?:www\.)?figma\.com\/file\/([a-zA-Z0-9]+)/i,
    prototype: /^https?:\/\/(?:www\.)?figma\.com\/proto\/([a-zA-Z0-9]+)/i,
    design: /^https?:\/\/(?:www\.)?figma\.com\/design\/([a-zA-Z0-9]+)/i,
  },
} as const;

/**
 * Parse provider-specific URL data
 */
export function parseProviderUrl(url: string): {
  provider: UrlProvider;
  type: string;
  id: string;
  extra?: Record<string, string | number>;
} | null {
  const parsed = parseUrl(url);
  if (!parsed) return null;

  const { provider } = parsed;

  switch (provider) {
    case "twitter": {
      const tweetMatch = url.match(PROVIDER_PATTERNS.twitter.tweet);
      if (tweetMatch) {
        return {
          provider: "twitter",
          type: "tweet",
          id: tweetMatch[3],
          extra: { username: tweetMatch[2] },
        };
      }
      const profileMatch = url.match(PROVIDER_PATTERNS.twitter.profile);
      if (profileMatch) {
        return { provider: "twitter", type: "profile", id: profileMatch[2] };
      }
      break;
    }

    case "youtube": {
      for (const [type, pattern] of Object.entries(PROVIDER_PATTERNS.youtube)) {
        const match = url.match(pattern);
        if (match) {
          return { provider: "youtube", type, id: match[1] };
        }
      }
      break;
    }

    case "github": {
      const issueMatch = url.match(PROVIDER_PATTERNS.github.issue);
      if (issueMatch) {
        return {
          provider: "github",
          type: "issue",
          id: issueMatch[3],
          extra: { owner: issueMatch[1], repo: issueMatch[2] },
        };
      }
      const prMatch = url.match(PROVIDER_PATTERNS.github.pr);
      if (prMatch) {
        return {
          provider: "github",
          type: "pr",
          id: prMatch[3],
          extra: { owner: prMatch[1], repo: prMatch[2] },
        };
      }
      const repoMatch = url.match(PROVIDER_PATTERNS.github.repo);
      if (repoMatch) {
        return {
          provider: "github",
          type: "repo",
          id: `${repoMatch[1]}/${repoMatch[2]}`,
          extra: { owner: repoMatch[1], repo: repoMatch[2] },
        };
      }
      const gistMatch = url.match(PROVIDER_PATTERNS.github.gist);
      if (gistMatch) {
        return {
          provider: "github",
          type: "gist",
          id: gistMatch[2],
          extra: { owner: gistMatch[1] },
        };
      }
      break;
    }

    case "reddit": {
      const postMatch = url.match(PROVIDER_PATTERNS.reddit.post);
      if (postMatch) {
        return {
          provider: "reddit",
          type: "post",
          id: postMatch[2],
          extra: { subreddit: postMatch[1] },
        };
      }
      const shortMatch = url.match(PROVIDER_PATTERNS.reddit.shortPost);
      if (shortMatch) {
        return { provider: "reddit", type: "post", id: shortMatch[1] };
      }
      const subredditMatch = url.match(PROVIDER_PATTERNS.reddit.subreddit);
      if (subredditMatch) {
        return { provider: "reddit", type: "subreddit", id: subredditMatch[1] };
      }
      break;
    }

    case "twitch": {
      const channelMatch = url.match(PROVIDER_PATTERNS.twitch.channel);
      if (channelMatch) {
        return { provider: "twitch", type: "channel", id: channelMatch[1] };
      }
      const videoMatch = url.match(PROVIDER_PATTERNS.twitch.video);
      if (videoMatch) {
        return { provider: "twitch", type: "video", id: videoMatch[1] };
      }
      const clipMatch = url.match(PROVIDER_PATTERNS.twitch.clip);
      if (clipMatch) {
        return { provider: "twitch", type: "clip", id: clipMatch[1] };
      }
      break;
    }

    case "spotify": {
      for (const [type, pattern] of Object.entries(PROVIDER_PATTERNS.spotify)) {
        const match = url.match(pattern);
        if (match) {
          return { provider: "spotify", type, id: match[1] };
        }
      }
      break;
    }

    case "vimeo": {
      const videoMatch = url.match(PROVIDER_PATTERNS.vimeo.video);
      if (videoMatch) {
        return { provider: "vimeo", type: "video", id: videoMatch[1] };
      }
      break;
    }

    case "loom": {
      const videoMatch = url.match(PROVIDER_PATTERNS.loom.video);
      if (videoMatch) {
        return { provider: "loom", type: "video", id: videoMatch[1] };
      }
      break;
    }

    case "figma": {
      for (const [type, pattern] of Object.entries(PROVIDER_PATTERNS.figma)) {
        const match = url.match(pattern);
        if (match) {
          return { provider: "figma", type, id: match[1] };
        }
      }
      break;
    }
  }

  return null;
}
