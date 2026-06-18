/**
 * Purpose:    Presentational views for the saved pages — SavedFilters (search + sort + starred /
 *             attachment toggles + tag chips), SavedMessageCard + SavedMessageList, CollectionList
 *             (sidebar), and SavedCollectionsGrid. Ported from the legacy SavedFilters /
 *             SavedMessageList / CollectionList / SavedCollections components.
 * Inputs:     see each component's props.
 * Outputs:    JSX for the saved sub-views.
 * Constraints:Purely presentational — no fetching, no business logic (canonical §4). All actions
 *             are callbacks. RTL-safe spacing (ms-/me-).
 * SOT:        F-NCHAT-VITE-SAVED-VIEWS-01
 */
import {
  BookmarkIcon,
  FolderIcon,
  MoreIcon,
  PaperclipIcon,
  PlusIcon,
  ShareIcon,
  StarIcon,
  TrashIcon,
} from './SavedIcons'
import type {
  SavedCollection,
  SavedFilters as SavedFiltersValue,
  SavedMessage,
  SavedSortBy,
  SavedSortOrder,
} from './saved-types'

// ─── Filters ──────────────────────────────────────────────────────────────────────

export function SavedFilters({
  filters,
  sortBy,
  sortOrder,
  searchQuery,
  availableTags,
  selectedTags,
  onFiltersChange,
  onSortChange,
  onSearchChange,
  onTagsChange,
}: {
  filters: SavedFiltersValue
  sortBy: SavedSortBy
  sortOrder: SavedSortOrder
  searchQuery: string
  availableTags: string[]
  selectedTags: string[]
  onFiltersChange: (f: SavedFiltersValue) => void
  onSortChange: (by: SavedSortBy, order: SavedSortOrder) => void
  onSearchChange: (q: string) => void
  onTagsChange: (tags: string[]) => void
}) {
  const toggleTag = (tag: string) =>
    onTagsChange(
      selectedTags.includes(tag) ? selectedTags.filter((t) => t !== tag) : [...selectedTags, tag],
    )

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search saved messages…"
          className="min-w-[14rem] flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
        />
        <select
          value={`${sortBy}:${sortOrder}`}
          onChange={(e) => {
            const [by, order] = e.target.value.split(':') as [SavedSortBy, SavedSortOrder]
            onSortChange(by, order)
          }}
          className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          aria-label="Sort saved messages"
        >
          <option value="savedAt:desc">Newest saved</option>
          <option value="savedAt:asc">Oldest saved</option>
          <option value="channel:asc">Channel A→Z</option>
          <option value="channel:desc">Channel Z→A</option>
        </select>
        <label className="flex items-center gap-1.5 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={Boolean(filters.starredOnly)}
            onChange={(e) => onFiltersChange({ ...filters, starredOnly: e.target.checked })}
            className="h-4 w-4 accent-amber-400"
          />
          Starred
        </label>
        <label className="flex items-center gap-1.5 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={Boolean(filters.hasAttachments)}
            onChange={(e) => onFiltersChange({ ...filters, hasAttachments: e.target.checked })}
            className="h-4 w-4 accent-sky-400"
          />
          Has files
        </label>
      </div>
      {availableTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {availableTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              aria-pressed={selectedTags.includes(tag)}
              className={[
                'rounded-full px-2.5 py-1 text-xs',
                selectedTags.includes(tag)
                  ? 'bg-sky-500 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700',
              ].join(' ')}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Message card + list ────────────────────────────────────────────────────────────

export function SavedMessageCard({
  saved,
  onJump,
  onUnsave,
  onToggleStar,
  onAddToCollection,
}: {
  saved: SavedMessage
  onJump: (saved: SavedMessage) => void
  onUnsave: (saved: SavedMessage) => void
  onToggleStar: (saved: SavedMessage) => void
  onAddToCollection?: (saved: SavedMessage) => void
}) {
  return (
    <article className="group rounded-lg border border-slate-800 bg-slate-900/40 p-4 transition-colors hover:border-slate-700">
      <header className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-medium text-slate-200">
            {saved.author.displayName}
          </span>
          <span className="truncate text-xs text-slate-500">in #{saved.channelName}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onToggleStar(saved)}
            aria-pressed={saved.isStarred}
            aria-label={saved.isStarred ? 'Unstar' : 'Star'}
            className={saved.isStarred ? 'text-amber-400' : 'text-slate-500 hover:text-amber-300'}
          >
            <StarIcon className="h-4 w-4" filled={saved.isStarred} />
          </button>
          {onAddToCollection && (
            <button
              type="button"
              onClick={() => onAddToCollection(saved)}
              aria-label="Add to collection"
              className="text-slate-500 hover:text-sky-300"
            >
              <FolderIcon className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onUnsave(saved)}
            aria-label="Remove from saved"
            className="text-slate-500 hover:text-red-400"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </header>
      <button
        type="button"
        onClick={() => onJump(saved)}
        className="block w-full text-start text-sm text-slate-300 hover:text-slate-100"
      >
        {saved.content}
      </button>
      {saved.note && (
        <p className="mt-2 rounded-md border-s-2 border-sky-500/40 bg-slate-950/50 px-3 py-1.5 text-xs text-slate-400">
          {saved.note}
        </p>
      )}
      <footer className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span>{saved.savedAt.toLocaleDateString()}</span>
        {saved.hasAttachments && (
          <span className="inline-flex items-center gap-1">
            <PaperclipIcon className="h-3 w-3" /> files
          </span>
        )}
        {saved.tags.map((t) => (
          <span key={t} className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-400">
            #{t}
          </span>
        ))}
      </footer>
    </article>
  )
}

export function SavedMessageList({
  messages,
  onJump,
  onUnsave,
  onToggleStar,
  onAddToCollection,
}: {
  messages: SavedMessage[]
  onJump: (saved: SavedMessage) => void
  onUnsave: (saved: SavedMessage) => void
  onToggleStar: (saved: SavedMessage) => void
  onAddToCollection?: (saved: SavedMessage) => void
}) {
  return (
    <div className="space-y-3">
      {messages.map((m) => (
        <SavedMessageCard
          key={m.id}
          saved={m}
          onJump={onJump}
          onUnsave={onUnsave}
          onToggleStar={onToggleStar}
          onAddToCollection={onAddToCollection}
        />
      ))}
    </div>
  )
}

// ─── Collection sidebar list ─────────────────────────────────────────────────────────

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
