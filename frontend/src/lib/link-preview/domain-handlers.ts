/**
 * Domain Handlers - Specialized handlers for popular domains
 *
 * Extracts rich metadata from specific platforms like Twitter, YouTube, GitHub, etc.
 */

import type {
  LinkPreviewData,
  TwitterPostData,
  YouTubeVideoData,
  GitHubRepoData,
  GitHubIssueData,
  SpotifyData,
  CodePreviewData,
  PreviewType,
  URL_PATTERNS,
} from "./preview-types";
import { extractDomain } from "./preview-sanitizer";

// ============================================================================
// URL Pattern Matching
// ============================================================================

// Internal detection type that includes specific platforms
export type InternalUrlType =
  | "twitter"
  | "youtube"
  | "github"
  | "spotify"
  | "gist"
  | "codepen"
  | "codesandbox"
  | "generic";

/**
 * Detect the type of URL and return the appropriate handler
 */
export function detectUrlType(url: string): InternalUrlType {
  const patterns: Record<string, RegExp> = {
    twitter: /^https?:\/\/(?:www\.)?(twitter|x)\.com\/\w+\/status\/(\d+)/i,
    youtube:
      /^https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i,
    github: /^https?:\/\/(?:www\.)?github\.com\/([^/]+)(?:\/([^/]+))?/i,
    spotify:
      /^https?:\/\/(?:open\.)?spotify\.com\/(track|album|playlist|artist|episode|show)\/([a-zA-Z0-9]+)/i,
    gist: /^https?:\/\/gist\.github\.com\/([^/]+)\/([a-f0-9]+)/i,
    codepen: /^https?:\/\/codepen\.io\/([^/]+)\/(?:pen|full|details)\/([^/]+)/i,
    codesandbox: /^https?:\/\/codesandbox\.io\/(?:s|embed)\/([^/?]+)/i,
  };

  for (const [type, pattern] of Object.entries(patterns)) {
    if (pattern.test(url)) {
      return type as InternalUrlType;
    }
  }

  return "generic";
}

/**
 * Map internal URL type to public PreviewType
 */
export function mapToPreviewType(internalType: InternalUrlType): PreviewType {
  switch (internalType) {
    case "gist":
    case "codepen":
    case "codesandbox":
      return "code";
    default:
      return internalType as PreviewType;
  }
}

// ============================================================================
// Twitter/X Handler
// ============================================================================

/**
 * Extract Twitter post ID from URL
 */
export function extractTwitterId(url: string): string | null {
  const match = url.match(/(?:twitter|x)\.com\/(\w+)\/status\/(\d+)/i);
  return match ? match[2] : null;
}

/**
 * Extract Twitter username from URL
 */
export function extractTwitterUsername(url: string): string | null {
  const match = url.match(/(?:twitter|x)\.com\/(\w+)\/status/i);
  return match ? match[1] : null;
}

/**
 * Build Twitter embed data
 */
export function buildTwitterPreview(
  url: string,
  html?: string,
): Partial<TwitterPostData> {
  const tweetId = extractTwitterId(url);
  const username = extractTwitterUsername(url);

  if (!tweetId || !username) {
    return {};
  }

  const domain = extractDomain(url) || "twitter.com";

  return {
    type: "twitter",
    url,
    tweetId,
    authorUsername: username,
    authorDisplayName: username,
    domain,
    isSecure: url.startsWith("https"),
  };
}

/**
 * Get Twitter oEmbed URL
 */
export function getTwitterOembedUrl(tweetUrl: string): string {
  return `https://publish.twitter.com/oembed?url=${encodeURIComponent(tweetUrl)}&omit_script=true`;
}

// ============================================================================
// YouTube Handler
// ============================================================================

/**
 * Extract YouTube video ID from URL
 */
export function extractYouTubeId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/i,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/i,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/i,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/i,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * Build YouTube preview data
 */
export function buildYouTubePreview(url: string): Partial<YouTubeVideoData> {
  const videoId = extractYouTubeId(url);

  if (!videoId) {
    return {};
  }

  return {
    type: "youtube",
    url,
    videoId,
    image: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    domain: "youtube.com",
    isSecure: true,
    siteName: "YouTube",
  };
}

/**
 * Get YouTube oEmbed URL
 */
export function getYouTubeOembedUrl(videoId: string): string {
  return `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
}

/**
 * Build YouTube embed URL
 */
export function getYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`;
}

// ============================================================================
// GitHub Handler
// ============================================================================

/**
 * Parse GitHub URL into components
 */
export function parseGitHubUrl(url: string): {
  owner: string;
  repo?: string;
  type?: "issues" | "pull" | "discussions";
  number?: number;
} | null {
  const match = url.match(
    /github\.com\/([^/]+)(?:\/([^/]+)(?:\/(issues|pull|discussions)\/(\d+))?)?/i,
  );

  if (!match) {
    return null;
  }

  const [, owner, repo, type, number] = match;

  return {
    owner,
    repo: repo || undefined,
    type: type as "issues" | "pull" | "discussions" | undefined,
    number: number ? parseInt(number, 10) : undefined,
  };
}

/**
 * Build GitHub repository preview data
 */
export function buildGitHubRepoPreview(url: string): Partial<GitHubRepoData> {
  const parsed = parseGitHubUrl(url);

  if (!parsed || !parsed.repo || parsed.type) {
    return {};
  }

  return {
    type: "github",
    url,
    owner: parsed.owner,
    repo: parsed.repo,
    fullName: `${parsed.owner}/${parsed.repo}`,
    domain: "github.com",
    isSecure: true,
    siteName: "GitHub",
    image: `https://opengraph.githubassets.com/1/${parsed.owner}/${parsed.repo}`,
  };
}

/**
 * Build GitHub issue/PR preview data
 */
export function buildGitHubIssuePreview(url: string): Partial<GitHubIssueData> {
  const parsed = parseGitHubUrl(url);

  if (!parsed || !parsed.repo || !parsed.type || !parsed.number) {
    return {};
  }

  return {
    type: "github",
    url,
    owner: parsed.owner,
    repo: parsed.repo,
    number: parsed.number,
    isPullRequest: parsed.type === "pull",
    domain: "github.com",
    isSecure: true,
    siteName: "GitHub",
  };
}

/**
 * Get GitHub API URL for repository
 */
export function getGitHubRepoApiUrl(owner: string, repo: string): string {
  return `https://api.github.com/repos/${owner}/${repo}`;
}

/**
 * Get GitHub API URL for issue/PR
 */
export function getGitHubIssueApiUrl(
  owner: string,
  repo: string,
  number: number,
): string {
  return `https://api.github.com/repos/${owner}/${repo}/issues/${number}`;
}

// ============================================================================
// Spotify Handler
// ============================================================================

/**
 * Parse Spotify URL into components
 */
export function parseSpotifyUrl(url: string): {
  type: "track" | "album" | "playlist" | "artist" | "episode" | "show";
  id: string;
} | null {
  const match = url.match(
    /spotify\.com\/(track|album|playlist|artist|episode|show)\/([a-zA-Z0-9]+)/i,
  );

  if (!match) {
    return null;
  }

  return {
    type: match[1] as
      | "track"
      | "album"
      | "playlist"
      | "artist"
      | "episode"
      | "show",
    id: match[2],
  };
}

/**
 * Build Spotify preview data
 */
export function buildSpotifyPreview(url: string): Partial<SpotifyData> {
  const parsed = parseSpotifyUrl(url);

  if (!parsed) {
    return {};
  }

  return {
    type: "spotify",
    url,
    spotifyType: parsed.type,
    spotifyId: parsed.id,
    embedUrl: `https://open.spotify.com/embed/${parsed.type}/${parsed.id}`,
    domain: "spotify.com",
    isSecure: true,
    siteName: "Spotify",
  };
}

/**
 * Get Spotify oEmbed URL
 */
export function getSpotifyOembedUrl(url: string): string {
  return `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`;
}

// ============================================================================
// Code Preview Handlers
// ============================================================================

/**
 * Parse GitHub Gist URL
 */
export function parseGistUrl(url: string): { user: string; id: string } | null {
  const match = url.match(/gist\.github\.com\/([^/]+)\/([a-f0-9]+)/i);
  return match ? { user: match[1], id: match[2] } : null;
}

/**
 * Build Gist preview data
 */
export function buildGistPreview(url: string): Partial<CodePreviewData> {
  const parsed = parseGistUrl(url);

  if (!parsed) {
    return {};
  }

  return {
    type: "code",
    url,
    platform: "gist",
    embedUrl: `https://gist.github.com/${parsed.user}/${parsed.id}.js`,
    domain: "gist.github.com",
    isSecure: true,
    siteName: "GitHub Gist",
  };
}

/**
 * Parse CodePen URL
 */
export function parseCodePenUrl(
  url: string,
): { user: string; id: string } | null {
  const match = url.match(
    /codepen\.io\/([^/]+)\/(?:pen|full|details)\/([^/?]+)/i,
  );
  return match ? { user: match[1], id: match[2] } : null;
}

/**
 * Build CodePen preview data
 */
export function buildCodePenPreview(url: string): Partial<CodePreviewData> {
  const parsed = parseCodePenUrl(url);

  if (!parsed) {
    return {};
  }

  return {
    type: "code",
    url,
    platform: "codepen",
    embedUrl: `https://codepen.io/${parsed.user}/embed/${parsed.id}?default-tab=result`,
    domain: "codepen.io",
    isSecure: true,
    siteName: "CodePen",
  };
}

/**
 * Parse CodeSandbox URL
 */
export function parseCodeSandboxUrl(url: string): { id: string } | null {
  const match = url.match(/codesandbox\.io\/(?:s|embed)\/([^/?]+)/i);
  return match ? { id: match[1] } : null;
}

/**
 * Build CodeSandbox preview data
 */
export function buildCodeSandboxPreview(url: string): Partial<CodePreviewData> {
  const parsed = parseCodeSandboxUrl(url);

  if (!parsed) {
    return {};
  }

  return {
    type: "code",
    url,
    platform: "codesandbox",
    embedUrl: `https://codesandbox.io/embed/${parsed.id}`,
    domain: "codesandbox.io",
    isSecure: true,
    siteName: "CodeSandbox",
  };
}

// ============================================================================
// Media Detection
// ============================================================================

/**
 * Check if URL is a direct image link
 */
export function isDirectImageUrl(url: string): boolean {
  const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?.*)?$/i;
  return imageExtensions.test(url);
}

/**
 * Check if URL is a direct video link
 */
export function isDirectVideoUrl(url: string): boolean {
  const videoExtensions = /\.(mp4|webm|ogg|mov|avi|mkv)(\?.*)?$/i;
  return videoExtensions.test(url);
}

/**
 * Get image format from URL
 */
export function getImageFormat(url: string): string | null {
  const match = url.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?.*)?$/i);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Get video format from URL
 */
export function getVideoFormat(url: string): string | null {
  const match = url.match(/\.(mp4|webm|ogg|mov|avi|mkv)(\?.*)?$/i);
  return match ? match[1].toLowerCase() : null;
}

// ============================================================================
// Handler Registry
// ============================================================================

export type DomainHandlerFunction = (
  url: string,
  html?: string,
) => Partial<LinkPreviewData>;

/**
 * Get the appropriate handler for a URL
 */
export function getHandler(url: string): DomainHandlerFunction | null {
  const urlType = detectUrlType(url);

  switch (urlType) {
    case "twitter":
      return buildTwitterPreview;
    case "youtube":
      return buildYouTubePreview;
    case "github": {
      const parsed = parseGitHubUrl(url);
      if (parsed?.type && parsed?.number) {
        return buildGitHubIssuePreview;
      }
      if (parsed?.repo) {
        return buildGitHubRepoPreview;
      }
      return null;
    }
    case "spotify":
      return buildSpotifyPreview;
    case "gist":
      return buildGistPreview;
    case "codepen":
      return buildCodePenPreview;
    case "codesandbox":
      return buildCodeSandboxPreview;
    default:
      return null;
  }
}

/**
 * Apply domain-specific handler to URL
 */
export function applyDomainHandler(
  url: string,
  html?: string,
): Partial<LinkPreviewData> | null {
  const handler = getHandler(url);
  if (handler) {
    return handler(url, html);
  }
  return null;
}
