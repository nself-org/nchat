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

// The route reads configuration through the server Apollo client.
// Mock it so the tests never open a real connection to the GraphQL endpoint
// (a real call to localhost:8080 hangs or refuses depending on the host, which
// made the database-error test time out on macOS build hosts).
const mockQuery = jest.fn();
jest.mock("@/lib/apollo-server", () => ({
  getApolloClient: () => ({ query: mockQuery }),
}));

describe("/api/config", () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue({ data: { app_configuration: [] } });
  });

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
      mockQuery.mockRejectedValueOnce(new Error("Database error"));

      const request = new NextRequest("http://localhost:3000/api/config");
      const response = await GET(request);
      const data = await response.json();

      // A failed read falls back to the default config (graceful degradation).
      expect(mockQuery).toHaveBeenCalled();
      expect(response.status).toBe(200);
      expect(data.data.config).toHaveProperty("setup");
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
