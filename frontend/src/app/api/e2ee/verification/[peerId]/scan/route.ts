/**
 * API Route: /api/e2ee/verification/[peerId]/scan
 * Process scanned QR code for verification
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger.server";

// Force dynamic rendering
export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ peerId: string }>;
}

/**
 * POST /api/e2ee/verification/[peerId]/scan
 * Process scanned QR code
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const { peerId } = await params;
    const body = await request.json();
    const { qrData } = body;

    // Get authenticated user ID
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    if (!qrData) {
      return NextResponse.json(
        { error: "QR data is required" },
        { status: 400 },
      );
    }

    // Dynamic imports
    const [
      { parseQRCode, performMutualVerification },
      {
        generateSafetyNumber,
        createVerificationRecord,
        serializeVerificationState,
        deserializeVerificationState,
        createVerificationState,
        updateVerificationState,
      },
    ] = await Promise.all([
      import("@/lib/e2ee/verification-qr"),
      import("@/lib/e2ee/safety-number"),
    ]);

    // Parse QR code
    const scanResult = parseQRCode(qrData);

    if (!scanResult.success || !scanResult.payload) {
      return NextResponse.json(
        {
          error: "Invalid QR code",
          message: scanResult.error,
          verified: false,
        },
        { status: 400 },
      );
    }

    const payload = scanResult.payload;

    // Check if QR code is from expected peer
    if (payload.userId !== peerId) {
      return NextResponse.json(
        {
          error: "QR code user mismatch",
          message: "This QR code is from a different user than expected",
          expectedPeerId: peerId,
          actualPeerId: payload.userId,
          verified: false,
        },
        { status: 400 },
      );
    }

    const { getApolloClient } = await import("@/lib/apollo-client");
    const { gql } = await import("@apollo/client");
    const apolloClient = getApolloClient();

    // Get identity keys
    const GET_KEYS = gql`
      query GetIdentityKeys($userId: uuid!, $peerId: uuid!) {
        local: nchat_identity_keys(
          where: { user_id: { _eq: $userId }, is_active: { _eq: true } }
          order_by: { created_at: desc }
          limit: 1
        ) {
          identity_key_public
        }
        peer: nchat_identity_keys(
          where: { user_id: { _eq: $peerId }, is_active: { _eq: true } }
          order_by: { created_at: desc }
          limit: 1
        ) {
          identity_key_public
        }
        verification: nchat_verification_states(
          where: { user_id: { _eq: $userId }, peer_user_id: { _eq: $peerId } }
        ) {
          id
          state_data
        }
      }
    `;

    const { data } = await apolloClient.query({
      query: GET_KEYS,
      variables: { userId, peerId },
      fetchPolicy: "network-only",
    });

    if (data.local.length === 0) {
      return NextResponse.json(
        { error: "E2EE not initialized", verified: false },
        { status: 400 },
      );
    }

    if (data.peer.length === 0) {
      return NextResponse.json(
        { error: "Peer identity key not found", verified: false },
        { status: 404 },
      );
    }

    const localKey = new Uint8Array(data.local[0].identity_key_public);
    const peerKey = new Uint8Array(data.peer[0].identity_key_public);

    // Perform mutual verification
    const verificationResult = performMutualVerification(
      userId,
      localKey,
      payload,
      peerKey,
    );

    // Log the scan attempt
    const LOG_EVENT = gql`
      mutation LogVerificationEvent(
        $userId: uuid!
        $peerId: uuid!
        $eventType: String!
        $eventData: jsonb!
      ) {
        insert_nchat_verification_events_one(
          object: {
            user_id: $userId
            peer_user_id: $peerId
            event_type: $eventType
            event_data: $eventData
          }
        ) {
          id
        }
      }
    `;

    await apolloClient
      .mutate({
        mutation: LOG_EVENT,
        variables: {
          userId,
          peerId,
          eventType: "qr_scan_attempt",
          eventData: {
            verified: verificationResult.verified,
            timestamp: Date.now(),
            deviceId: payload.deviceId,
          },
        },
      })
      .catch(() => {});

    if (!verificationResult.verified) {
      return NextResponse.json({
        verified: false,
        message: verificationResult.message,
        mismatch: verificationResult.mismatch,
      });
    }

    // Verification succeeded - save verification record
    const record = createVerificationRecord(
      peerId,
      peerKey,
      verificationResult.safetyNumber!,
      "qr_code_scan",
    );

    // Get or create verification state
    let state = createVerificationState(peerId);
    if (data.verification.length > 0) {
      try {
        state = deserializeVerificationState(data.verification[0].state_data);
      } catch {
        // Use new state
      }
    }

    // Update state
    const updatedState = updateVerificationState(state, record);

    // Save state
    const SAVE_VERIFICATION = gql`
      mutation SaveVerificationState(
        $userId: uuid!
        $peerId: uuid!
        $stateData: String!
      ) {
        insert_nchat_verification_states_one(
          object: {
            user_id: $userId
            peer_user_id: $peerId
            state_data: $stateData
          }
          on_conflict: {
            constraint: nchat_verification_states_user_id_peer_user_id_key
            update_columns: [state_data, updated_at]
          }
        ) {
          id
        }
      }
    `;

    await apolloClient.mutate({
      mutation: SAVE_VERIFICATION,
      variables: {
        userId,
        peerId,
        stateData: serializeVerificationState(updatedState),
      },
    });

    // Log verification completed
    await apolloClient
      .mutate({
        mutation: LOG_EVENT,
        variables: {
          userId,
          peerId,
          eventType: "verification_completed",
          eventData: {
            method: "qr_code_scan",
            timestamp: Date.now(),
          },
        },
      })
      .catch(() => {});

    return NextResponse.json({
      verified: true,
      message: "QR code verification successful",
      safetyNumber: verificationResult.safetyNumber,
      verifiedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("QR scan verification failed:", error);
    return NextResponse.json(
      { error: "QR scan verification failed", verified: false },
      { status: 500 },
    );
  }
}
