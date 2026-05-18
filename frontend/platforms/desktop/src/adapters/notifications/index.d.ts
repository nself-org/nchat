/**
 * Notifications Adapter for Desktop
 *
 * Provides native desktop notifications via Electron
 */
/**
 * Notifications adapter interface
 */
export interface NotificationsAdapter {
    show(title: string, body: string, options?: NotificationOptions): Promise<boolean>;
    requestPermission(): Promise<NotificationPermission>;
    isSupported(): boolean;
}
/**
 * Notification options
 */
export interface NotificationOptions {
    silent?: boolean;
    icon?: string;
    urgency?: 'normal' | 'critical' | 'low';
    onClick?: () => void;
}
/**
 * Desktop notifications implementation using Electron Notification API
 *
 * @example
 * ```typescript
 * import { desktopNotifications } from '@/adapters/notifications'
 *
 * // Show notification
 * await desktopNotifications.show('New Message', 'Hello from nself-chat!')
 *
 * // Show with options
 * await desktopNotifications.show('Important', 'Action required', {
 *   silent: false,
 *   urgency: 'critical',
 *   onClick: () => {
 *     console.log('Notification clicked')
 *   }
 * })
 * ```
 */
export declare const desktopNotifications: NotificationsAdapter;
/**
 * Helper functions for notifications
 */
export declare const notificationHelpers: {
    /**
     * Show success notification
     */
    showSuccess(message: string): Promise<boolean>;
    /**
     * Show error notification
     */
    showError(message: string): Promise<boolean>;
    /**
     * Show info notification
     */
    showInfo(message: string): Promise<boolean>;
    /**
     * Show message notification
     */
    showMessage(from: string, message: string): Promise<boolean>;
};
export default desktopNotifications;
//# sourceMappingURL=index.d.ts.map