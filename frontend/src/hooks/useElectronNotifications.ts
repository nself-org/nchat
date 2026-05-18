/**
 * useElectronNotifications Hook
 *
 * Hook for managing native desktop notifications.
 * Provides notification controls and settings management.
 */

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { logger } from "@/lib/logger";
import {
  isElectron,
  showNotification,
  showMessageNotification,
  showMentionNotification,
  getNotificationSettings,
  setNotificationSettings,
  isDndActive,
  requestNotificationPermission,
  areNotificationsSupported,
  getNotificationPermission,
  setUnreadCount,
  flashFrame,
  onNotificationAction,
  type NotificationOptions,
  type NotificationResult,
  type NotificationSettings,
  type NotificationActionPayload,
} from "@/lib/electron";

export interface UseElectronNotificationsReturn {
  /** Whether notifications are supported */
  isSupported: boolean;
  /** Notification permission status */
  permission: "granted" | "denied" | "default" | "unsupported";
  /** Current notification settings */
  settings: NotificationSettings | null;
  /** Whether Do Not Disturb is active */
  isDnd: boolean;
  /** Whether settings are loading */
  isLoading: boolean;
  /** Show a notification */
  notify: (options: NotificationOptions) => Promise<NotificationResult>;
  /** Show a message notification */
  notifyMessage: (options: {
    senderName: string;
    message: string;
    channelName?: string;
    channelId?: string;
    dmId?: string;
    avatar?: string;
  }) => Promise<NotificationResult>;
  /** Show a mention notification */
  notifyMention: (options: {
    senderName: string;
    message: string;
    channelName?: string;
    channelId?: string;
  }) => Promise<NotificationResult>;
  /** Request notification permission */
  requestPermission: () => Promise<"granted" | "denied" | "default">;
  /** Update notification settings */
  updateSettings: (settings: Partial<NotificationSettings>) => Promise<void>;
  /** Set unread count badge */
  setBadge: (count: number) => Promise<void>;
  /** Flash the taskbar/dock */
  flash: (flash: boolean) => Promise<void>;
}

/**
 * Hook for managing desktop notifications
 *
 * @example
 * ```tsx
 * const { notify, notifyMessage, settings, updateSettings } = useElectronNotifications();
 *
 * // Show a simple notification
 * await notify({ title: 'Hello', body: 'World' });
 *
 * // Show a message notification
 * await notifyMessage({
 *   senderName: 'Alice',
 *   message: 'Hey there!',
 *   channelName: 'general'
 * });
 * ```
 */
export function useElectronNotifications(): UseElectronNotificationsReturn {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [isDnd, setIsDnd] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check support and permission
  const isSupported = useMemo(() => areNotificationsSupported(), []);
  const permission = useMemo(() => getNotificationPermission(), []);

  // Load settings
  useEffect(() => {
    async function load() {
      try {
        const [notificationSettings, dndActive] = await Promise.all([
          getNotificationSettings(),
          isDndActive(),
        ]);
        setSettings(notificationSettings);
        setIsDnd(dndActive);
      } catch (error) {
        logger.error("Failed to load notification settings:", error);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  // Notification methods
  const notify = useCallback(async (options: NotificationOptions) => {
    return showNotification(options);
  }, []);

  const notifyMessage = useCallback(
    async (options: {
      senderName: string;
      message: string;
      channelName?: string;
      channelId?: string;
      dmId?: string;
      avatar?: string;
    }) => {
      return showMessageNotification(options);
    },
    [],
  );

  const notifyMention = useCallback(
    async (options: {
      senderName: string;
      message: string;
      channelName?: string;
      channelId?: string;
    }) => {
      return showMentionNotification(options);
    },
    [],
  );

  const requestPermission = useCallback(async () => {
    return requestNotificationPermission();
  }, []);

  const updateSettings = useCallback(
    async (newSettings: Partial<NotificationSettings>) => {
      await setNotificationSettings(newSettings);
      setSettings((prev) => (prev ? { ...prev, ...newSettings } : null));
    },
    [],
  );

  const setBadge = useCallback(async (count: number) => {
    await setUnreadCount(count);
  }, []);

  const flash = useCallback(async (shouldFlash: boolean) => {
    await flashFrame(shouldFlash);
  }, []);

  return useMemo(
    () => ({
      isSupported,
      permission,
      settings,
      isDnd,
      isLoading,
      notify,
      notifyMessage,
      notifyMention,
      requestPermission,
      updateSettings,
      setBadge,
      flash,
    }),
    [
      isSupported,
      permission,
      settings,
      isDnd,
      isLoading,
      notify,
      notifyMessage,
      notifyMention,
      requestPermission,
      updateSettings,
      setBadge,
      flash,
    ],
  );
}

/**
 * Hook to handle notification action events
 */
export function useNotificationActions(
  handler: (action: NotificationActionPayload) => void,
): void {
  useEffect(() => {
    if (!isElectron()) return;
    return onNotificationAction(handler);
  }, [handler]);
}

/**
 * Hook to manage unread count badge
 */
export function useUnreadBadge(): {
  count: number;
  setCount: (count: number) => void;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
} {
  const [count, setCountState] = useState(0);

  const setCount = useCallback(async (newCount: number) => {
    const value = Math.max(0, newCount);
    setCountState(value);
    await setUnreadCount(value);
  }, []);

  const increment = useCallback(async () => {
    setCountState((prev) => {
      const newCount = prev + 1;
      setUnreadCount(newCount);
      return newCount;
    });
  }, []);

  const decrement = useCallback(async () => {
    setCountState((prev) => {
      const newCount = Math.max(0, prev - 1);
      setUnreadCount(newCount);
      return newCount;
    });
  }, []);

  const reset = useCallback(async () => {
    setCountState(0);
    await setUnreadCount(0);
  }, []);

  return { count, setCount, increment, decrement, reset };
}

/**
 * Hook for Do Not Disturb status
 */
export function useDoNotDisturb(): {
  isActive: boolean;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
  toggle: () => Promise<void>;
  setSchedule: (
    start: string | undefined,
    end: string | undefined,
  ) => Promise<void>;
} {
  const [isActive, setIsActive] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);

  useEffect(() => {
    async function load() {
      const [active, notificationSettings] = await Promise.all([
        isDndActive(),
        getNotificationSettings(),
      ]);
      setIsActive(active);
      setSettings(notificationSettings);
    }
    load();
  }, []);

  const enable = useCallback(async () => {
    await setNotificationSettings({ doNotDisturb: true });
    setIsActive(true);
    setSettings((prev) => (prev ? { ...prev, doNotDisturb: true } : null));
  }, []);

  const disable = useCallback(async () => {
    await setNotificationSettings({ doNotDisturb: false });
    setIsActive(await isDndActive());
    setSettings((prev) => (prev ? { ...prev, doNotDisturb: false } : null));
  }, []);

  const toggle = useCallback(async () => {
    if (settings?.doNotDisturb) {
      await disable();
    } else {
      await enable();
    }
  }, [settings, enable, disable]);

  const setSchedule = useCallback(
    async (start: string | undefined, end: string | undefined) => {
      await setNotificationSettings({
        doNotDisturbStart: start,
        doNotDisturbEnd: end,
      });
      setIsActive(await isDndActive());
      setSettings((prev) =>
        prev
          ? { ...prev, doNotDisturbStart: start, doNotDisturbEnd: end }
          : null,
      );
    },
    [],
  );

  return { isActive, enable, disable, toggle, setSchedule };
}

export default useElectronNotifications;
