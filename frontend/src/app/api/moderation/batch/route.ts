/**
 * API Route: Batch moderation processing
 * POST /api/moderation/batch
 * Process multiple content items in parallel
 */

import { NextRequest, NextResponse } from "next/server";
import { getAIModerator } from "@/lib/moderation/ai-moderator";
import { captureError } from "@/lib/sentry-utils";

import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // 60 seconds for batch processing

interface BatchItem {
  contentId: string;
  contentType: "text" | "image" | "video" | "file" | "profile" | "channel";
  content: string;
  metadata?: any;
}

interface BatchResult {
  contentId: string;
  success: boolean;
  analysis?: any;
  error?: string;
  processingTime: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items, policy, maxConcurrency = 10 } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Items array is required" },
        { status: 400 },
      );
    }

    // Limit batch size
    if (items.length > 100) {
      return NextResponse.json(
        { error: "Maximum batch size is 100 items" },
        { status: 400 },
      );
    }

    // Initialize AI Moderator
    const moderator = getAIModerator(policy);
    await moderator.initialize();

    const batchStartTime = Date.now();
    const results: BatchResult[] = [];
    const errors: string[] = [];

    // Process items in batches to avoid overwhelming the system
    const chunks = chunkArray(items, maxConcurrency);

    for (const chunk of chunks) {
      const chunkPromises = chunk.map(async (item: BatchItem) => {
        const itemStartTime = Date.now();

        try {
          const analysis = await moderator.analyzeContent(
            item.contentId,
            item.contentType,
            item.content,
            item.metadata,
          );

          // Record violation if needed
          if (analysis.shouldFlag && item.metadata?.userId) {
            const maxSeverity = Math.max(
              ...analysis.detectedIssues.map((i) => {
                switch (i.severity) {
                  case "critical":
                    return 4;
                  case "high":
                    return 3;
                  case "medium":
                    return 2;
                  case "low":
                    return 1;
                  default:
                    return 0;
                }
              }),
            );

            const severity =
              maxSeverity === 4
                ? "critical"
                : maxSeverity === 3
                  ? "high"
                  : maxSeverity === 2
                    ? "medium"
                    : "low";

            await moderator.recordViolation(item.metadata.userId, severity);
          }

          results.push({
            contentId: item.contentId,
            success: true,
            analysis,
            processingTime: Date.now() - itemStartTime,
          });
        } catch (error) {
          const errorMsg =
            error instanceof Error
              ? error instanceof Error
                ? error.message
                : String(error)
              : "Unknown error";
          errors.push(`${item.contentId}: ${errorMsg}`);

          results.push({
            contentId: item.contentId,
            success: false,
            error: errorMsg,
            processingTime: Date.now() - itemStartTime,
          });
        }
      });

      await Promise.all(chunkPromises);
    }

    const batchProcessingTime = Date.now() - batchStartTime;
    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    // Calculate statistics
    const flaggedCount = results.filter(
      (r) => r.success && r.analysis?.shouldFlag,
    ).length;
    const highPriorityCount = results.filter(
      (r) =>
        r.success &&
        (r.analysis?.priority === "high" ||
          r.analysis?.priority === "critical"),
    ).length;

    return NextResponse.json({
      success: true,
      stats: {
        total: items.length,
        success: successCount,
        failure: failureCount,
        flagged: flaggedCount,
        highPriority: highPriorityCount,
        processingTime: batchProcessingTime,
        avgProcessingTime: batchProcessingTime / items.length,
      },
      results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    logger.error("Batch moderation error:", error);
    captureError(error as Error, {
      tags: { feature: "moderation", endpoint: "batch" },
    });

    return NextResponse.json(
      {
        error: "Failed to process batch",
        details:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * Helper: Chunk array into smaller arrays
 */
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
