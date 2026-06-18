/**
 * Purpose:    Minimal accessible tab strip for the dev component gallery. Replaces the legacy
 *             shadcn `@/components/ui/tabs` (Tabs/TabsList/TabsTrigger/TabsContent) with a
 *             single self-contained controlled component (no Radix dependency in frontend-vite).
 * Inputs:     tabs: {value,label,icon?,count?}[]; value (active); onChange; children render-prop.
 * Outputs:    Tab buttons + the panel returned by children(activeValue).
 * Constraints:Controlled (caller owns active state). role=tab/tablist/tabpanel for a11y.
 *             Slate theme to match the ɳChat SPA shell.
 * SOT:        F-NCHAT-VITE-DEVTOOLS-TABS-01
 */
import type { ComponentType, ReactNode } from 'react'

export interface TabDef {
  value: string
  label: string
  icon?: ComponentType<{ className?: string }>
  count?: number
}

interface Props {
  tabs: ReadonlyArray<TabDef>
  value: string
  onChange: (value: string) => void
  children: (active: string) => ReactNode
}

export function Tabs({ tabs, value, onChange, children }: Props) {
  return (
    <div>
      <div role="tablist" className="flex flex-wrap gap-1 border-b border-slate-800 pb-px">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const active = tab.value === value
          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(tab.value)}
              className={
                'inline-flex items-center gap-1.5 rounded-t-md px-3 py-2 text-sm transition-colors ' +
                (active
                  ? 'border-b-2 border-sky-400 font-medium text-sky-300'
                  : 'border-b-2 border-transparent text-slate-400 hover:text-slate-200')
              }
            >
              {Icon && <Icon className="h-3.5 w-3.5" />}
              {tab.label}
              {typeof tab.count === 'number' && (
                <span className="text-xs opacity-60">({tab.count})</span>
              )}
            </button>
          )
        })}
      </div>
      <div role="tabpanel" className="mt-6">
        {children(value)}
      </div>
    </div>
  )
}
