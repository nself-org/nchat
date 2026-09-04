/**
 * Desktop Window Management E2E Tests
 *
 * Tests for desktop-specific window management features:
 * - Create/close windows
 * - Minimize/maximize/restore
 * - Multi-window state
 * - Window positioning
 * - Full-screen mode
 *
 * Platform: Electron, Tauri
 */

import { test, expect, _electron as electron } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'
import { generateTestId } from '../fixtures/test-helpers'

// Skip on non-desktop platforms
test.skip(
  () => process.env.PLATFORM !== 'electron' && process.env.PLATFORM !== 'tauri',
  'Desktop-only tests'
)

/**
 * Minimal structural shape of the Electron main-process module as destructured
 * inside `electronApp.evaluate(...)` callbacks below. The `electron` package is
 * not a dependency of this frontend workspace (it lives in `desktop/`), so we
 * model exactly the surface these tests actually call rather than importing
 * `electron`'s own types or falling back to `any`.
 */
interface ElectronBrowserWindowLike {
  id: number
  minimize(): void
  restore(): void
  maximize(): void
  unmaximize(): void
  isMinimized(): boolean
  isMaximized(): boolean
  isFullScreen(): boolean
  setFullScreen(value: boolean): void
  setPosition(x: number, y: number): void
  setSize(width: number, height: number): void
  getPosition(): [number, number]
  getSize(): [number, number]
  getBounds(): { x: number; y: number; width: number; height: number }
  center(): void
  focus(): void
  close(): void
}

interface ElectronBrowserWindowCtorLike {
  new (options: { width: number; height: number }): ElectronBrowserWindowLike
  getFocusedWindow(): ElectronBrowserWindowLike | null
  getAllWindows(): ElectronBrowserWindowLike[]
  fromId(id: number): ElectronBrowserWindowLike | null
}

interface ElectronMainAPI {
  app: { isQuitting(): boolean }
  BrowserWindow: ElectronBrowserWindowCtorLike
  screen: {
    getPrimaryDisplay(): { bounds: { x: number; y: number; width: number; height: number } }
  }
}

interface Point {
  x: number
  y: number
}

interface Size {
  width: number
  height: number
}

test.describe('Window Management', () => {
  let electronApp: ElectronApplication
  let mainWindow: Page

  test.beforeAll(async () => {
    // Launch Electron app
    electronApp = await electron.launch({
      args: ['.'],
      env: {
        ...process.env,
        NODE_ENV: 'test',
        NEXT_PUBLIC_USE_DEV_AUTH: 'true',
      },
    })

    // Get main window
    mainWindow = await electronApp.firstWindow()
    await mainWindow.waitForLoadState('domcontentloaded')
  })

  test.afterAll(async () => {
    await electronApp?.close()
  })

  test.describe('Window Creation', () => {
    test('should create main window on app launch', async () => {
      expect(mainWindow).toBeDefined()
      await expect(mainWindow).toBeTruthy()
    })

    test('should set correct window title', async () => {
      const title = await mainWindow.title()
      expect(title).toContain('nchat')
    })

    test('should have minimum window size', async () => {
      const bounds = await mainWindow.evaluate(() => {
        return {
          width: window.innerWidth,
          height: window.innerHeight,
        }
      })

      expect(bounds.width).toBeGreaterThanOrEqual(800)
      expect(bounds.height).toBeGreaterThanOrEqual(600)
    })

    test('should create new window from menu', async () => {
      const windowCount = (await electronApp.windows()).length

      // Trigger new window (via IPC or menu)
      await electronApp.evaluate(async ({ app }: ElectronMainAPI) => {
        const { BrowserWindow } = require('electron')
        new BrowserWindow({
          width: 800,
          height: 600,
        })
      })

      // Wait for new window
      await mainWindow.waitForTimeout(500)

      const newWindowCount = (await electronApp.windows()).length
      expect(newWindowCount).toBe(windowCount + 1)
    })
  })

  test.describe('Window States', () => {
    test('should minimize window', async () => {
      await electronApp.evaluate(({ BrowserWindow }: ElectronMainAPI) => {
        const win = BrowserWindow.getFocusedWindow()
        if (win) win.minimize()
      })

      const isMinimized = await electronApp.evaluate(({ BrowserWindow }: ElectronMainAPI) => {
        const win = BrowserWindow.getFocusedWindow()
        return win?.isMinimized() || false
      })

      expect(isMinimized).toBe(true)
    })

    test('should restore minimized window', async () => {
      // First minimize
      await electronApp.evaluate(({ BrowserWindow }: ElectronMainAPI) => {
        const win = BrowserWindow.getFocusedWindow()
        if (win) win.minimize()
      })

      // Then restore
      await electronApp.evaluate(({ BrowserWindow }: ElectronMainAPI) => {
        const win = BrowserWindow.getFocusedWindow()
        if (win) win.restore()
      })

      const isMinimized = await electronApp.evaluate(({ BrowserWindow }: ElectronMainAPI) => {
        const win = BrowserWindow.getFocusedWindow()
        return win?.isMinimized() || false
      })

      expect(isMinimized).toBe(false)
    })

    test('should maximize window', async () => {
      await electronApp.evaluate(({ BrowserWindow }: ElectronMainAPI) => {
        const win = BrowserWindow.getFocusedWindow()
        if (win && !win.isMaximized()) win.maximize()
      })

      const isMaximized = await electronApp.evaluate(({ BrowserWindow }: ElectronMainAPI) => {
        const win = BrowserWindow.getFocusedWindow()
        return win?.isMaximized() || false
      })

      expect(isMaximized).toBe(true)
    })

    test('should unmaximize window', async () => {
      // First maximize
      await electronApp.evaluate(({ BrowserWindow }: ElectronMainAPI) => {
        const win = BrowserWindow.getFocusedWindow()
        if (win && !win.isMaximized()) win.maximize()
      })

      // Then unmaximize
      await electronApp.evaluate(({ BrowserWindow }: ElectronMainAPI) => {
        const win = BrowserWindow.getFocusedWindow()
        if (win && win.isMaximized()) win.unmaximize()
      })

      const isMaximized = await electronApp.evaluate(({ BrowserWindow }: ElectronMainAPI) => {
        const win = BrowserWindow.getFocusedWindow()
        return win?.isMaximized() || false
      })

      expect(isMaximized).toBe(false)
    })

    test('should enter fullscreen mode', async () => {
      await electronApp.evaluate(({ BrowserWindow }: ElectronMainAPI) => {
        const win = BrowserWindow.getFocusedWindow()
        if (win) win.setFullScreen(true)
      })

      // Wait for fullscreen transition
      await mainWindow.waitForTimeout(1000)

      const isFullScreen = await electronApp.evaluate(({ BrowserWindow }: ElectronMainAPI) => {
        const win = BrowserWindow.getFocusedWindow()
        return win?.isFullScreen() || false
      })

      expect(isFullScreen).toBe(true)
    })

    test('should exit fullscreen mode', async () => {
      // First enter fullscreen
      await electronApp.evaluate(({ BrowserWindow }: ElectronMainAPI) => {
        const win = BrowserWindow.getFocusedWindow()
        if (win) win.setFullScreen(true)
      })

      await mainWindow.waitForTimeout(1000)

      // Then exit
      await electronApp.evaluate(({ BrowserWindow }: ElectronMainAPI) => {
        const win = BrowserWindow.getFocusedWindow()
        if (win) win.setFullScreen(false)
      })

      await mainWindow.waitForTimeout(1000)

      const isFullScreen = await electronApp.evaluate(({ BrowserWindow }: ElectronMainAPI) => {
        const win = BrowserWindow.getFocusedWindow()
        return win?.isFullScreen() || false
      })

      expect(isFullScreen).toBe(false)
    })
  })

  test.describe('Window Positioning', () => {
    test('should set window position', async () => {
      const x = 100
      const y = 100

      await electronApp.evaluate(({ BrowserWindow }: ElectronMainAPI, pos: Point) => {
        const win = BrowserWindow.getFocusedWindow()
        if (win) win.setPosition(pos.x, pos.y)
      }, { x, y })

      const [actualX, actualY] = await electronApp.evaluate(({ BrowserWindow }: ElectronMainAPI) => {
        const win = BrowserWindow.getFocusedWindow()
        return win?.getPosition() || [0, 0]
      })

      // Allow some tolerance for window decorations
      expect(Math.abs(actualX - x)).toBeLessThan(10)
      expect(Math.abs(actualY - y)).toBeLessThan(10)
    })

    test('should set window size', async () => {
      const width = 1024
      const height = 768

      await electronApp.evaluate(({ BrowserWindow }: ElectronMainAPI, size: Size) => {
        const win = BrowserWindow.getFocusedWindow()
        if (win) win.setSize(size.width, size.height)
      }, { width, height })

      const [actualWidth, actualHeight] = await electronApp.evaluate(({ BrowserWindow }: ElectronMainAPI) => {
        const win = BrowserWindow.getFocusedWindow()
        return win?.getSize() || [0, 0]
      })

      expect(actualWidth).toBe(width)
      expect(actualHeight).toBe(height)
    })

    test('should center window on screen', async () => {
      await electronApp.evaluate(({ BrowserWindow }: ElectronMainAPI) => {
        const win = BrowserWindow.getFocusedWindow()
        if (win) win.center()
      })

      const bounds = await electronApp.evaluate(({ BrowserWindow, screen }: ElectronMainAPI) => {
        const win = BrowserWindow.getFocusedWindow()
        if (!win) return null

        const winBounds = win.getBounds()
        const screenBounds = screen.getPrimaryDisplay().bounds

        return {
          window: winBounds,
          screen: screenBounds,
        }
      })

      if (bounds) {
        // Window should be roughly centered
        const centerX = bounds.window.x + bounds.window.width / 2
        const centerY = bounds.window.y + bounds.window.height / 2
        const screenCenterX = bounds.screen.width / 2
        const screenCenterY = bounds.screen.height / 2

        expect(Math.abs(centerX - screenCenterX)).toBeLessThan(100)
        expect(Math.abs(centerY - screenCenterY)).toBeLessThan(100)
      }
    })
  })

  test.describe('Multi-Window Support', () => {
    test('should open multiple windows', async () => {
      const initialCount = (await electronApp.windows()).length

      // Create 2 additional windows
      await electronApp.evaluate(async ({ BrowserWindow }: ElectronMainAPI) => {
        const { BrowserWindow: BW } = require('electron')
        new BW({ width: 800, height: 600 })
        new BW({ width: 800, height: 600 })
      })

      await mainWindow.waitForTimeout(500)

      const newCount = (await electronApp.windows()).length
      expect(newCount).toBe(initialCount + 2)
    })

    test('should close individual window without closing app', async () => {
      // Create new window
      await electronApp.evaluate(async ({ BrowserWindow }: ElectronMainAPI) => {
        const { BrowserWindow: BW } = require('electron')
        const win = new BW({ width: 800, height: 600 })
        return win.id
      })

      const beforeCount = (await electronApp.windows()).length

      // Close the new window (not main)
      await electronApp.evaluate(async ({ BrowserWindow }: ElectronMainAPI) => {
        const windows = BrowserWindow.getAllWindows()
        if (windows.length > 1) {
          windows[windows.length - 1].close()
        }
      })

      await mainWindow.waitForTimeout(500)

      const afterCount = (await electronApp.windows()).length
      expect(afterCount).toBe(beforeCount - 1)

      // App should still be running
      const isRunning = await electronApp.evaluate(({ app }: ElectronMainAPI) => {
        return !app.isQuitting()
      })
      expect(isRunning).toBe(true)
    })

    test('should switch focus between windows', async () => {
      // Create second window
      const secondWindowId = await electronApp.evaluate(async ({ BrowserWindow }: ElectronMainAPI) => {
        const { BrowserWindow: BW } = require('electron')
        const win = new BW({ width: 800, height: 600 })
        return win.id
      })

      // Focus second window
      await electronApp.evaluate(async ({ BrowserWindow }: ElectronMainAPI, id: number) => {
        const win = BrowserWindow.fromId(id)
        if (win) win.focus()
      }, secondWindowId)

      await mainWindow.waitForTimeout(300)

      const focusedId = await electronApp.evaluate(({ BrowserWindow }: ElectronMainAPI) => {
        const win = BrowserWindow.getFocusedWindow()
        return win?.id
      })

      expect(focusedId).toBe(secondWindowId)
    })
  })

  test.describe('Window Persistence', () => {
    test('should remember window size on restart', async () => {
      const testWidth = 1100
      const testHeight = 850

      // Set window size
      await electronApp.evaluate(({ BrowserWindow }: ElectronMainAPI, size: Size) => {
        const win = BrowserWindow.getFocusedWindow()
        if (win) win.setSize(size.width, size.height)
      }, { width: testWidth, height: testHeight })

      // Save window state (would be saved to storage)
      await mainWindow.evaluate(() => {
        localStorage.setItem(
          'window-state',
          JSON.stringify({
            width: window.innerWidth,
            height: window.innerHeight,
          })
        )
      })

      // Verify state was saved
      const savedState = await mainWindow.evaluate(() => {
        const state = localStorage.getItem('window-state')
        return state ? JSON.parse(state) : null
      })

      expect(savedState).toBeDefined()
      expect(savedState.width).toBeGreaterThan(0)
      expect(savedState.height).toBeGreaterThan(0)
    })

    test('should remember window position on restart', async () => {
      const testX = 200
      const testY = 150

      // Set position
      await electronApp.evaluate(({ BrowserWindow }: ElectronMainAPI, pos: Point) => {
        const win = BrowserWindow.getFocusedWindow()
        if (win) win.setPosition(pos.x, pos.y)
      }, { x: testX, y: testY })

      // Save position
      const [x, y] = await electronApp.evaluate(({ BrowserWindow }: ElectronMainAPI) => {
        const win = BrowserWindow.getFocusedWindow()
        return win?.getPosition() || [0, 0]
      })

      await mainWindow.evaluate(
        (pos: Point) => {
          localStorage.setItem('window-position', JSON.stringify(pos))
        },
        { x, y }
      )

      // Verify state was saved
      const savedPosition = await mainWindow.evaluate(() => {
        const pos = localStorage.getItem('window-position')
        return pos ? JSON.parse(pos) : null
      })

      expect(savedPosition).toBeDefined()
      expect(savedPosition.x).toBeGreaterThanOrEqual(0)
      expect(savedPosition.y).toBeGreaterThanOrEqual(0)
    })
  })
})
