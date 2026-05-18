/**
 * Push Subscription - Web Push notification subscription management
 *
 * Provides utilities for:
 * - Subscribing to push notifications
 * - Unsubscribing from push notifications
 * - Updating subscriptions
 * - Managing permission states
 */

// ============================================================================
// Types
// ============================================================================

export interface PushSubscriptionData {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushSubscriptionState {
  isSupported: boolean;
  permission: NotificationPermission | "default";
  isSubscribed: boolean;
  subscription: PushSubscriptionData | null;
  error: string | null;
}

export interface PushSubscriptionOptions {
  applicationServerKey: string;
  userVisibleOnly?: boolean;
}

export interface PushSubscriptionResult {
  success: boolean;
  subscription?: PushSubscriptionData;
  error?: string;
}

// ============================================================================
// Constants
// ============================================================================

const VAPID_PUBLIC_KEY_STORAGE_KEY = "nchat-vapid-public-key";

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert a base64 string to Uint8Array for VAPID key
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

/**
 * Convert ArrayBuffer to base64 string
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert PushSubscription to serializable data
 */
export function serializeSubscription(
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

// ============================================================================
// Permission Functions
// ============================================================================

/**
 * Check if push notifications are supported
 */
export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator)) return false;
  if (!("PushManager" in window)) return false;
  if (!("Notification" in window)) return false;
  return true;
}

/**
 * Get current notification permission
 */
export function getPermission(): NotificationPermission | "default" {
  if (typeof window === "undefined") return "default";
  if (!("Notification" in window)) return "default";
  return Notification.permission;
}

/**
 * Request notification permission
 */
export async function requestPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined") {
    return "denied";
  }

  if (!("Notification" in window)) {
    return "denied";
  }

  if (Notification.permission === "granted") {
    return "granted";
  }

  if (Notification.permission === "denied") {
    return "denied";
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch {
    return "denied";
  }
}

/**
 * Check if permission is granted
 */
export function hasPermission(): boolean {
  return getPermission() === "granted";
}

// ============================================================================
// Service Worker Functions
// ============================================================================

/**
 * Get the active service worker registration
 */
export async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    return registration;
  } catch {
    return null;
  }
}

/**
 * Register the service worker if not already registered
 */
export async function registerServiceWorker(
  swPath: string = "/sw.js",
): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register(swPath);
    return registration;
  } catch {
    return null;
  }
}

// ============================================================================
// Subscription Functions
// ============================================================================

/**
 * Get current push subscription
 */
export async function getSubscription(): Promise<PushSubscription | null> {
  const registration = await getServiceWorkerRegistration();
  if (!registration) return null;

  try {
    const subscription = await registration.pushManager.getSubscription();
    return subscription;
  } catch {
    return null;
  }
}

/**
 * Check if currently subscribed to push notifications
 */
export async function isSubscribed(): Promise<boolean> {
  const subscription = await getSubscription();
  return subscription !== null;
}

/**
 * Subscribe to push notifications
 */
export async function subscribe(
  options: PushSubscriptionOptions,
): Promise<PushSubscriptionResult> {
  // Check support
  if (!isPushSupported()) {
    return {
      success: false,
      error: "Push notifications are not supported in this browser",
    };
  }

  // Check permission
  const permission = await requestPermission();
  if (permission !== "granted") {
    return {
      success: false,
      error: "Notification permission was denied",
    };
  }

  // Get service worker
  const registration = await getServiceWorkerRegistration();
  if (!registration) {
    return {
      success: false,
      error: "Service worker is not registered",
    };
  }

  try {
    // Convert VAPID key
    const applicationServerKey = urlBase64ToUint8Array(
      options.applicationServerKey,
    );

    // Subscribe
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: options.userVisibleOnly ?? true,
      applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
    });

    // Store VAPID key for reference
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(
        VAPID_PUBLIC_KEY_STORAGE_KEY,
        options.applicationServerKey,
      );
    }

    return {
      success: true,
      subscription: serializeSubscription(subscription),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to subscribe to push notifications",
    };
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribe(): Promise<PushSubscriptionResult> {
  const subscription = await getSubscription();

  if (!subscription) {
    return {
      success: true, // Already unsubscribed
    };
  }

  try {
    const success = await subscription.unsubscribe();

    if (success) {
      // Clear stored VAPID key
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem(VAPID_PUBLIC_KEY_STORAGE_KEY);
      }

      return { success: true };
    }

    return {
      success: false,
      error: "Failed to unsubscribe",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to unsubscribe",
    };
  }
}

/**
 * Update subscription (unsubscribe and resubscribe)
 */
export async function updateSubscription(
  options: PushSubscriptionOptions,
): Promise<PushSubscriptionResult> {
  // First unsubscribe
  const unsubResult = await unsubscribe();
  if (!unsubResult.success && unsubResult.error !== "Already unsubscribed") {
    return unsubResult;
  }

  // Then subscribe again
  return subscribe(options);
}

// ============================================================================
// State Functions
// ============================================================================

/**
 * Get complete push subscription state
 */
export async function getSubscriptionState(): Promise<PushSubscriptionState> {
  const isSupported = isPushSupported();
  const permission = getPermission();

  if (!isSupported) {
    return {
      isSupported: false,
      permission: "default",
      isSubscribed: false,
      subscription: null,
      error: null,
    };
  }

  try {
    const subscription = await getSubscription();

    return {
      isSupported: true,
      permission,
      isSubscribed: subscription !== null,
      subscription: subscription ? serializeSubscription(subscription) : null,
      error: null,
    };
  } catch (error) {
    return {
      isSupported: true,
      permission,
      isSubscribed: false,
      subscription: null,
      error:
        error instanceof Error
          ? error.message
          : "Failed to get subscription state",
    };
  }
}

// ============================================================================
// Server Sync Functions
// ============================================================================

/**
 * Send subscription to server
 */
export async function sendSubscriptionToServer(
  subscription: PushSubscriptionData,
  apiUrl: string,
  options?: {
    userId?: string;
    deviceId?: string;
    platform?: "web" | "pwa";
    headers?: Record<string, string>;
  },
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      body: JSON.stringify({
        subscription,
        userId: options?.userId,
        deviceId: options?.deviceId,
        platform: options?.platform ?? "web",
        createdAt: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to send subscription to server",
    };
  }
}

/**
 * Remove subscription from server
 */
export async function removeSubscriptionFromServer(
  endpoint: string,
  apiUrl: string,
  options?: {
    headers?: Record<string, string>;
  },
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(apiUrl, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      body: JSON.stringify({ endpoint }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to remove subscription from server",
    };
  }
}

// ============================================================================
// Push Manager Class
// ============================================================================

/**
 * PushSubscriptionManager - Manages push subscription lifecycle
 */
export class PushSubscriptionManager {
  private applicationServerKey: string;
  private apiUrl: string;
  private userId?: string;
  private deviceId?: string;
  private onStateChange?: (state: PushSubscriptionState) => void;

  constructor(options: {
    applicationServerKey: string;
    apiUrl: string;
    userId?: string;
    deviceId?: string;
    onStateChange?: (state: PushSubscriptionState) => void;
  }) {
    this.applicationServerKey = options.applicationServerKey;
    this.apiUrl = options.apiUrl;
    this.userId = options.userId;
    this.deviceId = options.deviceId;
    this.onStateChange = options.onStateChange;
  }

  /**
   * Get current state
   */
  async getState(): Promise<PushSubscriptionState> {
    return getSubscriptionState();
  }

  /**
   * Subscribe and sync with server
   */
  async subscribe(): Promise<PushSubscriptionResult> {
    const result = await subscribe({
      applicationServerKey: this.applicationServerKey,
    });

    if (result.success && result.subscription) {
      // Sync with server
      await sendSubscriptionToServer(result.subscription, this.apiUrl, {
        userId: this.userId,
        deviceId: this.deviceId,
      });

      // Notify state change
      if (this.onStateChange) {
        const state = await this.getState();
        this.onStateChange(state);
      }
    }

    return result;
  }

  /**
   * Unsubscribe and remove from server
   */
  async unsubscribe(): Promise<PushSubscriptionResult> {
    const currentSubscription = await getSubscription();
    const endpoint = currentSubscription?.endpoint;

    const result = await unsubscribe();

    if (result.success && endpoint) {
      // Remove from server
      await removeSubscriptionFromServer(endpoint, this.apiUrl);

      // Notify state change
      if (this.onStateChange) {
        const state = await this.getState();
        this.onStateChange(state);
      }
    }

    return result;
  }

  /**
   * Refresh subscription
   */
  async refresh(): Promise<PushSubscriptionResult> {
    await this.unsubscribe();
    return this.subscribe();
  }

  /**
   * Update user ID
   */
  setUserId(userId: string): void {
    this.userId = userId;
  }

  /**
   * Update device ID
   */
  setDeviceId(deviceId: string): void {
    this.deviceId = deviceId;
  }
}
