"use client";

import * as React from "react";
import { ExternalLink, Copy, Link2 } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItemWithIcon,
  ContextMenuSeparator,
  ContextMenuTrigger,
  ContextMenuLabel,
} from "./context-menu-base";

// ============================================================================
// Types
// ============================================================================

export interface LinkContextMenuProps {
  children: React.ReactNode;
  url: string;
  text?: string; // The displayed text for the link
  onOpenInNewTab?: (url: string) => void;
  onCopyLink?: (url: string) => void;
  onCopyText?: (text: string) => void;
  disabled?: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

function truncateUrl(url: string, maxLength: number = 40): string {
  if (url.length <= maxLength) return url;

  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    const path = urlObj.pathname + urlObj.search + urlObj.hash;

    if (domain.length >= maxLength - 3) {
      return domain.substring(0, maxLength - 3) + "...";
    }

    const remainingLength = maxLength - domain.length - 4; // 4 for "..." and "/"
    if (path.length > remainingLength && remainingLength > 0) {
      return domain + path.substring(0, remainingLength) + "...";
    }

    return domain + path;
  } catch {
    // If URL parsing fails, just truncate normally
    return url.substring(0, maxLength - 3) + "...";
  }
}

function getDomainFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return url;
  }
}

// ============================================================================
// Component
// ============================================================================

export function LinkContextMenu({
  children,
  url,
  text,
  onOpenInNewTab,
  onCopyLink,
  onCopyText,
  disabled = false,
}: LinkContextMenuProps) {
  const displayText = text || url;
  const domain = getDomainFromUrl(url);
  const hasDistinctText = text && text !== url;

  const handleOpenInNewTab = React.useCallback(() => {
    if (onOpenInNewTab) {
      onOpenInNewTab(url);
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }, [url, onOpenInNewTab]);

  const handleCopyLink = React.useCallback(() => {
    if (onCopyLink) {
      onCopyLink(url);
    } else {
      navigator.clipboard.writeText(url);
    }
  }, [url, onCopyLink]);

  const handleCopyText = React.useCallback(() => {
    if (onCopyText) {
      onCopyText(displayText);
    } else {
      navigator.clipboard.writeText(displayText);
    }
  }, [displayText, onCopyText]);

  if (disabled) {
    return <>{children}</>;
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-64">
        {/* Link info header */}
        <ContextMenuLabel className="font-normal">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-muted-foreground">
              {domain}
            </p>
            <p className="text-muted-foreground/70 truncate text-xs">
              {truncateUrl(url, 50)}
            </p>
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

        <ContextMenuSeparator />

        {/* Copy link */}
        <ContextMenuItemWithIcon
          icon={<Link2 className="h-4 w-4" />}
          shortcut="Ctrl+C"
          onClick={handleCopyLink}
        >
          Copy link
        </ContextMenuItemWithIcon>

        {/* Copy text (only if different from URL) */}
        {hasDistinctText && (
          <ContextMenuItemWithIcon
            icon={<Copy className="h-4 w-4" />}
            onClick={handleCopyText}
          >
            Copy text
          </ContextMenuItemWithIcon>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}

LinkContextMenu.displayName = "LinkContextMenu";
