/**
 * Desktop API Type Definitions
 *
 * TypeScript interfaces for the desktop API exposed to renderer
 */
/**
 * Desktop API exposed via contextBridge
 *
 * Available in renderer as `window.desktop`
 */
export interface DesktopAPI {
    app: {
        getVersion: () => Promise<string>;
        getName: () => Promise<string>;
        getPath: (name: string) => Promise<string>;
    };
    window: {
        minimize: () => void;
        maximize: () => void;
        close: () => void;
        isMaximized: () => Promise<boolean>;
    };
    shell: {
        openExternal: (url: string) => void;
        showItemInFolder: (path: string) => void;
    };
    update: {
        check: () => void;
        onDownloadProgress: (callback: (progress: UpdateProgress) => void) => () => void;
    };
    notification: {
        show: (options: NotificationOptions) => Promise<boolean>;
    };
    platform: {
        isMac: boolean;
        isWindows: boolean;
        isLinux: boolean;
        platform: string;
    };
}
/**
 * Update progress information
 */
export interface UpdateProgress {
    bytesPerSecond: number;
    percent: number;
    transferred: number;
    total: number;
}
/**
 * Notification options
 */
export interface NotificationOptions {
    title: string;
    body: string;
    silent?: boolean;
}
/**
 * Extend Window interface to include desktop API
 */
declare global {
    interface Window {
        desktop: DesktopAPI;
    }
}
//# sourceMappingURL=api.d.ts.map