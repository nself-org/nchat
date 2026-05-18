"use client";

/**
 * SpotifyPreview - Spotify track/album/playlist embed preview
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import type { SpotifyData } from "@/lib/link-preview";

export interface SpotifyPreviewProps {
  /** Spotify preview data */
  data: SpotifyData;
  /** Show embed iframe */
  showEmbed?: boolean;
  /** Additional class name */
  className?: string;
  /** Children (for action buttons) */
  children?: React.ReactNode;
}

export function SpotifyPreview({
  data,
  showEmbed = false,
  className,
  children,
}: SpotifyPreviewProps) {
  const handleClick = () => {
    window.open(data.url, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm",
        "transition-all duration-200 hover:border-[#1DB954]/50 hover:shadow-md",
        className,
      )}
    >
      {/* Header with Spotify branding */}
      <div className="flex items-center gap-3 border-b bg-[#1DB954]/10 p-3">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#1DB954]">
          <svg
            className="h-4 w-4 text-white"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
          </svg>
        </div>
        <span className="text-sm font-medium text-[#1DB954]">Spotify</span>
      </div>

      {/* Content */}
      <div
        className="cursor-pointer p-3"
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
        <div className="flex gap-3">
          {data.image && (
            <img
              src={data.image}
              alt={data.title || "Spotify content"}
              className="h-16 w-16 flex-shrink-0 rounded object-cover"
              loading="lazy"
            />
          )}
          <div className="min-w-0 flex-1">
            {data.title && (
              <p className="truncate text-sm font-semibold">{data.title}</p>
            )}
            {data.description && (
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {data.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Children (remove button, etc.) */}
      {children && (
        <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
          {children}
        </div>
      )}
    </div>
  );
}

export default SpotifyPreview;
