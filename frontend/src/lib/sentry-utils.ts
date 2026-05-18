/**
 * Sentry Utility Functions
 *
 * Helper functions for working with Sentry error tracking and monitoring.
 */

import * as Sentry from "@sentry/nextjs";
import { logger } from "@/lib/logger";

/**
 * Set user context in Sentry
 * Call this when a user logs in or their data changes
 */
export function setSentryUser(user: {
  id: string;
  email?: string;
  username?: string;
  role?: string;
}) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
    // Add custom fields
    role: user.role,
  });
}

/**
 * Clear user context in Sentry
 * Call this when a user logs out
 */
export function clearSentryUser() {
  Sentry.setUser(null);
}

/**
 * Add custom context to Sentry events
 * Use this to add relevant business context
 */
export function setSentryContext(
  name: string,
  context: Record<string, unknown>,
) {
  Sentry.setContext(name, context);
}

/**
 * Add a breadcrumb to track user actions
 */
export function addSentryBreadcrumb(
  category: string,
  message: string,
  data?: Record<string, unknown>,
  level: "debug" | "info" | "warning" | "error" = "info",
) {
  Sentry.addBreadcrumb({
    category,
    message,
    level,
    data,
  });
}

/**
 * Capture an error with additional context
 */
export function captureError(
  error: Error,
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
    level?: "fatal" | "error" | "warning" | "info" | "debug";
  },
) {
  Sentry.captureException(error, {
    tags: context?.tags,
    extra: context?.extra,
    level: context?.level,
  });
}

/**
 * Capture a message with context
 */
export function captureMessage(
  message: string,
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
    level?: "fatal" | "error" | "warning" | "info" | "debug";
  },
) {
  Sentry.captureMessage(message, {
    tags: context?.tags,
    extra: context?.extra,
    level: context?.level || "info",
  });
}

/**
 * Track a custom transaction for performance monitoring
 * Using startSpan which replaces deprecated startTransaction in Sentry v8
 */
export async function trackTransaction<T>(
  name: string,
  operation: string,
  callback: () => Promise<T>,
): Promise<T> {
  return await Sentry.startSpan(
    {
      name,
      op: operation,
    },
    async () => {
      return await callback();
    },
  );
}

/**
 * Add custom tags to all future events
 */
export function setSentryTags(tags: Record<string, string>) {
  Object.entries(tags).forEach(([key, value]) => {
    Sentry.setTag(key, value);
  });
}

/**
 * Check if user has opted out of error tracking
 */
export function hasOptedOutOfTracking(): boolean {
  if (typeof window === "undefined") return false;

  try {
    return window.localStorage.getItem("sentry-opt-out") === "true";
  } catch {
    return false;
  }
}

/**
 * Opt user out of error tracking
 */
export function optOutOfTracking(): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem("sentry-opt-out", "true");
    // Close current Sentry client
    Sentry.close();
  } catch (error) {
    logger.error("Failed to opt out of tracking:", error);
  }
}

/**
 * Opt user back in to error tracking
 */
export function optInToTracking(): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem("sentry-opt-out");
    // Note: User needs to refresh page for Sentry to reinitialize
  } catch (error) {
    logger.error("Failed to opt in to tracking:", error);
  }
}

/**
 * Example usage in authentication context
 */
export const authContextExample = `
import { setSentryUser, clearSentryUser } from '@/lib/sentry-utils'

// On login
function handleLogin(user) {
  setSentryUser({
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
  })
}

// On logout
function handleLogout() {
  clearSentryUser()
}
`;

/**
 * Example usage for tracking feature usage
 */
export const featureTrackingExample = `
import { addSentryBreadcrumb, setSentryContext } from '@/lib/sentry-utils'

function sendMessage(channelId: string, message: string) {
  // Add breadcrumb
  addSentryBreadcrumb(
    'chat',
    'Message sent',
    { channelId, messageLength: message.length },
    'info'
  )

  // Add context
  setSentryContext('channel', {
    id: channelId,
    type: 'public',
  })

  // ... send message logic
}
`;

/**
 * Example usage for error handling
 */
export const errorHandlingExample = `
import { captureError, captureMessage } from '@/lib/sentry-utils'

async function uploadFile(file: File) {
  try {
    const result = await uploadToStorage(file)

    // Track success
    captureMessage('File uploaded successfully', {
      level: 'info',
      tags: { feature: 'file-upload' },
      extra: { fileSize: file.size, fileType: file.type },
    })

    return result
  } catch (error) {
    // Track error with context
    captureError(error as Error, {
      level: 'error',
      tags: { feature: 'file-upload', fileType: file.type },
      extra: { fileSize: file.size, fileName: file.name },
    })
    throw error
  }
}
`;

/**
 * Example usage for performance tracking
 */
export const performanceTrackingExample = `
import { trackTransaction } from '@/lib/sentry-utils'

import { logger } from '@/lib/logger'

async function loadDashboard() {
  return trackTransaction(
    'Load Dashboard',
    'ui.load',
    async () => {
      const [stats, users, channels] = await Promise.all([
        fetchStats(),
        fetchUsers(),
        fetchChannels(),
      ])

      return { stats, users, channels }
    }
  )
}
`;
