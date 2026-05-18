/**
 * LiveKit Token API Endpoint
 *
 * Generates JWT tokens for LiveKit room access.
 * Required for voice/video calls and live streaming.
 */

import { NextRequest, NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import { logger } from "@/lib/logger";

// =============================================================================
// POST /api/livekit/token
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { roomName, participantName, participantMetadata } = body;

    // Validate required fields
    if (!roomName || !participantName) {
      return NextResponse.json(
        { error: "Missing required fields: roomName, participantName" },
        { status: 400 },
      );
    }

    // Get LiveKit credentials from environment
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      logger.error(
        "[LiveKit Token] Missing LiveKit credentials in environment",
      );
      return NextResponse.json(
        { error: "LiveKit not configured" },
        { status: 500 },
      );
    }

    // Create access token
    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantName,
      // Token expires in 6 hours
      ttl: "6h",
    });

    // Grant permissions
    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    // Add metadata if provided
    if (participantMetadata) {
      at.metadata = participantMetadata;
    }

    // Generate token
    const token = await at.toJwt();

    logger.info("[LiveKit Token] Token generated", {
      roomName,
      participantName,
    });

    return NextResponse.json({
      token,
      url: process.env.NEXT_PUBLIC_LIVEKIT_URL || "ws://localhost:7880",
    });
  } catch (error) {
    logger.error("[LiveKit Token] Failed to generate token", error);
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 },
    );
  }
}
