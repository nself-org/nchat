/**
 * Reactions components — ported from nchat/frontend/src/components/reactions/PlatformReactions.tsx
 * framer-motion replaced with CSS transitions.
 * Hook deps replaced with ReactionsAdapter interface.
 *
 * @module chat/bubble/reactions
 */

'use client'

import * as React from 'react'
import { cn } from '../../lib/utils'
import type { ReactionAggregate, PlatformReactionConfig } from './types'

// ============================================================================
// Adapter
// ============================================================================

export interface ReactionsAdapter {
  /** Current reaction mode: 'quick' shows toolbar on hover, 'hover' shows on message hover */
  mode: 'quick' | 'hover'
  /** Available platform reactions */
  platformReactions: PlatformReactionConfig[]
  /** Callback when a reaction is selected */
  onReact: (emoji: string) => void
  /** Callback when a reaction picker should be opened */
  onOpenPicker?: () => void
}

// ============================================================================
// Types
// ============================================================================

export interface PlatformReactionsProps {
  /** Aggregated reactions for the message */
  reactions: ReactionAggregate[]
  /** Current user id for highlighting own reactions */
  currentUserId?: string
  /** Adapter for hooks/stores */
  adapter: ReactionsAdapter
  /** Callback when clicking a reaction (toggle) */
  onReact?: (emoji: string) => void
  /** Additional class name */
  className?: string
}

export interface QuickReactionBarProps {
  /** Available quick reactions */
  reactions: PlatformReactionConfig[]
  /** Callback when a reaction is selected */
  onSelect: (emoji: string) => void
  /** Whether to show the + (open picker) button */
  showPicker?: boolean
  /** Callback when + is clicked */
  onOpenPicker?: () => void
  /** Additional class name */
  className?: string
}

export interface HoverReactionBarProps {
  /** Available reactions */
  reactions: PlatformReactionConfig[]
  /** Callback when a reaction is selected */
  onSelect: (emoji: string) => void
  /** Whether the bar is visible */
  visible?: boolean
  /** Additional class name */
  className?: string
}

// ============================================================================
// Quick Reaction Bar
// ============================================================================

export function QuickReactionBar({
  reactions,
  onSelect,
  showPicker = true,
  onOpenPicker,
  className,
}: QuickReactionBarProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full border bg-popover px-1 py-0.5 shadow-sm',
        className
      )}
    >
      {reactions.slice(0, 6).map((r) => (
        <button
          key={r.emoji}
          type="button"
          title={r.label}
          onClick={() => onSelect(r.emoji)}
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-full text-base',
            'transition-all duration-100',
            'hover:scale-125 hover:bg-muted',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          )}
        >
          {r.emoji}
        </button>
      ))}
      {showPicker && onOpenPicker && (
        <button
          type="button"
          title="More reactions"
          onClick={onOpenPicker}
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground',
            'transition-colors duration-100 hover:bg-muted hover:text-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          )}
        >
          <span className="text-sm">+</span>
        </button>
      )}
    </div>
  )
}

// ============================================================================
// Hover Reaction Bar
// ============================================================================

export function HoverReactionBar({
  reactions,
  onSelect,
  visible = false,
  className,
}: HoverReactionBarProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full border bg-popover px-1 py-0.5 shadow-md',
        'transition-all duration-150',
        visible ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-1 pointer-events-none',
        className
      )}
      aria-hidden={!visible}
    >
      {reactions.slice(0, 6).map((r) => (
        <button
          key={r.emoji}
          type="button"
          title={r.label}
          onClick={() => onSelect(r.emoji)}
          tabIndex={visible ? 0 : -1}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full text-lg',
            'transition-transform duration-100',
            'hover:scale-125 hover:bg-muted',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          )}
        >
          {r.emoji}
        </button>
      ))}
    </div>
  )
}

// ============================================================================
// Reaction Chip (existing reaction on a message)
// ============================================================================

interface ReactionChipProps {
  reaction: ReactionAggregate
  isOwnReaction: boolean
  onClick: () => void
}

function ReactionChip({ reaction, isOwnReaction, onClick }: ReactionChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={reaction.label || reaction.emoji}
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs',
        'border transition-all duration-100',
        'hover:scale-105 active:scale-95',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isOwnReaction
          ? 'border-primary/50 bg-primary/10 text-primary hover:bg-primary/20'
          : 'border-border bg-muted/50 text-foreground hover:bg-muted'
      )}
    >
      <span>{reaction.emoji}</span>
      <span className="font-medium tabular-nums">{reaction.count}</span>
    </button>
  )
}

// ============================================================================
// Platform Reactions (main)
// ============================================================================

export function PlatformReactions({
  reactions,
  currentUserId,
  adapter,
  onReact,
  className,
}: PlatformReactionsProps) {
  const handleReact = (emoji: string) => {
    onReact?.(emoji)
    adapter.onReact(emoji)
  }

  if (reactions.length === 0) {
    return null
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-1', className)}>
      {reactions.map((reaction) => {
        const isOwn = currentUserId ? reaction.userIds.includes(currentUserId) : false
        return (
          <ReactionChip
            key={reaction.emoji}
            reaction={reaction}
            isOwnReaction={isOwn}
            onClick={() => handleReact(reaction.emoji)}
          />
        )
      })}
    </div>
  )
}

export default PlatformReactions
