"use client";

import * as React from "react";
import {
  Download,
  ExternalLink,
  Link,
  Trash2,
  Eye,
  FileText,
  Image,
  FileAudio,
  FileVideo,
  type LucideIcon,
} from "lucide-react";
import {
  useContextMenuStore,
  type FileTarget,
} from "@/lib/context-menu/context-menu-store";
import { PositionedContextMenu } from "./base-context-menu";
import { MenuItem } from "./menu-item";
import { MenuSeparator } from "./menu-separator";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface FileContextMenuProps {
  /**
   * Called when an action is performed
   */
  onAction?: (action: string, data: FileActionData) => void;
}

export interface FileActionData {
  fileId: string;
  fileName: string;
  fileUrl: string;
  action: FileAction;
}

export type FileAction =
  | "download"
  | "open-new-tab"
  | "preview"
  | "copy-link"
  | "delete";

// ============================================================================
// Helper Functions
// ============================================================================

function getFileIcon(fileType: string): LucideIcon {
  if (fileType.startsWith("image/")) return Image;
  if (fileType.startsWith("audio/")) return FileAudio;
  if (fileType.startsWith("video/")) return FileVideo;
  return FileText;
}

function isPreviewable(fileType: string): boolean {
  return (
    fileType.startsWith("image/") ||
    fileType.startsWith("video/") ||
    fileType === "application/pdf"
  );
}

// ============================================================================
// Component
// ============================================================================

export function FileContextMenu({ onAction }: FileContextMenuProps) {
  const target = useContextMenuStore((state) => state.target);
  const closeMenu = useContextMenuStore((state) => state.closeMenu);

  // Type guard for file target
  const fileTarget = target?.type === "file" ? (target as FileTarget) : null;

  if (!fileTarget) return null;

  const { fileId, fileName, fileUrl, fileType, canDelete } = fileTarget;

  const handleAction = (action: FileAction) => {
    onAction?.(action, {
      fileId,
      fileName,
      fileUrl,
      action,
    });
    closeMenu();
  };

  const handleDownload = () => {
    // Create a temporary link to trigger download
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    handleAction("download");
  };

  const handleOpenNewTab = () => {
    window.open(fileUrl, "_blank", "noopener,noreferrer");
    handleAction("open-new-tab");
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(fileUrl);
      handleAction("copy-link");
    } catch (error) {
      logger.error("Failed to copy link:", error);
    }
  };

  const canPreview = isPreviewable(fileType);
  const FileIcon = getFileIcon(fileType);

  return (
    <PositionedContextMenu>
      {/* File info header */}
      <div className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground">
        <FileIcon className="h-4 w-4" />
        <span className="max-w-[180px] truncate">{fileName}</span>
      </div>

      <MenuSeparator />

      {/* Preview (for supported file types) */}
      {canPreview && (
        <MenuItem icon={Eye} onSelect={() => handleAction("preview")}>
          Preview
        </MenuItem>
      )}

      {/* Download */}
      <MenuItem icon={Download} shortcut="Ctrl+S" onSelect={handleDownload}>
        Download
      </MenuItem>

      {/* Open in New Tab */}
      <MenuItem icon={ExternalLink} onSelect={handleOpenNewTab}>
        Open in new tab
      </MenuItem>

      {/* Copy Link */}
      <MenuItem icon={Link} onSelect={handleCopyLink}>
        Copy link
      </MenuItem>

      {/* Delete (owner or admin) */}
      {canDelete && (
        <>
          <MenuSeparator />
          <MenuItem
            icon={Trash2}
            danger
            onSelect={() => handleAction("delete")}
          >
            Delete file
          </MenuItem>
        </>
      )}
    </PositionedContextMenu>
  );
}

// ============================================================================
// Exports
// ============================================================================

export { getFileIcon, isPreviewable };
