/**
 * Apple OAuth Initiation Route
 *
 * Redirects user to Apple OAuth authorization page.
 * GET /api/auth/apple - Start Apple OAuth flow
 */

import { NextRequest, NextResponse } from "next/server";
import { handleOAuthInitiate } from "@/lib/oauth/oauth-handler";
import { withErrorHandler, compose } from "@/lib/api/middleware";

async function initiateOAuth(request: NextRequest): Promise<NextResponse> {
  return handleOAuthInitiate(request, "apple");
}

export const GET = compose(withErrorHandler)(initiateOAuth);
