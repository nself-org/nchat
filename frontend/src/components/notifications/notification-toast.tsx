"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { NotificationType } from "@/stores/notification-store";

// Get initials from name
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// Type color mapping for accent
const typeAccentColors: Record<NotificationType, string> = {
  mention: "border-l-yellow-500",
  direct_message: "border-l-blue-500",
  thread_reply: "border-l-purple-500",
  reaction: "border-l-pink-500",
  channel_invite: "border-l-green-500",
  channel_update: "border-l-cyan-500",
  system: "border-l-gray-500",
  announcement: "border-l-orange-500",
};

export interface NotificationToastProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Notification data
   */
  notification: {
    id: string;
    type: NotificationType;
    title: string;
    body: string;
    actor?: {
      name: string;
      avatarUrl?: string;
    };
    channelName?: string;
  };

  /**
   * Duration in milliseconds before auto-dismiss
   * Set to 0 to disable auto-dismiss
   * @default 5000
   */
  duration?: number;

  /**
   * Callback when toast is closed
   */
  onClose?: () => void;

  /**
   * Callback when toast is clicked
   */
  onClick?: () => void;

  /**
   * Whether to show the close button
   * @default true
   */
  showClose?: boolean;

  /**
   * Whether toast is visible (for animation control)
   * @default true
   */
  visible?: boolean;
}

/**
 * NotificationToast - Individual toast notification
 *
 * A styled toast component for displaying notifications.
 * Can be used standalone or with a toast manager.
 */
export function NotificationToast({
  notification,
  duration = 5000,
  onClose,
  onClick,
  showClose = true,
  visible = true,
  className,
  ...props
}: NotificationToastProps) {
  const [isExiting, setIsExiting] = React.useState(false);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = React.useRef<number>(Date.now());
  const remainingRef = React.useRef<number>(duration);

  // Handle close with exit animation
  const handleClose = React.useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onClose?.();
    }, 200); // Match animation duration
  }, [onClose]);

  // Handle click
  const handleClick = React.useCallback(() => {
    onClick?.();
    handleClose();
  }, [onClick, handleClose]);

  // Auto-dismiss timer
  React.useEffect(() => {
    if (duration > 0 && visible && !isExiting) {
      startTimeRef.current = Date.now();

      timeoutRef.current = setTimeout(() => {
        handleClose();
      }, remainingRef.current);

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }
  }, [duration, visible, isExiting, handleClose]);

  // Pause timer on hover
  const handleMouseEnter = React.useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      remainingRef.current -= Date.now() - startTimeRef.current;
    }
  }, []);

  // Resume timer on mouse leave
  const handleMouseLeave = React.useCallback(() => {
    if (duration > 0 && remainingRef.current > 0) {
      startTimeRef.current = Date.now();
      timeoutRef.current = setTimeout(() => {
        handleClose();
      }, remainingRef.current);
    }
  }, [duration, handleClose]);

  const accentColor =
    typeAccentColors[notification.type] || typeAccentColors.system;

  return (
    <div
      className={cn(
        "w-[360px] overflow-hidden rounded-lg border border-border bg-background shadow-lg",
        "border-l-4",
        accentColor,
        "transform transition-all duration-200 ease-out",
        visible && !isExiting
          ? "translate-x-0 opacity-100"
          : "translate-x-full opacity-0",
        "cursor-pointer",
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
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      aria-live="polite"
      {...props}
    >
      <div className="p-4">
        <div className="flex gap-3">
          {/* Avatar */}
          {notification.actor && (
            <Avatar className="h-10 w-10 flex-shrink-0">
              <AvatarImage
                src={notification.actor.avatarUrl}
                alt={notification.actor.name}
              />
              <AvatarFallback>
                {getInitials(notification.actor.name)}
              </AvatarFallback>
            </Avatar>
          )}

          {/* Content */}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {notification.title}
                </p>
                <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                  {notification.body}
                </p>
                {notification.channelName && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    in #{notification.channelName}
                  </p>
                )}
              </div>

              {/* Close button */}
              {showClose && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="-mr-2 -mt-1 h-6 w-6 flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClose();
                  }}
                  aria-label="Close notification"
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
          </div>
        </div>
      </div>

      {/* Progress bar (auto-dismiss indicator) */}
      {duration > 0 && (
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-100 ease-linear"
            style={{
              width: "100%",
              animation: `shrink ${duration}ms linear forwards`,
            }}
          />
        </div>
      )}

      <style jsx>{`
        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * NotificationToastContainer - Container for managing multiple toasts
 */
export interface ToastItem {
  id: string;
  notification: NotificationToastProps["notification"];
  duration?: number;
}

export interface NotificationToastContainerProps {
  /**
   * Position of the toast container
   * @default 'top-right'
   */
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";

  /**
   * Maximum number of toasts to show
   * @default 5
   */
  maxToasts?: number;

  /**
   * Toasts to display
   */
  toasts: ToastItem[];

  /**
   * Callback when a toast is dismissed
   */
  onDismiss: (id: string) => void;

  /**
   * Callback when a toast is clicked
   */
  onToastClick?: (id: string) => void;
}

const positionClasses = {
  "top-left": "top-4 left-4",
  "top-right": "top-4 right-4",
  "bottom-left": "bottom-4 left-4",
  "bottom-right": "bottom-4 right-4",
};

export function NotificationToastContainer({
  position = "top-right",
  maxToasts = 5,
  toasts,
  onDismiss,
  onToastClick,
}: NotificationToastContainerProps) {
  const visibleToasts = toasts.slice(0, maxToasts);
  const isBottom = position.startsWith("bottom");

  return (
    <div
      className={cn(
        "pointer-events-none fixed z-50 flex flex-col gap-2",
        positionClasses[position],
        isBottom && "flex-col-reverse",
      )}
      aria-live="polite"
      aria-label="Notifications"
    >
      {visibleToasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <NotificationToast
            notification={toast.notification}
            duration={toast.duration}
            onClose={() => onDismiss(toast.id)}
            onClick={() => onToastClick?.(toast.id)}
          />
        </div>
      ))}
    </div>
  );
}

NotificationToast.displayName = "NotificationToast";
NotificationToastContainer.displayName = "NotificationToastContainer";

export default NotificationToast;
