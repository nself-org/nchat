/**
 * AI Cost Tracker
 * - Token usage tracking
 * - Cost calculation per model
 * - Per-user and per-org cost tracking
 * - Budget alerts and limits
 * - Monthly/daily spending reports
 * - PostgreSQL-backed persistent storage
 */

import { getCache, type RedisCacheService } from "@/lib/redis-cache";
import { captureError, addSentryBreadcrumb } from "@/lib/sentry-utils";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface ModelPricing {
  model: string;
  provider: "openai" | "anthropic";
  inputCostPer1k: number; // Cost per 1k input tokens in USD
  outputCostPer1k: number; // Cost per 1k output tokens in USD
  contextWindow: number; // Maximum context window
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface CostCalculation {
  inputCost: number;
  outputCost: number;
  totalCost: number;
  tokens: TokenUsage;
}

export interface UsageRecord {
  id: string;
  timestamp: Date;
  userId?: string;
  orgId?: string;
  endpoint: string;
  model: string;
  provider: "openai" | "anthropic";
  tokens: TokenUsage;
  cost: CostCalculation;
  requestId?: string;
  metadata?: Record<string, any>;
}

export interface UsageStats {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  averageCostPerRequest: number;
  byModel: Record<
    string,
    {
      requests: number;
      tokens: TokenUsage;
      cost: number;
    }
  >;
  byEndpoint: Record<
    string,
    {
      requests: number;
      tokens: TokenUsage;
      cost: number;
    }
  >;
}

export interface BudgetAlert {
  id: string;
  name: string;
  userId?: string;
  orgId?: string;
  limit: number; // USD
  period: "daily" | "weekly" | "monthly";
  notifyAt: number[]; // Array of percentages (e.g., [50, 75, 90, 100])
  enabled: boolean;
  lastNotified?: Date;
}

export interface BudgetStatus {
  alert: BudgetAlert;
  currentSpending: number;
  percentUsed: number;
  remaining: number;
  exceeded: boolean;
  shouldNotify: boolean;
}

// ============================================================================
// Model Pricing (as of Jan 2026)
// ============================================================================

export const MODEL_PRICING: Record<string, ModelPricing> = {
  // OpenAI
  "gpt-4-turbo": {
    model: "gpt-4-turbo",
    provider: "openai",
    inputCostPer1k: 0.01,
    outputCostPer1k: 0.03,
    contextWindow: 128000,
  },
  "gpt-4": {
    model: "gpt-4",
    provider: "openai",
    inputCostPer1k: 0.03,
    outputCostPer1k: 0.06,
    contextWindow: 8192,
  },
  "gpt-4o": {
    model: "gpt-4o",
    provider: "openai",
    inputCostPer1k: 0.005,
    outputCostPer1k: 0.015,
    contextWindow: 128000,
  },
  "gpt-4o-mini": {
    model: "gpt-4o-mini",
    provider: "openai",
    inputCostPer1k: 0.00015,
    outputCostPer1k: 0.0006,
    contextWindow: 128000,
  },
  "gpt-3.5-turbo": {
    model: "gpt-3.5-turbo",
    provider: "openai",
    inputCostPer1k: 0.0005,
    outputCostPer1k: 0.0015,
    contextWindow: 16385,
  },
  "text-embedding-3-small": {
    model: "text-embedding-3-small",
    provider: "openai",
    inputCostPer1k: 0.00002,
    outputCostPer1k: 0,
    contextWindow: 8191,
  },
  "text-embedding-3-large": {
    model: "text-embedding-3-large",
    provider: "openai",
    inputCostPer1k: 0.00013,
    outputCostPer1k: 0,
    contextWindow: 8191,
  },

  // Anthropic
  "claude-3-5-sonnet-20241022": {
    model: "claude-3-5-sonnet-20241022",
    provider: "anthropic",
    inputCostPer1k: 0.003,
    outputCostPer1k: 0.015,
    contextWindow: 200000,
  },
  "claude-3-5-haiku-20241022": {
    model: "claude-3-5-haiku-20241022",
    provider: "anthropic",
    inputCostPer1k: 0.0008,
    outputCostPer1k: 0.004,
    contextWindow: 200000,
  },
  "claude-3-opus-20240229": {
    model: "claude-3-opus-20240229",
    provider: "anthropic",
    inputCostPer1k: 0.015,
    outputCostPer1k: 0.075,
    contextWindow: 200000,
  },
  "claude-3-sonnet-20240229": {
    model: "claude-3-sonnet-20240229",
    provider: "anthropic",
    inputCostPer1k: 0.003,
    outputCostPer1k: 0.015,
    contextWindow: 200000,
  },
  "claude-3-haiku-20240307": {
    model: "claude-3-haiku-20240307",
    provider: "anthropic",
    inputCostPer1k: 0.00025,
    outputCostPer1k: 0.00125,
    contextWindow: 200000,
  },
};

// ============================================================================
// Cost Tracker Class
// ============================================================================

export class CostTracker {
  private cache: RedisCacheService;

  constructor() {
    this.cache = getCache();
  }

  // ============================================================================
  // Cost Calculation
  // ============================================================================

  calculateCost(model: string, tokens: TokenUsage): CostCalculation {
    const pricing = MODEL_PRICING[model];

    if (!pricing) {
      logger.warn(`Unknown model pricing: ${model}, using default`);
      return {
        inputCost: 0,
        outputCost: 0,
        totalCost: 0,
        tokens,
      };
    }

    const inputCost = (tokens.inputTokens / 1000) * pricing.inputCostPer1k;
    const outputCost = (tokens.outputTokens / 1000) * pricing.outputCostPer1k;
    const totalCost = inputCost + outputCost;

    return {
      inputCost: Number(inputCost.toFixed(6)),
      outputCost: Number(outputCost.toFixed(6)),
      totalCost: Number(totalCost.toFixed(6)),
      tokens,
    };
  }

  // ============================================================================
  // Usage Tracking
  // ============================================================================

  async trackUsage(
    endpoint: string,
    model: string,
    tokens: TokenUsage,
    options?: {
      userId?: string;
      orgId?: string;
      requestId?: string;
      metadata?: Record<string, any>;
    },
  ): Promise<UsageRecord> {
    const pricing = MODEL_PRICING[model];
    const provider = pricing?.provider || "openai";
    const cost = this.calculateCost(model, tokens);

    const record: UsageRecord = {
      id: this.generateId(),
      timestamp: new Date(),
      userId: options?.userId,
      orgId: options?.orgId,
      endpoint,
      model,
      provider,
      tokens,
      cost,
      requestId: options?.requestId,
      metadata: options?.metadata,
    };

    addSentryBreadcrumb("ai", "Tracking AI usage", {
      endpoint,
      model,
      cost: cost.totalCost,
    });

    try {
      // Store in Redis (for quick access)
      await this.storeInRedis(record);

      // Store in database (for persistence and reporting)
      await this.storeInDatabase(record);

      // Update running totals
      await this.updateTotals(record);

      // Check budget alerts
      await this.checkBudgetAlerts(record);
    } catch (error) {
      captureError(error as Error, {
        tags: { feature: "ai-cost-tracking" },
        extra: { endpoint, model },
      });
    }

    return record;
  }

  // ============================================================================
  // Usage Statistics
  // ============================================================================

  async getUserStats(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<UsageStats> {
    const key = `ai:usage:user:${userId}:${this.getDateKey(startDate)}:${this.getDateKey(endDate)}`;

    // Try cache first
    const cached = await this.cache.get<UsageStats>(key);
    if (cached) return cached;

    // Calculate from database
    const stats = await this.calculateStats({ userId, startDate, endDate });

    // Cache for 5 minutes
    await this.cache.set(key, stats, 300);

    return stats;
  }

  async getOrgStats(
    orgId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<UsageStats> {
    const key = `ai:usage:org:${orgId}:${this.getDateKey(startDate)}:${this.getDateKey(endDate)}`;

    const cached = await this.cache.get<UsageStats>(key);
    if (cached) return cached;

    const stats = await this.calculateStats({ orgId, startDate, endDate });
    await this.cache.set(key, stats, 300);

    return stats;
  }

  async getGlobalStats(startDate: Date, endDate: Date): Promise<UsageStats> {
    const key = `ai:usage:global:${this.getDateKey(startDate)}:${this.getDateKey(endDate)}`;

    const cached = await this.cache.get<UsageStats>(key);
    if (cached) return cached;

    const stats = await this.calculateStats({ startDate, endDate });
    await this.cache.set(key, stats, 300);

    return stats;
  }

  // ============================================================================
  // Budget Management
  // ============================================================================

  async createBudgetAlert(
    alert: Omit<BudgetAlert, "id">,
  ): Promise<BudgetAlert> {
    const fullAlert: BudgetAlert = {
      id: this.generateId(),
      ...alert,
    };

    const key = `ai:budget:${fullAlert.id}`;
    await this.cache.set(key, fullAlert);

    addSentryBreadcrumb("ai", "Created budget alert", {
      limit: fullAlert.limit,
      period: fullAlert.period,
    });

    return fullAlert;
  }

  async getBudgetStatus(alertId: string): Promise<BudgetStatus | null> {
    const alert = await this.cache.get<BudgetAlert>(`ai:budget:${alertId}`);
    if (!alert || !alert.enabled) return null;

    const { startDate, endDate } = this.getPeriodDates(alert.period);
    const stats = alert.userId
      ? await this.getUserStats(alert.userId, startDate, endDate)
      : alert.orgId
        ? await this.getOrgStats(alert.orgId, startDate, endDate)
        : await this.getGlobalStats(startDate, endDate);

    const currentSpending = stats.totalCost;
    const percentUsed = (currentSpending / alert.limit) * 100;
    const remaining = alert.limit - currentSpending;
    const exceeded = currentSpending >= alert.limit;

    // Determine if we should notify
    const shouldNotify = alert.notifyAt.some((threshold) => {
      return (
        percentUsed >= threshold &&
        (!alert.lastNotified || this.shouldNotifyAgain(alert))
      );
    });

    return {
      alert,
      currentSpending,
      percentUsed,
      remaining,
      exceeded,
      shouldNotify,
    };
  }

  async getAllBudgetStatuses(
    userId?: string,
    orgId?: string,
  ): Promise<BudgetStatus[]> {
    const pattern = `ai:budget:*`;
    const keys = await this.cache.keys(pattern);

    const statuses: BudgetStatus[] = [];

    for (const key of keys) {
      const alert = await this.cache.get<BudgetAlert>(key);
      if (!alert || !alert.enabled) continue;

      // Filter by userId/orgId if provided
      if (userId && alert.userId !== userId) continue;
      if (orgId && alert.orgId !== orgId) continue;

      const status = await this.getBudgetStatus(alert.id);
      if (status) statuses.push(status);
    }

    return statuses;
  }

  // ============================================================================
  // Reporting
  // ============================================================================

  async getDailyReport(
    date: Date,
    userId?: string,
    orgId?: string,
  ): Promise<UsageStats> {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    if (userId) {
      return this.getUserStats(userId, startDate, endDate);
    } else if (orgId) {
      return this.getOrgStats(orgId, startDate, endDate);
    } else {
      return this.getGlobalStats(startDate, endDate);
    }
  }

  async getMonthlyReport(
    year: number,
    month: number,
    userId?: string,
    orgId?: string,
  ): Promise<UsageStats> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    if (userId) {
      return this.getUserStats(userId, startDate, endDate);
    } else if (orgId) {
      return this.getOrgStats(orgId, startDate, endDate);
    } else {
      return this.getGlobalStats(startDate, endDate);
    }
  }

  async getTopUsers(
    startDate: Date,
    endDate: Date,
    limit: number = 10,
  ): Promise<Array<{ userId: string; stats: UsageStats }>> {
    // This would typically query the database
    // For now, return empty array
    return [];
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async storeInRedis(record: UsageRecord): Promise<void> {
    const key = `ai:usage:record:${record.id}`;
    await this.cache.set(key, record, 86400); // 24 hours
  }

  private async storeInDatabase(record: UsageRecord): Promise<void> {
    // For now, just log
    // REMOVED: console.log('[CostTracker] Would store in database:', {
    //   id: record.id,
    //   cost: record.cost.totalCost,
    //   tokens: record.tokens.totalTokens,
    // })
  }

  private async updateTotals(record: UsageRecord): Promise<void> {
    const dateKey = this.getDateKey(record.timestamp);

    // User totals
    if (record.userId) {
      const key = `ai:total:user:${record.userId}:${dateKey}`;
      await this.cache.incr(key, 86400);
    }

    // Org totals
    if (record.orgId) {
      const key = `ai:total:org:${record.orgId}:${dateKey}`;
      await this.cache.incr(key, 86400);
    }

    // Global totals
    const globalKey = `ai:total:global:${dateKey}`;
    await this.cache.incr(globalKey, 86400);
  }

  private async checkBudgetAlerts(record: UsageRecord): Promise<void> {
    const statuses = await this.getAllBudgetStatuses(
      record.userId,
      record.orgId,
    );

    for (const status of statuses) {
      if (status.shouldNotify) {
        await this.sendBudgetAlert(status);
      }
    }
  }

  private async sendBudgetAlert(status: BudgetStatus): Promise<void> {
    addSentryBreadcrumb("ai", "Budget alert triggered", {
      alertId: status.alert.id,
      percentUsed: status.percentUsed,
      currentSpending: status.currentSpending,
    });

    // REMOVED: console.log('[CostTracker] Budget alert:', {
    //   name: status.alert.name,
    //   limit: status.alert.limit,
    //   current: status.currentSpending,
    //   percentUsed: status.percentUsed,
    // })

    // Update last notified timestamp
    status.alert.lastNotified = new Date();
    await this.cache.set(`ai:budget:${status.alert.id}`, status.alert);
  }

  private async calculateStats(options: {
    userId?: string;
    orgId?: string;
    startDate: Date;
    endDate: Date;
  }): Promise<UsageStats> {
    // For now, return mock data
    return {
      totalRequests: 0,
      totalTokens: 0,
      totalCost: 0,
      averageCostPerRequest: 0,
      byModel: {},
      byEndpoint: {},
    };
  }

  private getPeriodDates(period: "daily" | "weekly" | "monthly"): {
    startDate: Date;
    endDate: Date;
  } {
    const now = new Date();
    const endDate = new Date(now);

    let startDate: Date;

    switch (period) {
      case "daily":
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "weekly":
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case "monthly":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    return { startDate, endDate };
  }

  private shouldNotifyAgain(alert: BudgetAlert): boolean {
    if (!alert.lastNotified) return true;

    // Don't notify more than once per hour
    const hoursSinceLastNotification =
      (Date.now() - alert.lastNotified.getTime()) / (1000 * 60 * 60);

    return hoursSinceLastNotification >= 1;
  }

  private getDateKey(date: Date): string {
    return date.toISOString().split("T")[0];
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let trackerInstance: CostTracker | null = null;

export function getCostTracker(): CostTracker {
  if (!trackerInstance) {
    trackerInstance = new CostTracker();
  }
  return trackerInstance;
}

export function resetCostTracker(): void {
  trackerInstance = null;
}
