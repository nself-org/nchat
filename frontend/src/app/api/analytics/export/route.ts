/**
 * POST /api/analytics/export
 *
 * Exports analytics data in various formats (CSV, JSON, XLSX)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAnalyticsAggregator } from '@/lib/analytics/analytics-aggregator'
import { logger } from '@/lib/logger'
import type {
  AnalyticsFilters,
  ExportFormat,
  AnalyticsSectionType,
  DashboardData,
} from '@/lib/analytics/analytics-types'

// CSV generation utilities
function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function generateCsvContent(data: Record<string, unknown>[], headers: string[]): string {
  const headerRow = headers.map((h) => escapeCsvValue(h)).join(',')
  const dataRows = data.map((row) =>
    headers
      .map((header) => {
        const value = row[header]
        if (value instanceof Date) return value.toISOString()
        if (typeof value === 'object') return JSON.stringify(value)
        return escapeCsvValue(value)
      })
      .join(',')
  )
  return [headerRow, ...dataRows].join('\n')
}

// Section data formatters
function formatSummaryData(dashboard: DashboardData): { data: Record<string, unknown>[]; headers: string[] } {
  const headers = ['category', 'metric', 'value', 'trend', 'changePercent']
  const summary = dashboard.summary
  const data: Record<string, unknown>[] = [
    { category: 'Messages', metric: 'Total', value: summary.messages.total.value, trend: summary.messages.total.trend, changePercent: summary.messages.total.changePercent },
    { category: 'Messages', metric: 'With Attachments', value: summary.messages.withAttachments.value, trend: '', changePercent: '' },
    { category: 'Messages', metric: 'With Reactions', value: summary.messages.withReactions.value, trend: '', changePercent: '' },
    { category: 'Messages', metric: 'In Threads', value: summary.messages.inThreads.value, trend: '', changePercent: '' },
    { category: 'Users', metric: 'Total', value: summary.users.totalUsers.value, trend: summary.users.totalUsers.trend, changePercent: summary.users.totalUsers.changePercent },
    { category: 'Users', metric: 'Active', value: summary.users.activeUsers.value, trend: '', changePercent: '' },
    { category: 'Users', metric: 'New', value: summary.users.newUsers.value, trend: '', changePercent: '' },
    { category: 'Channels', metric: 'Total', value: summary.channels.totalChannels.value, trend: summary.channels.totalChannels.trend, changePercent: summary.channels.totalChannels.changePercent },
    { category: 'Channels', metric: 'Active', value: summary.channels.activeChannels.value, trend: '', changePercent: '' },
    { category: 'Reactions', metric: 'Total', value: summary.reactions.totalReactions.value, trend: '', changePercent: '' },
    { category: 'Reactions', metric: 'Unique Emojis', value: summary.reactions.uniqueEmojis.value, trend: '', changePercent: '' },
    { category: 'Files', metric: 'Total', value: summary.files.totalFiles.value, trend: '', changePercent: '' },
    { category: 'Files', metric: 'Total Size (bytes)', value: summary.files.totalSize.value, trend: '', changePercent: '' },
    { category: 'Search', metric: 'Total Searches', value: summary.search.totalSearches.value, trend: '', changePercent: '' },
  ]
  return { data, headers }
}

function formatMessagesData(dashboard: DashboardData): { data: Record<string, unknown>[]; headers: string[] } {
  const headers = ['date', 'timestamp', 'messageCount']
  const data = dashboard.messageVolume.map((m) => ({
    date: m.timestamp.toLocaleDateString(),
    timestamp: m.timestamp.toISOString(),
    messageCount: m.count,
  }))
  return { data, headers }
}

function formatUsersData(dashboard: DashboardData): { data: Record<string, unknown>[]; headers: string[] } {
  const headers = ['userId', 'username', 'displayName', 'messageCount', 'reactionCount', 'engagementScore', 'lastActive']
  const data = dashboard.topUsers.map((u) => ({
    userId: u.userId,
    username: u.username,
    displayName: u.displayName,
    messageCount: u.messageCount,
    reactionCount: u.reactionCount,
    engagementScore: u.engagementScore,
    lastActive: u.lastActive.toISOString(),
  }))
  return { data, headers }
}

function formatChannelsData(dashboard: DashboardData): { data: Record<string, unknown>[]; headers: string[] } {
  const headers = ['channelId', 'channelName', 'type', 'memberCount', 'messageCount', 'activeUsers', 'engagementRate']
  const data = dashboard.channelActivity.map((c) => ({
    channelId: c.channelId,
    channelName: c.channelName,
    type: c.channelType,
    memberCount: c.memberCount,
    messageCount: c.messageCount,
    activeUsers: c.activeUsers,
    engagementRate: c.engagementRate.toFixed(2),
  }))
  return { data, headers }
}

function formatReactionsData(dashboard: DashboardData): { data: Record<string, unknown>[]; headers: string[] } {
  const headers = ['emoji', 'emojiName', 'count', 'percentage', 'uniqueUsers']
  const data = dashboard.reactions.map((r) => ({
    emoji: r.emoji,
    emojiName: r.emojiName,
    count: r.count,
    percentage: r.percentage.toFixed(2),
    uniqueUsers: r.users,
  }))
  return { data, headers }
}

function formatPeakHoursData(dashboard: DashboardData): { data: Record<string, unknown>[]; headers: string[] } {
  const headers = ['hour', 'hourLabel', 'messageCount', 'activeUsers']
  const data = dashboard.peakHours.map((p) => ({
    hour: p.hour,
    hourLabel: `${p.hour}:00`,
    messageCount: p.messageCount,
    activeUsers: p.activeUsers,
  }))
  return { data, headers }
}

function formatFilesData(dashboard: DashboardData): { data: Record<string, unknown>[]; headers: string[] } {
  const headers = ['date', 'timestamp', 'fileCount', 'totalSizeBytes']
  const data = dashboard.fileUploads.map((f) => ({
    date: f.timestamp.toLocaleDateString(),
    timestamp: f.timestamp.toISOString(),
    fileCount: f.count,
    totalSizeBytes: f.totalSize,
  }))
  return { data, headers }
}

function formatSearchData(dashboard: DashboardData): { data: Record<string, unknown>[]; headers: string[] } {
  const headers = ['query', 'count', 'averageResults', 'lastSearched']
  const data = dashboard.searchQueries.map((s) => ({
    query: s.query,
    count: s.count,
    averageResults: s.resultCount,
    lastSearched: s.lastSearched.toISOString(),
  }))
  return { data, headers }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      format = 'csv',
      sections = ['summary'],
      dateRange,
      granularity = 'day',
      fileName,
    } = body as {
      format: ExportFormat
      sections: AnalyticsSectionType[]
      dateRange: { start: string; end: string }
      granularity: 'hour' | 'day' | 'week' | 'month' | 'year'
      fileName?: string
    }

    // Build filters
    const aggregator = getAnalyticsAggregator()
    const filters: AnalyticsFilters = {
      dateRange: {
        start: new Date(dateRange.start),
        end: new Date(dateRange.end),
      },
      granularity,
    }

    // Fetch data
    const dashboardData = await aggregator.aggregateDashboardData(filters)

    // Generate export based on format
    const timestamp = new Date().toISOString().split('T')[0]
    const baseFileName = fileName || `analytics-export-${timestamp}`

    if (format === 'json') {
      // Return JSON with all requested sections
      const exportData: Record<string, unknown> = {
        generatedAt: new Date().toISOString(),
        dateRange: {
          start: dateRange.start,
          end: dateRange.end,
        },
        sections: {},
      }

      sections.forEach((section) => {
        switch (section) {
          case 'summary':
            (exportData.sections as Record<string, unknown>).summary = dashboardData.summary
            break
          case 'messages':
            (exportData.sections as Record<string, unknown>).messages = dashboardData.messageVolume
            break
          case 'users':
            (exportData.sections as Record<string, unknown>).users = dashboardData.topUsers
            break
          case 'channels':
            (exportData.sections as Record<string, unknown>).channels = dashboardData.channelActivity
            break
          case 'reactions':
            (exportData.sections as Record<string, unknown>).reactions = dashboardData.reactions
            break
          case 'peakHours':
            (exportData.sections as Record<string, unknown>).peakHours = dashboardData.peakHours
            break
          case 'files':
            (exportData.sections as Record<string, unknown>).files = dashboardData.fileUploads
            break
          case 'search':
            (exportData.sections as Record<string, unknown>).search = dashboardData.searchQueries
            break
        }
      })

      return new NextResponse(JSON.stringify(exportData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${baseFileName}.json"`,
        },
      })
    }

    if (format === 'csv') {
      // Generate CSV for each section, combined into one file with section headers
      const csvParts: string[] = []
      const sectionFormatters: Record<string, (d: DashboardData) => { data: Record<string, unknown>[]; headers: string[] }> = {
        summary: formatSummaryData,
        messages: formatMessagesData,
        users: formatUsersData,
        channels: formatChannelsData,
        reactions: formatReactionsData,
        peakHours: formatPeakHoursData,
        files: formatFilesData,
        search: formatSearchData,
      }

      sections.forEach((section, index) => {
        const formatter = sectionFormatters[section]
        if (formatter) {
          const { data, headers } = formatter(dashboardData)
          if (data.length > 0) {
            if (index > 0) csvParts.push('') // Add blank line between sections
            csvParts.push(`# ${section.toUpperCase()}`)
            csvParts.push(generateCsvContent(data, headers))
          }
        }
      })

      const csvContent = csvParts.join('\n')

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${baseFileName}.csv"`,
        },
      })
    }

    if (format === 'xlsx') {
      // Generate XLSX using exceljs library with multiple sheets
      try {
        const ExcelJS = await import('exceljs')
        const workbook = new ExcelJS.default.Workbook()

        const formattedSections: Record<string, { data: Record<string, unknown>[]; headers: string[] }> = {
          summary: formatSummaryData(dashboardData),
          messages: formatMessagesData(dashboardData),
          users: formatUsersData(dashboardData),
          channels: formatChannelsData(dashboardData),
          reactions: formatReactionsData(dashboardData),
          peakHours: formatPeakHoursData(dashboardData),
          files: formatFilesData(dashboardData),
          search: formatSearchData(dashboardData),
        }

        sections.forEach((section) => {
          const sectionData = formattedSections[section]
          if (sectionData && sectionData.data.length > 0) {
            const sheetName = section.charAt(0).toUpperCase() + section.slice(1)
            const worksheet = workbook.addWorksheet(sheetName)

            // Set column definitions with widths
            worksheet.columns = sectionData.headers.map((header) => ({
              header,
              key: header,
              width: Math.max(header.length, 12),
            }))

            // Add data rows
            sectionData.data.forEach((row) => {
              const rowData: Record<string, unknown> = {}
              sectionData.headers.forEach((header) => {
                const value = row[header]
                rowData[header] = value instanceof Date ? value.toISOString() : value
              })
              worksheet.addRow(rowData)
            })
          }
        })

        // Generate Excel buffer
        const xlsxBuffer = await workbook.xlsx.writeBuffer()

        return new NextResponse(Buffer.from(xlsxBuffer), {
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${baseFileName}.xlsx"`,
          },
        })
      } catch (error) {
        logger.error('XLSX export failed, falling back to JSON', error)
        // Fallback to JSON if xlsx library fails
        const xlsxData = {
          format: 'xlsx',
          message: 'XLSX generation failed, falling back to JSON format',
          data: {
            summary: formatSummaryData(dashboardData),
            messages: formatMessagesData(dashboardData),
            users: formatUsersData(dashboardData),
            channels: formatChannelsData(dashboardData),
            reactions: formatReactionsData(dashboardData),
            peakHours: formatPeakHoursData(dashboardData),
            files: formatFilesData(dashboardData),
            search: formatSearchData(dashboardData),
          },
        }
        return NextResponse.json(xlsxData)
      }
    }

    // Default fallback - return error for unsupported format
    return NextResponse.json(
      { error: `Unsupported export format: ${format}` },
      { status: 400 }
    )
  } catch (error) {
    logger.error('Analytics export error:', error)
    return NextResponse.json({ error: 'Failed to export analytics data' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
