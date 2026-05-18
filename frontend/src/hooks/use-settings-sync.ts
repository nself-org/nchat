/**
 * useSettingsSync Hook
 *
 * React hook for settings synchronization.
 * Provides settings sync, conflict resolution, and status tracking.
 *
 * @module hooks/use-settings-sync
 * @version 1.0.0
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useApolloClient } from "@apollo/client";
import {
  SettingsSyncService,
  type SettingsSyncStatus,
  type SettingsSyncResult,
} from "@/services/settings/settings-sync.service";
import type { UserSettings } from "@/graphql/settings";

// ============================================================================
// Types
// ============================================================================

export interface UseSettingsSyncOptions {
  /** User ID */
  userId: string;
  /** Auto-sync interval in ms (0 to disable) */
  autoSyncInterval?: number;
  /** Enable conflict resolution */
  enableConflictResolution?: boolean;
  /** Sync on visibility change */
  syncOnVisibilityChange?: boolean;
  /** Enable debug logging */
  debug?: boolean;
}

export interface UseSettingsSyncReturn {
  /** Current settings */
  settings: UserSettings;
  /** Get specific category */
  getCategory: <K extends keyof UserSettings>(category: K) => UserSettings[K];
  /** Update settings */
  updateSettings: (
    updates: Partial<UserSettings>,
    category?: keyof UserSettings,
  ) => Promise<void>;
  /** Reset to defaults */
  resetSettings: () => Promise<void>;
  /** Manually trigger sync */
  sync: () => Promise<SettingsSyncResult>;
  /** Sync status */
  status: SettingsSyncStatus;
  /** Last sync timestamp */
  lastSyncTimestamp: number;
  /** Current version */
  version: number;
  /** Is syncing */
  isSyncing: boolean;
  /** Last sync result */
  lastSyncResult: SettingsSyncResult | null;
  /** Service initialized */
  initialized: boolean;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * useSettingsSync - React hook for settings synchronization
 */
export function useSettingsSync(
  options: UseSettingsSyncOptions,
): UseSettingsSyncReturn {
  const {
    userId,
    autoSyncInterval = 60000,
    enableConflictResolution = true,
    syncOnVisibilityChange = true,
    debug = false,
  } = options;

  const apolloClient = useApolloClient();
  const serviceRef = useRef<SettingsSyncService | null>(null);

  const [initialized, setInitialized] = useState(false);
  const [settings, setSettings] = useState<UserSettings>({} as UserSettings);
  const [status, setStatus] = useState<SettingsSyncStatus>("idle");
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState(0);
  const [version, setVersion] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] =
    useState<SettingsSyncResult | null>(null);

  /**
   * Initialize service
   */
  useEffect(() => {
    if (!userId || !apolloClient) {
      return;
    }

    const service = new SettingsSyncService({
      apolloClient,
      userId,
      autoSyncInterval,
      enableConflictResolution,
      syncOnVisibilityChange,
      debug,
    });

    serviceRef.current = service;

    // Initialize and subscribe
    service.initialize().then(() => {
      setInitialized(service.initialized);
      setSettings(service.getSettings());
      setStatus(service.getSyncStatus());
      setLastSyncTimestamp(service.getLastSyncTimestamp());
      setVersion(service.getVersion());
    });

    // Subscribe to events
    const unsubscribe = service.subscribe((event, data) => {
      if (event === "settings:syncing") {
        setIsSyncing(true);
        setStatus("syncing");
      } else if (event === "settings:synced") {
        setIsSyncing(false);
        setStatus("synced");
        if (data?.result) {
          setLastSyncResult(data.result);
          setLastSyncTimestamp(data.result.timestamp);
          setVersion(data.result.localVersion);
        }
        setSettings(service.getSettings());
      } else if (event === "settings:conflict") {
        setIsSyncing(false);
        setStatus("conflict");
        if (data?.result) {
          setLastSyncResult(data.result);
        }
      } else if (event === "settings:error") {
        setIsSyncing(false);
        setStatus("error");
      } else if (event === "settings:changed") {
        setSettings(service.getSettings());
        setVersion(service.getVersion());
      }
    });

    return () => {
      unsubscribe();
      service.destroy();
      serviceRef.current = null;
    };
  }, [
    userId,
    apolloClient,
    autoSyncInterval,
    enableConflictResolution,
    syncOnVisibilityChange,
    debug,
  ]);

  /**
   * Get settings category
   */
  const getCategory = useCallback(
    <K extends keyof UserSettings>(category: K): UserSettings[K] => {
      if (!serviceRef.current) {
        return settings[category];
      }
      return serviceRef.current.getCategory(category);
    },
    [settings],
  );

  /**
   * Update settings
   */
  const updateSettings = useCallback(
    async (
      updates: Partial<UserSettings>,
      category?: keyof UserSettings,
    ): Promise<void> => {
      if (!serviceRef.current) {
        throw new Error("Settings sync service not initialized");
      }

      await serviceRef.current.updateSettings(updates, category);
    },
    [],
  );

  /**
   * Reset settings
   */
  const resetSettings = useCallback(async (): Promise<void> => {
    if (!serviceRef.current) {
      throw new Error("Settings sync service not initialized");
    }

    await serviceRef.current.resetSettings();
  }, []);

  /**
   * Manually trigger sync
   */
  const sync = useCallback(async (): Promise<SettingsSyncResult> => {
    if (!serviceRef.current) {
      throw new Error("Settings sync service not initialized");
    }

    return await serviceRef.current.sync();
  }, []);

  return {
    settings,
    getCategory,
    updateSettings,
    resetSettings,
    sync,
    status,
    lastSyncTimestamp,
    version,
    isSyncing,
    lastSyncResult,
    initialized,
  };
}

export default useSettingsSync;
