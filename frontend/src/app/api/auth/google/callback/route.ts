/**
 * Google OAuth Callback Route
 *
 * Handles Google OAuth callback and user authentication.
 * GET /api/auth/google/callback - Process Google OAuth response
 */

import { NextRequest, NextResponse } from "next/server";
import { handleOAuthCallback } from "@/lib/oauth/oauth-handler";
import { withErrorHandler, compose } from "@/lib/api/middleware";

async function processCallback(request: NextRequest): Promise<NextResponse> {
  return handleOAuthCallback(request, "google");
}

export const GET = compose(withErrorHandler)(processCallback);
