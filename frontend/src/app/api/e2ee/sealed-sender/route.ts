/**
 * Sealed Sender API Routes
 *
 * Handles sealed sender message delivery:
 * - POST: Send a sealed sender message
 * - GET: Get sealed sender status/configuration
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  type SealedSenderEnvelope,
  validateEnvelopeStructure,
  deserializeEnvelope,
  SEALED_SENDER_VERSION,
} from "@/lib/e2ee/sealed-sender";
import {
  type UnidentifiedMessage,
  validateDeliveryToken,
} from "@/lib/e2ee/unidentified-sender";

// ============================================================================
// Types
// ============================================================================

interface SendSealedMessageRequest {
  /** Sealed envelope (Base64) */
  envelope: string;
  /** Recipient user ID */
  recipientUserId: string;
  /** Recipient device ID */
  recipientDeviceId: string;
  /** Optional delivery token for unidentified delivery */
  deliveryToken?: string;
  /** Whether to use identified fallback */
  identifiedFallback?: boolean;
}

interface SendSealedMessageResponse {
  /** Whether delivery was successful */
  success: boolean;
  /** Server-assigned message ID */
  messageId?: string;
  /** New delivery token if issued */
  deliveryToken?: {
    tokenId: string;
    expiresAt: number;
  };
  /** Error message if failed */
  error?: string;
  /** Whether identified fallback was used */
  usedIdentifiedFallback?: boolean;
}

interface SealedSenderStatusResponse {
  /** Protocol version supported */
  protocolVersion: number;
  /** Whether sealed sender is enabled */
  enabled: boolean;
  /** Server public keys for certificate verification */
  serverPublicKeys: Array<{
    keyId: number;
    publicKey: string;
    expiresAt: number;
  }>;
  /** Delivery token configuration */
  tokenConfig: {
    validityMs: number;
    maxMessagesPerToken: number;
  };
  /** Rate limits */
  rateLimits: {
    messagesPerMinute: number;
    messagesPerHour: number;
  };
}

// ============================================================================
// In-memory store for demo/testing
// (In production, use database)
// ============================================================================

interface StoredToken {
  tokenId: string;
  recipientUserId: string;
  createdAt: number;
  expiresAt: number;
  messageCount: number;
}

const deliveryTokens: Map<string, StoredToken> = new Map();
const serverPublicKeys: Map<number, { publicKey: string; expiresAt: number }> =
  new Map();

// Initialize with demo key
serverPublicKeys.set(1, {
  publicKey: "demo-public-key-base64",
  expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
});

// ============================================================================
// POST - Send Sealed Sender Message
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body: SendSealedMessageRequest = await request.json();

    // Validate request
    if (!body.envelope) {
      return NextResponse.json(
        { error: "Missing required field: envelope" },
        { status: 400 },
      );
    }

    if (!body.recipientUserId || !body.recipientDeviceId) {
      return NextResponse.json(
        {
          error: "Missing required fields: recipientUserId, recipientDeviceId",
        },
        { status: 400 },
      );
    }

    // Decode and validate envelope
    let envelope: SealedSenderEnvelope;
    try {
      const envelopeBytes = new Uint8Array(
        atob(body.envelope)
          .split("")
          .map((c) => c.charCodeAt(0)),
      );
      envelope = deserializeEnvelope(envelopeBytes);
    } catch {
      return NextResponse.json(
        { error: "Invalid envelope format" },
        { status: 400 },
      );
    }

    // Validate envelope structure
    const structureErrors = validateEnvelopeStructure(envelope);
    if (structureErrors.length > 0) {
      return NextResponse.json(
        { error: `Invalid envelope: ${structureErrors.join(", ")}` },
        { status: 400 },
      );
    }

    // Check version
    if (envelope.version !== SEALED_SENDER_VERSION) {
      return NextResponse.json(
        { error: `Unsupported protocol version: ${envelope.version}` },
        { status: 400 },
      );
    }

    // Process delivery token if provided
    let usedIdentifiedFallback = body.identifiedFallback ?? false;
    let newToken: { tokenId: string; expiresAt: number } | undefined;

    if (body.deliveryToken && !usedIdentifiedFallback) {
      const storedToken = deliveryTokens.get(body.deliveryToken);
      if (!storedToken) {
        // Token not found - could issue new one or require identified fallback
        logger.warn("Unknown delivery token", { tokenId: body.deliveryToken });
        // For demo, we'll accept it anyway but issue a new token
      } else {
        // Validate token
        const validation = validateDeliveryToken({
          tokenId: storedToken.tokenId,
          recipientUserId: storedToken.recipientUserId,
          createdAt: storedToken.createdAt,
          expiresAt: storedToken.expiresAt,
          messageCount: storedToken.messageCount,
          isValid: true,
        });

        if (!validation.valid) {
          logger.warn("Invalid delivery token", {
            tokenId: body.deliveryToken,
            error: validation.error,
          });
          usedIdentifiedFallback = true;
        } else {
          // Update token usage
          storedToken.messageCount++;
        }
      }
    }

    // Generate message ID
    const messageId = crypto.randomUUID();

    // In production, this would:
    // 1. Queue the sealed message for delivery to recipient
    // 2. NOT log or store any sender information (server blindness)
    // 3. Only store: messageId, recipientUserId, recipientDeviceId, envelope, timestamp

    // Issue new delivery token for future messages
    if (!usedIdentifiedFallback) {
      const tokenId = crypto.randomUUID();
      const now = Date.now();
      const expiresAt = now + 60 * 60 * 1000; // 1 hour

      deliveryTokens.set(tokenId, {
        tokenId,
        recipientUserId: body.recipientUserId,
        createdAt: now,
        expiresAt,
        messageCount: 0,
      });

      newToken = { tokenId, expiresAt };
    }

    logger.info("Sealed sender message queued for delivery", {
      messageId,
      recipientUserId: body.recipientUserId,
      usedIdentifiedFallback,
      // Note: We deliberately DO NOT log sender information
    });

    const response: SendSealedMessageResponse = {
      success: true,
      messageId,
      deliveryToken: newToken,
      usedIdentifiedFallback,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    logger.error("Failed to process sealed sender message", { error });
    return NextResponse.json(
      { error: "Failed to process message" },
      { status: 500 },
    );
  }
}

// ============================================================================
// GET - Get Sealed Sender Status/Configuration
// ============================================================================

export async function GET() {
  try {
    const publicKeys = Array.from(serverPublicKeys.entries()).map(
      ([keyId, data]) => ({
        keyId,
        publicKey: data.publicKey,
        expiresAt: data.expiresAt,
      }),
    );

    const response: SealedSenderStatusResponse = {
      protocolVersion: SEALED_SENDER_VERSION,
      enabled: true,
      serverPublicKeys: publicKeys,
      tokenConfig: {
        validityMs: 60 * 60 * 1000, // 1 hour
        maxMessagesPerToken: 100,
      },
      rateLimits: {
        messagesPerMinute: 30,
        messagesPerHour: 500,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error("Failed to get sealed sender status", { error });
    return NextResponse.json(
      { error: "Failed to get status" },
      { status: 500 },
    );
  }
}
