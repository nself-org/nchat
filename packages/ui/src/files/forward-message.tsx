/**
 * Forward message modal — destination picker, injectable, no external deps.
 *
 * @module files/forward-message
 */

'use client'

import * as React from 'react'
import { cn } from '../lib/utils'
import type { ForwardDestination } from './types'

// ============================================================================
// Adapter
// ============================================================================

export interface ForwardMessageAdapter {
  destinations: ForwardDestination[]
  isLoading?: boolean
  onSearch?: (q: string) => void
  onForward: (destinationIds: string[]) => void
  onClose: () => void
}

export interface ForwardMessageProps {
  adapter: ForwardMessageAdapter
  className?: string
}

// ============================================================================
// Icons
// ============================================================================

function SearchIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={cn('h-4 w-4', className)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
}

function XIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={cn('h-4 w-4', className)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
}

function HashIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={cn('h-3.5 w-3.5', className)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="9" x2="20" y2="9" /><line x1="4" y1="15" x2="20" y2="15" /><line x1="10" y1="3" x2="8" y2="21" /><line x1="16" y1="3" x2="14" y2="21" /></svg>
}

function UserIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={cn('h-3.5 w-3.5', className)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
}

function UsersIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={cn('h-3.5 w-3.5', className)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
}

function CheckIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={cn('h-3.5 w-3.5', className)} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
}

function SendIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={cn('h-4 w-4', className)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
}

// ============================================================================
// Destination icon by type
// ============================================================================

function DestIcon({ type }: { type: ForwardDestination['type'] }) {
  if (type === 'channel') return <HashIcon className="text-muted-foreground" />
  if (type === 'group') return <UsersIcon className="text-muted-foreground" />
  return <UserIcon className="text-muted-foreground" />
}

// ============================================================================
// ForwardMessageModal
// ============================================================================

export function ForwardMessageModal({ adapter, className }: ForwardMessageProps) {
  const { destinations, isLoading, onSearch, onForward, onClose } = adapter
  const [query, setQuery] = React.useState('')
  const [selected, setSelected] = React.useState<Set<string>>(new Set())

  // Close on Escape
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const handleQueryChange = (q: string) => {
    setQuery(q)
    onSearch?.(q)
  }

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }

  const handleForward = () => {
    if (selected.size > 0) onForward(Array.from(selected))
  }

  // Client-side filter when no onSearch supplied
  const filtered = onSearch
    ? destinations
    : destinations.filter((d) => d.name.toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-label="Forward message">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className={cn('relative z-10 w-full max-w-md rounded-xl border bg-popover shadow-xl flex flex-col', className)}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-sm font-semibold">Forward message</h2>
          <button type="button" onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close">
            <XIcon />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-2 border-b">
          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              className="w-full rounded-md border bg-muted/40 py-1.5 pl-8 pr-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="Search channels, people…"
              autoFocus
            />
          </div>
        </div>

        {/* Selected chips */}
        {selected.size > 0 && (
          <div className="flex flex-wrap gap-1.5 px-4 pt-2">
            {Array.from(selected).map((id) => {
              const dest = destinations.find((d) => d.id === id)
              if (!dest) return null
              return (
                <span key={id} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                  {dest.name}
                  <button type="button" onClick={() => toggleSelect(id)} className="ml-0.5 rounded-full hover:bg-primary/20" aria-label={`Remove ${dest.name}`}>
                    <XIcon className="h-3 w-3" />
                  </button>
                </span>
              )
            })}
          </div>
        )}

        {/* Destination list */}
        <div className="max-h-64 overflow-y-auto py-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-6 text-muted-foreground text-sm">
              <svg className="h-4 w-4 animate-spin mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" /></svg>
              Searching…
            </div>
          ) : filtered.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              {query ? `No results for "${query}"` : 'No destinations available'}
            </p>
          ) : filtered.map((dest) => {
            const isSelected = selected.has(dest.id)
            return (
              <button
                key={dest.id}
                type="button"
                onClick={() => toggleSelect(dest.id)}
                className={cn(
                  'flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors hover:bg-accent',
                  isSelected && 'bg-accent'
                )}
              >
                {/* Avatar or icon */}
                <div className="shrink-0">
                  {dest.avatarUrl ? (
                    <img src={dest.avatarUrl} alt={dest.name} className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                      <DestIcon type={dest.type} />
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium">{dest.name}</div>
                  <div className="text-xs text-muted-foreground capitalize">{dest.type}</div>
                </div>
                {isSelected && <CheckIcon className="text-primary shrink-0" />}
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t px-4 py-3">
          <span className="text-xs text-muted-foreground">
            {selected.size > 0 ? `${selected.size} selected` : 'Select destinations'}
          </span>
          <button
            type="button"
            onClick={handleForward}
            disabled={selected.size === 0}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <SendIcon />
            Forward
          </button>
        </div>
      </div>
    </div>
  )
}
