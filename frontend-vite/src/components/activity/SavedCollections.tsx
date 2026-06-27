/**
 * Purpose:    Collection navigation and grid components for the Saved views — CollectionList
 *             (sidebar nav) and SavedCollectionsGrid (collections index page). Split from
 *             SavedViews.tsx to stay within the 300-line file cap.
 * Inputs:     See each component's props — collections data and action callbacks.
 * Outputs:    JSX for collection sidebar and grid views.
 * Constraints:Purely presentational — no fetching, no business logic. All actions are
 *             callbacks. RTL-safe spacing (ms-/me-).
 * SOT:        F-NCHAT-VITE-SAVED-VIEWS-01
 */
import {
  BookmarkIcon,
  FolderIcon,
  MoreIcon,
  PlusIcon,
  ShareIcon,
  TrashIcon,
} from './SavedIcons'
import type { SavedCollection } from './saved-types'

// ─── Collection sidebar list ─────────────────────────────────────────────────────────

/** Sidebar navigation listing all collections plus "All saved" and "Uncategorized" fixed entries. */
export function CollectionList({
  collections,
  selectedId,
  onSelect,
  onCreate,
  uncategorizedCount,
}: {
  collections: SavedCollection[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  onCreate: () => void
  uncategorizedCount: number
}) {
  const rowClass = (active: boolean) =>
    [
      'flex w-full items-center gap-2 rounded-md px-3 py-2 text-start text-sm',
      active ? 'bg-sky-500/15 text-sky-200' : 'text-slate-300 hover:bg-slate-800',
    ].join(' ')

  return (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2" aria-label="Collections">
      <button type="button" onClick={() => onSelect(null)} className={rowClass(selectedId === null)}>
        <BookmarkIcon className="h-4 w-4" />
        <span className="flex-1">All saved</span>
      </button>
      <button
        type="button"
        onClick={() => onSelect('__uncategorized__')}
        className={rowClass(selectedId === '__uncategorized__')}
      >
        <FolderIcon className="h-4 w-4" />
        <span className="flex-1">Uncategorized</span>
        {uncategorizedCount > 0 && <span className="text-xs text-slate-500">{uncategorizedCount}</span>}
      </button>
      <div className="my-1 h-px bg-slate-800" />
      {collections.map((c) => (
        <button key={c.id} type="button" onClick={() => onSelect(c.id)} className={rowClass(selectedId === c.id)}>
          <span className="text-base" style={c.color ? { color: c.color } : undefined}>
            {c.icon ?? '📁'}
          </span>
          <span className="flex-1 truncate">{c.name}</span>
          <span className="text-xs text-slate-500">{c.itemCount}</span>
        </button>
      ))}
      <button
        type="button"
        onClick={onCreate}
        className="mt-1 flex items-center gap-2 rounded-md px-3 py-2 text-sm text-sky-400 hover:bg-slate-800"
      >
        <PlusIcon className="h-4 w-4" />
        New collection
      </button>
    </nav>
  )
}

// ─── Collections grid (collections index page) ────────────────────────────────────────

/** Card grid for the /saved/collections index — click a card to browse its messages. */
export function SavedCollectionsGrid({
  collections,
  onSelect,
  onEdit,
  onDelete,
  onShare,
}: {
  collections: SavedCollection[]
  onSelect: (c: SavedCollection) => void
  onEdit?: (c: SavedCollection) => void
  onDelete: (c: SavedCollection) => void
  onShare?: (c: SavedCollection) => void
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {collections.map((c) => (
        <div
          key={c.id}
          className="group flex flex-col rounded-xl border border-slate-800 bg-slate-900/40 p-4 transition-colors hover:border-slate-700"
        >
          <div className="mb-3 flex items-start justify-between">
            <button
              type="button"
              onClick={() => onSelect(c)}
              className="flex h-11 w-11 items-center justify-center rounded-lg text-xl"
              style={c.color ? { backgroundColor: `${c.color}20`, color: c.color } : undefined}
              aria-label={`Open ${c.name}`}
            >
              {c.icon ?? '📁'}
            </button>
            <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              {onShare && (
                <button type="button" onClick={() => onShare(c)} aria-label="Share" className="text-slate-500 hover:text-sky-300">
                  <ShareIcon className="h-4 w-4" />
                </button>
              )}
              {onEdit && (
                <button type="button" onClick={() => onEdit(c)} aria-label="Edit" className="text-slate-500 hover:text-slate-200">
                  <MoreIcon className="h-4 w-4" />
                </button>
              )}
              <button type="button" onClick={() => onDelete(c)} aria-label="Delete" className="text-slate-500 hover:text-red-400">
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
          <button type="button" onClick={() => onSelect(c)} className="text-start">
            <h3 className="flex items-center gap-1.5 font-medium text-slate-100">
              {c.name}
              {c.isShared && <ShareIcon className="h-3.5 w-3.5 text-slate-500" />}
            </h3>
            {c.description && <p className="mt-0.5 text-sm text-slate-400">{c.description}</p>}
            <p className="mt-2 text-xs text-slate-500">
              {c.itemCount} {c.itemCount === 1 ? 'message' : 'messages'}
            </p>
          </button>
        </div>
      ))}
    </div>
  )
}
