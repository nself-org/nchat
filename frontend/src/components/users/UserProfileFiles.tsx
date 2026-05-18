/* eslint-disable react-hooks/rules-of-hooks */

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { type SharedFile } from "./UserProfile";
import { FileIcon } from "@/components/files/file-icon";
import { formatDistanceToNow } from "date-fns";
import { FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

// ============================================================================
// Types
// ============================================================================

export interface UserProfileFilesProps extends React.HTMLAttributes<HTMLDivElement> {
  files: SharedFile[];
  onFileClick?: (file: SharedFile) => void;
}

// ============================================================================
// Helper: Format file size
// ============================================================================

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// ============================================================================
// Component
// ============================================================================

const UserProfileFiles = React.forwardRef<
  HTMLDivElement,
  UserProfileFilesProps
>(({ className, files, onFileClick, ...props }, ref) => {
  if (files.length === 0) {
    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col items-center justify-center py-12 text-center",
          className,
        )}
        {...props}
      >
        <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="mb-2 text-lg font-medium">No shared files</h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          Files shared with this user will appear here.
        </p>
      </div>
    );
  }

  // Group files by type
  const groupedFiles = React.useMemo(() => {
    const groups: Record<string, SharedFile[]> = {
      images: [],
      documents: [],
      other: [],
    };
    files.forEach((file) => {
      if (file.type.startsWith("image/")) {
        groups.images.push(file);
      } else if (
        file.type.includes("pdf") ||
        file.type.includes("document") ||
        file.type.includes("text")
      ) {
        groups.documents.push(file);
      } else {
        groups.other.push(file);
      }
    });
    return groups;
  }, [files]);

  return (
    <div ref={ref} className={cn("space-y-6 p-6", className)} {...props}>
      {/* Images */}
      {groupedFiles.images.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold">
            Images ({groupedFiles.images.length})
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {groupedFiles.images.map((file) => (
              <button
                key={file.id}
                onClick={() => onFileClick?.(file)}
                className="group relative aspect-square overflow-hidden rounded-lg transition-opacity hover:opacity-80"
              >
                <img
                  src={file.url}
                  alt={file.name}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                  <Download className="h-6 w-6 text-white" />
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Documents */}
      {groupedFiles.documents.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold">
            Documents ({groupedFiles.documents.length})
          </h3>
          <div className="space-y-2">
            {groupedFiles.documents.map((file) => (
              <FileRow key={file.id} file={file} onFileClick={onFileClick} />
            ))}
          </div>
        </section>
      )}

      {/* Other files */}
      {groupedFiles.other.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold">
            Other Files ({groupedFiles.other.length})
          </h3>
          <div className="space-y-2">
            {groupedFiles.other.map((file) => (
              <FileRow key={file.id} file={file} onFileClick={onFileClick} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
});
UserProfileFiles.displayName = "UserProfileFiles";

// ============================================================================
// FileRow Component
// ============================================================================

interface FileRowProps {
  file: SharedFile;
  onFileClick?: (file: SharedFile) => void;
}

function FileRow({ file, onFileClick }: FileRowProps) {
  return (
    <button
      onClick={() => onFileClick?.(file)}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg p-3",
        "hover:bg-muted/50 text-left transition-colors",
      )}
    >
      <FileIcon file={file.name} className="h-10 w-10" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{file.name}</p>
        <p className="text-xs text-muted-foreground">
          {formatFileSize(file.size)} -{" "}
          {formatDistanceToNow(file.uploadedAt, { addSuffix: true })}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={(e) => {
          e.stopPropagation();
          window.open(file.url, "_blank");
        }}
      >
        <Download className="h-4 w-4" />
      </Button>
    </button>
  );
}

export { UserProfileFiles };
