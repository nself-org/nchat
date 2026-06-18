/**
 * Purpose:    Live-stream viewer ported from the legacy StreamPlayer. Renders the video stage
 *             (HLS/DASH url when present, else a "stream offline / connecting" placeholder),
 *             streamer header with live badge + viewer count + follow + share, a reactions
 *             bar, and a live chat panel fed by the Hasura subscription.
 * Inputs:     stream (Stream), viewerCount, messages, selfUserId, onSend/onReact/onFollow/onShare.
 * Outputs:    Full-height stream surface (player + chat).
 * Constraints:Presentational + local draft state. Real-time data arrives via subscription in
 *             the page; media playback attaches a real player when LiveKit/HLS lands (BFF).
 * SOT:        F-NCHAT-VITE-STREAM-PLAYER-01
 */
import { useState } from 'react'
import { Heart, ThumbsUp, Smile, Flame, Hand, Send, UserPlus, Share2, Radio } from 'lucide-react'
import { getInitials, pluralizeViewers } from './format'
import type { Stream, StreamChatMessage, StreamReactionType } from './types'

const REACTIONS: ReadonlyArray<{ type: StreamReactionType; Icon: typeof Heart }> = [
  { type: 'heart', Icon: Heart },
  { type: 'thumbsup', Icon: ThumbsUp },
  { type: 'smile', Icon: Smile },
  { type: 'fire', Icon: Flame },
  { type: 'clap', Icon: Hand },
]

interface Props {
  stream: Stream
  viewerCount: number
  messages: readonly StreamChatMessage[]
  reactionCounts: Readonly<Record<StreamReactionType, number>>
  onSend: (message: string) => void
  onReact: (type: StreamReactionType) => void
  onFollow: () => void
  onShare: () => void
}

export function StreamPlayer({
  stream,
  viewerCount,
  messages,
  reactionCounts,
  onSend,
  onReact,
  onFollow,
  onShare,
}: Props) {
  const [draft, setDraft] = useState('')

  const submit = () => {
    const text = draft.trim()
    if (!text) return
    onSend(text)
    setDraft('')
  }

  return (
    <div className="flex h-full min-h-[70vh] flex-col bg-slate-950 text-white lg:flex-row">
      {/* Player + meta */}
      <div className="flex flex-1 flex-col">
        <div className="relative aspect-video w-full bg-black">
          {stream.stream_url ? (
            <video
              className="h-full w-full"
              src={stream.stream_url}
              poster={stream.thumbnail_url ?? undefined}
              controls
              autoPlay
              playsInline
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-500">
              {stream.is_live ? 'Connecting to live stream...' : 'Stream is offline'}
            </div>
          )}
          {stream.is_live && (
            <span className="absolute start-3 top-3 inline-flex items-center gap-1 rounded bg-red-600 px-2 py-0.5 text-xs font-semibold">
              <Radio className="h-3 w-3" /> LIVE
            </span>
          )}
          <span className="absolute end-3 top-3 rounded bg-black/60 px-2 py-0.5 text-xs">
            {pluralizeViewers(viewerCount)}
          </span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-800 p-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-700 text-sm font-semibold">
              {getInitials(stream.streamer.name)}
            </div>
            <div className="min-w-0">
              <h1 className="truncate font-semibold">{stream.title}</h1>
              <p className="truncate text-sm text-slate-400">{stream.streamer.name}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onFollow}
              className="inline-flex items-center gap-1 rounded bg-sky-600 px-3 py-1.5 text-sm hover:bg-sky-700"
            >
              <UserPlus className="h-4 w-4" /> Follow
            </button>
            <button
              type="button"
              aria-label="share stream"
              onClick={onShare}
              className="inline-flex h-8 w-8 items-center justify-center rounded text-slate-300 hover:bg-slate-800"
            >
              <Share2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Reactions */}
        <div className="flex items-center gap-2 p-4">
          {REACTIONS.map(({ type, Icon }) => (
            <button
              key={type}
              type="button"
              aria-label={`react ${type}`}
              onClick={() => onReact(type)}
              className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-3 py-1.5 text-sm hover:bg-slate-700"
            >
              <Icon className="h-4 w-4" />
              <span className="tabular-nums">{reactionCounts[type]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Chat */}
      <aside className="flex w-full flex-col border-slate-800 lg:w-80 lg:border-s">
        <div className="border-b border-slate-800 p-3 text-sm font-medium text-slate-300">Live chat</div>
        <ul className="flex-1 space-y-2 overflow-y-auto p-3">
          {messages.length === 0 ? (
            <li className="text-sm text-slate-500">No messages yet. Say hello.</li>
          ) : (
            messages.map((m) => (
              <li key={m.id} className="text-sm">
                <span className="font-medium text-sky-400">{m.user_name}</span>{' '}
                <span className="text-slate-200">{m.message}</span>
              </li>
            ))
          )}
        </ul>
        <form
          className="flex items-center gap-2 border-t border-slate-800 p-3"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Send a message"
            aria-label="chat message"
            className="flex-1 rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            aria-label="send message"
            className="inline-flex h-9 w-9 items-center justify-center rounded bg-sky-600 hover:bg-sky-700"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </aside>
    </div>
  )
}
