/**
 * Native Notifications - Handles native notification integration
 *
 * This module provides utilities for sending native notifications
 * in Tauri desktop apps with fallback to web notifications.
 */

import { invoke, invokeOrFallback, isTauri } from "./tauri-bridge";

export interface NotificationOptions {
  title: string;
  body?: string;
  icon?: string;
  sound?: string;
}

export type NotificationPermission = "granted" | "denied" | "default";

/**
 * Check if notifications are available
 */
export function isNotificationAvailable(): boolean {
  if (isTauri()) {
    return true;
  }
  return typeof window !== "undefined" && "Notification" in window;
}

/**
 * Request notification permission
 */
export async function requestPermission(): Promise<NotificationPermission> {
  if (isTauri()) {
    try {
      const result = await invoke<string>("request_notification_permission");
      return result as NotificationPermission;
    } catch {
      return "denied";
    }
  }

  // Web fallback
  if (typeof window !== "undefined" && "Notification" in window) {
    const permission = await Notification.requestPermission();
    return permission;
  }

  return "denied";
}

/**
 * Check if notifications are permitted
 */
export async function isPermissionGranted(): Promise<boolean> {
  if (isTauri()) {
    try {
      return await invoke<boolean>("is_notification_permitted");
    } catch {
      return false;
    }
  }

  // Web fallback
  if (typeof window !== "undefined" && "Notification" in window) {
    return Notification.permission === "granted";
  }

  return false;
}

/**
 * Show a notification
 */
export async function showNotification(
  options: NotificationOptions,
): Promise<void> {
  if (isTauri()) {
    return invoke("show_notification", { options });
  }

  // Web fallback
  if (typeof window !== "undefined" && "Notification" in window) {
    if (Notification.permission === "granted") {
      new Notification(options.title, {
        body: options.body,
        icon: options.icon,
      });
    } else if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        new Notification(options.title, {
          body: options.body,
          icon: options.icon,
        });
      }
    }
  }
}

/**
 * Show a chat message notification
 */
export async function showMessageNotification(
  senderName: string,
  message: string,
  channelName?: string,
  avatarUrl?: string,
): Promise<void> {
  const title = channelName ? `${senderName} in #${channelName}` : senderName;

  return showNotification({
    title,
    body: message.length > 100 ? message.substring(0, 97) + "..." : message,
    icon: avatarUrl,
  });
}

/**
 * Show a mention notification
 */
export async function showMentionNotification(
  senderName: string,
  message: string,
  channelName?: string,
): Promise<void> {
  const title = channelName
    ? `${senderName} mentioned you in #${channelName}`
    : `${senderName} mentioned you`;

  return showNotification({
    title,
    body: message.length > 100 ? message.substring(0, 97) + "..." : message,
  });
}

/**
 * Show a direct message notification
 */
export async function showDirectMessageNotification(
  senderName: string,
  message: string,
  avatarUrl?: string,
): Promise<void> {
  return showNotification({
    title: `Direct message from ${senderName}`,
    body: message.length > 100 ? message.substring(0, 97) + "..." : message,
    icon: avatarUrl,
  });
}

/**
 * Show a system notification
 */
export async function showSystemNotification(
  title: string,
  body: string,
): Promise<void> {
  return showNotification({ title, body });
}

export default {
  isNotificationAvailable,
  requestPermission,
  isPermissionGranted,
  showNotification,
  showMessageNotification,
  showMentionNotification,
  showDirectMessageNotification,
  showSystemNotification,
};
