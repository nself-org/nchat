/**
 * API Route: End Call
 *
 * Ends an active call.
 */

import { NextResponse } from "next/server";
import { apolloClient } from "@/lib/apollo-client";
import { END_CALL, LEAVE_CALL } from "@/graphql/calls";
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

interface EndCallRequest {
  callId: string;
  duration?: number;
  reason?: string;
}

async function handlePost(
  request: AuthenticatedRequest,
  context: RouteContext,
) {
  const { user } = request;

  try {
    const body: EndCallRequest = await request.json();

    // Validate required fields
    if (!body.callId) {
      return NextResponse.json(
        { error: "Missing required field: callId" },
        { status: 400 },
      );
    }

    // End the call
    const endResult = await apolloClient.mutate({
      mutation: END_CALL,
      variables: {
        callId: body.callId,
        duration: body.duration,
      },
    });

    if (endResult.errors) {
      logger.error("Failed to end call:", endResult.errors);
      return NextResponse.json(
        { error: "Failed to end call", details: endResult.errors },
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
      call: endResult.data?.update_nchat_calls?.returning?.[0],
    });
  } catch (error) {
    logger.error("Error ending call:", error);
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
