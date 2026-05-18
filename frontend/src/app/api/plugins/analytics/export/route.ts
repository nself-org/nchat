/**
 * GET /api/plugins/analytics/export
 *
 * Data export endpoint for Analytics plugin
 * Supports CSV, JSON, and Excel formats
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

const ANALYTICS_SERVICE_URL =
  process.env.ANALYTICS_SERVICE_URL || "http://localhost:3106";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "json";
    const period = searchParams.get("period") || "30d";
    const metrics = searchParams.get("metrics") || "users,messages,channels";

    // Validate format
    if (!["csv", "json", "excel"].includes(format)) {
      return NextResponse.json(
        { error: "Invalid format. Supported: csv, json, excel" },
        { status: 400 },
      );
    }

    const response = await fetch(
      `${ANALYTICS_SERVICE_URL}/api/analytics/export?format=${format}&period=${period}&metrics=${metrics}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      const error = await response.text();
      logger.error("Analytics export error:", error);
      return NextResponse.json(
        { error: "Failed to export analytics data" },
        { status: response.status },
      );
    }

    // For JSON, return as-is
    if (format === "json") {
      const data = await response.json();
      return NextResponse.json(data);
    }

    // For CSV/Excel, return as file download
    const contentType =
      format === "csv"
        ? "text/csv"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    const filename = `analytics-${period}-${Date.now()}.${format === "excel" ? "xlsx" : format}`;

    const data = await response.arrayBuffer();

    return new NextResponse(data, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    logger.error("Analytics export proxy error:", error);
    return NextResponse.json(
      { error: "Analytics service unavailable" },
      { status: 503 },
    );
  }
}

export const dynamic = "force-dynamic";
