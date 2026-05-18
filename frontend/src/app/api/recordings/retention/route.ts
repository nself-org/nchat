/**
 * Recording Retention Policy API
 * GET /api/recordings/retention - List retention policies
 * POST /api/recordings/retention - Create retention policy
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { nhost } from "@/lib/nhost.server";
import { getRetentionPolicyService } from "@/services/recordings";
import { logger } from "@/lib/logger";

// Schema validation
const createPolicySchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  retentionPeriod: z.enum([
    "7_days",
    "30_days",
    "90_days",
    "180_days",
    "1_year",
    "2_years",
    "5_years",
    "forever",
  ]),
  isDefault: z.boolean().default(false),
  autoDeleteEnabled: z.boolean().default(true),
  warningDaysBefore: z.number().min(0).max(30).default(7),
  legalHoldExempt: z.boolean().default(false),
  enforceQuota: z.boolean().default(false),
  quotaBytes: z.number().positive().optional(),
  onExpiry: z.enum(["delete", "archive", "notify"]).default("delete"),
  archiveLocation: z.string().optional(),
  applyToSources: z
    .array(z.enum(["call", "livestream", "screen_share", "voice_chat"]))
    .optional(),
  applyToChannelIds: z.array(z.string().uuid()).optional(),
});

/**
 * GET /api/recordings/retention
 * List retention policies for a workspace
 */
export async function GET(request: NextRequest) {
  try {
    // Get user from session
    const session = await nhost.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "User ID not found" }, { status: 401 });
    }

    // Get workspace ID
    const workspaceId = request.nextUrl.searchParams.get("workspaceId");
    if (!workspaceId || !z.string().uuid().safeParse(workspaceId).success) {
      return NextResponse.json(
        { error: "Invalid workspaceId" },
        { status: 400 },
      );
    }

    // Get policies
    const retentionService = getRetentionPolicyService();
    const policies = await retentionService.getPolicies(workspaceId);

    // Get storage quota
    const quota = await retentionService.getStorageQuota(workspaceId);

    return NextResponse.json({
      policies,
      quota,
    });
  } catch (error) {
    logger.error("Error listing retention policies:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/recordings/retention
 * Create a new retention policy
 */
export async function POST(request: NextRequest) {
  try {
    // Get user from session
    const session = await nhost.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "User ID not found" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const validation = createPolicySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: validation.error.errors },
        { status: 400 },
      );
    }

    const config = validation.data;

    // Create policy
    const retentionService = getRetentionPolicyService();
    const policy = await retentionService.createPolicy(
      config.workspaceId,
      {
        name: config.name,
        description: config.description,
        retentionPeriod: config.retentionPeriod,
        isDefault: config.isDefault,
        autoDeleteEnabled: config.autoDeleteEnabled,
        warningDaysBefore: config.warningDaysBefore,
        legalHoldExempt: config.legalHoldExempt,
        enforceQuota: config.enforceQuota,
        quotaBytes: config.quotaBytes,
        onExpiry: config.onExpiry,
        archiveLocation: config.archiveLocation,
        applyToSources: config.applyToSources,
        applyToChannelIds: config.applyToChannelIds,
      },
      userId,
    );

    logger.info("Retention policy created", {
      policyId: policy.id,
      workspaceId: config.workspaceId,
      userId,
    });

    return NextResponse.json(
      {
        success: true,
        policy,
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error("Error creating retention policy:", error);

    if ((error as { code?: string }).code === "RETENTION_POLICY_ERROR") {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error instanceof Error
                ? error.message
                : String(error)
              : String(error),
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/recordings/retention
 * Execute pending retention actions (admin only)
 */
export async function PUT(request: NextRequest) {
  try {
    // Get user from session
    const session = await nhost.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "User ID not found" }, { status: 401 });
    }

    // In production, verify admin role
    // For now, execute scheduled actions
    const retentionService = getRetentionPolicyService();
    const result = await retentionService.executeScheduledActions();

    logger.info("Retention actions executed", result);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error("Error executing retention actions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
