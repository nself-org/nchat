"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useNotificationStore } from "@/stores/notification-store";

export interface NotificationBellProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Whether to show the unread badge
   * @default true
   */
  showBadge?: boolean;

  /**
   * Maximum count to display in badge
   * @default 99
   */
  maxBadgeCount?: number;

  /**
   * Whether to animate the bell when there are new notifications
   * @default true
   */
  animateOnNew?: boolean;

  /**
   * Custom icon size
   * @default 20
   */
  iconSize?: number;

  /**
   * Variant of the button
   */
  variant?: "default" | "ghost" | "outline";
}

/**
 * NotificationBell - Header notification icon with badge
 *
 * Displays a bell icon with an optional unread count badge.
 * Animates when new notifications arrive.
 */
export function NotificationBell({
  showBadge = true,
  maxBadgeCount = 99,
  animateOnNew = true,
  iconSize = 20,
  variant = "ghost",
  className,
  onClick,
  ...props
}: NotificationBellProps) {
  const unreadCount = useNotificationStore((state) => state.unreadCounts.total);
  const hasNewNotifications = useNotificationStore(
    (state) => state.hasNewNotifications,
  );
  const toggleNotificationCenter = useNotificationStore(
    (state) => state.toggleNotificationCenter,
  );
  const notificationCenterOpen = useNotificationStore(
    (state) => state.notificationCenterOpen,
  );

  const handleClick = React.useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      toggleNotificationCenter();
      onClick?.(e);
    },
    [toggleNotificationCenter, onClick],
  );

  const displayCount =
    unreadCount > maxBadgeCount ? `${maxBadgeCount}+` : unreadCount.toString();
  const shouldAnimate = animateOnNew && hasNewNotifications && unreadCount > 0;

  return (
    <Button
      variant={variant}
      size="icon"
      className={cn("relative", shouldAnimate && "animate-wiggle", className)}
      onClick={handleClick}
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      aria-expanded={notificationCenterOpen}
      aria-haspopup="true"
      {...props}
    >
      {/* Bell Icon */}
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-foreground"
        aria-hidden="true"
      >
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>

      {/* Badge */}
      {showBadge && unreadCount > 0 && (
        <span
          className={cn(
            "absolute -right-1 -top-1 flex items-center justify-center",
            "h-[18px] min-w-[18px] rounded-full px-1",
            "bg-destructive text-destructive-foreground",
            "text-[10px] font-semibold",
            shouldAnimate && "animate-pulse",
          )}
          aria-hidden="true"
        >
          {displayCount}
        </span>
      )}
    </Button>
  );
}

/**
 * Animation keyframes for bell wiggle
 * Add this to your globals.css or tailwind config:
 *
 * @keyframes wiggle {
 *   0%, 100% { transform: rotate(0deg); }
 *   15% { transform: rotate(-15deg); }
 *   30% { transform: rotate(10deg); }
 *   45% { transform: rotate(-10deg); }
 *   60% { transform: rotate(5deg); }
 *   75% { transform: rotate(-5deg); }
 * }
 *
 * .animate-wiggle {
 *   animation: wiggle 0.5s ease-in-out;
 * }
 */

NotificationBell.displayName = "NotificationBell";

export default NotificationBell;
