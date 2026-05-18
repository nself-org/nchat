/**
 * usePushNotifications Hook
 *
 * Provides push notification functionality including:
 * - Request permission
 * - Subscribe/unsubscribe to push
 * - Handle incoming push messages
 * - Sync subscription with server
 */

"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { logger } from "@/lib/logger";
import {
  isPushSupported,
  getPermission,
  requestPermission,
  subscribe,
  unsubscribe,
  getSubscriptionState,
  sendSubscriptionToServer,
  removeSubscriptionFromServer,
  PushSubscriptionData,
  PushSubscriptionState,
} from "@/lib/notifications/push-subscription";

// ============================================================================
// Types
// ============================================================================

export interface UsePushNotificationsOptions {
  /**
   * Application server key (VAPID public key)
   */
  applicationServerKey?: string;

  /**
   * API endpoint for push subscription management
   */
  apiUrl?: string;

  /**
   * Current user ID
   */
  userId?: string;

  /**
   * Device ID for this browser/device
   */
  deviceId?: string;

  /**
   * Whether to auto-subscribe when permission is granted
   */
  autoSubscribe?: boolean;

  /**
   * Callback when push message is received
   */
  onPushReceived?: (event: MessageEvent) => void;

  /**
   * Callback when subscription state changes
   */
  onStateChange?: (state: PushSubscriptionState) => void;

  /**
   * Callback when an error occurs
   */
  onError?: (error: Error) => void;
}

export interface UsePushNotificationsReturn {
  /**
   * Whether push notifications are supported
   */
  isSupported: boolean;

  /**
   * Current permission state
   */
  permission: NotificationPermission | "default";

  /**
   * Whether currently subscribed to push
   */
  isSubscribed: boolean;

  /**
   * Current subscription data
   */
  subscription: PushSubscriptionData | null;

  /**
   * Whether an operation is in progress
   */
  isLoading: boolean;

  /**
   * Error message if any
   */
  error: string | null;

  /**
   * Request notification permission
   */
  requestPermission: () => Promise<NotificationPermission>;

  /**
   * Subscribe to push notifications
   */
  subscribe: () => Promise<boolean>;

  /**
   * Unsubscribe from push notifications
   */
  unsubscribe: () => Promise<boolean>;

  /**
   * Refresh the subscription
   */
  refresh: () => Promise<boolean>;

  /**
   * Check current state
   */
  checkState: () => Promise<PushSubscriptionState>;
}

// ============================================================================
// Hook
// ============================================================================

export function usePushNotifications(
  options: UsePushNotificationsOptions = {},
): UsePushNotificationsReturn {
  const {
    applicationServerKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "",
    apiUrl = "/api/push/subscription",
    userId,
    deviceId,
    autoSubscribe = false,
    onPushReceived,
    onStateChange,
    onError,
  } = options;

  // State
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<
    NotificationPermission | "default"
  >("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscriptionData | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for callbacks to avoid stale closures
  const onStateChangeRef = useRef(onStateChange);
  const onErrorRef = useRef(onError);
  const onPushReceivedRef = useRef(onPushReceived);

  useEffect(() => {
    onStateChangeRef.current = onStateChange;
    onErrorRef.current = onError;
    onPushReceivedRef.current = onPushReceived;
  }, [onStateChange, onError, onPushReceived]);

  // Handle errors
  const handleError = useCallback((err: Error | string) => {
    const message = typeof err === "string" ? err : err.message;
    setError(message);
    onErrorRef.current?.(typeof err === "string" ? new Error(err) : err);
  }, []);

  // Update state and notify
  const updateState = useCallback((state: PushSubscriptionState) => {
    setIsSupported(state.isSupported);
    setPermission(state.permission);
    setIsSubscribed(state.isSubscribed);
    setSubscription(state.subscription);
    setError(state.error);
    onStateChangeRef.current?.(state);
  }, []);

  // Request permission
  const handleRequestPermission =
    useCallback(async (): Promise<NotificationPermission> => {
      try {
        setIsLoading(true);
        setError(null);

        const result = await requestPermission();
        setPermission(result);

        return result;
      } catch (err) {
        handleError(
          err instanceof Error
            ? err
            : new Error("Failed to request permission"),
        );
        return "denied";
      } finally {
        setIsLoading(false);
      }
    }, [handleError]);

  // Subscribe to push
  const handleSubscribe = useCallback(async (): Promise<boolean> => {
    if (!applicationServerKey) {
      handleError("Application server key not configured");
      return false;
    }

    try {
      setIsLoading(true);
      setError(null);

      const result = await subscribe({ applicationServerKey });

      if (!result.success) {
        handleError(result.error || "Failed to subscribe");
        return false;
      }

      if (result.subscription) {
        setSubscription(result.subscription);
        setIsSubscribed(true);

        // Sync with server
        if (apiUrl) {
          const serverResult = await sendSubscriptionToServer(
            result.subscription,
            apiUrl,
            {
              userId,
              deviceId,
            },
          );

          if (!serverResult.success) {
            logger.warn("Failed to sync subscription with server", {
              error: serverResult.error,
            });
          }
        }
      }

      return true;
    } catch (err) {
      handleError(
        err instanceof Error ? err : new Error("Failed to subscribe"),
      );
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [applicationServerKey, apiUrl, userId, deviceId, handleError]);

  // Unsubscribe from push
  const handleUnsubscribe = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      const currentEndpoint = subscription?.endpoint;

      const result = await unsubscribe();

      if (!result.success) {
        handleError(result.error || "Failed to unsubscribe");
        return false;
      }

      setSubscription(null);
      setIsSubscribed(false);

      // Remove from server
      if (apiUrl && currentEndpoint) {
        const serverResult = await removeSubscriptionFromServer(
          currentEndpoint,
          apiUrl,
        );

        if (!serverResult.success) {
          logger.warn("Failed to remove subscription from server", {
            error: serverResult.error,
          });
        }
      }

      return true;
    } catch (err) {
      handleError(
        err instanceof Error ? err : new Error("Failed to unsubscribe"),
      );
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl, subscription, handleError]);

  // Refresh subscription
  const handleRefresh = useCallback(async (): Promise<boolean> => {
    await handleUnsubscribe();
    return handleSubscribe();
  }, [handleUnsubscribe, handleSubscribe]);

  // Check current state
  const checkState = useCallback(async (): Promise<PushSubscriptionState> => {
    try {
      setIsLoading(true);
      const state = await getSubscriptionState();
      updateState(state);
      return state;
    } catch (err) {
      const errorState: PushSubscriptionState = {
        isSupported: false,
        permission: "default",
        isSubscribed: false,
        subscription: null,
        error: err instanceof Error ? err.message : "Failed to check state",
      };
      updateState(errorState);
      return errorState;
    } finally {
      setIsLoading(false);
    }
  }, [updateState]);

  // Initialize on mount
  useEffect(() => {
    const init = async () => {
      const supported = isPushSupported();
      setIsSupported(supported);

      if (!supported) {
        return;
      }

      const currentPermission = getPermission();
      setPermission(currentPermission);

      // Check subscription state
      const state = await getSubscriptionState();
      updateState(state);

      // Auto-subscribe if enabled and permitted
      if (
        autoSubscribe &&
        currentPermission === "granted" &&
        !state.isSubscribed
      ) {
        await handleSubscribe();
      }
    };

    init();
  }, [autoSubscribe, handleSubscribe, updateState]);

  // Listen for push messages
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "PUSH_NOTIFICATION") {
        onPushReceivedRef.current?.(event);
      }
    };

    navigator.serviceWorker.addEventListener("message", handleMessage);

    return () => {
      navigator.serviceWorker.removeEventListener("message", handleMessage);
    };
  }, []);

  return {
    isSupported,
    permission,
    isSubscribed,
    subscription,
    isLoading,
    error,
    requestPermission: handleRequestPermission,
    subscribe: handleSubscribe,
    unsubscribe: handleUnsubscribe,
    refresh: handleRefresh,
    checkState,
  };
}

export default usePushNotifications;
