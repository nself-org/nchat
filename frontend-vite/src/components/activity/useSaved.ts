/**
 * Purpose:    Saved-messages data hook for the Vite SPA. Replaces the legacy zustand
 *             useSavedStore with urql against Hasura, while preserving the same derived views
 *             the pages need: filtered+sorted list, collections, per-collection lookups, tags,
 *             stats, and CRUD actions. Exposes a Result so pages drive AsyncScreen.
 *             Raw row shapes and normalizers extracted to saved-normalizers.ts.
 * Inputs:     none (filter/sort/search/collection selection are internal state + setters).
 * Outputs:    rich object — see UseSaved interface below.
 * Constraints:Server data in urql cache (canonical §6); filtering/sorting computed client-side.
 *             Backend saved tables not live yet → result surfaces error/empty gracefully.
 * SOT:        F-NCHAT-VITE-SAVED-HOOK-01
 */
import { useCallback, useMemo, useState } from 'react'
import { useMutation, useQuery, type CombinedError } from 'urql'
import { ok, err, type AppError, type Result } from '@nself/errors'

import {
  CreateCollectionDocument,
  DeleteCollectionDocument,
  RemoveSavedDocument,
  SavedDataDocument,
  SetCollectionMembershipDocument,
  ToggleStarDocument,
} from './saved.queries'
import {
  type CollectionDraft,
  type SavedCollection,
  type SavedFilters,
  type SavedMessage,
  type SavedSortBy,
  type SavedSortOrder,
  type SavedStats,
} from './saved-types'
import { normCollection, normSaved, type SavedData } from './saved-normalizers'

function toAppError(error: CombinedError): AppError {
  const status = (error.response as { status?: number } | undefined)?.status
  if (status === 429) return { code: 'rate_limited', status: 429, message: error.message }
  if (status === 401) return { code: 'auth_failed', status: 401, message: error.message }
  if (status === 403) return { code: 'forbidden', status: 403, message: error.message }
  return { code: 'internal', status: 500, message: error.message }
}

// ─── Pure filter/sort ─────────────────────────────────────────────────────────────

function applyFilters(
  messages: SavedMessage[],
  filters: SavedFilters,
  search: string,
  selectedTags: string[],
  collectionId: string | null,
): SavedMessage[] {
  const q = search.trim().toLowerCase()
  return messages.filter((m) => {
    if (collectionId && !m.collectionIds.includes(collectionId)) return false
    if (filters.starredOnly && !m.isStarred) return false
    if (filters.hasAttachments && !m.hasAttachments) return false
    if (selectedTags.length && !selectedTags.every((t) => m.tags.includes(t))) return false
    if (q && !m.content.toLowerCase().includes(q) && !m.note?.toLowerCase().includes(q)) return false
    return true
  })
}

function applySort(messages: SavedMessage[], by: SavedSortBy, order: SavedSortOrder): SavedMessage[] {
  const dir = order === 'asc' ? 1 : -1
  return [...messages].sort((a, b) => {
    switch (by) {
      case 'channel':
        return a.channelName.localeCompare(b.channelName) * dir
      case 'savedAt':
      default:
        return (a.savedAt.getTime() - b.savedAt.getTime()) * dir
    }
  })
}

export interface UseSaved {
  result: Result<SavedMessage[], AppError> | 'loading'
  /** Raw query result for collection-only pages (collections list / detail). */
  collectionsResult: Result<SavedCollection[], AppError> | 'loading'
  messages: SavedMessage[]
  collections: SavedCollection[]
  stats: SavedStats
  availableTags: string[]
  // filter/sort state
  filters: SavedFilters
  setFilters: (f: SavedFilters) => void
  clearFilters: () => void
  sortBy: SavedSortBy
  sortOrder: SavedSortOrder
  setSort: (by: SavedSortBy, order: SavedSortOrder) => void
  searchQuery: string
  setSearchQuery: (q: string) => void
  selectedTags: string[]
  setSelectedTags: (t: string[]) => void
  selectedCollectionId: string | null
  setSelectedCollection: (id: string | null) => void
  // lookups
  getCollection: (id: string) => SavedCollection | undefined
  getCollectionMessages: (id: string) => SavedMessage[]
  // actions
  createCollection: (draft: CollectionDraft) => void
  deleteCollection: (id: string) => void
  removeSaved: (id: string) => void
  toggleStar: (id: string) => void
  setMembership: (savedId: string, collectionIds: string[]) => void
  refresh: () => void
}

export function useSaved(): UseSaved {
  const [filters, setFiltersState] = useState<SavedFilters>({})
  const [sortBy, setSortBy] = useState<SavedSortBy>('savedAt')
  const [sortOrder, setSortOrder] = useState<SavedSortOrder>('desc')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedCollectionId, setSelectedCollection] = useState<string | null>(null)

  const [{ data, fetching, error }, reexecute] = useQuery<SavedData>({
    query: SavedDataDocument,
    requestPolicy: 'cache-and-network',
  })

  const [, runCreate] = useMutation(CreateCollectionDocument)
  const [, runDelete] = useMutation(DeleteCollectionDocument)
  const [, runRemove] = useMutation(RemoveSavedDocument)
  const [, runToggle] = useMutation(ToggleStarDocument)
  const [, runMembership] = useMutation(SetCollectionMembershipDocument)

  const allMessages = useMemo(() => (data?.saved ?? []).map(normSaved), [data])
  const collections = useMemo(() => (data?.collections ?? []).map(normCollection), [data])

  const availableTags = useMemo(() => {
    const set = new Set<string>()
    for (const m of allMessages) for (const t of m.tags) set.add(t)
    return [...set].sort()
  }, [allMessages])

  const messages = useMemo(() => {
    const filtered = applyFilters(allMessages, filters, searchQuery, selectedTags, selectedCollectionId)
    return applySort(filtered, sortBy, sortOrder)
  }, [allMessages, filters, searchQuery, selectedTags, selectedCollectionId, sortBy, sortOrder])

  const stats = useMemo<SavedStats>(
    () => ({
      totalSaved: allMessages.length,
      totalStarred: data?.starred.aggregate?.count ?? allMessages.filter((m) => m.isStarred).length,
    }),
    [allMessages, data],
  )

  const result = useMemo<Result<SavedMessage[], AppError> | 'loading'>(() => {
    if (fetching && allMessages.length === 0 && collections.length === 0) return 'loading'
    if (error) return err(toAppError(error))
    return ok(messages)
  }, [fetching, error, allMessages.length, collections.length, messages])

  const collectionsResult = useMemo<Result<SavedCollection[], AppError> | 'loading'>(() => {
    if (fetching && collections.length === 0) return 'loading'
    if (error) return err(toAppError(error))
    return ok(collections)
  }, [fetching, error, collections])

  const refresh = useCallback(() => reexecute({ requestPolicy: 'network-only' }), [reexecute])

  return {
    result,
    collectionsResult,
    messages,
    collections,
    stats,
    availableTags,
    filters,
    setFilters: setFiltersState,
    clearFilters: useCallback(() => {
      setFiltersState({})
      setSearchQuery('')
      setSelectedTags([])
    }, []),
    sortBy,
    sortOrder,
    setSort: useCallback((by: SavedSortBy, order: SavedSortOrder) => {
      setSortBy(by)
      setSortOrder(order)
    }, []),
    searchQuery,
    setSearchQuery,
    selectedTags,
    setSelectedTags,
    selectedCollectionId,
    setSelectedCollection,
    getCollection: useCallback((id: string) => collections.find((c) => c.id === id), [collections]),
    getCollectionMessages: useCallback(
      (id: string) => allMessages.filter((m) => m.collectionIds.includes(id)),
      [allMessages],
    ),
    createCollection: useCallback(
      (draft: CollectionDraft) => {
        void runCreate({ ...draft, position: collections.length }).then(refresh)
      },
      [runCreate, collections.length, refresh],
    ),
    deleteCollection: useCallback(
      (id: string) => { void runDelete({ id }).then(refresh) },
      [runDelete, refresh],
    ),
    removeSaved: useCallback(
      (id: string) => { void runRemove({ id }).then(refresh) },
      [runRemove, refresh],
    ),
    toggleStar: useCallback(
      (id: string) => {
        const current = allMessages.find((m) => m.id === id)
        void runToggle({ id, isStarred: !current?.isStarred }).then(refresh)
      },
      [runToggle, allMessages, refresh],
    ),
    setMembership: useCallback(
      (savedId: string, collectionIds: string[]) => {
        const objects = collectionIds.map((cid) => ({ saved_message_id: savedId, collection_id: cid }))
        void runMembership({ savedId, collectionIds: objects }).then(refresh)
      },
      [runMembership, refresh],
    ),
    refresh,
  }
}
