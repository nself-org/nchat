/**
 * result.ts — Typed Result<T, E> monad for explicit error handling.
 *
 * Purpose: Eliminate throw-based control flow on async data surfaces.
 *          Every async call returns Ok<T> | Err<E> — callers handle both.
 * Inputs:  Data T or error E.
 * Outputs: Discriminated union with helpers (map, flatMap, unwrap, match).
 * Constraints: Zero runtime deps; works in browser and Node test environments.
 * SPORT: REGISTRY-WEB-SURFACES.md — nchat web: result monad: complete
 */

// =============================================================================
// Core Types
// =============================================================================

export type Ok<T> = {
  readonly ok: true;
  readonly value: T;
  readonly error?: never;
};

export type Err<E = Error> = {
  readonly ok: false;
  readonly error: E;
  readonly value?: never;
};

export type Result<T, E = Error> = Ok<T> | Err<E>;

// =============================================================================
// Constructors
// =============================================================================

export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

export function err<E = Error>(error: E): Err<E> {
  return { ok: false, error };
}

// =============================================================================
// Type Guards
// =============================================================================

export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result.ok === true;
}

export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return result.ok === false;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Map the value of an Ok result, passthrough for Err.
 */
export function mapResult<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U,
): Result<U, E> {
  if (result.ok) return ok(fn(result.value));
  return result as unknown as Err<E>;
}

/**
 * FlatMap — fn returns a new Result; short-circuits on Err.
 */
export function flatMapResult<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>,
): Result<U, E> {
  if (result.ok) return fn(result.value);
  return result as unknown as Err<E>;
}

/**
 * Match — exhaustive handling of Ok / Err branches.
 */
export function matchResult<T, E, R>(
  result: Result<T, E>,
  handlers: {
    ok: (value: T) => R;
    err: (error: E) => R;
  },
): R {
  if (result.ok) return handlers.ok(result.value);
  return handlers.err(result.error);
}

/**
 * Unwrap value or throw the error.
 * Use only at call sites where error is truly unexpected.
 */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (result.ok) return result.value;
  throw result.error;
}

/**
 * Unwrap value or return a fallback default.
 */
export function unwrapOr<T, E>(result: Result<T, E>, fallback: T): T {
  if (result.ok) return result.value;
  return fallback;
}

// =============================================================================
// Async Wrapper
// =============================================================================

/**
 * Wraps an async operation in a Result, catching any thrown errors.
 * The error type defaults to Error; pass a transform to narrow it.
 */
export async function tryAsync<T, E = Error>(
  fn: () => Promise<T>,
  transformError?: (e: unknown) => E,
): Promise<Result<T, E>> {
  try {
    const value = await fn();
    return ok(value);
  } catch (caught) {
    if (transformError) return err(transformError(caught));
    return err(caught instanceof Error ? (caught as unknown as E) : (new Error(String(caught)) as unknown as E));
  }
}

// =============================================================================
// GraphQL Error Helpers
// =============================================================================

export type GraphQLErrorCode =
  | "permission_denied"
  | "unauthenticated"
  | "not_found"
  | "rate_limited"
  | "network_error"
  | "unknown";

export interface AppError {
  code: GraphQLErrorCode;
  message: string;
  retryAfterMs?: number;
}

export function appErr(
  code: GraphQLErrorCode,
  message: string,
  retryAfterMs?: number,
): Err<AppError> {
  return err({ code, message, retryAfterMs });
}

export type AppResult<T> = Result<T, AppError>;
