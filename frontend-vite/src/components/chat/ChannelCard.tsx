/**
 * Purpose:    Channel summary card used in the browse/discovery grid. Ported from the
 *             legacy ChannelBrowser card: name, topic/description, member count, public/
 *             private badge, and a Join/Leave action.
 * Inputs:     channel (ChannelRow), joined flag, busy flag, onJoin/onLeave callbacks.
 * Outputs:    A card with a navigable title (Link to the channel) + membership action.
 * Constraints:Presentational. Membership mutation is owned by the parent (N-2-S2a).
 * SOT:        F-NCHAT-VITE-CHAT-CHANNELCARD-01
 */
import { Link } from 'react-router-dom'
import { Hash, Lock, Users } from 'lucide-react'
import { Button, Card } from '@nself/ui'
import type { ChannelRow } from '@/components/chat/graphql'

interface Props {
  channel: ChannelRow
  joined: boolean
  busy?: boolean
  onJoin: (id: string) => void
  onLeave: (id: string) => void
}

export function ChannelCard({ channel, joined, busy = false, onJoin, onLeave }: Props) {
  const isPrivate = channel.type === 'private'
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <Link
          to={`/chat/channel/${channel.slug}`}
          className="flex min-w-0 items-center gap-2 font-medium text-slate-100 hover:text-sky-400"
        >
          {isPrivate ? (
            <Lock className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          ) : (
            <Hash className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          )}
          <span className="truncate">{channel.name}</span>
        </Link>
        <span className="shrink-0 rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
          {isPrivate ? 'Private' : 'Public'}
        </span>
      </div>

      <p className="line-clamp-2 min-h-[2.5rem] text-sm text-slate-400">
        {channel.topic || channel.description || 'No description'}
      </p>

      <div className="mt-auto flex items-center justify-between">
        <span className="flex items-center gap-1 text-xs text-slate-500">
          <Users className="h-3.5 w-3.5" aria-hidden />
          {channel.member_count} {channel.member_count === 1 ? 'member' : 'members'}
        </span>
        <Button
          variant={joined ? 'secondary' : 'primary'}
          disabled={busy}
          onClick={() => (joined ? onLeave(channel.id) : onJoin(channel.id))}
        >
          {joined ? 'Leave' : 'Join'}
        </Button>
      </div>
    </Card>
  )
}
