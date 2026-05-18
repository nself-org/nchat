/**
 * Gitlab OAuth Callback Route
 *
 * Handles Gitlab OAuth callback and user authentication.
 * GET /api/auth/gitlab/callback - Process Gitlab OAuth response
 */

import { NextRequest, NextResponse } from "next/server";
import { handleOAuthCallback } from "@/lib/oauth/oauth-handler";
import { withErrorHandler, compose } from "@/lib/api/middleware";

async function processCallback(request: NextRequest): Promise<NextResponse> {
  return handleOAuthCallback(request, "gitlab");
}

export const GET = compose(withErrorHandler)(processCallback);
