/**
 * Window Manager for Electron
 *
 * Handles window creation, management, and lifecycle
 */

import { BrowserWindow, screen } from 'electron'
import path from 'path'

/**
 * Window Manager Class
 *
 * Manages all application windows (main, preferences, about, etc.)
 *
 * @example
 * ```typescript
 * const windowManager = new WindowManager()
 * await windowManager.createMainWindow()
 * windowManager.getMainWindow()?.focus()
 * ```
 */
export class WindowManager {
  private mainWindow: BrowserWindow | null = null
  private preferencesWindow: BrowserWindow | null = null

  /**
   * Create the main application window
   */
  async createMainWindow(): Promise<BrowserWindow> {
    if (this.mainWindow) {
      this.mainWindow.focus()
      return this.mainWindow
    }

    // Get primary display dimensions
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width, height } = primaryDisplay.workAreaSize

    // Calculate window size (80% of screen, max 1600x1000)
    const windowWidth = Math.min(Math.floor(width * 0.8), 1600)
    const windowHeight = Math.min(Math.floor(height * 0.8), 1000)

    this.mainWindow = new BrowserWindow({
      width: windowWidth,
      height: windowHeight,
      minWidth: 800,
      minHeight: 600,
      title: 'nChat',
      backgroundColor: '#0F0F1A',
      webPreferences: {
        preload: path.join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true,
      },
      show: false, // Show after ready-to-show event
    })

    // Load the app
    if (process.env.NODE_ENV === 'development') {
      await this.mainWindow.loadURL('http://localhost:5174')
      this.mainWindow.webContents.openDevTools()
    } else {
      await this.mainWindow.loadFile(
        path.join(__dirname, '../renderer/index.html')
      )
    }

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show()
      this.mainWindow?.focus()
    })

    // Handle window close
    this.mainWindow.on('closed', () => {
      this.mainWindow = null
    })

    // Handle external links
    this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      // Open external links in default browser
      if (url.startsWith('http://') || url.startsWith('https://')) {
        require('electron').shell.openExternal(url)
        return { action: 'deny' }
      }
      return { action: 'allow' }
    })

    console.log('[WindowManager] Main window created')
    return this.mainWindow
  }

  /**
   * Create preferences window
   */
  createPreferencesWindow(): BrowserWindow {
    if (this.preferencesWindow) {
      this.preferencesWindow.focus()
      return this.preferencesWindow
    }

    this.preferencesWindow = new BrowserWindow({
      width: 800,
      height: 600,
      title: 'Preferences',
      parent: this.mainWindow ?? undefined,
      modal: false,
      webPreferences: {
        preload: path.join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    })

    if (process.env.NODE_ENV === 'development') {
      this.preferencesWindow.loadURL('http://localhost:5174/preferences')
    } else {
      this.preferencesWindow.loadFile(
        path.join(__dirname, '../renderer/preferences.html')
      )
    }

    this.preferencesWindow.on('closed', () => {
      this.preferencesWindow = null
    })

    return this.preferencesWindow
  }

  /**
   * Get the main window
   */
  getMainWindow(): BrowserWindow | null {
    return this.mainWindow
  }

  /**
   * Get the preferences window
   */
  getPreferencesWindow(): BrowserWindow | null {
    return this.preferencesWindow
  }

  /**
   * Close all windows
   */
  closeAllWindows(): void {
    this.mainWindow?.close()
    this.preferencesWindow?.close()
  }

  /**
   * Minimize main window
   */
  minimizeMainWindow(): void {
    this.mainWindow?.minimize()
  }

  /**
   * Maximize/restore main window
   */
  toggleMaximizeMainWindow(): void {
    if (this.mainWindow?.isMaximized()) {
      this.mainWindow.restore()
    } else {
      this.mainWindow?.maximize()
    }
  }

  /**
   * Focus main window
   */
  focusMainWindow(): void {
    if (this.mainWindow) {
      if (this.mainWindow.isMinimized()) {
        this.mainWindow.restore()
      }
      this.mainWindow.focus()
    }
  }
}
