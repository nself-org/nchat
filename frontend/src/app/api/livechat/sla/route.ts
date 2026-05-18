/**
 * Livechat SLA API Route
 *
 * Handles SLA policy management and metrics.
 *
 * GET /api/livechat/sla - Get SLA policies and metrics
 * POST /api/livechat/sla - Create a new SLA policy
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSLAService } from "@/services/livechat";
import {
  withAuth,
  withErrorHandler,
  withRateLimit,
  compose,
  withAdmin,
  type AuthenticatedRequest,
} from "@/lib/api/middleware";
import {
  successResponse,
  createdResponse,
  badRequestResponse,
} from "@/lib/api/response";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const CreateSLAPolicySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  firstResponseTime: z.number().int().min(30).max(86400), // 30 seconds to 24 hours
  nextResponseTime: z.number().int().min(30).max(86400),
  resolutionTime: z.number().int().min(60).max(604800), // 1 minute to 7 days
  operationalHoursOnly: z.boolean().optional(),
  departments: z.array(z.string()).optional(),
  channels: z
    .array(
      z.enum([
        "web_widget",
        "email",
        "facebook",
        "twitter",
        "whatsapp",
        "telegram",
        "sms",
        "api",
      ]),
    )
    .optional(),
});

const GetMetricsSchema = z.object({
  policyId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// ============================================================================
// HANDLERS
// ============================================================================

const slaService = getSLAService();

/**
 * GET /api/livechat/sla - Get SLA policies and optionally metrics
 */
async function getSLAHandler(request: AuthenticatedRequest) {
  const searchParams = request.nextUrl.searchParams;
  const includeMetrics = searchParams.get("includeMetrics") === "true";
  const policyId = searchParams.get("policyId") || undefined;

  // Get policies
  const policiesResult = await slaService.listPolicies();
  if (!policiesResult.success) {
    return NextResponse.json(
      { success: false, error: policiesResult.error?.message },
      { status: policiesResult.error?.status || 500 },
    );
  }

  const response: {
    policies: typeof policiesResult.data;
    metrics?: unknown;
    businessHours?: ReturnType<typeof slaService.getBusinessHours>;
  } = {
    policies: policiesResult.data,
    businessHours: slaService.getBusinessHours(),
  };

  // Get metrics if requested
  if (includeMetrics) {
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const period = {
      start: startDate
        ? new Date(startDate)
        : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
      end: endDate ? new Date(endDate) : new Date(),
    };

    const metricsResult = await slaService.getMetrics(period, policyId);
    if (metricsResult.success) {
      response.metrics = metricsResult.data;
    }
  }

  return successResponse(response);
}

/**
 * POST /api/livechat/sla - Create a new SLA policy (admin only)
 */
async function createSLAPolicyHandler(request: AuthenticatedRequest) {
  const body = await request.json();

  const validation = CreateSLAPolicySchema.safeParse(body);
  if (!validation.success) {
    return badRequestResponse("Invalid request body", "VALIDATION_ERROR", {
      errors: validation.error.flatten().fieldErrors,
    });
  }

  const result = await slaService.createPolicy(validation.data);

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error?.message },
      { status: result.error?.status || 500 },
    );
  }

  logger.info("SLA policy created", {
    id: result.data?.id,
    name: validation.data.name,
  });

  return createdResponse({ policy: result.data });
}

// ============================================================================
// EXPORTS
// ============================================================================

export const GET = compose(
  withErrorHandler,
  withRateLimit({ limit: 100, window: 60 }),
  withAuth,
)(getSLAHandler as any);

export const POST = compose(
  withErrorHandler,
  withRateLimit({ limit: 10, window: 60 }),
  withAuth,
  withAdmin,
)(createSLAPolicyHandler as any);
