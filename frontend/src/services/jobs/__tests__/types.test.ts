/**
 * Jobs Types Tests
 *
 * Unit tests for job type definitions and constants.
 */

import {
  DEFAULT_JOBS_CONFIG,
  JobPriorityValue,
  type JobsServiceConfig,
  type NchatJobType,
  type QueueName,
  type JobStatus,
  type JobPriority,
  type ScheduledMessagePayload,
  type EmailDigestPayload,
  type CleanupExpiredPayload,
  type CreateJobOptions,
} from "../types";

describe("Jobs Types", () => {
  describe("DEFAULT_JOBS_CONFIG", () => {
    it("should have required configuration properties", () => {
      expect(DEFAULT_JOBS_CONFIG).toHaveProperty("redisUrl");
      expect(DEFAULT_JOBS_CONFIG).toHaveProperty("enableWorker");
      expect(DEFAULT_JOBS_CONFIG).toHaveProperty("defaultConcurrency");
      expect(DEFAULT_JOBS_CONFIG).toHaveProperty("defaultRetryAttempts");
      expect(DEFAULT_JOBS_CONFIG).toHaveProperty("defaultRetryDelay");
      expect(DEFAULT_JOBS_CONFIG).toHaveProperty("defaultTimeout");
      expect(DEFAULT_JOBS_CONFIG).toHaveProperty("debug");
    });

    it("should have sensible default values", () => {
      expect(typeof DEFAULT_JOBS_CONFIG.redisUrl).toBe("string");
      expect(DEFAULT_JOBS_CONFIG.enableWorker).toBe(false); // Workers run separately
      expect(DEFAULT_JOBS_CONFIG.defaultConcurrency).toBeGreaterThan(0);
      expect(DEFAULT_JOBS_CONFIG.defaultRetryAttempts).toBeGreaterThanOrEqual(
        1,
      );
      expect(DEFAULT_JOBS_CONFIG.defaultRetryDelay).toBeGreaterThan(0);
      expect(DEFAULT_JOBS_CONFIG.defaultTimeout).toBeGreaterThan(0);
    });
  });

  describe("JobPriorityValue", () => {
    it("should have all priority levels defined", () => {
      expect(JobPriorityValue).toHaveProperty("critical");
      expect(JobPriorityValue).toHaveProperty("high");
      expect(JobPriorityValue).toHaveProperty("normal");
      expect(JobPriorityValue).toHaveProperty("low");
    });

    it("should have critical priority as highest (lowest number)", () => {
      expect(JobPriorityValue.critical).toBeLessThan(JobPriorityValue.high);
      expect(JobPriorityValue.high).toBeLessThan(JobPriorityValue.normal);
      expect(JobPriorityValue.normal).toBeLessThan(JobPriorityValue.low);
    });

    it("should have positive integer values", () => {
      Object.values(JobPriorityValue).forEach((value) => {
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThan(0);
      });
    });
  });

  describe("Type Definitions", () => {
    it("should allow valid NchatJobType values", () => {
      const validTypes: NchatJobType[] = [
        "scheduled-message",
        "email-digest",
        "cleanup-expired",
        "index-search",
        "process-file",
        "send-notification",
        "send-email",
        "http-webhook",
        "custom",
      ];

      // This test ensures the type allows these values
      validTypes.forEach((type) => {
        expect(typeof type).toBe("string");
      });
    });

    it("should allow valid QueueName values", () => {
      const validQueues: QueueName[] = [
        "default",
        "high-priority",
        "low-priority",
        "scheduled",
      ];

      validQueues.forEach((queue) => {
        expect(typeof queue).toBe("string");
      });
    });

    it("should allow valid JobStatus values", () => {
      const validStatuses: JobStatus[] = [
        "waiting",
        "active",
        "completed",
        "failed",
        "delayed",
        "stuck",
        "paused",
      ];

      validStatuses.forEach((status) => {
        expect(typeof status).toBe("string");
      });
    });

    it("should allow valid JobPriority values", () => {
      const validPriorities: JobPriority[] = [
        "critical",
        "high",
        "normal",
        "low",
      ];

      validPriorities.forEach((priority) => {
        expect(typeof priority).toBe("string");
      });
    });
  });

  describe("Payload Types", () => {
    it("should validate ScheduledMessagePayload structure", () => {
      const payload: ScheduledMessagePayload = {
        scheduledMessageId: "sched_123",
        channelId: "channel_456",
        userId: "user_789",
        content: "Hello, world!",
        threadId: "thread_abc",
        replyToId: "msg_def",
        attachments: [
          {
            id: "att_1",
            name: "file.txt",
            type: "text/plain",
            url: "https://example.com/file.txt",
          },
        ],
        mentions: ["user_1", "user_2"],
      };

      expect(payload.scheduledMessageId).toBe("sched_123");
      expect(payload.channelId).toBe("channel_456");
      expect(payload.userId).toBe("user_789");
      expect(payload.content).toBe("Hello, world!");
      expect(payload.attachments).toHaveLength(1);
      expect(payload.mentions).toHaveLength(2);
    });

    it("should validate EmailDigestPayload structure", () => {
      const payload: EmailDigestPayload = {
        userId: "user_123",
        email: "user@example.com",
        digestType: "daily",
        periodStart: Date.now() - 86400000,
        periodEnd: Date.now(),
        channelIds: ["channel_1", "channel_2"],
        includeUnreadCount: true,
        includeMentions: true,
        includeThreadReplies: true,
      };

      expect(payload.userId).toBe("user_123");
      expect(payload.email).toBe("user@example.com");
      expect(payload.digestType).toBe("daily");
      expect(payload.includeUnreadCount).toBe(true);
    });

    it("should validate CleanupExpiredPayload structure", () => {
      const payload: CleanupExpiredPayload = {
        targetType: "messages",
        olderThanDays: 30,
        batchSize: 500,
        dryRun: false,
      };

      expect(payload.targetType).toBe("messages");
      expect(payload.olderThanDays).toBe(30);
      expect(payload.batchSize).toBe(500);
      expect(payload.dryRun).toBe(false);
    });
  });

  describe("CreateJobOptions", () => {
    it("should validate CreateJobOptions structure", () => {
      const options: CreateJobOptions = {
        queue: "high-priority",
        priority: "high",
        delay: 60000,
        maxRetries: 5,
        retryDelay: 10000,
        timeout: 120000,
        metadata: { source: "test" },
        tags: ["test", "unit"],
        removeOnComplete: true,
        removeOnFail: 86400,
        jobId: "custom_job_id",
      };

      expect(options.queue).toBe("high-priority");
      expect(options.priority).toBe("high");
      expect(options.delay).toBe(60000);
      expect(options.maxRetries).toBe(5);
      expect(options.tags).toContain("test");
      expect(options.jobId).toBe("custom_job_id");
    });

    it("should allow partial options", () => {
      const minimalOptions: CreateJobOptions = {};
      expect(minimalOptions).toEqual({});

      const partialOptions: CreateJobOptions = {
        priority: "normal",
        delay: 5000,
      };
      expect(partialOptions.priority).toBe("normal");
      expect(partialOptions.delay).toBe(5000);
      expect(partialOptions.queue).toBeUndefined();
    });
  });

  describe("JobsServiceConfig", () => {
    it("should merge custom config with defaults", () => {
      const customConfig: Partial<JobsServiceConfig> = {
        redisUrl: "redis://custom:6379",
        enableWorker: true,
        defaultConcurrency: 10,
      };

      const merged: JobsServiceConfig = {
        ...DEFAULT_JOBS_CONFIG,
        ...customConfig,
      };

      expect(merged.redisUrl).toBe("redis://custom:6379");
      expect(merged.enableWorker).toBe(true);
      expect(merged.defaultConcurrency).toBe(10);
      // Defaults should be preserved
      expect(merged.defaultRetryAttempts).toBe(
        DEFAULT_JOBS_CONFIG.defaultRetryAttempts,
      );
    });
  });
});
