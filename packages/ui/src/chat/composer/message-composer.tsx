/**
 * MessageComposer — ported from nchat/frontend/src/components/chat/message-input.tsx
 * TipTap editor replaced with accessible textarea.
 * framer-motion replaced with CSS transitions.
 * All hook/store deps replaced with ComposerAdapter interface.
 * Pro features (gif/sticker/voice/gif) are adapter-driven and gracefully absent.
 *
 * @module chat/composer/message-composer
 */

'use client'

import * as React from 'react'
import { cn } from '../../lib/utils'
import type { MentionUser, MentionChannel, MentionSuggestion } from '../bubble/types'
import type { SlashCommand, ReplyTarget, EditTarget, AttachmentPreview } from './types'

// ============================================================================
// Adapter
// ============================================================================

export interface ComposerAdapter {
  /** Send a plain-text or markdown message */
  onSend: (content: string, attachments?: File[]) => void | Promise<void>
  /** Called when the user edits a message (requires editingMessage set) */
  onEdit?: (messageId: string, content: string) => void | Promise<void>
  /** Cancel the current edit */
  onCancelEdit?: () => void
  /** Cancel the current reply */
  onCancelReply?: () => void
  /** Notify backend that the user is typing */
  onTyping?: () => void
  /** Current message being edited — triggers edit mode */
  editingMessage?: EditTarget | null
  /** Current message being replied to — triggers reply mode */
  replyingTo?: ReplyTarget | null
  /** Available users for @ mention suggestions */
  mentionUsers?: MentionUser[]
  /** Available channels for # mention suggestions */
  mentionChannels?: MentionChannel[]
  /** Whether @everyone/@here are allowed */
  canMentionEveryone?: boolean
  /** Available slash commands */
  slashCommands?: SlashCommand[]
  /** Pro: send a GIF */
  onSendGif?: (gifUrl: string, gifAlt?: string) => void | Promise<void>
  /** Pro: send a sticker */
  onSendSticker?: (stickerId: string) => void | Promise<void>
  /** Pro: start voice recording */
  onVoiceRecord?: () => void
  /** Max character length (default 4000) */
  maxLength?: number
  /** Placeholder text */
  placeholder?: string
  /** Whether the composer is disabled */
  disabled?: boolean
}

// ============================================================================
// Types
// ============================================================================

export interface MessageComposerProps {
  adapter: ComposerAdapter
  /** Show the emoji picker button */
  showEmoji?: boolean
  /** Show the attachment button */
  showAttachments?: boolean
  /** Show slash-command trigger button */
  showSlashCommands?: boolean
  /** Show the formatting toolbar toggle */
  showFormatting?: boolean
  className?: string
}

// ============================================================================
// Internal helpers
// ============================================================================

function buildSuggestions(
  text: string,
  cursorPos: number,
  mentionUsers: MentionUser[],
  mentionChannels: MentionChannel[],
  canMentionEveryone: boolean
): { trigger: '@' | '#' | null; query: string; suggestions: MentionSuggestion[] } {
  const before = text.slice(0, cursorPos)
  const atMatch = before.match(/(?:^|\s)(@[\w.-]*)$/)
  const hashMatch = before.match(/(?:^|\s)(#[\w-]*)$/)

  if (atMatch) {
    const query = (atMatch[1] ?? '').slice(1)
    const suggestions: MentionSuggestion[] = []
    if (canMentionEveryone) {
      if (!query || 'everyone'.startsWith(query)) {
        suggestions.push({ type: 'everyone', id: 'everyone', label: 'everyone', sublabel: 'Notify everyone' })
      }
      if (!query || 'here'.startsWith(query)) {
        suggestions.push({ type: 'here', id: 'here', label: 'here', sublabel: 'Notify online members' })
      }
    }
    const q = query.toLowerCase()
    const users = mentionUsers
      .filter((u) => !q || u.username.toLowerCase().includes(q) || u.displayName.toLowerCase().includes(q))
      .slice(0, 6)
      .map((u) => ({ type: 'user' as const, id: u.id, label: u.displayName || u.username, sublabel: `@${u.username}`, avatarUrl: u.avatarUrl }))
    return { trigger: '@', query, suggestions: [...suggestions, ...users].slice(0, 8) }
  }

  if (hashMatch) {
    const query = (hashMatch[1] ?? '').slice(1)
    const q = query.toLowerCase()
    const channels = mentionChannels
      .filter((c) => !q || c.name.toLowerCase().includes(q))
      .slice(0, 6)
      .map((c) => ({ type: 'channel' as const, id: c.id, label: c.name }))
    return { trigger: '#', query, suggestions: channels }
  }

  return { trigger: null, query: '', suggestions: [] }
}

function buildSlashSuggestions(text: string, commands: SlashCommand[]): {
  show: boolean
  query: string
  filtered: SlashCommand[]
} {
  if (!text.startsWith('/')) return { show: false, query: '', filtered: [] }
  const q = text.slice(1).toLowerCase()
  const filtered = commands.filter(
    (c) => !q || c.name.toLowerCase().startsWith(q) || c.description.toLowerCase().includes(q)
  ).slice(0, 10)
  return { show: true, query: q, filtered }
}

// ============================================================================
// Reply Preview Strip
// ============================================================================

function ReplyPreviewStrip({
  replyingTo,
  onCancel,
}: {
  replyingTo: ReplyTarget
  onCancel: () => void
}) {
  return (
    <div className="flex items-start gap-2 border-b bg-muted/30 px-3 py-2">
      <div className="h-full w-0.5 shrink-0 self-stretch rounded-full bg-primary" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-primary">Replying to {replyingTo.displayName || replyingTo.username}</p>
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{replyingTo.content}</p>
      </div>
      <button
        type="button"
        onClick={onCancel}
        aria-label="Cancel reply"
        className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground"
      >
        <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 4 4 12M4 4l8 8" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}

// ============================================================================
// Edit Preview Strip
// ============================================================================

function EditPreviewStrip({
  editingMessage,
  onCancel,
}: {
  editingMessage: EditTarget
  onCancel: () => void
}) {
  return (
    <div className="flex items-center gap-2 border-b bg-blue-50/50 px-3 py-2 dark:bg-blue-950/20">
      <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0 text-blue-500" fill="currentColor">
        <path d="M13.5 1a.5.5 0 0 1 .354.854l-9.5 9.5a.5.5 0 0 1-.214.128l-3 .75a.5.5 0 0 1-.604-.604l.75-3a.5.5 0 0 1 .128-.214l9.5-9.5A.5.5 0 0 1 13.5 1Z" />
      </svg>
      <span className="flex-1 text-xs text-muted-foreground">
        Editing message: <span className="text-foreground">{editingMessage.content.slice(0, 60)}</span>
      </span>
      <button
        type="button"
        onClick={onCancel}
        aria-label="Cancel edit"
        className="shrink-0 text-muted-foreground hover:text-foreground"
      >
        <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 4 4 12M4 4l8 8" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}

// ============================================================================
// Attachment Preview Area
// ============================================================================

function AttachmentArea({
  attachments,
  onRemove,
}: {
  attachments: AttachmentPreview[]
  onRemove: (id: string) => void
}) {
  if (attachments.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2 border-b px-3 py-2">
      {attachments.map((att) => (
        <div
          key={att.id}
          className="group relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-md border bg-muted"
        >
          {att.preview ? (
            <img src={att.preview} alt={att.file.name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs text-muted-foreground">{att.file.name.slice(0, 8)}</span>
          )}
          {att.progress !== undefined && att.progress < 100 && (
            <div
              className="absolute bottom-0 left-0 h-0.5 bg-primary transition-all"
              style={{ width: `${att.progress}%` }}
            />
          )}
          <button
            type="button"
            onClick={() => onRemove(att.id)}
            aria-label="Remove attachment"
            className={cn(
              'absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-background',
              'opacity-0 transition-opacity group-hover:opacity-100'
            )}
          >
            <svg viewBox="0 0 16 16" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M11 5 5 11M5 5l6 6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// Message Composer
// ============================================================================

export const MessageComposer = React.forwardRef<HTMLDivElement, MessageComposerProps>(
  function MessageComposer(
    {
      adapter,
      showEmoji = false,
      showAttachments = true,
      showSlashCommands = true,
      showFormatting = false,
      className,
    },
    ref
  ) {
    const {
      onSend,
      onEdit,
      onCancelEdit,
      onCancelReply,
      onTyping,
      editingMessage,
      replyingTo,
      mentionUsers = [],
      mentionChannels = [],
      canMentionEveryone = false,
      slashCommands = [],
      maxLength = 4000,
      placeholder,
      disabled = false,
    } = adapter

    const [text, setText] = React.useState('')
    const [attachments, setAttachments] = React.useState<AttachmentPreview[]>([])
    const [mentionState, setMentionState] = React.useState<{
      trigger: '@' | '#' | null
      query: string
      suggestions: MentionSuggestion[]
    }>({ trigger: null, query: '', suggestions: [] })
    const [slashState, setSlashState] = React.useState<{
      show: boolean
      query: string
      filtered: SlashCommand[]
    }>({ show: false, query: '', filtered: [] })
    const [isSending, setIsSending] = React.useState(false)

    const textareaRef = React.useRef<HTMLTextAreaElement>(null)
    const fileInputRef = React.useRef<HTMLInputElement>(null)

    // Populate from editingMessage
    React.useEffect(() => {
      if (editingMessage) {
        setText(editingMessage.content)
        setTimeout(() => textareaRef.current?.focus(), 0)
      }
    }, [editingMessage?.messageId])

    // Auto-resize textarea
    React.useEffect(() => {
      const ta = textareaRef.current
      if (!ta) return
      ta.style.height = 'auto'
      ta.style.height = `${Math.min(ta.scrollHeight, 240)}px`
    }, [text])

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value
      if (val.length > maxLength) return
      setText(val)

      const cursor = e.target.selectionStart ?? val.length

      // Slash commands (only at start of message)
      if (slashCommands.length > 0) {
        const slash = buildSlashSuggestions(val, slashCommands)
        setSlashState(slash)
        if (slash.show) {
          setMentionState({ trigger: null, query: '', suggestions: [] })
          onTyping?.()
          return
        } else {
          setSlashState({ show: false, query: '', filtered: [] })
        }
      }

      // Mentions
      const mention = buildSuggestions(val, cursor, mentionUsers, mentionChannels, canMentionEveryone)
      setMentionState(mention)

      onTyping?.()
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // If autocomplete overlays are open, let them handle arrows/enter
      if (mentionState.trigger && mentionState.suggestions.length > 0) return
      if (slashState.show && slashState.filtered.length > 0) return

      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        void handleSend()
      }

      if (e.key === 'Escape') {
        if (editingMessage) onCancelEdit?.()
        if (replyingTo) onCancelReply?.()
      }
    }

    const handleSend = async () => {
      const trimmed = text.trim()
      if ((!trimmed && attachments.length === 0) || isSending || disabled) return

      setIsSending(true)
      try {
        if (editingMessage && onEdit) {
          await onEdit(editingMessage.messageId, trimmed)
        } else {
          await onSend(trimmed, attachments.map((a) => a.file))
        }
        setText('')
        setAttachments([])
        setMentionState({ trigger: null, query: '', suggestions: [] })
        setSlashState({ show: false, query: '', filtered: [] })
      } finally {
        setIsSending(false)
      }
    }

    const insertMention = (suggestion: MentionSuggestion) => {
      const ta = textareaRef.current
      if (!ta) return
      const cursor = ta.selectionStart ?? text.length
      const before = text.slice(0, cursor)
      const after = text.slice(cursor)
      const prefix = suggestion.type === 'channel' ? '#' : '@'
      const replaced = before.replace(/(?:^|\s)[@#][\w.-]*$/, (m) => {
        const space = m.startsWith(' ') ? ' ' : ''
        return `${space}${prefix}${suggestion.label} `
      })
      const newText = replaced + after
      setText(newText)
      setMentionState({ trigger: null, query: '', suggestions: [] })
      setTimeout(() => { ta.focus(); ta.selectionStart = ta.selectionEnd = replaced.length }, 0)
    }

    const insertSlashCommand = (cmd: SlashCommand) => {
      setText(`/${cmd.name} `)
      setSlashState({ show: false, query: '', filtered: [] })
      textareaRef.current?.focus()
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? [])
      const previews: AttachmentPreview[] = files.map((file) => ({
        id: `${file.name}-${file.lastModified}`,
        file,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
        progress: 0,
      }))
      setAttachments((prev) => [...prev, ...previews])
      if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const removeAttachment = (id: string) => {
      setAttachments((prev) => {
        const a = prev.find((p) => p.id === id)
        if (a?.preview) URL.revokeObjectURL(a.preview)
        return prev.filter((p) => p.id !== id)
      })
    }

    const isEditing = !!editingMessage
    const isReplying = !!replyingTo
    const canSend = (text.trim().length > 0 || attachments.length > 0) && !disabled && !isSending
    const effectivePlaceholder = placeholder ?? (isEditing ? 'Edit message…' : isReplying ? `Reply to ${replyingTo?.displayName ?? replyingTo?.username}…` : 'Message…')

    return (
      <div ref={ref} className={cn('relative flex flex-col rounded-lg border bg-background', className)}>
        {/* Reply strip */}
        {isReplying && replyingTo && (
          <ReplyPreviewStrip replyingTo={replyingTo} onCancel={() => onCancelReply?.()} />
        )}

        {/* Edit strip */}
        {isEditing && editingMessage && (
          <EditPreviewStrip editingMessage={editingMessage} onCancel={() => onCancelEdit?.()} />
        )}

        {/* Attachment preview */}
        <AttachmentArea attachments={attachments} onRemove={removeAttachment} />

        {/* Mention autocomplete */}
        {mentionState.trigger && mentionState.suggestions.length > 0 && (
          <div className="absolute bottom-full left-0 mb-1 z-50">
            <div className="w-64 overflow-hidden rounded-lg border bg-popover shadow-lg">
              <p className="px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {mentionState.trigger === '@' ? 'Members' : 'Channels'}
              </p>
              {mentionState.suggestions.map((s) => (
                <button
                  key={`${s.type}:${s.id}`}
                  type="button"
                  onClick={() => insertMention(s)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent/50"
                >
                  {s.avatarUrl ? (
                    <img src={s.avatarUrl} alt={s.label} className="h-6 w-6 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium uppercase text-muted-foreground">
                      {(s.label || '?').charAt(0)}
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{s.label}</span>
                    {s.sublabel && <span className="block truncate text-xs text-muted-foreground">{s.sublabel}</span>}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Slash command autocomplete */}
        {slashState.show && slashState.filtered.length > 0 && (
          <div className="absolute bottom-full left-0 mb-1 z-50">
            <div className="w-72 overflow-hidden rounded-lg border bg-popover shadow-lg">
              <p className="px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Commands</p>
              {slashState.filtered.map((cmd) => (
                <button
                  key={cmd.id}
                  type="button"
                  onClick={() => insertSlashCommand(cmd)}
                  className="flex w-full items-start gap-2.5 px-3 py-2 text-left hover:bg-accent/50"
                >
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded bg-muted text-sm">
                    {cmd.icon || '/'}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">/{cmd.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{cmd.description}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Textarea row */}
        <div className="flex items-end gap-1.5 px-2 py-2">
          {/* Attachment button */}
          {showAttachments && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="sr-only"
                onChange={handleFileChange}
                disabled={disabled}
              />
              <button
                type="button"
                disabled={disabled}
                onClick={() => fileInputRef.current?.click()}
                aria-label="Attach files"
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground',
                  'hover:bg-muted hover:text-foreground transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  disabled && 'pointer-events-none opacity-50'
                )}
              >
                <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                </svg>
              </button>
            </>
          )}

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={effectivePlaceholder}
            disabled={disabled}
            rows={1}
            maxLength={maxLength}
            aria-label="Message input"
            className={cn(
              'min-h-[36px] flex-1 resize-none bg-transparent py-1.5 text-sm placeholder:text-muted-foreground',
              'focus:outline-none',
              'scrollbar-thin scrollbar-thumb-muted',
              disabled && 'opacity-50'
            )}
            style={{ maxHeight: '240px', overflowY: 'auto' }}
          />

          {/* Character count when near limit */}
          {text.length > maxLength * 0.85 && (
            <span className={cn('shrink-0 text-xs tabular-nums', text.length >= maxLength ? 'text-destructive' : 'text-muted-foreground')}>
              {maxLength - text.length}
            </span>
          )}

          {/* Send button */}
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!canSend}
            aria-label={isEditing ? 'Save edit' : 'Send message'}
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
              'transition-all duration-100',
              canSend
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'text-muted-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            )}
          >
            {isSending ? (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" className="opacity-25" />
                <path d="M12 2a10 10 0 0 1 10 10" className="opacity-75" />
              </svg>
            ) : isEditing ? (
              <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 8l4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            )}
          </button>
        </div>

        {/* Edit mode footer */}
        {isEditing && (
          <div className="flex items-center gap-2 border-t px-3 py-1.5">
            <span className="text-xs text-muted-foreground">
              <kbd className="rounded bg-muted px-1 font-mono text-[10px]">Esc</kbd> cancel ·{' '}
              <kbd className="rounded bg-muted px-1 font-mono text-[10px]">Enter</kbd> save
            </span>
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => onCancelEdit?.()}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    )
  }
)

export default MessageComposer
