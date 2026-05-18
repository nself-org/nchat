/**
 * Notification Adapter Module
 *
 * Provides a unified notification interface across platforms.
 * Supports web (Notification API), mobile (Capacitor Local Notifications),
 * and desktop (Electron/Tauri system tray notifications).
 */

import {
  Platform,
  detectPlatform,
  hasNotificationAPI,
  isBrowser,
} from "./platform-detector";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

/**
 * Notification permission states
 */
export type NotificationPermission =
  | "granted"
  | "denied"
  | "default"
  | "prompt";

/**
 * Notification priority levels
 */
export type NotificationPriority = "low" | "default" | "high" | "urgent";

/**
 * Notification action button
 */
export interface NotificationAction {
  /** Unique action identifier */
  id: string;
  /** Action button text */
  title: string;
  /** Optional icon */
  icon?: string;
}

/**
 * Notification options
 */
export interface NotificationOptions {
  /** Notification title */
  title: string;
  /** Notification body text */
  body?: string;
  /** Notification icon URL */
  icon?: string;
  /** Badge icon URL (for web) */
  badge?: string;
  /** Notification tag for grouping */
  tag?: string;
  /** Additional data payload */
  data?: Record<string, unknown>;
  /** Priority level */
  priority?: NotificationPriority;
  /** Actions (buttons) */
  actions?: NotificationAction[];
  /** Sound to play */
  sound?: string | boolean;
  /** Vibration pattern (mobile) */
  vibrate?: number[];
  /** Auto-dismiss after milliseconds */
  autoClose?: number;
  /** Require user interaction */
  requireInteraction?: boolean;
  /** Silent notification (no sound/vibration) */
  silent?: boolean;
  /** Notification group/thread ID */
  group?: string;
  /** Number for badge (mobile) */
  badgeNumber?: number;
  /** Large image URL */
  image?: string;
  /** Scheduled time (for scheduled notifications) */
  scheduledAt?: Date;
  /** Notification ID */
  id?: string | number;
}

/**
 * Notification result
 */
export interface NotificationResult {
  /** Whether notification was shown */
  success: boolean;
  /** Notification ID */
  id?: string | number;
  /** Error if failed */
  error?: Error;
}

/**
 * Notification event types
 */
export type NotificationEventType =
  | "click"
  | "close"
  | "action"
  | "show"
  | "error";

/**
 * Notification event data
 */
export interface NotificationEvent {
  /** Event type */
  type: NotificationEventType;
  /** Notification ID */
  id?: string | number;
  /** Action ID if action clicked */
  actionId?: string;
  /** Notification data */
  data?: Record<string, unknown>;
}

/**
 * Notification event listener
 */
export type NotificationEventListener = (event: NotificationEvent) => void;

/**
 * Notification adapter interface
 */
export interface NotificationAdapter {
  /** Check permission status */
  checkPermission(): Promise<NotificationPermission>;
  /** Request notification permission */
  requestPermission(): Promise<NotificationPermission>;
  /** Show a notification */
  show(options: NotificationOptions): Promise<NotificationResult>;
  /** Cancel a notification */
  cancel(id: string | number): Promise<void>;
  /** Cancel all notifications */
  cancelAll(): Promise<void>;
  /** Schedule a notification */
  schedule?(options: NotificationOptions): Promise<NotificationResult>;
  /** Get pending scheduled notifications */
  getPending?(): Promise<NotificationOptions[]>;
  /** Update badge count */
  setBadgeCount?(count: number): Promise<void>;
  /** Clear badge */
  clearBadge?(): Promise<void>;
  /** Subscribe to notification events */
  onEvent(listener: NotificationEventListener): () => void;
}

/**
 * Notification window properties (used with type intersection, not extension)
 */
interface NotificationWindowExtras {
  Capacitor?: {
    Plugins?: {
      LocalNotifications?: {
        requestPermissions: () => Promise<{ display: string }>;
        checkPermissions: () => Promise<{ display: string }>;
        schedule: (opts: {
          notifications: unknown[];
        }) => Promise<{ notifications: unknown[] }>;
        cancel: (opts: { notifications: { id: number }[] }) => Promise<void>;
        getPending: () => Promise<{ notifications: unknown[] }>;
        addListener: (
          event: string,
          handler: (data: unknown) => void,
        ) => Promise<{ remove: () => void }>;
        removeAllListeners: () => Promise<void>;
      };
      PushNotifications?: {
        requestPermissions: () => Promise<{ receive: string }>;
        checkPermissions: () => Promise<{ receive: string }>;
        register: () => Promise<void>;
        addListener: (
          event: string,
          handler: (data: unknown) => void,
        ) => Promise<{ remove: () => void }>;
      };
      Badge?: {
        set: (opts: { count: number }) => Promise<void>;
        clear: () => Promise<void>;
        get: () => Promise<{ count: number }>;
      };
    };
  };
  electron?: {
    notification?: {
      show: (options: Record<string, unknown>) => Promise<void>;
      isSupported: () => boolean;
    };
    tray?: {
      setTitle: (title: string) => void;
      setBadge: (text: string) => void;
      displayBalloon: (options: Record<string, unknown>) => void;
    };
  };
  __TAURI__?: {
    core: {
      invoke: <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
    };
    event: {
      listen: <T>(
        event: string,
        handler: (event: { payload: T }) => void,
      ) => Promise<() => void>;
      emit: (event: string, payload?: unknown) => Promise<void>;
    };
    notification?: {
      sendNotification: (options: unknown) => Promise<void>;
      requestPermission: () => Promise<string>;
      isPermissionGranted: () => Promise<boolean>;
    };
    fs?: {
      readDir: (path: string, options?: unknown) => Promise<unknown>;
      readFile: (path: string, options?: unknown) => Promise<unknown>;
      writeFile: (
        path: string,
        contents: unknown,
        options?: unknown,
      ) => Promise<void>;
    };
    clipboard?: {
      writeText: (text: string) => Promise<void>;
      readText: () => Promise<string>;
    };
    tauri?: {
      path: {
        appDir: () => Promise<string>;
      };
    };
  };
}

type NotificationWindow = Window & NotificationWindowExtras;

// ============================================================================
// Base Implementation
// ============================================================================

/**
 * Base notification adapter with common functionality
 */
abstract class BaseNotificationAdapter implements NotificationAdapter {
  protected listeners: Set<NotificationEventListener> = new Set();
  protected notificationCounter: number = 0;

  abstract checkPermission(): Promise<NotificationPermission>;
  abstract requestPermission(): Promise<NotificationPermission>;
  abstract show(options: NotificationOptions): Promise<NotificationResult>;
  abstract cancel(id: string | number): Promise<void>;
  abstract cancelAll(): Promise<void>;

  onEvent(listener: NotificationEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  protected emit(event: NotificationEvent): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        logger.error("Notification event listener error:", error);
      }
    });
  }

  protected generateId(): number {
    return ++this.notificationCounter;
  }
}

// ============================================================================
// Web Notification Adapter
// ============================================================================

/**
 * Web Notification API adapter
 */
export class WebNotificationAdapter extends BaseNotificationAdapter {
  private notifications: Map<string | number, Notification> = new Map();

  async checkPermission(): Promise<NotificationPermission> {
    if (!hasNotificationAPI()) {
      return "denied";
    }

    const permission = Notification.permission;
    if (permission === "default") return "prompt";
    return permission as NotificationPermission;
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!hasNotificationAPI()) {
      return "denied";
    }

    try {
      const result = await Notification.requestPermission();
      if (result === "default") return "prompt";
      return result as NotificationPermission;
    } catch {
      return "denied";
    }
  }

  async show(options: NotificationOptions): Promise<NotificationResult> {
    if (!hasNotificationAPI()) {
      return {
        success: false,
        error: new Error("Notification API not available"),
      };
    }

    const permission = await this.checkPermission();
    if (permission !== "granted") {
      return {
        success: false,
        error: new Error(`Notification permission: ${permission}`),
      };
    }

    try {
      const id = options.id ?? this.generateId();

      const notificationOptions: globalThis.NotificationOptions = {
        body: options.body,
        icon: options.icon,
        badge: options.badge,
        tag: options.tag,
        data: { ...options.data, id },
        requireInteraction: options.requireInteraction,
        silent: options.silent,
      };

      // Add optional properties if supported
      if (options.image) {
        (notificationOptions as any).image = options.image;
      }
      if (options.actions && "actions" in Notification.prototype) {
        (notificationOptions as any).actions = options.actions.map((a) => ({
          action: a.id,
          title: a.title,
          icon: a.icon,
        }));
      }

      const notification = new Notification(options.title, notificationOptions);

      this.notifications.set(id, notification);

      notification.onclick = () => {
        this.emit({ type: "click", id, data: options.data });
        notification.close();
      };

      notification.onclose = () => {
        this.emit({ type: "close", id, data: options.data });
        this.notifications.delete(id);
      };

      notification.onerror = () => {
        this.emit({ type: "error", id, data: options.data });
      };

      notification.onshow = () => {
        this.emit({ type: "show", id, data: options.data });
      };

      // Auto-close after timeout
      if (options.autoClose && options.autoClose > 0) {
        setTimeout(() => {
          notification.close();
        }, options.autoClose);
      }

      return { success: true, id };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  async cancel(id: string | number): Promise<void> {
    const notification = this.notifications.get(id);
    if (notification) {
      notification.close();
      this.notifications.delete(id);
    }
  }

  async cancelAll(): Promise<void> {
    for (const notification of this.notifications.values()) {
      notification.close();
    }
    this.notifications.clear();
  }
}

// ============================================================================
// Capacitor Notification Adapter
// ============================================================================

/**
 * Capacitor Local Notifications adapter for mobile
 */
export class CapacitorNotificationAdapter extends BaseNotificationAdapter {
  private getLocalNotifications():
    | NonNullable<
        NonNullable<NotificationWindow["Capacitor"]>["Plugins"]
      >["LocalNotifications"]
    | null {
    const win =
      typeof window !== "undefined" ? (window as NotificationWindow) : null;
    return win?.Capacitor?.Plugins?.LocalNotifications ?? null;
  }

  private getBadge():
    | NonNullable<
        NonNullable<NotificationWindow["Capacitor"]>["Plugins"]
      >["Badge"]
    | null {
    const win =
      typeof window !== "undefined" ? (window as NotificationWindow) : null;
    return win?.Capacitor?.Plugins?.Badge ?? null;
  }

  async checkPermission(): Promise<NotificationPermission> {
    const LocalNotifications = this.getLocalNotifications();
    if (!LocalNotifications) {
      return "denied";
    }

    try {
      const { display } = await LocalNotifications.checkPermissions();
      if (display === "granted") return "granted";
      if (display === "denied") return "denied";
      return "prompt";
    } catch {
      return "denied";
    }
  }

  async requestPermission(): Promise<NotificationPermission> {
    const LocalNotifications = this.getLocalNotifications();
    if (!LocalNotifications) {
      return "denied";
    }

    try {
      const { display } = await LocalNotifications.requestPermissions();
      if (display === "granted") return "granted";
      if (display === "denied") return "denied";
      return "prompt";
    } catch {
      return "denied";
    }
  }

  async show(options: NotificationOptions): Promise<NotificationResult> {
    const LocalNotifications = this.getLocalNotifications();
    if (!LocalNotifications) {
      return {
        success: false,
        error: new Error("Capacitor LocalNotifications not available"),
      };
    }

    try {
      const id =
        typeof options.id === "number" ? options.id : this.generateId();

      await LocalNotifications.schedule({
        notifications: [
          {
            id,
            title: options.title,
            body: options.body,
            largeIcon: options.icon,
            smallIcon: options.icon,
            sound:
              options.sound === false
                ? undefined
                : typeof options.sound === "string"
                  ? options.sound
                  : undefined,
            extra: options.data,
            group: options.group,
            groupSummary: false,
            ongoing: options.requireInteraction,
            autoCancel: !options.requireInteraction,
            schedule: options.scheduledAt
              ? { at: options.scheduledAt }
              : undefined,
            actionTypeId: options.actions?.length
              ? "NOTIFICATION_ACTIONS"
              : undefined,
          },
        ],
      });

      this.emit({ type: "show", id, data: options.data });
      return { success: true, id };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  async cancel(id: string | number): Promise<void> {
    const LocalNotifications = this.getLocalNotifications();
    if (!LocalNotifications) return;

    try {
      await LocalNotifications.cancel({
        notifications: [{ id: typeof id === "number" ? id : parseInt(id, 10) }],
      });
    } catch {
      // Ignore errors
    }
  }

  async cancelAll(): Promise<void> {
    const LocalNotifications = this.getLocalNotifications();
    if (!LocalNotifications) return;

    try {
      const { notifications } = await LocalNotifications.getPending();
      if (notifications.length > 0) {
        await LocalNotifications.cancel({
          notifications: (notifications as Array<{ id: number }>).map((n) => ({
            id: n.id,
          })),
        });
      }
    } catch {
      // Ignore errors
    }
  }

  async schedule(options: NotificationOptions): Promise<NotificationResult> {
    return this.show({
      ...options,
      scheduledAt: options.scheduledAt ?? new Date(Date.now() + 1000),
    });
  }

  async getPending(): Promise<NotificationOptions[]> {
    const LocalNotifications = this.getLocalNotifications();
    if (!LocalNotifications) return [];

    try {
      const { notifications } = await LocalNotifications.getPending();
      return (notifications as Array<Record<string, unknown>>).map((n) => ({
        id: n.id as number,
        title: n.title as string,
        body: n.body as string,
        data: n.extra as Record<string, unknown>,
      }));
    } catch {
      return [];
    }
  }

  async setBadgeCount(count: number): Promise<void> {
    const Badge = this.getBadge();
    if (!Badge) return;

    try {
      await Badge.set({ count });
    } catch {
      // Ignore errors
    }
  }

  async clearBadge(): Promise<void> {
    const Badge = this.getBadge();
    if (!Badge) return;

    try {
      await Badge.clear();
    } catch {
      // Ignore errors
    }
  }
}

// ============================================================================
// Electron Notification Adapter
// ============================================================================

/**
 * Electron native notification adapter
 */
export class ElectronNotificationAdapter extends BaseNotificationAdapter {
  private getElectron(): NotificationWindow["electron"] | null {
    const win =
      typeof window !== "undefined" ? (window as NotificationWindow) : null;
    return win?.electron ?? null;
  }

  async checkPermission(): Promise<NotificationPermission> {
    const electron = this.getElectron();
    if (!electron?.notification?.isSupported?.()) {
      return "denied";
    }
    return "granted";
  }

  async requestPermission(): Promise<NotificationPermission> {
    // Electron doesn't require permission request on most platforms
    return this.checkPermission();
  }

  async show(options: NotificationOptions): Promise<NotificationResult> {
    const electron = this.getElectron();
    if (!electron?.notification) {
      // Fall back to web notification
      const webAdapter = new WebNotificationAdapter();
      return webAdapter.show(options);
    }

    try {
      const id = options.id ?? this.generateId();

      await electron.notification.show({
        title: options.title,
        body: options.body,
        icon: options.icon,
        silent: options.silent,
        urgency: this.mapPriority(options.priority),
        timeoutType: options.requireInteraction ? "never" : "default",
      });

      this.emit({ type: "show", id, data: options.data });
      return { success: true, id };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  async cancel(_id: string | number): Promise<void> {
    // Electron notifications can't be cancelled programmatically
  }

  async cancelAll(): Promise<void> {
    // Electron notifications can't be cancelled programmatically
  }

  private mapPriority(priority?: NotificationPriority): string {
    switch (priority) {
      case "low":
        return "low";
      case "high":
      case "urgent":
        return "critical";
      default:
        return "normal";
    }
  }
}

// ============================================================================
// Tauri Notification Adapter
// ============================================================================

/**
 * Tauri notification adapter
 */
export class TauriNotificationAdapter extends BaseNotificationAdapter {
  private getTauriNotification(): NotificationWindow["__TAURI__"] | null {
    const win =
      typeof window !== "undefined" ? (window as NotificationWindow) : null;
    return win?.__TAURI__ ?? null;
  }

  async checkPermission(): Promise<NotificationPermission> {
    const tauri = this.getTauriNotification();
    if (!tauri?.notification) {
      return "denied";
    }

    try {
      const granted = await tauri.notification.isPermissionGranted();
      return granted ? "granted" : "prompt";
    } catch {
      return "denied";
    }
  }

  async requestPermission(): Promise<NotificationPermission> {
    const tauri = this.getTauriNotification();
    if (!tauri?.notification) {
      return "denied";
    }

    try {
      const result = await tauri.notification.requestPermission();
      if (result === "granted") return "granted";
      if (result === "denied") return "denied";
      return "prompt";
    } catch {
      return "denied";
    }
  }

  async show(options: NotificationOptions): Promise<NotificationResult> {
    const tauri = this.getTauriNotification();
    if (!tauri?.notification) {
      return {
        success: false,
        error: new Error("Tauri notification not available"),
      };
    }

    try {
      const id = options.id ?? this.generateId();

      tauri.notification.sendNotification({
        title: options.title,
        body: options.body,
        icon: options.icon,
      });

      this.emit({ type: "show", id, data: options.data });
      return { success: true, id };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  async cancel(_id: string | number): Promise<void> {
    // Tauri v1 doesn't support cancelling notifications
  }

  async cancelAll(): Promise<void> {
    // Tauri v1 doesn't support cancelling notifications
  }
}

// ============================================================================
// Noop Notification Adapter
// ============================================================================

/**
 * No-op notification adapter (for SSR or unsupported platforms)
 */
export class NoopNotificationAdapter extends BaseNotificationAdapter {
  async checkPermission(): Promise<NotificationPermission> {
    return "denied";
  }

  async requestPermission(): Promise<NotificationPermission> {
    return "denied";
  }

  async show(_options: NotificationOptions): Promise<NotificationResult> {
    return { success: false, error: new Error("Notifications not supported") };
  }

  async cancel(_id: string | number): Promise<void> {
    // No-op
  }

  async cancelAll(): Promise<void> {
    // No-op
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Detect the best notification backend for the current platform
 */
export function detectNotificationBackend():
  | "web"
  | "capacitor"
  | "electron"
  | "tauri"
  | "none" {
  const platform = detectPlatform();

  switch (platform) {
    case Platform.ELECTRON:
      return "electron";
    case Platform.TAURI:
      return "tauri";
    case Platform.IOS:
    case Platform.ANDROID:
      const win =
        typeof window !== "undefined" ? (window as NotificationWindow) : null;
      if (win?.Capacitor?.Plugins?.LocalNotifications) {
        return "capacitor";
      }
      return hasNotificationAPI() ? "web" : "none";
    case Platform.WEB:
    default:
      return hasNotificationAPI() ? "web" : "none";
  }
}

/**
 * Create a notification adapter for the current platform
 */
export function createNotificationAdapter(): NotificationAdapter {
  const backend = detectNotificationBackend();

  switch (backend) {
    case "electron":
      return new ElectronNotificationAdapter();
    case "tauri":
      return new TauriNotificationAdapter();
    case "capacitor":
      return new CapacitorNotificationAdapter();
    case "web":
      return new WebNotificationAdapter();
    case "none":
    default:
      return new NoopNotificationAdapter();
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let defaultAdapter: NotificationAdapter | null = null;

/**
 * Get the default notification adapter
 */
export function getNotificationAdapter(): NotificationAdapter {
  if (!defaultAdapter) {
    defaultAdapter = createNotificationAdapter();
  }
  return defaultAdapter;
}

/**
 * Reset the default notification adapter
 */
export function resetNotificationAdapter(): void {
  defaultAdapter = null;
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Check notification permission
 */
export async function checkNotificationPermission(): Promise<NotificationPermission> {
  return getNotificationAdapter().checkPermission();
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  return getNotificationAdapter().requestPermission();
}

/**
 * Show a notification
 */
export async function showNotification(
  options: NotificationOptions,
): Promise<NotificationResult> {
  return getNotificationAdapter().show(options);
}

/**
 * Cancel a notification
 */
export async function cancelNotification(id: string | number): Promise<void> {
  return getNotificationAdapter().cancel(id);
}

/**
 * Cancel all notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  return getNotificationAdapter().cancelAll();
}

/**
 * Subscribe to notification events
 */
export function onNotificationEvent(
  listener: NotificationEventListener,
): () => void {
  return getNotificationAdapter().onEvent(listener);
}

// ============================================================================
// Exports
// ============================================================================

export const Notifications = {
  // Adapters
  WebNotificationAdapter,
  CapacitorNotificationAdapter,
  ElectronNotificationAdapter,
  TauriNotificationAdapter,
  NoopNotificationAdapter,

  // Factory
  createNotificationAdapter,
  detectNotificationBackend,
  getNotificationAdapter,
  resetNotificationAdapter,

  // Convenience functions
  checkPermission: checkNotificationPermission,
  requestPermission: requestNotificationPermission,
  show: showNotification,
  cancel: cancelNotification,
  cancelAll: cancelAllNotifications,
  onEvent: onNotificationEvent,
};

export default Notifications;
