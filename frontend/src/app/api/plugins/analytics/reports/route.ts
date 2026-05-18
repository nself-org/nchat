/**
 * GET/POST /api/plugins/analytics/reports
 *
 * Custom reports endpoint for Analytics plugin
 * Supports creating, scheduling, and fetching reports
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

const ANALYTICS_SERVICE_URL =
  process.env.ANALYTICS_SERVICE_URL || "http://localhost:3106";

// GET - Fetch all reports or a specific report
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get("id");

    const endpoint = reportId
      ? `${ANALYTICS_SERVICE_URL}/api/analytics/reports/${reportId}`
      : `${ANALYTICS_SERVICE_URL}/api/analytics/reports`;

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error("Analytics reports fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch reports" },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    logger.error("Analytics reports proxy error:", error);
    return NextResponse.json(
      { error: "Analytics service unavailable" },
      { status: 503 },
    );
  }
}

// POST - Create a new report or schedule a report
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.period || !body.metrics) {
      return NextResponse.json(
        { error: "Missing required fields: name, period, metrics" },
        { status: 400 },
      );
    }

    // Validate metrics
    const validMetrics = [
      "activeUsers",
      "messageVolume",
      "channelGrowth",
      "engagement",
      "retention",
    ];
    const invalidMetrics = body.metrics.filter(
      (m: string) => !validMetrics.includes(m),
    );
    if (invalidMetrics.length > 0) {
      return NextResponse.json(
        {
          error: `Invalid metrics: ${invalidMetrics.join(", ")}. Valid: ${validMetrics.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const response = await fetch(
      `${ANALYTICS_SERVICE_URL}/api/analytics/reports`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      logger.error("Analytics report creation error:", error);
      return NextResponse.json(
        { error: "Failed to create report" },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    logger.error("Analytics reports POST proxy error:", error);
    return NextResponse.json(
      { error: "Analytics service unavailable" },
      { status: 503 },
    );
  }
}

// DELETE - Delete a report
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get("id");

    if (!reportId) {
      return NextResponse.json(
        { error: "Report ID required" },
        { status: 400 },
      );
    }

    const response = await fetch(
      `${ANALYTICS_SERVICE_URL}/api/analytics/reports/${reportId}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      const error = await response.text();
      logger.error("Analytics report deletion error:", error);
      return NextResponse.json(
        { error: "Failed to delete report" },
        { status: response.status },
      );
    }

    return NextResponse.json({ success: true, message: "Report deleted" });
  } catch (error) {
    logger.error("Analytics reports DELETE proxy error:", error);
    return NextResponse.json(
      { error: "Analytics service unavailable" },
      { status: 503 },
    );
  }
}

export const dynamic = "force-dynamic";
