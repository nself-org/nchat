/**
 * Types for calls / voice-video domain.
 *
 * @module calls/types
 */

// ============================================================================
// Call state
// ============================================================================

export type CallType = 'voice' | 'video'

export type CallState =
  | 'idle'
  | 'initiating'
  | 'ringing'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'ended'

export type ConnectionQuality = 'excellent' | 'good' | 'fair' | 'poor'

// ============================================================================
// Participants
// ============================================================================

export interface CallParticipant {
  id: string
  name: string
  avatarUrl?: string
  isMuted?: boolean
  isVideoEnabled?: boolean
  isSpeaking?: boolean
}

// ============================================================================
// Incoming call
// ============================================================================

export interface IncomingCall {
  id: string
  callerId: string
  callerName: string
  callerAvatarUrl?: string
  type: CallType
}

// ============================================================================
// Media devices
// ============================================================================

export type MediaDeviceKind = 'audioinput' | 'audiooutput' | 'videoinput'

export interface MediaDeviceInfo {
  deviceId: string
  label: string
  kind: MediaDeviceKind
}

// ============================================================================
// Voice message
// ============================================================================

export interface VoiceMessageData {
  id: string
  url: string
  durationSeconds: number
  waveform?: number[]
  createdAt: string
}

export type RecorderState = 'idle' | 'recording' | 'paused' | 'reviewing'
