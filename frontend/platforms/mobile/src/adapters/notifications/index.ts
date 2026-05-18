/**
 * Notifications Adapter for nself-chat Mobile
 *
 * Handles push notifications, local notifications, and badge management
 */

import {
  PushNotifications,
  PushNotificationSchema,
  ActionPerformed,
  Token,
} from '@capacitor/push-notifications'
import { Capacitor } from '@capacitor/core'

/**
 * Notification permission status
 */
export type NotificationPermission = 'granted' | 'denied' | 'prompt'

/**
 * Notifications adapter interface
 */
export interface NotificationsAdapter {
  requestPermission(): Promise<NotificationPermission>
  register(): Promise<string | null>
  unregister(): Promise<void>
  setBadgeCount(count: number): Promise<void>
  clearBadge(): Promise<void>
  addNotificationReceivedListener(
    handler: (notification: PushNotificationSchema) => void
  ): () => void
  addNotificationActionListener(
    handler: (action: ActionPerformed) => void
  ): () => void
  addRegistrationListener(handler: (token: string) => void): () => void
  addRegistrationErrorListener(handler: (error: any) => void): () => void
}

/**
 * Mobile notifications implementation using Capacitor Push Notifications
 *
 * @example
 * ```typescript
 * import { mobileNotifications } from '@/adapters/notifications'
 *
 * // Request permission
 * const permission = await mobileNotifications.requestPermission()
 * if (permission === 'granted') {
 *   // Register for push notifications
 *   const token = await mobileNotifications.register()
 *   console.log('Push token:', token)
 * }
 *
 * // Listen for notifications
 * const cleanup = mobileNotifications.addNotificationReceivedListener((notif) => {
 *   console.log('Received:', notif)
 * })
 *
 * // Set badge count
 * await mobileNotifications.setBadgeCount(5)
 * ```
 */
export const mobileNotifications: NotificationsAdapter = {
  /**
   * Request push notification permission
   */
  async requestPermission(): Promise<NotificationPermission> {
    try {
      const result = await PushNotifications.requestPermissions()

      if (result.receive === 'granted') {
        return 'granted'
      } else if (result.receive === 'denied') {
        return 'denied'
      }
      return 'prompt'
    } catch (error) {
      console.error('[Notifications] Error requesting permission:', error)
      return 'denied'
    }
  },

  /**
   * Register for push notifications
   * Returns the device token or null if registration fails
   */
  async register(): Promise<string | null> {
    try {
      await PushNotifications.register()
      return null // Token is returned via listener
    } catch (error) {
      console.error('[Notifications] Error registering:', error)
      return null
    }
  },

  /**
   * Unregister from push notifications
   */
  async unregister(): Promise<void> {
    try {
      await PushNotifications.unregister()
    } catch (error) {
      console.error('[Notifications] Error unregistering:', error)
    }
  },

  /**
   * Set app badge count (iOS only)
   */
  async setBadgeCount(count: number): Promise<void> {
    try {
      // iOS only - Android handles badges differently
      if (Capacitor.getPlatform() === 'ios') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (PushNotifications as any).setBadgeCount({ count })
      }
    } catch (error) {
      console.error('[Notifications] Error setting badge:', error)
    }
  },

  /**
   * Clear app badge
   */
  async clearBadge(): Promise<void> {
    await mobileNotifications.setBadgeCount(0)
  },

  /**
   * Listen for notifications while app is in foreground
   */
  addNotificationReceivedListener(
    handler: (notification: PushNotificationSchema) => void
  ) {
    const listenerPromise = PushNotifications.addListener(
      'pushNotificationReceived',
      (notification) => {
        console.log('[Notifications] Received:', notification)
        handler(notification)
      }
    )

    return () => {
      listenerPromise.then((l) => l.remove()).catch(() => {})
    }
  },

  /**
   * Listen for notification actions (user tapped notification)
   */
  addNotificationActionListener(handler: (action: ActionPerformed) => void) {
    const listenerPromise = PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (action) => {
        console.log('[Notifications] Action performed:', action)
        handler(action)
      }
    )

    return () => {
      listenerPromise.then((l) => l.remove()).catch(() => {})
    }
  },

  /**
   * Listen for successful registration
   */
  addRegistrationListener(handler: (token: string) => void) {
    const listenerPromise = PushNotifications.addListener(
      'registration',
      (token: Token) => {
        console.log('[Notifications] Registration success:', token.value)
        handler(token.value)
      }
    )

    return () => {
      listenerPromise.then((l) => l.remove()).catch(() => {})
    }
  },

  /**
   * Listen for registration errors
   */
  addRegistrationErrorListener(handler: (error: any) => void) {
    const listenerPromise = PushNotifications.addListener(
      'registrationError',
      (error: any) => {
        console.error('[Notifications] Registration error:', error)
        handler(error)
      }
    )

    return () => {
      listenerPromise.then((l) => l.remove()).catch(() => {})
    }
  },
}

/**
 * Notification helpers
 */
export const notificationHelpers = {
  /**
   * Parse notification data
   */
  parseNotificationData(notification: PushNotificationSchema): {
    type: string
    channelId?: string
    messageId?: string
    userId?: string
  } {
    const data = notification.data || {}
    return {
      type: data.type || 'message',
      channelId: data.channelId || data.channel_id,
      messageId: data.messageId || data.message_id,
      userId: data.userId || data.user_id,
    }
  },

  /**
   * Format notification title
   */
  formatTitle(notification: PushNotificationSchema): string {
    return notification.title || 'New message'
  },

  /**
   * Format notification body
   */
  formatBody(notification: PushNotificationSchema): string {
    return notification.body || ''
  },
}

export default mobileNotifications
