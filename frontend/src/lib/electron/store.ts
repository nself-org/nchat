/**
 * Settings Store
 *
 * Provides persistent storage for application settings.
 * Uses Electron store in desktop app, localStorage in web.
 */

import { isElectron, getElectronAPI } from "./electron-bridge";

import { logger } from "@/lib/logger";

// Settings types
export interface WindowState {
  x?: number;
  y?: number;
  width: number;
  height: number;
  isMaximized: boolean;
  isFullScreen: boolean;
}

export interface NotificationSettings {
  enabled: boolean;
  sound: boolean;
  showPreview: boolean;
  doNotDisturb: boolean;
  doNotDisturbStart?: string;
  doNotDisturbEnd?: string;
}

export interface AppSettings {
  windowState: WindowState;
  launchAtStartup: boolean;
  startMinimized: boolean;
  minimizeToTray: boolean;
  showTrayIcon: boolean;
  notifications: NotificationSettings;
  zoomLevel: number;
  spellcheck: boolean;
  spellcheckLanguages: string[];
  autoUpdate: boolean;
  updateChannel: "stable" | "beta" | "alpha";
  serverUrl: string;
  proxyEnabled: boolean;
  proxyUrl?: string;
  clearCacheOnExit: boolean;
  devToolsEnabled: boolean;
  lastUserId?: string;
  lastWorkspaceId?: string;
}

const STORAGE_KEY = "nchat-desktop-settings";

// Default settings for web environment
const defaultSettings: AppSettings = {
  windowState: {
    width: 1200,
    height: 800,
    isMaximized: false,
    isFullScreen: false,
  },
  launchAtStartup: false,
  startMinimized: false,
  minimizeToTray: true,
  showTrayIcon: true,
  notifications: {
    enabled: true,
    sound: true,
    showPreview: true,
    doNotDisturb: false,
  },
  zoomLevel: 1,
  spellcheck: true,
  spellcheckLanguages: ["en-US"],
  autoUpdate: true,
  updateChannel: "stable",
  serverUrl: "http://localhost:3000",
  proxyEnabled: false,
  clearCacheOnExit: false,
  devToolsEnabled: false,
};

/**
 * Get a setting value
 */
export async function getSetting<K extends keyof AppSettings>(
  key: K,
): Promise<AppSettings[K]> {
  const api = getElectronAPI();
  if (api) {
    return api.store.get<AppSettings[K]>(key);
  }

  // Web fallback - use localStorage
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const settings = JSON.parse(stored) as Partial<AppSettings>;
      return (settings[key] ?? defaultSettings[key]) as AppSettings[K];
    }
  } catch (error) {
    logger.error("Failed to read setting:", error);
  }

  return defaultSettings[key] as AppSettings[K];
}

/**
 * Set a setting value
 */
export async function setSetting<K extends keyof AppSettings>(
  key: K,
  value: AppSettings[K],
): Promise<boolean> {
  const api = getElectronAPI();
  if (api) {
    return api.store.set(key, value);
  }

  // Web fallback - use localStorage
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const settings = stored ? JSON.parse(stored) : {};
    settings[key] = value;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    return true;
  } catch (error) {
    logger.error("Failed to save setting:", error);
    return false;
  }
}

/**
 * Get all settings
 */
export async function getAllSettings(): Promise<AppSettings> {
  const api = getElectronAPI();
  if (api) {
    const stored = await api.store.getAll();
    return { ...defaultSettings, ...stored } as AppSettings;
  }

  // Web fallback
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const settings = JSON.parse(stored) as Partial<AppSettings>;
      return { ...defaultSettings, ...settings };
    }
  } catch (error) {
    logger.error("Failed to read settings:", error);
  }

  return defaultSettings;
}

/**
 * Reset all settings to defaults
 */
export async function resetSettings(): Promise<boolean> {
  const api = getElectronAPI();
  if (api) {
    return api.store.reset();
  }

  // Web fallback
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    logger.error("Failed to reset settings:", error);
    return false;
  }
}

/**
 * Get multiple settings at once
 */
export async function getSettings<K extends keyof AppSettings>(
  keys: K[],
): Promise<Pick<AppSettings, K>> {
  const result: Partial<AppSettings> = {};

  for (const key of keys) {
    result[key] = await getSetting(key);
  }

  return result as Pick<AppSettings, K>;
}

/**
 * Set multiple settings at once
 */
export async function setSettings(
  settings: Partial<AppSettings>,
): Promise<boolean> {
  const api = getElectronAPI();
  if (api) {
    // Set each setting individually
    for (const [key, value] of Object.entries(settings)) {
      await api.store.set(key, value);
    }
    return true;
  }

  // Web fallback
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const current = stored ? JSON.parse(stored) : {};
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...current, ...settings }),
    );
    return true;
  } catch (error) {
    logger.error("Failed to save settings:", error);
    return false;
  }
}

// ===== Convenience Functions =====

/**
 * Get notification settings
 */
export async function getNotificationSettings(): Promise<NotificationSettings> {
  return getSetting("notifications");
}

/**
 * Update notification settings
 */
export async function setNotificationSettings(
  settings: Partial<NotificationSettings>,
): Promise<boolean> {
  const current = await getNotificationSettings();
  return setSetting("notifications", { ...current, ...settings });
}

/**
 * Get zoom level
 */
export async function getZoomLevel(): Promise<number> {
  return getSetting("zoomLevel");
}

/**
 * Set zoom level
 */
export async function setZoomLevel(level: number): Promise<boolean> {
  return setSetting("zoomLevel", Math.max(0.5, Math.min(2, level)));
}

/**
 * Get auto-update setting
 */
export async function getAutoUpdate(): Promise<boolean> {
  return getSetting("autoUpdate");
}

/**
 * Set auto-update setting
 */
export async function setAutoUpdate(enabled: boolean): Promise<boolean> {
  return setSetting("autoUpdate", enabled);
}

/**
 * Get update channel
 */
export async function getUpdateChannel(): Promise<"stable" | "beta" | "alpha"> {
  return getSetting("updateChannel");
}

/**
 * Set update channel
 */
export async function setUpdateChannel(
  channel: "stable" | "beta" | "alpha",
): Promise<boolean> {
  return setSetting("updateChannel", channel);
}

/**
 * Get last user ID
 */
export async function getLastUserId(): Promise<string | undefined> {
  return getSetting("lastUserId");
}

/**
 * Set last user ID
 */
export async function setLastUserId(userId: string): Promise<boolean> {
  return setSetting("lastUserId", userId);
}

/**
 * Get last workspace ID
 */
export async function getLastWorkspaceId(): Promise<string | undefined> {
  return getSetting("lastWorkspaceId");
}

/**
 * Set last workspace ID
 */
export async function setLastWorkspaceId(
  workspaceId: string,
): Promise<boolean> {
  return setSetting("lastWorkspaceId", workspaceId);
}
