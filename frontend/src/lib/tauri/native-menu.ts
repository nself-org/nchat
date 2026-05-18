/**
 * Native Menu - Handles native menu interactions
 *
 * This module provides utilities for interacting with the native application menu
 * in Tauri desktop apps.
 */

import { invoke, invokeOrFallback, listen, isTauri } from "./tauri-bridge";

export type NavigationTarget =
  | "home"
  | "channels"
  | "messages"
  | "threads"
  | "settings";

export interface MenuEventHandlers {
  onNewMessage?: () => void;
  onNewChannel?: () => void;
  onPreferences?: () => void;
  onFind?: () => void;
  onToggleSidebar?: () => void;
  onNavigate?: (target: NavigationTarget) => void;
  onKeyboardShortcuts?: () => void;
  onCheckUpdates?: () => void;
  onAbout?: () => void;
}

/**
 * Set up menu event listeners
 */
export async function setupMenuListeners(
  handlers: MenuEventHandlers,
): Promise<() => void> {
  if (!isTauri()) {
    return () => {};
  }

  const unsubscribers: Array<() => void> = [];

  if (handlers.onNewMessage) {
    const unsub = await listen("menu-new-message", handlers.onNewMessage);
    unsubscribers.push(unsub);
  }

  if (handlers.onNewChannel) {
    const unsub = await listen("menu-new-channel", handlers.onNewChannel);
    unsubscribers.push(unsub);
  }

  if (handlers.onPreferences) {
    const unsub = await listen("menu-preferences", handlers.onPreferences);
    unsubscribers.push(unsub);
  }

  if (handlers.onFind) {
    const unsub = await listen("menu-find", handlers.onFind);
    unsubscribers.push(unsub);
  }

  if (handlers.onToggleSidebar) {
    const unsub = await listen("menu-toggle-sidebar", handlers.onToggleSidebar);
    unsubscribers.push(unsub);
  }

  if (handlers.onNavigate) {
    const unsub = await listen<string>("menu-navigate", (target) => {
      handlers.onNavigate?.(target as NavigationTarget);
    });
    unsubscribers.push(unsub);
  }

  if (handlers.onKeyboardShortcuts) {
    const unsub = await listen(
      "menu-keyboard-shortcuts",
      handlers.onKeyboardShortcuts,
    );
    unsubscribers.push(unsub);
  }

  if (handlers.onCheckUpdates) {
    const unsub = await listen("menu-check-updates", handlers.onCheckUpdates);
    unsubscribers.push(unsub);
  }

  if (handlers.onAbout) {
    const unsub = await listen("menu-about", handlers.onAbout);
    unsubscribers.push(unsub);
  }

  // Return cleanup function
  return () => {
    unsubscribers.forEach((unsub) => unsub());
  };
}

/**
 * Enable or disable a menu item
 */
export async function setMenuItemEnabled(
  id: string,
  enabled: boolean,
): Promise<void> {
  return invokeOrFallback("set_menu_item_enabled", { id, enabled }, undefined);
}

/**
 * Common menu item IDs
 */
export const MenuItemIds = {
  NEW_MESSAGE: "new_message",
  NEW_CHANNEL: "new_channel",
  PREFERENCES: "preferences",
  FIND: "find",
  RELOAD: "reload",
  FORCE_RELOAD: "force_reload",
  TOGGLE_SIDEBAR: "toggle_sidebar",
  GO_HOME: "go_home",
  GO_CHANNELS: "go_channels",
  GO_MESSAGES: "go_messages",
  GO_THREADS: "go_threads",
  GO_SETTINGS: "go_settings",
  DOCUMENTATION: "documentation",
  KEYBOARD_SHORTCUTS: "keyboard_shortcuts",
  REPORT_ISSUE: "report_issue",
  CHECK_UPDATES: "check_updates",
  ABOUT: "about",
} as const;

export default {
  setupMenuListeners,
  setMenuItemEnabled,
  MenuItemIds,
};
