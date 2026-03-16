/**
 * CallKit Hook for nself-chat Mobile
 *
 * Wires VoIP push → CallKit incoming call UI → call screen navigation.
 *
 * @example
 * ```typescript
 * function App() {
 *   const navigate = useNavigate()
 *
 *   useCallKit({
 *     onCallAnswered: (callId) => {
 *       navigate(`/call/${callId}`)
 *     },
 *     onCallDeclined: (callId) => {
 *       // Notify backend the call was declined
 *       declineCall(callId)
 *     },
 *     onCallEnded: (callId) => {
 *       // Clean up if we're still on the call screen
 *       if (currentCallId === callId) navigate(-1)
 *     },
 *   })
 * }
 * ```
 */

import { useEffect, useCallback } from 'react'
import { callKitAdapter, CallKitCallInfo } from '../adapters/call-kit'
import { voipAdapter, VoipCallPayload } from '../adapters/voip'

export interface UseCallKitOptions {
  /** Called when the user answers via the native CallKit UI */
  onCallAnswered: (callId: string) => void
  /** Called when the user declines via the native CallKit UI */
  onCallDeclined: (callId: string) => void
  /** Called when the call ends (timeout, cancelled, hung up) */
  onCallEnded: (callId: string) => void
}

export function useCallKit({
  onCallAnswered,
  onCallDeclined,
  onCallEnded,
}: UseCallKitOptions): {
  isCallKitAvailable: boolean
  reportIncomingCall: (info: CallKitCallInfo) => Promise<void>
  endCall: (callId: string) => Promise<void>
} {
  // Bridge VoIP push → CallKit UI
  const handleVoipPush = useCallback(
    async (payload: VoipCallPayload) => {
      await callKitAdapter.reportIncomingCall({
        callId: payload.callId,
        callerName: payload.callerName,
        callerAvatar: payload.callerAvatar,
        channelName: payload.channelName,
        callType: payload.callType,
        isGroupCall: payload.isGroupCall,
      })
    },
    []
  )

  useEffect(() => {
    if (!voipAdapter.isSupported()) return
    return voipAdapter.onIncomingCall(handleVoipPush)
  }, [handleVoipPush])

  useEffect(() => {
    if (!callKitAdapter.isAvailable()) return
    const cleanupAnswered = callKitAdapter.onCallAnswered(onCallAnswered)
    const cleanupDeclined = callKitAdapter.onCallDeclined(onCallDeclined)
    const cleanupEnded = callKitAdapter.onCallEnded(onCallEnded)
    return () => {
      cleanupAnswered()
      cleanupDeclined()
      cleanupEnded()
    }
  }, [onCallAnswered, onCallDeclined, onCallEnded])

  return {
    isCallKitAvailable: callKitAdapter.isAvailable(),
    reportIncomingCall: callKitAdapter.reportIncomingCall.bind(callKitAdapter),
    endCall: callKitAdapter.endCall.bind(callKitAdapter),
  }
}
