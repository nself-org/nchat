/**
 * Token Gate API Routes
 *
 * GET  /api/web3/token-gate - List token gates
 * POST /api/web3/token-gate - Create a new token gate
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";

import {
  createTokenGate,
  listTokenGates,
} from "@/services/web3/token-gate.service";

import type { ChainId, TokenStandard } from "@/lib/web3/token-gate-types";

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const requirementConditionSchema = z.object({
  id: z.string().optional(),
  contractAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid contract address"),
  chainId: z.string(),
  standard: z.enum(["erc20", "erc721", "erc1155"]),
  minimumBalance: z.string().optional(),
  tokenSymbol: z.string().optional(),
  tokenDecimals: z.number().int().min(0).max(18).optional(),
  requiredTokenIds: z.array(z.string()).optional(),
  minimumNFTCount: z.number().int().min(1).optional(),
  tokenId: z.string().optional(),
  minimumAmount: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
});

const createTokenGateSchema = z.object({
  resourceType: z.enum(["channel", "feature", "role", "workspace"]),
  resourceId: z.string().min(1),
  requirements: z.array(requirementConditionSchema).min(1),
  operator: z.enum(["AND", "OR"]).default("AND"),
  isActive: z.boolean().default(true),
  bypassRoles: z.array(z.string()).default(["owner", "admin"]),
  cacheTTLSeconds: z.number().int().min(60).max(86400).default(300),
  gracePeriodSeconds: z.number().int().min(0).max(604800).default(3600),
  revocationCheckIntervalSeconds: z
    .number()
    .int()
    .min(0)
    .max(86400)
    .default(60),
  autoRevokeOnFailure: z.boolean().default(false),
  name: z.string().optional(),
  description: z.string().optional(),
});

// =============================================================================
// GET /api/web3/token-gate
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const resourceType = searchParams.get("resourceType") as
      | "channel"
      | "feature"
      | "role"
      | "workspace"
      | null;
    const isActive = searchParams.get("isActive");

    const gates = listTokenGates({
      resourceType: resourceType || undefined,
      isActive: isActive !== null ? isActive === "true" : undefined,
    });

    return NextResponse.json({
      gates,
      total: gates.length,
    });
  } catch (error) {
    logger.error("Error listing token gates:", error);
    const message =
      error instanceof Error
        ? error instanceof Error
          ? error.message
          : String(error)
        : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// =============================================================================
// POST /api/web3/token-gate
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validationResult = createTokenGateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.errors,
        },
        { status: 400 },
      );
    }

    const data = validationResult.data;

    // Transform requirements to proper format
    const requirements = data.requirements.map((req, index) => ({
      ...req,
      id: req.id || `req_${Date.now()}_${index}`,
      chainId: req.chainId as ChainId,
      standard: req.standard as TokenStandard,
    }));

    const gate = await createTokenGate({
      resourceType: data.resourceType,
      resourceId: data.resourceId,
      requirements,
      operator: data.operator,
      isActive: data.isActive,
      bypassRoles: data.bypassRoles,
      cacheTTLSeconds: data.cacheTTLSeconds,
      gracePeriodSeconds: data.gracePeriodSeconds,
      revocationCheckIntervalSeconds: data.revocationCheckIntervalSeconds,
      autoRevokeOnFailure: data.autoRevokeOnFailure,
      name: data.name,
      description: data.description,
    });

    return NextResponse.json({ gate }, { status: 201 });
  } catch (error) {
    logger.error("Error creating token gate:", error);
    const message =
      error instanceof Error
        ? error instanceof Error
          ? error.message
          : String(error)
        : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
