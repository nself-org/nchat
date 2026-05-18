/**
 * Window Management - Handles native window operations
 *
 * This module provides utilities for controlling the native window
 * in Tauri desktop apps.
 */

import { invoke, invokeOrFallback, isTauri } from "./tauri-bridge";

/**
 * Show the main window
 */
export async function showWindow(): Promise<void> {
  return invokeOrFallback("show_window", undefined, undefined);
}

/**
 * Hide the main window
 */
export async function hideWindow(): Promise<void> {
  return invokeOrFallback("hide_window", undefined, undefined);
}

/**
 * Minimize the main window
 */
export async function minimizeWindow(): Promise<void> {
  return invokeOrFallback("minimize_window", undefined, undefined);
}

/**
 * Maximize or restore the main window
 */
export async function maximizeWindow(): Promise<void> {
  return invokeOrFallback("maximize_window", undefined, undefined);
}

/**
 * Close the main window
 */
export async function closeWindow(): Promise<void> {
  if (isTauri()) {
    return invoke("close_window");
  }
  // Web fallback: try to close window
  if (typeof window !== "undefined") {
    window.close();
  }
}

/**
 * Focus the main window
 */
export async function focusWindow(): Promise<void> {
  if (isTauri()) {
    return invoke("focus_window");
  }
  // Web fallback: bring tab to focus
  if (typeof window !== "undefined") {
    window.focus();
  }
}

/**
 * Check if the window is focused
 */
export async function isWindowFocused(): Promise<boolean> {
  if (isTauri()) {
    try {
      return await invoke<boolean>("is_focused");
    } catch {
      return false;
    }
  }
  // Web fallback
  if (typeof document !== "undefined") {
    return document.hasFocus();
  }
  return false;
}

/**
 * Set the dock/taskbar badge count (macOS/Windows)
 */
export async function setBadgeCount(count: number): Promise<void> {
  return invokeOrFallback("set_badge_count", { count }, undefined);
}

/**
 * Clear the dock/taskbar badge
 */
export async function clearBadge(): Promise<void> {
  return invokeOrFallback("clear_badge", undefined, undefined);
}

/**
 * Enter fullscreen mode
 */
export async function enterFullscreen(): Promise<void> {
  if (isTauri()) {
    // Handled by Tauri menu
    return;
  }
  // Web fallback
  if (typeof document !== "undefined" && document.documentElement) {
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      // Fullscreen not supported
    }
  }
}

/**
 * Exit fullscreen mode
 */
export async function exitFullscreen(): Promise<void> {
  if (isTauri()) {
    // Handled by Tauri menu
    return;
  }
  // Web fallback
  if (typeof document !== "undefined" && document.fullscreenElement) {
    try {
      await document.exitFullscreen();
    } catch {
      // Fullscreen not supported
    }
  }
}

/**
 * Check if currently in fullscreen
 */
export function isFullscreen(): boolean {
  if (typeof document !== "undefined") {
    return document.fullscreenElement !== null;
  }
  return false;
}

/**
 * Toggle fullscreen mode
 */
export async function toggleFullscreen(): Promise<void> {
  if (isFullscreen()) {
    await exitFullscreen();
  } else {
    await enterFullscreen();
  }
}

export default {
  showWindow,
  hideWindow,
  minimizeWindow,
  maximizeWindow,
  closeWindow,
  focusWindow,
  isWindowFocused,
  setBadgeCount,
  clearBadge,
  enterFullscreen,
  exitFullscreen,
  isFullscreen,
  toggleFullscreen,
};
