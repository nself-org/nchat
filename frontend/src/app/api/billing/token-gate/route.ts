/**
 * Token Gate API Routes
 *
 * Manage token-gated channel access requirements.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getTokenGateService,
  type TokenGateConfig,
} from "@/lib/billing/token-gate.service";
import { z } from "zod";

import { logger } from "@/lib/logger";

// ============================================================================
// Validation Schemas
// ============================================================================

const createTokenGateSchema = z.object({
  channelId: z.string().uuid(),
  gateType: z.enum(["erc20", "erc721", "erc1155"]),
  contractAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  chainId: z.string(),
  networkName: z.string(),
  tokenName: z.string().optional(),
  tokenSymbol: z.string().optional(),
  minimumBalance: z.string().optional(),
  requiredTokenIds: z.array(z.string()).optional(),
  isActive: z.boolean().default(true),
  bypassRoles: z.array(z.string()).default(["owner", "admin"]),
  cacheTTL: z.number().int().min(60).max(86400).default(300),
});

const verifyAccessSchema = z.object({
  channelId: z.string().uuid(),
  userId: z.string().uuid(),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  userRole: z.string().optional(),
});

// ============================================================================
// GET /api/billing/token-gate
// List token gates for a workspace
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const workspaceId = searchParams.get("workspaceId");
    const channelId = searchParams.get("channelId");

    if (!workspaceId && !channelId) {
      return NextResponse.json(
        { error: "Either workspaceId or channelId is required" },
        { status: 400 },
      );
    }

    const tokenGateService = getTokenGateService();

    if (workspaceId) {
      const gates = await tokenGateService.getTokenGatedChannels(workspaceId);
      return NextResponse.json({ gates });
    }

    // Get specific channel gate
    // Note: This would need the internal getTokenGate method to be exposed
    return NextResponse.json({ gates: [] });
  } catch (error) {
    logger.error("Error fetching token gates:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch token gates",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

// ============================================================================
// POST /api/billing/token-gate
// Create a new token gate
// ============================================================================

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
    const tokenGateService = getTokenGateService();

    const gate = await tokenGateService.createTokenGate(data.channelId, {
      gateType: data.gateType,
      contractAddress: data.contractAddress,
      chainId: data.chainId as any,
      networkName: data.networkName,
      tokenName: data.tokenName,
      tokenSymbol: data.tokenSymbol,
      minimumBalance: data.minimumBalance,
      requiredTokenIds: data.requiredTokenIds,
      isActive: data.isActive,
      bypassRoles: data.bypassRoles,
      cacheTTL: data.cacheTTL,
    });

    return NextResponse.json({ gate }, { status: 201 });
  } catch (error) {
    logger.error("Error creating token gate:", error);
    return NextResponse.json(
      {
        error: "Failed to create token gate",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

// ============================================================================
// PUT /api/billing/token-gate
// Update a token gate
// ============================================================================

export async function PUT(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const gateId = searchParams.get("id");

    if (!gateId) {
      return NextResponse.json(
        { error: "Gate ID is required" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const tokenGateService = getTokenGateService();

    const gate = await tokenGateService.updateTokenGate(gateId, body);

    if (!gate) {
      return NextResponse.json(
        { error: "Token gate not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ gate });
  } catch (error) {
    logger.error("Error updating token gate:", error);
    return NextResponse.json(
      {
        error: "Failed to update token gate",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

// ============================================================================
// DELETE /api/billing/token-gate
// Delete a token gate
// ============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const gateId = searchParams.get("id");

    if (!gateId) {
      return NextResponse.json(
        { error: "Gate ID is required" },
        { status: 400 },
      );
    }

    const tokenGateService = getTokenGateService();
    await tokenGateService.deleteTokenGate(gateId);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error deleting token gate:", error);
    return NextResponse.json(
      {
        error: "Failed to delete token gate",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
