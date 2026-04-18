/**
 * AuthScreen
 *
 * Renders the sign-in / sign-up experience inside the Capacitor WebView.
 *
 * In Capacitor the full Next.js web app is loaded as the WebView content via
 * capacitor.config.json `webDir`. Native screens are thin routing shells that
 * ensure the user sees the correct web route. When the web app detects it is
 * running inside Capacitor (via `window.Capacitor.isNativePlatform()`) it
 * applies mobile-specific styling (safe-area insets, keyboard avoidance, etc.).
 *
 * This component redirects the WebView hash to /auth so the Next.js router
 * shows the sign-in page.
 */

import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@nself-chat/state'

/**
 * AuthScreen — routes to /auth in the web app shell.
 *
 * If the user is already authenticated, redirects to /chat immediately.
 */
export function AuthScreen() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/chat', { replace: true })
      return
    }

    // Sync the hash route so the Next.js router sees /auth
    if (window.location.hash !== '#/auth') {
      window.location.hash = '/auth'
    }
  }, [isAuthenticated, navigate])

  // The actual UI is rendered by the Next.js app inside the WebView.
  // Return null here — this component's job is routing only.
  return null
}

export default AuthScreen
