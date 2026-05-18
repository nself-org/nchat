/**
 * Slack OAuth Initiation Route
 *
 * Redirects user to Slack OAuth authorization page.
 * GET /api/auth/slack - Start Slack OAuth flow
 */

import { NextRequest, NextResponse } from "next/server";
import { handleOAuthInitiate } from "@/lib/oauth/oauth-handler";
import { withErrorHandler, compose } from "@/lib/api/middleware";

async function initiateOAuth(request: NextRequest): Promise<NextResponse> {
  return handleOAuthInitiate(request, "slack");
}

export const GET = compose(withErrorHandler)(initiateOAuth);
