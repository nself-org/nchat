"use client";

/**
 * LinkCard - Card layout for link previews
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { LinkImage } from "./LinkImage";
import { LinkTitle } from "./LinkTitle";
import { LinkDescription } from "./LinkDescription";
import { LinkDomain } from "./LinkDomain";
import type { LinkPreviewData } from "@/lib/link-preview";

export interface LinkCardProps {
  /** Preview data */
  data: LinkPreviewData;
  /** Card layout variant */
  variant?: "vertical" | "horizontal" | "compact";
  /** Show image */
  showImage?: boolean;
  /** Show description */
  showDescription?: boolean;
  /** Show favicon */
  showFavicon?: boolean;
  /** Maximum image height */
  maxImageHeight?: number;
  /** Click handler */
  onClick?: () => void;
  /** Additional class name */
  className?: string;
  /** Children (for action buttons, etc.) */
  children?: React.ReactNode;
}

export function LinkCard({
  data,
  variant = "vertical",
  showImage = true,
  showDescription = true,
  showFavicon = true,
  maxImageHeight = 200,
  onClick,
  className,
  children,
}: LinkCardProps) {
  const hasImage = showImage && data.image;

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      onClick();
    } else {
      window.open(data.url, "_blank", "noopener,noreferrer");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick(e as unknown as React.MouseEvent);
    }
  };

  // Vertical layout (image on top)
  if (variant === "vertical") {
    return (
      <div
        className={cn(
          "group relative rounded-lg border bg-card text-card-foreground shadow-sm",
          "hover:border-primary/50 transition-all duration-200 hover:shadow-md",
          "cursor-pointer overflow-hidden",
          className,
        )}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role="link"
        tabIndex={0}
        aria-label={data.title || data.url}
      >
        {hasImage && (
          <LinkImage
            src={data.image}
            alt={data.imageAlt || data.title}
            width={data.imageWidth}
            height={data.imageHeight}
            maxHeight={maxImageHeight}
            aspectRatio="16/9"
            className="rounded-b-none rounded-t-lg"
          />
        )}

        <div className="space-y-2 p-3">
          <LinkDomain
            domain={data.domain}
            favicon={data.favicon}
            siteName={data.siteName}
            isSecure={data.isSecure}
            showFavicon={showFavicon}
          />

          {data.title && (
            <LinkTitle title={data.title} maxLines={2} size="sm" />
          )}

          {showDescription && data.description && (
            <LinkDescription
              description={data.description}
              maxLines={2}
              size="sm"
            />
          )}
        </div>

        {children && (
          <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
            {children}
          </div>
        )}
      </div>
    );
  }

  // Horizontal layout (image on left)
  if (variant === "horizontal") {
    return (
      <div
        className={cn(
          "group relative flex rounded-lg border bg-card text-card-foreground shadow-sm",
          "hover:border-primary/50 transition-all duration-200 hover:shadow-md",
          "cursor-pointer overflow-hidden",
          className,
        )}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role="link"
        tabIndex={0}
        aria-label={data.title || data.url}
      >
        {hasImage && (
          <div className="w-32 flex-shrink-0 sm:w-40">
            <LinkImage
              src={data.image}
              alt={data.imageAlt || data.title}
              width={data.imageWidth}
              height={data.imageHeight}
              aspectRatio="1/1"
              layout="cover"
              className="h-full rounded-l-lg rounded-r-none"
            />
          </div>
        )}

        <div className="min-w-0 flex-1 space-y-1.5 p-3">
          <LinkDomain
            domain={data.domain}
            favicon={data.favicon}
            siteName={data.siteName}
            isSecure={data.isSecure}
            showFavicon={showFavicon}
          />

          {data.title && (
            <LinkTitle title={data.title} maxLines={2} size="sm" />
          )}

          {showDescription && data.description && (
            <LinkDescription
              description={data.description}
              maxLines={2}
              size="sm"
            />
          )}
        </div>

        {children && (
          <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
            {children}
          </div>
        )}
      </div>
    );
  }

  // Compact layout (minimal)
  return (
    <div
      className={cn(
        "group relative flex items-center gap-3 rounded-lg border bg-card p-2 text-card-foreground",
        "hover:border-primary/50 hover:bg-accent/50 transition-all duration-200",
        "cursor-pointer overflow-hidden",
        className,
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="link"
      tabIndex={0}
      aria-label={data.title || data.url}
    >
      {hasImage ? (
        <div className="h-12 w-12 flex-shrink-0">
          <LinkImage
            src={data.image}
            alt={data.imageAlt || data.title}
            aspectRatio="1/1"
            layout="cover"
            className="h-full w-full rounded"
          />
        </div>
      ) : showFavicon && data.favicon ? (
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center">
          <img
            src={data.favicon}
            alt=""
            className="h-6 w-6 rounded"
            loading="lazy"
          />
        </div>
      ) : null}

      <div className="min-w-0 flex-1">
        {data.title && <LinkTitle title={data.title} maxLines={1} size="sm" />}
        <div className="mt-0.5 flex items-center gap-2">
          <span className="truncate text-xs text-muted-foreground">
            {data.siteName || data.domain}
          </span>
        </div>
      </div>

      <svg
        className="h-4 w-4 flex-shrink-0 text-muted-foreground"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
        />
      </svg>

      {children && (
        <div className="absolute right-1 top-1 opacity-0 transition-opacity group-hover:opacity-100">
          {children}
        </div>
      )}
    </div>
  );
}

export default LinkCard;
