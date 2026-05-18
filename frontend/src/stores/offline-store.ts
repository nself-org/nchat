/**
 * Offline Store - Zustand store for offline mode state management
 *
 * Manages offline cache, queue, and sync state, providing reactive
 * access to offline functionality throughout the application.
 */

import { create } from "zustand";
import { devtools, subscribeWithSelector, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type {
  QueuedAction,
  SyncState,
  SyncStatus,
  CacheStats,
  OfflineConfig,
  DEFAULT_OFFLINE_CONFIG,
} from "@/lib/offline/offline-types";

// =============================================================================
// Types
// =============================================================================

export interface PendingMessage {
  tempId: string;
  channelId: string;
  content: string;
  createdAt: Date;
  status: "pending" | "sending" | "failed";
  error?: string;
}

export interface OfflineStoreState {
  // Mode state
  isOfflineMode: boolean;
  offlineModeEnabledAt: Date | null;

  // Queue state
  queuedActions: QueuedAction[];
  pendingMessages: PendingMessage[];
  queueProcessing: boolean;
  queueError: string | null;

  // Sync state
  sync: SyncState;
  lastSyncError: string | null;

  // Cache state
  cacheStats: CacheStats | null;
  cacheEnabled: boolean;
  cachedChannelIds: string[];

  // Settings
  settings: {
    autoSyncEnabled: boolean;
    backgroundSyncEnabled: boolean;
    cacheMessagesPerChannel: number;
    maxCacheAge: number; // days
    showOfflineIndicator: boolean;
  };
}

export interface OfflineStoreActions {
  // Mode actions
  setOfflineMode: (enabled: boolean) => void;
  toggleOfflineMode: () => void;

  // Queue actions
  setQueuedActions: (actions: QueuedAction[]) => void;
  addQueuedAction: (action: QueuedAction) => void;
  updateQueuedAction: (id: string, updates: Partial<QueuedAction>) => void;
  removeQueuedAction: (id: string) => void;
  clearQueue: () => void;
  setQueueProcessing: (processing: boolean) => void;
  setQueueError: (error: string | null) => void;

  // Pending messages actions
  addPendingMessage: (message: PendingMessage) => void;
  updatePendingMessage: (
    tempId: string,
    updates: Partial<PendingMessage>,
  ) => void;
  removePendingMessage: (tempId: string) => void;
  clearPendingMessages: () => void;
  getPendingMessagesForChannel: (channelId: string) => PendingMessage[];

  // Sync actions
  setSyncState: (state: Partial<SyncState>) => void;
  setSyncStatus: (status: SyncStatus) => void;
  setSyncProgress: (progress: number) => void;
  setSyncError: (error: string | null) => void;
  recordSuccessfulSync: () => void;

  // Cache actions
  setCacheStats: (stats: CacheStats | null) => void;
  setCacheEnabled: (enabled: boolean) => void;
  setCachedChannelIds: (ids: string[]) => void;
  addCachedChannel: (id: string) => void;
  removeCachedChannel: (id: string) => void;

  // Settings actions
  updateSettings: (settings: Partial<OfflineStoreState["settings"]>) => void;

  // Reset
  reset: () => void;
}

export type OfflineStore = OfflineStoreState & OfflineStoreActions;

// =============================================================================
// Initial State
// =============================================================================

const initialSyncState: SyncState = {
  status: "idle",
  operation: null,
  progress: 0,
  itemsProcessed: 0,
  itemsTotal: 0,
  lastSyncAt: null,
  lastSuccessfulSyncAt: null,
  error: null,
  pendingChanges: 0,
};

const initialSettings: OfflineStoreState["settings"] = {
  autoSyncEnabled: true,
  backgroundSyncEnabled: true,
  cacheMessagesPerChannel: 100,
  maxCacheAge: 7,
  showOfflineIndicator: true,
};

const initialState: OfflineStoreState = {
  isOfflineMode: false,
  offlineModeEnabledAt: null,
  queuedActions: [],
  pendingMessages: [],
  queueProcessing: false,
  queueError: null,
  sync: initialSyncState,
  lastSyncError: null,
  cacheStats: null,
  cacheEnabled: true,
  cachedChannelIds: [],
  settings: initialSettings,
};

// =============================================================================
// Store
// =============================================================================

export const useOfflineStore = create<OfflineStore>()(
  devtools(
    subscribeWithSelector(
      persist(
        immer((set, get) => ({
          ...initialState,

          // Mode actions
          setOfflineMode: (enabled) =>
            set(
              (state) => {
                state.isOfflineMode = enabled;
                state.offlineModeEnabledAt = enabled ? new Date() : null;
              },
              false,
              "offline/setOfflineMode",
            ),

          toggleOfflineMode: () =>
            set(
              (state) => {
                state.isOfflineMode = !state.isOfflineMode;
                state.offlineModeEnabledAt = state.isOfflineMode
                  ? new Date()
                  : null;
              },
              false,
              "offline/toggleOfflineMode",
            ),

          // Queue actions
          setQueuedActions: (actions) =>
            set(
              (state) => {
                state.queuedActions = actions;
              },
              false,
              "offline/setQueuedActions",
            ),

          addQueuedAction: (action) =>
            set(
              (state) => {
                state.queuedActions.push(action);
              },
              false,
              "offline/addQueuedAction",
            ),

          updateQueuedAction: (id, updates) =>
            set(
              (state) => {
                const index = state.queuedActions.findIndex((a) => a.id === id);
                if (index !== -1) {
                  state.queuedActions[index] = {
                    ...state.queuedActions[index],
                    ...updates,
                    updatedAt: new Date(),
                  };
                }
              },
              false,
              "offline/updateQueuedAction",
            ),

          removeQueuedAction: (id) =>
            set(
              (state) => {
                state.queuedActions = state.queuedActions.filter(
                  (a) => a.id !== id,
                );
              },
              false,
              "offline/removeQueuedAction",
            ),

          clearQueue: () =>
            set(
              (state) => {
                state.queuedActions = [];
                state.queueError = null;
              },
              false,
              "offline/clearQueue",
            ),

          setQueueProcessing: (processing) =>
            set(
              (state) => {
                state.queueProcessing = processing;
              },
              false,
              "offline/setQueueProcessing",
            ),

          setQueueError: (error) =>
            set(
              (state) => {
                state.queueError = error;
              },
              false,
              "offline/setQueueError",
            ),

          // Pending messages actions
          addPendingMessage: (message) =>
            set(
              (state) => {
                state.pendingMessages.push(message);
              },
              false,
              "offline/addPendingMessage",
            ),

          updatePendingMessage: (tempId, updates) =>
            set(
              (state) => {
                const index = state.pendingMessages.findIndex(
                  (m) => m.tempId === tempId,
                );
                if (index !== -1) {
                  state.pendingMessages[index] = {
                    ...state.pendingMessages[index],
                    ...updates,
                  };
                }
              },
              false,
              "offline/updatePendingMessage",
            ),

          removePendingMessage: (tempId) =>
            set(
              (state) => {
                state.pendingMessages = state.pendingMessages.filter(
                  (m) => m.tempId !== tempId,
                );
              },
              false,
              "offline/removePendingMessage",
            ),

          clearPendingMessages: () =>
            set(
              (state) => {
                state.pendingMessages = [];
              },
              false,
              "offline/clearPendingMessages",
            ),

          getPendingMessagesForChannel: (channelId) => {
            return get().pendingMessages.filter(
              (m) => m.channelId === channelId,
            );
          },

          // Sync actions
          setSyncState: (syncState) =>
            set(
              (state) => {
                state.sync = { ...state.sync, ...syncState };
              },
              false,
              "offline/setSyncState",
            ),

          setSyncStatus: (status) =>
            set(
              (state) => {
                state.sync.status = status;
              },
              false,
              "offline/setSyncStatus",
            ),

          setSyncProgress: (progress) =>
            set(
              (state) => {
                state.sync.progress = progress;
              },
              false,
              "offline/setSyncProgress",
            ),

          setSyncError: (error) =>
            set(
              (state) => {
                state.sync.error = error;
                state.lastSyncError = error;
              },
              false,
              "offline/setSyncError",
            ),

          recordSuccessfulSync: () =>
            set(
              (state) => {
                const now = new Date();
                state.sync.lastSyncAt = now;
                state.sync.lastSuccessfulSyncAt = now;
                state.sync.error = null;
                state.sync.pendingChanges = 0;
              },
              false,
              "offline/recordSuccessfulSync",
            ),

          // Cache actions
          setCacheStats: (stats) =>
            set(
              (state) => {
                state.cacheStats = stats;
              },
              false,
              "offline/setCacheStats",
            ),

          setCacheEnabled: (enabled) =>
            set(
              (state) => {
                state.cacheEnabled = enabled;
              },
              false,
              "offline/setCacheEnabled",
            ),

          setCachedChannelIds: (ids) =>
            set(
              (state) => {
                state.cachedChannelIds = ids;
              },
              false,
              "offline/setCachedChannelIds",
            ),

          addCachedChannel: (id) =>
            set(
              (state) => {
                if (!state.cachedChannelIds.includes(id)) {
                  state.cachedChannelIds.push(id);
                }
              },
              false,
              "offline/addCachedChannel",
            ),

          removeCachedChannel: (id) =>
            set(
              (state) => {
                state.cachedChannelIds = state.cachedChannelIds.filter(
                  (cid) => cid !== id,
                );
              },
              false,
              "offline/removeCachedChannel",
            ),

          // Settings actions
          updateSettings: (settings) =>
            set(
              (state) => {
                state.settings = { ...state.settings, ...settings };
              },
              false,
              "offline/updateSettings",
            ),

          // Reset
          reset: () => set(() => initialState, false, "offline/reset"),
        })),
        {
          name: "nchat-offline-store",
          partialize: (state) => ({
            // Only persist settings and cached channel IDs
            settings: state.settings,
            cachedChannelIds: state.cachedChannelIds,
            cacheEnabled: state.cacheEnabled,
          }),
        },
      ),
    ),
    { name: "offline-store" },
  ),
);

// =============================================================================
// Selectors
// =============================================================================

export const selectIsOfflineMode = (state: OfflineStore) => state.isOfflineMode;
export const selectQueuedActions = (state: OfflineStore) => state.queuedActions;
export const selectPendingMessages = (state: OfflineStore) =>
  state.pendingMessages;
export const selectQueueProcessing = (state: OfflineStore) =>
  state.queueProcessing;
export const selectQueueCount = (state: OfflineStore) =>
  state.queuedActions.length;
export const selectPendingCount = (state: OfflineStore) =>
  state.queuedActions.filter((a) => a.status === "pending").length;
export const selectSyncState = (state: OfflineStore) => state.sync;
export const selectSyncStatus = (state: OfflineStore) => state.sync.status;
export const selectIsSyncing = (state: OfflineStore) =>
  state.sync.status === "syncing";
export const selectSyncProgress = (state: OfflineStore) => state.sync.progress;
export const selectLastSyncAt = (state: OfflineStore) => state.sync.lastSyncAt;
export const selectCacheStats = (state: OfflineStore) => state.cacheStats;
export const selectCacheEnabled = (state: OfflineStore) => state.cacheEnabled;
export const selectCachedChannelIds = (state: OfflineStore) =>
  state.cachedChannelIds;
export const selectOfflineSettings = (state: OfflineStore) => state.settings;

export const selectHasPendingChanges = (state: OfflineStore) =>
  state.queuedActions.length > 0 || state.pendingMessages.length > 0;

export const selectPendingMessagesByChannel =
  (channelId: string) => (state: OfflineStore) =>
    state.pendingMessages.filter((m) => m.channelId === channelId);

export const selectQueuedActionsByChannel =
  (channelId: string) => (state: OfflineStore) =>
    state.queuedActions.filter((a) => a.channelId === channelId);

// =============================================================================
// Hooks
// =============================================================================

/**
 * Get offline mode summary
 */
export function useOfflineSummary() {
  return useOfflineStore((state) => ({
    isOfflineMode: state.isOfflineMode,
    pendingCount: state.queuedActions.filter((a) => a.status === "pending")
      .length,
    pendingMessages: state.pendingMessages.length,
    isSyncing: state.sync.status === "syncing",
    syncProgress: state.sync.progress,
    lastSyncAt: state.sync.lastSyncAt,
    hasPendingChanges:
      state.queuedActions.length > 0 || state.pendingMessages.length > 0,
  }));
}

/**
 * Get sync status
 */
export function useSyncStatus() {
  return useOfflineStore((state) => ({
    status: state.sync.status,
    progress: state.sync.progress,
    error: state.sync.error,
    lastSyncAt: state.sync.lastSyncAt,
    lastSuccessfulSyncAt: state.sync.lastSuccessfulSyncAt,
    pendingChanges: state.sync.pendingChanges,
  }));
}

/**
 * Get queue status
 */
export function useQueueStatus() {
  return useOfflineStore((state) => ({
    total: state.queuedActions.length,
    pending: state.queuedActions.filter((a) => a.status === "pending").length,
    processing: state.queuedActions.filter((a) => a.status === "processing")
      .length,
    failed: state.queuedActions.filter((a) => a.status === "failed").length,
    isProcessing: state.queueProcessing,
    error: state.queueError,
  }));
}

export default useOfflineStore;
