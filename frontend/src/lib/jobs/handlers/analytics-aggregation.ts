/**
 * Analytics Aggregation Job Handler
 * Background job that runs periodically to aggregate analytics data
 * and refresh the dashboard cache
 */

import { logger } from "@/lib/logger";
import { getAnalyticsAggregator } from "@/lib/analytics/analytics-aggregator";
import { captureError } from "@/lib/sentry-utils";
import type { AnalyticsFilters } from "@/lib/analytics/analytics-types";

// ============================================================================
// Types
// ============================================================================

export interface AnalyticsAggregationJobPayload {
  jobId: string;
  type: "full_aggregation" | "hourly_aggregation" | "daily_aggregation";
  timestamp: string;
  retryCount: number;
  maxRetries: number;
}

// ============================================================================
// Job Handler
// ============================================================================

export async function handleAnalyticsAggregation(
  payload: AnalyticsAggregationJobPayload,
): Promise<{
  success: boolean;
  message: string;
  error?: string;
  duration?: number;
}> {
  const startTime = Date.now();

  try {
    logger.info("Starting analytics aggregation job", {
      jobId: payload.jobId,
      type: payload.type,
    });

    const aggregator = getAnalyticsAggregator();

    // Clear cache to force fresh aggregation
    aggregator.clearCache();

    // Determine date range based on job type
    let filters: AnalyticsFilters;

    if (payload.type === "full_aggregation") {
      // Aggregate last 90 days
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 90);

      filters = {
        dateRange: { start: startDate, end: endDate },
        granularity: "day",
      };
    } else if (payload.type === "daily_aggregation") {
      // Aggregate today
      const endDate = new Date();
      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);

      filters = {
        dateRange: { start: startDate, end: endDate },
        granularity: "hour",
      };
    } else {
      // Hourly aggregation - last 24 hours
      const endDate = new Date();
      const startDate = new Date();
      startDate.setHours(startDate.getHours() - 24);

      filters = {
        dateRange: { start: startDate, end: endDate },
        granularity: "hour",
      };
    }

    // Perform aggregation
    const dashboardData = await aggregator.aggregateDashboardData(filters);

    // Verify data was aggregated
    if (!dashboardData || !dashboardData.summary) {
      throw new Error("Dashboard data aggregation returned empty result");
    }

    const duration = Date.now() - startTime;

    logger.info("Analytics aggregation job completed successfully", {
      jobId: payload.jobId,
      type: payload.type,
      duration,
      messageCount: dashboardData.messageVolume.length,
      userCount: dashboardData.topUsers.length,
      channelCount: dashboardData.channelActivity.length,
    });

    return {
      success: true,
      message: `Analytics aggregation completed for ${payload.type}`,
      duration,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";

    logger.error("Analytics aggregation job failed", {
      jobId: payload.jobId,
      type: payload.type,
      error: errorMsg,
      retryCount: payload.retryCount,
    });

    // Capture error in Sentry if retries exceeded
    if (payload.retryCount >= payload.maxRetries) {
      captureError(error instanceof Error ? error : new Error(errorMsg), {
        tags: { jobType: "analytics_aggregation" },
        extra: { jobId: payload.jobId, type: payload.type },
      });
    }

    return {
      success: false,
      message: `Analytics aggregation failed: ${errorMsg}`,
      error: errorMsg,
    };
  }
}

// ============================================================================
// Scheduled Job Scheduling
// ============================================================================

/**
 * Create aggregation job schedule definitions
 * Should be called during application initialization
 */
export function createAnalyticsAggregationSchedules() {
  return [
    {
      id: "analytics-hourly",
      name: "Analytics Hourly Aggregation",
      description: "Aggregates analytics data every hour",
      handler: "handleAnalyticsAggregation",
      payload: {
        type: "hourly_aggregation",
      },
      schedule: "0 * * * *", // Every hour at :00
      enabled: true,
      maxRetries: 3,
      timeout: 5 * 60 * 1000, // 5 minutes
    },
    {
      id: "analytics-daily",
      name: "Analytics Daily Aggregation",
      description: "Aggregates full day analytics data",
      handler: "handleAnalyticsAggregation",
      payload: {
        type: "daily_aggregation",
      },
      schedule: "0 0 * * *", // Daily at midnight
      enabled: true,
      maxRetries: 3,
      timeout: 10 * 60 * 1000, // 10 minutes
    },
    {
      id: "analytics-full",
      name: "Analytics Full Aggregation",
      description: "Complete analytics aggregation including historical data",
      handler: "handleAnalyticsAggregation",
      payload: {
        type: "full_aggregation",
      },
      schedule: "0 2 * * 0", // Weekly on Sunday at 2 AM
      enabled: true,
      maxRetries: 3,
      timeout: 30 * 60 * 1000, // 30 minutes
    },
  ];
}

export default handleAnalyticsAggregation;
