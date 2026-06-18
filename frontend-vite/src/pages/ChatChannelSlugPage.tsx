/**
 * Purpose:    Channel conversation view at "/chat/channel/:slug". Ported from legacy
 *             frontend/src/app/chat/channel/[slug]/page.tsx — channel header (name, topic,
 *             mute/star, member toggle), message list, pinned-messages toggle, member panel,
 *             and a message composer. Replaces the legacy mock channel/message fixtures with
 *             real Hasura reads (np_channels by slug + np_messages by channel).
 * Inputs:     useParams() slug; ChannelBySlug + ChannelMessages queries (urql).
 * Outputs:    Channel screen + optional member panel; both reads wrapped in AsyncScreen.
 *             Unknown slug → AsyncScreen empty (legacy notFound() equivalent within the SPA).
 * Constraints:next/navigation use()/notFound() → useParams + empty state. Message SEND is a
 *             backend Action (N-2-S3g) not yet live; the composer is rendered but disabled
 *             with a pending hint rather than stubbed away. Mute/star are local-optimistic
 *             toggles (channel-pref Action pending). HASURA-direct reads only (N-2-S2a/N-2-S2e).
 * SOT:        F-NCHAT-VITE-ROUTE — /chat/channel/:slug
 */
import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from 'urql'
import { Bell, BellOff, Hash, Lock, Pin, Star, Users } from 'lucide-react'
import { AsyncScreen, Button } from '@nself/ui'
import {
  CHANNEL_BY_SLUG,
  CHANNEL_MESSAGES,
  resultFromUrql,
  type ChannelRow,
  type MessageRow as MessageRowData,
} from '@/components/chat/graphql'
import { MessageRow } from '@/components/chat/MessageRow'
import { MessageComposer } from '@/components/chat/MessageComposer'
import { MemberPanel, type MemberSummary } from '@/components/chat/MemberPanel'

interface ChannelData {
  np_channels: ReadonlyArray<ChannelRow>
}
interface MessagesData {
  np_messages: ReadonlyArray<MessageRowData>
}

function deriveMembers(messages: ReadonlyArray<MessageRowData>): MemberSummary[] {
  const map = new Map<string, MemberSummary>()
  for (const m of messages) {
    if (!m.user || m.user.id === 'system' || map.has(m.user.id)) continue
    map.set(m.user.id, {
      id: m.user.id,
      name: m.user.display_name || m.user.username || 'Unknown',
      avatarUrl: m.user.avatar_url,
      role: m.user.role,
    })
  }
  return Array.from(map.values())
}

export default function ChatChannelSlugPage() {
  const { slug = '' } = useParams<{ slug: string }>()

  const [showMembers, setShowMembers] = useState(false)
  const [showPinned, setShowPinned] = useState(false)
  const [muted, setMuted] = useState(false)
  const [starred, setStarred] = useState(false)

  const [channelQuery, refetchChannel] = useQuery<ChannelData>({
    query: CHANNEL_BY_SLUG,
    variables: { slug },
    requestPolicy: 'cache-and-network',
  })
  const channel = channelQuery.data?.np_channels?.[0]

  const [messagesQuery, refetchMessages] = useQuery<MessagesData>({
    query: CHANNEL_MESSAGES,
    variables: { channelId: channel?.id ?? '' },
    requestPolicy: 'cache-and-network',
    pause: !channel?.id,
  })

  const channelResult = resultFromUrql(
    channelQuery.fetching,
    channelQuery.error,
    channelQuery.data,
  )
  const messages = messagesQuery.data?.np_messages ?? []
  const members = useMemo(() => deriveMembers(messages), [messages])
  const pinned = useMemo(() => messages.filter((m) => m.is_pinned), [messages])

  return (
    <AsyncScreen<ChannelData>
      result={channelResult}
      onRetry={() => refetchChannel({ requestPolicy: 'network-only' })}
      emptyCheck={(d) => (d?.np_channels?.length ?? 0) === 0}
      slots={{
        empty: (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-16 text-center">
            <Hash className="h-10 w-10 text-slate-600" />
            <h1 className="text-lg font-semibold text-slate-200">Channel not found</h1>
            <p className="text-sm text-slate-400">
              No channel matches <code className="text-slate-500">#{slug}</code>.
            </p>
          </div>
        ),
      }}
      renderData={() => {
        if (!channel) return null
        const isPrivate = channel.type === 'private'
        return (
          <div className="flex h-full">
            {/* Main column */}
            <div className="flex min-w-0 flex-1 flex-col">
              {/* Channel header */}
              <header className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                <div className="flex min-w-0 items-center gap-2">
                  {isPrivate ? (
                    <Lock className="h-4 w-4 shrink-0 text-slate-400" />
                  ) : (
                    <Hash className="h-4 w-4 shrink-0 text-slate-400" />
                  )}
                  <div className="min-w-0">
                    <h1 className="truncate font-semibold text-slate-100">{channel.name}</h1>
                    {channel.topic && (
                      <p className="truncate text-xs text-slate-400">{channel.topic}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setMuted((v) => !v)}
                    aria-label={muted ? 'Unmute channel' : 'Mute channel'}
                    aria-pressed={muted}
                  >
                    {muted ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setStarred((v) => !v)}
                    aria-label={starred ? 'Unstar channel' : 'Star channel'}
                    aria-pressed={starred}
                  >
                    <Star
                      className={'h-4 w-4 ' + (starred ? 'fill-amber-400 text-amber-400' : '')}
                    />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowPinned((v) => !v)
                      setShowMembers(false)
                    }}
                    aria-label="Pinned messages"
                    aria-pressed={showPinned}
                  >
                    <Pin className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowMembers((v) => !v)
                      setShowPinned(false)
                    }}
                    aria-label="Member list"
                    aria-pressed={showMembers}
                  >
                    <Users className="h-4 w-4" />
                  </Button>
                </div>
              </header>

              {/* Pinned banner */}
              {showPinned && (
                <div className="border-b border-slate-800 bg-slate-900/60 p-3">
                  <h2 className="mb-2 text-xs font-semibold uppercase text-slate-500">
                    Pinned messages ({pinned.length})
                  </h2>
                  {pinned.length === 0 ? (
                    <p className="text-sm text-slate-500">No pinned messages yet.</p>
                  ) : (
                    <div className="space-y-1">
                      {pinned.map((m) => (
                        <MessageRow key={m.id} message={m} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Message list */}
              <div className="flex-1 overflow-y-auto p-3">
                <AsyncScreen<MessagesData>
                  result={resultFromUrql(
                    messagesQuery.fetching,
                    messagesQuery.error,
                    messagesQuery.data,
                  )}
                  onRetry={() => refetchMessages({ requestPolicy: 'network-only' })}
                  emptyCheck={(d) => (d?.np_messages?.length ?? 0) === 0}
                  slots={{
                    empty: (
                      <div className="py-12 text-center text-sm text-slate-500">
                        Welcome to #{channel.name}! This is the start of the channel.
                      </div>
                    ),
                  }}
                  renderData={(d) => (
                    <div className="space-y-0.5">
                      {d.np_messages.map((m) => (
                        <MessageRow key={m.id} message={m} />
                      ))}
                    </div>
                  )}
                />
              </div>

              {/* Composer — send Action (N-2-S3g) not yet live, so disabled with a hint */}
              <div>
                <MessageComposer
                  disabled
                  placeholder="Sending is enabled once the message Action is live…"
                  onSend={() => {
                    /* wired to message-send Action in N-2-S3g */
                  }}
                />
                <p className="px-3 pb-2 text-xs text-slate-600">
                  Reading is live via Hasura. Sending activates with the backend message Action.
                </p>
              </div>
            </div>

            {/* Member panel */}
            {showMembers && (
              <MemberPanel members={members} onClose={() => setShowMembers(false)} />
            )}
          </div>
        )
      }}
    />
  )
}
