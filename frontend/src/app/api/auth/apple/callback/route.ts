/**
 * Apple OAuth Callback Route
 *
 * Handles Apple OAuth callback and user authentication.
 * GET /api/auth/apple/callback - Process Apple OAuth response
 */

import { NextRequest, NextResponse } from "next/server";
import { handleOAuthCallback } from "@/lib/oauth/oauth-handler";
import { withErrorHandler, compose } from "@/lib/api/middleware";

async function processCallback(request: NextRequest): Promise<NextResponse> {
  return handleOAuthCallback(request, "apple");
}

export const GET = compose(withErrorHandler)(processCallback);
