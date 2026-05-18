/**
 * 2FA Status API Route
 *
 * Gets the current 2FA status for a user.
 */

import { NextRequest, NextResponse } from "next/server";
import { getApolloClient } from "@/lib/apollo-client";
import { gql } from "@apollo/client";

import { logger } from "@/lib/logger";

const GET_2FA_STATUS = gql`
  query Get2FAStatus($userId: uuid!) {
    nchat_user_2fa_settings(where: { user_id: { _eq: $userId } }) {
      id
      is_enabled
      enabled_at
      last_used_at
    }
    backup_codes_total: nchat_user_backup_codes_aggregate(
      where: { user_id: { _eq: $userId } }
    ) {
      aggregate {
        count
      }
    }
    backup_codes_unused: nchat_user_backup_codes_aggregate(
      where: { user_id: { _eq: $userId }, used_at: { _is_null: true } }
    ) {
      aggregate {
        count
      }
    }
    trusted_devices: nchat_user_trusted_devices(
      where: { user_id: { _eq: $userId }, trusted_until: { _gt: "now()" } }
      order_by: { last_used_at: desc }
    ) {
      id
      device_name
      device_id
      trusted_until
      last_used_at
      created_at
    }
  }
`;

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

    const client = getApolloClient();
    const { data, errors } = await client.query({
      query: GET_2FA_STATUS,
      variables: { userId },
    });

    if (errors) {
      logger.error("GraphQL errors:", errors);
      return NextResponse.json(
        { error: "Failed to fetch 2FA status" },
        { status: 500 },
      );
    }

    const settings = data.nchat_user_2fa_settings?.[0];
    const totalBackupCodes = data.backup_codes_total.aggregate.count;
    const unusedBackupCodes = data.backup_codes_unused.aggregate.count;

    return NextResponse.json({
      success: true,
      data: {
        isEnabled: settings?.is_enabled || false,
        enabledAt: settings?.enabled_at || null,
        lastUsedAt: settings?.last_used_at || null,
        backupCodes: {
          total: totalBackupCodes,
          unused: unusedBackupCodes,
          used: totalBackupCodes - unusedBackupCodes,
        },
        trustedDevices: data.trusted_devices,
      },
    });
  } catch (error) {
    logger.error("2FA status error:", error);
    return NextResponse.json(
      { error: "Failed to get 2FA status" },
      { status: 500 },
    );
  }
}
