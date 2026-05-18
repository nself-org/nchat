/**
 * Slack OAuth Callback Route
 *
 * Handles Slack OAuth callback and user authentication.
 * GET /api/auth/slack/callback - Process Slack OAuth response
 */

import { NextRequest, NextResponse } from "next/server";
import { handleOAuthCallback } from "@/lib/oauth/oauth-handler";
import { withErrorHandler, compose } from "@/lib/api/middleware";

async function processCallback(request: NextRequest): Promise<NextResponse> {
  return handleOAuthCallback(request, "slack");
}

export const GET = compose(withErrorHandler)(processCallback);
