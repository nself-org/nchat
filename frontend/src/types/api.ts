/**
 * API Types for nself-chat
 *
 * Type definitions for API responses, errors, pagination, and GraphQL operations.
 * Provides consistent typing for all API interactions.
 */

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Base API response wrapper.
 */
export interface APIResponse<T = unknown> {
  /** Whether the request was successful */
  success: boolean;
  /** Response data */
  data?: T;
  /** Error information (if failed) */
  error?: APIError;
  /** Response metadata */
  meta?: APIResponseMeta;
}

/**
 * API response metadata.
 */
export interface APIResponseMeta {
  /** Request ID for tracing */
  requestId: string;
  /** Server timestamp */
  timestamp: Date;
  /** Response time in milliseconds */
  responseTime?: number;
  /** API version */
  apiVersion?: string;
  /** Deprecation warning */
  deprecationWarning?: string;
}

/**
 * Successful API response.
 */
export interface APISuccessResponse<T> extends APIResponse<T> {
  success: true;
  data: T;
  error?: never;
}

/**
 * Failed API response.
 */
export interface APIErrorResponse extends APIResponse<never> {
  success: false;
  data?: never;
  error: APIError;
}

// ============================================================================
// API Error Types
// ============================================================================

/**
 * API error codes.
 */
export type APIErrorCode =
  // Client errors (4xx)
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "METHOD_NOT_ALLOWED"
  | "CONFLICT"
  | "GONE"
  | "UNPROCESSABLE_ENTITY"
  | "TOO_MANY_REQUESTS"
  // Server errors (5xx)
  | "INTERNAL_ERROR"
  | "NOT_IMPLEMENTED"
  | "SERVICE_UNAVAILABLE"
  | "GATEWAY_TIMEOUT"
  // Custom errors
  | "VALIDATION_ERROR"
  | "AUTHENTICATION_ERROR"
  | "AUTHORIZATION_ERROR"
  | "RATE_LIMIT_ERROR"
  | "RESOURCE_EXHAUSTED"
  | "INVALID_INPUT"
  | "DUPLICATE_ENTRY"
  | "DEPENDENCY_ERROR"
  | "NETWORK_ERROR"
  | "TIMEOUT_ERROR"
  | "UNKNOWN_ERROR";

/**
 * API error structure.
 */
export interface APIError {
  /** Error code */
  code: APIErrorCode;
  /** HTTP status code */
  status: number;
  /** Human-readable error message */
  message: string;
  /** Detailed error description */
  details?: string;
  /** Field-specific validation errors */
  fieldErrors?: APIFieldError[];
  /** Error stack trace (dev only) */
  stack?: string;
  /** Correlation ID for debugging */
  correlationId?: string;
  /** Retry information */
  retry?: {
    retryable: boolean;
    retryAfter?: number; // seconds
  };
}

/**
 * Field-specific validation error.
 */
export interface APIFieldError {
  /** Field name/path */
  field: string;
  /** Error message */
  message: string;
  /** Error code */
  code?: string;
  /** Invalid value (sanitized) */
  value?: unknown;
}

/**
 * HTTP status code to error code mapping.
 */
export const HTTPStatusToErrorCode: Record<number, APIErrorCode> = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  405: "METHOD_NOT_ALLOWED",
  409: "CONFLICT",
  410: "GONE",
  422: "UNPROCESSABLE_ENTITY",
  429: "TOO_MANY_REQUESTS",
  500: "INTERNAL_ERROR",
  501: "NOT_IMPLEMENTED",
  503: "SERVICE_UNAVAILABLE",
  504: "GATEWAY_TIMEOUT",
};

// ============================================================================
// Pagination Types
// ============================================================================

/**
 * Pagination input parameters.
 */
export interface PaginationInput {
  /** Page number (1-based) */
  page?: number;
  /** Items per page */
  perPage?: number;
  /** Cursor for cursor-based pagination */
  cursor?: string;
  /** Cursor direction */
  cursorDirection?: "forward" | "backward";
}

/**
 * Pagination metadata in response.
 */
export interface PaginationMeta {
  /** Current page number */
  page: number;
  /** Items per page */
  perPage: number;
  /** Total items count */
  totalCount: number;
  /** Total pages count */
  totalPages: number;
  /** Has next page */
  hasNextPage: boolean;
  /** Has previous page */
  hasPreviousPage: boolean;
  /** Next page cursor */
  nextCursor?: string;
  /** Previous page cursor */
  previousCursor?: string;
}

/**
 * Paginated response wrapper.
 */
export interface PaginatedResponse<T> {
  /** Data items */
  items: T[];
  /** Pagination metadata */
  pagination: PaginationMeta;
}

/**
 * Cursor-based pagination info.
 */
export interface CursorPaginationInfo {
  /** Start cursor */
  startCursor?: string;
  /** End cursor */
  endCursor?: string;
  /** Has next page */
  hasNextPage: boolean;
  /** Has previous page */
  hasPreviousPage: boolean;
}

/**
 * Connection-style response (Relay pattern).
 */
export interface Connection<T> {
  /** Edges containing nodes */
  edges: Edge<T>[];
  /** Pagination info */
  pageInfo: CursorPaginationInfo;
  /** Total count */
  totalCount?: number;
}

/**
 * Edge in a connection.
 */
export interface Edge<T> {
  /** The node */
  node: T;
  /** Cursor for this node */
  cursor: string;
}

// ============================================================================
// Sort and Filter Types
// ============================================================================

/**
 * Sort input.
 */
export interface SortInput {
  /** Field to sort by */
  field: string;
  /** Sort direction */
  direction: "ASC" | "DESC";
}

/**
 * Filter operator types.
 */
export type FilterOperator =
  | "eq"
  | "ne"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "in"
  | "nin"
  | "contains"
  | "startsWith"
  | "endsWith"
  | "isNull"
  | "isNotNull";

/**
 * Filter condition.
 */
export interface FilterCondition {
  /** Field name */
  field: string;
  /** Operator */
  operator: FilterOperator;
  /** Value to compare */
  value: unknown;
}

/**
 * Filter group (AND/OR).
 */
export interface FilterGroup {
  /** Logic operator */
  logic: "AND" | "OR";
  /** Conditions */
  conditions: (FilterCondition | FilterGroup)[];
}

// ============================================================================
// GraphQL Types
// ============================================================================

/**
 * GraphQL operation types.
 */
export type GraphQLOperationType = "query" | "mutation" | "subscription";

/**
 * GraphQL request.
 */
export interface GraphQLRequest {
  /** Operation name */
  operationName?: string;
  /** Query/mutation string */
  query: string;
  /** Variables */
  variables?: Record<string, unknown>;
}

/**
 * GraphQL response.
 */
export interface GraphQLResponse<T = unknown> {
  /** Response data */
  data?: T;
  /** GraphQL errors */
  errors?: GraphQLError[];
  /** Extensions */
  extensions?: Record<string, unknown>;
}

/**
 * GraphQL error.
 */
export interface GraphQLError {
  /** Error message */
  message: string;
  /** Error locations in query */
  locations?: GraphQLErrorLocation[];
  /** Path to error */
  path?: (string | number)[];
  /** Error extensions */
  extensions?: {
    code?: string;
    exception?: {
      stacktrace?: string[];
    };
    [key: string]: unknown;
  };
}

/**
 * GraphQL error location.
 */
export interface GraphQLErrorLocation {
  /** Line number */
  line: number;
  /** Column number */
  column: number;
}

/**
 * Hasura-specific error extensions.
 */
export interface HasuraErrorExtensions {
  /** Hasura error code */
  code: string;
  /** Path to the field */
  path: string;
  /** Internal error info */
  internal?: {
    error: {
      message: string;
      status_code: number;
    };
  };
}

/**
 * GraphQL subscription options.
 */
export interface GraphQLSubscriptionOptions {
  /** Reconnect on error */
  reconnect?: boolean;
  /** Reconnect attempts */
  reconnectAttempts?: number;
  /** Reconnect interval (ms) */
  reconnectInterval?: number;
  /** Connection timeout (ms) */
  connectionTimeout?: number;
  /** Lazy connection (connect on first subscription) */
  lazy?: boolean;
}

// ============================================================================
// Request/Response Utility Types
// ============================================================================

/**
 * Request headers.
 */
export interface RequestHeaders {
  /** Authorization header */
  Authorization?: string;
  /** Content type */
  "Content-Type"?: string;
  /** Accept header */
  Accept?: string;
  /** Custom headers */
  [key: string]: string | undefined;
}

/**
 * Request options.
 */
export interface RequestOptions {
  /** HTTP method */
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Request headers */
  headers?: RequestHeaders;
  /** Request body */
  body?: unknown;
  /** Request timeout in ms */
  timeout?: number;
  /** Abort signal */
  signal?: AbortSignal;
  /** Cache mode */
  cache?: RequestCache;
  /** Credentials mode */
  credentials?: RequestCredentials;
  /** Retry options */
  retry?: RetryOptions;
}

/**
 * Retry options.
 */
export interface RetryOptions {
  /** Maximum retry attempts */
  maxAttempts: number;
  /** Initial delay in ms */
  initialDelay: number;
  /** Maximum delay in ms */
  maxDelay: number;
  /** Backoff multiplier */
  backoffMultiplier: number;
  /** Status codes to retry on */
  retryOnStatus?: number[];
  /** Custom retry condition */
  retryCondition?: (error: APIError) => boolean;
}

/**
 * Default retry options.
 */
export const DefaultRetryOptions: RetryOptions = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryOnStatus: [408, 429, 500, 502, 503, 504],
};

// ============================================================================
// Rate Limiting Types
// ============================================================================

/**
 * Rate limit information.
 */
export interface RateLimitInfo {
  /** Maximum requests allowed */
  limit: number;
  /** Remaining requests */
  remaining: number;
  /** Reset timestamp */
  reset: Date;
  /** Time until reset in seconds */
  retryAfter?: number;
}

/**
 * Rate limit headers.
 */
export const RateLimitHeaders = {
  LIMIT: "X-RateLimit-Limit",
  REMAINING: "X-RateLimit-Remaining",
  RESET: "X-RateLimit-Reset",
  RETRY_AFTER: "Retry-After",
} as const;

// ============================================================================
// API Client Types
// ============================================================================

/**
 * API client configuration.
 */
export interface APIClientConfig {
  /** Base URL */
  baseUrl: string;
  /** Default headers */
  headers?: RequestHeaders;
  /** Default timeout in ms */
  timeout?: number;
  /** Retry options */
  retry?: RetryOptions;
  /** Request interceptor */
  requestInterceptor?: (
    config: RequestOptions,
  ) => RequestOptions | Promise<RequestOptions>;
  /** Response interceptor */
  responseInterceptor?: <T>(
    response: APIResponse<T>,
  ) => APIResponse<T> | Promise<APIResponse<T>>;
  /** Error interceptor */
  errorInterceptor?: (error: APIError) => APIError | Promise<APIError>;
}

/**
 * API endpoint definition.
 */
export interface APIEndpoint<TInput = unknown, TOutput = unknown> {
  /** HTTP method */
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** URL path (can include params like :id) */
  path: string;
  /** Input type marker */
  _input?: TInput;
  /** Output type marker */
  _output?: TOutput;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Make all properties in T optional recursively.
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Extract the data type from an API response.
 */
export type ExtractAPIData<T> = T extends APIResponse<infer U> ? U : never;

/**
 * Extract the item type from a paginated response.
 */
export type ExtractPaginatedItem<T> =
  T extends PaginatedResponse<infer U> ? U : never;

/**
 * Type guard for successful API response.
 */
export function isAPISuccess<T>(
  response: APIResponse<T>,
): response is APISuccessResponse<T> {
  return response.success === true;
}

/**
 * Type guard for error API response.
 */
export function isAPIError(
  response: APIResponse,
): response is APIErrorResponse {
  return response.success === false;
}

/**
 * Create an API error from an HTTP response.
 */
export function createAPIError(
  status: number,
  message: string,
  details?: string,
): APIError {
  return {
    code: HTTPStatusToErrorCode[status] || "UNKNOWN_ERROR",
    status,
    message,
    details,
    retry: {
      retryable: [408, 429, 500, 502, 503, 504].includes(status),
      retryAfter: status === 429 ? 60 : undefined,
    },
  };
}

/**
 * Build pagination params for URL.
 */
export function buildPaginationParams(
  pagination: PaginationInput,
): URLSearchParams {
  const params = new URLSearchParams();
  if (pagination.page) params.set("page", String(pagination.page));
  if (pagination.perPage) params.set("perPage", String(pagination.perPage));
  if (pagination.cursor) params.set("cursor", pagination.cursor);
  if (pagination.cursorDirection)
    params.set("cursorDirection", pagination.cursorDirection);
  return params;
}
