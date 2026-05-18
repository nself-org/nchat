/**
 * Thread components — ported from nchat/frontend/src/components/thread/
 * react-resizable-panels stripped (handled by consumer layout).
 * useThread hook replaced with ThreadAdapter.
 * useAuth replaced with currentUserId prop.
 *
 * @module chat/bubble/thread
 */

'use client'

import * as React from 'react'
import { useState, useCallback, useEffect, useRef, KeyboardEvent, ChangeEvent } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { cn } from '../../lib/utils'
import type {
  Thread,
  ThreadMessage,
  ThreadParticipant,
  ThreadPreviewData,
  Mention,
  Attachment,
} from './types'

// ============================================================================
// Adapter
// ============================================================================

export interface ThreadAdapter {
  thread: Thread | null
  parentMessage: ThreadMessage | null
  messages: ThreadMessage[]
  participants: ThreadParticipant[]
  loading: boolean
  loadingMessages: boolean
  hasMore: boolean
  error: string | null
  isParticipant: boolean
  hasUnread: boolean
  notificationsEnabled: boolean
  sendReply: (content: string, attachments?: File[]) => Promise<void>
  loadMore: () => void
  markAsRead: () => void
  joinThread: () => Promise<void>
  leaveThread: () => Promise<void>
  toggleNotifications: (enabled: boolean) => Promise<void>
  onMentionSearch?: (query: string) => Promise<Mention[]>
}

// ============================================================================
// Helper
// ============================================================================

const getInitials = (name: string): string => {
  const parts = name.split(' ')
  if (parts.length >= 2) return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

const formatRelativeTime = (dateString: string): string => {
  try {
    const ms = Date.now() - new Date(dateString).getTime()
    const seconds = Math.floor(ms / 1000)
    if (seconds < 60) return 'just now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  } catch {
    return ''
  }
}

const formatDate = (dateString: string): string => {
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

// ============================================================================
// Avatar
// ============================================================================

interface SimpleAvatarProps {
  src?: string
  alt: string
  initials: string
  size?: 'sm' | 'md'
  className?: string
}

function SimpleAvatar({ src, alt, initials, size = 'md', className }: SimpleAvatarProps) {
  const [failed, setFailed] = useState(false)
  const sizeClass = size === 'sm' ? 'h-5 w-5 text-[10px]' : 'h-8 w-8 text-xs'

  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden rounded-full bg-muted flex items-center justify-center font-medium text-muted-foreground',
        sizeClass,
        className
      )}
    >
      {src && !failed ? (
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  )
}

// ============================================================================
// Thread Header
// ============================================================================

export interface ThreadHeaderProps {
  thread: Thread | null
  parentMessage: ThreadMessage | null
  participants: ThreadParticipant[]
  replyCount: number
  isParticipant: boolean
  notificationsEnabled?: boolean
  onClose: () => void
  onJoin?: () => void
  onLeave?: () => void
  onToggleNotifications?: (enabled: boolean) => void
  onViewParticipants?: () => void
  className?: string
}

export function ThreadHeader({
  thread,
  parentMessage,
  participants,
  replyCount,
  isParticipant,
  notificationsEnabled = true,
  onClose,
  onJoin,
  onLeave,
  onToggleNotifications,
  onViewParticipants,
  className,
}: ThreadHeaderProps) {
  return (
    <TooltipPrimitive.Provider>
      <div className={cn('flex flex-col border-b bg-background', className)}>
        {/* Header row */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            {/* MessageSquare icon inline */}
            <svg
              className="h-5 w-5 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <h2 className="text-base font-semibold">Thread</h2>
            {replyCount > 0 && (
              <span className="text-sm text-muted-foreground">
                ({replyCount} {replyCount === 1 ? 'reply' : 'replies'})
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {isParticipant && onToggleNotifications && (
              <TooltipPrimitive.Root>
                <TooltipPrimitive.Trigger asChild>
                  <button
                    type="button"
                    onClick={() => onToggleNotifications(!notificationsEnabled)}
                    className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {notificationsEnabled ? (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                    )}
                    <span className="sr-only">
                      {notificationsEnabled ? 'Mute thread' : 'Unmute thread'}
                    </span>
                  </button>
                </TooltipPrimitive.Trigger>
                <TooltipPrimitive.Content className="rounded bg-foreground px-2 py-1 text-xs text-background">
                  {notificationsEnabled ? 'Turn off notifications' : 'Turn on notifications'}
                </TooltipPrimitive.Content>
              </TooltipPrimitive.Root>
            )}

            {onViewParticipants && (
              <button
                type="button"
                onClick={onViewParticipants}
                className="flex h-8 w-8 items-center justify-center rounded-md text-xs transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span className="sr-only">View participants</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="sr-only">Close thread</span>
            </button>
          </div>
        </div>

        <div className="border-t" />

        {/* Parent message preview */}
        {parentMessage && (
          <div className="bg-muted/30 px-4 py-3">
            <div className="flex items-start gap-3">
              <SimpleAvatar
                src={parentMessage.user.avatar_url}
                alt={parentMessage.user.display_name || parentMessage.user.username}
                initials={getInitials(parentMessage.user.display_name || parentMessage.user.username)}
              />
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-baseline gap-2">
                  <span className="truncate text-sm font-semibold">
                    {parentMessage.user.display_name || parentMessage.user.username}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(parentMessage.created_at)}
                  </span>
                </div>
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {parentMessage.content.slice(0, 80)}
                  {parentMessage.content.length > 80 ? '...' : ''}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Participants row */}
        {participants.length > 0 && (
          <>
            <div className="border-t" />
            <div className="flex items-center justify-between px-4 py-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  {participants.slice(0, 5).map((p, i) => (
                    <SimpleAvatar
                      key={p.id}
                      src={p.avatar_url}
                      alt={p.display_name || p.username}
                      initials={getInitials(p.display_name || p.username)}
                      size="sm"
                      className={cn('border border-background', i > 0 && '-ml-1.5')}
                    />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">
                  {participants.length} {participants.length === 1 ? 'participant' : 'participants'}
                </span>
              </div>
              {!isParticipant && onJoin && (
                <button
                  type="button"
                  onClick={onJoin}
                  className="rounded-md border px-3 py-1 text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Follow thread
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </TooltipPrimitive.Provider>
  )
}

// ============================================================================
// Thread Header Compact
// ============================================================================

export interface ThreadHeaderCompactProps {
  replyCount: number
  participantCount: number
  onClose: () => void
  className?: string
}

export function ThreadHeaderCompact({
  replyCount,
  participantCount,
  onClose,
  className,
}: ThreadHeaderCompactProps) {
  return (
    <div className={cn('flex items-center justify-between border-b px-3 py-2', className)}>
      <div className="flex items-center gap-2">
        <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <span className="text-sm font-medium">Thread</span>
        <span className="text-xs text-muted-foreground">
          {replyCount} {replyCount === 1 ? 'reply' : 'replies'} &middot; {participantCount}{' '}
          {participantCount === 1 ? 'person' : 'people'}
        </span>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
        <span className="sr-only">Close</span>
      </button>
    </div>
  )
}

// ============================================================================
// Thread Reply Input
// ============================================================================

export interface ThreadReplyInputProps {
  placeholder?: string
  onSend: (content: string, attachments?: File[]) => Promise<void>
  onMentionSearch?: (query: string) => Promise<Mention[]>
  disabled?: boolean
  sending?: boolean
  maxFileSize?: number
  allowedFileTypes?: string[]
  maxAttachments?: number
  className?: string
  autoFocus?: boolean
}

export function ThreadReplyInput({
  placeholder = 'Reply to thread...',
  onSend,
  onMentionSearch,
  disabled = false,
  sending = false,
  maxFileSize = 10 * 1024 * 1024,
  allowedFileTypes,
  maxAttachments = 10,
  className,
  autoFocus = false,
}: ThreadReplyInputProps) {
  const [content, setContent] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionResults, setMentionResults] = useState<Mention[]>([])
  const [mentionIndex, setMentionIndex] = useState(0)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = `${Math.min(el.scrollHeight, 150)}px`
    }
  }, [])

  const handleContentChange = useCallback(
    async (e: ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value
      setContent(value)
      const cursorPos = e.target.selectionStart
      const textBefore = value.slice(0, cursorPos)
      const mentionMatch = textBefore.match(/@(\w*)$/)
      if (mentionMatch && onMentionSearch) {
        const query = mentionMatch[1] ?? ''
        setMentionQuery(query)
        const results = await onMentionSearch(query)
        setMentionResults(results)
        setMentionIndex(0)
      } else {
        setMentionQuery(null)
        setMentionResults([])
      }
      requestAnimationFrame(adjustHeight)
    },
    [onMentionSearch, adjustHeight]
  )

  const insertMention = useCallback(
    (mention: Mention) => {
      if (!textareaRef.current) return
      const textarea = textareaRef.current
      const cursorPos = textarea.selectionStart
      const textBefore = content.slice(0, cursorPos).replace(/@\w*$/, `@${mention.username} `)
      const textAfter = content.slice(cursorPos)
      setContent(textBefore + textAfter)
      setMentionQuery(null)
      setMentionResults([])
      requestAnimationFrame(() => {
        textarea.focus()
        textarea.setSelectionRange(textBefore.length, textBefore.length)
      })
    },
    [content]
  )

  const handleSend = useCallback(async () => {
    const trimmed = content.trim()
    if (!trimmed && attachments.length === 0) return
    if (sending || disabled) return
    try {
      const files = attachments.map((a) => a.file)
      await onSend(trimmed, files.length > 0 ? files : undefined)
      setContent('')
      setAttachments([])
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
    } catch {
      // silently fail — consumer handles errors
    }
  }, [content, attachments, sending, disabled, onSend])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (mentionResults.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setMentionIndex((prev) => (prev < mentionResults.length - 1 ? prev + 1 : 0))
          return
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          setMentionIndex((prev) => (prev > 0 ? prev - 1 : mentionResults.length - 1))
          return
        }
        if (e.key === 'Enter' || e.key === 'Tab') {
          const selected = mentionResults[mentionIndex]
          if (selected) {
            e.preventDefault()
            insertMention(selected)
          }
          return
        }
        if (e.key === 'Escape') {
          e.preventDefault()
          setMentionQuery(null)
          setMentionResults([])
          return
        }
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        void handleSend()
      }
    },
    [mentionResults, mentionIndex, insertMention, handleSend]
  )

  const handleFileSelect = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || [])
      const valid = files.filter(
        (f) =>
          f.size <= maxFileSize &&
          (!allowedFileTypes || allowedFileTypes.includes(f.type))
      )
      const newAttachments = valid
        .slice(0, maxAttachments - attachments.length)
        .map((file): Attachment => {
          const a: Attachment = { id: `${Date.now()}-${file.name}`, file }
          if (file.type.startsWith('image/')) a.preview = URL.createObjectURL(file)
          return a
        })
      setAttachments((prev) => [...prev, ...newAttachments])
      if (fileInputRef.current) fileInputRef.current.value = ''
    },
    [maxFileSize, allowedFileTypes, maxAttachments, attachments.length]
  )

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => {
      const found = prev.find((a) => a.id === id)
      if (found?.preview) URL.revokeObjectURL(found.preview)
      return prev.filter((a) => a.id !== id)
    })
  }, [])

  useEffect(() => {
    return () => {
      attachments.forEach((a) => {
        if (a.preview) URL.revokeObjectURL(a.preview)
      })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const canSend = (content.trim().length > 0 || attachments.length > 0) && !sending && !disabled

  return (
    <div className={cn('border-t bg-background', className)}>
      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 px-3 pt-3">
          {attachments.map((a) => (
            <div key={a.id} className="group relative overflow-hidden rounded-md bg-muted">
              {a.preview ? (
                <img src={a.preview} alt={a.file.name} className="h-16 w-16 object-cover" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center">
                  <svg className="h-6 w-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </div>
              )}
              <button
                type="button"
                onClick={() => removeAttachment(a.id)}
                className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
              >
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Mention suggestions */}
      {mentionResults.length > 0 && (
        <div className="px-3 pt-2">
          <div className="overflow-hidden rounded-md border bg-popover shadow-md">
            {mentionResults.map((mention, index) => (
              <button
                key={mention.id}
                type="button"
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-muted',
                  index === mentionIndex && 'bg-muted'
                )}
                onClick={() => insertMention(mention)}
              >
                <span className="text-muted-foreground">@</span>
                <span className="font-medium">{mention.displayName}</span>
                <span className="text-muted-foreground">@{mention.username}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || sending}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus={autoFocus}
            className={cn(
              'w-full flex-1 resize-none rounded-md border bg-background px-3 py-2.5 text-sm',
              'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring',
              'max-h-[150px] min-h-[40px]',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
            rows={1}
          />
          <div className="flex items-center gap-1">
            {/* Attach */}
            <button
              type="button"
              disabled={disabled || sending || attachments.length >= maxAttachments}
              onClick={() => fileInputRef.current?.click()}
              className="flex h-9 w-9 items-center justify-center rounded-md transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              title={`Attach file (${attachments.length}/${maxAttachments})`}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              <span className="sr-only">Attach file</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
              accept={allowedFileTypes?.join(',')}
            />

            {/* Send */}
            <button
              type="button"
              disabled={!canSend}
              onClick={() => void handleSend()}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-md text-white transition-colors',
                'bg-primary hover:bg-primary/90',
                'disabled:cursor-not-allowed disabled:opacity-50',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
              )}
              title="Send reply (Enter)"
            >
              {sending ? (
                <svg className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
              <span className="sr-only">Send reply</span>
            </button>
          </div>
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          Press <kbd className="rounded bg-muted px-1 py-0.5 text-[10px]">Enter</kbd> to send,{' '}
          <kbd className="rounded bg-muted px-1 py-0.5 text-[10px]">Shift + Enter</kbd> for new line
        </p>
      </div>
    </div>
  )
}

// ============================================================================
// Thread Loading Skeleton
// ============================================================================

function ThreadPanelSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="space-y-3 border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-muted animate-pulse" />
            <div className="h-5 w-20 rounded bg-muted animate-pulse" />
          </div>
          <div className="flex items-center gap-1">
            <div className="h-8 w-8 rounded-md bg-muted animate-pulse" />
            <div className="h-8 w-8 rounded-md bg-muted animate-pulse" />
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 rounded bg-muted animate-pulse" />
            <div className="h-4 w-full rounded bg-muted animate-pulse" />
          </div>
        </div>
      </div>
      <div className="flex-1 space-y-4 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="h-8 w-8 shrink-0 rounded-full bg-muted animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-28 rounded bg-muted animate-pulse" />
              <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
            </div>
          </div>
        ))}
      </div>
      <div className="border-t p-3">
        <div className="h-10 w-full rounded-md bg-muted animate-pulse" />
      </div>
    </div>
  )
}

// ============================================================================
// Thread Message Item
// ============================================================================

function ThreadMessageItem({
  message,
  isCurrentUser,
}: {
  message: ThreadMessage
  isCurrentUser: boolean
}) {
  return (
    <div className="flex items-start gap-3 px-4 py-2 hover:bg-muted/30">
      <SimpleAvatar
        src={message.user.avatar_url}
        alt={message.user.display_name || message.user.username}
        initials={getInitials(message.user.display_name || message.user.username)}
      />
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-baseline gap-2">
          <span className={cn('text-sm font-semibold', isCurrentUser && 'text-primary')}>
            {message.user.display_name || message.user.username}
          </span>
          <span className="text-xs text-muted-foreground">{formatRelativeTime(message.created_at)}</span>
        </div>
        <p className="text-sm">{message.content}</p>
      </div>
    </div>
  )
}

// ============================================================================
// Thread Panel
// ============================================================================

export interface ThreadPanelProps {
  adapter: ThreadAdapter
  currentUserId?: string
  onClose: () => void
  compactHeader?: boolean
  className?: string
}

export function ThreadPanel({
  adapter,
  currentUserId,
  onClose,
  compactHeader = false,
  className,
}: ThreadPanelProps) {
  const [showParticipants, setShowParticipants] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(adapter.notificationsEnabled)

  useEffect(() => {
    setNotificationsEnabled(adapter.notificationsEnabled)
  }, [adapter.notificationsEnabled])

  const handleToggleNotifications = useCallback(
    async (enabled: boolean) => {
      setNotificationsEnabled(enabled)
      await adapter.toggleNotifications(enabled)
    },
    [adapter]
  )

  const handleSendReply = useCallback(
    async (content: string, attachments?: File[]) => {
      await adapter.sendReply(content, attachments)
    },
    [adapter]
  )

  return (
    <div className={cn('flex h-full flex-col border-l bg-background', className)}>
      {adapter.loading && !adapter.thread && <ThreadPanelSkeleton />}

      {adapter.error && !adapter.loading && (
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
          <p className="mb-4 text-sm text-destructive">Failed to load thread</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border px-3 py-1.5 text-sm transition-colors hover:bg-muted"
          >
            Close
          </button>
        </div>
      )}

      {adapter.thread && !adapter.loading && (
        <>
          {compactHeader ? (
            <ThreadHeaderCompact
              replyCount={adapter.thread.message_count}
              participantCount={adapter.participants.length}
              onClose={onClose}
            />
          ) : (
            <ThreadHeader
              thread={adapter.thread}
              parentMessage={adapter.parentMessage}
              participants={adapter.participants}
              replyCount={adapter.thread.message_count}
              isParticipant={adapter.isParticipant}
              notificationsEnabled={notificationsEnabled}
              onClose={onClose}
              onJoin={adapter.joinThread}
              onLeave={adapter.leaveThread}
              onToggleNotifications={handleToggleNotifications}
              onViewParticipants={() => setShowParticipants(true)}
            />
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto">
            {adapter.hasMore && (
              <div className="p-2 text-center">
                <button
                  type="button"
                  onClick={adapter.loadMore}
                  className="text-xs text-primary hover:underline"
                >
                  Load earlier replies
                </button>
              </div>
            )}
            {adapter.messages.map((msg) => (
              <ThreadMessageItem
                key={msg.id}
                message={msg}
                isCurrentUser={msg.user.id === currentUserId}
              />
            ))}
            {adapter.loadingMessages && (
              <div className="flex items-center justify-center py-4">
                <svg className="h-5 w-5 animate-spin text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
            )}
          </div>

          <ThreadReplyInput
            onSend={handleSendReply}
            onMentionSearch={adapter.onMentionSearch}
            sending={adapter.loadingMessages}
            autoFocus
          />
        </>
      )}

      {/* Participants dialog */}
      <DialogPrimitive.Root open={showParticipants} onOpenChange={setShowParticipants}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-[fadeOut_150ms] data-[state=open]:animate-[fadeIn_150ms]" />
          <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-background p-6 shadow-xl">
            <DialogPrimitive.Title className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Thread Participants ({adapter.participants.length})
            </DialogPrimitive.Title>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {adapter.participants.map((p) => (
                <div key={p.id} className="flex items-center gap-3">
                  <SimpleAvatar
                    src={p.avatar_url}
                    alt={p.display_name || p.username}
                    initials={getInitials(p.display_name || p.username)}
                  />
                  <div>
                    <div className="text-sm font-medium">{p.display_name || p.username}</div>
                    <div className="text-xs text-muted-foreground">@{p.username}</div>
                  </div>
                </div>
              ))}
            </div>
            <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  )
}

// ============================================================================
// Slide-In Panel
// ============================================================================

export interface ThreadSlideInPanelProps {
  open: boolean
  adapter: ThreadAdapter
  currentUserId?: string
  onClose: () => void
  className?: string
}

export function ThreadSlideInPanel({
  open,
  adapter,
  currentUserId,
  onClose,
  className,
}: ThreadSlideInPanelProps) {
  useEffect(() => {
    const handleEscape = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [open, onClose])

  if (!open || !adapter.thread) return null

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 md:hidden" onClick={onClose} aria-hidden="true" />
      <div
        className={cn(
          'fixed inset-y-0 right-0 z-50 w-full max-w-md shadow-2xl',
          'transform transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : 'translate-x-full',
          className
        )}
      >
        <ThreadPanel
          adapter={adapter}
          currentUserId={currentUserId}
          onClose={onClose}
          compactHeader
        />
      </div>
    </>
  )
}

// ============================================================================
// Thread Preview
// ============================================================================

export interface ThreadPreviewProps {
  thread: ThreadPreviewData
  maxAvatars?: number
  onClick?: () => void
  hasUnread?: boolean
  className?: string
  size?: 'sm' | 'md'
}

export function ThreadPreview({
  thread,
  maxAvatars = 3,
  onClick,
  hasUnread = false,
  className,
  size = 'md',
}: ThreadPreviewProps) {
  const { replyCount, lastReplyAt, participants } = thread
  const visible = participants.slice(0, maxAvatars)
  const overflow = Math.max(0, participants.length - maxAvatars)

  if (replyCount === 0) return null

  const avatarSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'
  const avatarOverlap = size === 'sm' ? '-ml-1' : '-ml-1.5'

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center rounded-md px-2 py-1',
        'bg-muted/50 hover:bg-muted transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        hasUnread && 'ring-1 ring-primary/50',
        size === 'sm' ? 'gap-1.5 text-xs' : 'gap-2 text-sm',
        className
      )}
    >
      <div className="flex items-center">
        {visible.map((p, index) => (
          <SimpleAvatar
            key={p.id}
            src={p.avatar_url}
            alt={p.display_name || p.username}
            initials={getInitials(p.display_name || p.username)}
            className={cn(avatarSize, 'border border-background', index > 0 && avatarOverlap)}
          />
        ))}
        {overflow > 0 && (
          <div
            className={cn(
              avatarSize,
              avatarOverlap,
              'flex items-center justify-center rounded-full border border-background',
              'bg-muted text-[8px] font-medium text-muted-foreground'
            )}
          >
            +{overflow}
          </div>
        )}
      </div>
      <span className={cn('text-primary', hasUnread && 'font-semibold')}>
        {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
      </span>
      {lastReplyAt && (
        <span className="text-muted-foreground">{formatRelativeTime(lastReplyAt)}</span>
      )}
      {hasUnread && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
    </button>
  )
}

export interface StartThreadButtonProps {
  onClick?: () => void
  className?: string
}

export function StartThreadButton({ onClick, className }: StartThreadButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 rounded px-1.5 py-0.5',
        'text-xs text-muted-foreground',
        'hover:bg-muted hover:text-foreground',
        'opacity-0 group-hover:opacity-100 transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className
      )}
    >
      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
      <span>Reply</span>
    </button>
  )
}

export default ThreadPanel
