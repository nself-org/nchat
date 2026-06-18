/**
 * Purpose:    Channel discovery / browse at "/channels/browse". Ported from legacy
 *             frontend/src/app/channels/browse/page.tsx (ChannelBrowser + ChannelDirectory).
 *             Header, aggregate stats row, debounced search, a responsive channel grid, and
 *             join/leave actions — backed by real Hasura np_channels reads + membership
 *             mutations (the legacy version used a mock useChannelDiscovery hook).
 * Inputs:     BrowseChannels query (urql, search + pagination); Join/Leave mutations.
 * Outputs:    Browse screen; grid wrapped in AsyncScreen (7 states); Load-more pagination.
 * Constraints:next/* removed. HASURA-direct list + N-2-S2a membership mutations. Joined-set
 *             read (own memberships) lands with N-2-S2f; until then a session-local joined
 *             set tracks optimistic join/leave so the UI stays faithful and degrades cleanly.
 * SOT:        F-NCHAT-VITE-ROUTE — /channels/browse
 */
import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from 'urql'
import { Search } from 'lucide-react'
import { AsyncScreen, Button, Input } from '@nself/ui'
import {
  BROWSE_CHANNELS,
  JOIN_CHANNEL,
  LEAVE_CHANNEL,
  resultFromUrql,
  type ChannelRow,
} from '@/components/chat/graphql'
import { ChannelCard } from '@/components/chat/ChannelCard'

const PAGE_SIZE = 50

interface BrowseData {
  np_channels: ReadonlyArray<ChannelRow>
  total: { aggregate: { count: number } | null }
  publicCount: { aggregate: { count: number } | null }
  privateCount: { aggregate: { count: number; sum: { member_count: number | null } | null } | null }
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <div className="text-2xl font-bold text-slate-100">{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  )
}

export default function ChannelsBrowsePage() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [limit, setLimit] = useState(PAGE_SIZE)
  const [joined, setJoined] = useState<ReadonlySet<string>>(new Set())
  const [busyId, setBusyId] = useState<string | null>(null)

  // Debounce the search input → ilike pattern.
  useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => clearTimeout(id)
  }, [searchInput])

  const ilike = search ? `%${search}%` : '%%'

  const [{ data, fetching, error }, refetch] = useQuery<BrowseData>({
    query: BROWSE_CHANNELS,
    variables: { limit, offset: 0, search: ilike },
    requestPolicy: 'cache-and-network',
  })

  const [, joinChannel] = useMutation(JOIN_CHANNEL)
  const [, leaveChannel] = useMutation(LEAVE_CHANNEL)

  const result = resultFromUrql(fetching, error, data)
  const total = data?.total.aggregate?.count ?? 0
  const hasMore = (data?.np_channels.length ?? 0) < total

  const stats = useMemo(() => {
    if (!data) return null
    const pub = data.publicCount.aggregate?.count ?? 0
    const priv = data.privateCount.aggregate?.count ?? 0
    const members = data.privateCount.aggregate?.sum?.member_count ?? 0
    return { total, pub, priv, members }
  }, [data, total])

  async function handleJoin(id: string) {
    setBusyId(id)
    const res = await joinChannel({ channelId: id })
    if (!res.error) setJoined((s) => new Set(s).add(id))
    setBusyId(null)
  }

  async function handleLeave(id: string) {
    setBusyId(id)
    const res = await leaveChannel({ channelId: id })
    if (!res.error) {
      setJoined((s) => {
        const next = new Set(s)
        next.delete(id)
        return next
      })
    }
    setBusyId(null)
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* Header */}
      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-slate-100">Browse Channels</h1>
        <p className="text-slate-400">Discover and join channels that match your interests.</p>
      </header>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Total Channels" value={stats.total} />
          <StatCard label="Public" value={stats.pub} />
          <StatCard label="Private" value={stats.priv} />
          <StatCard label="Members" value={stats.members} />
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <Input
          label="Search channels"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search channels…"
          className="pl-9"
        />
      </div>

      {/* Grid */}
      <AsyncScreen<BrowseData>
        result={result}
        onRetry={() => refetch({ requestPolicy: 'network-only' })}
        emptyCheck={(d) => (d?.np_channels?.length ?? 0) === 0}
        slots={{
          empty: (
            <div className="py-16 text-center" role="status">
              <Search className="mx-auto mb-3 h-10 w-10 text-slate-600" />
              <p className="text-sm text-slate-400">
                {search ? `No channels match “${search}”.` : 'No channels to browse yet.'}
              </p>
            </div>
          ),
        }}
        renderData={(d) => (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {d.np_channels.map((ch) => (
                <ChannelCard
                  key={ch.id}
                  channel={ch}
                  joined={joined.has(ch.id)}
                  busy={busyId === ch.id}
                  onJoin={handleJoin}
                  onLeave={handleLeave}
                />
              ))}
            </div>
            {hasMore && (
              <div className="flex justify-center pt-6">
                <Button
                  variant="secondary"
                  loading={fetching}
                  onClick={() => setLimit((n) => n + PAGE_SIZE)}
                >
                  Load more channels
                </Button>
              </div>
            )}
          </>
        )}
      />
    </div>
  )
}
