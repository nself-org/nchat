/**
 * Admin API: Generate Embeddings
 *
 * Endpoint to start bulk embedding generation job
 *
 * POST /api/admin/embeddings/generate
 */

import { NextRequest, NextResponse } from "next/server";
import { embeddingPipeline } from "@/lib/ai/embedding-pipeline";

import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { userId, type = "initial" } = body;

    // Validate type
    if (!["initial", "reindex", "repair"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid job type. Must be: initial, reindex, or repair" },
        { status: 400 },
      );
    }

    // Start appropriate job
    let jobId: string;

    if (type === "repair") {
      jobId = await embeddingPipeline.retryFailedEmbeddings(userId);
    } else {
      jobId = await embeddingPipeline.generateAllEmbeddings(userId);
    }

    return NextResponse.json({
      success: true,
      jobId,
      message: `Embedding generation job started (type: ${type})`,
    });
  } catch (error) {
    logger.error("Generate embeddings API error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Failed to start embedding generation",
      },
      { status: 500 },
    );
  }
}
