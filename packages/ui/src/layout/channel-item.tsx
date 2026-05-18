/**
 * ChannelItem — ported from nchat/frontend/src/components/channel/channel-item.tsx
 * useChannelStore/useAuth replaced with ChannelItemAdapter interface.
 * Link+usePathname replaced with onClick+isActive prop.
 * lucide-react replaced with inline SVG icons.
 * framer-motion replaced with CSS transitions.
 *
 * @module layout/channel-item
 */

'use client'

import * as React from 'react'
import { cn } from '../lib/utils'
import type { Channel, ChannelType } from './types'

// ============================================================================
// Adapter
// ============================================================================

export interface ChannelItemAdapter {
  mutedChannels: Set<string>
  starredChannels: Set<string>
  isAdmin: boolean
  onToggleMute: (channelId: string) => void
  onToggleStar: (channelId: string) => void
  onOpenSettings?: (channelId: string) => void
}

// ============================================================================
// Types
// ============================================================================

export interface ChannelItemProps {
  channel: Channel
  adapter: ChannelItemAdapter
  isActive?: boolean
  isDragging?: boolean
  isDragEnabled?: boolean
  depth?: number
  onSelect?: (channel: Channel) => void
  onContextMenu?: (e: React.MouseEvent, channel: Channel) => void
  className?: string
}

// ============================================================================
// SVG Icons
// ============================================================================

const HashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="4" y1="9" x2="20" y2="9" />
    <line x1="4" y1="15" x2="20" y2="15" />
    <line x1="10" y1="3" x2="8" y2="21" />
    <line x1="16" y1="3" x2="14" y2="21" />
  </svg>
)

const LockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)

const VolumeXIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <line x1="23" y1="9" x2="17" y2="15" />
    <line x1="17" y1="9" x2="23" y2="15" />
  </svg>
)

const Volume2Icon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
  </svg>
)

const StarIcon = ({ filled }: { filled?: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
)

const GripIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="9" cy="12" r="1" /><circle cx="9" cy="5" r="1" /><circle cx="9" cy="19" r="1" />
    <circle cx="15" cy="12" r="1" /><circle cx="15" cy="5" r="1" /><circle cx="15" cy="19" r="1" />
  </svg>
)

const SettingsIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
)

const MoreVerticalIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" />
  </svg>
)

// ============================================================================
// Helper
// ============================================================================

function getChannelIcon(type: ChannelType, isMuted: boolean) {
  if (isMuted) return <span className="text-muted-foreground"><VolumeXIcon /></span>
  if (type === 'private') return <span className="text-muted-foreground"><LockIcon /></span>
  return <span className="text-muted-foreground"><HashIcon /></span>
}

// ============================================================================
// Component
// ============================================================================

export const ChannelItem = React.memo(
  function ChannelItem({
    channel,
    adapter,
    isActive = false,
    isDragging = false,
    isDragEnabled = false,
    depth = 0,
    onSelect,
    onContextMenu,
    className,
  }: ChannelItemProps) {
    const [menuOpen, setMenuOpen] = React.useState(false)

    const { mutedChannels, starredChannels, isAdmin, onToggleMute, onToggleStar, onOpenSettings } = adapter
    const isMuted = mutedChannels.has(channel.id)
    const isStarred = starredChannels.has(channel.id)

    const isDM = channel.type === 'direct' || channel.type === 'group'
    const dmInitial =
      channel.otherUserName?.charAt(0).toUpperCase() || channel.name.charAt(0).toUpperCase()

    const handleContextMenu = (e: React.MouseEvent) => {
      e.preventDefault()
      onContextMenu?.(e, channel)
    }

    const handleClick = (e: React.MouseEvent) => {
      e.preventDefault()
      onSelect?.(channel)
    }

    const handleMuteToggle = (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      onToggleMute(channel.id)
    }

    const handleStarToggle = (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      onToggleStar(channel.id)
    }

    return (
      <div
        className={cn('group relative flex items-center', isDragging && 'opacity-50', className)}
        style={{ paddingLeft: `${depth * 12}px` }}
        onContextMenu={handleContextMenu}
      >
        {/* Drag Handle */}
        {isDragEnabled && isAdmin && (
          <div className="cursor-grab p-1 opacity-0 transition-opacity group-hover:opacity-100">
            <GripIcon />
          </div>
        )}

        {/* Channel Button/Link */}
        <button
          type="button"
          onClick={handleClick}
          className={cn(
            'flex flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors text-left',
            'hover:text-accent-foreground hover:bg-accent',
            isActive && 'text-accent-foreground bg-accent font-medium',
            isMuted && 'opacity-60'
          )}
        >
          {/* Channel Icon or Avatar */}
          {isDM ? (
            <div className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-[10px] font-semibold">
              {channel.otherUserAvatar ? (
                <img src={channel.otherUserAvatar} alt={channel.otherUserName} className="h-full w-full object-cover" />
              ) : (
                dmInitial
              )}
            </div>
          ) : (
            getChannelIcon(channel.type, isMuted)
          )}

          {/* Channel Name */}
          <span className={cn('flex-1 truncate text-left', isMuted && 'text-muted-foreground')}>
            {isDM ? channel.otherUserName || channel.name : channel.name}
          </span>

          {/* Indicators */}
          <div className="flex items-center gap-1">
            {isStarred && (
              <span className="text-yellow-400">
                <StarIcon filled />
              </span>
            )}
            {isMuted && !isDM && (
              <span className="text-muted-foreground"><VolumeXIcon /></span>
            )}
            {channel.lastMessagePreview && !isActive && (
              <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                1
              </span>
            )}

            {/* Hover Actions */}
            <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                type="button"
                onClick={handleStarToggle}
                className="rounded p-0.5 transition-colors hover:bg-muted"
                title={isStarred ? 'Unstar channel' : 'Star channel'}
              >
                <span className={isStarred ? 'text-yellow-400' : 'text-muted-foreground'}>
                  <StarIcon filled={isStarred} />
                </span>
              </button>

              <button
                type="button"
                onClick={handleMuteToggle}
                className="rounded p-0.5 transition-colors hover:bg-muted"
                title={isMuted ? 'Unmute channel' : 'Mute channel'}
              >
                <span className="text-muted-foreground">
                  {isMuted ? <Volume2Icon /> : <VolumeXIcon />}
                </span>
              </button>

              {isAdmin && (
                <div className="relative">
                  <button
                    type="button"
                    className="rounded p-0.5 transition-colors hover:bg-muted"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setMenuOpen((o) => !o)
                    }}
                  >
                    <span className="text-muted-foreground"><MoreVerticalIcon /></span>
                  </button>

                  {menuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setMenuOpen(false)}
                      />
                      <div className="absolute right-0 z-50 mt-1 w-48 overflow-hidden rounded-md border bg-popover shadow-lg">
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleStarToggle(e)
                            setMenuOpen(false)
                          }}
                        >
                          <StarIcon filled={isStarred} />
                          {isStarred ? 'Unstar channel' : 'Star channel'}
                        </button>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleMuteToggle(e)
                            setMenuOpen(false)
                          }}
                        >
                          {isMuted ? <Volume2Icon /> : <VolumeXIcon />}
                          {isMuted ? 'Unmute channel' : 'Mute channel'}
                        </button>
                        <hr className="my-1 border-border" />
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                          onClick={(e) => {
                            e.stopPropagation()
                            onOpenSettings?.(channel.id)
                            setMenuOpen(false)
                          }}
                        >
                          <SettingsIcon />
                          Channel settings
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </button>
      </div>
    )
  },
  (prevProps, nextProps) =>
    prevProps.channel.id === nextProps.channel.id &&
    prevProps.channel.name === nextProps.channel.name &&
    prevProps.channel.lastMessagePreview === nextProps.channel.lastMessagePreview &&
    prevProps.isActive === nextProps.isActive &&
    prevProps.isDragging === nextProps.isDragging &&
    prevProps.depth === nextProps.depth &&
    prevProps.adapter === nextProps.adapter
)

ChannelItem.displayName = 'ChannelItem'
