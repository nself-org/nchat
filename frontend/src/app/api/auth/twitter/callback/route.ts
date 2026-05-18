/**
 * Twitter OAuth Callback Route
 *
 * Handles Twitter OAuth callback and user authentication.
 * GET /api/auth/twitter/callback - Process Twitter OAuth response
 */

import { NextRequest, NextResponse } from "next/server";
import { handleOAuthCallback } from "@/lib/oauth/oauth-handler";
import { withErrorHandler, compose } from "@/lib/api/middleware";

async function processCallback(request: NextRequest): Promise<NextResponse> {
  return handleOAuthCallback(request, "twitter");
}

export const GET = compose(withErrorHandler)(processCallback);
