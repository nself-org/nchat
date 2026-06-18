/**
 * Purpose:    Horizontal category filter tabs for the activity feed with per-category unread
 *             badges, ported from the legacy ActivityFilterTabs.
 * Inputs:     activeCategory, onChange(category), counts (unread per category).
 * Outputs:    Tab row; clicking a tab calls onChange.
 * Constraints:Presentational + WCAG: tablist semantics, keyboard via native buttons.
 *             Logical-property spacing (ms-/me-) for RTL readiness (canonical §10).
 * SOT:        F-NCHAT-VITE-ACTIVITY-FILTERTABS-01
 */
import { ACTIVITY_CATEGORIES, type ActivityCategory } from './activity-types'

interface Props {
  activeCategory: ActivityCategory
  onChange: (category: ActivityCategory) => void
  counts: Partial<Record<ActivityCategory, number>>
}

export function ActivityFilterTabs({ activeCategory, onChange, counts }: Props) {
  return (
    <div role="tablist" aria-label="Activity categories" className="flex flex-wrap gap-1">
      {ACTIVITY_CATEGORIES.map(({ id, label }) => {
        const isActive = id === activeCategory
        const count = counts[id] ?? 0
        return (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => onChange(id)}
            className={[
              'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-sky-500 text-white'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white',
            ].join(' ')}
          >
            <span>{label}</span>
            {count > 0 && (
              <span
                className={[
                  'ms-0.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-xs',
                  isActive ? 'bg-white/20 text-white' : 'bg-sky-500/20 text-sky-300',
                ].join(' ')}
              >
                {count > 99 ? '99+' : count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
