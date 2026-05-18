/**
 * usePushSubscription Hook
 *
 * Manages push notification subscriptions including:
 * - Subscribe to push notifications
 * - Unsubscribe from push notifications
 * - Sync subscriptions with server
 * - Handle permission requests
 */

"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import {
  isPushSupported,
  getPermission,
  requestPermission,
  subscribe as subscribeToWebPush,
  unsubscribe as unsubscribeFromWebPush,
  getSubscriptionState,
  PushSubscriptionData,
  PushSubscriptionState,
} from "@/lib/notifications/push-subscription";
import { useAuth } from "@/contexts/auth-context";

import { logger } from "@/lib/logger";

// =============================================================================
// Types
// =============================================================================

export interface UsePushSubscriptionOptions {
  /**
   * VAPID public key for web push
   */
  vapidPublicKey?: string;

  /**
   * Auto-subscribe when permission is granted
   */
  autoSubscribe?: boolean;

  /**
   * Device ID for this device
   */
  deviceId?: string;

  /**
   * Callback when subscription state changes
   */
  onStateChange?: (state: PushSubscriptionState) => void;

  /**
   * Callback when error occurs
   */
  onError?: (error: Error) => void;
}

export interface UsePushSubscriptionReturn {
  /**
   * Whether push is supported
   */
  isSupported: boolean;

  /**
   * Current permission state
   */
  permission: NotificationPermission | "default";

  /**
   * Whether currently subscribed
   */
  isSubscribed: boolean;

  /**
   * Current subscription data
   */
  subscription: PushSubscriptionData | null;

  /**
   * Loading state
   */
  isLoading: boolean;

  /**
   * Error message
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
   * Refresh subscription (unsubscribe and resubscribe)
   */
  refresh: () => Promise<boolean>;

  /**
   * Check current subscription state
   */
  checkState: () => Promise<PushSubscriptionState>;

  /**
   * List all subscriptions for the current user
   */
  listSubscriptions: () => Promise<
    Array<{
      id: string;
      endpoint: string;
      deviceId: string | null;
      platform: string;
      createdAt: string;
    }>
  >;
}

// =============================================================================
// Hook
// =============================================================================

export function usePushSubscription(
  options: UsePushSubscriptionOptions = {},
): UsePushSubscriptionReturn {
  const {
    vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "",
    autoSubscribe = false,
    deviceId,
    onStateChange,
    onError,
  } = options;

  const { user } = useAuth();

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

  // Refs for callbacks
  const onStateChangeRef = useRef(onStateChange);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onStateChangeRef.current = onStateChange;
    onErrorRef.current = onError;
  }, [onStateChange, onError]);

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

  // Sync subscription with server
  const syncWithServer = useCallback(
    async (sub: PushSubscriptionData, action: "subscribe" | "unsubscribe") => {
      if (!user?.id) return;

      try {
        if (action === "subscribe") {
          await fetch("/api/notifications/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: user.id,
              subscription: sub,
              deviceId,
              platform: "web",
              userAgent:
                typeof navigator !== "undefined"
                  ? navigator.userAgent
                  : undefined,
            }),
          });
        } else {
          await fetch("/api/notifications/subscribe", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
        }
      } catch (err) {
        logger.warn("Failed to sync subscription with server:", {
          context: err,
        });
      }
    },
    [user?.id, deviceId],
  );

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
    if (!vapidPublicKey) {
      handleError("VAPID public key not configured");
      return false;
    }

    try {
      setIsLoading(true);
      setError(null);

      const result = await subscribeToWebPush({
        applicationServerKey: vapidPublicKey,
      });

      if (!result.success) {
        handleError(result.error || "Failed to subscribe");
        return false;
      }

      if (result.subscription) {
        setSubscription(result.subscription);
        setIsSubscribed(true);

        // Sync with server
        await syncWithServer(result.subscription, "subscribe");
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
  }, [vapidPublicKey, handleError, syncWithServer]);

  // Unsubscribe from push
  const handleUnsubscribe = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      const currentSubscription = subscription;

      const result = await unsubscribeFromWebPush();

      if (!result.success) {
        handleError(result.error || "Failed to unsubscribe");
        return false;
      }

      // Sync with server
      if (currentSubscription) {
        await syncWithServer(currentSubscription, "unsubscribe");
      }

      setSubscription(null);
      setIsSubscribed(false);

      return true;
    } catch (err) {
      handleError(
        err instanceof Error ? err : new Error("Failed to unsubscribe"),
      );
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [subscription, handleError, syncWithServer]);

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

  // List subscriptions from server
  const listSubscriptions = useCallback(async () => {
    if (!user?.id) return [];

    try {
      const response = await fetch(
        `/api/notifications/subscribe?user_id=${user.id}`,
      );
      const data = await response.json();

      if (data.success && data.data?.subscriptions) {
        return data.data.subscriptions.map(
          (s: {
            id: string;
            endpoint: string;
            device_id: string | null;
            platform: string;
            created_at: string;
          }) => ({
            id: s.id,
            endpoint: s.endpoint,
            deviceId: s.device_id,
            platform: s.platform,
            createdAt: s.created_at,
          }),
        );
      }

      return [];
    } catch {
      return [];
    }
  }, [user?.id]);

  // Initialize on mount
  useEffect(() => {
    const init = async () => {
      const supported = isPushSupported();
      setIsSupported(supported);

      if (!supported) return;

      const currentPermission = getPermission();
      setPermission(currentPermission);

      // Check subscription state
      const state = await getSubscriptionState();
      updateState(state);

      // Auto-subscribe if enabled and permitted
      if (
        autoSubscribe &&
        currentPermission === "granted" &&
        !state.isSubscribed &&
        user?.id
      ) {
        await handleSubscribe();
      }
    };

    init();
  }, [autoSubscribe, user?.id, handleSubscribe, updateState]);

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
    listSubscriptions,
  };
}

export default usePushSubscription;
