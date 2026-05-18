/**
 * Discord OAuth Initiation Route
 *
 * Redirects user to Discord OAuth authorization page.
 * GET /api/auth/discord - Start Discord OAuth flow
 */

import { NextRequest, NextResponse } from "next/server";
import { handleOAuthInitiate } from "@/lib/oauth/oauth-handler";
import { withErrorHandler, compose } from "@/lib/api/middleware";

async function initiateOAuth(request: NextRequest): Promise<NextResponse> {
  return handleOAuthInitiate(request, "discord");
}

export const GET = compose(withErrorHandler)(initiateOAuth);
