/**
 * Twitter OAuth Initiation Route
 *
 * Redirects user to Twitter OAuth authorization page.
 * GET /api/auth/twitter - Start Twitter OAuth flow
 */

import { NextRequest, NextResponse } from "next/server";
import { handleOAuthInitiate } from "@/lib/oauth/oauth-handler";
import { withErrorHandler, compose } from "@/lib/api/middleware";

async function initiateOAuth(request: NextRequest): Promise<NextResponse> {
  return handleOAuthInitiate(request, "twitter");
}

export const GET = compose(withErrorHandler)(initiateOAuth);
