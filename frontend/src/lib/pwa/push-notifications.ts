/**
 * Push Notifications Utility
 * Handles permission requests, subscriptions, and push notification management
 */

import { getRegistration } from "./register-sw";

import { logger } from "@/lib/logger";

// VAPID public key should be stored in environment variables
// Generate with: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

export interface PushSubscriptionData {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  requireInteraction?: boolean;
  silent?: boolean;
  vibrate?: number[];
  actions?: NotificationAction[];
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export type NotificationPermissionState = "granted" | "denied" | "default";

export interface PushNotificationState {
  isSupported: boolean;
  permission: NotificationPermissionState;
  isSubscribed: boolean;
  subscription: PushSubscription | null;
}

// Subscription state
let currentSubscription: PushSubscription | null = null;

/**
 * Check if push notifications are supported
 */
export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * Get the current notification permission state
 */
export function getNotificationPermission(): NotificationPermissionState {
  if (typeof Notification === "undefined") {
    return "default";
  }
  return Notification.permission;
}

/**
 * Check if notifications are granted
 */
export function isNotificationGranted(): boolean {
  return getNotificationPermission() === "granted";
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (!isPushSupported()) {
    logger.warn("[Push] Push notifications are not supported");
    return "denied";
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    logger.error("[Push] Error requesting permission:", error);
    return "denied";
  }
}

/**
 * Convert VAPID key from base64 to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!isPushSupported()) {
    logger.warn("[Push] Push notifications are not supported");
    return null;
  }

  // Check permission
  const permission = getNotificationPermission();
  if (permission !== "granted") {
    logger.warn("[Push] Notification permission not granted");
    return null;
  }

  // Get service worker registration
  const registration = getRegistration();
  if (!registration) {
    logger.warn("[Push] No service worker registration found");
    return null;
  }

  try {
    // Check for existing subscription
    const existingSubscription =
      await registration.pushManager.getSubscription();

    if (existingSubscription) {
      currentSubscription = existingSubscription;
      return existingSubscription;
    }

    // Check if VAPID key is configured
    if (!VAPID_PUBLIC_KEY) {
      logger.warn("[Push] VAPID public key not configured");
      return null;
    }

    // Create new subscription
    const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
    });

    currentSubscription = subscription;

    // Send subscription to server
    await sendSubscriptionToServer(subscription);

    return subscription;
  } catch (error) {
    logger.error("[Push] Error subscribing to push:", error);
    return null;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!currentSubscription) {
    // Try to get existing subscription
    const registration = getRegistration();
    if (registration) {
      currentSubscription = await registration.pushManager.getSubscription();
    }
  }

  if (!currentSubscription) {
    return true;
  }

  try {
    // Remove from server first
    await removeSubscriptionFromServer(currentSubscription);

    // Unsubscribe locally
    const result = await currentSubscription.unsubscribe();
    currentSubscription = null;

    return result;
  } catch (error) {
    logger.error("[Push] Error unsubscribing:", error);
    return false;
  }
}

/**
 * Get the current push subscription
 */
export async function getSubscription(): Promise<PushSubscription | null> {
  if (currentSubscription) {
    return currentSubscription;
  }

  const registration = getRegistration();
  if (!registration) {
    return null;
  }

  try {
    currentSubscription = await registration.pushManager.getSubscription();
    return currentSubscription;
  } catch (error) {
    logger.error("[Push] Error getting subscription:", error);
    return null;
  }
}

/**
 * Check if currently subscribed to push
 */
export async function isSubscribed(): Promise<boolean> {
  const subscription = await getSubscription();
  return !!subscription;
}

/**
 * Send subscription to server
 */
async function sendSubscriptionToServer(
  subscription: PushSubscription,
): Promise<void> {
  const subscriptionData = subscriptionToJSON(subscription);

  try {
    const response = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(subscriptionData),
    });

    if (!response.ok) {
      throw new Error(`Failed to send subscription: ${response.status}`);
    }
  } catch (error) {
    logger.error("[Push] Error sending subscription to server:", error);
    // Don't throw - subscription is still valid locally
  }
}

/**
 * Remove subscription from server
 */
async function removeSubscriptionFromServer(
  subscription: PushSubscription,
): Promise<void> {
  const subscriptionData = subscriptionToJSON(subscription);

  try {
    const response = await fetch("/api/push/unsubscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(subscriptionData),
    });

    if (!response.ok) {
      throw new Error(`Failed to remove subscription: ${response.status}`);
    }
  } catch (error) {
    logger.error("[Push] Error removing subscription from server:", error);
    // Continue with local unsubscribe anyway
  }
}

/**
 * Convert PushSubscription to JSON-serializable object
 */
export function subscriptionToJSON(
  subscription: PushSubscription,
): PushSubscriptionData {
  const json = subscription.toJSON();

  return {
    endpoint: subscription.endpoint,
    expirationTime: subscription.expirationTime,
    keys: {
      p256dh: json.keys?.p256dh || "",
      auth: json.keys?.auth || "",
    },
  };
}

/**
 * Show a local notification (not push)
 */
export async function showLocalNotification(
  payload: NotificationPayload,
): Promise<void> {
  if (!isNotificationGranted()) {
    logger.warn("[Push] Cannot show notification - permission not granted");
    return;
  }

  const registration = getRegistration();
  if (!registration) {
    // Fall back to Notification API
    new Notification(payload.title, {
      body: payload.body,
      icon: payload.icon,
      badge: payload.badge,
      tag: payload.tag,
      data: payload.data,
      requireInteraction: payload.requireInteraction,
      silent: payload.silent,
    });
    return;
  }

  // Use service worker notification (better on mobile)
  await registration.showNotification(payload.title, {
    body: payload.body,
    icon: payload.icon || "/icons/icon-192.png",
    badge: payload.badge || "/icons/badge-72.png",
    tag: payload.tag,
    data: payload.data,
    requireInteraction: payload.requireInteraction,
    silent: payload.silent,
    actions: payload.actions,
    // vibrate is part of the Notifications API but not in TS types
    ...(payload.vibrate && { vibrate: payload.vibrate }),
    ...(!payload.vibrate && { vibrate: [100, 50, 100] }),
  } as NotificationOptions);
}

/**
 * Get the current push notification state
 */
export async function getPushState(): Promise<PushNotificationState> {
  const subscription = await getSubscription();

  return {
    isSupported: isPushSupported(),
    permission: getNotificationPermission(),
    isSubscribed: !!subscription,
    subscription,
  };
}

/**
 * Set up push notification handlers
 */
export interface PushHandlers {
  onNotificationClick?: (data: unknown) => void;
  onNotificationDismissed?: (data: unknown) => void;
  onSyncComplete?: (data: unknown) => void;
}

export function setupPushHandlers(handlers: PushHandlers): () => void {
  const handleMessage = (event: MessageEvent) => {
    const { type, ...data } = event.data || {};

    switch (type) {
      case "NOTIFICATION_CLICK":
        handlers.onNotificationClick?.(data);
        break;
      case "NOTIFICATION_DISMISSED":
        handlers.onNotificationDismissed?.(data);
        break;
      case "SYNC_COMPLETE":
        handlers.onSyncComplete?.(data);
        break;
    }
  };

  navigator.serviceWorker?.addEventListener("message", handleMessage);

  // Return cleanup function
  return () => {
    navigator.serviceWorker?.removeEventListener("message", handleMessage);
  };
}

/**
 * Request permission and subscribe in one step
 */
export async function enablePushNotifications(): Promise<PushSubscription | null> {
  // Request permission first
  const permission = await requestNotificationPermission();

  if (permission !== "granted") {
    return null;
  }

  // Subscribe to push
  return subscribeToPush();
}

/**
 * Disable push notifications
 */
export async function disablePushNotifications(): Promise<boolean> {
  return unsubscribeFromPush();
}
