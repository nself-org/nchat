/**
 * Queue Service Tests
 *
 * Unit tests for the QueueService class.
 * These tests mock Redis/BullMQ to test service logic.
 */

import {
  QueueService,
  QUEUE_NAMES,
  createQueueService,
} from "../queue.service";
import { DEFAULT_JOBS_CONFIG, JobPriorityValue } from "../types";

// Mock BullMQ
jest.mock("bullmq", () => ({
  Queue: jest.fn().mockImplementation((name) => ({
    name,
    add: jest.fn().mockResolvedValue({ id: "mock-job-id" }),
    addBulk: jest
      .fn()
      .mockResolvedValue([{ id: "mock-job-1" }, { id: "mock-job-2" }]),
    getJob: jest.fn(),
    getJobs: jest.fn().mockResolvedValue([]),
    getJobCounts: jest.fn().mockResolvedValue({
      waiting: 5,
      active: 2,
      completed: 100,
      failed: 3,
      delayed: 1,
      paused: 0,
    }),
    getRepeatableJobs: jest.fn().mockResolvedValue([]),
    removeRepeatableByKey: jest.fn().mockResolvedValue(true),
    pause: jest.fn().mockResolvedValue(undefined),
    resume: jest.fn().mockResolvedValue(undefined),
    drain: jest.fn().mockResolvedValue(undefined),
    clean: jest.fn().mockResolvedValue(["job-1", "job-2"]),
    close: jest.fn().mockResolvedValue(undefined),
  })),
  QueueEvents: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    off: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
  })),
  Job: jest.fn(),
}));

// Mock ioredis
jest.mock("ioredis", () => {
  return jest.fn().mockImplementation(() => ({
    status: "ready",
    once: jest.fn((event, cb) => {
      if (event === "ready") setTimeout(cb, 0);
    }),
    on: jest.fn(),
    disconnect: jest.fn(),
    duplicate: jest.fn().mockReturnThis(),
  }));
});

describe("QueueService", () => {
  let service: QueueService;

  beforeEach(() => {
    service = createQueueService();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    if (service.initialized) {
      await service.close();
    }
  });

  describe("initialization", () => {
    it("should create with default config", () => {
      expect(service).toBeInstanceOf(QueueService);
      expect(service.initialized).toBe(false);
    });

    it("should create with custom config", () => {
      const customService = createQueueService({
        redisUrl: "redis://custom:6379",
        defaultConcurrency: 10,
      });
      expect(customService).toBeInstanceOf(QueueService);
    });

    it("should initialize successfully", async () => {
      await service.initialize();
      expect(service.initialized).toBe(true);
      expect(service.connectionStatus).toBe("ready");
    });

    it("should be idempotent on multiple initialize calls", async () => {
      await service.initialize();
      await service.initialize();
      expect(service.initialized).toBe(true);
    });

    it("should create queues for all queue names", async () => {
      await service.initialize();
      for (const queueName of QUEUE_NAMES) {
        expect(service.getQueue(queueName)).toBeDefined();
      }
    });
  });

  describe("addJob", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("should add a job to the default queue", async () => {
      const result = await service.addJob("custom", {
        action: "test",
        data: {},
      });

      expect(result.jobId).toBe("mock-job-id");
      expect(result.queueName).toBe("default");
    });

    it("should add a job to a specific queue", async () => {
      const result = await service.addJob(
        "send-notification",
        {
          notificationType: "push",
          userIds: [],
          title: "Test",
          body: "Test body",
        },
        { queue: "high-priority" },
      );

      expect(result.queueName).toBe("high-priority");
    });

    it("should add scheduled message to scheduled queue", async () => {
      const result = await service.addJob("scheduled-message", {
        scheduledMessageId: "msg-1",
        channelId: "chan-1",
        userId: "user-1",
        content: "Hello",
      });

      expect(result.queueName).toBe("scheduled");
    });

    it("should add cleanup job to low-priority queue", async () => {
      const result = await service.addJob("cleanup-expired", {
        targetType: "messages",
      });

      expect(result.queueName).toBe("low-priority");
    });

    it("should include delay in job options", async () => {
      const queue = service.getQueue("default");
      const addSpy = jest.spyOn(queue!, "add");

      await service.addJob(
        "custom",
        { action: "test", data: {} },
        { delay: 60000 },
      );

      expect(addSpy).toHaveBeenCalledWith(
        "custom",
        expect.any(Object),
        expect.objectContaining({ delay: 60000 }),
      );
    });

    it("should map priority to numeric value", async () => {
      const queue = service.getQueue("default");
      const addSpy = jest.spyOn(queue!, "add");

      await service.addJob(
        "custom",
        { action: "test", data: {} },
        { priority: "high" },
      );

      expect(addSpy).toHaveBeenCalledWith(
        "custom",
        expect.any(Object),
        expect.objectContaining({ priority: JobPriorityValue.high }),
      );
    });

    it("should throw error when not initialized", async () => {
      const uninitializedService = createQueueService();

      await expect(
        uninitializedService.addJob("custom", { action: "test", data: {} }),
      ).rejects.toThrow("Queue service not initialized");
    });
  });

  describe("addJobs", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("should add multiple jobs", async () => {
      const results = await service.addJobs([
        { type: "custom", payload: { action: "test1", data: {} } },
        { type: "custom", payload: { action: "test2", data: {} } },
      ]);

      expect(results).toHaveLength(2);
    });

    it("should group jobs by queue", async () => {
      const results = await service.addJobs([
        {
          type: "scheduled-message",
          payload: {
            scheduledMessageId: "1",
            channelId: "c",
            userId: "u",
            content: "hi",
          },
        },
        { type: "cleanup-expired", payload: { targetType: "messages" } },
        { type: "custom", payload: { action: "test", data: {} } },
      ]);

      // Jobs should be grouped by their default queues
      const queues = results.map((r) => r.queueName);
      expect(queues).toContain("scheduled");
      expect(queues).toContain("low-priority");
      expect(queues).toContain("default");
    });
  });

  describe("getJob", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("should find job in specified queue", async () => {
      const mockJob = { id: "test-job", data: {} };
      const queue = service.getQueue("default");
      jest.spyOn(queue!, "getJob").mockResolvedValue(mockJob as any);

      const job = await service.getJob("test-job", "default");
      expect(job).toBe(mockJob);
    });

    it("should search all queues when queue not specified", async () => {
      const mockJob = { id: "test-job", data: {} };

      // Mock all queues to return null except one
      for (const queueName of QUEUE_NAMES) {
        const queue = service.getQueue(queueName);
        if (queueName === "scheduled") {
          jest.spyOn(queue!, "getJob").mockResolvedValue(mockJob as any);
        } else {
          jest.spyOn(queue!, "getJob").mockResolvedValue(null);
        }
      }

      const job = await service.getJob("test-job");
      expect(job).toBe(mockJob);
    });

    it("should return null when job not found", async () => {
      for (const queueName of QUEUE_NAMES) {
        const queue = service.getQueue(queueName);
        jest.spyOn(queue!, "getJob").mockResolvedValue(null);
      }

      const job = await service.getJob("non-existent");
      expect(job).toBeNull();
    });
  });

  describe("getJobStatus", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("should return job status", async () => {
      const mockJob = {
        id: "test-job",
        getState: jest.fn().mockResolvedValue("active"),
      };
      const queue = service.getQueue("default");
      jest.spyOn(queue!, "getJob").mockResolvedValue(mockJob as any);

      const status = await service.getJobStatus("test-job", "default");
      expect(status).toBe("active");
    });

    it("should return null for non-existent job", async () => {
      const queue = service.getQueue("default");
      jest.spyOn(queue!, "getJob").mockResolvedValue(null);

      const status = await service.getJobStatus("non-existent", "default");
      expect(status).toBeNull();
    });
  });

  describe("cancelJob", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("should cancel a waiting job", async () => {
      const mockJob = {
        id: "test-job",
        getState: jest.fn().mockResolvedValue("waiting"),
        remove: jest.fn().mockResolvedValue(undefined),
      };
      const queue = service.getQueue("default");
      jest.spyOn(queue!, "getJob").mockResolvedValue(mockJob as any);

      const cancelled = await service.cancelJob("test-job", "default");
      expect(cancelled).toBe(true);
      expect(mockJob.remove).toHaveBeenCalled();
    });

    it("should not cancel an active job", async () => {
      const mockJob = {
        id: "test-job",
        getState: jest.fn().mockResolvedValue("active"),
        remove: jest.fn(),
      };
      const queue = service.getQueue("default");
      jest.spyOn(queue!, "getJob").mockResolvedValue(mockJob as any);

      const cancelled = await service.cancelJob("test-job", "default");
      expect(cancelled).toBe(false);
      expect(mockJob.remove).not.toHaveBeenCalled();
    });

    it("should return false for non-existent job", async () => {
      const queue = service.getQueue("default");
      jest.spyOn(queue!, "getJob").mockResolvedValue(null);

      const cancelled = await service.cancelJob("non-existent", "default");
      expect(cancelled).toBe(false);
    });
  });

  describe("retryJob", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("should retry a failed job", async () => {
      const mockJob = {
        id: "test-job",
        getState: jest.fn().mockResolvedValue("failed"),
        retry: jest.fn().mockResolvedValue(undefined),
      };
      const queue = service.getQueue("default");
      jest.spyOn(queue!, "getJob").mockResolvedValue(mockJob as any);

      const retried = await service.retryJob("test-job", "default");
      expect(retried).toBe(true);
      expect(mockJob.retry).toHaveBeenCalled();
    });

    it("should not retry a non-failed job", async () => {
      const mockJob = {
        id: "test-job",
        getState: jest.fn().mockResolvedValue("waiting"),
        retry: jest.fn(),
      };
      const queue = service.getQueue("default");
      jest.spyOn(queue!, "getJob").mockResolvedValue(mockJob as any);

      const retried = await service.retryJob("test-job", "default");
      expect(retried).toBe(false);
      expect(mockJob.retry).not.toHaveBeenCalled();
    });
  });

  describe("getJobCounts", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("should return job counts for a queue", async () => {
      const counts = await service.getJobCounts("default");

      expect(counts).toHaveProperty("waiting");
      expect(counts).toHaveProperty("active");
      expect(counts).toHaveProperty("completed");
      expect(counts).toHaveProperty("failed");
      expect(counts).toHaveProperty("delayed");
    });

    it("should return zeros for non-existent queue", async () => {
      const counts = await service.getJobCounts("invalid" as any);

      expect(counts.waiting).toBe(0);
      expect(counts.active).toBe(0);
      expect(counts.completed).toBe(0);
    });
  });

  describe("queue operations", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("should pause a queue", async () => {
      const queue = service.getQueue("default");
      const pauseSpy = jest.spyOn(queue!, "pause");

      await service.pauseQueue("default");
      expect(pauseSpy).toHaveBeenCalled();
    });

    it("should resume a queue", async () => {
      const queue = service.getQueue("default");
      const resumeSpy = jest.spyOn(queue!, "resume");

      await service.resumeQueue("default");
      expect(resumeSpy).toHaveBeenCalled();
    });

    it("should drain a queue", async () => {
      const queue = service.getQueue("default");
      const drainSpy = jest.spyOn(queue!, "drain");

      await service.drainQueue("default");
      expect(drainSpy).toHaveBeenCalled();
    });

    it("should clean a queue", async () => {
      const removed = await service.cleanQueue(
        "default",
        86400000,
        "completed",
        100,
      );
      expect(removed).toEqual(["job-1", "job-2"]);
    });
  });

  describe("event handling", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("should subscribe to events", () => {
      const listener = jest.fn();
      const unsubscribe = service.onEvent("completed", listener);

      expect(typeof unsubscribe).toBe("function");
    });

    it("should unsubscribe from events", () => {
      const listener = jest.fn();
      const unsubscribe = service.onEvent("completed", listener);
      unsubscribe();

      // Listener should be removed
    });

    it("should handle wildcard event subscription", () => {
      const listener = jest.fn();
      const unsubscribe = service.onEvent("*", listener);

      expect(typeof unsubscribe).toBe("function");
      unsubscribe();
    });
  });

  describe("close", () => {
    it("should close all connections", async () => {
      await service.initialize();
      await service.close();

      expect(service.initialized).toBe(false);
    });

    it("should be safe to call multiple times", async () => {
      await service.initialize();
      await service.close();
      await service.close();

      expect(service.initialized).toBe(false);
    });
  });
});

describe("QUEUE_NAMES", () => {
  it("should include all expected queues", () => {
    expect(QUEUE_NAMES).toContain("default");
    expect(QUEUE_NAMES).toContain("high-priority");
    expect(QUEUE_NAMES).toContain("low-priority");
    expect(QUEUE_NAMES).toContain("scheduled");
  });

  it("should have exactly 4 queues", () => {
    expect(QUEUE_NAMES).toHaveLength(4);
  });
});
