/**
 * Instagram OAuth Callback
 * Handles OAuth callback from Instagram/Facebook and saves account
 */

import { NextRequest, NextResponse } from "next/server";
import { InstagramClient } from "@/lib/social/instagram-client";
import { encryptToken } from "@/lib/social/encryption";

import { logger } from "@/lib/logger";

// Lazy instantiate in route handler

/**
 * GET /api/social/instagram/callback
 * Handles OAuth callback from Instagram
 */
export async function GET(request: NextRequest) {
  try {
    const instagramClient = new InstagramClient();
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
    const savedState = request.cookies.get("instagram_oauth_state")?.value;
    if (!savedState || savedState !== state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/admin/social?error=invalid_state`,
      );
    }

    // Exchange code for access token (gets long-lived token automatically)
    const { accessToken, expiresAt } = await instagramClient.authenticate(code);

    // Get account info
    const accountInfo = await instagramClient.getAccountInfo(accessToken);

    // Encrypt token
    const encryptedAccessToken = encryptToken(accessToken);

    // Save account to database via API
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/social/accounts`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          platform: "instagram",
          account_id: accountInfo.id,
          account_name: accountInfo.name,
          account_handle: accountInfo.handle,
          avatar_url: accountInfo.avatarUrl,
          access_token_encrypted: encryptedAccessToken,
          token_expires_at: expiresAt?.toISOString(),
        }),
      },
    );

    if (!response.ok) {
      throw new Error("Failed to save Instagram account");
    }

    // Clear state cookie
    const successResponse = NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/admin/social?success=instagram_connected`,
    );
    successResponse.cookies.delete("instagram_oauth_state");

    return successResponse;
  } catch (error) {
    logger.error("Instagram callback error:", error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/admin/social?error=${encodeURIComponent(String(error))}`,
    );
  }
}
