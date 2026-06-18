/**
 * Purpose:    Authenticated app shell — minimal chrome (sidebar slot + header) wrapping the
 *             routed page via <Outlet />. The full ɳChat sidebar/header port from the legacy
 *             frontend/ lands in a later page-batch sprint; this is the structural skeleton.
 * Inputs:     react-router Outlet; useAuth() for the signed-in user label.
 * Outputs:    Layout frame with the routed page in <main>.
 * Constraints:Presentational only — no data fetching here (canonical §4).
 * SOT:        F-NCHAT-VITE-APP-LAYOUT-01
 */
import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '@nself/auth-core'

const NAV: ReadonlyArray<{ to: string; label: string }> = [
  { to: '/chat', label: 'Chat' },
  { to: '/channels/browse', label: 'Channels' },
  { to: '/people', label: 'People' },
  { to: '/saved', label: 'Saved' },
  { to: '/settings', label: 'Settings' },
  { to: '/admin', label: 'Admin' },
]

export function AppLayout() {
  const auth = useAuth()
  const userLabel = auth.status === 'authenticated' ? auth.user.displayName : ''

  return (
    <div className="flex h-full">
      <aside className="flex w-56 flex-col border-e border-slate-800 bg-slate-900 p-4">
        <Link to="/" className="mb-6 text-lg font-semibold text-sky-400">
          ɳChat
        </Link>
        <nav className="flex flex-col gap-1">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-6 py-3">
          <span className="text-sm text-slate-400">ɳChat</span>
          {userLabel && <span className="text-sm text-slate-300">{userLabel}</span>}
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
