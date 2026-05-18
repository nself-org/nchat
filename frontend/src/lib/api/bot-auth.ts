/**
 * Bot Authentication Middleware
 * Handles authentication and authorization for bot API requests
 */

import { NextRequest, NextResponse } from "next/server";
import { gql } from "@apollo/client";
import { getApolloClient } from "@/lib/apollo-client";
import {
  extractTokenFromHeader,
  hashToken,
  isValidTokenFormat,
  isTokenExpired,
  checkRateLimit,
} from "@/lib/bots/tokens";
import { BotPermission, tokenHasPermission } from "@/lib/bots/permissions";

import { logger } from "@/lib/logger";

/**
 * Bot authentication result
 */
export interface BotAuthResult {
  botId: string;
  userId: string;
  botName: string;
  scopes: string[];
  tokenId: string;
}

/**
 * GraphQL query to verify bot token
 */
const VERIFY_BOT_TOKEN = gql`
  query VerifyBotToken($tokenHash: String!) {
    nchat_bot_tokens(
      where: { token_hash: { _eq: $tokenHash }, is_active: { _eq: true } }
      limit: 1
    ) {
      id
      bot_id
      scopes
      expires_at
      bot {
        id
        name
        user_id
        is_active
      }
    }
  }
`;

/**
 * GraphQL mutation to update token last_used_at
 */
const UPDATE_TOKEN_LAST_USED = gql`
  mutation UpdateTokenLastUsed($tokenId: uuid!) {
    update_nchat_bot_tokens_by_pk(
      pk_columns: { id: $tokenId }
      _set: { last_used_at: "now()" }
    ) {
      id
    }
  }
`;

/**
 * GraphQL mutation to log API call
 */
const LOG_API_CALL = gql`
  mutation LogApiCall(
    $botId: uuid!
    $endpoint: String!
    $method: String!
    $statusCode: Int
    $responseTimeMs: Int
    $userAgent: String
    $ipAddress: String
  ) {
    insert_nchat_bot_api_logs_one(
      object: {
        bot_id: $botId
        endpoint: $endpoint
        method: $method
        status_code: $statusCode
        response_time_ms: $responseTimeMs
        user_agent: $userAgent
        ip_address: $ipAddress
      }
    ) {
      id
    }
  }
`;

/**
 * Error response helper
 */
function errorResponse(message: string, status: number = 401) {
  return NextResponse.json(
    {
      error: message,
      status,
    },
    { status },
  );
}

/**
 * Verify bot token and return authentication result
 *
 * @param request - Next.js request object
 * @returns Bot auth result or null if invalid
 *
 * @example
 * const auth = await verifyBotToken(request);
 * if (!auth) {
 *   return errorResponse('Invalid token', 401);
 * }
 */
export async function verifyBotToken(
  request: NextRequest,
): Promise<BotAuthResult | null> {
  try {
    // Extract token from Authorization header
    const authHeader = request.headers.get("Authorization");
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return null;
    }

    // Validate token format
    if (!isValidTokenFormat(token)) {
      return null;
    }

    // Hash token for database lookup
    const tokenHash = hashToken(token);

    // Query database for token
    const client = getApolloClient();
    const { data } = await client.query({
      query: VERIFY_BOT_TOKEN,
      variables: { tokenHash },
      fetchPolicy: "network-only",
    });

    const tokenData = data?.nchat_bot_tokens?.[0];

    if (!tokenData) {
      return null;
    }

    // Check if token is expired
    if (isTokenExpired(tokenData.expires_at)) {
      return null;
    }

    // Check if bot is active
    if (!tokenData.bot?.is_active) {
      return null;
    }

    // Update token last_used_at (fire and forget)
    client
      .mutate({
        mutation: UPDATE_TOKEN_LAST_USED,
        variables: { tokenId: tokenData.id },
      })
      .catch((err) =>
        logger.error("Failed to update token last_used_at:", err),
      );

    return {
      botId: tokenData.bot.id,
      userId: tokenData.bot.user_id,
      botName: tokenData.bot.name,
      scopes: tokenData.scopes || [],
      tokenId: tokenData.id,
    };
  } catch (error) {
    logger.error("Error verifying bot token:", error);
    return null;
  }
}

/**
 * Check if bot has required permission
 * Throws error if permission is denied
 *
 * @param auth - Bot auth result
 * @param permission - Required permission
 *
 * @example
 * await checkPermission(auth, BotPermission.MESSAGES_SEND);
 */
export async function checkPermission(
  auth: BotAuthResult,
  permission: BotPermission,
): Promise<void> {
  // Check token scopes first (faster)
  if (!tokenHasPermission(auth.scopes, permission)) {
    throw new Error(`Bot does not have permission: ${permission}`);
  }

  // Note: We could also check database permissions here for additional security
  // For now, token scopes are sufficient
}

/**
 * Rate limit check
 * Throws error if rate limit exceeded
 *
 * @param botId - Bot ID
 * @param limit - Maximum requests per window (default: 100)
 * @param windowMs - Time window in milliseconds (default: 60000)
 */
export function checkBotRateLimit(
  botId: string,
  limit: number = 100,
  windowMs: number = 60000,
): { remaining: number; resetAt: number } {
  const result = checkRateLimit(botId, limit, windowMs);

  if (!result.allowed) {
    const error = new Error("Rate limit exceeded") as any;
    error.statusCode = 429;
    error.resetAt = result.resetAt;
    throw error;
  }

  return {
    remaining: result.remaining,
    resetAt: result.resetAt,
  };
}

/**
 * Log API call for analytics and monitoring
 *
 * @param auth - Bot auth result
 * @param request - Next.js request
 * @param statusCode - Response status code
 * @param responseTimeMs - Response time in milliseconds
 */
export async function logApiCall(
  auth: BotAuthResult,
  request: NextRequest,
  statusCode: number,
  responseTimeMs: number,
): Promise<void> {
  try {
    const client = getApolloClient();
    const url = new URL(request.url);

    await client.mutate({
      mutation: LOG_API_CALL,
      variables: {
        botId: auth.botId,
        endpoint: url.pathname,
        method: request.method,
        statusCode,
        responseTimeMs,
        userAgent: request.headers.get("User-Agent") || null,
        ipAddress:
          request.headers.get("X-Forwarded-For")?.split(",")[0] ||
          request.headers.get("X-Real-IP") ||
          null,
      },
    });
  } catch (error) {
    logger.error("Failed to log API call:", error);
    // Don't throw - logging failure shouldn't break the request
  }
}

/**
 * Middleware wrapper for bot API routes
 * Handles authentication, rate limiting, and logging
 *
 * @param handler - The API route handler
 * @param requiredPermission - Required permission (optional)
 * @returns Wrapped handler with auth middleware
 *
 * @example
 * export const POST = withBotAuth(
 *   async (request, auth) => {
 *     // Handler code here
 *     return NextResponse.json({ success: true });
 *   },
 *   BotPermission.MESSAGES_SEND
 * );
 */
export function withBotAuth(
  handler: (request: NextRequest, auth: BotAuthResult) => Promise<NextResponse>,
  requiredPermission?: BotPermission,
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now();
    let statusCode = 200;

    try {
      // Verify bot token
      const auth = await verifyBotToken(request);
      if (!auth) {
        statusCode = 401;
        return errorResponse("Invalid or missing bot token", 401);
      }

      // Check rate limit
      try {
        const rateLimit = checkBotRateLimit(auth.botId);

        // Add rate limit headers to response
        const headers = new Headers();
        headers.set("X-RateLimit-Remaining", rateLimit.remaining.toString());
        headers.set(
          "X-RateLimit-Reset",
          new Date(rateLimit.resetAt).toISOString(),
        );
      } catch (error: any) {
        statusCode = 429;
        const resetAt = new Date(error.resetAt).toISOString();
        return NextResponse.json(
          {
            error: "Rate limit exceeded",
            status: 429,
            resetAt,
          },
          {
            status: 429,
            headers: {
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": resetAt,
              "Retry-After": Math.ceil(
                (error.resetAt - Date.now()) / 1000,
              ).toString(),
            },
          },
        );
      }

      // Check permission if required
      if (requiredPermission) {
        try {
          await checkPermission(auth, requiredPermission);
        } catch (error: any) {
          statusCode = 403;
          return errorResponse(error.message, 403);
        }
      }

      // Call the actual handler
      const response = await handler(request, auth);
      statusCode = response.status;

      // Log API call
      const responseTime = Date.now() - startTime;
      logApiCall(auth, request, statusCode, responseTime).catch(() => {
        // Ignore logging errors
      });

      return response;
    } catch (error: any) {
      logger.error("Bot API error:", error);
      statusCode = error.statusCode || 500;
      return errorResponse(
        error.message || "Internal server error",
        statusCode,
      );
    }
  };
}

/**
 * Extract bot info from authenticated request
 * Helper for accessing bot details in handlers
 */
export function getBotInfo(auth: BotAuthResult) {
  return {
    botId: auth.botId,
    userId: auth.userId,
    botName: auth.botName,
    scopes: auth.scopes,
  };
}
