/**
 * Purpose:    Drafts management at "/drafts". Ported from legacy frontend/src/app/drafts/page.tsx.
 *             Header (back, count badge, auto-save indicator), a settings panel with the
 *             auto-save toggle, and a draft list with select-to-navigate, delete, and
 *             clear-all. Replaces the legacy zustand drafts-store + useDrafts with real
 *             Hasura np_drafts reads + delete mutations.
 * Inputs:     ListDrafts query (urql); DeleteDraft + DeleteAllDrafts mutations; useNavigate.
 * Outputs:    Drafts screen; list wrapped in AsyncScreen (7 states). Selecting a draft
 *             navigates to its context (channel / thread / dm).
 * Constraints:next/navigation useRouter → useNavigate. The auto-save preference write is a
 *             user-settings Action (N-2-S3 settings) not yet live — the toggle persists to
 *             localStorage as a faithful client fallback. HASURA-direct reads + delete only.
 * SOT:        F-NCHAT-VITE-ROUTE — /drafts
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from 'urql'
import { ArrowLeft, FileText, Settings, Trash2 } from 'lucide-react'
import { AsyncScreen, Button, Card } from '@nself/ui'
import {
  DELETE_ALL_DRAFTS,
  DELETE_DRAFT,
  LIST_DRAFTS,
  resultFromUrql,
  type DraftRow,
} from '@/components/chat/graphql'
import { relativeTime } from '@/components/chat/relative-time'

interface DraftsData {
  np_drafts: ReadonlyArray<DraftRow>
}

const AUTO_SAVE_KEY = 'nchat.drafts.autoSave'

function contextLabel(type: string, id: string): string {
  switch (type) {
    case 'channel':
      return `#${id}`
    case 'thread':
      return `Thread ${id.slice(0, 8)}…`
    case 'dm':
      return `DM ${id.slice(0, 8)}…`
    default:
      return id
  }
}

function contextPath(type: string, id: string): string {
  switch (type) {
    case 'channel':
      return `/chat/channel/${id}`
    case 'dm':
      return `/people/${id}`
    default:
      return `/chat/channel/${id}`
  }
}

export default function DraftsPage() {
  const navigate = useNavigate()
  const [autoSave, setAutoSave] = useState(true)

  useEffect(() => {
    setAutoSave(localStorage.getItem(AUTO_SAVE_KEY) !== 'false')
  }, [])

  function toggleAutoSave() {
    setAutoSave((v) => {
      const next = !v
      localStorage.setItem(AUTO_SAVE_KEY, String(next))
      return next
    })
  }

  const [{ data, fetching, error }, refetch] = useQuery<DraftsData>({
    query: LIST_DRAFTS,
    requestPolicy: 'cache-and-network',
  })
  const [, deleteDraft] = useMutation(DELETE_DRAFT)
  const [, deleteAll] = useMutation(DELETE_ALL_DRAFTS)

  const result = resultFromUrql(fetching, error, data)
  const count = data?.np_drafts.length ?? 0

  async function handleDelete(id: string) {
    await deleteDraft({ id })
    refetch({ requestPolicy: 'network-only' })
  }

  async function handleClearAll() {
    await deleteAll({})
    refetch({ requestPolicy: 'network-only' })
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      {/* Header */}
      <header className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} aria-label="Go back">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/10">
              <FileText className="h-5 w-5 text-sky-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-100">Drafts</h1>
              <p className="text-sm text-slate-400">Manage your unsent messages</p>
            </div>
          </div>
        </div>
        <span className="rounded-full bg-slate-800 px-2.5 py-1 text-sm text-slate-300">
          {count} draft{count === 1 ? '' : 's'}
        </span>
      </header>

      {/* Settings panel */}
      <Card className="mb-6 p-4">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-medium text-slate-200">
            <Settings className="h-4 w-4 text-slate-400" />
            Draft settings
          </span>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={autoSave}
              onChange={toggleAutoSave}
              className="h-4 w-4 accent-sky-500"
            />
            Auto-save drafts
          </label>
        </div>
      </Card>

      {/* Draft list */}
      <AsyncScreen<DraftsData>
        result={result}
        onRetry={() => refetch({ requestPolicy: 'network-only' })}
        emptyCheck={(d) => (d?.np_drafts?.length ?? 0) === 0}
        slots={{
          empty: (
            <div className="py-16 text-center" role="status">
              <FileText className="mx-auto mb-3 h-10 w-10 text-slate-600" />
              <p className="text-sm text-slate-400">
                No drafts yet. Drafts are saved automatically as you type.
              </p>
            </div>
          ),
        }}
        renderData={(d) => (
          <div className="space-y-3">
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={handleClearAll}>
                <Trash2 className="mr-1 h-4 w-4" />
                Clear all
              </Button>
            </div>
            {d.np_drafts.map((draft) => (
              <Card key={draft.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => navigate(contextPath(draft.context_type, draft.context_id))}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                        {contextLabel(draft.context_type, draft.context_id)}
                      </span>
                      <span className="text-xs text-slate-500">
                        {relativeTime(draft.updated_at)}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-slate-300">{draft.content}</p>
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(draft.id)}
                    aria-label="Delete draft"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      />

      {/* Footer */}
      <footer className="mt-6 border-t border-slate-800 pt-4 text-sm text-slate-500">
        Drafts are automatically saved as you type and persist across sessions.
      </footer>
    </div>
  )
}
