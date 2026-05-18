/**
 * 2FA Backup Codes API Route
 *
 * Regenerates backup codes for a user (requires password or TOTP verification).
 */

import { NextRequest, NextResponse } from "next/server";
import { generateBackupCodes, hashBackupCode } from "@/lib/2fa/backup-codes";
import { verifyTOTP } from "@/lib/2fa/totp";
import { getApolloClient } from "@/lib/apollo-client";
import { gql } from "@apollo/client";
import { authConfig } from "@/config/auth.config";

import { logger } from "@/lib/logger";

const REGENERATE_BACKUP_CODES = gql`
  mutation RegenerateBackupCodes(
    $userId: uuid!
    $backupCodes: [nchat_user_backup_codes_insert_input!]!
  ) {
    # Delete old backup codes
    delete_nchat_user_backup_codes(where: { user_id: { _eq: $userId } }) {
      affected_rows
    }

    # Insert new backup codes
    insert_nchat_user_backup_codes(objects: $backupCodes) {
      affected_rows
      returning {
        id
        created_at
      }
    }
  }
`;

const GET_BACKUP_CODES_STATUS = gql`
  query GetBackupCodesStatus($userId: uuid!) {
    total: nchat_user_backup_codes_aggregate(
      where: { user_id: { _eq: $userId } }
    ) {
      aggregate {
        count
      }
    }
    unused: nchat_user_backup_codes_aggregate(
      where: { user_id: { _eq: $userId }, used_at: { _is_null: true } }
    ) {
      aggregate {
        count
      }
    }
  }
`;

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

const LOG_BACKUP_CODES_REGENERATION = gql`
  mutation LogBackupCodesRegeneration(
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
  // For production, we require TOTP verification instead of password
  // as password verification requires access to the auth service
  return false;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 },
      );
    }

    // Get backup codes status
    const client = getApolloClient();
    const { data, errors } = await client.query({
      query: GET_BACKUP_CODES_STATUS,
      variables: { userId },
    });

    if (errors) {
      logger.error("GraphQL errors:", errors);
      return NextResponse.json(
        { error: "Failed to fetch backup codes status" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        total: data.total.aggregate.count,
        unused: data.unused.aggregate.count,
        used: data.total.aggregate.count - data.unused.aggregate.count,
      },
    });
  } catch (error) {
    logger.error("Backup codes status error:", error);
    return NextResponse.json(
      { error: "Failed to get backup codes status" },
      { status: 500 },
    );
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

    // Require either password or TOTP code for verification (security requirement)
    if (!password && !totpCode) {
      return NextResponse.json(
        {
          error: "Password or TOTP code is required to regenerate backup codes",
        },
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
      mutation: LOG_BACKUP_CODES_REGENERATION,
      variables: {
        attempt: {
          user_id: userId,
          ip_address: ipAddress,
          user_agent: userAgent,
          success: verified,
          attempt_type: `regenerate_backup_codes_${verificationMethod}`,
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

    logger.info(
      `[2FA] Backup codes regenerated for user ${userId} via ${verificationMethod}`,
    );

    // Generate new backup codes
    const newCodes = generateBackupCodes(10);

    // Hash the codes
    const hashedCodes = await Promise.all(
      newCodes.map(async (code) => ({
        user_id: userId,
        code_hash: await hashBackupCode(code),
      })),
    );

    // Replace backup codes in database
    const { data, errors } = await client.mutate({
      mutation: REGENERATE_BACKUP_CODES,
      variables: {
        userId,
        backupCodes: hashedCodes,
      },
    });

    if (errors) {
      logger.error("GraphQL errors:", errors);
      return NextResponse.json(
        { error: "Failed to regenerate backup codes" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Backup codes regenerated successfully",
      data: {
        codes: newCodes, // Return plain codes to show user (only time they're shown)
        deleted: data.delete_nchat_user_backup_codes.affected_rows,
        created: data.insert_nchat_user_backup_codes.affected_rows,
      },
    });
  } catch (error) {
    logger.error("Backup codes regeneration error:", error);
    return NextResponse.json(
      { error: "Failed to regenerate backup codes" },
      { status: 500 },
    );
  }
}
