/**
 * Error Handler
 *
 * Centralized error handling with Sentry integration, user notifications,
 * and retry coordination.
 */

import { toast } from "@/hooks/use-toast";
import { captureError, addSentryBreadcrumb } from "@/lib/sentry-utils";
import {
  AppError,
  ErrorCategory,
  ErrorSeverity,
  parseError,
  shouldReportError,
  isRetryableError,
  isAuthError,
} from "./error-types";
import type { ErrorContext } from "./error-types";

// ============================================================================
// Error Handler Configuration
// ============================================================================

export interface ErrorHandlerOptions {
  // Display options
  showToast?: boolean;
  toastDuration?: number;
  toastTitle?: string;
  toastDescription?: string;

  // Reporting options
  reportToSentry?: boolean;
  sentryTags?: Record<string, string>;
  sentryExtra?: Record<string, unknown>;

  // Retry options
  allowRetry?: boolean;
  onRetry?: () => void | Promise<void>;

  // Additional actions
  onAuthError?: () => void;
  redirectOnAuth?: boolean;

  // Context
  context?: ErrorContext;
}

export interface ErrorHandlerResult {
  error: AppError;
  handled: boolean;
  retried: boolean;
}

// ============================================================================
// Global Error Handler
// ============================================================================

class ErrorHandler {
  private errorCount: Map<string, number> = new Map();
  private errorTimestamps: Map<string, number[]> = new Map();
  private readonly ERROR_WINDOW_MS = 60000; // 1 minute
  private readonly MAX_ERRORS_PER_WINDOW = 10;

  /**
   * Handle an error with optional retry and user notification
   */
  async handle(
    error: unknown,
    options: ErrorHandlerOptions = {},
  ): Promise<ErrorHandlerResult> {
    const appError = parseError(error);
    const {
      showToast = true,
      toastDuration = 5000,
      reportToSentry = shouldReportError(appError),
      allowRetry = isRetryableError(appError),
      redirectOnAuth = true,
      context,
    } = options;

    // Merge contexts (create new object since context is readonly)
    if (context) {
      const mergedContext = { ...appError.context, ...context };
      Object.assign(appError, { context: mergedContext });
    }

    // Track error frequency
    this.trackError(appError);

    // Check if we're getting too many errors
    if (this.isErrorFlood(appError)) {
      this.handleErrorFlood();
      return { error: appError, handled: true, retried: false };
    }

    // Add breadcrumb
    addSentryBreadcrumb(
      "error",
      appError.message,
      {
        category: appError.category,
        severity: appError.severity,
        userMessage: appError.userMessage,
      },
      "error",
    );

    // Report to Sentry
    if (reportToSentry) {
      captureError(appError, {
        tags: {
          category: appError.category,
          severity: appError.severity,
          ...options.sentryTags,
        },
        extra: {
          ...appError.context,
          ...options.sentryExtra,
        },
        level: this.getSentryLevel(appError.severity),
      });
    }

    // Handle authentication errors
    if (isAuthError(appError)) {
      this.handleAuthError(redirectOnAuth, options.onAuthError);
      return { error: appError, handled: true, retried: false };
    }

    // Show toast notification
    if (showToast) {
      this.showErrorToast(appError, {
        duration: toastDuration,
        title: options.toastTitle,
        description: options.toastDescription,
        allowRetry,
        onRetry: options.onRetry,
      });
    }

    return { error: appError, handled: true, retried: false };
  }

  /**
   * Show error toast with optional retry button
   */
  private showErrorToast(
    error: AppError,
    options: {
      duration?: number;
      title?: string;
      description?: string;
      allowRetry?: boolean;
      onRetry?: () => void | Promise<void>;
    } = {},
  ) {
    const { duration = 5000, allowRetry = false, onRetry } = options;

    // Determine toast title based on error category
    const title =
      options.title || this.getErrorTitle(error.category) || "Error";

    const description = options.description || error.userMessage;

    // Import toast from use-toast hook (returns object with toast function)
    // We can't use JSX in .ts files, so we use the action callback approach
    const toastConfig: Parameters<typeof toast>[0] = {
      title,
      description,
      variant: "destructive",
    };

    // Only add action if retry is enabled
    if (allowRetry && onRetry) {
      // Note: The action should be a ReactNode, but we can't use JSX here
      // The toast component will handle this through the toast() function
      // We'll pass the onRetry function through and let the ErrorToast component handle it
      // For now, we'll skip the action button in the centralized handler
      // and rely on ErrorToast component for retry actions
    }

    toast(toastConfig);
  }

  /**
   * Get user-friendly error title
   */
  private getErrorTitle(category: ErrorCategory): string {
    const titles: Record<ErrorCategory, string> = {
      [ErrorCategory.NETWORK]: "Connection Error",
      [ErrorCategory.AUTHENTICATION]: "Authentication Required",
      [ErrorCategory.AUTHORIZATION]: "Permission Denied",
      [ErrorCategory.VALIDATION]: "Invalid Input",
      [ErrorCategory.NOT_FOUND]: "Not Found",
      [ErrorCategory.RATE_LIMIT]: "Rate Limit Exceeded",
      [ErrorCategory.SERVER]: "Server Error",
      [ErrorCategory.CLIENT]: "Request Error",
      [ErrorCategory.GRAPHQL]: "Data Error",
      [ErrorCategory.UPLOAD]: "Upload Failed",
      [ErrorCategory.OFFLINE]: "Offline",
      [ErrorCategory.TIMEOUT]: "Request Timeout",
      [ErrorCategory.UNKNOWN]: "Error",
    };
    return titles[category];
  }

  /**
   * Get Sentry severity level
   */
  private getSentryLevel(
    severity: ErrorSeverity,
  ): "fatal" | "error" | "warning" | "info" | "debug" {
    const levels: Record<
      ErrorSeverity,
      "fatal" | "error" | "warning" | "info"
    > = {
      [ErrorSeverity.CRITICAL]: "fatal",
      [ErrorSeverity.HIGH]: "error",
      [ErrorSeverity.MEDIUM]: "warning",
      [ErrorSeverity.LOW]: "info",
    };
    return levels[severity];
  }

  /**
   * Handle authentication errors
   */
  private handleAuthError(redirect: boolean, onAuthError?: () => void) {
    // Clear auth state
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }

    // Call custom handler
    if (onAuthError) {
      onAuthError();
    }

    // Redirect to login
    if (redirect && typeof window !== "undefined") {
      // Show toast before redirect
      toast({
        title: "Session Expired",
        description: "Please log in again to continue.",
        variant: "destructive",
      });

      // Delay redirect to show toast
      setTimeout(() => {
        window.location.href = "/auth/signin?reason=session_expired";
      }, 1000);
    }
  }

  /**
   * Track error frequency
   */
  private trackError(error: AppError) {
    const key = `${error.category}:${error.message}`;
    const now = Date.now();

    // Increment error count
    const count = (this.errorCount.get(key) || 0) + 1;
    this.errorCount.set(key, count);

    // Track timestamp
    const timestamps = this.errorTimestamps.get(key) || [];
    timestamps.push(now);

    // Clean old timestamps
    const recentTimestamps = timestamps.filter(
      (ts) => now - ts < this.ERROR_WINDOW_MS,
    );
    this.errorTimestamps.set(key, recentTimestamps);
  }

  /**
   * Check if we're experiencing error flood
   */
  private isErrorFlood(error: AppError): boolean {
    const key = `${error.category}:${error.message}`;
    const timestamps = this.errorTimestamps.get(key) || [];
    return timestamps.length > this.MAX_ERRORS_PER_WINDOW;
  }

  /**
   * Handle error flood (too many errors)
   */
  private handleErrorFlood() {
    toast({
      title: "Multiple Errors Detected",
      description:
        "Too many errors occurred. Please refresh the page or contact support.",
      variant: "destructive",
    });

    // Report flood to Sentry
    captureError(new Error("Error flood detected"), {
      tags: { type: "error_flood" },
      extra: {
        errorCounts: Object.fromEntries(this.errorCount),
        errorTimestamps: Object.fromEntries(this.errorTimestamps),
      },
      level: "warning",
    });
  }

  /**
   * Clear error tracking data
   */
  clearTracking() {
    this.errorCount.clear();
    this.errorTimestamps.clear();
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    return {
      errorCount: Object.fromEntries(this.errorCount),
      errorTimestamps: Object.fromEntries(this.errorTimestamps),
    };
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const errorHandler = new ErrorHandler();

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Handle error and show toast notification
 */
export async function handleError(
  error: unknown,
  options?: ErrorHandlerOptions,
): Promise<ErrorHandlerResult> {
  return errorHandler.handle(error, options);
}

/**
 * Handle error silently (no toast)
 */
export async function handleErrorSilent(
  error: unknown,
  context?: ErrorContext,
): Promise<ErrorHandlerResult> {
  return errorHandler.handle(error, { showToast: false, context });
}

/**
 * Handle error with retry option
 */
export async function handleErrorWithRetry(
  error: unknown,
  onRetry: () => void | Promise<void>,
  options?: Omit<ErrorHandlerOptions, "onRetry" | "allowRetry">,
): Promise<ErrorHandlerResult> {
  return errorHandler.handle(error, {
    ...options,
    allowRetry: true,
    onRetry,
  });
}

/**
 * Handle upload error
 */
export async function handleUploadError(
  error: unknown,
  file: File,
  onRetry?: () => void | Promise<void>,
): Promise<ErrorHandlerResult> {
  const parsedError = parseError(error);
  return errorHandler.handle(parsedError, {
    showToast: true,
    allowRetry: true,
    onRetry,
    context: {
      metadata: {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      },
    },
    sentryTags: {
      feature: "file-upload",
      fileType: file.type,
    },
  });
}

/**
 * Handle GraphQL error
 */
export async function handleGraphQLError(
  error: unknown,
  operation: string,
  variables?: Record<string, unknown>,
): Promise<ErrorHandlerResult> {
  return errorHandler.handle(error, {
    showToast: true,
    context: {
      operation,
      metadata: { variables },
    },
    sentryTags: {
      feature: "graphql",
      operation,
    },
  });
}

/**
 * Handle network error with retry
 */
export async function handleNetworkError(
  error: unknown,
  onRetry?: () => void | Promise<void>,
): Promise<ErrorHandlerResult> {
  return errorHandler.handle(error, {
    showToast: true,
    allowRetry: true,
    onRetry,
    sentryTags: {
      feature: "network",
    },
  });
}

// ============================================================================
// Error Boundary Integration
// ============================================================================

export interface ErrorBoundaryFallbackProps {
  error: AppError;
  resetError: () => void;
}

export function handleErrorBoundaryError(
  error: Error,
  errorInfo: React.ErrorInfo,
): AppError {
  const appError = parseError(error);

  // Add React error info to context (create new object since context is readonly)
  const mergedContext = {
    ...appError.context,
    metadata: {
      ...appError.context.metadata,
      componentStack: errorInfo.componentStack,
    },
  };
  Object.assign(appError, { context: mergedContext });

  // Report to Sentry
  captureError(appError, {
    tags: {
      type: "react_error_boundary",
      category: appError.category,
    },
    extra: {
      ...appError.context,
      componentStack: errorInfo.componentStack,
    },
    level: "error",
  });

  return appError;
}
