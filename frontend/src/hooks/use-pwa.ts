"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  registerServiceWorker,
  unregisterServiceWorker,
  isServiceWorkerSupported,
  skipWaiting,
  checkForUpdates,
  getServiceWorkerState,
  onServiceWorkerMessage,
  type ServiceWorkerConfig,
} from "@/lib/pwa/register-sw";
import {
  isPushSupported,
  getNotificationPermission,
  requestNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  getSubscription,
  setupPushHandlers,
  type NotificationPermissionState,
  type PushHandlers,
} from "@/lib/pwa/push-notifications";

export interface PWAState {
  // Service Worker
  isSupported: boolean;
  isRegistered: boolean;
  isUpdateAvailable: boolean;
  registration: ServiceWorkerRegistration | null;

  // Network
  isOnline: boolean;

  // Push Notifications
  isPushSupported: boolean;
  pushPermission: NotificationPermissionState;
  isPushSubscribed: boolean;
  pushSubscription: PushSubscription | null;

  // Install
  isInstallable: boolean;
  isInstalled: boolean;
}

export interface PWAActions {
  // Service Worker
  register: () => Promise<ServiceWorkerRegistration | null>;
  unregister: () => Promise<boolean>;
  update: () => Promise<void>;
  checkForUpdates: () => Promise<boolean>;

  // Push Notifications
  requestPushPermission: () => Promise<NotificationPermissionState>;
  subscribeToPush: () => Promise<PushSubscription | null>;
  unsubscribeFromPush: () => Promise<boolean>;

  // Install
  promptInstall: () => Promise<boolean>;
}

export interface UsePWAOptions {
  /** Auto-register service worker on mount */
  autoRegister?: boolean;
  /** Service worker registration config */
  swConfig?: ServiceWorkerConfig;
  /** Push notification handlers */
  pushHandlers?: PushHandlers;
  /** Callback when online status changes */
  onOnlineChange?: (isOnline: boolean) => void;
  /** Callback when update is available */
  onUpdateAvailable?: () => void;
}

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function usePWA(options: UsePWAOptions = {}): [PWAState, PWAActions] {
  const {
    autoRegister = true,
    swConfig = {},
    pushHandlers = {},
    onOnlineChange,
    onUpdateAvailable,
  } = options;

  // Service Worker state
  const [isRegistered, setIsRegistered] = useState(false);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [registration, setRegistration] =
    useState<ServiceWorkerRegistration | null>(null);

  // Network state
  const [isOnline, setIsOnline] = useState(true);

  // Push state
  const [pushPermission, setPushPermission] =
    useState<NotificationPermissionState>("default");
  const [isPushSubscribed, setIsPushSubscribed] = useState(false);
  const [pushSubscription, setPushSubscription] =
    useState<PushSubscription | null>(null);

  // Install state
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  // Refs
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const mountedRef = useRef(true);

  // Register service worker
  const register = useCallback(async () => {
    if (!isServiceWorkerSupported()) {
      return null;
    }

    const reg = await registerServiceWorker({
      ...swConfig,
      onSuccess: (r) => {
        if (mountedRef.current) {
          setIsRegistered(true);
          setRegistration(r);
        }
        swConfig.onSuccess?.(r);
      },
      onUpdate: (r) => {
        if (mountedRef.current) {
          setIsUpdateAvailable(true);
          setRegistration(r);
        }
        swConfig.onUpdate?.(r);
        onUpdateAvailable?.();
      },
      onError: swConfig.onError,
      onOfflineChange: (offline) => {
        if (mountedRef.current) {
          setIsOnline(!offline);
        }
        swConfig.onOfflineChange?.(offline);
        onOnlineChange?.(!offline);
      },
    });

    return reg;
  }, [swConfig, onOnlineChange, onUpdateAvailable]);

  // Unregister service worker
  const unregister = useCallback(async () => {
    const result = await unregisterServiceWorker();
    if (result && mountedRef.current) {
      setIsRegistered(false);
      setRegistration(null);
    }
    return result;
  }, []);

  // Apply update
  const update = useCallback(async () => {
    await skipWaiting();
    if (mountedRef.current) {
      setIsUpdateAvailable(false);
    }
  }, []);

  // Check for updates
  const checkUpdates = useCallback(async () => {
    return checkForUpdates();
  }, []);

  // Request push permission
  const requestPushPerm = useCallback(async () => {
    const permission = await requestNotificationPermission();
    if (mountedRef.current) {
      setPushPermission(permission);
    }
    return permission;
  }, []);

  // Subscribe to push
  const subscribePush = useCallback(async () => {
    const subscription = await subscribeToPush();
    if (mountedRef.current) {
      setIsPushSubscribed(!!subscription);
      setPushSubscription(subscription);
    }
    return subscription;
  }, []);

  // Unsubscribe from push
  const unsubscribePush = useCallback(async () => {
    const result = await unsubscribeFromPush();
    if (result && mountedRef.current) {
      setIsPushSubscribed(false);
      setPushSubscription(null);
    }
    return result;
  }, []);

  // Prompt install
  const promptInstall = useCallback(async () => {
    if (!deferredPromptRef.current) {
      return false;
    }

    await deferredPromptRef.current.prompt();
    const { outcome } = await deferredPromptRef.current.userChoice;

    deferredPromptRef.current = null;
    if (mountedRef.current) {
      setIsInstallable(false);
    }

    if (outcome === "accepted") {
      if (mountedRef.current) {
        setIsInstalled(true);
      }
      return true;
    }

    return false;
  }, []);

  // Initial setup
  useEffect(() => {
    mountedRef.current = true;

    // Set initial online state
    setIsOnline(navigator.onLine);

    // Check if already installed
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true;

    if (isStandalone) {
      setIsInstalled(true);
    }

    // Get initial push permission
    setPushPermission(getNotificationPermission());

    // Check for existing push subscription
    getSubscription().then((subscription) => {
      if (mountedRef.current) {
        setIsPushSubscribed(!!subscription);
        setPushSubscription(subscription);
      }
    });

    // Auto-register service worker
    if (autoRegister) {
      register();
    } else {
      // Just get current state without registering
      const state = getServiceWorkerState();
      setIsRegistered(state.isRegistered);
      setIsUpdateAvailable(state.isUpdateAvailable);
      setRegistration(state.registration);
    }

    return () => {
      mountedRef.current = false;
    };
  }, [autoRegister, register]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      if (mountedRef.current) {
        setIsOnline(true);
      }
      onOnlineChange?.(true);
    };

    const handleOffline = () => {
      if (mountedRef.current) {
        setIsOnline(false);
      }
      onOnlineChange?.(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [onOnlineChange]);

  // Handle install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      deferredPromptRef.current = e;
      if (mountedRef.current) {
        setIsInstallable(true);
      }
    };

    const handleAppInstalled = () => {
      deferredPromptRef.current = null;
      if (mountedRef.current) {
        setIsInstallable(false);
        setIsInstalled(true);
      }
    };

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt as EventListener,
    );
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt as EventListener,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  // Setup push handlers
  useEffect(() => {
    if (Object.keys(pushHandlers).length === 0) {
      return;
    }

    return setupPushHandlers(pushHandlers);
  }, [pushHandlers]);

  // Listen for service worker messages
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    // Update available message
    unsubscribers.push(
      onServiceWorkerMessage("UPDATE_AVAILABLE", () => {
        if (mountedRef.current) {
          setIsUpdateAvailable(true);
        }
        onUpdateAvailable?.();
      }),
    );

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [onUpdateAvailable]);

  const state: PWAState = {
    isSupported: isServiceWorkerSupported(),
    isRegistered,
    isUpdateAvailable,
    registration,
    isOnline,
    isPushSupported: isPushSupported(),
    pushPermission,
    isPushSubscribed,
    pushSubscription,
    isInstallable,
    isInstalled,
  };

  const actions: PWAActions = {
    register,
    unregister,
    update,
    checkForUpdates: checkUpdates,
    requestPushPermission: requestPushPerm,
    subscribeToPush: subscribePush,
    unsubscribeFromPush: unsubscribePush,
    promptInstall,
  };

  return [state, actions];
}

/**
 * Simple hook for online/offline status
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}

/**
 * Hook for checking if app is installed (standalone mode)
 */
export function useIsInstalled(): boolean {
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true;

    setIsInstalled(isStandalone);

    // Listen for install
    const handleAppInstalled = () => setIsInstalled(true);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  return isInstalled;
}

/**
 * Hook for managing install prompt
 */
export function useInstallPrompt(): {
  isInstallable: boolean;
  isInstalled: boolean;
  promptInstall: () => Promise<boolean>;
} {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      deferredPromptRef.current = e;
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      deferredPromptRef.current = null;
      setIsInstallable(false);
      setIsInstalled(true);
    };

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt as EventListener,
    );
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt as EventListener,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPromptRef.current) {
      return false;
    }

    await deferredPromptRef.current.prompt();
    const { outcome } = await deferredPromptRef.current.userChoice;

    deferredPromptRef.current = null;
    setIsInstallable(false);

    if (outcome === "accepted") {
      setIsInstalled(true);
      return true;
    }

    return false;
  }, []);

  return { isInstallable, isInstalled, promptInstall };
}

export default usePWA;
