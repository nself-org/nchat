/**
 * useElectronUpdater Hook
 *
 * Hook for managing application updates in Electron.
 * Provides update checking, downloading, and installation.
 */

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  isElectron,
  getElectronAPI,
  onUpdateChecking,
  onUpdateAvailable,
  onUpdateNotAvailable,
  onUpdateDownloadProgress,
  onUpdateDownloaded,
  onUpdateError,
  type UpdateInfo,
  type UpdateProgressPayload,
} from "@/lib/electron";

export type UpdateStatus =
  | "idle"
  | "checking"
  | "available"
  | "not-available"
  | "downloading"
  | "downloaded"
  | "error";

export interface UseElectronUpdaterReturn {
  /** Current update status */
  status: UpdateStatus;
  /** Update information */
  updateInfo: UpdateInfo | null;
  /** Download progress (0-100) */
  downloadProgress: number;
  /** Error message if any */
  error: string | null;
  /** Whether an update is available */
  isUpdateAvailable: boolean;
  /** Whether an update has been downloaded */
  isUpdateDownloaded: boolean;
  /** Check for updates */
  checkForUpdates: () => Promise<void>;
  /** Download the available update */
  downloadUpdate: () => Promise<void>;
  /** Install the downloaded update and restart */
  installUpdate: () => void;
  /** Dismiss the update notification */
  dismissUpdate: () => void;
}

/**
 * Hook for managing application updates
 *
 * @example
 * ```tsx
 * const {
 *   status,
 *   updateInfo,
 *   downloadProgress,
 *   isUpdateAvailable,
 *   checkForUpdates,
 *   downloadUpdate,
 *   installUpdate
 * } = useElectronUpdater();
 *
 * // Show update dialog
 * if (isUpdateAvailable) {
 *   return (
 *     <UpdateDialog
 *       version={updateInfo?.version}
 *       onDownload={downloadUpdate}
 *       onDismiss={dismissUpdate}
 *     />
 *   );
 * }
 * ```
 */
export function useElectronUpdater(): UseElectronUpdaterReturn {
  const [status, setStatus] = useState<UpdateStatus>("idle");
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to update events
  useEffect(() => {
    if (!isElectron()) return;

    const cleanups: Array<() => void> = [];

    // Checking for updates
    cleanups.push(
      onUpdateChecking(() => {
        setStatus("checking");
        setError(null);
      }),
    );

    // Update available
    cleanups.push(
      onUpdateAvailable((info) => {
        setStatus("available");
        setUpdateInfo({
          available: true,
          version: info.version,
          releaseDate: info.releaseDate,
          releaseNotes: info.releaseNotes,
          downloaded: false,
        });
      }),
    );

    // No update available
    cleanups.push(
      onUpdateNotAvailable((info) => {
        setStatus("not-available");
        setUpdateInfo({
          available: false,
          version: info.version,
          downloaded: false,
        });
      }),
    );

    // Download progress
    cleanups.push(
      onUpdateDownloadProgress((progress) => {
        setStatus("downloading");
        setDownloadProgress(progress.percent);
        setUpdateInfo((prev) =>
          prev ? { ...prev, downloadProgress: progress.percent } : null,
        );
      }),
    );

    // Update downloaded
    cleanups.push(
      onUpdateDownloaded((info) => {
        setStatus("downloaded");
        setDownloadProgress(100);
        setUpdateInfo((prev) => (prev ? { ...prev, downloaded: true } : null));
      }),
    );

    // Error
    cleanups.push(
      onUpdateError((err) => {
        setStatus("error");
        setError(err.message);
        setUpdateInfo((prev) =>
          prev ? { ...prev, error: err.message } : null,
        );
      }),
    );

    // Load initial state
    async function loadInitialState() {
      const api = getElectronAPI();
      if (api) {
        const info = await api.updates.getInfo();
        if (info.available) {
          setUpdateInfo(info);
          setStatus(info.downloaded ? "downloaded" : "available");
          if (info.downloadProgress) {
            setDownloadProgress(info.downloadProgress);
          }
        }
      }
    }
    loadInitialState();

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, []);

  // Check for updates
  const checkForUpdates = useCallback(async () => {
    const api = getElectronAPI();
    if (!api) return;

    setStatus("checking");
    setError(null);

    try {
      await api.updates.check();
    } catch (err) {
      setStatus("error");
      setError((err as Error).message);
    }
  }, []);

  // Download update
  const downloadUpdate = useCallback(async () => {
    const api = getElectronAPI();
    if (!api) return;

    setStatus("downloading");
    setDownloadProgress(0);

    try {
      await api.updates.download();
    } catch (err) {
      setStatus("error");
      setError((err as Error).message);
    }
  }, []);

  // Install update
  const installUpdate = useCallback(() => {
    const api = getElectronAPI();
    if (!api) return;

    api.updates.install();
  }, []);

  // Dismiss update
  const dismissUpdate = useCallback(() => {
    setStatus("idle");
  }, []);

  // Computed values
  const isUpdateAvailable = status === "available" || status === "downloading";
  const isUpdateDownloaded = status === "downloaded";

  return useMemo(
    () => ({
      status,
      updateInfo,
      downloadProgress,
      error,
      isUpdateAvailable,
      isUpdateDownloaded,
      checkForUpdates,
      downloadUpdate,
      installUpdate,
      dismissUpdate,
    }),
    [
      status,
      updateInfo,
      downloadProgress,
      error,
      isUpdateAvailable,
      isUpdateDownloaded,
      checkForUpdates,
      downloadUpdate,
      installUpdate,
      dismissUpdate,
    ],
  );
}

/**
 * Hook for auto-update settings
 */
export function useAutoUpdateSettings(): {
  autoUpdate: boolean;
  updateChannel: "stable" | "beta" | "alpha";
  setAutoUpdate: (enabled: boolean) => Promise<void>;
  setUpdateChannel: (channel: "stable" | "beta" | "alpha") => Promise<void>;
} {
  const [autoUpdate, setAutoUpdateState] = useState(true);
  const [updateChannel, setUpdateChannelState] = useState<
    "stable" | "beta" | "alpha"
  >("stable");

  useEffect(() => {
    async function load() {
      const api = getElectronAPI();
      if (api) {
        const settings = await api.store.getAll();
        if (settings) {
          setAutoUpdateState(
            (settings as { autoUpdate?: boolean }).autoUpdate ?? true,
          );
          setUpdateChannelState(
            ((settings as { updateChannel?: string }).updateChannel as
              | "stable"
              | "beta"
              | "alpha") ?? "stable",
          );
        }
      }
    }
    load();
  }, []);

  const setAutoUpdate = useCallback(async (enabled: boolean) => {
    const api = getElectronAPI();
    if (api) {
      await api.store.set("autoUpdate", enabled);
      setAutoUpdateState(enabled);
    }
  }, []);

  const setUpdateChannel = useCallback(
    async (channel: "stable" | "beta" | "alpha") => {
      const api = getElectronAPI();
      if (api) {
        await api.store.set("updateChannel", channel);
        setUpdateChannelState(channel);
      }
    },
    [],
  );

  return {
    autoUpdate,
    updateChannel,
    setAutoUpdate,
    setUpdateChannel,
  };
}

export default useElectronUpdater;
