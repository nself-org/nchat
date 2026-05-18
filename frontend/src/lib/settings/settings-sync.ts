/**
 * Settings Sync - Synchronize settings across devices and with the server
 */

import type { UserSettings } from "./settings-types";
import { settingsManager } from "./settings-manager";
import { logger } from "@/lib/logger";
import { isProduction } from "@/lib/environment";

// ============================================================================
// Device ID Management
// ============================================================================

const DEVICE_ID_KEY = "nchat-device-id";

function getDeviceId(): string {
  if (typeof window === "undefined") return "server";

  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    // Generate a unique device ID using crypto API
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      deviceId = crypto.randomUUID();
    } else {
      // Fallback for older browsers
      deviceId = `device-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    }
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

// ============================================================================
// Auth Token Access
// ============================================================================

/**
 * Get the current access token for API requests
 * This function is designed to work with the auth context
 */
async function getAccessToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;

  // Try to get from auth context via global accessor
  // The auth context sets this on the window object
  const authGlobal = window as unknown as {
    __nchat_auth__?: { getAccessToken: () => string | null };
  };
  if (authGlobal.__nchat_auth__?.getAccessToken) {
    return authGlobal.__nchat_auth__.getAccessToken();
  }

  // Fallback: check localStorage for dev token
  const devToken = localStorage.getItem("nchat-dev-token");
  if (devToken) {
    return devToken;
  }

  return null;
}

// ============================================================================
// Types
// ============================================================================

export interface SyncStatus {
  lastSyncedAt: string | null;
  isSyncing: boolean;
  hasLocalChanges: boolean;
  error: string | null;
}

export interface SyncResult {
  success: boolean;
  merged: boolean;
  conflicts: string[];
  error?: string;
}

type SyncListener = (status: SyncStatus) => void;

// ============================================================================
// Settings Sync Class
// ============================================================================

class SettingsSync {
  private status: SyncStatus = {
    lastSyncedAt: null,
    isSyncing: false,
    hasLocalChanges: false,
    error: null,
  };
  private listeners: Set<SyncListener> = new Set();
  private syncInterval: NodeJS.Timeout | null = null;
  private pendingChanges: Partial<UserSettings> | null = null;
  private initialized: boolean = false;

  // --------------------------------------------------------------------------
  // Initialization
  // --------------------------------------------------------------------------

  initialize(): void {
    if (this.initialized) return;

    // Listen for local settings changes
    settingsManager.subscribe(() => {
      this.status.hasLocalChanges = true;
      this.notifyListeners();
    });

    // Load last sync status
    this.loadSyncStatus();

    this.initialized = true;
  }

  // --------------------------------------------------------------------------
  // Sync Operations
  // --------------------------------------------------------------------------

  /**
   * Start automatic syncing
   */
  startAutoSync(intervalMs: number = 30000): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      if (this.status.hasLocalChanges) {
        this.sync();
      }
    }, intervalMs);
  }

  /**
   * Stop automatic syncing
   */
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Sync settings with the server
   */
  async sync(): Promise<SyncResult> {
    if (this.status.isSyncing) {
      return {
        success: false,
        merged: false,
        conflicts: [],
        error: "Sync already in progress",
      };
    }

    this.status.isSyncing = true;
    this.status.error = null;
    this.notifyListeners();

    try {
      const localSettings = settingsManager.getSettings();

      // Fetch remote settings
      const remoteSettings = await this.fetchRemoteSettings();

      if (remoteSettings) {
        // Merge settings
        const { merged, conflicts } = this.mergeSettings(
          localSettings,
          remoteSettings,
        );

        if (conflicts.length > 0) {
          // For now, local settings take precedence
          logger.warn("Settings conflicts detected:", { context: conflicts });
        }

        // Update local settings with merged result
        settingsManager.updateSettings(merged);

        // Push merged settings to server
        await this.pushSettings(merged as UserSettings);
      } else {
        // No remote settings, push local settings
        await this.pushSettings(localSettings);
      }

      this.status.lastSyncedAt = new Date().toISOString();
      this.status.hasLocalChanges = false;
      this.saveSyncStatus();

      return {
        success: true,
        merged: !!remoteSettings,
        conflicts: [],
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Sync failed";
      this.status.error = errorMessage;

      return {
        success: false,
        merged: false,
        conflicts: [],
        error: errorMessage,
      };
    } finally {
      this.status.isSyncing = false;
      this.notifyListeners();
    }
  }

  /**
   * Force push local settings to server
   */
  async forcePush(): Promise<SyncResult> {
    this.status.isSyncing = true;
    this.notifyListeners();

    try {
      const localSettings = settingsManager.getSettings();
      await this.pushSettings(localSettings);

      this.status.lastSyncedAt = new Date().toISOString();
      this.status.hasLocalChanges = false;
      this.saveSyncStatus();

      return { success: true, merged: false, conflicts: [] };
    } catch (error) {
      return {
        success: false,
        merged: false,
        conflicts: [],
        error: error instanceof Error ? error.message : "Push failed",
      };
    } finally {
      this.status.isSyncing = false;
      this.notifyListeners();
    }
  }

  /**
   * Force pull settings from server
   */
  async forcePull(): Promise<SyncResult> {
    this.status.isSyncing = true;
    this.notifyListeners();

    try {
      const remoteSettings = await this.fetchRemoteSettings();

      if (remoteSettings) {
        settingsManager.updateSettings(remoteSettings);
        this.status.lastSyncedAt = new Date().toISOString();
        this.status.hasLocalChanges = false;
        this.saveSyncStatus();

        return { success: true, merged: false, conflicts: [] };
      }

      return {
        success: false,
        merged: false,
        conflicts: [],
        error: "No remote settings found",
      };
    } catch (error) {
      return {
        success: false,
        merged: false,
        conflicts: [],
        error: error instanceof Error ? error.message : "Pull failed",
      };
    } finally {
      this.status.isSyncing = false;
      this.notifyListeners();
    }
  }

  // --------------------------------------------------------------------------
  // API Operations
  // --------------------------------------------------------------------------

  /**
   * Fetch settings from the remote server
   * Uses GET /api/settings endpoint
   */
  private async fetchRemoteSettings(): Promise<Partial<UserSettings> | null> {
    // Skip API calls in SSR
    if (typeof window === "undefined") return null;

    try {
      const token = await getAccessToken();
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch("/api/settings", {
        method: "GET",
        headers,
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 401) {
          logger.warn(
            "[SettingsSync] Unauthorized - user may not be logged in",
          );
          return null;
        }
        if (response.status === 404) {
          // No settings found - this is expected for new users
          return null;
        }
        throw new Error(
          `Failed to fetch settings: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();

      if (!data.success) {
        logger.error("[SettingsSync] API returned error:", data.errorCode);
        return null;
      }

      // If default settings, return null to trigger push of local settings
      if (data.data.isDefault) {
        return null;
      }

      return data.data.settings;
    } catch (error) {
      logger.error("[SettingsSync] Failed to fetch remote settings:", error);
      // Don't throw - return null to allow local-first behavior
      return null;
    }
  }

  /**
   * Push settings to the remote server
   * Uses POST /api/settings/sync endpoint for conflict resolution
   */
  private async pushSettings(settings: UserSettings): Promise<void> {
    // Skip API calls in SSR
    if (typeof window === "undefined") return;

    try {
      const token = await getAccessToken();
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // Get current version from localStorage
      const syncStatusStored = localStorage.getItem("nchat-sync-status");
      const syncStatus = syncStatusStored ? JSON.parse(syncStatusStored) : {};
      const clientVersion = syncStatus.version || 0;

      // Use the sync endpoint for conflict resolution
      const response = await fetch("/api/settings/sync", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({
          clientVersion,
          settings,
          deviceId: getDeviceId(),
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          logger.warn("[SettingsSync] Unauthorized - cannot push settings");
          return;
        }
        throw new Error(
          `Failed to push settings: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();

      if (!data.success) {
        logger.error("[SettingsSync] Sync API returned error:", data.errorCode);
        throw new Error(data.message || "Settings sync failed");
      }

      // Update local version
      localStorage.setItem(
        "nchat-sync-status",
        JSON.stringify({
          lastSyncedAt: this.status.lastSyncedAt,
          version: data.data.version,
        }),
      );

      // If there were conflicts, log them
      if (data.data.conflictResolutions?.length > 0) {
        logger.info("[SettingsSync] Conflicts resolved:", {
          count: data.data.conflictResolutions.length,
          status: data.data.syncStatus,
        });

        // Apply the merged settings from server
        if (data.data.settings) {
          settingsManager.updateSettings(data.data.settings);
        }
      }

      logger.debug("[SettingsSync] Settings pushed successfully", {
        version: data.data.version,
        syncStatus: data.data.syncStatus,
      });
    } catch (error) {
      // In production, log but don't throw to allow graceful degradation
      logger.error("[SettingsSync] Failed to push settings:", error);
      if (isProduction()) {
        // Silent failure in production - settings saved locally, will sync later
        return;
      }
      throw error;
    }
  }

  // --------------------------------------------------------------------------
  // Merge Logic
  // --------------------------------------------------------------------------

  private mergeSettings(
    local: UserSettings,
    remote: Partial<UserSettings>,
  ): { merged: Partial<UserSettings>; conflicts: string[] } {
    const merged: Partial<UserSettings> = { ...local };
    const conflicts: string[] = [];

    for (const category of Object.keys(remote) as (keyof UserSettings)[]) {
      const localCategory = local[category];
      const remoteCategory = remote[category];

      if (!remoteCategory) continue;
      (merged as Record<string, unknown>)[category] = { ...localCategory };

      for (const key of Object.keys(remoteCategory)) {
        const localValue = localCategory[key as keyof typeof localCategory];
        const remoteValue = remoteCategory[key as keyof typeof remoteCategory];

        if (JSON.stringify(localValue) !== JSON.stringify(remoteValue)) {
          conflicts.push(`${category}.${key}`);
          // Local takes precedence by default
          // Override this behavior based on timestamp or user preference
        }
      }
    }

    return { merged, conflicts };
  }

  // --------------------------------------------------------------------------
  // Status Management
  // --------------------------------------------------------------------------

  getStatus(): SyncStatus {
    return { ...this.status };
  }

  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const status = this.getStatus();
    this.listeners.forEach((listener) => {
      try {
        listener(status);
      } catch (error) {
        logger.error("Sync listener error:", error);
      }
    });
  }

  private loadSyncStatus(): void {
    if (typeof window === "undefined") return;

    try {
      const stored = localStorage.getItem("nchat-sync-status");
      if (stored) {
        const parsed = JSON.parse(stored);
        this.status.lastSyncedAt = parsed.lastSyncedAt || null;
      }
    } catch {
      // Ignore errors
    }
  }

  private saveSyncStatus(): void {
    if (typeof window === "undefined") return;

    try {
      localStorage.setItem(
        "nchat-sync-status",
        JSON.stringify({
          lastSyncedAt: this.status.lastSyncedAt,
        }),
      );
    } catch {
      // Ignore errors
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const settingsSync = new SettingsSync();

// ============================================================================
// Convenience Functions
// ============================================================================

export function initializeSync(): void {
  settingsSync.initialize();
}

export function startAutoSync(intervalMs?: number): void {
  settingsSync.startAutoSync(intervalMs);
}

export function stopAutoSync(): void {
  settingsSync.stopAutoSync();
}

export function syncSettings(): Promise<SyncResult> {
  return settingsSync.sync();
}

export function forcePushSettings(): Promise<SyncResult> {
  return settingsSync.forcePush();
}

export function forcePullSettings(): Promise<SyncResult> {
  return settingsSync.forcePull();
}

export function getSyncStatus(): SyncStatus {
  return settingsSync.getStatus();
}

export function subscribeToSyncStatus(listener: SyncListener): () => void {
  return settingsSync.subscribe(listener);
}
