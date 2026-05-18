/**
 * Direct message list — renders DM and group DM channel items in the sidebar.
 * Injectable DirectMessageListAdapter replaces store/context deps.
 *
 * @module layout/direct-message-list
 */

'use client'

import * as React from 'react'
import { cn } from '../lib/utils'
import type { Channel } from './types'

// ============================================================================
// Adapter
// ============================================================================

export interface DirectMessageListAdapter {
  /** Create a new DM */
  onNewDM?: () => void
  /** Create a new group DM */
  onNewGroupDM?: () => void
  /** Close (hide) an existing DM */
  onClose?: (channelId: string) => void
}

// ============================================================================
// Types
// ============================================================================

export interface DirectMessageItemProps {
  channel: Channel
  adapter: DirectMessageListAdapter
  isActive?: boolean
  hasUnread?: boolean
  unreadCount?: number
  onSelect?: (channel: Channel) => void
  className?: string
}

export interface DirectMessageListProps {
  channels: Channel[]
  adapter: DirectMessageListAdapter
  activeChannelId?: string
  unreadMap?: Record<string, number>
  onSelect?: (channel: Channel) => void
  isCollapsed?: boolean
  className?: string
}

// ============================================================================
// Inline icons
// ============================================================================

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={cn('h-3.5 w-3.5', className)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M8 3v10M3 8h10" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={cn('h-3 w-3', className)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  )
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={cn('h-3.5 w-3.5', className)} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5.5" cy="5" r="2" />
      <path d="M1 13c0-2.5 2-4 4.5-4" />
      <circle cx="11" cy="5" r="2" />
      <path d="M7.5 13c0-2.5 2-4 4.5-4" />
    </svg>
  )
}

// ============================================================================
// Status dot
// ============================================================================

type OnlineStatus = 'online' | 'away' | 'busy' | 'offline'

function StatusDot({ status, className }: { status?: OnlineStatus; className?: string }) {
  const color =
    status === 'online' ? 'bg-green-500'
      : status === 'away' ? 'bg-yellow-500'
        : status === 'busy' ? 'bg-red-500'
          : 'bg-muted-foreground/40'

  return (
    <span
      className={cn(
        'absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background',
        color,
        className
      )}
      aria-hidden
    />
  )
}

// ============================================================================
// DM avatar
// ============================================================================

function DmAvatar({
  name,
  avatarUrl,
  isGroup,
  status,
}: {
  name: string
  avatarUrl?: string
  isGroup?: boolean
  status?: OnlineStatus
}) {
  if (isGroup) {
    return (
      <span className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <UsersIcon />
      </span>
    )
  }

  return (
    <span className="relative flex h-7 w-7 shrink-0">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name}
          className="h-7 w-7 rounded-full object-cover"
        />
      ) : (
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-medium uppercase text-muted-foreground">
          {(name || '?').charAt(0)}
        </span>
      )}
      <StatusDot status={status} />
    </span>
  )
}

// ============================================================================
// Direct Message Item
// ============================================================================

export const DirectMessageItem = React.memo(function DirectMessageItem({
  channel,
  adapter,
  isActive = false,
  hasUnread = false,
  unreadCount = 0,
  onSelect,
  className,
}: DirectMessageItemProps) {
  const isGroup = channel.type === 'group'
  const displayName = channel.otherUserName ?? channel.name
  const avatarUrl = channel.otherUserAvatar

  return (
    <div
      className={cn(
        'group relative flex h-8 items-center gap-2 rounded-md px-2',
        'transition-colors duration-75',
        isActive
          ? 'bg-accent text-accent-foreground'
          : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground',
        hasUnread && !isActive && 'text-foreground font-medium',
        className
      )}
    >
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-2 focus-visible:outline-none"
        onClick={() => onSelect?.(channel)}
        aria-current={isActive ? 'page' : undefined}
      >
        <DmAvatar
          name={displayName}
          avatarUrl={avatarUrl}
          isGroup={isGroup}
        />
        <span className="min-w-0 flex-1 truncate text-sm">
          {displayName}
        </span>
      </button>

      {/* Unread badge */}
      {unreadCount > 0 && (
        <span
          className={cn(
            'flex h-4.5 min-w-4.5 shrink-0 items-center justify-center rounded-full px-1',
            'bg-primary text-primary-foreground text-xs font-semibold',
            'group-hover:hidden'
          )}
          aria-label={`${unreadCount} unread`}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}

      {/* Close button (shows on hover instead of unread count) */}
      {adapter.onClose && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            adapter.onClose!(channel.id)
          }}
          className={cn(
            'hidden h-5 w-5 shrink-0 items-center justify-center rounded',
            'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            'group-hover:flex',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
          )}
          aria-label={`Close conversation with ${displayName}`}
        >
          <XIcon />
        </button>
      )}
    </div>
  )
})

// ============================================================================
// Direct Message List
// ============================================================================

export const DirectMessageList = React.memo(function DirectMessageList({
  channels,
  adapter,
  activeChannelId,
  unreadMap = {},
  onSelect,
  isCollapsed = false,
  className,
}: DirectMessageListProps) {
  return (
    <div className={cn('flex flex-col', className)}>
      {/* Section header */}
      <div className="flex h-7 items-center justify-between px-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {!isCollapsed ? 'Direct Messages' : ''}
        </span>
        <div className="flex items-center gap-0.5">
          {adapter.onNewDM && (
            <button
              type="button"
              onClick={adapter.onNewDM}
              className={cn(
                'flex h-5 w-5 items-center justify-center rounded',
                'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
              )}
              aria-label="New direct message"
            >
              <PlusIcon />
            </button>
          )}
        </div>
      </div>

      {/* DM channel items */}
      {!isCollapsed && (
        <div className="flex flex-col gap-0.5 px-2">
          {channels.length === 0 ? (
            <p className="px-2 py-3 text-center text-xs text-muted-foreground">
              No direct messages yet.
            </p>
          ) : (
            channels.map((channel) => {
              const unread = unreadMap[channel.id] ?? 0
              return (
                <DirectMessageItem
                  key={channel.id}
                  channel={channel}
                  adapter={adapter}
                  isActive={channel.id === activeChannelId}
                  hasUnread={unread > 0}
                  unreadCount={unread}
                  onSelect={onSelect}
                />
              )
            })
          )}
        </div>
      )}
    </div>
  )
})
