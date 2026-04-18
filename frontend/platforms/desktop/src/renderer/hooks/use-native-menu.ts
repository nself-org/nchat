/**
 * useNativeMenu Hook
 *
 * React hook that registers renderer-side callbacks for native Electron menu
 * actions. The Electron main process sends IPC events (e.g. 'new-conversation')
 * when the user selects a menu item; this hook wires those events to the
 * appropriate React handler.
 */

import { useEffect } from 'react'

/**
 * Menu action callback type
 */
export type MenuActionCallback = () => void

/**
 * IPC event channel names sent by the main process menu
 */
const MENU_EVENTS = {
  newConversation: 'new-conversation',
  preferences: 'open-preferences',
  about: 'open-about',
  quit: 'app-quit',
} as const

/**
 * useNativeMenu Hook
 *
 * Registers callbacks for native Electron menu actions via contextBridge IPC.
 *
 * @example
 * ```typescript
 * function App() {
 *   useNativeMenu({
 *     onNewConversation: () => setShowNewConversation(true),
 *     onPreferences: () => navigate('/settings'),
 *   })
 *
 *   return <div>App</div>
 * }
 * ```
 */
export function useNativeMenu(callbacks: {
  onNewConversation?: MenuActionCallback
  onPreferences?: MenuActionCallback
  onAbout?: MenuActionCallback
  onQuit?: MenuActionCallback
}) {
  useEffect(() => {
    // contextBridge exposes window.electronAPI in the renderer process.
    // If the API is not present (e.g. in a browser dev environment), skip.
    const api = (window as Window & { electronAPI?: ElectronAPI }).electronAPI
    if (!api?.on) return

    const handlers: Array<{ channel: string; fn: MenuActionCallback }> = []

    if (callbacks.onNewConversation) {
      handlers.push({ channel: MENU_EVENTS.newConversation, fn: callbacks.onNewConversation })
    }
    if (callbacks.onPreferences) {
      handlers.push({ channel: MENU_EVENTS.preferences, fn: callbacks.onPreferences })
    }
    if (callbacks.onAbout) {
      handlers.push({ channel: MENU_EVENTS.about, fn: callbacks.onAbout })
    }
    if (callbacks.onQuit) {
      handlers.push({ channel: MENU_EVENTS.quit, fn: callbacks.onQuit })
    }

    // Register all handlers
    handlers.forEach(({ channel, fn }) => {
      api.on(channel, fn)
    })

    // Cleanup on unmount
    return () => {
      handlers.forEach(({ channel, fn }) => {
        api.off?.(channel, fn)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    callbacks.onNewConversation,
    callbacks.onPreferences,
    callbacks.onAbout,
    callbacks.onQuit,
  ])
}

/**
 * Trigger a native menu action programmatically from the renderer.
 *
 * Useful for keyboard shortcut handlers that want to invoke the same
 * action as a menu item without duplicating logic.
 */
export function triggerMenuAction(action: keyof typeof MENU_EVENTS): void {
  const api = (window as Window & { electronAPI?: ElectronAPI }).electronAPI
  if (!api?.send) return
  api.send(MENU_EVENTS[action])
}

/**
 * Minimal type for the contextBridge-exposed API.
 * Full definition lives in the preload/index.ts type declarations.
 */
interface ElectronAPI {
  on: (channel: string, listener: (...args: unknown[]) => void) => void
  off?: (channel: string, listener: (...args: unknown[]) => void) => void
  send: (channel: string, ...args: unknown[]) => void
}
