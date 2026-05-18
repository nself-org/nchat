/**
 * Notifications
 *
 * Provides native desktop notifications with web fallback.
 * Respects user notification settings and Do Not Disturb.
 */

import { logger } from "@/lib/logger";
import {
  isElectron,
  getElectronAPI,
  type NotificationOptions,
  type NotificationResult,
  type NotificationSettings,
} from "./electron-bridge";

/**
 * Show a native notification
 */
export async function showNotification(
  options: NotificationOptions,
): Promise<NotificationResult> {
  const api = getElectronAPI();
  if (api) {
    return api.notifications.show(options);
  }

  // Web fallback using Notification API
  if (!("Notification" in window)) {
    return { shown: false, reason: "no-support" };
  }

  if (Notification.permission === "denied") {
    return { shown: false, reason: "disabled" };
  }

  if (Notification.permission !== "granted") {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return { shown: false, reason: "disabled" };
    }
  }

  try {
    const notification = new Notification(options.title, {
      body: options.body,
      icon: options.icon,
      silent: options.silent,
      data: options.data,
    });

    // Handle click
    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    return { shown: true };
  } catch (error) {
    logger.error("Failed to show notification:", error);
    return { shown: false, reason: "error" };
  }
}

/**
 * Show a message notification
 */
export async function showMessageNotification(options: {
  senderName: string;
  message: string;
  channelName?: string;
  channelId?: string;
  dmId?: string;
  threadId?: string;
  avatar?: string;
}): Promise<NotificationResult> {
  const title = options.channelName
    ? `${options.senderName} in #${options.channelName}`
    : options.senderName;

  return showNotification({
    title,
    body: options.message,
    icon: options.avatar,
    data: {
      channelId: options.channelId,
      dmId: options.dmId,
      threadId: options.threadId,
      senderName: options.senderName,
    },
  });
}

/**
 * Show a mention notification
 */
export async function showMentionNotification(options: {
  senderName: string;
  message: string;
  channelName?: string;
  channelId?: string;
}): Promise<NotificationResult> {
  const title = options.channelName
    ? `${options.senderName} mentioned you in #${options.channelName}`
    : `${options.senderName} mentioned you`;

  return showNotification({
    title,
    body: options.message,
    data: {
      channelId: options.channelId,
      senderName: options.senderName,
      type: "mention",
    },
  });
}

/**
 * Get notification settings
 */
export async function getNotificationSettings(): Promise<NotificationSettings> {
  const api = getElectronAPI();
  if (api) {
    return api.notifications.getSettings();
  }

  // Web fallback - return default settings based on browser permission
  return {
    enabled: Notification.permission === "granted",
    sound: true,
    showPreview: true,
    doNotDisturb: false,
  };
}

/**
 * Update notification settings
 */
export async function setNotificationSettings(
  settings: Partial<NotificationSettings>,
): Promise<boolean> {
  const api = getElectronAPI();
  if (api) {
    return api.notifications.setSettings(settings);
  }

  // Web fallback - request permission if enabling
  if (settings.enabled && Notification.permission !== "granted") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  return true;
}

/**
 * Check if Do Not Disturb is active
 */
export async function isDndActive(): Promise<boolean> {
  const api = getElectronAPI();
  if (api) {
    return api.notifications.isDndActive();
  }
  return false;
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<
  "granted" | "denied" | "default"
> {
  if (!("Notification" in window)) {
    return "denied";
  }

  if (Notification.permission === "granted") {
    return "granted";
  }

  if (Notification.permission === "denied") {
    return "denied";
  }

  return Notification.requestPermission();
}

/**
 * Check if notifications are supported
 */
export function areNotificationsSupported(): boolean {
  const api = getElectronAPI();
  if (api) {
    return true; // Electron always supports notifications
  }
  return "Notification" in window;
}

/**
 * Get notification permission status
 */
export function getNotificationPermission():
  | "granted"
  | "denied"
  | "default"
  | "unsupported" {
  if (!("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

// ===== Tray Badge & Flash =====

/**
 * Set the unread count badge
 */
export async function setUnreadCount(count: number): Promise<boolean> {
  const api = getElectronAPI();
  if (api) {
    return api.tray.setUnreadCount(count);
  }

  // Web fallback - update document title or favicon
  if (count > 0) {
    const originalTitle = document.title.replace(/^\(\d+\) /, "");
    document.title = `(${count > 99 ? "99+" : count}) ${originalTitle}`;
  } else {
    document.title = document.title.replace(/^\(\d+\) /, "");
  }

  return true;
}

/**
 * Flash the taskbar/dock icon
 */
export async function flashFrame(flash: boolean): Promise<boolean> {
  const api = getElectronAPI();
  if (api) {
    return api.tray.flashFrame(flash);
  }

  // No web fallback available
  return false;
}

/**
 * Update the tray context menu
 */
export async function updateTrayMenu(): Promise<boolean> {
  const api = getElectronAPI();
  if (api) {
    return api.tray.updateMenu();
  }
  return false;
}
