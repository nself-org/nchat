/**
 * Linkedin OAuth Callback Route
 *
 * Handles Linkedin OAuth callback and user authentication.
 * GET /api/auth/linkedin/callback - Process Linkedin OAuth response
 */

import { NextRequest, NextResponse } from "next/server";
import { handleOAuthCallback } from "@/lib/oauth/oauth-handler";
import { withErrorHandler, compose } from "@/lib/api/middleware";

async function processCallback(request: NextRequest): Promise<NextResponse> {
  return handleOAuthCallback(request, "linkedin");
}

export const GET = compose(withErrorHandler)(processCallback);
