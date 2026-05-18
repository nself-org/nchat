/**
 * Shared types for chat/composer domain.
 *
 * @module chat/composer/types
 */

// ============================================================================
// Slash Commands
// ============================================================================

export interface SlashCommandArgument {
  name: string
  description?: string
  required?: boolean
  type?: 'string' | 'number' | 'boolean' | 'user' | 'channel'
}

export interface SlashCommand {
  id: string
  name: string
  description: string
  usage?: string
  category?: string
  arguments?: SlashCommandArgument[]
  icon?: string
  pro?: boolean
}

// ============================================================================
// Drafts
// ============================================================================

export type DraftType = 'channel' | 'thread' | 'dm'

export interface Draft {
  id: string
  channelId?: string
  threadId?: string
  userId: string
  content: string
  type: DraftType
  updatedAt: string
  attachmentCount?: number
}

// ============================================================================
// Composer
// ============================================================================

export interface ReplyTarget {
  messageId: string
  content: string
  username: string
  displayName?: string
}

export interface EditTarget {
  messageId: string
  content: string
}

export interface AttachmentPreview {
  id: string
  file: File
  preview?: string
  progress?: number
  error?: string
}

export type ComposerMode = 'normal' | 'reply' | 'edit' | 'thread'
