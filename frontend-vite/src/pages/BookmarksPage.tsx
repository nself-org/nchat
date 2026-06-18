/**
 * Purpose:    Bookmarks + Saved Messages at "/bookmarks". Ported from legacy
 *             frontend/src/app/(authenticated)/bookmarks/page.tsx (BookmarkList +
 *             SavedMessages behind a tab switcher). Replaces the legacy components with real
 *             Hasura np_bookmarks / np_saved_messages reads, each rendering the saved message
 *             via the shared MessageRow.
 * Inputs:     ListBookmarks + ListSavedMessages queries (urql); local tab state.
 * Outputs:    Tabbed screen; each tab's list wrapped in AsyncScreen (7 states).
 * Constraints:Legacy Radix Tabs → a small local segmented control (no @nself/ui Tabs).
 *             HASURA-direct reads only (N-2-S2l bookmarks + N-2-S3 saved-messages read).
 * SOT:        F-NCHAT-VITE-ROUTE — /bookmarks
 */
import { useState } from 'react'
import { useQuery } from 'urql'
import { Bookmark, Save } from 'lucide-react'
import { AsyncScreen } from '@nself/ui'
import {
  LIST_BOOKMARKS,
  LIST_SAVED_MESSAGES,
  resultFromUrql,
  type BookmarkRow,
} from '@/components/chat/graphql'
import { MessageRow } from '@/components/chat/MessageRow'
import { relativeTime } from '@/components/chat/relative-time'

type Tab = 'bookmarks' | 'saved'

interface BookmarksData {
  np_bookmarks: ReadonlyArray<BookmarkRow>
}
interface SavedData {
  np_saved_messages: ReadonlyArray<BookmarkRow>
}

function SavedList({ rows }: { rows: ReadonlyArray<BookmarkRow> }) {
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.id} className="rounded-lg border border-slate-800 bg-slate-900 p-2">
          <div className="px-2 pb-1 text-xs text-slate-500">
            Saved {relativeTime(row.created_at)}
            {row.note ? ` · ${row.note}` : ''}
          </div>
          {row.message ? (
            <MessageRow message={row.message} />
          ) : (
            <p className="px-3 py-2 text-sm text-slate-500">Original message unavailable.</p>
          )}
        </div>
      ))}
    </div>
  )
}

export default function BookmarksPage() {
  const [tab, setTab] = useState<Tab>('bookmarks')

  const [bookmarksQuery, refetchBookmarks] = useQuery<BookmarksData>({
    query: LIST_BOOKMARKS,
    requestPolicy: 'cache-and-network',
    pause: tab !== 'bookmarks',
  })
  const [savedQuery, refetchSaved] = useQuery<SavedData>({
    query: LIST_SAVED_MESSAGES,
    requestPolicy: 'cache-and-network',
    pause: tab !== 'saved',
  })

  const tabs: ReadonlyArray<{ id: Tab; label: string; icon: React.ReactNode }> = [
    { id: 'bookmarks', label: 'Bookmarks', icon: <Bookmark className="h-4 w-4" /> },
    { id: 'saved', label: 'Saved Messages', icon: <Save className="h-4 w-4" /> },
  ]

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col">
      {/* Tab bar */}
      <div className="mb-4 flex border-b border-slate-800" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={
              'flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm transition-colors ' +
              (tab === t.id
                ? 'border-sky-500 text-slate-100'
                : 'border-transparent text-slate-400 hover:text-slate-200')
            }
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <div className="flex-1" role="tabpanel">
        {tab === 'bookmarks' ? (
          <AsyncScreen<BookmarksData>
            result={resultFromUrql(
              bookmarksQuery.fetching,
              bookmarksQuery.error,
              bookmarksQuery.data,
            )}
            onRetry={() => refetchBookmarks({ requestPolicy: 'network-only' })}
            emptyCheck={(d) => (d?.np_bookmarks?.length ?? 0) === 0}
            slots={{
              empty: (
                <div className="py-16 text-center" role="status">
                  <Bookmark className="mx-auto mb-3 h-10 w-10 text-slate-600" />
                  <p className="text-sm text-slate-400">No bookmarks yet.</p>
                </div>
              ),
            }}
            renderData={(d) => <SavedList rows={d.np_bookmarks} />}
          />
        ) : (
          <AsyncScreen<SavedData>
            result={resultFromUrql(savedQuery.fetching, savedQuery.error, savedQuery.data)}
            onRetry={() => refetchSaved({ requestPolicy: 'network-only' })}
            emptyCheck={(d) => (d?.np_saved_messages?.length ?? 0) === 0}
            slots={{
              empty: (
                <div className="py-16 text-center" role="status">
                  <Save className="mx-auto mb-3 h-10 w-10 text-slate-600" />
                  <p className="text-sm text-slate-400">No saved messages yet.</p>
                </div>
              ),
            }}
            renderData={(d) => <SavedList rows={d.np_saved_messages} />}
          />
        )}
      </div>
    </div>
  )
}
