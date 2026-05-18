/**
 * Platform Detection Utilities
 */
import type { DesktopPlatform } from '../types/desktop';
/**
 * Get the current platform
 */
export declare function getPlatform(): DesktopPlatform;
/**
 * Check if running on macOS
 */
export declare function isMac(): boolean;
/**
 * Check if running on Windows
 */
export declare function isWindows(): boolean;
/**
 * Check if running on Linux
 */
export declare function isLinux(): boolean;
/**
 * Check if running in Electron
 */
export declare function isElectron(): boolean;
/**
 * Get platform-specific key modifier name
 */
export declare function getModifierKey(): string;
/**
 * Get platform-specific shortcut display string
 */
export declare function formatShortcut(shortcut: string): string;
/**
 * Check if platform supports native features
 */
export declare function supportsNativeFeature(feature: string): boolean;
//# sourceMappingURL=platform.d.ts.map