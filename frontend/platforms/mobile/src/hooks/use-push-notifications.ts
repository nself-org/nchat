/**
 * Push Notifications Hook
 *
 * React hook for push notifications management
 */

import { useState, useEffect, useCallback } from 'react'
import { PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications'
import {
  mobileNotifications,
  NotificationPermission,
} from '../adapters/notifications'

/**
 * Message for a push registration failure. Capacitor reports `{ error: string }`;
 * an Error or an object with `message` is accepted too.
 */
export function registrationErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const { message, error: detail } = error as { message?: unknown; error?: unknown }
    if (typeof message === 'string' && message) return message
    if (typeof detail === 'string' && detail) return detail
  }
  return 'Registration error'
}

/**
 * Push notifications state
 */
export interface PushNotificationsState {
  permission: NotificationPermission
  registered: boolean
  token: string | null
  loading: boolean
  error: string | null
}

/**
 * Use push notifications
 *
 * @example
 * ```typescript
 * function App() {
 *   const {
 *     permission,
 *     token,
 *     register,
 *     setBadgeCount,
 *     onNotificationReceived,
 *     onNotificationAction
 *   } = usePushNotifications()
 *
 *   useEffect(() => {
 *     if (permission === 'granted') {
 *       register()
 *     }
 *   }, [permission])
 *
 *   onNotificationReceived((notif) => {
 *     console.log('Received:', notif.title)
 *   })
 *
 *   onNotificationAction((action) => {
 *     // Handle notification tap
 *     navigateToChannel(action.notification.data.channelId)
 *   })
 * }
 * ```
 */
export function usePushNotifications() {
  const [state, setState] = useState<PushNotificationsState>({
    permission: 'prompt',
    registered: false,
    token: null,
    loading: false,
    error: null,
  })

  const requestPermission = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }))

    const permission = await mobileNotifications.requestPermission()

    setState((prev) => ({
      ...prev,
      permission,
      loading: false,
    }))

    return permission
  }, [])

  const register = useCallback(async () => {
    if (state.permission !== 'granted') {
      const permission = await requestPermission()
      if (permission !== 'granted') {
        return false
      }
    }

    setState((prev) => ({ ...prev, loading: true }))

    try {
      await mobileNotifications.register()
      setState((prev) => ({
        ...prev,
        registered: true,
        loading: false,
      }))
      return true
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      }))
      return false
    }
  }, [state.permission])

  const unregister = useCallback(async () => {
    await mobileNotifications.unregister()
    setState((prev) => ({
      ...prev,
      registered: false,
      token: null,
    }))
  }, [])

  const setBadgeCount = useCallback(async (count: number) => {
    await mobileNotifications.setBadgeCount(count)
  }, [])

  const clearBadge = useCallback(async () => {
    await mobileNotifications.clearBadge()
  }, [])

  const onNotificationReceived = useCallback(
    (handler: (notification: PushNotificationSchema) => void) => {
      return mobileNotifications.addNotificationReceivedListener(handler)
    },
    []
  )

  const onNotificationAction = useCallback(
    (handler: (action: ActionPerformed) => void) => {
      return mobileNotifications.addNotificationActionListener(handler)
    },
    []
  )

  // Listen for registration token
  useEffect(() => {
    const cleanup = mobileNotifications.addRegistrationListener((token) => {
      setState((prev) => ({ ...prev, token }))
    })

    return cleanup
  }, [])

  // Listen for registration errors
  useEffect(() => {
    const cleanup = mobileNotifications.addRegistrationErrorListener(
      (error) => {
        setState((prev) => ({
          ...prev,
          error: registrationErrorMessage(error),
        }))
      }
    )

    return cleanup
  }, [])

  return {
    ...state,
    requestPermission,
    register,
    unregister,
    setBadgeCount,
    clearBadge,
    onNotificationReceived,
    onNotificationAction,
  }
}
