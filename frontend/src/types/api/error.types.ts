/**
 * API Error Types for nself-chat
 *
 * Type definitions for API errors, error handling, and error responses.
 * Provides consistent error typing across the application.
 */

// ============================================================================
// Error Codes
// ============================================================================

/**
 * HTTP-based error codes.
 */
export type HttpErrorCode =
  // 4xx Client Errors
  | "BAD_REQUEST" // 400
  | "UNAUTHORIZED" // 401
  | "FORBIDDEN" // 403
  | "NOT_FOUND" // 404
  | "METHOD_NOT_ALLOWED" // 405
  | "NOT_ACCEPTABLE" // 406
  | "CONFLICT" // 409
  | "GONE" // 410
  | "PAYLOAD_TOO_LARGE" // 413
  | "UNSUPPORTED_MEDIA" // 415
  | "UNPROCESSABLE_ENTITY" // 422
  | "TOO_MANY_REQUESTS" // 429
  // 5xx Server Errors
  | "INTERNAL_ERROR" // 500
  | "NOT_IMPLEMENTED" // 501
  | "BAD_GATEWAY" // 502
  | "SERVICE_UNAVAILABLE" // 503
  | "GATEWAY_TIMEOUT"; // 504

/**
 * Application-specific error codes.
 */
export type AppErrorCode =
  // Authentication errors
  | "AUTH_INVALID_CREDENTIALS"
  | "AUTH_TOKEN_EXPIRED"
  | "AUTH_TOKEN_INVALID"
  | "AUTH_REFRESH_TOKEN_EXPIRED"
  | "AUTH_SESSION_EXPIRED"
  | "AUTH_MFA_REQUIRED"
  | "AUTH_MFA_INVALID"
  | "AUTH_ACCOUNT_LOCKED"
  | "AUTH_ACCOUNT_SUSPENDED"
  | "AUTH_EMAIL_NOT_VERIFIED"
  // Authorization errors
  | "AUTHZ_INSUFFICIENT_PERMISSIONS"
  | "AUTHZ_ROLE_REQUIRED"
  | "AUTHZ_FEATURE_DISABLED"
  | "AUTHZ_SUBSCRIPTION_REQUIRED"
  // Validation errors
  | "VALIDATION_FAILED"
  | "VALIDATION_REQUIRED_FIELD"
  | "VALIDATION_INVALID_FORMAT"
  | "VALIDATION_MIN_LENGTH"
  | "VALIDATION_MAX_LENGTH"
  | "VALIDATION_INVALID_EMAIL"
  | "VALIDATION_INVALID_URL"
  | "VALIDATION_INVALID_DATE"
  | "VALIDATION_OUT_OF_RANGE"
  // Resource errors
  | "RESOURCE_NOT_FOUND"
  | "RESOURCE_ALREADY_EXISTS"
  | "RESOURCE_DELETED"
  | "RESOURCE_ARCHIVED"
  | "RESOURCE_LOCKED"
  // Rate limiting errors
  | "RATE_LIMIT_EXCEEDED"
  | "RATE_LIMIT_GLOBAL"
  | "RATE_LIMIT_ENDPOINT"
  | "RATE_LIMIT_USER"
  // Limit errors
  | "LIMIT_MEMBERS_EXCEEDED"
  | "LIMIT_CHANNELS_EXCEEDED"
  | "LIMIT_STORAGE_EXCEEDED"
  | "LIMIT_FILE_SIZE_EXCEEDED"
  | "LIMIT_MESSAGE_LENGTH_EXCEEDED"
  // File/upload errors
  | "FILE_TYPE_NOT_ALLOWED"
  | "FILE_TOO_LARGE"
  | "FILE_UPLOAD_FAILED"
  | "FILE_PROCESSING_FAILED"
  // External service errors
  | "EXTERNAL_SERVICE_ERROR"
  | "EXTERNAL_SERVICE_TIMEOUT"
  | "EXTERNAL_SERVICE_UNAVAILABLE"
  // Database errors
  | "DATABASE_ERROR"
  | "DATABASE_CONSTRAINT_VIOLATION"
  | "DATABASE_DEADLOCK"
  // Network errors
  | "NETWORK_ERROR"
  | "NETWORK_TIMEOUT"
  | "NETWORK_OFFLINE"
  // Unknown/generic
  | "UNKNOWN_ERROR";

/**
 * All error codes.
 */
export type ErrorCode = HttpErrorCode | AppErrorCode;

// ============================================================================
// Error Response Types
// ============================================================================

/**
 * Standard API error response.
 */
export interface ApiErrorResponse {
  /** Error indicator */
  success: false;
  /** Error details */
  error: ApiError;
}

/**
 * API error details.
 */
export interface ApiError {
  /** Error code */
  code: ErrorCode;
  /** HTTP status code */
  status: number;
  /** Human-readable error message */
  message: string;
  /** Detailed error description */
  details?: string;
  /** Field-specific validation errors */
  fieldErrors?: FieldError[];
  /** Request ID for tracing */
  requestId?: string;
  /** Timestamp */
  timestamp: string;
  /** Retry information */
  retry?: RetryInfo;
  /** Help URL */
  helpUrl?: string;
  /** Stack trace (development only) */
  stack?: string;
}

/**
 * Field-specific validation error.
 */
export interface FieldError {
  /** Field name/path */
  field: string;
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** Expected value/format */
  expected?: string;
  /** Received value (sanitized) */
  received?: unknown;
  /** Nested errors (for objects) */
  children?: FieldError[];
}

/**
 * Retry information for retryable errors.
 */
export interface RetryInfo {
  /** Whether the request can be retried */
  retryable: boolean;
  /** Retry after N seconds */
  retryAfter?: number;
  /** Maximum retry attempts */
  maxRetries?: number;
}

// ============================================================================
// Error Mappings
// ============================================================================

/**
 * HTTP status to error code mapping.
 */
export const HTTP_STATUS_TO_ERROR: Record<number, HttpErrorCode> = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  405: "METHOD_NOT_ALLOWED",
  406: "NOT_ACCEPTABLE",
  409: "CONFLICT",
  410: "GONE",
  413: "PAYLOAD_TOO_LARGE",
  415: "UNSUPPORTED_MEDIA",
  422: "UNPROCESSABLE_ENTITY",
  429: "TOO_MANY_REQUESTS",
  500: "INTERNAL_ERROR",
  501: "NOT_IMPLEMENTED",
  502: "BAD_GATEWAY",
  503: "SERVICE_UNAVAILABLE",
  504: "GATEWAY_TIMEOUT",
} as const;

/**
 * Error code to HTTP status mapping.
 */
export const ERROR_TO_HTTP_STATUS: Record<HttpErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  NOT_ACCEPTABLE: 406,
  CONFLICT: 409,
  GONE: 410,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA: 415,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

/**
 * Retryable error codes.
 */
export const RETRYABLE_ERRORS: ErrorCode[] = [
  "TOO_MANY_REQUESTS",
  "SERVICE_UNAVAILABLE",
  "GATEWAY_TIMEOUT",
  "BAD_GATEWAY",
  "RATE_LIMIT_EXCEEDED",
  "EXTERNAL_SERVICE_ERROR",
  "EXTERNAL_SERVICE_TIMEOUT",
  "EXTERNAL_SERVICE_UNAVAILABLE",
  "DATABASE_DEADLOCK",
  "NETWORK_ERROR",
  "NETWORK_TIMEOUT",
] as const;

/**
 * User-friendly error messages.
 */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  // HTTP errors
  BAD_REQUEST:
    "The request was invalid. Please check your input and try again.",
  UNAUTHORIZED: "You need to be logged in to perform this action.",
  FORBIDDEN: "You do not have permission to perform this action.",
  NOT_FOUND: "The requested resource was not found.",
  METHOD_NOT_ALLOWED: "This action is not supported.",
  NOT_ACCEPTABLE: "The requested format is not supported.",
  CONFLICT: "This action conflicts with existing data.",
  GONE: "The requested resource is no longer available.",
  PAYLOAD_TOO_LARGE: "The request data is too large.",
  UNSUPPORTED_MEDIA: "The file type is not supported.",
  UNPROCESSABLE_ENTITY: "The request data could not be processed.",
  TOO_MANY_REQUESTS: "Too many requests. Please wait a moment and try again.",
  INTERNAL_ERROR: "An unexpected error occurred. Please try again later.",
  NOT_IMPLEMENTED: "This feature is not yet available.",
  BAD_GATEWAY: "Unable to connect to the server. Please try again.",
  SERVICE_UNAVAILABLE:
    "The service is temporarily unavailable. Please try again later.",
  GATEWAY_TIMEOUT: "The request timed out. Please try again.",
  // Auth errors
  AUTH_INVALID_CREDENTIALS: "Invalid email or password.",
  AUTH_TOKEN_EXPIRED: "Your session has expired. Please log in again.",
  AUTH_TOKEN_INVALID: "Invalid authentication token.",
  AUTH_REFRESH_TOKEN_EXPIRED: "Your session has expired. Please log in again.",
  AUTH_SESSION_EXPIRED: "Your session has expired. Please log in again.",
  AUTH_MFA_REQUIRED: "Two-factor authentication is required.",
  AUTH_MFA_INVALID: "Invalid verification code.",
  AUTH_ACCOUNT_LOCKED: "Your account has been locked. Please contact support.",
  AUTH_ACCOUNT_SUSPENDED: "Your account has been suspended.",
  AUTH_EMAIL_NOT_VERIFIED: "Please verify your email address.",
  // Authz errors
  AUTHZ_INSUFFICIENT_PERMISSIONS:
    "You do not have permission to perform this action.",
  AUTHZ_ROLE_REQUIRED: "This action requires a higher role level.",
  AUTHZ_FEATURE_DISABLED: "This feature is not available.",
  AUTHZ_SUBSCRIPTION_REQUIRED: "This feature requires a paid subscription.",
  // Validation errors
  VALIDATION_FAILED: "Please check your input and try again.",
  VALIDATION_REQUIRED_FIELD: "This field is required.",
  VALIDATION_INVALID_FORMAT: "The format is invalid.",
  VALIDATION_MIN_LENGTH: "The value is too short.",
  VALIDATION_MAX_LENGTH: "The value is too long.",
  VALIDATION_INVALID_EMAIL: "Please enter a valid email address.",
  VALIDATION_INVALID_URL: "Please enter a valid URL.",
  VALIDATION_INVALID_DATE: "Please enter a valid date.",
  VALIDATION_OUT_OF_RANGE: "The value is out of the allowed range.",
  // Resource errors
  RESOURCE_NOT_FOUND: "The requested item was not found.",
  RESOURCE_ALREADY_EXISTS: "An item with this name already exists.",
  RESOURCE_DELETED: "This item has been deleted.",
  RESOURCE_ARCHIVED: "This item has been archived.",
  RESOURCE_LOCKED: "This item is locked and cannot be modified.",
  // Rate limit errors
  RATE_LIMIT_EXCEEDED: "Too many requests. Please wait and try again.",
  RATE_LIMIT_GLOBAL: "Global rate limit exceeded. Please wait.",
  RATE_LIMIT_ENDPOINT: "Rate limit exceeded for this action.",
  RATE_LIMIT_USER: "You have exceeded your request limit.",
  // Limit errors
  LIMIT_MEMBERS_EXCEEDED:
    "Member limit reached. Upgrade your plan to add more.",
  LIMIT_CHANNELS_EXCEEDED:
    "Channel limit reached. Upgrade your plan to create more.",
  LIMIT_STORAGE_EXCEEDED:
    "Storage limit reached. Upgrade your plan for more space.",
  LIMIT_FILE_SIZE_EXCEEDED: "File size exceeds the maximum allowed.",
  LIMIT_MESSAGE_LENGTH_EXCEEDED: "Message is too long.",
  // File errors
  FILE_TYPE_NOT_ALLOWED: "This file type is not allowed.",
  FILE_TOO_LARGE: "The file is too large to upload.",
  FILE_UPLOAD_FAILED: "Failed to upload the file. Please try again.",
  FILE_PROCESSING_FAILED: "Failed to process the file.",
  // External errors
  EXTERNAL_SERVICE_ERROR: "An external service error occurred.",
  EXTERNAL_SERVICE_TIMEOUT: "External service request timed out.",
  EXTERNAL_SERVICE_UNAVAILABLE: "External service is unavailable.",
  // Database errors
  DATABASE_ERROR: "A database error occurred.",
  DATABASE_CONSTRAINT_VIOLATION: "The operation violates data constraints.",
  DATABASE_DEADLOCK: "Database conflict. Please try again.",
  // Network errors
  NETWORK_ERROR: "Network error. Please check your connection.",
  NETWORK_TIMEOUT: "Request timed out. Please try again.",
  NETWORK_OFFLINE: "You appear to be offline.",
  // Unknown
  UNKNOWN_ERROR: "An unexpected error occurred.",
} as const;

// ============================================================================
// Error Classes
// ============================================================================

/**
 * Base application error class.
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly status: number;
  public readonly details?: string;
  public readonly fieldErrors?: FieldError[];
  public readonly retry?: RetryInfo;

  constructor(
    code: ErrorCode,
    message?: string,
    options?: {
      status?: number;
      details?: string;
      fieldErrors?: FieldError[];
      retry?: RetryInfo;
    },
  ) {
    super(message || ERROR_MESSAGES[code] || "An error occurred");
    this.name = "AppError";
    this.code = code;
    this.status =
      options?.status || ERROR_TO_HTTP_STATUS[code as HttpErrorCode] || 500;
    this.details = options?.details;
    this.fieldErrors = options?.fieldErrors;
    this.retry = options?.retry;

    // Maintains proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  /**
   * Convert to API error response.
   */
  toResponse(requestId?: string): ApiErrorResponse {
    return {
      success: false,
      error: {
        code: this.code,
        status: this.status,
        message: this.message,
        details: this.details,
        fieldErrors: this.fieldErrors,
        requestId,
        timestamp: new Date().toISOString(),
        retry: this.retry,
      },
    };
  }
}

/**
 * Validation error class.
 */
export class ValidationError extends AppError {
  constructor(fieldErrors: FieldError[], message?: string) {
    super("VALIDATION_FAILED", message || "Validation failed", {
      status: 422,
      fieldErrors,
    });
    this.name = "ValidationError";
  }
}

/**
 * Authentication error class.
 */
export class AuthenticationError extends AppError {
  constructor(
    code: AppErrorCode = "AUTH_INVALID_CREDENTIALS",
    message?: string,
  ) {
    super(code, message, { status: 401 });
    this.name = "AuthenticationError";
  }
}

/**
 * Authorization error class.
 */
export class AuthorizationError extends AppError {
  constructor(
    code: AppErrorCode = "AUTHZ_INSUFFICIENT_PERMISSIONS",
    message?: string,
  ) {
    super(code, message, { status: 403 });
    this.name = "AuthorizationError";
  }
}

/**
 * Not found error class.
 */
export class NotFoundError extends AppError {
  constructor(resource?: string, message?: string) {
    super(
      "RESOURCE_NOT_FOUND",
      message || (resource ? `${resource} not found` : "Resource not found"),
      { status: 404 },
    );
    this.name = "NotFoundError";
  }
}

/**
 * Rate limit error class.
 */
export class RateLimitError extends AppError {
  constructor(retryAfter?: number, message?: string) {
    super("RATE_LIMIT_EXCEEDED", message, {
      status: 429,
      retry: {
        retryable: true,
        retryAfter,
      },
    });
    this.name = "RateLimitError";
  }
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if error is an API error response.
 */
export function isApiErrorResponse(error: unknown): error is ApiErrorResponse {
  return (
    typeof error === "object" &&
    error !== null &&
    "success" in error &&
    (error as ApiErrorResponse).success === false &&
    "error" in error
  );
}

/**
 * Check if error is an AppError instance.
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Check if error code is retryable.
 */
export function isRetryableError(code: ErrorCode): boolean {
  return RETRYABLE_ERRORS.includes(code);
}

/**
 * Check if error is a validation error.
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

/**
 * Check if error is an authentication error.
 */
export function isAuthError(error: unknown): boolean {
  if (isAppError(error)) {
    return error.code.startsWith("AUTH_");
  }
  return false;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get user-friendly error message.
 */
export function getErrorMessage(code: ErrorCode): string {
  return ERROR_MESSAGES[code] || ERROR_MESSAGES.UNKNOWN_ERROR;
}

/**
 * Create API error from HTTP response.
 */
export function createApiError(
  status: number,
  message?: string,
  details?: string,
): ApiError {
  const code = HTTP_STATUS_TO_ERROR[status] || "UNKNOWN_ERROR";
  return {
    code,
    status,
    message: message || ERROR_MESSAGES[code],
    details,
    timestamp: new Date().toISOString(),
    retry: isRetryableError(code)
      ? { retryable: true, retryAfter: status === 429 ? 60 : undefined }
      : undefined,
  };
}

/**
 * Extract field errors from API error.
 */
export function extractFieldErrors(error: ApiError): Map<string, string> {
  const errors = new Map<string, string>();

  if (error.fieldErrors) {
    for (const fieldError of error.fieldErrors) {
      errors.set(fieldError.field, fieldError.message);
    }
  }

  return errors;
}
