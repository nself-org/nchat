/**
 * URL Pattern Matching for Link Embeds
 *
 * This module provides regex patterns and utilities for identifying
 * different types of URLs that can be rendered as rich embeds.
 *
 * @example
 * ```typescript
 * import { detectEmbedType, parseUrl } from '@/lib/embeds/embed-patterns'
 *
 * const type = detectEmbedType('https://twitter.com/user/status/123')
 * // Returns: 'twitter'
 *
 * const parsed = parseUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
 * // Returns: { type: 'youtube', id: 'dQw4w9WgXcQ', ... }
 * ```
 */

// ============================================================================
// TYPES
// ============================================================================

export type EmbedType =
  | "twitter"
  | "youtube"
  | "github"
  | "spotify"
  | "image"
  | "video"
  | "generic";

export interface ParsedTwitterUrl {
  type: "twitter";
  username: string;
  tweetId?: string;
  isThread?: boolean;
}

export interface ParsedYouTubeUrl {
  type: "youtube";
  videoId: string;
  timestamp?: number;
  playlistId?: string;
  isShort?: boolean;
  isLive?: boolean;
}

export interface ParsedGitHubUrl {
  type: "github";
  owner: string;
  repo?: string;
  contentType: "repo" | "issue" | "pr" | "gist" | "user" | "file" | "commit";
  number?: number;
  gistId?: string;
  filePath?: string;
  lineStart?: number;
  lineEnd?: number;
  commitSha?: string;
}

export interface ParsedSpotifyUrl {
  type: "spotify";
  contentType: "track" | "album" | "playlist" | "artist" | "episode" | "show";
  id: string;
}

export interface ParsedImageUrl {
  type: "image";
  url: string;
  extension: string;
}

export interface ParsedVideoUrl {
  type: "video";
  url: string;
  extension: string;
}

export interface ParsedGenericUrl {
  type: "generic";
  url: string;
  domain: string;
}

export type ParsedUrl =
  | ParsedTwitterUrl
  | ParsedYouTubeUrl
  | ParsedGitHubUrl
  | ParsedSpotifyUrl
  | ParsedImageUrl
  | ParsedVideoUrl
  | ParsedGenericUrl;

// ============================================================================
// URL PATTERNS
// ============================================================================

/**
 * Twitter/X URL patterns
 */
export const TWITTER_PATTERNS = {
  // Tweet: twitter.com/user/status/123 or x.com/user/status/123
  tweet: /^https?:\/\/(?:www\.)?(twitter|x)\.com\/(\w+)\/status\/(\d+)/i,
  // User profile: twitter.com/user or x.com/user
  user: /^https?:\/\/(?:www\.)?(twitter|x)\.com\/(\w+)\/?$/i,
  // Twitter thread (quoted tweet)
  thread:
    /^https?:\/\/(?:www\.)?(twitter|x)\.com\/(\w+)\/status\/(\d+)\?.*t=(\d+)/i,
} as const;

/**
 * YouTube URL patterns
 */
export const YOUTUBE_PATTERNS = {
  // Standard watch URL: youtube.com/watch?v=VIDEO_ID
  watch:
    /^https?:\/\/(?:www\.)?youtube\.com\/watch\?(?:.*&)?v=([a-zA-Z0-9_-]{11})/i,
  // Short URL: youtu.be/VIDEO_ID
  short: /^https?:\/\/(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/i,
  // Embed URL: youtube.com/embed/VIDEO_ID
  embed: /^https?:\/\/(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/i,
  // Shorts: youtube.com/shorts/VIDEO_ID
  shorts: /^https?:\/\/(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/i,
  // Live: youtube.com/live/VIDEO_ID
  live: /^https?:\/\/(?:www\.)?youtube\.com\/live\/([a-zA-Z0-9_-]{11})/i,
  // Playlist: youtube.com/playlist?list=PLAYLIST_ID
  playlist:
    /^https?:\/\/(?:www\.)?youtube\.com\/playlist\?(?:.*&)?list=([a-zA-Z0-9_-]+)/i,
  // Channel: youtube.com/channel/CHANNEL_ID or youtube.com/@username
  channel:
    /^https?:\/\/(?:www\.)?youtube\.com\/(?:channel\/([a-zA-Z0-9_-]+)|@(\w+))/i,
} as const;

/**
 * GitHub URL patterns
 */
export const GITHUB_PATTERNS = {
  // Repository: github.com/owner/repo
  repo: /^https?:\/\/(?:www\.)?github\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)\/?$/i,
  // Issue: github.com/owner/repo/issues/123
  issue:
    /^https?:\/\/(?:www\.)?github\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)\/issues\/(\d+)/i,
  // Pull Request: github.com/owner/repo/pull/123
  pr: /^https?:\/\/(?:www\.)?github\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)\/pull\/(\d+)/i,
  // Gist: gist.github.com/user/gistid
  gist: /^https?:\/\/gist\.github\.com\/([a-zA-Z0-9_-]+)\/([a-fA-F0-9]+)/i,
  // User profile: github.com/user
  user: /^https?:\/\/(?:www\.)?github\.com\/([a-zA-Z0-9_-]+)\/?$/i,
  // File with optional line numbers: github.com/owner/repo/blob/branch/path#L1-L10
  file: /^https?:\/\/(?:www\.)?github\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)\/blob\/([^#]+?)(?:#L(\d+)(?:-L(\d+))?)?$/i,
  // Commit: github.com/owner/repo/commit/sha
  commit:
    /^https?:\/\/(?:www\.)?github\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)\/commit\/([a-fA-F0-9]+)/i,
} as const;

/**
 * Spotify URL patterns
 */
export const SPOTIFY_PATTERNS = {
  // Track: open.spotify.com/track/ID or spotify:track:ID
  track:
    /^(?:https?:\/\/open\.spotify\.com\/track\/([a-zA-Z0-9]+)|spotify:track:([a-zA-Z0-9]+))/i,
  // Album: open.spotify.com/album/ID
  album:
    /^(?:https?:\/\/open\.spotify\.com\/album\/([a-zA-Z0-9]+)|spotify:album:([a-zA-Z0-9]+))/i,
  // Playlist: open.spotify.com/playlist/ID
  playlist:
    /^(?:https?:\/\/open\.spotify\.com\/playlist\/([a-zA-Z0-9]+)|spotify:playlist:([a-zA-Z0-9]+))/i,
  // Artist: open.spotify.com/artist/ID
  artist:
    /^(?:https?:\/\/open\.spotify\.com\/artist\/([a-zA-Z0-9]+)|spotify:artist:([a-zA-Z0-9]+))/i,
  // Episode: open.spotify.com/episode/ID
  episode:
    /^(?:https?:\/\/open\.spotify\.com\/episode\/([a-zA-Z0-9]+)|spotify:episode:([a-zA-Z0-9]+))/i,
  // Show/Podcast: open.spotify.com/show/ID
  show: /^(?:https?:\/\/open\.spotify\.com\/show\/([a-zA-Z0-9]+)|spotify:show:([a-zA-Z0-9]+))/i,
} as const;

/**
 * Direct media URL patterns
 */
export const MEDIA_PATTERNS = {
  // Image extensions
  image:
    /^https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|avif)(?:\?[^\s]*)?$/i,
  // Video extensions
  video: /^https?:\/\/[^\s]+\.(mp4|webm|ogg|mov|avi|mkv|m4v)(?:\?[^\s]*)?$/i,
  // Audio extensions
  audio: /^https?:\/\/[^\s]+\.(mp3|wav|ogg|m4a|aac|flac)(?:\?[^\s]*)?$/i,
} as const;

/**
 * Generic URL pattern to match any valid URL
 */
export const GENERIC_URL_PATTERN =
  /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)/i;

// ============================================================================
// URL DETECTION & PARSING
// ============================================================================

/**
 * Detect the embed type from a URL
 */
export function detectEmbedType(url: string): EmbedType {
  // Check for direct media first
  if (MEDIA_PATTERNS.image.test(url)) return "image";
  if (MEDIA_PATTERNS.video.test(url)) return "video";

  // Check for specific platforms
  for (const pattern of Object.values(TWITTER_PATTERNS)) {
    if (pattern.test(url)) return "twitter";
  }

  for (const pattern of Object.values(YOUTUBE_PATTERNS)) {
    if (pattern.test(url)) return "youtube";
  }

  for (const pattern of Object.values(GITHUB_PATTERNS)) {
    if (pattern.test(url)) return "github";
  }

  for (const pattern of Object.values(SPOTIFY_PATTERNS)) {
    if (pattern.test(url)) return "spotify";
  }

  // Default to generic
  return "generic";
}

/**
 * Parse a Twitter/X URL
 */
export function parseTwitterUrl(url: string): ParsedTwitterUrl | null {
  // Check for tweet
  const tweetMatch = url.match(TWITTER_PATTERNS.tweet);
  if (tweetMatch) {
    return {
      type: "twitter",
      username: tweetMatch[2],
      tweetId: tweetMatch[3],
      isThread: TWITTER_PATTERNS.thread.test(url),
    };
  }

  // Check for user profile
  const userMatch = url.match(TWITTER_PATTERNS.user);
  if (userMatch) {
    return {
      type: "twitter",
      username: userMatch[2],
    };
  }

  return null;
}

/**
 * Parse a YouTube URL
 */
export function parseYouTubeUrl(url: string): ParsedYouTubeUrl | null {
  let videoId: string | null = null;
  let isShort = false;
  let isLive = false;

  // Check each pattern
  const watchMatch = url.match(YOUTUBE_PATTERNS.watch);
  if (watchMatch) {
    videoId = watchMatch[1];
  }

  const shortMatch = url.match(YOUTUBE_PATTERNS.short);
  if (shortMatch) {
    videoId = shortMatch[1];
  }

  const embedMatch = url.match(YOUTUBE_PATTERNS.embed);
  if (embedMatch) {
    videoId = embedMatch[1];
  }

  const shortsMatch = url.match(YOUTUBE_PATTERNS.shorts);
  if (shortsMatch) {
    videoId = shortsMatch[1];
    isShort = true;
  }

  const liveMatch = url.match(YOUTUBE_PATTERNS.live);
  if (liveMatch) {
    videoId = liveMatch[1];
    isLive = true;
  }

  if (!videoId) return null;

  // Extract timestamp if present (t=123 or t=1h2m3s)
  let timestamp: number | undefined;
  const timestampMatch = url.match(/[?&]t=(\d+)/);
  if (timestampMatch) {
    timestamp = parseInt(timestampMatch[1], 10);
  } else {
    // Try parsing h:m:s format
    const hmsMatch = url.match(/[?&]t=(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/);
    if (hmsMatch) {
      const hours = parseInt(hmsMatch[1] || "0", 10);
      const minutes = parseInt(hmsMatch[2] || "0", 10);
      const seconds = parseInt(hmsMatch[3] || "0", 10);
      timestamp = hours * 3600 + minutes * 60 + seconds;
    }
  }

  // Extract playlist ID if present
  const playlistMatch = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  const playlistId = playlistMatch ? playlistMatch[1] : undefined;

  return {
    type: "youtube",
    videoId,
    timestamp,
    playlistId,
    isShort,
    isLive,
  };
}

/**
 * Parse a GitHub URL
 */
export function parseGitHubUrl(url: string): ParsedGitHubUrl | null {
  // Check for gist first (different domain)
  const gistMatch = url.match(GITHUB_PATTERNS.gist);
  if (gistMatch) {
    return {
      type: "github",
      owner: gistMatch[1],
      contentType: "gist",
      gistId: gistMatch[2],
    };
  }

  // Check for issue
  const issueMatch = url.match(GITHUB_PATTERNS.issue);
  if (issueMatch) {
    return {
      type: "github",
      owner: issueMatch[1],
      repo: issueMatch[2],
      contentType: "issue",
      number: parseInt(issueMatch[3], 10),
    };
  }

  // Check for PR
  const prMatch = url.match(GITHUB_PATTERNS.pr);
  if (prMatch) {
    return {
      type: "github",
      owner: prMatch[1],
      repo: prMatch[2],
      contentType: "pr",
      number: parseInt(prMatch[3], 10),
    };
  }

  // Check for commit
  const commitMatch = url.match(GITHUB_PATTERNS.commit);
  if (commitMatch) {
    return {
      type: "github",
      owner: commitMatch[1],
      repo: commitMatch[2],
      contentType: "commit",
      commitSha: commitMatch[3],
    };
  }

  // Check for file
  const fileMatch = url.match(GITHUB_PATTERNS.file);
  if (fileMatch) {
    return {
      type: "github",
      owner: fileMatch[1],
      repo: fileMatch[2],
      contentType: "file",
      filePath: fileMatch[3],
      lineStart: fileMatch[4] ? parseInt(fileMatch[4], 10) : undefined,
      lineEnd: fileMatch[5] ? parseInt(fileMatch[5], 10) : undefined,
    };
  }

  // Check for repo
  const repoMatch = url.match(GITHUB_PATTERNS.repo);
  if (repoMatch) {
    return {
      type: "github",
      owner: repoMatch[1],
      repo: repoMatch[2],
      contentType: "repo",
    };
  }

  // Check for user profile
  const userMatch = url.match(GITHUB_PATTERNS.user);
  if (userMatch) {
    return {
      type: "github",
      owner: userMatch[1],
      contentType: "user",
    };
  }

  return null;
}

/**
 * Parse a Spotify URL
 */
export function parseSpotifyUrl(url: string): ParsedSpotifyUrl | null {
  // Check each content type
  const trackMatch = url.match(SPOTIFY_PATTERNS.track);
  if (trackMatch) {
    return {
      type: "spotify",
      contentType: "track",
      id: trackMatch[1] || trackMatch[2],
    };
  }

  const albumMatch = url.match(SPOTIFY_PATTERNS.album);
  if (albumMatch) {
    return {
      type: "spotify",
      contentType: "album",
      id: albumMatch[1] || albumMatch[2],
    };
  }

  const playlistMatch = url.match(SPOTIFY_PATTERNS.playlist);
  if (playlistMatch) {
    return {
      type: "spotify",
      contentType: "playlist",
      id: playlistMatch[1] || playlistMatch[2],
    };
  }

  const artistMatch = url.match(SPOTIFY_PATTERNS.artist);
  if (artistMatch) {
    return {
      type: "spotify",
      contentType: "artist",
      id: artistMatch[1] || artistMatch[2],
    };
  }

  const episodeMatch = url.match(SPOTIFY_PATTERNS.episode);
  if (episodeMatch) {
    return {
      type: "spotify",
      contentType: "episode",
      id: episodeMatch[1] || episodeMatch[2],
    };
  }

  const showMatch = url.match(SPOTIFY_PATTERNS.show);
  if (showMatch) {
    return {
      type: "spotify",
      contentType: "show",
      id: showMatch[1] || showMatch[2],
    };
  }

  return null;
}

/**
 * Parse a media URL (image/video)
 */
export function parseMediaUrl(
  url: string,
): ParsedImageUrl | ParsedVideoUrl | null {
  const imageMatch = url.match(MEDIA_PATTERNS.image);
  if (imageMatch) {
    const extension = imageMatch[1].toLowerCase();
    return {
      type: "image",
      url,
      extension,
    };
  }

  const videoMatch = url.match(MEDIA_PATTERNS.video);
  if (videoMatch) {
    const extension = videoMatch[1].toLowerCase();
    return {
      type: "video",
      url,
      extension,
    };
  }

  return null;
}

/**
 * Parse any URL and return structured data
 */
export function parseUrl(url: string): ParsedUrl {
  const type = detectEmbedType(url);

  switch (type) {
    case "twitter": {
      const parsed = parseTwitterUrl(url);
      if (parsed) return parsed;
      break;
    }
    case "youtube": {
      const parsed = parseYouTubeUrl(url);
      if (parsed) return parsed;
      break;
    }
    case "github": {
      const parsed = parseGitHubUrl(url);
      if (parsed) return parsed;
      break;
    }
    case "spotify": {
      const parsed = parseSpotifyUrl(url);
      if (parsed) return parsed;
      break;
    }
    case "image":
    case "video": {
      const parsed = parseMediaUrl(url);
      if (parsed) return parsed;
      break;
    }
  }

  // Default to generic URL
  let domain = "unknown";
  try {
    const urlObj = new URL(url);
    domain = urlObj.hostname.replace(/^www\./, "");
  } catch {
    // Invalid URL, keep default
  }

  return {
    type: "generic",
    url,
    domain,
  };
}

// ============================================================================
// URL EXTRACTION
// ============================================================================

/**
 * Extract all URLs from a text string
 */
export function extractUrls(text: string): string[] {
  const urlRegex =
    /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)/gi;
  return text.match(urlRegex) || [];
}

/**
 * Extract URLs with their positions in the text
 */
export function extractUrlsWithPositions(
  text: string,
): Array<{ url: string; start: number; end: number }> {
  const urlRegex =
    /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)/gi;
  const results: Array<{ url: string; start: number; end: number }> = [];
  let match: RegExpExecArray | null;

  while ((match = urlRegex.exec(text)) !== null) {
    results.push({
      url: match[0],
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  return results;
}

/**
 * Check if a string is a valid URL
 */
export function isValidUrl(str: string): boolean {
  try {
    new URL(str);
    return GENERIC_URL_PATTERN.test(str);
  } catch {
    return false;
  }
}

/**
 * Get the domain from a URL
 */
export function getDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/**
 * Check if a URL should be embeddable (not blocked/restricted)
 */
export function isEmbeddable(url: string): boolean {
  // List of domains that should not be embedded
  const blockedDomains = [
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    // Add any other domains to block
  ];

  const domain = getDomain(url);
  return !blockedDomains.some((blocked) => domain.includes(blocked));
}
