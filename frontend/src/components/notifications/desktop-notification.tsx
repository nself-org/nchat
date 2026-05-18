"use client";

import * as React from "react";
import { logger } from "@/lib/logger";
import {
  useNotificationStore,
  type Notification,
  type NotificationType,
} from "@/stores/notification-store";

// Default icons for different notification types
const DEFAULT_ICON = "/favicon.ico";

export interface DesktopNotificationOptions {
  /**
   * The notification title
   */
  title: string;

  /**
   * The notification body text
   */
  body: string;

  /**
   * Icon URL to display
   */
  icon?: string;

  /**
   * Tag for grouping/replacing notifications
   */
  tag?: string;

  /**
   * Whether the notification requires user interaction to dismiss
   */
  requireInteraction?: boolean;

  /**
   * Whether the notification should be silent
   */
  silent?: boolean;

  /**
   * Custom data to attach to the notification
   */
  data?: Record<string, unknown>;

  /**
   * Callback when notification is clicked
   */
  onClick?: () => void;

  /**
   * Callback when notification is closed
   */
  onClose?: () => void;

  /**
   * Callback when notification shows an error
   */
  onError?: (error: Error) => void;
}

export interface UseDesktopNotificationReturn {
  /**
   * Current permission status
   */
  permission: NotificationPermission | "default";

  /**
   * Whether desktop notifications are supported
   */
  isSupported: boolean;

  /**
   * Request permission to show notifications
   */
  requestPermission: () => Promise<NotificationPermission>;

  /**
   * Show a desktop notification
   */
  showNotification: (
    options: DesktopNotificationOptions,
  ) => globalThis.Notification | null;

  /**
   * Show a notification from the store notification object
   */
  showFromNotification: (
    notification: Notification,
  ) => globalThis.Notification | null;
}

/**
 * useDesktopNotification Hook
 *
 * Provides desktop notification functionality:
 * - Request permission
 * - Show notifications
 * - Handle click events
 * - Respect user preferences
 */
export function useDesktopNotification(): UseDesktopNotificationReturn {
  const permission = useNotificationStore((state) => state.desktopPermission);
  const setDesktopPermission = useNotificationStore(
    (state) => state.setDesktopPermission,
  );
  const preferences = useNotificationStore((state) => state.preferences);
  const markAsRead = useNotificationStore((state) => state.markAsRead);

  const isSupported = typeof window !== "undefined" && "Notification" in window;

  // Sync permission state on mount
  React.useEffect(() => {
    if (isSupported) {
      setDesktopPermission(Notification.permission);
    }
  }, [isSupported, setDesktopPermission]);

  // Request permission
  const requestPermission =
    React.useCallback(async (): Promise<NotificationPermission> => {
      if (!isSupported) {
        return "denied";
      }

      if (Notification.permission === "granted") {
        setDesktopPermission("granted");
        return "granted";
      }

      if (Notification.permission !== "denied") {
        const result = await Notification.requestPermission();
        setDesktopPermission(result);
        return result;
      }

      setDesktopPermission("denied");
      return "denied";
    }, [isSupported, setDesktopPermission]);

  // Check if DND is active
  const isDndActive = React.useCallback((): boolean => {
    if (!preferences.dndSchedule.enabled) return false;

    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

    if (!preferences.dndSchedule.days.includes(currentDay)) {
      return false;
    }

    const { startTime, endTime } = preferences.dndSchedule;

    // Handle overnight DND schedules
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime < endTime;
    }

    return currentTime >= startTime && currentTime < endTime;
  }, [preferences.dndSchedule]);

  // Show notification
  const showNotification = React.useCallback(
    (options: DesktopNotificationOptions): globalThis.Notification | null => {
      if (
        !isSupported ||
        permission !== "granted" ||
        !preferences.desktopEnabled
      ) {
        return null;
      }

      if (isDndActive()) {
        return null;
      }

      try {
        const notification = new Notification(options.title, {
          body: preferences.showPreview
            ? options.body
            : "You have a new notification",
          icon: options.icon || DEFAULT_ICON,
          tag: options.tag,
          requireInteraction: options.requireInteraction ?? false,
          silent: options.silent ?? !preferences.playSound,
          data: options.data,
        });

        notification.onclick = () => {
          window.focus();
          options.onClick?.();
          notification.close();
        };

        notification.onclose = () => {
          options.onClose?.();
        };

        notification.onerror = (event) => {
          options.onError?.(new Error("Desktop notification error"));
          logger.error("Desktop notification error:", event);
        };

        return notification;
      } catch (error) {
        logger.error("Failed to show desktop notification:", error);
        options.onError?.(error as Error);
        return null;
      }
    },
    [isSupported, permission, preferences, isDndActive],
  );

  // Show notification from store notification object
  const showFromNotification = React.useCallback(
    (notification: Notification): globalThis.Notification | null => {
      // Check if notification type is enabled
      const typeEnabled: Record<NotificationType, boolean> = {
        mention: preferences.mentionsEnabled,
        direct_message: preferences.directMessagesEnabled,
        thread_reply: preferences.threadRepliesEnabled,
        reaction: preferences.reactionsEnabled,
        channel_invite: true,
        channel_update: true,
        system: true,
        announcement: true,
      };

      if (!typeEnabled[notification.type]) {
        return null;
      }

      return showNotification({
        title: notification.title,
        body: notification.body,
        icon: notification.actor?.avatarUrl || DEFAULT_ICON,
        tag: notification.id,
        requireInteraction: notification.priority === "urgent",
        data: {
          notificationId: notification.id,
          channelId: notification.channelId,
          messageId: notification.messageId,
          threadId: notification.threadId,
          actionUrl: notification.actionUrl,
        },
        onClick: () => {
          markAsRead(notification.id);
          if (notification.actionUrl) {
            window.location.href = notification.actionUrl;
          }
        },
      });
    },
    [preferences, showNotification, markAsRead],
  );

  return {
    permission,
    isSupported,
    requestPermission,
    showNotification,
    showFromNotification,
  };
}

/**
 * DesktopNotificationPermissionButton
 *
 * A button component to request desktop notification permission
 */
export interface DesktopNotificationPermissionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Callback when permission is granted
   */
  onGranted?: () => void;

  /**
   * Callback when permission is denied
   */
  onDenied?: () => void;
}

export function DesktopNotificationPermissionButton({
  onGranted,
  onDenied,
  children,
  ...props
}: DesktopNotificationPermissionButtonProps) {
  const { permission, isSupported, requestPermission } =
    useDesktopNotification();

  const handleClick = React.useCallback(async () => {
    const result = await requestPermission();
    if (result === "granted") {
      onGranted?.();
    } else {
      onDenied?.();
    }
  }, [requestPermission, onGranted, onDenied]);

  if (!isSupported) {
    return null;
  }

  if (permission === "granted") {
    return null;
  }

  if (permission === "denied") {
    return (
      <button {...props} disabled title="Notification permission was denied">
        {children || "Notifications blocked"}
      </button>
    );
  }

  return (
    <button {...props} onClick={handleClick}>
      {children || "Enable notifications"}
    </button>
  );
}

useDesktopNotification.displayName = "useDesktopNotification";
DesktopNotificationPermissionButton.displayName =
  "DesktopNotificationPermissionButton";

export default useDesktopNotification;
