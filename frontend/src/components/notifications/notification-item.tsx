"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { NotificationType } from "@/stores/notification-store";

// Time formatting utility
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return "just now";
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  }

  // Return formatted date for older notifications
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

// Get initials from name
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// Notification type icons
const NotificationIcon: Record<NotificationType, React.ReactNode> = {
  mention: (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
      />
    </svg>
  ),
  direct_message: (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  ),
  thread_reply: (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
      />
    </svg>
  ),
  reaction: (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  channel_invite: (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
      />
    </svg>
  ),
  channel_update: (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
      />
    </svg>
  ),
  system: (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  announcement: (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
      />
    </svg>
  ),
};

// Type color mapping
const typeColorClasses: Record<NotificationType, string> = {
  mention: "text-yellow-500 bg-yellow-500/10",
  direct_message: "text-blue-500 bg-blue-500/10",
  thread_reply: "text-purple-500 bg-purple-500/10",
  reaction: "text-pink-500 bg-pink-500/10",
  channel_invite: "text-green-500 bg-green-500/10",
  channel_update: "text-cyan-500 bg-cyan-500/10",
  system: "text-gray-500 bg-gray-500/10",
  announcement: "text-orange-500 bg-orange-500/10",
};

export interface NotificationItemProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "onClick"
> {
  /**
   * The notification data
   */
  notification: {
    id: string;
    type: NotificationType;
    priority?: string;
    title: string;
    body: string;
    actor?: {
      id: string;
      name: string;
      avatarUrl?: string;
    };
    channelId?: string;
    channelName?: string;
    messageId?: string;
    threadId?: string;
    isRead: boolean;
    createdAt: string;
    actionUrl?: string;
  };

  /**
   * Callback when marking as read
   */
  onRead?: (id: string) => void;

  /**
   * Callback when dismissing
   */
  onDismiss?: (id: string) => void;

  /**
   * Callback when archiving
   */
  onArchive?: (id: string) => void;

  /**
   * Callback when clicking the notification
   */
  onClick?: (id: string) => void;

  /**
   * Whether to show the dismiss button
   * @default true
   */
  showDismiss?: boolean;

  /**
   * Whether to use compact styling
   * @default false
   */
  compact?: boolean;
}

/**
 * NotificationItem - Individual notification display
 *
 * Shows notification content with avatar, icon, text, timestamp,
 * and action buttons.
 */
export function NotificationItem({
  notification,
  onRead,
  onDismiss,
  onClick,
  showDismiss = true,
  compact = false,
  className,
  ...props
}: NotificationItemProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  const handleClick = React.useCallback(() => {
    if (!notification.isRead) {
      onRead?.(notification.id);
    }
    onClick?.(notification.id);
  }, [notification.id, notification.isRead, onRead, onClick]);

  const handleDismiss = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDismiss?.(notification.id);
    },
    [notification.id, onDismiss],
  );

  const handleMarkAsRead = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onRead?.(notification.id);
    },
    [notification.id, onRead],
  );

  const typeIcon =
    NotificationIcon[notification.type] || NotificationIcon.system;
  const typeColor =
    typeColorClasses[notification.type] || typeColorClasses.system;

  return (
    <div
      className={cn(
        "relative flex cursor-pointer gap-3 px-4 py-3 transition-colors",
        "hover:bg-accent/50",
        !notification.isRead && "bg-accent/30",
        compact && "py-2",
        className,
      )}
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label={`Notification: ${notification.title}`}
      {...props}
    >
      {/* Unread indicator */}
      {!notification.isRead && (
        <div
          className="absolute left-1.5 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-primary"
          aria-label="Unread"
        />
      )}

      {/* Avatar or Icon */}
      <div className="flex-shrink-0">
        {notification.actor ? (
          <Avatar className={cn("h-10 w-10", compact && "h-8 w-8")}>
            <AvatarImage
              src={notification.actor.avatarUrl}
              alt={notification.actor.name}
            />
            <AvatarFallback>
              {getInitials(notification.actor.name)}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div
            className={cn(
              "flex items-center justify-center rounded-full",
              "h-10 w-10",
              compact && "h-8 w-8",
              typeColor,
            )}
          >
            {typeIcon}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {/* Title with type icon */}
            <div className="flex items-center gap-1.5">
              <span className={cn("flex-shrink-0", typeColor, "rounded p-0.5")}>
                {typeIcon}
              </span>
              <p
                className={cn(
                  "truncate text-sm font-medium text-foreground",
                  compact && "text-xs",
                )}
              >
                {notification.title}
              </p>
            </div>

            {/* Body */}
            <p
              className={cn(
                "mt-0.5 line-clamp-2 text-sm text-muted-foreground",
                compact && "line-clamp-1 text-xs",
              )}
            >
              {notification.body}
            </p>

            {/* Channel name if applicable */}
            {notification.channelName && (
              <p
                className={cn(
                  "mt-1 text-xs text-muted-foreground",
                  compact && "mt-0.5",
                )}
              >
                in #{notification.channelName}
              </p>
            )}
          </div>

          {/* Timestamp */}
          <span
            className={cn(
              "flex-shrink-0 text-xs text-muted-foreground",
              compact && "text-[10px]",
            )}
          >
            {formatRelativeTime(notification.createdAt)}
          </span>
        </div>
      </div>

      {/* Action buttons (shown on hover) */}
      {(isHovered || !notification.isRead) && (
        <div
          className={cn(
            "absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1",
            "opacity-0 transition-opacity",
            isHovered && "opacity-100",
          )}
        >
          {!notification.isRead && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleMarkAsRead}
              aria-label="Mark as read"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </Button>
          )}
          {showDismiss && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleDismiss}
              aria-label="Dismiss notification"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

NotificationItem.displayName = "NotificationItem";

export default NotificationItem;
