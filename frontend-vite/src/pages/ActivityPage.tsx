/**
 * Purpose:    Activity feed page for the ɳChat Vite SPA — ported from legacy app/activity/page.tsx.
 *             Header (refresh + settings), category filter tabs with unread badges, an unread
 *             banner with mark-all-read, date-grouped activity rows, and load-more pagination.
 *             Data via urql (useActivityFeed) wrapped in AsyncScreen for the 7 data states.
 * Inputs:     none (route component); navigation via react-router useNavigate.
 * Outputs:    The /activity screen.
 * Constraints:Server data through Hasura np_activities (canonical §2). Backend table + mark-read
 *             Actions not live yet → AsyncScreen degrades to loading/empty/error gracefully; no
 *             feature is stubbed away. Clicking a row marks it read + deep-links to its context.
 * SOT:        F-NCHAT-VITE-ROUTE — /activity
 */
import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { AsyncScreen } from '@nself/ui'

import { ActivityFilterTabs } from '@/components/activity/ActivityFilterTabs'
import {
  ActivityEmpty,
  ActivityList,
  ActivityLoading,
  UnreadBanner,
} from '@/components/activity/ActivityFeedParts'
import { RefreshIcon, SettingsIcon } from '@/components/activity/ActivityIcons'
import { useActivityFeed } from '@/components/activity/useActivityFeed'
import { isAggregated, type FeedEntry } from '@/components/activity/activity-types'

export default function ActivityPage() {
  const navigate = useNavigate()
  const {
    result,
    grouped,
    unread,
    activeCategory,
    setCategory,
    hasMore,
    loadMore,
    refresh,
    refreshing,
    markAsRead,
    markAllAsRead,
  } = useActivityFeed()

  // Mark read + deep-link to the activity's context (ported handleActivityClick).
  const handleSelect = useCallback(
    (entry: FeedEntry) => {
      if (!entry.isRead && !isAggregated(entry)) markAsRead(entry.id)
      if (entry.href) navigate(entry.href)
    },
    [markAsRead, navigate],
  )

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Activity</h1>
          <p className="mt-0.5 text-sm text-slate-400">Stay up to date with what's happening</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50"
          >
            <RefreshIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => navigate('/settings/notifications')}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
          >
            <SettingsIcon className="h-4 w-4" />
            Settings
          </button>
        </div>
      </header>

      {/* Filter tabs */}
      <div className="border-b border-slate-800 bg-slate-900/40 px-6 py-3">
        <ActivityFilterTabs
          activeCategory={activeCategory}
          onChange={setCategory}
          counts={unread.byCategory}
        />
      </div>

      {/* Unread banner */}
      {unread.total > 0 && <UnreadBanner count={unread.total} onMarkAllAsRead={markAllAsRead} />}

      {/* Content — AsyncScreen drives all 7 states; populated renders the grouped list. */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          <AsyncScreen<FeedEntry[]>
            result={result}
            emptyCheck={(entries) => entries.length === 0}
            onRetry={refresh}
            slots={{
              loading: <ActivityLoading count={8} />,
              empty: <ActivityEmpty category={activeCategory} />,
            }}
            renderData={() => (
              <>
                <ActivityList groups={grouped} onSelect={handleSelect} />
                {hasMore && (
                  <div className="mt-4 text-center">
                    <button
                      type="button"
                      onClick={loadMore}
                      disabled={refreshing}
                      className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50"
                    >
                      {refreshing ? 'Loading…' : 'Load more'}
                    </button>
                  </div>
                )}
              </>
            )}
          />
        </div>
      </div>
    </div>
  )
}
