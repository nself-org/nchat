/**
 * Prometheus Metrics Endpoint
 *
 * Exposes application metrics in Prometheus format for scraping.
 */

import { NextRequest, NextResponse } from "next/server";
import { performanceMonitor } from "@/lib/performance/monitoring";
import { logger } from "@/lib/logger";

/**
 * Format metric in Prometheus exposition format
 */
function formatMetric(
  name: string,
  value: number,
  type: "gauge" | "counter",
  help: string,
): string {
  const metricName = `nchat_${name.replace(/-/g, "_")}`;
  let output = "";
  output += `# HELP ${metricName} ${help}\n`;
  output += `# TYPE ${metricName} ${type}\n`;
  output += `${metricName} ${value}\n`;
  return output;
}

export async function GET(req: NextRequest) {
  try {
    let output = "# Prometheus Metrics for nself-chat\n\n";

    // Business metrics (mock for now)
    output += formatMetric(
      "messages_sent_total",
      150000,
      "counter",
      "Total messages sent",
    );
    output += formatMetric("active_users", 250, "gauge", "Active users (5min)");
    output += formatMetric(
      "uptime_seconds",
      process.uptime(),
      "counter",
      "Process uptime",
    );

    output += `\n# Generated at ${new Date().toISOString()}\n`;

    return new NextResponse(output, {
      headers: {
        "Content-Type": "text/plain; version=0.0.4",
        "Cache-Control": "no-store, must-revalidate",
      },
    });
  } catch (error) {
    logger.error("Failed to generate metrics", error);
    return NextResponse.json(
      { error: "Failed to generate metrics" },
      { status: 500 },
    );
  }
}
