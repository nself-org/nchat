/**
 * Auto-Start - Handles launch at login functionality
 *
 * This module provides utilities for managing auto-start behavior
 * in Tauri desktop apps.
 */

import { invoke, invokeOrFallback, isTauri } from "./tauri-bridge";

import { logger } from "@/lib/logger";

/**
 * Check if auto-start feature is available
 */
export function isAutoStartAvailable(): boolean {
  return isTauri();
}

/**
 * Enable auto-start at login
 */
export async function enableAutoStart(): Promise<void> {
  if (!isTauri()) {
    logger.warn("Auto-start is only available in desktop app");
    return;
  }
  return invoke("enable_autostart");
}

/**
 * Disable auto-start at login
 */
export async function disableAutoStart(): Promise<void> {
  if (!isTauri()) {
    logger.warn("Auto-start is only available in desktop app");
    return;
  }
  return invoke("disable_autostart");
}

/**
 * Check if auto-start is enabled
 */
export async function isAutoStartEnabled(): Promise<boolean> {
  if (!isTauri()) {
    return false;
  }
  try {
    return await invoke<boolean>("is_autostart_enabled");
  } catch {
    return false;
  }
}

/**
 * Toggle auto-start at login
 */
export async function toggleAutoStart(): Promise<boolean> {
  const enabled = await isAutoStartEnabled();
  if (enabled) {
    await disableAutoStart();
    return false;
  } else {
    await enableAutoStart();
    return true;
  }
}

export default {
  isAutoStartAvailable,
  enableAutoStart,
  disableAutoStart,
  isAutoStartEnabled,
  toggleAutoStart,
};
