/**
 * Sidebar — main navigation sidebar containing workspace header,
 * channel list, DM list, and user footer.
 * Injectable SidebarAdapter replaces store/context deps.
 *
 * @module layout/sidebar
 */

'use client'

import * as React from 'react'
import { cn } from '../lib/utils'
import type { Channel, ChannelCategory, ChannelType } from './types'
import type { LayoutUser } from './types'
import { ChannelList } from './channel-list'
import type { ChannelListAdapter } from './channel-list'
import { DirectMessageList } from './direct-message-list'
import type { DirectMessageListAdapter } from './direct-message-list'

// ============================================================================
// Adapter
// ============================================================================

export interface SidebarAdapter extends ChannelListAdapter, DirectMessageListAdapter {
  /** Current user info */
  currentUser: LayoutUser
  /** Workspace / server name */
  workspaceName: string
  /** Workspace icon URL */
  workspaceIconUrl?: string
  /** Open workspace settings */
  onOpenWorkspaceSettings?: () => void
  /** Open user profile / preferences */
  onOpenUserProfile?: () => void
  /** Sign out */
  onSignOut?: () => void
  /** Whether to show the DM section */
  showDirectMessages?: boolean
}

// ============================================================================
// Props
// ============================================================================

export interface SidebarProps {
  channels: Channel[]
  dmChannels: Channel[]
  categories: ChannelCategory[]
  adapter: SidebarAdapter
  activeChannelId?: string
  unreadMap?: Record<string, number>
  onSelect?: (channel: Channel) => void
  isLoading?: boolean
  /** Width in pixels — controlled externally */
  width?: number
  className?: string
}

// ============================================================================
// Inline icons
// ============================================================================

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={cn('h-3.5 w-3.5', className)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6l4 4 4-4" />
    </svg>
  )
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={cn('h-4 w-4', className)} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="5" r="3" />
      <path d="M2 14c0-3 2.7-5 6-5s6 2 6 5" />
    </svg>
  )
}

// ============================================================================
// Workspace header
// ============================================================================

function WorkspaceHeader({
  workspaceName,
  workspaceIconUrl,
  onOpenSettings,
}: {
  workspaceName: string
  workspaceIconUrl?: string
  onOpenSettings?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onOpenSettings}
      className={cn(
        'flex h-14 w-full shrink-0 items-center gap-2.5 border-b px-4',
        'text-left transition-colors',
        onOpenSettings
          ? 'hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          : 'cursor-default'
      )}
      disabled={!onOpenSettings}
      aria-label={`${workspaceName} workspace settings`}
    >
      {workspaceIconUrl ? (
        <img
          src={workspaceIconUrl}
          alt={workspaceName}
          className="h-8 w-8 rounded-lg object-cover shrink-0"
        />
      ) : (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold uppercase">
          {workspaceName.charAt(0)}
        </span>
      )}
      <span className="min-w-0 flex-1 truncate text-sm font-semibold">
        {workspaceName}
      </span>
      {onOpenSettings && (
        <ChevronDownIcon className="shrink-0 text-muted-foreground" />
      )}
    </button>
  )
}

// ============================================================================
// User footer
// ============================================================================

function UserFooter({
  user,
  onOpenProfile,
  onSignOut,
}: {
  user: LayoutUser
  onOpenProfile?: () => void
  onSignOut?: () => void
}) {
  const [menuOpen, setMenuOpen] = React.useState(false)
  const menuRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const displayName = user.displayName ?? user.username ?? 'User'
  const initials = displayName.charAt(0).toUpperCase()

  return (
    <div
      ref={menuRef}
      className="relative flex h-14 shrink-0 items-center gap-2 border-t px-3"
    >
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        className={cn(
          'flex min-w-0 flex-1 items-center gap-2',
          'rounded-md p-1 text-left transition-colors',
          'hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
        )}
        aria-label="User menu"
        aria-expanded={menuOpen}
      >
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={displayName}
            className="h-9 w-9 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium uppercase text-muted-foreground">
            {initials}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{displayName}</p>
          {user.username && user.username !== displayName && (
            <p className="truncate text-xs text-muted-foreground">@{user.username}</p>
          )}
        </div>
      </button>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          <div
            className={cn(
              'absolute bottom-full left-0 z-50 mb-1 w-48',
              'overflow-hidden rounded-md border bg-popover shadow-md',
              'animate-in fade-in-0 zoom-in-95 duration-100'
            )}
            role="menu"
          >
            {onOpenProfile && (
              <button
                type="button"
                role="menuitem"
                onClick={() => { onOpenProfile(); setMenuOpen(false) }}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-left text-sm',
                  'hover:bg-accent hover:text-accent-foreground focus-visible:outline-none'
                )}
              >
                <UserIcon className="h-4 w-4" />
                Profile &amp; Preferences
              </button>
            )}
            {onSignOut && (
              <>
                <div className="my-1 border-t" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => { onSignOut(); setMenuOpen(false) }}
                  className={cn(
                    'flex w-full items-center px-3 py-2 text-left text-sm',
                    'text-destructive hover:bg-destructive/10 focus-visible:outline-none'
                  )}
                >
                  Sign out
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ============================================================================
// Sidebar
// ============================================================================

export const Sidebar = React.memo(function Sidebar({
  channels,
  dmChannels,
  categories,
  adapter,
  activeChannelId,
  unreadMap = {},
  onSelect,
  isLoading = false,
  width,
  className,
}: SidebarProps) {
  const showDMs = adapter.showDirectMessages !== false

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r bg-muted/20',
        className
      )}
      style={width !== undefined ? { width } : undefined}
      aria-label="Sidebar navigation"
    >
      {/* Workspace header */}
      <WorkspaceHeader
        workspaceName={adapter.workspaceName}
        workspaceIconUrl={adapter.workspaceIconUrl}
        onOpenSettings={adapter.onOpenWorkspaceSettings}
      />

      {/* Scrollable nav */}
      <nav className="flex flex-1 flex-col gap-3 overflow-y-auto py-3 scrollbar-thin">
        <ChannelList
          channels={channels.filter((ch) => ch.type !== 'direct' && ch.type !== 'group')}
          categories={categories}
          adapter={adapter}
          activeChannelId={activeChannelId}
          unreadMap={unreadMap}
          onSelect={onSelect}
          isLoading={isLoading}
        />

        {showDMs && dmChannels.length > 0 && (
          <DirectMessageList
            channels={dmChannels}
            adapter={adapter}
            activeChannelId={activeChannelId}
            unreadMap={unreadMap}
            onSelect={onSelect}
          />
        )}
      </nav>

      {/* User footer */}
      <UserFooter
        user={adapter.currentUser}
        onOpenProfile={adapter.onOpenUserProfile}
        onSignOut={adapter.onSignOut}
      />
    </aside>
  )
})
