/**
 * POST /api/channels/[id]/token-gate
 * PUT /api/channels/[id]/token-gate
 * DELETE /api/channels/[id]/token-gate
 *
 * Manage token-gated access for a channel
 */

import { NextRequest, NextResponse } from "next/server";
import { getTokenGateService } from "@/lib/billing/token-gate.service";
import { z } from "zod";

import { logger } from "@/lib/logger";

const tokenGateSchema = z.object({
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
  cacheTTL: z.number().int().positive().default(3600),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: channelId } = await context.params;
    const body = await request.json();
    const validationResult = tokenGateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.errors,
        },
        { status: 400 },
      );
    }

    // Create token gate
    const tokenGateService = getTokenGateService();
    // Convert chainId string to proper ChainId type and bypassRoles to proper types
    const data = {
      gateType: validationResult.data.gateType,
      contractAddress: validationResult.data.contractAddress,
      chainId: validationResult.data.chainId as any,
      networkName: validationResult.data.networkName,
      tokenName: validationResult.data.tokenName,
      tokenSymbol: validationResult.data.tokenSymbol,
      minimumBalance: validationResult.data.minimumBalance,
      requiredTokenIds: validationResult.data.requiredTokenIds,
      isActive: validationResult.data.isActive,
      bypassRoles: validationResult.data.bypassRoles as any,
      cacheTTL: validationResult.data.cacheTTL,
    };
    const tokenGate = await tokenGateService.createTokenGate(channelId, data);

    return NextResponse.json({ tokenGate });
  } catch (error) {
    logger.error("Error creating token gate:", error);
    return NextResponse.json(
      {
        error: "Failed to create token gate",
        details:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : String(error),
      },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: channelId } = await context.params;
    const body = await request.json();
    const { gateId, ...updates } = body;

    if (!gateId) {
      return NextResponse.json(
        { error: "gateId is required" },
        { status: 400 },
      );
    }

    // Update token gate
    const tokenGateService = getTokenGateService();
    const tokenGate = await tokenGateService.updateTokenGate(gateId, updates);

    if (!tokenGate) {
      return NextResponse.json(
        { error: "Token gate not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ tokenGate });
  } catch (error) {
    logger.error("Error updating token gate:", error);
    return NextResponse.json(
      {
        error: "Failed to update token gate",
        details:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : String(error),
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: channelId } = await context.params;
    const searchParams = request.nextUrl.searchParams;
    const gateId = searchParams.get("gateId");

    if (!gateId) {
      return NextResponse.json(
        { error: "gateId is required" },
        { status: 400 },
      );
    }

    // Delete token gate
    const tokenGateService = getTokenGateService();
    await tokenGateService.deleteTokenGate(gateId);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error deleting token gate:", error);
    return NextResponse.json(
      {
        error: "Failed to delete token gate",
        details:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : String(error),
      },
      { status: 500 },
    );
  }
}
