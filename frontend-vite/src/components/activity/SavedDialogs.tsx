/**
 * Purpose:    Modal dialogs for the saved views — CreateCollection (name/description/icon/color)
 *             and AddToCollection (multi-select membership). Ported from the legacy
 *             CreateCollection / AddToCollection components, rebuilt as self-contained accessible
 *             dialogs (no external dialog dep) to keep the group isolated.
 * Inputs:     open + onOpenChange; CreateCollection: onCreate(draft); AddToCollection:
 *             collections, selectedIds, onSave(ids), onCreateCollection.
 * Outputs:    Rendered dialog when open; callbacks on submit.
 * Constraints:Presentational + local form state only. Esc + backdrop close; focus trap kept
 *             simple (autofocus first field). RTL-safe spacing.
 * SOT:        F-NCHAT-VITE-SAVED-DIALOGS-01
 */
import { useEffect, useState } from 'react'
import type { CollectionDraft, SavedCollection } from './saved-types'

const COLORS = ['#0ea5e9', '#22c55e', '#a855f7', '#f59e0b', '#ef4444', '#64748b']
const ICONS = ['📁', '⭐', '🔖', '📌', '💡', '🚀', '🧩', '📝']

function Backdrop({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

export function CreateCollectionDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (draft: CollectionDraft) => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState(ICONS[0])
  const [color, setColor] = useState(COLORS[0])

  useEffect(() => {
    if (open) {
      setName('')
      setDescription('')
      setIcon(ICONS[0])
      setColor(COLORS[0])
    }
  }, [open])

  if (!open) return null

  const submit = () => {
    if (!name.trim()) return
    onCreate({ name: name.trim(), description: description.trim() || undefined, icon, color })
  }

  return (
    <Backdrop onClose={() => onOpenChange(false)}>
      <h2 className="mb-4 text-lg font-semibold text-slate-100">New collection</h2>
      <label className="mb-1 block text-sm text-slate-300" htmlFor="collection-name">
        Name
      </label>
      <input
        id="collection-name"
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Work follow-ups"
        className="mb-4 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
      />
      <label className="mb-1 block text-sm text-slate-300" htmlFor="collection-desc">
        Description (optional)
      </label>
      <textarea
        id="collection-desc"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
        className="mb-4 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
      />
      <div className="mb-4 flex gap-6">
        <div>
          <span className="mb-1 block text-sm text-slate-300">Icon</span>
          <div className="flex flex-wrap gap-1">
            {ICONS.map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIcon(i)}
                aria-pressed={icon === i}
                className={[
                  'h-8 w-8 rounded-md text-base',
                  icon === i ? 'bg-sky-500/30 ring-1 ring-sky-400' : 'bg-slate-800',
                ].join(' ')}
              >
                {i}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="mb-1 block text-sm text-slate-300">Color</span>
          <div className="flex flex-wrap gap-1">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`Color ${c}`}
                aria-pressed={color === c}
                style={{ backgroundColor: c }}
                className={['h-8 w-8 rounded-md', color === c ? 'ring-2 ring-white' : ''].join(' ')}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="rounded-md px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!name.trim()}
          className="rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-400 disabled:opacity-50"
        >
          Create
        </button>
      </div>
    </Backdrop>
  )
}

export function AddToCollectionDialog({
  open,
  onOpenChange,
  collections,
  selectedIds,
  onSave,
  onCreateCollection,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  collections: SavedCollection[]
  selectedIds: string[]
  onSave: (ids: string[]) => void
  onCreateCollection: () => void
}) {
  const [selected, setSelected] = useState<string[]>(selectedIds)

  useEffect(() => {
    if (open) setSelected(selectedIds)
  }, [open, selectedIds])

  if (!open) return null

  const toggle = (id: string) =>
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))

  return (
    <Backdrop onClose={() => onOpenChange(false)}>
      <h2 className="mb-4 text-lg font-semibold text-slate-100">Add to collection</h2>
      {collections.length === 0 ? (
        <p className="mb-4 text-sm text-slate-400">No collections yet.</p>
      ) : (
        <ul className="mb-4 max-h-64 space-y-1 overflow-y-auto">
          {collections.map((c) => (
            <li key={c.id}>
              <label className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-slate-800">
                <input
                  type="checkbox"
                  checked={selected.includes(c.id)}
                  onChange={() => toggle(c.id)}
                  className="h-4 w-4 accent-sky-500"
                />
                <span className="text-base">{c.icon ?? '📁'}</span>
                <span className="text-sm text-slate-200">{c.name}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={onCreateCollection}
        className="mb-4 text-sm font-medium text-sky-400 hover:text-sky-300"
      >
        + New collection
      </button>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="rounded-md px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onSave(selected)}
          className="rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-400"
        >
          Save
        </button>
      </div>
    </Backdrop>
  )
}
