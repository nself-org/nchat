/**
 * Session Activity API Route
 *
 * POST /api/auth/sessions/activity - Update session last activity timestamp
 */

import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, userId } = body;

    if (!sessionId || !userId) {
      return NextResponse.json(
        { error: "Session ID and User ID required" },
        { status: 400 },
      );
    }

    // Update session activity in database
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_GRAPHQL_URL || "http://localhost:8080/v1/graphql"}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `
            mutation UpdateSessionActivity($sessionId: uuid!, $lastActiveAt: timestamptz!) {
              update_nchat_user_sessions_by_pk(
                pk_columns: { id: $sessionId }
                _set: { last_active_at: $lastActiveAt }
              ) {
                id
                last_active_at
              }
            }
          `,
          variables: {
            sessionId,
            lastActiveAt: new Date().toISOString(),
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error("Failed to update session activity");
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      session: data.data?.update_nchat_user_sessions_by_pk,
    });
  } catch (error) {
    logger.error("Error updating session activity:", error);
    return NextResponse.json(
      { error: "Failed to update session activity" },
      { status: 500 },
    );
  }
}
