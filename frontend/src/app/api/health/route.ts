import { NextResponse } from "next/server";

export async function GET() {
  const startTime = Date.now();

  const result = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || "0.0.0",
    environment: process.env.NODE_ENV || "unknown",
  };

  return NextResponse.json(result, {
    status: 200,
    headers: {
      "Cache-Control": "no-cache",
      "X-Response-Time": String(Date.now() - startTime) + "ms",
    },
  });
}
