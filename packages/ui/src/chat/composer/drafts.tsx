/**
 * Draft components — ported from nchat/frontend/src/components/drafts/
 * Hook/store deps replaced with DraftsAdapter interface.
 * framer-motion replaced with CSS transitions.
 *
 * @module chat/composer/drafts
 */

'use client'

import * as React from 'react'
import { cn } from '../../lib/utils'
import type { Draft, DraftType } from './types'

// ============================================================================
// Adapter
// ============================================================================

export interface DraftsAdapter {
  /** All drafts for the current user/channel */
  drafts: Draft[]
  /** Whether drafts are loading */
  loading?: boolean
  /** Restore a draft into the composer */
  onRestore: (draft: Draft) => void
  /** Discard a draft */
  onDiscard: (draftId: string) => void
  /** Navigate to the channel/thread a draft belongs to */
  onNavigate?: (draft: Draft) => void
  /** Format a date string for display */
  formatDate?: (dateString: string) => string
}

// ============================================================================
// Types
// ============================================================================

export interface DraftBadgeProps {
  count?: number
  variant?: 'default' | 'dot' | 'inline'
  className?: string
}

export interface DraftBadgeInlineProps {
  className?: string
}

export interface DraftDotBadgeProps {
  className?: string
}

export interface DraftIndicatorProps {
  hasDraft: boolean
  draftType?: DraftType
  className?: string
}

export interface DraftPreviewProps {
  draft: Draft
  onRestore: () => void
  onDiscard: () => void
  className?: string
}

export interface DraftPreviewCompactProps {
  draft: Draft
  onRestore: () => void
  className?: string
}

export interface DraftCardProps {
  draft: Draft
  adapter: Pick<DraftsAdapter, 'onRestore' | 'onDiscard' | 'onNavigate' | 'formatDate'>
  className?: string
}

export interface DraftActionsProps {
  draft: Draft
  onRestore: () => void
  onDiscard: () => void
  className?: string
}

export interface DraftRestoreProps {
  draft: Draft
  onRestore: () => void
  onDismiss?: () => void
  className?: string
}

export interface DraftRestoreMinimalProps {
  onRestore: () => void
  className?: string
}

export interface DraftRestoreToastProps {
  draft: Draft
  onRestore: () => void
  onDismiss: () => void
  className?: string
}

export interface DraftEmptyProps {
  className?: string
}

export interface DraftEmptyCompactProps {
  className?: string
}

export interface DraftSearchEmptyProps {
  query: string
  className?: string
}

export interface AutoSaveIndicatorProps {
  status: 'idle' | 'saving' | 'saved' | 'error'
  className?: string
}

export interface AutoSaveIndicatorMinimalProps {
  status: AutoSaveIndicatorProps['status']
  className?: string
}

export interface AutoSaveIndicatorInlineProps {
  status: AutoSaveIndicatorProps['status']
  className?: string
}

export interface AutoSaveConnectionProps {
  connected: boolean
  className?: string
}

export interface DraftListProps {
  adapter: DraftsAdapter
  className?: string
}

// ============================================================================
// Helpers
// ============================================================================

function defaultFormatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function truncate(text: string, max: number) {
  return text.length > max ? text.slice(0, max) + '…' : text
}

// ============================================================================
// Draft Badge
// ============================================================================

export function DraftBadge({ count, variant = 'default', className }: DraftBadgeProps) {
  if (variant === 'dot') return <DraftDotBadge className={className} />
  if (variant === 'inline') return <DraftBadgeInline className={className} />

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full bg-amber-500/10 px-1.5 py-0.5',
        'text-[10px] font-semibold uppercase tracking-wide text-amber-600',
        className
      )}
    >
      Draft{count !== undefined && count > 1 ? ` (${count})` : ''}
    </span>
  )
}

export function DraftBadgeInline({ className }: DraftBadgeInlineProps) {
  return (
    <span className={cn('text-xs font-medium italic text-amber-500', className)}>
      [Draft]
    </span>
  )
}

export function DraftDotBadge({ className }: DraftDotBadgeProps) {
  return (
    <span className={cn('inline-block h-2 w-2 rounded-full bg-amber-500', className)} />
  )
}

// ============================================================================
// Draft Indicator
// ============================================================================

export function DraftIndicator({ hasDraft, draftType, className }: DraftIndicatorProps) {
  if (!hasDraft) return null
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs text-amber-600',
        className
      )}
    >
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor">
        <path d="M13.5 1a.5.5 0 0 1 .354.854l-9.5 9.5a.5.5 0 0 1-.214.128l-3 .75a.5.5 0 0 1-.604-.604l.75-3a.5.5 0 0 1 .128-.214l9.5-9.5A.5.5 0 0 1 13.5 1Z" />
      </svg>
      Draft{draftType ? ` (${draftType})` : ''}
    </span>
  )
}

export function ChannelDraftIndicator(props: Omit<DraftIndicatorProps, 'draftType'>) {
  return <DraftIndicator {...props} draftType="channel" />
}

export function ThreadDraftIndicator(props: Omit<DraftIndicatorProps, 'draftType'>) {
  return <DraftIndicator {...props} draftType="thread" />
}

export function DMDraftIndicator(props: Omit<DraftIndicatorProps, 'draftType'>) {
  return <DraftIndicator {...props} draftType="dm" />
}

// ============================================================================
// Draft Preview
// ============================================================================

export function DraftPreview({ draft, onRestore, onDiscard, className }: DraftPreviewProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3',
        'dark:border-amber-900/50 dark:bg-amber-950/20',
        className
      )}
    >
      <svg viewBox="0 0 16 16" className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" fill="currentColor">
        <path d="M13.5 1a.5.5 0 0 1 .354.854l-9.5 9.5a.5.5 0 0 1-.214.128l-3 .75a.5.5 0 0 1-.604-.604l.75-3a.5.5 0 0 1 .128-.214l9.5-9.5A.5.5 0 0 1 13.5 1Z" />
      </svg>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Unsent draft</p>
        <p className="mt-0.5 line-clamp-2 text-sm text-amber-700 dark:text-amber-300">
          {draft.content}
        </p>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={onRestore}
            className="rounded bg-amber-600 px-2 py-1 text-xs font-medium text-white hover:bg-amber-700"
          >
            Restore
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="rounded px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/30"
          >
            Discard
          </button>
        </div>
      </div>
    </div>
  )
}

export function DraftPreviewCompact({ draft, onRestore, className }: DraftPreviewCompactProps) {
  return (
    <button
      type="button"
      onClick={onRestore}
      className={cn(
        'flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-amber-600',
        'hover:bg-amber-50 dark:hover:bg-amber-950/20',
        className
      )}
    >
      <svg viewBox="0 0 16 16" className="h-3 w-3" fill="currentColor">
        <path d="M13.5 1a.5.5 0 0 1 .354.854l-9.5 9.5a.5.5 0 0 1-.214.128l-3 .75a.5.5 0 0 1-.604-.604l.75-3a.5.5 0 0 1 .128-.214l9.5-9.5A.5.5 0 0 1 13.5 1Z" />
      </svg>
      {truncate(draft.content, 40)}
    </button>
  )
}

// ============================================================================
// Draft Card
// ============================================================================

export function DraftCard({ draft, adapter, className }: DraftCardProps) {
  const fmt = adapter.formatDate ?? defaultFormatDate

  return (
    <div
      className={cn(
        'group flex gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-accent/30',
        className
      )}
    >
      {/* Draft icon */}
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30">
        <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor">
          <path d="M13.5 1a.5.5 0 0 1 .354.854l-9.5 9.5a.5.5 0 0 1-.214.128l-3 .75a.5.5 0 0 1-.604-.604l.75-3a.5.5 0 0 1 .128-.214l9.5-9.5A.5.5 0 0 1 13.5 1Z" />
        </svg>
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs font-medium uppercase text-amber-600">Draft</span>
          <span className="text-xs text-muted-foreground">{fmt(draft.updatedAt)}</span>
        </div>
        <p className="mt-0.5 line-clamp-2 text-sm text-foreground">{draft.content}</p>
        {draft.attachmentCount && draft.attachmentCount > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            {draft.attachmentCount} attachment{draft.attachmentCount > 1 ? 's' : ''}
          </p>
        )}
        <div className="mt-2 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
          {adapter.onNavigate && (
            <button
              type="button"
              onClick={() => adapter.onNavigate!(draft)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Go to channel
            </button>
          )}
          <button
            type="button"
            onClick={() => adapter.onRestore(draft)}
            className="text-xs font-medium text-amber-600 hover:text-amber-700"
          >
            Restore
          </button>
          <button
            type="button"
            onClick={() => adapter.onDiscard(draft.id)}
            className="text-xs text-destructive hover:text-destructive/80"
          >
            Discard
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Draft Actions
// ============================================================================

export function DraftActions({ draft: _draft, onRestore, onDiscard, className }: DraftActionsProps) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <button
        type="button"
        onClick={onRestore}
        className="rounded px-2 py-0.5 text-xs font-medium text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20"
      >
        Restore
      </button>
      <button
        type="button"
        onClick={onDiscard}
        className="rounded px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted"
      >
        Discard
      </button>
    </div>
  )
}

// ============================================================================
// Draft Restore
// ============================================================================

export function DraftRestore({ draft, onRestore, onDismiss, className }: DraftRestoreProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3',
        'dark:border-amber-900/50 dark:bg-amber-950/20',
        className
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
          You have an unsent draft
        </p>
        <p className="mt-0.5 line-clamp-2 text-xs text-amber-700 dark:text-amber-300">
          {draft.content}
        </p>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={onRestore}
            className="rounded bg-amber-600 px-2 py-1 text-xs font-medium text-white hover:bg-amber-700"
          >
            Restore draft
          </button>
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="rounded px-2 py-1 text-xs text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/30"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function DraftRestoreMinimal({ onRestore, className }: DraftRestoreMinimalProps) {
  return (
    <button
      type="button"
      onClick={onRestore}
      className={cn(
        'flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700',
        className
      )}
    >
      <svg viewBox="0 0 16 16" className="h-3 w-3" fill="currentColor">
        <path d="M13.5 1a.5.5 0 0 1 .354.854l-9.5 9.5a.5.5 0 0 1-.214.128l-3 .75a.5.5 0 0 1-.604-.604l.75-3a.5.5 0 0 1 .128-.214l9.5-9.5A.5.5 0 0 1 13.5 1Z" />
      </svg>
      Restore draft
    </button>
  )
}

export function DraftRestoreToast({ draft, onRestore, onDismiss, className }: DraftRestoreToastProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border bg-card p-3 shadow-lg',
        className
      )}
    >
      <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0 text-amber-500" fill="currentColor">
        <path d="M13.5 1a.5.5 0 0 1 .354.854l-9.5 9.5a.5.5 0 0 1-.214.128l-3 .75a.5.5 0 0 1-.604-.604l.75-3a.5.5 0 0 1 .128-.214l9.5-9.5A.5.5 0 0 1 13.5 1Z" />
      </svg>
      <p className="min-w-0 flex-1 truncate text-sm">{truncate(draft.content, 50)}</p>
      <button
        type="button"
        onClick={onRestore}
        className="shrink-0 rounded bg-amber-600 px-2 py-1 text-xs font-medium text-white hover:bg-amber-700"
      >
        Restore
      </button>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 text-muted-foreground hover:text-foreground"
        aria-label="Dismiss"
      >
        <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 4 4 12M4 4l8 8" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}

// ============================================================================
// Draft Empty States
// ============================================================================

export function DraftEmpty({ className }: DraftEmptyProps) {
  return (
    <div className={cn('flex flex-col items-center gap-3 py-12 text-center', className)}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <svg viewBox="0 0 24 24" className="h-6 w-6 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
        </svg>
      </div>
      <div>
        <p className="font-medium text-foreground">No drafts</p>
        <p className="text-sm text-muted-foreground">Messages you start but don't send will appear here.</p>
      </div>
    </div>
  )
}

export function DraftEmptyCompact({ className }: DraftEmptyCompactProps) {
  return (
    <p className={cn('py-6 text-center text-sm text-muted-foreground', className)}>
      No drafts yet.
    </p>
  )
}

export function DraftSearchEmpty({ query, className }: DraftSearchEmptyProps) {
  return (
    <p className={cn('py-6 text-center text-sm text-muted-foreground', className)}>
      No drafts match <span className="font-medium">"{query}"</span>.
    </p>
  )
}

// ============================================================================
// Auto Save Indicator
// ============================================================================

const statusConfig = {
  idle: { label: '', icon: null, color: 'text-muted-foreground' },
  saving: { label: 'Saving…', icon: 'spinner', color: 'text-muted-foreground' },
  saved: { label: 'Saved', icon: 'check', color: 'text-green-600' },
  error: { label: 'Failed to save', icon: 'error', color: 'text-destructive' },
}

export function AutoSaveIndicator({ status, className }: AutoSaveIndicatorProps) {
  const cfg = statusConfig[status]
  if (status === 'idle') return null

  return (
    <div className={cn('flex items-center gap-1 text-xs', cfg.color, className)}>
      {cfg.icon === 'spinner' && (
        <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" className="opacity-25" />
          <path d="M12 2a10 10 0 0 1 10 10" className="opacity-75" />
        </svg>
      )}
      {cfg.icon === 'check' && (
        <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M2 8l4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {cfg.icon === 'error' && (
        <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="8" cy="8" r="6" />
          <path d="M8 5v3M8 10.5h.01" strokeLinecap="round" />
        </svg>
      )}
      <span>{cfg.label}</span>
    </div>
  )
}

export function AutoSaveIndicatorMinimal({ status, className }: AutoSaveIndicatorMinimalProps) {
  if (status === 'idle') return null
  const cfg = statusConfig[status]
  return <span className={cn('text-xs', cfg.color, className)}>{cfg.label}</span>
}

export function AutoSaveIndicatorInline({ status, className }: AutoSaveIndicatorInlineProps) {
  if (status === 'idle' || status === 'saving') return null
  const cfg = statusConfig[status]
  return <span className={cn('italic text-xs', cfg.color, className)}>{cfg.label}</span>
}

export function AutoSaveConnection({ connected, className }: AutoSaveConnectionProps) {
  return (
    <div className={cn('flex items-center gap-1 text-xs', className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', connected ? 'bg-green-500' : 'bg-muted-foreground')} />
      <span className="text-muted-foreground">{connected ? 'Auto-save on' : 'Auto-save off'}</span>
    </div>
  )
}

// ============================================================================
// Draft List
// ============================================================================

export function DraftList({ adapter, className }: DraftListProps) {
  if (adapter.loading) {
    return (
      <div className={cn('space-y-2 p-2', className)}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-3 rounded-lg border bg-card p-3">
            <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-1/4 animate-pulse rounded bg-muted" />
              <div className="h-3 w-full animate-pulse rounded bg-muted" />
              <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (adapter.drafts.length === 0) {
    return <DraftEmpty className={className} />
  }

  return (
    <div className={cn('space-y-1.5 p-2', className)}>
      {adapter.drafts.map((draft) => (
        <DraftCard key={draft.id} draft={draft} adapter={adapter} />
      ))}
    </div>
  )
}

export default DraftList
