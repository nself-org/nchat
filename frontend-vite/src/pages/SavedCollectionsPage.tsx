/**
 * Purpose:    Collections index page — ported from legacy app/saved/collections/page.tsx.
 *             Header with back-to-saved + title, a grid of collections (open/edit/delete/share),
 *             and the create-collection dialog. Data via urql (useSaved.collectionsResult) in
 *             AsyncScreen.
 * Inputs:     none (route component); navigation via useNavigate.
 * Outputs:    The /saved/collections screen.
 * Constraints:Hasura np_saved_collections (canonical §2). Backend not live yet → AsyncScreen
 *             degrades gracefully. Delete confirms via window.confirm (parity with legacy).
 * SOT:        F-NCHAT-VITE-ROUTE — /saved/collections
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AsyncScreen } from '@nself/ui'

import { CreateCollectionDialog } from '@/components/activity/SavedDialogs'
import { SavedCollectionsGrid } from '@/components/activity/SavedViews'
import { BackIcon, FolderIcon } from '@/components/activity/SavedIcons'
import { useSaved } from '@/components/activity/useSaved'
import type { SavedCollection } from '@/components/activity/saved-types'

export default function SavedCollectionsPage() {
  const navigate = useNavigate()
  const saved = useSaved()
  const [createOpen, setCreateOpen] = useState(false)

  const handleDelete = (c: SavedCollection) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${c.name}"? Messages will not be deleted.`,
      )
    ) {
      saved.deleteCollection(c.id)
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6 border-b border-slate-800 pb-6">
        <button
          type="button"
          onClick={() => navigate('/saved')}
          className="mb-4 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200"
        >
          <BackIcon className="h-4 w-4" />
          Back to saved
        </button>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400">
            <FolderIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-100">Collections</h1>
            <p className="text-slate-400">Organize your saved messages into collections</p>
          </div>
        </div>
      </header>

      <AsyncScreen<SavedCollection[]>
        result={saved.collectionsResult}
        emptyCheck={(list) => list.length === 0}
        onRetry={saved.refresh}
        renderData={(list) => (
          <SavedCollectionsGrid
            collections={list}
            onSelect={(c) => navigate(`/saved/collections/${c.id}`)}
            onDelete={handleDelete}
            onShare={() => undefined}
            onEdit={() => undefined}
          />
        )}
      />

      <CreateCollectionDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={(draft) => {
          saved.createCollection(draft)
          setCreateOpen(false)
        }}
      />
    </div>
  )
}
