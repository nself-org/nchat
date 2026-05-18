/**
 * API Route: /api/e2ee/verification/[peerId]/verify
 * Verify or unverify a peer's safety number
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger.server";

// Force dynamic rendering
export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ peerId: string }>;
}

/**
 * POST /api/e2ee/verification/[peerId]/verify
 * Mark peer as verified
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const { peerId } = await params;
    const body = await request.json();
    const { safetyNumber, method, notes } = body;

    // Get authenticated user ID
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    if (!safetyNumber) {
      return NextResponse.json(
        { error: "Safety number is required" },
        { status: 400 },
      );
    }

    // Dynamic imports
    const [
      {
        generateSafetyNumber,
        verifySafetyNumber,
        createVerificationRecord,
        serializeVerificationState,
        deserializeVerificationState,
        createVerificationState,
        updateVerificationState,
      },
      { generateFingerprint },
    ] = await Promise.all([
      import("@/lib/e2ee/safety-number"),
      import("@/lib/e2ee/safety-number"),
    ]);

    const { getApolloClient } = await import("@/lib/apollo-client");
    const { gql } = await import("@apollo/client");
    const apolloClient = getApolloClient();

    // Query for keys
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
        { error: "E2EE not initialized" },
        { status: 400 },
      );
    }

    if (data.peer.length === 0) {
      return NextResponse.json(
        { error: "Peer identity key not found" },
        { status: 404 },
      );
    }

    const localKey = new Uint8Array(data.local[0].identity_key_public);
    const peerKey = new Uint8Array(data.peer[0].identity_key_public);

    // Generate expected safety number
    const expectedResult = generateSafetyNumber({
      localIdentityKey: localKey,
      localUserId: userId,
      peerIdentityKey: peerKey,
      peerUserId: peerId,
    });

    // Verify the provided safety number matches
    const verification = verifySafetyNumber(safetyNumber, expectedResult.raw);
    if (!verification.matches) {
      return NextResponse.json(
        {
          error: "Safety number mismatch",
          message: verification.reason,
          suggestions: verification.suggestions,
        },
        { status: 400 },
      );
    }

    // Create verification record
    const record = createVerificationRecord(
      peerId,
      peerKey,
      safetyNumber,
      method || "numeric_comparison",
      undefined,
      notes,
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

    // Update state with new verification
    const updatedState = updateVerificationState(state, record);

    // Save to database
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

    // Log verification event
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
          eventType: "verification_completed",
          eventData: {
            method: method || "numeric_comparison",
            timestamp: Date.now(),
          },
        },
      })
      .catch(() => {
        // Non-critical
      });

    return NextResponse.json({
      success: true,
      verified: true,
      verifiedAt: new Date(record.verifiedAt).toISOString(),
      method: record.method,
    });
  } catch (error) {
    logger.error("Verification failed:", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}

/**
 * DELETE /api/e2ee/verification/[peerId]/verify
 * Remove verification for a peer
 */
export async function DELETE(
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

    const { deserializeVerificationState, serializeVerificationState } =
      await import("@/lib/e2ee/safety-number");
    const { getApolloClient } = await import("@/lib/apollo-client");
    const { gql } = await import("@apollo/client");
    const apolloClient = getApolloClient();

    // Get current verification state
    const GET_STATE = gql`
      query GetVerificationState($userId: uuid!, $peerId: uuid!) {
        nchat_verification_states(
          where: { user_id: { _eq: $userId }, peer_user_id: { _eq: $peerId } }
        ) {
          id
          state_data
        }
      }
    `;

    const { data } = await apolloClient.query({
      query: GET_STATE,
      variables: { userId, peerId },
      fetchPolicy: "network-only",
    });

    if (data.nchat_verification_states.length === 0) {
      return NextResponse.json(
        { error: "No verification found" },
        { status: 404 },
      );
    }

    // Update state to remove verification
    const state = deserializeVerificationState(
      data.nchat_verification_states[0].state_data,
    );

    const updatedState = {
      ...state,
      trustLevel: "unknown" as const,
      currentVerification: null,
      verificationHistory: state.currentVerification
        ? [...state.verificationHistory, state.currentVerification]
        : state.verificationHistory,
      lastUpdated: Date.now(),
    };

    // Save updated state
    const SAVE_STATE = gql`
      mutation SaveVerificationState($id: uuid!, $stateData: String!) {
        update_nchat_verification_states_by_pk(
          pk_columns: { id: $id }
          _set: { state_data: $stateData, updated_at: "now()" }
        ) {
          id
        }
      }
    `;

    await apolloClient.mutate({
      mutation: SAVE_STATE,
      variables: {
        id: data.nchat_verification_states[0].id,
        stateData: serializeVerificationState(updatedState),
      },
    });

    // Log event
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
          eventType: "verification_removed",
          eventData: { timestamp: Date.now() },
        },
      })
      .catch(() => {});

    return NextResponse.json({
      success: true,
      verified: false,
    });
  } catch (error) {
    logger.error("Failed to remove verification:", error);
    return NextResponse.json(
      { error: "Failed to remove verification" },
      { status: 500 },
    );
  }
}
