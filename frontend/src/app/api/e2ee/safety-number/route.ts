/**
 * API Route: /api/e2ee/safety-number
 * Generate and verify safety numbers
 */

import { NextRequest, NextResponse } from "next/server";
import { gql } from "@apollo/client";
import { logger } from "@/lib/logger.server";

// Force dynamic rendering - E2EE uses native modules that can't be built statically
export const dynamic = "force-dynamic";

const GET_USER_IDENTITY_KEY = gql`
  query GetUserIdentityKey($userId: uuid!, $deviceId: String!) {
    nchat_identity_keys(
      where: {
        user_id: { _eq: $userId }
        device_id: { _eq: $deviceId }
        is_active: { _eq: true }
      }
    ) {
      identity_key_public
    }
  }
`;

export async function POST(request: NextRequest) {
  try {
    const { action, localUserId, peerUserId, peerDeviceId } =
      await request.json();

    if (!action || !localUserId || !peerUserId) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 },
      );
    }

    // Get userId from request headers (set by auth middleware)
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // Dynamic import to avoid loading native modules during build
    const [{ getApolloClient }, { getE2EEManager }] = await Promise.all([
      import("@/lib/apollo-client"),
      import("@/lib/e2ee"),
    ]);

    const apolloClient = getApolloClient();
    const e2eeManager = getE2EEManager(apolloClient, userId);

    if (!e2eeManager.isInitialized()) {
      return NextResponse.json(
        { error: "E2EE not initialized" },
        { status: 400 },
      );
    }

    if (action === "generate") {
      // Get peer's identity key
      const { data } = await apolloClient.query({
        query: GET_USER_IDENTITY_KEY,
        variables: { userId: peerUserId, deviceId: peerDeviceId },
        fetchPolicy: "network-only",
      });

      if (!data.nchat_identity_keys.length) {
        return NextResponse.json(
          { error: "Peer identity key not found" },
          { status: 404 },
        );
      }

      const peerIdentityKey = new Uint8Array(
        data.nchat_identity_keys[0].identity_key_public,
      );

      // Generate safety number
      const safetyNumber = await e2eeManager.generateSafetyNumber(
        localUserId,
        peerUserId,
        peerIdentityKey,
      );

      // Format for display
      const formattedSafetyNumber =
        e2eeManager.formatSafetyNumber(safetyNumber);

      // Generate QR code data
      const qrCodeData = await e2eeManager.generateSafetyNumberQR(
        localUserId,
        peerUserId,
        peerIdentityKey,
      );

      return NextResponse.json({
        success: true,
        safetyNumber,
        formattedSafetyNumber,
        qrCodeData,
      });
    } else if (action === "verify") {
      const { safetyNumber } = await request.json();

      if (!safetyNumber) {
        return NextResponse.json(
          { error: "Safety number is required for verification" },
          { status: 400 },
        );
      }

      // Verify safety number by comparing with generated one
      const { data } = await apolloClient.query({
        query: GET_USER_IDENTITY_KEY,
        variables: { userId: peerUserId, deviceId: peerDeviceId },
        fetchPolicy: "network-only",
      });

      if (!data.nchat_identity_keys.length) {
        return NextResponse.json(
          { error: "Peer identity key not found" },
          { status: 404 },
        );
      }

      const peerIdentityKey = new Uint8Array(
        data.nchat_identity_keys[0].identity_key_public,
      );

      const expectedSafetyNumber = await e2eeManager.generateSafetyNumber(
        localUserId,
        peerUserId,
        peerIdentityKey,
      );

      const isValid = safetyNumber === expectedSafetyNumber;

      return NextResponse.json({
        success: true,
        isValid,
        message: isValid
          ? "Safety number verified successfully"
          : "Safety number does not match",
      });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    logger.error("Safety number error:", error);

    return NextResponse.json(
      {
        error: "Failed to process safety number",
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
