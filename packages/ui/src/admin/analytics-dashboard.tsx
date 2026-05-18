/**
 * AnalyticsDashboard — injectable, no external deps, canvas sparklines.
 *
 * @module admin/analytics-dashboard
 */

'use client'

import * as React from 'react'
import { cn } from '../lib/utils'
import type { AnalyticsSummary, AnalyticsSeries } from './types'

// ============================================================================
// Adapter
// ============================================================================

export interface AnalyticsDashboardAdapter {
  summary: AnalyticsSummary
  messageSeries?: AnalyticsSeries
  userSeries?: AnalyticsSeries
  isLoading?: boolean
  dateRange?: '7d' | '30d' | '90d'
  onDateRangeChange?: (range: '7d' | '30d' | '90d') => void
}

export interface AnalyticsDashboardProps {
  adapter: AnalyticsDashboardAdapter
  className?: string
}

// ============================================================================
// Helpers
// ============================================================================

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return `${n}`
}

function formatBytes(b: number): string {
  if (b < 1073741824) return `${(b / 1048576).toFixed(1)} MB`
  return `${(b / 1073741824).toFixed(2)} GB`
}

// ============================================================================
// Sparkline canvas chart
// ============================================================================

interface SparklineProps {
  data: number[]
  color?: string
  height?: number
}

function Sparkline({ data, color = '#3b82f6', height = 40 }: SparklineProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || data.length < 2) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = canvas.width
    const h = canvas.height
    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1

    ctx.clearRect(0, 0, w, h)

    // Fill under the line
    ctx.beginPath()
    data.forEach((v, i) => {
      const x = (i / (data.length - 1)) * w
      const y = h - ((v - min) / range) * (h - 4) - 2
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.lineTo(w, h)
    ctx.lineTo(0, h)
    ctx.closePath()
    ctx.fillStyle = color + '22'
    ctx.fill()

    // Line
    ctx.beginPath()
    data.forEach((v, i) => {
      const x = (i / (data.length - 1)) * w
      const y = h - ((v - min) / range) * (h - 4) - 2
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.strokeStyle = color
    ctx.lineWidth = 1.5
    ctx.stroke()
  }, [data, color])

  return <canvas ref={canvasRef} width={120} height={height} className="w-full" style={{ height }} />
}

// ============================================================================
// StatCard
// ============================================================================

interface StatCardProps {
  label: string
  value: string
  sub?: string
  sparklineData?: number[]
  sparklineColor?: string
}

function StatCard({ label, value, sub, sparklineData, sparklineColor }: StatCardProps) {
  return (
    <div className="rounded-xl border bg-card p-4 flex flex-col gap-2">
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-bold tracking-tight">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      {sparklineData && sparklineData.length >= 2 && (
        <Sparkline data={sparklineData} color={sparklineColor ?? '#3b82f6'} height={36} />
      )}
    </div>
  )
}

// ============================================================================
// AnalyticsDashboard
// ============================================================================

export function AnalyticsDashboard({ adapter, className }: AnalyticsDashboardProps) {
  const { summary, messageSeries, userSeries, isLoading, dateRange = '7d', onDateRangeChange } = adapter

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center py-16 text-muted-foreground', className)}>
        <svg className="h-5 w-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" /></svg>
        Loading analytics…
      </div>
    )
  }

  const msgDataPoints = messageSeries?.data.map((d) => d.value)
  const userDataPoints = userSeries?.data.map((d) => d.value)

  return (
    <div className={cn('space-y-6', className)}>
      {/* Date range selector */}
      {onDateRangeChange && (
        <div className="flex items-center gap-1">
          {(['7d', '30d', '90d'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onDateRangeChange(r)}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                dateRange === r ? 'bg-primary text-primary-foreground' : 'border hover:bg-muted text-muted-foreground'
              )}
            >
              {r}
            </button>
          ))}
        </div>
      )}

      {/* Stat grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Total users"
          value={formatNumber(summary.totalUsers)}
          sub={`${formatNumber(summary.activeUsersToday)} active today`}
          sparklineData={userDataPoints}
          sparklineColor="#6366f1"
        />
        <StatCard
          label="Active this week"
          value={formatNumber(summary.activeUsersWeek)}
          sub="unique users"
          sparklineData={userDataPoints}
          sparklineColor="#6366f1"
        />
        <StatCard
          label="Messages today"
          value={formatNumber(summary.messagesToday)}
          sub={`${formatNumber(summary.messagesWeek)} this week`}
          sparklineData={msgDataPoints}
          sparklineColor="#3b82f6"
        />
        <StatCard
          label="Storage used"
          value={formatBytes(summary.storageUsedBytes)}
          sub={summary.storageCapacityBytes ? `of ${formatBytes(summary.storageCapacityBytes)}` : undefined}
        />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border bg-card p-4 flex items-center gap-4">
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Total channels</div>
            <div className="text-xl font-bold mt-1">{formatNumber(summary.totalChannels)}</div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 flex items-center gap-4">
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Total messages</div>
            <div className="text-xl font-bold mt-1">{formatNumber(summary.totalMessages)}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
