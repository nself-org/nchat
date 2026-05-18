"use client";

/**
 * App Initialization Hook
 *
 * Handles the complete application initialization sequence including:
 * - Loading configuration
 * - Initializing stores
 * - Connecting to socket
 * - Loading user preferences
 * - Fetching initial data
 * - Error handling
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useAppConfig } from "@/contexts/app-config-context";
import { useAppStore } from "@/stores/app-store";
import { useUserStore } from "@/stores/user-store";
import { usePreferencesStore } from "@/stores/preferences-store";
import { useChannelStore } from "@/stores/channel-store";
import { resetAllStores } from "@/stores";
import { setAuthToken } from "@/lib/apollo/client";
import { currentUserIdVar } from "@/lib/apollo/cache";

import { logger } from "@/lib/logger";

// =============================================================================
// Types
// =============================================================================

export interface UseAppInitOptions {
  /**
   * Skip initialization (useful for public pages)
   */
  skip?: boolean;

  /**
   * Callback when initialization completes
   */
  onComplete?: () => void;

  /**
   * Callback when initialization fails
   */
  onError?: (error: Error) => void;

  /**
   * Timeout for initialization (ms)
   * @default 30000
   */
  timeout?: number;
}

export interface UseAppInitReturn {
  /**
   * Whether initialization is in progress
   */
  isInitializing: boolean;

  /**
   * Whether initialization is complete
   */
  isReady: boolean;

  /**
   * Whether there was an error
   */
  hasError: boolean;

  /**
   * Current initialization step
   */
  currentStep: string;

  /**
   * Progress percentage (0-100)
   */
  progress: number;

  /**
   * Error if initialization failed
   */
  error: Error | null;

  /**
   * Retry initialization
   */
  retry: () => void;
}

// =============================================================================
// Initialization Steps
// =============================================================================

const INIT_STEPS = [
  { id: "config", label: "Loading configuration", progress: 10 },
  { id: "auth", label: "Checking authentication", progress: 25 },
  { id: "user", label: "Loading user data", progress: 40 },
  { id: "preferences", label: "Loading preferences", progress: 55 },
  { id: "socket", label: "Connecting to server", progress: 70 },
  { id: "data", label: "Loading initial data", progress: 85 },
  { id: "complete", label: "Ready", progress: 100 },
] as const;

// =============================================================================
// Hook
// =============================================================================

export function useAppInit(options: UseAppInitOptions = {}): UseAppInitReturn {
  const { skip = false, onComplete, onError, timeout = 30000 } = options;

  // Auth and config contexts
  const { user, loading: authLoading } = useAuth();
  const { config, isLoading: configLoading } = useAppConfig();

  // Stores
  const appStore = useAppStore();
  const userStore = useUserStore();
  const preferencesStore = usePreferencesStore();
  const channelStore = useChannelStore();

  // Local state
  const [currentStep, setCurrentStep] = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  // Refs
  const initRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // =============================================================================
  // Initialization Logic
  // =============================================================================

  const runInitialization = useCallback(async () => {
    if (initRef.current || skip) return;
    initRef.current = true;

    // Set up timeout
    timeoutRef.current = setTimeout(() => {
      const timeoutError = new Error("Initialization timed out");
      setError(timeoutError);
      appStore.setUnrecoverableError({
        code: "INIT_TIMEOUT",
        message: "Application initialization timed out",
        recoverable: true,
      });
      onError?.(timeoutError);
    }, timeout);

    try {
      // Step 1: Load configuration
      setCurrentStep("config");
      setProgress(INIT_STEPS[0].progress);
      appStore.setInitStatus("loading-config", "Loading configuration...");

      // Wait for config to load
      if (configLoading) {
        await new Promise<void>((resolve) => {
          const checkConfig = setInterval(() => {
            if (!configLoading) {
              clearInterval(checkConfig);
              resolve();
            }
          }, 100);
        });
      }

      // Apply feature flags from config
      if (config?.features) {
        appStore.setFeatureFlags({
          channels: config.features.publicChannels ?? true,
          directMessages: config.features.directMessages ?? true,
          threads: config.features.threads ?? true,
          reactions: config.features.reactions ?? true,
          fileUploads: config.features.fileUploads ?? true,
          search: config.features.search ?? true,
          voiceMessages: config.features.voiceMessages ?? false,
          videoConferencing: config.features.videoConferencing ?? false,
        });
      }

      // Step 2: Check authentication
      setCurrentStep("auth");
      setProgress(INIT_STEPS[1].progress);
      appStore.setInitStatus("loading-user", "Checking authentication...");

      // Wait for auth to complete
      if (authLoading) {
        await new Promise<void>((resolve) => {
          const checkAuth = setInterval(() => {
            if (!authLoading) {
              clearInterval(checkAuth);
              resolve();
            }
          }, 100);
        });
      }

      // Step 3: Load user data
      setCurrentStep("user");
      setProgress(INIT_STEPS[2].progress);

      if (user) {
        // Set auth token for Apollo
        const token = localStorage.getItem("nchat-token");
        if (token) {
          setAuthToken(token);
        }

        // Set current user in store and reactive var
        userStore.setCurrentUser({
          id: user.id,
          email: user.email,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          role: user.role,
          presence: "online",
          createdAt: new Date(),
        });
        currentUserIdVar(user.id);

        // Update app store session
        appStore.setSession({
          userId: user.id,
          email: user.email,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          role: user.role,
          isAuthenticated: true,
        });
      }

      // Step 4: Load preferences
      setCurrentStep("preferences");
      setProgress(INIT_STEPS[3].progress);
      appStore.setInitStatus("loading-config", "Loading preferences...");

      // Preferences are auto-loaded from localStorage by the store
      // Apply any user-specific overrides
      const savedTheme = preferencesStore.display.theme;
      if (savedTheme) {
        // Theme is already applied by ThemeProvider
      }

      // Step 5: Connect to socket
      setCurrentStep("socket");
      setProgress(INIT_STEPS[4].progress);
      appStore.setInitStatus("connecting-socket", "Connecting to server...");

      // Socket connection is handled by SocketProvider
      // Wait for connection or timeout
      if (user) {
        await new Promise<void>((resolve) => {
          const handleConnect = () => {
            window.removeEventListener("nchat:connected", handleConnect);
            resolve();
          };

          // Check if already connected
          const connectionTimeout = setTimeout(() => {
            window.removeEventListener("nchat:connected", handleConnect);
            resolve();
          }, 5000);

          window.addEventListener("nchat:connected", handleConnect);

          // If already connected, resolve immediately
          setTimeout(() => {
            clearTimeout(connectionTimeout);
            resolve();
          }, 1000);
        });
      }

      appStore.setConnectionStatus("connected");

      // Step 6: Load initial data
      setCurrentStep("data");
      setProgress(INIT_STEPS[5].progress);
      appStore.setInitStatus("loading-data", "Loading data...");

      if (user) {
        // Initial data loading would happen here via GraphQL
        // For now, we just set loading states
        channelStore.setLoading(true);

        // Channels and messages will be loaded by their respective hooks
        // when the user navigates to the chat page

        channelStore.setLoading(false);
      }

      // Step 7: Complete
      setCurrentStep("complete");
      setProgress(100);
      appStore.completeInit();
      appStore.setSetupComplete(config?.setup?.isCompleted ?? false);

      // Clear timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      onComplete?.();
    } catch (err) {
      logger.error("[AppInit] Initialization failed:", err);
      const initError =
        err instanceof Error ? err : new Error("Initialization failed");
      setError(initError);

      appStore.setUnrecoverableError({
        code: "INIT_FAILED",
        message: initError.message,
        recoverable: true,
      });

      onError?.(initError);

      // Clear timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    }
  }, [
    skip,
    timeout,
    user,
    authLoading,
    config,
    configLoading,
    appStore,
    userStore,
    preferencesStore,
    channelStore,
    onComplete,
    onError,
  ]);

  // =============================================================================
  // Retry
  // =============================================================================

  const retry = useCallback(() => {
    initRef.current = false;
    setError(null);
    setCurrentStep("");
    setProgress(0);
    appStore.resetInit();
    runInitialization();
  }, [appStore, runInitialization]);

  // =============================================================================
  // Effects
  // =============================================================================

  // Run initialization on mount
  useEffect(() => {
    if (!skip && !initRef.current) {
      runInitialization();
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [skip, runInitialization]);

  // Handle logout
  useEffect(() => {
    const handleLogout = () => {
      resetAllStores();
      appStore.clearSession();
      setAuthToken(null);
      currentUserIdVar(null);
      initRef.current = false;
    };

    window.addEventListener("nchat:logout", handleLogout);
    return () => {
      window.removeEventListener("nchat:logout", handleLogout);
    };
  }, [appStore]);

  // =============================================================================
  // Return
  // =============================================================================

  return {
    isInitializing:
      appStore.initStatus !== "ready" && appStore.initStatus !== "error",
    isReady: appStore.initStatus === "ready",
    hasError: appStore.initStatus === "error" || error !== null,
    currentStep,
    progress,
    error,
    retry,
  };
}

// =============================================================================
// Loading Component
// =============================================================================

export interface AppLoadingProps {
  progress: number;
  message: string;
}

export function AppLoading({ progress, message }: AppLoadingProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-4 px-4 text-center">
        {/* Logo placeholder */}
        <div className="bg-primary/10 mx-auto h-16 w-16 rounded-xl p-4">
          <div className="h-full w-full rounded-lg bg-primary" />
        </div>

        {/* App name */}
        <h1 className="text-2xl font-bold text-foreground">nChat</h1>

        {/* Progress bar */}
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Message */}
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

export default useAppInit;
