/**
 * LinkedIn OAuth Callback
 * Handles OAuth callback from LinkedIn and saves account
 */

import { NextRequest, NextResponse } from "next/server";
import { LinkedInClient } from "@/lib/social/linkedin-client";
import { encryptToken } from "@/lib/social/encryption";

import { logger } from "@/lib/logger";

// Lazy instantiate in route handler

/**
 * GET /api/social/linkedin/callback
 * Handles OAuth callback from LinkedIn
 */
export async function GET(request: NextRequest) {
  try {
    const linkedinClient = new LinkedInClient();
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Check for OAuth errors
    if (error) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/admin/social?error=${encodeURIComponent(error)}`,
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/admin/social?error=missing_code`,
      );
    }

    // Verify state to prevent CSRF
    const savedState = request.cookies.get("linkedin_oauth_state")?.value;
    if (!savedState || savedState !== state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/admin/social?error=invalid_state`,
      );
    }

    // Exchange code for access token
    const { accessToken, refreshToken, expiresAt } =
      await linkedinClient.authenticate(code);

    // Get account info
    const accountInfo = await linkedinClient.getAccountInfo(accessToken);

    // Encrypt tokens
    const encryptedAccessToken = encryptToken(accessToken);
    const encryptedRefreshToken = refreshToken
      ? encryptToken(refreshToken)
      : null;

    // Save account to database via API
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/social/accounts`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          platform: "linkedin",
          account_id: accountInfo.id,
          account_name: accountInfo.name,
          account_handle: accountInfo.handle,
          avatar_url: accountInfo.avatarUrl,
          access_token_encrypted: encryptedAccessToken,
          refresh_token_encrypted: encryptedRefreshToken,
          token_expires_at: expiresAt?.toISOString(),
        }),
      },
    );

    if (!response.ok) {
      throw new Error("Failed to save LinkedIn account");
    }

    // Clear state cookie
    const successResponse = NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/admin/social?success=linkedin_connected`,
    );
    successResponse.cookies.delete("linkedin_oauth_state");

    return successResponse;
  } catch (error) {
    logger.error("LinkedIn callback error:", error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/admin/social?error=${encodeURIComponent(String(error))}`,
    );
  }
}
