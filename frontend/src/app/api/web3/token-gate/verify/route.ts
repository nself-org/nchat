/**
 * Token Gate Verification API Routes
 *
 * POST /api/web3/token-gate/verify - Verify access to a token-gated resource
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";

import {
  checkAccess,
  batchCheckAccess,
  getUserAccessStatus,
} from "@/services/web3/token-gate.service";

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const verifyAccessSchema = z.object({
  userId: z.string().min(1),
  resourceType: z.enum(["channel", "feature", "role", "workspace"]),
  resourceId: z.string().min(1),
  walletAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/)
    .optional(),
  userRoles: z.array(z.string()).optional(),
  forceRefresh: z.boolean().optional(),
});

const batchVerifySchema = z.object({
  requests: z.array(verifyAccessSchema).min(1).max(100),
});

const userStatusSchema = z.object({
  userId: z.string().min(1),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  userRoles: z.array(z.string()).optional(),
});

// =============================================================================
// POST /api/web3/token-gate/verify
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const mode = searchParams.get("mode") || "single";

    const body = await request.json();

    switch (mode) {
      case "single": {
        const validationResult = verifyAccessSchema.safeParse(body);

        if (!validationResult.success) {
          return NextResponse.json(
            {
              error: "Validation failed",
              details: validationResult.error.errors,
            },
            { status: 400 },
          );
        }

        const result = await checkAccess(validationResult.data);

        // Return appropriate status based on access
        if (!result.hasAccess) {
          return NextResponse.json(
            {
              hasAccess: false,
              status: result.status,
              reason: result.reason,
              gateId: result.gateId,
              requiresVerification: result.requiresVerification,
              inGracePeriod: result.inGracePeriod,
              gracePeriodEndsAt: result.gracePeriodEndsAt,
            },
            { status: 403 },
          );
        }

        return NextResponse.json({
          hasAccess: true,
          status: result.status,
          gateId: result.gateId,
          bypassedByRole: result.bypassedByRole,
          bypassRole: result.bypassRole,
          inGracePeriod: result.inGracePeriod,
          gracePeriodEndsAt: result.gracePeriodEndsAt,
          cacheExpiresAt: result.cacheExpiresAt,
          verificationResult: result.verificationResult,
        });
      }

      case "batch": {
        const validationResult = batchVerifySchema.safeParse(body);

        if (!validationResult.success) {
          return NextResponse.json(
            {
              error: "Validation failed",
              details: validationResult.error.errors,
            },
            { status: 400 },
          );
        }

        const results = await batchCheckAccess(validationResult.data.requests);

        // Convert Map to object for JSON serialization
        const resultsObject: Record<string, unknown> = {};
        for (const [key, value] of results.entries()) {
          resultsObject[key] = value;
        }

        return NextResponse.json({
          results: resultsObject,
          total: results.size,
        });
      }

      case "user-status": {
        const validationResult = userStatusSchema.safeParse(body);

        if (!validationResult.success) {
          return NextResponse.json(
            {
              error: "Validation failed",
              details: validationResult.error.errors,
            },
            { status: 400 },
          );
        }

        const { userId, walletAddress, userRoles } = validationResult.data;
        const results = await getUserAccessStatus(
          userId,
          walletAddress,
          userRoles,
        );

        // Convert Map to object for JSON serialization
        const resultsObject: Record<string, unknown> = {};
        for (const [key, value] of results.entries()) {
          resultsObject[key] = value;
        }

        return NextResponse.json({
          userId,
          walletAddress,
          gates: resultsObject,
          totalGates: results.size,
          accessibleGates: Array.from(results.values()).filter(
            (r) => r.hasAccess,
          ).length,
        });
      }

      default:
        return NextResponse.json(
          {
            error: `Unknown mode: ${mode}. Valid modes: single, batch, user-status`,
          },
          { status: 400 },
        );
    }
  } catch (error) {
    logger.error("Error verifying token gate access:", error);
    const message =
      error instanceof Error
        ? error instanceof Error
          ? error.message
          : String(error)
        : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
