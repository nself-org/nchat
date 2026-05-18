"use client";

import { useState, useEffect, useCallback } from "react";
import { X, RefreshCw, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { skipWaiting, onServiceWorkerMessage } from "@/lib/pwa/register-sw";

import { logger } from "@/lib/logger";

export interface UpdatePromptProps {
  /** Custom title for the prompt */
  title?: string;
  /** Custom description for the prompt */
  description?: string;
  /** Custom update button text */
  updateText?: string;
  /** Custom dismiss button text */
  dismissText?: string;
  /** Whether to auto-reload after update */
  autoReload?: boolean;
  /** Callback when update is applied */
  onUpdate?: () => void;
  /** Callback when prompt is dismissed */
  onDismiss?: () => void;
  /** Custom class name */
  className?: string;
  /** Position of the prompt */
  position?: "top" | "bottom";
}

export function UpdatePrompt({
  title = "Update available",
  description = "A new version of nChat is available. Update now for the latest features and improvements.",
  updateText = "Update now",
  dismissText = "Later",
  autoReload = true,
  onUpdate,
  onDismiss,
  className = "",
  position = "bottom",
}: UpdatePromptProps) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Listen for update available message from service worker
  useEffect(() => {
    // Check if there's a waiting service worker on mount
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        if (registration.waiting) {
          setShowPrompt(true);
        }
      });
    }

    // Listen for update found
    const handleUpdateFound = () => {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.ready.then((registration) => {
          const newWorker = registration.installing;

          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (
                newWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                setShowPrompt(true);
              }
            });
          }
        });
      }
    };

    // Listen for controller change (after update applied)
    const handleControllerChange = () => {
      if (isUpdating && autoReload) {
        window.location.reload();
      }
    };

    navigator.serviceWorker?.addEventListener(
      "controllerchange",
      handleControllerChange,
    );

    // Check for updates periodically
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.addEventListener("updatefound", handleUpdateFound);
      });
    }

    return () => {
      navigator.serviceWorker?.removeEventListener(
        "controllerchange",
        handleControllerChange,
      );
    };
  }, [autoReload, isUpdating]);

  // Listen for messages from service worker
  useEffect(() => {
    const unsubscribe = onServiceWorkerMessage("UPDATE_AVAILABLE", () => {
      setShowPrompt(true);
    });

    return unsubscribe;
  }, []);

  const handleUpdate = useCallback(async () => {
    setIsUpdating(true);

    try {
      // Tell the waiting service worker to activate
      await skipWaiting();

      onUpdate?.();

      // If autoReload is false, hide the prompt
      if (!autoReload) {
        setShowPrompt(false);
        setIsUpdating(false);
      }
      // If autoReload is true, the page will reload when controllerchange fires
    } catch (error) {
      logger.error("[PWA] Error updating service worker:", error);
      setIsUpdating(false);
    }
  }, [autoReload, onUpdate]);

  const handleDismiss = useCallback(() => {
    setShowPrompt(false);
    onDismiss?.();
  }, [onDismiss]);

  if (!showPrompt) {
    return null;
  }

  const positionClasses = position === "top" ? "top-4" : "bottom-4";

  return (
    <div
      className={`fixed ${positionClasses} animate-slide-in left-4 right-4 z-50 md:left-auto md:right-4 md:w-96 ${className}`}
      role="alertdialog"
      aria-labelledby="update-prompt-title"
      aria-describedby="update-prompt-description"
    >
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
        {/* Header with gradient */}
        <div className="flex items-center justify-between bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-2">
          <div className="flex items-center gap-2 text-white">
            <Info className="h-4 w-4" />
            <span className="text-sm font-medium">New version available</span>
          </div>
          <button
            onClick={handleDismiss}
            className="rounded-full p-1 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Dismiss update prompt"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3
            id="update-prompt-title"
            className="text-base font-semibold text-zinc-900 dark:text-white"
          >
            {title}
          </h3>
          <p
            id="update-prompt-description"
            className="mt-1 text-sm text-zinc-600 dark:text-zinc-400"
          >
            {description}
          </p>

          {/* Version info (optional) */}
          <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              Ready to install
            </span>
          </div>

          {/* Buttons */}
          <div className="mt-4 flex items-center gap-3">
            <Button
              onClick={handleUpdate}
              disabled={isUpdating}
              className="flex-1 bg-indigo-600 text-white hover:bg-indigo-700"
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isUpdating ? "animate-spin" : ""}`}
              />
              {isUpdating ? "Updating..." : updateText}
            </Button>
            <Button
              onClick={handleDismiss}
              variant="ghost"
              disabled={isUpdating}
              className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            >
              {dismissText}
            </Button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateY(${position === "top" ? "-20px" : "20px"});
          }
          to {
            opacity: 1;
            transform: translateY(0);
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
 * Minimal update indicator for use in navigation
 */
export function UpdateIndicator({
  onClick,
  className = "",
}: {
  onClick?: () => void;
  className?: string;
}) {
  const [hasUpdate, setHasUpdate] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        if (registration.waiting) {
          setHasUpdate(true);
        }

        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (
                newWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                setHasUpdate(true);
              }
            });
          }
        });
      });
    }
  }, []);

  if (!hasUpdate) {
    return null;
  }

  return (
    <button
      onClick={onClick}
      className={`relative rounded-full p-2 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 ${className}`}
      title="Update available"
    >
      <RefreshCw className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
      <span className="absolute right-0 top-0 h-2 w-2 animate-pulse rounded-full bg-red-500" />
    </button>
  );
}

/**
 * Toast-style update notification
 */
export function UpdateToast({
  onUpdate,
  onDismiss,
}: {
  onUpdate?: () => void;
  onDismiss?: () => void;
}) {
  const [show, setShow] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        if (registration.waiting) {
          setShow(true);
        }

        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (
                newWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                setShow(true);
              }
            });
          }
        });
      });

      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (updating) {
          window.location.reload();
        }
      });
    }
  }, [updating]);

  const handleUpdate = async () => {
    setUpdating(true);
    await skipWaiting();
    onUpdate?.();
  };

  const handleDismiss = () => {
    setShow(false);
    onDismiss?.();
  };

  if (!show) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
      <div className="flex items-center gap-3 rounded-full bg-zinc-900 px-4 py-2 text-white shadow-lg dark:bg-zinc-100 dark:text-zinc-900">
        <span className="text-sm">New version available</span>
        <button
          onClick={handleUpdate}
          disabled={updating}
          className="text-sm font-medium text-indigo-400 hover:text-indigo-300 dark:text-indigo-600 dark:hover:text-indigo-700"
        >
          {updating ? "Updating..." : "Update"}
        </button>
        <button
          onClick={handleDismiss}
          className="text-zinc-400 hover:text-white dark:text-zinc-600 dark:hover:text-zinc-900"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default UpdatePrompt;
