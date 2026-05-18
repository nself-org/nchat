/**
 * Search results — injectable, no store deps.
 *
 * @module search/search-results
 */

'use client'

import * as React from 'react'
import { cn } from '../lib/utils'
import type { SearchResult, MessageSearchResult, ChannelSearchResult, UserSearchResult, FileSearchResult } from './types'

// ============================================================================
// Props / Adapter
// ============================================================================

export interface SearchResultsAdapter {
  results: SearchResult[]
  isLoading?: boolean
  query?: string
  onResultClick: (result: SearchResult) => void
}

export interface SearchResultsProps {
  adapter: SearchResultsAdapter
  className?: string
}

// ============================================================================
// Icons
// ============================================================================

function HashIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={cn('h-4 w-4', className)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="9" x2="20" y2="9" /><line x1="4" y1="15" x2="20" y2="15" /><line x1="10" y1="3" x2="8" y2="21" /><line x1="16" y1="3" x2="14" y2="21" /></svg>
}

function UserIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={cn('h-4 w-4', className)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
}

function FileIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={cn('h-4 w-4', className)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
}

function MessageIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={cn('h-4 w-4', className)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
}

// ============================================================================
// Result row components
// ============================================================================

function Avatar({ name, url, size = 'sm' }: { name: string; url?: string; size?: 'sm' | 'md' }) {
  const dim = size === 'md' ? 'h-8 w-8' : 'h-6 w-6'
  const text = size === 'md' ? 'text-sm' : 'text-xs'
  if (url) return <img src={url} alt={name} className={cn('rounded-full object-cover shrink-0', dim)} />
  return (
    <span className={cn('inline-flex items-center justify-center rounded-full bg-primary/10 font-medium text-primary shrink-0', dim, text)}>
      {name.charAt(0).toUpperCase()}
    </span>
  )
}

function MessageRow({ result, onClick }: { result: MessageSearchResult; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left hover:bg-accent transition-colors">
      <Avatar name={result.authorName} url={result.authorAvatarUrl} size="md" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{result.authorName}</span>
          <span className="text-xs text-muted-foreground shrink-0">#{result.channelName}</span>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
          {result.snippet ?? result.content}
        </p>
      </div>
    </button>
  )
}

function ChannelRow({ result, onClick }: { result: ChannelSearchResult; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-accent transition-colors">
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-muted shrink-0">
        {result.isPrivate ? <span className="text-xs">🔒</span> : <HashIcon />}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{result.name}</div>
        {result.description && <div className="text-xs text-muted-foreground truncate">{result.description}</div>}
      </div>
      {result.memberCount != null && (
        <span className="text-xs text-muted-foreground shrink-0">{result.memberCount} members</span>
      )}
    </button>
  )
}

function UserRow({ result, onClick }: { result: UserSearchResult; onClick: () => void }) {
  const statusColors: Record<string, string> = {
    online: 'bg-green-500', away: 'bg-yellow-500', dnd: 'bg-red-500', offline: 'bg-gray-400'
  }
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-accent transition-colors">
      <div className="relative shrink-0">
        <Avatar name={result.displayName ?? result.name} url={result.avatarUrl} size="md" />
        {result.status && (
          <span className={cn('absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background', statusColors[result.status])} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{result.displayName ?? result.name}</div>
        {result.displayName && <div className="text-xs text-muted-foreground truncate">@{result.name}</div>}
      </div>
    </button>
  )
}

function FileRow({ result, onClick }: { result: FileSearchResult; onClick: () => void }) {
  const sizeStr = result.sizeBytes != null ? `${Math.round(result.sizeBytes / 1024)} KB` : undefined
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-accent transition-colors">
      {result.thumbnailUrl
        ? <img src={result.thumbnailUrl} alt={result.name} className="h-10 w-10 rounded object-cover shrink-0" />
        : <span className="flex h-10 w-10 items-center justify-center rounded-md bg-muted shrink-0"><FileIcon /></span>
      }
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{result.name}</div>
        <div className="text-xs text-muted-foreground truncate">
          {[result.channelName && `#${result.channelName}`, result.uploadedBy, sizeStr].filter(Boolean).join(' · ')}
        </div>
      </div>
    </button>
  )
}

// ============================================================================
// Group label
// ============================================================================

const GROUP_LABELS: Record<string, { label: string; icon: React.FC<{ className?: string }> }> = {
  message: { label: 'Messages', icon: MessageIcon },
  channel: { label: 'Channels', icon: HashIcon },
  user: { label: 'People', icon: UserIcon },
  file: { label: 'Files', icon: FileIcon },
}

// ============================================================================
// SearchResults
// ============================================================================

export function SearchResults({ adapter, className }: SearchResultsProps) {
  const { results, isLoading, query, onResultClick } = adapter

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center py-8 text-muted-foreground', className)}>
        <svg className="h-5 w-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" /></svg>
        Searching…
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className={cn('py-8 text-center text-muted-foreground', className)}>
        {query ? `No results for "${query}"` : 'Type to search'}
      </div>
    )
  }

  // Group by type
  const groups = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    const bucket = acc[r.type]
    if (bucket) { bucket.push(r) } else { acc[r.type] = [r] }
    return acc
  }, {})

  return (
    <div className={cn('space-y-4', className)}>
      {Object.entries(groups).map(([type, items]) => {
        const meta = GROUP_LABELS[type]
        const Icon = meta?.icon
        return (
          <div key={type}>
            <div className="mb-1 flex items-center gap-1.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {Icon && <Icon />}
              {meta?.label ?? type}
              <span className="ml-auto">{items.length}</span>
            </div>
            <div>
              {items.map((r) => {
                const handleClick = () => onResultClick(r)
                if (r.type === 'message') return <MessageRow key={r.id} result={r} onClick={handleClick} />
                if (r.type === 'channel') return <ChannelRow key={r.id} result={r} onClick={handleClick} />
                if (r.type === 'user') return <UserRow key={r.id} result={r} onClick={handleClick} />
                if (r.type === 'file') return <FileRow key={r.id} result={r} onClick={handleClick} />
                return null
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
