/**
 * Main Mobile App Component for nself-chat
 *
 * Integrates shared packages (@nself-chat/core, api, state, ui)
 * with mobile-specific adapters and navigation
 */

import React, { useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'

// Import shared packages (demonstrates integration)
import { logger } from '@nself-chat/core'
import { ApolloProvider } from '@nself-chat/api'
import { useAuthStore } from '@nself-chat/state'

// Import mobile-specific hooks and adapters
import { usePushNotifications } from './hooks/use-push-notifications'
import { useNetworkStatus } from './hooks/use-network-status'
import { mobileStorage } from './adapters/storage'

// Import UI components from shared package
import '@nself-chat/ui/styles.css'

/**
 * Main App Component
 *
 * Sets up:
 * - Apollo GraphQL client (from @nself-chat/api)
 * - State management (from @nself-chat/state)
 * - Mobile platform adapters
 * - Push notifications
 * - Network monitoring
 *
 * @example
 * ```typescript
 * import { App } from './App'
 * import { createRoot } from 'react-dom/client'
 *
 * createRoot(document.getElementById('root')!).render(<App />)
 * ```
 */
export function App() {
  const { user, isAuthenticated } = useAuthStore()
  const { register, onNotificationReceived, onNotificationAction } =
    usePushNotifications()
  const networkStatus = useNetworkStatus()

  // Initialize mobile app
  useEffect(() => {
    initializeApp()
  }, [])

  // Setup push notifications
  useEffect(() => {
    if (isAuthenticated) {
      register()

      // Handle notifications received while app is in foreground
      const cleanupReceived = onNotificationReceived((notification) => {
        logger.info('[App] Notification received:', notification)
      })

      // Handle notification taps — deep link to the relevant channel/DM
      const cleanupAction = onNotificationAction((action) => {
        logger.info('[App] Notification action:', action)
        const channelId = action?.notification?.data?.channelId
        if (channelId) {
          window.location.hash = `/chat/channel/${channelId}`
        }
      })

      return () => {
        cleanupReceived()
        cleanupAction()
      }
    }
  }, [isAuthenticated])

  // Monitor network status
  useEffect(() => {
    if (networkStatus.offline) {
      logger.warn('[App] Device is offline')
      document.body.classList.add('offline-mode')
    } else if (networkStatus.cellular) {
      logger.info('[App] Connected via cellular')
      document.body.classList.add('data-saver-mode')
      document.body.classList.remove('offline-mode')
    } else if (networkStatus.wifi) {
      document.body.classList.remove('offline-mode', 'data-saver-mode')
      logger.info('[App] Connected via Wi-Fi')
    }
  }, [networkStatus.connected, networkStatus.connectionType])

  return (
    <ApolloProvider>
      <BrowserRouter>
        <div className="app">
          {networkStatus.offline && (
            <div className="offline-banner" style={{background:'#ef4444',color:'white',padding:'8px',textAlign:'center'}}>
              You are offline. Messages will sync when connected.
            </div>
          )}
          <h1>nself-chat Mobile</h1>
          <p>Status: {networkStatus.connectionTypeName}</p>
          <p>User: {user?.email || 'Not logged in'}</p>
          {/* Navigation handled by BrowserRouter hash routes */}
        </div>
      </BrowserRouter>
    </ApolloProvider>
  )
}

/**
 * Initialize mobile app
 */
async function initializeApp() {
  logger.info('[App] Initializing mobile app')

  try {
    // Check storage
    const keys = await mobileStorage.keys()
    logger.info(`[App] Storage has ${keys.length} keys`)

    // Load cached auth state
    const cachedAuth = await mobileStorage.getItem('auth_state')
    if (cachedAuth) {
      logger.info('[App] Found cached auth state')
    }

    logger.info('[App] Mobile app initialized successfully')
  } catch (error) {
    logger.error('[App] Initialization error:', error)
  }
}

export default App
