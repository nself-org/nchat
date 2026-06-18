/**
 * Purpose:    Developer-docs shell for the /dev/* gallery — faithful port of the legacy
 *             `app/dev/layout.tsx`: fixed sidebar (logo, search-filtered nav, theme toggle),
 *             a "Development Mode Only" banner, and a centered content column.
 * Inputs:     children (the routed dev page body).
 * Outputs:    Full-height shell with sidebar + banner + main content.
 * Constraints:Client-only. Nav active state from react-router useLocation. Search filters the
 *             nav (legacy behavior). The legacy theme toggle is preserved as a no-op-safe
 *             document.documentElement class flip (SPA is dark by default). Logical Tailwind
 *             props for RTL readiness (canonical §10).
 * SOT:        F-NCHAT-VITE-DEVTOOLS-DEVSHELL-01
 */
import { useMemo, useState, type ComponentType, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Home,
  Layers,
  MessageSquare,
  Hash,
  User,
  Palette,
  Flag,
  Search,
  Moon,
  Sun,
  Code2,
  ChevronRight,
  Sparkles,
} from 'lucide-react'

interface NavItem {
  title: string
  href: string
  icon: ComponentType<{ className?: string }>
  badge?: string
}

const NAV: ReadonlyArray<{ title: string; items: NavItem[] }> = [
  {
    title: 'Getting Started',
    items: [
      { title: 'Documentation Home', href: '/dev', icon: Home },
      { title: 'Component Library', href: '/dev/components', icon: Layers },
    ],
  },
  {
    title: 'Components',
    items: [
      { title: 'Messages', href: '/dev/components/messages', icon: MessageSquare },
      { title: 'Channels', href: '/dev/components/channels', icon: Hash },
      { title: 'Users', href: '/dev/components/users', icon: User },
    ],
  },
  {
    title: 'Customization',
    items: [
      { title: 'Templates', href: '/dev/templates', icon: Palette, badge: '5' },
      { title: 'Feature Flags', href: '/dev/features', icon: Flag },
    ],
  },
]

export function DevShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const [query, setQuery] = useState('')
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')

  const sections = useMemo(
    () =>
      NAV.map((s) => ({
        ...s,
        items: s.items.filter((i) => i.title.toLowerCase().includes(query.toLowerCase())),
      })).filter((s) => s.items.length > 0),
    [query],
  )

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark'
      document.documentElement.classList.toggle('dark', next === 'dark')
      return next
    })
  }

  return (
    <div className="-m-6 min-h-full bg-slate-950">
      <aside className="fixed inset-y-0 start-0 z-40 flex w-64 flex-col border-e border-slate-800 bg-slate-900">
        <div className="border-b border-slate-800 p-4">
          <Link to="/dev" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500 text-white">
              <Code2 className="h-4 w-4" />
            </div>
            <div>
              <h1 className="font-semibold leading-tight text-slate-100">ɳChat</h1>
              <p className="text-[10px] text-slate-400">Developer Docs</p>
            </div>
          </Link>
        </div>

        <div className="p-4">
          <div className="relative">
            <Search className="absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search docs..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 w-full rounded-md border border-slate-700 bg-slate-950 ps-8 pe-3 text-sm text-slate-200 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
            />
          </div>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-4 pb-4">
          {sections.map((section) => (
            <div key={section.title}>
              <h3 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                {section.title}
              </h3>
              <ul className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon
                  const active = pathname === item.href
                  return (
                    <li key={item.href}>
                      <Link
                        to={item.href}
                        className={
                          'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ' +
                          (active
                            ? 'bg-sky-500/10 font-medium text-sky-300'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100')
                        }
                      >
                        <Icon className="h-4 w-4" />
                        <span className="flex-1">{item.title}</span>
                        {item.badge && (
                          <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300">
                            {item.badge}
                          </span>
                        )}
                        {active && <ChevronRight className="h-4 w-4" />}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-slate-800 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Theme</span>
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex h-8 items-center gap-2 rounded-md px-2 text-sm text-slate-300 hover:bg-slate-800"
            >
              {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              {theme === 'dark' ? 'Dark' : 'Light'}
            </button>
          </div>
        </div>
      </aside>

      <div className="fixed inset-x-0 start-64 top-0 z-30 border-b border-slate-800 bg-amber-500/10 px-4 py-2">
        <div className="flex items-center justify-center gap-2 text-sm text-amber-400">
          <Sparkles className="h-4 w-4" />
          <span>Development Mode Only — These pages are not available in production</span>
        </div>
      </div>

      <main className="ms-64 pt-10">
        <div className="mx-auto max-w-5xl px-6 py-8 text-slate-200">{children}</div>
      </main>
    </div>
  )
}
