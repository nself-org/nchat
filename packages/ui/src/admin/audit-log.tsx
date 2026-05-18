/**
 * AuditLog — injectable, no external deps.
 *
 * @module admin/audit-log
 */

'use client'

import * as React from 'react'
import { cn } from '../lib/utils'
import type { AuditEvent, AuditEventType } from './types'

// ============================================================================
// Adapter
// ============================================================================

export interface AuditLogAdapter {
  events: AuditEvent[]
  isLoading?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
  onEventClick?: (event: AuditEvent) => void
  onFilterChange?: (filters: { type?: AuditEventType; actorId?: string; from?: string; to?: string }) => void
}

export interface AuditLogProps {
  adapter: AuditLogAdapter
  className?: string
}

// ============================================================================
// Icons
// ============================================================================

function ShieldIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={cn('h-4 w-4', className)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
}

function ChevronDownIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={cn('h-4 w-4', className)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
}

// ============================================================================
// Helpers
// ============================================================================

function eventColor(type: AuditEventType): string {
  if (type.startsWith('user.banned') || type.startsWith('message.deleted') || type === 'moderation.action') return 'text-destructive'
  if (type.startsWith('user.') || type.startsWith('member.')) return 'text-blue-600 dark:text-blue-400'
  if (type.startsWith('channel.')) return 'text-purple-600 dark:text-purple-400'
  if (type.startsWith('settings.') || type.startsWith('plugin.')) return 'text-orange-600 dark:text-orange-400'
  if (type.startsWith('file.')) return 'text-green-600 dark:text-green-400'
  return 'text-muted-foreground'
}

function formatEventType(type: AuditEventType): string {
  return type.replace(/\./g, ' › ').replace(/_/g, ' ')
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

// ============================================================================
// AuditLog
// ============================================================================

export function AuditLog({ adapter, className }: AuditLogProps) {
  const { events, isLoading, hasMore, onLoadMore } = adapter

  return (
    <div className={cn('flex flex-col gap-0', className)}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b">
        <ShieldIcon className="text-muted-foreground" />
        <h2 className="text-sm font-semibold">Audit Log</h2>
        <span className="ml-auto text-xs text-muted-foreground">{events.length} events</span>
      </div>

      {/* Events */}
      {isLoading && events.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <svg className="h-5 w-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" /></svg>
          Loading events…
        </div>
      ) : events.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground text-sm">No audit events</div>
      ) : (
        <div className="divide-y">
          {events.map((event) => (
            <div
              key={event.id}
              className={cn('flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors', adapter.onEventClick && 'cursor-pointer')}
              onClick={() => adapter.onEventClick?.(event)}
              role={adapter.onEventClick ? 'button' : undefined}
              tabIndex={adapter.onEventClick ? 0 : undefined}
            >
              {/* Actor avatar */}
              <div className="shrink-0 mt-0.5">
                {event.actorAvatarUrl ? (
                  <img src={event.actorAvatarUrl} alt={event.actorName} className="h-7 w-7 rounded-full object-cover" />
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-medium">
                    {event.actorName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{event.actorName}</span>
                  <span className={cn('text-xs font-mono', eventColor(event.type))}>{formatEventType(event.type)}</span>
                  {event.targetLabel && (
                    <span className="text-xs text-muted-foreground truncate">→ {event.targetLabel}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                  <span>{timeAgo(event.createdAt)}</span>
                  {event.ipAddress && <span className="font-mono">{event.ipAddress}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load more */}
      {hasMore && onLoadMore && (
        <div className="border-t px-4 py-3">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            {isLoading ? (
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" /></svg>
            ) : (
              <ChevronDownIcon />
            )}
            Load more
          </button>
        </div>
      )}
    </div>
  )
}
