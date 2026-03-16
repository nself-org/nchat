/**
 * Haptics Hook for nself-chat Mobile
 *
 * Provides typed haptic feedback patterns that map to chat interactions.
 * Uses @capacitor/haptics — works on iOS (Taptic Engine) and Android
 * (vibration motor). No-ops on web.
 *
 * @example
 * ```typescript
 * function MessageInput() {
 *   const { feedback } = useHaptics()
 *
 *   const onSend = () => {
 *     feedback('messageSent')   // light impact
 *     sendMessage()
 *   }
 *
 *   const onReact = () => {
 *     feedback('reaction')      // medium impact
 *   }
 *
 *   const onCallStart = () => {
 *     feedback('callStart')     // success notification
 *   }
 * }
 * ```
 */

import { useCallback } from 'react'
import {
  Haptics,
  ImpactStyle,
  NotificationType,
} from '@capacitor/haptics'
import { Capacitor } from '@capacitor/core'

export type HapticPattern =
  | 'messageSent'    // Light impact — message sent
  | 'messageReceived' // Light impact — new message in foreground
  | 'reaction'       // Medium impact — emoji reaction added
  | 'mention'        // Notification (warning) — @mention received
  | 'callStart'      // Notification (success) — call connected
  | 'callEnd'        // Notification (error) — call ended
  | 'error'          // Notification (error) — action failed
  | 'success'        // Notification (success) — action succeeded
  | 'longPress'      // Medium impact — long press triggered
  | 'swipe'          // Light impact — swipe-to-reply gesture
  | 'tabChange'      // Selection — tab changed
  | 'modalOpen'      // Light impact — bottom sheet opened

async function triggerHaptic(pattern: HapticPattern): Promise<void> {
  if (!Capacitor.isNativePlatform()) return

  try {
    switch (pattern) {
      case 'messageSent':
      case 'messageReceived':
      case 'swipe':
      case 'modalOpen':
        await Haptics.impact({ style: ImpactStyle.Light })
        break

      case 'reaction':
      case 'longPress':
        await Haptics.impact({ style: ImpactStyle.Medium })
        break

      case 'tabChange':
        await Haptics.selectionStart()
        await Haptics.selectionChanged()
        await Haptics.selectionEnd()
        break

      case 'callStart':
      case 'success':
        await Haptics.notification({ type: NotificationType.Success })
        break

      case 'callEnd':
      case 'error':
        await Haptics.notification({ type: NotificationType.Error })
        break

      case 'mention':
        await Haptics.notification({ type: NotificationType.Warning })
        break
    }
  } catch (e) {
    // Haptics not available — silent fail (e.g. iPad without Taptic Engine)
  }
}

export function useHaptics() {
  const feedback = useCallback((pattern: HapticPattern) => {
    void triggerHaptic(pattern)
  }, [])

  return { feedback }
}
