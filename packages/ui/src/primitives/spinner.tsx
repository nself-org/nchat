/**
 * Spinner + Skeleton — loading primitives, no external deps.
 *
 * @module primitives/spinner
 */

'use client'

import * as React from 'react'
import { cn } from '../lib/utils'
import type { SpinnerSize } from './types'

// ============================================================================
// Spinner
// ============================================================================

const SPINNER_SIZE: Record<SpinnerSize, string> = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-7 w-7',
}

export interface SpinnerProps {
  size?: SpinnerSize
  className?: string
  label?: string
}

export function Spinner({ size = 'md', className, label = 'Loading…' }: SpinnerProps) {
  return (
    <span role="status" aria-label={label} className={cn('inline-flex items-center justify-center', className)}>
      <svg className={cn('animate-spin', SPINNER_SIZE[size])} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
      </svg>
    </span>
  )
}

// ============================================================================
// Skeleton
// ============================================================================

export interface SkeletonProps {
  className?: string
  /** Rounded-full for circles */
  circle?: boolean
  /** Number of lines for text skeleton */
  lines?: number
}

export function Skeleton({ className, circle = false, lines }: SkeletonProps) {
  if (lines != null && lines > 1) {
    return (
      <div className={cn('space-y-2', className)}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn('h-3 animate-pulse rounded bg-muted', i === lines - 1 && 'w-3/4')}
          />
        ))}
      </div>
    )
  }
  return (
    <div
      className={cn(
        'animate-pulse bg-muted',
        circle ? 'rounded-full' : 'rounded',
        className
      )}
    />
  )
}
