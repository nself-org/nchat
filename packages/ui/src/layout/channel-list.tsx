/**
 * Channel list — renders channel categories with their items in the sidebar.
 * Injectable ChannelListAdapter replaces store/context deps.
 *
 * @module layout/channel-list
 */

'use client'

import * as React from 'react'
import { cn } from '../lib/utils'
import type { Channel, ChannelCategory, SortOrder, ChannelType } from './types'
import { ChannelCategory as ChannelCategoryComponent } from './channel-category'
import type { ChannelCategoryAdapter } from './channel-category'
import type { ChannelItemAdapter } from './channel-item'
import { ChannelItem } from './channel-item'
import { ChannelItemSkeleton } from './channel-skeleton'

// ============================================================================
// Adapter
// ============================================================================

export interface ChannelListAdapter
  extends Omit<ChannelCategoryAdapter, 'onCreateChannel'>,
    ChannelItemAdapter {
  /** Sort order for channels within each category */
  sortOrder?: SortOrder
  /** Create a channel in a category (categoryId, type) */
  onCreateChannel?: (categoryId: string, type: ChannelType) => void
  /** Create a top-level channel (no category) */
  onCreateUncategorizedChannel?: (type: ChannelType) => void
}

// ============================================================================
// Props
// ============================================================================

export interface ChannelListProps {
  /** Flat list of all visible channels */
  channels: Channel[]
  /** Ordered category list (channelIds determines per-category membership) */
  categories: ChannelCategory[]
  adapter: ChannelListAdapter
  activeChannelId?: string
  /** Map of channel ID → unread count */
  unreadMap?: Record<string, number>
  onSelect?: (channel: Channel) => void
  isLoading?: boolean
  className?: string
}

// ============================================================================
// Helpers
// ============================================================================

function sortChannels(channels: Channel[], order: SortOrder): Channel[] {
  if (order === 'alphabetical') {
    return [...channels].sort((a, b) => a.name.localeCompare(b.name))
  }
  if (order === 'recent') {
    return [...channels].sort((a, b) => {
      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0
      return bTime - aTime
    })
  }
  // 'manual' — preserve insertion order
  return channels
}

// ============================================================================
// Channel List
// ============================================================================

export const ChannelList = React.memo(function ChannelList({
  channels,
  categories,
  adapter,
  activeChannelId,
  unreadMap = {},
  onSelect,
  isLoading = false,
  className,
}: ChannelListProps) {
  const sortOrder = adapter.sortOrder ?? 'manual'

  // Build a lookup for quick access
  const channelById = React.useMemo<Map<string, Channel>>(() => {
    const map = new Map<string, Channel>()
    for (const ch of channels) {
      map.set(ch.id, ch)
    }
    return map
  }, [channels])

  // Channels that belong to at least one category
  const categorizedChannelIds = React.useMemo<Set<string>>(() => {
    const ids = new Set<string>()
    for (const cat of categories) {
      for (const id of cat.channelIds) {
        ids.add(id)
      }
    }
    return ids
  }, [categories])

  // Uncategorized channels (public/private only — DMs are handled separately)
  const uncategorized = React.useMemo(() => {
    return sortChannels(
      channels.filter(
        (ch) =>
          !categorizedChannelIds.has(ch.id) &&
          ch.type !== 'direct' &&
          ch.type !== 'group'
      ),
      sortOrder
    )
  }, [channels, categorizedChannelIds, sortOrder])

  if (isLoading) {
    return <ChannelItemSkeleton count={8} className={cn('p-2', className)} />
  }

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {/* Categorised channels */}
      {categories.map((category) => {
        const catChannels = sortChannels(
          category.channelIds
            .map((id) => channelById.get(id))
            .filter((ch): ch is Channel => ch !== undefined),
          sortOrder
        )

        const hasUnread = catChannels.some(
          (ch) => (unreadMap[ch.id] ?? 0) > 0
        )

        return (
          <ChannelCategoryComponent
            key={category.id}
            category={category}
            adapter={adapter}
            hasUnread={hasUnread}
          >
            {catChannels.map((channel) => (
              <ChannelItem
                key={channel.id}
                channel={channel}
                adapter={adapter}
                isActive={channel.id === activeChannelId}
                onSelect={onSelect}
              />
            ))}
          </ChannelCategoryComponent>
        )
      })}

      {/* Uncategorized channels */}
      {uncategorized.length > 0 && (
        <div className="flex flex-col gap-0.5 px-2">
          {uncategorized.map((channel) => (
            <ChannelItem
              key={channel.id}
              channel={channel}
              adapter={adapter}
              isActive={channel.id === activeChannelId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
})
