/**
 * Integration Store
 *
 * Zustand store for managing external integration state.
 * Handles connected integrations, settings, and sync status.
 */

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type {
  Integration,
  IntegrationStatus,
  IntegrationCategory,
  IntegrationSettings,
  SyncStatus,
  ChannelMapping,
} from "@/lib/integrations/types";

// ============================================================================
// Types
// ============================================================================

export interface IntegrationStoreState {
  // Connected integrations
  integrations: Record<string, Integration>;

  // Sync status for each integration
  syncStatus: Record<string, SyncStatus>;

  // Settings per integration
  settings: Record<string, IntegrationSettings>;

  // UI state
  isLoading: boolean;
  isConnecting: string | null; // Integration ID being connected
  error: string | null;

  // Selected integration for settings panel
  selectedIntegrationId: string | null;
}

export interface IntegrationStoreActions {
  // Integration CRUD
  setIntegration: (integration: Integration) => void;
  updateIntegration: (id: string, updates: Partial<Integration>) => void;
  removeIntegration: (id: string) => void;
  setIntegrations: (integrations: Integration[]) => void;

  // Connection status
  setConnecting: (id: string | null) => void;
  setConnected: (id: string, connectedAt: string) => void;
  setDisconnected: (id: string) => void;
  setError: (id: string, error: string) => void;
  clearError: (id: string) => void;

  // Sync status
  setSyncStatus: (id: string, status: SyncStatus) => void;
  startSync: (id: string) => void;
  completeSync: (id: string) => void;
  failSync: (id: string, error: string) => void;

  // Settings
  setSettings: (id: string, settings: IntegrationSettings) => void;
  updateSettings: (id: string, updates: Partial<IntegrationSettings>) => void;
  addChannelMapping: (id: string, mapping: ChannelMapping) => void;
  removeChannelMapping: (id: string, sourceChannelId: string) => void;
  updateChannelMapping: (
    id: string,
    sourceChannelId: string,
    updates: Partial<ChannelMapping>,
  ) => void;

  // UI state
  setLoading: (loading: boolean) => void;
  setGlobalError: (error: string | null) => void;
  selectIntegration: (id: string | null) => void;

  // Utility
  getIntegration: (id: string) => Integration | undefined;
  getIntegrationsByCategory: (category: IntegrationCategory) => Integration[];
  getIntegrationsByStatus: (status: IntegrationStatus) => Integration[];
  getConnectedIntegrations: () => Integration[];

  // Reset
  reset: () => void;
}

export type IntegrationStore = IntegrationStoreState & IntegrationStoreActions;

// ============================================================================
// Initial State
// ============================================================================

const initialState: IntegrationStoreState = {
  integrations: {},
  syncStatus: {},
  settings: {},
  isLoading: false,
  isConnecting: null,
  error: null,
  selectedIntegrationId: null,
};

// ============================================================================
// Store
// ============================================================================

export const useIntegrationStore = create<IntegrationStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // ====================================================================
        // Integration CRUD
        // ====================================================================

        setIntegration: (integration: Integration) =>
          set(
            (state) => ({
              integrations: {
                ...state.integrations,
                [integration.id]: integration,
              },
            }),
            false,
            "integration/setIntegration",
          ),

        updateIntegration: (id: string, updates: Partial<Integration>) =>
          set(
            (state) => {
              const existing = state.integrations[id];
              if (!existing) return state;

              return {
                integrations: {
                  ...state.integrations,
                  [id]: { ...existing, ...updates },
                },
              };
            },
            false,
            "integration/updateIntegration",
          ),

        removeIntegration: (id: string) =>
          set(
            (state) => {
              const { [id]: removed, ...rest } = state.integrations;
              const { [id]: removedSync, ...restSync } = state.syncStatus;
              const { [id]: removedSettings, ...restSettings } = state.settings;

              return {
                integrations: rest,
                syncStatus: restSync,
                settings: restSettings,
                selectedIntegrationId:
                  state.selectedIntegrationId === id
                    ? null
                    : state.selectedIntegrationId,
              };
            },
            false,
            "integration/removeIntegration",
          ),

        setIntegrations: (integrations: Integration[]) =>
          set(
            () => ({
              integrations: integrations.reduce(
                (acc, i) => ({ ...acc, [i.id]: i }),
                {} as Record<string, Integration>,
              ),
            }),
            false,
            "integration/setIntegrations",
          ),

        // ====================================================================
        // Connection Status
        // ====================================================================

        setConnecting: (id: string | null) =>
          set(
            (state) => {
              if (id) {
                return {
                  isConnecting: id,
                  integrations: {
                    ...state.integrations,
                    [id]: {
                      ...state.integrations[id],
                      status: "pending" as IntegrationStatus,
                    },
                  },
                };
              }
              return { isConnecting: null };
            },
            false,
            "integration/setConnecting",
          ),

        setConnected: (id: string, connectedAt: string) =>
          set(
            (state) => ({
              isConnecting:
                state.isConnecting === id ? null : state.isConnecting,
              integrations: {
                ...state.integrations,
                [id]: {
                  ...state.integrations[id],
                  status: "connected" as IntegrationStatus,
                  connectedAt,
                  error: undefined,
                },
              },
            }),
            false,
            "integration/setConnected",
          ),

        setDisconnected: (id: string) =>
          set(
            (state) => ({
              integrations: {
                ...state.integrations,
                [id]: {
                  ...state.integrations[id],
                  status: "disconnected" as IntegrationStatus,
                  connectedAt: undefined,
                  lastSyncAt: undefined,
                },
              },
            }),
            false,
            "integration/setDisconnected",
          ),

        setError: (id: string, error: string) =>
          set(
            (state) => ({
              isConnecting:
                state.isConnecting === id ? null : state.isConnecting,
              integrations: {
                ...state.integrations,
                [id]: {
                  ...state.integrations[id],
                  status: "error" as IntegrationStatus,
                  error,
                },
              },
            }),
            false,
            "integration/setError",
          ),

        clearError: (id: string) =>
          set(
            (state) => ({
              integrations: {
                ...state.integrations,
                [id]: {
                  ...state.integrations[id],
                  error: undefined,
                },
              },
            }),
            false,
            "integration/clearError",
          ),

        // ====================================================================
        // Sync Status
        // ====================================================================

        setSyncStatus: (id: string, status: SyncStatus) =>
          set(
            (state) => ({
              syncStatus: {
                ...state.syncStatus,
                [id]: status,
              },
            }),
            false,
            "integration/setSyncStatus",
          ),

        startSync: (id: string) =>
          set(
            (state) => ({
              syncStatus: {
                ...state.syncStatus,
                [id]: {
                  integrationId: id,
                  status: "syncing",
                  progress: 0,
                },
              },
            }),
            false,
            "integration/startSync",
          ),

        completeSync: (id: string) =>
          set(
            (state) => {
              const now = new Date().toISOString();
              return {
                syncStatus: {
                  ...state.syncStatus,
                  [id]: {
                    integrationId: id,
                    status: "success",
                    progress: 100,
                    lastSyncAt: now,
                  },
                },
                integrations: {
                  ...state.integrations,
                  [id]: {
                    ...state.integrations[id],
                    lastSyncAt: now,
                  },
                },
              };
            },
            false,
            "integration/completeSync",
          ),

        failSync: (id: string, error: string) =>
          set(
            (state) => ({
              syncStatus: {
                ...state.syncStatus,
                [id]: {
                  integrationId: id,
                  status: "error",
                  error,
                },
              },
            }),
            false,
            "integration/failSync",
          ),

        // ====================================================================
        // Settings
        // ====================================================================

        setSettings: (id: string, settings: IntegrationSettings) =>
          set(
            (state) => ({
              settings: {
                ...state.settings,
                [id]: settings,
              },
            }),
            false,
            "integration/setSettings",
          ),

        updateSettings: (id: string, updates: Partial<IntegrationSettings>) =>
          set(
            (state) => {
              const existing = state.settings[id];
              if (!existing) {
                return {
                  settings: {
                    ...state.settings,
                    [id]: {
                      integrationId: id,
                      channelMappings: [],
                      notificationSettings: {
                        enabled: true,
                        events: [],
                      },
                      syncOptions: {
                        autoSync: true,
                        syncInterval: 60,
                        syncHistory: false,
                      },
                      ...updates,
                    },
                  },
                };
              }

              return {
                settings: {
                  ...state.settings,
                  [id]: { ...existing, ...updates },
                },
              };
            },
            false,
            "integration/updateSettings",
          ),

        addChannelMapping: (id: string, mapping: ChannelMapping) =>
          set(
            (state) => {
              const existing = state.settings[id];
              const defaultSettings: IntegrationSettings = {
                integrationId: id,
                channelMappings: [],
                notificationSettings: { enabled: true, events: [] },
                syncOptions: {
                  autoSync: true,
                  syncInterval: 60,
                  syncHistory: false,
                },
              };
              const settings = existing || defaultSettings;

              return {
                settings: {
                  ...state.settings,
                  [id]: {
                    ...settings,
                    channelMappings: [...settings.channelMappings, mapping],
                  },
                },
              };
            },
            false,
            "integration/addChannelMapping",
          ),

        removeChannelMapping: (id: string, sourceChannelId: string) =>
          set(
            (state) => {
              const existing = state.settings[id];
              if (!existing) return state;

              return {
                settings: {
                  ...state.settings,
                  [id]: {
                    ...existing,
                    channelMappings: existing.channelMappings.filter(
                      (m) => m.sourceChannelId !== sourceChannelId,
                    ),
                  },
                },
              };
            },
            false,
            "integration/removeChannelMapping",
          ),

        updateChannelMapping: (
          id: string,
          sourceChannelId: string,
          updates: Partial<ChannelMapping>,
        ) =>
          set(
            (state) => {
              const existing = state.settings[id];
              if (!existing) return state;

              return {
                settings: {
                  ...state.settings,
                  [id]: {
                    ...existing,
                    channelMappings: existing.channelMappings.map((m) =>
                      m.sourceChannelId === sourceChannelId
                        ? { ...m, ...updates }
                        : m,
                    ),
                  },
                },
              };
            },
            false,
            "integration/updateChannelMapping",
          ),

        // ====================================================================
        // UI State
        // ====================================================================

        setLoading: (loading: boolean) =>
          set({ isLoading: loading }, false, "integration/setLoading"),

        setGlobalError: (error: string | null) =>
          set({ error }, false, "integration/setGlobalError"),

        selectIntegration: (id: string | null) =>
          set(
            { selectedIntegrationId: id },
            false,
            "integration/selectIntegration",
          ),

        // ====================================================================
        // Utility
        // ====================================================================

        getIntegration: (id: string) => get().integrations[id],

        getIntegrationsByCategory: (category: IntegrationCategory) =>
          Object.values(get().integrations).filter(
            (i) => i.category === category,
          ),

        getIntegrationsByStatus: (status: IntegrationStatus) =>
          Object.values(get().integrations).filter((i) => i.status === status),

        getConnectedIntegrations: () =>
          Object.values(get().integrations).filter(
            (i) => i.status === "connected",
          ),

        // ====================================================================
        // Reset
        // ====================================================================

        reset: () => set(initialState, false, "integration/reset"),
      }),
      {
        name: "nchat-integration-store",
        partialize: (state) => ({
          integrations: state.integrations,
          settings: state.settings,
        }),
      },
    ),
    { name: "IntegrationStore" },
  ),
);

// ============================================================================
// Selectors
// ============================================================================

export const selectIntegrations = (state: IntegrationStore) =>
  Object.values(state.integrations);

export const selectConnectedIntegrations = (state: IntegrationStore) =>
  Object.values(state.integrations).filter((i) => i.status === "connected");

export const selectIntegrationById =
  (id: string) => (state: IntegrationStore) =>
    state.integrations[id];

export const selectSyncStatus = (id: string) => (state: IntegrationStore) =>
  state.syncStatus[id];

export const selectSettings = (id: string) => (state: IntegrationStore) =>
  state.settings[id];

export const selectIsConnecting = (state: IntegrationStore) =>
  state.isConnecting;

export const selectSelectedIntegration = (state: IntegrationStore) =>
  state.selectedIntegrationId
    ? state.integrations[state.selectedIntegrationId]
    : null;

export const selectIsSyncing = (id: string) => (state: IntegrationStore) =>
  state.syncStatus[id]?.status === "syncing";

export default useIntegrationStore;
