/**
 * useMeetings Hook - Meeting management hook for nself-chat
 *
 * Provides meeting operations including CRUD, joining, and scheduling
 */

'use client'

import { useCallback, useEffect, useMemo } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import { gql } from '@apollo/client'
import {
  useMeetingStore,
  selectFilteredMeetings,
  selectUpcomingMeetings,
  selectPastMeetings,
  selectLiveMeetings,
  selectActiveMeeting,
  selectMeetingsByDate,
  selectMeetingsForChannel,
} from '@/stores/meeting-store'
import {
  Meeting,
  CreateMeetingInput,
  UpdateMeetingInput,
  MeetingFilters,
  MeetingSortBy,
  SortOrder,
} from '@/lib/meetings/meeting-types'
import {
  generateMeetingCode,
  generateMeetingLink,
  DEFAULT_MEETING_SETTINGS,
  validateMeetingInput,
  scheduleAllReminders,
  cancelAllReminders,
} from '@/lib/meetings'

// ============================================================================
// GraphQL Queries and Mutations
// ============================================================================

const GET_MEETINGS = gql`
  query GetMeetings($userId: uuid!, $limit: Int = 50, $offset: Int = 0) {
    nchat_meetings(
      where: {
        _or: [{ host_id: { _eq: $userId } }, { participants: { user_id: { _eq: $userId } } }]
      }
      order_by: { scheduled_start_at: asc }
      limit: $limit
      offset: $offset
    ) {
      id
      title
      description
      type
      status
      room_type
      scheduled_start_at
      scheduled_end_at
      timezone
      actual_start_at
      actual_end_at
      duration
      is_recurring
      recurrence_rule
      parent_meeting_id
      host_id
      channel_id
      is_private
      requires_approval
      password
      meeting_link
      meeting_code
      settings
      participant_count
      max_participants
      created_at
      updated_at
      created_by
      participants {
        id
        meeting_id
        user_id
        role
        status
        invited_at
        responded_at
        joined_at
        left_at
        user {
          id
          display_name
          avatar_url
          email
        }
      }
    }
  }
`

const GET_MEETING = gql`
  query GetMeeting($id: uuid!) {
    nchat_meetings_by_pk(id: $id) {
      id
      title
      description
      type
      status
      room_type
      scheduled_start_at
      scheduled_end_at
      timezone
      actual_start_at
      actual_end_at
      duration
      is_recurring
      recurrence_rule
      parent_meeting_id
      host_id
      channel_id
      is_private
      requires_approval
      password
      meeting_link
      meeting_code
      settings
      participant_count
      max_participants
      created_at
      updated_at
      created_by
      participants {
        id
        meeting_id
        user_id
        role
        status
        invited_at
        responded_at
        joined_at
        left_at
        user {
          id
          display_name
          avatar_url
          email
        }
      }
    }
  }
`

const CREATE_MEETING = gql`
  mutation CreateMeeting($input: nchat_meetings_insert_input!) {
    insert_nchat_meetings_one(object: $input) {
      id
      title
      meeting_code
      meeting_link
      scheduled_start_at
      scheduled_end_at
    }
  }
`

const UPDATE_MEETING = gql`
  mutation UpdateMeeting($id: uuid!, $changes: nchat_meetings_set_input!) {
    update_nchat_meetings_by_pk(pk_columns: { id: $id }, _set: $changes) {
      id
      title
      scheduled_start_at
      scheduled_end_at
      updated_at
    }
  }
`

const DELETE_MEETING = gql`
  mutation DeleteMeeting($id: uuid!) {
    delete_nchat_meetings_by_pk(id: $id) {
      id
    }
  }
`

const START_MEETING = gql`
  mutation StartMeeting($id: uuid!) {
    update_nchat_meetings_by_pk(
      pk_columns: { id: $id }
      _set: { status: "live", actual_start_at: "now()" }
    ) {
      id
      status
      actual_start_at
    }
  }
`

const END_MEETING = gql`
  mutation EndMeeting($id: uuid!) {
    update_nchat_meetings_by_pk(
      pk_columns: { id: $id }
      _set: { status: "ended", actual_end_at: "now()" }
    ) {
      id
      status
      actual_end_at
    }
  }
`

// ============================================================================
// Helper Functions
// ============================================================================

function transformMeetingFromGraphQL(data: Record<string, unknown>): Meeting {
  return {
    id: data.id as string,
    title: data.title as string,
    description: data.description as string | null,
    type: data.type as Meeting['type'],
    status: data.status as Meeting['status'],
    roomType: data.room_type as Meeting['roomType'],
    scheduledStartAt: data.scheduled_start_at as string,
    scheduledEndAt: data.scheduled_end_at as string,
    timezone: data.timezone as string,
    actualStartAt: data.actual_start_at as string | null,
    actualEndAt: data.actual_end_at as string | null,
    duration: data.duration as number,
    isRecurring: data.is_recurring as boolean,
    recurrenceRule: data.recurrence_rule as Meeting['recurrenceRule'],
    parentMeetingId: data.parent_meeting_id as string | null,
    hostId: data.host_id as string,
    channelId: data.channel_id as string | null,
    isPrivate: data.is_private as boolean,
    requiresApproval: data.requires_approval as boolean,
    password: data.password as string | null,
    meetingLink: data.meeting_link as string,
    meetingCode: data.meeting_code as string,
    settings: (data.settings as Meeting['settings']) || DEFAULT_MEETING_SETTINGS,
    participants: ((data.participants as Array<Record<string, unknown>>) || []).map((p) => ({
      id: p.id as string,
      meetingId: p.meeting_id as string,
      userId: p.user_id as string,
      role: p.role as 'host' | 'co-host' | 'presenter' | 'participant',
      status: p.status as 'invited' | 'accepted' | 'declined' | 'tentative' | 'joined' | 'left',
      invitedAt: p.invited_at as string,
      respondedAt: p.responded_at as string | null,
      joinedAt: p.joined_at as string | null,
      leftAt: p.left_at as string | null,
      displayName: (p.user as Record<string, unknown>)?.display_name as string | undefined,
      avatarUrl: (p.user as Record<string, unknown>)?.avatar_url as string | undefined,
      email: (p.user as Record<string, unknown>)?.email as string | undefined,
    })),
    participantCount: data.participant_count as number,
    maxParticipants: data.max_participants as number | null,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
    createdBy: data.created_by as string,
  }
}

// ============================================================================
// Hook
// ============================================================================

export interface UseMeetingsOptions {
  userId?: string
  channelId?: string
  autoLoad?: boolean
}

export interface UseMeetingsReturn {
  // Data
  meetings: Meeting[]
  upcomingMeetings: Meeting[]
  pastMeetings: Meeting[]
  liveMeetings: Meeting[]
  activeMeeting: Meeting | undefined

  // Loading/Error states
  isLoading: boolean
  isCreating: boolean
  error: string | null

  // Filters and sorting
  filters: MeetingFilters
  sortBy: MeetingSortBy
  sortOrder: SortOrder
  setFilters: (filters: MeetingFilters) => void
  clearFilters: () => void
  setSortBy: (sortBy: MeetingSortBy) => void
  setSortOrder: (order: SortOrder) => void

  // CRUD operations
  createMeeting: (input: CreateMeetingInput) => Promise<Meeting | null>
  updateMeeting: (meetingId: string, updates: UpdateMeetingInput) => Promise<boolean>
  deleteMeeting: (meetingId: string) => Promise<boolean>
  cancelMeeting: (meetingId: string, reason?: string) => Promise<boolean>

  // Meeting actions
  startMeeting: (meetingId: string) => Promise<boolean>
  endMeeting: (meetingId: string) => Promise<boolean>
  joinMeeting: (meetingId: string) => void
  leaveMeeting: () => void

  // Query helpers
  getMeetingById: (meetingId: string) => Meeting | undefined
  getMeetingByCode: (code: string) => Meeting | undefined
  getMeetingsForDate: (date: string) => Meeting[]
  getMeetingsForChannel: (channelId: string) => Meeting[]

  // Refetch
  refetch: () => void
}

export function useMeetings(options: UseMeetingsOptions = {}): UseMeetingsReturn {
  const { userId, channelId, autoLoad = true } = options

  // Store state
  const store = useMeetingStore()
  const {
    filters,
    sortBy,
    sortOrder,
    isLoading,
    isCreating,
    error,
    setMeetings,
    addMeeting,
    updateMeeting: updateMeetingInStore,
    removeMeeting,
    setFilters,
    clearFilters,
    setSortBy,
    setSortOrder,
    setLoading,
    setCreating,
    setError,
    joinMeeting: joinMeetingInStore,
    leaveMeeting: leaveMeetingInStore,
    endMeeting: endMeetingInStore,
  } = store

  // GraphQL queries
  const { data, loading, refetch } = useQuery(GET_MEETINGS, {
    variables: { userId, limit: 100, offset: 0 },
    skip: !userId || !autoLoad,
    onCompleted: (data) => {
      if (data?.nchat_meetings) {
        const meetings = data.nchat_meetings.map(transformMeetingFromGraphQL)
        setMeetings(meetings)
      }
    },
    onError: (error) => {
      setError(error.message)
    },
  })

  // GraphQL mutations
  const [createMeetingMutation] = useMutation(CREATE_MEETING)
  const [updateMeetingMutation] = useMutation(UPDATE_MEETING)
  const [deleteMeetingMutation] = useMutation(DELETE_MEETING)
  const [startMeetingMutation] = useMutation(START_MEETING)
  const [endMeetingMutation] = useMutation(END_MEETING)

  // Sync loading state
  useEffect(() => {
    setLoading(loading)
  }, [loading, setLoading])

  // Selectors
  const meetings = useMeetingStore(selectFilteredMeetings)
  const upcomingMeetings = useMeetingStore(selectUpcomingMeetings)
  const pastMeetings = useMeetingStore(selectPastMeetings)
  const liveMeetings = useMeetingStore(selectLiveMeetings)
  const activeMeeting = useMeetingStore(selectActiveMeeting)

  // Create meeting
  const createMeeting = useCallback(
    async (input: CreateMeetingInput): Promise<Meeting | null> => {
      // Validate input
      const validation = validateMeetingInput(input)
      if (!validation.isValid) {
        const firstError = Object.values(validation.errors)[0]
        setError(firstError)
        return null
      }

      setCreating(true)
      setError(null)

      try {
        const meetingCode = generateMeetingCode()
        const meetingLink = generateMeetingLink(meetingCode)

        const result = await createMeetingMutation({
          variables: {
            input: {
              title: input.title,
              description: input.description || null,
              room_type: input.roomType,
              scheduled_start_at: input.scheduledStartAt,
              scheduled_end_at: input.scheduledEndAt,
              timezone: input.timezone,
              channel_id: input.channelId || null,
              is_private: input.isPrivate ?? false,
              password: input.password || null,
              is_recurring: input.isRecurring ?? false,
              recurrence_rule: input.recurrenceRule || null,
              meeting_code: meetingCode,
              meeting_link: meetingLink,
              settings: { ...DEFAULT_MEETING_SETTINGS, ...input.settings },
              host_id: userId,
              type: input.isRecurring ? 'recurring' : 'scheduled',
              status: 'scheduled',
            },
          },
        })

        if (result.data?.insert_nchat_meetings_one) {
          // Refetch to get full meeting data
          await refetch()
          const meeting = store.getMeetingById(result.data.insert_nchat_meetings_one.id)
          return meeting || null
        }

        return null
      } catch (err) {
        setError((err as Error).message)
        return null
      } finally {
        setCreating(false)
      }
    },
    [createMeetingMutation, userId, refetch, setCreating, setError, store]
  )

  // Update meeting
  const updateMeeting = useCallback(
    async (meetingId: string, updates: UpdateMeetingInput): Promise<boolean> => {
      setError(null)

      try {
        const result = await updateMeetingMutation({
          variables: {
            id: meetingId,
            changes: {
              title: updates.title,
              description: updates.description,
              scheduled_start_at: updates.scheduledStartAt,
              scheduled_end_at: updates.scheduledEndAt,
              timezone: updates.timezone,
              is_private: updates.isPrivate,
              password: updates.password,
              settings: updates.settings,
            },
          },
        })

        if (result.data?.update_nchat_meetings_by_pk) {
          updateMeetingInStore(meetingId, {
            ...updates,
            updatedAt: new Date().toISOString(),
          } as Partial<Meeting>)
          return true
        }

        return false
      } catch (err) {
        setError((err as Error).message)
        return false
      }
    },
    [updateMeetingMutation, updateMeetingInStore, setError]
  )

  // Delete meeting
  const deleteMeeting = useCallback(
    async (meetingId: string): Promise<boolean> => {
      setError(null)

      try {
        const result = await deleteMeetingMutation({
          variables: { id: meetingId },
        })

        if (result.data?.delete_nchat_meetings_by_pk) {
          removeMeeting(meetingId)
          cancelAllReminders(meetingId)
          return true
        }

        return false
      } catch (err) {
        setError((err as Error).message)
        return false
      }
    },
    [deleteMeetingMutation, removeMeeting, setError]
  )

  // Cancel meeting
  const cancelMeeting = useCallback(
    async (meetingId: string, _reason?: string): Promise<boolean> => {
      setError(null)

      try {
        const result = await updateMeetingMutation({
          variables: {
            id: meetingId,
            changes: { status: 'cancelled' },
          },
        })

        if (result.data?.update_nchat_meetings_by_pk) {
          updateMeetingInStore(meetingId, { status: 'cancelled' })
          cancelAllReminders(meetingId)
          return true
        }

        return false
      } catch (err) {
        setError((err as Error).message)
        return false
      }
    },
    [updateMeetingMutation, updateMeetingInStore, setError]
  )

  // Start meeting
  const startMeeting = useCallback(
    async (meetingId: string): Promise<boolean> => {
      setError(null)

      try {
        const result = await startMeetingMutation({
          variables: { id: meetingId },
        })

        if (result.data?.update_nchat_meetings_by_pk) {
          updateMeetingInStore(meetingId, {
            status: 'live',
            actualStartAt: new Date().toISOString(),
          })
          return true
        }

        return false
      } catch (err) {
        setError((err as Error).message)
        return false
      }
    },
    [startMeetingMutation, updateMeetingInStore, setError]
  )

  // End meeting
  const endMeeting = useCallback(
    async (meetingId: string): Promise<boolean> => {
      setError(null)

      try {
        const result = await endMeetingMutation({
          variables: { id: meetingId },
        })

        if (result.data?.update_nchat_meetings_by_pk) {
          endMeetingInStore(meetingId)
          return true
        }

        return false
      } catch (err) {
        setError((err as Error).message)
        return false
      }
    },
    [endMeetingMutation, endMeetingInStore, setError]
  )

  // Join meeting
  const joinMeeting = useCallback(
    (meetingId: string) => {
      joinMeetingInStore(meetingId)
    },
    [joinMeetingInStore]
  )

  // Leave meeting
  const leaveMeeting = useCallback(() => {
    leaveMeetingInStore()
  }, [leaveMeetingInStore])

  // Query helpers
  const getMeetingById = useCallback(
    (meetingId: string) => store.getMeetingById(meetingId),
    [store]
  )

  const getMeetingByCode = useCallback((code: string) => store.getMeetingByCode(code), [store])

  const getMeetingsForDate = useCallback(
    (date: string) =>
      useMeetingStore.getState().meetings
        ? selectMeetingsByDate(date)(useMeetingStore.getState())
        : [],
    []
  )

  const getMeetingsForChannel = useCallback(
    (channelId: string) =>
      useMeetingStore.getState().meetings
        ? selectMeetingsForChannel(channelId)(useMeetingStore.getState())
        : [],
    []
  )

  return {
    // Data
    meetings,
    upcomingMeetings,
    pastMeetings,
    liveMeetings,
    activeMeeting,

    // Loading/Error states
    isLoading,
    isCreating,
    error,

    // Filters and sorting
    filters,
    sortBy,
    sortOrder,
    setFilters,
    clearFilters,
    setSortBy,
    setSortOrder,

    // CRUD operations
    createMeeting,
    updateMeeting,
    deleteMeeting,
    cancelMeeting,

    // Meeting actions
    startMeeting,
    endMeeting,
    joinMeeting,
    leaveMeeting,

    // Query helpers
    getMeetingById,
    getMeetingByCode,
    getMeetingsForDate,
    getMeetingsForChannel,

    // Refetch
    refetch,
  }
}
