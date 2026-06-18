/**
 * Purpose:    Route guard. Renders the protected subtree only for authenticated users;
 *             redirects to /auth/signin otherwise; shows a spinner while auth resolves.
 * Inputs:     useAuth() from @nself/auth-core (cookie web strategy).
 * Outputs:    <Outlet /> when authenticated; <Navigate> or spinner otherwise.
 * Constraints:Must NOT import any server-side / Node auth helpers. Wrap at route level.
 * SOT:        F-NCHAT-VITE-REQUIRE-AUTH-01
 */
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@nself/auth-core'

export function RequireAuth() {
  const auth = useAuth()
  const location = useLocation()

  if (auth.status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
      </div>
    )
  }

  if (auth.status !== 'authenticated') {
    const redirect = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/auth/signin?redirect=${redirect}`} replace />
  }

  return <Outlet />
}
