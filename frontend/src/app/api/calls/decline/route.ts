/**
 * API Route: Decline Call
 *
 * Declines an incoming call.
 */

import { NextResponse } from "next/server";
import { apolloClient } from "@/lib/apollo-client";
import { UPDATE_CALL_STATUS, LEAVE_CALL } from "@/graphql/calls";
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

interface DeclineCallRequest {
  callId: string;
  reason?: string;
}

async function handlePost(
  request: AuthenticatedRequest,
  context: RouteContext,
) {
  const { user } = request;

  try {
    const body: DeclineCallRequest = await request.json();

    // Validate required fields
    if (!body.callId) {
      return NextResponse.json(
        { error: "Missing required field: callId" },
        { status: 400 },
      );
    }

    // Update call status to declined
    const statusResult = await apolloClient.mutate({
      mutation: UPDATE_CALL_STATUS,
      variables: {
        callId: body.callId,
        status: "declined",
      },
    });

    if (statusResult.errors) {
      logger.error("Failed to update call status:", statusResult.errors);
      return NextResponse.json(
        { error: "Failed to update call status", details: statusResult.errors },
        { status: 500 },
      );
    }

    // Leave the call
    const leaveResult = await apolloClient.mutate({
      mutation: LEAVE_CALL,
      variables: {
        callId: body.callId,
        userId: user.id,
      },
    });

    if (leaveResult.errors) {
      logger.error("Failed to leave call:", leaveResult.errors);
      // Non-fatal, continue
    }

    return NextResponse.json({
      success: true,
      reason: body.reason || "declined",
    });
  } catch (error) {
    logger.error("Error declining call:", error);
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
