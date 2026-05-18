"use client";

/**
 * FileActivity Component
 *
 * Displays a file shared activity
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { ActivityAvatar } from "../ActivityAvatar";
import { ActivityDate } from "../ActivityDate";
import { formatFileSize } from "@/lib/activity/activity-formatter";
import type { FileSharedActivity } from "@/lib/activity/activity-types";

interface FileActivityProps {
  activity: FileSharedActivity;
  onClick?: () => void;
  className?: string;
}

// File type icon component
function FileTypeIcon({
  type,
  className,
}: {
  type: string;
  className?: string;
}) {
  // Determine icon based on MIME type or file extension
  const isImage =
    type.startsWith("image/") ||
    ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(type);
  const isVideo =
    type.startsWith("video/") || ["mp4", "mov", "avi", "webm"].includes(type);
  const isAudio =
    type.startsWith("audio/") || ["mp3", "wav", "ogg", "m4a"].includes(type);
  const isPdf = type === "application/pdf" || type === "pdf";
  const isDoc =
    type.includes("document") ||
    type.includes("word") ||
    ["doc", "docx"].includes(type);
  const isSheet =
    type.includes("spreadsheet") ||
    type.includes("excel") ||
    ["xls", "xlsx", "csv"].includes(type);

  if (isImage) {
    return (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    );
  }

  if (isVideo) {
    return (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="23 7 16 12 23 17 23 7" />
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
      </svg>
    );
  }

  if (isAudio) {
    return (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    );
  }

  if (isPdf) {
    return (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    );
  }

  // Default file icon
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

export function FileActivity({
  activity,
  onClick,
  className,
}: FileActivityProps) {
  const { actor, file, channel, message, isRead, createdAt } = activity;

  // Check if file has a thumbnail (for images)
  const hasThumbnail =
    file.thumbnailUrl || (file.mimeType?.startsWith("image/") && file.url);

  return (
    <div
      className={cn(
        "group relative flex cursor-pointer gap-3 rounded-lg p-3 transition-colors",
        "hover:bg-muted/50",
        !isRead && "bg-orange-50 dark:bg-orange-950/30",
        className,
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {/* Unread indicator */}
      {!isRead && (
        <div className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-orange-500" />
      )}

      {/* Avatar */}
      <ActivityAvatar actor={actor} size="md" />

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {/* Header */}
            <p className={cn("text-sm", !isRead && "font-medium")}>
              <span className="font-medium">{actor.displayName}</span>
              {" shared a file in "}
              <span className="font-medium">#{channel.name}</span>
            </p>

            {/* File preview */}
            <div className="mt-2 flex items-start gap-3 rounded-md border bg-background p-2">
              {/* Thumbnail or icon */}
              {hasThumbnail ? (
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded bg-muted">
                  <img
                    src={file.thumbnailUrl || file.url}
                    alt={file.name}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-muted">
                  <FileTypeIcon
                    type={file.type || file.mimeType}
                    className="h-6 w-6 text-muted-foreground"
                  />
                </div>
              )}

              {/* File info */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.size)}
                  {file.type && ` - ${file.type.toUpperCase()}`}
                </p>
              </div>
            </div>

            {/* Message context if available */}
            {message && (
              <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                {message.contentPreview || message.content}
              </p>
            )}
          </div>

          {/* Timestamp */}
          <ActivityDate date={createdAt} className="shrink-0" />
        </div>
      </div>
    </div>
  );
}

export default FileActivity;
