/**
 * IncomingCallOverlay
 *
 * Full-screen incoming call UI for Android (and iOS when CallKit is unavailable).
 *
 * On iOS native, this is normally replaced by the native CallKit screen —
 * but this component serves as the in-app fallback (web builds, dev mode,
 * or when @capacitor-community/call-kit is not installed).
 *
 * On Android, this IS the call screen since Android has no equivalent to
 * iOS CallKit (ConnectionService-based InCallUI requires a system app).
 * The component is displayed in a top-layer portal when an incoming call
 * FCM data message arrives while the app is foregrounded.
 */

import React, { useCallback } from 'react'
import { FcmCallPayload } from '../adapters/fcm'

export interface IncomingCallOverlayProps {
  call: FcmCallPayload
  onAnswer: (callId: string) => void
  onDecline: (callId: string) => void
}

/**
 * Avatar placeholder using caller's initials.
 */
function CallerAvatar({
  name,
  avatarUrl,
}: {
  name: string
  avatarUrl?: string
}) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        style={{
          width: 96,
          height: 96,
          borderRadius: '50%',
          objectFit: 'cover',
          border: '3px solid rgba(255,255,255,0.3)',
        }}
      />
    )
  }

  return (
    <div
      style={{
        width: 96,
        height: 96,
        borderRadius: '50%',
        background: 'rgba(99,102,241,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 36,
        fontWeight: 700,
        color: 'white',
        border: '3px solid rgba(255,255,255,0.3)',
      }}
    >
      {initials}
    </div>
  )
}

export function IncomingCallOverlay({
  call,
  onAnswer,
  onDecline,
}: IncomingCallOverlayProps) {
  const handleAnswer = useCallback(() => {
    onAnswer(call.callId)
  }, [call.callId, onAnswer])

  const handleDecline = useCallback(() => {
    onDecline(call.callId)
  }, [call.callId, onDecline])

  const callTypeLabel = call.callType === 'video' ? 'Incoming video call' : 'Incoming voice call'
  const contextLabel = call.isGroupCall ? `in ${call.channelName}` : call.channelName

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'linear-gradient(180deg, #1e1b4b 0%, #0F0F1A 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '64px 32px 80px',
        color: 'white',
      }}
    >
      {/* Top: call type */}
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)', margin: 0 }}>
          {callTypeLabel}
        </p>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: '4px 0 0' }}>
          {contextLabel}
        </p>
      </div>

      {/* Center: caller info */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <CallerAvatar name={call.callerName} avatarUrl={call.callerAvatar} />
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>{call.callerName}</p>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', margin: '6px 0 0' }}>
            {call.isGroupCall ? 'Group call' : 'ɳChat'}
          </p>
        </div>
      </div>

      {/* Bottom: answer / decline */}
      <div style={{ display: 'flex', gap: 64, justifyContent: 'center', width: '100%' }}>
        <button
          onClick={handleDecline}
          aria-label="Decline call"
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: '#ef4444',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28,
          }}
        >
          📵
        </button>
        <button
          onClick={handleAnswer}
          aria-label="Answer call"
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: '#22c55e',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28,
          }}
        >
          {call.callType === 'video' ? '📹' : '📞'}
        </button>
      </div>
    </div>
  )
}

export default IncomingCallOverlay
