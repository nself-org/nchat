/**
 * System Tray for Electron
 *
 * Creates system tray icon and context menu
 */

import { Tray, Menu, nativeImage, app } from 'electron'
import path from 'path'
import type { WindowManager } from './window-manager'

let tray: Tray | null = null

/**
 * Create system tray icon
 *
 * Provides quick access to app from system tray
 *
 * @param windowManager - Window manager instance
 */
export function createTray(windowManager: WindowManager): Tray {
  if (tray) {
    return tray
  }

  // Create tray icon
  // In production, use icon from build/icons/
  // In development, use a simple colored icon
  const iconPath =
    process.env.NODE_ENV === 'production'
      ? path.join(__dirname, '../../build/icons/tray-icon.png')
      : path.join(__dirname, '../../build/icons/icon.png')

  let icon: Electron.NativeImage
  try {
    icon = nativeImage.createFromPath(iconPath)
    if (icon.isEmpty()) {
      // Fallback: create a simple icon
      icon = nativeImage.createFromDataURL(
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
      )
    }
  } catch {
    // Fallback icon
    icon = nativeImage.createFromDataURL(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    )
  }

  tray = new Tray(icon)

  // Create context menu
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show App',
      click: () => {
        windowManager.focusMainWindow()
      },
    },
    {
      label: 'New Conversation',
      click: () => {
        const win = windowManager.focusMainWindow()
        win?.webContents.send('new-conversation')
      },
    },
    { type: 'separator' },
    {
      label: 'Preferences',
      click: () => {
        windowManager.createPreferencesWindow()
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit()
      },
    },
  ])

  tray.setContextMenu(contextMenu)
  tray.setToolTip('nself-chat')

  // Handle tray click
  tray.on('click', () => {
    windowManager.focusMainWindow()
  })

  console.log('[Tray] System tray created')
  return tray
}

/**
 * Update tray badge (for unread count, etc.)
 */
export function updateTrayBadge(count: number): void {
  if (!tray) return

  if (count > 0) {
    tray.setToolTip(`nself-chat (${count} unread)`)
  } else {
    tray.setToolTip('nself-chat')
  }
}

/**
 * Destroy tray icon
 */
export function destroyTray(): void {
  if (tray) {
    tray.destroy()
    tray = null
  }
}
