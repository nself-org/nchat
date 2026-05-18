/**
 * 2FA Trusted Devices API Route
 *
 * Manages trusted devices for "remember this device" functionality.
 */

import { NextRequest, NextResponse } from "next/server";
import { getApolloClient } from "@/lib/apollo-client";
import { gql } from "@apollo/client";

import { logger } from "@/lib/logger";

const GET_TRUSTED_DEVICES = gql`
  query GetTrustedDevices($userId: uuid!) {
    nchat_user_trusted_devices(
      where: { user_id: { _eq: $userId } }
      order_by: { last_used_at: desc }
    ) {
      id
      device_id
      device_name
      device_info
      trusted_until
      last_used_at
      created_at
    }
  }
`;

const REMOVE_TRUSTED_DEVICE = gql`
  mutation RemoveTrustedDevice($id: uuid!) {
    delete_nchat_user_trusted_devices_by_pk(id: $id) {
      id
    }
  }
`;

const CHECK_DEVICE_TRUST = gql`
  query CheckDeviceTrust($userId: uuid!, $deviceId: String!) {
    nchat_user_trusted_devices(
      where: {
        user_id: { _eq: $userId }
        device_id: { _eq: $deviceId }
        trusted_until: { _gt: "now()" }
      }
    ) {
      id
      device_name
      trusted_until
    }
  }
`;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const deviceId = searchParams.get("deviceId");
    const action = searchParams.get("action"); // 'list' or 'check'

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 },
      );
    }

    const client = getApolloClient();

    // Check if specific device is trusted
    if (action === "check" && deviceId) {
      const { data, errors } = await client.query({
        query: CHECK_DEVICE_TRUST,
        variables: { userId, deviceId },
      });

      if (errors) {
        logger.error("GraphQL errors:", errors);
        return NextResponse.json(
          { error: "Failed to check device trust" },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          isTrusted: data.nchat_user_trusted_devices.length > 0,
          device: data.nchat_user_trusted_devices[0] || null,
        },
      });
    }

    // List all trusted devices
    const { data, errors } = await client.query({
      query: GET_TRUSTED_DEVICES,
      variables: { userId },
    });

    if (errors) {
      logger.error("GraphQL errors:", errors);
      return NextResponse.json(
        { error: "Failed to fetch trusted devices" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        devices: data.nchat_user_trusted_devices,
        total: data.nchat_user_trusted_devices.length,
      },
    });
  } catch (error) {
    logger.error("Trusted devices error:", error);
    return NextResponse.json(
      { error: "Failed to get trusted devices" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get("id");

    if (!deviceId) {
      return NextResponse.json(
        { error: "Device ID is required" },
        { status: 400 },
      );
    }

    const client = getApolloClient();
    const { data, errors } = await client.mutate({
      mutation: REMOVE_TRUSTED_DEVICE,
      variables: { id: deviceId },
    });

    if (errors) {
      logger.error("GraphQL errors:", errors);
      return NextResponse.json(
        { error: "Failed to remove trusted device" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Trusted device removed successfully",
      data: data.delete_nchat_user_trusted_devices_by_pk,
    });
  } catch (error) {
    logger.error("Remove trusted device error:", error);
    return NextResponse.json(
      { error: "Failed to remove trusted device" },
      { status: 500 },
    );
  }
}
