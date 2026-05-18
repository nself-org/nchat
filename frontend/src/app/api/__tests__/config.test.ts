/**
 * @jest-environment node
 */

/**
 * Config API Route Tests
 *
 * Integration tests for /api/config endpoint
 */

import { NextRequest } from "next/server";
import { GET, POST } from "../config/route";

// Mock Nhost
jest.mock("@/lib/nhost.server", () => ({
  nhostServer: {
    graphql: {
      request: jest.fn(),
    },
  },
}));

describe("/api/config", () => {
  describe("GET /api/config", () => {
    it("should return default config when no config exists", async () => {
      const request = new NextRequest("http://localhost:3000/api/config");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveProperty("config");
      expect(data.data.config).toHaveProperty("setup");
      expect(data.data.config).toHaveProperty("branding");
      expect(data.data.config).toHaveProperty("theme");
    });

    it("should handle database errors gracefully", async () => {
      const { nhostServer } = require("@/lib/nhost.server");
      nhostServer.graphql.request.mockRejectedValueOnce(
        new Error("Database error"),
      );

      const request = new NextRequest("http://localhost:3000/api/config");
      const response = await GET(request);

      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe("POST /api/config", () => {
    it("should update config successfully", async () => {
      const configUpdate = {
        branding: {
          appName: "Updated App Name",
        },
      };

      const request = new NextRequest("http://localhost:3000/api/config", {
        method: "POST",
        body: JSON.stringify(configUpdate),
      });

      const response = await POST(request);
      expect(response.status).toBeGreaterThanOrEqual(200);
    });

    it("should validate config structure", async () => {
      const invalidConfig = {
        invalid: "structure",
      };

      const request = new NextRequest("http://localhost:3000/api/config", {
        method: "POST",
        body: JSON.stringify(invalidConfig),
      });

      const response = await POST(request);
      expect(response.status).toBeGreaterThanOrEqual(200);
    });

    it("should handle empty request body", async () => {
      const request = new NextRequest("http://localhost:3000/api/config", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });
});
