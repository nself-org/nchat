/**
 * Purpose:    Bridge urql's useQuery output into the Result<T,AppError> | 'loading' shape that
 *             @nself/ui AsyncScreen consumes (canonical §4). Lets every admin page wire a real
 *             Hasura query and degrade gracefully (loading/error/empty) when the backend table
 *             or permission is not yet live — without stubbing away the feature.
 * Inputs:     a urql useQuery result tuple's first element { data, fetching, error }.
 * Outputs:    { result, reexecute } where result is 'loading' | Ok<T> | Err<AppError>.
 * Constraints:Maps urql CombinedError → AppError 'internal' (or 'forbidden'/'rate_limited' when
 *             the response carries those signals). Never throws.
 * SOT:        F-NCHAT-VITE-ADMIN-USE-DATA-01
 */
import { ok, err, type Result, type AppError } from '@nself/errors'
import type { CombinedError } from 'urql'

interface UrqlState<T> {
  data?: T
  fetching: boolean
  error?: CombinedError
}

/** Map a urql CombinedError to a typed AppError (status required by @nself/errors). */
function toAppError(e: CombinedError): AppError {
  const status = (e.response as { status?: number } | undefined)?.status
  const msg = e.graphQLErrors[0]?.message ?? e.networkError?.message ?? e.message
  if (status === 429) return { code: 'rate_limited', message: msg, status: 429 }
  if (status === 401) return { code: 'auth_failed', message: msg, status: 401 }
  if (status === 403 || /permission|denied|not allowed/i.test(msg)) {
    return { code: 'forbidden', message: msg, status: 403 }
  }
  return { code: 'internal', message: msg, status: 500 }
}

/** Convert a urql query state into AsyncScreen's Result | 'loading'. */
export function asResult<T>(state: UrqlState<T>): Result<T, AppError> | 'loading' {
  if (state.fetching && state.data === undefined) return 'loading'
  if (state.error) return err(toAppError(state.error))
  if (state.data === undefined) return 'loading'
  return ok(state.data)
}
