/**
 * Audit Log API Route
 *
 * Handles audit log operations including:
 * - GET: Fetch audit logs with pagination and filters
 * - POST: Create new audit log entry
 * - DELETE: Delete audit logs (admin only, for retention policy)
 */

import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";

import type {
  AuditLogEntry,
  AuditLogFilters,
  AuditLogSortOptions,
  AuditCategory,
  AuditSeverity,
} from "@/lib/audit/audit-types";

import { queryAuditLogs } from "@/lib/audit/audit-search";

import { logger } from "@/lib/logger";

// ============================================================================
// Mock Data Store (In production, use database)
// ============================================================================

// In-memory store for demo purposes
let mockAuditEntries: AuditLogEntry[] = [];

function generateMockId(): string {
  return `audit-${Date.now()}-${randomBytes(5).toString("hex")}`;
}

// ============================================================================
// GET - Fetch Audit Logs
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("limit") || "20", 10);
    const sortField = searchParams.get("sort") || "timestamp";
    const sortDirection = (searchParams.get("order") || "desc") as
      | "asc"
      | "desc";
    const searchQuery = searchParams.get("q") || undefined;

    // Parse filter parameters
    const categories = searchParams.get("categories")?.split(",") as
      | AuditCategory[]
      | undefined;
    const severities = searchParams.get("severities")?.split(",") as
      | AuditSeverity[]
      | undefined;
    const actorId = searchParams.get("actor") || undefined;
    const resourceId = searchParams.get("resource") || undefined;
    const startDate = searchParams.get("from")
      ? new Date(searchParams.get("from")!)
      : undefined;
    const endDate = searchParams.get("to")
      ? new Date(searchParams.get("to")!)
      : undefined;
    const success = searchParams.get("success")
      ? searchParams.get("success") === "true"
      : undefined;

    // Build filters
    const filters: AuditLogFilters = {
      category: categories,
      severity: severities,
      actorId,
      resourceId,
      startDate,
      endDate,
      success,
      searchQuery,
    };

    // Build sort options
    const sort: AuditLogSortOptions = {
      field: sortField as AuditLogSortOptions["field"],
      direction: sortDirection,
    };

    // Query audit logs
    const result = queryAuditLogs(mockAuditEntries, {
      filters,
      sort,
      page,
      pageSize,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error("[Audit API] GET error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch audit logs",
        message:
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

// ============================================================================
// POST - Create Audit Log Entry
// ============================================================================

interface CreateAuditLogRequest {
  category: AuditCategory;
  action: string;
  severity: AuditSeverity;
  actor: {
    id: string;
    type: "user" | "system" | "bot" | "integration" | "anonymous";
    email?: string;
    username?: string;
    displayName?: string;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
  };
  resource?: {
    type: string;
    id: string;
    name?: string;
    previousValue?: unknown;
    newValue?: unknown;
    metadata?: Record<string, unknown>;
  };
  target?: {
    type: string;
    id: string;
    name?: string;
  };
  description: string;
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  requestId?: string;
  correlationId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateAuditLogRequest;

    // Validate required fields
    if (!body.category || !body.action || !body.actor || !body.description) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
          message: "category, action, actor, and description are required",
        },
        { status: 400 },
      );
    }

    // Create audit log entry
    const entry: AuditLogEntry = {
      id: generateMockId(),
      timestamp: new Date(),
      category: body.category,
      action: body.action as any,
      severity: body.severity || "info",
      actor: body.actor,
      resource: body.resource as any,
      target: body.target as any,
      description: body.description,
      success: body.success ?? true,
      errorMessage: body.errorMessage,
      metadata: body.metadata,
      ipAddress:
        body.ipAddress || request.headers.get("x-forwarded-for") || undefined,
      requestId:
        body.requestId || request.headers.get("x-request-id") || undefined,
      correlationId: body.correlationId,
    };

    // Add to store
    mockAuditEntries.unshift(entry);

    // Keep only last 10000 entries in memory
    if (mockAuditEntries.length > 10000) {
      mockAuditEntries = mockAuditEntries.slice(0, 10000);
    }

    return NextResponse.json({
      success: true,
      data: entry,
    });
  } catch (error) {
    logger.error("[Audit API] POST error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create audit log entry",
        message:
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

// ============================================================================
// DELETE - Delete Audit Logs
// ============================================================================

interface DeleteAuditLogsRequest {
  ids?: string[];
  olderThan?: string; // ISO date string
  category?: AuditCategory;
  severity?: AuditSeverity[];
}

export async function DELETE(request: NextRequest) {
  try {
    const body = (await request.json()) as DeleteAuditLogsRequest;

    let deletedCount = 0;
    const initialCount = mockAuditEntries.length;

    if (body.ids && body.ids.length > 0) {
      // Delete specific entries by ID
      const idsSet = new Set(body.ids);
      mockAuditEntries = mockAuditEntries.filter(
        (entry) => !idsSet.has(entry.id),
      );
      deletedCount = initialCount - mockAuditEntries.length;
    } else if (body.olderThan) {
      // Delete entries older than specified date
      const cutoffDate = new Date(body.olderThan);
      mockAuditEntries = mockAuditEntries.filter((entry) => {
        const entryDate = new Date(entry.timestamp);
        const shouldDelete =
          entryDate < cutoffDate &&
          (!body.category || entry.category === body.category) &&
          (!body.severity || body.severity.includes(entry.severity));
        return !shouldDelete;
      });
      deletedCount = initialCount - mockAuditEntries.length;
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Missing delete criteria",
          message: "Provide either ids array or olderThan date",
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        deletedCount,
        remainingCount: mockAuditEntries.length,
      },
    });
  } catch (error) {
    logger.error("[Audit API] DELETE error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete audit logs",
        message:
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
