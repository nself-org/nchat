/**
 * Notification Channels - Delivery channel management
 *
 * Handles different notification delivery methods:
 * - Desktop (Browser Notification API)
 * - Mobile Push (via service worker or native)
 * - Email (via backend API)
 * - In-App (UI notifications)
 */

import type {
  NotificationDeliveryMethod,
  DesktopNotificationSettings,
  PushNotificationSettings,
  EmailNotificationSettings,
} from "./notification-types";
import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface NotificationChannelStatus {
  method: NotificationDeliveryMethod;
  available: boolean;
  enabled: boolean;
  permissionStatus?: NotificationPermission | "unknown";
  lastError?: string;
  lastDeliveredAt?: string;
}

export interface DeliveryPayload {
  id: string;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  actionUrl?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

export interface DeliveryResult {
  success: boolean;
  method: NotificationDeliveryMethod;
  timestamp: string;
  error?: string;
  notificationId?: string;
}

// ============================================================================
// Desktop Notifications
// ============================================================================

/**
 * Check if desktop notifications are available
 */
export function isDesktopAvailable(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/**
 * Get desktop notification permission status
 */
export function getDesktopPermission(): NotificationPermission | "unavailable" {
  if (!isDesktopAvailable()) {
    return "unavailable";
  }
  return Notification.permission;
}

/**
 * Request desktop notification permission
 */
export async function requestDesktopPermission(): Promise<NotificationPermission> {
  if (!isDesktopAvailable()) {
    return "denied";
  }

  if (Notification.permission === "granted") {
    return "granted";
  }

  if (Notification.permission !== "denied") {
    return await Notification.requestPermission();
  }

  return "denied";
}

/**
 * Deliver a desktop notification
 */
export async function deliverDesktopNotification(
  payload: DeliveryPayload,
  settings: DesktopNotificationSettings,
): Promise<DeliveryResult> {
  const timestamp = new Date().toISOString();

  if (!isDesktopAvailable()) {
    return {
      success: false,
      method: "desktop",
      timestamp,
      error: "Desktop notifications not available",
    };
  }

  if (Notification.permission !== "granted") {
    return {
      success: false,
      method: "desktop",
      timestamp,
      error: "Permission not granted",
    };
  }

  try {
    const notification = new Notification(payload.title, {
      body: settings.showPreview ? payload.body : "You have a new notification",
      icon: settings.showAvatar ? payload.icon : undefined,
      badge: payload.badge,
      tag: payload.tag || payload.id,
      requireInteraction:
        payload.requireInteraction || settings.requireInteraction,
      silent: payload.silent || !settings.playSound,
      data: payload.data,
    });

    // Handle click
    notification.onclick = () => {
      window.focus();
      if (payload.actionUrl) {
        window.location.href = payload.actionUrl;
      }
      notification.close();
    };

    // Auto-close if duration is set
    if (settings.duration > 0 && !notification.requireInteraction) {
      setTimeout(() => notification.close(), settings.duration);
    }

    return {
      success: true,
      method: "desktop",
      timestamp,
      notificationId: payload.id,
    };
  } catch (error) {
    return {
      success: false,
      method: "desktop",
      timestamp,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// Push Notifications (Service Worker)
// ============================================================================

/**
 * Check if push notifications are available
 */
export function isPushAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

/**
 * Get push subscription status
 */
export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushAvailable()) return null;

  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch {
    return null;
  }
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPush(
  vapidPublicKey: string,
): Promise<PushSubscription | null> {
  if (!isPushAvailable()) return null;

  try {
    const registration = await navigator.serviceWorker.ready;

    // Convert VAPID key to Uint8Array
    const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
      const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
      const base64 = (base64String + padding)
        .replace(/-/g, "+")
        .replace(/_/g, "/");
      const rawData = window.atob(base64);
      return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
    };

    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
    });

    return subscription;
  } catch (error) {
    logger.error("Failed to subscribe to push:", error);
    return null;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  const subscription = await getPushSubscription();
  if (!subscription) return true;

  try {
    return await subscription.unsubscribe();
  } catch {
    return false;
  }
}

/**
 * Deliver a push notification (via service worker)
 */
export async function deliverPushNotification(
  payload: DeliveryPayload,
  settings: PushNotificationSettings,
): Promise<DeliveryResult> {
  const timestamp = new Date().toISOString();

  if (!isPushAvailable()) {
    return {
      success: false,
      method: "mobile",
      timestamp,
      error: "Push notifications not available",
    };
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    await registration.showNotification(payload.title, {
      body: settings.showPreview ? payload.body : "You have a new notification",
      icon: payload.icon,
      badge: payload.badge,
      tag: payload.tag || payload.id,
      requireInteraction: false,
      silent: !settings.playSound,
      data: {
        ...payload.data,
        actionUrl: payload.actionUrl,
      },
      actions: payload.actions,
      // vibrate is part of the Notifications API but not in TS types
      ...(settings.vibrate && { vibrate: [200, 100, 200] }),
    } as NotificationOptions);

    return {
      success: true,
      method: "mobile",
      timestamp,
      notificationId: payload.id,
    };
  } catch (error) {
    return {
      success: false,
      method: "mobile",
      timestamp,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// Email Notifications
// ============================================================================

export interface EmailPayload {
  to: string;
  subject: string;
  text: string;
  html?: string;
  template?: string;
  templateData?: Record<string, unknown>;
}

/**
 * Send an email notification
 * Note: This would typically call a backend API
 */
export async function sendEmailNotification(
  email: EmailPayload,
  settings: EmailNotificationSettings,
  apiEndpoint: string = "/api/notifications/email",
): Promise<DeliveryResult> {
  const timestamp = new Date().toISOString();

  if (!settings.enabled) {
    return {
      success: false,
      method: "email",
      timestamp,
      error: "Email notifications disabled",
    };
  }

  try {
    const response = await fetch(apiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: settings.email || email.to,
        subject: email.subject,
        text: email.text,
        html: email.html,
        template: email.template,
        templateData: email.templateData,
        includePreview: settings.includePreview,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();

    return {
      success: true,
      method: "email",
      timestamp,
      notificationId: result.id,
    };
  } catch (error) {
    return {
      success: false,
      method: "email",
      timestamp,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// In-App Notifications
// ============================================================================

export type InAppNotificationHandler = (payload: DeliveryPayload) => void;

let inAppHandler: InAppNotificationHandler | null = null;

/**
 * Register in-app notification handler
 */
export function registerInAppHandler(handler: InAppNotificationHandler): void {
  inAppHandler = handler;
}

/**
 * Unregister in-app notification handler
 */
export function unregisterInAppHandler(): void {
  inAppHandler = null;
}

/**
 * Deliver an in-app notification
 */
export function deliverInAppNotification(
  payload: DeliveryPayload,
): DeliveryResult {
  const timestamp = new Date().toISOString();

  if (!inAppHandler) {
    return {
      success: false,
      method: "in_app",
      timestamp,
      error: "No in-app handler registered",
    };
  }

  try {
    inAppHandler(payload);
    return {
      success: true,
      method: "in_app",
      timestamp,
      notificationId: payload.id,
    };
  } catch (error) {
    return {
      success: false,
      method: "in_app",
      timestamp,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// Channel Status
// ============================================================================

/**
 * Get status of all notification channels
 */
export async function getChannelStatuses(): Promise<
  NotificationChannelStatus[]
> {
  const statuses: NotificationChannelStatus[] = [];

  // Desktop
  statuses.push({
    method: "desktop",
    available: isDesktopAvailable(),
    enabled: isDesktopAvailable() && Notification.permission === "granted",
    permissionStatus: isDesktopAvailable()
      ? Notification.permission
      : "unknown",
  });

  // Push
  const pushSubscription = await getPushSubscription();
  statuses.push({
    method: "mobile",
    available: isPushAvailable(),
    enabled: !!pushSubscription,
    permissionStatus: "unknown",
  });

  // Email (always available, enabled based on settings)
  statuses.push({
    method: "email",
    available: true,
    enabled: false, // Will be updated based on user settings
  });

  // In-app
  statuses.push({
    method: "in_app",
    available: true,
    enabled: !!inAppHandler,
  });

  return statuses;
}

/**
 * Get available delivery methods
 */
export async function getAvailableMethods(): Promise<
  NotificationDeliveryMethod[]
> {
  const statuses = await getChannelStatuses();
  return statuses.filter((s) => s.available && s.enabled).map((s) => s.method);
}

// ============================================================================
// Multi-Channel Delivery
// ============================================================================

/**
 * Deliver notification to multiple channels
 */
export async function deliverToChannels(
  payload: DeliveryPayload,
  methods: NotificationDeliveryMethod[],
  settings: {
    desktop?: DesktopNotificationSettings;
    push?: PushNotificationSettings;
    email?: EmailNotificationSettings;
  },
): Promise<DeliveryResult[]> {
  const results: DeliveryResult[] = [];

  for (const method of methods) {
    let result: DeliveryResult;

    switch (method) {
      case "desktop":
        if (settings.desktop) {
          result = await deliverDesktopNotification(payload, settings.desktop);
        } else {
          result = {
            success: false,
            method,
            timestamp: new Date().toISOString(),
            error: "Desktop settings not provided",
          };
        }
        break;

      case "mobile":
        if (settings.push) {
          result = await deliverPushNotification(payload, settings.push);
        } else {
          result = {
            success: false,
            method,
            timestamp: new Date().toISOString(),
            error: "Push settings not provided",
          };
        }
        break;

      case "email":
        // Email requires specific handling
        result = {
          success: false,
          method,
          timestamp: new Date().toISOString(),
          error: "Email delivery requires separate API call",
        };
        break;

      case "in_app":
        result = deliverInAppNotification(payload);
        break;

      default:
        result = {
          success: false,
          method,
          timestamp: new Date().toISOString(),
          error: `Unknown delivery method: ${method}`,
        };
    }

    results.push(result);
  }

  return results;
}
