'use client'

import * as React from 'react'
import {
  Hash,
  Lock,
  Users,
  Search,
  Pin,
  Settings,
  Phone,
  Video,
  Star,
  StarOff,
  Bell,
  BellOff,
  MoreHorizontal,
  ChevronDown,
  Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useChannelStore, selectActiveChannel, type Channel } from '@/stores/channel-store'
import { useUIStore } from '@/stores/ui-store'
import { useAuth } from '@/contexts/auth-context'

// ============================================================================
// Types
// ============================================================================

interface ChannelHeaderProps {
  className?: string
  onSearchClick?: () => void
  onPinnedClick?: () => void
  onMembersClick?: () => void
  onSettingsClick?: () => void
  onInfoClick?: () => void
}

// ============================================================================
// Helper Components
// ============================================================================

function ChannelIcon({ channel }: { channel: Channel }) {
  const isDM = channel.type === 'direct' || channel.type === 'group'

  if (isDM) {
    return (
      <Avatar className="h-6 w-6">
        <AvatarImage src={channel.otherUserAvatar} alt={channel.otherUserName} />
        <AvatarFallback className="text-xs">
          {channel.otherUserName?.charAt(0).toUpperCase() || channel.name.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
    )
  }

  return channel.type === 'private' ? (
    <Lock className="h-5 w-5 text-muted-foreground" />
  ) : (
    <Hash className="h-5 w-5 text-muted-foreground" />
  )
}

// ============================================================================
// Component
// ============================================================================

export function ChannelHeader({
  className,
  onSearchClick,
  onPinnedClick,
  onMembersClick,
  onSettingsClick,
  onInfoClick,
}: ChannelHeaderProps) {
  const { user } = useAuth()
  const isAdmin = user?.role === 'owner' || user?.role === 'admin'

  // Store state
  const channel = useChannelStore(selectActiveChannel)
  const { starredChannels, mutedChannels, toggleStarChannel, toggleMuteChannel } = useChannelStore()
  const { toggleMembersPanel, membersPanelOpen, openModal } = useUIStore()

  if (!channel) {
    return (
      <div className={cn('flex h-14 items-center border-b px-4', className)}>
        <span className="text-muted-foreground">Select a channel</span>
      </div>
    )
  }

  const isStarred = starredChannels.has(channel.id)
  const isMuted = mutedChannels.has(channel.id)
  const isDM = channel.type === 'direct' || channel.type === 'group'

  const handleStarToggle = () => {
    toggleStarChannel(channel.id)
  }

  const handleMuteToggle = () => {
    toggleMuteChannel(channel.id)
  }

  const handleMembersClick = () => {
    if (onMembersClick) {
      onMembersClick()
    } else {
      toggleMembersPanel()
    }
  }

  const handleSettingsClick = () => {
    if (onSettingsClick) {
      onSettingsClick()
    } else {
      openModal('channel-settings', { channelId: channel.id })
    }
  }

  const handleInfoClick = () => {
    if (onInfoClick) {
      onInfoClick()
    } else {
      toggleMembersPanel()
    }
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          'flex h-14 items-center justify-between border-b bg-background px-4',
          className
        )}
      >
        {/* Left Section - Channel Info */}
        <div className="flex min-w-0 items-center gap-2">
          <ChannelIcon channel={channel} />

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="truncate font-semibold">
                {isDM ? channel.otherUserName || channel.name : channel.name}
              </h1>
              {isStarred && (
                <Star className="h-4 w-4 flex-shrink-0 fill-yellow-500 text-yellow-500" />
              )}
              {isMuted && <BellOff className="h-4 w-4 flex-shrink-0 text-muted-foreground" />}
            </div>

            {/* Topic/Description */}
            {channel.topic && (
              <button
                className="max-w-md truncate text-left text-xs text-muted-foreground transition-colors hover:text-foreground"
                onClick={handleInfoClick}
              >
                {channel.topic}
              </button>
            )}
          </div>

          {/* Channel Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="ml-1 h-6 w-6">
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem onClick={handleInfoClick}>
                <Info className="mr-2 h-4 w-4" />
                View channel details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleStarToggle}>
                {isStarred ? (
                  <>
                    <StarOff className="mr-2 h-4 w-4" />
                    Remove from starred
                  </>
                ) : (
                  <>
                    <Star className="mr-2 h-4 w-4" />
                    Add to starred
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleMuteToggle}>
                {isMuted ? (
                  <>
                    <Bell className="mr-2 h-4 w-4" />
                    Unmute channel
                  </>
                ) : (
                  <>
                    <BellOff className="mr-2 h-4 w-4" />
                    Mute channel
                  </>
                )}
              </DropdownMenuItem>
              {isAdmin && !isDM && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSettingsClick}>
                    <Settings className="mr-2 h-4 w-4" />
                    Edit channel
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Right Section - Actions */}
        <div className="flex items-center gap-1">
          {/* Member Count */}
          {!isDM && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'gap-1.5 text-muted-foreground hover:text-foreground',
                    membersPanelOpen && 'text-accent-foreground bg-accent'
                  )}
                  onClick={handleMembersClick}
                >
                  <Users className="h-4 w-4" />
                  <span className="text-sm">{channel.memberCount}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>View members</p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Search in Channel */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onSearchClick}>
                <Search className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Search in channel</p>
            </TooltipContent>
          </Tooltip>

          {/* Pinned Messages */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onPinnedClick}>
                <Pin className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Pinned messages</p>
            </TooltipContent>
          </Tooltip>

          {/* Video Call (placeholder) */}
          {isDM && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                    <Phone className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Start call (requires LiveKit plugin)</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                    <Video className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Start video call (requires LiveKit plugin)</p>
                </TooltipContent>
              </Tooltip>
            </>
          )}

          {/* More Options */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleInfoClick}>
                <Info className="mr-2 h-4 w-4" />
                Channel details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleMembersClick}>
                <Users className="mr-2 h-4 w-4" />
                View members
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleStarToggle}>
                {isStarred ? (
                  <>
                    <StarOff className="mr-2 h-4 w-4" />
                    Remove from starred
                  </>
                ) : (
                  <>
                    <Star className="mr-2 h-4 w-4" />
                    Add to starred
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleMuteToggle}>
                {isMuted ? (
                  <>
                    <Bell className="mr-2 h-4 w-4" />
                    Unmute channel
                  </>
                ) : (
                  <>
                    <BellOff className="mr-2 h-4 w-4" />
                    Mute channel
                  </>
                )}
              </DropdownMenuItem>
              {isAdmin && !isDM && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSettingsClick}>
                    <Settings className="mr-2 h-4 w-4" />
                    Channel settings
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </TooltipProvider>
  )
}

ChannelHeader.displayName = 'ChannelHeader'
