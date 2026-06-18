/**
 * Purpose:    SPA entry point. Mounts the React tree with the canonical provider stack:
 *             urql (GraphQL) → React Query → BrowserRouter → @nself/auth-core → i18n.
 *             Sets html[lang] + html[dir] eagerly for RTL locales (no layout flash).
 * Inputs:     navigator.language (locale detection); DOM #root element.
 * Outputs:    Mounted React app in #root.
 * Constraints:Client-only (no SSR). Auth uses the cookie web strategy (@nself/auth-core).
 *             GraphQL goes directly to Hasura via @nself/graphql-client (canonical §2).
 * SOT:        F-NCHAT-VITE-ENTRY-01
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Provider as UrqlProvider } from 'urql'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { NselfAuthProvider, createWebAuthStrategy } from '@nself/auth-core'
import { NselfI18nProvider } from '@nself/i18n'

import { gqlClient } from '@/lib/graphql-client'
import { App } from '@/App'

import '@/styles/tailwind.css'

// ─── Locale + RTL direction — set before React hydrates to avoid a layout flash ──
const RTL_LOCALES = new Set(['ar', 'he', 'fa', 'ur'])
const detectedLocale = (navigator.language ?? 'en').split('-')[0] || 'en'
document.documentElement.lang = detectedLocale
document.documentElement.dir = RTL_LOCALES.has(detectedLocale) ? 'rtl' : 'ltr'

// ─── Provider singletons (created once, never re-instantiated) ───────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
})

const authStrategy = createWebAuthStrategy({
  authBaseUrl:
    (import.meta.env.VITE_AUTH_URL as string | undefined) ??
    'https://api.local.nself.org/v1/auth',
})

const root = document.getElementById('root')
if (!root) throw new Error('Root element #root not found')

createRoot(root).render(
  <StrictMode>
    <UrqlProvider value={gqlClient}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <NselfAuthProvider strategy={authStrategy}>
            <NselfI18nProvider>
              <App />
            </NselfI18nProvider>
          </NselfAuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </UrqlProvider>
  </StrictMode>,
)
