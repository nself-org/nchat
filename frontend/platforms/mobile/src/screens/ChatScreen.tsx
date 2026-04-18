/**
 * ChatScreen
 *
 * Main workspace screen — renders the nChat workspace inside the Capacitor
 * WebView. Supports deep linking to a specific channel or DM thread via
 * React Router params.
 *
 * Route params:
 *   /chat                      → default workspace view (last-active channel)
 *   /chat/channel/:channelId   → jump to a specific channel
 *   /chat/dm/:userId           → jump to a DM thread
 */

import React, { useEffect } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { useAuthStore } from '@nself-chat/state'

/**
 * ChatScreen — syncs the React Router location to the hash route consumed
 * by the Next.js router running inside the WebView.
 */
export function ChatScreen() {
  const { channelId, userId } = useParams<{ channelId?: string; userId?: string }>()
  const { pathname } = useLocation()
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (!isAuthenticated) return

    // Compute the target hash route for the Next.js app
    let targetHash: string

    if (channelId) {
      targetHash = `/chat/channel/${channelId}`
    } else if (userId) {
      targetHash = `/chat/dm/${userId}`
    } else {
      targetHash = '/chat'
    }

    if (window.location.hash !== `#${targetHash}`) {
      window.location.hash = targetHash
    }
  }, [channelId, userId, pathname, isAuthenticated])

  // The actual UI is rendered by the Next.js app inside the WebView.
  return null
}

export default ChatScreen
