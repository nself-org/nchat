/**
 * Bookmarks panel — injectable, no store/Radix deps.
 *
 * @module search/bookmarks-panel
 */

'use client'

import * as React from 'react'
import { cn } from '../lib/utils'
import type { Bookmark, BookmarkFolder } from './types'

// ============================================================================
// Adapter
// ============================================================================

export interface BookmarksPanelAdapter {
  bookmarks: Bookmark[]
  folders: BookmarkFolder[]
  activeFolderId?: string
  isLoading?: boolean
  filterQuery?: string
  onFolderSelect: (id: string | undefined) => void
  onBookmarkClick: (bookmark: Bookmark) => void
  onBookmarkRemove: (bookmarkId: string) => void
  onFilterChange?: (q: string) => void
  onAddFolder?: () => void
  onMoveToFolder?: (bookmarkId: string, folderId: string | undefined) => void
}

export interface BookmarksPanelProps {
  adapter: BookmarksPanelAdapter
  className?: string
}

// ============================================================================
// Icons
// ============================================================================

function BookmarkIcon({ filled, className }: { filled?: boolean; className?: string }) {
  return filled
    ? <svg viewBox="0 0 24 24" className={cn('h-4 w-4', className)} fill="currentColor"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
    : <svg viewBox="0 0 24 24" className={cn('h-4 w-4', className)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
}

function XIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={cn('h-3.5 w-3.5', className)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
}

function PlusIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={cn('h-4 w-4', className)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
}

// ============================================================================
// BookmarksPanel
// ============================================================================

export function BookmarksPanel({ adapter, className }: BookmarksPanelProps) {
  const {
    bookmarks, folders, activeFolderId, isLoading, filterQuery = '',
    onFolderSelect, onBookmarkClick, onBookmarkRemove, onFilterChange, onAddFolder,
  } = adapter

  const filtered = filterQuery
    ? bookmarks.filter((b) =>
        b.content.toLowerCase().includes(filterQuery.toLowerCase()) ||
        b.channelName.toLowerCase().includes(filterQuery.toLowerCase())
      )
    : bookmarks

  return (
    <div className={cn('flex h-full flex-col', className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="font-semibold text-sm flex items-center gap-1.5">
          <BookmarkIcon filled className="text-primary" />
          Bookmarks
        </h2>
        {onAddFolder && (
          <button type="button" onClick={onAddFolder} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <PlusIcon /> New folder
          </button>
        )}
      </div>

      {/* Filter input */}
      <div className="border-b px-3 py-2">
        <input
          type="text"
          value={filterQuery}
          onChange={(e) => onFilterChange?.(e.target.value)}
          placeholder="Filter bookmarks…"
          className="w-full rounded-md border bg-muted/50 px-3 py-1.5 text-sm outline-none focus:border-input focus:bg-background focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Folder tabs */}
      {folders.length > 0 && (
        <div className="flex gap-1 overflow-x-auto border-b px-3 py-2 scrollbar-none">
          <button
            type="button"
            onClick={() => onFolderSelect(undefined)}
            className={cn(
              'shrink-0 rounded-full px-3 py-1 text-xs transition-colors',
              activeFolderId == null ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'
            )}
          >
            All
          </button>
          {folders.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onFolderSelect(f.id)}
              className={cn(
                'shrink-0 rounded-full px-3 py-1 text-xs transition-colors',
                activeFolderId === f.id ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'
              )}
            >
              {f.name}
              {f.count > 0 && <span className="ml-1 opacity-70">({f.count})</span>}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
            <BookmarkIcon className="h-8 w-8 opacity-30" />
            <span className="text-sm">{filterQuery ? 'No matching bookmarks' : 'No bookmarks yet'}</span>
            {!filterQuery && <span className="text-xs">Save messages to find them here</span>}
          </div>
        ) : (
          <div className="divide-y">
            {filtered.map((b) => (
              <div key={b.id} className="group flex items-start gap-3 px-4 py-3 hover:bg-accent/50 transition-colors">
                <button
                  type="button"
                  onClick={() => onBookmarkClick(b)}
                  className="flex-1 min-w-0 text-left"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-muted-foreground truncate">
                      #{b.channelName}
                    </span>
                    <span className="text-xs text-muted-foreground ml-auto shrink-0">
                      {new Date(b.savedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm line-clamp-3">{b.content}</p>
                  {b.note && (
                    <p className="mt-1 text-xs text-muted-foreground italic line-clamp-1">{b.note}</p>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onBookmarkRemove(b.id)}
                  className="mt-1 shrink-0 rounded p-0.5 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted transition-all"
                  aria-label="Remove bookmark"
                >
                  <XIcon />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
