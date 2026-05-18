/**
 * File Card - Document/file display component
 *
 * Features:
 * - File type icon
 * - File name display
 * - File size
 * - Download button
 * - Preview support for certain types
 * - Multiple variants
 */

"use client";

import * as React from "react";
import { useMemo, useCallback } from "react";
import {
  File,
  FileText,
  FileSpreadsheet,
  FileImage,
  FileVideo,
  FileAudio,
  FileCode,
  FolderArchive,
  Download,
  ExternalLink,
  Eye,
  AlertCircle,
  MoreHorizontal,
  Trash2,
  Copy,
  Share,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileType } from "@/stores/attachment-store";
import {
  formatFileSize,
  truncateFileName,
  getFileTypeColor,
  getFileExtension,
} from "@/lib/upload/file-utils";

// ============================================================================
// Types
// ============================================================================

export interface FileCardProps {
  /** Unique identifier */
  id: string;
  /** File name */
  fileName: string;
  /** File size in bytes */
  fileSize: number;
  /** File type category */
  fileType: FileType;
  /** MIME type */
  mimeType?: string;
  /** File URL */
  url?: string;
  /** Thumbnail URL */
  thumbnailUrl?: string;
  /** Whether the file is downloadable */
  downloadable?: boolean;
  /** Whether the file is previewable */
  previewable?: boolean;
  /** Custom class name */
  className?: string;
  /** Variant style */
  variant?: "default" | "compact" | "minimal" | "grid";
  /** Callback when clicked */
  onClick?: (id: string) => void;
  /** Callback for download */
  onDownload?: (id: string) => void;
  /** Callback for preview */
  onPreview?: (id: string) => void;
  /** Callback for delete */
  onDelete?: (id: string) => void;
  /** Callback for copy link */
  onCopyLink?: (id: string) => void;
  /** Callback for share */
  onShare?: (id: string) => void;
  /** Show error state */
  error?: string | null;
  /** Loading state */
  isLoading?: boolean;
}

// ============================================================================
// File Icon Component
// ============================================================================

interface FileIconProps {
  fileType: FileType;
  mimeType?: string;
  extension?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function FileIcon({
  fileType,
  mimeType,
  extension,
  size = "md",
  className,
}: FileIconProps) {
  const sizeClass = useMemo(() => {
    switch (size) {
      case "sm":
        return "h-5 w-5";
      case "lg":
        return "h-10 w-10";
      default:
        return "h-6 w-6";
    }
  }, [size]);

  const colorClass = getFileTypeColor(fileType);

  // Get specific icon based on MIME type or extension
  const Icon = useMemo(() => {
    // Check MIME type first
    if (mimeType) {
      if (mimeType.includes("pdf")) return FileText;
      if (mimeType.includes("word") || mimeType.includes("document"))
        return FileText;
      if (mimeType.includes("excel") || mimeType.includes("spreadsheet"))
        return FileSpreadsheet;
      if (mimeType.includes("powerpoint") || mimeType.includes("presentation"))
        return FileText;
      if (
        mimeType.includes("text/") ||
        mimeType.includes("json") ||
        mimeType.includes("xml")
      ) {
        return FileCode;
      }
    }

    // Check extension
    const ext = extension?.toLowerCase();
    if (ext) {
      if (
        [
          "js",
          "ts",
          "jsx",
          "tsx",
          "py",
          "rb",
          "go",
          "rs",
          "java",
          "c",
          "cpp",
          "h",
          "css",
          "html",
          "xml",
          "json",
          "yaml",
          "yml",
        ].includes(ext)
      ) {
        return FileCode;
      }
      if (["xls", "xlsx", "csv", "ods"].includes(ext)) return FileSpreadsheet;
    }

    // Fall back to file type
    switch (fileType) {
      case "image":
        return FileImage;
      case "video":
        return FileVideo;
      case "audio":
        return FileAudio;
      case "document":
        return FileText;
      case "archive":
        return FolderArchive;
      default:
        return File;
    }
  }, [fileType, mimeType, extension]);

  return <Icon className={cn(sizeClass, colorClass, className)} />;
}

// ============================================================================
// Extension Badge
// ============================================================================

interface ExtensionBadgeProps {
  extension: string;
  className?: string;
}

function ExtensionBadge({ extension, className }: ExtensionBadgeProps) {
  if (!extension) return null;

  return (
    <span
      className={cn(
        "rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground",
        className,
      )}
    >
      {extension}
    </span>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function FileCard({
  id,
  fileName,
  fileSize,
  fileType,
  mimeType,
  url,
  thumbnailUrl,
  downloadable = true,
  previewable = false,
  className,
  variant = "default",
  onClick,
  onDownload,
  onPreview,
  onDelete,
  onCopyLink,
  onShare,
  error,
  isLoading,
}: FileCardProps) {
  const extension = useMemo(() => getFileExtension(fileName), [fileName]);

  // Handle download
  const handleDownload = useCallback(() => {
    if (onDownload) {
      onDownload(id);
    } else if (url) {
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }, [id, url, fileName, onDownload]);

  // Handle preview
  const handlePreview = useCallback(() => {
    if (onPreview) {
      onPreview(id);
    } else if (url) {
      window.open(url, "_blank");
    }
  }, [id, url, onPreview]);

  // Handle copy link
  const handleCopyLink = useCallback(async () => {
    if (onCopyLink) {
      onCopyLink(id);
    } else if (url) {
      await navigator.clipboard.writeText(url);
    }
  }, [id, url, onCopyLink]);

  // Minimal variant
  if (variant === "minimal") {
    return (
      <div
        className={cn(
          "flex items-center gap-2 text-sm",
          onClick && "cursor-pointer hover:underline",
          className,
        )}
        {...(onClick
          ? {
              onClick: () => onClick(id),
              onKeyDown: (e: React.KeyboardEvent) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onClick(id);
                }
              },
              role: "button" as const,
              tabIndex: 0,
            }
          : {})}
      >
        <FileIcon
          fileType={fileType}
          mimeType={mimeType}
          extension={extension}
          size="sm"
        />
        <span className="truncate">{fileName}</span>
        <span className="text-xs text-muted-foreground">
          ({formatFileSize(fileSize)})
        </span>
      </div>
    );
  }

  // Compact variant
  if (variant === "compact") {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg border p-2 transition-colors",
          onClick && "hover:bg-muted/50 cursor-pointer",
          error && "border-destructive/50 bg-destructive/5",
          className,
        )}
        {...(onClick
          ? {
              onClick: () => onClick(id),
              onKeyDown: (e: React.KeyboardEvent) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onClick(id);
                }
              },
              role: "button" as const,
              tabIndex: 0,
            }
          : {})}
      >
        {/* Icon */}
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-muted">
          <FileIcon
            fileType={fileType}
            mimeType={mimeType}
            extension={extension}
          />
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium" title={fileName}>
            {truncateFileName(fileName, 30)}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatFileSize(fileSize)}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {downloadable && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                handleDownload();
              }}
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Grid variant (for file grids)
  if (variant === "grid") {
    return (
      <div
        className={cn(
          "group relative flex flex-col items-center rounded-lg border p-4 transition-colors",
          onClick && "hover:bg-muted/50 cursor-pointer",
          error && "border-destructive/50 bg-destructive/5",
          className,
        )}
        {...(onClick
          ? {
              onClick: () => onClick(id),
              onKeyDown: (e: React.KeyboardEvent) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onClick(id);
                }
              },
              role: "button" as const,
              tabIndex: 0,
            }
          : {})}
      >
        {/* Thumbnail or Icon */}
        <div className="mb-3 flex h-16 w-16 items-center justify-center">
          {thumbnailUrl && fileType === "image" ? (
            <img
              src={thumbnailUrl}
              alt={fileName}
              className="h-full w-full rounded object-cover"
            />
          ) : (
            <FileIcon
              fileType={fileType}
              mimeType={mimeType}
              extension={extension}
              size="lg"
            />
          )}
        </div>

        {/* File Name */}
        <p
          className="mb-1 w-full truncate text-center text-sm font-medium"
          title={fileName}
        >
          {truncateFileName(fileName, 20)}
        </p>

        {/* Size & Extension */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatFileSize(fileSize)}</span>
          {extension && <ExtensionBadge extension={extension} />}
        </div>

        {/* Actions (on hover) */}
        <div className="absolute right-1 top-1 flex opacity-0 transition-opacity group-hover:opacity-100">
          {downloadable && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                handleDownload();
              }}
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {/* Error Badge */}
        {error && (
          <div className="bg-destructive/10 absolute bottom-1 left-1 right-1 flex items-center justify-center gap-1 rounded px-1 py-0.5 text-[10px] text-destructive">
            <AlertCircle className="h-3 w-3" />
            <span className="truncate">{error}</span>
          </div>
        )}
      </div>
    );
  }

  // Default variant
  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-lg border p-3 transition-colors",
        onClick && "hover:bg-muted/50 cursor-pointer",
        error && "border-destructive/50 bg-destructive/5",
        isLoading && "animate-pulse",
        className,
      )}
    >
      {/* Icon/Thumbnail */}
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
        {thumbnailUrl && fileType === "image" ? (
          <img
            src={thumbnailUrl}
            alt={fileName}
            className="h-full w-full object-cover"
          />
        ) : (
          <FileIcon
            fileType={fileType}
            mimeType={mimeType}
            extension={extension}
          />
        )}
      </div>

      {/* File Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium" title={fileName}>
          {fileName}
        </p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{formatFileSize(fileSize)}</span>
          {extension && (
            <>
              <span className="text-muted-foreground/50">|</span>
              <ExtensionBadge extension={extension} />
            </>
          )}
        </div>
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {/* Preview */}
        {previewable && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              handlePreview();
            }}
            title="Preview"
          >
            <Eye className="h-4 w-4" />
          </Button>
        )}

        {/* Download */}
        {downloadable && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              handleDownload();
            }}
            title="Download"
          >
            <Download className="h-4 w-4" />
          </Button>
        )}

        {/* Open in new tab */}
        {url && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              window.open(url, "_blank");
            }}
            title="Open in new tab"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        )}

        {/* More actions dropdown */}
        {(onDelete || onCopyLink || onShare) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onCopyLink && (
                <DropdownMenuItem onClick={handleCopyLink}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy link
                </DropdownMenuItem>
              )}
              {onShare && (
                <DropdownMenuItem onClick={() => onShare(id)}>
                  <Share className="mr-2 h-4 w-4" />
                  Share
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// File List Component
// ============================================================================

export interface FileListProps {
  /** List of files */
  files: Array<Omit<FileCardProps, "variant">>;
  /** Card variant */
  variant?: FileCardProps["variant"];
  /** Custom class name */
  className?: string;
  /** Empty state message */
  emptyMessage?: string;
}

export function FileList({
  files,
  variant = "compact",
  className,
  emptyMessage = "No files",
}: FileListProps) {
  if (files.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center py-8 text-muted-foreground",
          className,
        )}
      >
        {emptyMessage}
      </div>
    );
  }

  if (variant === "grid") {
    return (
      <div
        className={cn(
          "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4",
          className,
        )}
      >
        {files.map((file) => (
          <FileCard key={file.id} {...file} variant={variant} />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {files.map((file) => (
        <FileCard key={file.id} {...file} variant={variant} />
      ))}
    </div>
  );
}

export default FileCard;
