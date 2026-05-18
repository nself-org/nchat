/**
 * GET/POST /api/admin/audit/integrity
 *
 * Audit log integrity verification endpoints.
 * Provides tamper detection and chain verification.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuditQueryService } from "@/services/audit/audit-query.service";
import { logger } from "@/lib/logger";

/**
 * GET /api/admin/audit/integrity
 *
 * Verify the integrity of the audit log chain.
 *
 * Query parameters:
 * - full: Perform full chain verification (slower but complete)
 * - entryId: Verify specific entry only
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const fullVerification = searchParams.get("full") === "true";
    const entryId = searchParams.get("entryId");

    const queryService = getAuditQueryService();

    // Verify specific entry
    if (entryId) {
      const result = await queryService.verifyEntry(entryId);

      return NextResponse.json({
        success: true,
        entryId,
        valid: result.valid,
        errors: result.errors,
        verifiedAt: new Date().toISOString(),
      });
    }

    // Full chain verification
    const result = await queryService.verifyIntegrity();

    return NextResponse.json({
      success: true,
      verification: {
        isValid: result.isValid,
        status: result.isValid ? "valid" : "compromised",
        totalEntries: result.totalEntries,
        verifiedEntries: result.verifiedEntries,
        invalidEntries: result.invalidEntries,
        compromisedBlocks: result.compromisedBlocks,
        firstInvalidBlock: result.firstInvalidBlock,
        errors: result.errors,
        verifiedAt: result.verifiedAt.toISOString(),
        durationMs: result.verificationDurationMs,
      },
      chainMetadata: {
        chainId: result.chainMetadata.chainId,
        genesisHash: result.chainMetadata.genesisHash,
        currentHash: result.chainMetadata.currentHash,
        startBlock: result.chainMetadata.startBlock,
        endBlock: result.chainMetadata.endBlock,
        totalBlocks: result.chainMetadata.totalBlocks,
        integrityStatus: result.chainMetadata.integrityStatus,
      },
    });
  } catch (error) {
    logger.error("[Audit Integrity API] GET error", error);
    return NextResponse.json(
      { success: false, error: "Failed to verify integrity" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/audit/integrity
 *
 * Trigger integrity verification with options
 *
 * Body parameters:
 * - entryIds: Optional array of entry IDs to verify
 * - startBlock: Optional start block number
 * - endBlock: Optional end block number
 * - alertOnFailure: Send alert if integrity check fails (default: true)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      entryIds,
      startBlock,
      endBlock,
      alertOnFailure = true,
    } = body as {
      entryIds?: string[];
      startBlock?: number;
      endBlock?: number;
      alertOnFailure?: boolean;
    };

    const queryService = getAuditQueryService();

    // If specific entry IDs provided, verify each
    if (entryIds && entryIds.length > 0) {
      const results = await Promise.all(
        entryIds.map(async (id) => {
          const result = await queryService.verifyEntry(id);
          return { entryId: id, ...result };
        }),
      );

      const allValid = results.every((r) => r.valid);

      return NextResponse.json({
        success: true,
        allValid,
        results,
        verifiedAt: new Date().toISOString(),
      });
    }

    // Full verification
    const result = await queryService.verifyIntegrity();

    // Log integrity status
    if (!result.isValid) {
      logger.security("[Audit Integrity] Chain integrity compromised", {
        compromisedBlocks: result.compromisedBlocks,
        errors: result.errors,
      });

      if (alertOnFailure) {
        // In a real implementation, this would trigger an alert
        logger.warn("[Audit Integrity] Alert triggered for integrity failure");
      }
    }

    return NextResponse.json({
      success: true,
      verification: {
        isValid: result.isValid,
        status: result.isValid ? "valid" : "compromised",
        totalEntries: result.totalEntries,
        verifiedEntries: result.verifiedEntries,
        invalidEntries: result.invalidEntries,
        compromisedBlocks: result.compromisedBlocks,
        firstInvalidBlock: result.firstInvalidBlock,
        errors: result.errors,
        verifiedAt: result.verifiedAt.toISOString(),
        durationMs: result.verificationDurationMs,
      },
      recommendations: !result.isValid
        ? [
            "Review compromised blocks for potential tampering",
            "Check system logs for unauthorized access",
            "Consider restoring from backup if available",
            "Enable additional monitoring for the affected time period",
          ]
        : [],
    });
  } catch (error) {
    logger.error("[Audit Integrity API] POST error", error);
    return NextResponse.json(
      { success: false, error: "Failed to verify integrity" },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
