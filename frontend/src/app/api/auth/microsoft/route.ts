/**
 * Microsoft OAuth Initiation Route
 *
 * Redirects user to Microsoft OAuth authorization page.
 * GET /api/auth/microsoft - Start Microsoft OAuth flow
 */

import { NextRequest, NextResponse } from "next/server";
import { handleOAuthInitiate } from "@/lib/oauth/oauth-handler";
import { withErrorHandler, compose } from "@/lib/api/middleware";

async function initiateOAuth(request: NextRequest): Promise<NextResponse> {
  return handleOAuthInitiate(request, "microsoft");
}

export const GET = compose(withErrorHandler)(initiateOAuth);
