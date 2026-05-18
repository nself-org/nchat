/**
 * Linkedin OAuth Initiation Route
 *
 * Redirects user to Linkedin OAuth authorization page.
 * GET /api/auth/linkedin - Start Linkedin OAuth flow
 */

import { NextRequest, NextResponse } from "next/server";
import { handleOAuthInitiate } from "@/lib/oauth/oauth-handler";
import { withErrorHandler, compose } from "@/lib/api/middleware";

async function initiateOAuth(request: NextRequest): Promise<NextResponse> {
  return handleOAuthInitiate(request, "linkedin");
}

export const GET = compose(withErrorHandler)(initiateOAuth);
