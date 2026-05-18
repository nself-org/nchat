/**
 * Microsoft OAuth Callback Route
 *
 * Handles Microsoft OAuth callback and user authentication.
 * GET /api/auth/microsoft/callback - Process Microsoft OAuth response
 */

import { NextRequest, NextResponse } from "next/server";
import { handleOAuthCallback } from "@/lib/oauth/oauth-handler";
import { withErrorHandler, compose } from "@/lib/api/middleware";

async function processCallback(request: NextRequest): Promise<NextResponse> {
  return handleOAuthCallback(request, "microsoft");
}

export const GET = compose(withErrorHandler)(processCallback);
