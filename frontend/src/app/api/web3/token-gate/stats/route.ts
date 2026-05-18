/**
 * Token Gate Statistics API Routes
 *
 * GET /api/web3/token-gate/stats - Get statistics for token gates
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

import {
  listTokenGates,
  getGateStats,
  getGateEvents,
  getGracePeriodUsers,
} from "@/services/web3/token-gate.service";

import type { TokenGateEventType } from "@/lib/web3/token-gate-types";

// =============================================================================
// GET /api/web3/token-gate/stats
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const gateId = searchParams.get("gateId");
    const includeEvents = searchParams.get("includeEvents") === "true";
    const eventTypes = searchParams.get("eventTypes")?.split(",") as
      | TokenGateEventType[]
      | undefined;
    const eventLimit = parseInt(searchParams.get("eventLimit") || "100", 10);
    const sinceParam = searchParams.get("since");
    const since = sinceParam ? new Date(sinceParam) : undefined;

    // Single gate stats
    if (gateId) {
      const stats = getGateStats(gateId);

      if (!stats) {
        return NextResponse.json(
          { error: "Token gate not found or no stats available" },
          { status: 404 },
        );
      }

      const response: Record<string, unknown> = { stats };

      if (includeEvents) {
        response.events = getGateEvents(gateId, {
          types: eventTypes,
          limit: eventLimit,
          since,
        });
      }

      response.gracePeriodUsers = getGracePeriodUsers(gateId);

      return NextResponse.json(response);
    }

    // Aggregate stats for all gates
    const gates = listTokenGates({ isActive: true });
    const aggregateStats = {
      totalGates: gates.length,
      activeGates: gates.filter((g) => g.isActive).length,
      totalChecks: 0,
      successfulChecks: 0,
      failedChecks: 0,
      uniqueUsers: new Set<string>(),
      totalVerificationTimeMs: 0,
      totalCacheHits: 0,
      byResourceType: {
        channel: 0,
        feature: 0,
        role: 0,
        workspace: 0,
      } as Record<string, number>,
      gateStats: [] as unknown[],
    };

    for (const gate of gates) {
      aggregateStats.byResourceType[gate.resourceType]++;

      const stats = getGateStats(gate.id);
      if (stats) {
        aggregateStats.totalChecks += stats.totalChecks;
        aggregateStats.successfulChecks += stats.successfulChecks;
        aggregateStats.failedChecks += stats.failedChecks;
        aggregateStats.totalVerificationTimeMs +=
          stats.averageVerificationTimeMs * stats.totalChecks;
        aggregateStats.totalCacheHits += stats.cacheHitRate * stats.totalChecks;

        aggregateStats.gateStats.push({
          ...stats,
          name: gate.name,
          resourceType: gate.resourceType,
          resourceId: gate.resourceId,
        });
      }
    }

    const response: Record<string, unknown> = {
      summary: {
        totalGates: aggregateStats.totalGates,
        activeGates: aggregateStats.activeGates,
        totalChecks: aggregateStats.totalChecks,
        successfulChecks: aggregateStats.successfulChecks,
        failedChecks: aggregateStats.failedChecks,
        successRate:
          aggregateStats.totalChecks > 0
            ? aggregateStats.successfulChecks / aggregateStats.totalChecks
            : 0,
        averageVerificationTimeMs:
          aggregateStats.totalChecks > 0
            ? aggregateStats.totalVerificationTimeMs /
              aggregateStats.totalChecks
            : 0,
        cacheHitRate:
          aggregateStats.totalChecks > 0
            ? aggregateStats.totalCacheHits / aggregateStats.totalChecks
            : 0,
        byResourceType: aggregateStats.byResourceType,
      },
      gates: aggregateStats.gateStats,
    };

    if (includeEvents) {
      response.recentEvents = getGateEvents(undefined, {
        types: eventTypes,
        limit: eventLimit,
        since,
      });
    }

    return NextResponse.json(response);
  } catch (error) {
    logger.error("Error getting token gate stats:", error);
    const message =
      error instanceof Error
        ? error instanceof Error
          ? error.message
          : String(error)
        : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
