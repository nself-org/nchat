/**
 * AI Embeddings API Route
 * POST /api/ai/embed
 * Generate embeddings for text content in batch
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getEmbeddingService,
  type BatchEmbeddingRequest,
  type BatchEmbeddingResponse,
} from "@/lib/ai/embeddings";
import { captureError } from "@/lib/sentry-utils";

import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // 1 minute timeout for batch operations

interface EmbedRequest {
  texts: string[];
  model?: string;
}

interface EmbedResponse {
  success: boolean;
  embeddings?: number[][];
  model?: string;
  usage?: {
    promptTokens: number;
    totalTokens: number;
  };
  cached?: number;
  generated?: number;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as EmbedRequest;

    // Validate request
    if (!body.texts || !Array.isArray(body.texts)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request: texts array required",
        } as EmbedResponse,
        { status: 400 },
      );
    }

    if (body.texts.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "At least one text is required",
        } as EmbedResponse,
        { status: 400 },
      );
    }

    // Limit batch size to prevent abuse
    const MAX_BATCH_SIZE = 100;
    if (body.texts.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: `Batch size too large. Maximum: ${MAX_BATCH_SIZE}`,
        } as EmbedResponse,
        { status: 400 },
      );
    }

    // Validate text lengths
    const MAX_TEXT_LENGTH = 8000; // Leave room for tokenization
    for (let i = 0; i < body.texts.length; i++) {
      if (typeof body.texts[i] !== "string") {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid text at index ${i}: must be a string`,
          } as EmbedResponse,
          { status: 400 },
        );
      }

      if (body.texts[i].length > MAX_TEXT_LENGTH) {
        return NextResponse.json(
          {
            success: false,
            error: `Text at index ${i} is too long. Maximum: ${MAX_TEXT_LENGTH} characters`,
          } as EmbedResponse,
          { status: 400 },
        );
      }

      if (body.texts[i].trim().length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: `Text at index ${i} is empty`,
          } as EmbedResponse,
          { status: 400 },
        );
      }
    }

    const embeddingService = getEmbeddingService(body.model);

    // Check if service is available
    if (!embeddingService.isAvailable()) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Embedding service not available. Please configure OpenAI API key.",
        } as EmbedResponse,
        { status: 503 },
      );
    }

    // Generate embeddings
    const result = await embeddingService.generateBatchEmbeddings({
      texts: body.texts,
      model: body.model,
    });

    return NextResponse.json({
      success: true,
      embeddings: result.embeddings,
      model: result.model,
      usage: result.usage,
      cached: result.cached,
      generated: result.generated,
    } as EmbedResponse);
  } catch (error) {
    logger.error("Embedding generation error:", error);
    captureError(error as Error, {
      tags: { api: "ai-embed" },
      extra: {
        textsCount: (error as any)?.textsCount,
      },
    });

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Embedding generation failed",
      } as EmbedResponse,
      { status: 500 },
    );
  }
}

// GET endpoint for status and stats
export async function GET() {
  try {
    const embeddingService = getEmbeddingService();

    const stats = embeddingService.getStats();
    const model = embeddingService.getModel();
    const available = embeddingService.isAvailable();

    return NextResponse.json({
      success: true,
      available,
      model: {
        name: model.name,
        provider: model.provider,
        dimensions: model.dimensions,
        maxTokens: model.maxTokens,
      },
      stats: {
        cacheSize: stats.cacheSize,
        cacheHits: stats.cacheHits,
        cacheMisses: stats.cacheMisses,
        totalRequests: stats.totalRequests,
        totalTokens: stats.totalTokens,
        totalCost: stats.totalCost,
        hitRate: Math.round(stats.hitRate * 100),
      },
    });
  } catch (error) {
    captureError(error as Error, {
      tags: { api: "ai-embed-status" },
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get status",
      },
      { status: 500 },
    );
  }
}

// OPTIONS for CORS
export async function OPTIONS() {
  // Restrict CORS to the configured app URL instead of wildcard.
  // Wildcard allows any origin to read embedding responses (cross-site data
  // exfiltration). See: CWE-346 / P96 SEC finding sec-nchat-cors-wildcard.
  const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      Vary: "Origin",
    },
  });
}
