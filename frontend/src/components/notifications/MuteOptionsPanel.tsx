'use client'

/**
 * MuteOptionsPanel - Mute settings for notifications
 */

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface MuteOptionsPanelProps {
  className?: string
}

export function MuteOptionsPanel({ className }: MuteOptionsPanelProps) {
  return (
    <div className={cn('space-y-4 p-4', className)}>
      <h3 className="text-lg font-medium">Mute Options</h3>
      <p className="text-sm text-muted-foreground">Temporarily mute notifications.</p>
      <div className="rounded-lg border p-4">
        <p className="text-sm">Per-channel and per-conversation mute options are available from the channel settings menu.</p>
      </div>
    </div>
  )
}

export default MuteOptionsPanel
