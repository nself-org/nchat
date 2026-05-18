/**
 * Mobile RouterAdapter — bridges react-router-dom to @nself-chat/ui's RouterAdapterContext.
 *
 * The mobile app uses BrowserRouter (react-router-dom v7). This adapter wraps
 * the react-router-dom hooks and provides the adapter to all @nself-chat/ui components.
 *
 * Usage:
 * ```tsx
 * <BrowserRouter>
 *   <MobileRouterProvider>
 *     <App />
 *   </MobileRouterProvider>
 * </BrowserRouter>
 * ```
 */

import React from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { RouterAdapterContext, type RouterAdapter } from '@nself-chat/ui/adapters'

/**
 * Inner provider — must be inside BrowserRouter to access react-router-dom hooks.
 */
function MobileRouterAdapterInner({ children }: { children: React.ReactNode }): React.ReactElement {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const location = useLocation()

  const adapter: RouterAdapter = React.useMemo(
    () => ({
      push(path: string) {
        navigate(path)
      },
      replace(path: string) {
        navigate(path, { replace: true })
      },
      back() {
        navigate(-1)
      },
      get query(): Record<string, string | string[]> {
        const out: Record<string, string | string[]> = {}
        searchParams.forEach((value, key) => {
          const existing = out[key]
          if (existing === undefined) {
            out[key] = value
          } else if (Array.isArray(existing)) {
            existing.push(value)
          } else {
            out[key] = [existing, value]
          }
        })
        return out
      },
      get pathname(): string {
        return location.pathname
      },
    }),
    // navigate is stable, but searchParams and location change on route transitions
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [navigate, searchParams, location.pathname]
  )

  return (
    <RouterAdapterContext.Provider value={adapter}>
      {children}
    </RouterAdapterContext.Provider>
  )
}

/**
 * MobileRouterProvider — wraps children with the mobile RouterAdapter.
 * Must be rendered inside a react-router-dom BrowserRouter.
 */
export function MobileRouterProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  return <MobileRouterAdapterInner>{children}</MobileRouterAdapterInner>
}
