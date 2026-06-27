/**
 * Purpose:    SavedMessageCard and SavedMessageList — presentational components for the
 *             saved-messages list view. SavedFilters, CollectionList, and SavedCollectionsGrid
 *             were split into SavedFiltersBar.tsx and SavedCollections.tsx to stay within
 *             the 300-line file cap. All split exports are re-exported here for backward compat.
 * Inputs:     SavedMessage objects and action callbacks (onJump, onUnsave, onToggleStar, onAddToCollection).
 * Outputs:    SavedMessageCard renders one saved item card; SavedMessageList maps over the array.
 * Constraints:Purely presentational — no fetching, no business logic. RTL-safe (ms-/me-).
 * SOT:        F-NCHAT-VITE-SAVED-VIEWS-01
 */
import { FolderIcon, PaperclipIcon, StarIcon, TrashIcon } from './SavedIcons'
import type { SavedMessage } from './saved-types'

// Re-export split components so callers keep working without import changes.
export { SavedFilters } from './SavedFiltersBar'
export { CollectionList, SavedCollectionsGrid } from './SavedCollections'

// ─── Message card + list ────────────────────────────────────────────────────────────

/** Single saved-message card with star, add-to-collection, and remove actions. */
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

/** Renders a SavedMessageCard for each message in the array. */
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

