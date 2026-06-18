/**
 * Purpose:    Render a single chat message row — avatar, author, timestamp, body, and a
 *             pinned marker. Ported from the legacy chat-container message rendering; the
 *             legacy frontend used a heavy ChatContainer/MessageList tree, this is the
 *             SPA-local equivalent against the Hasura np_messages row shape.
 * Inputs:     message (MessageRow from components/chat/graphql), highlighted flag.
 * Outputs:    A semantic <article> message row, WCAG-labelled.
 * Constraints:Presentational only. Avatar uses a plain <img> (next/image removed); falls
 *             back to an initials chip when no avatar_url.
 * SOT:        F-NCHAT-VITE-CHAT-MSGROW-01
 */
import { Pin } from 'lucide-react'
import type { MessageRow as MessageRowData } from '@/components/chat/graphql'
import { clockTime } from '@/components/chat/relative-time'

interface Props {
  message: MessageRowData
  highlighted?: boolean
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function MessageRow({ message, highlighted = false }: Props) {
  const authorName = message.user?.display_name || message.user?.username || 'Unknown'
  const isSystem = message.type !== 'text' && message.user_id === 'system'

  if (isSystem) {
    return (
      <div className="py-2 text-center text-xs text-slate-500" role="note">
        {message.content}
      </div>
    )
  }

  return (
    <article
      id={`message-${message.id}`}
      className={
        'flex gap-3 rounded-lg px-3 py-2 transition-colors ' +
        (highlighted ? 'bg-sky-500/10 ring-1 ring-sky-500/40' : 'hover:bg-slate-800/40')
      }
      aria-label={`Message from ${authorName}`}
    >
      <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-slate-700">
        {message.user?.avatar_url ? (
          <img src={message.user.avatar_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-xs font-medium text-slate-200">
            {initials(authorName)}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-100">{authorName}</span>
          <time className="text-xs text-slate-500" dateTime={message.created_at}>
            {clockTime(message.created_at)}
          </time>
          {message.edited_at && <span className="text-xs text-slate-600">(edited)</span>}
          {message.is_pinned && (
            <Pin className="h-3 w-3 text-amber-400" aria-label="Pinned" />
          )}
        </div>
        <p className="whitespace-pre-wrap break-words text-sm text-slate-300">
          {message.content}
        </p>
      </div>
    </article>
  )
}
