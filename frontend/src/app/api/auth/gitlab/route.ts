/**
 * Gitlab OAuth Initiation Route
 *
 * Redirects user to Gitlab OAuth authorization page.
 * GET /api/auth/gitlab - Start Gitlab OAuth flow
 */

import { NextRequest, NextResponse } from "next/server";
import { handleOAuthInitiate } from "@/lib/oauth/oauth-handler";
import { withErrorHandler, compose } from "@/lib/api/middleware";

async function initiateOAuth(request: NextRequest): Promise<NextResponse> {
  return handleOAuthInitiate(request, "gitlab");
}

export const GET = compose(withErrorHandler)(initiateOAuth);
