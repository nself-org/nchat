/**
 * Purpose:    GraphQL documents for the calls / meetings / streams ported pages.
 *             Queries hit Hasura directly (canonical §2); mutations call the documented
 *             Hasura Actions (createMeeting / joinMeeting / endMeeting / sendStreamChat /
 *             reactToStream / mintLiveKitToken). Authz is enforced server-side via Hasura
 *             permissions + the Multi-Tenant Convention Wall (source_account_id).
 * Inputs:     none (document strings).
 * Outputs:    gql-tagged DocumentNodes for urql useQuery / useMutation / useSubscription.
 * Constraints:Documents reference the documented P3 contracts. Where the backend Action is
 *             not yet live (token mint, meeting lifecycle, stream chat) the document is still
 *             wired so the page degrades via AsyncScreen instead of stubbing the feature.
 *             Replace inline field lists with codegen fragments once `pnpm codegen` runs.
 * SOT:        F-NCHAT-VITE-CALLS-GQL-01
 */
import { gql } from 'urql'

// ─── Calls: history reads (HASURA-direct, N-2-S2h) ───────────────────────────
export const CallByIdQuery = gql`
  query CallById($id: uuid!) {
    np_calls_by_pk(id: $id) {
      id
      call_type
      state
      started_at
      ended_at
      duration_seconds
      host_id
      host_name
      participant_count
    }
  }
`

// ─── Calls: LiveKit token mint (BFF Action, N-2-S5 — backend pending) ────────
export const MintCallTokenMutation = gql`
  mutation MintCallToken($callId: uuid!) {
    mintLiveKitToken(callId: $callId) {
      token
      url
    }
  }
`

// ─── Meetings: list (HASURA-direct) ──────────────────────────────────────────
export const MeetingsQuery = gql`
  query Meetings {
    np_meetings(order_by: { scheduled_start_at: asc }) {
      id
      meeting_code
      title
      description
      room_type
      status
      scheduled_start_at
      scheduled_end_at
      timezone
      host_id
      is_private
      has_password
      participant_count
    }
  }
`

// ─── Meetings: by code (HASURA-direct read for the room page) ─────────────────
export const MeetingByCodeQuery = gql`
  query MeetingByCode($code: String!) {
    np_meetings(where: { meeting_code: { _eq: $code } }, limit: 1) {
      id
      meeting_code
      title
      description
      room_type
      status
      scheduled_start_at
      scheduled_end_at
      timezone
      host_id
      is_private
      has_password
      participant_count
    }
  }
`

// ─── Meetings: lifecycle Actions (N-2-S3j — backend pending) ─────────────────
export const CreateMeetingMutation = gql`
  mutation CreateMeeting($input: CreateMeetingInput!) {
    createMeeting(input: $input) {
      id
      meeting_code
    }
  }
`

export const JoinMeetingMutation = gql`
  mutation JoinMeeting($meetingId: uuid!, $password: String) {
    joinMeeting(meetingId: $meetingId, password: $password) {
      token
      url
    }
  }
`

export const EndMeetingMutation = gql`
  mutation EndMeeting($meetingId: uuid!) {
    endMeeting(meetingId: $meetingId) {
      id
      status
    }
  }
`

export const DeleteMeetingMutation = gql`
  mutation DeleteMeeting($meetingId: uuid!) {
    cancelMeeting(meetingId: $meetingId) {
      id
      status
    }
  }
`

// ─── Streams: metadata read (HASURA-direct) ──────────────────────────────────
export const StreamByIdQuery = gql`
  query StreamById($id: uuid!) {
    np_streams_by_pk(id: $id) {
      id
      title
      description
      is_live
      viewer_count
      stream_url
      thumbnail_url
      streamer {
        id
        name
        avatar_url
      }
    }
  }
`

// ─── Streams: live chat subscription (HASURA subscription) ───────────────────
export const StreamChatSubscription = gql`
  subscription StreamChat($streamId: uuid!) {
    np_stream_chat_messages(
      where: { stream_id: { _eq: $streamId } }
      order_by: { created_at: asc }
      limit: 200
    ) {
      id
      user_id
      user_name
      user_avatar_url
      message
      created_at
    }
  }
`

// ─── Streams: live viewer count subscription ─────────────────────────────────
export const StreamViewerCountSubscription = gql`
  subscription StreamViewerCount($streamId: uuid!) {
    np_streams_by_pk(id: $streamId) {
      id
      viewer_count
    }
  }
`

// ─── Streams: send chat + react (Actions, N-2-S3p — backend pending) ─────────
export const SendStreamChatMutation = gql`
  mutation SendStreamChat($streamId: uuid!, $message: String!) {
    sendStreamChat(streamId: $streamId, message: $message) {
      id
    }
  }
`

export const ReactToStreamMutation = gql`
  mutation ReactToStream($streamId: uuid!, $type: String!) {
    reactToStream(streamId: $streamId, type: $type) {
      ok
    }
  }
`

export const FollowStreamerMutation = gql`
  mutation FollowStreamer($streamerId: uuid!) {
    followUser(userId: $streamerId) {
      ok
    }
  }
`
