/**
 * API Route: Moderation Analytics & Statistics
 * GET /api/moderation/stats
 * Provides dashboard analytics for moderation activity
 */

import { NextRequest, NextResponse } from "next/server";
import { getApolloClient } from "@/lib/apollo-client";
import { gql } from "@apollo/client";
import { captureError } from "@/lib/sentry-utils";

import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GET_MODERATION_STATS = gql`
  query GetModerationStats($startDate: timestamptz!, $endDate: timestamptz!) {
    # Queue statistics
    queue_stats: nchat_moderation_queue_aggregate(
      where: { created_at: { _gte: $startDate, _lte: $endDate } }
    ) {
      aggregate {
        count
      }
      nodes {
        status
        priority
        auto_action
      }
    }

    # Action statistics
    action_stats: nchat_moderation_actions_aggregate(
      where: { created_at: { _gte: $startDate, _lte: $endDate } }
    ) {
      aggregate {
        count
      }
      nodes {
        action_type
        is_automated
        automation_type
      }
    }

    # Pending queue items
    pending_items: nchat_moderation_queue_aggregate(
      where: { status: { _eq: "pending" } }
    ) {
      aggregate {
        count
      }
    }

    # High priority items
    high_priority: nchat_moderation_queue_aggregate(
      where: {
        status: { _eq: "pending" }
        priority: { _in: ["high", "critical"] }
      }
    ) {
      aggregate {
        count
      }
    }

    # User violations
    user_violations: nchat_user_moderation_history(
      order_by: { total_violations: desc }
      limit: 10
    ) {
      user_id
      total_violations
      toxic_violations
      nsfw_violations
      spam_violations
      profanity_violations
      trust_score
      warnings_received
      mutes_received
      bans_received
    }

    # Top moderators
    top_moderators: nchat_moderation_actions(
      where: {
        created_at: { _gte: $startDate, _lte: $endDate }
        is_automated: { _eq: false }
      }
      distinct_on: moderator_id
      order_by: { moderator_id: desc }
    ) {
      moderator_id
    }
  }
`;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Date range parameters
    const period = searchParams.get("period") || "7d"; // 1d, 7d, 30d, 90d, all
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Calculate date range
    const { start, end } = calculateDateRange(period, startDate, endDate);

    const apolloClient = getApolloClient();

    // Fetch data
    const result = await apolloClient.query({
      query: GET_MODERATION_STATS,
      variables: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
      fetchPolicy: "network-only",
    });

    const data = result.data;

    // Process queue stats
    const queueStats = processQueueStats(data.queue_stats);

    // Process action stats
    const actionStats = processActionStats(data.action_stats);

    // Process user violations
    const topViolators = data.user_violations || [];

    // Calculate moderation metrics
    const metrics = {
      totalFlagged: data.queue_stats.aggregate.count,
      pendingReview: data.pending_items.aggregate.count,
      highPriority: data.high_priority.aggregate.count,
      totalActions: data.action_stats.aggregate.count,
      automatedActions: actionStats.automatedCount,
      manualActions: actionStats.manualCount,
      avgResponseTime: calculateAvgResponseTime(data.queue_stats.nodes),
      flaggedRate: calculateFlaggedRate(
        data.queue_stats.aggregate.count,
        period,
      ),
    };

    // Response time distribution
    const responseTimeDistribution = calculateResponseTimeDistribution(
      data.queue_stats.nodes,
    );

    // Violation trends
    const violationTrends = calculateViolationTrends(
      data.queue_stats.nodes,
      period,
    );

    // Top categories
    const topCategories = calculateTopCategories(data.queue_stats.nodes);

    // Auto-action effectiveness
    const autoActionEffectiveness = calculateAutoActionEffectiveness(
      data.action_stats.nodes,
    );

    return NextResponse.json({
      success: true,
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
        label: period,
      },
      metrics,
      queueStats,
      actionStats,
      topViolators,
      responseTimeDistribution,
      violationTrends,
      topCategories,
      autoActionEffectiveness,
    });
  } catch (error) {
    logger.error("Moderation stats error:", error);
    captureError(error as Error, {
      tags: { feature: "moderation", endpoint: "stats" },
    });

    return NextResponse.json(
      {
        error: "Failed to fetch moderation stats",
        details:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * Calculate date range based on period
 */
function calculateDateRange(
  period: string,
  startDate?: string | null,
  endDate?: string | null,
): { start: Date; end: Date } {
  const end = endDate ? new Date(endDate) : new Date();

  let start: Date;

  if (startDate) {
    start = new Date(startDate);
  } else {
    switch (period) {
      case "1d":
        start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "7d":
        start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        start = new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "all":
        start = new Date(0); // Unix epoch
        break;
      default:
        start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
  }

  return { start, end };
}

/**
 * Process queue statistics
 */
function processQueueStats(queueStats: any) {
  const nodes = queueStats.nodes || [];

  const byStatus = {
    pending: 0,
    reviewing: 0,
    approved: 0,
    rejected: 0,
    auto_resolved: 0,
  };

  const byPriority = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };

  const byAutoAction = {
    none: 0,
    flagged: 0,
    hidden: 0,
    warned: 0,
    muted: 0,
    deleted: 0,
  };

  for (const node of nodes) {
    if (node.status) byStatus[node.status as keyof typeof byStatus]++;
    if (node.priority) byPriority[node.priority as keyof typeof byPriority]++;
    if (node.auto_action)
      byAutoAction[node.auto_action as keyof typeof byAutoAction]++;
  }

  return {
    total: queueStats.aggregate.count,
    byStatus,
    byPriority,
    byAutoAction,
  };
}

/**
 * Process action statistics
 */
function processActionStats(actionStats: any) {
  const nodes = actionStats.nodes || [];

  const byType = {
    flagged: 0,
    approved: 0,
    rejected: 0,
    deleted: 0,
    warned: 0,
    muted: 0,
    banned: 0,
    appealed: 0,
  };

  let automatedCount = 0;
  let manualCount = 0;
  let aiCount = 0;
  let ruleBasedCount = 0;

  for (const node of nodes) {
    if (node.action_type) byType[node.action_type as keyof typeof byType]++;
    if (node.is_automated) {
      automatedCount++;
      if (node.automation_type === "ai") aiCount++;
      else if (node.automation_type === "rule_based") ruleBasedCount++;
    } else {
      manualCount++;
    }
  }

  return {
    total: actionStats.aggregate.count,
    byType,
    automatedCount,
    manualCount,
    aiCount,
    ruleBasedCount,
  };
}

/**
 * Calculate average response time
 */
function calculateAvgResponseTime(nodes: any[]): number {
  // Placeholder - would need reviewed_at and created_at timestamps
  return 0;
}

/**
 * Calculate flagged rate
 */
function calculateFlaggedRate(totalFlagged: number, period: string): number {
  // Placeholder - would need total message count
  return 0;
}

/**
 * Calculate response time distribution
 */
function calculateResponseTimeDistribution(nodes: any[]) {
  return {
    under1h: 0,
    under6h: 0,
    under24h: 0,
    over24h: 0,
  };
}

/**
 * Calculate violation trends
 */
function calculateViolationTrends(nodes: any[], period: string) {
  return {
    toxicity: [],
    spam: [],
    profanity: [],
    nsfw: [],
  };
}

/**
 * Calculate top violation categories
 */
function calculateTopCategories(nodes: any[]) {
  return [];
}

/**
 * Calculate auto-action effectiveness
 */
function calculateAutoActionEffectiveness(nodes: any[]) {
  return {
    accuracy: 0,
    falsePositiveRate: 0,
    falseNegativeRate: 0,
    precision: 0,
    recall: 0,
  };
}
