/**
 * Wipe API Route Tests
 *
 * Tests for the wipe API endpoints.
 */

// Must be before imports
jest.mock("next/server", () => ({
  NextRequest: class MockNextRequest {
    url: string;
    method: string;
    _body: unknown;
    headers: Map<string, string>;

    constructor(url: string, init?: RequestInit) {
      this.url = url;
      this.method = init?.method || "GET";
      this._body = init?.body ? JSON.parse(init.body as string) : null;
      this.headers = new Map(Object.entries(init?.headers || {}));
    }

    async json() {
      return this._body;
    }
  },
  NextResponse: {
    json: (data: unknown, init?: ResponseInit) => ({
      status: init?.status || 200,
      json: async () => data,
    }),
  },
}));

import { POST, GET, DELETE } from "../wipe/route";
import { resetWipeService } from "@/services/security/wipe.service";
import { resetSessionWipeManager } from "@/lib/security/session-wipe";
import { resetPanicModeManager } from "@/lib/security/panic-mode";

// Mock secure storage
jest.mock("@/lib/secure-storage", () => {
  const store = new Map<string, string>();

  return {
    getSecureStorage: () => ({
      os: "web",
      initialize: jest.fn().mockResolvedValue(undefined),
      isInitialized: () => true,
      getCapabilities: jest.fn().mockResolvedValue({
        hardwareStorage: false,
        biometricAuth: false,
        biometricTypes: [],
        secureEnclave: false,
        syncSupported: false,
        maxItemSize: 5 * 1024 * 1024,
        accessGroupsSupported: false,
        os: "web",
        securityLevel: "encrypted",
      }),
      setItem: jest.fn().mockImplementation((key: string, value: string) => {
        store.set(key, value);
        return Promise.resolve({ success: true, data: null, error: null });
      }),
      getItem: jest.fn().mockImplementation((key: string) => {
        const value = store.get(key);
        return Promise.resolve({
          success: !!value,
          data: value || null,
          error: value ? null : "Not found",
        });
      }),
      hasItem: jest.fn().mockImplementation((key: string) => {
        return Promise.resolve(store.has(key));
      }),
      removeItem: jest.fn().mockImplementation((key: string) => {
        store.delete(key);
        return Promise.resolve({ success: true, data: null, error: null });
      }),
      getAllKeys: jest.fn().mockImplementation(() => {
        return Promise.resolve(Array.from(store.keys()));
      }),
      clear: jest.fn().mockImplementation(() => {
        store.clear();
        return Promise.resolve({ success: true, data: null, error: null });
      }),
      getItemMeta: jest.fn().mockResolvedValue(null),
      isBiometricAvailable: jest.fn().mockResolvedValue(false),
      authenticateBiometric: jest.fn().mockResolvedValue({
        success: false,
        data: null,
        error: "Not available",
      }),
    }),
  };
});

// ============================================================================
// Test Helpers
// ============================================================================

function createRequest(method: string, body?: object, url?: string) {
  const requestUrl = url || "http://localhost:3000/api/security/wipe";
  const init: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
  };

  if (body) {
    init.body = JSON.stringify(body);
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { NextRequest } = require("next/server");
  return new NextRequest(requestUrl, init);
}

// ============================================================================
// Tests
// ============================================================================

describe("Wipe API Routes", () => {
  beforeEach(() => {
    resetWipeService();
    resetSessionWipeManager();
    resetPanicModeManager();
  });

  // --------------------------------------------------------------------------
  // POST Tests
  // --------------------------------------------------------------------------

  describe("POST /api/security/wipe", () => {
    it("should require wipe type", async () => {
      const request = createRequest("POST", { reason: "Test" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("type");
    });

    it("should require reason", async () => {
      const request = createRequest("POST", { type: "session" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Reason");
    });

    it("should require session ID for session wipe", async () => {
      const request = createRequest("POST", {
        type: "session",
        reason: "Test",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Session ID");
    });

    it("should kill session successfully", async () => {
      const request = createRequest("POST", {
        type: "session",
        sessionId: "session_123",
        reason: "User logout",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.type).toBe("session_kill");
    });

    it("should require device ID for device wipe", async () => {
      const request = createRequest("POST", {
        type: "device",
        reason: "Test",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Device ID");
    });

    it("should wipe device successfully", async () => {
      const request = createRequest("POST", {
        type: "device",
        deviceId: "device_123",
        reason: "Device lost",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.type).toBe("device_wipe");
    });

    it("should require token for remote wipe", async () => {
      const request = createRequest("POST", {
        type: "remote",
        deviceId: "device_123",
        reason: "Test",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Token");
    });

    it("should reject invalid wipe type", async () => {
      const request = createRequest("POST", {
        type: "invalid",
        reason: "Test",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid wipe type");
    });
  });

  // --------------------------------------------------------------------------
  // GET Tests
  // --------------------------------------------------------------------------

  describe("GET /api/security/wipe", () => {
    it("should return wipe status", async () => {
      const request = createRequest(
        "GET",
        undefined,
        "http://localhost:3000/api/security/wipe",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.state).toBeDefined();
      expect(data.pendingWipes).toBeDefined();
    });

    it("should verify specific wipe", async () => {
      // First create a wipe
      const createRequest1 = createRequest("POST", {
        type: "session",
        sessionId: "session_verify",
        reason: "Test",
      });
      const createResponse = await POST(createRequest1);
      const createData = await createResponse.json();

      // Then verify it
      const verifyRequest = createRequest(
        "GET",
        undefined,
        `http://localhost:3000/api/security/wipe?wipeId=${createData.wipeId}`,
      );
      const response = await GET(verifyRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.wipeId).toBe(createData.wipeId);
      expect(data.verification).toBeDefined();
    });
  });

  // --------------------------------------------------------------------------
  // DELETE Tests
  // --------------------------------------------------------------------------

  describe("DELETE /api/security/wipe", () => {
    it("should require wipe ID", async () => {
      const request = createRequest("DELETE", {});
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Wipe ID");
    });

    it("should return 404 for non-existent wipe", async () => {
      const request = createRequest("DELETE", { wipeId: "non_existent" });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain("not found");
    });
  });
});
