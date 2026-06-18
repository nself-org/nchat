/**
 * Purpose:    urql data hooks for the meetings surface. Lists meetings (HASURA-direct),
 *             reads one by code, and calls the meeting lifecycle Actions
 *             (createMeeting / joinMeeting / endMeeting / cancelMeeting — N-2-S3j, backend
 *             pending). Replaces the legacy in-memory useMeetings store + meeting-store.
 * Inputs:     none (list) / meetingCode (room).
 * Outputs:    useMeetingsList, useMeetingByCode, useMeetingActions.
 * Constraints:Server data lives in urql (canonical §6). Mutations return Result<T,AppError>
 *             so callers branch instead of try/catch. Lifecycle Actions degrade gracefully
 *             until the backend handlers land (see backend_pending).
 * SOT:        F-NCHAT-VITE-MEETINGS-HOOK-01
 */
import { useCallback } from 'react'
import { useMutation, useQuery } from 'urql'
import type { Result, AppError } from '@nself/errors'
import {
  CreateMeetingMutation,
  DeleteMeetingMutation,
  EndMeetingMutation,
  JoinMeetingMutation,
  MeetingByCodeQuery,
  MeetingsQuery,
} from './graphql'
import { toAppError, toAsyncResult } from './result-adapter'
import type { CreateMeetingInput, Meeting } from './types'

export function useMeetingsList(): {
  result: Result<readonly Meeting[], AppError> | 'loading'
  reexecute: () => void
} {
  const [{ data, fetching, error }, reexecute] = useQuery<{ np_meetings: Meeting[] }>({
    query: MeetingsQuery,
    requestPolicy: 'cache-and-network',
  })
  return {
    result: toAsyncResult<readonly Meeting[]>({
      fetching,
      error,
      data: data?.np_meetings ?? (fetching ? undefined : []),
    }),
    reexecute: () => reexecute({ requestPolicy: 'network-only' }),
  }
}

export function useMeetingByCode(code: string): {
  result: Result<Meeting, AppError> | 'loading'
  reexecute: () => void
} {
  const [{ data, fetching, error }, reexecute] = useQuery<{ np_meetings: Meeting[] }>({
    query: MeetingByCodeQuery,
    variables: { code },
    pause: !code,
    requestPolicy: 'cache-and-network',
  })
  return {
    result: toAsyncResult<Meeting>({
      fetching,
      error,
      data: data?.np_meetings?.[0],
      notFoundWhenNull: true,
    }),
    reexecute: () => reexecute({ requestPolicy: 'network-only' }),
  }
}

export interface MeetingJoinToken {
  token: string
  url: string
}

export function useMeetingActions() {
  const [createState, createExec] = useMutation<{ createMeeting: { id: string; meeting_code: string } }>(
    CreateMeetingMutation,
  )
  const [joinState, joinExec] = useMutation<{ joinMeeting: MeetingJoinToken }>(JoinMeetingMutation)
  const [, endExec] = useMutation<{ endMeeting: { id: string } }>(EndMeetingMutation)
  const [, cancelExec] = useMutation<{ cancelMeeting: { id: string } }>(DeleteMeetingMutation)

  const createMeeting = useCallback(
    async (input: CreateMeetingInput): Promise<Result<{ id: string; meeting_code: string }, AppError>> => {
      const res = await createExec({ input })
      if (res.error) return { _tag: 'Err', error: toAppError(res.error) }
      if (!res.data?.createMeeting) {
        return { _tag: 'Err', error: { code: 'internal', message: 'No meeting returned', status: 500 } }
      }
      return { _tag: 'Ok', value: res.data.createMeeting }
    },
    [createExec],
  )

  const joinMeeting = useCallback(
    async (meetingId: string, password?: string): Promise<Result<MeetingJoinToken, AppError>> => {
      const res = await joinExec({ meetingId, password })
      if (res.error) return { _tag: 'Err', error: toAppError(res.error) }
      if (!res.data?.joinMeeting) {
        return { _tag: 'Err', error: { code: 'internal', message: 'Join returned no token', status: 500 } }
      }
      return { _tag: 'Ok', value: res.data.joinMeeting }
    },
    [joinExec],
  )

  const endMeeting = useCallback(
    async (meetingId: string): Promise<Result<true, AppError>> => {
      const res = await endExec({ meetingId })
      if (res.error) return { _tag: 'Err', error: toAppError(res.error) }
      return { _tag: 'Ok', value: true }
    },
    [endExec],
  )

  const cancelMeeting = useCallback(
    async (meetingId: string): Promise<Result<true, AppError>> => {
      const res = await cancelExec({ meetingId })
      if (res.error) return { _tag: 'Err', error: toAppError(res.error) }
      return { _tag: 'Ok', value: true }
    },
    [cancelExec],
  )

  return {
    creating: createState.fetching,
    joining: joinState.fetching,
    createMeeting,
    joinMeeting,
    endMeeting,
    cancelMeeting,
  }
}
