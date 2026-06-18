/**
 * Purpose:    Shared admin chrome for every ported /admin/* page. Provides the role gate
 *             (owner/admin only), the page-header band, and the section/card primitives the
 *             legacy admin pages relied on (admin-layout, StatsCard, Tabs, Badge). Keeps each
 *             ported page small and DRY (canonical-patterns §0, §4).
 * Inputs:     useAuth() from @nself/auth-core for the role gate; presentational props otherwise.
 * Outputs:    Admin frame + reusable section primitives. No data fetching here.
 * Constraints:Presentational only. Owner/admin gate mirrors the legacy
 *             `["owner","admin"].includes(user.role)` guard + the moderator-capable variant.
 * SOT:        F-NCHAT-VITE-ADMIN-SCAFFOLD-01
 */
import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@nself/auth-core'

type AdminRole = 'owner' | 'admin' | 'moderator' | 'member' | 'guest'

/** Read the current user's role from auth-core, tolerating shape differences. */
function useRole(): { loading: boolean; authed: boolean; role: AdminRole | null } {
  const auth = useAuth() as {
    status: string
    user?: { role?: string; defaultRole?: string; roles?: string[] }
  }
  if (auth.status === 'loading') return { loading: true, authed: false, role: null }
  if (auth.status !== 'authenticated' || !auth.user) {
    return { loading: false, authed: false, role: null }
  }
  const raw =
    auth.user.role ??
    auth.user.defaultRole ??
    (Array.isArray(auth.user.roles) ? auth.user.roles[0] : undefined) ??
    'member'
  return { loading: false, authed: true, role: raw as AdminRole }
}

interface GateProps {
  /** Roles permitted to view the page. Defaults to owner + admin. */
  allow?: AdminRole[]
  children: ReactNode
}

/**
 * AdminGate — role guard for admin pages. Mirrors the legacy redirect-to-/chat behaviour
 * but renders an in-place access-denied panel (SPA pattern) instead of a hard redirect once
 * authenticated, and defers to /auth/signin when unauthenticated.
 */
export function AdminGate({ allow = ['owner', 'admin'], children }: GateProps) {
  const { loading, authed, role } = useRole()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center" role="status">
        <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
      </div>
    )
  }
  if (!authed) {
    const redirect = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/auth/signin?redirect=${redirect}`} replace />
  }
  if (!role || !allow.includes(role)) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center" role="status">
        <h2 className="text-xl font-semibold text-slate-200">Access denied</h2>
        <p className="mt-2 max-w-md text-sm text-slate-400">
          You do not have permission to view this admin page.
        </p>
      </div>
    )
  }
  return <>{children}</>
}

interface PageHeaderProps {
  icon?: ReactNode
  title: string
  description?: string
  actions?: ReactNode
  back?: ReactNode
}

/** PageHeader — the title/description/actions band shared by every admin page. */
export function AdminPageHeader({ icon, title, description, actions, back }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        {back}
        <h1 className="flex items-center gap-3 text-2xl font-bold text-slate-100">
          {icon}
          {title}
        </h1>
        {description && <p className="mt-1 text-sm text-slate-400">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

/** AdminSection — a bordered surface with optional header (replaces shadcn Card). */
export function AdminSection({
  title,
  description,
  actions,
  children,
  className = '',
}: {
  title?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`rounded-lg border border-slate-800 bg-slate-900/50 ${className}`}>
      {(title || actions) && (
        <header className="flex items-start justify-between gap-4 border-b border-slate-800 px-5 py-4">
          <div>
            {title && <h2 className="text-sm font-semibold text-slate-200">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-slate-400">{description}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  )
}

/** Page wrapper that applies the admin container width + vertical rhythm. */
export function AdminPage({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-7xl space-y-6">{children}</div>
}
