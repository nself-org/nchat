/**
 * GET /api/plugins/analytics/insights
 *
 * AI-powered insights endpoint for Analytics plugin
 * Provides trend analysis, anomaly detection, and recommendations
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

const ANALYTICS_SERVICE_URL =
  process.env.ANALYTICS_SERVICE_URL || "http://localhost:3106";

export interface AnalyticsInsight {
  id: string;
  type: "trend" | "anomaly" | "recommendation" | "milestone";
  severity: "info" | "warning" | "critical" | "success";
  title: string;
  message: string;
  recommendation?: string;
  metric?: string;
  value?: number;
  previousValue?: number;
  change?: string;
  detectedAt: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "30d";
    const type = searchParams.get("type"); // Optional: filter by insight type
    const limit = searchParams.get("limit") || "10";

    let url = `${ANALYTICS_SERVICE_URL}/api/analytics/insights?period=${period}&limit=${limit}`;
    if (type) {
      url += `&type=${type}`;
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error("Analytics insights error:", error);
      return NextResponse.json(
        { error: "Failed to fetch insights" },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    logger.error("Analytics insights proxy error:", error);
    return NextResponse.json(
      { error: "Analytics service unavailable" },
      { status: 503 },
    );
  }
}

export const dynamic = "force-dynamic";
