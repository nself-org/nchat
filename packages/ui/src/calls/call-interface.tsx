/**
 * Call interface — active voice/video call UI.
 * Injectable CallInterfaceAdapter replaces LiveKit/store deps.
 *
 * @module calls/call-interface
 */

'use client'

import * as React from 'react'
import { cn } from '../lib/utils'
import type {
  CallType,
  CallState,
  ConnectionQuality,
  CallParticipant,
  IncomingCall,
} from './types'

// ============================================================================
// Adapter
// ============================================================================

export interface CallInterfaceAdapter {
  callType: CallType | null
  callState: CallState
  callDuration: number
  remoteParticipant: CallParticipant | null
  isMuted: boolean
  isVideoEnabled: boolean
  isScreenSharing: boolean
  connectionQuality?: ConnectionQuality
  isReconnecting?: boolean
  incomingCall?: IncomingCall | null
  localVideoRef?: React.RefObject<HTMLVideoElement>
  remoteVideoRef?: React.RefObject<HTMLVideoElement>
  remoteAudioRef?: React.RefObject<HTMLAudioElement>
  onToggleMute: () => void
  onToggleVideo: () => void
  onToggleScreenShare: () => void
  onEndCall: () => void
  onAcceptIncoming: (callId: string, withVideo: boolean) => void
  onDeclineIncoming: (callId: string) => void
  onSettings?: () => void
}

export interface CallInterfaceProps {
  adapter: CallInterfaceAdapter
  className?: string
}

// ============================================================================
// Icons (inline SVGs — no lucide dependency)
// ============================================================================

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('h-5 w-5', className)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6.08 6.08l1.09-1.84a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

function PhoneOffIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('h-5 w-5', className)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M16.5 16.5L19 19a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9" />
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-2.33-2.33" />
    </svg>
  )
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('h-5 w-5', className)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  )
}

function MicOffIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('h-5 w-5', className)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  )
}

function VideoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('h-5 w-5', className)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  )
}

function VideoOffIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('h-5 w-5', className)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M15 9.34V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h9a2 2 0 0 0 1.73-1" />
      <path d="M23 7l-7 5 7 5V7z" />
    </svg>
  )
}

function MonitorUpIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('h-5 w-5', className)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <polyline points="8 21 12 17 16 21" />
      <line x1="12" y1="17" x2="12" y2="21" />
      <polyline points="9 9 12 6 15 9" />
      <line x1="12" y1="6" x2="12" y2="13" />
    </svg>
  )
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('h-4 w-4', className)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

// ============================================================================
// Quality indicator
// ============================================================================

function QualityDot({ quality }: { quality: ConnectionQuality }) {
  const colors: Record<ConnectionQuality, string> = {
    excellent: 'bg-green-500',
    good: 'bg-green-400',
    fair: 'bg-yellow-500',
    poor: 'bg-red-500',
  }
  const bars = quality === 'excellent' ? 4 : quality === 'good' ? 3 : quality === 'fair' ? 2 : 1
  return (
    <div className="flex items-end gap-px" aria-label={`Signal: ${quality}`}>
      {[1, 2, 3, 4].map((n) => (
        <span
          key={n}
          className={cn(
            'w-1 rounded-sm transition-colors',
            n <= bars ? colors[quality] : 'bg-muted'
          )}
          style={{ height: `${n * 4}px` }}
        />
      ))}
    </div>
  )
}

// ============================================================================
// ParticipantAvatar
// ============================================================================

function ParticipantAvatar({ name, avatarUrl, size = 'lg' }: { name: string; avatarUrl?: string; size?: 'sm' | 'lg' }) {
  const dim = size === 'lg' ? 'h-24 w-24' : 'h-10 w-10'
  const text = size === 'lg' ? 'text-3xl' : 'text-base'
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={cn('rounded-full object-cover', dim)}
      />
    )
  }
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-primary/10 font-semibold text-primary',
        dim,
        text
      )}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

// ============================================================================
// Incoming call overlay
// ============================================================================

function IncomingCallOverlay({
  call,
  onAccept,
  onDecline,
}: {
  call: IncomingCall
  onAccept: (callId: string, withVideo: boolean) => void
  onDecline: (callId: string) => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-6 rounded-2xl border bg-card p-10 shadow-2xl">
        {/* Pulsing ring animation */}
        <div className="relative">
          <span className="absolute inset-0 animate-ping rounded-full bg-green-400/30" />
          <ParticipantAvatar name={call.callerName} avatarUrl={call.callerAvatarUrl} size="lg" />
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold">{call.callerName}</p>
          <p className="mt-0.5 text-sm text-muted-foreground capitalize">
            Incoming {call.type} call
          </p>
        </div>
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => onDecline(call.id)}
            className={cn(
              'flex h-14 w-14 items-center justify-center rounded-full bg-destructive text-destructive-foreground',
              'hover:bg-destructive/90 transition-colors shadow-lg'
            )}
            aria-label="Decline call"
          >
            <PhoneOffIcon />
          </button>
          {call.type === 'video' && (
            <button
              type="button"
              onClick={() => onAccept(call.id, false)}
              className={cn(
                'flex h-14 w-14 items-center justify-center rounded-full bg-muted text-foreground',
                'hover:bg-accent transition-colors shadow-lg'
              )}
              aria-label="Accept as voice only"
            >
              <MicIcon />
            </button>
          )}
          <button
            type="button"
            onClick={() => onAccept(call.id, call.type === 'video')}
            className={cn(
              'flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-white',
              'hover:bg-green-600 transition-colors shadow-lg'
            )}
            aria-label="Accept call"
          >
            {call.type === 'video' ? <VideoIcon /> : <PhoneIcon />}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Active call controls
// ============================================================================

function ControlButton({
  onClick,
  active,
  danger,
  label,
  children,
}: {
  onClick: () => void
  active?: boolean
  danger?: boolean
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        'flex h-12 w-12 items-center justify-center rounded-full transition-colors shadow',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        danger
          ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
          : active
            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
            : 'bg-muted text-foreground hover:bg-accent'
      )}
    >
      {children}
    </button>
  )
}

// ============================================================================
// CallInterface
// ============================================================================

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

function getStateLabel(state: CallState, duration: number): string {
  switch (state) {
    case 'initiating': return 'Starting call...'
    case 'ringing': return 'Ringing...'
    case 'connecting': return 'Connecting...'
    case 'connected': return formatDuration(duration)
    case 'reconnecting': return 'Reconnecting...'
    case 'ended': return 'Call ended'
    default: return ''
  }
}

export function CallInterface({ adapter, className }: CallInterfaceProps) {
  const {
    callType,
    callState,
    callDuration,
    remoteParticipant,
    isMuted,
    isVideoEnabled,
    isScreenSharing,
    connectionQuality = 'good',
    isReconnecting = false,
    incomingCall,
    localVideoRef,
    remoteVideoRef,
    remoteAudioRef,
    onToggleMute,
    onToggleVideo,
    onToggleScreenShare,
    onEndCall,
    onAcceptIncoming,
    onDeclineIncoming,
    onSettings,
  } = adapter

  // Incoming call takes priority
  if (incomingCall) {
    return (
      <IncomingCallOverlay
        call={incomingCall}
        onAccept={onAcceptIncoming}
        onDecline={onDeclineIncoming}
      />
    )
  }

  const isActive = callState !== 'idle' && callState !== 'ended'
  if (!isActive || !callType) return null

  return (
    <div className={cn('fixed inset-0 z-40 flex flex-col bg-background/95 backdrop-blur-sm', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-6">
        <div className="flex items-center gap-2">
          {connectionQuality && <QualityDot quality={connectionQuality} />}
          {isReconnecting && (
            <span className="text-xs text-yellow-500 animate-pulse">Reconnecting…</span>
          )}
        </div>
        {onSettings && (
          <button
            type="button"
            onClick={onSettings}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Call settings"
          >
            <SettingsIcon />
          </button>
        )}
      </div>

      {/* Main area */}
      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        {callType === 'video' ? (
          // Video grid
          <div className="relative w-full max-w-3xl aspect-video bg-muted rounded-2xl overflow-hidden">
            {/* Remote video */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="h-full w-full object-cover"
              aria-label="Remote participant video"
            />
            {/* Local video PiP */}
            <div className="absolute bottom-3 right-3 h-28 w-40 rounded-xl overflow-hidden border-2 border-background shadow-lg bg-muted">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
                aria-label="Local video"
              />
            </div>
            {/* Remote audio track (hidden) */}
            <audio ref={remoteAudioRef} autoPlay className="sr-only" />
          </div>
        ) : (
          // Voice call avatar
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              {callState === 'ringing' && (
                <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
              )}
              <ParticipantAvatar
                name={remoteParticipant?.name ?? '?'}
                avatarUrl={remoteParticipant?.avatarUrl}
                size="lg"
              />
            </div>
            <audio ref={remoteAudioRef} autoPlay className="sr-only" />
          </div>
        )}

        {/* Participant name + state */}
        <div className="text-center">
          <p className="text-xl font-semibold">
            {remoteParticipant?.name ?? 'Unknown'}
          </p>
          <p className="mt-1 text-sm text-muted-foreground tabular-nums">
            {getStateLabel(callState, callDuration)}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 pb-10">
        <ControlButton
          onClick={onToggleMute}
          active={isMuted}
          label={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <MicOffIcon /> : <MicIcon />}
        </ControlButton>

        {callType === 'video' && (
          <ControlButton
            onClick={onToggleVideo}
            active={!isVideoEnabled}
            label={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
          >
            {isVideoEnabled ? <VideoIcon /> : <VideoOffIcon />}
          </ControlButton>
        )}

        <ControlButton
          onClick={onToggleScreenShare}
          active={isScreenSharing}
          label={isScreenSharing ? 'Stop sharing' : 'Share screen'}
        >
          <MonitorUpIcon />
        </ControlButton>

        <ControlButton onClick={onEndCall} danger label="End call">
          <PhoneOffIcon />
        </ControlButton>
      </div>
    </div>
  )
}
