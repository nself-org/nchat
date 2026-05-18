/**
 * useElectronMenu Hook
 *
 * Hook for handling menu events from the Electron application menu.
 * Provides callbacks for various menu actions.
 */

"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  isElectron,
  onNavigate,
  onDeepLink,
  onNavigateToMessage,
  onNewMessage,
  onNewChannel,
  onFind,
  onFindInChannel,
  onToggleSidebar,
  onShowChannels,
  onShowDMs,
  onQuickSwitcher,
  onJumpToConversation,
  onSetStatus,
  type DeepLinkPayload,
  type MessageNavigationPayload,
} from "@/lib/electron";

export interface MenuEventHandlers {
  /** Called when navigating to a path */
  onNavigate?: (path: string) => void;
  /** Called when a deep link is received */
  onDeepLink?: (payload: DeepLinkPayload) => void;
  /** Called when navigating to a specific message */
  onNavigateToMessage?: (payload: MessageNavigationPayload) => void;
  /** Called when "New Message" is triggered */
  onNewMessage?: () => void;
  /** Called when "New Channel" is triggered */
  onNewChannel?: () => void;
  /** Called when "Find" is triggered */
  onFind?: () => void;
  /** Called when "Find in Channel" is triggered */
  onFindInChannel?: () => void;
  /** Called when sidebar toggle is triggered */
  onToggleSidebar?: () => void;
  /** Called when "Show Channels" is triggered */
  onShowChannels?: () => void;
  /** Called when "Show DMs" is triggered */
  onShowDMs?: () => void;
  /** Called when quick switcher is triggered */
  onQuickSwitcher?: () => void;
  /** Called when "Jump to Conversation" is triggered */
  onJumpToConversation?: () => void;
  /** Called when user status change is triggered */
  onSetStatus?: (status: string) => void;
}

/**
 * Hook to handle Electron menu events
 *
 * @example
 * ```tsx
 * useElectronMenu({
 *   onNewMessage: () => setNewMessageDialogOpen(true),
 *   onFind: () => setSearchOpen(true),
 *   onQuickSwitcher: () => setQuickSwitcherOpen(true),
 * });
 * ```
 */
export function useElectronMenu(handlers: MenuEventHandlers = {}): void {
  const router = useRouter();

  useEffect(() => {
    if (!isElectron()) return;

    const cleanups: Array<() => void> = [];

    // Navigation handler
    cleanups.push(
      onNavigate((path) => {
        if (handlers.onNavigate) {
          handlers.onNavigate(path);
        } else {
          router.push(path);
        }
      }),
    );

    // Deep link handler
    if (handlers.onDeepLink) {
      cleanups.push(onDeepLink(handlers.onDeepLink));
    }

    // Message navigation handler
    if (handlers.onNavigateToMessage) {
      cleanups.push(onNavigateToMessage(handlers.onNavigateToMessage));
    }

    // Action handlers
    if (handlers.onNewMessage) {
      cleanups.push(onNewMessage(handlers.onNewMessage));
    }

    if (handlers.onNewChannel) {
      cleanups.push(onNewChannel(handlers.onNewChannel));
    }

    if (handlers.onFind) {
      cleanups.push(onFind(handlers.onFind));
    }

    if (handlers.onFindInChannel) {
      cleanups.push(onFindInChannel(handlers.onFindInChannel));
    }

    if (handlers.onToggleSidebar) {
      cleanups.push(onToggleSidebar(handlers.onToggleSidebar));
    }

    if (handlers.onShowChannels) {
      cleanups.push(onShowChannels(handlers.onShowChannels));
    }

    if (handlers.onShowDMs) {
      cleanups.push(onShowDMs(handlers.onShowDMs));
    }

    if (handlers.onQuickSwitcher) {
      cleanups.push(onQuickSwitcher(handlers.onQuickSwitcher));
    }

    if (handlers.onJumpToConversation) {
      cleanups.push(onJumpToConversation(handlers.onJumpToConversation));
    }

    if (handlers.onSetStatus) {
      cleanups.push(onSetStatus(handlers.onSetStatus));
    }

    // Cleanup
    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [router, handlers]);
}

/**
 * Hook to handle navigation events only
 */
export function useElectronNavigation(
  onNavigateCallback?: (path: string) => void,
): void {
  const router = useRouter();

  useEffect(() => {
    if (!isElectron()) return;

    const cleanup = onNavigate((path) => {
      if (onNavigateCallback) {
        onNavigateCallback(path);
      } else {
        router.push(path);
      }
    });

    return cleanup;
  }, [router, onNavigateCallback]);
}

/**
 * Hook to handle deep link events only
 */
export function useDeepLinks(
  handler: (payload: DeepLinkPayload) => void,
): void {
  useEffect(() => {
    if (!isElectron()) return;
    return onDeepLink(handler);
  }, [handler]);
}

/**
 * Hook to handle quick switcher with keyboard shortcut
 */
export function useQuickSwitcher(
  onOpen: () => void,
  options: { enableKeyboardShortcut?: boolean } = {},
): void {
  const { enableKeyboardShortcut = true } = options;

  // Handle menu event
  useEffect(() => {
    if (!isElectron()) return;
    return onQuickSwitcher(onOpen);
  }, [onOpen]);

  // Handle keyboard shortcut in web
  useEffect(() => {
    if (!enableKeyboardShortcut) return;
    if (isElectron()) return; // Electron handles this via menu

    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onOpen, enableKeyboardShortcut]);
}

/**
 * Hook to handle search with keyboard shortcut
 */
export function useSearch(
  onOpen: () => void,
  options: { enableKeyboardShortcut?: boolean } = {},
): void {
  const { enableKeyboardShortcut = true } = options;

  // Handle menu event
  useEffect(() => {
    if (!isElectron()) return;
    return onFind(onOpen);
  }, [onOpen]);

  // Handle keyboard shortcut in web
  useEffect(() => {
    if (!enableKeyboardShortcut) return;
    if (isElectron()) return; // Electron handles this via menu

    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + F
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        onOpen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onOpen, enableKeyboardShortcut]);
}

export default useElectronMenu;
