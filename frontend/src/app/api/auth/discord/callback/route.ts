/**
 * Discord OAuth Callback Route
 *
 * Handles Discord OAuth callback and user authentication.
 * GET /api/auth/discord/callback - Process Discord OAuth response
 */

import { NextRequest, NextResponse } from "next/server";
import { handleOAuthCallback } from "@/lib/oauth/oauth-handler";
import { withErrorHandler, compose } from "@/lib/api/middleware";

async function processCallback(request: NextRequest): Promise<NextResponse> {
  return handleOAuthCallback(request, "discord");
}

export const GET = compose(withErrorHandler)(processCallback);
