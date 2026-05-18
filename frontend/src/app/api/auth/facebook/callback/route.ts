/**
 * Facebook OAuth Callback Route
 *
 * Handles Facebook OAuth callback and user authentication.
 * GET /api/auth/facebook/callback - Process Facebook OAuth response
 */

import { NextRequest, NextResponse } from "next/server";
import { handleOAuthCallback } from "@/lib/oauth/oauth-handler";
import { withErrorHandler, compose } from "@/lib/api/middleware";

async function processCallback(request: NextRequest): Promise<NextResponse> {
  return handleOAuthCallback(request, "facebook");
}

export const GET = compose(withErrorHandler)(processCallback);
