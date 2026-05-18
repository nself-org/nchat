"use client";

/**
 * Spotify Embed Component
 *
 * Displays Spotify content with:
 * - Track/album/playlist preview
 * - Inline player
 * - Album art
 * - Artist info
 *
 * @example
 * ```tsx
 * <SpotifyEmbed url="https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC" />
 * <SpotifyEmbed url="https://open.spotify.com/album/1ATL5GLyefJaxhQzSPVrLX" />
 * ```
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  parseSpotifyUrl,
  type ParsedSpotifyUrl,
} from "@/lib/embeds/embed-patterns";

// ============================================================================
// TYPES
// ============================================================================

export interface SpotifyTrackData {
  id: string;
  name: string;
  artists: Array<{ name: string; id: string }>;
  album: {
    name: string;
    images: Array<{ url: string; width: number; height: number }>;
  };
  durationMs: number;
  previewUrl?: string;
  explicit?: boolean;
}

export interface SpotifyAlbumData {
  id: string;
  name: string;
  artists: Array<{ name: string; id: string }>;
  images: Array<{ url: string; width: number; height: number }>;
  releaseDate?: string;
  totalTracks?: number;
}

export interface SpotifyPlaylistData {
  id: string;
  name: string;
  description?: string;
  images: Array<{ url: string; width: number; height: number }>;
  owner: {
    displayName: string;
    id: string;
  };
  totalTracks: number;
  followers?: number;
}

export interface SpotifyArtistData {
  id: string;
  name: string;
  images: Array<{ url: string; width: number; height: number }>;
  genres?: string[];
  followers?: number;
}

export interface SpotifyEpisodeData {
  id: string;
  name: string;
  description?: string;
  images: Array<{ url: string; width: number; height: number }>;
  show: {
    name: string;
    publisher: string;
  };
  durationMs: number;
  releaseDate?: string;
}

export interface SpotifyShowData {
  id: string;
  name: string;
  description?: string;
  images: Array<{ url: string; width: number; height: number }>;
  publisher: string;
  totalEpisodes: number;
}

export type SpotifyEmbedData =
  | { type: "track"; data: SpotifyTrackData }
  | { type: "album"; data: SpotifyAlbumData }
  | { type: "playlist"; data: SpotifyPlaylistData }
  | { type: "artist"; data: SpotifyArtistData }
  | { type: "episode"; data: SpotifyEpisodeData }
  | { type: "show"; data: SpotifyShowData };

export interface SpotifyEmbedProps {
  /**
   * The Spotify URL
   */
  url: string;

  /**
   * Parsed URL data
   */
  parsed?: ParsedSpotifyUrl;

  /**
   * Pre-fetched data (optional)
   */
  data?: SpotifyEmbedData;

  /**
   * Whether to show the inline player
   * @default true
   */
  showPlayer?: boolean;

  /**
   * Whether to show the close button
   * @default true
   */
  showCloseButton?: boolean;

  /**
   * Callback when close button is clicked
   */
  onClose?: () => void;

  /**
   * Additional CSS classes
   */
  className?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SpotifyEmbed({
  url,
  parsed: parsedProp,
  data,
  showPlayer = true,
  showCloseButton = true,
  onClose,
  className,
}: SpotifyEmbedProps) {
  const [useNativeEmbed, setUseNativeEmbed] = React.useState(true);

  // Parse URL if not provided
  const parsed = parsedProp || parseSpotifyUrl(url);

  if (!parsed) {
    return (
      <SpotifyEmbedFallback
        url={url}
        showCloseButton={showCloseButton}
        onClose={onClose}
        className={className}
      />
    );
  }

  const { contentType, id } = parsed;

  // Get embed URL for Spotify's iframe player
  const getEmbedUrl = () => {
    const baseUrl = "https://open.spotify.com/embed";
    const theme = document.documentElement.classList.contains("dark")
      ? "0"
      : "1";
    return `${baseUrl}/${contentType}/${id}?utm_source=generator&theme=${theme}`;
  };

  // Get appropriate height based on content type
  const getEmbedHeight = () => {
    switch (contentType) {
      case "track":
        return 152;
      case "episode":
        return 152;
      case "album":
        return 352;
      case "playlist":
        return 352;
      case "artist":
        return 352;
      case "show":
        return 352;
      default:
        return 352;
    }
  };

  // If we have native embed enabled, use Spotify's iframe
  if (useNativeEmbed && showPlayer) {
    return (
      <div className={cn("relative max-w-lg", className)}>
        {showCloseButton && onClose && (
          <button
            onClick={onClose}
            className={cn(
              "absolute -right-2 -top-2 z-10",
              "rounded-full border border-border bg-background p-1 shadow-md",
              "transition-colors hover:bg-muted",
            )}
            aria-label="Remove embed"
          >
            <CloseIcon className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
        <iframe
          src={getEmbedUrl()}
          width="100%"
          height={getEmbedHeight()}
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          className="rounded-xl"
          onError={() => setUseNativeEmbed(false)}
          title={`Spotify embed: ${contentType} - ${id}`}
        />
      </div>
    );
  }

  // Fallback to custom card
  if (data) {
    switch (data.type) {
      case "track":
        return (
          <SpotifyTrackCard
            url={url}
            data={data.data}
            showCloseButton={showCloseButton}
            onClose={onClose}
            className={className}
          />
        );
      case "album":
        return (
          <SpotifyAlbumCard
            url={url}
            data={data.data}
            showCloseButton={showCloseButton}
            onClose={onClose}
            className={className}
          />
        );
      case "playlist":
        return (
          <SpotifyPlaylistCard
            url={url}
            data={data.data}
            showCloseButton={showCloseButton}
            onClose={onClose}
            className={className}
          />
        );
      case "artist":
        return (
          <SpotifyArtistCard
            url={url}
            data={data.data}
            showCloseButton={showCloseButton}
            onClose={onClose}
            className={className}
          />
        );
      case "episode":
      case "show":
        return (
          <SpotifyPodcastCard
            url={url}
            data={data.data as SpotifyEpisodeData | SpotifyShowData}
            type={data.type}
            showCloseButton={showCloseButton}
            onClose={onClose}
            className={className}
          />
        );
    }
  }

  // Default fallback card
  return (
    <SpotifyFallbackCard
      url={url}
      contentType={contentType}
      showCloseButton={showCloseButton}
      onClose={onClose}
      className={className}
    />
  );
}

// ============================================================================
// TRACK CARD
// ============================================================================

interface SpotifyTrackCardProps {
  url: string;
  data: SpotifyTrackData;
  showCloseButton?: boolean;
  onClose?: () => void;
  className?: string;
}

function SpotifyTrackCard({
  url,
  data,
  showCloseButton,
  onClose,
  className,
}: SpotifyTrackCardProps) {
  const handleClick = () => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const albumArt = data.album.images[0]?.url;
  const artistNames = data.artists.map((a) => a.name).join(", ");

  return (
    <div
      className={cn(
        "group relative flex items-center gap-4 rounded-xl border border-border bg-card p-3",
        "cursor-pointer transition-colors hover:bg-[#1db954]/5",
        "max-w-md",
        className,
      )}
      onClick={handleClick}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {showCloseButton && onClose && <CloseButton onClose={onClose} />}

      {/* Album art */}
      {albumArt && (
        <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md">
          <img src={albumArt} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
            <PlayIcon className="h-8 w-8 text-white" />
          </div>
        </div>
      )}

      {/* Track info */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-foreground">
          {data.name}
          {data.explicit && (
            <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-sm bg-muted text-[10px] font-bold text-muted-foreground">
              E
            </span>
          )}
        </p>
        <p className="truncate text-sm text-muted-foreground">{artistNames}</p>
        <p className="truncate text-xs text-muted-foreground">
          {data.album.name}
        </p>
      </div>

      {/* Duration and logo */}
      <div className="flex flex-col items-end gap-2">
        <SpotifyIcon className="h-5 w-5 text-[#1db954]" />
        <span className="text-xs text-muted-foreground">
          {formatDuration(data.durationMs)}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// ALBUM CARD
// ============================================================================

interface SpotifyAlbumCardProps {
  url: string;
  data: SpotifyAlbumData;
  showCloseButton?: boolean;
  onClose?: () => void;
  className?: string;
}

function SpotifyAlbumCard({
  url,
  data,
  showCloseButton,
  onClose,
  className,
}: SpotifyAlbumCardProps) {
  const handleClick = () => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const albumArt = data.images[0]?.url;
  const artistNames = data.artists.map((a) => a.name).join(", ");

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border bg-card",
        "cursor-pointer transition-colors hover:bg-[#1db954]/5",
        "max-w-xs",
        className,
      )}
      onClick={handleClick}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {showCloseButton && onClose && <CloseButton onClose={onClose} />}

      {/* Album art */}
      {albumArt && (
        <div className="relative aspect-square">
          <img src={albumArt} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
            <div className="rounded-full bg-[#1db954] p-4 shadow-lg">
              <PlayIcon className="h-8 w-8 text-white" />
            </div>
          </div>
        </div>
      )}

      {/* Album info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-foreground">
              {data.name}
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {artistNames}
            </p>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <span>Album</span>
              {data.releaseDate && (
                <>
                  <span>-</span>
                  <span>{new Date(data.releaseDate).getFullYear()}</span>
                </>
              )}
              {data.totalTracks && (
                <>
                  <span>-</span>
                  <span>{data.totalTracks} songs</span>
                </>
              )}
            </div>
          </div>
          <SpotifyIcon className="h-5 w-5 flex-shrink-0 text-[#1db954]" />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PLAYLIST CARD
// ============================================================================

interface SpotifyPlaylistCardProps {
  url: string;
  data: SpotifyPlaylistData;
  showCloseButton?: boolean;
  onClose?: () => void;
  className?: string;
}

function SpotifyPlaylistCard({
  url,
  data,
  showCloseButton,
  onClose,
  className,
}: SpotifyPlaylistCardProps) {
  const handleClick = () => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const coverArt = data.images[0]?.url;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border bg-card",
        "cursor-pointer transition-colors hover:bg-[#1db954]/5",
        "max-w-xs",
        className,
      )}
      onClick={handleClick}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {showCloseButton && onClose && <CloseButton onClose={onClose} />}

      {/* Cover art */}
      {coverArt && (
        <div className="relative aspect-square">
          <img src={coverArt} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
            <div className="rounded-full bg-[#1db954] p-4 shadow-lg">
              <PlayIcon className="h-8 w-8 text-white" />
            </div>
          </div>
        </div>
      )}

      {/* Playlist info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-foreground">
              {data.name}
            </p>
            {data.description && (
              <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                {stripHtml(data.description)}
              </p>
            )}
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <span>By {data.owner.displayName}</span>
              <span>-</span>
              <span>{data.totalTracks} songs</span>
            </div>
          </div>
          <SpotifyIcon className="h-5 w-5 flex-shrink-0 text-[#1db954]" />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ARTIST CARD
// ============================================================================

interface SpotifyArtistCardProps {
  url: string;
  data: SpotifyArtistData;
  showCloseButton?: boolean;
  onClose?: () => void;
  className?: string;
}

function SpotifyArtistCard({
  url,
  data,
  showCloseButton,
  onClose,
  className,
}: SpotifyArtistCardProps) {
  const handleClick = () => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const artistImage = data.images[0]?.url;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border bg-card",
        "cursor-pointer transition-colors hover:bg-[#1db954]/5",
        "max-w-xs",
        className,
      )}
      onClick={handleClick}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {showCloseButton && onClose && <CloseButton onClose={onClose} />}

      {/* Artist image */}
      {artistImage && (
        <div className="relative aspect-square">
          <img
            src={artistImage}
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <p className="text-xl font-bold text-white">{data.name}</p>
            <p className="text-sm text-white/80">Artist</p>
          </div>
        </div>
      )}

      {/* Artist info */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {data.followers !== undefined && (
              <span>{formatNumber(data.followers)} followers</span>
            )}
            {data.genres && data.genres.length > 0 && (
              <span className="ml-2">{data.genres.slice(0, 2).join(", ")}</span>
            )}
          </div>
          <SpotifyIcon className="h-5 w-5 text-[#1db954]" />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PODCAST CARD
// ============================================================================

interface SpotifyPodcastCardProps {
  url: string;
  data: SpotifyEpisodeData | SpotifyShowData;
  type: "episode" | "show";
  showCloseButton?: boolean;
  onClose?: () => void;
  className?: string;
}

function SpotifyPodcastCard({
  url,
  data,
  type,
  showCloseButton,
  onClose,
  className,
}: SpotifyPodcastCardProps) {
  const handleClick = () => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const coverArt = data.images[0]?.url;
  const isEpisode = type === "episode";
  const episodeData = data as SpotifyEpisodeData;
  const showData = data as SpotifyShowData;

  return (
    <div
      className={cn(
        "group relative flex items-start gap-4 rounded-xl border border-border bg-card p-4",
        "cursor-pointer transition-colors hover:bg-[#1db954]/5",
        "max-w-md",
        className,
      )}
      onClick={handleClick}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {showCloseButton && onClose && <CloseButton onClose={onClose} />}

      {/* Cover art */}
      {coverArt && (
        <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg">
          <img src={coverArt} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
            <PlayIcon className="h-8 w-8 text-white" />
          </div>
        </div>
      )}

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              {isEpisode ? "Episode" : "Podcast"}
            </p>
            <p className="mt-0.5 line-clamp-2 font-semibold text-foreground">
              {data.name}
            </p>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {isEpisode ? episodeData.show?.name : showData.publisher}
            </p>
            {data.description && (
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {stripHtml(data.description)}
              </p>
            )}
          </div>
          <SpotifyIcon className="h-5 w-5 flex-shrink-0 text-[#1db954]" />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// FALLBACK CARDS
// ============================================================================

interface SpotifyFallbackCardProps {
  url: string;
  contentType: string;
  showCloseButton?: boolean;
  onClose?: () => void;
  className?: string;
}

function SpotifyFallbackCard({
  url,
  contentType,
  showCloseButton,
  onClose,
  className,
}: SpotifyFallbackCardProps) {
  const handleClick = () => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const getContentLabel = () => {
    switch (contentType) {
      case "track":
        return "Track";
      case "album":
        return "Album";
      case "playlist":
        return "Playlist";
      case "artist":
        return "Artist";
      case "episode":
        return "Episode";
      case "show":
        return "Podcast";
      default:
        return "Content";
    }
  };

  return (
    <div
      className={cn(
        "group relative flex items-center gap-4 rounded-xl border border-border bg-card p-4",
        "cursor-pointer transition-colors hover:bg-[#1db954]/5",
        "max-w-md",
        className,
      )}
      onClick={handleClick}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {showCloseButton && onClose && <CloseButton onClose={onClose} />}

      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1db954]">
        <SpotifyIcon className="h-7 w-7 text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground">Listen on Spotify</p>
        <p className="text-sm text-muted-foreground">{getContentLabel()}</p>
      </div>
      <ExternalLinkIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
    </div>
  );
}

interface SpotifyEmbedFallbackProps {
  url: string;
  showCloseButton?: boolean;
  onClose?: () => void;
  className?: string;
}

function SpotifyEmbedFallback({
  url,
  showCloseButton,
  onClose,
  className,
}: SpotifyEmbedFallbackProps) {
  const handleClick = () => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className={cn(
        "group relative flex items-center gap-4 rounded-xl border border-border bg-card p-4",
        "cursor-pointer transition-colors hover:bg-[#1db954]/5",
        "max-w-md",
        className,
      )}
      onClick={handleClick}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {showCloseButton && onClose && <CloseButton onClose={onClose} />}

      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1db954]">
        <SpotifyIcon className="h-7 w-7 text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground">Listen on Spotify</p>
        <p className="truncate text-sm text-muted-foreground">{url}</p>
      </div>
      <ExternalLinkIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
    </div>
  );
}

// ============================================================================
// COMPACT EMBED
// ============================================================================

export interface SpotifyEmbedCompactProps {
  url: string;
  parsed?: ParsedSpotifyUrl;
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  showCloseButton?: boolean;
  onClose?: () => void;
  className?: string;
}

export function SpotifyEmbedCompact({
  url,
  parsed: parsedProp,
  title,
  subtitle,
  imageUrl,
  showCloseButton,
  onClose,
  className,
}: SpotifyEmbedCompactProps) {
  const parsed = parsedProp || parseSpotifyUrl(url);

  const handleClick = () => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const getTypeLabel = () => {
    switch (parsed?.contentType) {
      case "track":
        return "Track";
      case "album":
        return "Album";
      case "playlist":
        return "Playlist";
      case "artist":
        return "Artist";
      case "episode":
        return "Episode";
      case "show":
        return "Podcast";
      default:
        return "Spotify";
    }
  };

  return (
    <div
      className={cn(
        "group relative flex items-center gap-3 rounded-lg border border-border bg-card p-2",
        "cursor-pointer transition-colors hover:bg-[#1db954]/5",
        "max-w-sm",
        className,
      )}
      onClick={handleClick}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {/* Image */}
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          className="h-10 w-10 rounded-md object-cover"
        />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#1db954]">
          <SpotifyIcon className="h-5 w-5 text-white" />
        </div>
      )}

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {title || getTypeLabel()}
        </p>
        {subtitle && (
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>

      {/* Close button */}
      {showCloseButton && onClose && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className={cn(
            "rounded-full p-1",
            "opacity-0 transition-opacity group-hover:opacity-100",
            "hover:bg-muted",
          )}
          aria-label="Remove embed"
        >
          <CloseIcon className="h-3 w-3 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}

// ============================================================================
// SHARED COMPONENTS
// ============================================================================

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
      className={cn(
        "absolute right-2 top-2 z-10",
        "bg-background/80 rounded-full p-1 backdrop-blur-sm",
        "opacity-0 transition-opacity group-hover:opacity-100",
        "hover:bg-background",
      )}
      aria-label="Remove embed"
    >
      <CloseIcon className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  }
  return num.toLocaleString();
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();
}

// ============================================================================
// ICONS
// ============================================================================

function SpotifyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
      />
    </svg>
  );
}

export default SpotifyEmbed;
