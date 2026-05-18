/**
 * Draft Sync - Handles synchronization of drafts across devices
 *
 * Syncs local drafts with server for cross-device access
 */

import type {
  Draft,
  DraftSyncConfig,
  DraftSyncResult,
  DraftConflict,
  DraftEventListener,
} from "./draft-types";

import { getDraftStorage, DraftStorage } from "./draft-storage";

import { logger } from "@/lib/logger";

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_SYNC_CONFIG: DraftSyncConfig = {
  enabled: false, // Disabled by default, requires server setup
  syncIntervalMs: 60000, // 1 minute
  retryAttempts: 3,
  retryDelayMs: 5000,
};

// ============================================================================
// Types for Server Communication
// ============================================================================

interface SyncRequest {
  userId: string;
  drafts: Draft[];
  lastSyncTimestamp: number;
}

interface SyncResponse {
  drafts: Draft[];
  deletedKeys: string[];
  serverTimestamp: number;
}

type SyncApiClient = {
  getDrafts: (userId: string, since?: number) => Promise<SyncResponse>;
  saveDrafts: (userId: string, drafts: Draft[]) => Promise<void>;
  deleteDrafts: (userId: string, contextKeys: string[]) => Promise<void>;
};

// ============================================================================
// Draft Sync Manager Class
// ============================================================================

/**
 * Manages synchronization of drafts with the server
 */
export class DraftSyncManager {
  private config: DraftSyncConfig;
  private storage: DraftStorage;
  private apiClient: SyncApiClient | null;
  private userId: string | null;
  private lastSyncTimestamp: number;
  private isSyncing: boolean;
  private syncTimer: ReturnType<typeof setInterval> | null;
  private listeners: Set<DraftEventListener>;
  private pendingSync: Map<string, Draft>;
  private pendingDeletes: Set<string>;

  constructor(
    config: Partial<DraftSyncConfig> = {},
    storage?: DraftStorage,
    apiClient?: SyncApiClient,
  ) {
    this.config = { ...DEFAULT_SYNC_CONFIG, ...config };
    this.storage = storage || getDraftStorage();
    this.apiClient = apiClient || null;
    this.userId = null;
    this.lastSyncTimestamp = 0;
    this.isSyncing = false;
    this.syncTimer = null;
    this.listeners = new Set();
    this.pendingSync = new Map();
    this.pendingDeletes = new Set();
  }

  // ============================================================================
  // Configuration
  // ============================================================================

  /**
   * Configure the sync manager
   */
  configure(config: Partial<DraftSyncConfig>): void {
    const wasEnabled = this.config.enabled;
    this.config = { ...this.config, ...config };

    if (wasEnabled && !this.config.enabled) {
      this.stop();
    }
  }

  /**
   * Set the API client for server communication
   */
  setApiClient(client: SyncApiClient): void {
    this.apiClient = client;
  }

  /**
   * Set the current user ID
   */
  setUserId(userId: string | null): void {
    const wasRunning = this.syncTimer !== null;

    if (wasRunning) {
      this.stop();
    }

    this.userId = userId;
    this.lastSyncTimestamp = 0;
    this.pendingSync.clear();
    this.pendingDeletes.clear();

    if (wasRunning && userId) {
      this.start();
    }
  }

  /**
   * Check if sync is enabled and properly configured
   */
  canSync(): boolean {
    return (
      this.config.enabled && this.apiClient !== null && this.userId !== null
    );
  }

  // ============================================================================
  // Event Handling
  // ============================================================================

  /**
   * Add event listener
   */
  addEventListener(listener: DraftEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: DraftEventListener): void {
    this.listeners.delete(listener);
  }

  private emit(
    type: "synced" | "sync_error",
    contextKey?: string,
    draft?: Draft,
    error?: string,
  ): void {
    const event = {
      type,
      contextKey,
      draft,
      timestamp: Date.now(),
      error,
    };

    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        logger.error("Error in sync event listener:", err);
      }
    });
  }

  // ============================================================================
  // Sync Operations
  // ============================================================================

  /**
   * Mark a draft for sync
   */
  markForSync(contextKey: string, draft: Draft): void {
    if (!this.canSync()) return;
    this.pendingSync.set(contextKey, draft);
    this.pendingDeletes.delete(contextKey);
  }

  /**
   * Mark a draft for deletion
   */
  markForDelete(contextKey: string): void {
    if (!this.canSync()) return;
    this.pendingDeletes.add(contextKey);
    this.pendingSync.delete(contextKey);
  }

  /**
   * Perform a full sync
   */
  async sync(): Promise<DraftSyncResult> {
    if (!this.canSync()) {
      return {
        success: false,
        syncedCount: 0,
        failedCount: 0,
        conflicts: [],
        error: "Sync not available",
      };
    }

    if (this.isSyncing) {
      return {
        success: false,
        syncedCount: 0,
        failedCount: 0,
        conflicts: [],
        error: "Sync already in progress",
      };
    }

    this.isSyncing = true;
    const conflicts: DraftConflict[] = [];
    let syncedCount = 0;
    let failedCount = 0;

    try {
      // Step 1: Get remote drafts
      const remoteResponse = await this.apiClient!.getDrafts(
        this.userId!,
        this.lastSyncTimestamp,
      );

      // Step 2: Get local drafts
      const localDrafts = await this.storage.getAll();
      const localDraftsMap = new Map(localDrafts.map((d) => [d.contextKey, d]));

      // Step 3: Merge remote drafts into local
      for (const remoteDraft of remoteResponse.drafts) {
        const localDraft = localDraftsMap.get(remoteDraft.contextKey);

        if (!localDraft) {
          // Remote only - save locally
          await this.storage.set(remoteDraft.contextKey, remoteDraft);
          syncedCount++;
        } else if (remoteDraft.version > localDraft.version) {
          // Remote is newer - use remote
          await this.storage.set(remoteDraft.contextKey, remoteDraft);
          syncedCount++;
        } else if (
          remoteDraft.version < localDraft.version ||
          remoteDraft.lastModified < localDraft.lastModified
        ) {
          // Local is newer - record conflict and keep local
          conflicts.push({
            contextKey: remoteDraft.contextKey,
            localDraft,
            remoteDraft,
            resolution: "local",
          });
        }
        // If versions match, no action needed
      }

      // Step 4: Handle remote deletions
      for (const deletedKey of remoteResponse.deletedKeys) {
        if (localDraftsMap.has(deletedKey)) {
          const localDraft = localDraftsMap.get(deletedKey)!;

          // Only delete if local wasn't modified after the sync
          if (localDraft.lastModified < remoteResponse.serverTimestamp) {
            await this.storage.remove(deletedKey);
          }
        }
      }

      // Step 5: Push local changes to remote
      const draftsToSync = Array.from(this.pendingSync.values());
      if (draftsToSync.length > 0) {
        await this.apiClient!.saveDrafts(this.userId!, draftsToSync);
        syncedCount += draftsToSync.length;
      }

      // Step 6: Push deletions to remote
      const keysToDelete = Array.from(this.pendingDeletes);
      if (keysToDelete.length > 0) {
        await this.apiClient!.deleteDrafts(this.userId!, keysToDelete);
      }

      // Clear pending operations
      this.pendingSync.clear();
      this.pendingDeletes.clear();
      this.lastSyncTimestamp = remoteResponse.serverTimestamp;

      this.emit("synced");

      return {
        success: true,
        syncedCount,
        failedCount,
        conflicts,
      };
    } catch (error) {
      failedCount = this.pendingSync.size + this.pendingDeletes.size;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      this.emit("sync_error", undefined, undefined, errorMessage);

      return {
        success: false,
        syncedCount,
        failedCount,
        conflicts,
        error: errorMessage,
      };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sync with retry logic
   */
  async syncWithRetry(): Promise<DraftSyncResult> {
    let lastResult: DraftSyncResult | null = null;
    let attempts = 0;

    while (attempts < this.config.retryAttempts) {
      lastResult = await this.sync();

      if (lastResult.success) {
        return lastResult;
      }

      attempts++;

      if (attempts < this.config.retryAttempts) {
        await this.delay(this.config.retryDelayMs * attempts);
      }
    }

    return lastResult!;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ============================================================================
  // Conflict Resolution
  // ============================================================================

  /**
   * Resolve a sync conflict
   */
  async resolveConflict(
    conflict: DraftConflict,
    resolution: "local" | "remote" | "merged",
    mergedDraft?: Draft,
  ): Promise<void> {
    switch (resolution) {
      case "local":
        // Keep local, push to remote
        this.markForSync(conflict.contextKey, conflict.localDraft);
        break;

      case "remote":
        // Use remote, update local
        await this.storage.set(conflict.contextKey, conflict.remoteDraft);
        break;

      case "merged":
        if (!mergedDraft) {
          throw new Error("Merged draft required for merge resolution");
        }
        await this.storage.set(conflict.contextKey, mergedDraft);
        this.markForSync(conflict.contextKey, mergedDraft);
        break;
    }
  }

  /**
   * Auto-resolve all conflicts (keeps newer version)
   */
  async autoResolveConflicts(conflicts: DraftConflict[]): Promise<void> {
    for (const conflict of conflicts) {
      if (
        conflict.localDraft.lastModified >= conflict.remoteDraft.lastModified
      ) {
        await this.resolveConflict(conflict, "local");
      } else {
        await this.resolveConflict(conflict, "remote");
      }
    }
  }

  // ============================================================================
  // Sync Timer
  // ============================================================================

  /**
   * Start periodic sync
   */
  start(): void {
    if (!this.canSync()) return;
    if (this.syncTimer) return;

    // Initial sync
    this.sync();

    // Start periodic sync
    this.syncTimer = setInterval(() => {
      this.sync();
    }, this.config.syncIntervalMs);
  }

  /**
   * Stop periodic sync
   */
  stop(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  /**
   * Check if sync timer is running
   */
  isRunning(): boolean {
    return this.syncTimer !== null;
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  /**
   * Cleanup and stop sync
   */
  destroy(): void {
    this.stop();
    this.pendingSync.clear();
    this.pendingDeletes.clear();
    this.listeners.clear();
    this.userId = null;
    this.lastSyncTimestamp = 0;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let syncManagerInstance: DraftSyncManager | null = null;

/**
 * Get the singleton sync manager instance
 */
export function getSyncManager(
  config?: Partial<DraftSyncConfig>,
): DraftSyncManager {
  if (!syncManagerInstance) {
    syncManagerInstance = new DraftSyncManager(config);
  }
  return syncManagerInstance;
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetSyncManager(): void {
  if (syncManagerInstance) {
    syncManagerInstance.destroy();
    syncManagerInstance = null;
  }
}

// ============================================================================
// Mock API Client for Development
// ============================================================================

/**
 * Create a mock API client that uses localStorage
 * Useful for development and testing
 */
export function createMockSyncApiClient(): SyncApiClient {
  const STORAGE_KEY = "nchat-drafts-sync-mock";

  const getServerDrafts = (): Map<string, Map<string, Draft>> => {
    if (typeof window === "undefined") return new Map();
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return new Map();

    try {
      const parsed = JSON.parse(data);
      const result = new Map<string, Map<string, Draft>>();
      for (const [userId, drafts] of Object.entries(parsed)) {
        result.set(
          userId,
          new Map(Object.entries(drafts as Record<string, Draft>)),
        );
      }
      return result;
    } catch {
      return new Map();
    }
  };

  const saveServerDrafts = (data: Map<string, Map<string, Draft>>): void => {
    if (typeof window === "undefined") return;
    const obj: Record<string, Record<string, Draft>> = {};
    data.forEach((drafts, userId) => {
      obj[userId] = Object.fromEntries(drafts);
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  };

  return {
    async getDrafts(userId: string, since?: number): Promise<SyncResponse> {
      const allDrafts = getServerDrafts();
      const userDrafts = allDrafts.get(userId) || new Map();

      const drafts = Array.from(userDrafts.values()).filter(
        (d) => !since || d.lastModified > since,
      );

      return {
        drafts,
        deletedKeys: [],
        serverTimestamp: Date.now(),
      };
    },

    async saveDrafts(userId: string, drafts: Draft[]): Promise<void> {
      const allDrafts = getServerDrafts();
      let userDrafts = allDrafts.get(userId);

      if (!userDrafts) {
        userDrafts = new Map();
        allDrafts.set(userId, userDrafts);
      }

      for (const draft of drafts) {
        userDrafts.set(draft.contextKey, {
          ...draft,
          syncStatus: "synced",
          lastSyncedAt: Date.now(),
        });
      }

      saveServerDrafts(allDrafts);
    },

    async deleteDrafts(userId: string, contextKeys: string[]): Promise<void> {
      const allDrafts = getServerDrafts();
      const userDrafts = allDrafts.get(userId);

      if (!userDrafts) return;

      for (const key of contextKeys) {
        userDrafts.delete(key);
      }

      saveServerDrafts(allDrafts);
    },
  };
}
