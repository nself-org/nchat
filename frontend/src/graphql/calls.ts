/**
 * GraphQL Operations for Voice/Video Calls
 *
 * Mutations, queries, and subscriptions for WebRTC call management.
 */

import { gql } from "@apollo/client";

// =============================================================================
// Fragments
// =============================================================================

export const CALL_FRAGMENT = gql`
  fragment CallFields on nchat_calls {
    id
    call_id
    type
    status
    started_at
    ended_at
    duration
    caller_id
    channel_id
    metadata
    created_at
    updated_at
  }
`;

export const CALL_PARTICIPANT_FRAGMENT = gql`
  fragment CallParticipantFields on nchat_call_participants {
    id
    call_id
    user_id
    joined_at
    left_at
    is_muted
    is_video_enabled
    is_screen_sharing
    user {
      id
      username
      display_name
      avatar_url
    }
  }
`;

// =============================================================================
// Queries
// =============================================================================

export const GET_CALL = gql`
  ${CALL_FRAGMENT}
  ${CALL_PARTICIPANT_FRAGMENT}
  query GetCall($callId: String!) {
    nchat_calls(where: { call_id: { _eq: $callId } }, limit: 1) {
      ...CallFields
      participants {
        ...CallParticipantFields
      }
    }
  }
`;

export const GET_ACTIVE_CALLS = gql`
  ${CALL_FRAGMENT}
  ${CALL_PARTICIPANT_FRAGMENT}
  query GetActiveCalls($userId: uuid!) {
    nchat_calls(
      where: {
        status: { _in: ["ringing", "connecting", "connected"] }
        _or: [
          { caller_id: { _eq: $userId } }
          { participants: { user_id: { _eq: $userId } } }
        ]
      }
      order_by: { started_at: desc }
    ) {
      ...CallFields
      participants {
        ...CallParticipantFields
      }
    }
  }
`;

export const GET_CALL_HISTORY = gql`
  ${CALL_FRAGMENT}
  ${CALL_PARTICIPANT_FRAGMENT}
  query GetCallHistory($userId: uuid!, $limit: Int = 50, $offset: Int = 0) {
    nchat_calls(
      where: {
        status: { _eq: "ended" }
        _or: [
          { caller_id: { _eq: $userId } }
          { participants: { user_id: { _eq: $userId } } }
        ]
      }
      order_by: { started_at: desc }
      limit: $limit
      offset: $offset
    ) {
      ...CallFields
      participants {
        ...CallParticipantFields
      }
      caller {
        id
        username
        display_name
        avatar_url
      }
    }
  }
`;

export const GET_CHANNEL_CALLS = gql`
  ${CALL_FRAGMENT}
  ${CALL_PARTICIPANT_FRAGMENT}
  query GetChannelCalls($channelId: uuid!, $limit: Int = 20) {
    nchat_calls(
      where: { channel_id: { _eq: $channelId } }
      order_by: { started_at: desc }
      limit: $limit
    ) {
      ...CallFields
      participants {
        ...CallParticipantFields
      }
      caller {
        id
        username
        display_name
        avatar_url
      }
    }
  }
`;

// =============================================================================
// Mutations
// =============================================================================

export const INITIATE_CALL = gql`
  ${CALL_FRAGMENT}
  mutation InitiateCall(
    $callId: String!
    $type: String!
    $callerId: uuid!
    $targetUserId: uuid
    $channelId: uuid
    $metadata: jsonb
  ) {
    insert_nchat_calls_one(
      object: {
        call_id: $callId
        type: $type
        status: "initiating"
        caller_id: $callerId
        channel_id: $channelId
        metadata: $metadata
        started_at: "now()"
        participants: {
          data: [
            {
              user_id: $callerId
              joined_at: "now()"
              is_muted: false
              is_video_enabled: false
            }
            { user_id: $targetUserId, is_muted: false, is_video_enabled: false }
          ]
        }
      }
    ) {
      ...CallFields
    }
  }
`;

export const UPDATE_CALL_STATUS = gql`
  mutation UpdateCallStatus($callId: String!, $status: String!) {
    update_nchat_calls(
      where: { call_id: { _eq: $callId } }
      _set: { status: $status, updated_at: "now()" }
    ) {
      affected_rows
      returning {
        id
        call_id
        status
      }
    }
  }
`;

export const END_CALL = gql`
  mutation EndCall($callId: String!, $duration: Int) {
    update_nchat_calls(
      where: { call_id: { _eq: $callId } }
      _set: {
        status: "ended"
        ended_at: "now()"
        duration: $duration
        updated_at: "now()"
      }
    ) {
      affected_rows
      returning {
        id
        call_id
        status
        duration
      }
    }
  }
`;

export const JOIN_CALL = gql`
  ${CALL_PARTICIPANT_FRAGMENT}
  mutation JoinCall($callId: String!, $userId: uuid!) {
    insert_nchat_call_participants_one(
      object: {
        call_id: $callId
        user_id: $userId
        joined_at: "now()"
        is_muted: false
        is_video_enabled: false
        is_screen_sharing: false
      }
      on_conflict: {
        constraint: call_participants_call_user_unique
        update_columns: [joined_at, left_at]
      }
    ) {
      ...CallParticipantFields
    }
  }
`;

export const LEAVE_CALL = gql`
  mutation LeaveCall($callId: String!, $userId: uuid!) {
    update_nchat_call_participants(
      where: { call_id: { _eq: $callId }, user_id: { _eq: $userId } }
      _set: { left_at: "now()" }
    ) {
      affected_rows
      returning {
        id
        user_id
        left_at
      }
    }
  }
`;

export const UPDATE_PARTICIPANT_MUTE = gql`
  mutation UpdateParticipantMute(
    $callId: String!
    $userId: uuid!
    $isMuted: Boolean!
  ) {
    update_nchat_call_participants(
      where: { call_id: { _eq: $callId }, user_id: { _eq: $userId } }
      _set: { is_muted: $isMuted }
    ) {
      affected_rows
      returning {
        id
        user_id
        is_muted
      }
    }
  }
`;

export const UPDATE_PARTICIPANT_VIDEO = gql`
  mutation UpdateParticipantVideo(
    $callId: String!
    $userId: uuid!
    $isVideoEnabled: Boolean!
  ) {
    update_nchat_call_participants(
      where: { call_id: { _eq: $callId }, user_id: { _eq: $userId } }
      _set: { is_video_enabled: $isVideoEnabled }
    ) {
      affected_rows
      returning {
        id
        user_id
        is_video_enabled
      }
    }
  }
`;

export const UPDATE_PARTICIPANT_SCREEN_SHARE = gql`
  mutation UpdateParticipantScreenShare(
    $callId: String!
    $userId: uuid!
    $isScreenSharing: Boolean!
  ) {
    update_nchat_call_participants(
      where: { call_id: { _eq: $callId }, user_id: { _eq: $userId } }
      _set: { is_screen_sharing: $isScreenSharing }
    ) {
      affected_rows
      returning {
        id
        user_id
        is_screen_sharing
      }
    }
  }
`;

// =============================================================================
// Subscriptions
// =============================================================================

export const SUBSCRIBE_TO_CALL = gql`
  ${CALL_FRAGMENT}
  ${CALL_PARTICIPANT_FRAGMENT}
  subscription SubscribeToCall($callId: String!) {
    nchat_calls(where: { call_id: { _eq: $callId } }) {
      ...CallFields
      participants(order_by: { joined_at: asc }) {
        ...CallParticipantFields
      }
    }
  }
`;

export const SUBSCRIBE_TO_INCOMING_CALLS = gql`
  ${CALL_FRAGMENT}
  ${CALL_PARTICIPANT_FRAGMENT}
  subscription SubscribeToIncomingCalls($userId: uuid!) {
    nchat_calls(
      where: {
        status: { _eq: "ringing" }
        participants: { user_id: { _eq: $userId } }
      }
      order_by: { started_at: desc }
    ) {
      ...CallFields
      participants {
        ...CallParticipantFields
      }
      caller {
        id
        username
        display_name
        avatar_url
      }
    }
  }
`;

export const SUBSCRIBE_TO_CALL_PARTICIPANTS = gql`
  ${CALL_PARTICIPANT_FRAGMENT}
  subscription SubscribeToCallParticipants($callId: String!) {
    nchat_call_participants(
      where: { call_id: { _eq: $callId } }
      order_by: { joined_at: asc }
    ) {
      ...CallParticipantFields
    }
  }
`;

// =============================================================================
// TypeScript Types
// =============================================================================

export type CallType = "voice" | "video";

export type CallStatus =
  | "idle"
  | "initiating"
  | "ringing"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "ended";

export interface Call {
  id: string;
  call_id: string;
  type: CallType;
  status: CallStatus;
  started_at: string;
  ended_at?: string;
  duration?: number;
  caller_id: string;
  channel_id?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  participants?: CallParticipant[];
  caller?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
}

export interface CallParticipant {
  id: string;
  call_id: string;
  user_id: string;
  joined_at?: string;
  left_at?: string;
  is_muted: boolean;
  is_video_enabled: boolean;
  is_screen_sharing: boolean;
  user: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
}

export interface InitiateCallInput {
  callId: string;
  type: CallType;
  callerId: string;
  targetUserId?: string;
  channelId?: string;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// Additional Queries for Participants API
// =============================================================================

export const GET_CALL_BY_ID = gql`
  ${CALL_FRAGMENT}
  query GetCallById($callId: uuid!) {
    nchat_calls_by_pk(id: $callId) {
      ...CallFields
    }
  }
`;

export const GET_CALL_PARTICIPANTS = gql`
  ${CALL_PARTICIPANT_FRAGMENT}
  query GetCallParticipants($callId: uuid!) {
    nchat_call_participants(
      where: { call_id: { _eq: $callId } }
      order_by: { joined_at: asc }
    ) {
      ...CallParticipantFields
      invited_by
      removed_by
      remove_reason
      connection_quality
      is_speaking
    }
  }
`;

export const GET_CALL_PARTICIPANT = gql`
  query GetCallParticipant($callId: uuid!, $userId: uuid!) {
    nchat_call_participants(
      where: { call_id: { _eq: $callId }, user_id: { _eq: $userId } }
      limit: 1
    ) {
      id
      call_id
      user_id
      joined_at
      left_at
      is_muted
      is_video_enabled
      is_screen_sharing
      invited_by
      removed_by
      remove_reason
    }
  }
`;

export const CHECK_CALL_ACCESS = gql`
  query CheckCallAccess($callId: uuid!, $userId: uuid!) {
    nchat_calls_by_pk(id: $callId) {
      id
      caller_id
      status
      channel_id
      channel {
        id
        members(where: { user_id: { _eq: $userId } }) {
          user_id
          role
        }
      }
    }
    nchat_call_participants(
      where: {
        call_id: { _eq: $callId }
        user_id: { _eq: $userId }
        left_at: { _is_null: true }
      }
    ) {
      id
      user_id
    }
  }
`;

export const GET_USERS_BY_IDS = gql`
  query GetUsersByIds($userIds: [uuid!]!) {
    nchat_users(where: { id: { _in: $userIds } }) {
      id
      username
      display_name
      avatar_url
    }
  }
`;

// =============================================================================
// Additional Mutations for Participants API
// =============================================================================

export const ADD_CALL_PARTICIPANTS = gql`
  mutation AddCallParticipants(
    $participants: [nchat_call_participants_insert_input!]!
  ) {
    insert_nchat_call_participants(
      objects: $participants
      on_conflict: {
        constraint: call_participants_call_user_unique
        update_columns: [joined_at, left_at, invited_by]
      }
    ) {
      affected_rows
      returning {
        id
        call_id
        user_id
        joined_at
        left_at
        is_muted
        is_video_enabled
        is_screen_sharing
        invited_by
        user {
          id
          username
          display_name
          avatar_url
        }
      }
    }
  }
`;

export const REMOVE_CALL_PARTICIPANT = gql`
  mutation RemoveCallParticipant(
    $callId: uuid!
    $userId: uuid!
    $leftAt: timestamptz!
    $removedBy: uuid
    $removeReason: String
  ) {
    update_nchat_call_participants(
      where: { call_id: { _eq: $callId }, user_id: { _eq: $userId } }
      _set: {
        left_at: $leftAt
        removed_by: $removedBy
        remove_reason: $removeReason
      }
    ) {
      affected_rows
      returning {
        id
        call_id
        user_id
        left_at
        removed_by
        remove_reason
      }
    }
  }
`;

export const GET_EXISTING_PARTICIPANTS = gql`
  query GetExistingParticipants($callId: uuid!, $userIds: [uuid!]!) {
    nchat_call_participants(
      where: {
        call_id: { _eq: $callId }
        user_id: { _in: $userIds }
        left_at: { _is_null: true }
      }
    ) {
      user_id
    }
  }
`;
