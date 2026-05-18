/**
 * Desktop-Specific Type Definitions
 */
/**
 * Desktop platform types
 */
export type DesktopPlatform = 'darwin' | 'win32' | 'linux';
/**
 * Window state
 */
export interface WindowState {
    isMaximized: boolean;
    isMinimized: boolean;
    isFullScreen: boolean;
    isFocused: boolean;
    width: number;
    height: number;
    x: number;
    y: number;
}
/**
 * App configuration for desktop
 */
export interface DesktopAppConfig {
    startMinimized: boolean;
    startInTray: boolean;
    closeToTray: boolean;
    autoLaunch: boolean;
    hardwareAcceleration: boolean;
    notifications: {
        enabled: boolean;
        sound: boolean;
        badge: boolean;
    };
    updates: {
        autoCheck: boolean;
        autoDownload: boolean;
        checkInterval: number;
    };
    shortcuts: {
        toggleWindow: string;
        newConversation: string;
        search: string;
    };
}
/**
 * Desktop keyboard shortcut
 */
export interface DesktopShortcut {
    keys: string;
    action: string;
    description: string;
    enabled: boolean;
}
/**
 * Desktop menu item
 */
export interface DesktopMenuItem {
    id: string;
    label: string;
    type?: 'normal' | 'separator' | 'submenu' | 'checkbox' | 'radio';
    role?: string;
    accelerator?: string;
    enabled?: boolean;
    visible?: boolean;
    checked?: boolean;
    submenu?: DesktopMenuItem[];
    click?: () => void;
}
/**
 * Desktop tray icon state
 */
export interface DesktopTrayState {
    visible: boolean;
    icon: string;
    tooltip: string;
    badgeCount: number;
    menu: DesktopMenuItem[];
}
/**
 * Desktop update info
 */
export interface DesktopUpdateInfo {
    version: string;
    releaseNotes: string;
    releaseDate: string;
    downloadUrl: string;
    size: number;
}
/**
 * Desktop update progress
 */
export interface DesktopUpdateProgress {
    bytesPerSecond: number;
    percent: number;
    transferred: number;
    total: number;
}
/**
 * Desktop notification
 */
export interface DesktopNotification {
    title: string;
    body: string;
    silent?: boolean;
    icon?: string;
    urgency?: 'normal' | 'critical' | 'low';
    actions?: Array<{
        type: string;
        text: string;
    }>;
    data?: Record<string, any>;
}
/**
 * Desktop deep link
 */
export interface DesktopDeepLink {
    protocol: string;
    host: string;
    path: string;
    query: Record<string, string>;
}
//# sourceMappingURL=desktop.d.ts.map