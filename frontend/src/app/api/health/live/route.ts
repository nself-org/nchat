/**
 * Liveness Check Endpoint
 *
 * Used by Kubernetes/orchestrators to determine if the app is alive.
 * Returns 200 OK if alive, 503 Service Unavailable if dead (should restart).
 */

import { NextResponse } from "next/server";

export async function GET() {
  // Simple liveness check - just verify the process is running
  // Should never fail unless the app is completely stuck

  return NextResponse.json(
    {
      alive: true,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    },
  );
}
