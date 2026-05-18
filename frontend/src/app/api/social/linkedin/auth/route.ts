/**
 * LinkedIn OAuth Authentication
 * Handles OAuth flow for connecting LinkedIn accounts
 */

import { NextRequest, NextResponse } from "next/server";
import { LinkedInClient } from "@/lib/social/linkedin-client";

import { logger } from "@/lib/logger";

// Lazy instantiate in route handler

/**
 * GET /api/social/linkedin/auth
 * Initiates OAuth flow by redirecting to LinkedIn
 */
export async function GET(request: NextRequest) {
  try {
    const linkedinClient = new LinkedInClient();
    // Generate random state for CSRF protection
    const state = crypto.randomUUID();

    // Store state in session/cookie for validation on callback
    const response = NextResponse.redirect(
      linkedinClient.getAuthorizationUrl(state),
    );
    response.cookies.set("linkedin_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
    });

    return response;
  } catch (error) {
    logger.error("LinkedIn auth error:", error);
    return NextResponse.json(
      { error: "Failed to initiate LinkedIn authentication" },
      { status: 500 },
    );
  }
}
