/**
 * Auto-Updater for Electron
 *
 * Handles automatic application updates
 */

import { autoUpdater } from 'electron-updater'
import { dialog, BrowserWindow } from 'electron'

/**
 * Setup auto-updater
 *
 * Checks for updates and prompts user to download
 */
export function setupAutoUpdater(): void {
  // Configure auto-updater
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  // Check for updates on startup
  autoUpdater.checkForUpdatesAndNotify()

  // Check for updates every 4 hours
  setInterval(
    () => {
      autoUpdater.checkForUpdatesAndNotify()
    },
    4 * 60 * 60 * 1000
  )

  // Handle update available
  autoUpdater.on('update-available', (info) => {
    console.log('[AutoUpdater] Update available:', info.version)

    dialog
      .showMessageBox({
        type: 'info',
        title: 'Update Available',
        message: `A new version (${info.version}) is available. Would you like to download it now?`,
        detail:
          'The update will be installed when you next restart the application.',
        buttons: ['Download', 'Later'],
        defaultId: 0,
        cancelId: 1,
      })
      .then(({ response }) => {
        if (response === 0) {
          autoUpdater.downloadUpdate()
        }
      })
  })

  // Handle update not available
  autoUpdater.on('update-not-available', (info) => {
    console.log('[AutoUpdater] Update not available:', info.version)
  })

  // Handle download progress
  autoUpdater.on('download-progress', (progressObj) => {
    const percent = progressObj.percent.toFixed(2)
    console.log(`[AutoUpdater] Download progress: ${percent}%`)

    // Send progress to renderer process via IPC
    BrowserWindow.getAllWindows().forEach((window) => {
      window.webContents.send('update-download-progress', progressObj)
    })
  })

  // Handle update downloaded
  autoUpdater.on('update-downloaded', (info) => {
    console.log('[AutoUpdater] Update downloaded:', info.version)

    dialog
      .showMessageBox({
        type: 'info',
        title: 'Update Ready',
        message: `Version ${info.version} has been downloaded. Restart now to install?`,
        buttons: ['Restart Now', 'Later'],
        defaultId: 0,
        cancelId: 1,
      })
      .then(({ response }) => {
        if (response === 0) {
          autoUpdater.quitAndInstall(false, true)
        }
      })
  })

  // Handle errors
  autoUpdater.on('error', (error) => {
    console.error('[AutoUpdater] Error:', error)
  })

  console.log('[AutoUpdater] Auto-updater configured')
}

/**
 * Manually check for updates
 *
 * Called from menu or settings
 */
export async function checkForUpdates(): Promise<void> {
  try {
    const result = await autoUpdater.checkForUpdates()
    if (!result || !result.updateInfo) {
      dialog.showMessageBox({
        type: 'info',
        title: 'No Updates',
        message: 'You are running the latest version.',
      })
    }
  } catch (error) {
    console.error('[AutoUpdater] Check failed:', error)
    dialog.showMessageBox({
      type: 'error',
      title: 'Update Check Failed',
      message: 'Failed to check for updates. Please try again later.',
    })
  }
}
