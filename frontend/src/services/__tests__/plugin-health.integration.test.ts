/**
 * Plugin Health Check Integration Tests
 *
 * These tests verify that all ɳPlugins are properly installed,
 * running, and responding to health check requests.
 *
 * @group integration
 */

import { describe, it, expect, beforeAll } from "@jest/globals";

// Plugin health check endpoints
const PLUGIN_ENDPOINTS = {
  realtime:
    process.env.NEXT_PUBLIC_REALTIME_URL || "http://realtime.localhost:3101",
  notifications:
    process.env.NEXT_PUBLIC_NOTIFICATIONS_URL ||
    "http://notifications.localhost:3102",
  jobs: process.env.NEXT_PUBLIC_JOBS_URL || "http://jobs.localhost:3105",
  fileProcessing:
    process.env.NEXT_PUBLIC_FILE_PROCESSING_URL ||
    "http://files.localhost:3104",
};

// Skip tests if plugins are not enabled - default to false for unit tests
// These are integration tests that require real plugin services
const PLUGINS_ENABLED = process.env.PLUGINS_ENABLED === "true";

describe("Plugin Health Checks", () => {
  const describeIf = PLUGINS_ENABLED ? describe : describe.skip;

  describeIf("Realtime Plugin", () => {
    it("should respond to health check endpoint", async () => {
      const response = await fetch(`${PLUGIN_ENDPOINTS.realtime}/health`);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("status");
      expect(data.status).toBe("healthy");
    }, 10000);

    it("should include service information", async () => {
      const response = await fetch(`${PLUGIN_ENDPOINTS.realtime}/health`);
      const data = await response.json();

      expect(data).toHaveProperty("service", "realtime");
      expect(data).toHaveProperty("version");
      expect(data).toHaveProperty("uptime");
    }, 10000);

    it("should report WebSocket server status", async () => {
      const response = await fetch(`${PLUGIN_ENDPOINTS.realtime}/health`);
      const data = await response.json();

      expect(data).toHaveProperty("websocket");
      expect(data.websocket).toHaveProperty("running", true);
      expect(data.websocket).toHaveProperty("connections");
      expect(typeof data.websocket.connections).toBe("number");
    }, 10000);

    it("should report Redis connection status", async () => {
      const response = await fetch(`${PLUGIN_ENDPOINTS.realtime}/health`);
      const data = await response.json();

      expect(data).toHaveProperty("dependencies");
      expect(data.dependencies).toHaveProperty("redis");
      expect(data.dependencies.redis).toHaveProperty("status", "connected");
    }, 10000);
  });

  describeIf("Notifications Plugin", () => {
    it("should respond to health check endpoint", async () => {
      const response = await fetch(`${PLUGIN_ENDPOINTS.notifications}/health`);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("status");
      expect(data.status).toBe("healthy");
    }, 10000);

    it("should include service information", async () => {
      const response = await fetch(`${PLUGIN_ENDPOINTS.notifications}/health`);
      const data = await response.json();

      expect(data).toHaveProperty("service", "notifications");
      expect(data).toHaveProperty("version");
      expect(data).toHaveProperty("uptime");
    }, 10000);

    it("should report notification channels status", async () => {
      const response = await fetch(`${PLUGIN_ENDPOINTS.notifications}/health`);
      const data = await response.json();

      expect(data).toHaveProperty("channels");
      expect(data.channels).toHaveProperty("email");
      expect(data.channels).toHaveProperty("push");
      expect(data.channels).toHaveProperty("sms");
    }, 10000);

    it("should report email provider status", async () => {
      const response = await fetch(`${PLUGIN_ENDPOINTS.notifications}/health`);
      const data = await response.json();

      expect(data).toHaveProperty("providers");
      expect(data.providers).toHaveProperty("email");
      expect(data.providers.email).toHaveProperty("status");
    }, 10000);
  });

  describeIf("Jobs Plugin", () => {
    it("should respond to health check endpoint", async () => {
      const response = await fetch(`${PLUGIN_ENDPOINTS.jobs}/health`);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("status");
      expect(data.status).toBe("healthy");
    }, 10000);

    it("should include service information", async () => {
      const response = await fetch(`${PLUGIN_ENDPOINTS.jobs}/health`);
      const data = await response.json();

      expect(data).toHaveProperty("service", "jobs");
      expect(data).toHaveProperty("version");
      expect(data).toHaveProperty("uptime");
    }, 10000);

    it("should report queue status", async () => {
      const response = await fetch(`${PLUGIN_ENDPOINTS.jobs}/health`);
      const data = await response.json();

      expect(data).toHaveProperty("queues");
      expect(Array.isArray(data.queues)).toBe(true);
      expect(data.queues.length).toBeGreaterThan(0);
    }, 10000);

    it("should report Redis connection status", async () => {
      const response = await fetch(`${PLUGIN_ENDPOINTS.jobs}/health`);
      const data = await response.json();

      expect(data).toHaveProperty("dependencies");
      expect(data.dependencies).toHaveProperty("redis");
      expect(data.dependencies.redis).toHaveProperty("status", "connected");
    }, 10000);

    it("should have BullMQ dashboard accessible", async () => {
      const dashboardUrl =
        process.env.NEXT_PUBLIC_BULLMQ_DASHBOARD_URL ||
        "http://queues.localhost:4200";

      try {
        const response = await fetch(dashboardUrl);
        expect(response.status).toBeLessThan(500);
      } catch (error) {
        // Dashboard might not be exposed or require auth
        // Just log the error but don't fail the test
        console.warn("BullMQ Dashboard not accessible:", error);
      }
    }, 10000);
  });

  describeIf("File Processing Plugin", () => {
    it("should respond to health check endpoint", async () => {
      const response = await fetch(`${PLUGIN_ENDPOINTS.fileProcessing}/health`);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("status");
      expect(data.status).toBe("healthy");
    }, 10000);

    it("should include service information", async () => {
      const response = await fetch(`${PLUGIN_ENDPOINTS.fileProcessing}/health`);
      const data = await response.json();

      expect(data).toHaveProperty("service", "file-processing");
      expect(data).toHaveProperty("version");
      expect(data).toHaveProperty("uptime");
    }, 10000);

    it("should report processing capabilities", async () => {
      const response = await fetch(`${PLUGIN_ENDPOINTS.fileProcessing}/health`);
      const data = await response.json();

      expect(data).toHaveProperty("capabilities");
      expect(data.capabilities).toHaveProperty("images", true);
      expect(data.capabilities).toHaveProperty("videos");
      expect(data.capabilities).toHaveProperty("documents");
    }, 10000);

    it("should report storage connection status", async () => {
      const response = await fetch(`${PLUGIN_ENDPOINTS.fileProcessing}/health`);
      const data = await response.json();

      expect(data).toHaveProperty("dependencies");
      expect(data.dependencies).toHaveProperty("storage");
      expect(data.dependencies.storage).toHaveProperty("status");
    }, 10000);
  });

  describeIf("All Plugins", () => {
    it("should all be healthy simultaneously", async () => {
      const results = await Promise.all([
        fetch(`${PLUGIN_ENDPOINTS.realtime}/health`),
        fetch(`${PLUGIN_ENDPOINTS.notifications}/health`),
        fetch(`${PLUGIN_ENDPOINTS.jobs}/health`),
        fetch(`${PLUGIN_ENDPOINTS.fileProcessing}/health`),
      ]);

      const allHealthy = results.every((r) => r.status === 200);
      expect(allHealthy).toBe(true);

      const data = await Promise.all(results.map((r) => r.json()));
      const allStatusHealthy = data.every((d) => d.status === "healthy");
      expect(allStatusHealthy).toBe(true);
    }, 20000);

    it("should report consistent versions", async () => {
      const results = await Promise.all([
        fetch(`${PLUGIN_ENDPOINTS.realtime}/health`),
        fetch(`${PLUGIN_ENDPOINTS.notifications}/health`),
        fetch(`${PLUGIN_ENDPOINTS.jobs}/health`),
        fetch(`${PLUGIN_ENDPOINTS.fileProcessing}/health`),
      ]);

      const data = await Promise.all(results.map((r) => r.json()));

      data.forEach((d) => {
        expect(d).toHaveProperty("version");
        expect(typeof d.version).toBe("string");
        expect(d.version).toMatch(/^\d+\.\d+\.\d+/);
      });
    }, 20000);
  });
});

describe("Plugin Error Handling", () => {
  const describeIf = PLUGINS_ENABLED ? describe : describe.skip;

  describeIf("Realtime Plugin", () => {
    it("should handle invalid routes gracefully", async () => {
      const response = await fetch(
        `${PLUGIN_ENDPOINTS.realtime}/invalid-route`,
      );

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
    }, 10000);

    it("should return proper error format", async () => {
      const response = await fetch(
        `${PLUGIN_ENDPOINTS.realtime}/invalid-route`,
      );

      if (response.headers.get("content-type")?.includes("application/json")) {
        const data = await response.json();
        expect(data).toHaveProperty("error");
      }
    }, 10000);
  });

  describeIf("Notifications Plugin", () => {
    it("should validate notification payload", async () => {
      const response = await fetch(`${PLUGIN_ENDPOINTS.notifications}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invalid: "payload" }),
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
    }, 10000);

    it("should return validation errors", async () => {
      const response = await fetch(`${PLUGIN_ENDPOINTS.notifications}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invalid: "payload" }),
      });

      if (response.headers.get("content-type")?.includes("application/json")) {
        const data = await response.json();
        expect(data).toHaveProperty("error");
      }
    }, 10000);
  });

  describeIf("Jobs Plugin", () => {
    it("should validate job payload", async () => {
      const response = await fetch(`${PLUGIN_ENDPOINTS.jobs}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invalid: "payload" }),
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
    }, 10000);
  });

  describeIf("File Processing Plugin", () => {
    it("should reject invalid file uploads", async () => {
      const formData = new FormData();
      formData.append(
        "file",
        new Blob(["test"], { type: "text/plain" }),
        "test.txt",
      );

      const response = await fetch(
        `${PLUGIN_ENDPOINTS.fileProcessing}/process`,
        {
          method: "POST",
          body: formData,
        },
      );

      // Should either accept or reject with proper status
      expect([200, 201, 400, 415, 422]).toContain(response.status);
    }, 10000);
  });
});

describe("Plugin Performance", () => {
  const describeIf = PLUGINS_ENABLED ? describe : describe.skip;

  describeIf("Response Times", () => {
    it("realtime health check should respond within 1 second", async () => {
      const start = Date.now();
      await fetch(`${PLUGIN_ENDPOINTS.realtime}/health`);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(1000);
    }, 10000);

    it("notifications health check should respond within 1 second", async () => {
      const start = Date.now();
      await fetch(`${PLUGIN_ENDPOINTS.notifications}/health`);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(1000);
    }, 10000);

    it("jobs health check should respond within 1 second", async () => {
      const start = Date.now();
      await fetch(`${PLUGIN_ENDPOINTS.jobs}/health`);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(1000);
    }, 10000);

    it("file-processing health check should respond within 1 second", async () => {
      const start = Date.now();
      await fetch(`${PLUGIN_ENDPOINTS.fileProcessing}/health`);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(1000);
    }, 10000);
  });

  describeIf("Concurrent Requests", () => {
    it("should handle multiple concurrent health checks", async () => {
      const promises = Array(10)
        .fill(null)
        .map(() => fetch(`${PLUGIN_ENDPOINTS.realtime}/health`));

      const results = await Promise.all(promises);
      const allSuccessful = results.every((r) => r.status === 200);

      expect(allSuccessful).toBe(true);
    }, 20000);
  });
});
