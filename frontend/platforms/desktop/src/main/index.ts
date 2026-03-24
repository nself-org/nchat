/**
 * Electron Main Process Entry Point
 *
 * Manages the application lifecycle, window creation,
 * and communication between main and renderer processes.
 */

import { app, BrowserWindow } from 'electron'
import path from 'path'
import { WindowManager } from './window-manager'
import { createMenu } from './menu'
import { createTray } from './tray'
import { setupAutoUpdater } from './auto-updater'
import { setupIpcHandlers } from './ipc-handlers'
import { setupShortcuts } from './shortcuts'

// Global window manager instance
let windowManager: WindowManager

/**
 * Initialize the application
 */
async function initialize() {
  try {
    console.log('[Main] Initializing nself-chat desktop app')

    // Create window manager
    windowManager = new WindowManager()

    // Setup IPC handlers
    setupIpcHandlers()

    // Create main window
    await windowManager.createMainWindow()

    // Create application menu
    createMenu()

    // Create system tray
    if (process.platform !== 'darwin' || !app.dock) {
      createTray(windowManager)
    }

    // Setup global keyboard shortcuts
    setupShortcuts(windowManager)

    // Setup auto-updater (production only)
    if (process.env.NODE_ENV === 'production') {
      setupAutoUpdater()
    }

    console.log('[Main] Application initialized successfully')
  } catch (error) {
    console.error('[Main] Initialization error:', error)
    throw error
  }
}

/**
 * Handle application ready event
 */
app.on('ready', async () => {
  await initialize()
})

/**
 * Handle window-all-closed event
 * On macOS, apps stay active until Cmd+Q
 */
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

/**
 * Handle activate event
 * On macOS, recreate window when dock icon is clicked
 */
app.on('activate', async () => {
  if (!windowManager.getMainWindow()) {
    await windowManager.createMainWindow()
  }
})

/**
 * Handle before-quit event
 * Cleanup before application exits
 */
app.on('before-quit', () => {
  console.log('[Main] Application quitting')
  // Cleanup logic here
})

/**
 * Handle uncaught errors
 */
process.on('uncaughtException', (error) => {
  console.error('[Main] Uncaught exception:', error)
  // Errors logged to console; Sentry integration available via SENTRY_DSN env var
  if (process.env.SENTRY_DSN) {
    try { require('@sentry/electron').captureException(error) } catch {}
  }
})

process.on('unhandledRejection', (reason) => {
  console.error('[Main] Unhandled rejection:', reason)
  if (process.env.SENTRY_DSN) {
    try { require('@sentry/electron').captureException(reason) } catch {}
  }
})

// Export for access from other modules
export { windowManager }
