/**
 * CallKit Adapter for nself-chat Mobile (iOS only)
 *
 * CallKit lets the app display a native system-level incoming call UI
 * (the same full-screen UI Apple Phone uses) instead of a push notification.
 * It also integrates with Recents, Siri, Bluetooth hands-free, and Do Not
 * Disturb.
 *
 * On Android, InCallUI is managed via FCM high-priority data messages +
 * ConnectionService (the Android equivalent). This adapter is iOS-only.
 *
 * Integration flow:
 *   1. VoIP push arrives → voipAdapter._dispatchVoipPush()
 *   2. App calls callKitAdapter.reportIncomingCall(payload)
 *   3. iOS shows the native "Incoming Call" screen
 *   4. User answers → callKitAdapter.onCallAnswered fires → navigate to call
 *   5. User ends → callKitAdapter.onCallEnded fires → hang up + clean up
 *
 * Capacitor bridge:
 * CallKit requires a native Capacitor plugin with Swift PKPushRegistry +
 * CXCallController integration. When the plugin is not available (web/dev),
 * all methods are no-ops and callbacks are never fired.
 *
 * Plugin: @capacitor-community/call-kit (install when building for iOS prod)
 * Fallback: in-app overlay call screen (rendered by <IncomingCallOverlay />)
 */

import { Capacitor } from '@capacitor/core'

export interface CallKitCallInfo {
  callId: string
  callerName: string
  callerAvatar?: string
  channelName: string
  callType: 'audio' | 'video'
  isGroupCall: boolean
}

export type CallKitEventHandler = (callId: string) => void

const _answeredHandlers: CallKitEventHandler[] = []
const _endedHandlers: CallKitEventHandler[] = []
const _declinedHandlers: CallKitEventHandler[] = []

function _subscribe(list: CallKitEventHandler[], h: CallKitEventHandler): () => void {
  list.push(h)
  return () => {
    const idx = list.indexOf(h)
    if (idx !== -1) list.splice(idx, 1)
  }
}

/**
 * Check if CallKit is available on the current platform.
 * Only available on iOS native builds.
 */
function isAvailable(): boolean {
  return Capacitor.getPlatform() === 'ios' && Capacitor.isNativePlatform()
}

/**
 * Present the native CallKit incoming call screen.
 * Falls back silently if not on iOS native.
 */
async function reportIncomingCall(info: CallKitCallInfo): Promise<void> {
  if (!isAvailable()) {
    console.log('[CallKit] Not available — skipping native call screen for', info.callId)
    return
  }

  try {
    // @ts-expect-error — optional peer dep, install for production iOS builds
    const { CallKitPlugin } = await import('@capacitor-community/call-kit').catch(() => ({
      CallKitPlugin: null,
    }))

    if (!CallKitPlugin) {
      console.warn('[CallKit] Plugin not installed — install @capacitor-community/call-kit for production')
      return
    }

    await (CallKitPlugin as any).reportNewIncomingCall({
      callUUID: info.callId,
      handle: info.callerName,
      handleType: 'generic',
      hasVideo: info.callType === 'video',
      localizedCallerName: info.callerName,
      supportsHolding: false,
      supportsDTMF: false,
      supportsGrouping: info.isGroupCall,
      supportsUngrouping: false,
    })
  } catch (e) {
    console.error('[CallKit] reportIncomingCall error:', e)
  }
}

/**
 * Tell CallKit the call has ended (user hung up from within the app,
 * or the caller cancelled before it was answered).
 */
async function endCall(callId: string): Promise<void> {
  if (!isAvailable()) return

  try {
    // @ts-expect-error — optional peer dep, install for production iOS builds
    const { CallKitPlugin } = await import('@capacitor-community/call-kit').catch(() => ({
      CallKitPlugin: null,
    }))

    if (!CallKitPlugin) return

    await (CallKitPlugin as any).endCall({ callUUID: callId })
  } catch (e) {
    console.error('[CallKit] endCall error:', e)
  }
}

/** Called when user answers via the native CallKit UI */
function onCallAnswered(handler: CallKitEventHandler): () => void {
  return _subscribe(_answeredHandlers, handler)
}

/** Called when the call ends (user dismissed CallKit UI or call timed out) */
function onCallEnded(handler: CallKitEventHandler): () => void {
  return _subscribe(_endedHandlers, handler)
}

/** Called when user declines via the native CallKit UI */
function onCallDeclined(handler: CallKitEventHandler): () => void {
  return _subscribe(_declinedHandlers, handler)
}

/** @internal — dispatched from the native plugin event listener */
function _dispatchAnswered(callId: string): void {
  _answeredHandlers.forEach((h) => h(callId))
}

/** @internal */
function _dispatchEnded(callId: string): void {
  _endedHandlers.forEach((h) => h(callId))
}

/** @internal */
function _dispatchDeclined(callId: string): void {
  _declinedHandlers.forEach((h) => h(callId))
}

export const callKitAdapter = {
  isAvailable,
  reportIncomingCall,
  endCall,
  onCallAnswered,
  onCallEnded,
  onCallDeclined,
  _dispatchAnswered,
  _dispatchEnded,
  _dispatchDeclined,
}

export default callKitAdapter
