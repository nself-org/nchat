/**
 * Purpose:    Settings chrome — left nav rail (desktop) + horizontal nav (mobile) wrapping a
 *             settings sub-page. Ports the legacy frontend/ SettingsLayout + SettingsNav into the
 *             Vite SPA using react-router <Link>/useLocation (was next/link + usePathname).
 * Inputs:     children — the active settings sub-page; title (default "Settings").
 * Outputs:    Layout frame with nav + scrollable content region.
 * Constraints:Presentational only — no data fetching. Slate palette + logical properties (RTL-ready);
 *             the SPA Tailwind config defines no shadcn semantic tokens, so we use the slate/sky scale
 *             already used by AppLayout/PlaceholderScreen. WCAG: nav landmarks + aria-current.
 * SOT:        F-NCHAT-VITE-SETTINGS-LAYOUT-01
 */
import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  User,
  Bell,
  Shield,
  Settings as SettingsIcon,
  Keyboard,
  Palette,
  Lock,
  ArrowLeft,
  type LucideIcon,
} from 'lucide-react'

interface NavItem {
  title: string
  href: string
  icon: LucideIcon
  description: string
}

/** Canonical settings nav — preserved 1:1 from legacy settings-nav.tsx. */
const NAV_ITEMS: ReadonlyArray<NavItem> = [
  { title: 'Profile', href: '/settings/profile', icon: User, description: 'Manage your personal information' },
  { title: 'Notifications', href: '/settings/notifications', icon: Bell, description: 'Configure notification preferences' },
  { title: 'Privacy', href: '/settings/privacy', icon: Shield, description: 'Control your privacy settings' },
  { title: 'Account', href: '/settings/account', icon: SettingsIcon, description: 'Manage account settings' },
  { title: 'Security', href: '/settings/security', icon: Lock, description: 'Password, 2FA, and sessions' },
  { title: 'Appearance', href: '/settings/appearance', icon: Palette, description: 'Customize the look and feel' },
  { title: 'Keyboard', href: '/settings/keyboard', icon: Keyboard, description: 'View keyboard shortcuts' },
]

function NavLinks({ horizontal, pathname }: { horizontal?: boolean; pathname: string }) {
  if (horizontal) {
    return (
      <nav className="flex gap-1 overflow-x-auto whitespace-nowrap" aria-label="Settings sections">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              to={item.href}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active ? 'bg-sky-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon className="h-4 w-4" aria-hidden="true" />
              {item.title}
            </Link>
          )
        })}
      </nav>
    )
  }

  return (
    <nav className="flex flex-col gap-1 p-4" aria-label="Settings sections">
      <Link
        to="/chat"
        className="mb-4 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Chat
      </Link>
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href
        return (
          <Link
            key={item.href}
            to={item.href}
            aria-current={active ? 'page' : undefined}
            className={`group flex flex-col gap-1 rounded-lg px-3 py-3 transition-colors ${
              active ? 'bg-sky-600' : 'hover:bg-slate-800'
            }`}
          >
            <span className="flex items-center gap-3">
              <item.icon
                className={`h-5 w-5 ${active ? 'text-white' : 'text-slate-400'}`}
                aria-hidden="true"
              />
              <span className={`font-medium ${active ? 'text-white' : 'text-slate-200'}`}>{item.title}</span>
            </span>
            <span className={`ps-8 text-xs ${active ? 'text-sky-100' : 'text-slate-500'}`}>
              {item.description}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}

export function SettingsLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()

  return (
    <div className="flex min-h-full bg-slate-950">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 border-e border-slate-800 bg-slate-900 md:block">
        <div className="sticky top-0">
          <div className="flex h-14 items-center border-b border-slate-800 px-6">
            <h2 className="text-lg font-semibold text-slate-100">Settings</h2>
          </div>
          <div className="max-h-[calc(100vh-3.5rem)] overflow-y-auto">
            <NavLinks pathname={pathname} />
          </div>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1" role="region" aria-label="Settings content">
        <div className="mx-auto max-w-4xl px-4 py-6 md:py-8">
          {/* Mobile nav */}
          <div className="mb-6 md:hidden">
            <NavLinks horizontal pathname={pathname} />
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
