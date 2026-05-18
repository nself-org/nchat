"use client";

import * as React from "react";
import {
  ExternalLink,
  Download,
  Link2,
  Share2,
  Trash2,
  FileImage,
  FileVideo,
  FileAudio,
  File,
} from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItemWithIcon,
  ContextMenuSeparator,
  ContextMenuTrigger,
  ContextMenuLabel,
} from "./context-menu-base";
import { useAuth } from "@/contexts/auth-context";
import type { Attachment, AttachmentType } from "@/types/message";

// ============================================================================
// Types
// ============================================================================

export interface AttachmentContextMenuProps {
  children: React.ReactNode;
  attachment: Attachment;
  messageUserId?: string; // ID of user who posted the message containing this attachment
  onOpenInNewTab?: (attachment: Attachment) => void;
  onDownload?: (attachment: Attachment) => void;
  onCopyLink?: (attachment: Attachment) => void;
  onShare?: (attachment: Attachment) => void;
  onDelete?: (attachment: Attachment) => void;
  disabled?: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getFileTypeIcon(type: AttachmentType) {
  switch (type) {
    case "image":
      return <FileImage className="h-4 w-4" />;
    case "video":
      return <FileVideo className="h-4 w-4" />;
    case "audio":
      return <FileAudio className="h-4 w-4" />;
    default:
      return <File className="h-4 w-4" />;
  }
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return "Unknown size";

  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(unitIndex > 0 ? 1 : 0)} ${units[unitIndex]}`;
}

// ============================================================================
// Component
// ============================================================================

export function AttachmentContextMenu({
  children,
  attachment,
  messageUserId,
  onOpenInNewTab,
  onDownload,
  onCopyLink,
  onShare,
  onDelete,
  disabled = false,
}: AttachmentContextMenuProps) {
  const { user } = useAuth();

  const isOwner = user?.id === messageUserId;
  const isAdmin = user?.role === "owner" || user?.role === "admin";
  const canDelete = isOwner || isAdmin;

  const handleOpenInNewTab = React.useCallback(() => {
    if (onOpenInNewTab) {
      onOpenInNewTab(attachment);
    } else {
      window.open(attachment.url, "_blank", "noopener,noreferrer");
    }
  }, [attachment, onOpenInNewTab]);

  const handleDownload = React.useCallback(() => {
    if (onDownload) {
      onDownload(attachment);
    } else {
      // Create a temporary link to trigger download
      const link = document.createElement("a");
      link.href = attachment.url;
      link.download = attachment.name;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [attachment, onDownload]);

  const handleCopyLink = React.useCallback(() => {
    if (onCopyLink) {
      onCopyLink(attachment);
    } else {
      navigator.clipboard.writeText(attachment.url);
    }
  }, [attachment, onCopyLink]);

  if (disabled) {
    return <>{children}</>;
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        {/* File info header */}
        <ContextMenuLabel className="font-normal">
          <div className="flex items-center gap-2">
            {getFileTypeIcon(attachment.type)}
            <div className="flex min-w-0 flex-col">
              <p className="truncate text-sm font-medium">{attachment.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(attachment.size)}
                {attachment.mimeType && ` - ${attachment.mimeType}`}
              </p>
            </div>
          </div>
        </ContextMenuLabel>

        <ContextMenuSeparator />

        {/* Open in new tab */}
        <ContextMenuItemWithIcon
          icon={<ExternalLink className="h-4 w-4" />}
          onClick={handleOpenInNewTab}
        >
          Open in new tab
        </ContextMenuItemWithIcon>

        {/* Download */}
        <ContextMenuItemWithIcon
          icon={<Download className="h-4 w-4" />}
          shortcut="Ctrl+S"
          onClick={handleDownload}
        >
          Download
        </ContextMenuItemWithIcon>

        <ContextMenuSeparator />

        {/* Copy link */}
        <ContextMenuItemWithIcon
          icon={<Link2 className="h-4 w-4" />}
          onClick={handleCopyLink}
        >
          Copy link
        </ContextMenuItemWithIcon>

        {/* Share */}
        <ContextMenuItemWithIcon
          icon={<Share2 className="h-4 w-4" />}
          onClick={() => onShare?.(attachment)}
        >
          Share
        </ContextMenuItemWithIcon>

        {/* Delete (if owner or admin) */}
        {canDelete && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItemWithIcon
              icon={<Trash2 className="h-4 w-4" />}
              destructive
              onClick={() => onDelete?.(attachment)}
            >
              Delete attachment
            </ContextMenuItemWithIcon>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}

AttachmentContextMenu.displayName = "AttachmentContextMenu";
