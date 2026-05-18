/**
 * Retention Types Tests
 *
 * Tests for retention type definitions and utility functions.
 *
 * @module lib/retention/__tests__/retention-types.test
 * @version 1.0.0
 */

import {
  periodToMilliseconds,
  calculateExpirationDate,
  isExpired,
  formatRetentionPeriod,
  parseRetentionPeriod,
  isItemCoveredByLegalHold,
  generateRetentionId,
  createDefaultRule,
  createUniformRules,
  type RetentionPeriod,
  type LegalHold,
  ALL_CONTENT_TYPES,
  SCOPE_PRIORITY,
} from "../retention-types";

describe("RetentionTypes", () => {
  // ============================================================================
  // Period Conversion Tests
  // ============================================================================

  describe("periodToMilliseconds", () => {
    it("converts hours correctly", () => {
      const period: RetentionPeriod = { value: 24, unit: "hours" };
      expect(periodToMilliseconds(period)).toBe(24 * 60 * 60 * 1000);
    });

    it("converts days correctly", () => {
      const period: RetentionPeriod = { value: 7, unit: "days" };
      expect(periodToMilliseconds(period)).toBe(7 * 24 * 60 * 60 * 1000);
    });

    it("converts weeks correctly", () => {
      const period: RetentionPeriod = { value: 2, unit: "weeks" };
      expect(periodToMilliseconds(period)).toBe(14 * 24 * 60 * 60 * 1000);
    });

    it("converts months correctly (30-day approximation)", () => {
      const period: RetentionPeriod = { value: 1, unit: "months" };
      expect(periodToMilliseconds(period)).toBe(30 * 24 * 60 * 60 * 1000);
    });

    it("converts years correctly (365-day approximation)", () => {
      const period: RetentionPeriod = { value: 1, unit: "years" };
      expect(periodToMilliseconds(period)).toBe(365 * 24 * 60 * 60 * 1000);
    });

    it("handles zero values", () => {
      const period: RetentionPeriod = { value: 0, unit: "days" };
      expect(periodToMilliseconds(period)).toBe(0);
    });

    it("handles large values", () => {
      const period: RetentionPeriod = { value: 100, unit: "years" };
      expect(periodToMilliseconds(period)).toBe(
        100 * 365 * 24 * 60 * 60 * 1000,
      );
    });
  });

  describe("calculateExpirationDate", () => {
    it("calculates expiration date correctly", () => {
      const fromDate = new Date("2024-01-01T00:00:00Z");
      const period: RetentionPeriod = { value: 30, unit: "days" };
      const expiration = calculateExpirationDate(fromDate, period);

      expect(expiration.getTime()).toBe(
        fromDate.getTime() + 30 * 24 * 60 * 60 * 1000,
      );
    });

    it("handles different time units", () => {
      const fromDate = new Date("2024-01-01T00:00:00Z");

      const hourExpiration = calculateExpirationDate(fromDate, {
        value: 1,
        unit: "hours",
      });
      expect(hourExpiration.getTime() - fromDate.getTime()).toBe(
        60 * 60 * 1000,
      );

      const weekExpiration = calculateExpirationDate(fromDate, {
        value: 1,
        unit: "weeks",
      });
      expect(weekExpiration.getTime() - fromDate.getTime()).toBe(
        7 * 24 * 60 * 60 * 1000,
      );
    });
  });

  describe("isExpired", () => {
    it("returns true for expired dates", () => {
      const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000); // 100 days ago
      const period: RetentionPeriod = { value: 30, unit: "days" };
      expect(isExpired(oldDate, period)).toBe(true);
    });

    it("returns false for non-expired dates", () => {
      const recentDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
      const period: RetentionPeriod = { value: 30, unit: "days" };
      expect(isExpired(recentDate, period)).toBe(false);
    });

    it("handles edge case of past date with zero period", () => {
      // A date slightly in the past with zero period should be expired
      const pastDate = new Date(Date.now() - 1000); // 1 second ago
      const period: RetentionPeriod = { value: 0, unit: "days" };
      expect(isExpired(pastDate, period)).toBe(true);
    });
  });

  // ============================================================================
  // Period Formatting Tests
  // ============================================================================

  describe("formatRetentionPeriod", () => {
    it("formats singular periods correctly", () => {
      expect(formatRetentionPeriod({ value: 1, unit: "days" })).toBe("1 day");
      expect(formatRetentionPeriod({ value: 1, unit: "hours" })).toBe("1 hour");
      expect(formatRetentionPeriod({ value: 1, unit: "weeks" })).toBe("1 week");
      expect(formatRetentionPeriod({ value: 1, unit: "months" })).toBe(
        "1 month",
      );
      expect(formatRetentionPeriod({ value: 1, unit: "years" })).toBe("1 year");
    });

    it("formats plural periods correctly", () => {
      expect(formatRetentionPeriod({ value: 30, unit: "days" })).toBe(
        "30 days",
      );
      expect(formatRetentionPeriod({ value: 24, unit: "hours" })).toBe(
        "24 hours",
      );
      expect(formatRetentionPeriod({ value: 2, unit: "weeks" })).toBe(
        "2 weeks",
      );
      expect(formatRetentionPeriod({ value: 6, unit: "months" })).toBe(
        "6 months",
      );
      expect(formatRetentionPeriod({ value: 5, unit: "years" })).toBe(
        "5 years",
      );
    });
  });

  describe("parseRetentionPeriod", () => {
    it("parses valid period strings", () => {
      expect(parseRetentionPeriod("30 days")).toEqual({
        value: 30,
        unit: "days",
      });
      expect(parseRetentionPeriod("1 day")).toEqual({ value: 1, unit: "days" });
      expect(parseRetentionPeriod("24 hours")).toEqual({
        value: 24,
        unit: "hours",
      });
      expect(parseRetentionPeriod("1 hour")).toEqual({
        value: 1,
        unit: "hours",
      });
      expect(parseRetentionPeriod("2 weeks")).toEqual({
        value: 2,
        unit: "weeks",
      });
      expect(parseRetentionPeriod("6 months")).toEqual({
        value: 6,
        unit: "months",
      });
      expect(parseRetentionPeriod("1 year")).toEqual({
        value: 1,
        unit: "years",
      });
    });

    it("returns null for invalid strings", () => {
      expect(parseRetentionPeriod("invalid")).toBeNull();
      expect(parseRetentionPeriod("30")).toBeNull();
      expect(parseRetentionPeriod("days 30")).toBeNull();
      expect(parseRetentionPeriod("")).toBeNull();
      expect(parseRetentionPeriod("30 centuries")).toBeNull();
    });

    it("handles case insensitivity", () => {
      expect(parseRetentionPeriod("30 DAYS")).toEqual({
        value: 30,
        unit: "days",
      });
      expect(parseRetentionPeriod("1 DAY")).toEqual({ value: 1, unit: "days" });
    });
  });

  // ============================================================================
  // Legal Hold Coverage Tests
  // ============================================================================

  describe("isItemCoveredByLegalHold", () => {
    const baseHold: LegalHold = {
      id: "lh_test",
      name: "Test Hold",
      description: "Test",
      matterReference: "CASE-001",
      scope: {
        userIds: [],
        channelIds: [],
        workspaceIds: [],
        contentTypes: [],
      },
      status: "active",
      createdBy: "user1",
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    };

    const baseItem = {
      userId: "user1",
      channelId: "channel1",
      workspaceId: "workspace1",
      contentType: "messages" as const,
      createdAt: new Date("2024-02-01"),
    };

    it("covers item when hold is active and scope is empty (all)", () => {
      expect(isItemCoveredByLegalHold(baseHold, baseItem)).toBe(true);
    });

    it("does not cover item when hold is not active", () => {
      const releasedHold = { ...baseHold, status: "released" as const };
      expect(isItemCoveredByLegalHold(releasedHold, baseItem)).toBe(false);
    });

    it("covers item when user is in scope", () => {
      const hold = {
        ...baseHold,
        scope: { ...baseHold.scope, userIds: ["user1"] },
      };
      expect(isItemCoveredByLegalHold(hold, baseItem)).toBe(true);
    });

    it("does not cover item when user is not in scope", () => {
      const hold = {
        ...baseHold,
        scope: { ...baseHold.scope, userIds: ["user2"] },
      };
      expect(isItemCoveredByLegalHold(hold, baseItem)).toBe(false);
    });

    it("covers item when channel is in scope", () => {
      const hold = {
        ...baseHold,
        scope: { ...baseHold.scope, channelIds: ["channel1"] },
      };
      expect(isItemCoveredByLegalHold(hold, baseItem)).toBe(true);
    });

    it("does not cover item when channel is not in scope", () => {
      const hold = {
        ...baseHold,
        scope: { ...baseHold.scope, channelIds: ["channel2"] },
      };
      expect(isItemCoveredByLegalHold(hold, baseItem)).toBe(false);
    });

    it("covers item when content type is in scope", () => {
      const hold = {
        ...baseHold,
        scope: { ...baseHold.scope, contentTypes: ["messages" as const] },
      };
      expect(isItemCoveredByLegalHold(hold, baseItem)).toBe(true);
    });

    it("does not cover item when content type is not in scope", () => {
      const hold = {
        ...baseHold,
        scope: { ...baseHold.scope, contentTypes: ["attachments" as const] },
      };
      expect(isItemCoveredByLegalHold(hold, baseItem)).toBe(false);
    });

    it("respects date range - item within range", () => {
      const hold = {
        ...baseHold,
        scope: {
          ...baseHold.scope,
          startDate: new Date("2024-01-01"),
          endDate: new Date("2024-12-31"),
        },
      };
      expect(isItemCoveredByLegalHold(hold, baseItem)).toBe(true);
    });

    it("does not cover item before start date", () => {
      const hold = {
        ...baseHold,
        scope: {
          ...baseHold.scope,
          startDate: new Date("2024-03-01"),
        },
      };
      expect(isItemCoveredByLegalHold(hold, baseItem)).toBe(false);
    });

    it("does not cover item after end date", () => {
      const hold = {
        ...baseHold,
        scope: {
          ...baseHold.scope,
          endDate: new Date("2024-01-15"),
        },
      };
      expect(isItemCoveredByLegalHold(hold, baseItem)).toBe(false);
    });
  });

  // ============================================================================
  // ID Generation Tests
  // ============================================================================

  describe("generateRetentionId", () => {
    it("generates unique IDs", () => {
      const id1 = generateRetentionId("pol");
      const id2 = generateRetentionId("pol");
      expect(id1).not.toBe(id2);
    });

    it("includes prefix in generated ID", () => {
      const id = generateRetentionId("test");
      expect(id.startsWith("test_")).toBe(true);
    });

    it("generates valid format", () => {
      const id = generateRetentionId("lh");
      expect(id).toMatch(/^lh_[a-z0-9]+_[a-z0-9]+$/);
    });
  });

  // ============================================================================
  // Default Rule Creation Tests
  // ============================================================================

  describe("createDefaultRule", () => {
    it("creates rule with default values", () => {
      const rule = createDefaultRule("messages");

      expect(rule.contentType).toBe("messages");
      expect(rule.enabled).toBe(true);
      expect(rule.period).toEqual({ value: 365, unit: "days" });
      expect(rule.action).toBe("delete");
      expect(rule.gracePeriod?.enabled).toBe(true);
      expect(rule.gracePeriod?.duration).toEqual({ value: 30, unit: "days" });
    });

    it("creates rules for different content types", () => {
      for (const ct of ALL_CONTENT_TYPES) {
        const rule = createDefaultRule(ct);
        expect(rule.contentType).toBe(ct);
      }
    });
  });

  describe("createUniformRules", () => {
    it("creates rules for all content types", () => {
      const period: RetentionPeriod = { value: 90, unit: "days" };
      const rules = createUniformRules(period);

      expect(rules.length).toBe(ALL_CONTENT_TYPES.length);
      for (const rule of rules) {
        expect(rule.period).toEqual(period);
        expect(rule.action).toBe("delete");
        expect(rule.enabled).toBe(true);
      }
    });

    it("applies custom action", () => {
      const period: RetentionPeriod = { value: 90, unit: "days" };
      const rules = createUniformRules(period, "archive");

      for (const rule of rules) {
        expect(rule.action).toBe("archive");
      }
    });
  });

  // ============================================================================
  // Constants Tests
  // ============================================================================

  describe("SCOPE_PRIORITY", () => {
    it("has correct priority order", () => {
      expect(SCOPE_PRIORITY.global).toBeLessThan(SCOPE_PRIORITY.workspace);
      expect(SCOPE_PRIORITY.workspace).toBeLessThan(SCOPE_PRIORITY.channel);
      expect(SCOPE_PRIORITY.channel).toBeLessThan(SCOPE_PRIORITY.user);
    });
  });

  describe("ALL_CONTENT_TYPES", () => {
    it("includes all expected content types", () => {
      expect(ALL_CONTENT_TYPES).toContain("messages");
      expect(ALL_CONTENT_TYPES).toContain("attachments");
      expect(ALL_CONTENT_TYPES).toContain("threads");
      expect(ALL_CONTENT_TYPES).toContain("reactions");
      expect(ALL_CONTENT_TYPES).toContain("read_receipts");
      expect(ALL_CONTENT_TYPES).toContain("drafts");
      expect(ALL_CONTENT_TYPES).toContain("audit_logs");
    });
  });
});
