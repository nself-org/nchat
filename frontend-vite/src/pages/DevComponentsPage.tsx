/**
 * Purpose:    "/dev/components" — the component library index. Faithful port of the legacy
 *             app/dev/components/page.tsx: search box, category filter tabs with counts, a grid
 *             of component cards (linking to detail pages), and a "Detailed Documentation"
 *             quick-nav. Wrapped in DevShell.
 * Inputs:     none — catalog data from componentCatalog.ts; search/category are local state.
 * Outputs:    Filterable component gallery.
 * Constraints:Client-only, presentational. next/link -> <Link>; shadcn Tabs -> devtools Tabs.
 *             Slate theme. Logical Tailwind props (canonical §10).
 * SOT:        F-NCHAT-VITE-ROUTE — /dev/components
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, MessageSquare, Hash, User, ArrowRight } from 'lucide-react'
import { DevShell } from '@/components/devtools/DevShell'
import { Tabs } from '@/components/devtools/Tabs'
import { CATEGORIES, COMPONENTS, type ComponentInfo } from '@/components/devtools/componentCatalog'

const STATUS_CLASS: Record<ComponentInfo['status'], string> = {
  stable: 'border border-slate-700 text-slate-400',
  new: 'bg-green-500 text-white',
  beta: 'bg-slate-700 text-slate-200',
}

function ComponentCard({ component }: { component: ComponentInfo }) {
  return (
    <Link
      to={component.path}
      className="group rounded-lg border border-slate-800 bg-slate-900/40 p-4 transition-all hover:border-sky-500/50"
    >
      <div className="mb-2 flex items-start justify-between">
        <h3 className="text-base font-semibold text-slate-100 group-hover:text-sky-300">
          {component.name}
        </h3>
        <span className={`rounded px-1.5 py-0.5 text-[10px] ${STATUS_CLASS[component.status]}`}>
          {component.status}
        </span>
      </div>
      <p className="text-sm text-slate-400">{component.description}</p>
    </Link>
  )
}

const QUICK_NAV = [
  { href: '/dev/components/messages', title: 'Message Components', count: '8 components', icon: MessageSquare, color: 'text-green-400', bg: 'bg-green-500/10' },
  { href: '/dev/components/channels', title: 'Channel Components', count: '6 components', icon: Hash, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { href: '/dev/components/users', title: 'User Components', count: '6 components', icon: User, color: 'text-orange-400', bg: 'bg-orange-500/10' },
]

export default function DevComponentsPage() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: COMPONENTS.length }
    COMPONENTS.forEach((x) => {
      c[x.category] = (c[x.category] ?? 0) + 1
    })
    return c
  }, [])

  const filtered = useMemo(
    () =>
      COMPONENTS.filter((x) => {
        const matchesSearch =
          query === '' ||
          x.name.toLowerCase().includes(query.toLowerCase()) ||
          x.description.toLowerCase().includes(query.toLowerCase())
        const matchesCategory = category === 'all' || x.category === category
        return matchesSearch && matchesCategory
      }),
    [query, category],
  )

  const tabs = CATEGORIES.map((c) => ({
    value: c.id,
    label: c.label,
    icon: c.icon,
    count: counts[c.id] ?? 0,
  }))

  return (
    <DevShell>
      <div className="space-y-8">
        <div>
          <h1 className="mb-2 text-3xl font-bold tracking-tight">Component Library</h1>
          <p className="text-slate-400">
            Browse all {COMPONENTS.length} components available in ɳChat. Each component is fully
            typed, accessible, and themeable.
          </p>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search components..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-950 py-2 ps-9 pe-3 text-sm text-slate-200 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
          />
        </div>

        <Tabs tabs={tabs} value={category} onChange={setCategory}>
          {() =>
            filtered.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filtered.map((component) => (
                  <ComponentCard key={component.name} component={component} />
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <p className="text-slate-400">No components found matching your search.</p>
                <button
                  type="button"
                  onClick={() => {
                    setQuery('')
                    setCategory('all')
                  }}
                  className="mt-2 text-sm text-sky-400 hover:underline"
                >
                  Clear filters
                </button>
              </div>
            )
          }
        </Tabs>

        <div className="border-t border-slate-800 pt-8">
          <h2 className="mb-4 text-xl font-semibold">Detailed Documentation</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {QUICK_NAV.map((nav) => {
              const Icon = nav.icon
              return (
                <Link
                  key={nav.href}
                  to={nav.href}
                  className="group flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/40 p-4 transition-colors hover:border-sky-500/50"
                >
                  <div className="flex items-center gap-3">
                    <div className={`rounded-lg p-2 ${nav.bg}`}>
                      <Icon className={`h-5 w-5 ${nav.color}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold">{nav.title}</h3>
                      <p className="text-sm text-slate-400">{nav.count}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-slate-500 transition-all group-hover:text-sky-400" />
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </DevShell>
  )
}
