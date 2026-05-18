"use client";

/**
 * ImagePreview - Direct image link preview
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import type { ImagePreviewData } from "@/lib/link-preview";

export interface ImagePreviewProps {
  /** Image preview data */
  data: ImagePreviewData;
  /** Maximum image height */
  maxHeight?: number;
  /** Additional class name */
  className?: string;
  /** Children (for action buttons) */
  children?: React.ReactNode;
}

export function ImagePreview({
  data,
  maxHeight = 400,
  className,
  children,
}: ImagePreviewProps) {
  const handleClick = () => {
    window.open(data.url, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm",
        "transition-all duration-200 hover:shadow-md",
        className,
      )}
    >
      {/* Image */}
      <div
        className="cursor-pointer"
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
        <img
          src={data.image || data.url}
          alt={data.imageAlt || data.title || "Image preview"}
          className="w-full object-contain"
          style={{ maxHeight: `${maxHeight}px` }}
          loading="lazy"
        />
      </div>

      {/* Footer with info */}
      {(data.title || data.domain) && (
        <div className="bg-muted/30 border-t p-2">
          {data.title && (
            <p className="truncate text-xs font-medium">{data.title}</p>
          )}
          {data.domain && (
            <p className="truncate text-xs text-muted-foreground">
              {data.domain}
            </p>
          )}
        </div>
      )}

      {/* Children (remove button, etc.) */}
      {children && (
        <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
          {children}
        </div>
      )}
    </div>
  );
}

export default ImagePreview;
