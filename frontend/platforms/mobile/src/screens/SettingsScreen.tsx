/**
 * SettingsScreen
 *
 * Routes to the settings area of the Next.js web app running inside the
 * Capacitor WebView.
 */

import React, { useEffect } from 'react'

/**
 * SettingsScreen — syncs the hash route so the Next.js router shows
 * the settings page.
 */
export function SettingsScreen() {
  useEffect(() => {
    if (window.location.hash !== '#/settings') {
      window.location.hash = '/settings'
    }
  }, [])

  // UI is rendered by the Next.js web app inside the WebView.
  return null
}

export default SettingsScreen
