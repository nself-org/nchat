/**
 * Bot Token Utilities
 * Handles generation, hashing, and verification of bot API tokens
 */

import crypto from "crypto";

/**
 * Token prefix for bot API tokens
 */
export const BOT_TOKEN_PREFIX = "nbot_";

/**
 * Token length (excluding prefix)
 */
const TOKEN_LENGTH = 32; // 32 bytes = 64 hex characters

/**
 * Generate a new bot API token
 * Format: nbot_[64 hex characters]
 *
 * @returns A new random bot token
 *
 * @example
 * const token = generateBotToken();
 * // => 'nbot_a1b2c3d4e5f6...'
 */
export function generateBotToken(): string {
  const randomBytes = crypto.randomBytes(TOKEN_LENGTH);
  const tokenBody = randomBytes.toString("hex");
  return `${BOT_TOKEN_PREFIX}${tokenBody}`;
}

/**
 * Hash a bot token for storage
 * Uses SHA-256 for fast, secure hashing
 *
 * @param token - The plaintext bot token
 * @returns SHA-256 hash of the token
 *
 * @example
 * const hash = hashToken('nbot_abc123...');
 * // Store hash in database
 */
export function hashToken(token: string): string {
  if (!token.startsWith(BOT_TOKEN_PREFIX)) {
    throw new Error("Invalid bot token format");
  }

  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Verify a bot token against its hash
 * Constant-time comparison to prevent timing attacks
 *
 * @param token - The plaintext token to verify
 * @param hash - The stored token hash
 * @returns True if token matches hash
 *
 * @example
 * const isValid = verifyToken(providedToken, storedHash);
 * if (isValid) {
 *   // Token is valid
 * }
 */
export function verifyToken(token: string, hash: string): boolean {
  if (!token.startsWith(BOT_TOKEN_PREFIX)) {
    return false;
  }

  const tokenHash = hashToken(token);

  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(Buffer.from(tokenHash), Buffer.from(hash));
}

/**
 * Extract bot token from Authorization header
 * Supports: "Bearer nbot_..." or "nbot_..."
 *
 * @param authHeader - The Authorization header value
 * @returns Extracted token or null
 *
 * @example
 * const token = extractTokenFromHeader('Bearer nbot_abc123...');
 * // => 'nbot_abc123...'
 */
export function extractTokenFromHeader(
  authHeader: string | null | undefined,
): string | null {
  if (!authHeader) {
    return null;
  }

  // Handle "Bearer nbot_..." format
  const bearerMatch = authHeader.match(/^Bearer\s+(nbot_[a-f0-9]{64})$/i);
  if (bearerMatch) {
    return bearerMatch[1];
  }

  // Handle direct "nbot_..." format
  const directMatch = authHeader.match(/^(nbot_[a-f0-9]{64})$/);
  if (directMatch) {
    return directMatch[1];
  }

  return null;
}

/**
 * Validate token format (does not verify against database)
 *
 * @param token - The token to validate
 * @returns True if token has valid format
 *
 * @example
 * if (isValidTokenFormat('nbot_abc123...')) {
 *   // Token format is correct
 * }
 */
export function isValidTokenFormat(token: string): boolean {
  return /^nbot_[a-f0-9]{64}$/.test(token);
}

/**
 * Mask token for safe display in logs
 * Shows first 12 chars and last 4 chars
 *
 * @param token - The token to mask
 * @returns Masked token
 *
 * @example
 * maskToken('nbot_a1b2c3d4e5f6...');
 * // => 'nbot_a1b2c3d...xyz9'
 */
export function maskToken(token: string): string {
  if (!token || token.length < 16) {
    return "***";
  }

  const prefix = token.slice(0, 12);
  const suffix = token.slice(-4);
  return `${prefix}...${suffix}`;
}

/**
 * Check if a token is expired
 *
 * @param expiresAt - Expiration timestamp
 * @returns True if token is expired
 */
export function isTokenExpired(
  expiresAt: Date | string | null | undefined,
): boolean {
  if (!expiresAt) {
    return false; // No expiration = never expires
  }

  const expiration =
    typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
  return expiration.getTime() < Date.now();
}

/**
 * Generate a webhook secret
 * Used for HMAC signing of webhook payloads
 *
 * @returns A random secret string
 */
export function generateWebhookSecret(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Sign a webhook payload with HMAC-SHA256
 *
 * @param payload - The payload to sign (JSON string)
 * @param secret - The webhook secret
 * @returns HMAC signature
 *
 * @example
 * const signature = signWebhookPayload(JSON.stringify(data), secret);
 * // Include in header: X-Webhook-Signature: sha256=<signature>
 */
export function signWebhookPayload(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Verify a webhook signature
 * Constant-time comparison to prevent timing attacks
 *
 * @param payload - The payload that was signed
 * @param signature - The signature to verify
 * @param secret - The webhook secret
 * @returns True if signature is valid
 *
 * @example
 * const isValid = verifyWebhookSignature(
 *   JSON.stringify(data),
 *   receivedSignature,
 *   storedSecret
 * );
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  const expectedSignature = signWebhookPayload(payload, secret);

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  } catch {
    return false;
  }
}

/**
 * Rate limiting: Check if bot has exceeded rate limit
 * Uses a simple in-memory cache (should be replaced with Redis in production)
 */
const rateLimitCache = new Map<string, number[]>();

/**
 * Check rate limit for a bot
 * Default: 100 requests per minute
 *
 * @param botId - The bot ID
 * @param limit - Maximum requests per window
 * @param windowMs - Time window in milliseconds
 * @returns Object with allowed status and remaining requests
 */
export function checkRateLimit(
  botId: string,
  limit: number = 100,
  windowMs: number = 60000, // 1 minute
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const resetAt = now + windowMs;

  // Get or create request timestamps for this bot
  let timestamps = rateLimitCache.get(botId) || [];

  // Remove expired timestamps
  timestamps = timestamps.filter((ts) => ts > now - windowMs);

  // Check if limit exceeded
  const allowed = timestamps.length < limit;
  const remaining = Math.max(0, limit - timestamps.length - (allowed ? 1 : 0));

  if (allowed) {
    timestamps.push(now);
    rateLimitCache.set(botId, timestamps);
  }

  return { allowed, remaining, resetAt };
}

/**
 * Clear rate limit cache (for testing)
 */
export function clearRateLimitCache(): void {
  rateLimitCache.clear();
}
