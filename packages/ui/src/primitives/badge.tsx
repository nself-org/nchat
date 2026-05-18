/**
 * Badge — color-coded label, no external deps.
 *
 * @module primitives/badge
 */

'use client'

import * as React from 'react'
import { cn } from '../lib/utils'
import type { BadgeProps } from './types'

const COLOR_MAP: Record<string, string> = {
  default:  'bg-muted text-muted-foreground',
  blue:     'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  green:    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  yellow:   'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  red:      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  purple:   'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  pink:     'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  orange:   'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
}

export function Badge({ label, variant = 'default', size = 'md', dot = false, className }: BadgeProps) {
  const colorCls = COLOR_MAP[variant] ?? COLOR_MAP.default
  const sizeCls = size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-0.5 text-xs'
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full font-medium', colorCls, sizeCls, className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {label}
    </span>
  )
}

/** Numeric badge used for unread counts — shows "99+" above 99 */
export function UnreadBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null
  return (
    <span className={cn('inline-flex min-w-[1.125rem] items-center justify-center rounded-full bg-primary px-1 py-0.5 text-[10px] font-bold leading-none text-primary-foreground', className)}>
      {count > 99 ? '99+' : count}
    </span>
  )
}
