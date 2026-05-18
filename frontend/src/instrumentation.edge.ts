/**
 * Sentry Instrumentation - Edge Runtime
 *
 * This file initializes Sentry for edge runtime error tracking.
 * It runs in the Edge runtime (middleware, edge functions).
 */

import * as Sentry from "@sentry/nextjs";

import { logger } from "@/lib/logger";

// Only initialize Sentry if DSN is configured
const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    // Your Sentry DSN (Data Source Name)
    dsn: SENTRY_DSN,

    // Environment name
    environment:
      process.env.NEXT_PUBLIC_ENV || process.env.NODE_ENV || "development",

    // Release tracking
    release:
      process.env.NEXT_PUBLIC_RELEASE_VERSION ||
      process.env.VERCEL_GIT_COMMIT_SHA,

    // Performance Monitoring
    // Edge runtime has limited resources, so use a lower sample rate
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 0.5,

    // Capture errors based on environment
    enabled: process.env.NODE_ENV !== "test",

    // Don't send errors in development unless explicitly enabled
    beforeSend(event) {
      if (
        process.env.NODE_ENV === "development" &&
        !process.env.SENTRY_ENABLE_DEV
      ) {
        return null;
      }

      // Filter sensitive data from edge requests
      if (event.request?.headers) {
        const sensitiveHeaders = ["authorization", "cookie", "x-api-key"];
        sensitiveHeaders.forEach((header) => {
          if (event.request?.headers?.[header]) {
            event.request.headers[header] = "[Filtered]";
          }
        });
      }

      return event;
    },

    // Ignore specific errors
    ignoreErrors: [
      "Network request failed",
      "NetworkError",
      "Failed to fetch",
      "AbortError",
      "NEXT_NOT_FOUND",
      "NEXT_REDIRECT",
    ],

    // Additional tags for context
    initialScope: {
      tags: {
        runtime: "edge",
        nextjs: "15",
        app: "nself-chat",
      },
    },
  });

  // Log initialization (only in development)
  if (process.env.NODE_ENV === "development") {
    // REMOVED: console.log('[Sentry] Edge runtime monitoring initialized')
  }
} else {
  // Log warning if DSN is not configured (only in production)
  if (process.env.NODE_ENV === "production") {
    logger.warn("[Sentry] DSN not configured - error tracking disabled");
  }
}
