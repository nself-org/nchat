/**
 * Analytics Export - Export analytics data to various formats
 *
 * Supports CSV, JSON, PDF, and XLSX export functionality
 */

import type {
  ExportFormat,
  ExportOptions,
  DateRange,
  AnalyticsSummary,
  MessageVolumeData,
  UserActivityData,
  ChannelActivityData,
  ReactionData,
  FileUploadData,
  SearchQueryData,
  PeakHoursData,
  TopMessageData,
  InactiveUserData,
  UserGrowthData,
  ScheduledReportConfig,
  ReportHistory,
} from './analytics-types'
import { logger } from '@/lib/logger'

// Dynamic imports for large libraries to avoid bundling in main chunk
async function loadJsPDF() {
  const jsPDFModule = await import('jspdf')
  const autoTableModule = await import('jspdf-autotable')
  // Apply autoTable plugin to jsPDF
  const jsPDF = jsPDFModule.default || jsPDFModule.jsPDF
  return { jsPDF, autoTable: autoTableModule.default }
}

async function loadXLSX() {
  const ExcelJS = await import('exceljs')
  return ExcelJS
}

// ============================================================================
// CSV Export
// ============================================================================

export function exportToCSV(
  data: Record<string, unknown>[],
  headers: string[],
  fileName: string
): void {
  const csvContent = generateCSVContent(data, headers)
  downloadFile(csvContent, `${fileName}.csv`, 'text/csv')
}

function generateCSVContent(data: Record<string, unknown>[], headers: string[]): string {
  const headerRow = headers.join(',')
  const dataRows = data.map((row) =>
    headers
      .map((header) => {
        const value = row[header]
        if (value === null || value === undefined) return ''
        if (typeof value === 'string') {
          // Escape quotes and wrap in quotes if contains comma
          const escaped = value.replace(/"/g, '""')
          return value.includes(',') || value.includes('"') || value.includes('\n')
            ? `"${escaped}"`
            : escaped
        }
        if (value instanceof Date) {
          return value.toISOString()
        }
        return String(value)
      })
      .join(',')
  )

  return [headerRow, ...dataRows].join('\n')
}

// ============================================================================
// JSON Export
// ============================================================================

export function exportToJSON(data: unknown, fileName: string): void {
  const jsonContent = JSON.stringify(data, null, 2)
  downloadFile(jsonContent, `${fileName}.json`, 'application/json')
}

// ============================================================================
// Data Formatters for Export
// ============================================================================

export function formatMessageVolumeForExport(data: MessageVolumeData[]): {
  data: Record<string, unknown>[]
  headers: string[]
} {
  const headers = ['date', 'timestamp', 'messageCount']
  const formattedData = data.map((d) => ({
    date: d.timestamp.toLocaleDateString(),
    timestamp: d.timestamp.toISOString(),
    messageCount: d.count,
  }))

  return { data: formattedData, headers }
}

export function formatUserActivityForExport(data: UserActivityData[]): {
  data: Record<string, unknown>[]
  headers: string[]
} {
  const headers = [
    'userId',
    'username',
    'displayName',
    'lastActive',
    'messageCount',
    'reactionCount',
    'fileCount',
    'threadCount',
    'engagementScore',
  ]

  const formattedData = data.map((d) => ({
    userId: d.userId,
    username: d.username,
    displayName: d.displayName,
    lastActive: d.lastActive.toISOString(),
    messageCount: d.messageCount,
    reactionCount: d.reactionCount,
    fileCount: d.fileCount,
    threadCount: d.threadCount,
    engagementScore: d.engagementScore,
  }))

  return { data: formattedData, headers }
}

export function formatChannelActivityForExport(data: ChannelActivityData[]): {
  data: Record<string, unknown>[]
  headers: string[]
} {
  const headers = [
    'channelId',
    'channelName',
    'channelType',
    'memberCount',
    'messageCount',
    'activeUsers',
    'engagementRate',
    'growthRate',
  ]

  const formattedData = data.map((d) => ({
    channelId: d.channelId,
    channelName: d.channelName,
    channelType: d.channelType,
    memberCount: d.memberCount,
    messageCount: d.messageCount,
    activeUsers: d.activeUsers,
    engagementRate: d.engagementRate.toFixed(2),
    growthRate: d.growthRate.toFixed(2),
  }))

  return { data: formattedData, headers }
}

export function formatReactionsForExport(data: ReactionData[]): {
  data: Record<string, unknown>[]
  headers: string[]
} {
  const headers = ['emoji', 'emojiName', 'count', 'percentage', 'uniqueUsers']

  const formattedData = data.map((d) => ({
    emoji: d.emoji,
    emojiName: d.emojiName,
    count: d.count,
    percentage: d.percentage.toFixed(2),
    uniqueUsers: d.users,
  }))

  return { data: formattedData, headers }
}

export function formatFileUploadsForExport(data: FileUploadData[]): {
  data: Record<string, unknown>[]
  headers: string[]
} {
  const headers = ['date', 'timestamp', 'fileCount', 'totalSizeBytes', 'totalSizeMB']

  const formattedData = data.map((d) => ({
    date: d.timestamp.toLocaleDateString(),
    timestamp: d.timestamp.toISOString(),
    fileCount: d.count,
    totalSizeBytes: d.totalSize,
    totalSizeMB: (d.totalSize / (1024 * 1024)).toFixed(2),
  }))

  return { data: formattedData, headers }
}

export function formatSearchQueriesForExport(data: SearchQueryData[]): {
  data: Record<string, unknown>[]
  headers: string[]
} {
  const headers = ['query', 'count', 'averageResults', 'clickThroughRate', 'lastSearched']

  const formattedData = data.map((d) => ({
    query: d.query,
    count: d.count,
    averageResults: d.resultCount,
    clickThroughRate: (d.clickThroughRate * 100).toFixed(2) + '%',
    lastSearched: d.lastSearched.toISOString(),
  }))

  return { data: formattedData, headers }
}

export function formatPeakHoursForExport(data: PeakHoursData[]): {
  data: Record<string, unknown>[]
  headers: string[]
} {
  const headers = ['hour', 'hourLabel', 'messageCount', 'activeUsers', 'avgResponseTimeSeconds']

  const formattedData = data.map((d) => ({
    hour: d.hour,
    hourLabel: `${d.hour}:00`,
    messageCount: d.messageCount,
    activeUsers: d.activeUsers,
    avgResponseTimeSeconds: d.averageResponseTime.toFixed(0),
  }))

  return { data: formattedData, headers }
}

export function formatTopMessagesForExport(data: TopMessageData[]): {
  data: Record<string, unknown>[]
  headers: string[]
} {
  const headers = [
    'messageId',
    'content',
    'channelName',
    'authorName',
    'reactionCount',
    'replyCount',
    'timestamp',
  ]

  const formattedData = data.map((d) => ({
    messageId: d.messageId,
    content: d.content.substring(0, 100) + (d.content.length > 100 ? '...' : ''),
    channelName: d.channelName,
    authorName: d.authorName,
    reactionCount: d.reactionCount,
    replyCount: d.replyCount,
    timestamp: d.timestamp.toISOString(),
  }))

  return { data: formattedData, headers }
}

export function formatInactiveUsersForExport(data: InactiveUserData[]): {
  data: Record<string, unknown>[]
  headers: string[]
} {
  const headers = [
    'userId',
    'username',
    'displayName',
    'lastActive',
    'daysSinceActive',
    'totalMessages',
  ]

  const formattedData = data.map((d) => ({
    userId: d.userId,
    username: d.username,
    displayName: d.displayName,
    lastActive: d.lastActive.toISOString(),
    daysSinceActive: d.daysSinceActive,
    totalMessages: d.totalMessages,
  }))

  return { data: formattedData, headers }
}

export function formatUserGrowthForExport(data: UserGrowthData[]): {
  data: Record<string, unknown>[]
  headers: string[]
} {
  const headers = ['date', 'timestamp', 'newUsers', 'totalUsers', 'churnedUsers', 'netGrowth']

  const formattedData = data.map((d) => ({
    date: d.timestamp.toLocaleDateString(),
    timestamp: d.timestamp.toISOString(),
    newUsers: d.newUsers,
    totalUsers: d.totalUsers,
    churnedUsers: d.churnedUsers,
    netGrowth: d.netGrowth,
  }))

  return { data: formattedData, headers }
}

// ============================================================================
// Summary Export
// ============================================================================

export function formatSummaryForExport(
  summary: AnalyticsSummary,
  dateRange: DateRange
): { data: Record<string, unknown>[]; headers: string[] } {
  const headers = ['category', 'metric', 'value', 'change', 'trend']

  const metrics: Record<string, unknown>[] = [
    // Messages
    {
      category: 'Messages',
      metric: 'Total Messages',
      value: summary.messages.total.value,
      change: summary.messages.total.changePercent?.toFixed(2) || 'N/A',
      trend: summary.messages.total.trend || 'N/A',
    },
    {
      category: 'Messages',
      metric: 'With Attachments',
      value: summary.messages.withAttachments.value,
      change: 'N/A',
      trend: 'N/A',
    },
    {
      category: 'Messages',
      metric: 'With Reactions',
      value: summary.messages.withReactions.value,
      change: 'N/A',
      trend: 'N/A',
    },
    {
      category: 'Messages',
      metric: 'In Threads',
      value: summary.messages.inThreads.value,
      change: 'N/A',
      trend: 'N/A',
    },
    // Users
    {
      category: 'Users',
      metric: 'Total Users',
      value: summary.users.totalUsers.value,
      change: summary.users.totalUsers.changePercent?.toFixed(2) || 'N/A',
      trend: summary.users.totalUsers.trend || 'N/A',
    },
    {
      category: 'Users',
      metric: 'Active Users',
      value: summary.users.activeUsers.value,
      change: 'N/A',
      trend: 'N/A',
    },
    {
      category: 'Users',
      metric: 'New Users',
      value: summary.users.newUsers.value,
      change: 'N/A',
      trend: 'N/A',
    },
    // Channels
    {
      category: 'Channels',
      metric: 'Total Channels',
      value: summary.channels.totalChannels.value,
      change: summary.channels.totalChannels.changePercent?.toFixed(2) || 'N/A',
      trend: summary.channels.totalChannels.trend || 'N/A',
    },
    {
      category: 'Channels',
      metric: 'Active Channels',
      value: summary.channels.activeChannels.value,
      change: 'N/A',
      trend: 'N/A',
    },
    // Reactions
    {
      category: 'Reactions',
      metric: 'Total Reactions',
      value: summary.reactions.totalReactions.value,
      change: 'N/A',
      trend: 'N/A',
    },
    {
      category: 'Reactions',
      metric: 'Unique Emojis',
      value: summary.reactions.uniqueEmojis.value,
      change: 'N/A',
      trend: 'N/A',
    },
    // Files
    {
      category: 'Files',
      metric: 'Total Files',
      value: summary.files.totalFiles.value,
      change: 'N/A',
      trend: 'N/A',
    },
    {
      category: 'Files',
      metric: 'Total Size (bytes)',
      value: summary.files.totalSize.value,
      change: 'N/A',
      trend: 'N/A',
    },
    // Search
    {
      category: 'Search',
      metric: 'Total Searches',
      value: summary.search.totalSearches.value,
      change: 'N/A',
      trend: 'N/A',
    },
    {
      category: 'Search',
      metric: 'No Results Rate %',
      value: summary.search.noResultsRate.value,
      change: 'N/A',
      trend: 'N/A',
    },
  ]

  return { data: metrics, headers }
}

// ============================================================================
// Full Report Export
// ============================================================================

export interface FullReportData {
  summary: AnalyticsSummary
  messageVolume: MessageVolumeData[]
  userActivity: UserActivityData[]
  channelActivity: ChannelActivityData[]
  reactions: ReactionData[]
  fileUploads: FileUploadData[]
  searchQueries: SearchQueryData[]
  peakHours: PeakHoursData[]
  topMessages: TopMessageData[]
  inactiveUsers: InactiveUserData[]
  userGrowth: UserGrowthData[]
  dateRange: DateRange
}

export async function exportFullReport(data: FullReportData, options: ExportOptions): Promise<void> {
  const fileName = options.fileName || `analytics-report-${new Date().toISOString().split('T')[0]}`

  switch (options.format) {
    case 'json':
      exportToJSON(data, fileName)
      break
    case 'csv':
      exportMultipleCSV(data, options, fileName)
      break
    case 'pdf':
      await exportToPDF(data, options, fileName)
      break
    case 'xlsx':
      await exportToXLSX(data, options, fileName)
      break
  }
}

// ============================================================================
// PDF Export
// ============================================================================

async function exportToPDF(
  data: FullReportData,
  options: ExportOptions,
  fileName: string
): Promise<void> {
  try {
    const { jsPDF } = await loadJsPDF()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const doc = new jsPDF() as any

    // Header
    doc.setFontSize(22)
    doc.setTextColor(79, 70, 229) // Indigo-600
    doc.text('Analytics Report', 14, 22)

    // Date range
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    const dateRangeText = `${data.dateRange.start.toLocaleDateString()} - ${data.dateRange.end.toLocaleDateString()}`
    doc.text(`Report Period: ${dateRangeText}`, 14, 32)
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 38)

    let yPosition = 50
    const pageWidth = doc.internal.pageSize.getWidth()
    const marginLeft = 14
    const marginRight = 14

    // Helper to add a section header
    const addSectionHeader = (title: string) => {
      if (yPosition > 260) {
        doc.addPage()
        yPosition = 20
      }
      doc.setFontSize(14)
      doc.setTextColor(31, 41, 55) // Gray-800
      doc.text(title, marginLeft, yPosition)
      yPosition += 10
    }

    // Helper to add autoTable
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const addTable = (headers: string[], tableData: any[][]) => {
      doc.autoTable({
        startY: yPosition,
        head: [headers],
        body: tableData,
        margin: { left: marginLeft, right: marginRight },
        headStyles: {
          fillColor: [79, 70, 229],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251],
        },
        styles: {
          fontSize: 8,
          cellPadding: 3,
        },
        columnStyles: {
          0: { cellWidth: 'auto' },
        },
        tableWidth: 'auto',
      })
      yPosition = doc.lastAutoTable.finalY + 15
    }

    // Summary section
    if (options.sections.includes('summary')) {
      addSectionHeader('Summary')
      const summaryData = [
        ['Total Messages', data.summary.messages.total.value.toLocaleString()],
        ['Total Users', data.summary.users.totalUsers.value.toLocaleString()],
        ['Active Users', data.summary.users.activeUsers.value.toLocaleString()],
        ['Total Channels', data.summary.channels.totalChannels.value.toLocaleString()],
        ['Active Channels', data.summary.channels.activeChannels.value.toLocaleString()],
        ['Total Reactions', data.summary.reactions.totalReactions.value.toLocaleString()],
        ['Total Files', data.summary.files.totalFiles.value.toLocaleString()],
        ['Total Searches', data.summary.search.totalSearches.value.toLocaleString()],
      ]
      addTable(['Metric', 'Value'], summaryData)
    }

    // Messages section
    if (options.sections.includes('messages') && data.messageVolume.length > 0) {
      addSectionHeader('Message Volume')
      const formatted = formatMessageVolumeForExport(data.messageVolume)
      const tableData = formatted.data.map((row) => [
        row.date as string,
        (row.messageCount as number).toLocaleString(),
      ])
      addTable(['Date', 'Messages'], tableData.slice(0, 30)) // Limit for PDF readability
    }

    // Users section
    if (options.sections.includes('users') && data.userActivity.length > 0) {
      addSectionHeader('Top Users')
      const formatted = formatUserActivityForExport(data.userActivity)
      const tableData = formatted.data.slice(0, 20).map((row) => [
        row.displayName as string,
        (row.messageCount as number).toLocaleString(),
        (row.reactionCount as number).toLocaleString(),
        (row.engagementScore as number).toFixed(1),
      ])
      addTable(['User', 'Messages', 'Reactions', 'Engagement Score'], tableData)
    }

    // Channels section
    if (options.sections.includes('channels') && data.channelActivity.length > 0) {
      addSectionHeader('Channel Activity')
      const formatted = formatChannelActivityForExport(data.channelActivity)
      const tableData = formatted.data.slice(0, 20).map((row) => [
        row.channelName as string,
        row.channelType as string,
        (row.memberCount as number).toLocaleString(),
        (row.messageCount as number).toLocaleString(),
      ])
      addTable(['Channel', 'Type', 'Members', 'Messages'], tableData)
    }

    // Reactions section
    if (options.sections.includes('reactions') && data.reactions.length > 0) {
      addSectionHeader('Top Reactions')
      const formatted = formatReactionsForExport(data.reactions)
      const tableData = formatted.data.slice(0, 15).map((row) => [
        row.emoji as string,
        (row.count as number).toLocaleString(),
        `${row.percentage}%`,
      ])
      addTable(['Emoji', 'Count', 'Percentage'], tableData)
    }

    // Peak Hours section
    if (options.sections.includes('peakHours') && data.peakHours.length > 0) {
      addSectionHeader('Peak Hours')
      const formatted = formatPeakHoursForExport(data.peakHours)
      const tableData = formatted.data.map((row) => [
        row.hourLabel as string,
        (row.messageCount as number).toLocaleString(),
        (row.activeUsers as number).toLocaleString(),
      ])
      addTable(['Hour', 'Messages', 'Active Users'], tableData)
    }

    // Files section
    if (options.sections.includes('files') && data.fileUploads.length > 0) {
      addSectionHeader('File Uploads')
      const formatted = formatFileUploadsForExport(data.fileUploads)
      const tableData = formatted.data.slice(0, 30).map((row) => [
        row.date as string,
        (row.fileCount as number).toLocaleString(),
        `${row.totalSizeMB} MB`,
      ])
      addTable(['Date', 'Files', 'Total Size'], tableData)
    }

    // Search section
    if (options.sections.includes('search') && data.searchQueries.length > 0) {
      addSectionHeader('Top Search Queries')
      const formatted = formatSearchQueriesForExport(data.searchQueries)
      const tableData = formatted.data.slice(0, 20).map((row) => [
        row.query as string,
        (row.count as number).toLocaleString(),
        (row.averageResults as number).toLocaleString(),
      ])
      addTable(['Query', 'Count', 'Avg Results'], tableData)
    }

    // Footer
    const pageCount = doc.internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.text(
        `Page ${i} of ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      )
      doc.text(
        'Generated by nchat Analytics',
        marginLeft,
        doc.internal.pageSize.getHeight() - 10
      )
    }

    // Download
    doc.save(`${fileName}.pdf`)
    logger.info('PDF export completed', { fileName })
  } catch (error) {
    logger.error('PDF export failed', error)
    throw new Error('Failed to generate PDF report')
  }
}

// ============================================================================
// XLSX Export
// ============================================================================

async function exportToXLSX(
  data: FullReportData,
  options: ExportOptions,
  fileName: string
): Promise<void> {
  try {
    const ExcelJS = await loadXLSX()
    const workbook = new ExcelJS.default.Workbook()

    // Helper to add worksheet
    const addWorksheet = (
      name: string,
      sheetData: Record<string, unknown>[],
      headers: string[]
    ) => {
      if (sheetData.length === 0) return

      const worksheet = workbook.addWorksheet(name)

      // Set column definitions with widths
      worksheet.columns = headers.map((header) => ({
        header,
        key: header,
        width: Math.max(header.length, 12),
      }))

      // Add data rows
      sheetData.forEach((row) => {
        const rowData: Record<string, unknown> = {}
        headers.forEach((header) => {
          const value = row[header]
          rowData[header] = value instanceof Date ? value.toISOString() : value
        })
        worksheet.addRow(rowData)
      })
    }

    // Summary sheet
    if (options.sections.includes('summary')) {
      const summaryFormatted = formatSummaryForExport(data.summary, data.dateRange)
      addWorksheet('Summary', summaryFormatted.data, summaryFormatted.headers)
    }

    // Messages sheet
    if (options.sections.includes('messages') && data.messageVolume.length > 0) {
      const formatted = formatMessageVolumeForExport(data.messageVolume)
      addWorksheet('Messages', formatted.data, formatted.headers)
    }

    // Users sheet
    if (options.sections.includes('users') && data.userActivity.length > 0) {
      const formatted = formatUserActivityForExport(data.userActivity)
      addWorksheet('Users', formatted.data, formatted.headers)
    }

    // Channels sheet
    if (options.sections.includes('channels') && data.channelActivity.length > 0) {
      const formatted = formatChannelActivityForExport(data.channelActivity)
      addWorksheet('Channels', formatted.data, formatted.headers)
    }

    // Reactions sheet
    if (options.sections.includes('reactions') && data.reactions.length > 0) {
      const formatted = formatReactionsForExport(data.reactions)
      addWorksheet('Reactions', formatted.data, formatted.headers)
    }

    // Files sheet
    if (options.sections.includes('files') && data.fileUploads.length > 0) {
      const formatted = formatFileUploadsForExport(data.fileUploads)
      addWorksheet('Files', formatted.data, formatted.headers)
    }

    // Search sheet
    if (options.sections.includes('search') && data.searchQueries.length > 0) {
      const formatted = formatSearchQueriesForExport(data.searchQueries)
      addWorksheet('Search', formatted.data, formatted.headers)
    }

    // Peak Hours sheet
    if (options.sections.includes('peakHours') && data.peakHours.length > 0) {
      const formatted = formatPeakHoursForExport(data.peakHours)
      addWorksheet('Peak Hours', formatted.data, formatted.headers)
    }

    // Top Messages sheet
    if (data.topMessages.length > 0) {
      const formatted = formatTopMessagesForExport(data.topMessages)
      addWorksheet('Top Messages', formatted.data, formatted.headers)
    }

    // Inactive Users sheet
    if (data.inactiveUsers.length > 0) {
      const formatted = formatInactiveUsersForExport(data.inactiveUsers)
      addWorksheet('Inactive Users', formatted.data, formatted.headers)
    }

    // User Growth sheet
    if (data.userGrowth.length > 0) {
      const formatted = formatUserGrowthForExport(data.userGrowth)
      addWorksheet('User Growth', formatted.data, formatted.headers)
    }

    // Generate and download
    const xlsxBuffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([xlsxBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })

    downloadBlob(blob, `${fileName}.xlsx`)
    logger.info('XLSX export completed', { fileName })
  } catch (error) {
    logger.error('XLSX export failed', error)
    throw new Error('Failed to generate Excel report')
  }
}

function downloadBlob(blob: Blob, fileName: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    logger.warn('Download not available in non-browser environment')
    return
  }

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function exportMultipleCSV(
  data: FullReportData,
  options: ExportOptions,
  baseFileName: string
): void {
  const sections = options.sections

  if (sections.includes('summary')) {
    const formatted = formatSummaryForExport(data.summary, data.dateRange)
    exportToCSV(formatted.data, formatted.headers, `${baseFileName}-summary`)
  }

  if (sections.includes('messages') && data.messageVolume.length > 0) {
    const formatted = formatMessageVolumeForExport(data.messageVolume)
    exportToCSV(formatted.data, formatted.headers, `${baseFileName}-messages`)
  }

  if (sections.includes('users') && data.userActivity.length > 0) {
    const formatted = formatUserActivityForExport(data.userActivity)
    exportToCSV(formatted.data, formatted.headers, `${baseFileName}-users`)
  }

  if (sections.includes('channels') && data.channelActivity.length > 0) {
    const formatted = formatChannelActivityForExport(data.channelActivity)
    exportToCSV(formatted.data, formatted.headers, `${baseFileName}-channels`)
  }

  if (sections.includes('reactions') && data.reactions.length > 0) {
    const formatted = formatReactionsForExport(data.reactions)
    exportToCSV(formatted.data, formatted.headers, `${baseFileName}-reactions`)
  }

  if (sections.includes('files') && data.fileUploads.length > 0) {
    const formatted = formatFileUploadsForExport(data.fileUploads)
    exportToCSV(formatted.data, formatted.headers, `${baseFileName}-files`)
  }

  if (sections.includes('search') && data.searchQueries.length > 0) {
    const formatted = formatSearchQueriesForExport(data.searchQueries)
    exportToCSV(formatted.data, formatted.headers, `${baseFileName}-search`)
  }

  if (sections.includes('peakHours') && data.peakHours.length > 0) {
    const formatted = formatPeakHoursForExport(data.peakHours)
    exportToCSV(formatted.data, formatted.headers, `${baseFileName}-peak-hours`)
  }
}

// ============================================================================
// Scheduled Reports
// ============================================================================

export function createScheduledReportConfig(
  config: Omit<ScheduledReportConfig, 'id' | 'createdAt' | 'nextRun'>
): ScheduledReportConfig {
  const id = `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  const createdAt = new Date()
  const nextRun = calculateNextRunTime(config)

  return {
    ...config,
    id,
    createdAt,
    nextRun,
  }
}

export function calculateNextRunTime(
  config: Pick<ScheduledReportConfig, 'frequency' | 'dayOfWeek' | 'dayOfMonth' | 'time'>
): Date {
  const now = new Date()
  const [hours, minutes] = config.time.split(':').map(Number)
  const nextRun = new Date(now)

  nextRun.setHours(hours, minutes, 0, 0)

  switch (config.frequency) {
    case 'daily':
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1)
      }
      break
    case 'weekly':
      const targetDay = config.dayOfWeek || 1 // Default to Monday
      const currentDay = now.getDay()
      let daysUntilTarget = targetDay - currentDay
      if (daysUntilTarget <= 0 || (daysUntilTarget === 0 && nextRun <= now)) {
        daysUntilTarget += 7
      }
      nextRun.setDate(now.getDate() + daysUntilTarget)
      break
    case 'monthly':
      const targetDate = config.dayOfMonth || 1
      nextRun.setDate(targetDate)
      if (nextRun <= now) {
        nextRun.setMonth(nextRun.getMonth() + 1)
      }
      break
  }

  return nextRun
}

export function createReportHistory(
  reportConfig: ScheduledReportConfig,
  dateRange: DateRange,
  status: ReportHistory['status'] = 'pending'
): ReportHistory {
  return {
    id: `history-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    reportConfigId: reportConfig.id,
    reportName: reportConfig.name,
    generatedAt: new Date(),
    dateRange,
    format: reportConfig.format,
    status,
  }
}

// ============================================================================
// File Download Helper
// ============================================================================

function downloadFile(content: string, fileName: string, mimeType: string): void {
  // Check if we're in a browser environment
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    logger.warn('Download not available in non-browser environment')
    return
  }

  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

// ============================================================================
// Export Index
// ============================================================================

export const analyticsExport = {
  toCSV: exportToCSV,
  toJSON: exportToJSON,
  fullReport: exportFullReport,
  formatters: {
    messageVolume: formatMessageVolumeForExport,
    userActivity: formatUserActivityForExport,
    channelActivity: formatChannelActivityForExport,
    reactions: formatReactionsForExport,
    fileUploads: formatFileUploadsForExport,
    searchQueries: formatSearchQueriesForExport,
    peakHours: formatPeakHoursForExport,
    topMessages: formatTopMessagesForExport,
    inactiveUsers: formatInactiveUsersForExport,
    userGrowth: formatUserGrowthForExport,
    summary: formatSummaryForExport,
  },
  scheduledReports: {
    createConfig: createScheduledReportConfig,
    calculateNextRun: calculateNextRunTime,
    createHistory: createReportHistory,
  },
}
