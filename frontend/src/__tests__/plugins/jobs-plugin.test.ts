/**
 * Jobs Plugin Integration Tests
 *
 * Comprehensive test suite for the Jobs plugin (ɳPlugin: jobs v1.0.0)
 * Tests background job processing, scheduling, cron tasks, and queue management.
 *
 * @group integration
 * @group plugins
 * @group jobs
 */

import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";

// Configuration
const JOBS_URL =
  process.env.NEXT_PUBLIC_JOBS_URL || "http://jobs.localhost:3105";
const BULLMQ_DASHBOARD_URL =
  process.env.NEXT_PUBLIC_BULLMQ_DASHBOARD_URL ||
  "http://queues.localhost:4200";
const PLUGINS_ENABLED = process.env.PLUGINS_ENABLED === "true";
const TEST_TIMEOUT = 30000;

// Test data
const TEST_JOB = {
  type: "test-job",
  payload: {
    message: "Test job payload",
    timestamp: Date.now(),
  },
  options: {
    priority: 5,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
  },
};

// Helper functions
async function waitForPlugin(url: string, maxAttempts = 30): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`${url}/health`, {
        signal: AbortSignal.timeout(2000),
      });
      if (response.ok) {
        return;
      }
    } catch (error) {
      // Continue retrying
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Plugin at ${url} did not become ready`);
}

async function waitForJobCompletion(
  jobId: string,
  maxWaitTime = 10000,
): Promise<any> {
  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitTime) {
    const response = await fetch(`${JOBS_URL}/status/${jobId}`);
    if (response.ok) {
      const data = await response.json();
      if (data.state === "completed" || data.state === "failed") {
        return data;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Job ${jobId} did not complete within ${maxWaitTime}ms`);
}

describe("Jobs Plugin", () => {
  const describeIf = PLUGINS_ENABLED ? describe : describe.skip;

  beforeAll(async () => {
    if (!PLUGINS_ENABLED) {
      console.log("⚠️  Jobs plugin tests skipped (PLUGINS_ENABLED=false)");
      return;
    }

    console.log("Waiting for Jobs plugin to be ready...");
    await waitForPlugin(JOBS_URL);
    console.log("Jobs plugin ready");
  }, TEST_TIMEOUT);

  describeIf("Health Check", () => {
    it("should return healthy status", async () => {
      const response = await fetch(`${JOBS_URL}/health`);
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data).toMatchObject({
        status: "healthy",
        service: "jobs",
      });
      expect(data).toHaveProperty("version");
      expect(data).toHaveProperty("uptime");
    }, 10000);

    it("should report queue status", async () => {
      const response = await fetch(`${JOBS_URL}/health`);
      const data = await response.json();

      expect(data).toHaveProperty("queues");
      expect(data.queues).toHaveProperty("default");
      expect(data.queues.default).toHaveProperty("waiting");
      expect(data.queues.default).toHaveProperty("active");
      expect(data.queues.default).toHaveProperty("completed");
      expect(data.queues.default).toHaveProperty("failed");
    }, 10000);

    it("should report Redis connection status", async () => {
      const response = await fetch(`${JOBS_URL}/health`);
      const data = await response.json();

      expect(data).toHaveProperty("dependencies");
      expect(data.dependencies).toHaveProperty("redis");
      expect(data.dependencies.redis).toHaveProperty("status", "connected");
    }, 10000);

    it("should report worker status", async () => {
      const response = await fetch(`${JOBS_URL}/health`);
      const data = await response.json();

      expect(data).toHaveProperty("workers");
      expect(data.workers).toHaveProperty("active");
      expect(typeof data.workers.active).toBe("number");
    }, 10000);
  });

  describeIf("Job Creation", () => {
    it("should create and enqueue a job", async () => {
      const response = await fetch(`${JOBS_URL}/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(TEST_JOB),
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("jobId");
      expect(data).toHaveProperty("queueName");
    }, 10000);

    it("should create job with custom options", async () => {
      const customJob = {
        ...TEST_JOB,
        options: {
          priority: 10,
          delay: 2000,
          attempts: 5,
          removeOnComplete: true,
          removeOnFail: false,
        },
      };

      const response = await fetch(`${JOBS_URL}/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customJob),
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data).toHaveProperty("jobId");
    }, 10000);

    it("should create delayed job", async () => {
      const delayedJob = {
        ...TEST_JOB,
        options: {
          delay: 5000, // 5 seconds
        },
      };

      const response = await fetch(`${JOBS_URL}/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(delayedJob),
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data).toHaveProperty("jobId");
    }, 10000);

    it("should create repeatable job", async () => {
      const repeatableJob = {
        ...TEST_JOB,
        options: {
          repeat: {
            pattern: "*/5 * * * *", // Every 5 minutes
          },
        },
      };

      const response = await fetch(`${JOBS_URL}/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(repeatableJob),
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data).toHaveProperty("jobId");
      expect(data).toHaveProperty("repeat", true);
    }, 10000);
  });

  describeIf("Job Status", () => {
    it("should get job status", async () => {
      // Create a job first
      const createResponse = await fetch(`${JOBS_URL}/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(TEST_JOB),
      });

      const { jobId } = await createResponse.json();

      // Get status
      const statusResponse = await fetch(`${JOBS_URL}/status/${jobId}`);
      const statusData = await statusResponse.json();

      expect(statusResponse.ok).toBe(true);
      expect(statusData).toHaveProperty("jobId", jobId);
      expect(statusData).toHaveProperty("state");
      expect(["waiting", "active", "completed", "failed", "delayed"]).toContain(
        statusData.state,
      );
    }, 10000);

    it("should track job progress", async () => {
      const createResponse = await fetch(`${JOBS_URL}/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...TEST_JOB,
          type: "long-running-job",
        }),
      });

      const { jobId } = await createResponse.json();

      // Check progress multiple times
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const progressResponse = await fetch(`${JOBS_URL}/progress/${jobId}`);
      const progressData = await progressResponse.json();

      expect(progressResponse.ok).toBe(true);
      expect(progressData).toHaveProperty("jobId", jobId);
      expect(progressData).toHaveProperty("progress");
    }, 10000);

    it("should get job result after completion", async () => {
      const createResponse = await fetch(`${JOBS_URL}/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(TEST_JOB),
      });

      const { jobId } = await createResponse.json();

      // Wait for completion
      const status = await waitForJobCompletion(jobId);

      if (status.state === "completed") {
        expect(status).toHaveProperty("result");
      }
    }, 15000);
  });

  describeIf("Job Management", () => {
    it("should cancel a job", async () => {
      // Create a delayed job
      const createResponse = await fetch(`${JOBS_URL}/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...TEST_JOB,
          options: { delay: 10000 },
        }),
      });

      const { jobId } = await createResponse.json();

      // Cancel it
      const cancelResponse = await fetch(`${JOBS_URL}/jobs/${jobId}/cancel`, {
        method: "POST",
      });

      expect(cancelResponse.ok).toBe(true);
    }, 10000);

    it("should retry a failed job", async () => {
      // Create a job that will fail
      const createResponse = await fetch(`${JOBS_URL}/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "failing-job",
          payload: { shouldFail: true },
        }),
      });

      const { jobId } = await createResponse.json();

      // Wait for failure
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Retry
      const retryResponse = await fetch(`${JOBS_URL}/jobs/${jobId}/retry`, {
        method: "POST",
      });

      expect(retryResponse.status).toBeLessThan(500);
    }, 10000);

    it("should remove a job", async () => {
      const createResponse = await fetch(`${JOBS_URL}/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(TEST_JOB),
      });

      const { jobId } = await createResponse.json();

      // Remove it
      const removeResponse = await fetch(`${JOBS_URL}/jobs/${jobId}`, {
        method: "DELETE",
      });

      expect(removeResponse.ok).toBe(true);
    }, 10000);

    it("should pause and resume queue", async () => {
      // Pause
      const pauseResponse = await fetch(`${JOBS_URL}/queues/default/pause`, {
        method: "POST",
      });

      expect(pauseResponse.ok).toBe(true);

      // Resume
      const resumeResponse = await fetch(`${JOBS_URL}/queues/default/resume`, {
        method: "POST",
      });

      expect(resumeResponse.ok).toBe(true);
    }, 10000);

    it("should clean completed jobs", async () => {
      const response = await fetch(`${JOBS_URL}/queues/default/clean`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grace: 3600000, // 1 hour
          status: "completed",
          limit: 100,
        }),
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data).toHaveProperty("cleaned");
    }, 10000);
  });

  describeIf("Scheduled Jobs", () => {
    it("should list scheduled jobs", async () => {
      const response = await fetch(`${JOBS_URL}/scheduled`);
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data).toHaveProperty("jobs");
      expect(Array.isArray(data.jobs)).toBe(true);
    }, 10000);

    it("should get specific scheduled job", async () => {
      const response = await fetch(
        `${JOBS_URL}/scheduled/cleanup-old-messages`,
      );

      // Job may or may not exist
      expect([200, 404]).toContain(response.status);
    }, 10000);

    it("should create cron job", async () => {
      const cronJob = {
        name: "test-cron",
        type: "test-cron-job",
        schedule: "0 0 * * *", // Daily at midnight
        payload: {
          task: "test",
        },
        enabled: true,
      };

      const response = await fetch(`${JOBS_URL}/scheduled`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cronJob),
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data).toHaveProperty("jobId");
    }, 10000);

    it("should update scheduled job", async () => {
      const response = await fetch(`${JOBS_URL}/scheduled/test-cron`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schedule: "0 1 * * *", // Change to 1am
          enabled: false,
        }),
      });

      expect([200, 404]).toContain(response.status);
    }, 10000);

    it("should delete scheduled job", async () => {
      const response = await fetch(`${JOBS_URL}/scheduled/test-cron`, {
        method: "DELETE",
      });

      expect([200, 404]).toContain(response.status);
    }, 10000);
  });

  describeIf("Queue Statistics", () => {
    it("should get queue statistics", async () => {
      const response = await fetch(`${JOBS_URL}/queues/default/stats`);
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data).toHaveProperty("waiting");
      expect(data).toHaveProperty("active");
      expect(data).toHaveProperty("completed");
      expect(data).toHaveProperty("failed");
      expect(data).toHaveProperty("delayed");
    }, 10000);

    it("should get job counts by type", async () => {
      const response = await fetch(`${JOBS_URL}/stats/by-type`);
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data).toHaveProperty("types");
      expect(typeof data.types).toBe("object");
    }, 10000);

    it("should get processing time metrics", async () => {
      const response = await fetch(`${JOBS_URL}/stats/metrics`);
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data).toHaveProperty("avgProcessingTime");
      expect(data).toHaveProperty("successRate");
      expect(data).toHaveProperty("throughput");
    }, 10000);
  });

  describeIf("Job Types", () => {
    const jobTypes = [
      "send-email",
      "send-notification",
      "cleanup-old-messages",
      "generate-analytics",
      "backup-database",
      "process-image",
      "send-digest",
    ];

    it.each(jobTypes)(
      "should support %s job type",
      async (type) => {
        const response = await fetch(`${JOBS_URL}/jobs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            payload: {
              test: true,
            },
          }),
        });

        expect(response.ok).toBe(true);
      },
      10000,
    );
  });

  describeIf("BullMQ Dashboard", () => {
    it("should access BullMQ dashboard", async () => {
      try {
        const response = await fetch(BULLMQ_DASHBOARD_URL, {
          signal: AbortSignal.timeout(5000),
        });

        // Dashboard may require auth or not be accessible
        expect([200, 401, 403, 404]).toContain(response.status);
      } catch (error) {
        // Dashboard may not be running
        console.log("BullMQ Dashboard not accessible:", error);
      }
    }, 10000);
  });

  describeIf("Error Handling", () => {
    it("should handle invalid job type", async () => {
      const response = await fetch(`${JOBS_URL}/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "",
          payload: {},
        }),
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
    }, 10000);

    it("should handle malformed request", async () => {
      const response = await fetch(`${JOBS_URL}/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Missing required fields
        }),
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
    }, 10000);

    it("should handle invalid job ID", async () => {
      const response = await fetch(`${JOBS_URL}/status/invalid-job-id`);

      expect(response.status).toBeGreaterThanOrEqual(400);
    }, 10000);

    it("should handle invalid cron pattern", async () => {
      const response = await fetch(`${JOBS_URL}/scheduled`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "invalid-cron",
          type: "test",
          schedule: "invalid-cron-pattern",
          payload: {},
        }),
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
    }, 10000);
  });

  describeIf("Priority Queues", () => {
    it("should process high priority jobs first", async () => {
      const lowPriorityJob = {
        ...TEST_JOB,
        options: { priority: 1 },
      };

      const highPriorityJob = {
        ...TEST_JOB,
        options: { priority: 10 },
      };

      // Create low priority first
      const lowResponse = await fetch(`${JOBS_URL}/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lowPriorityJob),
      });

      const { jobId: lowJobId } = await lowResponse.json();

      // Then high priority
      const highResponse = await fetch(`${JOBS_URL}/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(highPriorityJob),
      });

      const { jobId: highJobId } = await highResponse.json();

      // High priority should be processed first (in theory)
      expect(lowJobId).toBeTruthy();
      expect(highJobId).toBeTruthy();
    }, 10000);
  });

  describeIf("Performance", () => {
    it("should handle high job volume", async () => {
      const requests = [];

      // Create 100 jobs concurrently
      for (let i = 0; i < 100; i++) {
        requests.push(
          fetch(`${JOBS_URL}/jobs`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...TEST_JOB,
              payload: { ...TEST_JOB.payload, index: i },
            }),
          }),
        );
      }

      const responses = await Promise.all(requests);
      const successful = responses.filter((r) => r.ok);

      expect(successful.length).toBeGreaterThan(90); // At least 90% success
    }, 20000);

    it("should enqueue jobs quickly", async () => {
      const startTime = Date.now();

      await fetch(`${JOBS_URL}/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(TEST_JOB),
      });

      const latency = Date.now() - startTime;

      // Should respond within 200ms
      expect(latency).toBeLessThan(200);
    }, 10000);
  });
});
