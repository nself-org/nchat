/**
 * Window Manager for Electron
 *
 * Handles window creation, management, and lifecycle
 */
import { BrowserWindow } from 'electron';
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
export declare class WindowManager {
    private mainWindow;
    private preferencesWindow;
    /**
     * Create the main application window
     */
    createMainWindow(): Promise<BrowserWindow>;
    /**
     * Create preferences window
     */
    createPreferencesWindow(): BrowserWindow;
    /**
     * Get the main window
     */
    getMainWindow(): BrowserWindow | null;
    /**
     * Get the preferences window
     */
    getPreferencesWindow(): BrowserWindow | null;
    /**
     * Close all windows
     */
    closeAllWindows(): void;
    /**
     * Minimize main window
     */
    minimizeMainWindow(): void;
    /**
     * Maximize/restore main window
     */
    toggleMaximizeMainWindow(): void;
    /**
     * Focus main window
     */
    focusMainWindow(): void;
}
//# sourceMappingURL=window-manager.d.ts.map