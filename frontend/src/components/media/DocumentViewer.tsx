"use client";

/**
 * DocumentViewer - Document preview component
 *
 * Displays document information with download option.
 * For PDFs, can embed iframe viewer when supported.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { MediaItem } from "@/lib/media/media-types";
import { formatFileSize } from "@/lib/media/media-manager";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileCode,
  File,
  Presentation,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface DocumentViewerProps {
  item: MediaItem;
  embedPdf?: boolean;
  onDownload?: () => void;
  onOpenExternal?: () => void;
  className?: string;
}

// ============================================================================
// Document Type Icons
// ============================================================================

const getDocumentIcon = (mimeType: string, extension: string) => {
  if (mimeType.includes("pdf")) return FileText;
  if (
    mimeType.includes("word") ||
    extension === "doc" ||
    extension === "docx"
  ) {
    return FileText;
  }
  if (
    mimeType.includes("excel") ||
    mimeType.includes("spreadsheet") ||
    extension === "xls" ||
    extension === "xlsx" ||
    extension === "csv"
  ) {
    return FileSpreadsheet;
  }
  if (
    mimeType.includes("powerpoint") ||
    mimeType.includes("presentation") ||
    extension === "ppt" ||
    extension === "pptx"
  ) {
    return Presentation;
  }
  if (
    extension === "json" ||
    extension === "xml" ||
    extension === "html" ||
    extension === "css" ||
    extension === "js" ||
    extension === "ts" ||
    extension === "md"
  ) {
    return FileCode;
  }
  return File;
};

// ============================================================================
// Document Type Colors
// ============================================================================

const getDocumentColor = (mimeType: string, extension: string): string => {
  if (mimeType.includes("pdf") || extension === "pdf") return "text-red-500";
  if (
    mimeType.includes("word") ||
    extension === "doc" ||
    extension === "docx"
  ) {
    return "text-blue-500";
  }
  if (
    mimeType.includes("excel") ||
    mimeType.includes("spreadsheet") ||
    extension === "xls" ||
    extension === "xlsx"
  ) {
    return "text-green-500";
  }
  if (
    mimeType.includes("powerpoint") ||
    mimeType.includes("presentation") ||
    extension === "ppt" ||
    extension === "pptx"
  ) {
    return "text-orange-500";
  }
  if (extension === "csv") return "text-green-600";
  if (extension === "json" || extension === "xml") return "text-yellow-500";
  if (extension === "md" || extension === "txt") return "text-gray-500";
  return "text-muted-foreground";
};

// ============================================================================
// Component
// ============================================================================

export function DocumentViewer({
  item,
  embedPdf = false,
  onDownload,
  onOpenExternal,
  className,
}: DocumentViewerProps) {
  const isPdf = item.mimeType === "application/pdf";
  const canEmbed = embedPdf && isPdf;

  const Icon = getDocumentIcon(item.mimeType, item.fileExtension);
  const iconColor = getDocumentColor(item.mimeType, item.fileExtension);

  // Embedded PDF viewer
  if (canEmbed) {
    return (
      <div className={cn("flex h-full w-full flex-col", className)}>
        {/* Header */}
        <div className="flex items-center justify-between border-b bg-card p-3">
          <div className="flex items-center gap-3">
            <Icon className={cn("h-6 w-6", iconColor)} />
            <div>
              <h3 className="font-medium">{item.fileName}</h3>
              <p className="text-sm text-muted-foreground">
                {formatFileSize(item.fileSize)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onOpenExternal && (
              <Button variant="ghost" size="sm" onClick={onOpenExternal}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Open
              </Button>
            )}
            {onDownload && (
              <Button variant="outline" size="sm" onClick={onDownload}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            )}
          </div>
        </div>

        {/* PDF embed */}
        <div className="flex-1">
          <iframe
            src={`${item.url}#toolbar=1`}
            className="h-full w-full border-0"
            title={item.fileName}
          />
        </div>
      </div>
    );
  }

  // Document info card
  return (
    <div
      className={cn(
        "flex h-full w-full flex-col items-center justify-center p-8",
        className,
      )}
    >
      <div className="flex max-w-md flex-col items-center rounded-xl border bg-card p-8 text-center shadow-sm">
        {/* Icon */}
        <div className="mb-4 rounded-full bg-muted p-6">
          <Icon className={cn("h-16 w-16", iconColor)} />
        </div>

        {/* File name */}
        <h3 className="mb-2 text-lg font-semibold">{item.fileName}</h3>

        {/* File info */}
        <div className="mb-6 space-y-1 text-sm text-muted-foreground">
          <p>Size: {formatFileSize(item.fileSize)}</p>
          <p>Type: {item.mimeType}</p>
          <p>Uploaded by: {item.uploadedBy.displayName}</p>
          <p>Date: {new Date(item.createdAt).toLocaleDateString()}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {onDownload && (
            <Button onClick={onDownload}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          )}
          {onOpenExternal && (
            <Button variant="outline" onClick={onOpenExternal}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Open
            </Button>
          )}
        </div>

        {/* Preview not available message */}
        {!isPdf && (
          <p className="mt-4 text-xs text-muted-foreground">
            Preview not available for this file type
          </p>
        )}
      </div>
    </div>
  );
}

export default DocumentViewer;
