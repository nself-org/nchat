/**
 * EmptyState — zero-data placeholder, no external deps.
 *
 * @module primitives/empty-state
 */

'use client'

import * as React from 'react'
import { cn } from '../lib/utils'
import type { EmptyStateProps } from './types'

function DefaultIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={cn('h-10 w-10', className)} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
}

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 px-6 py-12 text-center', className)}>
      <div className="text-muted-foreground/60">
        {icon ?? <DefaultIcon />}
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold">{title}</p>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
