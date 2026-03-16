/**
 * FCM (Firebase Cloud Messaging) Adapter for nself-chat Mobile (Android)
 *
 * On Android, all push notifications — including incoming call alerts — are
 * delivered via FCM. There is no equivalent to iOS VoIP push (PushKit).
 *
 * Message types delivered via FCM:
 *   - "message"  : standard notification push (badge, sound, alert)
 *   - "call"     : high-priority data message for incoming calls
 *   - "mention"  : @mention notification
 *   - "dm"       : direct message notification
 *
 * "call" pushes use FCM high-priority (priority=high, content_available=true)
 * so the app wakes up even when backgrounded. Android 14+ requires a
 * foreground service for full-screen call intents.
 *
 * Standard push is handled by @capacitor/push-notifications (same hook as iOS).
 * This adapter adds Android-specific FCM data message handling for call-type pushes.
 *
 * Setup requirements:
 *   1. Add google-services.json to platforms/mobile/android/app/
 *   2. Add com.google.gms:google-services classpath to build.gradle
 *   3. Apply google-services plugin in app/build.gradle
 *   4. FCM server key stored in nself backend plugin-notify .env as FCM_SERVER_KEY
 */

import { Capacitor } from '@capacitor/core'
import { PushNotifications, PushNotificationSchema } from '@capacitor/push-notifications'

export interface FcmCallPayload {
  callId: string
  callerUserId: string
  callerName: string
  callerAvatar?: string
  channelId: string
  channelName: string
  callType: 'audio' | 'video'
  isGroupCall: boolean
}

export type FcmCallHandler = (payload: FcmCallPayload) => void

const _callHandlers: FcmCallHandler[] = []

/**
 * Parse a raw FCM data message into a FcmCallPayload.
 * Returns null if the message is not a "call" type or is missing required fields.
 */
function parseCallData(data: Record<string, string>): FcmCallPayload | null {
  if (data['type'] !== 'call') return null

  const callId = data['callId']
  const callerUserId = data['callerUserId']
  const callerName = data['callerName']
  const channelId = data['channelId']
  const channelName = data['channelName']

  if (!callId || !callerUserId || !callerName || !channelId || !channelName) {
    console.warn('[FCM] Missing required fields in call data message:', data)
    return null
  }

  return {
    callId,
    callerUserId,
    callerName,
    callerAvatar: data['callerAvatar'],
    channelId,
    channelName,
    callType: (data['callType'] as 'audio' | 'video') || 'audio',
    isGroupCall: data['isGroupCall'] === 'true',
  }
}

/**
 * Register a handler for incoming FCM call data messages on Android.
 * Returns a cleanup function.
 *
 * @example
 * ```typescript
 * const cleanup = fcmAdapter.onIncomingCall((payload) => {
 *   // Navigate to in-app incoming call screen
 *   navigate(`/call/incoming/${payload.callId}`)
 * })
 * ```
 */
function onIncomingCall(handler: FcmCallHandler): () => void {
  _callHandlers.push(handler)
  return () => {
    const idx = _callHandlers.indexOf(handler)
    if (idx !== -1) _callHandlers.splice(idx, 1)
  }
}

/**
 * Internal: listen for FCM data-only messages via @capacitor/push-notifications.
 * Must be called once at app startup. Safe to call on iOS — data-only FCMs are rare
 * but handled the same way; call payloads on iOS go via VoIP push instead.
 */
function startListening(): () => void {
  const listener = PushNotifications.addListener(
    'pushNotificationReceived',
    (notification: PushNotificationSchema) => {
      const data = (notification.data || {}) as Record<string, string>
      if (data['type'] !== 'call') return

      const payload = parseCallData(data)
      if (!payload) return

      console.log('[FCM] Incoming call data message:', payload.callId)
      _callHandlers.forEach((h) => {
        try {
          h(payload)
        } catch (e) {
          console.error('[FCM] Call handler error:', e)
        }
      })
    }
  )

  return () => listener.remove()
}

/**
 * Returns true when FCM-based call notifications are the right mechanism.
 * On iOS, VoIP push (PushKit) is used instead.
 */
function isAndroidPlatform(): boolean {
  return Capacitor.getPlatform() === 'android'
}

export const fcmAdapter = {
  onIncomingCall,
  startListening,
  isAndroidPlatform,
}

export default fcmAdapter
