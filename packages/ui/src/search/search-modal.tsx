/**
 * Search modal — injectable, no Radix/store deps.
 *
 * @module search/search-modal
 */

'use client'

import * as React from 'react'
import { cn } from '../lib/utils'
import { SearchInput } from './search-input'
import { SearchResults } from './search-results'
import type { SearchResult, SearchFilters } from './types'
import type { SearchResultsAdapter } from './search-results'

// ============================================================================
// Adapter
// ============================================================================

export interface SearchModalAdapter {
  query: string
  filters?: SearchFilters
  results: SearchResult[]
  isLoading?: boolean
  savedSearches?: { id: string; query: string }[]
  onQueryChange: (q: string) => void
  onFiltersChange?: (f: SearchFilters) => void
  onResultClick: (r: SearchResult) => void
  onSavedSearchSelect?: (q: string) => void
  onClearHistory?: () => void
  onClose: () => void
}

export interface SearchModalProps {
  adapter: SearchModalAdapter
  open?: boolean
  className?: string
}

// ============================================================================
// XIcon
// ============================================================================

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('h-4 w-4', className)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('h-4 w-4', className)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

// ============================================================================
// SearchModal
// ============================================================================

export function SearchModal({ adapter, open = true, className }: SearchModalProps) {
  const { query, results, isLoading, savedSearches, onQueryChange, onResultClick, onSavedSearchSelect, onClearHistory, onClose } = adapter

  // Close on Escape
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  if (!open) return null

  const resultsAdapter: SearchResultsAdapter = { results, isLoading, query, onResultClick }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Search"
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div
        className={cn(
          'relative z-10 w-full max-w-2xl rounded-xl border bg-popover shadow-xl',
          'flex flex-col max-h-[70vh]',
          className
        )}
      >
        {/* Input row */}
        <div className="flex items-center gap-2 px-4 py-3 border-b">
          <SearchInput
            value={query}
            onChange={onQueryChange}
            onSubmit={() => { const first = results[0]; if (first) onResultClick(first) }}
            isLoading={isLoading}
            size="md"
            autoFocus
            showClear
            className="flex-1"
            placeholder="Search messages, channels, people…"
          />
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close search"
          >
            <XIcon />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 py-2">
          {!query && savedSearches && savedSearches.length > 0 ? (
            <div>
              <div className="flex items-center justify-between px-3 py-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recent searches</span>
                {onClearHistory && (
                  <button type="button" onClick={onClearHistory} className="text-xs text-muted-foreground hover:text-foreground">
                    Clear
                  </button>
                )}
              </div>
              {savedSearches.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => { onSavedSearchSelect?.(s.query); onQueryChange(s.query) }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors"
                >
                  <ClockIcon className="text-muted-foreground" />
                  {s.query}
                </button>
              ))}
            </div>
          ) : (
            <SearchResults adapter={resultsAdapter} className="px-1" />
          )}
        </div>

        {/* Footer hint */}
        <div className="border-t px-4 py-2 flex items-center gap-4 text-xs text-muted-foreground">
          <span><kbd className="mr-1 rounded border bg-muted px-1 font-mono">↵</kbd> to select</span>
          <span><kbd className="mr-1 rounded border bg-muted px-1 font-mono">↑↓</kbd> to navigate</span>
          <span><kbd className="mr-1 rounded border bg-muted px-1 font-mono">Esc</kbd> to close</span>
        </div>
      </div>
    </div>
  )
}
