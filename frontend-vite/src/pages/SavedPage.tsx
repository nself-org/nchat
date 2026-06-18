/**
 * Purpose:    Saved messages page for the ɳChat Vite SPA — ported from legacy app/saved/page.tsx.
 *             Collection sidebar (All / Uncategorized / collections + new), main header with
 *             stats + Export + New Collection, filters (search/sort/starred/files/tags), and the
 *             saved-message list. Create-collection + add-to-collection dialogs. Data via urql
 *             (useSaved) wrapped in AsyncScreen.
 * Inputs:     none (route component); navigation via useNavigate.
 * Outputs:    The /saved screen.
 * Constraints:Hasura np_saved_messages/np_saved_collections (canonical §2). Backend not live yet
 *             → AsyncScreen degrades gracefully; no feature stubbed. Jump deep-links to the
 *             message in its channel. Export runs fully client-side.
 * SOT:        F-NCHAT-VITE-ROUTE — /saved
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AsyncScreen } from '@nself/ui'

import { CreateCollectionDialog, AddToCollectionDialog } from '@/components/activity/SavedDialogs'
import { CollectionList, SavedFilters, SavedMessageList } from '@/components/activity/SavedViews'
import { BackIcon, BookmarkIcon, DownloadIcon, PlusIcon } from '@/components/activity/SavedIcons'
import { downloadExport } from '@/components/activity/saved-export'
import { useSaved } from '@/components/activity/useSaved'
import type { SavedMessage } from '@/components/activity/saved-types'

export default function SavedPage() {
  const navigate = useNavigate()
  const saved = useSaved()
  const [createOpen, setCreateOpen] = useState(false)
  const [addTarget, setAddTarget] = useState<SavedMessage | null>(null)

  const selectedCollection =
    saved.selectedCollectionId && saved.selectedCollectionId !== '__uncategorized__'
      ? saved.getCollection(saved.selectedCollectionId)
      : undefined
  const uncategorizedCount = saved.messages.filter((m) => m.collectionIds.length === 0).length

  const jump = (m: SavedMessage) => navigate(`/chat/channel/${m.channelId}?message=${m.messageId}`)

  const headerTitle = selectedCollection
    ? selectedCollection.name
    : saved.selectedCollectionId === '__uncategorized__'
      ? 'Uncategorized'
      : 'All saved'

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="flex w-64 flex-col border-e border-slate-800">
        <div className="border-b border-slate-800 p-4">
          <button
            type="button"
            onClick={() => navigate('/chat')}
            className="mb-2 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200"
          >
            <BackIcon className="h-4 w-4" />
            Back to chat
          </button>
          <div className="flex items-center gap-2">
            <BookmarkIcon className="h-5 w-5 text-sky-400" />
            <h1 className="text-lg font-semibold text-slate-100">Saved messages</h1>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            {saved.stats.totalSaved} saved
            {saved.stats.totalStarred > 0 && ` (${saved.stats.totalStarred} starred)`}
          </p>
        </div>
        <CollectionList
          collections={saved.collections}
          selectedId={saved.selectedCollectionId}
          onSelect={saved.setSelectedCollection}
          onCreate={() => setCreateOpen(true)}
          uncategorizedCount={uncategorizedCount}
        />
      </div>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-slate-800 p-4">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-medium text-slate-100">{headerTitle}</h2>
              <p className="text-sm text-slate-400">
                {saved.messages.length} message{saved.messages.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => downloadExport(saved.messages, saved.collections, 'json')}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
              >
                <DownloadIcon className="h-4 w-4" />
                Export
              </button>
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-md bg-sky-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-400"
              >
                <PlusIcon className="h-4 w-4" />
                New collection
              </button>
            </div>
          </div>
          <SavedFilters
            filters={saved.filters}
            sortBy={saved.sortBy}
            sortOrder={saved.sortOrder}
            searchQuery={saved.searchQuery}
            availableTags={saved.availableTags}
            selectedTags={saved.selectedTags}
            onFiltersChange={saved.setFilters}
            onSortChange={saved.setSort}
            onSearchChange={saved.setSearchQuery}
            onTagsChange={saved.setSelectedTags}
          />
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <AsyncScreen<SavedMessage[]>
            result={saved.result}
            emptyCheck={(list) => list.length === 0}
            onRetry={saved.refresh}
            renderData={(list) => (
              <SavedMessageList
                messages={list}
                onJump={jump}
                onUnsave={(m) => saved.removeSaved(m.id)}
                onToggleStar={(m) => saved.toggleStar(m.id)}
                onAddToCollection={(m) => setAddTarget(m)}
              />
            )}
          />
        </div>
      </div>

      {/* Dialogs */}
      <CreateCollectionDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={(draft) => {
          saved.createCollection(draft)
          setCreateOpen(false)
        }}
      />
      <AddToCollectionDialog
        open={addTarget !== null}
        onOpenChange={(open) => !open && setAddTarget(null)}
        collections={saved.collections}
        selectedIds={addTarget?.collectionIds ?? []}
        onSave={(ids) => {
          if (addTarget) saved.setMembership(addTarget.id, ids)
          setAddTarget(null)
        }}
        onCreateCollection={() => {
          setAddTarget(null)
          setCreateOpen(true)
        }}
      />
    </div>
  )
}
