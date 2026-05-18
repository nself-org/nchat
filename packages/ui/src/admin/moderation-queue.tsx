/**
 * ModerationQueue — injectable, no external deps.
 *
 * @module admin/moderation-queue
 */

'use client'

import * as React from 'react'
import { cn } from '../lib/utils'
import type { ModerationReport, ModerationStatus, ModerationActionType } from './types'

// ============================================================================
// Adapter
// ============================================================================

export interface ModerationQueueAdapter {
  reports: ModerationReport[]
  isLoading?: boolean
  activeStatus?: ModerationStatus | 'all'
  onStatusFilter: (status: ModerationStatus | 'all') => void
  onAction: (reportId: string, action: ModerationActionType, reason?: string) => void
  onDismiss: (reportId: string) => void
  onViewTarget?: (report: ModerationReport) => void
}

export interface ModerationQueueProps {
  adapter: ModerationQueueAdapter
  className?: string
}

// ============================================================================
// Icons
// ============================================================================

function FlagIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={cn('h-4 w-4', className)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></svg>
}

function CheckIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={cn('h-3.5 w-3.5', className)} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
}

function XIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={cn('h-3.5 w-3.5', className)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
}

// ============================================================================
// Helpers
// ============================================================================

const STATUS_TABS: { value: ModerationStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'actioned', label: 'Actioned' },
  { value: 'dismissed', label: 'Dismissed' },
]

const ACTION_OPTIONS: { value: ModerationActionType; label: string; destructive?: boolean }[] = [
  { value: 'warn', label: 'Warn user' },
  { value: 'mute', label: 'Mute user' },
  { value: 'kick', label: 'Kick user' },
  { value: 'ban', label: 'Ban user', destructive: true },
  { value: 'delete_message', label: 'Delete message', destructive: true },
  { value: 'none', label: 'No action' },
]

function statusBadge(status: ModerationStatus) {
  const map: Record<ModerationStatus, string> = {
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    reviewed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    actioned: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    dismissed: 'bg-muted text-muted-foreground',
  }
  return map[status]
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ============================================================================
// ModerationQueue
// ============================================================================

export function ModerationQueue({ adapter, className }: ModerationQueueProps) {
  const { reports, isLoading, activeStatus = 'pending', onStatusFilter, onAction, onDismiss, onViewTarget } = adapter
  const [expanded, setExpanded] = React.useState<string | null>(null)
  const [selectedAction, setSelectedAction] = React.useState<Record<string, ModerationActionType>>({})

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b">
        <FlagIcon className="text-destructive" />
        <h2 className="text-sm font-semibold">Moderation Queue</h2>
        <span className="ml-auto text-xs text-muted-foreground">{reports.length} reports</span>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 px-4 py-2 border-b overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => onStatusFilter(tab.value)}
            className={cn(
              'shrink-0 rounded-md px-3 py-1 text-xs font-medium transition-colors',
              activeStatus === tab.value
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Reports */}
      {isLoading && reports.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <svg className="h-5 w-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" /></svg>
          Loading reports…
        </div>
      ) : reports.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">No reports in this category</div>
      ) : (
        <div className="divide-y overflow-y-auto">
          {reports.map((report) => {
            const isOpen = expanded === report.id
            const action = selectedAction[report.id] ?? 'warn'
            return (
              <div key={report.id} className="px-4 py-3">
                {/* Summary row */}
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{report.reportedByName}</span>
                      <span className="text-xs text-muted-foreground">reported a {report.targetType}</span>
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', statusBadge(report.status))}>
                        {report.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">Reason: {report.reason}</p>
                    {report.targetPreview && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 italic">"{report.targetPreview}"</p>
                    )}
                    <div className="text-xs text-muted-foreground mt-1">{timeAgo(report.createdAt)}</div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {onViewTarget && (
                      <button type="button" onClick={() => onViewTarget(report)} className="rounded p-1 hover:bg-muted text-muted-foreground text-xs">View</button>
                    )}
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : report.id)}
                      className="rounded p-1 hover:bg-muted text-muted-foreground text-xs"
                    >
                      {isOpen ? 'Collapse' : 'Act'}
                    </button>
                  </div>
                </div>

                {/* Action panel */}
                {isOpen && report.status === 'pending' && (
                  <div className="mt-3 rounded-lg border bg-muted/20 p-3 space-y-2">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Take action</div>
                    <div className="flex flex-wrap gap-1.5">
                      {ACTION_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setSelectedAction((prev) => ({ ...prev, [report.id]: opt.value }))}
                          className={cn(
                            'rounded-md px-2.5 py-1 text-xs font-medium transition-colors border',
                            action === opt.value
                              ? opt.destructive
                                ? 'bg-destructive text-destructive-foreground border-destructive'
                                : 'bg-primary text-primary-foreground border-primary'
                              : 'border-border hover:bg-muted text-muted-foreground'
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => { onAction(report.id, action); setExpanded(null) }}
                        className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                      >
                        <CheckIcon />
                        Apply action
                      </button>
                      <button
                        type="button"
                        onClick={() => { onDismiss(report.id); setExpanded(null) }}
                        className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                      >
                        <XIcon />
                        Dismiss
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
