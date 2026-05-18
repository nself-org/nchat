/**
 * Cost Tracker Tests
 * Tests for AI cost tracking and budget management
 */

import {
  CostTracker,
  getCostTracker,
  resetCostTracker,
  MODEL_PRICING,
  type TokenUsage,
  type BudgetAlert,
} from "../cost-tracker";

// ============================================================================
// Mock Redis Cache
// ============================================================================

const mockCache = {
  data: new Map<string, any>(),

  async get<T>(key: string): Promise<T | null> {
    return this.data.get(key) ?? null;
  },

  async set(key: string, value: any, ttl?: number): Promise<void> {
    this.data.set(key, value);
  },

  async del(key: string): Promise<void> {
    this.data.delete(key);
  },

  async deletePattern(pattern: string): Promise<number> {
    const regex = new RegExp(pattern.replace(/\*/g, ".*"));
    let count = 0;
    for (const key of this.data.keys()) {
      if (regex.test(key)) {
        this.data.delete(key);
        count++;
      }
    }
    return count;
  },

  async incr(key: string, ttl?: number): Promise<number> {
    const current = this.data.get(key) || 0;
    const newValue = current + 1;
    this.data.set(key, newValue);
    return newValue;
  },

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp(pattern.replace(/\*/g, ".*"));
    return Array.from(this.data.keys()).filter((key) => regex.test(key));
  },

  clear() {
    this.data.clear();
  },
};

jest.mock("@/lib/redis-cache", () => ({
  getCache: () => mockCache,
}));

jest.mock("@/lib/sentry-utils", () => ({
  captureError: jest.fn(),
  addSentryBreadcrumb: jest.fn(),
}));

// ============================================================================
// Tests
// ============================================================================

describe("CostTracker", () => {
  let tracker: CostTracker;

  beforeEach(() => {
    mockCache.clear();
    resetCostTracker();
    tracker = getCostTracker();
  });

  describe("Cost Calculation", () => {
    it("should calculate cost for GPT-4o-mini", () => {
      const tokens: TokenUsage = {
        inputTokens: 1000,
        outputTokens: 500,
        totalTokens: 1500,
      };

      const cost = tracker.calculateCost("gpt-4o-mini", tokens);

      expect(cost.inputCost).toBeCloseTo(0.00015);
      expect(cost.outputCost).toBeCloseTo(0.0003);
      expect(cost.totalCost).toBeCloseTo(0.00045);
      expect(cost.tokens).toEqual(tokens);
    });

    it("should calculate cost for Claude 3.5 Sonnet", () => {
      const tokens: TokenUsage = {
        inputTokens: 1000,
        outputTokens: 500,
        totalTokens: 1500,
      };

      const cost = tracker.calculateCost("claude-3-5-sonnet-20241022", tokens);

      expect(cost.inputCost).toBeCloseTo(0.003);
      expect(cost.outputCost).toBeCloseTo(0.0075);
      expect(cost.totalCost).toBeCloseTo(0.0105);
    });

    it("should handle unknown models gracefully", () => {
      const tokens: TokenUsage = {
        inputTokens: 1000,
        outputTokens: 500,
        totalTokens: 1500,
      };

      const cost = tracker.calculateCost("unknown-model", tokens);

      expect(cost.inputCost).toBe(0);
      expect(cost.outputCost).toBe(0);
      expect(cost.totalCost).toBe(0);
    });

    it("should round costs to 6 decimal places", () => {
      const tokens: TokenUsage = {
        inputTokens: 333,
        outputTokens: 666,
        totalTokens: 999,
      };

      const cost = tracker.calculateCost("gpt-4o-mini", tokens);

      expect(cost.inputCost.toString()).toMatch(/^\d+\.\d{1,6}$/);
      expect(cost.outputCost.toString()).toMatch(/^\d+\.\d{1,6}$/);
      expect(cost.totalCost.toString()).toMatch(/^\d+\.\d{1,6}$/);
    });

    it("should handle embedding models (no output cost)", () => {
      const tokens: TokenUsage = {
        inputTokens: 1000,
        outputTokens: 0,
        totalTokens: 1000,
      };

      const cost = tracker.calculateCost("text-embedding-3-small", tokens);

      expect(cost.inputCost).toBeCloseTo(0.00002);
      expect(cost.outputCost).toBe(0);
      expect(cost.totalCost).toBeCloseTo(0.00002);
    });
  });

  describe("Usage Tracking", () => {
    it("should track usage with all metadata", async () => {
      const tokens: TokenUsage = {
        inputTokens: 500,
        outputTokens: 250,
        totalTokens: 750,
      };

      const record = await tracker.trackUsage(
        "summarize",
        "gpt-4o-mini",
        tokens,
        {
          userId: "user-123",
          orgId: "org-456",
          requestId: "req-789",
          metadata: { channelId: "channel-1" },
        },
      );

      expect(record.id).toBeTruthy();
      expect(record.endpoint).toBe("summarize");
      expect(record.model).toBe("gpt-4o-mini");
      expect(record.provider).toBe("openai");
      expect(record.userId).toBe("user-123");
      expect(record.orgId).toBe("org-456");
      expect(record.requestId).toBe("req-789");
      expect(record.tokens).toEqual(tokens);
      expect(record.cost.totalCost).toBeGreaterThan(0);
      expect(record.metadata).toEqual({ channelId: "channel-1" });
    });

    it("should track usage without optional fields", async () => {
      const tokens: TokenUsage = {
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
      };

      const record = await tracker.trackUsage("chat", "gpt-3.5-turbo", tokens);

      expect(record.id).toBeTruthy();
      expect(record.userId).toBeUndefined();
      expect(record.orgId).toBeUndefined();
      expect(record.requestId).toBeUndefined();
      expect(record.metadata).toBeUndefined();
    });

    it("should determine correct provider from model", async () => {
      const tokens: TokenUsage = {
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
      };

      const openaiRecord = await tracker.trackUsage("test", "gpt-4o", tokens);
      const anthropicRecord = await tracker.trackUsage(
        "test",
        "claude-3-5-haiku-20241022",
        tokens,
      );

      expect(openaiRecord.provider).toBe("openai");
      expect(anthropicRecord.provider).toBe("anthropic");
    });
  });

  describe("Budget Management", () => {
    it("should create budget alert", async () => {
      const alert = await tracker.createBudgetAlert({
        name: "Monthly Budget",
        limit: 100,
        period: "monthly",
        notifyAt: [50, 75, 90, 100],
        enabled: true,
      });

      expect(alert.id).toBeTruthy();
      expect(alert.name).toBe("Monthly Budget");
      expect(alert.limit).toBe(100);
      expect(alert.period).toBe("monthly");
      expect(alert.notifyAt).toEqual([50, 75, 90, 100]);
      expect(alert.enabled).toBe(true);
    });

    it("should create user-specific budget alert", async () => {
      const alert = await tracker.createBudgetAlert({
        name: "User Budget",
        userId: "user-123",
        limit: 10,
        period: "daily",
        notifyAt: [80, 100],
        enabled: true,
      });

      expect(alert.userId).toBe("user-123");
    });

    it("should create org-specific budget alert", async () => {
      const alert = await tracker.createBudgetAlert({
        name: "Org Budget",
        orgId: "org-456",
        limit: 500,
        period: "monthly",
        notifyAt: [90, 100],
        enabled: true,
      });

      expect(alert.orgId).toBe("org-456");
    });

    it("should get budget status", async () => {
      const alert = await tracker.createBudgetAlert({
        name: "Test Budget",
        limit: 100,
        period: "daily",
        notifyAt: [50, 75, 100],
        enabled: true,
      });

      const status = await tracker.getBudgetStatus(alert.id);

      expect(status).toBeTruthy();
      expect(status!.alert).toEqual(alert);
      expect(status!.currentSpending).toBe(0);
      expect(status!.percentUsed).toBe(0);
      expect(status!.remaining).toBe(100);
      expect(status!.exceeded).toBe(false);
    });

    it("should return null for disabled budget", async () => {
      const alert = await tracker.createBudgetAlert({
        name: "Disabled Budget",
        limit: 100,
        period: "daily",
        notifyAt: [100],
        enabled: false,
      });

      const status = await tracker.getBudgetStatus(alert.id);

      expect(status).toBeNull();
    });

    it("should get all budget statuses", async () => {
      await tracker.createBudgetAlert({
        name: "Alert 1",
        limit: 100,
        period: "daily",
        notifyAt: [100],
        enabled: true,
      });

      await tracker.createBudgetAlert({
        name: "Alert 2",
        userId: "user-123",
        limit: 50,
        period: "daily",
        notifyAt: [100],
        enabled: true,
      });

      const allStatuses = await tracker.getAllBudgetStatuses();
      const userStatuses = await tracker.getAllBudgetStatuses("user-123");

      expect(allStatuses.length).toBeGreaterThanOrEqual(2);
      expect(userStatuses.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Reporting", () => {
    it("should generate daily report", async () => {
      const today = new Date();
      const report = await tracker.getDailyReport(today);

      expect(report).toBeTruthy();
      expect(report.totalRequests).toBeDefined();
      expect(report.totalTokens).toBeDefined();
      expect(report.totalCost).toBeDefined();
      expect(report.byModel).toBeDefined();
      expect(report.byEndpoint).toBeDefined();
    });

    it("should generate daily report for user", async () => {
      const today = new Date();
      const report = await tracker.getDailyReport(today, "user-123");

      expect(report).toBeTruthy();
    });

    it("should generate daily report for org", async () => {
      const today = new Date();
      const report = await tracker.getDailyReport(today, undefined, "org-456");

      expect(report).toBeTruthy();
    });

    it("should generate monthly report", async () => {
      const report = await tracker.getMonthlyReport(2026, 1);

      expect(report).toBeTruthy();
      expect(report.totalRequests).toBeDefined();
      expect(report.totalTokens).toBeDefined();
      expect(report.totalCost).toBeDefined();
    });

    it("should generate monthly report for user", async () => {
      const report = await tracker.getMonthlyReport(2026, 1, "user-123");

      expect(report).toBeTruthy();
    });

    it("should get top users", async () => {
      const startDate = new Date("2026-01-01");
      const endDate = new Date("2026-01-31");

      const topUsers = await tracker.getTopUsers(startDate, endDate, 10);

      expect(Array.isArray(topUsers)).toBe(true);
    });
  });

  describe("Model Pricing", () => {
    it("should have pricing for all OpenAI models", () => {
      const openAIModels = [
        "gpt-4-turbo",
        "gpt-4",
        "gpt-4o",
        "gpt-4o-mini",
        "gpt-3.5-turbo",
        "text-embedding-3-small",
        "text-embedding-3-large",
      ];

      openAIModels.forEach((model) => {
        expect(MODEL_PRICING[model]).toBeDefined();
        expect(MODEL_PRICING[model].provider).toBe("openai");
        expect(MODEL_PRICING[model].inputCostPer1k).toBeGreaterThanOrEqual(0);
        expect(MODEL_PRICING[model].outputCostPer1k).toBeGreaterThanOrEqual(0);
        expect(MODEL_PRICING[model].contextWindow).toBeGreaterThan(0);
      });
    });

    it("should have pricing for all Anthropic models", () => {
      const anthropicModels = [
        "claude-3-5-sonnet-20241022",
        "claude-3-5-haiku-20241022",
        "claude-3-opus-20240229",
        "claude-3-sonnet-20240229",
        "claude-3-haiku-20240307",
      ];

      anthropicModels.forEach((model) => {
        expect(MODEL_PRICING[model]).toBeDefined();
        expect(MODEL_PRICING[model].provider).toBe("anthropic");
        expect(MODEL_PRICING[model].inputCostPer1k).toBeGreaterThan(0);
        expect(MODEL_PRICING[model].outputCostPer1k).toBeGreaterThan(0);
        expect(MODEL_PRICING[model].contextWindow).toBeGreaterThan(0);
      });
    });

    it("should reflect reasonable pricing ratios", () => {
      // Output tokens should generally cost more than input tokens
      const models = Object.keys(MODEL_PRICING).filter(
        (m) => !m.includes("embedding"),
      );

      models.forEach((model) => {
        const pricing = MODEL_PRICING[model];
        if (pricing.outputCostPer1k > 0) {
          expect(pricing.outputCostPer1k).toBeGreaterThanOrEqual(
            pricing.inputCostPer1k,
          );
        }
      });
    });
  });

  describe("Singleton Pattern", () => {
    it("should return same instance", () => {
      const tracker1 = getCostTracker();
      const tracker2 = getCostTracker();

      expect(tracker1).toBe(tracker2);
    });

    it("should create new instance after reset", () => {
      const tracker1 = getCostTracker();
      resetCostTracker();
      const tracker2 = getCostTracker();

      expect(tracker1).not.toBe(tracker2);
    });
  });
});
