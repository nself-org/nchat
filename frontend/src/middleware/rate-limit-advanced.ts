/**
 * Advanced Rate Limiting Middleware
 * Phase 19 - Security Hardening (Task 124)
 */

import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
// @ts-expect-error - Redis client not implemented yet
import { createClient } from "@/lib/redis-client";

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: NextRequest) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

const rateLimitConfigs: Record<string, RateLimitConfig> = {
  // Authentication endpoints - strict limits
  "/api/auth/signin": { windowMs: 15 * 60 * 1000, maxRequests: 5 }, // 5 per 15min
  "/api/auth/signup": { windowMs: 60 * 60 * 1000, maxRequests: 3 }, // 3 per hour
  "/api/auth/reset-password": { windowMs: 60 * 60 * 1000, maxRequests: 3 },

  // API endpoints - moderate limits
  "/api/messages": { windowMs: 60 * 1000, maxRequests: 100 }, // 100 per minute
  "/api/channels": { windowMs: 60 * 1000, maxRequests: 60 },
  "/api/files/upload": { windowMs: 60 * 1000, maxRequests: 20 },

  // Search - prevent abuse
  "/api/search": { windowMs: 60 * 1000, maxRequests: 30 },

  // Admin endpoints - very strict
  "/api/admin": { windowMs: 60 * 1000, maxRequests: 10 },
};

export async function advancedRateLimit(
  request: NextRequest,
  config?: RateLimitConfig,
): Promise<NextResponse | null> {
  const redis = await createClient();

  // Get config for this endpoint
  const pathname = new URL(request.url).pathname;
  const endpointConfig = config ||
    rateLimitConfigs[pathname] || {
      windowMs: 60 * 1000,
      maxRequests: 60,
    };

  // Generate key (IP + User ID + Endpoint)
  const ip =
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const userId = request.headers.get("x-user-id") || "anonymous";
  const key = `ratelimit:${pathname}:${ip}:${userId}`;

  try {
    // Get current count
    const current = await redis.get(key);
    const count = current ? parseInt(current, 10) : 0;

    // Check if limit exceeded
    if (count >= endpointConfig.maxRequests) {
      const ttl = await redis.ttl(key);
      const resetTime = new Date(Date.now() + ttl * 1000).toISOString();

      return NextResponse.json(
        {
          error: "Too Many Requests",
          message: `Rate limit exceeded. Try again after ${resetTime}`,
          limit: endpointConfig.maxRequests,
          remaining: 0,
          reset: resetTime,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": endpointConfig.maxRequests.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": resetTime,
            "Retry-After": ttl.toString(),
          },
        },
      );
    }

    // Increment counter
    const newCount = await redis.incr(key);

    // Set expiry on first request
    if (newCount === 1) {
      await redis.expire(key, Math.ceil(endpointConfig.windowMs / 1000));
    }

    // Add rate limit headers to response
    const remaining = Math.max(0, endpointConfig.maxRequests - newCount);
    request.headers.set(
      "X-RateLimit-Limit",
      endpointConfig.maxRequests.toString(),
    );
    request.headers.set("X-RateLimit-Remaining", remaining.toString());

    return null; // Allow request to proceed
  } catch (error) {
    console.error("Rate limit error:", error);
    // Fail open - allow request if Redis is down
    return null;
  }
}

// IP-based rate limiting (for unauthenticated requests)
export async function ipRateLimit(
  request: NextRequest,
  maxRequests = 100,
  windowSeconds = 60,
): Promise<NextResponse | null> {
  const redis = await createClient();
  const ip =
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const key = `ratelimit:ip:${ip}`;

  try {
    const count = await redis.incr(key);

    if (count === 1) {
      await redis.expire(key, windowSeconds);
    }

    if (count > maxRequests) {
      return NextResponse.json(
        { error: "Too many requests from this IP address" },
        { status: 429 },
      );
    }

    return null;
  } catch (error) {
    console.error("IP rate limit error:", error);
    return null;
  }
}

// Sliding window rate limiting (more accurate)
export async function slidingWindowRateLimit(
  request: NextRequest,
  maxRequests: number,
  windowSeconds: number,
): Promise<NextResponse | null> {
  const redis = await createClient();
  const pathname = new URL(request.url).pathname;
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const userId = request.headers.get("x-user-id") || "anonymous";
  const key = `ratelimit:sliding:${pathname}:${ip}:${userId}`;

  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;

  try {
    // Remove old entries
    await redis.zremrangebyscore(key, "-inf", windowStart.toString());

    // Count requests in window
    const count = await redis.zcard(key);

    if (count >= maxRequests) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 },
      );
    }

    // Add current request
    await redis.zadd(
      key,
      now.toString(),
      `${now}-${randomBytes(4).toString("hex")}`,
    );
    await redis.expire(key, windowSeconds * 2); // Keep data a bit longer for accuracy

    return null;
  } catch (error) {
    console.error("Sliding window rate limit error:", error);
    return null;
  }
}
