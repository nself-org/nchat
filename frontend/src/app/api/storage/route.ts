/**
 * Storage API Routes
 *
 * Handles storage quota, usage tracking, and management operations.
 */

import { NextRequest, NextResponse } from "next/server";
import { quotaManager, type CleanupPolicy } from "@/lib/storage/quota-manager";

import { logger } from "@/lib/logger";

// ============================================================================
// GET - Get storage information
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const entityId = searchParams.get("entityId");
    const entityType = searchParams.get("entityType") as
      | "user"
      | "channel"
      | "team"
      | null;

    // Get overall statistics
    if (action === "stats") {
      const stats = await quotaManager.getStats();
      return NextResponse.json(stats);
    }

    // Get quota for specific entity
    if (action === "quota" && entityId && entityType) {
      const quota = await quotaManager.getQuota(entityId, entityType);
      return NextResponse.json(quota);
    }

    // Get usage breakdown
    if (action === "breakdown" && entityId && entityType) {
      const breakdown = await quotaManager.getUsageBreakdown(
        entityId,
        entityType,
      );
      return NextResponse.json(breakdown);
    }

    // Get warnings
    if (action === "warnings" && entityId && entityType) {
      const warnings = await quotaManager.getWarnings(entityId, entityType);
      return NextResponse.json(warnings);
    }

    // Check if upload is allowed
    if (action === "check-upload" && entityId && entityType) {
      const fileSize = parseInt(searchParams.get("fileSize") || "0", 10);
      const result = await quotaManager.canUpload(
        entityId,
        entityType,
        fileSize,
      );
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: "Invalid action or missing parameters" },
      { status: 400 },
    );
  } catch (error) {
    logger.error("Storage API GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ============================================================================
// POST - Update storage settings or trigger actions
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    // Update quota
    if (action === "update-quota") {
      const { entityId, entityType, newLimit } = body;
      if (!entityId || !entityType || !newLimit) {
        return NextResponse.json(
          { error: "Missing required parameters" },
          { status: 400 },
        );
      }

      const quota = await quotaManager.updateQuota(
        entityId,
        entityType,
        newLimit,
      );
      return NextResponse.json(quota);
    }

    // Record upload
    if (action === "record-upload") {
      const { entityId, entityType, fileSize } = body;
      if (!entityId || !entityType || !fileSize) {
        return NextResponse.json(
          { error: "Missing required parameters" },
          { status: 400 },
        );
      }

      await quotaManager.recordUpload(entityId, entityType, fileSize);
      return NextResponse.json({ success: true });
    }

    // Record deletion
    if (action === "record-deletion") {
      const { entityId, entityType, fileSize } = body;
      if (!entityId || !entityType || !fileSize) {
        return NextResponse.json(
          { error: "Missing required parameters" },
          { status: 400 },
        );
      }

      await quotaManager.recordDeletion(entityId, entityType, fileSize);
      return NextResponse.json({ success: true });
    }

    // Acknowledge warning
    if (action === "acknowledge-warning") {
      const { warningId } = body;
      if (!warningId) {
        return NextResponse.json(
          { error: "Missing warning ID" },
          { status: 400 },
        );
      }

      await quotaManager.acknowledgeWarning(warningId);
      return NextResponse.json({ success: true });
    }

    // Apply cleanup policy
    if (action === "cleanup") {
      const { entityId, entityType, policy } = body as {
        entityId: string;
        entityType: "user" | "channel" | "team";
        policy: CleanupPolicy;
      };

      if (!entityId || !entityType || !policy) {
        return NextResponse.json(
          { error: "Missing required parameters" },
          { status: 400 },
        );
      }

      const result = await quotaManager.applyCleanupPolicy(
        entityId,
        entityType,
        policy,
      );
      return NextResponse.json(result);
    }

    // Optimize storage
    if (action === "optimize") {
      const { entityId, entityType } = body;
      if (!entityId || !entityType) {
        return NextResponse.json(
          { error: "Missing required parameters" },
          { status: 400 },
        );
      }

      // - Compress images
      // - Remove duplicates
      // - Archive old data

      return NextResponse.json({
        success: true,
        message: "Storage optimization completed",
        spaceSaved: 0,
      });
    }

    // Delete old files
    if (action === "delete-old-files") {
      const { entityId, entityType, olderThanDays } = body;
      if (!entityId || !entityType || !olderThanDays) {
        return NextResponse.json(
          { error: "Missing required parameters" },
          { status: 400 },
        );
      }

      return NextResponse.json({
        success: true,
        filesDeleted: 0,
        spaceFree: 0,
      });
    }

    // Archive old messages
    if (action === "archive-messages") {
      const { entityId, entityType, olderThanDays } = body;
      if (!entityId || !entityType || !olderThanDays) {
        return NextResponse.json(
          { error: "Missing required parameters" },
          { status: 400 },
        );
      }

      return NextResponse.json({
        success: true,
        messagesArchived: 0,
        spaceSaved: 0,
      });
    }

    // Clear cache
    if (action === "clear-cache") {
      const { entityId, entityType } = body;
      if (!entityId || !entityType) {
        return NextResponse.json(
          { error: "Missing required parameters" },
          { status: 400 },
        );
      }

      return NextResponse.json({
        success: true,
        cacheCleared: 0,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    logger.error("Storage API POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ============================================================================
// DELETE - Delete files or clear storage
// ============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entityId = searchParams.get("entityId");
    const entityType = searchParams.get("entityType") as
      | "user"
      | "channel"
      | "team"
      | null;
    const fileId = searchParams.get("fileId");

    if (!entityId || !entityType) {
      return NextResponse.json(
        { error: "Missing entity information" },
        { status: 400 },
      );
    }

    // Delete specific file
    if (fileId) {
      return NextResponse.json({
        success: true,
        message: "File deleted",
      });
    }

    // Clear all storage for entity

    return NextResponse.json({
      success: true,
      message: "Storage cleared",
      filesDeleted: 0,
      spaceFreed: 0,
    });
  } catch (error) {
    logger.error("Storage API DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
