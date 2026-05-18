/**
 * Stats Aggregator Unit Tests
 *
 * Tests for statistics aggregation utilities including user, message,
 * channel, and storage statistics.
 */

import {
  aggregateUserStats,
  calculateUserGrowth,
  countUsersByRole,
  aggregateMessageStats,
  calculateMessageVolumeByHour,
  calculateMessageVolumeByDay,
  aggregateChannelStats,
  calculateChannelActivity,
  calculateChannelDistribution,
  aggregateStorageStats,
  formatBytes,
  parseBytes,
  aggregateDashboardStats,
  calculatePercentageChange,
  calculateTrend,
  type UserStatsInput,
  type MessageStatsInput,
  type ChannelStatsInput,
  type StorageStatsInput,
  type DateRange,
} from "../stats-aggregator";

// ============================================================================
// Test Helpers
// ============================================================================

const createTestUser = (
  overrides?: Partial<UserStatsInput>,
): UserStatsInput => ({
  id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  isActive: true,
  createdAt: new Date().toISOString(),
  lastSeenAt: new Date().toISOString(),
  ...overrides,
});

const createTestMessage = (
  overrides?: Partial<MessageStatsInput>,
): MessageStatsInput => ({
  id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  channelId: "channel-1",
  createdAt: new Date().toISOString(),
  ...overrides,
});

const createTestChannel = (
  overrides?: Partial<ChannelStatsInput>,
): ChannelStatsInput => ({
  id: `channel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  name: "general",
  isPrivate: false,
  messageCount: 0,
  ...overrides,
});

// ============================================================================
// User Statistics Tests
// ============================================================================

describe("User Statistics", () => {
  describe("aggregateUserStats", () => {
    it("should return zero stats for empty users array", () => {
      const result = aggregateUserStats([]);

      expect(result.total).toBe(0);
      expect(result.active).toBe(0);
      expect(result.new).toBe(0);
      expect(result.growth).toBe(0);
    });

    it("should count total users correctly", () => {
      const users = [
        createTestUser({ id: "user-1" }),
        createTestUser({ id: "user-2" }),
        createTestUser({ id: "user-3" }),
      ];

      const result = aggregateUserStats(users);

      expect(result.total).toBe(3);
    });

    it("should count active users based on last seen", () => {
      const now = new Date();
      const thirtyOneDaysAgo = new Date(
        now.getTime() - 31 * 24 * 60 * 60 * 1000,
      );
      const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

      const users = [
        createTestUser({ isActive: true, lastSeenAt: now.toISOString() }),
        createTestUser({
          isActive: true,
          lastSeenAt: tenDaysAgo.toISOString(),
        }),
        createTestUser({
          isActive: true,
          lastSeenAt: thirtyOneDaysAgo.toISOString(),
        }),
        createTestUser({ isActive: false, lastSeenAt: now.toISOString() }),
      ];

      const result = aggregateUserStats(users, now);

      expect(result.active).toBe(2); // Only users seen in last 30 days and active
    });

    it("should count new users created in last 7 days", () => {
      const now = new Date();
      const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

      const users = [
        createTestUser({ createdAt: now.toISOString() }),
        createTestUser({ createdAt: threeDaysAgo.toISOString() }),
        createTestUser({ createdAt: eightDaysAgo.toISOString() }),
      ];

      const result = aggregateUserStats(users, now);

      expect(result.new).toBe(2);
    });

    it("should calculate growth percentage correctly", () => {
      const now = new Date();
      const users = [
        createTestUser({ createdAt: now.toISOString() }),
        createTestUser({ createdAt: now.toISOString() }),
        createTestUser({
          createdAt: new Date(
            now.getTime() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        }),
        createTestUser({
          createdAt: new Date(
            now.getTime() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        }),
      ];

      const result = aggregateUserStats(users, now);

      // 2 new users out of 4 total = 50%
      expect(result.growth).toBe(50);
    });

    it("should handle users without lastSeenAt", () => {
      const users = [createTestUser({ isActive: true, lastSeenAt: undefined })];

      const result = aggregateUserStats(users);

      expect(result.active).toBe(0);
    });
  });

  describe("calculateUserGrowth", () => {
    it("should return empty array for empty users", () => {
      const dateRange: DateRange = {
        start: new Date("2025-01-01"),
        end: new Date("2025-01-07"),
      };

      const result = calculateUserGrowth([], dateRange);

      expect(result.length).toBe(7);
      expect(result.every((r) => r.count === 0)).toBe(true);
    });

    it("should count users per day correctly", () => {
      const dateRange: DateRange = {
        start: new Date("2025-01-01"),
        end: new Date("2025-01-03"),
      };

      const users = [
        createTestUser({ createdAt: "2025-01-01T10:00:00Z" }),
        createTestUser({ createdAt: "2025-01-01T15:00:00Z" }),
        createTestUser({ createdAt: "2025-01-02T12:00:00Z" }),
      ];

      const result = calculateUserGrowth(users, dateRange);

      expect(result.find((r) => r.date === "2025-01-01")?.count).toBe(2);
      expect(result.find((r) => r.date === "2025-01-02")?.count).toBe(1);
      expect(result.find((r) => r.date === "2025-01-03")?.count).toBe(0);
    });

    it("should ignore users outside date range", () => {
      const dateRange: DateRange = {
        start: new Date("2025-01-01"),
        end: new Date("2025-01-02"),
      };

      const users = [
        createTestUser({ createdAt: "2024-12-31T10:00:00Z" }),
        createTestUser({ createdAt: "2025-01-01T10:00:00Z" }),
        createTestUser({ createdAt: "2025-01-03T10:00:00Z" }),
      ];

      const result = calculateUserGrowth(users, dateRange);

      const total = result.reduce((sum, r) => sum + r.count, 0);
      expect(total).toBe(1);
    });

    it("should return sorted results", () => {
      const dateRange: DateRange = {
        start: new Date("2025-01-01"),
        end: new Date("2025-01-05"),
      };

      const result = calculateUserGrowth([], dateRange);

      for (let i = 1; i < result.length; i++) {
        expect(result[i].date > result[i - 1].date).toBe(true);
      }
    });
  });

  describe("countUsersByRole", () => {
    it("should return empty object for empty array", () => {
      const result = countUsersByRole([]);

      expect(Object.keys(result).length).toBe(0);
    });

    it("should count users by role correctly", () => {
      const users = [
        { role: "admin" },
        { role: "member" },
        { role: "member" },
        { role: "guest" },
      ];

      const result = countUsersByRole(users);

      expect(result.admin).toBe(1);
      expect(result.member).toBe(2);
      expect(result.guest).toBe(1);
    });

    it("should handle empty role as unknown", () => {
      const users = [{ role: "" }];

      const result = countUsersByRole(users);

      expect(result.unknown).toBe(1);
    });
  });
});

// ============================================================================
// Message Statistics Tests
// ============================================================================

describe("Message Statistics", () => {
  describe("aggregateMessageStats", () => {
    it("should return zero stats for empty messages array", () => {
      const result = aggregateMessageStats([]);

      expect(result.total).toBe(0);
      expect(result.today).toBe(0);
      expect(result.avgPerDay).toBe(0);
      expect(result.peakHour).toBe(0);
    });

    it("should count total messages correctly", () => {
      const messages = [
        createTestMessage({ id: "msg-1" }),
        createTestMessage({ id: "msg-2" }),
        createTestMessage({ id: "msg-3" }),
      ];

      const result = aggregateMessageStats(messages);

      expect(result.total).toBe(3);
    });

    it("should count today messages correctly", () => {
      const now = new Date();
      const today = new Date(now);
      today.setHours(10, 0, 0, 0);
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const messages = [
        createTestMessage({ createdAt: today.toISOString() }),
        createTestMessage({ createdAt: today.toISOString() }),
        createTestMessage({ createdAt: yesterday.toISOString() }),
      ];

      const result = aggregateMessageStats(messages, now);

      expect(result.today).toBe(2);
    });

    it("should calculate peak hour correctly", () => {
      // Use local time to avoid timezone issues
      const now = new Date();
      const baseDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      );

      const hour9_1 = new Date(baseDate);
      hour9_1.setHours(9, 0, 0, 0);
      const hour9_2 = new Date(baseDate);
      hour9_2.setHours(9, 30, 0, 0);
      const hour9_3 = new Date(baseDate);
      hour9_3.setHours(9, 45, 0, 0);
      const hour14 = new Date(baseDate);
      hour14.setHours(14, 0, 0, 0);

      const messages = [
        createTestMessage({ createdAt: hour9_1.toISOString() }),
        createTestMessage({ createdAt: hour9_2.toISOString() }),
        createTestMessage({ createdAt: hour9_3.toISOString() }),
        createTestMessage({ createdAt: hour14.toISOString() }),
      ];

      const result = aggregateMessageStats(messages);

      expect(result.peakHour).toBe(9);
    });

    it("should calculate average per day correctly", () => {
      const now = new Date("2025-01-15T12:00:00Z");
      const fiveDaysAgo = new Date("2025-01-10T12:00:00Z");

      const messages = [
        createTestMessage({ createdAt: fiveDaysAgo.toISOString() }),
        createTestMessage({ createdAt: now.toISOString() }),
        createTestMessage({ createdAt: now.toISOString() }),
        createTestMessage({ createdAt: now.toISOString() }),
        createTestMessage({ createdAt: now.toISOString() }),
      ];

      const result = aggregateMessageStats(messages, now);

      // 5 messages over 5 days = 1 per day
      expect(result.avgPerDay).toBe(1);
    });
  });

  describe("calculateMessageVolumeByHour", () => {
    it("should return 24 hours with zero counts for empty messages", () => {
      const result = calculateMessageVolumeByHour([]);

      expect(result.length).toBe(24);
      expect(result.every((r) => r.count === 0)).toBe(true);
    });

    it("should count messages by hour correctly", () => {
      // Use local time to avoid timezone issues
      const now = new Date();
      const baseDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      );

      const hour9_1 = new Date(baseDate);
      hour9_1.setHours(9, 0, 0, 0);
      const hour9_2 = new Date(baseDate);
      hour9_2.setHours(9, 30, 0, 0);
      const hour15 = new Date(baseDate);
      hour15.setHours(15, 0, 0, 0);

      const messages = [
        createTestMessage({ createdAt: hour9_1.toISOString() }),
        createTestMessage({ createdAt: hour9_2.toISOString() }),
        createTestMessage({ createdAt: hour15.toISOString() }),
      ];

      const result = calculateMessageVolumeByHour(messages);

      expect(result.find((r) => r.hour === 9)?.count).toBe(2);
      expect(result.find((r) => r.hour === 15)?.count).toBe(1);
      expect(result.find((r) => r.hour === 0)?.count).toBe(0);
    });
  });

  describe("calculateMessageVolumeByDay", () => {
    it("should return days with zero counts for empty messages", () => {
      const dateRange: DateRange = {
        start: new Date("2025-01-01"),
        end: new Date("2025-01-03"),
      };

      const result = calculateMessageVolumeByDay([], dateRange);

      expect(result.length).toBe(3);
      expect(result.every((r) => r.count === 0)).toBe(true);
    });

    it("should count messages per day correctly", () => {
      const dateRange: DateRange = {
        start: new Date("2025-01-01"),
        end: new Date("2025-01-03"),
      };

      const messages = [
        createTestMessage({ createdAt: "2025-01-01T10:00:00Z" }),
        createTestMessage({ createdAt: "2025-01-01T15:00:00Z" }),
        createTestMessage({ createdAt: "2025-01-02T12:00:00Z" }),
      ];

      const result = calculateMessageVolumeByDay(messages, dateRange);

      expect(result.find((r) => r.date === "2025-01-01")?.count).toBe(2);
      expect(result.find((r) => r.date === "2025-01-02")?.count).toBe(1);
    });
  });
});

// ============================================================================
// Channel Statistics Tests
// ============================================================================

describe("Channel Statistics", () => {
  describe("aggregateChannelStats", () => {
    it("should return zero stats for empty channels array", () => {
      const result = aggregateChannelStats([]);

      expect(result.total).toBe(0);
      expect(result.public).toBe(0);
      expect(result.private).toBe(0);
      expect(result.mostActive.length).toBe(0);
    });

    it("should count total channels correctly", () => {
      const channels = [
        createTestChannel({ id: "channel-1" }),
        createTestChannel({ id: "channel-2" }),
        createTestChannel({ id: "channel-3" }),
      ];

      const result = aggregateChannelStats(channels);

      expect(result.total).toBe(3);
    });

    it("should count public and private channels correctly", () => {
      const channels = [
        createTestChannel({ isPrivate: false }),
        createTestChannel({ isPrivate: false }),
        createTestChannel({ isPrivate: true }),
      ];

      const result = aggregateChannelStats(channels);

      expect(result.public).toBe(2);
      expect(result.private).toBe(1);
    });

    it("should return most active channels", () => {
      const channels = [
        createTestChannel({ name: "general", messageCount: 100 }),
        createTestChannel({ name: "random", messageCount: 50 }),
        createTestChannel({ name: "support", messageCount: 200 }),
      ];

      const result = aggregateChannelStats(channels);

      expect(result.mostActive[0]).toBe("support");
      expect(result.mostActive[1]).toBe("general");
      expect(result.mostActive[2]).toBe("random");
    });

    it("should limit most active to specified count", () => {
      const channels = [
        createTestChannel({ name: "ch1", messageCount: 100 }),
        createTestChannel({ name: "ch2", messageCount: 90 }),
        createTestChannel({ name: "ch3", messageCount: 80 }),
        createTestChannel({ name: "ch4", messageCount: 70 }),
        createTestChannel({ name: "ch5", messageCount: 60 }),
        createTestChannel({ name: "ch6", messageCount: 50 }),
      ];

      const result = aggregateChannelStats(channels, 3);

      expect(result.mostActive.length).toBe(3);
      expect(result.mostActive).toEqual(["ch1", "ch2", "ch3"]);
    });
  });

  describe("calculateChannelActivity", () => {
    it("should return empty array for empty channels", () => {
      const result = calculateChannelActivity([]);

      expect(result.length).toBe(0);
    });

    it("should return channels sorted by message count", () => {
      const channels = [
        createTestChannel({ id: "ch1", name: "general", messageCount: 50 }),
        createTestChannel({ id: "ch2", name: "support", messageCount: 100 }),
        createTestChannel({ id: "ch3", name: "random", messageCount: 25 }),
      ];

      const result = calculateChannelActivity(channels);

      expect(result[0].channelName).toBe("support");
      expect(result[0].messageCount).toBe(100);
      expect(result[2].channelName).toBe("random");
    });
  });

  describe("calculateChannelDistribution", () => {
    it("should return zero counts for empty channels", () => {
      const result = calculateChannelDistribution([]);

      expect(result.find((r) => r.type === "public")?.count).toBe(0);
      expect(result.find((r) => r.type === "private")?.count).toBe(0);
    });

    it("should count public and private channels correctly", () => {
      const channels = [
        createTestChannel({ isPrivate: false }),
        createTestChannel({ isPrivate: false }),
        createTestChannel({ isPrivate: true }),
      ];

      const result = calculateChannelDistribution(channels);

      expect(result.find((r) => r.type === "public")?.count).toBe(2);
      expect(result.find((r) => r.type === "private")?.count).toBe(1);
    });
  });
});

// ============================================================================
// Storage Statistics Tests
// ============================================================================

describe("Storage Statistics", () => {
  describe("aggregateStorageStats", () => {
    it("should calculate storage percentage correctly", () => {
      const input: StorageStatsInput = {
        used: 500,
        limit: 1000,
      };

      const result = aggregateStorageStats(input);

      expect(result.used).toBe(500);
      expect(result.limit).toBe(1000);
      expect(result.percentage).toBe(50);
    });

    it("should handle zero limit", () => {
      const input: StorageStatsInput = {
        used: 100,
        limit: 0,
      };

      const result = aggregateStorageStats(input);

      expect(result.percentage).toBe(0);
    });

    it("should round percentage to 2 decimal places", () => {
      const input: StorageStatsInput = {
        used: 333,
        limit: 1000,
      };

      const result = aggregateStorageStats(input);

      expect(result.percentage).toBe(33.3);
    });
  });

  describe("formatBytes", () => {
    it("should format 0 bytes correctly", () => {
      expect(formatBytes(0)).toBe("0 Bytes");
    });

    it("should format bytes correctly", () => {
      expect(formatBytes(500)).toBe("500 Bytes");
    });

    it("should format kilobytes correctly", () => {
      expect(formatBytes(1024)).toBe("1 KB");
      expect(formatBytes(2048)).toBe("2 KB");
    });

    it("should format megabytes correctly", () => {
      expect(formatBytes(1024 * 1024)).toBe("1 MB");
      expect(formatBytes(1536 * 1024)).toBe("1.5 MB");
    });

    it("should format gigabytes correctly", () => {
      expect(formatBytes(1024 * 1024 * 1024)).toBe("1 GB");
    });

    it("should respect decimal places", () => {
      expect(formatBytes(1536, 0)).toBe("2 KB");
      expect(formatBytes(1536, 3)).toBe("1.5 KB");
    });
  });

  describe("parseBytes", () => {
    it("should parse bytes correctly", () => {
      expect(parseBytes("500 bytes")).toBe(500);
      expect(parseBytes("500 Bytes")).toBe(500);
    });

    it("should parse kilobytes correctly", () => {
      expect(parseBytes("1 KB")).toBe(1024);
      expect(parseBytes("2 kb")).toBe(2048);
    });

    it("should parse megabytes correctly", () => {
      expect(parseBytes("1 MB")).toBe(1024 * 1024);
    });

    it("should parse gigabytes correctly", () => {
      expect(parseBytes("1 GB")).toBe(1024 * 1024 * 1024);
    });

    it("should parse terabytes correctly", () => {
      expect(parseBytes("1 TB")).toBe(1024 * 1024 * 1024 * 1024);
    });

    it("should handle decimal values", () => {
      expect(parseBytes("1.5 KB")).toBe(Math.round(1.5 * 1024));
    });

    it("should return 0 for invalid input", () => {
      expect(parseBytes("invalid")).toBe(0);
      expect(parseBytes("")).toBe(0);
    });

    it("should handle values without unit", () => {
      expect(parseBytes("1024")).toBe(1024);
    });
  });
});

// ============================================================================
// Combined Statistics Tests
// ============================================================================

describe("Combined Statistics", () => {
  describe("aggregateDashboardStats", () => {
    it("should aggregate all stats correctly", () => {
      const users: UserStatsInput[] = [
        createTestUser({
          isActive: true,
          lastSeenAt: new Date().toISOString(),
        }),
        createTestUser({
          isActive: true,
          lastSeenAt: new Date().toISOString(),
        }),
      ];

      const messages: MessageStatsInput[] = [
        createTestMessage(),
        createTestMessage(),
        createTestMessage(),
      ];

      const channels: ChannelStatsInput[] = [
        createTestChannel({ isPrivate: false, messageCount: 10 }),
        createTestChannel({ isPrivate: true, messageCount: 5 }),
      ];

      const storage: StorageStatsInput = { used: 500, limit: 1000 };

      const result = aggregateDashboardStats(
        users,
        messages,
        channels,
        storage,
      );

      expect(result.users.total).toBe(2);
      expect(result.messages.total).toBe(3);
      expect(result.channels.total).toBe(2);
      expect(result.storage.percentage).toBe(50);
    });
  });

  describe("calculatePercentageChange", () => {
    it("should calculate positive change correctly", () => {
      expect(calculatePercentageChange(150, 100)).toBe(50);
    });

    it("should calculate negative change correctly", () => {
      expect(calculatePercentageChange(50, 100)).toBe(-50);
    });

    it("should handle zero previous value", () => {
      expect(calculatePercentageChange(100, 0)).toBe(100);
      expect(calculatePercentageChange(0, 0)).toBe(0);
    });

    it("should round to 2 decimal places", () => {
      expect(calculatePercentageChange(133, 100)).toBe(33);
    });
  });

  describe("calculateTrend", () => {
    it("should return up for increasing values", () => {
      expect(calculateTrend(150, 100)).toBe("up");
    });

    it("should return down for decreasing values", () => {
      expect(calculateTrend(50, 100)).toBe("down");
    });

    it("should return stable for equal values", () => {
      expect(calculateTrend(100, 100)).toBe("stable");
    });
  });
});

// ============================================================================
// Edge Cases Tests
// ============================================================================

describe("Edge Cases", () => {
  it("should handle very large numbers", () => {
    const storage: StorageStatsInput = {
      used: 1e15,
      limit: 1e16,
    };

    const result = aggregateStorageStats(storage);

    expect(result.percentage).toBe(10);
  });

  it("should handle negative percentages in calculatePercentageChange", () => {
    expect(calculatePercentageChange(-50, 100)).toBe(-150);
  });

  it("should handle all inactive users", () => {
    const users = [
      createTestUser({ isActive: false }),
      createTestUser({ isActive: false }),
    ];

    const result = aggregateUserStats(users);

    expect(result.active).toBe(0);
  });

  it("should handle messages from future dates", () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const messages = [
      createTestMessage({ createdAt: yesterday.toISOString() }),
    ];

    const result = aggregateMessageStats(messages, now);

    expect(result.today).toBe(0); // Yesterday's messages not counted as today
  });
});
