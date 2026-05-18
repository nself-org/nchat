/**
 * API Documentation Route
 *
 * Serves interactive API documentation. Redirects to the OpenAPI spec.
 * Swagger UI rendering is handled client-side at /api-docs.
 */

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  return NextResponse.redirect(new URL("/api/openapi.json", request.url));
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
