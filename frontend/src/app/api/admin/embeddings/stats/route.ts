/**
 * Admin API: Embedding Statistics
 *
 * Get comprehensive embedding statistics
 *
 * GET /api/admin/embeddings/stats
 */

import { NextRequest, NextResponse } from "next/server";
import { gql } from "@apollo/client";
import { apolloClient } from "@/lib/apollo-client";
import { vectorStore } from "@/lib/database/vector-store";

import { logger } from "@/lib/logger";

const GET_EMBEDDING_STATS = gql`
  query GetEmbeddingStats($fromDate: date!, $toDate: date!) {
    nchat_embedding_stats(
      where: { date: { _gte: $fromDate, _lte: $toDate } }
      order_by: { date: desc }
    ) {
      date
      model
      total_embeddings
      total_tokens
      estimated_cost
      avg_processing_time_ms
      cache_hit_count
      cache_miss_count
      error_count
    }
  }
`;

const GET_QUEUE_STATS = gql`
  query GetQueueStats {
    pending: nchat_embedding_queue_aggregate(
      where: { claimed_at: { _is_null: true } }
    ) {
      aggregate {
        count
      }
    }
    claimed: nchat_embedding_queue_aggregate(
      where: { claimed_at: { _is_null: false } }
    ) {
      aggregate {
        count
      }
    }
    failed: nchat_embedding_queue_aggregate(
      where: { retry_count: { _gte: 3 } }
    ) {
      aggregate {
        count
      }
    }
  }
`;

const GET_CACHE_STATS = gql`
  query GetCacheStats {
    total: nchat_embedding_cache_aggregate {
      aggregate {
        count
        sum {
          usage_count
        }
      }
    }
    recent: nchat_embedding_cache_aggregate(
      where: { last_used_at: { _gte: "now() - interval '7 days'" } }
    ) {
      aggregate {
        count
      }
    }
  }
`;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30");

    // Calculate date range
    const toDate = new Date().toISOString().split("T")[0];
    const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    // Fetch all stats in parallel
    const [
      coverageResult,
      indexHealthResult,
      statsResult,
      queueStatsResult,
      cacheStatsResult,
    ] = await Promise.all([
      vectorStore.getCoverage(),
      vectorStore.getIndexHealth(),
      apolloClient.query({
        query: GET_EMBEDDING_STATS,
        variables: { fromDate, toDate },
        fetchPolicy: "network-only",
      }),
      apolloClient.query({
        query: GET_QUEUE_STATS,
        fetchPolicy: "network-only",
      }),
      apolloClient.query({
        query: GET_CACHE_STATS,
        fetchPolicy: "network-only",
      }),
    ]);

    // Process coverage stats
    const coverage = coverageResult;

    // Process index health
    const indexHealth = indexHealthResult;

    // Process daily stats
    const dailyStats = statsResult.data.nchat_embedding_stats;

    // Calculate totals from daily stats
    const totals = dailyStats.reduce(
      (
        acc: {
          totalEmbeddings: number;
          totalTokens: number;
          totalCost: number;
          cacheHits: number;
          cacheMisses: number;
          errors: number;
        },
        day: {
          total_embeddings: number;
          total_tokens: number;
          estimated_cost: string;
          cache_hit_count: number;
          cache_miss_count: number;
          error_count: number;
        },
      ) => ({
        totalEmbeddings: acc.totalEmbeddings + day.total_embeddings,
        totalTokens: acc.totalTokens + day.total_tokens,
        totalCost: acc.totalCost + parseFloat(day.estimated_cost),
        cacheHits: acc.cacheHits + day.cache_hit_count,
        cacheMisses: acc.cacheMisses + day.cache_miss_count,
        errors: acc.errors + day.error_count,
      }),
      {
        totalEmbeddings: 0,
        totalTokens: 0,
        totalCost: 0,
        cacheHits: 0,
        cacheMisses: 0,
        errors: 0,
      },
    );

    // Calculate cache hit rate
    const cacheHitRate =
      totals.cacheHits + totals.cacheMisses > 0
        ? (totals.cacheHits / (totals.cacheHits + totals.cacheMisses)) * 100
        : 0;

    // Process queue stats
    const queueStats = {
      pending: queueStatsResult.data.pending.aggregate.count,
      processing: queueStatsResult.data.claimed.aggregate.count,
      failed: queueStatsResult.data.failed.aggregate.count,
    };

    // Process cache stats
    const cacheStats = {
      totalEntries: cacheStatsResult.data.total.aggregate.count,
      totalUsage: cacheStatsResult.data.total.aggregate.sum.usage_count || 0,
      recentlyUsed: cacheStatsResult.data.recent.aggregate.count,
      avgUsagePerEntry:
        cacheStatsResult.data.total.aggregate.count > 0
          ? Math.floor(
              (cacheStatsResult.data.total.aggregate.sum.usage_count || 0) /
                cacheStatsResult.data.total.aggregate.count,
            )
          : 0,
    };

    // Return comprehensive stats
    return NextResponse.json({
      coverage: {
        totalMessages: coverage.totalMessages,
        messagesWithEmbeddings: coverage.messagesWithEmbeddings,
        coveragePercentage: coverage.coveragePercentage,
        pendingEmbeddings: coverage.pendingEmbeddings,
        failedEmbeddings: coverage.failedEmbeddings,
        oldestUnembeddedMessage: coverage.oldestUnembeddedMessage,
      },
      indexHealth: {
        indexName: indexHealth.indexName,
        indexSize: indexHealth.indexSize,
        totalVectors: indexHealth.totalVectors,
        indexEfficiency: indexHealth.indexEfficiency,
      },
      performance: {
        totalEmbeddings: totals.totalEmbeddings,
        totalTokens: totals.totalTokens,
        totalCost: totals.totalCost.toFixed(4),
        avgCostPerEmbedding:
          totals.totalEmbeddings > 0
            ? (totals.totalCost / totals.totalEmbeddings).toFixed(6)
            : 0,
        cacheHitRate: cacheHitRate.toFixed(2),
        errorRate:
          totals.totalEmbeddings > 0
            ? ((totals.errors / totals.totalEmbeddings) * 100).toFixed(2)
            : 0,
      },
      queue: queueStats,
      cache: cacheStats,
      dailyStats: dailyStats.slice(0, 30), // Last 30 days
    });
  } catch (error) {
    logger.error("Get embedding stats API error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Failed to get embedding stats",
      },
      { status: 500 },
    );
  }
}
