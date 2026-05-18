/**
 * Channel category components — collapsible category groups in the sidebar.
 * Injectable ChannelCategoryAdapter replaces store/context deps.
 *
 * @module layout/channel-category
 */

'use client'

import * as React from 'react'
import { cn } from '../lib/utils'
import type { ChannelCategory as ChannelCategoryData, Channel, ChannelType } from './types'

// ============================================================================
// Adapter
// ============================================================================

export interface ChannelCategoryAdapter {
  /** Toggle collapsed state of a category */
  onToggleCollapse: (categoryId: string) => void
  /** Create a channel within the category */
  onCreateChannel?: (categoryId: string, type: ChannelType) => void
  /** Edit category name */
  onEditCategory?: (categoryId: string) => void
  /** Delete category */
  onDeleteCategory?: (categoryId: string) => void
  /** Whether the current user can manage categories */
  canManageCategories: boolean
}

// ============================================================================
// Props
// ============================================================================

export interface ChannelCategoryHeaderProps {
  category: ChannelCategoryData
  adapter: ChannelCategoryAdapter
  /** Channel count to display (only shown when collapsed) */
  channelCount?: number
  /** Whether any channel in the category has unread messages */
  hasUnread?: boolean
  className?: string
}

export interface ChannelCategoryProps {
  category: ChannelCategoryData
  adapter: ChannelCategoryAdapter
  /** Rendered channel items (already sorted/filtered) */
  children?: React.ReactNode
  /** Whether any channel in the category has unread messages */
  hasUnread?: boolean
  className?: string
}

// ============================================================================
// Inline icons
// ============================================================================

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={cn('h-3 w-3', className)}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 4l4 4-4 4" />
    </svg>
  )
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={cn('h-3.5 w-3.5', className)}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
    >
      <path d="M8 3v10M3 8h10" />
    </svg>
  )
}

function MoreHorizontalIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={cn('h-3.5 w-3.5', className)}
      fill="currentColor"
    >
      <circle cx="3" cy="8" r="1.5" />
      <circle cx="8" cy="8" r="1.5" />
      <circle cx="13" cy="8" r="1.5" />
    </svg>
  )
}

// ============================================================================
// Category Header
// ============================================================================

export const ChannelCategoryHeader = React.memo(function ChannelCategoryHeader({
  category,
  adapter,
  channelCount,
  hasUnread = false,
  className,
}: ChannelCategoryHeaderProps) {
  const [menuOpen, setMenuOpen] = React.useState(false)
  const menuRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!menuOpen) return
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  const showMenu = adapter.canManageCategories && (adapter.onEditCategory || adapter.onDeleteCategory)

  return (
    <div
      className={cn(
        'group flex h-7 items-center gap-1 px-2 py-0.5',
        className
      )}
    >
      <button
        type="button"
        onClick={() => adapter.onToggleCollapse(category.id)}
        className={cn(
          'flex min-w-0 flex-1 items-center gap-1',
          'text-left text-xs font-semibold uppercase tracking-wider',
          'text-muted-foreground transition-colors hover:text-foreground',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
        )}
        aria-expanded={!category.isCollapsed}
        aria-label={`${category.name} category, ${category.isCollapsed ? 'collapsed' : 'expanded'}`}
      >
        <ChevronRightIcon
          className={cn(
            'shrink-0 transition-transform duration-150',
            !category.isCollapsed && 'rotate-90'
          )}
        />
        <span className="truncate">{category.name}</span>
        {category.isCollapsed && channelCount !== undefined && channelCount > 0 && (
          <span className="shrink-0 text-muted-foreground/70">
            {channelCount}
          </span>
        )}
        {category.isCollapsed && hasUnread && (
          <span className="ml-auto shrink-0 h-1.5 w-1.5 rounded-full bg-primary" aria-label="has unread" />
        )}
      </button>

      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        {adapter.canManageCategories && adapter.onCreateChannel && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              adapter.onCreateChannel!(category.id, 'public')
            }}
            className={cn(
              'flex h-5 w-5 items-center justify-center rounded',
              'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
            )}
            aria-label={`Add channel to ${category.name}`}
          >
            <PlusIcon />
          </button>
        )}

        {showMenu && (
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setMenuOpen((v) => !v)
              }}
              className={cn(
                'flex h-5 w-5 items-center justify-center rounded',
                'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
              )}
              aria-label={`${category.name} options`}
              aria-expanded={menuOpen}
            >
              <MoreHorizontalIcon />
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setMenuOpen(false)}
                />
                <div
                  className={cn(
                    'absolute left-0 top-full z-50 mt-1',
                    'w-40 overflow-hidden rounded-md border bg-popover shadow-md',
                    'animate-in fade-in-0 zoom-in-95 duration-100'
                  )}
                  role="menu"
                >
                  {adapter.onEditCategory && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        adapter.onEditCategory!(category.id)
                        setMenuOpen(false)
                      }}
                      className={cn(
                        'flex w-full items-center px-3 py-1.5 text-left text-sm',
                        'hover:bg-accent hover:text-accent-foreground',
                        'focus-visible:outline-none'
                      )}
                    >
                      Edit Category
                    </button>
                  )}
                  {adapter.onDeleteCategory && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        adapter.onDeleteCategory!(category.id)
                        setMenuOpen(false)
                      }}
                      className={cn(
                        'flex w-full items-center px-3 py-1.5 text-left text-sm',
                        'text-destructive hover:bg-destructive/10',
                        'focus-visible:outline-none'
                      )}
                    >
                      Delete Category
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
})

// ============================================================================
// Channel Category (with collapsible children)
// ============================================================================

export const ChannelCategory = React.memo(function ChannelCategory({
  category,
  adapter,
  children,
  hasUnread = false,
  className,
}: ChannelCategoryProps) {
  const childCount = React.Children.count(children)

  return (
    <div className={cn('flex flex-col', className)}>
      <ChannelCategoryHeader
        category={category}
        adapter={adapter}
        channelCount={childCount}
        hasUnread={hasUnread}
      />
      {!category.isCollapsed && (
        <div className="flex flex-col" role="group" aria-label={category.name}>
          {children}
        </div>
      )}
    </div>
  )
})
