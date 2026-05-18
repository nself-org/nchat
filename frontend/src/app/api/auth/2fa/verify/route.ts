/**
 * 2FA Verification API Route
 *
 * Verifies TOTP codes or backup codes during login.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyTOTP } from "@/lib/2fa/totp";
import { verifyBackupCode } from "@/lib/2fa/backup-codes";
import {
  createDeviceRecord,
  getDeviceTrustExpiry,
} from "@/lib/2fa/device-fingerprint";
import { getApolloClient } from "@/lib/apollo-client";
import { gql } from "@apollo/client";

import { logger } from "@/lib/logger";

const GET_2FA_SETTINGS = gql`
  query Get2FASettings($userId: uuid!) {
    nchat_user_2fa_settings(where: { user_id: { _eq: $userId } }) {
      id
      secret
      is_enabled
    }
    nchat_user_backup_codes(
      where: { user_id: { _eq: $userId }, used_at: { _is_null: true } }
    ) {
      id
      code_hash
    }
  }
`;

const UPDATE_2FA_USAGE = gql`
  mutation Update2FAUsage(
    $settingsId: uuid!
    $backupCodeId: uuid
    $deviceRecord: nchat_user_trusted_devices_insert_input
  ) {
    update_nchat_user_2fa_settings_by_pk(
      pk_columns: { id: $settingsId }
      _set: { last_used_at: "now()" }
    ) {
      id
    }

    update_nchat_user_backup_codes_by_pk(
      pk_columns: { id: $backupCodeId }
      _set: { used_at: "now()" }
    ) @skip(if: $backupCodeId) {
      id
    }

    insert_nchat_user_trusted_devices_one(object: $deviceRecord)
      @skip(if: $deviceRecord) {
      id
    }
  }
`;

const LOG_VERIFICATION_ATTEMPT = gql`
  mutation LogVerificationAttempt(
    $attempt: nchat_2fa_verification_attempts_insert_input!
  ) {
    insert_nchat_2fa_verification_attempts_one(object: $attempt) {
      id
    }
  }
`;

export async function POST(request: NextRequest) {
  try {
    const { userId, code, rememberDevice } = await request.json();

    if (!userId || !code) {
      return NextResponse.json(
        { error: "User ID and code are required" },
        { status: 400 },
      );
    }

    // Get user's 2FA settings
    const client = getApolloClient();
    const { data, errors } = await client.query({
      query: GET_2FA_SETTINGS,
      variables: { userId },
    });

    if (errors || !data.nchat_user_2fa_settings?.[0]) {
      return NextResponse.json(
        { error: "2FA not enabled for this user" },
        { status: 400 },
      );
    }

    const settings = data.nchat_user_2fa_settings[0];
    const backupCodes = data.nchat_user_backup_codes;

    let isValid = false;
    let usedBackupCodeId = null;

    // Try TOTP verification first
    if (/^\d{6}$/.test(code)) {
      isValid = verifyTOTP(code, settings.secret);
    }

    // If TOTP fails, try backup codes
    if (!isValid && backupCodes.length > 0) {
      for (const backupCode of backupCodes) {
        const matches = await verifyBackupCode(code, backupCode.code_hash);
        if (matches) {
          isValid = true;
          usedBackupCodeId = backupCode.id;
          break;
        }
      }
    }

    // Log verification attempt
    const ipAddress =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    await client.mutate({
      mutation: LOG_VERIFICATION_ATTEMPT,
      variables: {
        attempt: {
          user_id: userId,
          ip_address: ipAddress,
          user_agent: userAgent,
          success: isValid,
          attempt_type: /^\d{6}$/.test(code) ? "totp" : "backup_code",
        },
      },
    });

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 400 },
      );
    }

    // Prepare device record if "remember device" is checked
    let deviceRecord = null;
    if (rememberDevice) {
      const device = createDeviceRecord();
      deviceRecord = {
        user_id: userId,
        device_id: device.deviceId,
        device_name: device.deviceName,
        device_info: device.deviceInfo,
        trusted_until: getDeviceTrustExpiry(30), // 30 days
      };
    }

    // Update usage timestamps and optionally mark backup code as used
    await client.mutate({
      mutation: UPDATE_2FA_USAGE,
      variables: {
        settingsId: settings.id,
        backupCodeId: usedBackupCodeId,
        deviceRecord,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Verification successful",
      usedBackupCode: !!usedBackupCodeId,
    });
  } catch (error) {
    logger.error("2FA verification error:", error);
    return NextResponse.json(
      { error: "Failed to verify code" },
      { status: 500 },
    );
  }
}
