/**
 * Settings Sync Service
 *
 * Handles synchronization of user settings across multiple devices.
 * Includes conflict detection, resolution, and merge strategies.
 *
 * @module services/settings/settings-sync.service
 * @version 1.0.0
 */

import { ApolloClient } from "@apollo/client";
import {
  GET_USER_SETTINGS,
  GET_SETTINGS_VERSION,
  UPDATE_USER_SETTINGS,
  MERGE_USER_SETTINGS,
  type UserSettings,
  type GetUserSettingsResponse,
  type GetSettingsVersionResponse,
  type UpdateUserSettingsResponse,
  type MergeUserSettingsResponse,
  DEFAULT_USER_SETTINGS,
  SERVER_WINS_CATEGORIES,
  CLIENT_WINS_CATEGORIES,
} from "@/graphql/settings";
import { logger } from "@/lib/logger";
import {
  getConflictResolutionService,
  type ConflictEntity,
  type ConflictResolutionResult,
} from "@/services/realtime/conflict-resolution.service";

// ============================================================================
// Types
// ============================================================================

/**
 * Settings sync status
 */
export type SettingsSyncStatus =
  | "idle"
  | "syncing"
  | "synced"
  | "conflict"
  | "error";

/**
 * Settings sync result
 */
export interface SettingsSyncResult {
  status: SettingsSyncStatus;
  synced: boolean;
  conflicts: ConflictResolutionResult[];
  localVersion: number;
  remoteVersion: number;
  timestamp: number;
  error?: string;
}

/**
 * Settings change event
 */
export interface SettingsChangeEvent {
  userId: string;
  category: keyof UserSettings;
  changes: Partial<UserSettings>;
  version: number;
  timestamp: number;
}

/**
 * Settings sync event types
 */
export type SettingsSyncEventType =
  | "settings:syncing"
  | "settings:synced"
  | "settings:conflict"
  | "settings:error"
  | "settings:changed";

/**
 * Settings sync event listener
 */
export type SettingsSyncEventListener = (
  event: SettingsSyncEventType,
  data?: {
    result?: SettingsSyncResult;
    change?: SettingsChangeEvent;
    error?: string;
  },
) => void;

/**
 * Settings sync config
 */
export interface SettingsSyncConfig {
  /** Apollo client for GraphQL queries */
  apolloClient: ApolloClient<unknown>;
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
  /** LocalStorage key for local settings */
  storageKey?: string;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CONFIG = {
  autoSyncInterval: 60000, // 1 minute
  enableConflictResolution: true,
  syncOnVisibilityChange: true,
  debug: false,
  storageKey: "nchat:user-settings",
};

// ============================================================================
// Settings Sync Service Class
// ============================================================================

/**
 * SettingsSyncService - Manages settings synchronization across devices
 */
class SettingsSyncService {
  private config: Required<SettingsSyncConfig>;
  private status: SettingsSyncStatus = "idle";
  private localSettings: UserSettings;
  private localVersion: number = 0;
  private lastSyncTimestamp: number = 0;
  private listeners = new Set<SettingsSyncEventListener>();
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private visibilityListener: (() => void) | null = null;
  private isInitialized = false;

  constructor(config: SettingsSyncConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.localSettings = { ...DEFAULT_USER_SETTINGS };
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  /**
   * Initialize the settings sync service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // Load local settings
    this.loadLocalSettings();

    // Perform initial sync
    await this.sync();

    // Set up auto-sync interval
    if (this.config.autoSyncInterval > 0) {
      this.startAutoSync();
    }

    // Set up visibility change listener
    if (this.config.syncOnVisibilityChange) {
      this.setupVisibilityListener();
    }

    this.isInitialized = true;
    this.log("Settings sync service initialized");
  }

  /**
   * Destroy the service
   */
  destroy(): void {
    // Stop auto-sync
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    // Remove visibility listener
    if (this.visibilityListener) {
      this.visibilityListener();
      this.visibilityListener = null;
    }

    this.listeners.clear();
    this.isInitialized = false;
    this.log("Settings sync service destroyed");
  }

  // ============================================================================
  // Sync Operations
  // ============================================================================

  /**
   * Sync settings with server
   */
  async sync(): Promise<SettingsSyncResult> {
    if (this.status === "syncing") {
      this.log("Sync already in progress");
      throw new Error("Sync already in progress");
    }

    this.status = "syncing";
    this.emit("settings:syncing");
    this.log("Starting settings sync");

    const startTime = Date.now();
    const conflicts: ConflictResolutionResult[] = [];

    try {
      // Fetch remote settings
      const remoteSettings = await this.fetchRemoteSettings();

      if (!remoteSettings) {
        // No remote settings yet, push local settings
        await this.pushSettings(this.localSettings);

        const result: SettingsSyncResult = {
          status: "synced",
          synced: true,
          conflicts: [],
          localVersion: this.localVersion,
          remoteVersion: this.localVersion,
          timestamp: Date.now(),
        };

        this.status = "synced";
        this.lastSyncTimestamp = Date.now();
        this.emit("settings:synced", { result });

        return result;
      }

      // Check for conflicts
      if (remoteSettings.version !== this.localVersion) {
        this.log("Version mismatch detected:", {
          local: this.localVersion,
          remote: remoteSettings.version,
        });

        if (this.config.enableConflictResolution) {
          const conflictResult = await this.resolveSettingsConflict(
            this.localSettings,
            remoteSettings.settings,
            this.localVersion,
            remoteSettings.version,
          );

          conflicts.push(conflictResult);

          // Apply resolved settings
          this.localSettings = conflictResult.resolvedData as UserSettings;
          this.localVersion = remoteSettings.version;
          this.saveLocalSettings();

          // If resolution requires user action, don't push
          if (conflictResult.requiresUserAction) {
            this.status = "conflict";
            this.emit("settings:conflict", {
              result: {
                status: "conflict",
                synced: false,
                conflicts,
                localVersion: this.localVersion,
                remoteVersion: remoteSettings.version,
                timestamp: Date.now(),
              },
            });

            return {
              status: "conflict",
              synced: false,
              conflicts,
              localVersion: this.localVersion,
              remoteVersion: remoteSettings.version,
              timestamp: Date.now(),
            };
          }

          // Push resolved settings
          await this.pushSettings(this.localSettings);
        } else {
          // No conflict resolution, server wins
          this.localSettings = remoteSettings.settings;
          this.localVersion = remoteSettings.version;
          this.saveLocalSettings();
        }
      } else {
        // Versions match, check for content differences
        if (
          JSON.stringify(this.localSettings) !==
          JSON.stringify(remoteSettings.settings)
        ) {
          // Content differs but versions match, push local changes
          await this.pushSettings(this.localSettings);
        }
      }

      const result: SettingsSyncResult = {
        status: "synced",
        synced: true,
        conflicts,
        localVersion: this.localVersion,
        remoteVersion: remoteSettings.version,
        timestamp: Date.now(),
      };

      this.status = "synced";
      this.lastSyncTimestamp = Date.now();
      this.emit("settings:synced", { result });

      this.log("Settings synced successfully:", result);

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.status = "error";

      const result: SettingsSyncResult = {
        status: "error",
        synced: false,
        conflicts,
        localVersion: this.localVersion,
        remoteVersion: 0,
        timestamp: Date.now(),
        error: errorMessage,
      };

      this.emit("settings:error", { error: errorMessage });
      this.log("Settings sync failed:", errorMessage);

      throw error;
    }
  }

  /**
   * Update settings (local and push to server)
   */
  async updateSettings(
    updates: Partial<UserSettings>,
    category?: keyof UserSettings,
  ): Promise<void> {
    this.log("Updating settings:", category, updates);

    // Merge updates with local settings
    if (category) {
      this.localSettings = {
        ...this.localSettings,
        [category]: {
          ...this.localSettings[category],
          ...updates[category],
        },
      };
    } else {
      this.localSettings = {
        ...this.localSettings,
        ...updates,
      };
    }

    // Save locally
    this.saveLocalSettings();

    // Emit change event
    this.emit("settings:changed", {
      change: {
        userId: this.config.userId,
        category: category || ("_all" as keyof UserSettings),
        changes: updates,
        version: this.localVersion,
        timestamp: Date.now(),
      },
    });

    // Push to server
    try {
      await this.pushSettings(this.localSettings);
    } catch (error) {
      this.log("Failed to push settings:", error);
      // Settings are saved locally, will sync later
    }
  }

  /**
   * Reset settings to defaults
   */
  async resetSettings(): Promise<void> {
    this.log("Resetting settings to defaults");

    this.localSettings = { ...DEFAULT_USER_SETTINGS };
    this.localVersion = 1;
    this.saveLocalSettings();

    // Push to server
    await this.pushSettings(this.localSettings);
  }

  // ============================================================================
  // Conflict Resolution
  // ============================================================================

  /**
   * Resolve settings conflict
   */
  private async resolveSettingsConflict(
    local: UserSettings,
    remote: UserSettings,
    localVersion: number,
    remoteVersion: number,
  ): Promise<ConflictResolutionResult> {
    const conflictService = getConflictResolutionService();
    if (!conflictService.initialized) {
      conflictService.initialize();
    }

    // Create conflict entity
    const entity: ConflictEntity = {
      id: this.config.userId,
      type: "user:settings",
      localData: local,
      remoteData: remote,
      localTimestamp: Date.now(),
      remoteTimestamp: Date.now(),
      localVersion,
      remoteVersion,
    };

    // Detect conflict
    const detection = conflictService.detectConflict(entity);

    if (!detection.hasConflict) {
      return {
        id: entity.id,
        type: "user:settings",
        strategy: "last-write-wins",
        resolvedData: remote,
        timestamp: Date.now(),
        requiresUserAction: false,
      };
    }

    // Try to merge settings intelligently
    const mergedSettings = this.mergeSettings(local, remote);

    // Check if merge was successful (no critical conflicts)
    const hasCriticalConflicts = this.hasCriticalConflicts(
      local,
      remote,
      mergedSettings,
    );

    if (hasCriticalConflicts) {
      // Require manual resolution for critical conflicts
      return {
        id: entity.id,
        type: "user:settings",
        strategy: "manual",
        resolvedData: remote, // Use remote as default
        timestamp: Date.now(),
        requiresUserAction: true,
      };
    }

    // Auto-resolve with merged settings
    return {
      id: entity.id,
      type: "user:settings",
      strategy: "merge",
      resolvedData: mergedSettings,
      timestamp: Date.now(),
      requiresUserAction: false,
    };
  }

  /**
   * Merge settings intelligently
   */
  private mergeSettings(
    local: UserSettings,
    remote: UserSettings,
  ): UserSettings {
    const merged: UserSettings = { ...DEFAULT_USER_SETTINGS };

    // Process each category
    for (const category of Object.keys(DEFAULT_USER_SETTINGS) as Array<
      keyof UserSettings
    >) {
      if (SERVER_WINS_CATEGORIES.includes(category)) {
        // Server wins for security-sensitive settings
        merged[category] = remote[category] as never;
      } else if (CLIENT_WINS_CATEGORIES.includes(category)) {
        // Client wins for user preferences
        merged[category] = local[category] as never;
      } else {
        // Deep merge for other categories
        merged[category] = {
          ...(remote[category] as object),
          ...(local[category] as object),
        } as never;
      }
    }

    // Handle special merge cases
    if (local.notifications && remote.notifications) {
      // Merge notification settings (most restrictive wins for quiet hours)
      merged.notifications = {
        ...remote.notifications,
        ...local.notifications,
        quietHoursEnabled:
          local.notifications.quietHoursEnabled ||
          remote.notifications.quietHoursEnabled,
      };
    }

    return merged;
  }

  /**
   * Check if there are critical conflicts that need manual resolution
   */
  private hasCriticalConflicts(
    local: UserSettings,
    remote: UserSettings,
    merged: UserSettings,
  ): boolean {
    // Check privacy settings for conflicts
    if (
      local.privacy.onlineStatusVisible !==
        remote.privacy.onlineStatusVisible ||
      local.privacy.profileVisible !== remote.privacy.profileVisible
    ) {
      return true;
    }

    // Check if merged settings differ significantly from both
    const mergedStr = JSON.stringify(merged);
    const localStr = JSON.stringify(local);
    const remoteStr = JSON.stringify(remote);

    // If merged is very different from both, may need manual review
    const localDiff = this.calculateDifference(mergedStr, localStr);
    const remoteDiff = this.calculateDifference(mergedStr, remoteStr);

    // If differences are > 30%, consider it critical
    return localDiff > 0.3 && remoteDiff > 0.3;
  }

  /**
   * Calculate difference ratio between two strings
   */
  private calculateDifference(str1: string, str2: string): number {
    if (str1 === str2) return 0;
    const len1 = str1.length;
    const len2 = str2.length;
    const maxLen = Math.max(len1, len2);
    if (maxLen === 0) return 0;

    let diff = 0;
    for (let i = 0; i < maxLen; i++) {
      if (str1[i] !== str2[i]) diff++;
    }

    return diff / maxLen;
  }

  // ============================================================================
  // Remote Operations
  // ============================================================================

  /**
   * Fetch settings from server
   */
  private async fetchRemoteSettings(): Promise<{
    settings: UserSettings;
    version: number;
  } | null> {
    try {
      const { data } =
        await this.config.apolloClient.query<GetUserSettingsResponse>({
          query: GET_USER_SETTINGS,
          variables: { userId: this.config.userId },
          fetchPolicy: "network-only",
        });

      if (!data.nchat_user_settings_by_pk) {
        return null;
      }

      return {
        settings: data.nchat_user_settings_by_pk.settings,
        version: data.nchat_user_settings_by_pk.version,
      };
    } catch (error) {
      this.log("Failed to fetch remote settings:", error);
      throw error;
    }
  }

  /**
   * Push settings to server
   */
  private async pushSettings(settings: UserSettings): Promise<void> {
    try {
      const { data } =
        await this.config.apolloClient.mutate<UpdateUserSettingsResponse>({
          mutation: UPDATE_USER_SETTINGS,
          variables: {
            userId: this.config.userId,
            settings,
          },
        });

      if (data?.update_nchat_user_settings_by_pk) {
        this.localVersion = data.update_nchat_user_settings_by_pk.version;
        this.log("Settings pushed successfully, version:", this.localVersion);
      }
    } catch (error) {
      this.log("Failed to push settings:", error);
      throw error;
    }
  }

  // ============================================================================
  // Local Storage
  // ============================================================================

  /**
   * Load settings from localStorage
   */
  private loadLocalSettings(): void {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const stored = localStorage.getItem(this.config.storageKey);
      if (!stored) {
        return;
      }

      const parsed = JSON.parse(stored);
      this.localSettings = parsed.settings || DEFAULT_USER_SETTINGS;
      this.localVersion = parsed.version || 0;
      this.lastSyncTimestamp = parsed.lastSyncTimestamp || 0;

      this.log("Loaded settings from localStorage");
    } catch (error) {
      logger.error("[SettingsSync] Failed to load local settings:", error);
    }
  }

  /**
   * Save settings to localStorage
   */
  private saveLocalSettings(): void {
    if (typeof window === "undefined") {
      return;
    }

    try {
      localStorage.setItem(
        this.config.storageKey,
        JSON.stringify({
          settings: this.localSettings,
          version: this.localVersion,
          lastSyncTimestamp: this.lastSyncTimestamp,
        }),
      );
    } catch (error) {
      logger.error("[SettingsSync] Failed to save local settings:", error);
    }
  }

  // ============================================================================
  // Auto-Sync
  // ============================================================================

  /**
   * Start auto-sync interval
   */
  private startAutoSync(): void {
    this.syncInterval = setInterval(() => {
      this.sync().catch((error) => {
        this.log("Auto-sync failed:", error);
      });
    }, this.config.autoSyncInterval);

    this.log(
      "Auto-sync started, interval:",
      this.config.autoSyncInterval,
      "ms",
    );
  }

  /**
   * Set up visibility change listener
   */
  private setupVisibilityListener(): void {
    if (typeof window === "undefined") {
      return;
    }

    const handler = () => {
      if (document.visibilityState === "visible") {
        this.log("Tab became visible, syncing settings");
        this.sync().catch((error) => {
          this.log("Visibility sync failed:", error);
        });
      }
    };

    document.addEventListener("visibilitychange", handler);

    this.visibilityListener = () => {
      document.removeEventListener("visibilitychange", handler);
    };
  }

  // ============================================================================
  // Event System
  // ============================================================================

  /**
   * Subscribe to settings sync events
   */
  subscribe(listener: SettingsSyncEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Emit event to all listeners
   */
  private emit(
    event: SettingsSyncEventType,
    data?: {
      result?: SettingsSyncResult;
      change?: SettingsChangeEvent;
      error?: string;
    },
  ): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event, data);
      } catch (error) {
        logger.error("[SettingsSync] Listener error:", error);
      }
    });
  }

  // ============================================================================
  // Getters
  // ============================================================================

  /**
   * Get current settings
   */
  getSettings(): UserSettings {
    return { ...this.localSettings };
  }

  /**
   * Get settings category
   */
  getCategory<K extends keyof UserSettings>(category: K): UserSettings[K] {
    return this.localSettings[category];
  }

  /**
   * Get sync status
   */
  getSyncStatus(): SettingsSyncStatus {
    return this.status;
  }

  /**
   * Get last sync timestamp
   */
  getLastSyncTimestamp(): number {
    return this.lastSyncTimestamp;
  }

  /**
   * Get current version
   */
  getVersion(): number {
    return this.localVersion;
  }

  /**
   * Check if initialized
   */
  get initialized(): boolean {
    return this.isInitialized;
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  /**
   * Log message if debug enabled
   */
  private log(...args: unknown[]): void {
    if (this.config.debug) {
      // REMOVED: console.log('[SettingsSync]', ...args)
    }
  }
}

// ============================================================================
// Exports
// ============================================================================

export { SettingsSyncService };
export default SettingsSyncService;
