'use client'

import dynamic from 'next/dynamic'
import { useState, useMemo } from 'react'
import { useQuery } from '@apollo/client'
import {
  BarChart3,
  TrendingUp,
  Users,
  MessageSquare,
  Hash,
  Calendar,
  Download,
  RefreshCw,
} from 'lucide-react'
import { AdminLayout } from '@/components/admin/admin-layout'
import { StatsCard, StatsGrid } from '@/components/admin/stats-card'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChartSkeleton } from '@/components/ui/loading-skeletons'
import { useAdminAccess } from '@/lib/admin/use-admin'
import { GET_ANALYTICS_DATA } from '@/graphql/admin'

// Lazy load chart components
const MessagesOverTimeChart = dynamic(
  () =>
    import('@/components/admin/analytics-charts').then((mod) => ({
      default: mod.MessagesOverTimeChart,
    })),
  { loading: () => <ChartSkeleton />, ssr: false }
)

const PeakActivityChart = dynamic(
  () =>
    import('@/components/admin/analytics-charts').then((mod) => ({
      default: mod.PeakActivityChart,
    })),
  { loading: () => <ChartSkeleton />, ssr: false }
)

const UserGrowthChart = dynamic(
  () =>
    import('@/components/admin/analytics-charts').then((mod) => ({ default: mod.UserGrowthChart })),
  { loading: () => <ChartSkeleton />, ssr: false }
)

const RoleDistributionChart = dynamic(
  () =>
    import('@/components/admin/analytics-charts').then((mod) => ({
      default: mod.RoleDistributionChart,
    })),
  { loading: () => <ChartSkeleton />, ssr: false }
)

const DailyActiveUsersChart = dynamic(
  () =>
    import('@/components/admin/analytics-charts').then((mod) => ({
      default: mod.DailyActiveUsersChart,
    })),
  { loading: () => <ChartSkeleton />, ssr: false }
)

const PopularChannelsChart = dynamic(
  () =>
    import('@/components/admin/analytics-charts').then((mod) => ({
      default: mod.PopularChannelsChart,
    })),
  { loading: () => <ChartSkeleton />, ssr: false }
)

// Role color mapping for display
const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-yellow-500',
  admin: 'bg-red-500',
  moderator: 'bg-blue-500',
  member: 'bg-green-500',
  guest: 'bg-gray-500',
}

export default function AnalyticsPage() {
  const { canViewAnalytics } = useAdminAccess()
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d')

  const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90

  // Compute date range for GraphQL query
  const { startDate, endDate } = useMemo(() => {
    const end = new Date()
    const start = new Date(end)
    start.setDate(start.getDate() - days)
    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    }
  }, [days])

  const { data: analyticsData, loading: isLoading, refetch } = useQuery(GET_ANALYTICS_DATA, {
    variables: { startDate, endDate },
    skip: !canViewAnalytics,
    fetchPolicy: 'cache-and-network',
  })

  // Aggregate messages and signups per day from real data
  const chartData = useMemo(() => {
    if (!analyticsData) return []

    const byDay: Record<string, { date: string; users: number; messages: number; activeUsers: number }> = {}

    // Bucket new user signups by day
    for (const user of analyticsData.user_signups ?? []) {
      const day = (user.created_at as string).split('T')[0]
      if (!byDay[day]) byDay[day] = { date: day, users: 0, messages: 0, activeUsers: 0 }
      byDay[day].users += 1
    }

    // Bucket messages by day
    for (const msg of analyticsData.messages ?? []) {
      const day = (msg.created_at as string).split('T')[0]
      if (!byDay[day]) byDay[day] = { date: day, users: 0, messages: 0, activeUsers: 0 }
      byDay[day].messages += 1
    }

    // Fill in all days in range (so chart has continuous x-axis)
    const result: { date: string; users: number; messages: number; activeUsers: number }[] = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      result.push(byDay[key] ?? { date: key, users: 0, messages: 0, activeUsers: 0 })
    }
    return result
  }, [analyticsData, days])

  // Calculate totals from real data
  const totals = useMemo(() => {
    const totalUsers = analyticsData?.user_signups?.length ?? 0
    const totalMessages = analyticsData?.messages?.length ?? 0
    const avgActiveUsers = chartData.length > 0
      ? Math.round(chartData.reduce((sum, d) => sum + d.activeUsers, 0) / chartData.length)
      : 0
    return { totalUsers, totalMessages, avgActiveUsers }
  }, [analyticsData, chartData])

  // Popular channels from real data
  const popularChannels = useMemo(() => {
    if (!analyticsData?.active_channels?.length) return []
    const channels = [...(analyticsData.active_channels as Array<{
      id: string
      name: string
      messages_aggregate: { aggregate: { count: number } }
      members_aggregate?: { aggregate: { count: number } }
    }>)]
    channels.sort((a, b) => b.messages_aggregate.aggregate.count - a.messages_aggregate.aggregate.count)
    const maxMessages = channels[0]?.messages_aggregate.aggregate.count || 1
    return channels.slice(0, 5).map((ch) => ({
      name: ch.name,
      messages: ch.messages_aggregate.aggregate.count,
      members: ch.members_aggregate?.aggregate.count ?? 0,
      percentage: Math.round((ch.messages_aggregate.aggregate.count / maxMessages) * 100),
    }))
  }, [analyticsData])

  // Role distribution from real data
  const roleDistribution = useMemo(() => {
    if (!analyticsData?.role_distribution?.length) return []
    return (analyticsData.role_distribution as Array<{
      id: string
      name: string
      users_aggregate: { aggregate: { count: number } }
    }>).map((role) => ({
      role: role.name.charAt(0).toUpperCase() + role.name.slice(1),
      count: role.users_aggregate.aggregate.count,
      color: ROLE_COLORS[role.name.toLowerCase()] ?? 'bg-gray-500',
    }))
  }, [analyticsData])

  // Peak activity by hour — derived from messages in the window
  const peakHours = useMemo(() => {
    const hourBuckets: Record<number, number> = {}
    for (const msg of analyticsData?.messages ?? []) {
      const h = new Date(msg.created_at as string).getHours()
      hourBuckets[h] = (hourBuckets[h] ?? 0) + 1
    }
    const HOUR_LABELS = [
      '12 AM','1 AM','2 AM','3 AM','4 AM','5 AM','6 AM','7 AM','8 AM','9 AM','10 AM','11 AM',
      '12 PM','1 PM','2 PM','3 PM','4 PM','5 PM','6 PM','7 PM','8 PM','9 PM','10 PM','11 PM',
    ]
    return Object.entries(hourBuckets)
      .map(([h, count]) => ({ hour: HOUR_LABELS[Number(h)], messages: count }))
      .sort((a, b) => HOUR_LABELS.indexOf(a.hour) - HOUR_LABELS.indexOf(b.hour))
  }, [analyticsData])

  const totalRoleCount = roleDistribution.reduce((sum, r) => sum + r.count, 0)

  const handleRefresh = () => {
    refetch()
  }

  const handleExport = () => {
    // Export as CSV from real data
    const rows = chartData.map((d) => `${d.date},${d.users},${d.messages}`)
    const csv = ['date,new_users,messages', ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analytics-${dateRange}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!canViewAnalytics) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <BarChart3 className="h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-xl font-semibold">Access Denied</h2>
          <p className="mt-2 text-muted-foreground">
            You do not have permission to view analytics.
          </p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold">
              <BarChart3 className="h-8 w-8" />
              Analytics
            </h1>
            <p className="text-muted-foreground">
              Track workspace activity, growth, and engagement
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as typeof dateRange)}>
              <SelectTrigger className="w-[140px]">
                <Calendar className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Overview Stats */}
        <StatsGrid columns={4}>
          <StatsCard
            title="New Users"
            value={totals.totalUsers}
            description={`In the last ${days} days`}
            icon={<Users className="h-4 w-4" />}
            trend={{ value: 12, direction: 'up', label: 'vs previous period' }}
          />
          <StatsCard
            title="Messages Sent"
            value={totals.totalMessages.toLocaleString()}
            description={`In the last ${days} days`}
            icon={<MessageSquare className="h-4 w-4" />}
            trend={{ value: 8, direction: 'up', label: 'vs previous period' }}
          />
          <StatsCard
            title="Avg. Active Users"
            value={totals.avgActiveUsers}
            description="Daily average"
            icon={<TrendingUp className="h-4 w-4" />}
            trend={{ value: 5, direction: 'up', label: 'vs previous period' }}
          />
          <StatsCard
            title="Total Channels"
            value={24}
            description="Active channels"
            icon={<Hash className="h-4 w-4" />}
          />
        </StatsGrid>

        {/* Charts Section */}
        <Tabs defaultValue="activity" className="space-y-4">
          <TabsList>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="channels">Channels</TabsTrigger>
          </TabsList>

          <TabsContent value="activity" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <MessagesOverTimeChart data={chartData} />
              <PeakActivityChart data={peakHours} />
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <UserGrowthChart data={chartData} />
              <RoleDistributionChart data={roleDistribution} totalCount={totalRoleCount} />
            </div>
            <DailyActiveUsersChart data={chartData} />
          </TabsContent>

          <TabsContent value="channels" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <PopularChannelsChart data={popularChannels} />

              {/* Channel Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Channel Statistics</CardTitle>
                  <CardDescription>Overview of channel activity</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Public Channels</p>
                        <p className="text-2xl font-bold">18</p>
                      </div>
                      <Hash className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Private Channels</p>
                        <p className="text-2xl font-bold">6</p>
                      </div>
                      <Hash className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Avg. Messages/Channel</p>
                        <p className="text-2xl font-bold">535</p>
                      </div>
                      <MessageSquare className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Avg. Members/Channel</p>
                        <p className="text-2xl font-bold">42</p>
                      </div>
                      <Users className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  )
}
