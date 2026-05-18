/**
 * Error Handling - Exports
 *
 * Central export point for all error handling utilities.
 */

// Error types and classes
export {
  ErrorCategory,
  ErrorSeverity,
  AppError,
  NetworkError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  NotFoundError,
  RateLimitError,
  ServerError,
  ClientError,
  GraphQLErrorClass,
  UploadError,
  OfflineError,
  TimeoutError,
  isNetworkError,
  isOfflineError,
  isAuthError,
  isTimeoutError,
  isRetryableError,
  shouldReportError,
  parseHttpError,
  parseGraphQLError,
  parseError,
} from "./error-types";

export type { ErrorContext } from "./error-types";

// Error handler
export {
  errorHandler,
  handleError,
  handleErrorSilent,
  handleErrorWithRetry,
  handleUploadError,
  handleGraphQLError,
  handleNetworkError,
  handleErrorBoundaryError,
} from "./error-handler";

export type {
  ErrorHandlerOptions,
  ErrorHandlerResult,
  ErrorBoundaryFallbackProps,
} from "./error-handler";

// Retry manager
export {
  RetryManager,
  createRetryManager,
  withRetry,
  withAggressiveRetry,
  withConservativeRetry,
  withRetryNoCircuit,
  Retry,
  OfflineQueue,
  offlineQueue,
} from "./retry-manager";

export type { RetryConfig, QueuedOperation } from "./retry-manager";

export { DEFAULT_RETRY_CONFIG } from "./retry-manager";
