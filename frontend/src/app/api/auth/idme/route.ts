/**
 * ID.me OAuth Initiation Route
 *
 * Redirects user to ID.me OAuth authorization page for verification.
 * GET /api/auth/idme - Start ID.me OAuth flow
 */

import { NextRequest, NextResponse } from "next/server";
import { handleOAuthInitiate } from "@/lib/oauth/oauth-handler";
import { withErrorHandler, compose } from "@/lib/api/middleware";

async function initiateOAuth(request: NextRequest): Promise<NextResponse> {
  return handleOAuthInitiate(request, "idme");
}

export const GET = compose(withErrorHandler)(initiateOAuth);
