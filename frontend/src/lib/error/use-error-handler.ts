"use client";

import { useCallback, useState } from "react";
import { errorReporter, ErrorContext } from "./error-reporter";
import { isDevelopment } from "@/lib/environment";

import { logger } from "@/lib/logger";

interface UseErrorHandlerOptions {
  /**
   * Show toast notification on error
   */
  showToast?: boolean;
  /**
   * Custom toast function
   */
  onToast?: (message: string, type: "error" | "warning" | "info") => void;
  /**
   * Report errors to backend
   */
  reportErrors?: boolean;
  /**
   * Default error message when none is provided
   */
  defaultMessage?: string;
  /**
   * Log errors to console
   */
  logToConsole?: boolean;
  /**
   * Context to include with all errors
   */
  context?: ErrorContext;
}

interface UseErrorHandlerReturn {
  /**
   * Current error (if any)
   */
  error: Error | null;
  /**
   * Whether an error has occurred
   */
  hasError: boolean;
  /**
   * Handle an error
   */
  handleError: (error: Error | unknown, context?: ErrorContext) => void;
  /**
   * Clear the current error
   */
  clearError: () => void;
  /**
   * Wrap an async function with error handling
   */
  wrapAsync: <T>(
    fn: () => Promise<T>,
    context?: ErrorContext,
  ) => Promise<T | null>;
  /**
   * Execute a function safely, catching any errors
   */
  trySafe: <T>(fn: () => T, fallback?: T) => T | undefined;
  /**
   * Set error manually
   */
  setError: (error: Error | null) => void;
}

/**
 * Hook for handling errors in components.
 * Provides error state, logging, reporting, and toast notifications.
 */
export function useErrorHandler(
  options: UseErrorHandlerOptions = {},
): UseErrorHandlerReturn {
  const {
    showToast = true,
    onToast,
    reportErrors = true,
    defaultMessage = "An unexpected error occurred",
    logToConsole = isDevelopment(),
    context: defaultContext,
  } = options;

  const [error, setError] = useState<Error | null>(null);

  const showToastNotification = useCallback(
    (message: string, type: "error" | "warning" | "info") => {
      if (showToast && onToast) {
        onToast(message, type);
      }
    },
    [showToast, onToast],
  );

  const handleError = useCallback(
    (errorOrUnknown: Error | unknown, context?: ErrorContext) => {
      // Convert unknown errors to Error objects
      const error =
        errorOrUnknown instanceof Error
          ? errorOrUnknown
          : new Error(String(errorOrUnknown));

      // Set error state
      setError(error);

      // Log to console
      if (logToConsole) {
        logger.error("Error handled:", error);
        if (context) {
          logger.error("Context:", context);
        }
      }

      // Report to backend
      if (reportErrors) {
        errorReporter.reportError(error, {
          ...defaultContext,
          ...context,
        });
      }

      // Show toast notification (unless silent)
      if (!context?.silent) {
        const message = error.message || defaultMessage;
        showToastNotification(message, "error");
      }
    },
    [
      logToConsole,
      reportErrors,
      defaultContext,
      defaultMessage,
      showToastNotification,
    ],
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const wrapAsync = useCallback(
    async <T>(
      fn: () => Promise<T>,
      context?: ErrorContext,
    ): Promise<T | null> => {
      try {
        return await fn();
      } catch (err) {
        handleError(err, context);
        return null;
      }
    },
    [handleError],
  );

  const trySafe = useCallback(
    <T>(fn: () => T, fallback?: T): T | undefined => {
      try {
        return fn();
      } catch (err) {
        handleError(err, { silent: true });
        return fallback;
      }
    },
    [handleError],
  );

  return {
    error,
    hasError: error !== null,
    handleError,
    clearError,
    wrapAsync,
    trySafe,
    setError,
  };
}

/**
 * Create a wrapped version of an async function with error handling
 */
export function createSafeAsync<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  onError?: (error: Error) => void,
): (...args: TArgs) => Promise<TReturn | null> {
  return async (...args: TArgs): Promise<TReturn | null> => {
    try {
      return await fn(...args);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));

      if (isDevelopment()) {
        logger.error("Safe async error:", error);
      }

      onError?.(error);
      errorReporter.reportError(error);

      return null;
    }
  };
}

/**
 * Execute an async function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    delay?: number;
    backoff?: boolean;
    onRetry?: (attempt: number, error: Error) => void;
  } = {},
): Promise<T> {
  const { maxRetries = 3, delay = 1000, backoff = true, onRetry } = options;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt < maxRetries) {
        onRetry?.(attempt, lastError);

        const waitTime = backoff ? delay * Math.pow(2, attempt - 1) : delay;
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
  }

  throw lastError;
}

/**
 * Create a debounced error handler that only reports after a delay
 */
export function createDebouncedErrorHandler(
  handler: (error: Error, context?: ErrorContext) => void,
  delay: number = 1000,
): (error: Error, context?: ErrorContext) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  let pendingError: Error | null = null;
  let pendingContext: ErrorContext | undefined;

  return (error: Error, context?: ErrorContext) => {
    pendingError = error;
    pendingContext = context;

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      if (pendingError) {
        handler(pendingError, pendingContext);
      }
      timeoutId = null;
      pendingError = null;
      pendingContext = undefined;
    }, delay);
  };
}

export default useErrorHandler;
