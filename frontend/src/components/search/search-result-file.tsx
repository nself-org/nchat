"use client";

import * as React from "react";
import { formatDistanceToNow, format } from "date-fns";
import {
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileArchive,
  FileCode,
  FileSpreadsheet,
  File,
  Download,
  ExternalLink,
  Hash,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { FileSearchResult } from "@/stores/search-store";
import { HighlightedText } from "./search-result-message";

// ============================================================================
// Types
// ============================================================================

export interface SearchResultFileProps {
  /** The file search result data */
  result: FileSearchResult;
  /** The search query to highlight */
  query?: string;
  /** Whether this result is currently selected/focused */
  isSelected?: boolean;
  /** Callback when "Download" is clicked */
  onDownload?: (result: FileSearchResult) => void;
  /** Callback when "Jump to message" is clicked */
  onJumpToMessage?: (result: FileSearchResult) => void;
  /** Callback when the result is clicked */
  onClick?: (result: FileSearchResult) => void;
  /** Additional class names */
  className?: string;
}

// ============================================================================
// File Type Configuration
// ============================================================================

const fileTypeConfig: Record<
  string,
  { icon: React.ElementType; color: string }
> = {
  // Images
  "image/png": { icon: FileImage, color: "text-pink-500" },
  "image/jpeg": { icon: FileImage, color: "text-pink-500" },
  "image/gif": { icon: FileImage, color: "text-pink-500" },
  "image/webp": { icon: FileImage, color: "text-pink-500" },
  "image/svg+xml": { icon: FileImage, color: "text-pink-500" },

  // Videos
  "video/mp4": { icon: FileVideo, color: "text-purple-500" },
  "video/webm": { icon: FileVideo, color: "text-purple-500" },
  "video/quicktime": { icon: FileVideo, color: "text-purple-500" },

  // Audio
  "audio/mpeg": { icon: FileAudio, color: "text-green-500" },
  "audio/wav": { icon: FileAudio, color: "text-green-500" },
  "audio/ogg": { icon: FileAudio, color: "text-green-500" },

  // Documents
  "application/pdf": { icon: FileText, color: "text-red-500" },
  "application/msword": { icon: FileText, color: "text-blue-500" },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    icon: FileText,
    color: "text-blue-500",
  },

  // Spreadsheets
  "application/vnd.ms-excel": {
    icon: FileSpreadsheet,
    color: "text-green-600",
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
    icon: FileSpreadsheet,
    color: "text-green-600",
  },
  "text/csv": { icon: FileSpreadsheet, color: "text-green-600" },

  // Archives
  "application/zip": { icon: FileArchive, color: "text-yellow-600" },
  "application/x-rar-compressed": {
    icon: FileArchive,
    color: "text-yellow-600",
  },
  "application/gzip": { icon: FileArchive, color: "text-yellow-600" },
  "application/x-tar": { icon: FileArchive, color: "text-yellow-600" },

  // Code
  "text/javascript": { icon: FileCode, color: "text-yellow-500" },
  "application/javascript": { icon: FileCode, color: "text-yellow-500" },
  "text/typescript": { icon: FileCode, color: "text-blue-500" },
  "application/json": { icon: FileCode, color: "text-gray-500" },
  "text/html": { icon: FileCode, color: "text-orange-500" },
  "text/css": { icon: FileCode, color: "text-blue-400" },
  "text/plain": { icon: FileText, color: "text-gray-500" },
};

function getFileTypeConfig(mimeType: string): {
  icon: React.ElementType;
  color: string;
} {
  // Check for exact match
  if (fileTypeConfig[mimeType]) {
    return fileTypeConfig[mimeType];
  }

  // Check for category match
  if (mimeType.startsWith("image/")) {
    return { icon: FileImage, color: "text-pink-500" };
  }
  if (mimeType.startsWith("video/")) {
    return { icon: FileVideo, color: "text-purple-500" };
  }
  if (mimeType.startsWith("audio/")) {
    return { icon: FileAudio, color: "text-green-500" };
  }
  if (mimeType.startsWith("text/")) {
    return { icon: FileText, color: "text-gray-500" };
  }

  // Default
  return { icon: File, color: "text-muted-foreground" };
}

// ============================================================================
// Component
// ============================================================================

export function SearchResultFile({
  result,
  query = "",
  isSelected = false,
  onDownload,
  onJumpToMessage,
  onClick,
  className,
}: SearchResultFileProps) {
  const handleClick = () => {
    onClick?.(result);
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDownload?.(result);
  };

  const handleJump = (e: React.MouseEvent) => {
    e.stopPropagation();
    onJumpToMessage?.(result);
  };

  // Get file icon and color
  const { icon: FileIcon, color: iconColor } = getFileTypeConfig(
    result.fileType,
  );

  // Format timestamp
  const timestamp = new Date(result.uploadedAt);
  const isRecent = Date.now() - timestamp.getTime() < 24 * 60 * 60 * 1000;
  const timeDisplay = isRecent
    ? formatDistanceToNow(timestamp, { addSuffix: true })
    : format(timestamp, "MMM d, yyyy");

  // Format file size
  const fileSize = formatFileSize(result.fileSize);

  // Check if we can show a thumbnail
  const showThumbnail =
    result.thumbnailUrl && result.fileType.startsWith("image/");

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      className={cn(
        "group relative flex gap-3 rounded-lg border p-3 transition-colors",
        "hover:bg-accent/50 cursor-pointer",
        isSelected && "border-primary/50 bg-accent",
        className,
      )}
    >
      {/* Thumbnail or Icon */}
      <div
        className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-lg",
          showThumbnail ? "bg-transparent" : "bg-muted",
        )}
      >
        {showThumbnail ? (
          <img
            src={result.thumbnailUrl!}
            alt={result.fileName}
            className="h-12 w-12 rounded-lg object-cover"
          />
        ) : (
          <FileIcon className={cn("h-6 w-6", iconColor)} />
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {/* File name */}
        <div className="mb-1 truncate text-sm font-medium">
          <HighlightedText text={result.fileName} query={query} />
        </div>

        {/* Meta info */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {/* Channel */}
          <span className="flex items-center gap-0.5">
            <Hash className="h-3 w-3" />
            {result.channelName}
          </span>

          <span className="text-muted-foreground/30">|</span>

          {/* Uploader */}
          <span>Uploaded by {result.uploaderName}</span>

          <span className="text-muted-foreground/30">|</span>

          {/* Size */}
          <span>{fileSize}</span>

          <span className="text-muted-foreground/30">|</span>

          {/* Date */}
          <span>{timeDisplay}</span>
        </div>

        {/* Actions (visible on hover) */}
        <div
          className={cn(
            "mt-2 flex gap-2 opacity-0 transition-opacity",
            "group-hover:opacity-100",
            isSelected && "opacity-100",
          )}
        >
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDownload}
            className="h-7 gap-1 px-2 text-xs"
          >
            <Download className="h-3 w-3" />
            Download
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleJump}
            className="h-7 gap-1 px-2 text-xs"
          >
            <ExternalLink className="h-3 w-3" />
            Jump to message
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Compact Variant
// ============================================================================

export interface CompactFileResultProps {
  result: FileSearchResult;
  query?: string;
  isSelected?: boolean;
  onClick?: (result: FileSearchResult) => void;
  className?: string;
}

export function CompactFileResult({
  result,
  query = "",
  isSelected = false,
  onClick,
  className,
}: CompactFileResultProps) {
  const handleClick = () => {
    onClick?.(result);
  };

  const { icon: FileIcon, color: iconColor } = getFileTypeConfig(
    result.fileType,
  );
  const fileSize = formatFileSize(result.fileSize);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
        "hover:bg-accent/50 cursor-pointer",
        isSelected && "bg-accent",
        className,
      )}
    >
      <FileIcon className={cn("h-4 w-4 shrink-0", iconColor)} />
      <span className="min-w-0 flex-1 truncate">
        <HighlightedText text={result.fileName} query={query} />
      </span>
      <span className="shrink-0 text-xs text-muted-foreground">{fileSize}</span>
    </div>
  );
}

// ============================================================================
// File Grid Item
// ============================================================================

export interface FileGridItemProps {
  result: FileSearchResult;
  query?: string;
  isSelected?: boolean;
  onClick?: (result: FileSearchResult) => void;
  onDownload?: (result: FileSearchResult) => void;
  className?: string;
}

export function FileGridItem({
  result,
  query = "",
  isSelected = false,
  onClick,
  onDownload,
  className,
}: FileGridItemProps) {
  const handleClick = () => {
    onClick?.(result);
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDownload?.(result);
  };

  const { icon: FileIcon, color: iconColor } = getFileTypeConfig(
    result.fileType,
  );
  const showThumbnail =
    result.thumbnailUrl && result.fileType.startsWith("image/");
  const fileSize = formatFileSize(result.fileSize);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      className={cn(
        "group relative flex flex-col rounded-lg border transition-colors",
        "hover:bg-accent/50 cursor-pointer",
        isSelected && "border-primary/50 bg-accent",
        className,
      )}
    >
      {/* Preview */}
      <div className="relative aspect-square w-full overflow-hidden rounded-t-lg bg-muted">
        {showThumbnail ? (
          <img
            src={result.thumbnailUrl!}
            alt={result.fileName}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <FileIcon className={cn("h-12 w-12", iconColor)} />
          </div>
        )}

        {/* Download button overlay */}
        <button
          type="button"
          onClick={handleDownload}
          className={cn(
            "bg-background/80 absolute right-2 top-2 rounded-full p-1.5",
            "opacity-0 transition-opacity hover:bg-background",
            "group-hover:opacity-100",
            isSelected && "opacity-100",
          )}
          aria-label="Download file"
        >
          <Download className="h-4 w-4" />
        </button>
      </div>

      {/* Info */}
      <div className="p-2">
        <div className="truncate text-sm font-medium">
          <HighlightedText text={result.fileName} query={query} />
        </div>
        <div className="text-xs text-muted-foreground">{fileSize}</div>
      </div>
    </div>
  );
}

// ============================================================================
// File Result Skeleton
// ============================================================================

export function FileResultSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex animate-pulse gap-3 rounded-lg border p-3",
        className,
      )}
    >
      <div className="h-12 w-12 shrink-0 rounded-lg bg-muted" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-4 w-48 rounded bg-muted" />
        <div className="flex gap-2">
          <div className="h-3 w-20 rounded bg-muted" />
          <div className="h-3 w-32 rounded bg-muted" />
          <div className="h-3 w-16 rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);

  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export default SearchResultFile;
