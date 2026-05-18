/**
 * Voice message playback component.
 * Injectable VoiceMessageAdapter replaces audio/store deps.
 *
 * @module calls/voice-message
 */

'use client'

import * as React from 'react'
import { cn } from '../lib/utils'
import type { VoiceMessageData } from './types'
import { WaveformVisualizer } from './waveform-visualizer'

// ============================================================================
// Adapter
// ============================================================================

export interface VoiceMessageAdapter {
  message: VoiceMessageData
  isPlaying: boolean
  currentTimeSeconds: number
  onTogglePlay: (messageId: string) => void
  onSeek?: (messageId: string, progressPct: number) => void
}

export interface VoiceMessageProps {
  adapter: VoiceMessageAdapter
  className?: string
}

// ============================================================================
// Icons
// ============================================================================

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('h-4 w-4', className)} fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  )
}

function PauseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('h-4 w-4', className)} fill="currentColor">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  )
}

// ============================================================================
// Helpers
// ============================================================================

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// ============================================================================
// VoiceMessage
// ============================================================================

export function VoiceMessage({ adapter, className }: VoiceMessageProps) {
  const { message, isPlaying, currentTimeSeconds, onTogglePlay, onSeek } = adapter

  const progress =
    message.durationSeconds > 0
      ? Math.min(100, (currentTimeSeconds / message.durationSeconds) * 100)
      : 0

  const displayTime = isPlaying ? currentTimeSeconds : message.durationSeconds

  const handleSeek = React.useCallback(
    (pct: number) => {
      onSeek?.(message.id, pct)
    },
    [onSeek, message.id]
  )

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-2xl border bg-muted/30 px-3 py-2',
        className
      )}
      role="region"
      aria-label="Voice message"
    >
      {/* Play/pause button */}
      <button
        type="button"
        onClick={() => onTogglePlay(message.id)}
        aria-label={isPlaying ? 'Pause' : 'Play voice message'}
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
          'bg-primary text-primary-foreground',
          'hover:bg-primary/90 transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
        )}
      >
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
      </button>

      {/* Waveform */}
      <WaveformVisualizer
        amplitudes={message.waveform}
        progress={progress}
        interactive={!!onSeek}
        onSeek={handleSeek}
        height={28}
        className="flex-1 min-w-0"
      />

      {/* Duration */}
      <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
        {formatDuration(displayTime)}
      </span>
    </div>
  )
}
