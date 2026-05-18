/**
 * Webhook Receiver API Route
 *
 * Receives webhook payloads and creates messages in channels.
 * Supports signature validation for secure webhook integrations.
 *
 * @endpoint POST /api/webhook/:id - Receive webhook payload
 * @endpoint GET /api/webhook/:id - Get webhook info (requires token)
 *
 * @example
 * ```typescript
 * // Send webhook message
 * const response = await fetch('/api/webhook/webhook-id/token', {
 *   method: 'POST',
 *   headers: {
 *     'Content-Type': 'application/json',
 *     'X-Webhook-Signature': 'sha256=...'
 *   },
 *   body: JSON.stringify({
 *     content: 'Hello from webhook!',
 *     username: 'GitHub Bot',
 *     avatar_url: 'https://github.com/favicon.ico'
 *   })
 * })
 * ```
 */

import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual, randomBytes } from "crypto";
import {
  successResponse,
  badRequestResponse,
  notFoundResponse,
  unauthorizedResponse,
  internalErrorResponse,
} from "@/lib/api/response";
import {
  withErrorHandler,
  withRateLimit,
  compose,
  getClientIp,
  type RouteContext as MiddlewareRouteContext,
} from "@/lib/api/middleware";
import type {
  Webhook,
  WebhookMessagePayload,
  WebhookDelivery,
  DeliveryStatus,
} from "@/lib/webhooks/types";
import { logger } from "@/lib/logger";

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  // Maximum payload size (1MB)
  MAX_PAYLOAD_SIZE: 1024 * 1024,

  // Maximum content length
  MAX_CONTENT_LENGTH: 2000,

  // Maximum embeds per message
  MAX_EMBEDS: 10,

  // Rate limiting per webhook
  RATE_LIMIT: {
    limit: 30, // 30 requests per minute per webhook
    window: 60,
  },
};

// ============================================================================
// In-Memory Storage (Mock - Use Database in Production)
// ============================================================================

// Mock webhooks storage
const webhooksStore = new Map<string, Webhook>();
const deliveriesStore = new Map<string, WebhookDelivery>();

// Initialize some mock webhooks for development
if (process.env.NODE_ENV === "development") {
  webhooksStore.set("test-webhook-1", {
    id: "test-webhook-1",
    name: "GitHub Notifications",
    channel_id: "channel-general",
    token: "test-token-12345",
    url: "/api/webhook/test-webhook-1/test-token-12345",
    status: "active",
    created_by: "dev-owner-id",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  webhooksStore.set("test-webhook-2", {
    id: "test-webhook-2",
    name: "CI/CD Pipeline",
    channel_id: "channel-dev",
    token: "test-token-67890",
    url: "/api/webhook/test-webhook-2/test-token-67890",
    status: "active",
    created_by: "dev-owner-id",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}

// ============================================================================
// Types
// ============================================================================

type RouteContext = MiddlewareRouteContext;

// ============================================================================
// Helpers
// ============================================================================

/**
 * Parse webhook ID and token from the route
 * Supports both /webhook/:id/:token and /webhook/:id?token=:token formats
 */
function parseWebhookIdAndToken(
  id: string,
  searchParams: URLSearchParams,
): { webhookId: string; token: string | null } {
  // Check if ID contains token (format: id/token)
  if (id.includes("/")) {
    const parts = id.split("/");
    return { webhookId: parts[0], token: parts[1] || null };
  }

  // Check query parameter
  const token = searchParams.get("token");
  return { webhookId: id, token };
}

/**
 * Get webhook by ID
 */
async function getWebhook(webhookId: string): Promise<Webhook | null> {
  // In production, this would query the database via GraphQL
  // const { data } = await graphqlClient.query({
  //   query: GET_WEBHOOK,
  //   variables: { id: webhookId }
  // })
  // return data?.nchat_webhooks_by_pk

  return webhooksStore.get(webhookId) || null;
}

/**
 * Validate webhook token
 */
function validateToken(webhook: Webhook, token: string | null): boolean {
  if (!token) return false;
  return webhook.token === token;
}

/**
 * Validate webhook signature (for secure webhooks)
 */
function validateSignature(
  payload: string,
  signature: string | null,
  secret: string,
): boolean {
  if (!signature) return false;

  // Support multiple signature formats
  let algorithm = "sha256";
  let providedHash = signature;

  if (signature.startsWith("sha256=")) {
    providedHash = signature.substring(7);
  } else if (signature.startsWith("sha1=")) {
    algorithm = "sha1";
    providedHash = signature.substring(5);
  }

  const expectedHash = createHmac(algorithm, secret)
    .update(payload)
    .digest("hex");

  try {
    return timingSafeEqual(
      Buffer.from(providedHash, "hex"),
      Buffer.from(expectedHash, "hex"),
    );
  } catch {
    return false;
  }
}

/**
 * Validate webhook payload
 */
function validatePayload(
  body: unknown,
):
  | { valid: true; payload: WebhookMessagePayload }
  | { valid: false; error: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Invalid payload format" };
  }

  const payload = body as Record<string, unknown>;

  // Check content
  if (!payload.content || typeof payload.content !== "string") {
    return { valid: false, error: "Message content is required" };
  }

  if (payload.content.length > CONFIG.MAX_CONTENT_LENGTH) {
    return {
      valid: false,
      error: `Content exceeds maximum length of ${CONFIG.MAX_CONTENT_LENGTH} characters`,
    };
  }

  // Validate embeds if present
  if (payload.embeds) {
    if (!Array.isArray(payload.embeds)) {
      return { valid: false, error: "Embeds must be an array" };
    }

    if (payload.embeds.length > CONFIG.MAX_EMBEDS) {
      return {
        valid: false,
        error: `Maximum ${CONFIG.MAX_EMBEDS} embeds allowed`,
      };
    }
  }

  return {
    valid: true,
    payload: {
      content: payload.content as string,
      username:
        typeof payload.username === "string" ? payload.username : undefined,
      avatar_url:
        typeof payload.avatar_url === "string" ? payload.avatar_url : undefined,
      embeds: Array.isArray(payload.embeds) ? payload.embeds : undefined,
      attachments: Array.isArray(payload.attachments)
        ? payload.attachments
        : undefined,
    },
  };
}

/**
 * Create message from webhook payload
 */
async function createWebhookMessage(
  webhook: Webhook,
  payload: WebhookMessagePayload,
): Promise<{ messageId: string }> {
  // In production, this would create a message via GraphQL mutation
  // const { data, error } = await graphqlClient.mutate({
  //   mutation: CREATE_MESSAGE,
  //   variables: {
  //     object: {
  //       channel_id: webhook.channel_id,
  //       content: payload.content,
  //       user_id: null, // Webhook messages have no user
  //       webhook_id: webhook.id,
  //       metadata: {
  //         webhook_name: payload.username || webhook.name,
  //         webhook_avatar: payload.avatar_url || webhook.avatar_url,
  //         embeds: payload.embeds,
  //         attachments: payload.attachments,
  //       }
  //     }
  //   }
  // })

  // Mock implementation
  const messageId = `msg-${Date.now()}-${randomBytes(5).toString("hex")}`;

  return { messageId };
}

/**
 * Record webhook delivery
 */
async function recordDelivery(
  webhook: Webhook,
  status: DeliveryStatus,
  requestBody: string,
  requestHeaders: Record<string, string>,
  responseStatus?: number,
  errorMessage?: string,
): Promise<WebhookDelivery> {
  // In production, this would insert into the database
  const delivery: WebhookDelivery = {
    id: `delivery-${Date.now()}-${randomBytes(5).toString("hex")}`,
    webhook_id: webhook.id,
    status,
    request_body: requestBody,
    request_headers: requestHeaders,
    response_status: responseStatus,
    error_message: errorMessage,
    attempt_count: 1,
    created_at: new Date().toISOString(),
    delivered_at: status === "success" ? new Date().toISOString() : undefined,
  };

  deliveriesStore.set(delivery.id, delivery);
  return delivery;
}

/**
 * Update webhook last used timestamp
 */
async function updateWebhookLastUsed(webhookId: string): Promise<void> {
  // In production, this would update the database
  const webhook = webhooksStore.get(webhookId);
  if (webhook) {
    webhook.last_used_at = new Date().toISOString();
    webhook.updated_at = new Date().toISOString();
    webhooksStore.set(webhookId, webhook);
  }
}

// ============================================================================
// GET Handler - Webhook Info
// ============================================================================

async function handleGet(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const params = await context.params;
  const id = params.id || "";
  const { searchParams } = new URL(request.url);

  const { webhookId, token } = parseWebhookIdAndToken(id, searchParams);

  // Get webhook
  const webhook = await getWebhook(webhookId);

  if (!webhook) {
    return notFoundResponse("Webhook not found", "WEBHOOK_NOT_FOUND");
  }

  // Validate token
  if (!validateToken(webhook, token)) {
    return unauthorizedResponse("Invalid webhook token", "INVALID_TOKEN");
  }

  // Return webhook info (without sensitive data)
  return successResponse({
    id: webhook.id,
    name: webhook.name,
    channel_id: webhook.channel_id,
    status: webhook.status,
    created_at: webhook.created_at,
    last_used_at: webhook.last_used_at,
  });
}

// ============================================================================
// POST Handler - Receive Webhook
// ============================================================================

async function handlePost(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const params = await context.params;
  const id = params.id || "";
  const { searchParams } = new URL(request.url);

  const { webhookId, token } = parseWebhookIdAndToken(id, searchParams);

  // Get webhook
  const webhook = await getWebhook(webhookId);

  if (!webhook) {
    return notFoundResponse("Webhook not found", "WEBHOOK_NOT_FOUND");
  }

  // Check webhook status
  if (webhook.status !== "active") {
    return badRequestResponse("Webhook is not active", "WEBHOOK_INACTIVE");
  }

  // Validate token
  if (!validateToken(webhook, token)) {
    return unauthorizedResponse("Invalid webhook token", "INVALID_TOKEN");
  }

  // Get request body
  let bodyText: string;
  let body: unknown;

  try {
    bodyText = await request.text();

    // Check payload size
    if (bodyText.length > CONFIG.MAX_PAYLOAD_SIZE) {
      return badRequestResponse("Payload too large", "PAYLOAD_TOO_LARGE");
    }

    body = JSON.parse(bodyText);
  } catch {
    return badRequestResponse("Invalid JSON payload", "INVALID_JSON");
  }

  // Get headers for logging
  const requestHeaders: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    // Don't log sensitive headers
    if (
      !["authorization", "cookie", "x-webhook-token"].includes(
        key.toLowerCase(),
      )
    ) {
      requestHeaders[key] = value;
    }
  });

  // Require WEBHOOK_SECRET to be configured
  const webhookSecret = process.env.WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("WEBHOOK_SECRET environment variable is required");
    return NextResponse.json(
      { error: "Service misconfigured" },
      { status: 503 },
    );
  }

  // Optional: Validate signature if provided
  const signature =
    request.headers.get("x-webhook-signature") ||
    request.headers.get("x-hub-signature-256") ||
    request.headers.get("x-hub-signature");

  if (signature) {
    const isValid = validateSignature(bodyText, signature, webhookSecret);
    if (!isValid) {
      await recordDelivery(
        webhook,
        "failed",
        bodyText,
        requestHeaders,
        401,
        "Invalid signature",
      );
      return unauthorizedResponse(
        "Invalid webhook signature",
        "INVALID_SIGNATURE",
      );
    }
  }

  // Validate payload
  const validation = validatePayload(body);
  if (!validation.valid) {
    await recordDelivery(
      webhook,
      "failed",
      bodyText,
      requestHeaders,
      400,
      validation.error,
    );
    return badRequestResponse(validation.error, "INVALID_PAYLOAD");
  }

  try {
    // Create message
    const { messageId } = await createWebhookMessage(
      webhook,
      validation.payload,
    );

    // Update webhook last used
    await updateWebhookLastUsed(webhookId);

    // Record successful delivery
    await recordDelivery(webhook, "success", bodyText, requestHeaders, 200);

    return successResponse({
      success: true,
      messageId,
      channelId: webhook.channel_id,
    });
  } catch (error) {
    logger.error("Error processing webhook:", error);

    // Record failed delivery
    await recordDelivery(
      webhook,
      "failed",
      bodyText,
      requestHeaders,
      500,
      error instanceof Error
        ? error instanceof Error
          ? error.message
          : String(error)
        : "Internal error",
    );

    return internalErrorResponse("Failed to process webhook");
  }
}

// ============================================================================
// Export Handlers
// ============================================================================

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  return compose(
    withErrorHandler,
    withRateLimit({ limit: 60, window: 60 }),
  )(handleGet)(request, context);
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  return compose(
    withErrorHandler,
    withRateLimit(CONFIG.RATE_LIMIT),
  )(handlePost)(request, context);
}

// ============================================================================
// Route Configuration
// ============================================================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
