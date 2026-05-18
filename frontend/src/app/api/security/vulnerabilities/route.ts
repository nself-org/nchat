/**
 * Vulnerability Management API
 *
 * Provides endpoints for managing tracked vulnerabilities.
 *
 * GET  /api/security/vulnerabilities - List vulnerabilities
 * POST /api/security/vulnerabilities - Import vulnerabilities
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createVulnerabilityTracker,
  type VulnerabilityQuery,
  type UnifiedSeverity,
  type VulnerabilityStatus,
  type VulnerabilitySource,
  type RemediationPriority,
} from "@/lib/security/vulnerability-tracker";

// In-memory tracker instance (in production, this would be backed by a database)
const tracker = createVulnerabilityTracker();

// ============================================================================
// Request/Response Schemas
// ============================================================================

const queryParamsSchema = z.object({
  source: z.string().optional(),
  severity: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  assignee: z.string().optional(),
  tags: z.string().optional(),
  file: z.string().optional(),
  package: z.string().optional(),
  cve: z.string().optional(),
  cwe: z.string().optional(),
  suppressed: z.enum(["true", "false"]).optional(),
  limit: z.string().optional(),
  offset: z.string().optional(),
  sortBy: z
    .enum(["severity", "priority", "firstSeen", "lastSeen", "dueDate"])
    .optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

const importVulnerabilitySchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  severity: z.enum(["critical", "high", "medium", "low", "info"]),
  source: z
    .enum(["sast", "dast", "sca", "manual", "pentest", "bugbounty"])
    .optional(),
  location: z
    .object({
      file: z.string().optional(),
      line: z.number().optional(),
      column: z.number().optional(),
      package: z.string().optional(),
      version: z.string().optional(),
      url: z.string().optional(),
    })
    .optional(),
  identifiers: z
    .object({
      cve: z.string().optional(),
      cwe: z.array(z.string()).optional(),
      owasp: z.string().optional(),
      ruleId: z.string().optional(),
      advisoryId: z.string().optional(),
    })
    .optional(),
  remediation: z
    .object({
      recommendation: z.string().optional(),
      effort: z
        .enum(["trivial", "small", "medium", "large", "unknown"])
        .optional(),
      fixedIn: z.string().optional(),
      patchAvailable: z.boolean().optional(),
    })
    .optional(),
  tags: z.array(z.string()).optional(),
});

// ============================================================================
// GET /api/security/vulnerabilities
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const params = queryParamsSchema.parse(Object.fromEntries(searchParams));

    // Build query
    const query: VulnerabilityQuery = {};

    if (params.source) {
      query.source = params.source.split(",") as VulnerabilitySource[];
    }

    if (params.severity) {
      query.severity = params.severity.split(",") as UnifiedSeverity[];
    }

    if (params.status) {
      query.status = params.status.split(",") as VulnerabilityStatus[];
    }

    if (params.priority) {
      query.priority = params.priority.split(",") as RemediationPriority[];
    }

    if (params.assignee) {
      query.assignee = params.assignee;
    }

    if (params.tags) {
      query.tags = params.tags.split(",");
    }

    if (params.file) {
      query.file = params.file;
    }

    if (params.package) {
      query.package = params.package;
    }

    if (params.cve) {
      query.cve = params.cve;
    }

    if (params.cwe) {
      query.cwe = params.cwe;
    }

    if (params.suppressed !== undefined) {
      query.suppressed = params.suppressed === "true";
    }

    if (params.limit) {
      query.limit = parseInt(params.limit, 10);
    }

    if (params.offset) {
      query.offset = parseInt(params.offset, 10);
    }

    if (params.sortBy) {
      query.sortBy = params.sortBy;
    }

    if (params.sortOrder) {
      query.sortOrder = params.sortOrder;
    }

    // Execute query
    const result = tracker.query(query);
    const stats = tracker.getStats();
    const blockStatus = tracker.shouldBlockDeployment();

    return NextResponse.json({
      vulnerabilities: result.vulnerabilities,
      total: result.total,
      hasMore: result.hasMore,
      stats: {
        bySeverity: stats.bySeverity,
        byStatus: stats.byStatus,
        overdueCount: stats.overdueCount,
      },
      policy: {
        deploymentBlocked: blockStatus.blocked,
        blockReasons: blockStatus.reasons,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ============================================================================
// POST /api/security/vulnerabilities
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const data = importVulnerabilitySchema.parse(body);

    // Import vulnerability
    const vuln = tracker.importManualFinding({
      title: data.title,
      description: data.description,
      severity: data.severity,
      source: data.source,
      location: data.location,
      identifiers: data.identifiers,
      remediation: data.remediation,
      tags: data.tags,
    });

    return NextResponse.json(
      {
        message: "Vulnerability imported successfully",
        vulnerability: vuln,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
