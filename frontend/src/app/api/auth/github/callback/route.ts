/**
 * Github OAuth Callback Route
 *
 * Handles Github OAuth callback and user authentication.
 * GET /api/auth/github/callback - Process Github OAuth response
 */

import { NextRequest, NextResponse } from "next/server";
import { handleOAuthCallback } from "@/lib/oauth/oauth-handler";
import { withErrorHandler, compose } from "@/lib/api/middleware";

async function processCallback(request: NextRequest): Promise<NextResponse> {
  return handleOAuthCallback(request, "github");
}

export const GET = compose(withErrorHandler)(processCallback);
