/**
 * Instagram OAuth Authentication
 * Handles OAuth flow for connecting Instagram Business accounts
 */

import { NextRequest, NextResponse } from "next/server";
import { InstagramClient } from "@/lib/social/instagram-client";

import { logger } from "@/lib/logger";

/**
 * GET /api/social/instagram/auth
 * Initiates OAuth flow by redirecting to Instagram/Facebook
 */
export async function GET(request: NextRequest) {
  try {
    // Lazy instantiate client to avoid build-time errors
    const instagramClient = new InstagramClient();

    // Generate random state for CSRF protection
    const state = crypto.randomUUID();

    // Store state in session/cookie for validation on callback
    const response = NextResponse.redirect(
      instagramClient.getAuthorizationUrl(state),
    );
    response.cookies.set("instagram_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
    });

    return response;
  } catch (error) {
    logger.error("Instagram auth error:", error);
    return NextResponse.json(
      { error: "Failed to initiate Instagram authentication" },
      { status: 500 },
    );
  }
}
