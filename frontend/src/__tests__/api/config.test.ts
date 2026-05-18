/**
 * @jest-environment node
 */

/**
 * App Configuration API Tests
 *
 * Tests for /api/config endpoints (GET, POST)
 * Note: POST requires CSRF and admin auth in production.
 * These tests verify basic endpoint functionality.
 */

import { GET, POST } from "@/app/api/config/route";
import { NextRequest } from "next/server";

// Mock Apollo client to avoid database calls
jest.mock("@/lib/apollo-server", () => ({
  getApolloClient: jest.fn(() => ({
    query: jest.fn().mockResolvedValue({ data: { app_configuration: [] } }),
    mutate: jest.fn().mockResolvedValue({ data: {} }),
  })),
}));

describe("/api/config", () => {
  describe("GET", () => {
    it("should return app configuration", async () => {
      const request = new NextRequest("http://localhost:3000/api/config");
      const response = await GET(request);

      expect(response.status).toBe(200);

      const data = await response.json();
      // Response structure: { success: true, data: { config, version } }
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty("config");
      expect(data.data.config).toHaveProperty("setup");
      expect(data.data.config).toHaveProperty("branding");
      expect(data.data.config).toHaveProperty("theme");
    });

    it("should return configuration with default values", async () => {
      const request = new NextRequest("http://localhost:3000/api/config");
      const response = await GET(request);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.config.setup).toBeDefined();
      expect(data.data.config.setup.isCompleted).toBeDefined();
      expect(data.data.config.branding.appName).toBeDefined();
    });
  });

  describe("POST", () => {
    // POST requires CSRF protection and admin auth
    // These tests verify the middleware responds appropriately

    it("should require authentication for updates", async () => {
      const updates = {
        branding: {
          appName: "Test App",
        },
      };

      const request = new NextRequest("http://localhost:3000/api/config", {
        method: "POST",
        body: JSON.stringify(updates),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request);

      // Should get auth/CSRF error (401/403) without proper credentials
      expect([401, 403]).toContain(response.status);
    });

    it("should reject requests without CSRF token", async () => {
      const request = new NextRequest("http://localhost:3000/api/config", {
        method: "POST",
        body: JSON.stringify({ branding: { appName: "Test" } }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request);

      // CSRF or auth error expected
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should handle missing body gracefully", async () => {
      const request = new NextRequest("http://localhost:3000/api/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request);

      // Should get error response (400, 401, or 403)
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should reject invalid content types", async () => {
      const request = new NextRequest("http://localhost:3000/api/config", {
        method: "POST",
        body: "not json",
        headers: {
          "Content-Type": "text/plain",
        },
      });

      const response = await POST(request);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });
});
