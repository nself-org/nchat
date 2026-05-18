/**
 * Window Management
 *
 * Provides window control and state management for the Electron window.
 * Includes zoom, fullscreen, and visibility controls.
 */

import { isElectron, getElectronAPI } from "./electron-bridge";

import { logger } from "@/lib/logger";

/**
 * Show the main window
 */
export async function showWindow(): Promise<boolean> {
  const api = getElectronAPI();
  if (api) {
    return api.window.show();
  }
  // Web fallback - window is always visible
  return true;
}

/**
 * Hide the main window
 */
export async function hideWindow(): Promise<boolean> {
  const api = getElectronAPI();
  if (api) {
    return api.window.hide();
  }
  // Web fallback - cannot hide browser window
  logger.warn("hideWindow is not available in web environment");
  return false;
}

/**
 * Minimize the main window
 */
export async function minimizeWindow(): Promise<boolean> {
  const api = getElectronAPI();
  if (api) {
    return api.window.minimize();
  }
  // Web fallback - cannot minimize browser window
  logger.warn("minimizeWindow is not available in web environment");
  return false;
}

/**
 * Maximize or unmaximize the main window
 */
export async function maximizeWindow(): Promise<boolean> {
  const api = getElectronAPI();
  if (api) {
    return api.window.maximize();
  }
  // Web fallback - try to toggle fullscreen
  if (document.fullscreenElement) {
    await document.exitFullscreen();
  } else if (document.documentElement.requestFullscreen) {
    await document.documentElement.requestFullscreen();
  }
  return true;
}

/**
 * Toggle fullscreen mode
 */
export async function toggleFullscreen(): Promise<boolean> {
  const api = getElectronAPI();
  if (api) {
    return api.window.toggleFullscreen();
  }
  // Web fallback
  if (document.fullscreenElement) {
    await document.exitFullscreen();
  } else if (document.documentElement.requestFullscreen) {
    await document.documentElement.requestFullscreen();
  }
  return true;
}

/**
 * Check if window is maximized
 */
export async function isWindowMaximized(): Promise<boolean> {
  const api = getElectronAPI();
  if (api) {
    return api.window.isMaximized();
  }
  // Web fallback - check if window fills screen
  return (
    window.outerWidth >= screen.availWidth &&
    window.outerHeight >= screen.availHeight
  );
}

/**
 * Check if window is in fullscreen mode
 */
export async function isWindowFullscreen(): Promise<boolean> {
  const api = getElectronAPI();
  if (api) {
    return api.window.isFullscreen();
  }
  // Web fallback
  return !!document.fullscreenElement;
}

/**
 * Check if window is focused
 */
export async function isWindowFocused(): Promise<boolean> {
  const api = getElectronAPI();
  if (api) {
    return api.window.isFocused();
  }
  // Web fallback
  return document.hasFocus();
}

// ===== Zoom Controls =====

/**
 * Set the zoom level (1.0 = 100%, 1.5 = 150%, etc.)
 */
export async function setZoomLevel(level: number): Promise<number> {
  const api = getElectronAPI();
  if (api) {
    return api.window.setZoom(level);
  }
  // Web fallback using CSS zoom
  document.body.style.zoom = `${level * 100}%`;
  return level;
}

/**
 * Get the current zoom level
 */
export async function getZoomLevel(): Promise<number> {
  const api = getElectronAPI();
  if (api) {
    return api.window.getZoom();
  }
  // Web fallback
  const zoom = document.body.style.zoom;
  return zoom ? parseFloat(zoom) / 100 : 1;
}

/**
 * Zoom in by 10%
 */
export async function zoomIn(): Promise<number> {
  const api = getElectronAPI();
  if (api) {
    return api.window.zoomIn();
  }
  // Web fallback
  const current = await getZoomLevel();
  return setZoomLevel(Math.min(2, current + 0.1));
}

/**
 * Zoom out by 10%
 */
export async function zoomOut(): Promise<number> {
  const api = getElectronAPI();
  if (api) {
    return api.window.zoomOut();
  }
  // Web fallback
  const current = await getZoomLevel();
  return setZoomLevel(Math.max(0.5, current - 0.1));
}

/**
 * Reset zoom to 100%
 */
export async function resetZoom(): Promise<number> {
  const api = getElectronAPI();
  if (api) {
    return api.window.resetZoom();
  }
  // Web fallback
  return setZoomLevel(1);
}

// ===== Reload & Cache =====

/**
 * Reload the window
 */
export async function reloadWindow(): Promise<boolean> {
  const api = getElectronAPI();
  if (api) {
    return api.window.reload();
  }
  // Web fallback
  window.location.reload();
  return true;
}

/**
 * Clear the cache
 */
export async function clearCache(): Promise<boolean> {
  const api = getElectronAPI();
  if (api) {
    return api.window.clearCache();
  }
  // Web fallback - clear service worker caches
  if ("caches" in window) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));
    return true;
  }
  return false;
}

// ===== Window State =====

export interface WindowState {
  isMaximized: boolean;
  isFullscreen: boolean;
  isFocused: boolean;
  zoomLevel: number;
}

/**
 * Get the complete window state
 */
export async function getWindowState(): Promise<WindowState> {
  const [isMaximized, isFullscreen, isFocused, zoomLevel] = await Promise.all([
    isWindowMaximized(),
    isWindowFullscreen(),
    isWindowFocused(),
    getZoomLevel(),
  ]);

  return {
    isMaximized,
    isFullscreen,
    isFocused,
    zoomLevel,
  };
}

/**
 * Setup window state change listeners
 */
export function onWindowStateChange(
  callback: (state: Partial<WindowState>) => void,
): () => void {
  const handlers: Array<() => void> = [];

  // Focus change
  const handleFocus = () => callback({ isFocused: true });
  const handleBlur = () => callback({ isFocused: false });
  window.addEventListener("focus", handleFocus);
  window.addEventListener("blur", handleBlur);
  handlers.push(() => {
    window.removeEventListener("focus", handleFocus);
    window.removeEventListener("blur", handleBlur);
  });

  // Fullscreen change
  const handleFullscreenChange = async () => {
    callback({ isFullscreen: await isWindowFullscreen() });
  };
  document.addEventListener("fullscreenchange", handleFullscreenChange);
  handlers.push(() => {
    document.removeEventListener("fullscreenchange", handleFullscreenChange);
  });

  // Return cleanup function
  return () => {
    handlers.forEach((cleanup) => cleanup());
  };
}

/**
 * Get keyboard shortcut modifier key based on platform
 */
export function getModifierKey(): "Meta" | "Control" {
  const api = getElectronAPI();
  if (api) {
    return api.platform.isMac ? "Meta" : "Control";
  }
  return navigator.platform.toLowerCase().includes("mac") ? "Meta" : "Control";
}

/**
 * Get keyboard shortcut label based on platform
 */
export function getModifierLabel(): string {
  const api = getElectronAPI();
  if (api) {
    return api.platform.isMac ? "⌘" : "Ctrl";
  }
  return navigator.platform.toLowerCase().includes("mac") ? "⌘" : "Ctrl";
}
