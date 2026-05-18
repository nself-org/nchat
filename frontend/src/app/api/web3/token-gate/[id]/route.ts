/**
 * Token Gate Instance API Routes
 *
 * GET    /api/web3/token-gate/[id] - Get a token gate by ID
 * PUT    /api/web3/token-gate/[id] - Update a token gate
 * DELETE /api/web3/token-gate/[id] - Delete a token gate
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";

import {
  getTokenGate,
  updateTokenGate,
  deleteTokenGate,
  getGateStats,
  getGateEvents,
  getGracePeriodUsers,
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

const updateTokenGateSchema = z.object({
  requirements: z.array(requirementConditionSchema).optional(),
  operator: z.enum(["AND", "OR"]).optional(),
  isActive: z.boolean().optional(),
  bypassRoles: z.array(z.string()).optional(),
  cacheTTLSeconds: z.number().int().min(60).max(86400).optional(),
  gracePeriodSeconds: z.number().int().min(0).max(604800).optional(),
  revocationCheckIntervalSeconds: z.number().int().min(0).max(86400).optional(),
  autoRevokeOnFailure: z.boolean().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
});

// =============================================================================
// GET /api/web3/token-gate/[id]
// =============================================================================

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const searchParams = request.nextUrl.searchParams;
    const includeStats = searchParams.get("includeStats") === "true";
    const includeEvents = searchParams.get("includeEvents") === "true";
    const includeGracePeriod =
      searchParams.get("includeGracePeriod") === "true";

    const gate = getTokenGate(id);

    if (!gate) {
      return NextResponse.json(
        { error: "Token gate not found" },
        { status: 404 },
      );
    }

    const response: Record<string, unknown> = { gate };

    if (includeStats) {
      response.stats = getGateStats(id);
    }

    if (includeEvents) {
      const eventLimit = parseInt(searchParams.get("eventLimit") || "50", 10);
      response.events = getGateEvents(id, { limit: eventLimit });
    }

    if (includeGracePeriod) {
      response.gracePeriodUsers = getGracePeriodUsers(id);
    }

    return NextResponse.json(response);
  } catch (error) {
    logger.error("Error getting token gate:", error);
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
// PUT /api/web3/token-gate/[id]
// =============================================================================

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const validationResult = updateTokenGateSchema.safeParse(body);

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

    // Transform requirements if provided
    let requirements;
    if (data.requirements) {
      requirements = data.requirements.map((req, index) => ({
        ...req,
        id: req.id || `req_${Date.now()}_${index}`,
        chainId: req.chainId as ChainId,
        standard: req.standard as TokenStandard,
      }));
    }

    const gate = await updateTokenGate(id, {
      ...data,
      requirements,
    });

    if (!gate) {
      return NextResponse.json(
        { error: "Token gate not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ gate });
  } catch (error) {
    logger.error("Error updating token gate:", error);
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
// DELETE /api/web3/token-gate/[id]
// =============================================================================

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;

    const deleted = await deleteTokenGate(id);

    if (!deleted) {
      return NextResponse.json(
        { error: "Token gate not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error deleting token gate:", error);
    const message =
      error instanceof Error
        ? error instanceof Error
          ? error.message
          : String(error)
        : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
