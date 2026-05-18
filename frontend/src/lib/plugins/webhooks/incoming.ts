/**
 * Incoming Webhook Processing
 *
 * Handles incoming webhooks from external services that want to post
 * messages or trigger actions in nChat. Includes:
 * - Token-based authentication
 * - Payload validation and sanitization
 * - Rate limiting per token
 * - Content size limits
 * - Embed and attachment handling
 */

import type {
  WebhookRegistration,
  IncomingWebhookResult,
  IncomingWebhookRequest,
  WebhookRateLimitConfig,
} from "./types";
import { DEFAULT_INCOMING_RATE_LIMIT } from "./types";
import { verifySignature } from "./signature";
import type { SignatureAlgorithm } from "./types";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Maximum incoming payload size in bytes (64 KB) */
export const MAX_INCOMING_PAYLOAD_SIZE = 64 * 1024;

/** Maximum message content length */
export const MAX_CONTENT_LENGTH = 4000;

/** Maximum number of embeds per message */
export const MAX_EMBEDS = 10;

/** Maximum number of attachments per message */
export const MAX_ATTACHMENTS = 10;

/** Maximum embed field count */
export const MAX_EMBED_FIELDS = 25;

/** Maximum length of embed field name */
export const MAX_EMBED_FIELD_NAME_LENGTH = 256;

/** Maximum length of embed field value */
export const MAX_EMBED_FIELD_VALUE_LENGTH = 1024;

// ============================================================================
// INCOMING PAYLOAD TYPES
// ============================================================================

/**
 * Validated and normalized incoming webhook payload.
 */
export interface NormalizedIncomingPayload {
  /** Message content (text) */
  content?: string;
  /** Username override */
  username?: string;
  /** Avatar URL override */
  avatarUrl?: string;
  /** Thread ID to post in */
  threadId?: string;
  /** Attachments */
  attachments?: Array<{
    url: string;
    filename?: string;
    contentType?: string;
  }>;
  /** Embeds */
  embeds?: Array<{
    title?: string;
    description?: string;
    url?: string;
    color?: string;
    fields?: Array<{
      name: string;
      value: string;
      inline?: boolean;
    }>;
  }>;
}

// ============================================================================
// RATE LIMITER
// ============================================================================

/**
 * Simple sliding window rate limiter for incoming webhooks.
 */
export class IncomingRateLimiter {
  private windows: Map<string, number[]> = new Map();
  private config: WebhookRateLimitConfig;

  constructor(config: WebhookRateLimitConfig = DEFAULT_INCOMING_RATE_LIMIT) {
    this.config = config;
  }

  /**
   * Check if a request from a token is allowed.
   * Returns true if allowed, false if rate limited.
   */
  checkLimit(token: string): {
    allowed: boolean;
    remaining: number;
    resetAt: number;
  } {
    const now = Date.now();
    const windowMs = this.config.windowSeconds * 1000;
    const windowStart = now - windowMs;
    const maxRequests =
      this.config.maxRequests + (this.config.burstAllowance ?? 0);

    // Get or create window
    let timestamps = this.windows.get(token) ?? [];

    // Remove expired timestamps
    timestamps = timestamps.filter((t) => t > windowStart);
    this.windows.set(token, timestamps);

    if (timestamps.length >= maxRequests) {
      const oldestInWindow = timestamps[0];
      const resetAt = oldestInWindow + windowMs;
      return {
        allowed: false,
        remaining: 0,
        resetAt,
      };
    }

    // Record this request
    timestamps.push(now);
    this.windows.set(token, timestamps);

    return {
      allowed: true,
      remaining: maxRequests - timestamps.length,
      resetAt: now + windowMs,
    };
  }

  /**
   * Reset rate limit for a token.
   */
  reset(token: string): void {
    this.windows.delete(token);
  }

  /**
   * Clear all rate limit state.
   */
  clear(): void {
    this.windows.clear();
  }
}

// ============================================================================
// PAYLOAD VALIDATION
// ============================================================================

/**
 * Validate and normalize an incoming webhook payload.
 *
 * @param body - The raw request body
 * @returns Normalized payload or validation error
 */
export function validateIncomingPayload(
  body: unknown,
):
  | { valid: true; payload: NormalizedIncomingPayload }
  | { valid: false; error: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body must be a JSON object" };
  }

  const raw = body as Record<string, unknown>;

  // Must have content, embeds, or attachments
  if (!raw.content && !raw.embeds && !raw.attachments && !raw.text) {
    return {
      valid: false,
      error:
        "Request must include at least one of: content, text, embeds, attachments",
    };
  }

  const payload: NormalizedIncomingPayload = {};

  // Content (support both "content" and "text" fields for compatibility)
  const content = (raw.content ?? raw.text) as string | undefined;
  if (content !== undefined) {
    if (typeof content !== "string") {
      return { valid: false, error: "content must be a string" };
    }
    if (content.length > MAX_CONTENT_LENGTH) {
      return {
        valid: false,
        error: `content exceeds maximum length (${MAX_CONTENT_LENGTH} characters)`,
      };
    }
    payload.content = content;
  }

  // Username
  if (raw.username !== undefined) {
    if (typeof raw.username !== "string" || raw.username.length > 80) {
      return {
        valid: false,
        error: "username must be a string (max 80 characters)",
      };
    }
    payload.username = raw.username;
  }

  // Avatar URL
  const avatarUrl = (raw.avatarUrl ?? raw.avatar_url ?? raw.icon_url) as
    | string
    | undefined;
  if (avatarUrl !== undefined) {
    if (typeof avatarUrl !== "string") {
      return { valid: false, error: "avatarUrl must be a string" };
    }
    if (!isValidUrl(avatarUrl)) {
      return { valid: false, error: "avatarUrl must be a valid URL" };
    }
    payload.avatarUrl = avatarUrl;
  }

  // Thread ID
  const threadId = (raw.threadId ?? raw.thread_id) as string | undefined;
  if (threadId !== undefined) {
    if (typeof threadId !== "string") {
      return { valid: false, error: "threadId must be a string" };
    }
    payload.threadId = threadId;
  }

  // Attachments
  if (raw.attachments !== undefined) {
    if (!Array.isArray(raw.attachments)) {
      return { valid: false, error: "attachments must be an array" };
    }
    if (raw.attachments.length > MAX_ATTACHMENTS) {
      return {
        valid: false,
        error: `Maximum ${MAX_ATTACHMENTS} attachments allowed`,
      };
    }

    const validatedAttachments = [];
    for (const att of raw.attachments) {
      if (!att || typeof att !== "object" || !("url" in att)) {
        return {
          valid: false,
          error: "Each attachment must have a url property",
        };
      }
      const attObj = att as Record<string, unknown>;
      if (typeof attObj.url !== "string" || !isValidUrl(attObj.url as string)) {
        return { valid: false, error: "Attachment url must be a valid URL" };
      }
      validatedAttachments.push({
        url: attObj.url as string,
        filename:
          typeof attObj.filename === "string" ? attObj.filename : undefined,
        contentType:
          typeof attObj.contentType === "string"
            ? attObj.contentType
            : undefined,
      });
    }
    payload.attachments = validatedAttachments;
  }

  // Embeds
  if (raw.embeds !== undefined) {
    if (!Array.isArray(raw.embeds)) {
      return { valid: false, error: "embeds must be an array" };
    }
    if (raw.embeds.length > MAX_EMBEDS) {
      return { valid: false, error: `Maximum ${MAX_EMBEDS} embeds allowed` };
    }

    const validatedEmbeds = [];
    for (const embed of raw.embeds) {
      const embedResult = validateEmbed(embed);
      if (!embedResult.valid) {
        return embedResult;
      }
      validatedEmbeds.push(embedResult.embed);
    }
    payload.embeds = validatedEmbeds;
  }

  return { valid: true, payload };
}

/**
 * Validate an embed object.
 */
function validateEmbed(embed: unknown):
  | {
      valid: true;
      embed: NonNullable<NormalizedIncomingPayload["embeds"]>[number];
    }
  | { valid: false; error: string } {
  if (!embed || typeof embed !== "object") {
    return { valid: false, error: "Each embed must be an object" };
  }

  const raw = embed as Record<string, unknown>;
  const result: NonNullable<NormalizedIncomingPayload["embeds"]>[number] = {};

  if (raw.title !== undefined) {
    if (typeof raw.title !== "string") {
      return { valid: false, error: "embed.title must be a string" };
    }
    result.title = raw.title;
  }

  if (raw.description !== undefined) {
    if (typeof raw.description !== "string") {
      return { valid: false, error: "embed.description must be a string" };
    }
    result.description = raw.description;
  }

  if (raw.url !== undefined) {
    if (typeof raw.url !== "string" || !isValidUrl(raw.url)) {
      return { valid: false, error: "embed.url must be a valid URL" };
    }
    result.url = raw.url;
  }

  if (raw.color !== undefined) {
    if (typeof raw.color !== "string") {
      return { valid: false, error: "embed.color must be a string" };
    }
    result.color = raw.color;
  }

  if (raw.fields !== undefined) {
    if (!Array.isArray(raw.fields)) {
      return { valid: false, error: "embed.fields must be an array" };
    }
    if (raw.fields.length > MAX_EMBED_FIELDS) {
      return {
        valid: false,
        error: `Maximum ${MAX_EMBED_FIELDS} embed fields allowed`,
      };
    }

    const fields = [];
    for (const field of raw.fields) {
      if (!field || typeof field !== "object") {
        return { valid: false, error: "Each embed field must be an object" };
      }
      const f = field as Record<string, unknown>;
      if (typeof f.name !== "string") {
        return { valid: false, error: "embed field name must be a string" };
      }
      if (f.name.length > MAX_EMBED_FIELD_NAME_LENGTH) {
        return {
          valid: false,
          error: `embed field name exceeds ${MAX_EMBED_FIELD_NAME_LENGTH} characters`,
        };
      }
      if (typeof f.value !== "string") {
        return { valid: false, error: "embed field value must be a string" };
      }
      if (f.value.length > MAX_EMBED_FIELD_VALUE_LENGTH) {
        return {
          valid: false,
          error: `embed field value exceeds ${MAX_EMBED_FIELD_VALUE_LENGTH} characters`,
        };
      }
      fields.push({
        name: f.name,
        value: f.value,
        inline: typeof f.inline === "boolean" ? f.inline : undefined,
      });
    }
    result.fields = fields;
  }

  return { valid: true, embed: result };
}

// ============================================================================
// INCOMING WEBHOOK PROCESSOR
// ============================================================================

/**
 * Callback for message creation (dependency injection).
 */
export type MessageCreatorFn = (params: {
  channelId: string;
  threadId?: string;
  content?: string;
  username: string;
  avatarUrl?: string;
  attachments?: NormalizedIncomingPayload["attachments"];
  embeds?: NormalizedIncomingPayload["embeds"];
  webhookId: string;
}) => Promise<{ messageId: string }>;

/**
 * Incoming webhook processor.
 * Validates, rate-limits, and processes incoming webhook requests.
 */
export class IncomingWebhookProcessor {
  private rateLimiter: IncomingRateLimiter;
  private webhookLookup: Map<string, WebhookRegistration> = new Map();
  private messageCreator: MessageCreatorFn;

  constructor(
    messageCreator: MessageCreatorFn,
    rateLimitConfig?: WebhookRateLimitConfig,
  ) {
    this.rateLimiter = new IncomingRateLimiter(rateLimitConfig);
    this.messageCreator = messageCreator;
  }

  /**
   * Register a webhook for token lookup.
   */
  registerWebhook(webhook: WebhookRegistration): void {
    if (webhook.token) {
      this.webhookLookup.set(webhook.token, webhook);
    }
  }

  /**
   * Unregister a webhook.
   */
  unregisterWebhook(token: string): void {
    this.webhookLookup.delete(token);
  }

  /**
   * Process an incoming webhook request.
   */
  async process(
    request: IncomingWebhookRequest,
  ): Promise<IncomingWebhookResult> {
    // 1. Token authentication
    const webhook = this.webhookLookup.get(request.token);
    if (!webhook) {
      return {
        accepted: false,
        error: "Invalid webhook token",
        statusCode: 401,
      };
    }

    // 2. Check webhook status
    if (webhook.status !== "active") {
      return {
        accepted: false,
        error: `Webhook is ${webhook.status}`,
        statusCode: 403,
      };
    }

    // 3. Check webhook direction
    if (webhook.direction !== "incoming") {
      return {
        accepted: false,
        error: "Not an incoming webhook",
        statusCode: 400,
      };
    }

    // 4. Rate limiting
    const rateResult = this.rateLimiter.checkLimit(request.token);
    if (!rateResult.allowed) {
      return {
        accepted: false,
        error: "Rate limit exceeded",
        statusCode: 429,
      };
    }

    // 5. Payload size check
    const bodyStr =
      typeof request.body === "string"
        ? request.body
        : JSON.stringify(request.body);
    if (bodyStr.length > MAX_INCOMING_PAYLOAD_SIZE) {
      return {
        accepted: false,
        error: `Payload too large (max ${MAX_INCOMING_PAYLOAD_SIZE} bytes)`,
        statusCode: 413,
      };
    }

    // 6. Signature verification (if webhook has a secret and signature is provided)
    const signatureHeader =
      request.headers["x-webhook-signature"] ||
      request.headers["X-Webhook-Signature"];
    if (webhook.secret && signatureHeader) {
      const sigResult = verifySignature(
        bodyStr,
        signatureHeader,
        webhook.secret,
      );
      if (!sigResult.valid) {
        return {
          accepted: false,
          error: `Signature verification failed: ${sigResult.error}`,
          statusCode: 401,
        };
      }
    }

    // 7. Validate and normalize payload
    const body =
      typeof request.body === "string"
        ? JSON.parse(request.body)
        : request.body;
    const validation = validateIncomingPayload(body);
    if (!validation.valid) {
      return {
        accepted: false,
        error: validation.error,
        statusCode: 400,
      };
    }

    const payload = validation.payload;

    // 8. Create message
    try {
      const result = await this.messageCreator({
        channelId: webhook.channelId!,
        threadId: payload.threadId,
        content: payload.content,
        username: payload.username ?? webhook.defaultUsername ?? "Webhook",
        avatarUrl: payload.avatarUrl ?? webhook.avatarUrl,
        attachments: payload.attachments,
        embeds: payload.embeds,
        webhookId: webhook.id,
      });

      return {
        accepted: true,
        messageId: result.messageId,
        statusCode: 200,
      };
    } catch (err) {
      return {
        accepted: false,
        error: err instanceof Error ? err.message : "Internal error",
        statusCode: 500,
      };
    }
  }

  /**
   * Get the rate limiter instance.
   */
  getRateLimiter(): IncomingRateLimiter {
    return this.rateLimiter;
  }

  /**
   * Clear all state.
   */
  clear(): void {
    this.webhookLookup.clear();
    this.rateLimiter.clear();
  }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Validate a URL string.
 */
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}
