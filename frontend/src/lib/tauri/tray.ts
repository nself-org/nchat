/**
 * System Tray - Handles system tray interactions
 *
 * This module provides utilities for interacting with the system tray
 * in Tauri desktop apps.
 */

import { invoke, invokeOrFallback, listen, isTauri } from "./tauri-bridge";

export type TrayIconType = "default" | "unread" | "muted" | "dnd";

export type UserStatus = "online" | "away" | "dnd" | "invisible";

export interface TrayEventHandlers {
  onNewMessage?: () => void;
  onNewChannel?: () => void;
  onStatusChange?: (status: UserStatus) => void;
  onPreferences?: () => void;
}

/**
 * Set up tray event listeners
 */
export async function setupTrayListeners(
  handlers: TrayEventHandlers,
): Promise<() => void> {
  if (!isTauri()) {
    return () => {};
  }

  const unsubscribers: Array<() => void> = [];

  if (handlers.onNewMessage) {
    const unsub = await listen("tray-new-message", handlers.onNewMessage);
    unsubscribers.push(unsub);
  }

  if (handlers.onNewChannel) {
    const unsub = await listen("tray-new-channel", handlers.onNewChannel);
    unsubscribers.push(unsub);
  }

  if (handlers.onStatusChange) {
    const unsub = await listen<string>("tray-status-change", (status) => {
      handlers.onStatusChange?.(status as UserStatus);
    });
    unsubscribers.push(unsub);
  }

  if (handlers.onPreferences) {
    const unsub = await listen("tray-preferences", handlers.onPreferences);
    unsubscribers.push(unsub);
  }

  // Return cleanup function
  return () => {
    unsubscribers.forEach((unsub) => unsub());
  };
}

/**
 * Update the tray icon
 */
export async function updateTrayIcon(iconType: TrayIconType): Promise<void> {
  return invokeOrFallback(
    "update_tray_icon",
    { iconType: iconType === "default" ? "normal" : iconType },
    undefined,
  );
}

/**
 * Update the tray tooltip
 */
export async function updateTrayTooltip(tooltip: string): Promise<void> {
  return invokeOrFallback("update_tray_tooltip", { tooltip }, undefined);
}

/**
 * Set tray icon to show unread messages count
 */
export async function setUnreadCount(count: number): Promise<void> {
  if (count > 0) {
    await updateTrayIcon("unread");
    await updateTrayTooltip(
      `nchat - ${count} unread message${count > 1 ? "s" : ""}`,
    );
  } else {
    await updateTrayIcon("default");
    await updateTrayTooltip("nchat");
  }
}

/**
 * Set tray icon based on user status
 */
export async function setTrayStatus(status: UserStatus): Promise<void> {
  switch (status) {
    case "dnd":
      await updateTrayIcon("dnd");
      await updateTrayTooltip("nchat - Do Not Disturb");
      break;
    case "away":
      await updateTrayTooltip("nchat - Away");
      break;
    case "invisible":
      await updateTrayTooltip("nchat - Invisible");
      break;
    default:
      await updateTrayIcon("default");
      await updateTrayTooltip("nchat - Online");
  }
}

export default {
  setupTrayListeners,
  updateTrayIcon,
  updateTrayTooltip,
  setUnreadCount,
  setTrayStatus,
};
