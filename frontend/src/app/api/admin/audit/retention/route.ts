/**
 * GET/POST/DELETE /api/admin/audit/retention
 *
 * Audit log retention policy management.
 * Allows configuring and executing retention policies.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuditQueryService } from "@/services/audit/audit-query.service";
import { logger } from "@/lib/logger";
import type {
  AuditRetentionPolicy,
  AuditCategory,
  AuditSeverity,
} from "@/lib/audit/audit-types";
import { v4 as uuidv4 } from "uuid";

// In-memory storage for retention policies (in production, use database)
const retentionPolicies: Map<string, AuditRetentionPolicy> = new Map();

// Default policies
const defaultPolicies: AuditRetentionPolicy[] = [
  {
    id: "default-90",
    name: "Default 90-Day Retention",
    enabled: true,
    retentionDays: 90,
    archiveEnabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "security-365",
    name: "Security Events 1-Year Retention",
    enabled: true,
    retentionDays: 365,
    categories: ["security"],
    severities: ["warning", "error", "critical"],
    archiveEnabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "critical-indefinite",
    name: "Critical Events Indefinite",
    enabled: true,
    retentionDays: 9999, // Effectively indefinite
    severities: ["critical"],
    archiveEnabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// Initialize default policies
defaultPolicies.forEach((policy) => {
  retentionPolicies.set(policy.id, policy);
});

/**
 * GET /api/admin/audit/retention
 *
 * Get retention policies and statistics
 *
 * Query parameters:
 * - policyId: Get specific policy details
 * - includeStats: Include retention statistics
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const policyId = searchParams.get("policyId");
    const includeStats = searchParams.get("includeStats") === "true";

    // Get specific policy
    if (policyId) {
      const policy = retentionPolicies.get(policyId);

      if (!policy) {
        return NextResponse.json(
          { success: false, error: "Retention policy not found" },
          { status: 404 },
        );
      }

      return NextResponse.json({
        success: true,
        policy,
      });
    }

    // Get all policies
    const policies = Array.from(retentionPolicies.values());

    const response: {
      success: boolean;
      policies: AuditRetentionPolicy[];
      stats?: {
        totalPolicies: number;
        activePolicies: number;
        oldestPolicy: Date | null;
      };
    } = {
      success: true,
      policies,
    };

    if (includeStats) {
      response.stats = {
        totalPolicies: policies.length,
        activePolicies: policies.filter((p) => p.enabled).length,
        oldestPolicy: policies.reduce<Date | null>((oldest, p) => {
          if (!oldest || p.createdAt < oldest) return p.createdAt;
          return oldest;
        }, null),
      };
    }

    return NextResponse.json(response);
  } catch (error) {
    logger.error("[Audit Retention API] GET error", error);
    return NextResponse.json(
      { success: false, error: "Failed to get retention policies" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/audit/retention
 *
 * Create or execute retention policy
 *
 * Body parameters:
 * - action: 'create' | 'execute' | 'executeAll'
 *
 * For 'create':
 * - name: Policy name
 * - retentionDays: Number of days to retain
 * - categories: Optional category filter
 * - severities: Optional severity filter
 * - archiveEnabled: Archive instead of delete
 * - enabled: Policy is active
 *
 * For 'execute':
 * - policyId: ID of policy to execute
 *
 * For 'executeAll':
 * - No additional parameters
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { action } = body as { action: "create" | "execute" | "executeAll" };

    switch (action) {
      case "create": {
        const {
          name,
          retentionDays,
          categories,
          severities,
          archiveEnabled = false,
          enabled = true,
        } = body as {
          name: string;
          retentionDays: number;
          categories?: AuditCategory[];
          severities?: AuditSeverity[];
          archiveEnabled?: boolean;
          enabled?: boolean;
        };

        // Validate
        if (!name || typeof retentionDays !== "number") {
          return NextResponse.json(
            {
              success: false,
              error: "Missing required fields: name, retentionDays",
            },
            { status: 400 },
          );
        }

        if (retentionDays < 1) {
          return NextResponse.json(
            { success: false, error: "retentionDays must be at least 1" },
            { status: 400 },
          );
        }

        const policy: AuditRetentionPolicy = {
          id: uuidv4(),
          name,
          retentionDays,
          categories,
          severities,
          archiveEnabled,
          enabled,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        retentionPolicies.set(policy.id, policy);

        logger.info("[Audit Retention] Policy created", {
          policyId: policy.id,
          name,
        });

        return NextResponse.json({
          success: true,
          policy,
          message: "Retention policy created successfully",
        });
      }

      case "execute": {
        const { policyId } = body as { policyId: string };

        const policy = retentionPolicies.get(policyId);
        if (!policy) {
          return NextResponse.json(
            { success: false, error: "Retention policy not found" },
            { status: 404 },
          );
        }

        const queryService = getAuditQueryService();
        const result = await queryService.applyRetentionPolicy(policy);

        logger.info("[Audit Retention] Policy executed", {
          policyId,
          deleted: result.entriesDeleted,
          archived: result.entriesArchived,
          retained: result.entriesRetained,
        });

        return NextResponse.json({
          success: true,
          result: {
            policyId: policy.id,
            policyName: policy.name,
            executedAt: result.executedAt,
            entriesDeleted: result.entriesDeleted,
            entriesArchived: result.entriesArchived,
            entriesRetained: result.entriesRetained,
            errors: result.errors,
          },
        });
      }

      case "executeAll": {
        const queryService = getAuditQueryService();
        const policies = Array.from(retentionPolicies.values()).filter(
          (p) => p.enabled,
        );
        queryService.setRetentionPolicies(policies);

        const results = await queryService.applyAllRetentionPolicies();

        const summary = {
          policiesExecuted: results.length,
          totalDeleted: results.reduce((sum, r) => sum + r.entriesDeleted, 0),
          totalArchived: results.reduce((sum, r) => sum + r.entriesArchived, 0),
          totalRetained: results.reduce((sum, r) => sum + r.entriesRetained, 0),
          errors: results.flatMap((r) => r.errors),
        };

        logger.info("[Audit Retention] All policies executed", summary);

        return NextResponse.json({
          success: true,
          summary,
          results: results.map((r) => ({
            policyId: r.policy.id,
            policyName: r.policy.name,
            executedAt: r.executedAt,
            entriesDeleted: r.entriesDeleted,
            entriesArchived: r.entriesArchived,
            entriesRetained: r.entriesRetained,
            errors: r.errors,
          })),
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }
  } catch (error) {
    logger.error("[Audit Retention API] POST error", error);
    return NextResponse.json(
      { success: false, error: "Failed to process retention request" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/admin/audit/retention
 *
 * Update existing retention policy
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      id,
      name,
      retentionDays,
      categories,
      severities,
      archiveEnabled,
      enabled,
    } = body as Partial<AuditRetentionPolicy> & { id: string };

    const policy = retentionPolicies.get(id);
    if (!policy) {
      return NextResponse.json(
        { success: false, error: "Retention policy not found" },
        { status: 404 },
      );
    }

    // Update fields
    if (name !== undefined) policy.name = name;
    if (retentionDays !== undefined) policy.retentionDays = retentionDays;
    if (categories !== undefined) policy.categories = categories;
    if (severities !== undefined) policy.severities = severities;
    if (archiveEnabled !== undefined) policy.archiveEnabled = archiveEnabled;
    if (enabled !== undefined) policy.enabled = enabled;
    policy.updatedAt = new Date();

    retentionPolicies.set(id, policy);

    logger.info("[Audit Retention] Policy updated", { policyId: id });

    return NextResponse.json({
      success: true,
      policy,
      message: "Retention policy updated successfully",
    });
  } catch (error) {
    logger.error("[Audit Retention API] PUT error", error);
    return NextResponse.json(
      { success: false, error: "Failed to update retention policy" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/audit/retention
 *
 * Delete retention policy
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const policyId = searchParams.get("policyId");

    if (!policyId) {
      return NextResponse.json(
        { success: false, error: "policyId is required" },
        { status: 400 },
      );
    }

    const policy = retentionPolicies.get(policyId);
    if (!policy) {
      return NextResponse.json(
        { success: false, error: "Retention policy not found" },
        { status: 404 },
      );
    }

    retentionPolicies.delete(policyId);

    logger.info("[Audit Retention] Policy deleted", {
      policyId,
      name: policy.name,
    });

    return NextResponse.json({
      success: true,
      message: "Retention policy deleted successfully",
      deletedPolicy: {
        id: policy.id,
        name: policy.name,
      },
    });
  } catch (error) {
    logger.error("[Audit Retention API] DELETE error", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete retention policy" },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
