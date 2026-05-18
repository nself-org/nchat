/**
 * Integration Store Tests
 *
 * Comprehensive tests for the integration store including
 * CRUD operations, connection status, sync status, and settings.
 */

import { act } from "@testing-library/react";
import {
  useIntegrationStore,
  selectIntegrations,
  selectConnectedIntegrations,
  selectIntegrationById,
  selectSyncStatus,
  selectSettings,
  selectIsConnecting,
  selectSelectedIntegration,
  selectIsSyncing,
} from "../integration-store";
import type {
  Integration,
  IntegrationSettings,
  ChannelMapping,
} from "@/lib/integrations/types";

// ============================================================================
// Test Helpers
// ============================================================================

const createMockIntegration = (
  overrides?: Partial<Integration>,
): Integration => ({
  id: `integration-${Date.now()}`,
  name: "Test Integration",
  icon: "test-icon",
  description: "A test integration",
  category: "productivity",
  status: "disconnected",
  scopes: ["read", "write"],
  config: {},
  ...overrides,
});

const createMockSettings = (
  integrationId: string,
  overrides?: Partial<IntegrationSettings>,
): IntegrationSettings => ({
  integrationId,
  channelMappings: [],
  notificationSettings: {
    enabled: true,
    events: ["message.created"],
  },
  syncOptions: {
    autoSync: true,
    syncInterval: 60,
    syncHistory: false,
  },
  ...overrides,
});

const createMockChannelMapping = (
  overrides?: Partial<ChannelMapping>,
): ChannelMapping => ({
  sourceChannelId: "source-1",
  sourceChannelName: "Source Channel",
  targetChannelId: "target-1",
  targetChannelName: "Target Channel",
  syncDirection: "bidirectional",
  enabled: true,
  ...overrides,
});

// ============================================================================
// Setup/Teardown
// ============================================================================

describe("Integration Store", () => {
  beforeEach(() => {
    act(() => {
      useIntegrationStore.getState().reset();
    });
  });

  // ==========================================================================
  // Integration CRUD Tests
  // ==========================================================================

  describe("Integration CRUD", () => {
    describe("setIntegration", () => {
      it("should add a new integration", () => {
        const integration = createMockIntegration({ id: "slack" });

        act(() => {
          useIntegrationStore.getState().setIntegration(integration);
        });

        const state = useIntegrationStore.getState();
        expect(state.integrations["slack"]).toBeDefined();
        expect(state.integrations["slack"].name).toBe("Test Integration");
      });

      it("should update existing integration", () => {
        const integration = createMockIntegration({ id: "slack" });

        act(() => {
          useIntegrationStore.getState().setIntegration(integration);
          useIntegrationStore.getState().setIntegration({
            ...integration,
            name: "Updated Name",
          });
        });

        const state = useIntegrationStore.getState();
        expect(state.integrations["slack"].name).toBe("Updated Name");
      });
    });

    describe("updateIntegration", () => {
      it("should update integration fields", () => {
        const integration = createMockIntegration({ id: "slack" });

        act(() => {
          useIntegrationStore.getState().setIntegration(integration);
          useIntegrationStore.getState().updateIntegration("slack", {
            status: "connected",
            connectedAt: "2024-01-01T00:00:00Z",
          });
        });

        const state = useIntegrationStore.getState();
        expect(state.integrations["slack"].status).toBe("connected");
        expect(state.integrations["slack"].connectedAt).toBe(
          "2024-01-01T00:00:00Z",
        );
      });

      it("should not update non-existent integration", () => {
        act(() => {
          useIntegrationStore.getState().updateIntegration("non-existent", {
            status: "connected",
          });
        });

        const state = useIntegrationStore.getState();
        expect(state.integrations["non-existent"]).toBeUndefined();
      });
    });

    describe("removeIntegration", () => {
      it("should remove integration", () => {
        const integration = createMockIntegration({ id: "slack" });

        act(() => {
          useIntegrationStore.getState().setIntegration(integration);
          useIntegrationStore.getState().removeIntegration("slack");
        });

        const state = useIntegrationStore.getState();
        expect(state.integrations["slack"]).toBeUndefined();
      });

      it("should clear related sync status and settings", () => {
        const integration = createMockIntegration({ id: "slack" });
        const settings = createMockSettings("slack");

        act(() => {
          useIntegrationStore.getState().setIntegration(integration);
          useIntegrationStore.getState().setSettings("slack", settings);
          useIntegrationStore.getState().startSync("slack");
          useIntegrationStore.getState().removeIntegration("slack");
        });

        const state = useIntegrationStore.getState();
        expect(state.syncStatus["slack"]).toBeUndefined();
        expect(state.settings["slack"]).toBeUndefined();
      });

      it("should clear selection if removed integration was selected", () => {
        const integration = createMockIntegration({ id: "slack" });

        act(() => {
          useIntegrationStore.getState().setIntegration(integration);
          useIntegrationStore.getState().selectIntegration("slack");
          useIntegrationStore.getState().removeIntegration("slack");
        });

        const state = useIntegrationStore.getState();
        expect(state.selectedIntegrationId).toBeNull();
      });
    });

    describe("setIntegrations", () => {
      it("should set multiple integrations", () => {
        const integrations = [
          createMockIntegration({ id: "slack", name: "Slack" }),
          createMockIntegration({ id: "github", name: "GitHub" }),
        ];

        act(() => {
          useIntegrationStore.getState().setIntegrations(integrations);
        });

        const state = useIntegrationStore.getState();
        expect(Object.keys(state.integrations)).toHaveLength(2);
        expect(state.integrations["slack"].name).toBe("Slack");
        expect(state.integrations["github"].name).toBe("GitHub");
      });
    });
  });

  // ==========================================================================
  // Connection Status Tests
  // ==========================================================================

  describe("Connection Status", () => {
    beforeEach(() => {
      act(() => {
        useIntegrationStore
          .getState()
          .setIntegration(createMockIntegration({ id: "slack" }));
      });
    });

    describe("setConnecting", () => {
      it("should set connecting state", () => {
        act(() => {
          useIntegrationStore.getState().setConnecting("slack");
        });

        const state = useIntegrationStore.getState();
        expect(state.isConnecting).toBe("slack");
        expect(state.integrations["slack"].status).toBe("pending");
      });

      it("should clear connecting state", () => {
        act(() => {
          useIntegrationStore.getState().setConnecting("slack");
          useIntegrationStore.getState().setConnecting(null);
        });

        const state = useIntegrationStore.getState();
        expect(state.isConnecting).toBeNull();
      });
    });

    describe("setConnected", () => {
      it("should set connected state", () => {
        act(() => {
          useIntegrationStore.getState().setConnecting("slack");
          useIntegrationStore
            .getState()
            .setConnected("slack", "2024-01-01T00:00:00Z");
        });

        const state = useIntegrationStore.getState();
        expect(state.isConnecting).toBeNull();
        expect(state.integrations["slack"].status).toBe("connected");
        expect(state.integrations["slack"].connectedAt).toBe(
          "2024-01-01T00:00:00Z",
        );
      });

      it("should clear error on connect", () => {
        act(() => {
          useIntegrationStore.getState().setError("slack", "Previous error");
          useIntegrationStore
            .getState()
            .setConnected("slack", "2024-01-01T00:00:00Z");
        });

        const state = useIntegrationStore.getState();
        expect(state.integrations["slack"].error).toBeUndefined();
      });
    });

    describe("setDisconnected", () => {
      it("should set disconnected state", () => {
        act(() => {
          useIntegrationStore
            .getState()
            .setConnected("slack", "2024-01-01T00:00:00Z");
          useIntegrationStore.getState().setDisconnected("slack");
        });

        const state = useIntegrationStore.getState();
        expect(state.integrations["slack"].status).toBe("disconnected");
        expect(state.integrations["slack"].connectedAt).toBeUndefined();
        expect(state.integrations["slack"].lastSyncAt).toBeUndefined();
      });
    });

    describe("setError", () => {
      it("should set error state", () => {
        act(() => {
          useIntegrationStore.getState().setConnecting("slack");
          useIntegrationStore.getState().setError("slack", "Connection failed");
        });

        const state = useIntegrationStore.getState();
        expect(state.isConnecting).toBeNull();
        expect(state.integrations["slack"].status).toBe("error");
        expect(state.integrations["slack"].error).toBe("Connection failed");
      });
    });

    describe("clearError", () => {
      it("should clear error", () => {
        act(() => {
          useIntegrationStore.getState().setError("slack", "Error");
          useIntegrationStore.getState().clearError("slack");
        });

        const state = useIntegrationStore.getState();
        expect(state.integrations["slack"].error).toBeUndefined();
      });
    });
  });

  // ==========================================================================
  // Sync Status Tests
  // ==========================================================================

  describe("Sync Status", () => {
    beforeEach(() => {
      act(() => {
        useIntegrationStore
          .getState()
          .setIntegration(
            createMockIntegration({ id: "slack", status: "connected" }),
          );
      });
    });

    describe("setSyncStatus", () => {
      it("should set sync status", () => {
        act(() => {
          useIntegrationStore.getState().setSyncStatus("slack", {
            integrationId: "slack",
            status: "syncing",
            progress: 50,
          });
        });

        const state = useIntegrationStore.getState();
        expect(state.syncStatus["slack"].status).toBe("syncing");
        expect(state.syncStatus["slack"].progress).toBe(50);
      });
    });

    describe("startSync", () => {
      it("should start sync", () => {
        act(() => {
          useIntegrationStore.getState().startSync("slack");
        });

        const state = useIntegrationStore.getState();
        expect(state.syncStatus["slack"].status).toBe("syncing");
        expect(state.syncStatus["slack"].progress).toBe(0);
      });
    });

    describe("completeSync", () => {
      it("should complete sync", () => {
        act(() => {
          useIntegrationStore.getState().startSync("slack");
          useIntegrationStore.getState().completeSync("slack");
        });

        const state = useIntegrationStore.getState();
        expect(state.syncStatus["slack"].status).toBe("success");
        expect(state.syncStatus["slack"].progress).toBe(100);
        expect(state.syncStatus["slack"].lastSyncAt).toBeDefined();
        expect(state.integrations["slack"].lastSyncAt).toBeDefined();
      });
    });

    describe("failSync", () => {
      it("should fail sync with error", () => {
        act(() => {
          useIntegrationStore.getState().startSync("slack");
          useIntegrationStore.getState().failSync("slack", "Sync failed");
        });

        const state = useIntegrationStore.getState();
        expect(state.syncStatus["slack"].status).toBe("error");
        expect(state.syncStatus["slack"].error).toBe("Sync failed");
      });
    });
  });

  // ==========================================================================
  // Settings Tests
  // ==========================================================================

  describe("Settings", () => {
    beforeEach(() => {
      act(() => {
        useIntegrationStore
          .getState()
          .setIntegration(createMockIntegration({ id: "slack" }));
      });
    });

    describe("setSettings", () => {
      it("should set integration settings", () => {
        const settings = createMockSettings("slack");

        act(() => {
          useIntegrationStore.getState().setSettings("slack", settings);
        });

        const state = useIntegrationStore.getState();
        expect(state.settings["slack"]).toEqual(settings);
      });
    });

    describe("updateSettings", () => {
      it("should update existing settings", () => {
        const settings = createMockSettings("slack");

        act(() => {
          useIntegrationStore.getState().setSettings("slack", settings);
          useIntegrationStore.getState().updateSettings("slack", {
            syncOptions: {
              autoSync: false,
              syncInterval: 120,
              syncHistory: true,
            },
          });
        });

        const state = useIntegrationStore.getState();
        expect(state.settings["slack"].syncOptions.autoSync).toBe(false);
        expect(state.settings["slack"].syncOptions.syncInterval).toBe(120);
      });

      it("should create default settings if not exists", () => {
        act(() => {
          useIntegrationStore.getState().updateSettings("slack", {
            notificationSettings: { enabled: false, events: [] },
          });
        });

        const state = useIntegrationStore.getState();
        expect(state.settings["slack"]).toBeDefined();
        expect(state.settings["slack"].notificationSettings.enabled).toBe(
          false,
        );
      });
    });

    describe("addChannelMapping", () => {
      it("should add channel mapping", () => {
        const mapping = createMockChannelMapping();

        act(() => {
          useIntegrationStore.getState().addChannelMapping("slack", mapping);
        });

        const state = useIntegrationStore.getState();
        expect(state.settings["slack"].channelMappings).toHaveLength(1);
        expect(state.settings["slack"].channelMappings[0]).toEqual(mapping);
      });

      it("should create settings if not exists", () => {
        const mapping = createMockChannelMapping();

        act(() => {
          useIntegrationStore.getState().addChannelMapping("slack", mapping);
        });

        const state = useIntegrationStore.getState();
        expect(state.settings["slack"]).toBeDefined();
      });
    });

    describe("removeChannelMapping", () => {
      it("should remove channel mapping", () => {
        const mapping1 = createMockChannelMapping({
          sourceChannelId: "source-1",
        });
        const mapping2 = createMockChannelMapping({
          sourceChannelId: "source-2",
        });

        act(() => {
          useIntegrationStore.getState().addChannelMapping("slack", mapping1);
          useIntegrationStore.getState().addChannelMapping("slack", mapping2);
          useIntegrationStore
            .getState()
            .removeChannelMapping("slack", "source-1");
        });

        const state = useIntegrationStore.getState();
        expect(state.settings["slack"].channelMappings).toHaveLength(1);
        expect(state.settings["slack"].channelMappings[0].sourceChannelId).toBe(
          "source-2",
        );
      });
    });

    describe("updateChannelMapping", () => {
      it("should update channel mapping", () => {
        const mapping = createMockChannelMapping();

        act(() => {
          useIntegrationStore.getState().addChannelMapping("slack", mapping);
          useIntegrationStore
            .getState()
            .updateChannelMapping("slack", "source-1", {
              enabled: false,
              syncDirection: "incoming",
            });
        });

        const state = useIntegrationStore.getState();
        expect(state.settings["slack"].channelMappings[0].enabled).toBe(false);
        expect(state.settings["slack"].channelMappings[0].syncDirection).toBe(
          "incoming",
        );
      });
    });
  });

  // ==========================================================================
  // UI State Tests
  // ==========================================================================

  describe("UI State", () => {
    describe("setLoading", () => {
      it("should set loading state", () => {
        act(() => {
          useIntegrationStore.getState().setLoading(true);
        });

        expect(useIntegrationStore.getState().isLoading).toBe(true);

        act(() => {
          useIntegrationStore.getState().setLoading(false);
        });

        expect(useIntegrationStore.getState().isLoading).toBe(false);
      });
    });

    describe("setGlobalError", () => {
      it("should set global error", () => {
        act(() => {
          useIntegrationStore.getState().setGlobalError("Something went wrong");
        });

        expect(useIntegrationStore.getState().error).toBe(
          "Something went wrong",
        );
      });

      it("should clear global error", () => {
        act(() => {
          useIntegrationStore.getState().setGlobalError("Error");
          useIntegrationStore.getState().setGlobalError(null);
        });

        expect(useIntegrationStore.getState().error).toBeNull();
      });
    });

    describe("selectIntegration", () => {
      it("should select integration", () => {
        const integration = createMockIntegration({ id: "slack" });

        act(() => {
          useIntegrationStore.getState().setIntegration(integration);
          useIntegrationStore.getState().selectIntegration("slack");
        });

        expect(useIntegrationStore.getState().selectedIntegrationId).toBe(
          "slack",
        );
      });

      it("should clear selection", () => {
        act(() => {
          useIntegrationStore.getState().selectIntegration("slack");
          useIntegrationStore.getState().selectIntegration(null);
        });

        expect(useIntegrationStore.getState().selectedIntegrationId).toBeNull();
      });
    });
  });

  // ==========================================================================
  // Utility Methods Tests
  // ==========================================================================

  describe("Utility Methods", () => {
    beforeEach(() => {
      act(() => {
        useIntegrationStore.getState().setIntegrations([
          createMockIntegration({
            id: "slack",
            category: "communication",
            status: "connected",
          }),
          createMockIntegration({
            id: "github",
            category: "devtools",
            status: "connected",
          }),
          createMockIntegration({
            id: "jira",
            category: "productivity",
            status: "disconnected",
          }),
        ]);
      });
    });

    describe("getIntegration", () => {
      it("should get integration by ID", () => {
        const integration = useIntegrationStore
          .getState()
          .getIntegration("slack");
        expect(integration?.id).toBe("slack");
      });

      it("should return undefined for non-existent ID", () => {
        const integration = useIntegrationStore
          .getState()
          .getIntegration("non-existent");
        expect(integration).toBeUndefined();
      });
    });

    describe("getIntegrationsByCategory", () => {
      it("should get integrations by category", () => {
        const integrations = useIntegrationStore
          .getState()
          .getIntegrationsByCategory("devtools");

        expect(integrations).toHaveLength(1);
        expect(integrations[0].id).toBe("github");
      });
    });

    describe("getIntegrationsByStatus", () => {
      it("should get integrations by status", () => {
        const connected = useIntegrationStore
          .getState()
          .getIntegrationsByStatus("connected");

        expect(connected).toHaveLength(2);
      });
    });

    describe("getConnectedIntegrations", () => {
      it("should get connected integrations", () => {
        const connected = useIntegrationStore
          .getState()
          .getConnectedIntegrations();

        expect(connected).toHaveLength(2);
      });
    });
  });

  // ==========================================================================
  // Selector Tests
  // ==========================================================================

  describe("Selectors", () => {
    beforeEach(() => {
      act(() => {
        useIntegrationStore
          .getState()
          .setIntegrations([
            createMockIntegration({ id: "slack", status: "connected" }),
            createMockIntegration({ id: "github", status: "disconnected" }),
          ]);
        useIntegrationStore
          .getState()
          .setSettings("slack", createMockSettings("slack"));
        useIntegrationStore.getState().startSync("slack");
        useIntegrationStore.getState().selectIntegration("slack");
      });
    });

    it("selectIntegrations should return all integrations", () => {
      const state = useIntegrationStore.getState();
      const integrations = selectIntegrations(state);
      expect(integrations).toHaveLength(2);
    });

    it("selectConnectedIntegrations should return connected only", () => {
      const state = useIntegrationStore.getState();
      const connected = selectConnectedIntegrations(state);
      expect(connected).toHaveLength(1);
      expect(connected[0].id).toBe("slack");
    });

    it("selectIntegrationById should return specific integration", () => {
      const state = useIntegrationStore.getState();
      const integration = selectIntegrationById("slack")(state);
      expect(integration?.id).toBe("slack");
    });

    it("selectSyncStatus should return sync status", () => {
      const state = useIntegrationStore.getState();
      const status = selectSyncStatus("slack")(state);
      expect(status?.status).toBe("syncing");
    });

    it("selectSettings should return settings", () => {
      const state = useIntegrationStore.getState();
      const settings = selectSettings("slack")(state);
      expect(settings?.integrationId).toBe("slack");
    });

    it("selectIsConnecting should return connecting ID", () => {
      act(() => {
        useIntegrationStore.getState().setConnecting("github");
      });
      const state = useIntegrationStore.getState();
      expect(selectIsConnecting(state)).toBe("github");
    });

    it("selectSelectedIntegration should return selected integration", () => {
      const state = useIntegrationStore.getState();
      const selected = selectSelectedIntegration(state);
      expect(selected?.id).toBe("slack");
    });

    it("selectIsSyncing should return sync state", () => {
      const state = useIntegrationStore.getState();
      expect(selectIsSyncing("slack")(state)).toBe(true);
      expect(selectIsSyncing("github")(state)).toBe(false);
    });
  });

  // ==========================================================================
  // Reset Test
  // ==========================================================================

  describe("Reset", () => {
    it("should reset store to initial state", () => {
      act(() => {
        useIntegrationStore
          .getState()
          .setIntegration(createMockIntegration({ id: "slack" }));
        useIntegrationStore.getState().setLoading(true);
        useIntegrationStore.getState().setGlobalError("Error");
        useIntegrationStore.getState().reset();
      });

      const state = useIntegrationStore.getState();
      expect(Object.keys(state.integrations)).toHaveLength(0);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });
});
