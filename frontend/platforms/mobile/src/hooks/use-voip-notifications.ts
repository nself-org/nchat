/**
 * VoIP Push Notifications Hook (iOS only)
 *
 * Bridges VoIP push notifications to the CallKit presentation layer.
 * On Android, high-priority FCM data messages handle call notifications.
 *
 * @example
 * ```typescript
 * function App() {
 *   useVoipNotifications({
 *     onIncomingCall: (payload) => {
 *       // Present CallKit UI or navigate to in-app call screen
 *       callKitAdapter.reportIncomingCall(payload)
 *     },
 *   })
 * }
 * ```
 */

import { useEffect } from 'react'
import { voipAdapter, VoipCallPayload } from '../adapters/voip'

export interface UseVoipNotificationsOptions {
  /**
   * Called when a VoIP push arrives with incoming call data.
   * Present the CallKit UI (iOS) or navigate to the call screen.
   */
  onIncomingCall: (payload: VoipCallPayload) => void
}

export function useVoipNotifications({
  onIncomingCall,
}: UseVoipNotificationsOptions): { isSupported: boolean } {
  useEffect(() => {
    if (!voipAdapter.isSupported()) return

    const cleanup = voipAdapter.onIncomingCall(onIncomingCall)
    return cleanup
  }, [onIncomingCall])

  return { isSupported: voipAdapter.isSupported() }
}
