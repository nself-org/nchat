"use client";

/**
 * CodePreview - Code snippet/gist preview (GitHub Gist, CodePen, CodeSandbox)
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import type { CodePreviewData } from "@/lib/link-preview";

export interface CodePreviewProps {
  /** Code preview data */
  data: CodePreviewData;
  /** Show embed iframe */
  showEmbed?: boolean;
  /** Additional class name */
  className?: string;
  /** Children (for action buttons) */
  children?: React.ReactNode;
}

export function CodePreview({
  data,
  showEmbed = false,
  className,
  children,
}: CodePreviewProps) {
  const handleClick = () => {
    window.open(data.url, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm",
        "hover:border-primary/50 transition-all duration-200 hover:shadow-md",
        className,
      )}
    >
      {/* Header */}
      <div className="bg-muted/50 flex items-center gap-3 border-b p-3">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-muted">
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
        </div>
        <span className="text-sm font-medium">{data.siteName || "Code"}</span>
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
              alt={data.title || "Code preview"}
              className="h-16 w-24 flex-shrink-0 rounded object-cover"
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

export default CodePreview;
