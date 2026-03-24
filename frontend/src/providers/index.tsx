'use client'

/**
 * Combined App Providers
 *
 * Wraps all application providers in the correct order with proper
 * dependency management. This component should be used in the root layout.
 */

import React, { ReactNode, useEffect, useState } from 'react'
import { ApolloProvider } from '@apollo/client'
import { ThemeProvider as NextThemeProvider } from 'next-themes'
import { Toaster } from 'sonner'

// Apollo
import { apolloClient, setAuthToken, setTokenRefreshCallback } from '@/lib/apollo/client'

// Nhost
import { NhostProvider } from './nhost-provider'
import { nhost } from '@/lib/nhost'

// App Providers
import { AppConfigProvider } from '@/contexts/app-config-context'
import { AuthProvider, useAuth } from '@/contexts/auth-context'
import { ChatProvider } from '@/contexts/chat-context'
import { TemplateProvider } from '@/templates/hooks/use-template'
// TEMPORARILY DISABLED: E2EE uses native Node.js modules that can't be bundled for browser
// import { E2EEProvider } from '@/contexts/e2ee-context';

// Socket
import { SocketProvider } from '@/lib/socket/providers/socket-provider'

// Realtime (nself-plugins integration)
import { RealtimeProvider } from './realtime-provider'

// PWA
import { PWAProvider } from './pwa-provider'

// Components
import { ThemeInjector } from '@/components/theme-injector'
import { AnnouncerProvider } from '@/components/accessibility/live-region'

import { logger } from '@/lib/logger'

// =============================================================================
// Types
// =============================================================================

export interface AppProvidersProps {
  children: ReactNode
}

// =============================================================================
// Error Boundary
// =============================================================================

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends React.Component<
  { children: ReactNode; fallback?: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('App Error Boundary caught an error:', error, {
      componentStack: errorInfo.componentStack,
    })

    // Report to error tracking service
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('nchat:app-error', {
          detail: { error, errorInfo },
        })
      )
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <div className="max-w-md text-center">
            <h1 className="mb-4 text-2xl font-bold text-foreground">Something went wrong</h1>
            <p className="mb-6 text-muted-foreground">
              We apologize for the inconvenience. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="text-primary-foreground hover:bg-primary/90 rounded-lg bg-primary px-4 py-2"
            >
              Refresh Page
            </button>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <pre className="mt-4 max-h-40 overflow-auto rounded bg-muted p-2 text-left text-xs text-muted-foreground">
                {this.state.error.message}
                {'\n'}
                {this.state.error.stack}
              </pre>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// =============================================================================
// Auth Token Sync
// =============================================================================

/**
 * Component that syncs auth token with Apollo client
 */
function AuthTokenSync({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()

  useEffect(() => {
    // Get token from localStorage or session
    const token = typeof window !== 'undefined' ? localStorage.getItem('nchat-token') : null

    if (token) {
      setAuthToken(token)
    } else if (!user && !loading) {
      setAuthToken(null)
    }
  }, [user, loading])

  // Set up token refresh callback
  useEffect(() => {
    setTokenRefreshCallback(async () => {
      try {
        // Try to refresh via nhost
        const session = nhost.auth.getSession()
        if (session?.accessToken) {
          localStorage.setItem('nchat-token', session.accessToken)
          return session.accessToken
        }
        return null
      } catch (error) {
        logger.error('Token refresh failed:', { context: error })
        return null
      }
    })
  }, [])

  return <>{children}</>
}

// =============================================================================
// Socket Auth Sync
// =============================================================================

/**
 * Component that provides socket connection with auth token
 */
function SocketAuthProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('nchat-token') : null
    setToken(storedToken)
  }, [user])

  return (
    <SocketProvider
      token={token}
      userId={user?.id ?? null}
      autoConnect={!!user}
      onConnect={() => {
        window.dispatchEvent(new CustomEvent('nchat:connected'))
      }}
      onDisconnect={(reason) => {
        window.dispatchEvent(new CustomEvent('nchat:disconnected'))
      }}
      onError={(error) => {
        logger.error('[Socket] Error:', error)
      }}
    >
      {children}
    </SocketProvider>
  )
}

// =============================================================================
// Notification Provider
// =============================================================================

/**
 * Toast notification provider using sonner
 */
function NotificationProvider({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        position="top-right"
        expand={false}
        richColors
        closeButton
        toastOptions={{
          className: 'nchat-toast',
          duration: 4000,
        }}
      />
    </>
  )
}

// =============================================================================
// Modal Provider
// =============================================================================

interface ModalContextValue {
  openModal: (id: string, data?: Record<string, unknown>) => void
  closeModal: () => void
  activeModal: string | null
  modalData: Record<string, unknown> | null
}

const ModalContext = React.createContext<ModalContextValue | null>(null)

export function useModal() {
  const context = React.useContext(ModalContext)
  if (!context) {
    throw new Error('useModal must be used within ModalProvider')
  }
  return context
}

function ModalProvider({ children }: { children: ReactNode }) {
  const [activeModal, setActiveModal] = useState<string | null>(null)
  const [modalData, setModalData] = useState<Record<string, unknown> | null>(null)

  const openModal = React.useCallback((id: string, data?: Record<string, unknown>) => {
    setActiveModal(id)
    setModalData(data ?? null)
  }, [])

  const closeModal = React.useCallback(() => {
    setActiveModal(null)
    setModalData(null)
  }, [])

  const value = React.useMemo(
    () => ({ openModal, closeModal, activeModal, modalData }),
    [openModal, closeModal, activeModal, modalData]
  )

  return <ModalContext.Provider value={value}>{children}</ModalContext.Provider>
}

// =============================================================================
// Accessibility Skip Links
// =============================================================================

function SkipLinks() {
  return (
    <div className="skip-links">
      <a
        href="#main-content"
        className="focus:text-primary-foreground sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to main content
      </a>
      <a
        href="#sidebar"
        className="focus:text-primary-foreground sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-14 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to sidebar
      </a>
      <a
        href="#message-input"
        className="focus:text-primary-foreground sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-24 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to message input
      </a>
    </div>
  )
}

// =============================================================================
// Combined App Providers
// =============================================================================

/**
 * Main AppProviders component that wraps all providers in the correct order.
 *
 * Provider Order (outer to inner):
 * 1. ErrorBoundary - Catches React errors
 * 2. NhostProvider - Nhost client for auth backend
 * 3. AppConfigProvider - App configuration
 * 4. TemplateProvider - Platform templates (Slack, Discord, etc.)
 * 5. NextThemeProvider - Theme (light/dark mode)
 * 6. ApolloProvider - GraphQL client
 * 7. AuthProvider - Authentication state
 * 8. AuthTokenSync - Sync auth token with Apollo
 * 9. E2EEProvider - End-to-End Encryption (TEMPORARILY DISABLED)
 * 10. SocketAuthProvider - Socket.io with auth
 * 11. ChatProvider - Chat state
 * 12. ModalProvider - Modal management
 * 13. NotificationProvider - Toast notifications
 * 14. AnnouncerProvider - Screen reader announcements
 */
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ErrorBoundary>
      <NhostProvider>
        <AppConfigProvider>
          <TemplateProvider>
            <NextThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <ThemeInjector />
              <ApolloProvider client={apolloClient}>
                <AuthProvider>
                  <AuthTokenSync>
                    {/* E2EEProvider temporarily disabled - uses Node.js native modules */}
                    <SocketAuthProvider>
                      <ChatProvider>
                        <ModalProvider>
                          <NotificationProvider>
                            <AnnouncerProvider>
                              <PWAProvider>
                                <SkipLinks />
                                {children}
                              </PWAProvider>
                            </AnnouncerProvider>
                          </NotificationProvider>
                        </ModalProvider>
                      </ChatProvider>
                    </SocketAuthProvider>
                  </AuthTokenSync>
                </AuthProvider>
              </ApolloProvider>
            </NextThemeProvider>
          </TemplateProvider>
        </AppConfigProvider>
      </NhostProvider>
    </ErrorBoundary>
  )
}

// =============================================================================
// Exports
// =============================================================================

export { ErrorBoundary }
export { ModalProvider, ModalContext }
export { NotificationProvider }
export { SkipLinks }
export { RealtimeProvider, useRealtimeContext } from './realtime-provider'

export default AppProviders
