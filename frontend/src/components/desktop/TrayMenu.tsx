"use client";

import React, { useEffect } from "react";
import { useSystemTray } from "@/hooks/useSystemTray";
import { useTauri } from "@/hooks/useTauri";
import type { UserStatus } from "@/lib/tauri";

export interface TrayMenuProps {
  unreadCount?: number;
  userStatus?: UserStatus;
  onNewMessage?: () => void;
  onNewChannel?: () => void;
  onStatusChange?: (status: UserStatus) => void;
  onPreferences?: () => void;
}

/**
 * Component that manages the system tray state.
 * This is a non-visual component that syncs app state to the tray.
 */
export function TrayMenu({
  unreadCount = 0,
  userStatus = "online",
  onNewMessage,
  onNewChannel,
  onStatusChange,
  onPreferences,
}: TrayMenuProps) {
  const { isTauri } = useTauri();
  const { setUnread, setStatus, isAvailable } = useSystemTray({
    onNewMessage,
    onNewChannel,
    onStatusChange,
    onPreferences,
  });

  // Sync unread count to tray
  useEffect(() => {
    if (isAvailable) {
      setUnread(unreadCount);
    }
  }, [unreadCount, isAvailable, setUnread]);

  // Sync user status to tray
  useEffect(() => {
    if (isAvailable) {
      setStatus(userStatus);
    }
  }, [userStatus, isAvailable, setStatus]);

  // This component doesn't render anything
  return null;
}

export default TrayMenu;
