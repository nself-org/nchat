"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Download,
  X,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  File as FileGeneric,
  ExternalLink,
} from "lucide-react";
import { formatFileSize } from "@/lib/storage/upload";

// ============================================================================
// Types
// ============================================================================

export interface FilePreviewFile {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  uploadedAt?: Date | string;
}

export interface FilePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: FilePreviewFile | null;
  onDownload?: (file: FilePreviewFile) => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getFileCategory(
  type: string,
): "image" | "video" | "audio" | "document" | "other" {
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";
  if (type.startsWith("audio/")) return "audio";
  if (
    type.includes("pdf") ||
    type.includes("document") ||
    type.includes("text") ||
    type.includes("spreadsheet") ||
    type.includes("presentation")
  ) {
    return "document";
  }
  return "other";
}

function getFileIcon(type: string) {
  const category = getFileCategory(type);
  switch (category) {
    case "image":
      return ImageIcon;
    case "video":
      return Video;
    case "audio":
      return Music;
    case "document":
      return FileText;
    default:
      return FileGeneric;
  }
}

// ============================================================================
// Component
// ============================================================================

export function FilePreviewModal({
  open,
  onOpenChange,
  file,
  onDownload,
}: FilePreviewModalProps) {
  const [isDownloading, setIsDownloading] = React.useState(false);

  if (!file) return null;

  const category = getFileCategory(file.type);
  const Icon = getFileIcon(file.type);

  const handleDownload = async () => {
    if (!file || !onDownload) return;

    setIsDownloading(true);
    try {
      onDownload(file);
      // If no custom download handler, use default browser download
      if (!onDownload) {
        const link = document.createElement("a");
        link.href = file.url;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } finally {
      setIsDownloading(false);
    }
  };

  const handleOpenInNewTab = () => {
    if (file) {
      window.open(file.url, "_blank", "noopener,noreferrer");
    }
  };

  const renderPreview = () => {
    switch (category) {
      case "image":
        return (
          <div className="bg-muted/30 flex items-center justify-center rounded-lg p-4">
            <img
              src={file.url}
              alt={file.name}
              className="max-h-[500px] max-w-full rounded object-contain"
            />
          </div>
        );

      case "video":
        return (
          <div className="flex items-center justify-center overflow-hidden rounded-lg bg-black">
            <video
              src={file.url}
              controls
              className="max-h-[500px] max-w-full"
              preload="metadata"
            >
              <track kind="captions" />
              Your browser does not support video playback.
            </video>
          </div>
        );

      case "audio":
        return (
          <div className="flex flex-col items-center justify-center space-y-6 p-12">
            <div className="bg-primary/10 flex h-24 w-24 items-center justify-center rounded-full">
              <Music className="h-12 w-12 text-primary" />
            </div>
            <audio src={file.url} controls className="w-full max-w-md">
              <track kind="captions" />
              Your browser does not support audio playback.
            </audio>
          </div>
        );

      case "document":
        if (file.type === "application/pdf") {
          return (
            <div className="h-[600px] w-full overflow-hidden rounded-lg border">
              <iframe
                src={file.url}
                className="h-full w-full"
                title={file.name}
              />
            </div>
          );
        }
      // Fall through to default for non-PDF documents

      default:
        return (
          <div className="flex flex-col items-center justify-center space-y-4 p-12">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted">
              <Icon className="h-12 w-12 text-muted-foreground" />
            </div>
            <div className="space-y-2 text-center">
              <p className="text-sm text-muted-foreground">
                Preview not available for this file type
              </p>
              <p className="text-xs text-muted-foreground">
                Download the file to view it
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col p-0">
        {/* Header */}
        <DialogHeader className="space-y-3 px-6 pb-4 pt-6">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1 pr-4">
              <DialogTitle className="truncate text-lg" title={file.name}>
                {file.name}
              </DialogTitle>
              <DialogDescription className="mt-1 flex items-center gap-2">
                <span>{formatFileSize(file.size)}</span>
                <span>•</span>
                <span>
                  {file.type.split("/")[1]?.toUpperCase() || file.type}
                </span>
                {file.uploadedAt && (
                  <>
                    <span>•</span>
                    <span>
                      {new Date(file.uploadedAt).toLocaleDateString()}
                    </span>
                  </>
                )}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleOpenInNewTab}
                title="Open in new tab"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDownload}
                disabled={isDownloading}
                title="Download"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Preview area */}
        <ScrollArea className="flex-1 px-6 pb-6">{renderPreview()}</ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
