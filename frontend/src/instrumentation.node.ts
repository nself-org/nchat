/**
 * Sentry Instrumentation - Node.js Runtime (Server-side)
 *
 * This file initializes Sentry for server-side error tracking and performance monitoring.
 * It runs in the Node.js runtime (API routes, server components, middleware).
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

    // Release tracking - use git commit SHA or version
    release:
      process.env.NEXT_PUBLIC_RELEASE_VERSION ||
      process.env.VERCEL_GIT_COMMIT_SHA,

    // Performance Monitoring
    // Adjust this value in production, or use tracesSampler for greater control
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Profiling (optional - requires separate setup)
    // profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Capture errors based on environment
    enabled: process.env.NODE_ENV !== "test",

    // Don't send errors in development unless explicitly enabled
    beforeSend(event, hint) {
      // Filter out development errors if not explicitly enabled
      if (
        process.env.NODE_ENV === "development" &&
        !process.env.SENTRY_ENABLE_DEV
      ) {
        return null;
      }

      // Don't send client-side errors from server
      if (event.contexts?.runtime?.name !== "node") {
        return null;
      }

      // Filter sensitive data
      if (event.request) {
        // Remove sensitive headers
        const sensitiveHeaders = ["authorization", "cookie", "x-api-key"];
        if (event.request.headers) {
          sensitiveHeaders.forEach((header) => {
            if (event.request?.headers?.[header]) {
              event.request.headers[header] = "[Filtered]";
            }
          });
        }

        // Remove sensitive query parameters
        const sensitiveParams = [
          "token",
          "password",
          "secret",
          "apiKey",
          "api_key",
        ];
        if (event.request.query_string && event.request) {
          const queryString =
            typeof event.request.query_string === "string"
              ? event.request.query_string
              : "";
          if (queryString) {
            sensitiveParams.forEach((param) => {
              const regex = new RegExp(`(${param}=)[^&]+`, "gi");
              if (
                event.request &&
                typeof event.request.query_string === "string"
              ) {
                event.request.query_string = queryString.replace(
                  regex,
                  "$1[Filtered]",
                );
              }
            });
          }
        }
      }

      // Filter sensitive breadcrumb data
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
          if (breadcrumb.data) {
            // Filter sensitive data in breadcrumbs
            const filtered = { ...breadcrumb.data };
            const sensitiveKeys = [
              "password",
              "token",
              "secret",
              "apiKey",
              "api_key",
              "authorization",
            ];

            sensitiveKeys.forEach((key) => {
              if (filtered[key]) {
                filtered[key] = "[Filtered]";
              }
            });

            return { ...breadcrumb, data: filtered };
          }
          return breadcrumb;
        });
      }

      return event;
    },

    // Ignore specific errors
    ignoreErrors: [
      // Browser extensions
      /chrome-extension/i,
      /moz-extension/i,
      // Network errors
      "Network request failed",
      "NetworkError",
      "Failed to fetch",
      // Aborted requests
      "AbortError",
      "The operation was aborted",
      // User navigation
      "Navigation cancelled",
      // Next.js router errors
      "NEXT_NOT_FOUND",
      "NEXT_REDIRECT",
    ],

    // Integration configuration
    integrations: [
      // Prisma integration (if using Prisma)
      // new Sentry.Integrations.Prisma({ client: prisma }),
      // Node profiling (requires @sentry/profiling-node)
      // new ProfilingIntegration(),
    ],

    // Additional tags for context
    initialScope: {
      tags: {
        runtime: "nodejs",
        nextjs: "15",
        app: "nself-chat",
      },
    },
  });

  // Log initialization (only in development)
  if (process.env.NODE_ENV === "development") {
    // REMOVED: console.log('[Sentry] Server-side monitoring initialized')
  }
} else {
  // Log warning if DSN is not configured (only in production)
  if (process.env.NODE_ENV === "production") {
    logger.warn("[Sentry] DSN not configured - error tracking disabled");
  }
}
