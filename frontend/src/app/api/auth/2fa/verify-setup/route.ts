/**
 * 2FA Verify Setup API Route
 *
 * Verifies TOTP code during initial 2FA setup and enables 2FA for the user.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyTOTP } from "@/lib/2fa/totp";
import { hashBackupCode } from "@/lib/2fa/backup-codes";
import { getApolloClient } from "@/lib/apollo-client";
import { gql } from "@apollo/client";

import { logger } from "@/lib/logger";

const ENABLE_2FA_MUTATION = gql`
  mutation Enable2FA(
    $userId: uuid!
    $secret: String!
    $backupCodes: [nchat_user_backup_codes_insert_input!]!
  ) {
    # Insert 2FA settings
    insert_nchat_user_2fa_settings_one(
      object: {
        user_id: $userId
        secret: $secret
        is_enabled: true
        enabled_at: "now()"
      }
      on_conflict: {
        constraint: nchat_user_2fa_settings_user_id_key
        update_columns: [secret, is_enabled, enabled_at, updated_at]
      }
    ) {
      id
      is_enabled
    }

    # Delete old backup codes and insert new ones
    delete_nchat_user_backup_codes(where: { user_id: { _eq: $userId } }) {
      affected_rows
    }

    insert_nchat_user_backup_codes(objects: $backupCodes) {
      affected_rows
    }
  }
`;

export async function POST(request: NextRequest) {
  try {
    const { userId, secret, code, backupCodes } = await request.json();

    if (!userId || !secret || !code || !backupCodes) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Verify TOTP code
    const isValid = verifyTOTP(code, secret);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 400 },
      );
    }

    // Hash all backup codes
    const hashedBackupCodes = await Promise.all(
      backupCodes.map(async (code: string) => ({
        user_id: userId,
        code_hash: await hashBackupCode(code),
      })),
    );

    // Store 2FA settings and backup codes in database
    const client = getApolloClient();
    const { data, errors } = await client.mutate({
      mutation: ENABLE_2FA_MUTATION,
      variables: {
        userId,
        secret,
        backupCodes: hashedBackupCodes,
      },
    });

    if (errors) {
      logger.error("GraphQL errors:", errors);
      return NextResponse.json(
        { error: "Failed to enable 2FA" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "2FA enabled successfully",
      data: data.insert_nchat_user_2fa_settings_one,
    });
  } catch (error) {
    logger.error("2FA verify setup error:", error);
    return NextResponse.json(
      { error: "Failed to verify and enable 2FA" },
      { status: 500 },
    );
  }
}
