/**
 * Twitter OAuth Authentication
 * Handles OAuth flow for connecting Twitter accounts
 */

import { NextRequest, NextResponse } from "next/server";
import { TwitterClient } from "@/lib/social/twitter-client";
import { encryptToken } from "@/lib/social/encryption";
import { headers } from "next/headers";

import { logger } from "@/lib/logger";

// Lazy instantiate in route handler

/**
 * GET /api/social/twitter/auth
 * Initiates OAuth flow by redirecting to Twitter
 */
export async function GET(request: NextRequest) {
  try {
    const twitterClient = new TwitterClient();
    // Generate random state for CSRF protection
    const state = crypto.randomUUID();

    // Store state in session/cookie for validation on callback
    const response = NextResponse.redirect(
      twitterClient.getAuthorizationUrl(state),
    );
    response.cookies.set("twitter_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
    });

    return response;
  } catch (error) {
    logger.error("Twitter auth error:", error);
    return NextResponse.json(
      { error: "Failed to initiate Twitter authentication" },
      { status: 500 },
    );
  }
}
