/**
 * Kbd — keyboard shortcut display, no external deps.
 *
 * @module primitives/kbd
 */

'use client'

import * as React from 'react'
import { cn } from '../lib/utils'
import type { KbdProps } from './types'

/** Individual keycap */
export function Key({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd className={cn('inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded border bg-muted px-1 font-mono text-[10px] leading-none text-muted-foreground shadow-sm', className)}>
      {children}
    </kbd>
  )
}

/** Shortcut sequence like ⌘+K */
export function Kbd({ keys, className }: KbdProps) {
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)}>
      {keys.map((k, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="text-muted-foreground text-[10px]">+</span>}
          <Key>{k}</Key>
        </React.Fragment>
      ))}
    </span>
  )
}
