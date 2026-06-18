/**
 * Purpose:    Activity-feed data hook for the Vite SPA. Replaces the legacy zustand
 *             useActivityFeed (which read from a socket-fed store) with urql against Hasura.
 *             Exposes the same surface the page needs: feed entries, grouped-by-date view,
 *             unread counts, category filter, pagination, and read mutations — wrapped in a
 *             Result<T,AppError> so the page can drive AsyncScreen's 7 states.
 * Inputs:     none (category + paging are internal state, mutated via returned setters).
 * Outputs:    { result, entries, grouped, unread, activeCategory, setCategory, hasMore,
 *               loadMore, refresh, refreshing, markAsRead, markAllAsRead }.
 * Constraints:Server data lives in urql cache (canonical §6) — derived views (grouping,
 *             unread) are computed, never duplicated into local state. Maps urql CombinedError
 *             → AppError so AsyncScreen classifies offline/permission/rate-limit/generic.
 *             Backend np_activities not live yet → result will surface error/empty gracefully.
 * SOT:        F-NCHAT-VITE-ACTIVITY-HOOK-01
 */
import { useCallback, useMemo, useState } from 'react'
import { useMutation, useQuery, type CombinedError } from 'urql'
import { ok, err, type AppError, type Result } from '@nself/errors'

import {
  ActivityFeedDocument,
  MarkActivityReadDocument,
  MarkAllActivitiesReadDocument,
} from './activity.queries'
import { computeUnread, filterByCategory, groupByDate } from './activity-grouping'
import {
  type ActivityCategory,
  type ActivityItem,
  type DateGroupedActivities,
  type FeedEntry,
  type UnreadCounts,
} from './activity-types'

const PAGE_SIZE = 25

/** Map a urql CombinedError to the AppError shape AsyncScreen classifies. */
function toAppError(error: CombinedError): AppError {
  const status = (error.response as { status?: number } | undefined)?.status
  if (status === 429) return { code: 'rate_limited', status: 429, message: error.message }
  if (status === 401) return { code: 'auth_failed', status: 401, message: error.message }
  if (status === 403) return { code: 'forbidden', status: 403, message: error.message }
  return { code: 'internal', status: 500, message: error.message }
}

interface RawActor {
  id: string
  username?: string | null
  display_name: string
  avatar_url?: string | null
}
interface RawChannel {
  id: string
  name: string
  slug: string
}
interface RawActivity {
  id: string
  type: ActivityItem['type']
  category: ActivityCategory
  priority: ActivityItem['priority']
  title: string
  preview?: string | null
  href?: string | null
  created_at: string
  is_read: boolean
  actor: RawActor
  channel?: RawChannel | null
}
interface ActivityFeedData {
  activities: RawActivity[]
  activities_aggregate: { aggregate: { count: number } | null }
}

/** Normalize a Hasura row to the camelCase ActivityItem the UI consumes. */
function normalize(row: RawActivity): ActivityItem {
  return {
    id: row.id,
    type: row.type,
    category: row.category,
    priority: row.priority,
    title: row.title,
    preview: row.preview ?? null,
    href: row.href ?? null,
    createdAt: row.created_at,
    isRead: row.is_read,
    actor: {
      id: row.actor.id,
      username: row.actor.username ?? undefined,
      displayName: row.actor.display_name,
      avatarUrl: row.actor.avatar_url ?? null,
    },
    channel: row.channel
      ? { id: row.channel.id, name: row.channel.name, slug: row.channel.slug }
      : null,
  }
}

export interface UseActivityFeed {
  /** Result<FeedEntry[], AppError> | 'loading' — drive AsyncScreen with this. */
  result: Result<FeedEntry[], AppError> | 'loading'
  entries: FeedEntry[]
  grouped: DateGroupedActivities[]
  unread: UnreadCounts
  activeCategory: ActivityCategory
  setCategory: (category: ActivityCategory) => void
  hasMore: boolean
  loadMore: () => void
  refresh: () => void
  refreshing: boolean
  markAsRead: (id: string) => void
  markAllAsRead: () => void
}

export function useActivityFeed(): UseActivityFeed {
  const [activeCategory, setActiveCategory] = useState<ActivityCategory>('all')
  const [limit, setLimit] = useState(PAGE_SIZE)

  const [{ data, fetching, error, stale }, reexecute] = useQuery<ActivityFeedData>({
    query: ActivityFeedDocument,
    variables: {
      limit,
      offset: 0,
      // 'all' → null so the where-clause matches every category.
      category: activeCategory === 'all' ? null : activeCategory,
    },
    requestPolicy: 'cache-and-network',
  })

  const [, runMarkRead] = useMutation(MarkActivityReadDocument)
  const [, runMarkAllRead] = useMutation(MarkAllActivitiesReadDocument)

  const entries = useMemo<FeedEntry[]>(
    () => (data?.activities ?? []).map(normalize),
    [data],
  )

  // Server already filters by category; apply client filter as a defensive pass
  // (and so 'all' stays a pure passthrough even if the API ignores the arg).
  const filtered = useMemo(
    () => filterByCategory(entries, activeCategory),
    [entries, activeCategory],
  )

  const grouped = useMemo(() => groupByDate(filtered), [filtered])

  const unread = useMemo<UnreadCounts>(() => {
    const serverTotal = data?.activities_aggregate.aggregate?.count
    const computed = computeUnread(entries)
    return typeof serverTotal === 'number'
      ? { total: serverTotal, byCategory: computed.byCategory }
      : computed
  }, [data, entries])

  const result = useMemo<Result<FeedEntry[], AppError> | 'loading'>(() => {
    if (fetching && entries.length === 0) return 'loading'
    if (error) return err(toAppError(error))
    return ok(filtered)
  }, [fetching, error, entries.length, filtered])

  const setCategory = useCallback((category: ActivityCategory) => {
    setActiveCategory(category)
    setLimit(PAGE_SIZE)
  }, [])

  const hasMore = entries.length >= limit
  const loadMore = useCallback(() => setLimit((n) => n + PAGE_SIZE), [])
  const refresh = useCallback(
    () => reexecute({ requestPolicy: 'network-only' }),
    [reexecute],
  )

  const markAsRead = useCallback(
    (id: string) => {
      void runMarkRead({ id })
    },
    [runMarkRead],
  )
  const markAllAsRead = useCallback(() => {
    void runMarkAllRead({})
  }, [runMarkAllRead])

  return {
    result,
    entries: filtered,
    grouped,
    unread,
    activeCategory,
    setCategory,
    hasMore,
    loadMore,
    refresh,
    refreshing: fetching || stale,
    markAsRead,
    markAllAsRead,
  }
}
