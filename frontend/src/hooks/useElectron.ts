/**
 * useElectron Hook
 *
 * Core hook for detecting and accessing Electron functionality.
 * Provides safe access to the Electron API with SSR support.
 */

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  isElectron,
  getElectronAPI,
  type ElectronAPI,
  type PlatformInfo,
} from "@/lib/electron";

import { logger } from "@/lib/logger";

export interface ElectronInfo {
  /** Whether running in Electron environment */
  isElectron: boolean;
  /** Whether the hook has finished initializing */
  isReady: boolean;
  /** Platform information */
  platform: PlatformInfo | null;
  /** App version */
  version: string | null;
  /** App name */
  appName: string | null;
  /** Whether the app is packaged (production build) */
  isPackaged: boolean;
  /** System locale */
  locale: string | null;
}

export interface UseElectronReturn extends ElectronInfo {
  /** Get the Electron API (returns undefined if not in Electron) */
  getApi: () => ElectronAPI | undefined;
  /** Open a URL in the default browser */
  openExternal: (url: string) => Promise<void>;
  /** Quit the application */
  quit: () => Promise<void>;
}

/**
 * Hook to access Electron functionality
 *
 * @example
 * ```tsx
 * const { isElectron, platform, openExternal } = useElectron();
 *
 * if (isElectron) {
 *   /* console.log `Running on ${platform?.platform}`);
 * }
 * ```
 */
export function useElectron(): UseElectronReturn {
  const [info, setInfo] = useState<ElectronInfo>({
    isElectron: false,
    isReady: false,
    platform: null,
    version: null,
    appName: null,
    isPackaged: false,
    locale: null,
  });

  useEffect(() => {
    async function initElectron() {
      const electronAvailable = isElectron();

      if (!electronAvailable) {
        setInfo((prev) => ({ ...prev, isReady: true }));
        return;
      }

      const api = getElectronAPI();
      if (!api) {
        setInfo((prev) => ({ ...prev, isReady: true }));
        return;
      }

      try {
        const [platform, version, appName, isPackaged, locale] =
          await Promise.all([
            api.platform.getInfo(),
            api.app.getVersion(),
            api.app.getName(),
            api.app.isPackaged(),
            api.app.getLocale(),
          ]);

        setInfo({
          isElectron: true,
          isReady: true,
          platform,
          version,
          appName,
          isPackaged,
          locale,
        });
      } catch (error) {
        logger.error("Failed to initialize Electron info:", error);
        setInfo((prev) => ({ ...prev, isElectron: true, isReady: true }));
      }
    }

    initElectron();
  }, []);

  const getApi = useCallback(() => {
    return getElectronAPI();
  }, []);

  const openExternal = useCallback(async (url: string) => {
    const api = getElectronAPI();
    if (api) {
      await api.shell.openExternal(url);
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }, []);

  const quit = useCallback(async () => {
    const api = getElectronAPI();
    if (api) {
      await api.app.quit();
    }
  }, []);

  return useMemo(
    () => ({
      ...info,
      getApi,
      openExternal,
      quit,
    }),
    [info, getApi, openExternal, quit],
  );
}

/**
 * Hook to check if running in Electron (lightweight version)
 */
export function useIsElectron(): boolean {
  const [electron, setElectron] = useState(false);

  useEffect(() => {
    setElectron(isElectron());
  }, []);

  return electron;
}

/**
 * Hook to run code only in Electron environment
 */
export function useElectronEffect(
  effect: (api: ElectronAPI) => void | (() => void),
  deps: React.DependencyList = [],
): void {
  useEffect(() => {
    if (!isElectron()) return;

    const api = getElectronAPI();
    if (!api) return;

    return effect(api);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export default useElectron;
