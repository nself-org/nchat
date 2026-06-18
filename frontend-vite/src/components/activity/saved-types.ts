/**
 * Purpose:    Saved-messages + collections domain types for the Vite SPA, ported from the
 *             legacy lib/saved/saved-types.ts. Trimmed to what the ported /saved pages consume.
 *             (Co-located under components/activity/ to honour the build's hard-isolation rule —
 *             one group-local dir; the barrel re-exports for the saved pages.)
 * Inputs:     none (type-only).
 * Outputs:    SavedMessage, SavedCollection, SavedFilters, sort enums, SavedStats, export types.
 * Constraints:Mirrors Hasura np_saved_messages / np_saved_collections (source_account_id
 *             isolation). Dates are Date objects in the UI; the hook converts ISO ↔ Date.
 * SOT:        F-NCHAT-VITE-SAVED-TYPES-01
 */

/** Author/user shown on a saved message card. */
export interface SavedAuthor {
  id: string
  displayName: string
  avatarUrl?: string | null
}

/** A single saved/starred message. */
export interface SavedMessage {
  id: string
  messageId: string
  channelId: string
  channelName: string
  collectionIds: string[]
  savedAt: Date
  /** Message content (preview). */
  content: string
  author: SavedAuthor
  note?: string
  tags: string[]
  isStarred: boolean
  hasAttachments: boolean
  reminderAt?: Date | null
}

/** A collection grouping saved messages. */
export interface SavedCollection {
  id: string
  name: string
  description?: string
  icon?: string
  color?: string
  itemCount: number
  createdAt: Date
  updatedAt: Date
  position: number
  isShared: boolean
}

/** Input for creating/editing a collection (from the CreateCollection dialog). */
export interface CollectionDraft {
  name: string
  description?: string
  icon?: string
  color?: string
}

export type SavedSortBy = 'savedAt' | 'messageDate' | 'channel'
export type SavedSortOrder = 'asc' | 'desc'

/** Filter options for the saved list. */
export interface SavedFilters {
  starredOnly?: boolean
  hasAttachments?: boolean
  tags?: string[]
}

/** Aggregate counts shown in the saved sidebar header. */
export interface SavedStats {
  totalSaved: number
  totalStarred: number
}

export type ExportFormat = 'json' | 'markdown' | 'csv'
