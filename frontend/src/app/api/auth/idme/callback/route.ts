/**
 * ID.me OAuth Callback API Route
 *
 * Handles ID.me verification callback and extracts verification status.
 * GET /api/auth/idme/callback - Process ID.me OAuth callback
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
// ID.me Callback Handler
// ============================================================================

async function handleIDmeCallback(request: NextRequest): Promise<NextResponse> {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;

  try {
    const { searchParams } = new URL(request.url);

    // Check for errors from ID.me
    const error = searchParams.get("error");
    if (error) {
      const errorDescription =
        searchParams.get("error_description") || "ID.me verification failed";
      logger.error(`ID.me error: ${error} - ${errorDescription}`);

      const settingsUrl = new URL("/settings/account", baseUrl);
      settingsUrl.searchParams.set("error", errorDescription);
      return NextResponse.redirect(settingsUrl);
    }

    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code) {
      const settingsUrl = new URL("/settings/account", baseUrl);
      settingsUrl.searchParams.set("error", "No authorization code received");
      return NextResponse.redirect(settingsUrl);
    }

    // In dev mode, mock verification
    if (authConfig.useDevAuth) {
      const settingsUrl = new URL("/settings/account", baseUrl);
      settingsUrl.searchParams.set("idme_verified", "true");
      settingsUrl.searchParams.set("verification_type", "military");
      return NextResponse.redirect(settingsUrl);
    }

    // Exchange code for access token
    const tokenResponse = await fetch("https://api.id.me/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: process.env.NEXT_PUBLIC_IDME_CLIENT_ID!,
        client_secret: process.env.IDME_CLIENT_SECRET!,
        redirect_uri: `${baseUrl}/api/auth/idme/callback`,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error("Failed to exchange code for token");
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Get user attributes from ID.me
    const attributesResponse = await fetch(
      "https://api.id.me/api/public/v3/attributes.json",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!attributesResponse.ok) {
      throw new Error("Failed to fetch user attributes");
    }

    const attributes = await attributesResponse.json();

    // Extract verification information
    const verificationType = determineVerificationType(attributes);
    const verificationGroup = attributes.group || "unknown";

    // Get user ID from state or session
    let userId: string | null = null;
    if (state) {
      try {
        const stateData = JSON.parse(Buffer.from(state, "base64").toString());
        userId = stateData.userId;
      } catch {
        logger.error("Failed to parse state");
      }
    }

    // Update user verification status in database
    const dbPool = getAuthPool();
    if (dbPool && userId) {
      try {
        // Create or update verification record
        await dbPool.query(
          `INSERT INTO nchat.nchat_idme_verifications (
            user_id, verified, verification_type, verification_group,
            attributes, verified_at, created_at, updated_at
          ) VALUES ($1, TRUE, $2, $3, $4, NOW(), NOW(), NOW())
          ON CONFLICT (user_id)
          DO UPDATE SET
            verified = TRUE,
            verification_type = $2,
            verification_group = $3,
            attributes = $4,
            verified_at = NOW(),
            updated_at = NOW()`,
          [
            userId,
            verificationType,
            verificationGroup,
            JSON.stringify(attributes),
          ],
        );

        // Update user role if applicable
        if (
          verificationType === "military" ||
          verificationType === "responder"
        ) {
          await dbPool.query(
            `UPDATE nchat.nchat_users
             SET metadata = jsonb_set(
               COALESCE(metadata, '{}'::jsonb),
               '{idme_verified}',
               'true'::jsonb
             )
             WHERE id = $1`,
            [userId],
          );
        }

        logger.info(`[AUTH] ID.me verification completed for user: ${userId}`);
      } catch (dbError) {
        logger.error("[AUTH] Failed to store ID.me verification:", dbError);
      }
    }

    // Redirect to settings with success
    const settingsUrl = new URL("/settings/account", baseUrl);
    settingsUrl.searchParams.set("idme_verified", "true");
    settingsUrl.searchParams.set("verification_type", verificationType);
    return NextResponse.redirect(settingsUrl);
  } catch (error) {
    logger.error("ID.me callback error:", error);
    const settingsUrl = new URL("/settings/account", baseUrl);
    settingsUrl.searchParams.set("error", "ID.me verification failed");
    return NextResponse.redirect(settingsUrl);
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Determine verification type from ID.me attributes
 */
function determineVerificationType(attributes: any): string {
  // Check for military verification
  if (attributes.military || attributes.group?.includes("military")) {
    return "military";
  }

  // Check for first responder verification
  if (attributes.responder || attributes.group?.includes("responder")) {
    return "responder";
  }

  // Check for student verification
  if (attributes.student || attributes.group?.includes("student")) {
    return "student";
  }

  // Check for teacher verification
  if (attributes.teacher || attributes.group?.includes("teacher")) {
    return "teacher";
  }

  // Check for government employee verification
  if (attributes.government || attributes.group?.includes("government")) {
    return "government";
  }

  return "verified";
}

// ============================================================================
// Export
// ============================================================================

export const GET = compose(withErrorHandler)(handleIDmeCallback);
