/**
 * Quick switcher — injectable, no cmdk/hotkeys/store deps.
 *
 * @module search/quick-switcher
 */

'use client'

import * as React from 'react'
import { cn } from '../lib/utils'
import type { QuickRecallItem } from './types'

// ============================================================================
// Adapter
// ============================================================================

export interface QuickSwitcherAdapter {
  items: QuickRecallItem[]
  recentItems?: QuickRecallItem[]
  query: string
  isLoading?: boolean
  onQueryChange: (q: string) => void
  onSelect: (item: QuickRecallItem) => void
  onClose: () => void
}

export interface QuickSwitcherProps {
  adapter: QuickSwitcherAdapter
  open?: boolean
  className?: string
}

// ============================================================================
// Icons
// ============================================================================

function HashIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={cn('h-4 w-4', className)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="9" x2="20" y2="9" /><line x1="4" y1="15" x2="20" y2="15" /><line x1="10" y1="3" x2="8" y2="21" /><line x1="16" y1="3" x2="14" y2="21" /></svg>
}

function UsersIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={cn('h-4 w-4', className)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
}

function ClockIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={cn('h-4 w-4', className)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
}

function SearchIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={cn('h-4 w-4', className)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
}

// ============================================================================
// ItemRow
// ============================================================================

function ItemIcon({ item }: { item: QuickRecallItem }) {
  if (item.avatarUrl) return <img src={item.avatarUrl} alt={item.name} className="h-6 w-6 rounded-full object-cover" />
  if (item.type === 'dm') return <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">{item.name.charAt(0).toUpperCase()}</span>
  if (item.type === 'group') return <UsersIcon className="h-4 w-4 text-muted-foreground" />
  return <HashIcon className="h-4 w-4 text-muted-foreground" />
}

interface ItemRowProps {
  item: QuickRecallItem
  isActive: boolean
  onSelect: () => void
  isRecent?: boolean
}

function ItemRow({ item, isActive, onSelect, isRecent }: ItemRowProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors',
        isActive ? 'bg-primary/10 text-primary' : 'hover:bg-accent'
      )}
    >
      <ItemIcon item={item} />
      <span className="flex-1 truncate text-sm">{item.name}</span>
      {isRecent && <ClockIcon className="h-3 w-3 shrink-0 text-muted-foreground" />}
      {item.unreadCount != null && item.unreadCount > 0 && (
        <span className="shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
          {item.unreadCount > 99 ? '99+' : item.unreadCount}
        </span>
      )}
    </button>
  )
}

// ============================================================================
// QuickSwitcher
// ============================================================================

export function QuickSwitcher({ adapter, open = true, className }: QuickSwitcherProps) {
  const { items, recentItems, query, isLoading, onQueryChange, onSelect, onClose } = adapter
  const [activeIdx, setActiveIdx] = React.useState(0)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const displayItems = query ? items : (recentItems ?? items)
  const sectionLabel = query ? 'Results' : 'Recent'

  // Reset active on items change
  React.useEffect(() => { setActiveIdx(0) }, [displayItems.length])

  // Keyboard nav
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!open) return
      if (e.key === 'Escape') { e.preventDefault(); onClose() }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, displayItems.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)) }
      if (e.key === 'Enter') { e.preventDefault(); if (displayItems[activeIdx]) onSelect(displayItems[activeIdx]) }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, displayItems, activeIdx, onClose, onSelect])

  // Auto-focus
  React.useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0)
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4" role="dialog" aria-modal="true" aria-label="Quick switcher">
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('relative z-10 w-full max-w-md rounded-xl border bg-popover shadow-2xl', className)}>
        {/* Input */}
        <div className="flex items-center gap-2 border-b px-3 py-2.5">
          <SearchIcon className="shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Jump to channel, DM…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {isLoading && (
            <svg className="h-4 w-4 animate-spin text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" /></svg>
          )}
        </div>

        {/* List */}
        <div className="max-h-80 overflow-y-auto p-2">
          {displayItems.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {query ? 'No results' : 'No recent conversations'}
            </div>
          ) : (
            <>
              <div className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {sectionLabel}
              </div>
              {displayItems.map((item, idx) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  isActive={idx === activeIdx}
                  onSelect={() => onSelect(item)}
                  isRecent={!query}
                />
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-3 py-2 text-[10px] text-muted-foreground flex gap-3">
          <span><kbd className="rounded border bg-muted px-1 font-mono">↑↓</kbd> navigate</span>
          <span><kbd className="rounded border bg-muted px-1 font-mono">↵</kbd> open</span>
          <span><kbd className="rounded border bg-muted px-1 font-mono">Esc</kbd> close</span>
        </div>
      </div>
    </div>
  )
}
