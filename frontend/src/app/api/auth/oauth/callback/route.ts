/**
 * OAuth Callback API Route
 *
 * Handles OAuth provider callbacks and token exchange.
 * GET /api/auth/oauth/callback - Process OAuth callback
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthPool } from "@/lib/db/pool";
import { withErrorHandler, compose } from "@/lib/api/middleware";
import { authConfig } from "@/config/auth.config";

import { logger } from "@/lib/logger";

// ============================================================================
// Database Configuration
// ============================================================================

// ============================================================================
// OAuth Callback Handler
// ============================================================================

async function handleOAuthCallback(
  request: NextRequest,
): Promise<NextResponse> {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;

  try {
    const { searchParams } = new URL(request.url);

    // Check for errors from OAuth provider
    const error = searchParams.get("error");
    if (error) {
      const errorDescription =
        searchParams.get("error_description") || "OAuth authentication failed";
      logger.error(`OAuth error: ${error} - ${errorDescription}`);

      // Redirect to login page with error
      const loginUrl = new URL("/login", baseUrl);
      loginUrl.searchParams.set("error", errorDescription);
      return NextResponse.redirect(loginUrl);
    }

    // Get tokens from Nhost callback
    const refreshToken = searchParams.get("refreshToken");
    const type = searchParams.get("type");

    // In dev mode, OAuth is not supported
    if (authConfig.useDevAuth) {
      const loginUrl = new URL("/login", baseUrl);
      loginUrl.searchParams.set(
        "error",
        "OAuth is not available in development mode",
      );
      return NextResponse.redirect(loginUrl);
    }

    // Handle magic link callback
    if (type === "magicLink") {
      const token = searchParams.get("token");
      if (token) {
        // Redirect to verify page
        const verifyUrl = new URL("/auth/verify-magic-link", baseUrl);
        verifyUrl.searchParams.set("token", token);
        return NextResponse.redirect(verifyUrl);
      }
    }

    // Handle email verification callback
    if (type === "emailVerify") {
      const ticket = searchParams.get("ticket");
      if (ticket) {
        const verifyUrl = new URL("/auth/verify-email", baseUrl);
        verifyUrl.searchParams.set("ticket", ticket);
        return NextResponse.redirect(verifyUrl);
      }
    }

    // Handle password reset callback
    if (type === "passwordReset") {
      const ticket = searchParams.get("ticket");
      if (ticket) {
        const resetUrl = new URL("/auth/reset-password", baseUrl);
        resetUrl.searchParams.set("token", ticket);
        return NextResponse.redirect(resetUrl);
      }
    }

    // Handle OAuth token callback
    if (refreshToken) {
      try {
        // Exchange refresh token for session info
        const response = await fetch(`${authConfig.authUrl}/token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) {
          const data = await response.json();
          const loginUrl = new URL("/login", baseUrl);
          loginUrl.searchParams.set(
            "error",
            data.error?.message || "OAuth authentication failed",
          );
          return NextResponse.redirect(loginUrl);
        }

        const data = await response.json();
        const nhostUser = data.user;

        // Get or create nchat user
        const dbPool = getAuthPool();
        if (dbPool) {
          // Check if user exists in nchat
          const userResult = await dbPool.query(
            `SELECT id, username, display_name, role FROM nchat.nchat_users
             WHERE auth_user_id = $1`,
            [nhostUser.id],
          );

          if (userResult.rows.length === 0) {
            // First time OAuth user - create nchat record
            const countResult = await dbPool.query(
              `SELECT COUNT(*) as count FROM nchat.nchat_users`,
            );
            const isFirstUser = parseInt(countResult.rows[0].count) === 0;
            const role = isFirstUser ? "owner" : "member";

            const username =
              nhostUser.displayName?.replace(/\s+/g, "_").toLowerCase() ||
              nhostUser.email.split("@")[0];

            await dbPool.query(
              `INSERT INTO nchat.nchat_users (
                auth_user_id, username, display_name, email, role,
                avatar_url, status, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, 'online', NOW(), NOW())`,
              [
                nhostUser.id,
                username,
                nhostUser.displayName || username,
                nhostUser.email,
                role,
                nhostUser.avatarUrl ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
              ],
            );
          }
        }

        // Store session in cookie and redirect
        const callbackUrl = new URL("/auth/callback-complete", baseUrl);
        callbackUrl.searchParams.set("refreshToken", data.session.refreshToken);
        callbackUrl.searchParams.set("accessToken", data.session.accessToken);
        callbackUrl.searchParams.set(
          "expiresIn",
          data.session.accessTokenExpiresIn?.toString() || "3600",
        );

        return NextResponse.redirect(callbackUrl);
      } catch (err) {
        logger.error("OAuth token exchange error:", err);
        const loginUrl = new URL("/login", baseUrl);
        loginUrl.searchParams.set(
          "error",
          "Failed to complete OAuth authentication",
        );
        return NextResponse.redirect(loginUrl);
      }
    }

    // Handle code exchange (if provider returns code instead of token)
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (code && state) {
      try {
        // Decode state to get provider
        let provider = "unknown";
        try {
          const stateData = JSON.parse(Buffer.from(state, "base64").toString());
          provider = stateData.provider || "unknown";
        } catch {
          // State might not be base64 encoded
          provider = searchParams.get("provider") || "unknown";
        }

        const response = await fetch(
          `${authConfig.authUrl}/signin/provider/${provider}/callback`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code, state }),
          },
        );

        if (!response.ok) {
          const data = await response.json();
          const loginUrl = new URL("/login", baseUrl);
          loginUrl.searchParams.set(
            "error",
            data.error?.message || "OAuth authentication failed",
          );
          return NextResponse.redirect(loginUrl);
        }

        const data = await response.json();

        // Redirect to complete callback
        const callbackUrl = new URL("/auth/callback-complete", baseUrl);
        callbackUrl.searchParams.set("refreshToken", data.session.refreshToken);
        callbackUrl.searchParams.set("accessToken", data.session.accessToken);
        callbackUrl.searchParams.set(
          "expiresIn",
          data.session.accessTokenExpiresIn?.toString() || "3600",
        );

        return NextResponse.redirect(callbackUrl);
      } catch (err) {
        logger.error("OAuth code exchange error:", err);
        const loginUrl = new URL("/login", baseUrl);
        loginUrl.searchParams.set(
          "error",
          "Failed to complete OAuth authentication",
        );
        return NextResponse.redirect(loginUrl);
      }
    }

    // Handle account connection callback (from settings page)
    if (code) {
      // This is for connecting OAuth accounts to existing users
      const settingsUrl = new URL("/settings/account", baseUrl);
      settingsUrl.searchParams.set("oauth_connected", "true");
      return NextResponse.redirect(settingsUrl);
    }

    // No valid callback parameters
    const loginUrl = new URL("/login", baseUrl);
    loginUrl.searchParams.set("error", "Invalid OAuth callback");
    return NextResponse.redirect(loginUrl);
  } catch (error) {
    logger.error("OAuth callback error:", error);
    const loginUrl = new URL("/login", baseUrl);
    loginUrl.searchParams.set("error", "OAuth authentication failed");
    return NextResponse.redirect(loginUrl);
  }
}

// ============================================================================
// Export
// ============================================================================

export const GET = compose(withErrorHandler)(handleOAuthCallback);
