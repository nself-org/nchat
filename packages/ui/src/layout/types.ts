/**
 * Shared types for layout domain.
 *
 * @module layout/types
 */

// ============================================================================
// Channel Types
// ============================================================================

export type ChannelType = 'public' | 'private' | 'direct' | 'group'

export interface ChannelMember {
  userId: string
  role: 'owner' | 'admin' | 'member'
  joinedAt: string
  lastReadAt: string | null
  lastReadMessageId: string | null
}

export interface Channel {
  id: string
  name: string
  slug: string
  description: string | null
  type: ChannelType
  categoryId: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
  topic: string | null
  icon: string | null
  color: string | null
  isArchived: boolean
  isDefault: boolean
  memberCount: number
  members?: ChannelMember[]
  lastMessageAt: string | null
  lastMessagePreview: string | null
  /** For DMs */
  otherUserId?: string
  otherUserName?: string
  otherUserAvatar?: string
}

export interface ChannelCategory {
  id: string
  name: string
  position: number
  isCollapsed: boolean
  channelIds: string[]
}

// ============================================================================
// Layout Types
// ============================================================================

export type SortOrder = 'manual' | 'alphabetical' | 'recent'

export type UserRole = 'owner' | 'admin' | 'moderator' | 'member' | 'guest'

export interface LayoutUser {
  id: string
  role?: UserRole
  displayName?: string
  username?: string
  avatarUrl?: string
}
