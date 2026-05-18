/**
 * POST /api/plugins/ai/chat
 *
 * Proxy to AI Orchestration plugin service (port 3109)
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:3109";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(`${AI_SERVICE_URL}/api/ai/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error("AI service error:", error);
      return NextResponse.json(
        { error: "AI chat request failed" },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    logger.error("AI chat proxy error:", error);
    return NextResponse.json(
      { error: "AI service unavailable" },
      { status: 503 },
    );
  }
}

export const dynamic = "force-dynamic";
