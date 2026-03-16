/**
 * IPC Handlers for Electron
 *
 * Handles communication between main and renderer processes
 */

import { ipcMain, app, shell, desktopCapturer, clipboard, nativeImage } from 'electron'
import { checkForUpdates } from './auto-updater'

/**
 * Setup IPC handlers
 *
 * Registers all IPC message handlers
 */
export function setupIpcHandlers(): void {
  // App info
  ipcMain.handle('app:get-version', () => {
    return app.getVersion()
  })

  ipcMain.handle('app:get-name', () => {
    return app.getName()
  })

  ipcMain.handle('app:get-path', (_event, name: string) => {
    return app.getPath(name as any)
  })

  // Window controls
  ipcMain.on('window:minimize', (event) => {
    const window = event.sender.getOwnerBrowserWindow()
    window?.minimize()
  })

  ipcMain.on('window:maximize', (event) => {
    const window = event.sender.getOwnerBrowserWindow()
    if (window?.isMaximized()) {
      window.restore()
    } else {
      window?.maximize()
    }
  })

  ipcMain.on('window:close', (event) => {
    const window = event.sender.getOwnerBrowserWindow()
    window?.close()
  })

  ipcMain.handle('window:is-maximized', (event) => {
    const window = event.sender.getOwnerBrowserWindow()
    return window?.isMaximized() ?? false
  })

  // External links
  ipcMain.on('shell:open-external', (_event, url: string) => {
    shell.openExternal(url)
  })

  ipcMain.on('shell:show-item-in-folder', (_event, path: string) => {
    shell.showItemInFolder(path)
  })

  // Updates
  ipcMain.on('update:check', () => {
    checkForUpdates()
  })

  // Notifications
  ipcMain.handle('notification:show', (_event, options: NotificationOptions) => {
    const { Notification } = require('electron')
    const notification = new Notification({
      title: options.title,
      body: options.body,
      silent: options.silent ?? false,
    })
    notification.show()
    return true
  })

  // Screen sharing — desktopCapturer (T-0662)
  // Lists available screen/window sources for getDisplayMedia() in renderer.
  // The renderer calls navigator.mediaDevices.getUserMedia with the sourceId
  // obtained here.
  ipcMain.handle(
    'screen:get-sources',
    async (_event, options: { types: Array<'screen' | 'window'> }) => {
      const sources = await desktopCapturer.getSources({
        types: options.types ?? ['screen', 'window'],
        thumbnailSize: { width: 320, height: 180 },
        fetchWindowIcons: true,
      })
      return sources.map((s) => ({
        id: s.id,
        name: s.name,
        thumbnailDataUrl: s.thumbnail.toDataURL(),
        appIconDataUrl: s.appIcon ? s.appIcon.toDataURL() : null,
      }))
    }
  )

  // Clipboard — read/write text and images (T-0664)
  ipcMain.handle('clipboard:read-text', () => {
    return clipboard.readText()
  })

  ipcMain.on('clipboard:write-text', (_event, text: string) => {
    clipboard.writeText(text)
  })

  ipcMain.handle('clipboard:read-image', () => {
    const img = clipboard.readImage()
    if (img.isEmpty()) return null
    return img.toDataURL()
  })

  ipcMain.on('clipboard:write-image', (_event, dataUrl: string) => {
    const img = nativeImage.createFromDataURL(dataUrl)
    clipboard.writeImage(img)
  })

  ipcMain.handle('clipboard:has-image', () => {
    return !clipboard.readImage().isEmpty()
  })

  // File drag-and-drop — start drag from renderer (T-0664)
  // Renderer calls this with file path(s) to initiate a native drag.
  ipcMain.on('drag:start-file', (event, filePath: string) => {
    event.sender.startDrag({
      file: filePath,
      icon: nativeImage.createFromPath(filePath).resize({ width: 64, height: 64 }),
    })
  })

  // Storage (using electron-store in adapters)
  // IPC handlers for storage are in the storage adapter

  console.log('[IPC] IPC handlers registered')
}

/**
 * Notification options interface
 */
interface NotificationOptions {
  title: string
  body: string
  silent?: boolean
}
