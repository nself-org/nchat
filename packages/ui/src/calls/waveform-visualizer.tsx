/**
 * Waveform visualizer — canvas-based bar waveform for recording + playback.
 * No external deps.
 *
 * @module calls/waveform-visualizer
 */

'use client'

import * as React from 'react'
import { cn } from '../lib/utils'

// ============================================================================
// Types
// ============================================================================

export type WaveformStyle = 'bars' | 'mirror'

export interface WaveformVisualizerProps {
  /** Amplitudes array (0-1) for static playback */
  amplitudes?: number[] | null
  /** Progress (0-100) for playback head */
  progress?: number
  /** Whether clicking seeks */
  interactive?: boolean
  onSeek?: (progress: number) => void
  style?: WaveformStyle
  barCount?: number
  activeColor?: string
  inactiveColor?: string
  height?: number
  className?: string
  /** Whether to animate bars (recording mode) */
  animated?: boolean
}

// ============================================================================
// Defaults
// ============================================================================

const DEFAULT_BAR_COUNT = 40
const DEFAULT_HEIGHT = 40
const DEFAULT_ACTIVE_COLOR = 'hsl(var(--primary))'
const DEFAULT_INACTIVE_COLOR = 'hsl(var(--muted-foreground) / 0.3)'

// ============================================================================
// WaveformVisualizer
// ============================================================================

export const WaveformVisualizer = React.memo(function WaveformVisualizer({
  amplitudes,
  progress = 0,
  interactive = false,
  onSeek,
  style = 'bars',
  barCount = DEFAULT_BAR_COUNT,
  activeColor = DEFAULT_ACTIVE_COLOR,
  inactiveColor = DEFAULT_INACTIVE_COLOR,
  height = DEFAULT_HEIGHT,
  className,
  animated = false,
}: WaveformVisualizerProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const [tick, setTick] = React.useState(0)

  // Animation frame for recording mode
  React.useEffect(() => {
    if (!animated) return
    const id = setInterval(() => setTick((t) => t + 1), 80)
    return () => clearInterval(id)
  }, [animated])

  // Derive display bars
  const bars = React.useMemo(() => {
    if (amplitudes && amplitudes.length > 0) {
      // Downsample/upsample to barCount
      const result: number[] = []
      for (let i = 0; i < barCount; i++) {
        const srcIdx = Math.floor((i / barCount) * amplitudes.length)
        result.push(Math.max(0.06, amplitudes[srcIdx] ?? 0.06))
      }
      return result
    }
    // Animated random bars for recording
    return Array.from({ length: barCount }, (_, i) =>
      animated
        ? Math.max(0.06, Math.abs(Math.sin((i + tick) * 0.4)) * 0.8 + 0.1)
        : 0.08
    )
  }, [amplitudes, barCount, animated, tick])

  // Draw to canvas
  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const W = canvas.width
    const H = canvas.height
    ctx.clearRect(0, 0, W, H)

    const barW = (W / barCount) * 0.6
    const gap = (W / barCount) * 0.4
    const progressBarIdx = Math.floor((progress / 100) * barCount)

    bars.forEach((amp, i) => {
      const x = i * (barW + gap)
      const barH = Math.max(2, amp * H * (style === 'mirror' ? 0.45 : 0.9))
      const y = style === 'mirror' ? (H - barH * 2) / 2 : H - barH

      ctx.fillStyle = i <= progressBarIdx ? activeColor : inactiveColor
      ctx.beginPath()
      ctx.roundRect(x, y, barW, style === 'mirror' ? barH * 2 : barH, 2)
      ctx.fill()
    })
  }, [bars, progress, activeColor, inactiveColor, barCount, style])

  const handleClick = React.useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!interactive || !onSeek) return
      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left
      const pct = Math.min(100, Math.max(0, (x / rect.width) * 100))
      onSeek(pct)
    },
    [interactive, onSeek]
  )

  return (
    <canvas
      ref={canvasRef}
      width={barCount * 8}
      height={height}
      onClick={handleClick}
      className={cn(
        'w-full',
        interactive && 'cursor-pointer',
        className
      )}
      style={{ height }}
      aria-label="Audio waveform"
      role={interactive ? 'slider' : 'img'}
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
    />
  )
})
