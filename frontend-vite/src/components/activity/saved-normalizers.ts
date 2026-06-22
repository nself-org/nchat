/**
 * Purpose:    Raw Hasura row shapes (snake_case) and normalizer functions that map them to
 *             the camelCase domain types used throughout the Vite SPA saved-messages feature.
 *             Extracted from useSaved.ts to stay within the 300-line file cap.
 * Inputs:     RawCollection and RawSaved rows from the Hasura SavedData query.
 * Outputs:    normCollection → SavedCollection, normSaved → SavedMessage, SavedData interface.
 * Constraints:Pure mapping — no side effects, no React hooks, no mutations.
 * SOT:        F-NCHAT-VITE-SAVED-HOOK-01
 */
import type { SavedCollection, SavedMessage } from './saved-types'

// ─── Raw row shapes (Hasura snake_case) ──────────────────────────────────────────

export interface RawCollection {
  id: string
  name: string
  description?: string | null
  icon?: string | null
  color?: string | null
  item_count: number
  created_at: string
  updated_at: string
  position: number
  is_shared: boolean
}

export interface RawSaved {
  id: string
  message_id: string
  channel_id: string
  channel_name: string
  saved_at: string
  content: string
  note?: string | null
  tags?: string[] | null
  is_starred: boolean
  has_attachments: boolean
  reminder_at?: string | null
  author: { id: string; display_name: string; avatar_url?: string | null }
  collection_items: { collection_id: string }[]
}

export interface SavedData {
  collections: RawCollection[]
  saved: RawSaved[]
  starred: { aggregate: { count: number } | null }
}

/** Maps a raw Hasura collection row to the domain SavedCollection shape. */
export function normCollection(r: RawCollection): SavedCollection {
  return {
    id: r.id,
    name: r.name,
    description: r.description ?? undefined,
    icon: r.icon ?? undefined,
    color: r.color ?? undefined,
    itemCount: r.item_count,
    createdAt: new Date(r.created_at),
    updatedAt: new Date(r.updated_at),
    position: r.position,
    isShared: r.is_shared,
  }
}

/** Maps a raw Hasura saved-message row to the domain SavedMessage shape. */
export function normSaved(r: RawSaved): SavedMessage {
  return {
    id: r.id,
    messageId: r.message_id,
    channelId: r.channel_id,
    channelName: r.channel_name,
    collectionIds: r.collection_items.map((c) => c.collection_id),
    savedAt: new Date(r.saved_at),
    content: r.content,
    note: r.note ?? undefined,
    tags: r.tags ?? [],
    isStarred: r.is_starred,
    hasAttachments: r.has_attachments,
    reminderAt: r.reminder_at ? new Date(r.reminder_at) : null,
    author: {
      id: r.author.id,
      displayName: r.author.display_name,
      avatarUrl: r.author.avatar_url ?? null,
    },
  }
}
