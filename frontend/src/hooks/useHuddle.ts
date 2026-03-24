/**
 * useHuddle Hook - Huddle (instant call) management for nself-chat
 *
 * Provides quick audio/video call functionality within channels
 */

'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useQuery, useMutation, useSubscription } from '@apollo/client'
import { gql } from '@apollo/client'
import { useMeetingStore, selectActiveHuddle, selectActiveHuddles } from '@/stores/meeting-store'
import { Huddle, HuddleParticipant, RoomType } from '@/lib/meetings/meeting-types'

import { logger } from '@/lib/logger'

// ============================================================================
// GraphQL Queries and Mutations
// ============================================================================

const GET_CHANNEL_HUDDLE = gql`
  query GetChannelHuddle($channelId: uuid!) {
    nchat_huddles(where: { channel_id: { _eq: $channelId }, status: { _eq: "active" } }, limit: 1) {
      id
      channel_id
      room_type
      status
      host_id
      started_at
      ended_at
      participant_count
      max_participants
      host {
        id
        display_name
        avatar_url
      }
      participants {
        user_id
        joined_at
        is_muted
        is_video_on
        is_speaking
        is_screen_sharing
        user {
          id
          display_name
          avatar_url
        }
      }
    }
  }
`

const START_HUDDLE = gql`
  mutation StartHuddle($channelId: uuid!, $roomType: String!) {
    insert_nchat_huddles_one(
      object: { channel_id: $channelId, room_type: $roomType, status: "active" }
    ) {
      id
      channel_id
      room_type
      status
      host_id
      started_at
    }
  }
`

const JOIN_HUDDLE = gql`
  mutation JoinHuddle($huddleId: uuid!, $userId: uuid!) {
    insert_nchat_huddle_participants_one(
      object: { huddle_id: $huddleId, user_id: $userId, is_muted: true, is_video_on: false }
      on_conflict: { constraint: huddle_participants_pkey, update_columns: [joined_at] }
    ) {
      huddle_id
      user_id
      joined_at
    }
  }
`

const LEAVE_HUDDLE = gql`
  mutation LeaveHuddle($huddleId: uuid!, $userId: uuid!) {
    delete_nchat_huddle_participants(
      where: { huddle_id: { _eq: $huddleId }, user_id: { _eq: $userId } }
    ) {
      affected_rows
    }
  }
`

const END_HUDDLE = gql`
  mutation EndHuddle($huddleId: uuid!) {
    update_nchat_huddles_by_pk(
      pk_columns: { id: $huddleId }
      _set: { status: "ended", ended_at: "now()" }
    ) {
      id
      status
      ended_at
    }
  }
`

const UPDATE_PARTICIPANT_STATE = gql`
  mutation UpdateParticipantState(
    $huddleId: uuid!
    $userId: uuid!
    $isMuted: Boolean
    $isVideoOn: Boolean
    $isSpeaking: Boolean
    $isScreenSharing: Boolean
  ) {
    update_nchat_huddle_participants(
      where: { huddle_id: { _eq: $huddleId }, user_id: { _eq: $userId } }
      _set: {
        is_muted: $isMuted
        is_video_on: $isVideoOn
        is_speaking: $isSpeaking
        is_screen_sharing: $isScreenSharing
      }
    ) {
      affected_rows
    }
  }
`

const SUBSCRIBE_TO_HUDDLE = gql`
  subscription SubscribeToHuddle($huddleId: uuid!) {
    nchat_huddles_by_pk(id: $huddleId) {
      id
      status
      participant_count
      participants {
        user_id
        is_muted
        is_video_on
        is_speaking
        is_screen_sharing
        user {
          id
          display_name
          avatar_url
        }
      }
    }
  }
`

// ============================================================================
// Helper Functions
// ============================================================================

function transformHuddleFromGraphQL(data: Record<string, unknown>): Huddle {
  const host = data.host as Record<string, unknown> | undefined
  const participants = (data.participants as Array<Record<string, unknown>>) || []

  return {
    id: data.id as string,
    channelId: data.channel_id as string,
    roomType: data.room_type as RoomType,
    status: data.status as 'active' | 'ended',
    hostId: data.host_id as string,
    hostName: (host?.display_name as string) || '',
    hostAvatarUrl: (host?.avatar_url as string | null) || null,
    participants: participants.map((p) => {
      const user = p.user as Record<string, unknown>
      return {
        userId: p.user_id as string,
        displayName: (user?.display_name as string) || '',
        avatarUrl: (user?.avatar_url as string | null) || null,
        joinedAt: p.joined_at as string,
        isMuted: p.is_muted as boolean,
        isVideoOn: p.is_video_on as boolean,
        isSpeaking: p.is_speaking as boolean,
        isScreenSharing: p.is_screen_sharing as boolean,
      }
    }),
    participantCount: (data.participant_count as number) || participants.length,
    maxParticipants: (data.max_participants as number) || 15,
    startedAt: data.started_at as string,
    endedAt: data.ended_at as string | null,
  }
}

// ============================================================================
// Hook Options and Return Types
// ============================================================================

export interface UseHuddleOptions {
  channelId?: string
  userId?: string
  autoJoin?: boolean
}

export interface UseHuddleReturn {
  // Current huddle state
  huddle: Huddle | undefined
  isActive: boolean
  isInHuddle: boolean
  participantCount: number
  participants: HuddleParticipant[]

  // User's state in huddle
  isMuted: boolean
  isVideoOn: boolean
  isScreenSharing: boolean
  isSpeaking: boolean

  // Loading states
  isLoading: boolean
  isStarting: boolean
  isJoining: boolean

  // Error state
  error: string | null

  // Actions
  startHuddle: (roomType: RoomType) => Promise<Huddle | null>
  joinHuddle: () => Promise<boolean>
  leaveHuddle: () => Promise<boolean>
  endHuddle: () => Promise<boolean>

  // Media controls
  toggleMute: () => void
  toggleVideo: () => void
  toggleScreenShare: () => void

  // Utilities
  canStartHuddle: boolean
  canJoinHuddle: boolean
  isHost: boolean
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useHuddle(options: UseHuddleOptions = {}): UseHuddleReturn {
  const { channelId, userId, autoJoin = false } = options

  // Store state
  const store = useMeetingStore()
  const {
    activeHuddleId,
    huddles,
    channelHuddles,
    roomState,
    startHuddle: startHuddleInStore,
    joinHuddle: joinHuddleInStore,
    leaveHuddle: leaveHuddleInStore,
    endHuddle: endHuddleInStore,
    toggleMute: toggleMuteInStore,
    toggleVideo: toggleVideoInStore,
    toggleScreenShare: toggleScreenShareInStore,
    setError,
  } = store

  // Local state refs for tracking
  const isStartingRef = useRef(false)
  const isJoiningRef = useRef(false)

  // Get current huddle for channel
  const channelHuddleId = channelId ? channelHuddles.get(channelId) : undefined
  const activeHuddle = useMeetingStore(selectActiveHuddle)
  const allActiveHuddles = useMeetingStore(selectActiveHuddles)

  // Query for existing huddle in channel
  const { data: huddleData, loading: isLoadingHuddle } = useQuery(GET_CHANNEL_HUDDLE, {
    variables: { channelId },
    skip: !channelId,
  })

  // Mutations
  const [startHuddleMutation, { loading: startLoading }] = useMutation(START_HUDDLE)
  const [joinHuddleMutation, { loading: joinLoading }] = useMutation(JOIN_HUDDLE)
  const [leaveHuddleMutation] = useMutation(LEAVE_HUDDLE)
  const [endHuddleMutation] = useMutation(END_HUDDLE)
  const [updateParticipantMutation] = useMutation(UPDATE_PARTICIPANT_STATE)

  // Subscribe to huddle updates when active
  const { data: subscriptionData } = useSubscription(SUBSCRIBE_TO_HUDDLE, {
    variables: { huddleId: channelHuddleId || activeHuddleId },
    skip: !channelHuddleId && !activeHuddleId,
  })

  // Determine current huddle
  const huddle = useMemo(() => {
    // First check subscription data
    if (subscriptionData?.nchat_huddles_by_pk) {
      return transformHuddleFromGraphQL(subscriptionData.nchat_huddles_by_pk)
    }
    // Then check query data
    if (huddleData?.nchat_huddles?.[0]) {
      return transformHuddleFromGraphQL(huddleData.nchat_huddles[0])
    }
    // Finally check store
    if (activeHuddleId) {
      return huddles.get(activeHuddleId)
    }
    if (channelHuddleId) {
      return huddles.get(channelHuddleId)
    }
    return undefined
  }, [huddleData, subscriptionData, huddles, activeHuddleId, channelHuddleId])

  // Derived state
  const isActive = huddle?.status === 'active'
  const isInHuddle = activeHuddleId === huddle?.id
  const isHost = huddle?.hostId === userId
  const participantCount = huddle?.participantCount ?? 0
  const participants = huddle?.participants ?? []

  // User's state
  const currentParticipant = participants.find((p) => p.userId === userId)
  const isMuted = roomState?.localUser?.isMuted ?? currentParticipant?.isMuted ?? true
  const isVideoOn = roomState?.localUser?.isVideoOn ?? currentParticipant?.isVideoOn ?? false
  const isScreenSharing =
    roomState?.localUser?.isScreenSharing ?? currentParticipant?.isScreenSharing ?? false
  const isSpeaking = currentParticipant?.isSpeaking ?? false

  // Permissions
  const canStartHuddle = !!channelId && !huddle
  const canJoinHuddle =
    !!huddle && isActive && !isInHuddle && participantCount < (huddle.maxParticipants ?? 15)

  // Start a new huddle
  const startHuddle = useCallback(
    async (roomType: RoomType): Promise<Huddle | null> => {
      if (!channelId || !userId || isStartingRef.current) {
        return null
      }

      isStartingRef.current = true
      setError(null)

      try {
        const result = await startHuddleMutation({
          variables: {
            channelId,
            roomType,
          },
        })

        if (result.data?.insert_nchat_huddles_one) {
          const newHuddle = transformHuddleFromGraphQL(result.data.insert_nchat_huddles_one)
          // Store only supports audio/video, not screenshare
          const storeRoomType: 'audio' | 'video' = roomType === 'screenshare' ? 'video' : roomType
          startHuddleInStore(channelId, storeRoomType)
          joinHuddleInStore(newHuddle.id)
          return newHuddle
        }

        return null
      } catch (err) {
        setError((err as Error).message)
        return null
      } finally {
        isStartingRef.current = false
      }
    },
    [channelId, userId, startHuddleMutation, startHuddleInStore, joinHuddleInStore, setError]
  )

  // Join existing huddle
  const joinHuddle = useCallback(async (): Promise<boolean> => {
    if (!huddle || !userId || isJoiningRef.current) {
      return false
    }

    isJoiningRef.current = true
    setError(null)

    try {
      const result = await joinHuddleMutation({
        variables: {
          huddleId: huddle.id,
          userId,
        },
      })

      if (result.data?.insert_nchat_huddle_participants_one) {
        joinHuddleInStore(huddle.id)
        return true
      }

      return false
    } catch (err) {
      setError((err as Error).message)
      return false
    } finally {
      isJoiningRef.current = false
    }
  }, [huddle, userId, joinHuddleMutation, joinHuddleInStore, setError])

  // Leave huddle
  const leaveHuddle = useCallback(async (): Promise<boolean> => {
    if (!huddle || !userId) {
      return false
    }

    setError(null)

    try {
      const result = await leaveHuddleMutation({
        variables: {
          huddleId: huddle.id,
          userId,
        },
      })

      if (result.data?.delete_nchat_huddle_participants?.affected_rows) {
        leaveHuddleInStore()
        return true
      }

      return false
    } catch (err) {
      setError((err as Error).message)
      return false
    }
  }, [huddle, userId, leaveHuddleMutation, leaveHuddleInStore, setError])

  // End huddle (host only)
  const endHuddle = useCallback(async (): Promise<boolean> => {
    if (!huddle || !isHost) {
      return false
    }

    setError(null)

    try {
      const result = await endHuddleMutation({
        variables: { huddleId: huddle.id },
      })

      if (result.data?.update_nchat_huddles_by_pk) {
        endHuddleInStore(huddle.id)
        return true
      }

      return false
    } catch (err) {
      setError((err as Error).message)
      return false
    }
  }, [huddle, isHost, endHuddleMutation, endHuddleInStore, setError])

  // Media controls
  const toggleMute = useCallback(() => {
    toggleMuteInStore()
    if (huddle && userId) {
      updateParticipantMutation({
        variables: {
          huddleId: huddle.id,
          userId,
          isMuted: !isMuted,
        },
      }).catch(console.error)
    }
  }, [toggleMuteInStore, huddle, userId, isMuted, updateParticipantMutation])

  const toggleVideo = useCallback(() => {
    toggleVideoInStore()
    if (huddle && userId) {
      updateParticipantMutation({
        variables: {
          huddleId: huddle.id,
          userId,
          isVideoOn: !isVideoOn,
        },
      }).catch(console.error)
    }
  }, [toggleVideoInStore, huddle, userId, isVideoOn, updateParticipantMutation])

  const toggleScreenShare = useCallback(() => {
    toggleScreenShareInStore()
    if (huddle && userId) {
      updateParticipantMutation({
        variables: {
          huddleId: huddle.id,
          userId,
          isScreenSharing: !isScreenSharing,
        },
      }).catch(console.error)
    }
  }, [toggleScreenShareInStore, huddle, userId, isScreenSharing, updateParticipantMutation])

  // Auto-join if option is set
  useEffect(() => {
    if (autoJoin && canJoinHuddle && userId) {
      joinHuddle()
    }
  }, [autoJoin, canJoinHuddle, userId, joinHuddle])

  return {
    // Current huddle state
    huddle,
    isActive,
    isInHuddle,
    participantCount,
    participants,

    // User's state in huddle
    isMuted,
    isVideoOn,
    isScreenSharing,
    isSpeaking,

    // Loading states
    isLoading: isLoadingHuddle,
    isStarting: startLoading,
    isJoining: joinLoading,

    // Error state
    error: store.error,

    // Actions
    startHuddle,
    joinHuddle,
    leaveHuddle,
    endHuddle,

    // Media controls
    toggleMute,
    toggleVideo,
    toggleScreenShare,

    // Utilities
    canStartHuddle,
    canJoinHuddle,
    isHost,
  }
}
