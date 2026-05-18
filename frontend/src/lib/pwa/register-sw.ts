/**
 * Service Worker Registration Utility
 * Handles registration, updates, and communication with the service worker
 */

import { logger } from "@/lib/logger";

export interface ServiceWorkerConfig {
  /** Path to the service worker file */
  swPath?: string;
  /** Scope for the service worker */
  scope?: string;
  /** Callback when registration succeeds */
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  /** Callback when an update is available */
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  /** Callback when registration fails */
  onError?: (error: Error) => void;
  /** Callback when offline status changes */
  onOfflineChange?: (isOffline: boolean) => void;
  /** Check for updates interval in milliseconds */
  updateCheckInterval?: number;
}

export interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isUpdateAvailable: boolean;
  isOffline: boolean;
  registration: ServiceWorkerRegistration | null;
  error: Error | null;
}

// Global state for the service worker
let swRegistration: ServiceWorkerRegistration | null = null;
let updateAvailable = false;

/**
 * Check if service workers are supported
 */
export function isServiceWorkerSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator;
}

/**
 * Register the service worker
 */
export async function registerServiceWorker(
  config: ServiceWorkerConfig = {},
): Promise<ServiceWorkerRegistration | null> {
  const {
    swPath = "/sw.js",
    scope = "/",
    onSuccess,
    onUpdate,
    onError,
    onOfflineChange,
    updateCheckInterval = 60 * 60 * 1000, // 1 hour default
  } = config;

  if (!isServiceWorkerSupported()) {
    logger.warn("[SW] Service workers are not supported");
    return null;
  }

  try {
    // Register the service worker
    const registration = await navigator.serviceWorker.register(swPath, {
      scope,
    });
    swRegistration = registration;

    // Handle initial registration
    if (registration.active) {
      onSuccess?.(registration);
    }

    // Handle updates
    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing;

      if (newWorker) {
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed") {
            if (navigator.serviceWorker.controller) {
              // New update available
              updateAvailable = true;
              onUpdate?.(registration);
            } else {
              // First install
              onSuccess?.(registration);
            }
          }
        });
      }
    });

    // Listen for controller change (after skipWaiting)
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      // Optionally reload the page when the new service worker takes control
      // window.location.reload();
    });

    // Set up periodic update checks
    if (updateCheckInterval > 0) {
      setInterval(() => {
        registration.update().catch((err) => {
          logger.warn("[SW] Update check failed:", { context: err });
        });
      }, updateCheckInterval);
    }

    // Set up online/offline handlers
    if (onOfflineChange) {
      const handleOnline = () => onOfflineChange(false);
      const handleOffline = () => onOfflineChange(true);

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      // Initial state
      if (!navigator.onLine) {
        onOfflineChange(true);
      }
    }

    // Listen for messages from the service worker
    navigator.serviceWorker.addEventListener(
      "message",
      handleServiceWorkerMessage,
    );

    return registration;
  } catch (error) {
    const err = error instanceof Error ? error : new Error("Unknown error");
    logger.error("[SW] Registration failed:", err);
    onError?.(err);
    return null;
  }
}

/**
 * Unregister the service worker
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!isServiceWorkerSupported()) {
    return false;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();

    for (const registration of registrations) {
      await registration.unregister();
    }

    swRegistration = null;
    return true;
  } catch (error) {
    logger.error("[SW] Unregister failed:", error);
    return false;
  }
}

/**
 * Get the current service worker registration
 */
export function getRegistration(): ServiceWorkerRegistration | null {
  return swRegistration;
}

/**
 * Check if an update is available
 */
export function isUpdateAvailable(): boolean {
  return updateAvailable;
}

/**
 * Skip waiting and activate the new service worker
 */
export async function skipWaiting(): Promise<void> {
  if (swRegistration?.waiting) {
    swRegistration.waiting.postMessage({ type: "SKIP_WAITING" });
    updateAvailable = false;
  }
}

/**
 * Manually check for updates
 */
export async function checkForUpdates(): Promise<boolean> {
  if (!swRegistration) {
    return false;
  }

  try {
    await swRegistration.update();
    return true;
  } catch (error) {
    logger.warn("[SW] Update check failed:", { context: error });
    return false;
  }
}

/**
 * Send a message to the service worker
 */
export function postMessage(
  message: { type: string; payload?: unknown },
  transfer?: Transferable[],
): void {
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage(message, transfer || []);
  }
}

/**
 * Send a message and wait for a response
 */
export function postMessageWithResponse<T>(message: {
  type: string;
  payload?: unknown;
}): Promise<T> {
  return new Promise((resolve, reject) => {
    const messageChannel = new MessageChannel();

    messageChannel.port1.onmessage = (event) => {
      if (event.data.error) {
        reject(new Error(event.data.error));
      } else {
        resolve(event.data);
      }
    };

    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage(message, [
        messageChannel.port2,
      ]);
    } else {
      reject(new Error("No service worker controller"));
    }
  });
}

/**
 * Request the service worker to cache specific URLs
 */
export function cacheUrls(urls: string[]): void {
  postMessage({ type: "CACHE_URLS", payload: { urls } });
}

/**
 * Clear all service worker caches
 */
export function clearCache(): void {
  postMessage({ type: "CLEAR_CACHE" });
}

/**
 * Get the total cache size
 */
export async function getCacheSize(): Promise<number> {
  try {
    const result = await postMessageWithResponse<{
      type: string;
      size: number;
    }>({
      type: "GET_CACHE_SIZE",
    });
    return result.size;
  } catch {
    return 0;
  }
}

// Message handlers from service worker
type ServiceWorkerMessageHandler = (data: unknown) => void;
const messageHandlers = new Map<string, Set<ServiceWorkerMessageHandler>>();

/**
 * Handle messages from the service worker
 */
function handleServiceWorkerMessage(event: MessageEvent): void {
  const { type, ...data } = event.data || {};

  if (type) {
    const handlers = messageHandlers.get(type);
    if (handlers) {
      handlers.forEach((handler) => handler(data));
    }
  }
}

/**
 * Subscribe to service worker messages
 */
export function onServiceWorkerMessage(
  type: string,
  handler: ServiceWorkerMessageHandler,
): () => void {
  if (!messageHandlers.has(type)) {
    messageHandlers.set(type, new Set());
  }

  messageHandlers.get(type)!.add(handler);

  // Return unsubscribe function
  return () => {
    messageHandlers.get(type)?.delete(handler);
  };
}

/**
 * Get the current service worker state
 */
export function getServiceWorkerState(): ServiceWorkerState {
  return {
    isSupported: isServiceWorkerSupported(),
    isRegistered: !!swRegistration,
    isUpdateAvailable: updateAvailable,
    isOffline: typeof navigator !== "undefined" && !navigator.onLine,
    registration: swRegistration,
    error: null,
  };
}

// Re-export ServiceWorkerState for external use
// Note: ServiceWorkerRegistration is a global browser type and doesn't need to be re-exported
