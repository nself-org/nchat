/**
 * Token Gate Cache Invalidation API Routes
 *
 * POST /api/web3/token-gate/invalidate - Invalidate verification cache
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";

import {
  invalidateGateCache,
  invalidateWalletCache,
  invalidateContractCache,
  handleCacheInvalidation,
  cleanupExpiredCache,
} from "@/services/web3/token-gate.service";

import type {
  ChainId,
  CacheInvalidationEvent,
} from "@/lib/web3/token-gate-types";

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const invalidateGateSchema = z.object({
  type: z.literal("gate"),
  gateId: z.string().min(1),
  reason: z.string().optional(),
});

const invalidateWalletSchema = z.object({
  type: z.literal("wallet"),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  reason: z.string().optional(),
});

const invalidateContractSchema = z.object({
  type: z.literal("contract"),
  contractAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  chainId: z.string().optional(),
  reason: z.string().optional(),
});

const invalidateTransferSchema = z.object({
  type: z.literal("transfer"),
  fromAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/)
    .optional(),
  toAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/)
    .optional(),
  contractAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  chainId: z.string(),
  transactionHash: z.string().optional(),
});

const cleanupSchema = z.object({
  type: z.literal("cleanup"),
});

const invalidateRequestSchema = z.discriminatedUnion("type", [
  invalidateGateSchema,
  invalidateWalletSchema,
  invalidateContractSchema,
  invalidateTransferSchema,
  cleanupSchema,
]);

// =============================================================================
// POST /api/web3/token-gate/invalidate
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validationResult = invalidateRequestSchema.safeParse(body);

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

    switch (data.type) {
      case "gate": {
        invalidateGateCache(data.gateId, data.reason);
        return NextResponse.json({
          success: true,
          message: `Cache invalidated for gate: ${data.gateId}`,
        });
      }

      case "wallet": {
        invalidateWalletCache(data.walletAddress, data.reason);
        return NextResponse.json({
          success: true,
          message: `Cache invalidated for wallet: ${data.walletAddress}`,
        });
      }

      case "contract": {
        invalidateContractCache(
          data.contractAddress,
          data.chainId as ChainId,
          data.reason,
        );
        return NextResponse.json({
          success: true,
          message: `Cache invalidated for contract: ${data.contractAddress}`,
        });
      }

      case "transfer": {
        // Handle token transfer event - invalidate both sender and receiver caches
        const event: CacheInvalidationEvent = {
          type: "transfer",
          contractAddress: data.contractAddress,
          chainId: data.chainId as ChainId,
          timestamp: new Date(),
          reason: `Token transfer: ${data.transactionHash || "unknown tx"}`,
        };

        // Invalidate sender
        if (data.fromAddress) {
          event.walletAddress = data.fromAddress;
          handleCacheInvalidation(event);
        }

        // Invalidate receiver
        if (data.toAddress) {
          event.walletAddress = data.toAddress;
          handleCacheInvalidation(event);
        }

        return NextResponse.json({
          success: true,
          message: "Transfer cache invalidation processed",
          invalidatedAddresses: [data.fromAddress, data.toAddress].filter(
            Boolean,
          ),
        });
      }

      case "cleanup": {
        cleanupExpiredCache();
        return NextResponse.json({
          success: true,
          message: "Expired cache entries cleaned up",
        });
      }

      default:
        return NextResponse.json(
          { error: "Unknown invalidation type" },
          { status: 400 },
        );
    }
  } catch (error) {
    logger.error("Error invalidating token gate cache:", error);
    const message =
      error instanceof Error
        ? error instanceof Error
          ? error.message
          : String(error)
        : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
