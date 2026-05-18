/**
 * Mention components — ported from nchat/frontend/src/components/mentions/MentionAutocomplete.tsx
 * @/lib/mentions/* replaced with self-contained string-matching filter.
 * Injectable MentionsAdapter interface replaces hook deps.
 *
 * @module chat/bubble/mentions
 */

'use client'

import * as React from 'react'
import { cn } from '../../lib/utils'
import type { MentionUser, MentionChannel, MentionSuggestion } from './types'

// ============================================================================
// Adapter
// ============================================================================

export interface MentionsAdapter {
  /** Available users for @ mentions */
  users: MentionUser[]
  /** Available channels for # mentions */
  channels: MentionChannel[]
  /** Whether @everyone and @here are allowed */
  canMentionEveryone?: boolean
  /** Optional async search callback when local filter is insufficient */
  onSearch?: (trigger: '@' | '#', query: string) => void
}

// ============================================================================
// Types
// ============================================================================

export interface MentionAutocompleteProps {
  /** Adapter providing mention data */
  adapter: MentionsAdapter
  /** Current text trigger — '@' | '#' | null (null = hidden) */
  trigger: '@' | '#' | null
  /** Current query after the trigger character */
  query: string
  /** Position hint for the popover (pixels from left of editor) */
  position?: { top: number; left: number }
  /** Callback when a suggestion is selected */
  onSelect: (suggestion: MentionSuggestion) => void
  /** Callback when ESC is pressed or focus lost */
  onDismiss: () => void
  /** Additional class name */
  className?: string
}

export interface MentionItemProps {
  suggestion: MentionSuggestion
  isActive?: boolean
  onClick: () => void
}

export interface MentionHighlightProps {
  /** Text containing @username and #channel patterns */
  text: string
  /** Known mention IDs/names to highlight (optional — highlights all @/# patterns when omitted) */
  mentions?: Array<{ type: 'user' | 'channel'; id: string; label: string }>
  className?: string
}

// ============================================================================
// Helpers
// ============================================================================

function filterSuggestions(
  trigger: '@' | '#',
  query: string,
  adapter: MentionsAdapter
): MentionSuggestion[] {
  const q = query.toLowerCase().trim()

  if (trigger === '#') {
    return adapter.channels
      .filter(
        (c) =>
          q === '' ||
          c.name.toLowerCase().includes(q) ||
          (c.slug && c.slug.toLowerCase().includes(q))
      )
      .slice(0, 8)
      .map((c) => ({
        type: 'channel' as const,
        id: c.id,
        label: c.name,
        sublabel: c.isPrivate ? 'Private channel' : undefined,
      }))
  }

  // @ trigger
  const results: MentionSuggestion[] = []

  if (adapter.canMentionEveryone && (q === '' || 'everyone'.startsWith(q))) {
    results.push({ type: 'everyone', id: 'everyone', label: 'everyone', sublabel: 'Notify everyone' })
  }
  if (adapter.canMentionEveryone && (q === '' || 'here'.startsWith(q))) {
    results.push({ type: 'here', id: 'here', label: 'here', sublabel: 'Notify online members' })
  }

  const userResults = adapter.users
    .filter(
      (u) =>
        q === '' ||
        u.username.toLowerCase().includes(q) ||
        u.displayName.toLowerCase().includes(q)
    )
    .slice(0, 6)
    .map((u) => ({
      type: 'user' as const,
      id: u.id,
      label: u.displayName || u.username,
      sublabel: u.username !== (u.displayName || u.username) ? `@${u.username}` : undefined,
      avatarUrl: u.avatarUrl,
    }))

  return [...results, ...userResults]
}

function getStatusColor(status?: MentionUser['status']) {
  switch (status) {
    case 'online': return 'bg-green-500'
    case 'away': return 'bg-yellow-500'
    case 'busy': return 'bg-red-500'
    default: return 'bg-muted-foreground/30'
  }
}

// ============================================================================
// Mention Item
// ============================================================================

export function MentionItem({ suggestion, isActive = false, onClick }: MentionItemProps) {
  const isChannel = suggestion.type === 'channel'
  const isSpecial = suggestion.type === 'everyone' || suggestion.type === 'here'

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 px-3 py-2 text-left text-sm',
        'transition-colors duration-75',
        'focus-visible:outline-none',
        isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
      )}
    >
      {/* Avatar / Icon */}
      {isChannel ? (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
          #
        </span>
      ) : isSpecial ? (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <svg viewBox="0 0 16 16" className="h-4 w-4 text-primary" fill="currentColor">
            <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm1 10H7V7h2v4Zm0-6H7V3h2v2Z" />
          </svg>
        </span>
      ) : suggestion.avatarUrl ? (
        <img
          src={suggestion.avatarUrl}
          alt={suggestion.label}
          className="h-7 w-7 shrink-0 rounded-full object-cover"
        />
      ) : (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium uppercase text-muted-foreground">
          {(suggestion.label || '?').charAt(0)}
        </span>
      )}

      {/* Labels */}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{suggestion.label}</span>
        {suggestion.sublabel && (
          <span className="block truncate text-xs text-muted-foreground">{suggestion.sublabel}</span>
        )}
      </span>
    </button>
  )
}

// ============================================================================
// Mention Autocomplete
// ============================================================================

export const MentionAutocomplete = React.forwardRef<HTMLDivElement, MentionAutocompleteProps>(
  function MentionAutocomplete(
    { adapter, trigger, query, position, onSelect, onDismiss, className },
    ref
  ) {
    const [activeIndex, setActiveIndex] = React.useState(0)

    const suggestions = React.useMemo(() => {
      if (!trigger) return []
      return filterSuggestions(trigger, query, adapter)
    }, [trigger, query, adapter])

    // Reset active index when suggestions change
    React.useEffect(() => {
      setActiveIndex(0)
    }, [suggestions.length])

    // Notify adapter of search for async results
    React.useEffect(() => {
      if (trigger && adapter.onSearch) {
        adapter.onSearch(trigger, query)
      }
    }, [trigger, query, adapter])

    // Keyboard navigation
    React.useEffect(() => {
      if (!trigger) return

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1))
        } else if (e.key === 'ArrowUp') {
          e.preventDefault()
          setActiveIndex((i) => Math.max(i - 1, 0))
        } else if (e.key === 'Enter' || e.key === 'Tab') {
          const selected = suggestions[activeIndex]
          if (selected) {
            e.preventDefault()
            onSelect(selected)
          }
        } else if (e.key === 'Escape') {
          e.preventDefault()
          onDismiss()
        }
      }

      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }, [trigger, suggestions, activeIndex, onSelect, onDismiss])

    if (!trigger || suggestions.length === 0) return null

    const style: React.CSSProperties = position
      ? { position: 'absolute', top: position.top, left: position.left, zIndex: 50 }
      : {}

    return (
      <div
        ref={ref}
        style={style}
        className={cn(
          'w-64 overflow-hidden rounded-lg border bg-popover shadow-lg',
          'animate-in fade-in-0 zoom-in-95 duration-100',
          className
        )}
        role="listbox"
        aria-label={trigger === '@' ? 'Mention users' : 'Mention channels'}
      >
        <div className="py-1">
          <p className="px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {trigger === '@' ? 'Members' : 'Channels'}
          </p>
          {suggestions.map((suggestion, i) => (
            <MentionItem
              key={`${suggestion.type}:${suggestion.id}`}
              suggestion={suggestion}
              isActive={i === activeIndex}
              onClick={() => onSelect(suggestion)}
            />
          ))}
        </div>
      </div>
    )
  }
)

// ============================================================================
// Mention Highlight
// ============================================================================

export function MentionHighlight({ text, mentions, className }: MentionHighlightProps) {
  // Simple regex-based highlighter: matches @word and #word patterns
  const parts = React.useMemo(() => {
    const segments: Array<{ text: string; isHighlight: boolean; key: string }> = []
    const pattern = /(@[\w.-]+|#[\w-]+)/g
    let lastIndex = 0
    let m: RegExpExecArray | null

    while ((m = pattern.exec(text)) !== null) {
      if (m.index > lastIndex) {
        segments.push({ text: text.slice(lastIndex, m.index), isHighlight: false, key: `t${lastIndex}` })
      }

      const token = m[0]
      const isMentioned =
        !mentions ||
        mentions.some((mn) => {
          const prefix = mn.type === 'user' ? '@' : '#'
          return token === `${prefix}${mn.label}` || token === `${prefix}${mn.id}`
        })

      segments.push({ text: token, isHighlight: isMentioned, key: `m${m.index}` })
      lastIndex = m.index + token.length
    }

    if (lastIndex < text.length) {
      segments.push({ text: text.slice(lastIndex), isHighlight: false, key: `t${lastIndex}` })
    }

    return segments
  }, [text, mentions])

  return (
    <span className={className}>
      {parts.map((part) =>
        part.isHighlight ? (
          <mark
            key={part.key}
            className="rounded bg-primary/20 px-0.5 text-primary not-italic"
          >
            {part.text}
          </mark>
        ) : (
          <React.Fragment key={part.key}>{part.text}</React.Fragment>
        )
      )}
    </span>
  )
}

export default MentionAutocomplete
