"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Download, Smartphone, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";

import { logger } from "@/lib/logger";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
    appinstalled: Event;
  }
}

export interface InstallPromptProps {
  /** Custom title for the prompt */
  title?: string;
  /** Custom description for the prompt */
  description?: string;
  /** Custom install button text */
  installText?: string;
  /** Custom dismiss button text */
  dismissText?: string;
  /** Delay before showing the prompt (ms) */
  showDelay?: number;
  /** Duration to hide after dismiss (ms) */
  dismissDuration?: number;
  /** Storage key for dismissed state */
  storageKey?: string;
  /** Callback when install succeeds */
  onInstall?: () => void;
  /** Callback when prompt is dismissed */
  onDismiss?: () => void;
  /** Custom class name */
  className?: string;
}

export function InstallPrompt({
  title = "Install nChat",
  description = "Install nChat for quick access and offline support. Get notifications and a native app experience.",
  installText = "Install",
  dismissText = "Not now",
  showDelay = 3000,
  dismissDuration = 7 * 24 * 60 * 60 * 1000, // 7 days
  storageKey = "nchat-install-prompt-dismissed",
  onInstall,
  onDismiss,
  className = "",
}: InstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [platform, setPlatform] = useState<"mobile" | "desktop">("desktop");

  // Check if already installed
  useEffect(() => {
    // Check display mode
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Check if dismissed recently
    const dismissed = localStorage.getItem(storageKey);
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      if (Date.now() - dismissedTime < dismissDuration) {
        return;
      }
    }

    // Detect platform
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    setPlatform(isMobile ? "mobile" : "desktop");
  }, [dismissDuration, storageKey]);

  // Listen for beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();

      // Store the event for later use
      setDeferredPrompt(e);

      // Show the prompt after delay
      setTimeout(() => {
        if (!isInstalled) {
          setShowPrompt(true);
        }
      }, showDelay);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
      localStorage.removeItem(storageKey);
      onInstall?.();
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [isInstalled, showDelay, storageKey, onInstall]);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) {
      // Show manual install instructions for iOS
      if (
        platform === "mobile" &&
        /iPhone|iPad|iPod/i.test(navigator.userAgent)
      ) {
        alert(
          "To install nChat:\n\n" +
            "1. Tap the Share button in Safari\n" +
            '2. Scroll down and tap "Add to Home Screen"\n' +
            '3. Tap "Add" to confirm',
        );
        return;
      }
      return;
    }

    setIsInstalling(true);

    try {
      // Show the install prompt
      await deferredPrompt.prompt();

      // Wait for the user's choice
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === "accepted") {
        setIsInstalled(true);
        onInstall?.();
      } else {
      }

      // Clear the deferred prompt
      setDeferredPrompt(null);
      setShowPrompt(false);
    } catch (error) {
      logger.error("[PWA] Error during install:", error);
    } finally {
      setIsInstalling(false);
    }
  }, [deferredPrompt, platform, onInstall]);

  const handleDismiss = useCallback(() => {
    setShowPrompt(false);
    localStorage.setItem(storageKey, Date.now().toString());
    onDismiss?.();
  }, [storageKey, onDismiss]);

  // Don't render if installed, no prompt, or should be hidden
  if (isInstalled || !showPrompt) {
    return null;
  }

  const PlatformIcon = platform === "mobile" ? Smartphone : Monitor;

  return (
    <div
      className={`fixed bottom-4 left-4 right-4 z-50 animate-slide-up md:left-auto md:right-4 md:w-96 ${className}`}
      role="dialog"
      aria-labelledby="install-prompt-title"
      aria-describedby="install-prompt-description"
    >
      <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute right-2 top-2 rounded-full p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
          aria-label="Dismiss install prompt"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/30">
            <PlatformIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <h3
              id="install-prompt-title"
              className="text-base font-semibold text-zinc-900 dark:text-white"
            >
              {title}
            </h3>
            <p
              id="install-prompt-description"
              className="mt-1 text-sm text-zinc-600 dark:text-zinc-400"
            >
              {description}
            </p>

            {/* Buttons */}
            <div className="mt-4 flex items-center gap-3">
              <Button
                onClick={handleInstall}
                disabled={isInstalling}
                className="flex-1 bg-indigo-600 text-white hover:bg-indigo-700"
              >
                <Download className="mr-2 h-4 w-4" />
                {isInstalling ? "Installing..." : installText}
              </Button>
              <Button
                onClick={handleDismiss}
                variant="ghost"
                className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
              >
                {dismissText}
              </Button>
            </div>
          </div>
        </div>

        {/* Features list */}
        <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-700">
          <div className="grid grid-cols-2 gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              Works offline
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              Push notifications
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              Quick access
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              Full screen mode
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

/**
 * Compact install button for use in navigation or settings
 */
export function InstallButton({
  className = "",
  showLabel = true,
}: {
  className?: string;
  showLabel?: boolean;
}) {
  const [canInstall, setCanInstall] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setCanInstall(false);
      setDeferredPrompt(null);
    };

    // Check if already in standalone mode
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true;

    if (isStandalone) {
      return;
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleClick = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setCanInstall(false);
    }

    setDeferredPrompt(null);
  };

  if (!canInstall) {
    return null;
  }

  return (
    <Button
      onClick={handleClick}
      variant="ghost"
      size="sm"
      className={className}
    >
      <Download className="h-4 w-4" />
      {showLabel && <span className="ml-2">Install App</span>}
    </Button>
  );
}

export default InstallPrompt;
