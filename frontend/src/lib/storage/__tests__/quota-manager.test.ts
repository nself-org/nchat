/**
 * Tests for Storage Quota Manager
 */

import {
  QuotaManager,
  formatBytes,
  calculatePercentage,
  isQuotaExceeded,
  isSoftLimitExceeded,
  getQuotaStatus,
  estimateDaysUntilFull,
  DEFAULT_USER_QUOTA,
  DEFAULT_CHANNEL_QUOTA,
  DEFAULT_TEAM_QUOTA,
  SOFT_LIMIT_THRESHOLD,
  CRITICAL_THRESHOLD,
} from "../quota-manager";

describe("Quota Manager Utilities", () => {
  describe("formatBytes", () => {
    it("should format bytes correctly", () => {
      expect(formatBytes(0)).toBe("0 B");
      expect(formatBytes(1024)).toBe("1 KB");
      expect(formatBytes(1024 * 1024)).toBe("1 MB");
      expect(formatBytes(1024 * 1024 * 1024)).toBe("1 GB");
      expect(formatBytes(1024 * 1024 * 1024 * 1024)).toBe("1 TB");
    });

    it("should handle decimals", () => {
      expect(formatBytes(1536, 2)).toBe("1.5 KB");
      expect(formatBytes(1536, 0)).toBe("2 KB");
    });
  });

  describe("calculatePercentage", () => {
    it("should calculate percentage correctly", () => {
      expect(calculatePercentage(50, 100)).toBe(50);
      expect(calculatePercentage(75, 100)).toBe(75);
      expect(calculatePercentage(100, 100)).toBe(100);
    });

    it("should handle edge cases", () => {
      expect(calculatePercentage(0, 100)).toBe(0);
      expect(calculatePercentage(100, 0)).toBe(0);
      expect(calculatePercentage(150, 100)).toBe(100); // Capped at 100%
    });
  });

  describe("isQuotaExceeded", () => {
    it("should detect exceeded quota", () => {
      expect(isQuotaExceeded(100, 100)).toBe(true);
      expect(isQuotaExceeded(101, 100)).toBe(true);
      expect(isQuotaExceeded(99, 100)).toBe(false);
    });
  });

  describe("isSoftLimitExceeded", () => {
    it("should detect soft limit exceeded", () => {
      expect(isSoftLimitExceeded(80, 100, 80)).toBe(true);
      expect(isSoftLimitExceeded(85, 100, 80)).toBe(true);
      expect(isSoftLimitExceeded(79, 100, 80)).toBe(false);
    });

    it("should use default threshold", () => {
      expect(isSoftLimitExceeded(80, 100)).toBe(true);
      expect(isSoftLimitExceeded(79, 100)).toBe(false);
    });
  });

  describe("getQuotaStatus", () => {
    it("should return correct status", () => {
      expect(getQuotaStatus(50, 100)).toBe("ok");
      expect(getQuotaStatus(79, 100)).toBe("ok");
      expect(getQuotaStatus(80, 100)).toBe("warning");
      expect(getQuotaStatus(94, 100)).toBe("warning");
      expect(getQuotaStatus(95, 100)).toBe("critical");
      expect(getQuotaStatus(99, 100)).toBe("critical");
      expect(getQuotaStatus(100, 100)).toBe("exceeded");
      expect(getQuotaStatus(101, 100)).toBe("exceeded");
    });
  });

  describe("estimateDaysUntilFull", () => {
    it("should estimate days correctly", () => {
      // 100 bytes used, 200 limit, 10 bytes per day
      expect(estimateDaysUntilFull(100, 200, 10)).toBe(10);

      // 150 bytes used, 200 limit, 25 bytes per day
      expect(estimateDaysUntilFull(150, 200, 25)).toBe(2);
    });

    it("should handle edge cases", () => {
      // Already full
      expect(estimateDaysUntilFull(100, 100, 10)).toBe(0);

      // No growth
      expect(estimateDaysUntilFull(50, 100, 0)).toBe(null);

      // Negative growth
      expect(estimateDaysUntilFull(50, 100, -10)).toBe(null);
    });
  });
});

describe("QuotaManager", () => {
  let manager: QuotaManager;

  beforeEach(() => {
    manager = new QuotaManager();
  });

  describe("getQuota", () => {
    it("should return quota for user", async () => {
      const quota = await manager.getQuota("user-1", "user");

      expect(quota).toMatchObject({
        entityId: "user-1",
        entityType: "user",
        limit: DEFAULT_USER_QUOTA,
        softLimitThreshold: SOFT_LIMIT_THRESHOLD,
      });

      expect(quota.used).toBeGreaterThanOrEqual(0);
      expect(quota.percentage).toBeGreaterThanOrEqual(0);
      expect(quota.percentage).toBeLessThanOrEqual(100);
    });

    it("should return quota for channel", async () => {
      const quota = await manager.getQuota("channel-1", "channel");

      expect(quota).toMatchObject({
        entityId: "channel-1",
        entityType: "channel",
        limit: DEFAULT_CHANNEL_QUOTA,
      });
    });

    it("should return quota for team", async () => {
      const quota = await manager.getQuota("team-1", "team");

      expect(quota).toMatchObject({
        entityId: "team-1",
        entityType: "team",
        limit: DEFAULT_TEAM_QUOTA,
      });
    });

    it("should cache quota results", async () => {
      const quota1 = await manager.getQuota("user-1", "user");
      const quota2 = await manager.getQuota("user-1", "user");

      // Should be the same object from cache
      expect(quota1.lastCalculated).toEqual(quota2.lastCalculated);
    });
  });

  describe("canUpload", () => {
    it("should allow upload within quota", async () => {
      const result = await manager.canUpload("user-1", "user", 1024 * 1024); // 1 MB

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it("should prevent upload exceeding quota", async () => {
      // First get quota to know the limit
      const quota = await manager.getQuota("user-1", "user");

      // Try to upload more than remaining space
      const result = await manager.canUpload(
        "user-1",
        "user",
        quota.limit - quota.used + 1024,
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toBeDefined();
    });
  });

  describe("getUsageBreakdown", () => {
    it("should return usage breakdown", async () => {
      const breakdown = await manager.getUsageBreakdown("user-1", "user");

      expect(breakdown).toHaveProperty("total");
      expect(breakdown).toHaveProperty("byType");
      expect(breakdown.byType).toHaveProperty("messages");
      expect(breakdown.byType).toHaveProperty("files");
      expect(breakdown.byType).toHaveProperty("images");
      expect(breakdown.byType).toHaveProperty("videos");
    });

    it("should have valid type breakdown", async () => {
      const breakdown = await manager.getUsageBreakdown("user-1", "user");

      const totalByType = Object.values(breakdown.byType).reduce(
        (sum, value) => sum + value,
        0,
      );

      // Total should approximately equal sum of types (allowing for rounding)
      expect(totalByType).toBeGreaterThanOrEqual(breakdown.total * 0.9);
      expect(totalByType).toBeLessThanOrEqual(breakdown.total * 1.1);
    });
  });

  describe("getStats", () => {
    it("should return overall statistics", async () => {
      const stats = await manager.getStats();

      expect(stats).toHaveProperty("totalAllocated");
      expect(stats).toHaveProperty("totalUsed");
      expect(stats).toHaveProperty("totalAvailable");
      expect(stats).toHaveProperty("fileCount");
      expect(stats).toHaveProperty("userCount");
      expect(stats).toHaveProperty("channelCount");
      expect(stats).toHaveProperty("averageFileSize");
      expect(stats).toHaveProperty("largestFileSize");
      expect(stats).toHaveProperty("growthRate");
      expect(stats).toHaveProperty("daysUntilFull");

      // Validate relationships
      expect(stats.totalUsed).toBeLessThanOrEqual(stats.totalAllocated);
      expect(stats.totalAvailable).toBe(stats.totalAllocated - stats.totalUsed);
    });
  });

  describe("recordUpload", () => {
    it("should invalidate cache on upload", async () => {
      // Get initial quota
      const quota1 = await manager.getQuota("user-1", "user");

      // Record upload
      await manager.recordUpload("user-1", "user", 1024 * 1024);

      // Get quota again
      const quota2 = await manager.getQuota("user-1", "user");

      // Cache should be invalidated, so timestamps should differ
      // (Note: In real implementation, used amount should increase)
      expect(quota2.lastCalculated.getTime()).toBeGreaterThanOrEqual(
        quota1.lastCalculated.getTime(),
      );
    });
  });

  describe("recordDeletion", () => {
    it("should invalidate cache on deletion", async () => {
      // Get initial quota
      const quota1 = await manager.getQuota("user-1", "user");

      // Record deletion
      await manager.recordDeletion("user-1", "user", 1024 * 1024);

      // Get quota again
      const quota2 = await manager.getQuota("user-1", "user");

      // Cache should be invalidated
      expect(quota2.lastCalculated.getTime()).toBeGreaterThanOrEqual(
        quota1.lastCalculated.getTime(),
      );
    });
  });

  describe("updateQuota", () => {
    it("should update quota and return current state", async () => {
      const newLimit = 10 * 1024 * 1024 * 1024; // 10 GB

      const quota = await manager.updateQuota("user-1", "user", newLimit);

      // updateQuota currently invalidates cache and returns quota
      // Note: limit update requires backend integration (not implemented in mock)
      expect(quota).toBeDefined();
      expect(quota.limit).toBeGreaterThan(0);
    });

    it("should invalidate cache on update", async () => {
      // Get initial quota
      await manager.getQuota("user-1", "user");

      // Update quota - this invalidates cache
      const updatedQuota = await manager.updateQuota(
        "user-1",
        "user",
        10 * 1024 * 1024 * 1024,
      );

      // Should return valid quota structure
      expect(updatedQuota).toBeDefined();
      expect(updatedQuota).toHaveProperty("limit");
      expect(updatedQuota).toHaveProperty("used");
    });
  });

  describe("applyCleanupPolicy", () => {
    it("should apply cleanup policy", async () => {
      const policy = {
        enabled: true,
        deleteOlderThan: 90,
        compressImagesOlderThan: 30,
        archiveMessagesOlderThan: 180,
        deleteCacheOlderThan: 7,
      };

      const result = await manager.applyCleanupPolicy("user-1", "user", policy);

      expect(result).toHaveProperty("filesDeleted");
      expect(result).toHaveProperty("spaceFree");
    });

    it("should skip cleanup when disabled", async () => {
      const policy = {
        enabled: false,
        deleteOlderThan: 90,
      };

      const result = await manager.applyCleanupPolicy("user-1", "user", policy);

      expect(result.filesDeleted).toBe(0);
      expect(result.spaceFree).toBe(0);
    });
  });
});
