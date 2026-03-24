'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Phone,
  Video,
  MoreVertical,
  Search,
  Pin,
  Bell,
  BellOff,
  Star,
  StarOff,
  Archive,
  Trash2,
  Settings,
  Users,
  Info,
} from 'lucide-react'
import type { DirectMessage } from '@/lib/dm/dm-types'
import {
  generateDMDisplayName,
  getDMAvatarUrls,
  getDMAvatarInitials,
  getOtherParticipants,
  getParticipantSummary,
} from '@/lib/dm'
import { useDMStore } from '@/stores/dm-store'

// ============================================================================
// Types
// ============================================================================

interface DMHeaderProps {
  dm: DirectMessage
  currentUserId: string
  onSearchClick?: () => void
  onSettingsClick?: () => void
  onInfoClick?: () => void
  className?: string
}

// ============================================================================
// Component
// ============================================================================

export function DMHeader({
  dm,
  currentUserId,
  onSearchClick,
  onSettingsClick,
  onInfoClick,
  className,
}: DMHeaderProps) {
  const { mutedDMs, starredDMs, toggleMuteDM, toggleStarDM, archiveDM, removeDM } = useDMStore()

  const isMuted = mutedDMs.has(dm.id)
  const isStarred = starredDMs.has(dm.id)

  const displayName = generateDMDisplayName(dm.participants, currentUserId, dm.name)
  const avatarUrls = getDMAvatarUrls(dm, currentUserId)
  const initials = getDMAvatarInitials(dm, currentUserId)
  const otherParticipants = getOtherParticipants(dm, currentUserId)

  // Status text
  let statusText = ''
  if (dm.type === 'direct' && otherParticipants.length > 0) {
    const other = otherParticipants[0]
    if (other.user.status === 'online') {
      statusText = 'Online'
    } else if (other.user.lastSeenAt) {
      const lastSeen = new Date(other.user.lastSeenAt)
      statusText = `Last seen ${formatLastSeen(lastSeen)}`
    } else {
      statusText = 'Offline'
    }
  } else if (dm.type === 'group') {
    statusText = getParticipantSummary(dm.participants, currentUserId)
  }

  return (
    <div
      className={cn(
        'flex items-center justify-between border-b bg-background px-4 py-3',
        className
      )}
    >
      {/* Left: Avatar and Info */}
      <div className="flex min-w-0 items-center gap-3">
        {/* Avatar */}
        <button
          onClick={onInfoClick}
          className="flex-shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <div className="relative">
            <Avatar className="h-10 w-10">
              <AvatarImage src={avatarUrls[0]} alt={displayName} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            {dm.type === 'direct' && otherParticipants[0]?.user.status === 'online' && (
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-green-500" />
            )}
          </div>
        </button>

        {/* Name and Status */}
        <div className="min-w-0">
          <button
            onClick={onInfoClick}
            className="flex items-center gap-1.5 hover:underline focus:outline-none"
          >
            <h1 className="truncate font-semibold">{displayName}</h1>
            {isStarred && (
              <Star className="h-3.5 w-3.5 flex-shrink-0 fill-yellow-500 text-yellow-500" />
            )}
          </button>
          <p className="truncate text-xs text-muted-foreground">{statusText}</p>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        <TooltipProvider delayDuration={300}>
          {/* Voice Call (disabled for now) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9" disabled>
                <Phone className="h-4 w-4" />
                <span className="sr-only">Voice call</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Voice call (requires LiveKit plugin)</TooltipContent>
          </Tooltip>

          {/* Video Call (disabled for now) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9" disabled>
                <Video className="h-4 w-4" />
                <span className="sr-only">Video call</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Video call (requires LiveKit plugin)</TooltipContent>
          </Tooltip>

          {/* Search */}
          {onSearchClick && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onSearchClick}>
                  <Search className="h-4 w-4" />
                  <span className="sr-only">Search messages</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Search messages</TooltipContent>
            </Tooltip>
          )}
        </TooltipProvider>

        {/* More Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">More actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {dm.type === 'group' && (
              <>
                <DropdownMenuItem onClick={onInfoClick}>
                  <Users className="mr-2 h-4 w-4" />
                  View members
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onSettingsClick}>
                  <Settings className="mr-2 h-4 w-4" />
                  Group settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}

            <DropdownMenuItem onClick={onInfoClick}>
              <Info className="mr-2 h-4 w-4" />
              View info
            </DropdownMenuItem>

            <DropdownMenuItem>
              <Pin className="mr-2 h-4 w-4" />
              Pinned messages
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={() => toggleStarDM(dm.id)}>
              {isStarred ? (
                <>
                  <StarOff className="mr-2 h-4 w-4" />
                  Remove from starred
                </>
              ) : (
                <>
                  <Star className="mr-2 h-4 w-4" />
                  Star conversation
                </>
              )}
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => toggleMuteDM(dm.id)}>
              {isMuted ? (
                <>
                  <Bell className="mr-2 h-4 w-4" />
                  Unmute notifications
                </>
              ) : (
                <>
                  <BellOff className="mr-2 h-4 w-4" />
                  Mute notifications
                </>
              )}
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={() => archiveDM(dm.id)}>
              <Archive className="mr-2 h-4 w-4" />
              Archive conversation
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => removeDM(dm.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete conversation
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

// ============================================================================
// Helpers
// ============================================================================

function formatLastSeen(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  return date.toLocaleDateString()
}

DMHeader.displayName = 'DMHeader'
