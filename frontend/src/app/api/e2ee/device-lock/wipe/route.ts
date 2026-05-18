/**
 * API Route: /api/e2ee/device-lock/wipe
 * Wipe E2EE data after failed attempts or user request
 */

import { NextRequest, NextResponse } from "next/server";
import { getApolloClient } from "@/lib/apollo-client";
import { gql } from "@apollo/client";

import { logger } from "@/lib/logger";

const WIPE_DEVICE_E2EE_DATA = gql`
  query WipeDeviceE2EEData(
    $userId: uuid!
    $deviceId: String!
    $reason: String!
  ) {
    wipe_device_e2ee_data(
      args: { p_user_id: $userId, p_device_id: $deviceId, p_reason: $reason }
    )
  }
`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, deviceId, reason, preserveRecoveryOption } = body;

    // Validate inputs
    if (!userId || !deviceId || !reason) {
      return NextResponse.json(
        { error: "Missing required fields: userId, deviceId, reason" },
        { status: 400 },
      );
    }

    const validReasons = [
      "failed_attempts",
      "user_request",
      "remote_wipe",
      "security_breach",
    ];
    if (!validReasons.includes(reason)) {
      return NextResponse.json(
        { error: `Invalid reason: ${reason}` },
        { status: 400 },
      );
    }

    // Get Apollo client
    const apolloClient = getApolloClient();

    // Execute wipe
    const { data } = await apolloClient.query({
      query: WIPE_DEVICE_E2EE_DATA,
      variables: {
        userId,
        deviceId,
        reason,
      },
      fetchPolicy: "network-only",
    });

    const result = data.wipe_device_e2ee_data;

    return NextResponse.json({
      success: result.success,
      wipedData: result.wiped_data,
      recoveryPossible: preserveRecoveryOption === true,
      message: "E2EE data wiped successfully",
    });
  } catch (error) {
    logger.error("Device wipe error:", error);

    return NextResponse.json(
      {
        error: "Failed to wipe device E2EE data",
        message:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : String(error),
      },
      { status: 500 },
    );
  }
}
