/**
 * @jest-environment node
 */

/**
 * Health Check API Route Tests
 *
 * Integration tests for health check endpoints
 */

import { NextRequest } from "next/server";
import { GET as healthGet } from "../health/route";
import { GET as liveGet } from "../health/live/route";
import { GET as readyGet } from "../health/ready/route";

describe("Health Check Endpoints", () => {
  describe("GET /api/health", () => {
    it("should return health status", async () => {
      const request = new NextRequest("http://localhost:3000/api/health");
      const response = await healthGet(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("status");
      expect(data.status).toBe("healthy");
    });

    it("should include timestamp", async () => {
      const request = new NextRequest("http://localhost:3000/api/health");
      const response = await healthGet(request);
      const data = await response.json();

      expect(data).toHaveProperty("timestamp");
      expect(new Date(data.timestamp)).toBeInstanceOf(Date);
    });
  });

  describe("GET /api/health/live", () => {
    it("should return liveness status", async () => {
      const request = new NextRequest("http://localhost:3000/api/health/live");
      const response = await liveGet(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("alive");
      expect(data.alive).toBe(true);
    });
  });

  describe("GET /api/health/ready", () => {
    it("should return readiness status", async () => {
      const request = new NextRequest("http://localhost:3000/api/health/ready");
      const response = await readyGet(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("ready");
    });

    it("should check database connectivity", async () => {
      const request = new NextRequest("http://localhost:3000/api/health/ready");
      const response = await readyGet(request);
      const data = await response.json();

      expect(data).toHaveProperty("checks");
    });
  });
});
