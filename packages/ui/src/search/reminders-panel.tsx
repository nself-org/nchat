/**
 * Reminders panel — injectable, no store/Radix deps.
 *
 * @module search/reminders-panel
 */

'use client'

import * as React from 'react'
import { cn } from '../lib/utils'
import type { Reminder, ReminderStatus } from './types'

// ============================================================================
// Adapter
// ============================================================================

export interface RemindersPanelAdapter {
  reminders: Reminder[]
  isLoading?: boolean
  activeStatus?: ReminderStatus | 'all'
  onStatusFilter: (status: ReminderStatus | 'all') => void
  onComplete: (id: string) => void
  onSnooze: (id: string, until: string) => void
  onDelete: (id: string) => void
  onJumpToMessage?: (messageId: string) => void
}

export interface RemindersPanelProps {
  adapter: RemindersPanelAdapter
  className?: string
}

// ============================================================================
// Icons
// ============================================================================

function BellIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={cn('h-4 w-4', className)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
}

function CheckIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={cn('h-4 w-4', className)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
}

function ClockIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={cn('h-4 w-4', className)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
}

function TrashIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={cn('h-4 w-4', className)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /></svg>
}

// ============================================================================
// Helpers
// ============================================================================

function formatRelativeTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = d.getTime() - now.getTime()
  const diffMin = Math.round(diffMs / 60000)
  if (diffMin < 0) return 'overdue'
  if (diffMin < 60) return `in ${diffMin}m`
  const diffHr = Math.round(diffMin / 60)
  if (diffHr < 24) return `in ${diffHr}h`
  return `on ${d.toLocaleDateString()}`
}

const STATUS_TABS: { key: ReminderStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'snoozed', label: 'Snoozed' },
  { key: 'completed', label: 'Done' },
]

// ============================================================================
// ReminderItem
// ============================================================================

interface ReminderItemProps {
  reminder: Reminder
  onComplete: () => void
  onSnooze: (until: string) => void
  onDelete: () => void
  onJump?: () => void
}

function ReminderItem({ reminder, onComplete, onDelete, onJump }: ReminderItemProps) {
  const isPast = new Date(reminder.remindAt) < new Date()
  const isDone = reminder.status === 'completed' || reminder.status === 'dismissed'

  return (
    <div className={cn('group flex items-start gap-3 border-b px-4 py-3 transition-colors hover:bg-accent/50', isDone && 'opacity-60')}>
      {/* Complete toggle */}
      <button
        type="button"
        onClick={onComplete}
        disabled={isDone}
        className={cn(
          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
          isDone ? 'border-muted bg-muted' : 'border-primary hover:bg-primary/10'
        )}
        aria-label="Mark complete"
      >
        {isDone && <CheckIcon className="h-3 w-3 text-muted-foreground" />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {reminder.messageContent && (
          <button type="button" onClick={onJump} className="block text-left">
            <p className={cn('text-sm line-clamp-2', isDone && 'line-through')}>{reminder.messageContent}</p>
          </button>
        )}
        {reminder.note && (
          <p className="mt-0.5 text-xs text-muted-foreground">{reminder.note}</p>
        )}
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <ClockIcon className={cn('h-3 w-3', isPast && !isDone && 'text-destructive')} />
          <span className={cn(isPast && !isDone && 'text-destructive font-medium')}>
            {formatRelativeTime(reminder.remindAt)}
          </span>
          {reminder.channelName && <span>• #{reminder.channelName}</span>}
          {reminder.repeat !== 'none' && <span>• repeats {reminder.repeat}</span>}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={onDelete}
          className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          aria-label="Delete reminder"
        >
          <TrashIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// RemindersPanel
// ============================================================================

export function RemindersPanel({ adapter, className }: RemindersPanelProps) {
  const { reminders, isLoading, activeStatus = 'all', onStatusFilter, onComplete, onSnooze, onDelete, onJumpToMessage } = adapter

  const visible = activeStatus === 'all' ? reminders : reminders.filter((r) => r.status === activeStatus)

  return (
    <div className={cn('flex h-full flex-col', className)}>
      {/* Header */}
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <BellIcon className="text-primary" />
        <h2 className="font-semibold text-sm">Reminders</h2>
      </div>

      {/* Status filter tabs */}
      <div className="flex border-b">
        {STATUS_TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => onStatusFilter(key)}
            className={cn(
              'flex-1 py-2 text-xs font-medium transition-colors',
              activeStatus === key
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">Loading…</div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
            <BellIcon className="h-8 w-8 opacity-30" />
            <span className="text-sm">No {activeStatus !== 'all' ? activeStatus : ''} reminders</span>
          </div>
        ) : (
          visible.map((r) => (
            <ReminderItem
              key={r.id}
              reminder={r}
              onComplete={() => onComplete(r.id)}
              onSnooze={(until) => onSnooze(r.id, until)}
              onDelete={() => onDelete(r.id)}
              onJump={r.messageId ? () => onJumpToMessage?.(r.messageId!) : undefined}
            />
          ))
        )}
      </div>
    </div>
  )
}
