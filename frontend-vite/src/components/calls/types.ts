/**
 * Purpose:    Hand-written domain types for the calls / meetings / streams ported pages.
 *             These mirror the Hasura row shapes documented in the P3 API-migration ledger
 *             (np_calls, np_meetings, np_streams). Replace with codegen types once
 *             `pnpm codegen` runs against the live Hasura schema (canonical §2).
 * Inputs:     none (type-only module).
 * Outputs:    Call, Meeting, Stream domain types + supporting enums/inputs.
 * Constraints:Type-only. snake_case fields match the GraphQL/Hasura column names exactly so
 *             the documents in graphql.ts select them without aliasing surprises.
 * SOT:        F-NCHAT-VITE-CALLS-TYPES-01
 */

// ─── Calls (N-2-S2h history reads; token mint = BFF N-2-S5) ──────────────────
export type CallType = 'voice' | 'video'
export type CallState = 'ringing' | 'connecting' | 'connected' | 'ended' | 'missed'

export interface Call {
  readonly id: string
  readonly call_type: CallType
  readonly state: CallState
  readonly started_at: string | null
  readonly ended_at: string | null
  readonly duration_seconds: number | null
  readonly host_id: string
  readonly host_name: string | null
  readonly participant_count: number
}

// ─── Meetings (N-2-S3j lifecycle Actions; token mint = BFF) ──────────────────
export type RoomType = 'video' | 'audio' | 'screenshare'
export type MeetingStatus = 'scheduled' | 'live' | 'ended' | 'cancelled'
export type RecurrencePattern = 'daily' | 'weekly' | 'biweekly' | 'monthly'
export type ReminderTiming = '5min' | '15min' | '30min' | '1hour' | '1day'

export interface Meeting {
  readonly id: string
  readonly meeting_code: string
  readonly title: string
  readonly description: string | null
  readonly room_type: RoomType
  readonly status: MeetingStatus
  readonly scheduled_start_at: string
  readonly scheduled_end_at: string | null
  readonly timezone: string | null
  readonly host_id: string
  readonly is_private: boolean
  readonly has_password: boolean
  readonly participant_count: number
}

/** Input for the createMeeting Action (N-2-S3j). Mirrors legacy CreateMeetingInput. */
export interface CreateMeetingInput {
  readonly title: string
  readonly description?: string
  readonly room_type: RoomType
  readonly scheduled_start_at: string
  readonly scheduled_end_at: string
  readonly timezone: string
  readonly is_private: boolean
  readonly password?: string
  readonly is_recurring: boolean
  readonly recurrence_pattern?: RecurrencePattern
  readonly recurrence_interval?: number
  readonly participant_ids: readonly string[]
  readonly reminder_timings: readonly ReminderTiming[]
  readonly mute_on_join: boolean
  readonly video_off_on_join: boolean
  readonly allow_screen_share: boolean
  readonly waiting_room: boolean
  readonly enable_chat: boolean
}

// ─── Streams (N-2-S3p lifecycle Actions; token mint = BFF N-2-S5) ────────────
export interface StreamStreamer {
  readonly id: string
  readonly name: string
  readonly avatar_url: string | null
}

export interface Stream {
  readonly id: string
  readonly title: string
  readonly description: string | null
  readonly is_live: boolean
  readonly viewer_count: number
  readonly stream_url: string | null
  readonly thumbnail_url: string | null
  readonly streamer: StreamStreamer
}

export interface StreamChatMessage {
  readonly id: string
  readonly user_id: string
  readonly user_name: string
  readonly user_avatar_url?: string | null
  readonly message: string
  readonly created_at: string
}

export type StreamReactionType = 'heart' | 'thumbsup' | 'smile' | 'fire' | 'clap'
