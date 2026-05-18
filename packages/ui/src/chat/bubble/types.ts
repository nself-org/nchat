/**
 * Shared types for chat/bubble domain — inlined from nchat/frontend source.
 * Avoids cross-package imports.
 *
 * @module chat/bubble/types
 */

// ============================================================================
// Reactions
// ============================================================================

export interface ReactionAggregate {
  emoji: string
  count: number
  userIds: string[]
  label?: string
}

export interface PlatformReactionConfig {
  emoji: string
  label: string
  shortcode?: string
}

// ============================================================================
// Thread
// ============================================================================

export interface ThreadParticipant {
  id: string
  username: string
  display_name: string
  avatar_url?: string
}

export interface ThreadMessage {
  id: string
  content: string
  created_at: string
  user: {
    id: string
    username: string
    display_name: string
    avatar_url?: string
  }
}

export interface Thread {
  id: string
  message_count: number
  created_at: string
  updated_at?: string
}

// ============================================================================
// Thread Preview
// ============================================================================

export interface ThreadPreviewParticipant {
  id: string
  username: string
  display_name: string
  avatar_url?: string
}

export interface ThreadPreviewData {
  id: string
  replyCount: number
  lastReplyAt: string
  participants: ThreadPreviewParticipant[]
  lastReplyContent?: string
  lastReplyUser?: ThreadPreviewParticipant
}

// ============================================================================
// Mentions
// ============================================================================

export interface MentionUser {
  id: string
  username: string
  displayName: string
  avatarUrl?: string
  status?: 'online' | 'away' | 'busy' | 'offline'
}

export interface MentionChannel {
  id: string
  name: string
  slug?: string
  isPrivate?: boolean
}

export type MentionSuggestionType = 'user' | 'channel' | 'everyone' | 'here'

export interface MentionSuggestion {
  type: MentionSuggestionType
  id: string
  label: string
  sublabel?: string
  avatarUrl?: string
}

// ============================================================================
// Link Preview
// ============================================================================

export interface LinkPreviewData {
  url: string
  title?: string
  description?: string
  image?: string
  favicon?: string
  siteName?: string
  type?: 'website' | 'article' | 'video' | 'image' | 'twitter' | 'youtube' | 'github' | 'spotify' | 'code'
}

// ============================================================================
// Mention Attachment
// ============================================================================

export interface Mention {
  id: string
  username: string
  displayName: string
}

export interface Attachment {
  id: string
  file: File
  preview?: string
  progress?: number
}
