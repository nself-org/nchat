"use client";

import { useState, useEffect, useCallback } from "react";
import {
  isNotificationAvailable,
  requestNotificationPermission,
  isNotificationPermissionGranted,
  showNotification,
  showMessageNotification,
  showMentionNotification,
  showDirectMessageNotification,
  showSystemNotification,
  type NotificationOptions,
  type NotificationPermission,
} from "@/lib/tauri";
import { useTauriCheck } from "./useTauri";

import { logger } from "@/lib/logger";

/**
 * Hook for managing native notifications
 */
export function useNativeNotifications() {
  const isTauri = useTauriCheck();
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const [isLoading, setIsLoading] = useState(true);

  // Check permission on mount
  useEffect(() => {
    let mounted = true;

    async function checkPermission() {
      try {
        const granted = await isNotificationPermissionGranted();
        if (mounted) {
          setPermission(granted ? "granted" : "default");
        }
      } catch (error) {
        logger.error("Failed to check notification permission:", error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    checkPermission();

    return () => {
      mounted = false;
    };
  }, []);

  const requestPermission = useCallback(async () => {
    try {
      const result = await requestNotificationPermission();
      setPermission(result);
      return result;
    } catch (error) {
      logger.error("Failed to request notification permission:", error);
      return "denied" as NotificationPermission;
    }
  }, []);

  const notify = useCallback(
    async (options: NotificationOptions) => {
      if (permission !== "granted") {
        const result = await requestPermission();
        if (result !== "granted") {
          logger.warn("Notification permission not granted");
          return;
        }
      }
      await showNotification(options);
    },
    [permission, requestPermission],
  );

  const notifyMessage = useCallback(
    async (
      senderName: string,
      message: string,
      channelName?: string,
      avatarUrl?: string,
    ) => {
      if (permission !== "granted") {
        const result = await requestPermission();
        if (result !== "granted") {
          return;
        }
      }
      await showMessageNotification(
        senderName,
        message,
        channelName,
        avatarUrl,
      );
    },
    [permission, requestPermission],
  );

  const notifyMention = useCallback(
    async (senderName: string, message: string, channelName?: string) => {
      if (permission !== "granted") {
        const result = await requestPermission();
        if (result !== "granted") {
          return;
        }
      }
      await showMentionNotification(senderName, message, channelName);
    },
    [permission, requestPermission],
  );

  const notifyDirectMessage = useCallback(
    async (senderName: string, message: string, avatarUrl?: string) => {
      if (permission !== "granted") {
        const result = await requestPermission();
        if (result !== "granted") {
          return;
        }
      }
      await showDirectMessageNotification(senderName, message, avatarUrl);
    },
    [permission, requestPermission],
  );

  const notifySystem = useCallback(
    async (title: string, body: string) => {
      if (permission !== "granted") {
        const result = await requestPermission();
        if (result !== "granted") {
          return;
        }
      }
      await showSystemNotification(title, body);
    },
    [permission, requestPermission],
  );

  return {
    permission,
    isLoading,
    isAvailable: isNotificationAvailable(),
    isGranted: permission === "granted",
    requestPermission,
    notify,
    notifyMessage,
    notifyMention,
    notifyDirectMessage,
    notifySystem,
  };
}

export default useNativeNotifications;
