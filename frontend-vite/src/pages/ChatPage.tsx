/**
 * Purpose:    Chat home dashboard at "/chat". Ported from legacy frontend/src/app/chat/page.tsx.
 *             Greets the signed-in user, shows quick-action cards (browse, create channel,
 *             start DM, search) and a real Recent Activity list driven by Hasura np_channels
 *             (replacing the legacy hardcoded mock array).
 * Inputs:     useAuth() (greeting name + owner setup CTA); RecentChannels query (urql).
 * Outputs:    Dashboard screen; Recent Activity wrapped in AsyncScreen (7 states).
 * Constraints:Client-only. next/link → <Link>, useRouter → none needed; create-channel /
 *             create-dm / search modals from the legacy page depend on backend Actions not
 *             yet live (N-2-S3) — their quick actions navigate rather than being stubbed.
 *             HASURA-direct read only (N-2-S2a).
 * SOT:        F-NCHAT-VITE-ROUTE — /chat
 */
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from 'urql'
import {
  ArrowRight,
  Clock,
  Compass,
  Hash,
  MessageSquare,
  Plus,
  Search,
  Sparkles,
  Users,
} from 'lucide-react'
import { AsyncScreen, Button, Card } from '@nself/ui'
import { useAuth } from '@nself/auth-core'
import { RECENT_CHANNELS, resultFromUrql, type ChannelRow } from '@/components/chat/graphql'
import { relativeTime } from '@/components/chat/relative-time'

interface RecentData {
  np_channels: ReadonlyArray<ChannelRow>
}

interface QuickActionProps {
  icon: React.ReactNode
  title: string
  description: string
  to: string
}

function QuickAction({ icon, title, description, to }: QuickActionProps) {
  return (
    <Link to={to} aria-label={title}>
      <Card className="group h-full cursor-pointer p-4 transition-colors hover:border-sky-500/40 hover:bg-slate-800/40">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400">
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="flex items-center gap-2 font-medium text-slate-100">
              {title}
              <ArrowRight className="h-4 w-4 -translate-x-2 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
            </h3>
            <p className="mt-1 text-sm text-slate-400">{description}</p>
          </div>
        </div>
      </Card>
    </Link>
  )
}

export default function ChatPage() {
  const auth = useAuth()
  const firstName =
    auth.status === 'authenticated' ? auth.user.displayName.split(' ')[0] || 'there' : 'there'

  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }, [])

  const [{ data, fetching, error }, refetch] = useQuery<RecentData>({
    query: RECENT_CHANNELS,
    variables: { limit: 5 },
    requestPolicy: 'cache-and-network',
  })
  const result = resultFromUrql(fetching, error, data)

  return (
    <div className="mx-auto w-full max-w-4xl">
      {/* Welcome header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-100">
          {greeting}, {firstName}!
        </h1>
        <p className="mt-2 text-slate-400">Welcome to ɳChat. What would you like to do today?</p>
      </header>

      {/* Quick actions */}
      <section className="mb-8">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-200">
          <Sparkles className="h-5 w-5 text-sky-400" />
          Quick Actions
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <QuickAction
            icon={<Compass className="h-5 w-5" />}
            title="Browse Channels"
            description="Discover and join channels that interest you"
            to="/channels/browse"
          />
          <QuickAction
            icon={<Plus className="h-5 w-5" />}
            title="Create Channel"
            description="Start a new channel for your team"
            to="/channels/browse"
          />
          <QuickAction
            icon={<MessageSquare className="h-5 w-5" />}
            title="Start a Conversation"
            description="Send a direct message to a teammate"
            to="/people"
          />
          <QuickAction
            icon={<Search className="h-5 w-5" />}
            title="Search Messages"
            description="Find messages, files, or conversations"
            to="/search"
          />
        </div>
      </section>

      {/* Recent activity — real Hasura data via AsyncScreen */}
      <section className="mb-8">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-200">
          <Clock className="h-5 w-5 text-slate-400" />
          Recent Activity
        </h2>
        <Card className="p-2">
          <AsyncScreen<RecentData>
            result={result}
            onRetry={() => refetch({ requestPolicy: 'network-only' })}
            emptyCheck={(d) => (d?.np_channels?.length ?? 0) === 0}
            slots={{
              empty: (
                <div className="py-8 text-center" role="status">
                  <MessageSquare className="mx-auto mb-3 h-10 w-10 text-slate-500" />
                  <p className="text-sm text-slate-400">
                    No recent activity yet. Start by joining a channel!
                  </p>
                </div>
              ),
            }}
            renderData={(d) => (
              <div className="divide-y divide-slate-800">
                {d.np_channels.map((ch) => (
                  <Link
                    key={ch.id}
                    to={`/chat/channel/${ch.slug}`}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-slate-800/40"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-800">
                      <Hash className="h-4 w-4 text-slate-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-medium text-slate-100">{ch.name}</span>
                        {ch.last_message_at && (
                          <span className="shrink-0 text-xs text-slate-500">
                            {relativeTime(ch.last_message_at)}
                          </span>
                        )}
                      </div>
                      {ch.last_message_preview && (
                        <p className="truncate text-sm text-slate-400">{ch.last_message_preview}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          />
        </Card>
      </section>

      {/* Owner setup CTA (legacy parity — shown to owners) */}
      {auth.status === 'authenticated' && auth.user.roles.includes('owner') && (
        <div className="mb-8 rounded-lg border-2 border-dashed border-sky-500/30 bg-sky-500/5 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-500/10">
              <Sparkles className="h-6 w-6 text-sky-400" />
            </div>
            <div className="flex-1">
              <h3 className="mb-1 text-lg font-semibold text-slate-100">Complete Your Setup</h3>
              <p className="mb-4 text-slate-400">
                Finish setting up your workspace to customize your chat experience.
              </p>
              <Link to="/setup">
                <Button>Continue Setup</Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Team overview (legacy parity — counts derived from the channel list) */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-200">
          <Users className="h-5 w-5 text-slate-400" />
          Team Overview
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="p-4">
            <p className="text-sm text-slate-400">Channels</p>
            <p className="text-2xl font-bold text-slate-100">{data?.np_channels?.length ?? '—'}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-slate-400">Members</p>
            <p className="text-2xl font-bold text-slate-100">
              {data?.np_channels?.reduce((n, c) => n + c.member_count, 0) ?? '—'}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-slate-400">Active Channels</p>
            <p className="text-2xl font-bold text-slate-100">
              {data?.np_channels?.filter((c) => !!c.last_message_at).length ?? '—'}
            </p>
          </Card>
        </div>
      </section>
    </div>
  )
}
