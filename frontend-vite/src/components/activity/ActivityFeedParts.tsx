/**
 * Purpose:    Presentational parts of the activity feed — UnreadBanner, ActivityLoading
 *             skeletons, ActivityEmpty, ActivityRow, and the date-grouped ActivityList.
 *             Ported from the legacy ActivityLoading / ActivityEmpty / ActivityItem set.
 * Inputs:     see each component's props.
 * Outputs:    JSX for each feed sub-view.
 * Constraints:Purely presentational — no data fetching, no business logic (canonical §4).
 *             Relative-time formatting is local (Intl.RelativeTimeFormat). RTL-safe spacing.
 * SOT:        F-NCHAT-VITE-ACTIVITY-PARTS-01
 */
import { iconForType } from './ActivityIcons'
import {
  isAggregated,
  type ActivityCategory,
  type DateGroupedActivities,
  type FeedEntry,
} from './activity-types'

// ─── Unread banner ──────────────────────────────────────────────────────────────

export function UnreadBanner({
  count,
  onMarkAllAsRead,
}: {
  count: number
  onMarkAllAsRead: () => void
}) {
  return (
    <div className="flex items-center justify-between border-b border-sky-500/20 bg-sky-500/10 px-6 py-2.5">
      <span className="text-sm text-sky-200">
        {count} unread {count === 1 ? 'activity' : 'activities'}
      </span>
      <button
        type="button"
        onClick={onMarkAllAsRead}
        className="text-sm font-medium text-sky-300 hover:text-sky-100"
      >
        Mark all as read
      </button>
    </div>
  )
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────────

export function ActivityLoading({ count = 8 }: { count?: number }) {
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex animate-pulse gap-3 rounded-lg p-3">
          <div className="h-9 w-9 shrink-0 rounded-full bg-slate-800" />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-3 w-3/5 rounded bg-slate-800" />
            <div className="h-2.5 w-2/5 rounded bg-slate-800/70" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────────

const EMPTY_COPY: Partial<Record<ActivityCategory, string>> = {
  all: "You're all caught up. New activity will show up here.",
  mentions: 'No mentions yet. When someone @-mentions you it lands here.',
  threads: 'No thread replies yet.',
  reactions: 'No reactions on your messages yet.',
  files: 'No files have been shared with you yet.',
  channels: 'No channel activity yet.',
  members: 'No member changes yet.',
  calls: 'No call activity yet.',
  tasks: 'No task activity yet.',
  integrations: 'No integration events yet.',
}

export function ActivityEmpty({ category }: { category: ActivityCategory }) {
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center gap-2 py-16 text-center"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 text-slate-400">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      </div>
      <h2 className="text-base font-semibold text-slate-200">Nothing here yet</h2>
      <p className="max-w-xs text-sm text-slate-400">
        {EMPTY_COPY[category] ?? EMPTY_COPY.all}
      </p>
    </div>
  )
}

// ─── Relative time ────────────────────────────────────────────────────────────────

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  const diffSec = Math.round((then - Date.now()) / 1000)
  const abs = Math.abs(diffSec)
  if (abs < 60) return rtf.format(Math.round(diffSec), 'second')
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour')
  return rtf.format(Math.round(diffSec / 86400), 'day')
}

// ─── Single feed row ───────────────────────────────────────────────────────────────

export function ActivityRow({
  entry,
  onSelect,
}: {
  entry: FeedEntry
  onSelect: (entry: FeedEntry) => void
}) {
  const Icon = iconForType(entry.type)
  const when = isAggregated(entry) ? entry.latestAt : entry.createdAt
  const actorLabel = isAggregated(entry)
    ? `${entry.actors[0]?.displayName ?? 'Someone'}${entry.count > 1 ? ` and ${entry.count - 1} others` : ''}`
    : entry.actor.displayName

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(entry)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(entry)
        }
      }}
      className={[
        'group relative flex cursor-pointer gap-3 rounded-lg p-3 transition-colors hover:bg-slate-800/60',
        entry.isRead ? '' : 'bg-sky-500/5',
      ].join(' ')}
    >
      {!entry.isRead && (
        <span className="absolute start-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-e-full bg-sky-500" />
      )}
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-800 text-sky-300">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className={['text-sm text-slate-200', entry.isRead ? '' : 'font-medium'].join(' ')}>
          <span className="font-medium text-slate-100">{actorLabel}</span> {entry.title}
        </p>
        {entry.preview && (
          <p className="mt-0.5 truncate text-xs text-slate-400">{entry.preview}</p>
        )}
        <p className="mt-1 flex items-center gap-2 text-xs text-slate-500">
          {entry.channel && <span className="text-slate-400">#{entry.channel.slug}</span>}
          <span>{relativeTime(when)}</span>
        </p>
      </div>
    </div>
  )
}

// ─── Date-grouped list ─────────────────────────────────────────────────────────────

export function ActivityList({
  groups,
  onSelect,
}: {
  groups: DateGroupedActivities[]
  onSelect: (entry: FeedEntry) => void
}) {
  return (
    <>
      {groups.map((group) => (
        <section key={group.label} className="mb-6">
          <div className="mb-2 flex items-center gap-3 py-2">
            <div className="h-px flex-1 bg-slate-800" />
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
              {group.label}
            </span>
            <div className="h-px flex-1 bg-slate-800" />
          </div>
          <div className="space-y-1">
            {group.activities.map((entry) => (
              <ActivityRow key={entry.id} entry={entry} onSelect={onSelect} />
            ))}
          </div>
        </section>
      ))}
    </>
  )
}
