"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { usePWA, type PWAState, type PWAActions } from "@/hooks/use-pwa";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { UpdatePrompt } from "@/components/pwa/update-prompt";
import { OfflineIndicator } from "@/components/pwa/offline-indicator";

// =============================================================================
// Types
// =============================================================================

export interface PWAContextValue {
  state: PWAState;
  actions: PWAActions;
}

export interface PWAProviderProps {
  children: ReactNode;
  /** Show install prompt automatically */
  showInstallPrompt?: boolean;
  /** Show update prompt automatically */
  showUpdatePrompt?: boolean;
  /** Show offline indicator */
  showOfflineIndicator?: boolean;
  /** Delay before showing install prompt (ms) */
  installPromptDelay?: number;
  /** Auto-register service worker */
  autoRegister?: boolean;
}

// =============================================================================
// Context
// =============================================================================

const PWAContext = createContext<PWAContextValue | null>(null);

/**
 * Hook to access PWA state and actions
 */
export function usePWAContext(): PWAContextValue {
  const context = useContext(PWAContext);
  if (!context) {
    throw new Error("usePWAContext must be used within a PWAProvider");
  }
  return context;
}

// =============================================================================
// Provider Component
// =============================================================================

/**
 * PWA Provider Component
 *
 * Provides PWA functionality throughout the app including:
 * - Service worker registration and updates
 * - Install prompt
 * - Offline indicator
 * - Push notification management
 */
export function PWAProvider({
  children,
  showInstallPrompt = true,
  showUpdatePrompt = true,
  showOfflineIndicator = true,
  installPromptDelay = 5000,
  autoRegister = true,
}: PWAProviderProps) {
  const [mounted, setMounted] = useState(false);

  // Use the PWA hook
  const [state, actions] = usePWA({
    autoRegister,
    onOnlineChange: (isOnline) => {
      // Dispatch custom event for other components to listen to
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("nchat:online-change", {
            detail: { isOnline },
          }),
        );
      }
    },
    onUpdateAvailable: () => {
      // Dispatch custom event for update available
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("nchat:update-available"));
      }
    },
    pushHandlers: {
      onNotificationClick: (data) => {
        // Handle notification click
        window.dispatchEvent(
          new CustomEvent("nchat:notification-click", { detail: data }),
        );
      },
      onNotificationDismissed: (data) => {},
      onSyncComplete: (data) => {
        window.dispatchEvent(
          new CustomEvent("nchat:sync-complete", { detail: data }),
        );
      },
    },
  });

  // Handle client-side mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  // Context value
  const contextValue: PWAContextValue = {
    state,
    actions,
  };

  return (
    <PWAContext.Provider value={contextValue}>
      {children}

      {/* PWA UI Components - only render on client */}
      {mounted && (
        <>
          {/* Install prompt */}
          {showInstallPrompt && (
            <InstallPrompt
              showDelay={installPromptDelay}
              onInstall={() => {
                window.dispatchEvent(new CustomEvent("nchat:installed"));
              }}
              onDismiss={() => {}}
            />
          )}

          {/* Update prompt */}
          {showUpdatePrompt && (
            <UpdatePrompt
              autoReload={true}
              onUpdate={() => {}}
              onDismiss={() => {}}
            />
          )}

          {/* Offline indicator */}
          {showOfflineIndicator && (
            <OfflineIndicator
              position="top"
              showOnlineToast={true}
              onlineToastDuration={3000}
            />
          )}
        </>
      )}
    </PWAContext.Provider>
  );
}

// =============================================================================
// Utility Components
// =============================================================================

/**
 * Component that only renders when online
 */
export function OnlineOnly({ children }: { children: ReactNode }) {
  const { state } = usePWAContext();
  return state.isOnline ? <>{children}</> : null;
}

/**
 * Component that only renders when offline
 */
export function OfflineOnly({ children }: { children: ReactNode }) {
  const { state } = usePWAContext();
  return !state.isOnline ? <>{children}</> : null;
}

/**
 * Component that only renders when installed (standalone mode)
 */
export function InstalledOnly({ children }: { children: ReactNode }) {
  const { state } = usePWAContext();
  return state.isInstalled ? <>{children}</> : null;
}

/**
 * Component that only renders when NOT installed (browser mode)
 */
export function BrowserOnly({ children }: { children: ReactNode }) {
  const { state } = usePWAContext();
  return !state.isInstalled ? <>{children}</> : null;
}

// =============================================================================
// Exports
// =============================================================================

export default PWAProvider;
