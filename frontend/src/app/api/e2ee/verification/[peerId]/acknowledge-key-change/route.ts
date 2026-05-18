/**
 * API Route: /api/e2ee/verification/[peerId]/acknowledge-key-change
 * Acknowledge a key change for a peer
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger.server";

// Force dynamic rendering
export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ peerId: string }>;
}

/**
 * POST /api/e2ee/verification/[peerId]/acknowledge-key-change
 * Acknowledge that the user has seen the key change warning
 */
export async function POST(
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

    const { getApolloClient } = await import("@/lib/apollo-client");
    const { gql } = await import("@apollo/client");
    const apolloClient = getApolloClient();

    // Log acknowledgment event
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

    await apolloClient.mutate({
      mutation: LOG_EVENT,
      variables: {
        userId,
        peerId,
        eventType: "key_change_acknowledged",
        eventData: {
          timestamp: Date.now(),
          acknowledged: true,
        },
      },
    });

    return NextResponse.json({
      success: true,
      acknowledged: true,
    });
  } catch (error) {
    logger.error("Failed to acknowledge key change:", error);
    return NextResponse.json(
      { error: "Failed to acknowledge key change" },
      { status: 500 },
    );
  }
}
