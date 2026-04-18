/**
 * Electron Main Process Entry Point
 *
 * Manages the application lifecycle, window creation,
 * and communication between main and renderer processes.
 */

import { app } from 'electron'
import { WindowManager } from './window-manager'
import { createMenu } from './menu'
import { createTray } from './tray'
import { setupAutoUpdater } from './auto-updater'
import { setupIpcHandlers } from './ipc-handlers'
import { setupShortcuts } from './shortcuts'

// Global window manager instance
let windowManager: WindowManager

/**
 * Register nchat:// deep link protocol
 *
 * On macOS/Linux, the OS sends 'open-url' events to the app process.
 * On Windows, the URL is passed as a command-line argument.
 * Both paths route the parsed URL into the renderer via IPC.
 */
function registerDeepLinkProtocol(): void {
  // Windows: handle the protocol via single-instance lock
  if (process.platform === 'win32') {
    const args = process.argv.slice(1)
    const deepLink = args.find((arg) => arg.startsWith('nchat://'))
    if (deepLink) {
      handleDeepLink(deepLink)
    }
  }

  // macOS/Linux: handle via open-url event
  app.on('open-url', (event, url) => {
    event.preventDefault()
    handleDeepLink(url)
  })
}

/**
 * Route a deep link URL into the renderer process.
 *
 * nchat://channel/<id>  → navigate to channel
 * nchat://dm/<userId>   → open DM with user
 * nchat://join/<invite> → accept workspace invite
 */
function handleDeepLink(url: string): void {
  console.log('[Main] Deep link received:', url)
  const mainWindow = windowManager?.getMainWindow()
  if (mainWindow) {
    mainWindow.show()
    mainWindow.focus()
    mainWindow.webContents.send('deep-link', url)
  }
}

/**
 * Initialize the application
 */
async function initialize() {
  try {
    console.log('[Main] Initializing nChat desktop app')

    // Set canonical app name (shown in macOS menu bar, Taskbar, etc.)
    app.setName('nChat')

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

// Register deep link protocol before app is ready (required on macOS)
app.setAsDefaultProtocolClient('nchat')

// Ensure single instance — second launch sends args to the first
const gotSingleInstanceLock = app.requestSingleInstanceLock()
if (!gotSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', (_event, argv) => {
    // Focus existing window and route the deep link if present
    const mainWindow = windowManager?.getMainWindow()
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
    const deepLink = argv.find((arg) => arg.startsWith('nchat://'))
    if (deepLink) {
      handleDeepLink(deepLink)
    }
  })
}

/**
 * Handle application ready event
 */
app.on('ready', async () => {
  registerDeepLinkProtocol()
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
 * On macOS, recreate window when dock icon is clicked and show it
 */
app.on('activate', async () => {
  const mainWindow = windowManager?.getMainWindow()
  if (!mainWindow) {
    await windowManager.createMainWindow()
  } else {
    mainWindow.show()
    mainWindow.focus()
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
