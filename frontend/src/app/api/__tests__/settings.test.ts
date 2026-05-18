/**
 * @jest-environment node
 */

/**
 * Settings API Route Tests
 *
 * Integration tests for /api/settings and /api/settings/sync endpoints
 */

import { NextRequest } from "next/server";
import { GET, POST, PATCH } from "../settings/route";
import { POST as SyncPOST } from "../settings/sync/route";

// Mock Apollo Client
const mockQuery = jest.fn();
const mockMutate = jest.fn();

jest.mock("@/lib/apollo-client", () => ({
  apolloClient: {
    query: (...args: unknown[]) => mockQuery(...args),
    mutate: (...args: unknown[]) => mockMutate(...args),
  },
}));

// Mock middleware
jest.mock("@/lib/api/middleware", () => ({
  withAuth: (handler: Function) => handler,
  withRateLimit: () => (handler: Function) => handler,
  withErrorHandler: (handler: Function) => handler,
  compose:
    (..._middlewares: Function[]) =>
    (handler: Function) =>
    (request: NextRequest) => {
      // Add mock user to request
      const authenticatedRequest = Object.assign(request, {
        user: { id: "test-user-id", email: "test@example.com" },
      });
      return handler(authenticatedRequest);
    },
}));

// Mock logger
jest.mock("@/lib/logger", () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Sample user settings
const sampleSettings = {
  theme: {
    mode: "dark" as const,
    preset: "default",
    accentColor: "#6366f1",
  },
  notifications: {
    sound: true,
    soundVolume: 0.5,
    desktop: true,
    desktopPreview: true,
    email: true,
    emailDigest: "daily" as const,
    mentions: true,
    directMessages: true,
    channelMessages: false,
    threads: true,
    reactions: false,
    quietHoursEnabled: false,
    quietHoursStart: "22:00",
    quietHoursEnd: "08:00",
    quietHoursTimezone: "UTC",
  },
  privacy: {
    onlineStatusVisible: true,
    lastSeenVisible: true,
    readReceipts: true,
    typingIndicators: true,
    profileVisible: "everyone" as const,
    activityStatus: true,
  },
  accessibility: {
    fontSize: "medium" as const,
    reducedMotion: false,
    highContrast: false,
    screenReaderOptimized: false,
    keyboardNavigation: true,
    focusIndicators: true,
    colorBlindMode: "none" as const,
  },
  locale: {
    language: "en",
    timezone: "UTC",
    dateFormat: "YYYY-MM-DD" as const,
    timeFormat: "24h" as const,
    firstDayOfWeek: 1 as const,
    numberFormat: "en-US",
  },
  keyboardShortcuts: {
    enabled: true,
    customShortcuts: {},
    sendMessage: "Enter",
    newLine: "Shift+Enter",
    search: "Ctrl+K",
    quickSwitcher: "Ctrl+G",
    markAsRead: "Escape",
    toggleSidebar: "Ctrl+Shift+D",
    nextChannel: "Alt+ArrowDown",
    prevChannel: "Alt+ArrowUp",
    toggleMute: "Ctrl+Shift+M",
    uploadFile: "Ctrl+U",
  },
};

describe("/api/settings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/settings", () => {
    it("should return default settings when no settings exist", async () => {
      mockQuery.mockResolvedValueOnce({
        data: { nchat_user_settings_by_pk: null },
      });

      const request = new NextRequest("http://localhost:3000/api/settings");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.isDefault).toBe(true);
      expect(data.data.settings).toHaveProperty("theme");
      expect(data.data.settings).toHaveProperty("notifications");
      expect(data.data.settings).toHaveProperty("privacy");
    });

    it("should return existing settings when they exist", async () => {
      mockQuery.mockResolvedValueOnce({
        data: {
          nchat_user_settings_by_pk: {
            user_id: "test-user-id",
            settings: sampleSettings,
            version: 3,
            updated_at: "2026-02-06T12:00:00Z",
            created_at: "2026-02-01T12:00:00Z",
          },
        },
      });

      const request = new NextRequest("http://localhost:3000/api/settings");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.isDefault).toBe(false);
      expect(data.data.version).toBe(3);
      expect(data.data.settings.theme.mode).toBe("dark");
    });

    it("should handle database errors gracefully", async () => {
      mockQuery.mockRejectedValueOnce(new Error("Database error"));

      const request = new NextRequest("http://localhost:3000/api/settings");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.errorCode).toBe("SETTINGS_FETCH_ERROR");
    });
  });

  describe("POST /api/settings", () => {
    it("should create new settings successfully", async () => {
      // First query returns null (no existing settings)
      mockQuery.mockResolvedValueOnce({
        data: { nchat_user_settings_by_pk: null },
      });

      // Upsert mutation succeeds
      mockMutate
        .mockResolvedValueOnce({
          data: {
            insert_nchat_user_settings_one: {
              user_id: "test-user-id",
              settings: sampleSettings,
              version: 1,
              updated_at: "2026-02-06T12:00:00Z",
              created_at: "2026-02-06T12:00:00Z",
            },
          },
        })
        // Audit log
        .mockResolvedValueOnce({
          data: { insert_nchat_audit_logs_one: { id: "audit-1" } },
        });

      const request = new NextRequest("http://localhost:3000/api/settings", {
        method: "POST",
        body: JSON.stringify(sampleSettings),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.version).toBe(1);
    });

    it("should update existing settings", async () => {
      // First query returns existing settings
      mockQuery.mockResolvedValueOnce({
        data: {
          nchat_user_settings_by_pk: {
            user_id: "test-user-id",
            settings: sampleSettings,
            version: 2,
            updated_at: "2026-02-05T12:00:00Z",
          },
        },
      });

      // Upsert mutation succeeds
      mockMutate
        .mockResolvedValueOnce({
          data: {
            insert_nchat_user_settings_one: {
              user_id: "test-user-id",
              settings: {
                ...sampleSettings,
                theme: { ...sampleSettings.theme, mode: "light" },
              },
              version: 3,
              updated_at: "2026-02-06T12:00:00Z",
            },
          },
        })
        // Audit log
        .mockResolvedValueOnce({
          data: { insert_nchat_audit_logs_one: { id: "audit-1" } },
        });

      const updatedSettings = {
        ...sampleSettings,
        theme: { ...sampleSettings.theme, mode: "light" as const },
      };

      const request = new NextRequest("http://localhost:3000/api/settings", {
        method: "POST",
        body: JSON.stringify(updatedSettings),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.version).toBe(3);
    });

    it("should reject invalid settings structure", async () => {
      const invalidSettings = {
        theme: {
          mode: "invalid-mode", // Invalid mode
        },
      };

      const request = new NextRequest("http://localhost:3000/api/settings", {
        method: "POST",
        body: JSON.stringify(invalidSettings),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
    });

    it("should reject invalid JSON body", async () => {
      const request = new NextRequest("http://localhost:3000/api/settings", {
        method: "POST",
        body: "not-valid-json{{{",
      });

      const response = await POST(request);
      const data = await response.json();

      // In the Node.js test env NextRequest.json() does not throw for invalid
      // JSON — it returns null/undefined which then fails Zod validation (422).
      // Either 400 (parse error) or 422 (validation error) is an acceptable rejection.
      expect([400, 422]).toContain(response.status);
      expect(data.success).toBe(false);
    });
  });

  describe("PATCH /api/settings", () => {
    it("should merge partial settings updates", async () => {
      // First query returns existing settings
      mockQuery.mockResolvedValueOnce({
        data: {
          nchat_user_settings_by_pk: {
            user_id: "test-user-id",
            settings: sampleSettings,
            version: 2,
            updated_at: "2026-02-05T12:00:00Z",
          },
        },
      });

      // Update mutation succeeds
      mockMutate
        .mockResolvedValueOnce({
          data: {
            update_nchat_user_settings_by_pk: {
              user_id: "test-user-id",
              settings: {
                ...sampleSettings,
                theme: { ...sampleSettings.theme, mode: "light" },
              },
              version: 3,
              updated_at: "2026-02-06T12:00:00Z",
            },
          },
        })
        // Audit log
        .mockResolvedValueOnce({
          data: { insert_nchat_audit_logs_one: { id: "audit-1" } },
        });

      const partialUpdate = {
        theme: { mode: "light" as const },
      };

      const request = new NextRequest("http://localhost:3000/api/settings", {
        method: "PATCH",
        body: JSON.stringify(partialUpdate),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should reject empty patch request", async () => {
      const request = new NextRequest("http://localhost:3000/api/settings", {
        method: "PATCH",
        body: JSON.stringify({}),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it("should create settings if none exist", async () => {
      // First query returns null (no existing settings)
      mockQuery.mockResolvedValueOnce({
        data: { nchat_user_settings_by_pk: null },
      });

      // Update returns null (record doesn't exist)
      mockMutate
        .mockResolvedValueOnce({
          data: { update_nchat_user_settings_by_pk: null },
        })
        // Then upsert succeeds
        .mockResolvedValueOnce({
          data: {
            insert_nchat_user_settings_one: {
              user_id: "test-user-id",
              settings: sampleSettings,
              version: 1,
              updated_at: "2026-02-06T12:00:00Z",
            },
          },
        })
        // Audit log
        .mockResolvedValueOnce({
          data: { insert_nchat_audit_logs_one: { id: "audit-1" } },
        });

      const partialUpdate = {
        theme: { mode: "dark" as const },
      };

      const request = new NextRequest("http://localhost:3000/api/settings", {
        method: "PATCH",
        body: JSON.stringify(partialUpdate),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});

describe("/api/settings/sync", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should sync settings and create new record if none exists", async () => {
    // Query returns null (no server settings)
    mockQuery.mockResolvedValueOnce({
      data: { nchat_user_settings_by_pk: null },
    });

    // Upsert succeeds
    mockMutate
      .mockResolvedValueOnce({
        data: {
          insert_nchat_user_settings_one: {
            user_id: "test-user-id",
            settings: sampleSettings,
            version: 1,
            updated_at: "2026-02-06T12:00:00Z",
          },
        },
      })
      // Audit log
      .mockResolvedValueOnce({
        data: { insert_nchat_audit_logs_one: { id: "audit-1" } },
      });

    const syncRequest = {
      clientVersion: 0,
      settings: sampleSettings,
      deviceId: "device-123",
    };

    const request = new NextRequest("http://localhost:3000/api/settings/sync", {
      method: "POST",
      body: JSON.stringify(syncRequest),
    });

    const response = await SyncPOST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.syncStatus).toBe("synced");
    expect(data.data.conflictResolutions).toEqual([]);
  });

  it("should detect conflicts when client and server have different settings", async () => {
    const serverSettings = {
      ...sampleSettings,
      theme: { ...sampleSettings.theme, mode: "light" as const },
      privacy: { ...sampleSettings.privacy, onlineStatusVisible: false },
    };

    // Query returns server settings
    mockQuery.mockResolvedValueOnce({
      data: {
        nchat_user_settings_by_pk: {
          user_id: "test-user-id",
          settings: serverSettings,
          version: 5,
          updated_at: "2026-02-05T12:00:00Z",
        },
      },
    });

    // Upsert succeeds
    mockMutate
      .mockResolvedValueOnce({
        data: {
          insert_nchat_user_settings_one: {
            user_id: "test-user-id",
            settings: sampleSettings, // merged
            version: 6,
            updated_at: "2026-02-06T12:00:00Z",
          },
        },
      })
      // Audit log
      .mockResolvedValueOnce({
        data: { insert_nchat_audit_logs_one: { id: "audit-1" } },
      });

    const syncRequest = {
      clientVersion: 3,
      settings: sampleSettings,
      deviceId: "device-123",
    };

    const request = new NextRequest("http://localhost:3000/api/settings/sync", {
      method: "POST",
      body: JSON.stringify(syncRequest),
    });

    const response = await SyncPOST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.syncStatus).toBe("conflict_resolved");
    expect(data.data.conflictResolutions.length).toBeGreaterThan(0);
  });

  it("should reject invalid sync request", async () => {
    const invalidSyncRequest = {
      clientVersion: "not-a-number",
      settings: sampleSettings,
      deviceId: "device-123",
    };

    const request = new NextRequest("http://localhost:3000/api/settings/sync", {
      method: "POST",
      body: JSON.stringify(invalidSyncRequest),
    });

    const response = await SyncPOST(request);
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.success).toBe(false);
  });

  it("should require deviceId", async () => {
    const invalidSyncRequest = {
      clientVersion: 0,
      settings: sampleSettings,
      // missing deviceId
    };

    const request = new NextRequest("http://localhost:3000/api/settings/sync", {
      method: "POST",
      body: JSON.stringify(invalidSyncRequest),
    });

    const response = await SyncPOST(request);
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.success).toBe(false);
  });
});
