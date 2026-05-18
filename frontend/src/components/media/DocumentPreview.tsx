"use client";

/**
 * DocumentPreview - Document preview with code syntax highlighting
 *
 * Handles text files, code files, CSV, and unsupported document types.
 */

import * as React from "react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { MediaItem } from "@/lib/media/media-types";
import { formatFileSize } from "@/lib/media/media-manager";
import {
  generateTextPreview,
  generateCodePreview,
  isCode,
  isTextBased,
  getFileTypeInfo,
} from "@/lib/media/file-preview";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Copy,
  Check,
} from "lucide-react";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface DocumentPreviewProps {
  item: MediaItem;
  maxLines?: number;
  showLineNumbers?: boolean;
  onDownload?: () => void;
  onOpenExternal?: () => void;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function DocumentPreview({
  item,
  maxLines = 500,
  showLineNumbers = true,
  onDownload,
  onOpenExternal,
  className,
}: DocumentPreviewProps) {
  const [content, setContent] = useState<string>("");
  const [language, setLanguage] = useState<string>("plaintext");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fileInfo = getFileTypeInfo(item.mimeType);
  const isCodeFile = isCode(item.mimeType);
  const isTextFile = isTextBased(item.mimeType);
  const canPreview = isCodeFile || isTextFile;

  // Load file content
  useEffect(() => {
    if (!canPreview) {
      setIsLoading(false);
      return;
    }

    const loadContent = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(item.url);
        const blob = await response.blob();
        const file = new File([blob], item.fileName, { type: item.mimeType });

        if (isCodeFile) {
          const preview = await generateCodePreview(file, maxLines);
          setContent(preview.content);
          setLanguage(preview.language);
        } else {
          const text = await generateTextPreview(file, maxLines * 80);
          setContent(text);
          setLanguage("plaintext");
        }

        setIsLoading(false);
      } catch (err) {
        logger.error("Failed to load document:", err);
        setError("Failed to load document content");
        setIsLoading(false);
      }
    };

    loadContent();
  }, [
    item.url,
    item.fileName,
    item.mimeType,
    canPreview,
    isCodeFile,
    maxLines,
  ]);

  // Copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      logger.error("Failed to copy:", err);
    }
  };

  // For unsupported document types (Word, Excel, PowerPoint)
  if (!canPreview) {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center p-8",
          className,
        )}
      >
        <div className="flex max-w-md flex-col items-center rounded-xl border bg-card p-8 text-center shadow-sm">
          {/* Icon */}
          <div className="mb-4 rounded-full bg-muted p-6">
            <FileText className="h-16 w-16" style={{ color: fileInfo.color }} />
          </div>

          {/* File name */}
          <h3 className="mb-2 text-lg font-semibold">{item.fileName}</h3>

          {/* File info */}
          <div className="mb-6 space-y-1 text-sm text-muted-foreground">
            <p>Type: {fileInfo.label}</p>
            <p>Size: {formatFileSize(item.fileSize)}</p>
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
          <p className="mt-4 text-xs text-muted-foreground">
            Preview not available for this file type
          </p>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center",
          className,
        )}
      >
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">
            Loading document...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center",
          className,
        )}
      >
        <div className="text-center">
          <FileText className="mx-auto h-16 w-16 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">
            Failed to Load Document
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          {onDownload && (
            <Button onClick={onDownload} className="mt-4">
              <Download className="mr-2 h-4 w-4" />
              Download File
            </Button>
          )}
        </div>
      </div>
    );
  }

  // CSV preview with table formatting
  if (item.mimeType === "text/csv" || item.fileExtension === "csv") {
    const lines = content.split("\n").filter((line) => line.trim());
    const rows = lines.map((line) =>
      line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, "")),
    );
    const headers = rows[0] || [];
    const dataRows = rows.slice(1);

    return (
      <div className={cn("flex h-full w-full flex-col", className)}>
        {/* Header */}
        <div className="flex items-center justify-between border-b bg-background px-4 py-3">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5" style={{ color: fileInfo.color }} />
            <div>
              <h3 className="font-medium">{item.fileName}</h3>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(item.fileSize)} • {dataRows.length} rows
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onDownload && (
              <Button variant="outline" size="sm" onClick={onDownload}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <ScrollArea className="flex-1">
          <div className="p-4">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b bg-muted">
                  {headers.map((header, i) => (
                    <th
                      key={i}
                      className="px-4 py-2 text-left text-sm font-semibold"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataRows.map((row, i) => (
                  <tr key={i} className="hover:bg-muted/50 border-b">
                    {row.map((cell, j) => (
                      <td key={j} className="px-4 py-2 text-sm">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ScrollArea>
      </div>
    );
  }

  // Text/Code preview
  const lines = content.split("\n");

  return (
    <div className={cn("flex h-full w-full flex-col", className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-background px-4 py-3">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5" style={{ color: fileInfo.color }} />
          <div>
            <h3 className="font-medium">{item.fileName}</h3>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(item.fileSize)} • {lines.length} lines
              {language !== "plaintext" && ` • ${language}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleCopy}>
            {copied ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Copied
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </>
            )}
          </Button>

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

      {/* Code content */}
      <ScrollArea className="bg-muted/20 flex-1">
        <div className="p-4">
          <pre className="rounded-lg bg-card p-4 font-mono text-sm">
            {showLineNumbers ? (
              <code>
                {lines.map((line, i) => (
                  <div key={i} className="flex">
                    <span className="mr-4 inline-block w-8 select-none text-right text-muted-foreground">
                      {i + 1}
                    </span>
                    <span className="flex-1">{line || " "}</span>
                  </div>
                ))}
              </code>
            ) : (
              <code>{content}</code>
            )}
          </pre>
        </div>
      </ScrollArea>
    </div>
  );
}

export default DocumentPreview;
