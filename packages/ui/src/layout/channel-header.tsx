/**
 * Channel header — top bar showing channel name, topic, member count,
 * and action buttons (search, threads, pins, members, settings).
 * Injectable ChannelHeaderAdapter replaces store/router deps.
 *
 * @module layout/channel-header
 */

'use client'

import * as React from 'react'
import { cn } from '../lib/utils'
import type { Channel } from './types'

// ============================================================================
// Adapter
// ============================================================================

export interface ChannelHeaderAdapter {
  /** Open the thread panel */
  onOpenThreads?: () => void
  /** Open the pinned messages panel */
  onOpenPins?: () => void
  /** Open the members list panel */
  onOpenMembers?: () => void
  /** Open channel settings */
  onOpenSettings?: () => void
  /** Trigger message search within this channel */
  onOpenSearch?: () => void
  /** Whether the current user is admin/owner of the channel */
  isAdmin: boolean
}

// ============================================================================
// Props
// ============================================================================

export interface ChannelHeaderProps {
  channel: Channel
  adapter: ChannelHeaderAdapter
  /** Additional content to render in the right side toolbar */
  toolbarExtra?: React.ReactNode
  className?: string
}

// ============================================================================
// Inline icons
// ============================================================================

function HashIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={cn('h-4 w-4', className)} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
      <path d="M6 2l-2 12M12 2l-2 12M2.5 6h11M1.5 10h11" />
    </svg>
  )
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={cn('h-4 w-4', className)} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="7" width="10" height="7" rx="1" />
      <path d="M5 7V5a3 3 0 0 1 6 0v2" />
    </svg>
  )
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={cn('h-4 w-4', className)} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5L14 14" />
    </svg>
  )
}

function MessageSquareIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={cn('h-4 w-4', className)} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H5l-3 3V3z" />
    </svg>
  )
}

function PinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={cn('h-4 w-4', className)} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 2.5L13.5 6.5M8 4l4 4M6 6l-2 2 2 2 2-2M5.5 10.5L2 14M10.5 5.5L8 8" />
    </svg>
  )
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={cn('h-4 w-4', className)} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5.5" cy="5" r="2" />
      <path d="M1 13c0-2.5 2-4 4.5-4" />
      <circle cx="11" cy="5" r="2" />
      <path d="M7.5 13c0-2.5 2-4 4.5-4" />
    </svg>
  )
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={cn('h-4 w-4', className)} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="2" />
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.22 3.22l1.42 1.42M11.36 11.36l1.42 1.42M3.22 12.78l1.42-1.42M11.36 4.64l1.42-1.42" />
    </svg>
  )
}

// ============================================================================
// Header action button
// ============================================================================

interface HeaderActionButtonProps {
  onClick: () => void
  label: string
  children: React.ReactNode
}

function HeaderActionButton({ onClick, label, children }: HeaderActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-md',
        'text-muted-foreground transition-colors',
        'hover:bg-accent hover:text-accent-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
      )}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  )
}

// ============================================================================
// Channel Header
// ============================================================================

export const ChannelHeader = React.memo(function ChannelHeader({
  channel,
  adapter,
  toolbarExtra,
  className,
}: ChannelHeaderProps) {
  const isPrivate = channel.type === 'private'
  const isDM = channel.type === 'direct' || channel.type === 'group'

  return (
    <header
      className={cn(
        'flex h-14 shrink-0 items-center gap-3 border-b px-4',
        'bg-background',
        className
      )}
    >
      {/* Channel identity */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="shrink-0 text-muted-foreground" aria-hidden>
          {isPrivate ? <LockIcon /> : !isDM ? <HashIcon /> : null}
        </span>

        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold leading-tight">
            {channel.name}
          </h1>
          {channel.topic && (
            <p className="truncate text-xs text-muted-foreground leading-tight mt-0.5">
              {channel.topic}
            </p>
          )}
        </div>

        {!isDM && typeof channel.memberCount === 'number' && channel.memberCount > 0 && (
          <div className="hidden shrink-0 items-center gap-1 text-xs text-muted-foreground sm:flex">
            <UsersIcon className="h-3 w-3" />
            <span>{channel.memberCount}</span>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex shrink-0 items-center gap-0.5">
        {adapter.onOpenSearch && (
          <HeaderActionButton onClick={adapter.onOpenSearch} label="Search in channel">
            <SearchIcon />
          </HeaderActionButton>
        )}
        {adapter.onOpenThreads && (
          <HeaderActionButton onClick={adapter.onOpenThreads} label="Threads">
            <MessageSquareIcon />
          </HeaderActionButton>
        )}
        {adapter.onOpenPins && (
          <HeaderActionButton onClick={adapter.onOpenPins} label="Pinned messages">
            <PinIcon />
          </HeaderActionButton>
        )}
        {adapter.onOpenMembers && !isDM && (
          <HeaderActionButton onClick={adapter.onOpenMembers} label="Members">
            <UsersIcon />
          </HeaderActionButton>
        )}
        {adapter.onOpenSettings && adapter.isAdmin && (
          <HeaderActionButton onClick={adapter.onOpenSettings} label="Channel settings">
            <SettingsIcon />
          </HeaderActionButton>
        )}
        {toolbarExtra}
      </div>
    </header>
  )
})
