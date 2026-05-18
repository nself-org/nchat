/**
 * useNotifications Hook
 *
 * Manages real-time notifications including subscribing to user's notifications,
 * desktop notification integration, sound notifications, and unread count updates.
 */

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { on, off, emit, isConnected } from "../client";
import { logger } from "@/lib/logger";
import {
  SocketEvents,
  type NotificationEvent,
  type NotificationReadEvent,
  type NotificationReadAllEvent,
} from "../events";

// Default notification sound URL
const DEFAULT_NOTIFICATION_SOUND = "/sounds/notification.mp3";

// Default desktop notification icon
const DEFAULT_NOTIFICATION_ICON = "/icons/icon-192.png";

export interface UseNotificationsOptions {
  /**
   * Current user ID
   */
  userId?: string;

  /**
   * Enable desktop notifications
   * @default true
   */
  enableDesktop?: boolean;

  /**
   * Enable sound notifications
   * @default true
   */
  enableSound?: boolean;

  /**
   * Custom notification sound URL
   */
  soundUrl?: string;

  /**
   * Maximum notifications to keep in memory
   * @default 100
   */
  maxNotifications?: number;

  /**
   * Callback when new notification is received
   */
  onNotification?: (notification: NotificationEvent) => void;

  /**
   * Callback when unread count changes
   */
  onUnreadCountChange?: (count: number) => void;
}

export interface UseNotificationsReturn {
  /**
   * List of notifications
   */
  notifications: NotificationEvent[];

  /**
   * Number of unread notifications
   */
  unreadCount: number;

  /**
   * Whether there are new unread notifications
   */
  hasNewNotifications: boolean;

  /**
   * Mark a notification as read
   */
  markAsRead: (notificationId: string) => void;

  /**
   * Mark all notifications as read
   */
  markAllAsRead: () => void;

  /**
   * Clear all notifications from local state
   */
  clearNotifications: () => void;

  /**
   * Request desktop notification permission
   */
  requestPermission: () => Promise<NotificationPermission>;

  /**
   * Current desktop notification permission
   */
  permission: NotificationPermission | "unsupported";

  /**
   * Toggle desktop notifications
   */
  toggleDesktop: (enabled: boolean) => void;

  /**
   * Toggle sound notifications
   */
  toggleSound: (enabled: boolean) => void;

  /**
   * Whether desktop notifications are enabled
   */
  desktopEnabled: boolean;

  /**
   * Whether sound notifications are enabled
   */
  soundEnabled: boolean;
}

/**
 * Play notification sound
 */
function playNotificationSound(soundUrl: string): void {
  try {
    const audio = new Audio(soundUrl);
    audio.volume = 0.5;
    audio.play().catch((err) => {
      logger.warn("[Notifications] Failed to play sound:", {
        error: err instanceof Error ? err.message : String(err),
      });
    });
  } catch (err) {
    logger.warn("[Notifications] Failed to create audio:", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Show desktop notification
 */
function showDesktopNotification(
  notification: NotificationEvent,
  onClick?: (notification: NotificationEvent) => void,
): void {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return;
  }

  if (Notification.permission !== "granted") {
    return;
  }

  try {
    const desktopNotification = new Notification(notification.title, {
      body: notification.body,
      icon: notification.iconUrl || DEFAULT_NOTIFICATION_ICON,
      tag: notification.id,
      requireInteraction: false,
      silent: true, // We handle sound separately
      // image is part of the Notifications API but not in TS types
      ...(notification.imageUrl && { image: notification.imageUrl }),
    } as NotificationOptions);

    desktopNotification.onclick = () => {
      window.focus();
      desktopNotification.close();
      onClick?.(notification);
    };

    // Auto-close after 5 seconds
    setTimeout(() => {
      desktopNotification.close();
    }, 5000);
  } catch (err) {
    logger.warn("[Notifications] Failed to show desktop notification:", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Hook for managing real-time notifications
 */
export function useNotifications(
  options: UseNotificationsOptions = {},
): UseNotificationsReturn {
  const {
    userId,
    enableDesktop = true,
    enableSound = true,
    soundUrl = DEFAULT_NOTIFICATION_SOUND,
    maxNotifications = 100,
    onNotification,
    onUnreadCountChange,
  } = options;

  const [notifications, setNotifications] = useState<NotificationEvent[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [desktopEnabled, setDesktopEnabled] = useState(enableDesktop);
  const [soundEnabled, setSoundEnabled] = useState(enableSound);
  const [permission, setPermission] = useState<
    NotificationPermission | "unsupported"
  >("default");

  // Refs for callbacks
  const onNotificationRef = useRef(onNotification);
  const onUnreadCountChangeRef = useRef(onUnreadCountChange);

  useEffect(() => {
    onNotificationRef.current = onNotification;
    onUnreadCountChangeRef.current = onUnreadCountChange;
  }, [onNotification, onUnreadCountChange]);

  // Check notification permission on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    } else {
      setPermission("unsupported");
    }
  }, []);

  // Request desktop notification permission
  const requestPermission =
    useCallback(async (): Promise<NotificationPermission> => {
      if (typeof window === "undefined" || !("Notification" in window)) {
        return "denied";
      }

      try {
        const result = await Notification.requestPermission();
        setPermission(result);
        return result;
      } catch (err) {
        logger.warn("[Notifications] Failed to request permission:", {
          context: err,
        });
        return "denied";
      }
    }, []);

  // Update unread count
  const updateUnreadCount = useCallback((count: number) => {
    setUnreadCount(count);
    onUnreadCountChangeRef.current?.(count);

    // Update document title badge
    if (typeof document !== "undefined") {
      const baseTitle = document.title.replace(/^\(\d+\)\s*/, "");
      document.title = count > 0 ? `(${count}) ${baseTitle}` : baseTitle;
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback((notificationId: string) => {
    if (isConnected()) {
      emit(SocketEvents.NOTIFICATION_READ, { notificationId });
    }

    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n)),
    );

    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    if (isConnected()) {
      emit(SocketEvents.NOTIFICATION_READ_ALL);
    }

    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    updateUnreadCount(0);
  }, [updateUnreadCount]);

  // Clear all notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
    updateUnreadCount(0);
  }, [updateUnreadCount]);

  // Toggle desktop notifications
  const toggleDesktop = useCallback(
    (enabled: boolean) => {
      setDesktopEnabled(enabled);
      if (enabled && permission === "default") {
        requestPermission();
      }
    },
    [permission, requestPermission],
  );

  // Toggle sound notifications
  const toggleSound = useCallback((enabled: boolean) => {
    setSoundEnabled(enabled);
  }, []);

  // Handle incoming notifications
  useEffect(() => {
    const handleNewNotification = (notification: NotificationEvent) => {
      // Add to notifications list
      setNotifications((prev) => {
        const next = [notification, ...prev];
        // Trim to max notifications
        return next.slice(0, maxNotifications);
      });

      // Update unread count if not read
      if (!notification.isRead) {
        setUnreadCount((prev) => {
          const newCount = prev + 1;
          onUnreadCountChangeRef.current?.(newCount);
          return newCount;
        });
      }

      // Show desktop notification
      if (desktopEnabled && !document.hasFocus()) {
        showDesktopNotification(notification, onNotificationRef.current);
      }

      // Play sound
      if (soundEnabled) {
        playNotificationSound(soundUrl);
      }

      // Trigger callback
      onNotificationRef.current?.(notification);
    };

    const handleNotificationRead = (event: NotificationReadEvent) => {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === event.notificationId ? { ...n, isRead: true } : n,
        ),
      );
    };

    const handleNotificationReadAll = (event: NotificationReadAllEvent) => {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      updateUnreadCount(0);
    };

    on(SocketEvents.NOTIFICATION_NEW, handleNewNotification);
    on(SocketEvents.NOTIFICATION_READ, handleNotificationRead);
    on(SocketEvents.NOTIFICATION_READ_ALL, handleNotificationReadAll);

    return () => {
      off(SocketEvents.NOTIFICATION_NEW, handleNewNotification);
      off(SocketEvents.NOTIFICATION_READ, handleNotificationRead);
      off(SocketEvents.NOTIFICATION_READ_ALL, handleNotificationReadAll);
    };
  }, [
    maxNotifications,
    desktopEnabled,
    soundEnabled,
    soundUrl,
    updateUnreadCount,
  ]);

  return {
    notifications,
    unreadCount,
    hasNewNotifications: unreadCount > 0,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    requestPermission,
    permission,
    toggleDesktop,
    toggleSound,
    desktopEnabled,
    soundEnabled,
  };
}

/**
 * Hook for badge/unread count only (lightweight)
 */
export function useUnreadCount(): {
  count: number;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
} {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const handleNewNotification = (notification: NotificationEvent) => {
      if (!notification.isRead) {
        setCount((prev) => prev + 1);
      }
    };

    const handleNotificationRead = () => {
      setCount((prev) => Math.max(0, prev - 1));
    };

    const handleNotificationReadAll = () => {
      setCount(0);
    };

    on(SocketEvents.NOTIFICATION_NEW, handleNewNotification);
    on(SocketEvents.NOTIFICATION_READ, handleNotificationRead);
    on(SocketEvents.NOTIFICATION_READ_ALL, handleNotificationReadAll);

    return () => {
      off(SocketEvents.NOTIFICATION_NEW, handleNewNotification);
      off(SocketEvents.NOTIFICATION_READ, handleNotificationRead);
      off(SocketEvents.NOTIFICATION_READ_ALL, handleNotificationReadAll);
    };
  }, []);

  const increment = useCallback(() => setCount((prev) => prev + 1), []);
  const decrement = useCallback(
    () => setCount((prev) => Math.max(0, prev - 1)),
    [],
  );
  const reset = useCallback(() => setCount(0), []);

  return { count, increment, decrement, reset };
}

/**
 * Hook for notification preferences
 */
export interface NotificationPreferences {
  desktop: boolean;
  sound: boolean;
  mentions: boolean;
  directMessages: boolean;
  threadReplies: boolean;
  channelMessages: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  desktop: true,
  sound: true,
  mentions: true,
  directMessages: true,
  threadReplies: true,
  channelMessages: false,
};

export function useNotificationPreferences(): {
  preferences: NotificationPreferences;
  updatePreferences: (updates: Partial<NotificationPreferences>) => void;
  resetPreferences: () => void;
} {
  const [preferences, setPreferences] =
    useState<NotificationPreferences>(DEFAULT_PREFERENCES);

  // Load preferences from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("nchat-notification-preferences");
        if (stored) {
          setPreferences({ ...DEFAULT_PREFERENCES, ...JSON.parse(stored) });
        }
      } catch (err) {
        logger.warn("[Notifications] Failed to load preferences:", {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }, []);

  const updatePreferences = useCallback(
    (updates: Partial<NotificationPreferences>) => {
      setPreferences((prev) => {
        const next = { ...prev, ...updates };
        // Save to localStorage
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(
              "nchat-notification-preferences",
              JSON.stringify(next),
            );
          } catch (err) {
            logger.warn("[Notifications] Failed to save preferences:", {
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }
        return next;
      });
    },
    [],
  );

  const resetPreferences = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
    if (typeof window !== "undefined") {
      localStorage.removeItem("nchat-notification-preferences");
    }
  }, []);

  return { preferences, updatePreferences, resetPreferences };
}

export default useNotifications;
