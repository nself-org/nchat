/**
 * useElectronStore Hook
 *
 * Hook for accessing and managing persistent settings in Electron.
 * Provides reactive access to the settings store.
 */

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { logger } from "@/lib/logger";
import {
  isElectron,
  getSetting,
  setSetting,
  getAllSettings,
  resetSettings,
  type AppSettings,
  type NotificationSettings,
} from "@/lib/electron";

/**
 * Hook for accessing a single setting
 *
 * @example
 * ```tsx
 * const [zoomLevel, setZoomLevel] = useSetting('zoomLevel');
 * ```
 */
export function useSetting<K extends keyof AppSettings>(
  key: K,
): [
  AppSettings[K] | undefined,
  (value: AppSettings[K]) => Promise<void>,
  boolean,
] {
  const [value, setValue] = useState<AppSettings[K] | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial value
  useEffect(() => {
    async function load() {
      try {
        const val = await getSetting(key);
        setValue(val);
      } catch (error) {
        logger.error(`Failed to load setting ${key}:`, error);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [key]);

  // Update value
  const updateValue = useCallback(
    async (newValue: AppSettings[K]) => {
      await setSetting(key, newValue);
      setValue(newValue);
    },
    [key],
  );

  return [value, updateValue, isLoading];
}

/**
 * Hook for accessing all settings
 */
export function useSettings(): {
  settings: AppSettings | null;
  isLoading: boolean;
  updateSetting: <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K],
  ) => Promise<void>;
  reset: () => Promise<void>;
} {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load all settings
  useEffect(() => {
    async function load() {
      try {
        const allSettings = await getAllSettings();
        setSettings(allSettings);
      } catch (error) {
        logger.error("Failed to load settings:", error);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  // Update a single setting
  const updateSetting = useCallback(
    async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
      await setSetting(key, value);
      setSettings((prev) => (prev ? { ...prev, [key]: value } : null));
    },
    [],
  );

  // Reset all settings
  const reset = useCallback(async () => {
    await resetSettings();
    const allSettings = await getAllSettings();
    setSettings(allSettings);
  }, []);

  return { settings, isLoading, updateSetting, reset };
}

/**
 * Hook for notification settings
 */
export function useNotificationSettings(): {
  settings: NotificationSettings | null;
  isLoading: boolean;
  setEnabled: (enabled: boolean) => Promise<void>;
  setSound: (sound: boolean) => Promise<void>;
  setShowPreview: (showPreview: boolean) => Promise<void>;
  setDoNotDisturb: (dnd: boolean) => Promise<void>;
  setSchedule: (
    start: string | undefined,
    end: string | undefined,
  ) => Promise<void>;
} {
  const [value, setValue, isLoading] = useSetting("notifications");

  const settings = value ?? null;

  const updateSettings = useCallback(
    async (updates: Partial<NotificationSettings>) => {
      if (!settings) return;
      const newSettings = { ...settings, ...updates };
      await setSetting("notifications", newSettings);
      setValue(newSettings as AppSettings["notifications"]);
    },
    [settings, setValue],
  );

  const setEnabled = useCallback(
    (enabled: boolean) => updateSettings({ enabled }),
    [updateSettings],
  );

  const setSound = useCallback(
    (sound: boolean) => updateSettings({ sound }),
    [updateSettings],
  );

  const setShowPreview = useCallback(
    (showPreview: boolean) => updateSettings({ showPreview }),
    [updateSettings],
  );

  const setDoNotDisturb = useCallback(
    (doNotDisturb: boolean) => updateSettings({ doNotDisturb }),
    [updateSettings],
  );

  const setSchedule = useCallback(
    (start: string | undefined, end: string | undefined) =>
      updateSettings({ doNotDisturbStart: start, doNotDisturbEnd: end }),
    [updateSettings],
  );

  return {
    settings,
    isLoading,
    setEnabled,
    setSound,
    setShowPreview,
    setDoNotDisturb,
    setSchedule,
  };
}

/**
 * Hook for zoom level setting
 */
export function useZoomSetting(): {
  zoomLevel: number;
  isLoading: boolean;
  setZoomLevel: (level: number) => Promise<void>;
} {
  const [value, setValue, isLoading] = useSetting("zoomLevel");

  const setZoomLevel = useCallback(
    async (level: number) => {
      const clamped = Math.max(0.5, Math.min(2, level));
      await setValue(clamped);
    },
    [setValue],
  );

  return {
    zoomLevel: value ?? 1,
    isLoading,
    setZoomLevel,
  };
}

/**
 * Hook for auto-update settings
 */
export function useAutoUpdateSettings(): {
  autoUpdate: boolean;
  updateChannel: "stable" | "beta" | "alpha";
  isLoading: boolean;
  setAutoUpdate: (enabled: boolean) => Promise<void>;
  setUpdateChannel: (channel: "stable" | "beta" | "alpha") => Promise<void>;
} {
  const [autoUpdate, setAutoUpdateValue, loadingAuto] =
    useSetting("autoUpdate");
  const [updateChannel, setUpdateChannelValue, loadingChannel] =
    useSetting("updateChannel");

  return {
    autoUpdate: autoUpdate ?? true,
    updateChannel: updateChannel ?? "stable",
    isLoading: loadingAuto || loadingChannel,
    setAutoUpdate: setAutoUpdateValue,
    setUpdateChannel: setUpdateChannelValue,
  };
}

/**
 * Hook for startup settings
 */
export function useStartupSettings(): {
  launchAtStartup: boolean;
  startMinimized: boolean;
  minimizeToTray: boolean;
  showTrayIcon: boolean;
  isLoading: boolean;
  setLaunchAtStartup: (enabled: boolean) => Promise<void>;
  setStartMinimized: (enabled: boolean) => Promise<void>;
  setMinimizeToTray: (enabled: boolean) => Promise<void>;
  setShowTrayIcon: (enabled: boolean) => Promise<void>;
} {
  const [launchAtStartup, setLaunchAtStartup, l1] =
    useSetting("launchAtStartup");
  const [startMinimized, setStartMinimized, l2] = useSetting("startMinimized");
  const [minimizeToTray, setMinimizeToTray, l3] = useSetting("minimizeToTray");
  const [showTrayIcon, setShowTrayIcon, l4] = useSetting("showTrayIcon");

  return {
    launchAtStartup: launchAtStartup ?? false,
    startMinimized: startMinimized ?? false,
    minimizeToTray: minimizeToTray ?? true,
    showTrayIcon: showTrayIcon ?? true,
    isLoading: l1 || l2 || l3 || l4,
    setLaunchAtStartup,
    setStartMinimized,
    setMinimizeToTray,
    setShowTrayIcon,
  };
}

/**
 * Hook for last session info
 */
export function useLastSession(): {
  lastUserId: string | undefined;
  lastWorkspaceId: string | undefined;
  isLoading: boolean;
  setLastUserId: (userId: string) => Promise<void>;
  setLastWorkspaceId: (workspaceId: string) => Promise<void>;
} {
  const [lastUserId, setLastUserId, l1] = useSetting("lastUserId");
  const [lastWorkspaceId, setLastWorkspaceId, l2] =
    useSetting("lastWorkspaceId");

  return {
    lastUserId,
    lastWorkspaceId,
    isLoading: l1 || l2,
    setLastUserId,
    setLastWorkspaceId,
  };
}

export default useSettings;
