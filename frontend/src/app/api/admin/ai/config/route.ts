/**
 * AI Configuration API
 * GET /api/admin/ai/config - Get AI configuration
 * POST /api/admin/ai/config - Update AI configuration
 */

import { NextRequest, NextResponse } from "next/server";
import { getCache } from "@/lib/redis-cache";

import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface AIConfig {
  openai: {
    enabled: boolean;
    apiKey?: string; // Masked
    organization?: string;
    defaultModel: string;
    fallbackModel: string;
    timeout: number;
    maxRetries: number;
  };
  anthropic: {
    enabled: boolean;
    apiKey?: string; // Masked
    defaultModel: string;
    fallbackModel: string;
    timeout: number;
    maxRetries: number;
  };
  rateLimits: {
    summarize: {
      userMaxRequests: number;
      userWindowMs: number;
      orgMaxRequests: number;
      orgWindowMs: number;
    };
    search: {
      userMaxRequests: number;
      userWindowMs: number;
      orgMaxRequests: number;
      orgWindowMs: number;
    };
    chat: {
      userMaxRequests: number;
      userWindowMs: number;
      orgMaxRequests: number;
      orgWindowMs: number;
    };
  };
  cache: {
    enabled: boolean;
    summarizationTtl: number;
    searchTtl: number;
    chatTtl: number;
    embeddingsTtl: number;
  };
  budgets: {
    dailyLimit?: number;
    monthlyLimit?: number;
    alertThresholds: number[];
  };
}

const CACHE_KEY = "ai:config";

async function getAIConfig(): Promise<AIConfig> {
  const cache = getCache();
  const cached = await cache.get<AIConfig>(CACHE_KEY);

  if (cached) return cached;

  // Default configuration
  const defaultConfig: AIConfig = {
    openai: {
      enabled: !!process.env.OPENAI_API_KEY,
      defaultModel: "gpt-4o-mini",
      fallbackModel: "gpt-3.5-turbo",
      timeout: 60000,
      maxRetries: 3,
    },
    anthropic: {
      enabled: !!process.env.ANTHROPIC_API_KEY,
      defaultModel: "claude-3-5-haiku-20241022",
      fallbackModel: "claude-3-haiku-20240307",
      timeout: 60000,
      maxRetries: 3,
    },
    rateLimits: {
      summarize: {
        userMaxRequests: 50,
        userWindowMs: 3600000,
        orgMaxRequests: 500,
        orgWindowMs: 3600000,
      },
      search: {
        userMaxRequests: 20,
        userWindowMs: 60000,
        orgMaxRequests: 1000,
        orgWindowMs: 3600000,
      },
      chat: {
        userMaxRequests: 10,
        userWindowMs: 60000,
        orgMaxRequests: 1000,
        orgWindowMs: 3600000,
      },
    },
    cache: {
      enabled: true,
      summarizationTtl: 1800,
      searchTtl: 3600,
      chatTtl: 300,
      embeddingsTtl: 7200,
    },
    budgets: {
      dailyLimit: 100,
      monthlyLimit: 1000,
      alertThresholds: [50, 75, 90, 100],
    },
  };

  return defaultConfig;
}

function maskApiKey(key?: string): string | undefined {
  if (!key) return undefined;
  if (key.length < 8) return "***";
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

export async function GET(request: NextRequest) {
  try {
    const config = await getAIConfig();

    // Mask sensitive data
    const maskedConfig = {
      ...config,
      openai: {
        ...config.openai,
        apiKey: maskApiKey(process.env.OPENAI_API_KEY),
      },
      anthropic: {
        ...config.anthropic,
        apiKey: maskApiKey(process.env.ANTHROPIC_API_KEY),
      },
    };

    return NextResponse.json({
      success: true,
      data: maskedConfig,
    });
  } catch (error) {
    logger.error("Error getting AI config:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get AI config",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const updates = await request.json();

    // Validate updates
    if (!updates || typeof updates !== "object") {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid configuration data",
        },
        { status: 400 },
      );
    }

    const currentConfig = await getAIConfig();
    const newConfig = {
      ...currentConfig,
      ...updates,
    };

    // Save to cache
    const cache = getCache();
    await cache.set(CACHE_KEY, newConfig, 0); // No expiry

    return NextResponse.json({
      success: true,
      data: newConfig,
      message: "AI configuration updated successfully",
    });
  } catch (error) {
    logger.error("Error updating AI config:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to update AI config",
      },
      { status: 500 },
    );
  }
}
