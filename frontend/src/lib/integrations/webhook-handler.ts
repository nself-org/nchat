/**
 * Webhook Handler
 *
 * Handles incoming webhooks from external services.
 * Verifies signatures, parses payloads, and routes to appropriate handlers.
 */

import type {
  WebhookEventType,
  WebhookConfig,
  IncomingWebhookPayload,
  WebhookVerificationResult,
} from "./types";

// ============================================================================
// Types
// ============================================================================

export interface WebhookHandler {
  source: string;
  handle: (payload: IncomingWebhookPayload) => Promise<WebhookHandlerResult>;
}

export interface WebhookHandlerResult {
  success: boolean;
  message?: string;
  data?: Record<string, unknown>;
  error?: string;
}

export interface ParsedWebhook {
  source: string;
  event: string;
  timestamp: string;
  payload: Record<string, unknown>;
  headers: Record<string, string>;
  isValid: boolean;
  validationError?: string;
}

export type SignatureAlgorithm =
  | "sha256"
  | "sha1"
  | "hmac-sha256"
  | "hmac-sha1";

export interface SignatureConfig {
  algorithm: SignatureAlgorithm;
  header: string;
  secret: string;
  prefix?: string; // e.g., 'sha256=' for GitHub
}

// ============================================================================
// Signature Verification
// ============================================================================

/**
 * Compute HMAC signature for payload
 */
export async function computeHmacSignature(
  payload: string,
  secret: string,
  algorithm: "SHA-256" | "SHA-1" = "SHA-256",
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: algorithm },
    false,
    ["sign"],
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload),
  );
  return Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Verify webhook signature
 */
export async function verifySignature(
  payload: string,
  signature: string,
  config: SignatureConfig,
): Promise<WebhookVerificationResult> {
  if (!signature) {
    return { valid: false, error: "Missing signature" };
  }

  // Remove prefix if present
  let receivedSignature = signature;
  if (config.prefix && signature.startsWith(config.prefix)) {
    receivedSignature = signature.slice(config.prefix.length);
  }

  // Determine algorithm
  const algorithm = config.algorithm.includes("sha256") ? "SHA-256" : "SHA-1";

  try {
    const expectedSignature = await computeHmacSignature(
      payload,
      config.secret,
      algorithm,
    );

    // Constant-time comparison
    if (receivedSignature.length !== expectedSignature.length) {
      return { valid: false, error: "Invalid signature" };
    }

    let result = 0;
    for (let i = 0; i < receivedSignature.length; i++) {
      result |=
        receivedSignature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
    }

    if (result !== 0) {
      return { valid: false, error: "Invalid signature" };
    }

    return { valid: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Signature verification failed";
    return { valid: false, error: message };
  }
}

/**
 * Verify GitHub webhook signature
 */
export async function verifyGitHubSignature(
  payload: string,
  signature: string,
  secret: string,
): Promise<WebhookVerificationResult> {
  return verifySignature(payload, signature, {
    algorithm: "sha256",
    header: "x-hub-signature-256",
    secret,
    prefix: "sha256=",
  });
}

/**
 * Verify Slack webhook signature
 */
export async function verifySlackSignature(
  payload: string,
  timestamp: string,
  signature: string,
  secret: string,
): Promise<WebhookVerificationResult> {
  // Check timestamp to prevent replay attacks
  const now = Math.floor(Date.now() / 1000);
  const webhookTimestamp = parseInt(timestamp, 10);
  if (Math.abs(now - webhookTimestamp) > 300) {
    return { valid: false, error: "Timestamp too old" };
  }

  // Compute expected signature
  const signatureBaseString = `v0:${timestamp}:${payload}`;
  return verifySignature(signatureBaseString, signature, {
    algorithm: "sha256",
    header: "x-slack-signature",
    secret,
    prefix: "v0=",
  });
}

/**
 * Verify Jira webhook signature
 */
export async function verifyJiraSignature(
  payload: string,
  signature: string,
  secret: string,
): Promise<WebhookVerificationResult> {
  return verifySignature(payload, signature, {
    algorithm: "sha256",
    header: "x-hub-signature",
    secret,
    prefix: "sha256=",
  });
}

// ============================================================================
// Payload Parsing
// ============================================================================

/**
 * Parse incoming webhook payload
 */
export function parseWebhookPayload(
  rawPayload: string,
  headers: Record<string, string>,
): ParsedWebhook {
  const source = detectWebhookSource(headers);
  const event = extractEventType(headers, source);
  const timestamp = extractTimestamp(headers) || new Date().toISOString();

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawPayload);
  } catch {
    return {
      source,
      event,
      timestamp,
      payload: {},
      headers,
      isValid: false,
      validationError: "Invalid JSON payload",
    };
  }

  return {
    source,
    event,
    timestamp,
    payload,
    headers,
    isValid: true,
  };
}

/**
 * Detect webhook source from headers
 */
export function detectWebhookSource(headers: Record<string, string>): string {
  const normalizedHeaders = normalizeHeaders(headers);

  // GitHub
  if (normalizedHeaders["x-github-event"]) {
    return "github";
  }

  // Slack
  if (normalizedHeaders["x-slack-signature"]) {
    return "slack";
  }

  // Jira
  if (normalizedHeaders["x-atlassian-webhook-identifier"]) {
    return "jira";
  }

  // Generic
  if (normalizedHeaders["x-webhook-source"]) {
    return normalizedHeaders["x-webhook-source"];
  }

  return "unknown";
}

/**
 * Extract event type from headers or payload
 */
export function extractEventType(
  headers: Record<string, string>,
  source: string,
): string {
  const normalizedHeaders = normalizeHeaders(headers);

  switch (source) {
    case "github":
      return normalizedHeaders["x-github-event"] || "unknown";
    case "slack":
      return normalizedHeaders["x-slack-event-type"] || "unknown";
    case "jira":
      return normalizedHeaders["x-atlassian-webhook-event"] || "unknown";
    default:
      return normalizedHeaders["x-event-type"] || "unknown";
  }
}

/**
 * Extract timestamp from headers
 */
export function extractTimestamp(
  headers: Record<string, string>,
): string | null {
  const normalizedHeaders = normalizeHeaders(headers);

  // Slack
  if (normalizedHeaders["x-slack-request-timestamp"]) {
    const ts = parseInt(normalizedHeaders["x-slack-request-timestamp"], 10);
    return new Date(ts * 1000).toISOString();
  }

  // Generic
  if (normalizedHeaders["x-webhook-timestamp"]) {
    return normalizedHeaders["x-webhook-timestamp"];
  }

  return null;
}

/**
 * Normalize header names to lowercase
 */
export function normalizeHeaders(
  headers: Record<string, string>,
): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    normalized[key.toLowerCase()] = value;
  }
  return normalized;
}

// ============================================================================
// Webhook Handler Manager
// ============================================================================

/**
 * Webhook handler manager for routing webhooks to appropriate handlers
 */
export class WebhookHandlerManager {
  private handlers: Map<string, WebhookHandler> = new Map();
  private signatureSecrets: Map<string, string> = new Map();

  /**
   * Register a webhook handler for a source
   */
  registerHandler(source: string, handler: WebhookHandler): void {
    this.handlers.set(source, handler);
  }

  /**
   * Unregister a webhook handler
   */
  unregisterHandler(source: string): void {
    this.handlers.delete(source);
  }

  /**
   * Get registered handler for a source
   */
  getHandler(source: string): WebhookHandler | undefined {
    return this.handlers.get(source);
  }

  /**
   * Get all registered handlers
   */
  getAllHandlers(): WebhookHandler[] {
    return Array.from(this.handlers.values());
  }

  /**
   * Set signature secret for a source
   */
  setSignatureSecret(source: string, secret: string): void {
    this.signatureSecrets.set(source, secret);
  }

  /**
   * Get signature secret for a source
   */
  getSignatureSecret(source: string): string | undefined {
    return this.signatureSecrets.get(source);
  }

  /**
   * Remove signature secret for a source
   */
  removeSignatureSecret(source: string): void {
    this.signatureSecrets.delete(source);
  }

  /**
   * Process an incoming webhook
   */
  async processWebhook(
    rawPayload: string,
    headers: Record<string, string>,
  ): Promise<WebhookHandlerResult> {
    // Parse the webhook
    const parsed = parseWebhookPayload(rawPayload, headers);

    if (!parsed.isValid) {
      return {
        success: false,
        error: parsed.validationError || "Invalid webhook payload",
      };
    }

    // Verify signature if secret is configured
    const secret = this.signatureSecrets.get(parsed.source);
    if (secret) {
      const verifyResult = await this.verifyWebhookSignature(
        rawPayload,
        headers,
        parsed.source,
        secret,
      );

      if (!verifyResult.valid) {
        return {
          success: false,
          error: verifyResult.error || "Invalid signature",
        };
      }
    }

    // Find handler
    const handler = this.handlers.get(parsed.source);
    if (!handler) {
      return {
        success: false,
        error: `No handler registered for source: ${parsed.source}`,
      };
    }

    // Execute handler
    try {
      const incomingPayload: IncomingWebhookPayload = {
        source: parsed.source,
        event: parsed.event,
        timestamp: parsed.timestamp,
        payload: parsed.payload,
      };

      return await handler.handle(incomingPayload);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Handler execution failed";
      return {
        success: false,
        error: message,
      };
    }
  }

  /**
   * Verify webhook signature based on source
   */
  private async verifyWebhookSignature(
    payload: string,
    headers: Record<string, string>,
    source: string,
    secret: string,
  ): Promise<WebhookVerificationResult> {
    const normalizedHeaders = normalizeHeaders(headers);

    switch (source) {
      case "github": {
        const signature = normalizedHeaders["x-hub-signature-256"] || "";
        return verifyGitHubSignature(payload, signature, secret);
      }

      case "slack": {
        const signature = normalizedHeaders["x-slack-signature"] || "";
        const timestamp = normalizedHeaders["x-slack-request-timestamp"] || "";
        return verifySlackSignature(payload, timestamp, signature, secret);
      }

      case "jira": {
        const signature = normalizedHeaders["x-hub-signature"] || "";
        return verifyJiraSignature(payload, signature, secret);
      }

      default:
        // For unknown sources, skip signature verification
        return { valid: true };
    }
  }

  /**
   * Reset the manager
   */
  reset(): void {
    this.handlers.clear();
    this.signatureSecrets.clear();
  }
}

// ============================================================================
// Default Handlers
// ============================================================================

/**
 * Create a simple logging handler
 */
export function createLoggingHandler(source: string): WebhookHandler {
  return {
    source,
    handle: async (
      payload: IncomingWebhookPayload,
    ): Promise<WebhookHandlerResult> => {
      return {
        success: true,
        message: `Logged ${payload.source}:${payload.event}`,
      };
    },
  };
}

/**
 * Create a handler that forwards to a callback
 */
export function createCallbackHandler(
  source: string,
  callback: (payload: IncomingWebhookPayload) => Promise<void>,
): WebhookHandler {
  return {
    source,
    handle: async (
      payload: IncomingWebhookPayload,
    ): Promise<WebhookHandlerResult> => {
      try {
        await callback(payload);
        return {
          success: true,
          message: `Processed ${payload.source}:${payload.event}`,
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Callback failed";
        return {
          success: false,
          error: message,
        };
      }
    },
  };
}

// ============================================================================
// Singleton Instance
// ============================================================================

let managerInstance: WebhookHandlerManager | null = null;

/**
 * Get the singleton webhook handler manager instance
 */
export function getWebhookHandlerManager(): WebhookHandlerManager {
  if (!managerInstance) {
    managerInstance = new WebhookHandlerManager();
  }
  return managerInstance;
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetWebhookHandlerManager(): void {
  if (managerInstance) {
    managerInstance.reset();
  }
  managerInstance = null;
}
