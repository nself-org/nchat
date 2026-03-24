'use client'

/**
 * PlatformReactions Component
 *
 * Platform-aware reaction display that renders reactions according to
 * the configured platform style (WhatsApp, Telegram, Slack, Discord, etc.)
 */

import { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Smile } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  useReactionMode,
  useReactionPicker,
  type UseReactionModeOptions,
} from '@/hooks/use-reaction-mode'
import type {
  ReactionAggregate,
  PlatformReactionConfig,
} from '@/lib/reactions/platform-reactions'

// ============================================================================
// Types
// ============================================================================

export interface PlatformReactionsProps {
  /** Message ID for the reactions */
  messageId: string
  /** Current reactions on the message */
  reactions: ReactionAggregate[]
  /** Platform configuration options */
  options?: UseReactionModeOptions
  /** Custom class name */
  className?: string
  /** Compact mode for dense layouts */
  compact?: boolean
  /** Show add reaction button */
  showAddButton?: boolean
  /** Callback when reaction is added */
  onReactionAdd?: (emoji: string, messageId: string) => Promise<void>
  /** Callback when reaction is removed */
  onReactionRemove?: (emoji: string, messageId: string) => Promise<void>
  /** Read-only mode (no interactions) */
  readOnly?: boolean
}

// ============================================================================
// Animation Variants
// ============================================================================

const reactionVariants = {
  initial: { scale: 0, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0, opacity: 0 },
  hover: { scale: 1.1 },
  tap: { scale: 0.95 },
}

const burstVariants = {
  initial: { scale: 0.8, opacity: 0 },
  animate: {
    scale: [0.8, 1.2, 1],
    opacity: 1,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
  exit: { scale: 0, opacity: 0, transition: { duration: 0.15 } },
}

// ============================================================================
// Main Component
// ============================================================================

export function PlatformReactions({
  messageId,
  reactions,
  options = {},
  className,
  compact = false,
  showAddButton = true,
  onReactionAdd,
  onReactionRemove,
  readOnly = false,
}: PlatformReactionsProps) {
  const {
    config,
    canReact,
    reactionsEnabled,
    quickReactions,
    toggleReaction,
    hasUserReacted,
    getUserReactions,
    mode,
    animationSupport,
    features,
  } = useReactionMode({
    ...options,
    onReactionAdd,
    onReactionRemove,
  })

  const picker = useReactionPicker({
    onSelect: (emoji) => {
      if (!readOnly) {
        toggleReaction(emoji, messageId, reactions)
      }
    },
  })

  const userReactions = useMemo(() => getUserReactions(reactions), [getUserReactions, reactions])

  // Sort reactions based on config - must be before early return
  const sortedReactions = useMemo(() => {
    return [...reactions].sort((a, b) => b.count - a.count)
  }, [reactions])

  const handleReactionClick = useCallback(
    async (emoji: string) => {
      if (readOnly) return
      const totalCount = reactions.reduce((sum, r) => sum + r.count, 0)
      const check = canReact(emoji, userReactions, totalCount)
      if (check.allowed) {
        await toggleReaction(emoji, messageId, reactions)
      }
    },
    [readOnly, reactions, canReact, userReactions, toggleReaction, messageId]
  )

  // Don't render anything if no reactions and no add button
  if (reactions.length === 0 && (!showAddButton || !reactionsEnabled || readOnly)) {
    return null
  }

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-1',
        compact && 'gap-0.5',
        className
      )}
    >
      <AnimatePresence mode="popLayout">
        {sortedReactions.map((reaction) => (
          <ReactionPill
            key={reaction.emoji}
            reaction={reaction}
            config={config}
            compact={compact}
            animateOnAdd={animationSupport !== 'none'}
            onClick={() => handleReactionClick(reaction.emoji)}
            disabled={readOnly}
          />
        ))}
      </AnimatePresence>

      {/* Add Reaction Button */}
      {showAddButton && reactionsEnabled && !readOnly && (
        <ReactionPickerButton
          messageId={messageId}
          quickReactions={quickReactions}
          showFullPicker={config.emojiSet !== 'limited'}
          onSelect={(emoji) => handleReactionClick(emoji)}
          compact={compact}
          isOpen={picker.isOpen && picker.targetMessageId === messageId}
          onOpenChange={(open) => (open ? picker.open(messageId) : picker.close())}
        />
      )}
    </div>
  )
}

// ============================================================================
// Reaction Pill Component
// ============================================================================

interface ReactionPillProps {
  reaction: ReactionAggregate
  config: PlatformReactionConfig
  compact?: boolean
  animateOnAdd?: boolean
  onClick?: () => void
  disabled?: boolean
}

function ReactionPill({
  reaction,
  config,
  compact = false,
  animateOnAdd = true,
  onClick,
  disabled = false,
}: ReactionPillProps) {
  const [isHovering, setIsHovering] = useState(false)

  const pillClasses = cn(
    'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors',
    'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
    reaction.hasReacted
      ? 'border-primary/50 bg-primary/10 hover:bg-primary/20'
      : 'border-border bg-muted/50 hover:bg-muted',
    compact && 'px-1.5 py-0',
    disabled && 'cursor-default opacity-60'
  )

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip open={isHovering && reaction.users.length > 0 && config.showReactors}>
        <TooltipTrigger asChild>
          <motion.button
            variants={animateOnAdd ? burstVariants : reactionVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            whileHover={disabled ? undefined : 'hover'}
            whileTap={disabled ? undefined : 'tap'}
            onClick={disabled ? undefined : onClick}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            className={pillClasses}
            disabled={disabled}
            type="button"
            aria-label={getReactionAriaLabel(reaction)}
          >
            <ReactionEmoji
              emoji={reaction.emoji}
              isCustom={reaction.isCustom}
              customUrl={reaction.customEmojiUrl}
              isAnimated={reaction.isAnimated}
              compact={compact}
            />
            {config.showCount && (
              <span
                className={cn(
                  'font-medium tabular-nums',
                  reaction.hasReacted ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {reaction.count}
              </span>
            )}
          </motion.button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px]">
          <ReactionTooltip reaction={reaction} maxDisplay={config.maxReactorsDisplay} />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// ============================================================================
// Reaction Emoji Component
// ============================================================================

interface ReactionEmojiProps {
  emoji: string
  isCustom?: boolean
  customUrl?: string
  isAnimated?: boolean
  compact?: boolean
}

function ReactionEmoji({
  emoji,
  isCustom = false,
  customUrl,
  isAnimated = false,
  compact = false,
}: ReactionEmojiProps) {
  if (isCustom && customUrl) {
    return (
      <img
        src={customUrl}
        alt={emoji}
        className={cn('h-4 w-4 object-contain', compact && 'h-3 w-3')}
        loading="lazy"
      />
    )
  }

  return (
    <span className={cn('text-sm leading-none', compact && 'text-xs')}>
      {emoji}
    </span>
  )
}

// ============================================================================
// Reaction Tooltip Component
// ============================================================================

interface ReactionTooltipProps {
  reaction: ReactionAggregate
  maxDisplay?: number
}

function ReactionTooltip({ reaction, maxDisplay = 10 }: ReactionTooltipProps) {
  const displayUsers = reaction.users.slice(0, maxDisplay)
  const remaining = reaction.users.length - maxDisplay

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 font-medium">
        <span>{reaction.emoji}</span>
        <span className="text-muted-foreground">
          {reaction.count} {reaction.count === 1 ? 'reaction' : 'reactions'}
        </span>
      </div>
      <div className="text-xs text-muted-foreground">
        {displayUsers.map((user, i) => (
          <span key={user.id}>
            {user.name}
            {i < displayUsers.length - 1 && ', '}
          </span>
        ))}
        {remaining > 0 && (
          <span className="text-muted-foreground">
            {' '}and {remaining} more
          </span>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Reaction Picker Button Component
// ============================================================================

interface ReactionPickerButtonProps {
  messageId: string
  quickReactions: string[]
  showFullPicker?: boolean
  onSelect: (emoji: string) => void
  compact?: boolean
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

function ReactionPickerButton({
  messageId,
  quickReactions,
  showFullPicker = true,
  onSelect,
  compact = false,
  isOpen,
  onOpenChange,
}: ReactionPickerButtonProps) {
  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'h-6 w-6 rounded-full p-0 hover:bg-muted',
            compact && 'h-5 w-5'
          )}
          aria-label="Add reaction"
        >
          {showFullPicker ? (
            <Plus className={cn('h-3.5 w-3.5', compact && 'h-3 w-3')} />
          ) : (
            <Smile className={cn('h-3.5 w-3.5', compact && 'h-3 w-3')} />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        className="w-auto p-1"
        sideOffset={8}
      >
        <QuickReactionBar
          quickReactions={quickReactions}
          onSelect={(emoji) => {
            onSelect(emoji)
            onOpenChange(false)
          }}
          showMoreButton={showFullPicker}
          onMoreClick={() => {
            // Full emoji picker opens via the parent popover re-rendering with expanded view
            onOpenChange(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

// ============================================================================
// Quick Reaction Bar Component
// ============================================================================

interface QuickReactionBarProps {
  quickReactions: string[]
  onSelect: (emoji: string) => void
  showMoreButton?: boolean
  onMoreClick?: () => void
  className?: string
}

export function QuickReactionBar({
  quickReactions,
  onSelect,
  showMoreButton = true,
  onMoreClick,
  className,
}: QuickReactionBarProps) {
  return (
    <div className={cn('flex items-center gap-0.5', className)}>
      {quickReactions.map((emoji) => (
        <motion.button
          key={emoji}
          type="button"
          onClick={() => onSelect(emoji)}
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.9 }}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-md transition-colors',
            'hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring'
          )}
        >
          <span className="text-lg">{emoji}</span>
        </motion.button>
      ))}
      {showMoreButton && (
        <>
          <div className="mx-1 h-5 w-px bg-border" />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-md"
            onClick={onMoreClick}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  )
}

// ============================================================================
// Hover Reaction Bar Component (Slack/Discord style)
// ============================================================================

interface HoverReactionBarProps {
  messageId: string
  quickReactions: string[]
  onSelect: (emoji: string) => void
  visible?: boolean
  className?: string
}

export function HoverReactionBar({
  messageId,
  quickReactions,
  onSelect,
  visible = false,
  className,
}: HoverReactionBarProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 5, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 5, scale: 0.95 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className={cn(
            'absolute -top-10 right-0 z-10 flex items-center gap-0.5 rounded-lg border bg-popover p-1 shadow-lg',
            className
          )}
          data-message-id={messageId}
        >
          {quickReactions.slice(0, 5).map((emoji) => (
            <motion.button
              key={emoji}
              type="button"
              onClick={() => onSelect(emoji)}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              className="flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-accent"
            >
              <span className="text-base">{emoji}</span>
            </motion.button>
          ))}
          <div className="mx-0.5 h-4 w-px bg-border" />
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 rounded-md p-0"
          >
            <Smile className="h-4 w-4" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ============================================================================
// Helper Functions
// ============================================================================

function getReactionAriaLabel(reaction: ReactionAggregate): string {
  const userText = reaction.users
    .slice(0, 3)
    .map((u) => u.name)
    .join(', ')
  const remaining = reaction.users.length - 3
  const usersLabel = remaining > 0 ? `${userText} and ${remaining} more` : userText

  return `${reaction.emoji} reaction by ${usersLabel}. ${reaction.count} ${
    reaction.count === 1 ? 'reaction' : 'reactions'
  }. ${reaction.hasReacted ? 'You reacted.' : ''}`
}

// ============================================================================
// Exports
// ============================================================================

export default PlatformReactions
