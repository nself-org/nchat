/**
 * Purpose:    Small presentational primitives shared by ported admin pages: StatsCard,
 *             Badge, Tabs, Switch, Toolbar button — the shadcn-equivalents the legacy admin
 *             pages used (@/components/ui/*, admin/stats-card) re-implemented with Tailwind so
 *             pages stay self-contained while @nself/ui lacks these exact widgets.
 * Inputs:     presentational props only (see each component's interface).
 * Outputs:    Accessible Tailwind UI atoms. No data fetching.
 * Constraints:Presentational only. Tailwind logical properties for RTL (canonical §10).
 *             If @nself/ui later ships these, swap imports and delete here.
 * SOT:        F-NCHAT-VITE-ADMIN-PRIMITIVES-01
 */
import {
  createContext,
  useContext,
  useId,
  useState,
  type ReactNode,
} from 'react'

// ─── StatsCard ───────────────────────────────────────────────────────────────
interface StatsCardProps {
  title: string
  value: ReactNode
  description?: string
  icon?: ReactNode
  trend?: { value: number; label?: string; direction?: 'up' | 'down'; isPositive?: boolean }
  accent?: 'default' | 'success' | 'warning' | 'error' | 'info'
}

const ACCENT: Record<NonNullable<StatsCardProps['accent']>, string> = {
  default: 'border-slate-800',
  success: 'border-emerald-500/30 bg-emerald-500/5',
  warning: 'border-amber-500/30 bg-amber-500/5',
  error: 'border-rose-500/30 bg-rose-500/5',
  info: 'border-sky-500/30 bg-sky-500/5',
}

/** StatsCard — KPI tile with optional icon + trend indicator. */
export function StatsCard({ title, value, description, icon, trend, accent = 'default' }: StatsCardProps) {
  const positive = trend?.isPositive ?? trend?.direction !== 'down'
  return (
    <div className={`rounded-lg border bg-slate-900/50 p-4 ${ACCENT[accent]}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-400">{title}</span>
        {icon && <span className="text-slate-500">{icon}</span>}
      </div>
      <div className="mt-2 text-2xl font-bold text-slate-100">{value}</div>
      {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
      {trend && (
        <p className={`mt-1 text-xs ${positive ? 'text-emerald-400' : 'text-rose-400'}`}>
          {positive ? '+' : ''}
          {trend.value}% {trend.label ?? ''}
        </p>
      )}
    </div>
  )
}

/** StatsGrid — responsive grid wrapper for StatsCard rows. */
export function StatsGrid({ columns = 4, children }: { columns?: 2 | 3 | 4 | 5 | 6; children: ReactNode }) {
  const cols: Record<number, string> = {
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-2 lg:grid-cols-3',
    4: 'sm:grid-cols-2 lg:grid-cols-4',
    5: 'sm:grid-cols-2 lg:grid-cols-5',
    6: 'sm:grid-cols-3 lg:grid-cols-6',
  }
  return <div className={`grid grid-cols-1 gap-4 ${cols[columns]}`}>{children}</div>
}

// ─── Badge ───────────────────────────────────────────────────────────────────
type BadgeTone = 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'info' | 'outline'

const BADGE: Record<BadgeTone, string> = {
  default: 'bg-sky-500/15 text-sky-300',
  secondary: 'bg-slate-700/60 text-slate-300',
  success: 'bg-emerald-500/15 text-emerald-300',
  warning: 'bg-amber-500/15 text-amber-300',
  destructive: 'bg-rose-500/15 text-rose-300',
  info: 'bg-indigo-500/15 text-indigo-300',
  outline: 'border border-slate-700 text-slate-300',
}

/** Badge — small status pill. */
export function Badge({ tone = 'default', children, className = '' }: { tone?: BadgeTone; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${BADGE[tone]} ${className}`}>
      {children}
    </span>
  )
}

// ─── Tabs (controlled or uncontrolled) ─────────────────────────────────────────
interface TabsCtx {
  value: string
  setValue: (v: string) => void
}
const TabsContext = createContext<TabsCtx | null>(null)

/** Tabs root. Pass `value`/`onValueChange` for controlled, or `defaultValue` for uncontrolled. */
export function Tabs({
  defaultValue,
  value: controlled,
  onValueChange,
  children,
  className = '',
}: {
  defaultValue?: string
  value?: string
  onValueChange?: (v: string) => void
  children: ReactNode
  className?: string
}) {
  const [internal, setInternal] = useState(defaultValue ?? '')
  const value = controlled ?? internal
  const setValue = (v: string) => {
    if (controlled === undefined) setInternal(v)
    onValueChange?.(v)
  }
  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

export function TabsList({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div role="tablist" className={`inline-flex flex-wrap gap-1 rounded-lg border border-slate-800 bg-slate-900/60 p-1 ${className}`}>
      {children}
    </div>
  )
}

export function TabsTrigger({ value, children }: { value: string; children: ReactNode }) {
  const ctx = useContext(TabsContext)
  if (!ctx) throw new Error('TabsTrigger must be used inside Tabs')
  const active = ctx.value === value
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={() => ctx.setValue(value)}
      className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors ${
        active ? 'bg-sky-500/20 text-sky-200' : 'text-slate-400 hover:text-slate-200'
      }`}
    >
      {children}
    </button>
  )
}

export function TabsContent({ value, children, className = '' }: { value: string; children: ReactNode; className?: string }) {
  const ctx = useContext(TabsContext)
  if (!ctx) throw new Error('TabsContent must be used inside Tabs')
  if (ctx.value !== value) return null
  return (
    <div role="tabpanel" className={`mt-4 ${className}`}>
      {children}
    </div>
  )
}

// ─── Switch / Toggle row ───────────────────────────────────────────────────────
/** Switch — accessible toggle with label + hint, replaces shadcn Switch + Label combo. */
export function ToggleRow({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
}) {
  const id = useId()
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <label htmlFor={id} className="cursor-pointer text-sm font-medium text-slate-200">
          {label}
        </label>
        {hint && <p className="text-xs text-slate-500">{hint}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
          checked ? 'bg-sky-500' : 'bg-slate-700'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}

// ─── BundleUpsell — feature-gated CTA shown when a paid plugin is absent ────────
/** BundleUpsell — upsell panel for bundle-gated admin features (moderation, bots, etc.). */
export function BundleUpsell({
  icon,
  title,
  body,
  installHint,
}: {
  icon: ReactNode
  title: string
  body: string
  installHint?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 rounded-full bg-slate-800 p-4 text-slate-400">{icon}</div>
      <h2 className="mb-2 text-xl font-semibold text-slate-100">{title}</h2>
      <p className="mb-6 max-w-md text-sm text-slate-400">{body}</p>
      <div className="flex flex-col items-center gap-3">
        <a
          href="https://nself.org/pricing"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-400"
        >
          Get nChat Bundle
        </a>
        {installHint && (
          <code className="rounded bg-slate-800 px-2 py-1 font-mono text-xs text-slate-400">{installHint}</code>
        )}
      </div>
    </div>
  )
}
