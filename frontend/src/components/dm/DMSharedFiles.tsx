"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  File,
  FileText,
  FileSpreadsheet,
  FileCode,
  FileArchive,
  Download,
  ExternalLink,
  MoreVertical,
  Folder,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DirectMessage, DMSharedFile } from "@/lib/dm/dm-types";
import { useDMStore, selectSharedFiles } from "@/stores/dm-store";

// ============================================================================
// Types
// ============================================================================

interface DMSharedFilesProps {
  dm: DirectMessage;
  onFileClick?: (file: DMSharedFile) => void;
  className?: string;
}

// ============================================================================
// File Type Helpers
// ============================================================================

function getFileIcon(fileType: string) {
  if (fileType.includes("pdf") || fileType.includes("document")) {
    return FileText;
  }
  if (
    fileType.includes("spreadsheet") ||
    fileType.includes("excel") ||
    fileType.includes("csv")
  ) {
    return FileSpreadsheet;
  }
  if (
    fileType.includes("code") ||
    fileType.includes("javascript") ||
    fileType.includes("json")
  ) {
    return FileCode;
  }
  if (
    fileType.includes("zip") ||
    fileType.includes("archive") ||
    fileType.includes("compressed")
  ) {
    return FileArchive;
  }
  return File;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString();
}

// ============================================================================
// Component
// ============================================================================

export function DMSharedFiles({
  dm,
  onFileClick,
  className,
}: DMSharedFilesProps) {
  const sharedFiles = useDMStore(selectSharedFiles(dm.id));
  const [isLoading, setIsLoading] = React.useState(false);

  // Group files by date
  const groupedFiles = React.useMemo(() => {
    const groups: Record<string, DMSharedFile[]> = {};

    sharedFiles.forEach((file) => {
      const date = new Date(file.sharedAt);
      const key = date.toDateString();
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(file);
    });

    return Object.entries(groups)
      .map(([date, files]) => ({
        date,
        label: formatDate(files[0].sharedAt),
        files,
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sharedFiles]);

  const handleDownload = (file: DMSharedFile) => {
    // Open file URL in new tab to trigger download
    window.open(file.attachment.fileUrl, "_blank");
  };

  if (isLoading) {
    return (
      <div className={cn("space-y-3", className)}>
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }

  if (sharedFiles.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center py-12 text-center",
          className,
        )}
      >
        <Folder className="text-muted-foreground/50 mb-4 h-12 w-12" />
        <h3 className="text-sm font-medium">No shared files</h3>
        <p className="mt-1 max-w-[200px] text-xs text-muted-foreground">
          Files shared in this conversation will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between px-1">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <File className="h-4 w-4" />
          Shared Files ({sharedFiles.length})
        </h3>
      </div>

      <ScrollArea className="h-[400px]">
        <div className="space-y-4">
          {groupedFiles.map((group) => (
            <div key={group.date} className="space-y-2">
              <h4 className="px-1 text-xs font-medium text-muted-foreground">
                {group.label}
              </h4>
              <div className="space-y-1">
                {group.files.map((file) => (
                  <FileItem
                    key={file.id}
                    file={file}
                    onClick={() => onFileClick?.(file)}
                    onDownload={() => handleDownload(file)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

// ============================================================================
// File Item Component
// ============================================================================

interface FileItemProps {
  file: DMSharedFile;
  onClick?: () => void;
  onDownload: () => void;
}

function FileItem({ file, onClick, onDownload }: FileItemProps) {
  const { attachment, user } = file;
  const FileIcon = getFileIcon(attachment.fileType);

  return (
    <div className="group flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-accent">
      {/* File Icon */}
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-muted">
        <FileIcon className="h-5 w-5 text-muted-foreground" />
      </div>

      {/* File Info */}
      <div
        className="min-w-0 flex-1 cursor-pointer"
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
        <p className="truncate text-sm font-medium">{attachment.fileName}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatFileSize(attachment.fileSize)}</span>
          <span>-</span>
          <span>by {user.displayName}</span>
        </div>
      </div>

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onClick}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Open
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

DMSharedFiles.displayName = "DMSharedFiles";
