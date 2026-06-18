/**
 * Purpose:    Adapt a urql query/mutation result into the @nself/errors Result<T,AppError>
 *             shape that <AsyncScreen> consumes, plus a 'loading' sentinel while in-flight.
 *             Keeps every ported page on the canonical 7-state data surface (canonical §4)
 *             without each page hand-rolling urql -> Result mapping.
 * Inputs:     fetching (boolean), urql CombinedError | undefined, data (T | undefined),
 *             notFoundWhenNull (optional: treat null/undefined data as not_found).
 * Outputs:    Result<T, AppError> | 'loading'.
 * Constraints:Pure. No side effects. Maps urql network 4xx/5xx + GraphQL errors to the
 *             canonical AppError codes so AsyncScreen renders the right state (offline,
 *             rateLimited, permissionDenied, error, empty).
 * Usage:      const result = toAsyncResult({ fetching, error, data: data?.meetings })
 * SOT:        F-NCHAT-VITE-CALLS-RESULT-01
 */
import { ok, err, type Result, type AppError } from '@nself/errors'
import type { CombinedError } from 'urql'

interface ToAsyncResultArgs<T> {
  fetching: boolean
  error?: CombinedError
  data: T | null | undefined
  /** When true and data is null/undefined (no error), produce a not_found AppError. */
  notFoundWhenNull?: boolean
}

/** Extract an HTTP-ish status from a urql CombinedError (network or GraphQL extension). */
function statusOf(error: CombinedError): number {
  const net = error.networkError as { status?: number; statusCode?: number } | undefined
  if (net?.status) return net.status
  if (net?.statusCode) return net.statusCode
  const ext = error.graphQLErrors?.[0]?.extensions as { code?: string } | undefined
  if (ext?.code === 'rate-limited') return 429
  if (ext?.code === 'access-denied' || ext?.code === 'permission-error') return 403
  if (ext?.code === 'not-found') return 404
  if (ext?.code === 'validation-failed') return 422
  return 500
}

/** Map a urql CombinedError to a canonical AppError. */
export function toAppError(error: CombinedError): AppError {
  // Network unreachable -> surface as internal so AsyncScreen shows the offline/error state.
  if (error.networkError && !error.response) {
    return { code: 'internal', message: error.networkError.message, status: 500 }
  }
  const status = statusOf(error)
  const message = error.graphQLErrors?.[0]?.message ?? error.message
  switch (status) {
    case 401:
      return { code: 'auth_failed', message, status: 401 }
    case 402:
      return { code: 'license_required', message, status: 402 }
    case 403:
      return { code: 'forbidden', message, status: 403 }
    case 404:
      return { code: 'not_found', message, status: 404 }
    case 422:
      return { code: 'validation_error', message, status: 422 }
    case 429:
      return { code: 'rate_limited', message, status: 429 }
    default:
      return { code: 'internal', message, status: 500 }
  }
}

export function toAsyncResult<T>({
  fetching,
  error,
  data,
  notFoundWhenNull,
}: ToAsyncResultArgs<T>): Result<T, AppError> | 'loading' {
  if (fetching && data == null) return 'loading'
  if (error) return err(toAppError(error))
  if (data == null) {
    if (notFoundWhenNull) {
      return err({ code: 'not_found', message: 'Not found', status: 404 })
    }
    // No error, no data, not fetching -> treat as empty payload of T.
    return ok(data as T)
  }
  return ok(data)
}
