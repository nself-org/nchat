/**
 * Call Participants API
 * GET /api/calls/[id]/participants - List participants
 * POST /api/calls/[id]/participants - Add participant(s)
 * DELETE /api/calls/[id]/participants - Remove participant
 *
 * All operations use real database queries via GraphQL and include:
 * - Authentication checks
 * - Permission validation
 * - Audit logging
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerApolloClient } from '@/lib/apollo-client'
import { getAuthenticatedUser, getClientIp } from '@/lib/api/middleware'
import {
  successResponse,
  createdResponse,
  badRequestResponse,
  notFoundResponse,
  forbiddenResponse,
  internalErrorResponse,
} from '@/lib/api/response'
import { logAuditEvent } from '@/lib/audit/audit-logger'
import { logger } from '@/lib/logger'
import {
  GET_CALL_BY_ID,
  GET_CALL_PARTICIPANTS,
  GET_CALL_PARTICIPANT,
  CHECK_CALL_ACCESS,
  GET_USERS_BY_IDS,
  ADD_CALL_PARTICIPANTS,
  REMOVE_CALL_PARTICIPANT,
  GET_EXISTING_PARTICIPANTS,
} from '@/graphql/calls'

// =============================================================================
// Schema Validation
// =============================================================================

const addParticipantsSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1).max(50),
  notify: z.boolean().default(true),
})

const removeParticipantSchema = z.object({
  userId: z.string().uuid(),
  reason: z.string().optional(),
})

// =============================================================================
// Types
// =============================================================================

interface CallAccessResult {
  hasAccess: boolean
  isParticipant: boolean
  isCaller: boolean
  isChannelMember: boolean
  channelRole?: string
  call?: {
    id: string
    status: string
    callerId: string
    channelId?: string
  }
}

interface ParticipantData {
  id: string
  callId: string
  userId: string
  user: {
    id: string
    username: string
    displayName: string
    avatarUrl: string | null
  }
  joinedAt: string | null
  leftAt: string | null
  isMuted: boolean
  isVideoOff: boolean
  isScreenSharing: boolean
  isSpeaking: boolean
  connectionQuality: number | null
  invitedBy?: string
  isLocal: boolean
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if a user has access to a call
 */
async function checkCallAccess(userId: string, callId: string): Promise<CallAccessResult> {
  try {
    const client = getServerApolloClient()
    const { data } = await client.query({
      query: CHECK_CALL_ACCESS,
      variables: { callId, userId },
      fetchPolicy: 'no-cache',
    })

    const call = data?.nchat_calls_by_pk
    const activeParticipant = data?.nchat_call_participants?.[0]

    if (!call) {
      return {
        hasAccess: false,
        isParticipant: false,
        isCaller: false,
        isChannelMember: false,
      }
    }

    const isCaller = call.caller_id === userId
    const isParticipant = !!activeParticipant
    const channelMember = call.channel?.members?.[0]
    const isChannelMember = !!channelMember

    // Access granted if: caller, active participant, or channel member
    const hasAccess = isCaller || isParticipant || isChannelMember

    return {
      hasAccess,
      isParticipant,
      isCaller,
      isChannelMember,
      channelRole: channelMember?.role,
      call: {
        id: call.id,
        status: call.status,
        callerId: call.caller_id,
        channelId: call.channel_id,
      },
    }
  } catch (error) {
    logger.error('[checkCallAccess] Error:', error)
    return {
      hasAccess: false,
      isParticipant: false,
      isCaller: false,
      isChannelMember: false,
    }
  }
}

/**
 * Check if user can manage participants (add/remove others)
 */
function canManageParticipants(accessResult: CallAccessResult): boolean {
  // Caller can always manage participants
  if (accessResult.isCaller) return true

  // Channel admins/moderators can manage participants
  if (accessResult.isChannelMember) {
    const role = accessResult.channelRole
    return role === 'admin' || role === 'moderator' || role === 'owner'
  }

  return false
}

/**
 * Transform database participant to API format
 */
function transformParticipant(
  dbParticipant: Record<string, unknown>,
  currentUserId: string
): ParticipantData {
  return {
    id: dbParticipant.id as string,
    callId: dbParticipant.call_id as string,
    userId: dbParticipant.user_id as string,
    user: {
      id: (dbParticipant.user as Record<string, unknown>)?.id as string,
      username: (dbParticipant.user as Record<string, unknown>)?.username as string,
      displayName: (dbParticipant.user as Record<string, unknown>)?.display_name as string,
      avatarUrl: ((dbParticipant.user as Record<string, unknown>)?.avatar_url as string) || null,
    },
    joinedAt: (dbParticipant.joined_at as string) || null,
    leftAt: (dbParticipant.left_at as string) || null,
    isMuted: (dbParticipant.is_muted as boolean) || false,
    isVideoOff: !(dbParticipant.is_video_enabled as boolean),
    isScreenSharing: (dbParticipant.is_screen_sharing as boolean) || false,
    isSpeaking: (dbParticipant.is_speaking as boolean) || false,
    connectionQuality: (dbParticipant.connection_quality as number) || null,
    invitedBy: dbParticipant.invited_by as string | undefined,
    isLocal: dbParticipant.user_id === currentUserId,
  }
}

// =============================================================================
// GET /api/calls/[id]/participants
// =============================================================================

/**
 * List all participants in a call
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: callId } = await params

    // Validate call ID format
    if (!callId || !z.string().uuid().safeParse(callId).success) {
      return badRequestResponse('Invalid call ID', 'INVALID_CALL_ID')
    }

    // Authenticate user
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Check if user has access to this call
    const accessResult = await checkCallAccess(user.id, callId)
    if (!accessResult.hasAccess) {
      return forbiddenResponse('You do not have access to this call', 'CALL_ACCESS_DENIED')
    }

    // Fetch participants from database
    const client = getServerApolloClient()
    const { data, errors } = await client.query({
      query: GET_CALL_PARTICIPANTS,
      variables: { callId },
      fetchPolicy: 'no-cache',
    })

    if (errors?.length) {
      logger.error('[GET participants] GraphQL errors:', errors)
      return internalErrorResponse('Failed to fetch participants')
    }

    const dbParticipants = data?.nchat_call_participants || []

    // Transform to API format
    const participants = dbParticipants.map((p: Record<string, unknown>) =>
      transformParticipant(p, user.id)
    )

    // Filter to only active participants (not left)
    const activeParticipants = participants.filter((p: ParticipantData) => !p.leftAt)

    return successResponse({
      participants: activeParticipants,
      count: activeParticipants.length,
      totalCount: participants.length,
    })
  } catch (error) {
    logger.error('[GET participants] Error:', error)
    return internalErrorResponse('Internal server error')
  }
}

// =============================================================================
// POST /api/calls/[id]/participants
// =============================================================================

/**
 * Add participant(s) to a call
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: callId } = await params

    // Validate call ID format
    if (!callId || !z.string().uuid().safeParse(callId).success) {
      return badRequestResponse('Invalid call ID', 'INVALID_CALL_ID')
    }

    // Parse and validate request body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return badRequestResponse('Invalid JSON body', 'INVALID_JSON')
    }

    const validation = addParticipantsSchema.safeParse(body)
    if (!validation.success) {
      return badRequestResponse('Invalid request body', 'VALIDATION_ERROR', {
        errors: validation.error.errors,
      })
    }

    const { userIds, notify } = validation.data

    // Authenticate user
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Check if user has access and permission to add participants
    const accessResult = await checkCallAccess(user.id, callId)

    if (!accessResult.call) {
      return notFoundResponse('Call not found', 'CALL_NOT_FOUND')
    }

    if (accessResult.call.status === 'ended') {
      return badRequestResponse('Cannot add participants to an ended call', 'CALL_ENDED')
    }

    if (!accessResult.hasAccess) {
      return forbiddenResponse('You do not have access to this call', 'CALL_ACCESS_DENIED')
    }

    if (!canManageParticipants(accessResult)) {
      return forbiddenResponse(
        'You do not have permission to add participants',
        'INSUFFICIENT_PERMISSIONS'
      )
    }

    const client = getServerApolloClient()

    // Check which users already exist and are active in the call
    const { data: existingData } = await client.query({
      query: GET_EXISTING_PARTICIPANTS,
      variables: { callId, userIds },
      fetchPolicy: 'no-cache',
    })

    const existingUserIds = new Set(
      (existingData?.nchat_call_participants || []).map(
        (p: { user_id: string }) => p.user_id
      )
    )

    // Filter to only new users
    const newUserIds = userIds.filter((id) => !existingUserIds.has(id))

    if (newUserIds.length === 0) {
      return badRequestResponse(
        'All specified users are already participants in this call',
        'ALREADY_PARTICIPANTS'
      )
    }

    // Verify the users exist
    const { data: usersData } = await client.query({
      query: GET_USERS_BY_IDS,
      variables: { userIds: newUserIds },
      fetchPolicy: 'no-cache',
    })

    const existingUsers = usersData?.nchat_users || []
    const existingUserIdsSet = new Set(existingUsers.map((u: { id: string }) => u.id))
    const validUserIds = newUserIds.filter((id) => existingUserIdsSet.has(id))

    if (validUserIds.length === 0) {
      return badRequestResponse('No valid users found to add', 'USERS_NOT_FOUND')
    }

    // Prepare participant records
    const now = new Date().toISOString()
    const participantInserts = validUserIds.map((participantUserId) => ({
      call_id: callId,
      user_id: participantUserId,
      joined_at: null, // Will be set when they actually join
      left_at: null,
      is_muted: false,
      is_video_enabled: false,
      is_screen_sharing: false,
      invited_by: user.id,
    }))

    // Insert participants
    const { data: insertData, errors: insertErrors } = await client.mutate({
      mutation: ADD_CALL_PARTICIPANTS,
      variables: { participants: participantInserts },
    })

    if (insertErrors?.length) {
      logger.error('[POST participants] GraphQL errors:', insertErrors)
      return internalErrorResponse('Failed to add participants')
    }

    const addedParticipants = insertData?.insert_nchat_call_participants?.returning || []

    // Log audit event for each added participant
    const ipAddress = getClientIp(request)
    for (const participant of addedParticipants) {
      await logAuditEvent({
        action: 'member_add',
        actor: {
          id: user.id,
          type: 'user',
          email: user.email,
          displayName: user.displayName,
        },
        category: 'channel',
        resource: {
          type: 'channel',
          id: callId,
          name: `Call ${callId.substring(0, 8)}`,
        },
        target: {
          type: 'user',
          id: participant.user_id,
        },
        description: `Added participant ${participant.user?.username || participant.user_id} to call`,
        metadata: {
          callId,
          participantId: participant.id,
          userId: participant.user_id,
          notify,
        },
        ipAddress,
        success: true,
      })
    }

    // Transform for response
    const responseParticipants = addedParticipants.map((p: Record<string, unknown>) =>
      transformParticipant(p, user.id)
    )

    // Send call invitations via the notify plugin when available
    if (notify && addedParticipants.length > 0) {
      // await sendCallInvitations(callId, validUserIds, user)
      logger.info(`[POST participants] Call invitation pending for ${validUserIds.length} users (requires notify plugin)`)
    }

    return createdResponse({
      success: true,
      participants: responseParticipants,
      addedCount: addedParticipants.length,
      skippedCount: userIds.length - validUserIds.length,
      message: `${addedParticipants.length} participant(s) added to call`,
    })
  } catch (error) {
    logger.error('[POST participants] Error:', error)
    return internalErrorResponse('Internal server error')
  }
}

// =============================================================================
// DELETE /api/calls/[id]/participants
// =============================================================================

/**
 * Remove a participant from a call
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: callId } = await params

    // Validate call ID format
    if (!callId || !z.string().uuid().safeParse(callId).success) {
      return badRequestResponse('Invalid call ID', 'INVALID_CALL_ID')
    }

    // Parse and validate request body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return badRequestResponse('Invalid JSON body', 'INVALID_JSON')
    }

    const validation = removeParticipantSchema.safeParse(body)
    if (!validation.success) {
      return badRequestResponse('Invalid request body', 'VALIDATION_ERROR', {
        errors: validation.error.errors,
      })
    }

    const { userId: targetUserId, reason } = validation.data

    // Authenticate user
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Check call access
    const accessResult = await checkCallAccess(user.id, callId)

    if (!accessResult.call) {
      return notFoundResponse('Call not found', 'CALL_NOT_FOUND')
    }

    if (!accessResult.hasAccess) {
      return forbiddenResponse('You do not have access to this call', 'CALL_ACCESS_DENIED')
    }

    // Determine if this is self-removal or removal of another user
    const isSelf = user.id === targetUserId

    // Permission check: can remove self, or need permission to remove others
    if (!isSelf && !canManageParticipants(accessResult)) {
      return forbiddenResponse(
        'You do not have permission to remove other participants',
        'INSUFFICIENT_PERMISSIONS'
      )
    }

    const client = getServerApolloClient()

    // Check if target user is a participant
    const { data: participantData } = await client.query({
      query: GET_CALL_PARTICIPANT,
      variables: { callId, userId: targetUserId },
      fetchPolicy: 'no-cache',
    })

    const participant = participantData?.nchat_call_participants?.[0]
    if (!participant) {
      return notFoundResponse('Participant not found in this call', 'PARTICIPANT_NOT_FOUND')
    }

    if (participant.left_at) {
      return badRequestResponse('Participant has already left the call', 'ALREADY_LEFT')
    }

    // Cannot remove the call owner/caller unless it's themselves
    if (targetUserId === accessResult.call.callerId && !isSelf) {
      return forbiddenResponse('Cannot remove the call initiator', 'CANNOT_REMOVE_CALLER')
    }

    // Update participant record
    const now = new Date().toISOString()
    const { data: updateData, errors: updateErrors } = await client.mutate({
      mutation: REMOVE_CALL_PARTICIPANT,
      variables: {
        callId,
        userId: targetUserId,
        leftAt: now,
        removedBy: isSelf ? null : user.id,
        removeReason: reason || (isSelf ? 'left' : 'removed'),
      },
    })

    if (updateErrors?.length) {
      logger.error('[DELETE participants] GraphQL errors:', updateErrors)
      return internalErrorResponse('Failed to remove participant')
    }

    const updatedParticipant = updateData?.update_nchat_call_participants?.returning?.[0]

    if (!updatedParticipant) {
      return internalErrorResponse('Failed to update participant record')
    }

    // Log audit event
    const ipAddress = getClientIp(request)
    await logAuditEvent({
      action: 'member_remove',
      actor: {
        id: user.id,
        type: 'user',
        email: user.email,
        displayName: user.displayName,
      },
      category: 'channel',
      resource: {
        type: 'channel',
        id: callId,
        name: `Call ${callId.substring(0, 8)}`,
      },
      target: {
        type: 'user',
        id: targetUserId,
      },
      description: isSelf
        ? `Left call ${callId.substring(0, 8)}`
        : `Removed participant from call ${callId.substring(0, 8)}`,
      metadata: {
        callId,
        participantId: participant.id,
        targetUserId,
        reason: reason || (isSelf ? 'left' : 'removed'),
        isSelfRemoval: isSelf,
      },
      ipAddress,
      success: true,
    })

    return successResponse({
      success: true,
      participant: {
        id: updatedParticipant.id,
        callId: updatedParticipant.call_id,
        userId: updatedParticipant.user_id,
        leftAt: updatedParticipant.left_at,
        removedBy: updatedParticipant.removed_by,
        removeReason: updatedParticipant.remove_reason,
      },
      message: isSelf ? 'Left call' : 'Participant removed from call',
    })
  } catch (error) {
    logger.error('[DELETE participants] Error:', error)
    return internalErrorResponse('Internal server error')
  }
}
