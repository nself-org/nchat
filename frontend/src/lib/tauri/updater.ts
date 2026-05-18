/**
 * Auto-Updater - Handles application updates
 *
 * This module provides utilities for checking and installing updates
 * in Tauri desktop apps.
 */

import { invoke, listen, isTauri } from "./tauri-bridge";

import { logger } from "@/lib/logger";

export interface UpdateInfo {
  version: string;
  currentVersion: string;
  body?: string;
  date?: string;
}

export interface UpdateEventHandlers {
  onUpdateAvailable?: (info: UpdateInfo) => void;
  onNoUpdateAvailable?: () => void;
  onDownloadStart?: () => void;
  onDownloadProgress?: (progress: number) => void;
  onDownloadComplete?: () => void;
  onError?: (error: string) => void;
}

/**
 * Check if updater is available
 */
export function isUpdaterAvailable(): boolean {
  return isTauri();
}

/**
 * Set up update event listeners
 */
export async function setupUpdateListeners(
  handlers: UpdateEventHandlers,
): Promise<() => void> {
  if (!isTauri()) {
    return () => {};
  }

  const unsubscribers: Array<() => void> = [];

  if (handlers.onUpdateAvailable) {
    const unsub = await listen<{
      version: string;
      current_version: string;
      body?: string;
      date?: string;
    }>("update-available", (payload) => {
      handlers.onUpdateAvailable?.({
        version: payload.version,
        currentVersion: payload.current_version,
        body: payload.body,
        date: payload.date,
      });
    });
    unsubscribers.push(unsub);
  }

  if (handlers.onNoUpdateAvailable) {
    const unsub = await listen(
      "no-update-available",
      handlers.onNoUpdateAvailable,
    );
    unsubscribers.push(unsub);
  }

  if (handlers.onDownloadStart) {
    const unsub = await listen(
      "update-download-start",
      handlers.onDownloadStart,
    );
    unsubscribers.push(unsub);
  }

  if (handlers.onDownloadProgress) {
    const unsub = await listen<number>(
      "update-download-progress",
      handlers.onDownloadProgress,
    );
    unsubscribers.push(unsub);
  }

  if (handlers.onDownloadComplete) {
    const unsub = await listen(
      "update-download-complete",
      handlers.onDownloadComplete,
    );
    unsubscribers.push(unsub);
  }

  // Return cleanup function
  return () => {
    unsubscribers.forEach((unsub) => unsub());
  };
}

/**
 * Check for updates
 */
export async function checkForUpdates(): Promise<UpdateInfo | null> {
  if (!isTauri()) {
    logger.warn("Updater is only available in desktop app");
    return null;
  }

  try {
    const result = await invoke<{
      version: string;
      current_version: string;
      body?: string;
      date?: string;
    } | null>("check_for_updates");

    if (result) {
      return {
        version: result.version,
        currentVersion: result.current_version,
        body: result.body,
        date: result.date,
      };
    }

    return null;
  } catch (error) {
    logger.error("Failed to check for updates:", error);
    throw error;
  }
}

/**
 * Install the pending update
 */
export async function installUpdate(): Promise<void> {
  if (!isTauri()) {
    logger.warn("Updater is only available in desktop app");
    return;
  }

  return invoke("install_update");
}

/**
 * Check for updates and install if available
 */
export async function checkAndInstall(): Promise<boolean> {
  const update = await checkForUpdates();

  if (update) {
    await installUpdate();
    return true;
  }

  return false;
}

export default {
  isUpdaterAvailable,
  setupUpdateListeners,
  checkForUpdates,
  installUpdate,
  checkAndInstall,
};
