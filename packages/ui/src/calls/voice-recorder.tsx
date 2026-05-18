/**
 * Voice recorder UI — record, pause, review, send/cancel.
 * Injectable VoiceRecorderAdapter replaces MediaRecorder/store deps.
 *
 * @module calls/voice-recorder
 */

'use client'

import * as React from 'react'
import { cn } from '../lib/utils'
import type { RecorderState } from './types'
import { WaveformVisualizer } from './waveform-visualizer'

// ============================================================================
// Adapter
// ============================================================================

export interface VoiceRecorderAdapter {
  state: RecorderState
  durationSeconds: number
  amplitudes?: number[]
  onStartRecording: () => void
  onPauseRecording: () => void
  onResumeRecording: () => void
  onStopRecording: () => void
  onSend: () => void
  onCancel: () => void
}

export interface VoiceRecorderProps {
  adapter: VoiceRecorderAdapter
  className?: string
}

// ============================================================================
// Icons
// ============================================================================

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

function PauseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('h-5 w-5', className)} fill="currentColor">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  )
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('h-5 w-5', className)} fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  )
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('h-4 w-4', className)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('h-4 w-4', className)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function StopIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('h-5 w-5', className)} fill="currentColor">
      <rect x="3" y="3" width="18" height="18" rx="2" />
    </svg>
  )
}

// ============================================================================
// Duration formatter
// ============================================================================

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// ============================================================================
// VoiceRecorder
// ============================================================================

export function VoiceRecorder({ adapter, className }: VoiceRecorderProps) {
  const {
    state,
    durationSeconds,
    amplitudes,
    onStartRecording,
    onPauseRecording,
    onResumeRecording,
    onStopRecording,
    onSend,
    onCancel,
  } = adapter

  const isIdle = state === 'idle'
  const isRecording = state === 'recording'
  const isPaused = state === 'paused'
  const isReviewing = state === 'reviewing'

  if (isIdle) {
    return (
      <button
        type="button"
        onClick={onStartRecording}
        className={cn(
          'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted-foreground',
          'hover:bg-accent hover:text-foreground transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          className
        )}
        aria-label="Record voice message"
      >
        <MicIcon />
        <span>Voice</span>
      </button>
    )
  }

  return (
    <div className={cn('flex items-center gap-2 rounded-xl border bg-muted/30 px-3 py-2', className)}>
      {/* Recording/pause control */}
      {isRecording || isPaused ? (
        <div className="flex items-center gap-2">
          {/* Pulse dot when recording */}
          {isRecording && (
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-destructive" />
            </span>
          )}
          <button
            type="button"
            onClick={isRecording ? onPauseRecording : onResumeRecording}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
            aria-label={isRecording ? 'Pause recording' : 'Resume recording'}
          >
            {isRecording ? <PauseIcon className="h-3.5 w-3.5" /> : <PlayIcon className="h-3.5 w-3.5" />}
          </button>
        </div>
      ) : null}

      {/* Waveform + duration */}
      <div className="flex flex-1 items-center gap-2 min-w-0">
        <WaveformVisualizer
          amplitudes={amplitudes}
          animated={isRecording}
          height={28}
          className="flex-1"
        />
        <span className="tabular-nums text-xs text-muted-foreground shrink-0">
          {formatDuration(durationSeconds)}
        </span>
      </div>

      {/* Stop (when recording/paused) → transitions to reviewing */}
      {(isRecording || isPaused) && (
        <button
          type="button"
          onClick={onStopRecording}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-muted hover:bg-accent text-muted-foreground"
          aria-label="Stop recording"
        >
          <StopIcon className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Reviewing: send + cancel */}
      {isReviewing && (
        <>
          <button
            type="button"
            onClick={onSend}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground',
              'hover:bg-primary/90 transition-colors shadow-sm'
            )}
            aria-label="Send voice message"
          >
            <SendIcon />
          </button>
        </>
      )}

      {/* Cancel (always shown when not idle) */}
      <button
        type="button"
        onClick={onCancel}
        className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        aria-label="Cancel recording"
      >
        <XIcon />
      </button>
    </div>
  )
}

// ============================================================================
// VoiceRecorderButton — compact mic button variant
// ============================================================================

export interface VoiceRecorderButtonProps {
  onPress: () => void
  onRelease: () => void
  isRecording: boolean
  className?: string
}

export function VoiceRecorderButton({ onPress, onRelease, isRecording, className }: VoiceRecorderButtonProps) {
  return (
    <button
      type="button"
      onMouseDown={onPress}
      onMouseUp={onRelease}
      onTouchStart={(e) => { e.preventDefault(); onPress() }}
      onTouchEnd={(e) => { e.preventDefault(); onRelease() }}
      aria-label={isRecording ? 'Recording… release to stop' : 'Hold to record voice message'}
      aria-pressed={isRecording}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-full transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isRecording
          ? 'bg-destructive text-destructive-foreground animate-pulse'
          : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground',
        className
      )}
    >
      <MicIcon />
    </button>
  )
}
