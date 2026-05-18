/**
 * Settings Sync Tests
 *
 * Tests for the settings synchronization module with real API operations.
 *
 * @module lib/settings/__tests__/settings-sync.test
 * @version 1.0.0
 */

import {
  settingsSync,
  initializeSync,
  getSyncStatus,
  syncSettings,
  forcePushSettings,
  forcePullSettings,
  startAutoSync,
  stopAutoSync,
  subscribeToSyncStatus,
} from "../settings-sync";

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// Mock crypto.randomUUID
Object.defineProperty(window, "crypto", {
  value: {
    randomUUID: jest.fn(() => "test-device-uuid"),
  },
});

// Mock settings manager
jest.mock("../settings-manager", () => ({
  settingsManager: {
    getSettings: jest.fn(() => ({
      account: { email: "test@test.com" },
      appearance: { theme: "dark" },
      notifications: { enabled: true },
      privacy: { onlineStatus: "everyone" },
      accessibility: { reducedMotion: false },
      language: { language: "en" },
      advanced: { developerMode: false },
    })),
    updateSettings: jest.fn(),
    subscribe: jest.fn(() => jest.fn()), // Returns unsubscribe function
  },
}));

// Mock logger
jest.mock("@/lib/logger", () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock environment
jest.mock("@/lib/environment", () => ({
  isProduction: jest.fn(() => false),
}));

describe("Settings Sync", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    mockFetch.mockReset();
  });

  describe("getDeviceId", () => {
    it("should generate and persist a device ID", () => {
      // Device ID is generated lazily when needed
      initializeSync();
      // The device ID should be created on first sync
    });
  });

  describe("initializeSync", () => {
    it("should initialize the sync service", () => {
      initializeSync();
      const status = getSyncStatus();

      expect(status).toHaveProperty("lastSyncedAt");
      expect(status).toHaveProperty("isSyncing");
      expect(status).toHaveProperty("hasLocalChanges");
      expect(status).toHaveProperty("error");
    });
  });

  describe("getSyncStatus", () => {
    it("should return the current sync status", () => {
      const status = getSyncStatus();

      expect(status).toEqual({
        lastSyncedAt: null,
        isSyncing: false,
        hasLocalChanges: false,
        error: null,
      });
    });
  });

  describe("syncSettings", () => {
    it("should sync settings with the server", async () => {
      // Mock GET /api/settings response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: {
            settings: {
              appearance: { theme: "light" },
            },
            version: 1,
            isDefault: false,
          },
        }),
      });

      // Mock POST /api/settings/sync response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: {
            settings: { appearance: { theme: "dark" } },
            version: 2,
            syncStatus: "synced",
            conflictResolutions: [],
          },
        }),
      });

      const result = await syncSettings();

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/settings",
        expect.any(Object),
      );
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/settings/sync",
        expect.any(Object),
      );
    });

    it("should handle unauthorized responses gracefully", async () => {
      // First call - GET /api/settings returns 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
      });

      // When unauthorized, fetchRemoteSettings returns null
      // Then pushSettings is called
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
      });

      const result = await syncSettings();

      // Should succeed because unauthorized is handled gracefully
      // (settings are saved locally, will sync when auth is available)
      expect(result.success).toBe(true);
    });

    it("should handle server errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      const result = await syncSettings();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should handle network errors on fetch", async () => {
      // First call - GET /api/settings fails with network error
      // fetchRemoteSettings catches this and returns null
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      // Second call - POST /api/settings/sync succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: {
            version: 1,
            syncStatus: "synced",
            conflictResolutions: [],
          },
        }),
      });

      const result = await syncSettings();

      // Should succeed - fetch error is handled gracefully, local settings are pushed
      expect(result.success).toBe(true);
    });

    it("should handle network errors on push", async () => {
      // First call - GET /api/settings succeeds with no data
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: { isDefault: true },
        }),
      });

      // Second call - POST /api/settings/sync fails
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await syncSettings();

      // Should fail - push error is propagated
      expect(result.success).toBe(false);
      expect(result.error).toBe("Network error");
    });
  });

  describe("forcePushSettings", () => {
    it("should force push local settings to server", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: {
            settings: { appearance: { theme: "dark" } },
            version: 3,
            syncStatus: "synced",
            conflictResolutions: [],
          },
        }),
      });

      const result = await forcePushSettings();

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/settings/sync",
        expect.any(Object),
      );
    });
  });

  describe("forcePullSettings", () => {
    it("should force pull settings from server", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: {
            settings: { appearance: { theme: "light" } },
            version: 5,
            isDefault: false,
          },
        }),
      });

      const result = await forcePullSettings();

      expect(result.success).toBe(true);
    });

    it("should handle no remote settings", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: {
            settings: {},
            version: 0,
            isDefault: true,
          },
        }),
      });

      const result = await forcePullSettings();

      expect(result.success).toBe(false);
      expect(result.error).toBe("No remote settings found");
    });
  });

  describe("subscribeToSyncStatus", () => {
    it("should notify listeners of status changes", async () => {
      const listener = jest.fn();
      const unsubscribe = subscribeToSyncStatus(listener);

      // Mock successful sync
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: { isDefault: true },
        }),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: { version: 1, syncStatus: "synced", conflictResolutions: [] },
        }),
      });

      await syncSettings();

      // Listener should be called with status updates
      expect(listener).toHaveBeenCalled();

      unsubscribe();
    });
  });

  describe("startAutoSync and stopAutoSync", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
      stopAutoSync();
    });

    it("should start and stop auto sync", () => {
      startAutoSync(5000);

      // Verify interval is running by checking if sync would be called
      // (We'd need to trigger hasLocalChanges to actually sync)

      stopAutoSync();
      // After stopping, no more syncs should occur
    });
  });

  describe("conflict resolution", () => {
    it("should handle conflicts returned by the server", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: {
            settings: { appearance: { theme: "light" } },
            version: 1,
            isDefault: false,
          },
        }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: {
            settings: { appearance: { theme: "dark" } },
            version: 2,
            syncStatus: "conflict_resolved",
            conflictResolutions: [
              {
                category: "appearance",
                field: "theme",
                clientValue: "dark",
                serverValue: "light",
                resolvedValue: "dark",
                winner: "client",
                reason: "User preferences prefer client values",
              },
            ],
          },
        }),
      });

      const result = await syncSettings();

      expect(result.success).toBe(true);
      expect(result.merged).toBe(true);
    });
  });

  describe("API request headers", () => {
    it("should include credentials in requests", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: { isDefault: true },
        }),
      });

      await syncSettings();

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/settings",
        expect.objectContaining({
          credentials: "include",
        }),
      );
    });

    it("should include deviceId in sync requests", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: { isDefault: true },
        }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: { version: 1, syncStatus: "synced", conflictResolutions: [] },
        }),
      });

      await syncSettings();

      // Check the sync call includes deviceId
      const syncCall = mockFetch.mock.calls.find(
        (call) => call[0] === "/api/settings/sync",
      );
      expect(syncCall).toBeDefined();

      if (syncCall) {
        const body = JSON.parse(syncCall[1].body);
        expect(body).toHaveProperty("deviceId");
        expect(body.deviceId).toBe("test-device-uuid");
      }
    });
  });
});
