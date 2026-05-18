/**
 * GET /api/plugins/gaps - List all plugin gaps with optional filters
 * POST /api/plugins/gaps - Register a gap resolution
 *
 * API routes for the plugin gap closure system.
 * Provides endpoints for querying gaps, running analysis,
 * and registering resolutions.
 */

import { NextRequest, NextResponse } from "next/server";
import { GapClosureService } from "@/services/plugins/gap-closure.service";
import type {
  GapStatus,
  GapSeverity,
  PluginDomain,
} from "@/lib/plugins/gaps/types";
import {
  isValidDomain,
  isValidSeverity,
  isValidStatus,
} from "@/lib/plugins/gaps/types";

// Singleton service instance
let gapClosureService: GapClosureService | null = null;

function getService(): GapClosureService {
  if (!gapClosureService) {
    gapClosureService = new GapClosureService({ autoAnalyze: true });
    gapClosureService.initialize();
  }
  return gapClosureService;
}

/**
 * GET /api/plugins/gaps
 *
 * Query parameters:
 * - status: Filter by gap status (uncovered, partial, workaround, covered, deprecated)
 * - severity: Filter by severity (critical, high, medium, low, info)
 * - domain: Filter by plugin domain
 * - action: Special actions ('analyze' to run fresh analysis, 'stats' for statistics)
 * - limit: Limit results (default: 100)
 * - offset: Offset for pagination (default: 0)
 */
export async function GET(request: NextRequest) {
  try {
    const service = getService();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    // Special actions
    if (action === "analyze") {
      const result = service.runAnalysis();
      return NextResponse.json({
        success: true,
        data: result,
      });
    }

    if (action === "stats") {
      const stats = service.getStats();
      const coverage = service.getCoverageStats();
      return NextResponse.json({
        success: true,
        data: { stats, coverage },
      });
    }

    if (action === "coverage") {
      const coverage = service.getCoverageStats();
      const uncoveredCaps = service.getUncoveredCapabilities();
      return NextResponse.json({
        success: true,
        data: { coverage, uncoveredCapabilities: uncoveredCaps },
      });
    }

    if (action === "direct-access") {
      const services = service.getDirectAccessServices();
      return NextResponse.json({
        success: true,
        data: { services, count: services.length },
      });
    }

    // Query gaps with filters
    const statusParam = searchParams.get("status");
    const severityParam = searchParams.get("severity");
    const domainParam = searchParams.get("domain");
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Validate filter params
    if (statusParam && !isValidStatus(statusParam)) {
      return NextResponse.json(
        {
          error: `Invalid status: "${statusParam}". Valid values: uncovered, partial, workaround, covered, deprecated`,
        },
        { status: 400 },
      );
    }

    if (severityParam && !isValidSeverity(severityParam)) {
      return NextResponse.json(
        {
          error: `Invalid severity: "${severityParam}". Valid values: critical, high, medium, low, info`,
        },
        { status: 400 },
      );
    }

    if (domainParam && !isValidDomain(domainParam)) {
      return NextResponse.json(
        { error: `Invalid domain: "${domainParam}"` },
        { status: 400 },
      );
    }

    const gaps = service.queryGaps({
      status: statusParam as GapStatus | undefined,
      severity: severityParam as GapSeverity | undefined,
      domain: domainParam as PluginDomain | undefined,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      data: {
        gaps,
        total: gaps.length,
        limit,
        offset,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error instanceof Error
          ? error.message
          : String(error)
        : "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

/**
 * POST /api/plugins/gaps
 *
 * Register a gap resolution.
 *
 * Body:
 * {
 *   "gapId": string,
 *   "pluginId": string,
 *   "coveredCapabilities": string[],
 *   "resolvedBy": string,
 *   "description"?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const service = getService();
    const body = await request.json();

    const { gapId, pluginId, coveredCapabilities, resolvedBy, description } =
      body;

    // Validate required fields
    if (!gapId || typeof gapId !== "string") {
      return NextResponse.json(
        { success: false, error: "gapId is required and must be a string" },
        { status: 400 },
      );
    }

    if (!pluginId || typeof pluginId !== "string") {
      return NextResponse.json(
        { success: false, error: "pluginId is required and must be a string" },
        { status: 400 },
      );
    }

    if (
      !Array.isArray(coveredCapabilities) ||
      coveredCapabilities.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "coveredCapabilities must be a non-empty array of strings",
        },
        { status: 400 },
      );
    }

    if (!resolvedBy || typeof resolvedBy !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "resolvedBy is required and must be a string",
        },
        { status: 400 },
      );
    }

    const resolution = service.resolveGap(
      gapId,
      pluginId,
      coveredCapabilities,
      resolvedBy,
      description,
    );

    return NextResponse.json({
      success: true,
      data: resolution,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error instanceof Error
          ? error.message
          : String(error)
        : "Unknown error";
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export const dynamic = "force-dynamic";
