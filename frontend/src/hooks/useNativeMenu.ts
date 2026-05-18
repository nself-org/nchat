"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  setupMenuListeners,
  setMenuItemEnabled,
  type MenuEventHandlers,
  type NavigationTarget,
} from "@/lib/tauri";
import { useTauriCheck } from "./useTauri";

export interface UseNativeMenuOptions {
  onNewMessage?: () => void;
  onNewChannel?: () => void;
  onPreferences?: () => void;
  onFind?: () => void;
  onToggleSidebar?: () => void;
  onKeyboardShortcuts?: () => void;
  onCheckUpdates?: () => void;
  onAbout?: () => void;
  enableNavigation?: boolean;
}

/**
 * Hook for handling native menu interactions
 */
export function useNativeMenu(options: UseNativeMenuOptions = {}) {
  const isTauri = useTauriCheck();
  const router = useRouter();

  const {
    onNewMessage,
    onNewChannel,
    onPreferences,
    onFind,
    onToggleSidebar,
    onKeyboardShortcuts,
    onCheckUpdates,
    onAbout,
    enableNavigation = true,
  } = options;

  const handleNavigate = useCallback(
    (target: NavigationTarget) => {
      if (!enableNavigation) return;

      switch (target) {
        case "home":
          router.push("/chat");
          break;
        case "channels":
          router.push("/chat/channels");
          break;
        case "messages":
          router.push("/chat/messages");
          break;
        case "threads":
          router.push("/chat/threads");
          break;
        case "settings":
          router.push("/settings");
          break;
      }
    },
    [router, enableNavigation],
  );

  useEffect(() => {
    if (!isTauri) return;

    const handlers: MenuEventHandlers = {
      onNewMessage,
      onNewChannel,
      onPreferences,
      onFind,
      onToggleSidebar,
      onNavigate: handleNavigate,
      onKeyboardShortcuts,
      onCheckUpdates,
      onAbout,
    };

    let cleanup: (() => void) | undefined;

    setupMenuListeners(handlers).then((unsub) => {
      cleanup = unsub;
    });

    return () => {
      cleanup?.();
    };
  }, [
    isTauri,
    onNewMessage,
    onNewChannel,
    onPreferences,
    onFind,
    onToggleSidebar,
    handleNavigate,
    onKeyboardShortcuts,
    onCheckUpdates,
    onAbout,
  ]);

  const enableMenuItem = useCallback(async (id: string) => {
    await setMenuItemEnabled(id, true);
  }, []);

  const disableMenuItem = useCallback(async (id: string) => {
    await setMenuItemEnabled(id, false);
  }, []);

  return {
    enableMenuItem,
    disableMenuItem,
    isAvailable: isTauri,
  };
}

export default useNativeMenu;
