"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  setupTrayListeners,
  updateTrayIcon,
  updateTrayTooltip,
  setUnreadCount,
  setTrayStatus,
  type TrayEventHandlers,
  type TrayIconType,
  type UserStatus,
} from "@/lib/tauri";
import { useTauriCheck } from "./useTauri";

export interface UseSystemTrayOptions {
  onNewMessage?: () => void;
  onNewChannel?: () => void;
  onStatusChange?: (status: UserStatus) => void;
  onPreferences?: () => void;
}

/**
 * Hook for managing the system tray
 */
export function useSystemTray(options: UseSystemTrayOptions = {}) {
  const isTauri = useTauriCheck();
  const router = useRouter();

  const { onNewMessage, onNewChannel, onStatusChange, onPreferences } = options;

  useEffect(() => {
    if (!isTauri) return;

    const handlers: TrayEventHandlers = {
      onNewMessage,
      onNewChannel,
      onStatusChange,
      onPreferences: onPreferences ?? (() => router.push("/settings")),
    };

    let cleanup: (() => void) | undefined;

    setupTrayListeners(handlers).then((unsub) => {
      cleanup = unsub;
    });

    return () => {
      cleanup?.();
    };
  }, [
    isTauri,
    onNewMessage,
    onNewChannel,
    onStatusChange,
    onPreferences,
    router,
  ]);

  const setIcon = useCallback(
    async (iconType: TrayIconType) => {
      if (!isTauri) return;
      await updateTrayIcon(iconType);
    },
    [isTauri],
  );

  const setTooltip = useCallback(
    async (tooltip: string) => {
      if (!isTauri) return;
      await updateTrayTooltip(tooltip);
    },
    [isTauri],
  );

  const setUnread = useCallback(
    async (count: number) => {
      if (!isTauri) return;
      await setUnreadCount(count);
    },
    [isTauri],
  );

  const setStatus = useCallback(
    async (status: UserStatus) => {
      if (!isTauri) return;
      await setTrayStatus(status);
    },
    [isTauri],
  );

  return {
    setIcon,
    setTooltip,
    setUnread,
    setStatus,
    isAvailable: isTauri,
  };
}

export default useSystemTray;
