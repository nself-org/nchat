/**
 * Purpose:    urql data hooks for the calls surface. Reads a call record (HASURA-direct,
 *             N-2-S2h) and mints a LiveKit join token via the backend Action (BFF N-2-S5).
 *             Replaces the legacy livekit-client + getLiveKitToken('/api/...') flow.
 * Inputs:     callId (uuid).
 * Outputs:    useCall -> { result, reexecute }; useMintCallToken -> [state, mint].
 * Constraints:Server data lives in urql (canonical §6) — no local duplication. Token mint is
 *             a mutation, never executed automatically; the page invokes it on join intent.
 * SOT:        F-NCHAT-VITE-CALLS-HOOK-01
 */
import { useCallback } from 'react'
import { useMutation, useQuery } from 'urql'
import type { Result, AppError } from '@nself/errors'
import { CallByIdQuery, MintCallTokenMutation } from './graphql'
import { toAppError, toAsyncResult } from './result-adapter'
import type { Call } from './types'

export function useCall(callId: string): {
  result: Result<Call, AppError> | 'loading'
  reexecute: () => void
} {
  const [{ data, fetching, error }, reexecute] = useQuery<{ np_calls_by_pk: Call | null }>({
    query: CallByIdQuery,
    variables: { id: callId },
    pause: !callId,
    requestPolicy: 'cache-and-network',
  })

  return {
    result: toAsyncResult<Call>({
      fetching,
      error,
      data: data?.np_calls_by_pk,
      notFoundWhenNull: true,
    }),
    reexecute: () => reexecute({ requestPolicy: 'network-only' }),
  }
}

export interface CallToken {
  token: string
  url: string
}

export function useMintCallToken(callId: string): {
  minting: boolean
  mint: () => Promise<Result<CallToken, AppError>>
} {
  const [{ fetching }, exec] = useMutation<{ mintLiveKitToken: CallToken }>(MintCallTokenMutation)

  const mint = useCallback(async (): Promise<Result<CallToken, AppError>> => {
    const res = await exec({ callId })
    if (res.error) return { _tag: 'Err', error: toAppError(res.error) }
    if (!res.data?.mintLiveKitToken) {
      return {
        _tag: 'Err',
        error: { code: 'internal', message: 'Token mint returned no data', status: 500 },
      }
    }
    return { _tag: 'Ok', value: res.data.mintLiveKitToken }
  }, [exec, callId])

  return { minting: fetching, mint }
}
