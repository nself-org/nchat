/**
 * Webhook Handler
 * Verify signatures, parse payloads, and route to handlers
 */

import type {
  WebhookPayload,
  WebhookEventType,
  WebhookHandler,
  WebhookConfig,
  BotId,
} from "./types";
import { logger } from "@/lib/logger";

// ============================================================================
// TYPES
// ============================================================================

export interface WebhookValidationResult {
  isValid: boolean;
  error?: string;
}

export interface WebhookRouterConfig {
  secret: string;
  toleranceMs?: number; // Timestamp tolerance for replay protection
  maxBodySize?: number; // Maximum payload size in bytes
}

export interface WebhookRequest {
  body: string | object;
  headers: Record<string, string>;
  timestamp?: number;
}

export interface WebhookResponse {
  status: number;
  body?: unknown;
}

// ============================================================================
// SIGNATURE VERIFICATION
// ============================================================================

/**
 * Compute HMAC-SHA256 signature using Node.js crypto.
 * This is the synchronous version for server-side webhook handling.
 */
export function computeSignature(payload: string, secret: string): string {
  // Use Node.js crypto module for HMAC computation
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodeCrypto = require("crypto");
  const hmac = nodeCrypto.createHmac("sha256", secret);
  hmac.update(payload);
  return `sha256=${hmac.digest("hex")}`;
}

/**
 * Compute HMAC-SHA256 signature using Web Crypto API.
 * This is the async version that works in both browser and Node.js 18+.
 */
export async function computeSignatureAsync(
  payload: string,
  secret: string,
): Promise<string> {
  const encoder = new TextEncoder();

  // Import the secret as a crypto key
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  // Sign the payload
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload),
  );

  // Convert to hex string
  const signatureHex = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return `sha256=${signatureHex}`;
}

/**
 * Verify webhook signature using timing-safe comparison.
 * Uses Node.js crypto.timingSafeEqual to prevent timing attacks.
 */
export function verifySignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  // Validate signature format
  if (!signature || !signature.startsWith("sha256=")) {
    return false;
  }

  const expectedSignature = computeSignature(payload, secret);

  // Use Node.js crypto for timing-safe comparison
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodeCrypto = require("crypto");

  try {
    return nodeCrypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  } catch {
    // timingSafeEqual throws if buffers have different lengths
    return false;
  }
}

/**
 * Verify webhook signature asynchronously (for browser/edge environments).
 */
export async function verifySignatureAsync(
  payload: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  // Validate signature format
  if (!signature || !signature.startsWith("sha256=")) {
    return false;
  }

  const expectedSignature = await computeSignatureAsync(payload, secret);

  // Constant-time comparison (for environments without timingSafeEqual)
  if (signature.length !== expectedSignature.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < signature.length; i++) {
    result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Verify webhook timestamp (replay protection)
 */
export function verifyTimestamp(
  timestamp: number,
  toleranceMs = 300000,
): boolean {
  const now = Date.now();
  const age = Math.abs(now - timestamp);
  return age <= toleranceMs;
}

// ============================================================================
// WEBHOOK ROUTER
// ============================================================================

/**
 * Router for handling webhook events
 */
export class WebhookRouter {
  private handlers: Map<WebhookEventType, WebhookHandler[]> = new Map();
  private wildcardHandlers: WebhookHandler[] = [];
  private config: Required<WebhookRouterConfig>;

  constructor(config: WebhookRouterConfig) {
    this.config = {
      secret: config.secret,
      toleranceMs: config.toleranceMs ?? 300000, // 5 minutes
      maxBodySize: config.maxBodySize ?? 1024 * 1024, // 1MB
    };
  }

  // ==========================================================================
  // HANDLER REGISTRATION
  // ==========================================================================

  /**
   * Register a handler for an event type
   */
  on<T = unknown>(
    eventType: WebhookEventType,
    handler: (payload: WebhookPayload<T>) => Promise<void>,
  ): this {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push({
      eventType,
      handler: handler as WebhookHandler["handler"],
    });
    return this;
  }

  /**
   * Register a handler for all events
   */
  onAll<T = unknown>(
    handler: (payload: WebhookPayload<T>) => Promise<void>,
  ): this {
    this.wildcardHandlers.push({
      eventType: "*" as WebhookEventType,
      handler: handler as WebhookHandler["handler"],
    });
    return this;
  }

  /**
   * Register handlers for multiple event types
   */
  onMany<T = unknown>(
    eventTypes: WebhookEventType[],
    handler: (payload: WebhookPayload<T>) => Promise<void>,
  ): this {
    for (const eventType of eventTypes) {
      this.on(eventType, handler);
    }
    return this;
  }

  /**
   * Remove handlers for an event type
   */
  off(eventType: WebhookEventType): boolean {
    return this.handlers.delete(eventType);
  }

  /**
   * Clear all handlers
   */
  clear(): void {
    this.handlers.clear();
    this.wildcardHandlers = [];
  }

  /**
   * Check if a handler exists for an event type
   */
  hasHandler(eventType: WebhookEventType): boolean {
    return (
      (this.handlers.get(eventType)?.length ?? 0) > 0 ||
      this.wildcardHandlers.length > 0
    );
  }

  // ==========================================================================
  // REQUEST HANDLING
  // ==========================================================================

  /**
   * Handle an incoming webhook request
   */
  async handle(request: WebhookRequest): Promise<WebhookResponse> {
    // Validate request
    const validation = this.validateRequest(request);
    if (!validation.isValid) {
      return { status: 401, body: { error: validation.error } };
    }

    // Parse payload
    const payload = this.parsePayload(request);
    if (!payload) {
      return { status: 400, body: { error: "Invalid payload" } };
    }

    // Route to handlers
    try {
      await this.routePayload(payload);
      return { status: 200, body: { ok: true } };
    } catch (error) {
      logger.error("[WebhookRouter] Error handling webhook:", error);
      return { status: 500, body: { error: "Internal server error" } };
    }
  }

  /**
   * Validate the webhook request
   */
  validateRequest(request: WebhookRequest): WebhookValidationResult {
    // Check body size
    const bodyString =
      typeof request.body === "string"
        ? request.body
        : JSON.stringify(request.body);

    if (bodyString.length > this.config.maxBodySize) {
      return { isValid: false, error: "Payload too large" };
    }

    // Check signature
    const signature =
      request.headers["x-webhook-signature"] ||
      request.headers["X-Webhook-Signature"] ||
      request.headers["x-signature"];

    if (!signature) {
      return { isValid: false, error: "Missing signature" };
    }

    if (!verifySignature(bodyString, signature, this.config.secret)) {
      return { isValid: false, error: "Invalid signature" };
    }

    // Check timestamp
    const timestampHeader =
      request.headers["x-webhook-timestamp"] ||
      request.headers["X-Webhook-Timestamp"] ||
      request.headers["x-timestamp"];

    if (timestampHeader) {
      const timestamp = parseInt(timestampHeader, 10);
      if (
        isNaN(timestamp) ||
        !verifyTimestamp(timestamp, this.config.toleranceMs)
      ) {
        return { isValid: false, error: "Invalid or expired timestamp" };
      }
    }

    return { isValid: true };
  }

  /**
   * Parse the webhook payload
   */
  parsePayload<T = unknown>(request: WebhookRequest): WebhookPayload<T> | null {
    try {
      const body =
        typeof request.body === "string"
          ? JSON.parse(request.body)
          : request.body;

      if (!body.id || !body.type || !body.timestamp) {
        return null;
      }

      return body as WebhookPayload<T>;
    } catch {
      return null;
    }
  }

  /**
   * Route payload to registered handlers
   */
  private async routePayload(payload: WebhookPayload): Promise<void> {
    const handlers = this.handlers.get(payload.type) ?? [];
    const allHandlers = [...handlers, ...this.wildcardHandlers];

    if (allHandlers.length === 0) {
      return;
    }

    // Execute all handlers (parallel)
    await Promise.all(
      allHandlers.map(async (registration) => {
        try {
          await registration.handler(payload);
        } catch (error) {
          logger.error(
            `[WebhookRouter] Handler error for '${payload.type}':`,
            error,
          );
        }
      }),
    );
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Get registered event types
   */
  getRegisteredEvents(): WebhookEventType[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Get handler count for an event type
   */
  getHandlerCount(eventType?: WebhookEventType): number {
    if (eventType) {
      return (
        (this.handlers.get(eventType)?.length ?? 0) +
        this.wildcardHandlers.length
      );
    }
    let count = this.wildcardHandlers.length;
    for (const handlers of this.handlers.values()) {
      count += handlers.length;
    }
    return count;
  }
}

// ============================================================================
// WEBHOOK PAYLOAD BUILDER
// ============================================================================

/**
 * Builder for creating test webhook payloads
 */
export class WebhookPayloadBuilder<T = unknown> {
  private payload: Partial<WebhookPayload<T>> = {
    id: `webhook_${Date.now()}`,
    timestamp: new Date().toISOString(),
  };

  type(type: WebhookEventType): this {
    this.payload.type = type;
    return this;
  }

  botId(id: BotId): this {
    this.payload.botId = id;
    return this;
  }

  data(data: T): this {
    this.payload.data = data;
    return this;
  }

  signature(signature: string): this {
    this.payload.signature = signature;
    return this;
  }

  build(): WebhookPayload<T> {
    return this.payload as WebhookPayload<T>;
  }
}

// ============================================================================
// WEBHOOK REQUEST BUILDER
// ============================================================================

/**
 * Builder for creating webhook requests
 */
export class WebhookRequestBuilder {
  private payload: unknown = {};
  private headers: Record<string, string> = {};
  private secret?: string;

  body(payload: unknown): this {
    this.payload = payload;
    return this;
  }

  header(name: string, value: string): this {
    this.headers[name] = value;
    return this;
  }

  timestamp(timestamp?: number): this {
    this.headers["x-webhook-timestamp"] = String(timestamp ?? Date.now());
    return this;
  }

  sign(secret: string): this {
    this.secret = secret;
    return this;
  }

  build(): WebhookRequest {
    const bodyString =
      typeof this.payload === "string"
        ? this.payload
        : JSON.stringify(this.payload);

    if (this.secret) {
      this.headers["x-webhook-signature"] = computeSignature(
        bodyString,
        this.secret,
      );
    }

    return {
      body: bodyString,
      headers: this.headers,
    };
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a webhook router
 */
export function createWebhookRouter(
  config: WebhookRouterConfig,
): WebhookRouter {
  return new WebhookRouter(config);
}

/**
 * Create a webhook payload builder
 */
export function webhookPayload<T = unknown>(): WebhookPayloadBuilder<T> {
  return new WebhookPayloadBuilder<T>();
}

/**
 * Create a webhook request builder
 */
export function webhookRequest(): WebhookRequestBuilder {
  return new WebhookRequestBuilder();
}

// ============================================================================
// EVENT TYPE CONSTANTS
// ============================================================================

export const WEBHOOK_EVENTS = {
  MESSAGE_CREATED: "message.created" as WebhookEventType,
  MESSAGE_UPDATED: "message.updated" as WebhookEventType,
  MESSAGE_DELETED: "message.deleted" as WebhookEventType,
  REACTION_ADDED: "reaction.added" as WebhookEventType,
  REACTION_REMOVED: "reaction.removed" as WebhookEventType,
  MEMBER_JOINED: "member.joined" as WebhookEventType,
  MEMBER_LEFT: "member.left" as WebhookEventType,
  CHANNEL_CREATED: "channel.created" as WebhookEventType,
  CHANNEL_UPDATED: "channel.updated" as WebhookEventType,
  CHANNEL_DELETED: "channel.deleted" as WebhookEventType,
} as const;

// ============================================================================
// MIDDLEWARE HELPERS
// ============================================================================

/**
 * Create an Express-compatible middleware handler
 */
export function createExpressHandler(router: WebhookRouter) {
  return async (
    req: { body: unknown; headers: Record<string, string> },
    res: { status: (code: number) => { json: (body: unknown) => void } },
  ) => {
    const response = await router.handle({
      body: req.body as string | object,
      headers: req.headers,
    });
    res.status(response.status).json(response.body ?? {});
  };
}

/**
 * Create a Next.js API route handler
 */
export function createNextHandler(router: WebhookRouter) {
  return async (req: Request): Promise<Response> => {
    const body = await req.text();
    const headers: Record<string, string> = {};

    req.headers.forEach((value, key) => {
      headers[key] = value;
    });

    const response = await router.handle({ body, headers });

    return new Response(JSON.stringify(response.body ?? {}), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  };
}
