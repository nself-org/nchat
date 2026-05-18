"use client";

/**
 * OfflineMode - Offline mode wrapper component
 *
 * Wraps content to show offline state and handle
 * offline mode functionality.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { useConnectionStatus } from "@/hooks/useConnectionStatus";
import { useOfflineStore } from "@/stores/offline-store";
import { OfflineBanner } from "./OfflineBanner";
import { ConnectionBanner } from "@/components/connection/ConnectionBanner";

// =============================================================================
// Types
// =============================================================================

export interface OfflineModeProps {
  children: React.ReactNode;
  className?: string;
  showBanner?: boolean;
  bannerPosition?: "top" | "bottom";
  fallback?: React.ReactNode;
  offlineContent?: React.ReactNode;
}

// =============================================================================
// Component
// =============================================================================

export function OfflineMode({
  children,
  className,
  showBanner = true,
  bannerPosition = "top",
  fallback,
  offlineContent,
}: OfflineModeProps) {
  const { isOffline, isReconnecting } = useConnectionStatus();
  const { settings } = useOfflineStore();
  const showOfflineIndicator = settings.showOfflineIndicator;

  // If completely offline and no cached content, show fallback
  if (isOffline && fallback && !offlineContent) {
    return (
      <div className={cn("relative", className)}>
        {showBanner && showOfflineIndicator && (
          <ConnectionBanner position={bannerPosition} />
        )}
        {fallback}
      </div>
    );
  }

  // If offline and has offline content to show
  if (isOffline && offlineContent) {
    return (
      <div className={cn("relative", className)}>
        {showBanner && showOfflineIndicator && (
          <OfflineBanner position={bannerPosition} />
        )}
        {offlineContent}
      </div>
    );
  }

  // Normal mode - show children with optional offline banner
  return (
    <div className={cn("relative", className)}>
      {showBanner && showOfflineIndicator && (isOffline || isReconnecting) && (
        <ConnectionBanner position={bannerPosition} />
      )}
      <div
        className={cn(
          showBanner &&
            showOfflineIndicator &&
            (isOffline || isReconnecting) &&
            bannerPosition === "top" &&
            "pt-10",
        )}
      >
        {children}
      </div>
    </div>
  );
}

// =============================================================================
// Context for Offline Mode
// =============================================================================

interface OfflineModeContextValue {
  isOffline: boolean;
  isReconnecting: boolean;
  canSendMessages: boolean;
}

const OfflineModeContext = React.createContext<OfflineModeContextValue | null>(
  null,
);

export function useOfflineMode() {
  const context = React.useContext(OfflineModeContext);
  if (!context) {
    // Return default values if not in context
    return {
      isOffline: false,
      isReconnecting: false,
      canSendMessages: true,
    };
  }
  return context;
}

/**
 * Provider that provides offline mode context
 */
export function OfflineModeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isOffline, isReconnecting, canSendMessages } = useConnectionStatus();

  const value = React.useMemo(
    () => ({
      isOffline,
      isReconnecting,
      canSendMessages,
    }),
    [isOffline, isReconnecting, canSendMessages],
  );

  return (
    <OfflineModeContext.Provider value={value}>
      {children}
    </OfflineModeContext.Provider>
  );
}

export default OfflineMode;
