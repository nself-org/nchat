/**
 * GET/POST /api/admin/audit
 *
 * Main audit logs endpoint for querying and searching audit events.
 *
 * GET: Query audit logs with filtering, sorting, and pagination
 * POST: Advanced query with body parameters
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuditQueryService } from "@/services/audit/audit-query.service";
import { logger } from "@/lib/logger";
import type {
  AuditCategory,
  AuditSeverity,
  AuditLogFilters,
  AuditLogSortOptions,
} from "@/lib/audit/audit-types";

/**
 * GET /api/admin/audit
 *
 * Query audit logs with URL parameters
 *
 * Query parameters:
 * - page: Page number (default: 1)
 * - pageSize: Items per page (default: 50, max: 100)
 * - category: Filter by category (comma-separated)
 * - severity: Filter by severity (comma-separated)
 * - action: Filter by action (comma-separated)
 * - actorId: Filter by actor ID
 * - resourceId: Filter by resource ID
 * - startDate: Filter from date (ISO string)
 * - endDate: Filter to date (ISO string)
 * - success: Filter by success (true/false)
 * - q: Search query
 * - sort: Sort field (timestamp, category, action, severity, actor)
 * - order: Sort direction (asc, desc)
 * - includeAggregations: Include aggregation data (true/false)
 * - includeIntegrity: Include integrity status (true/false)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse pagination
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = Math.min(
      parseInt(searchParams.get("pageSize") || "50", 10),
      100,
    );

    // Parse filters
    const filters: AuditLogFilters = {};

    const category = searchParams.get("category");
    if (category) {
      filters.category = category.split(",") as AuditCategory[];
    }

    const severity = searchParams.get("severity");
    if (severity) {
      filters.severity = severity.split(",") as AuditSeverity[];
    }

    const action = searchParams.get("action");
    if (action) {
      filters.action = action.split(",") as AuditLogFilters["action"];
    }

    const actorId = searchParams.get("actorId");
    if (actorId) {
      filters.actorId = actorId;
    }

    const resourceId = searchParams.get("resourceId");
    if (resourceId) {
      filters.resourceId = resourceId;
    }

    const startDate = searchParams.get("startDate");
    if (startDate) {
      filters.startDate = new Date(startDate);
    }

    const endDate = searchParams.get("endDate");
    if (endDate) {
      filters.endDate = new Date(endDate);
    }

    const success = searchParams.get("success");
    if (success !== null) {
      filters.success = success === "true";
    }

    const searchQuery = searchParams.get("q");
    if (searchQuery) {
      filters.searchQuery = searchQuery;
    }

    // Parse sort
    const sortField = searchParams.get("sort") as
      | AuditLogSortOptions["field"]
      | null;
    const sortDirection = searchParams.get("order") as "asc" | "desc" | null;

    const sort: AuditLogSortOptions = {
      field: sortField || "timestamp",
      direction: sortDirection || "desc",
    };

    // Parse options
    const includeAggregations =
      searchParams.get("includeAggregations") === "true";
    const includeIntegrity = searchParams.get("includeIntegrity") === "true";

    // Execute query
    const queryService = getAuditQueryService();
    const result = await queryService.query({
      filters,
      sort,
      pagination: { page, pageSize },
      includeAggregations,
      includeIntegrity,
    });

    return NextResponse.json({
      success: true,
      data: result.entries,
      pagination: result.pagination,
      aggregations: result.aggregations,
      integrityStatus: result.integrityStatus,
      cursor: result.cursor,
    });
  } catch (error) {
    logger.error("[Audit API] GET error", error);
    return NextResponse.json(
      { success: false, error: "Failed to query audit logs" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/audit
 *
 * Advanced query with body parameters for complex filters
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      filters,
      sort,
      pagination,
      cursor,
      includeAggregations = false,
      includeIntegrity = false,
      searchQuery,
      dateRange,
    } = body as {
      filters?: AuditLogFilters;
      sort?: AuditLogSortOptions;
      pagination?: { page: number; pageSize: number };
      cursor?: string;
      includeAggregations?: boolean;
      includeIntegrity?: boolean;
      searchQuery?: string;
      dateRange?: { start: string; end: string };
    };

    const queryService = getAuditQueryService();

    // Use cursor if provided
    if (cursor) {
      const result = await queryService.queryByCursor(
        cursor,
        pagination?.pageSize,
      );
      return NextResponse.json({
        success: true,
        data: result.entries,
        pagination: result.pagination,
        cursor: result.cursor,
      });
    }

    // Execute advanced query
    const result = await queryService.query({
      filters,
      sort: sort || { field: "timestamp", direction: "desc" },
      pagination: pagination || { page: 1, pageSize: 50 },
      includeAggregations,
      includeIntegrity,
      searchQuery,
      dateRange: dateRange
        ? {
            start: new Date(dateRange.start),
            end: new Date(dateRange.end),
          }
        : undefined,
    });

    return NextResponse.json({
      success: true,
      data: result.entries,
      pagination: result.pagination,
      aggregations: result.aggregations,
      integrityStatus: result.integrityStatus,
      cursor: result.cursor,
    });
  } catch (error) {
    logger.error("[Audit API] POST error", error);
    return NextResponse.json(
      { success: false, error: "Failed to query audit logs" },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
