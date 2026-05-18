/**
 * Github OAuth Initiation Route
 *
 * Redirects user to Github OAuth authorization page.
 * GET /api/auth/github - Start Github OAuth flow
 */

import { NextRequest, NextResponse } from "next/server";
import { handleOAuthInitiate } from "@/lib/oauth/oauth-handler";
import { withErrorHandler, compose } from "@/lib/api/middleware";

async function initiateOAuth(request: NextRequest): Promise<NextResponse> {
  return handleOAuthInitiate(request, "github");
}

export const GET = compose(withErrorHandler)(initiateOAuth);
