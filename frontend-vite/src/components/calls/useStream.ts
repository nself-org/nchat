/**
 * Purpose:    urql data hooks for the streams surface. Reads stream metadata (HASURA-direct),
 *             subscribes to live chat + viewer-count via Hasura subscriptions (replacing the
 *             legacy Socket.io stream:chat / stream:viewerCount events), and calls the stream
 *             chat/reaction/follow Actions (N-2-S3p — backend pending).
 * Inputs:     streamId (uuid).
 * Outputs:    useStream, useStreamChat, useStreamViewerCount, useStreamActions.
 * Constraints:Subscriptions are the canonical real-time transport (canonical §2) — no socket
 *             client. Mutations return Result<T,AppError>. Optimistic UI lives in the page.
 * SOT:        F-NCHAT-VITE-STREAM-HOOK-01
 */
import { useCallback } from 'react'
import { useMutation, useQuery, useSubscription } from 'urql'
import type { Result, AppError } from '@nself/errors'
import {
  FollowStreamerMutation,
  ReactToStreamMutation,
  SendStreamChatMutation,
  StreamByIdQuery,
  StreamChatSubscription,
  StreamViewerCountSubscription,
} from './graphql'
import { toAppError, toAsyncResult } from './result-adapter'
import type { Stream, StreamChatMessage, StreamReactionType } from './types'

export function useStream(streamId: string): {
  result: Result<Stream, AppError> | 'loading'
  reexecute: () => void
} {
  const [{ data, fetching, error }, reexecute] = useQuery<{ np_streams_by_pk: Stream | null }>({
    query: StreamByIdQuery,
    variables: { id: streamId },
    pause: !streamId,
    requestPolicy: 'cache-and-network',
  })
  return {
    result: toAsyncResult<Stream>({
      fetching,
      error,
      data: data?.np_streams_by_pk,
      notFoundWhenNull: true,
    }),
    reexecute: () => reexecute({ requestPolicy: 'network-only' }),
  }
}

/** Live chat messages — Hasura subscription, replaces the legacy Socket.io stream:chat. */
export function useStreamChat(streamId: string): {
  messages: readonly StreamChatMessage[]
  error?: AppError
} {
  const [{ data, error }] = useSubscription<{ np_stream_chat_messages: StreamChatMessage[] }>({
    query: StreamChatSubscription,
    variables: { streamId },
    pause: !streamId,
  })
  return {
    messages: data?.np_stream_chat_messages ?? [],
    error: error ? toAppError(error) : undefined,
  }
}

/** Live viewer count — Hasura subscription, replaces the legacy stream:viewerCount event. */
export function useStreamViewerCount(streamId: string, fallback: number): number {
  const [{ data }] = useSubscription<{ np_streams_by_pk: { viewer_count: number } | null }>({
    query: StreamViewerCountSubscription,
    variables: { streamId },
    pause: !streamId,
  })
  return data?.np_streams_by_pk?.viewer_count ?? fallback
}

export function useStreamActions(streamId: string) {
  const [, sendExec] = useMutation<{ sendStreamChat: { id: string } }>(SendStreamChatMutation)
  const [, reactExec] = useMutation<{ reactToStream: { ok: boolean } }>(ReactToStreamMutation)
  const [, followExec] = useMutation<{ followUser: { ok: boolean } }>(FollowStreamerMutation)

  const sendChat = useCallback(
    async (message: string): Promise<Result<true, AppError>> => {
      const res = await sendExec({ streamId, message })
      if (res.error) return { _tag: 'Err', error: toAppError(res.error) }
      return { _tag: 'Ok', value: true }
    },
    [sendExec, streamId],
  )

  const react = useCallback(
    async (type: StreamReactionType): Promise<Result<true, AppError>> => {
      const res = await reactExec({ streamId, type })
      if (res.error) return { _tag: 'Err', error: toAppError(res.error) }
      return { _tag: 'Ok', value: true }
    },
    [reactExec, streamId],
  )

  const follow = useCallback(
    async (streamerId: string): Promise<Result<true, AppError>> => {
      const res = await followExec({ streamerId })
      if (res.error) return { _tag: 'Err', error: toAppError(res.error) }
      return { _tag: 'Ok', value: true }
    },
    [followExec],
  )

  return { sendChat, react, follow }
}
