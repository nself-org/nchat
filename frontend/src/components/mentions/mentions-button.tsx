"use client";

/**
 * MentionsButton - Header button for mentions with unread count badge
 *
 * Shows an @ icon with a badge indicating unread mention count.
 * Clicking opens the mentions panel.
 *
 * @example
 * ```tsx
 * <MentionsButton userId={user.id} />
 * ```
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUnreadMentionsCount } from "@/lib/mentions/use-mentions";
import { useMentionStore } from "@/lib/mentions/mention-store";
import { MentionsPanel } from "./mentions-panel";

// ============================================================================
// Types
// ============================================================================

export interface MentionsButtonProps {
  /** Current user's ID */
  userId: string;
  /** Button size variant */
  size?: "default" | "sm" | "lg" | "icon";
  /** Additional className */
  className?: string;
  /** Whether to show tooltip */
  showTooltip?: boolean;
  /** Panel position relative to button */
  panelPosition?: "left" | "right" | "bottom";
}

// ============================================================================
// At Icon Component
// ============================================================================

function AtIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" />
    </svg>
  );
}

// ============================================================================
// Badge Component
// ============================================================================

interface UnreadBadgeProps {
  count: number;
  className?: string;
}

function UnreadBadge({ count, className }: UnreadBadgeProps) {
  if (count === 0) return null;

  const displayCount = count > 99 ? "99+" : count.toString();

  return (
    <Badge
      variant="default"
      className={cn(
        "absolute -right-1 -top-1 h-5 min-w-5 px-1",
        "flex items-center justify-center",
        "text-[10px] font-bold",
        "bg-destructive text-destructive-foreground",
        "border-2 border-background",
        "duration-200 animate-in zoom-in-50",
        className,
      )}
    >
      {displayCount}
    </Badge>
  );
}

// ============================================================================
// Popover Wrapper (Simple Implementation)
// ============================================================================

interface PopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: React.ReactNode;
  content: React.ReactNode;
  position?: "left" | "right" | "bottom";
}

function Popover({
  open,
  onOpenChange,
  trigger,
  content,
  position = "right",
}: PopoverProps) {
  const popoverRef = React.useRef<HTMLDivElement>(null);

  // Close on outside click
  React.useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        onOpenChange(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, onOpenChange]);

  const positionClasses = {
    left: "right-0 top-full mt-2",
    right: "left-0 top-full mt-2",
    bottom: "left-1/2 -translate-x-1/2 top-full mt-2",
  };

  return (
    <div ref={popoverRef} className="relative">
      {trigger}
      {open && (
        <div className={cn("absolute z-50", positionClasses[position])}>
          {content}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function MentionsButton({
  userId,
  size = "icon",
  className,
  showTooltip = true,
  panelPosition = "right",
}: MentionsButtonProps) {
  const { count, isLoading } = useUnreadMentionsCount(userId);
  const { panel, openPanel, closePanel } = useMentionStore();

  const handleToggle = React.useCallback(() => {
    if (panel.isOpen) {
      closePanel();
    } else {
      openPanel();
    }
  }, [panel.isOpen, openPanel, closePanel]);

  const buttonContent = (
    <Button
      variant="ghost"
      size={size}
      onClick={handleToggle}
      className={cn("relative", panel.isOpen && "bg-accent", className)}
      aria-label={`Mentions${count > 0 ? ` (${count} unread)` : ""}`}
      aria-expanded={panel.isOpen}
      aria-haspopup="dialog"
    >
      <AtIcon
        className={cn(
          "h-5 w-5",
          size === "sm" && "h-4 w-4",
          size === "lg" && "h-6 w-6",
        )}
      />
      <UnreadBadge count={count} />
    </Button>
  );

  return (
    <Popover
      open={panel.isOpen}
      onOpenChange={(open) => (open ? openPanel() : closePanel())}
      trigger={buttonContent}
      content={
        <MentionsPanel
          userId={userId}
          onClose={closePanel}
          width={400}
          height={500}
        />
      }
      position={panelPosition}
    />
  );
}

// ============================================================================
// Simple Button Variant (No Popover)
// ============================================================================

export interface MentionsButtonSimpleProps {
  userId: string;
  onClick?: () => void;
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function MentionsButtonSimple({
  userId,
  onClick,
  size = "icon",
  className,
}: MentionsButtonSimpleProps) {
  const { count } = useUnreadMentionsCount(userId);
  const { openPanel } = useMentionStore();

  const handleClick = React.useCallback(() => {
    openPanel();
    onClick?.();
  }, [openPanel, onClick]);

  return (
    <Button
      variant="ghost"
      size={size}
      onClick={handleClick}
      className={cn("relative", className)}
      aria-label={`Mentions${count > 0 ? ` (${count} unread)` : ""}`}
    >
      <AtIcon
        className={cn(
          "h-5 w-5",
          size === "sm" && "h-4 w-4",
          size === "lg" && "h-6 w-6",
        )}
      />
      <UnreadBadge count={count} />
    </Button>
  );
}

// ============================================================================
// Nav Item Variant (For Sidebar)
// ============================================================================

export interface MentionsNavItemProps {
  userId: string;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
}

export function MentionsNavItem({
  userId,
  isActive = false,
  onClick,
  className,
}: MentionsNavItemProps) {
  const { count } = useUnreadMentionsCount(userId);
  const { openPanel } = useMentionStore();

  const handleClick = React.useCallback(() => {
    openPanel();
    onClick?.();
  }, [openPanel, onClick]);

  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-md px-3 py-2",
        "text-sm font-medium transition-colors",
        "hover:text-accent-foreground hover:bg-accent",
        isActive && "text-accent-foreground bg-accent",
        className,
      )}
    >
      <AtIcon className="h-4 w-4" />
      <span className="flex-1 text-left">Mentions</span>
      {count > 0 && (
        <Badge
          variant="default"
          className="h-5 min-w-5 bg-destructive px-1 text-[10px] text-destructive-foreground"
        >
          {count > 99 ? "99+" : count}
        </Badge>
      )}
    </button>
  );
}

// ============================================================================
// Notification Dot (Minimal Indicator)
// ============================================================================

export interface MentionsIndicatorProps {
  userId: string;
  className?: string;
}

export function MentionsIndicator({
  userId,
  className,
}: MentionsIndicatorProps) {
  const { count } = useUnreadMentionsCount(userId);

  if (count === 0) return null;

  return (
    <span
      className={cn(
        "inline-block h-2 w-2 rounded-full bg-destructive",
        "animate-pulse",
        className,
      )}
      aria-label={`${count} unread mention${count !== 1 ? "s" : ""}`}
    />
  );
}

export default MentionsButton;
