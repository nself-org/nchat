/**
 * API Route: /api/e2ee/verification/[peerId]
 * Get verification state and safety number for a peer
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger.server";

// Force dynamic rendering - E2EE uses native modules
export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ peerId: string }>;
}

/**
 * GET /api/e2ee/verification/[peerId]
 * Get verification state and safety number for a peer
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const { peerId } = await params;

    // Get authenticated user ID
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // Dynamic imports for E2EE modules
    const [
      { generateSafetyNumber, createDisplayGrid, formatSafetyNumber },
      { generateQRCode },
    ] = await Promise.all([
      import("@/lib/e2ee/safety-number"),
      import("@/lib/e2ee/verification-qr"),
    ]);

    // Get peer's identity key from database
    const { getApolloClient } = await import("@/lib/apollo-client");
    const { gql } = await import("@apollo/client");

    const apolloClient = getApolloClient();

    // Query for peer's identity key
    const GET_PEER_KEY = gql`
      query GetPeerIdentityKey($userId: uuid!) {
        nchat_identity_keys(
          where: { user_id: { _eq: $userId }, is_active: { _eq: true } }
          order_by: { created_at: desc }
          limit: 1
        ) {
          identity_key_public
          device_id
        }
      }
    `;

    // Query for local user's identity key
    const GET_LOCAL_KEY = gql`
      query GetLocalIdentityKey($userId: uuid!) {
        nchat_identity_keys(
          where: { user_id: { _eq: $userId }, is_active: { _eq: true } }
          order_by: { created_at: desc }
          limit: 1
        ) {
          identity_key_public
          device_id
        }
      }
    `;

    // Query for verification state
    const GET_VERIFICATION = gql`
      query GetVerificationState($userId: uuid!, $peerId: uuid!) {
        nchat_verification_states(
          where: { user_id: { _eq: $userId }, peer_user_id: { _eq: $peerId } }
        ) {
          id
          state_data
          updated_at
        }
      }
    `;

    // Execute queries in parallel
    const [peerKeyResult, localKeyResult, verificationResult] =
      await Promise.all([
        apolloClient
          .query({
            query: GET_PEER_KEY,
            variables: { userId: peerId },
            fetchPolicy: "network-only",
          })
          .catch(() => ({ data: { nchat_identity_keys: [] } })),
        apolloClient
          .query({
            query: GET_LOCAL_KEY,
            variables: { userId },
            fetchPolicy: "network-only",
          })
          .catch(() => ({ data: { nchat_identity_keys: [] } })),
        apolloClient
          .query({
            query: GET_VERIFICATION,
            variables: { userId, peerId },
            fetchPolicy: "network-only",
          })
          .catch(() => ({ data: { nchat_verification_states: [] } })),
      ]);

    // Check if peer identity key exists
    if (peerKeyResult.data.nchat_identity_keys.length === 0) {
      return NextResponse.json(
        { error: "Peer identity key not found" },
        { status: 404 },
      );
    }

    // Check if local identity key exists
    if (localKeyResult.data.nchat_identity_keys.length === 0) {
      return NextResponse.json(
        { error: "E2EE not initialized" },
        { status: 400 },
      );
    }

    const peerKey = new Uint8Array(
      peerKeyResult.data.nchat_identity_keys[0].identity_key_public,
    );
    const localKey = new Uint8Array(
      localKeyResult.data.nchat_identity_keys[0].identity_key_public,
    );

    // Generate safety number
    const safetyNumberResult = generateSafetyNumber({
      localIdentityKey: localKey,
      localUserId: userId,
      peerIdentityKey: peerKey,
      peerUserId: peerId,
    });

    // Generate QR code
    const qrCodeResult = generateQRCode(userId, localKey);

    // Parse verification state if exists
    let verificationState = {
      isVerified: false,
      verifiedAt: null as string | null,
      verificationMethod: null as string | null,
      trustLevel: "unknown" as string,
      hasKeyChanged: false,
      keyChangeHistory: [] as unknown[],
      verificationHistory: [] as unknown[],
    };

    if (verificationResult.data.nchat_verification_states.length > 0) {
      try {
        const stateData =
          verificationResult.data.nchat_verification_states[0].state_data;
        const { deserializeVerificationState } =
          await import("@/lib/e2ee/safety-number");
        const state = deserializeVerificationState(stateData);

        verificationState = {
          isVerified:
            state.trustLevel === "verified" &&
            state.currentVerification?.isValid === true,
          verifiedAt: state.currentVerification?.verifiedAt
            ? new Date(state.currentVerification.verifiedAt).toISOString()
            : null,
          verificationMethod: state.currentVerification?.method || null,
          trustLevel: state.trustLevel,
          hasKeyChanged: state.keyChangeHistory.length > 0,
          keyChangeHistory: state.keyChangeHistory,
          verificationHistory: state.verificationHistory,
        };
      } catch (parseError) {
        logger.warn("Failed to parse verification state:", {
          error: parseError,
        });
      }
    }

    return NextResponse.json({
      safetyNumber: safetyNumberResult.raw,
      formattedSafetyNumber: safetyNumberResult.formatted,
      displayGrid: safetyNumberResult.displayGrid,
      qrCodeData: qrCodeResult.data,
      ...verificationState,
    });
  } catch (error) {
    logger.error("Failed to get verification state:", error);
    return NextResponse.json(
      { error: "Failed to get verification state" },
      { status: 500 },
    );
  }
}
