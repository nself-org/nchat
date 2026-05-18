"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Wifi, WifiOff, RefreshCw, CloudOff, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { onServiceWorkerMessage } from "@/lib/pwa/register-sw";

export interface OfflineIndicatorProps {
  /** Custom offline message */
  offlineMessage?: string;
  /** Custom online message */
  onlineMessage?: string;
  /** Show toast when coming back online */
  showOnlineToast?: boolean;
  /** Duration to show online toast (ms) */
  onlineToastDuration?: number;
  /** Position of the indicator */
  position?: "top" | "bottom";
  /** Callback when online status changes */
  onStatusChange?: (isOnline: boolean) => void;
  /** Custom class name */
  className?: string;
  /** Show pending actions count */
  showPendingActions?: boolean;
}

interface PendingAction {
  id: string;
  type: string;
  timestamp: number;
  description: string;
}

export function OfflineIndicator({
  offlineMessage = "You are offline. Some features may be limited.",
  onlineMessage = "Back online!",
  showOnlineToast = true,
  onlineToastDuration = 3000,
  position = "top",
  onStatusChange,
  className = "",
  showPendingActions = true,
}: OfflineIndicatorProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [showOnline, setShowOnline] = useState(false);
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const wasOfflineRef = useRef(false);
  const onlineTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle online/offline status
  useEffect(() => {
    // Set initial state
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);

      // Show online toast if we were previously offline
      if (wasOfflineRef.current && showOnlineToast) {
        setShowOnline(true);

        // Hide after duration
        onlineTimeoutRef.current = setTimeout(() => {
          setShowOnline(false);
        }, onlineToastDuration);
      }

      wasOfflineRef.current = false;
      onStatusChange?.(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
      wasOfflineRef.current = true;
      setShowOnline(false);
      onStatusChange?.(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (onlineTimeoutRef.current) {
        clearTimeout(onlineTimeoutRef.current);
      }
    };
  }, [showOnlineToast, onlineToastDuration, onStatusChange]);

  // Listen for sync complete messages
  useEffect(() => {
    const unsubscribe = onServiceWorkerMessage(
      "SYNC_COMPLETE",
      (data: unknown) => {
        const syncData = data as { url?: string; timestamp?: number };

        // Remove synced action from pending list
        setPendingActions((prev) =>
          prev.filter((action) => action.timestamp !== syncData.timestamp),
        );
      },
    );

    return unsubscribe;
  }, []);

  // Get pending actions from IndexedDB
  useEffect(() => {
    if (!showPendingActions) return;

    const loadPendingActions = async () => {
      try {
        const db = await openDatabase();
        const actions = await getPendingRequests(db);
        setPendingActions(
          actions.map((action) => ({
            id: action.id.toString(),
            type: action.body?.type || "message",
            timestamp: action.timestamp,
            description: getActionDescription(action),
          })),
        );
      } catch {
        // IndexedDB not available or no pending actions
      }
    };

    if (!isOnline) {
      loadPendingActions();
      // Refresh every 5 seconds while offline
      const interval = setInterval(loadPendingActions, 5000);
      return () => clearInterval(interval);
    }
  }, [isOnline, showPendingActions]);

  const handleRetry = useCallback(() => {
    // Attempt to reconnect
    window.location.reload();
  }, []);

  // Don't render if online and not showing online toast
  if (isOnline && !showOnline) {
    return null;
  }

  const positionClasses =
    position === "top" ? "top-0 rounded-b-lg" : "bottom-0 rounded-t-lg";

  // Online toast
  if (isOnline && showOnline) {
    return (
      <div
        className={`fixed ${positionClasses} animate-slide-in left-1/2 z-50 -translate-x-1/2 ${className}`}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center gap-2 bg-green-500 px-4 py-2 text-white shadow-lg">
          <Wifi className="h-4 w-4" />
          <span className="text-sm font-medium">{onlineMessage}</span>
        </div>
      </div>
    );
  }

  // Offline indicator
  return (
    <div
      className={`fixed ${positionClasses} left-0 right-0 z-50 ${className}`}
      role="alert"
      aria-live="assertive"
    >
      <div className="bg-amber-500 text-white">
        {/* Main banner */}
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            <WifiOff className="h-4 w-4" />
            <span className="text-sm font-medium">{offlineMessage}</span>
          </div>

          <div className="flex items-center gap-2">
            {showPendingActions && pendingActions.length > 0 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-1 rounded bg-amber-600 px-2 py-1 text-xs transition-colors hover:bg-amber-700"
              >
                <Clock className="h-3 w-3" />
                {pendingActions.length} pending
              </button>
            )}

            <Button
              onClick={handleRetry}
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-white hover:bg-amber-600"
            >
              <RefreshCw className="mr-1 h-3 w-3" />
              Retry
            </Button>
          </div>
        </div>

        {/* Expanded pending actions */}
        {isExpanded && pendingActions.length > 0 && (
          <div className="border-t border-amber-600 px-4 pb-3">
            <div className="mt-2 space-y-2">
              <p className="text-xs text-amber-100">
                These actions will be synced when you are back online:
              </p>
              {pendingActions.slice(0, 5).map((action) => (
                <div
                  key={action.id}
                  className="flex items-center gap-2 rounded bg-amber-600/50 px-2 py-1 text-xs"
                >
                  <CloudOff className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{action.description}</span>
                  <span className="flex-shrink-0 text-amber-200">
                    {formatTimestamp(action.timestamp)}
                  </span>
                </div>
              ))}
              {pendingActions.length > 5 && (
                <p className="text-xs text-amber-200">
                  +{pendingActions.length - 5} more actions pending
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateX(-50%)
              translateY(${position === "top" ? "-100%" : "100%"});
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

/**
 * Compact offline badge for use in navigation
 */
export function OfflineBadge({ className = "" }: { className?: string }) {
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

  if (isOnline) {
    return null;
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 ${className}`}
      title="You are offline"
    >
      <WifiOff className="h-3 w-3" />
      Offline
    </span>
  );
}

/**
 * Full-screen offline overlay
 */
export function OfflineOverlay({
  title = "You are offline",
  description = "Please check your internet connection and try again.",
  showRetry = true,
}: {
  title?: string;
  description?: string;
  showRetry?: boolean;
}) {
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

  if (isOnline) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/90 backdrop-blur-sm dark:bg-zinc-900/90">
      <div className="max-w-md p-8 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
          <WifiOff className="h-8 w-8 text-amber-600 dark:text-amber-400" />
        </div>

        <h2 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-white">
          {title}
        </h2>

        <p className="mb-6 text-zinc-600 dark:text-zinc-400">{description}</p>

        {showRetry && (
          <Button
            onClick={() => window.location.reload()}
            className="bg-indigo-600 text-white hover:bg-indigo-700"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try again
          </Button>
        )}
      </div>
    </div>
  );
}

// Helper functions

const DB_NAME = "nchat-offline";
const DB_VERSION = 1;
const STORE_NAME = "pending-requests";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    };
  });
}

interface PendingRequest {
  id: number;
  url: string;
  timestamp: number;
  body?: { type?: string; content?: string; channelId?: string };
}

function getPendingRequests(db: IDBDatabase): Promise<PendingRequest[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function getActionDescription(action: {
  url: string;
  body?: { type?: string; content?: string; channelId?: string };
}): string {
  const url = new URL(action.url, window.location.origin);

  if (url.pathname.includes("/messages")) {
    return `Send message${action.body?.channelId ? ` to channel` : ""}`;
  }
  if (url.pathname.includes("/reactions")) {
    return "Add reaction";
  }
  if (url.pathname.includes("/read")) {
    return "Mark as read";
  }

  return "Pending action";
}

function formatTimestamp(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  return `${Math.floor(hours / 24)}d ago`;
}

export default OfflineIndicator;
