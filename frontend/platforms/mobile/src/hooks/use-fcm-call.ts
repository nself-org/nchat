/**
 * FCM Call Notification Hook (Android)
 *
 * On Android, incoming call notifications are delivered as high-priority
 * FCM data messages (type="call"). This hook bridges those messages to
 * the in-app call screen.
 *
 * On iOS, use useCallKit() instead — iOS call notifications use VoIP push.
 *
 * @example
 * ```typescript
 * function App() {
 *   const navigate = useNavigate()
 *
 *   useFcmCall({
 *     onIncomingCall: (payload) => {
 *       navigate(`/call/incoming/${payload.callId}`, { state: payload })
 *     },
 *   })
 * }
 * ```
 */

import { useEffect } from 'react'
import { fcmAdapter, FcmCallPayload } from '../adapters/fcm'

export interface UseFcmCallOptions {
  onIncomingCall: (payload: FcmCallPayload) => void
}

export function useFcmCall({ onIncomingCall }: UseFcmCallOptions): {
  isAndroid: boolean
} {
  useEffect(() => {
    // FCM call messages work on both platforms, but the primary Android call
    // notification path is FCM. iOS uses CallKit/VoIP push (useCallKit).
    const cleanupListener = fcmAdapter.startListening()
    const cleanupHandler = fcmAdapter.onIncomingCall(onIncomingCall)

    return () => {
      cleanupListener()
      cleanupHandler()
    }
  }, [onIncomingCall])

  return { isAndroid: fcmAdapter.isAndroidPlatform() }
}
