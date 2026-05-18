"use client";

import { useState, useEffect, useCallback } from "react";
import { logger } from "@/lib/logger";
import {
  isTauri,
  getPlatform,
  getAppVersion,
  getEnvironment,
  type TauriEnvironment,
} from "@/lib/tauri";

/**
 * Hook for accessing Tauri environment information
 */
export function useTauri() {
  const [environment, setEnvironment] = useState<TauriEnvironment>({
    isTauri: false,
    platform: "web",
    version: "0.0.0",
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadEnvironment() {
      try {
        const env = await getEnvironment();
        if (mounted) {
          setEnvironment(env);
        }
      } catch (error) {
        logger.error("Failed to load Tauri environment:", error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadEnvironment();

    return () => {
      mounted = false;
    };
  }, []);

  const isDesktop = environment.isTauri;
  const isWeb = !environment.isTauri;
  const isMacOS = environment.platform === "macos";
  const isWindows = environment.platform === "windows";
  const isLinux = environment.platform === "linux";

  return {
    ...environment,
    isLoading,
    isDesktop,
    isWeb,
    isMacOS,
    isWindows,
    isLinux,
  };
}

/**
 * Hook for checking if running in Tauri (synchronous)
 */
export function useTauriCheck(): boolean {
  return isTauri();
}

/**
 * Hook for getting the platform
 */
export function usePlatform() {
  const [platform, setPlatform] = useState<
    "macos" | "windows" | "linux" | "web"
  >("web");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadPlatform() {
      try {
        const p = await getPlatform();
        if (mounted) {
          setPlatform(p);
        }
      } catch (error) {
        logger.error("Failed to get platform:", error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadPlatform();

    return () => {
      mounted = false;
    };
  }, []);

  return { platform, isLoading };
}

/**
 * Hook for getting the app version
 */
export function useAppVersion() {
  const [version, setVersion] = useState<string>("0.0.0");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadVersion() {
      try {
        const v = await getAppVersion();
        if (mounted) {
          setVersion(v);
        }
      } catch (error) {
        logger.error("Failed to get app version:", error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadVersion();

    return () => {
      mounted = false;
    };
  }, []);

  return { version, isLoading };
}

export default useTauri;
