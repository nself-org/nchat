/**
 * Purpose:    Activity-feed domain types for the ɳChat Vite SPA, ported faithfully from the
 *             legacy frontend/src/lib/activity/activity-types.ts. Trimmed to the surface the
 *             ported /activity page + its components consume (full union preserved for the
 *             feed item discriminators).
 * Inputs:     none (type-only module).
 * Outputs:    ActivityCategory/Type, ActivityItem union, AggregatedActivity, grouping types,
 *             UnreadCounts, and the GraphQL row shape returned by useActivityFeed.
 * Constraints:Type-only — no runtime. Mirrors Hasura `np_activities` columns (source_account_id
 *             isolation, per multi-tenant convention wall). Display logic lives in components.
 * SOT:        F-NCHAT-VITE-ACTIVITY-TYPES-01
 */

export type ActivityType =
  | 'message'
  | 'reaction'
  | 'mention'
  | 'reply'
  | 'thread_reply'
  | 'channel_created'
  | 'channel_archived'
  | 'channel_unarchived'
  | 'member_joined'
  | 'member_left'
  | 'member_invited'
  | 'file_shared'
  | 'call_started'
  | 'call_ended'
  | 'reminder_due'
  | 'task_completed'
  | 'task_assigned'
  | 'integration_event'
  | 'system'

export type ActivityCategory =
  | 'all'
  | 'mentions'
  | 'threads'
  | 'reactions'
  | 'files'
  | 'channels'
  | 'members'
  | 'calls'
  | 'tasks'
  | 'integrations'

export type ActivityPriority = 'low' | 'normal' | 'high' | 'urgent'

/** Minimal actor shape used by the feed rows + avatars. */
export interface ActivityActor {
  id: string
  username?: string
  displayName: string
  avatarUrl?: string | null
}

/** Optional channel context for an activity row. */
export interface ActivityChannelRef {
  id: string
  name: string
  slug: string
}

/**
 * ActivityItem — the row shape returned by the activity GraphQL query.
 * A flattened projection of the legacy discriminated union: the feed page only needs
 * type/category/actor/read-state/timestamp + an optional title/preview for display.
 */
export interface ActivityItem {
  id: string
  type: ActivityType
  category: ActivityCategory
  priority: ActivityPriority
  actor: ActivityActor
  channel?: ActivityChannelRef | null
  /** Headline text (e.g. "Alice mentioned you"). */
  title: string
  /** Optional secondary preview line (e.g. message excerpt). */
  preview?: string | null
  /** Deep-link target within the app (e.g. /chat/channel/general?message=1). */
  href?: string | null
  createdAt: string
  isRead: boolean
}

/** Aggregated activity (e.g. "5 people reacted"). Display-compatible with ActivityItem. */
export interface AggregatedActivity {
  id: string
  type: ActivityType
  category: ActivityCategory
  priority: ActivityPriority
  actors: ActivityActor[]
  count: number
  title: string
  preview?: string | null
  href?: string | null
  channel?: ActivityChannelRef | null
  latestAt: string
  isRead: boolean
}

export type FeedEntry = ActivityItem | AggregatedActivity

/** True when the entry is an aggregation bucket rather than a single activity. */
export function isAggregated(entry: FeedEntry): entry is AggregatedActivity {
  return 'count' in entry && Array.isArray((entry as AggregatedActivity).actors)
}

/** Activities bucketed under a human date label (Today / Yesterday / …). */
export interface DateGroupedActivities {
  date: string
  label: string
  activities: FeedEntry[]
}

/** Unread totals overall + per-category (drives the filter-tab badges). */
export interface UnreadCounts {
  total: number
  byCategory: Partial<Record<ActivityCategory, number>>
}

/** Ordered category list shown as filter tabs. */
export const ACTIVITY_CATEGORIES: ReadonlyArray<{ id: ActivityCategory; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'mentions', label: 'Mentions' },
  { id: 'threads', label: 'Threads' },
  { id: 'reactions', label: 'Reactions' },
  { id: 'files', label: 'Files' },
  { id: 'channels', label: 'Channels' },
  { id: 'members', label: 'Members' },
  { id: 'calls', label: 'Calls' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'integrations', label: 'Integrations' },
]
