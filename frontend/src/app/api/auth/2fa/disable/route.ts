/**
 * 2FA Disable API Route
 *
 * Disables two-factor authentication for a user after password verification.
 * Requires either password or a valid TOTP code for security.
 */

import { NextRequest, NextResponse } from "next/server";
import { getApolloClient } from "@/lib/apollo-client";
import { gql } from "@apollo/client";
import { authConfig } from "@/config/auth.config";
import { verifyTOTP } from "@/lib/2fa/totp";

import { logger } from "@/lib/logger";

const GET_2FA_SECRET = gql`
  query Get2FASecret($userId: uuid!) {
    nchat_user_2fa_settings(
      where: { user_id: { _eq: $userId }, is_enabled: { _eq: true } }
    ) {
      id
      secret
    }
  }
`;

const DISABLE_2FA_MUTATION = gql`
  mutation Disable2FA($userId: uuid!) {
    # Disable 2FA settings (keep record but mark as disabled)
    update_nchat_user_2fa_settings(
      where: { user_id: { _eq: $userId } }
      _set: { is_enabled: false, disabled_at: "now()" }
    ) {
      affected_rows
    }

    # Delete backup codes
    delete_nchat_user_backup_codes(where: { user_id: { _eq: $userId } }) {
      affected_rows
    }

    # Delete trusted devices
    delete_nchat_user_trusted_devices(where: { user_id: { _eq: $userId } }) {
      affected_rows
    }
  }
`;

const LOG_2FA_DISABLE = gql`
  mutation Log2FADisable(
    $attempt: nchat_2fa_verification_attempts_insert_input!
  ) {
    insert_nchat_2fa_verification_attempts_one(object: $attempt) {
      id
    }
  }
`;

/**
 * Verify password against Nhost Auth or dev mode
 */
async function verifyPassword(
  userId: string,
  password: string,
): Promise<boolean> {
  // In dev mode, accept the test password
  if (authConfig.useDevAuth) {
    return password === "password123";
  }

  // In production, verify against Nhost Auth
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_AUTH_URL}/signin/email-password`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // We need to get the user's email to verify
          // This is a security check, not a full sign-in
        }),
      },
    );

    // For production, we would need to implement a proper password verification
    // endpoint in Nhost or use their SDK. For now, we require TOTP instead.
    return false;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, password, totpCode } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 },
      );
    }

    // Require either password or TOTP code for verification
    if (!password && !totpCode) {
      return NextResponse.json(
        { error: "Password or TOTP code is required to disable 2FA" },
        { status: 400 },
      );
    }

    const client = getApolloClient();

    // Get user's 2FA settings to verify TOTP
    const { data: settingsData } = await client.query({
      query: GET_2FA_SECRET,
      variables: { userId },
      fetchPolicy: "network-only",
    });

    const settings = settingsData?.nchat_user_2fa_settings?.[0];
    if (!settings) {
      return NextResponse.json(
        { error: "2FA is not enabled for this user" },
        { status: 400 },
      );
    }

    // Verify the user's identity
    let verified = false;
    let verificationMethod = "unknown";

    // Try TOTP verification first (more secure)
    if (totpCode) {
      verified = verifyTOTP(totpCode, settings.secret);
      verificationMethod = "totp";
    }

    // Fall back to password verification if TOTP not provided or failed
    if (!verified && password) {
      verified = await verifyPassword(userId, password);
      verificationMethod = "password";
    }

    // Log the attempt
    const ipAddress =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    await client.mutate({
      mutation: LOG_2FA_DISABLE,
      variables: {
        attempt: {
          user_id: userId,
          ip_address: ipAddress,
          user_agent: userAgent,
          success: verified,
          attempt_type: `disable_2fa_${verificationMethod}`,
        },
      },
    });

    if (!verified) {
      return NextResponse.json(
        {
          error:
            "Invalid verification. Please provide a valid password or TOTP code.",
        },
        { status: 401 },
      );
    }

    // Disable 2FA in database
    const { data, errors } = await client.mutate({
      mutation: DISABLE_2FA_MUTATION,
      variables: { userId },
    });

    if (errors) {
      logger.error("GraphQL errors:", errors);
      return NextResponse.json(
        { error: "Failed to disable 2FA" },
        { status: 500 },
      );
    }

    logger.info(
      `[2FA] 2FA disabled for user ${userId} via ${verificationMethod}`,
    );

    return NextResponse.json({
      success: true,
      message: "2FA disabled successfully",
      data: {
        settingsUpdated: data.update_nchat_user_2fa_settings.affected_rows,
        backupCodesDeleted: data.delete_nchat_user_backup_codes.affected_rows,
        devicesDeleted: data.delete_nchat_user_trusted_devices.affected_rows,
      },
    });
  } catch (error) {
    logger.error("2FA disable error:", error);
    return NextResponse.json(
      { error: "Failed to disable 2FA" },
      { status: 500 },
    );
  }
}
