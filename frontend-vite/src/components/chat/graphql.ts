/**
 * Purpose:    Group-local GraphQL documents + helpers for the ported chat / channels /
 *             drafts / dm / bookmarks pages. These are hand-written gql strings against
 *             the documented Hasura contracts (P3 nchat-api-migration-tickets.md
 *             Wave N-2-S2: HASURA-direct CRUD on np_channels / np_messages / np_bookmarks /
 *             np_drafts). Codegen types are not generated yet in frontend-vite, so the
 *             result shapes are typed locally here. When `pnpm codegen` lands, replace these
 *             with imports from src/generated/graphql.ts (canonical-patterns §2).
 * Inputs:     none (pure module — documents + a urql→AppError adapter + Result helper).
 * Outputs:    gql document strings, row TS types, and resultFromUrql().
 * Constraints:HASURA-direct only. Authz enforced by Hasura permissions + RLS + the
 *             Multi-Tenant Convention Wall (source_account_id). No raw fetch, no next/*.
 * SOT:        F-NCHAT-VITE-CHAT-GQL-01
 */
import type { CombinedError } from 'urql'
import { combinedErrorToAppError } from '@nself/graphql-client'
import { ok, err, type Result } from '@nself/errors'
import type { AppError } from '@nself/errors'

// ─── Row shapes (local until codegen) ───────────────────────────────────────────

export interface ChannelRow {
  readonly id: string
  readonly name: string
  readonly slug: string
  readonly description: string | null
  readonly type: string
  readonly topic: string | null
  readonly is_archived: boolean
  readonly member_count: number
  readonly last_message_at: string | null
  readonly last_message_preview: string | null
}

export interface MessageRow {
  readonly id: string
  readonly channel_id: string
  readonly content: string
  readonly type: string
  readonly created_at: string
  readonly edited_at: string | null
  readonly is_pinned: boolean
  readonly user_id: string
  readonly user: {
    readonly id: string
    readonly username: string | null
    readonly display_name: string | null
    readonly avatar_url: string | null
    readonly role: string | null
  } | null
}

export interface BookmarkRow {
  readonly id: string
  readonly created_at: string
  readonly note: string | null
  readonly message: MessageRow | null
}

export interface DraftRow {
  readonly id: string
  readonly context_type: string
  readonly context_id: string
  readonly content: string
  readonly updated_at: string
}

export interface ChannelStats {
  readonly totalChannels: number
  readonly publicChannels: number
  readonly privateChannels: number
  readonly totalMembers: number
}

// ─── Documents (Wave N-2-S2 HASURA-direct contracts) ─────────────────────────────

/** Recent channels for the home dashboard (chat/page). */
export const RECENT_CHANNELS = /* GraphQL */ `
  query RecentChannels($limit: Int = 5) {
    np_channels(
      where: { is_archived: { _eq: false } }
      order_by: { last_message_at: desc_nulls_last }
      limit: $limit
    ) {
      id name slug description type topic is_archived member_count
      last_message_at last_message_preview
    }
  }
`

/** Full browse list + aggregate stats (channels/browse page). */
export const BROWSE_CHANNELS = /* GraphQL */ `
  query BrowseChannels($limit: Int = 50, $offset: Int = 0, $search: String) {
    np_channels(
      where: {
        is_archived: { _eq: false }
        _or: [
          { name: { _ilike: $search } }
          { description: { _ilike: $search } }
        ]
      }
      order_by: { member_count: desc }
      limit: $limit
      offset: $offset
    ) {
      id name slug description type topic is_archived member_count
      last_message_at last_message_preview
    }
    total: np_channels_aggregate(where: { is_archived: { _eq: false } }) {
      aggregate { count }
    }
    publicCount: np_channels_aggregate(
      where: { is_archived: { _eq: false }, type: { _eq: "public" } }
    ) {
      aggregate { count }
    }
    privateCount: np_channels_aggregate(
      where: { is_archived: { _eq: false }, type: { _eq: "private" } }
    ) {
      aggregate { count sum { member_count } }
    }
  }
`

/** Single channel by slug (chat/channel/:slug page). */
export const CHANNEL_BY_SLUG = /* GraphQL */ `
  query ChannelBySlug($slug: String!) {
    np_channels(where: { slug: { _eq: $slug } }, limit: 1) {
      id name slug description type topic is_archived member_count
      last_message_at last_message_preview
    }
  }
`

/** Messages for a channel — real-time via subscription per N-2-S2e. */
export const CHANNEL_MESSAGES = /* GraphQL */ `
  query ChannelMessages($channelId: uuid!, $limit: Int = 50) {
    np_messages(
      where: { channel_id: { _eq: $channelId } }
      order_by: { created_at: asc }
      limit: $limit
    ) {
      id channel_id content type created_at edited_at is_pinned user_id
      user { id username display_name avatar_url role }
    }
  }
`

/** Channel membership mutations (N-2-S2a / N-2-S3y). */
export const JOIN_CHANNEL = /* GraphQL */ `
  mutation JoinChannel($channelId: uuid!) {
    insert_np_channel_members_one(
      object: { channel_id: $channelId }
      on_conflict: { constraint: np_channel_members_pkey, update_columns: [] }
    ) {
      channel_id user_id
    }
  }
`

export const LEAVE_CHANNEL = /* GraphQL */ `
  mutation LeaveChannel($channelId: uuid!) {
    delete_np_channel_members(where: { channel_id: { _eq: $channelId } }) {
      affected_rows
    }
  }
`

/** Bookmarks list for the bookmarks page (N-2-S2l). */
export const LIST_BOOKMARKS = /* GraphQL */ `
  query ListBookmarks {
    np_bookmarks(order_by: { created_at: desc }) {
      id created_at note
      message {
        id channel_id content type created_at edited_at is_pinned user_id
        user { id username display_name avatar_url role }
      }
    }
  }
`

/** Saved messages list (bookmarks page — "Saved" tab; N-2-S3-saved-messages). */
export const LIST_SAVED_MESSAGES = /* GraphQL */ `
  query ListSavedMessages {
    np_saved_messages(order_by: { created_at: desc }) {
      id created_at note
      message {
        id channel_id content type created_at edited_at is_pinned user_id
        user { id username display_name avatar_url role }
      }
    }
  }
`

/** Drafts list for the drafts page (N-2-S2l misc-singles). */
export const LIST_DRAFTS = /* GraphQL */ `
  query ListDrafts {
    np_drafts(order_by: { updated_at: desc }) {
      id context_type context_id content updated_at
    }
  }
`

export const DELETE_DRAFT = /* GraphQL */ `
  mutation DeleteDraft($id: uuid!) {
    delete_np_drafts_by_pk(id: $id) { id }
  }
`

export const DELETE_ALL_DRAFTS = /* GraphQL */ `
  mutation DeleteAllDrafts {
    delete_np_drafts(where: {}) { affected_rows }
  }
`

// ─── urql → Result<T,AppError> adapter ───────────────────────────────────────────

/**
 * Convert a urql query state into the AsyncScreen contract.
 * Returns the string sentinel 'loading' while in-flight, an Err(AppError) on
 * failure, or Ok(data) once resolved (canonical-patterns §4).
 */
export function resultFromUrql<T>(
  fetching: boolean,
  error: CombinedError | undefined,
  data: T | undefined,
): Result<T, AppError> | 'loading' {
  if (fetching && data === undefined) return 'loading'
  if (error) return err(combinedErrorToAppError(error))
  return ok((data ?? (undefined as unknown as T)))
}
