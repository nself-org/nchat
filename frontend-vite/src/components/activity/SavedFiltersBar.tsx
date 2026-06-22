/**
 * Purpose:    SavedFilters bar — search input, sort selector, starred/has-attachments
 *             toggles, and tag chip row for the saved-messages view.
 * Inputs:     Current filter state (SavedFiltersValue, sortBy, sortOrder, searchQuery,
 *             availableTags, selectedTags) and callbacks for each field.
 * Outputs:    Filter/search toolbar row + optional tag chip row (hidden when no tags).
 * Constraints:Purely presentational — no side effects or fetching. All actions are callbacks.
 *             RTL-safe spacing (ms-/me-).
 * SOT:        F-NCHAT-VITE-SAVED-VIEWS-01
 */
import type {
  SavedFilters as SavedFiltersValue,
  SavedSortBy,
  SavedSortOrder,
} from './saved-types'

/** Filter/search toolbar for the saved-messages list. */
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
