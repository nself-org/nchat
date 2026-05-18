/**
 * API Route: Accept Call
 *
 * Accepts an incoming call.
 */

import { NextResponse } from "next/server";
import { apolloClient } from "@/lib/apollo-client";
import { UPDATE_CALL_STATUS, JOIN_CALL } from "@/graphql/calls";
import {
  withAuth,
  withErrorHandler,
  compose,
  type AuthenticatedRequest,
  type RouteContext,
} from "@/lib/api/middleware";
import { withCsrfProtection } from "@/lib/security/csrf";

import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface AcceptCallRequest {
  callId: string;
}

async function handlePost(
  request: AuthenticatedRequest,
  context: RouteContext,
) {
  const { user } = request;

  try {
    const body: AcceptCallRequest = await request.json();

    // Validate required fields
    if (!body.callId) {
      return NextResponse.json(
        { error: "Missing required field: callId" },
        { status: 400 },
      );
    }

    // Update call status to connecting
    const statusResult = await apolloClient.mutate({
      mutation: UPDATE_CALL_STATUS,
      variables: {
        callId: body.callId,
        status: "connecting",
      },
    });

    if (statusResult.errors) {
      logger.error("Failed to update call status:", statusResult.errors);
      return NextResponse.json(
        { error: "Failed to update call status", details: statusResult.errors },
        { status: 500 },
      );
    }

    // Join the call as participant
    const joinResult = await apolloClient.mutate({
      mutation: JOIN_CALL,
      variables: {
        callId: body.callId,
        userId: user.id,
      },
    });

    if (joinResult.errors) {
      logger.error("Failed to join call:", joinResult.errors);
      return NextResponse.json(
        { error: "Failed to join call", details: joinResult.errors },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      participant: joinResult.data?.insert_nchat_call_participants_one,
    });
  } catch (error) {
    logger.error("Error accepting call:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Apply authentication middleware with CSRF protection
export const POST = compose(
  withErrorHandler,
  withCsrfProtection,
  withAuth,
)(handlePost);
