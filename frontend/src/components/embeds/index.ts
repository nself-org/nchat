/**
 * Embeds Component Exports
 *
 * This module exports all embed-related components for link unfurling
 * and rich URL previews in the nself-chat application.
 *
 * @example
 * ```tsx
 * import { EmbedContainer, LinkPreview, YouTubeEmbed } from '@/components/embeds'
 *
 * // Auto-detect and render appropriate embed
 * <EmbedContainer url="https://youtube.com/watch?v=abc" />
 *
 * // Use specific embed component
 * <YouTubeEmbed url="https://youtube.com/watch?v=abc" />
 * ```
 */

// Main container component
export { EmbedContainer, MultiEmbedContainer } from "./embed-container";
export type {
  EmbedContainerProps,
  MultiEmbedContainerProps,
} from "./embed-container";

// Generic link preview
export { LinkPreview, LinkPreviewSkeleton } from "./link-preview";
export type {
  LinkPreviewProps,
  LinkPreviewSkeletonProps,
} from "./link-preview";

// Twitter/X embed
export { TwitterEmbed } from "./twitter-embed";
export type { TwitterEmbedProps, TwitterEmbedData } from "./twitter-embed";

// YouTube embed
export {
  YouTubeEmbed,
  YouTubeEmbedSkeleton,
  YouTubeEmbedCompact,
} from "./youtube-embed";
export type {
  YouTubeEmbedProps,
  YouTubeEmbedData,
  YouTubeEmbedSkeletonProps,
  YouTubeEmbedCompactProps,
} from "./youtube-embed";

// GitHub embed
export { GitHubEmbed } from "./github-embed";
export type {
  GitHubEmbedProps,
  GitHubEmbedData,
  GitHubRepoData,
  GitHubIssueData,
  GitHubUserData,
  GitHubGistData,
  GitHubCommitData,
  GitHubFileData,
} from "./github-embed";

// Spotify embed
export { SpotifyEmbed, SpotifyEmbedCompact } from "./spotify-embed";
export type {
  SpotifyEmbedProps,
  SpotifyEmbedData,
  SpotifyTrackData,
  SpotifyAlbumData,
  SpotifyPlaylistData,
  SpotifyArtistData,
  SpotifyEpisodeData,
  SpotifyShowData,
  SpotifyEmbedCompactProps,
} from "./spotify-embed";

// Image embed
export {
  ImageEmbed,
  ImageEmbedSkeleton,
  ImageEmbedCompact,
} from "./image-embed";
export type {
  ImageEmbedProps,
  ImageEmbedSkeletonProps,
  ImageEmbedCompactProps,
} from "./image-embed";

// Video embed
export {
  VideoEmbed,
  VideoEmbedSkeleton,
  VideoEmbedCompact,
} from "./video-embed";
export type {
  VideoEmbedProps,
  VideoEmbedSkeletonProps,
  VideoEmbedCompactProps,
} from "./video-embed";
