/**
 * Tauri Bridge - Core utilities for Tauri integration
 *
 * This module provides a bridge between the web frontend and Tauri's native APIs.
 * It handles detection of the Tauri environment and provides safe wrappers around
 * Tauri's invoke and event APIs.
 */

import { logger } from "@/lib/logger";

// Type definitions for Tauri APIs
declare global {
  interface Window {
    __TAURI__?: {
      core: {
        invoke: <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
      };
      event: {
        listen: <T>(
          event: string,
          handler: (event: { payload: T }) => void,
        ) => Promise<() => void>;
        emit: (event: string, payload?: unknown) => Promise<void>;
      };
    };
  }
}

/**
 * Check if running inside Tauri
 */
export function isTauri(): boolean {
  return typeof window !== "undefined" && window.__TAURI__ !== undefined;
}

/**
 * Get the Tauri API object safely
 */
function getTauriApi() {
  if (!isTauri()) {
    return null;
  }
  return window.__TAURI__;
}

/**
 * Invoke a Tauri command
 */
export async function invoke<T>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T> {
  const api = getTauriApi();
  if (!api) {
    throw new Error("Tauri API not available");
  }
  return api.core.invoke<T>(command, args);
}

/**
 * Invoke a Tauri command with fallback for web
 */
export async function invokeOrFallback<T>(
  command: string,
  args?: Record<string, unknown>,
  fallback?: T,
): Promise<T> {
  if (!isTauri()) {
    if (fallback !== undefined) {
      return fallback;
    }
    throw new Error("Tauri API not available and no fallback provided");
  }
  return invoke<T>(command, args);
}

/**
 * Listen to a Tauri event
 */
export async function listen<T>(
  event: string,
  handler: (payload: T) => void,
): Promise<() => void> {
  const api = getTauriApi();
  if (!api) {
    // Return a no-op unsubscribe function
    return () => {};
  }
  return api.event.listen<T>(event, (e) => handler(e.payload));
}

/**
 * Emit a Tauri event
 */
export async function emit(event: string, payload?: unknown): Promise<void> {
  const api = getTauriApi();
  if (!api) {
    logger.warn("Tauri API not available, event not emitted:", { event });
    return;
  }
  return api.event.emit(event, payload);
}

/**
 * Get the current platform
 */
export async function getPlatform(): Promise<
  "macos" | "windows" | "linux" | "web"
> {
  if (!isTauri()) {
    return "web";
  }
  try {
    const platform = await invoke<string>("get_platform");
    return platform as "macos" | "windows" | "linux";
  } catch {
    return "web";
  }
}

/**
 * Get the application version
 */
export async function getAppVersion(): Promise<string> {
  if (!isTauri()) {
    return process.env.NEXT_PUBLIC_APP_VERSION || "0.9.1";
  }
  return invoke<string>("get_app_version");
}

/**
 * Greet command for testing
 */
export async function greet(name: string): Promise<string> {
  return invokeOrFallback<string>(
    "greet",
    { name },
    `Hello, ${name}! (running in web mode)`,
  );
}

/**
 * Environment information
 */
export interface TauriEnvironment {
  isTauri: boolean;
  platform: "macos" | "windows" | "linux" | "web";
  version: string;
}

/**
 * Get complete environment information
 */
export async function getEnvironment(): Promise<TauriEnvironment> {
  const [platform, version] = await Promise.all([
    getPlatform(),
    getAppVersion(),
  ]);

  return {
    isTauri: isTauri(),
    platform,
    version,
  };
}

export default {
  isTauri,
  invoke,
  invokeOrFallback,
  listen,
  emit,
  getPlatform,
  getAppVersion,
  greet,
  getEnvironment,
};
