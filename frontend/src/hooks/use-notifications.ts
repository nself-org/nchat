/**
 * useNotifications Hook
 *
 * Provides notification functionality including:
 * - Subscribe to notifications
 * - Request desktop permission
 * - Show desktop notifications
 * - Play notification sounds
 * - Mark notifications as read
 */

"use client";

import { useCallback, useEffect, useRef } from "react";
import { logger } from "@/lib/logger";
import {
  useNotificationStore,
  type Notification,
  type NotificationType,
} from "@/stores/notification-store";

// Notification sound URLs (can be customized)
const DEFAULT_SOUNDS: Record<NotificationType, string> = {
  mention: "/sounds/mention.mp3",
  direct_message: "/sounds/message.mp3",
  thread_reply: "/sounds/thread.mp3",
  reaction: "/sounds/reaction.mp3",
  channel_invite: "/sounds/invite.mp3",
  channel_update: "/sounds/update.mp3",
  system: "/sounds/system.mp3",
  announcement: "/sounds/announcement.mp3",
};

export interface UseNotificationsOptions {
  /**
   * Whether to automatically request desktop notification permission
   */
  autoRequestPermission?: boolean;

  /**
   * Custom sound URLs for different notification types
   */
  sounds?: Partial<Record<NotificationType, string>>;

  /**
   * Callback when a new notification is received
   */
  onNotification?: (notification: Notification) => void;
}

export interface UseNotificationsReturn {
  // State
  notifications: Notification[];
  unreadCount: number;
  hasNewNotifications: boolean;
  isLoading: boolean;
  error: string | null;
  desktopPermission: NotificationPermission | "default";

  // Actions
  requestDesktopPermission: () => Promise<NotificationPermission>;
  showDesktopNotification: (notification: Notification) => void;
  playSound: (type: NotificationType) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  dismissNotification: (id: string) => void;
  clearAll: () => void;

  // Preferences
  toggleDesktopNotifications: (enabled: boolean) => void;
  toggleSoundNotifications: (enabled: boolean) => void;
  setVolume: (volume: number) => void;
}

export function useNotifications(
  options: UseNotificationsOptions = {},
): UseNotificationsReturn {
  const {
    autoRequestPermission = false,
    sounds = {},
    onNotification,
  } = options;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousNotificationCount = useRef<number>(0);

  // Store state and actions
  const notifications = useNotificationStore((state) => state.notifications);
  const unreadCount = useNotificationStore((state) => state.unreadCounts.total);
  const isLoading = useNotificationStore((state) => state.isLoading);
  const error = useNotificationStore((state) => state.error);
  const desktopPermission = useNotificationStore(
    (state) => state.desktopPermission,
  );
  const preferences = useNotificationStore((state) => state.preferences);

  const markAsRead = useNotificationStore((state) => state.markAsRead);
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead);
  const removeNotification = useNotificationStore(
    (state) => state.removeNotification,
  );
  const clearAllNotifications = useNotificationStore(
    (state) => state.clearAllNotifications,
  );
  const setDesktopPermission = useNotificationStore(
    (state) => state.setDesktopPermission,
  );
  const updatePreferences = useNotificationStore(
    (state) => state.updatePreferences,
  );

  // Request desktop notification permission
  const requestDesktopPermission =
    useCallback(async (): Promise<NotificationPermission> => {
      if (typeof window === "undefined" || !("Notification" in window)) {
        return "denied";
      }

      if (Notification.permission === "granted") {
        setDesktopPermission("granted");
        return "granted";
      }

      if (Notification.permission !== "denied") {
        const permission = await Notification.requestPermission();
        setDesktopPermission(permission);
        return permission;
      }

      setDesktopPermission("denied");
      return "denied";
    }, [setDesktopPermission]);

  // Show desktop notification
  const showDesktopNotification = useCallback(
    (notification: Notification) => {
      if (typeof window === "undefined" || !("Notification" in window)) {
        return;
      }

      if (
        Notification.permission !== "granted" ||
        !preferences.desktopEnabled
      ) {
        return;
      }

      // Check if notification type is enabled
      const typeEnabled = {
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
        return;
      }

      // Check Do Not Disturb schedule
      if (preferences.dndSchedule.enabled) {
        const now = new Date();
        const currentDay = now.getDay();
        const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

        if (preferences.dndSchedule.days.includes(currentDay)) {
          const { startTime, endTime } = preferences.dndSchedule;

          // Handle overnight DND schedules
          if (startTime > endTime) {
            if (currentTime >= startTime || currentTime < endTime) {
              return; // In DND period
            }
          } else {
            if (currentTime >= startTime && currentTime < endTime) {
              return; // In DND period
            }
          }
        }
      }

      const desktopNotif = new Notification(notification.title, {
        body: preferences.showPreview
          ? notification.body
          : "You have a new notification",
        icon: notification.actor?.avatarUrl || "/favicon.ico",
        tag: notification.id,
        requireInteraction: notification.priority === "urgent",
        silent: !preferences.playSound,
      });

      desktopNotif.onclick = () => {
        window.focus();
        if (notification.actionUrl) {
          window.location.href = notification.actionUrl;
        }
        markAsRead(notification.id);
        desktopNotif.close();
      };

      // Auto-close after 5 seconds for non-urgent notifications
      if (notification.priority !== "urgent") {
        setTimeout(() => desktopNotif.close(), 5000);
      }
    },
    [preferences, markAsRead],
  );

  // Play notification sound
  const playSound = useCallback(
    (type: NotificationType) => {
      if (!preferences.soundEnabled || !preferences.playSound) {
        return;
      }

      // Check DND
      if (preferences.dndSchedule.enabled) {
        const now = new Date();
        const currentDay = now.getDay();
        const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

        if (preferences.dndSchedule.days.includes(currentDay)) {
          const { startTime, endTime } = preferences.dndSchedule;
          if (startTime > endTime) {
            if (currentTime >= startTime || currentTime < endTime) return;
          } else {
            if (currentTime >= startTime && currentTime < endTime) return;
          }
        }
      }

      const soundUrl =
        sounds[type] || preferences.customSoundUrl || DEFAULT_SOUNDS[type];

      if (!audioRef.current) {
        audioRef.current = new Audio();
      }

      audioRef.current.src = soundUrl;
      audioRef.current.volume = preferences.soundVolume / 100;
      audioRef.current.play().catch(() => {
        // Audio play failed (usually due to autoplay restrictions)
        logger.warn("Failed to play notification sound");
      });
    },
    [preferences, sounds],
  );

  // Toggle desktop notifications
  const toggleDesktopNotifications = useCallback(
    (enabled: boolean) => {
      updatePreferences({ desktopEnabled: enabled });
      if (enabled && desktopPermission !== "granted") {
        requestDesktopPermission();
      }
    },
    [updatePreferences, desktopPermission, requestDesktopPermission],
  );

  // Toggle sound notifications
  const toggleSoundNotifications = useCallback(
    (enabled: boolean) => {
      updatePreferences({ soundEnabled: enabled });
    },
    [updatePreferences],
  );

  // Set volume
  const setVolume = useCallback(
    (volume: number) => {
      updatePreferences({ soundVolume: Math.max(0, Math.min(100, volume)) });
    },
    [updatePreferences],
  );

  // Auto-request permission on mount if enabled
  useEffect(() => {
    if (
      autoRequestPermission &&
      typeof window !== "undefined" &&
      "Notification" in window
    ) {
      if (Notification.permission === "default") {
        requestDesktopPermission();
      } else {
        setDesktopPermission(Notification.permission);
      }
    }
  }, [autoRequestPermission, requestDesktopPermission, setDesktopPermission]);

  // Watch for new notifications and trigger callbacks
  useEffect(() => {
    const currentCount = notifications.length;
    if (
      currentCount > previousNotificationCount.current &&
      previousNotificationCount.current > 0
    ) {
      // New notification received
      const latestNotification = notifications[0];
      if (latestNotification && !latestNotification.isRead) {
        onNotification?.(latestNotification);

        // Show desktop notification
        showDesktopNotification(latestNotification);

        // Play sound
        playSound(latestNotification.type);
      }
    }
    previousNotificationCount.current = currentCount;
  }, [notifications, onNotification, showDesktopNotification, playSound]);

  // Check if there are new (unread) notifications
  const hasNewNotifications = notifications.some((n) => !n.isRead);

  return {
    // State
    notifications,
    unreadCount,
    hasNewNotifications,
    isLoading,
    error,
    desktopPermission,

    // Actions
    requestDesktopPermission,
    showDesktopNotification,
    playSound,
    markAsRead,
    markAllAsRead,
    dismissNotification: removeNotification,
    clearAll: clearAllNotifications,

    // Preferences
    toggleDesktopNotifications,
    toggleSoundNotifications,
    setVolume,
  };
}

export default useNotifications;
