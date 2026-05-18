/**
 * Error Types and Classes
 *
 * Comprehensive error classification system for the nself-chat application.
 * Provides typed errors with context for better error handling and reporting.
 */

import { ApolloError } from "@apollo/client";
import { GraphQLError } from "graphql";

// ============================================================================
// Error Categories
// ============================================================================

export enum ErrorCategory {
  NETWORK = "network",
  AUTHENTICATION = "authentication",
  AUTHORIZATION = "authorization",
  VALIDATION = "validation",
  NOT_FOUND = "not_found",
  RATE_LIMIT = "rate_limit",
  SERVER = "server",
  CLIENT = "client",
  GRAPHQL = "graphql",
  UPLOAD = "upload",
  OFFLINE = "offline",
  TIMEOUT = "timeout",
  UNKNOWN = "unknown",
}

export enum ErrorSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

// ============================================================================
// Base Error Class
// ============================================================================

export interface ErrorContext {
  // Technical details
  statusCode?: number;
  errorCode?: string;
  path?: string;
  operation?: string;

  // User context
  userId?: string;
  channelId?: string;
  messageId?: string;

  // Additional metadata
  metadata?: Record<string, unknown>;
  stack?: string;
  originalError?: Error;
}

export class AppError extends Error {
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly context: ErrorContext;
  public readonly timestamp: Date;
  public readonly userMessage: string;
  public readonly isRetryable: boolean;
  public readonly shouldReport: boolean;

  constructor(
    message: string,
    category: ErrorCategory,
    {
      severity = ErrorSeverity.MEDIUM,
      userMessage,
      isRetryable = false,
      shouldReport = true,
      context = {},
    }: {
      severity?: ErrorSeverity;
      userMessage?: string;
      isRetryable?: boolean;
      shouldReport?: boolean;
      context?: ErrorContext;
    } = {},
  ) {
    super(message);
    this.name = "AppError";
    this.category = category;
    this.severity = severity;
    this.userMessage = userMessage || this.getDefaultUserMessage();
    this.isRetryable = isRetryable;
    this.shouldReport = shouldReport;
    this.context = context;
    this.timestamp = new Date();

    // Maintain proper stack trace for debugging
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  private getDefaultUserMessage(): string {
    const messages: Record<ErrorCategory, string> = {
      [ErrorCategory.NETWORK]:
        "Network connection error. Please check your internet connection.",
      [ErrorCategory.AUTHENTICATION]:
        "Authentication failed. Please log in again.",
      [ErrorCategory.AUTHORIZATION]:
        "You do not have permission to perform this action.",
      [ErrorCategory.VALIDATION]: "Invalid input. Please check your data.",
      [ErrorCategory.NOT_FOUND]: "The requested resource was not found.",
      [ErrorCategory.RATE_LIMIT]: "Too many requests. Please try again later.",
      [ErrorCategory.SERVER]: "Server error. Please try again later.",
      [ErrorCategory.CLIENT]: "An error occurred. Please try again.",
      [ErrorCategory.GRAPHQL]: "Data query error. Please try again.",
      [ErrorCategory.UPLOAD]: "Upload failed. Please try again.",
      [ErrorCategory.OFFLINE]: "You are offline. This action will be queued.",
      [ErrorCategory.TIMEOUT]: "Request timed out. Please try again.",
      [ErrorCategory.UNKNOWN]: "An unexpected error occurred.",
    };
    return messages[this.category] || "An error occurred.";
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      category: this.category,
      severity: this.severity,
      userMessage: this.userMessage,
      isRetryable: this.isRetryable,
      shouldReport: this.shouldReport,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
    };
  }
}

// ============================================================================
// Specific Error Classes
// ============================================================================

export class NetworkError extends AppError {
  constructor(message: string, context?: ErrorContext) {
    super(message, ErrorCategory.NETWORK, {
      severity: ErrorSeverity.HIGH,
      userMessage:
        "Network connection error. Please check your internet connection and try again.",
      isRetryable: true,
      shouldReport: false,
      context,
    });
    this.name = "NetworkError";
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string, context?: ErrorContext) {
    super(message, ErrorCategory.AUTHENTICATION, {
      severity: ErrorSeverity.CRITICAL,
      userMessage: "Your session has expired. Please log in again.",
      isRetryable: false,
      shouldReport: true,
      context,
    });
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string, context?: ErrorContext) {
    super(message, ErrorCategory.AUTHORIZATION, {
      severity: ErrorSeverity.MEDIUM,
      userMessage: "You do not have permission to perform this action.",
      isRetryable: false,
      shouldReport: false,
      context,
    });
    this.name = "AuthorizationError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: ErrorContext) {
    super(message, ErrorCategory.VALIDATION, {
      severity: ErrorSeverity.LOW,
      userMessage: "Please check your input and try again.",
      isRetryable: false,
      shouldReport: false,
      context,
    });
    this.name = "ValidationError";
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, context?: ErrorContext) {
    super(message, ErrorCategory.NOT_FOUND, {
      severity: ErrorSeverity.LOW,
      userMessage: "The requested item was not found.",
      isRetryable: false,
      shouldReport: false,
      context,
    });
    this.name = "NotFoundError";
  }
}

export class RateLimitError extends AppError {
  public readonly retryAfter?: number;

  constructor(message: string, retryAfter?: number, context?: ErrorContext) {
    super(message, ErrorCategory.RATE_LIMIT, {
      severity: ErrorSeverity.MEDIUM,
      userMessage: retryAfter
        ? `Too many requests. Please try again in ${Math.ceil(retryAfter / 1000)} seconds.`
        : "Too many requests. Please try again later.",
      isRetryable: true,
      shouldReport: false,
      context: { ...context, metadata: { ...context?.metadata, retryAfter } },
    });
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

export class ServerError extends AppError {
  constructor(message: string, statusCode?: number, context?: ErrorContext) {
    super(message, ErrorCategory.SERVER, {
      severity: ErrorSeverity.HIGH,
      userMessage:
        "Server error. Our team has been notified. Please try again later.",
      isRetryable: true,
      shouldReport: true,
      context: { ...context, statusCode },
    });
    this.name = "ServerError";
  }
}

export class ClientError extends AppError {
  constructor(message: string, statusCode?: number, context?: ErrorContext) {
    super(message, ErrorCategory.CLIENT, {
      severity: ErrorSeverity.LOW,
      userMessage: "Invalid request. Please check your input.",
      isRetryable: false,
      shouldReport: false,
      context: { ...context, statusCode },
    });
    this.name = "ClientError";
  }
}

export class GraphQLErrorClass extends AppError {
  public readonly graphQLErrors: readonly GraphQLError[];

  constructor(
    message: string,
    graphQLErrors: readonly GraphQLError[],
    context?: ErrorContext,
  ) {
    super(message, ErrorCategory.GRAPHQL, {
      severity: ErrorSeverity.MEDIUM,
      userMessage: "Data error. Please try again.",
      isRetryable: true,
      shouldReport: true,
      context: {
        ...context,
        metadata: {
          ...context?.metadata,
          graphQLErrors: graphQLErrors.map((e) => ({
            message: e.message,
            path: e.path,
            extensions: e.extensions,
          })),
        },
      },
    });
    this.name = "GraphQLError";
    this.graphQLErrors = graphQLErrors;
  }
}

export class UploadError extends AppError {
  public readonly file?: File;

  constructor(message: string, file?: File, context?: ErrorContext) {
    super(message, ErrorCategory.UPLOAD, {
      severity: ErrorSeverity.MEDIUM,
      userMessage: file
        ? `Failed to upload ${file.name}. Please try again.`
        : "Upload failed. Please try again.",
      isRetryable: true,
      shouldReport: true,
      context: {
        ...context,
        metadata: {
          ...context?.metadata,
          fileName: file?.name,
          fileSize: file?.size,
          fileType: file?.type,
        },
      },
    });
    this.name = "UploadError";
    this.file = file;
  }
}

export class OfflineError extends AppError {
  constructor(message: string, context?: ErrorContext) {
    super(message, ErrorCategory.OFFLINE, {
      severity: ErrorSeverity.MEDIUM,
      userMessage:
        "You are currently offline. This action will be queued and completed when you reconnect.",
      isRetryable: true,
      shouldReport: false,
      context,
    });
    this.name = "OfflineError";
  }
}

export class TimeoutError extends AppError {
  public readonly timeoutMs: number;

  constructor(message: string, timeoutMs: number, context?: ErrorContext) {
    super(message, ErrorCategory.TIMEOUT, {
      severity: ErrorSeverity.MEDIUM,
      userMessage:
        "Request timed out. Please check your connection and try again.",
      isRetryable: true,
      shouldReport: true,
      context: { ...context, metadata: { ...context?.metadata, timeoutMs } },
    });
    this.name = "TimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

// ============================================================================
// Error Detection Utilities
// ============================================================================

export function isNetworkError(error: unknown): boolean {
  if (error instanceof NetworkError) return true;
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("network") ||
      message.includes("fetch") ||
      message.includes("connection") ||
      message.includes("econnrefused") ||
      message.includes("enotfound")
    );
  }
  return false;
}

export function isOfflineError(error: unknown): boolean {
  if (error instanceof OfflineError) return true;
  if (typeof window !== "undefined" && !navigator.onLine) return true;
  return false;
}

export function isAuthError(error: unknown): boolean {
  if (
    error instanceof AuthenticationError ||
    error instanceof AuthorizationError
  ) {
    return true;
  }
  if (error instanceof AppError) {
    return error.context.statusCode === 401 || error.context.statusCode === 403;
  }
  return false;
}

export function isTimeoutError(error: unknown): boolean {
  if (error instanceof TimeoutError) return true;
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return message.includes("timeout") || message.includes("timed out");
  }
  return false;
}

export function isRetryableError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.isRetryable;
  }
  // Default retry logic
  return (
    isNetworkError(error) || isTimeoutError(error) || isOfflineError(error)
  );
}

export function shouldReportError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.shouldReport;
  }
  // Default: report all errors except network/offline
  return !isNetworkError(error) && !isOfflineError(error);
}

// ============================================================================
// Error Parsing from HTTP/GraphQL Responses
// ============================================================================

export function parseHttpError(
  statusCode: number,
  message?: string,
  context?: ErrorContext,
): AppError {
  const errorMessage = message || `HTTP ${statusCode} error`;

  // 4xx Client Errors
  if (statusCode >= 400 && statusCode < 500) {
    switch (statusCode) {
      case 401:
        return new AuthenticationError(errorMessage, context);
      case 403:
        return new AuthorizationError(errorMessage, context);
      case 404:
        return new NotFoundError(errorMessage, context);
      case 422:
        return new ValidationError(errorMessage, context);
      case 429:
        // Try to extract retry-after header
        const retryAfter = context?.metadata?.retryAfter as number | undefined;
        return new RateLimitError(errorMessage, retryAfter, context);
      default:
        return new ClientError(errorMessage, statusCode, context);
    }
  }

  // 5xx Server Errors
  if (statusCode >= 500) {
    return new ServerError(errorMessage, statusCode, context);
  }

  // Unknown status code
  return new AppError(errorMessage, ErrorCategory.UNKNOWN, {
    severity: ErrorSeverity.MEDIUM,
    context: { ...context, statusCode },
  });
}

export function parseGraphQLError(apolloError: ApolloError): AppError {
  const { graphQLErrors, networkError } = apolloError;

  // Network error takes precedence
  if (networkError) {
    if ("statusCode" in networkError) {
      return parseHttpError(
        networkError.statusCode as number,
        networkError.message,
        {
          originalError: networkError,
        },
      );
    }
    return new NetworkError(networkError.message, {
      originalError: networkError,
    });
  }

  // GraphQL errors
  if (graphQLErrors && graphQLErrors.length > 0) {
    const firstError = graphQLErrors[0];
    const extensions = firstError.extensions;

    // Check for specific error codes in extensions
    if (extensions?.code) {
      switch (extensions.code) {
        case "UNAUTHENTICATED":
          return new AuthenticationError(firstError.message, {
            errorCode: extensions.code as string,
          });
        case "FORBIDDEN":
          return new AuthorizationError(firstError.message, {
            errorCode: extensions.code as string,
          });
        case "BAD_USER_INPUT":
          return new ValidationError(firstError.message, {
            errorCode: extensions.code as string,
          });
        case "NOT_FOUND":
          return new NotFoundError(firstError.message, {
            errorCode: extensions.code as string,
          });
      }
    }

    // Convert GraphQLFormattedError to GraphQLError for storage
    // Note: We're storing the formatted errors which have the essential info
    return new GraphQLErrorClass(
      apolloError.message,
      graphQLErrors as unknown as readonly GraphQLError[],
    );
  }

  // Fallback
  return new AppError(apolloError.message, ErrorCategory.GRAPHQL, {
    severity: ErrorSeverity.MEDIUM,
    context: { originalError: apolloError },
  });
}

// ============================================================================
// Generic Error Parser
// ============================================================================

export function parseError(error: unknown): AppError {
  // Already an AppError
  if (error instanceof AppError) {
    return error;
  }

  // Apollo GraphQL error
  if (error instanceof ApolloError) {
    return parseGraphQLError(error);
  }

  // Standard Error
  if (error instanceof Error) {
    // Check for specific error types
    if (isNetworkError(error)) {
      return new NetworkError(error.message, { originalError: error });
    }
    if (isTimeoutError(error)) {
      return new TimeoutError(error.message, 30000, { originalError: error });
    }
    if (isOfflineError(error)) {
      return new OfflineError(error.message, { originalError: error });
    }

    // Generic error
    return new AppError(error.message, ErrorCategory.UNKNOWN, {
      severity: ErrorSeverity.MEDIUM,
      context: { originalError: error },
    });
  }

  // String error
  if (typeof error === "string") {
    return new AppError(error, ErrorCategory.UNKNOWN);
  }

  // Unknown error type
  return new AppError("An unexpected error occurred", ErrorCategory.UNKNOWN, {
    severity: ErrorSeverity.MEDIUM,
    context: { metadata: { rawError: error } },
  });
}
