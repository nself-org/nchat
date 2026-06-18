/**
 * Purpose:    Pure helpers for the activity feed — date bucketing + unread tallying.
 *             Ported from legacy activity-manager.ts grouping logic (no zustand store; the
 *             Vite app sources data from Hasura and computes derived views client-side).
 * Inputs:     FeedEntry[] (activity rows from GraphQL).
 * Outputs:    DateGroupedActivities[] and UnreadCounts.
 * Constraints:Pure, side-effect-free, deterministic given a fixed "now". Timestamps are ISO
 *             strings; aggregated entries use latestAt, singles use createdAt.
 * SOT:        F-NCHAT-VITE-ACTIVITY-GROUPING-01
 */
import {
  isAggregated,
  type ActivityCategory,
  type DateGroupedActivities,
  type FeedEntry,
  type UnreadCounts,
} from './activity-types'

/** Timestamp a feed entry sorts/groups by. */
function entryTime(entry: FeedEntry): number {
  const iso = isAggregated(entry) ? entry.latestAt : entry.createdAt
  return new Date(iso).getTime()
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/** Human label for a day relative to today. */
function dayLabel(ts: number, now: Date): string {
  const day = startOfDay(new Date(ts))
  const today = startOfDay(now)
  const oneDay = 86_400_000
  if (day === today) return 'Today'
  if (day === today - oneDay) return 'Yesterday'
  if (day > today - 7 * oneDay) return 'Earlier this week'
  if (day > today - 30 * oneDay) return 'Earlier this month'
  return 'Older'
}

/**
 * Group a flat feed into date buckets, newest first, preserving label order.
 */
export function groupByDate(entries: FeedEntry[], now: Date = new Date()): DateGroupedActivities[] {
  const sorted = [...entries].sort((a, b) => entryTime(b) - entryTime(a))
  const order = ['Today', 'Yesterday', 'Earlier this week', 'Earlier this month', 'Older']
  const buckets = new Map<string, FeedEntry[]>()

  for (const entry of sorted) {
    const label = dayLabel(entryTime(entry), now)
    const existing = buckets.get(label)
    if (existing) existing.push(entry)
    else buckets.set(label, [entry])
  }

  return order
    .filter((label) => buckets.has(label))
    .map((label) => {
      const activities = buckets.get(label) ?? []
      return {
        date: label,
        label,
        activities,
      }
    })
}

/** Tally unread totals overall + per category. */
export function computeUnread(entries: FeedEntry[]): UnreadCounts {
  const byCategory: Partial<Record<ActivityCategory, number>> = {}
  let total = 0
  for (const entry of entries) {
    if (entry.isRead) continue
    total += 1
    byCategory[entry.category] = (byCategory[entry.category] ?? 0) + 1
  }
  return { total, byCategory }
}

/** Filter the feed to a category ('all' = no filter). */
export function filterByCategory(entries: FeedEntry[], category: ActivityCategory): FeedEntry[] {
  if (category === 'all') return entries
  return entries.filter((e) => e.category === category)
}
