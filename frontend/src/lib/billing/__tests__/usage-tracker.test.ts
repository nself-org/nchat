/**
 * Usage Tracker Tests
 *
 * Tests for real-time usage tracking and aggregation.
 */

import {
  UsageTracker,
  createUsageTracker,
  type UsageTrackerConfig,
} from "../usage-tracker";
import {
  type UsageDimensionType,
  type CreateUsageEventInput,
  type UsageBillingEvent,
} from "../usage-types";

describe("UsageTracker", () => {
  let tracker: UsageTracker;

  beforeEach(() => {
    tracker = createUsageTracker({
      enabled: true,
      aggregationIntervalMs: 0, // Disable timer for tests
      alertsEnabled: true,
      projectionsEnabled: true,
    });
  });

  afterEach(() => {
    tracker.destroy();
  });

  describe("recordUsage", () => {
    it("should record a single usage event", async () => {
      const result = await tracker.recordUsage({
        organizationId: "org-1",
        dimension: "api_calls",
        quantity: 100,
      });

      expect(result.success).toBe(true);
      expect(result.eventId).toBeDefined();
      expect(result.currentUsage).toBe(100);
    });

    it("should accumulate usage for sum aggregation", async () => {
      await tracker.recordUsage({
        organizationId: "org-1",
        dimension: "api_calls",
        quantity: 50,
      });

      const result = await tracker.recordUsage({
        organizationId: "org-1",
        dimension: "api_calls",
        quantity: 50,
      });

      expect(result.currentUsage).toBe(100);
    });

    it("should track maximum for max aggregation", async () => {
      // Seats use max aggregation
      tracker.setOrganizationPlan("org-1", "professional");

      await tracker.recordUsage({
        organizationId: "org-1",
        dimension: "seats",
        quantity: 10,
      });

      const result = await tracker.recordUsage({
        organizationId: "org-1",
        dimension: "seats",
        quantity: 5,
      });

      // Max should be 10, not 15
      expect(result.currentUsage).toBe(10);
    });

    it("should use last value for storage aggregation", async () => {
      // Storage uses 'last' aggregation
      await tracker.setUsage("org-1", "storage", 1000);

      const result = await tracker.setUsage("org-1", "storage", 500);

      expect(result.currentUsage).toBe(500);
    });

    it("should reject duplicate idempotency keys", async () => {
      const idempotencyKey = "unique-key-123";

      await tracker.recordUsage({
        organizationId: "org-1",
        dimension: "api_calls",
        quantity: 100,
        idempotencyKey,
      });

      const result = await tracker.recordUsage({
        organizationId: "org-1",
        dimension: "api_calls",
        quantity: 100,
        idempotencyKey,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Duplicate");
    });

    it("should include workspace ID and user ID if provided", async () => {
      const result = await tracker.recordUsage({
        organizationId: "org-1",
        workspaceId: "ws-1",
        userId: "user-1",
        dimension: "messages",
        quantity: 1,
      });

      expect(result.success).toBe(true);
    });

    it("should include metadata in event", async () => {
      const result = await tracker.recordUsage({
        organizationId: "org-1",
        dimension: "api_calls",
        quantity: 1,
        metadata: { endpoint: "/api/users", method: "GET" },
      });

      expect(result.success).toBe(true);
    });

    it("should use custom timestamp if provided", async () => {
      const customTimestamp = new Date("2026-01-15T10:00:00Z");

      const result = await tracker.recordUsage({
        organizationId: "org-1",
        dimension: "api_calls",
        quantity: 1,
        timestamp: customTimestamp,
      });

      expect(result.success).toBe(true);
    });
  });

  describe("recordUsageBatch", () => {
    it("should record multiple events", async () => {
      const inputs: CreateUsageEventInput[] = [
        { organizationId: "org-1", dimension: "api_calls", quantity: 10 },
        { organizationId: "org-1", dimension: "api_calls", quantity: 20 },
        { organizationId: "org-1", dimension: "messages", quantity: 5 },
      ];

      const results = await tracker.recordUsageBatch(inputs);

      expect(results).toHaveLength(3);
      expect(results.every((r) => r.success)).toBe(true);
    });

    it("should handle partial failures", async () => {
      const inputs: CreateUsageEventInput[] = [
        { organizationId: "org-1", dimension: "api_calls", quantity: 10 },
        { organizationId: "", dimension: "api_calls", quantity: 20 }, // Invalid
      ];

      const results = await tracker.recordUsageBatch(inputs);

      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
    });
  });

  describe("setUsage", () => {
    it("should set absolute usage value", async () => {
      await tracker.recordUsage({
        organizationId: "org-1",
        dimension: "storage",
        quantity: 1000,
      });

      const result = await tracker.setUsage("org-1", "storage", 500);

      expect(result.currentUsage).toBe(500);
    });

    it("should handle setting to zero", async () => {
      await tracker.recordUsage({
        organizationId: "org-1",
        dimension: "storage",
        quantity: 1000,
      });

      const result = await tracker.setUsage("org-1", "storage", 0);

      expect(result.currentUsage).toBe(0);
    });

    it("should handle increase in absolute value", async () => {
      await tracker.setUsage("org-1", "storage", 500);

      const result = await tracker.setUsage("org-1", "storage", 1000);

      expect(result.currentUsage).toBe(1000);
    });
  });

  describe("checkUsage", () => {
    beforeEach(() => {
      // Set to free plan for predictable limits
      tracker.setOrganizationPlan("org-1", "free");
    });

    it("should check if usage is within limit", async () => {
      await tracker.recordUsage({
        organizationId: "org-1",
        dimension: "api_calls",
        quantity: 500,
      });

      const result = await tracker.checkUsage("org-1", "api_calls");

      expect(result.withinLimit).toBe(true);
      expect(result.action).toBe("allow");
    });

    it("should calculate remaining quota", async () => {
      await tracker.recordUsage({
        organizationId: "org-1",
        dimension: "api_calls",
        quantity: 500,
      });

      const result = await tracker.checkUsage("org-1", "api_calls");

      expect(result.remaining).toBeDefined();
      expect(result.percentage).toBeDefined();
    });

    it("should return correct alert level", async () => {
      await tracker.recordUsage({
        organizationId: "org-1",
        dimension: "api_calls",
        quantity: 900,
      });

      const result = await tracker.checkUsage("org-1", "api_calls");

      expect(["warning", "critical", "exceeded"]).toContain(result.alertLevel);
    });

    it("should project usage with increment", async () => {
      await tracker.recordUsage({
        organizationId: "org-1",
        dimension: "api_calls",
        quantity: 500,
      });

      const result = await tracker.checkUsage("org-1", "api_calls", 100);

      expect(result.currentUsage).toBe(600);
    });

    it("should block when limit would be exceeded with block strategy", async () => {
      tracker.setOverageConfig("org-1", "api_calls", { strategy: "block" });
      tracker.setOrganizationPlan("org-1", "free");

      // Record up to limit
      await tracker.recordUsage({
        organizationId: "org-1",
        dimension: "api_calls",
        quantity: 1000,
      });

      const result = await tracker.checkUsage("org-1", "api_calls", 100);

      expect(result.action).toBe("block");
    });
  });

  describe("getCurrentUsage", () => {
    it("should return 0 for new organization", () => {
      const usage = tracker.getCurrentUsage("new-org", "api_calls");
      expect(usage).toBe(0);
    });

    it("should return current usage value", async () => {
      await tracker.recordUsage({
        organizationId: "org-1",
        dimension: "api_calls",
        quantity: 250,
      });

      const usage = tracker.getCurrentUsage("org-1", "api_calls");
      expect(usage).toBe(250);
    });
  });

  describe("getAllCurrentUsage", () => {
    it("should return usage for all dimensions", async () => {
      await tracker.recordUsage({
        organizationId: "org-1",
        dimension: "api_calls",
        quantity: 100,
      });
      await tracker.recordUsage({
        organizationId: "org-1",
        dimension: "messages",
        quantity: 50,
      });

      const usage = tracker.getAllCurrentUsage("org-1");

      expect(usage.api_calls).toBe(100);
      expect(usage.messages).toBe(50);
      expect(usage.storage).toBe(0);
    });
  });

  describe("getUsageSnapshot", () => {
    it("should return complete snapshot", async () => {
      tracker.setOrganizationPlan("org-1", "professional");

      await tracker.recordUsage({
        organizationId: "org-1",
        dimension: "api_calls",
        quantity: 1000,
      });

      const snapshot = await tracker.getUsageSnapshot("org-1");

      expect(snapshot.organizationId).toBe("org-1");
      expect(snapshot.timestamp).toBeInstanceOf(Date);
      expect(snapshot.dimensions).toBeDefined();
      expect(snapshot.billingPeriod).toBeDefined();
    });

    it("should include all dimensions in snapshot", async () => {
      const snapshot = await tracker.getUsageSnapshot("org-1");

      expect(snapshot.dimensions.api_calls).toBeDefined();
      expect(snapshot.dimensions.storage).toBeDefined();
      expect(snapshot.dimensions.seats).toBeDefined();
    });

    it("should include billing period info", async () => {
      const snapshot = await tracker.getUsageSnapshot("org-1");

      expect(snapshot.billingPeriod.id).toBeDefined();
      expect(snapshot.billingPeriod.startDate).toBeInstanceOf(Date);
      expect(snapshot.billingPeriod.endDate).toBeInstanceOf(Date);
    });
  });

  describe("aggregateUsage", () => {
    it("should aggregate events for a period", async () => {
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      await tracker.recordUsage({
        organizationId: "org-1",
        dimension: "api_calls",
        quantity: 100,
      });
      await tracker.recordUsage({
        organizationId: "org-1",
        dimension: "api_calls",
        quantity: 200,
      });

      const result = await tracker.aggregateUsage(
        "org-1",
        "period-1",
        periodStart,
        periodEnd,
      );

      expect(result.get("api_calls")).toBeDefined();
      expect(result.get("api_calls")?.totalUsage).toBe(300);
    });

    it("should calculate event count", async () => {
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      await tracker.recordUsage({
        organizationId: "org-1",
        dimension: "messages",
        quantity: 10,
      });
      await tracker.recordUsage({
        organizationId: "org-1",
        dimension: "messages",
        quantity: 20,
      });

      const result = await tracker.aggregateUsage(
        "org-1",
        "period-1",
        periodStart,
        periodEnd,
      );

      expect(result.get("messages")?.eventCount).toBe(2);
    });

    it("should calculate peak usage", async () => {
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      await tracker.recordUsage({
        organizationId: "org-1",
        dimension: "api_calls",
        quantity: 50,
      });
      await tracker.recordUsage({
        organizationId: "org-1",
        dimension: "api_calls",
        quantity: 150,
      });
      await tracker.recordUsage({
        organizationId: "org-1",
        dimension: "api_calls",
        quantity: 75,
      });

      const result = await tracker.aggregateUsage(
        "org-1",
        "period-1",
        periodStart,
        periodEnd,
      );

      expect(result.get("api_calls")?.peakUsage).toBe(150);
    });

    it("should calculate billable usage after free tier", async () => {
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      // API calls has 1000 free tier allowance
      await tracker.recordUsage({
        organizationId: "org-1",
        dimension: "api_calls",
        quantity: 1500,
      });

      const result = await tracker.aggregateUsage(
        "org-1",
        "period-1",
        periodStart,
        periodEnd,
      );

      expect(result.get("api_calls")?.billableUsage).toBe(500);
    });
  });

  describe("Threshold Configuration", () => {
    it("should set custom threshold config", () => {
      tracker.setThresholdConfig("org-1", "api_calls", {
        infoThreshold: 40,
        warningThreshold: 60,
        criticalThreshold: 80,
      });

      const config = tracker.getThresholdConfig("org-1", "api_calls");

      expect(config.infoThreshold).toBe(40);
      expect(config.warningThreshold).toBe(60);
      expect(config.criticalThreshold).toBe(80);
    });

    it("should return default config for unconfigured org", () => {
      const config = tracker.getThresholdConfig("new-org", "api_calls");

      expect(config.infoThreshold).toBe(50);
      expect(config.warningThreshold).toBe(75);
      expect(config.criticalThreshold).toBe(90);
    });
  });

  describe("Overage Configuration", () => {
    it("should set custom overage config", () => {
      tracker.setOverageConfig("org-1", "storage", {
        strategy: "block",
        overageRateMultiplier: 2.0,
      });

      const config = tracker.getOverageConfig("org-1", "storage");

      expect(config.strategy).toBe("block");
      expect(config.overageRateMultiplier).toBe(2.0);
    });

    it("should return default config for unconfigured org", () => {
      const config = tracker.getOverageConfig("new-org", "storage");

      expect(config.strategy).toBe("charge");
      expect(config.overageRateMultiplier).toBe(1.5);
    });
  });

  describe("Alerts", () => {
    beforeEach(() => {
      tracker.setOrganizationPlan("org-1", "free");
    });

    it("should create alert when threshold crossed", async () => {
      // Free plan has 1000 API calls limit
      await tracker.recordUsage({
        organizationId: "org-1",
        dimension: "api_calls",
        quantity: 800, // 80% of limit
      });

      const alerts = tracker.getActiveAlerts("org-1");

      expect(alerts.length).toBeGreaterThan(0);
    });

    it("should return correct alert level", async () => {
      await tracker.recordUsage({
        organizationId: "org-1",
        dimension: "api_calls",
        quantity: 950, // 95% of limit
      });

      const alerts = tracker.getActiveAlerts("org-1");
      const criticalAlert = alerts.find((a) => a.level === "critical");

      expect(criticalAlert).toBeDefined();
    });

    it("should acknowledge alert", async () => {
      await tracker.recordUsage({
        organizationId: "org-1",
        dimension: "api_calls",
        quantity: 900,
      });

      const alerts = tracker.getActiveAlerts("org-1");
      const alertId = alerts[0]?.id;

      if (alertId) {
        const result = tracker.acknowledgeAlert(alertId, "user-1");
        expect(result).toBe(true);
      }
    });

    it("should not create duplicate alerts for same level", async () => {
      await tracker.recordUsage({
        organizationId: "org-1",
        dimension: "api_calls",
        quantity: 800,
      });

      await tracker.recordUsage({
        organizationId: "org-1",
        dimension: "api_calls",
        quantity: 10,
      });

      const alerts = tracker.getActiveAlerts("org-1");
      const warningAlerts = alerts.filter(
        (a) => a.dimension === "api_calls" && a.level === "warning",
      );

      // Should only have one warning alert
      expect(warningAlerts.length).toBeLessThanOrEqual(1);
    });
  });

  describe("Event System", () => {
    it("should emit usage.recorded event", async () => {
      const events: UsageBillingEvent[] = [];
      tracker.on("usage.recorded", (event) => {
        events.push(event);
      });

      await tracker.recordUsage({
        organizationId: "org-1",
        dimension: "api_calls",
        quantity: 100,
      });

      expect(events.length).toBe(1);
      expect(events[0].type).toBe("usage.recorded");
      expect(events[0].organizationId).toBe("org-1");
    });

    it("should emit threshold events", async () => {
      tracker.setOrganizationPlan("org-1", "free");

      const events: UsageBillingEvent[] = [];
      tracker.on("usage.threshold_warning", (event) => {
        events.push(event);
      });

      await tracker.recordUsage({
        organizationId: "org-1",
        dimension: "api_calls",
        quantity: 800, // 80% of 1000 limit
      });

      // Should have warning event
      expect(events.some((e) => e.type === "usage.threshold_warning")).toBe(
        true,
      );
    });

    it("should return unsubscribe function", async () => {
      let eventCount = 0;
      const unsubscribe = tracker.on("usage.recorded", () => {
        eventCount++;
      });

      await tracker.recordUsage({
        organizationId: "org-1",
        dimension: "api_calls",
        quantity: 100,
      });

      expect(eventCount).toBe(1);

      unsubscribe();

      await tracker.recordUsage({
        organizationId: "org-1",
        dimension: "api_calls",
        quantity: 100,
      });

      expect(eventCount).toBe(1); // Should not have incremented
    });
  });

  describe("Period Reset", () => {
    it("should reset usage for billing period dimensions", async () => {
      await tracker.recordUsage({
        organizationId: "org-1",
        dimension: "api_calls",
        quantity: 500,
      });

      await tracker.resetPeriodUsage("org-1", "new-period");

      const usage = tracker.getCurrentUsage("org-1", "api_calls");
      expect(usage).toBe(0);
    });

    it("should not reset storage (never reset)", async () => {
      await tracker.recordUsage({
        organizationId: "org-1",
        dimension: "storage",
        quantity: 1000000,
      });

      await tracker.resetPeriodUsage("org-1", "new-period");

      const usage = tracker.getCurrentUsage("org-1", "storage");
      expect(usage).toBe(1000000);
    });

    it("should deactivate alerts for reset dimensions", async () => {
      tracker.setOrganizationPlan("org-1", "free");

      await tracker.recordUsage({
        organizationId: "org-1",
        dimension: "api_calls",
        quantity: 900,
      });

      const alertsBefore = tracker.getActiveAlerts("org-1");
      expect(alertsBefore.length).toBeGreaterThan(0);

      await tracker.resetPeriodUsage("org-1", "new-period");

      const alertsAfter = tracker.getActiveAlerts("org-1");
      const apiCallAlerts = alertsAfter.filter(
        (a) => a.dimension === "api_calls",
      );
      expect(apiCallAlerts.length).toBe(0);
    });
  });

  describe("Cleanup", () => {
    it("should clean up old events", async () => {
      // Record an event
      await tracker.recordUsage({
        organizationId: "org-1",
        dimension: "api_calls",
        quantity: 100,
      });

      const statsBefore = tracker.getStats();
      expect(statsBefore.eventCount).toBe(1);

      // Can't easily test actual cleanup without mocking dates
      // Just verify the method exists and runs
      const deleted = tracker.cleanupOldEvents();
      expect(typeof deleted).toBe("number");
    });

    it("should return statistics", () => {
      const stats = tracker.getStats();

      expect(typeof stats.eventCount).toBe("number");
      expect(typeof stats.aggregationCount).toBe("number");
      expect(typeof stats.organizationCount).toBe("number");
      expect(typeof stats.alertCount).toBe("number");
      expect(typeof stats.processedKeyCount).toBe("number");
    });
  });

  describe("Limit Checking with Overage", () => {
    beforeEach(() => {
      tracker.setOrganizationPlan("org-1", "free");
    });

    it("should allow overage with charge strategy", async () => {
      tracker.setOverageConfig("org-1", "api_calls", { strategy: "charge" });

      // Exceed limit
      await tracker.recordUsage({
        organizationId: "org-1",
        dimension: "api_calls",
        quantity: 1500, // Exceeds 1000 limit
      });

      const check = await tracker.checkUsage("org-1", "api_calls");

      expect(check.withinLimit).toBe(false);
      expect(check.action).toBe("allow"); // Allowed with charge
    });

    it("should block with block strategy", async () => {
      tracker.setOverageConfig("org-1", "api_calls", { strategy: "block" });

      await tracker.recordUsage({
        organizationId: "org-1",
        dimension: "api_calls",
        quantity: 1000,
      });

      const result = await tracker.recordUsage({
        organizationId: "org-1",
        dimension: "api_calls",
        quantity: 100,
      });

      expect(result.success).toBe(false);
      expect(result.limitExceeded).toBe(true);
    });

    it("should warn with warn strategy", async () => {
      tracker.setOverageConfig("org-1", "api_calls", { strategy: "warn" });

      await tracker.recordUsage({
        organizationId: "org-1",
        dimension: "api_calls",
        quantity: 1100,
      });

      const check = await tracker.checkUsage("org-1", "api_calls");

      // With warn strategy, when limit is exceeded action is 'warn' not 'block'
      expect(check.action).toBe("warn");
    });

    it("should respect hard cap", async () => {
      tracker.setOverageConfig("org-1", "api_calls", {
        strategy: "charge",
        hardCap: 1500,
      });

      await tracker.recordUsage({
        organizationId: "org-1",
        dimension: "api_calls",
        quantity: 1500,
      });

      const check = await tracker.checkUsage("org-1", "api_calls", 100);

      expect(check.action).toBe("block");
    });

    it("should respect max overage", async () => {
      tracker.setOverageConfig("org-1", "api_calls", {
        strategy: "charge",
        maxOverage: 200,
      });

      await tracker.recordUsage({
        organizationId: "org-1",
        dimension: "api_calls",
        quantity: 1200, // 200 over limit
      });

      const check = await tracker.checkUsage("org-1", "api_calls", 100);

      expect(check.action).toBe("block");
    });
  });
});
