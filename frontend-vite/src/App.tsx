/**
 * Purpose:    Root router for the ɳChat Vite SPA. Maps all 107 legacy page groups to
 *             react-router routes: public routes are flat; authenticated routes nest under
 *             <RequireAuth> + <AppLayout>. Pages lazy-load (Suspense) the AsyncScreen
 *             placeholder until each legacy page is ported (P3 migration plan, Wave N-3..N).
 * Inputs:     BrowserRouter context (from main.tsx); route table from routes.generated.tsx.
 * Outputs:    Routed page tree wrapped in an ErrorBoundary + Suspense.
 * Constraints:SPA. Public = /login, /signup, /auth/*, /invite/*, /setup, /offline, marketing.
 *             Everything else requires auth. Catch-all redirects unknown paths to "/".
 * SOT:        F-NCHAT-VITE-APP-01
 */
import { Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { ErrorBoundary } from '@nself/ui'
import { RequireAuth } from '@/components/RequireAuth'
import { AppLayout } from '@/components/AppLayout'
import { PUBLIC_ROUTES, PROTECTED_ROUTES, HomePage } from '@/routes.generated'

function RouteFallback() {
  return (
    <div className="flex h-full min-h-[40vh] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
    </div>
  )
}

export function App() {
  return (
    <ErrorBoundary fallback={<RouteFallback />}>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Public routes — no auth gate. */}
          {PUBLIC_ROUTES.map(({ path, Component }) => (
            <Route key={path} path={path} element={<Component />} />
          ))}

          {/* Authenticated routes — nested under the auth gate + app shell. */}
          <Route element={<RequireAuth />}>
            <Route element={<AppLayout />}>
              <Route index element={<HomePage />} />
              {PROTECTED_ROUTES.map(({ path, Component }) => (
                // Strip the leading slash so the route nests under AppLayout.
                <Route key={path} path={path.replace(/^\//, '')} element={<Component />} />
              ))}
            </Route>
          </Route>

          {/* Catch-all — redirect unknown paths home. */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  )
}
