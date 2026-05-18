/**
 * NotificationBell Component
 *
 * Displays notification bell icon with unread count badge.
 * Clicking opens the notification panel/dropdown.
 */

"use client";

import React, { useCallback, useRef, useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/hooks/use-notifications";
import { useNotificationStore } from "@/stores/notification-store";
import { NotificationList } from "./NotificationList";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// =============================================================================
// Types
// =============================================================================

export interface NotificationBellProps {
  /**
   * Additional class name
   */
  className?: string;

  /**
   * Size variant
   */
  size?: "sm" | "md" | "lg";

  /**
   * Whether to show badge even when count is 0
   */
  showZeroBadge?: boolean;

  /**
   * Maximum count to display (shows 99+ if exceeded)
   */
  maxCount?: number;

  /**
   * Whether notifications are muted
   */
  muted?: boolean;

  /**
   * Callback when bell is clicked
   */
  onClick?: () => void;

  /**
   * Whether to show dropdown on click
   */
  showDropdown?: boolean;

  /**
   * Whether the dropdown is controlled externally
   */
  isOpen?: boolean;

  /**
   * Callback when dropdown open state changes
   */
  onOpenChange?: (open: boolean) => void;

  /**
   * Whether there are new notifications
   */
  hasNewNotifications?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function NotificationBell({
  className,
  size = "md",
  showZeroBadge = false,
  maxCount = 99,
  muted = false,
  onClick,
  showDropdown = true,
  isOpen: controlledOpen,
  onOpenChange,
}: NotificationBellProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Use controlled or internal state
  const isOpen = controlledOpen ?? internalOpen;
  const setIsOpen = onOpenChange ?? setInternalOpen;

  // Get notification state
  const { unreadCount, hasNewNotifications } = useNotifications();
  const notificationCenterOpen = useNotificationStore(
    (state) => state.notificationCenterOpen,
  );
  const setNotificationCenterOpen = useNotificationStore(
    (state) => state.setNotificationCenterOpen,
  );

  // Size classes
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  };

  const iconSizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  const badgeSizeClasses = {
    sm: "min-w-[14px] h-[14px] text-[9px]",
    md: "min-w-[18px] h-[18px] text-[10px]",
    lg: "min-w-[22px] h-[22px] text-[11px]",
  };

  // Format count for display
  const displayCount =
    unreadCount > maxCount ? `${maxCount}+` : String(unreadCount);
  const showBadge = showZeroBadge || unreadCount > 0;

  // Select icon based on state
  const Icon = muted ? BellOff : hasNewNotifications ? BellRing : Bell;

  // Handle click
  const handleClick = useCallback(() => {
    onClick?.();

    if (!showDropdown) {
      setNotificationCenterOpen(!notificationCenterOpen);
    }
  }, [
    onClick,
    showDropdown,
    notificationCenterOpen,
    setNotificationCenterOpen,
  ]);

  // Handle dropdown open change
  const handleOpenChange = useCallback(
    (open: boolean) => {
      setIsOpen(open);
      if (open) {
        // Mark as seen when opened
        setNotificationCenterOpen(true);
      }
    },
    [setIsOpen, setNotificationCenterOpen],
  );

  const bellButton = (
    <Button
      ref={triggerRef}
      variant="ghost"
      size="icon"
      className={cn(
        "relative",
        sizeClasses[size],
        hasNewNotifications && !muted && "animate-pulse",
        className,
      )}
      onClick={!showDropdown ? handleClick : undefined}
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
    >
      <Icon
        className={cn(
          iconSizeClasses[size],
          hasNewNotifications && !muted && "text-primary",
        )}
      />

      {/* Badge */}
      {showBadge && (
        <span
          className={cn(
            "absolute -right-0.5 -top-0.5 flex items-center justify-center",
            "rounded-full bg-destructive font-medium text-destructive-foreground",
            badgeSizeClasses[size],
            unreadCount === 0 && "bg-muted text-muted-foreground",
          )}
        >
          {displayCount}
        </span>
      )}

      {/* Animated ring for new notifications */}
      {hasNewNotifications && !muted && (
        <span className="absolute -right-0.5 -top-0.5 h-3 w-3">
          <span className="absolute h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
        </span>
      )}
    </Button>
  );

  if (!showDropdown) {
    return bellButton;
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>{bellButton}</DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="max-h-[500px] w-[380px] p-0"
        sideOffset={8}
      >
        <NotificationList maxHeight="400px" showHeader showEmptyState />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default NotificationBell;
