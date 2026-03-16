/**
 * VoIP Push Notifications Adapter for nself-chat Mobile (iOS only)
 *
 * iOS supports two push notification channels:
 *   1. APNs (standard) — handled by @capacitor/push-notifications
 *   2. PushKit (VoIP) — required for CallKit incoming call UI
 *
 * VoIP pushes are higher-priority than standard APNs and wake the app
 * immediately to display a native CallKit incoming call screen.
 *
 * This adapter provides the bridge between the native VoIP push payload
 * and the CallKit integration layer. On Android, FCM handles call
 * notifications directly via high-priority data messages.
 *
 * iOS requirements (set in Xcode Signing & Capabilities):
 *   - Background Modes: Voice over IP
 *   - Push Notifications entitlement
 *   - PushKit framework linked
 */

import { Capacitor } from '@capacitor/core'

/**
 * Incoming call payload delivered via VoIP push
 */
export interface VoipCallPayload {
  callId: string
  callerUserId: string
  callerName: string
  callerAvatar?: string
  channelId: string
  channelName: string
  callType: 'audio' | 'video'
  isGroupCall: boolean
}

/**
 * Handler called when a VoIP push arrives (app may be backgrounded/killed)
 */
export type VoipCallHandler = (payload: VoipCallPayload) => void

const _handlers: VoipCallHandler[] = []

/**
 * Register a handler for incoming VoIP call pushes.
 * Returns a cleanup function.
 *
 * @example
 * ```typescript
 * const cleanup = voipAdapter.onIncomingCall((payload) => {
 *   callKitAdapter.reportIncomingCall(payload)
 * })
 * ```
 */
function onIncomingCall(handler: VoipCallHandler): () => void {
  _handlers.push(handler)
  return () => {
    const idx = _handlers.indexOf(handler)
    if (idx !== -1) _handlers.splice(idx, 1)
  }
}

/**
 * Parse raw VoIP push data into a typed VoipCallPayload.
 * Returns null if data is missing required fields.
 */
function parseVoipPayload(data: Record<string, unknown>): VoipCallPayload | null {
  const callId = data['callId'] as string | undefined
  const callerUserId = data['callerUserId'] as string | undefined
  const callerName = data['callerName'] as string | undefined
  const channelId = data['channelId'] as string | undefined
  const channelName = data['channelName'] as string | undefined

  if (!callId || !callerUserId || !callerName || !channelId || !channelName) {
    console.warn('[VoIP] Missing required fields in push payload:', data)
    return null
  }

  return {
    callId,
    callerUserId,
    callerName,
    callerAvatar: data['callerAvatar'] as string | undefined,
    channelId,
    channelName,
    callType: (data['callType'] as 'audio' | 'video') || 'audio',
    isGroupCall: Boolean(data['isGroupCall']),
  }
}

/**
 * Called by the native iOS layer (via Capacitor plugin bridge) when a
 * VoIP push is received. Dispatches to all registered handlers.
 *
 * This is invoked from the Swift PKPushRegistryDelegate implementation.
 */
function _dispatchVoipPush(rawData: Record<string, unknown>): void {
  const payload = parseVoipPayload(rawData)
  if (!payload) return

  console.log('[VoIP] Incoming call push:', payload.callId, 'from', payload.callerName)
  _handlers.forEach((h) => {
    try {
      h(payload)
    } catch (e) {
      console.error('[VoIP] Handler error:', e)
    }
  })
}

/**
 * Returns true when VoIP pushes are supported on the current platform.
 * Only available on iOS — Android uses FCM high-priority messages instead.
 */
function isSupported(): boolean {
  return Capacitor.getPlatform() === 'ios'
}

export const voipAdapter = {
  onIncomingCall,
  isSupported,
  /** @internal — called from native layer via Capacitor plugin bridge */
  _dispatchVoipPush,
}

export default voipAdapter
