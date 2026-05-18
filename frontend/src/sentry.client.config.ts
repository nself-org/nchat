/**
 * Sentry Configuration - Client-side (Browser)
 *
 * This file initializes Sentry for client-side error tracking and performance monitoring.
 * It runs in the browser and captures frontend errors.
 *
 * Import this file in your root layout or app component.
 */

import * as Sentry from "@sentry/nextjs";

import { logger } from "@/lib/logger";

// Only initialize Sentry if DSN is configured
const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    // Your Sentry DSN (Data Source Name)
    dsn: SENTRY_DSN,

    // Environment name
    environment: process.env.NEXT_PUBLIC_ENV || "development",

    // Release tracking - use git commit SHA or version
    release:
      process.env.NEXT_PUBLIC_RELEASE_VERSION ||
      process.env.VERCEL_GIT_COMMIT_SHA,

    // Performance Monitoring
    // Adjust this value in production, or use tracesSampler for greater control
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Session Replay - captures user interactions for debugging
    // Requires additional setup and has performance implications
    replaysSessionSampleRate:
      process.env.NODE_ENV === "production" ? 0.01 : 0.1,
    replaysOnErrorSampleRate: process.env.NODE_ENV === "production" ? 0.5 : 1.0,

    // Capture errors based on environment
    enabled: process.env.NODE_ENV !== "test",

    // Don't send errors in development unless explicitly enabled
    beforeSend(event, hint) {
      // Filter out development errors if not explicitly enabled
      if (
        process.env.NODE_ENV === "development" &&
        !process.env.NEXT_PUBLIC_SENTRY_ENABLE_DEV
      ) {
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

        // Remove sensitive form data
        if (event.request.data && typeof event.request.data === "object") {
          const sensitiveFields = [
            "password",
            "token",
            "secret",
            "apiKey",
            "api_key",
            "creditCard",
            "ssn",
          ];
          const filtered = { ...event.request.data };

          sensitiveFields.forEach((field) => {
            if (filtered[field]) {
              filtered[field] = "[Filtered]";
            }
          });

          event.request.data = filtered;
        }
      }

      // Filter sensitive breadcrumb data
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
          if (breadcrumb.data) {
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

      // Allow users to opt-out of error reporting
      if (typeof window !== "undefined" && window.localStorage) {
        const optOut = window.localStorage.getItem("sentry-opt-out");
        if (optOut === "true") {
          return null;
        }
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
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications",
      // Next.js router errors
      "NEXT_NOT_FOUND",
      "NEXT_REDIRECT",
      // Common browser errors
      "Non-Error promise rejection captured",
      "Timeout",
      "Script error",
    ],

    // Deny URLs - don't track errors from these sources
    denyUrls: [
      /extensions\//i,
      /^chrome:\/\//i,
      /^chrome-extension:\/\//i,
      /^moz-extension:\/\//i,
    ],

    // Integrations
    integrations: [
      // Browser Tracing - for performance monitoring
      // In Sentry v8, routing is automatically handled for Next.js
      Sentry.browserTracingIntegration(),

      // Session Replay - captures user interactions
      Sentry.replayIntegration({
        // Mask all text and media by default
        maskAllText: true,
        blockAllMedia: true,
        // Unmask specific elements if needed
        // unmask: ['.safe-to-show'],
      }),

      // Breadcrumbs - track user actions
      Sentry.breadcrumbsIntegration({
        console: process.env.NODE_ENV === "development",
        dom: true,
        fetch: true,
        history: true,
        sentry: true,
        xhr: true,
      }),
    ],

    // Additional tags for context
    initialScope: {
      tags: {
        runtime: "browser",
        nextjs: "15",
        app: "nself-chat",
      },
    },

    // Set user context if available
    beforeBreadcrumb(breadcrumb) {
      // Filter console logs in production
      if (
        process.env.NODE_ENV === "production" &&
        breadcrumb.category === "console"
      ) {
        return null;
      }
      return breadcrumb;
    },
  });

  // Log initialization (only in development)
  if (process.env.NODE_ENV === "development") {
    // REMOVED: console.log('[Sentry] Client-side monitoring initialized')
  }
} else {
  // Log warning if DSN is not configured (only in production)
  if (process.env.NODE_ENV === "production") {
    logger.warn("[Sentry] DSN not configured - error tracking disabled");
  }
}
