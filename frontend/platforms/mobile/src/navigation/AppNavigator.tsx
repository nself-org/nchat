/**
 * AppNavigator — Root router for the nChat mobile app.
 *
 * Uses React Router v7 hash-based routing (BrowserRouter + hash routes)
 * which works in Capacitor's WebView without a server.
 *
 * Route structure:
 *   /                  → redirect to /chat or /auth depending on auth state
 *   /auth              → sign-in screen
 *   /chat              → main chat workspace (channels sidebar + message pane)
 *   /chat/channel/:id  → specific channel
 *   /chat/dm/:userId   → direct message thread
 *   /settings          → app settings
 */

import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@nself-chat/state'

// Lazy-load screens to reduce initial bundle
const AuthScreen = lazy(() =>
  import('../screens/AuthScreen').then((m) => ({ default: m.AuthScreen }))
)
const ChatScreen = lazy(() =>
  import('../screens/ChatScreen').then((m) => ({ default: m.ChatScreen }))
)
const SettingsScreen = lazy(() =>
  import('../screens/SettingsScreen').then((m) => ({ default: m.SettingsScreen }))
)

/**
 * Full-screen loading indicator shown while lazy screens hydrate.
 */
function ScreenLoader() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#0F0F1A',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          border: '3px solid rgba(99,102,241,0.3)',
          borderTopColor: '#6366F1',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

/**
 * Route guard — redirects unauthenticated users to /auth.
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />
  }
  return <>{children}</>
}

/**
 * AppNavigator — renders the correct screen based on the current route
 * and authentication state.
 */
export function AppNavigator() {
  const { isAuthenticated } = useAuthStore()

  return (
    <Suspense fallback={<ScreenLoader />}>
      <Routes>
        {/* Root: redirect based on auth state */}
        <Route
          path="/"
          element={<Navigate to={isAuthenticated ? '/chat' : '/auth'} replace />}
        />

        {/* Auth */}
        <Route path="/auth" element={<AuthScreen />} />

        {/* Chat — protected */}
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <ChatScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat/channel/:channelId"
          element={
            <ProtectedRoute>
              <ChatScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat/dm/:userId"
          element={
            <ProtectedRoute>
              <ChatScreen />
            </ProtectedRoute>
          }
        />

        {/* Settings — protected */}
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsScreen />
            </ProtectedRoute>
          }
        />

        {/* Catch-all */}
        <Route
          path="*"
          element={<Navigate to={isAuthenticated ? '/chat' : '/auth'} replace />}
        />
      </Routes>
    </Suspense>
  )
}

export default AppNavigator
