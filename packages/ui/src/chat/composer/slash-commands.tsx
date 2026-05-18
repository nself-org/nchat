/**
 * Slash command menu — ported from nchat/frontend/src/components/commands/
 * Hook dependencies replaced with SlashCommandsAdapter interface.
 * framer-motion replaced with CSS transitions.
 *
 * @module chat/composer/slash-commands
 */

'use client'

import * as React from 'react'
import { cn } from '../../lib/utils'
import type { SlashCommand } from './types'

// ============================================================================
// Adapter
// ============================================================================

export interface SlashCommandsAdapter {
  /** Available slash commands (filtered by query if provided) */
  commands: SlashCommand[]
  /** Called when a command is selected */
  onSelect: (command: SlashCommand) => void
  /** Called when the menu should close */
  onDismiss: () => void
}

// ============================================================================
// Types
// ============================================================================

export interface SlashCommandMenuProps {
  /** Adapter for command data and callbacks */
  adapter: SlashCommandsAdapter
  /** Current search query (the text after '/') */
  query: string
  /** Position hint (pixels from editor top-left) */
  position?: { top: number; left: number }
  /** Whether the menu is visible */
  visible?: boolean
  /** Additional class name */
  className?: string
}

export interface CommandItemProps {
  command: SlashCommand
  isActive?: boolean
  onClick: () => void
}

export interface CommandCategoryHeaderProps {
  label: string
}

// ============================================================================
// Category Header
// ============================================================================

export function CommandCategoryHeader({ label }: CommandCategoryHeaderProps) {
  return (
    <div className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {label}
    </div>
  )
}

// ============================================================================
// Command Item
// ============================================================================

export function CommandItem({ command, isActive = false, onClick }: CommandItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-start gap-2.5 px-3 py-2 text-left',
        'transition-colors duration-75',
        'focus-visible:outline-none',
        isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
      )}
    >
      {/* Icon */}
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-base">
        {command.icon || '/'}
      </span>

      {/* Content */}
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className="font-semibold text-foreground">/{command.name}</span>
          {command.usage && (
            <span className="truncate text-xs text-muted-foreground">{command.usage}</span>
          )}
          {command.pro && (
            <span className="ml-auto shrink-0 rounded bg-primary/10 px-1 py-0.5 text-[10px] font-semibold uppercase text-primary">
              PRO
            </span>
          )}
        </span>
        <span className="block truncate text-xs text-muted-foreground">{command.description}</span>
      </span>
    </button>
  )
}

// ============================================================================
// Slash Command Menu
// ============================================================================

export function SlashCommandMenu({
  adapter,
  query,
  position,
  visible = true,
  className,
}: SlashCommandMenuProps) {
  const [activeIndex, setActiveIndex] = React.useState(0)

  const filtered = React.useMemo(() => {
    const q = query.toLowerCase()
    if (!q) return adapter.commands.slice(0, 10)
    return adapter.commands
      .filter(
        (c) =>
          c.name.toLowerCase().startsWith(q) ||
          c.description.toLowerCase().includes(q) ||
          (c.category && c.category.toLowerCase().includes(q))
      )
      .slice(0, 10)
  }, [query, adapter.commands])

  // Group by category
  const grouped = React.useMemo(() => {
    const map = new Map<string, SlashCommand[]>()
    for (const cmd of filtered) {
      const cat = cmd.category || 'Commands'
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(cmd)
    }
    return map
  }, [filtered])

  React.useEffect(() => {
    setActiveIndex(0)
  }, [filtered.length])

  React.useEffect(() => {
    if (!visible) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        const selected = filtered[activeIndex]
        if (selected) {
          e.preventDefault()
          adapter.onSelect(selected)
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        adapter.onDismiss()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [visible, filtered, activeIndex, adapter])

  if (!visible || filtered.length === 0) return null

  const style: React.CSSProperties = position
    ? { position: 'absolute', top: position.top, left: position.left, zIndex: 50 }
    : {}

  let globalIdx = 0

  return (
    <div
      style={style}
      className={cn(
        'w-72 overflow-hidden rounded-lg border bg-popover shadow-lg',
        'transition-all duration-100',
        className
      )}
      role="listbox"
      aria-label="Slash commands"
    >
      <div className="py-1">
        {Array.from(grouped.entries()).map(([category, commands]) => (
          <React.Fragment key={category}>
            {grouped.size > 1 && <CommandCategoryHeader label={category} />}
            {commands.map((cmd) => {
              const idx = globalIdx++
              return (
                <CommandItem
                  key={cmd.id}
                  command={cmd}
                  isActive={idx === activeIndex}
                  onClick={() => adapter.onSelect(cmd)}
                />
              )
            })}
          </React.Fragment>
        ))}
      </div>
      <div className="border-t px-3 py-1.5 text-xs text-muted-foreground">
        <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">↑↓</kbd> navigate
        {' · '}
        <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">↵</kbd> select
        {' · '}
        <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">Esc</kbd> dismiss
      </div>
    </div>
  )
}

export default SlashCommandMenu
