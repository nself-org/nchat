/**
 * System Tray for Electron
 *
 * Creates system tray icon and context menu
 */
import { Tray } from 'electron';
import type { WindowManager } from './window-manager';
/**
 * Create system tray icon
 *
 * Provides quick access to app from system tray
 *
 * @param windowManager - Window manager instance
 */
export declare function createTray(windowManager: WindowManager): Tray;
/**
 * Update tray badge (for unread count, etc.)
 */
export declare function updateTrayBadge(count: number): void;
/**
 * Destroy tray icon
 */
export declare function destroyTray(): void;
//# sourceMappingURL=tray.d.ts.map