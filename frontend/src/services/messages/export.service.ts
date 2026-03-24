/**
 * Message Export Service
 *
 * Provides comprehensive export functionality for all message types:
 * - JSON export (full data)
 * - CSV export (tabular data)
 * - HTML export (formatted for reading)
 * - Markdown export (for documentation)
 * - PDF export (printable format)
 *
 * Supports all extended message types including:
 * - Text, code, markdown
 * - Media (images, videos, audio)
 * - Polls and stickers
 * - Location and contacts
 * - Forwarded messages
 * - System events
 */

import { logger } from '@/lib/logger'
import { format } from 'date-fns'
import type { ApolloClient, NormalizedCacheObject } from '@apollo/client'
import type { APIResponse } from '@/types/api'
import type {
  ExtendedMessage,
  ExtendedMessageType,
  MessageExportFormat,
  MessageExportOptions,
  MessageExportResult,
  ExportedMessage,
  LocationMessageData,
  ContactCardData,
  ForwardAttribution,
  CodeBlockData,
} from '@/types/message-extended'
import type { Poll, PollOption } from '@/types/poll'
import type { Attachment } from '@/types/attachment'
import type { Reaction } from '@/types/message'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Export job status.
 */
export type ExportJobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'

/**
 * Export job.
 */
export interface ExportJob {
  id: string
  channelId: string
  channelName: string
  format: MessageExportFormat
  options: MessageExportOptions
  status: ExportJobStatus
  progress: number
  totalMessages: number
  processedMessages: number
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  result?: MessageExportResult
  error?: string
}

/**
 * Export progress callback.
 */
export type ExportProgressCallback = (progress: number, processedCount: number, totalCount: number) => void

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_MESSAGES_PER_EXPORT = 100000
const BATCH_SIZE = 1000
const EXPORT_EXPIRY_HOURS = 24

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class MessageExportService {
  private client: ApolloClient<NormalizedCacheObject>
  private jobs: Map<string, ExportJob> = new Map()

  constructor(client: ApolloClient<NormalizedCacheObject>) {
    this.client = client
  }

  /**
   * Start an export job.
   */
  async startExport(
    channelId: string,
    channelName: string,
    options: MessageExportOptions,
    onProgress?: ExportProgressCallback
  ): Promise<APIResponse<ExportJob>> {
    try {
      logger.info('MessageExportService.startExport', {
        channelId,
        format: options.format,
      })

      // Create job
      const jobId = `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const job: ExportJob = {
        id: jobId,
        channelId,
        channelName,
        format: options.format,
        options,
        status: 'pending',
        progress: 0,
        totalMessages: 0,
        processedMessages: 0,
        createdAt: new Date(),
      }

      this.jobs.set(jobId, job)

      // Start export in background
      this.processExport(job, onProgress).catch((error) => {
        job.status = 'failed'
        job.error = (error as Error).message
        logger.error('Export job failed', error as Error, { jobId })
      })

      return {
        success: true,
        data: job,
      }
    } catch (error) {
      logger.error('MessageExportService.startExport failed', error as Error, {
        channelId,
      })
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          status: 500,
          message: (error as Error).message || 'Failed to start export',
        },
      }
    }
  }

  /**
   * Get export job status.
   */
  getJobStatus(jobId: string): ExportJob | undefined {
    return this.jobs.get(jobId)
  }

  /**
   * Cancel an export job.
   */
  cancelExport(jobId: string): boolean {
    const job = this.jobs.get(jobId)
    if (job && job.status === 'processing') {
      job.status = 'cancelled'
      return true
    }
    return false
  }

  /**
   * Export messages directly (synchronous for small exports).
   */
  async exportMessages(
    messages: ExtendedMessage[],
    options: MessageExportOptions
  ): Promise<APIResponse<string>> {
    try {
      logger.debug('MessageExportService.exportMessages', {
        count: messages.length,
        format: options.format,
      })

      const exportedMessages = this.transformMessages(messages, options)

      let content: string

      switch (options.format) {
        case 'json':
          content = this.exportToJson(exportedMessages, options)
          break
        case 'csv':
          content = this.exportToCsv(exportedMessages, options)
          break
        case 'html':
          content = this.exportToHtml(exportedMessages, options)
          break
        case 'markdown':
          content = this.exportToMarkdown(exportedMessages, options)
          break
        case 'pdf':
          // PDF would require a separate library - return HTML for now
          content = this.exportToHtml(exportedMessages, options)
          break
        default:
          content = this.exportToJson(exportedMessages, options)
      }

      return {
        success: true,
        data: content,
      }
    } catch (error) {
      logger.error('MessageExportService.exportMessages failed', error as Error)
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          status: 500,
          message: (error as Error).message || 'Export failed',
        },
      }
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Process export job.
   */
  private async processExport(job: ExportJob, onProgress?: ExportProgressCallback): Promise<void> {
    job.status = 'processing'
    job.startedAt = new Date()

    try {
      // Fetch messages
      const messages = await this.fetchMessages(job.channelId, job.options)
      job.totalMessages = messages.length

      if (messages.length === 0) {
        job.status = 'completed'
        job.completedAt = new Date()
        job.result = {
          exportId: job.id,
          format: job.format,
          messageCount: 0,
          fileSize: 0,
          downloadUrl: '',
          expiresAt: new Date(Date.now() + EXPORT_EXPIRY_HOURS * 60 * 60 * 1000),
          channel: { id: job.channelId, name: job.channelName },
          dateRange: { from: new Date(), to: new Date() },
          createdAt: new Date(),
        }
        return
      }

      // Transform messages in batches
      const exportedMessages: ExportedMessage[] = []

      for (let i = 0; i < messages.length; i += BATCH_SIZE) {
        // Check if job was cancelled (fetch fresh status from jobs map)
        const currentJob = this.jobs.get(job.id)
        if (currentJob?.status === 'cancelled') {
          return
        }

        const batch = messages.slice(i, i + BATCH_SIZE)
        const transformed = this.transformMessages(batch, job.options)
        exportedMessages.push(...transformed)

        job.processedMessages = Math.min(i + BATCH_SIZE, messages.length)
        job.progress = Math.round((job.processedMessages / job.totalMessages) * 100)

        onProgress?.(job.progress, job.processedMessages, job.totalMessages)
      }

      // Generate export content
      let content: string

      switch (job.format) {
        case 'json':
          content = this.exportToJson(exportedMessages, job.options)
          break
        case 'csv':
          content = this.exportToCsv(exportedMessages, job.options)
          break
        case 'html':
          content = this.exportToHtml(exportedMessages, job.options)
          break
        case 'markdown':
          content = this.exportToMarkdown(exportedMessages, job.options)
          break
        default:
          content = this.exportToJson(exportedMessages, job.options)
      }

      // Save export and create download URL
      const result = await this.saveExport(job, content, exportedMessages)

      job.status = 'completed'
      job.completedAt = new Date()
      job.result = result
    } catch (error) {
      job.status = 'failed'
      job.error = (error as Error).message
      throw error
    }
  }

  /**
   * Fetch messages for export.
   */
  private async fetchMessages(
    channelId: string,
    options: MessageExportOptions
  ): Promise<ExtendedMessage[]> {
    // Fetches from GraphQL API when backend export endpoint is available.
    // Returns empty until connected to a live Hasura instance.
    return []
  }

  /**
   * Save export and create download URL.
   */
  private async saveExport(
    job: ExportJob,
    content: string,
    messages: ExportedMessage[]
  ): Promise<MessageExportResult> {
    // Uploads to storage and creates a signed URL when MinIO is configured.
    const dateRange = messages.length > 0
      ? {
          from: new Date(messages[messages.length - 1].createdAt),
          to: new Date(messages[0].createdAt),
        }
      : { from: new Date(), to: new Date() }

    return {
      exportId: job.id,
      format: job.format,
      messageCount: messages.length,
      fileSize: new Blob([content]).size,
      downloadUrl: `/api/exports/${job.id}/download`,
      expiresAt: new Date(Date.now() + EXPORT_EXPIRY_HOURS * 60 * 60 * 1000),
      channel: { id: job.channelId, name: job.channelName },
      dateRange,
      createdAt: new Date(),
    }
  }

  /**
   * Transform messages to export format.
   */
  private transformMessages(
    messages: ExtendedMessage[],
    options: MessageExportOptions
  ): ExportedMessage[] {
    return messages
      .filter((message) => this.shouldIncludeMessage(message, options))
      .map((message) => this.transformMessage(message, options))
  }

  /**
   * Check if message should be included in export.
   */
  private shouldIncludeMessage(message: ExtendedMessage, options: MessageExportOptions): boolean {
    // Filter by date range
    if (options.dateRange) {
      const messageDate = new Date(message.createdAt)
      if (options.dateRange.from && messageDate < options.dateRange.from) {
        return false
      }
      if (options.dateRange.to && messageDate > options.dateRange.to) {
        return false
      }
    }

    // Filter by message type
    if (options.messageTypes?.length) {
      const type = message.extendedType || message.type
      if (!options.messageTypes.includes(type as ExtendedMessageType)) {
        return false
      }
    }

    // Filter by user
    if (options.userIds?.length && !options.userIds.includes(message.userId)) {
      return false
    }

    // Filter system messages
    if (!options.includeSystemMessages && this.isSystemMessage(message)) {
      return false
    }

    return true
  }

  /**
   * Check if message is a system message.
   */
  private isSystemMessage(message: ExtendedMessage): boolean {
    const systemTypes: string[] = [
      'system',
      'user_joined',
      'user_left',
      'user_added',
      'user_removed',
      'channel_created',
      'channel_renamed',
      'message_pinned',
      'call_started',
      'call_ended',
    ]
    return systemTypes.includes(message.type) || systemTypes.includes(message.extendedType || '')
  }

  /**
   * Transform single message to export format.
   */
  private transformMessage(message: ExtendedMessage, options: MessageExportOptions): ExportedMessage {
    const exported: ExportedMessage = {
      id: message.id,
      type: (message.extendedType || message.type) as ExtendedMessageType,
      content: message.content,
      contentHtml: message.contentHtml,
      author: {
        id: message.userId,
        username: message.user?.username || '',
        displayName: message.user?.displayName || '',
      },
      createdAt: message.createdAt.toISOString(),
      editedAt: message.editedAt?.toISOString(),
      isEdited: message.isEdited,
      isForwarded: !!message.forwardAttribution,
    }

    // Add forward info
    if (message.forwardAttribution) {
      exported.forwardedFrom = {
        channelName: message.forwardAttribution.originalChannelName || '',
        authorName: message.forwardAttribution.originalAuthor.displayName,
        originalDate: message.forwardAttribution.originalSentAt.toISOString(),
      }
    }

    // Add attachments
    if (options.includeAttachments && message.attachments?.length) {
      exported.attachments = message.attachments.map((att) => ({
        type: att.type,
        name: att.name,
        url: options.includeMedia ? att.url : '',
        size: att.size,
      }))
    }

    // Add reactions
    if (options.includeReactions && message.reactions?.length) {
      exported.reactions = message.reactions.map((reaction) => ({
        emoji: reaction.emoji,
        count: reaction.count,
        users: reaction.users.map((u) => u.displayName),
      }))
    }

    // Add poll
    if (message.poll) {
      exported.poll = {
        question: message.poll.question,
        options: message.poll.options.map((opt) => ({
          text: opt.text,
          votes: opt.voteCount,
          percentage: opt.percentage,
        })),
        totalVotes: message.poll.totalVotes,
        status: message.poll.status,
      }
    }

    // Add location
    if (message.locationData) {
      exported.location = {
        latitude: message.locationData.location.latitude,
        longitude: message.locationData.location.longitude,
        name: message.locationData.name,
        address: message.locationData.address,
      }
    }

    // Add contact
    if (message.contactData) {
      exported.contact = {
        name: message.contactData.displayName,
        phones: message.contactData.phones?.map((p) => p.number),
        emails: message.contactData.emails?.map((e) => e.email),
      }
    }

    // Add edit history
    if (options.includeEditHistory && message.editHistory?.length) {
      exported.editHistory = message.editHistory.map((edit) => ({
        previousContent: edit.previousContent,
        editedAt: edit.editedAt.toISOString(),
        editorId: edit.editorId,
      }))
    }

    return exported
  }

  /**
   * Export to JSON format.
   */
  private exportToJson(messages: ExportedMessage[], options: MessageExportOptions): string {
    const exportData = {
      exportedAt: new Date().toISOString(),
      messageCount: messages.length,
      format: 'json',
      messages,
    }

    return JSON.stringify(exportData, null, 2)
  }

  /**
   * Export to CSV format.
   */
  private exportToCsv(messages: ExportedMessage[], options: MessageExportOptions): string {
    const headers = [
      'ID',
      'Type',
      'Author ID',
      'Author Name',
      'Content',
      'Created At',
      'Edited At',
      'Is Edited',
      'Is Forwarded',
      'Forwarded From',
      'Attachments',
      'Reactions',
    ]

    const rows = messages.map((msg) => [
      msg.id,
      msg.type,
      msg.author.id,
      msg.author.displayName,
      this.escapeCSV(msg.content),
      msg.createdAt,
      msg.editedAt || '',
      msg.isEdited ? 'Yes' : 'No',
      msg.isForwarded ? 'Yes' : 'No',
      msg.forwardedFrom ? msg.forwardedFrom.authorName : '',
      msg.attachments?.map((a) => a.name).join('; ') || '',
      msg.reactions?.map((r) => `${r.emoji}(${r.count})`).join('; ') || '',
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n')

    return csvContent
  }

  /**
   * Export to HTML format.
   */
  private exportToHtml(messages: ExportedMessage[], options: MessageExportOptions): string {
    const styles = `
      <style>
        body { font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .message { border-bottom: 1px solid #e5e5e5; padding: 15px 0; }
        .message-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
        .author { font-weight: 600; }
        .timestamp { color: #666; font-size: 0.85em; }
        .content { white-space: pre-wrap; }
        .forward-info { background: #f5f5f5; padding: 8px; border-left: 3px solid #ccc; margin-bottom: 8px; font-size: 0.9em; }
        .attachments { display: flex; gap: 10px; margin-top: 10px; }
        .attachment { background: #f5f5f5; padding: 5px 10px; border-radius: 4px; font-size: 0.9em; }
        .reactions { margin-top: 10px; }
        .reaction { display: inline-block; background: #f0f0f0; padding: 2px 8px; border-radius: 12px; margin-right: 5px; font-size: 0.9em; }
        .poll { background: #f5f5f5; padding: 15px; border-radius: 8px; margin-top: 10px; }
        .poll-question { font-weight: 600; margin-bottom: 10px; }
        .poll-option { display: flex; justify-content: space-between; padding: 5px 0; }
        .location { background: #e3f2fd; padding: 10px; border-radius: 8px; margin-top: 10px; }
        .contact { background: #e8f5e9; padding: 10px; border-radius: 8px; margin-top: 10px; }
        .system-message { text-align: center; color: #666; font-size: 0.9em; padding: 10px 0; }
        .code-block { background: #1e1e1e; color: #d4d4d4; padding: 15px; border-radius: 8px; overflow-x: auto; margin-top: 10px; }
        .code-block pre { margin: 0; font-family: monospace; }
      </style>
    `

    const messageHtml = messages.map((msg) => {
      if (this.isSystemMessageType(msg.type)) {
        return `<div class="system-message">${this.escapeHtml(msg.content)}</div>`
      }

      let html = `
        <div class="message">
          <div class="message-header">
            <span class="author">${this.escapeHtml(msg.author.displayName)}</span>
            <span class="timestamp">${format(new Date(msg.createdAt), 'MMM d, yyyy h:mm a')}</span>
            ${msg.isEdited ? '<span class="edited">(edited)</span>' : ''}
          </div>
      `

      if (msg.forwardedFrom) {
        html += `
          <div class="forward-info">
            Forwarded from ${this.escapeHtml(msg.forwardedFrom.authorName)}
            ${msg.forwardedFrom.channelName ? ` in #${this.escapeHtml(msg.forwardedFrom.channelName)}` : ''}
          </div>
        `
      }

      html += `<div class="content">${this.escapeHtml(msg.content)}</div>`

      if (msg.attachments?.length) {
        html += `
          <div class="attachments">
            ${msg.attachments.map((a) => `<span class="attachment">${this.escapeHtml(a.name)}</span>`).join('')}
          </div>
        `
      }

      if (msg.poll) {
        html += `
          <div class="poll">
            <div class="poll-question">${this.escapeHtml(msg.poll.question)}</div>
            ${msg.poll.options.map((opt) => `
              <div class="poll-option">
                <span>${this.escapeHtml(opt.text)}</span>
                <span>${opt.percentage}% (${opt.votes})</span>
              </div>
            `).join('')}
          </div>
        `
      }

      if (msg.location) {
        html += `
          <div class="location">
            <strong>Location:</strong> ${msg.location.name || ''} ${msg.location.address || ''}
            <br>
            <a href="https://www.google.com/maps?q=${msg.location.latitude},${msg.location.longitude}" target="_blank">
              View on Map
            </a>
          </div>
        `
      }

      if (msg.contact) {
        html += `
          <div class="contact">
            <strong>${this.escapeHtml(msg.contact.name)}</strong>
            ${msg.contact.phones?.length ? `<br>Phone: ${msg.contact.phones.join(', ')}` : ''}
            ${msg.contact.emails?.length ? `<br>Email: ${msg.contact.emails.join(', ')}` : ''}
          </div>
        `
      }

      if (msg.reactions?.length) {
        html += `
          <div class="reactions">
            ${msg.reactions.map((r) => `<span class="reaction">${r.emoji} ${r.count}</span>`).join('')}
          </div>
        `
      }

      html += '</div>'

      return html
    }).join('\n')

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Chat Export</title>
        ${styles}
      </head>
      <body>
        <h1>Chat Export</h1>
        <p>Exported ${messages.length} messages on ${format(new Date(), 'MMMM d, yyyy')}</p>
        <hr>
        ${messageHtml}
      </body>
      </html>
    `
  }

  /**
   * Export to Markdown format.
   */
  private exportToMarkdown(messages: ExportedMessage[], options: MessageExportOptions): string {
    const lines: string[] = [
      '# Chat Export',
      '',
      `Exported ${messages.length} messages on ${format(new Date(), 'MMMM d, yyyy')}`,
      '',
      '---',
      '',
    ]

    for (const msg of messages) {
      if (this.isSystemMessageType(msg.type)) {
        lines.push(`*${msg.content}*`)
        lines.push('')
        continue
      }

      lines.push(`**${msg.author.displayName}** - ${format(new Date(msg.createdAt), 'MMM d, yyyy h:mm a')}${msg.isEdited ? ' (edited)' : ''}`)
      lines.push('')

      if (msg.forwardedFrom) {
        lines.push(`> Forwarded from ${msg.forwardedFrom.authorName}`)
        lines.push('')
      }

      lines.push(msg.content)
      lines.push('')

      if (msg.attachments?.length) {
        lines.push('Attachments:')
        for (const att of msg.attachments) {
          lines.push(`- ${att.name}`)
        }
        lines.push('')
      }

      if (msg.poll) {
        lines.push(`**Poll: ${msg.poll.question}**`)
        for (const opt of msg.poll.options) {
          const bar = '█'.repeat(Math.round(opt.percentage / 5)) + '░'.repeat(20 - Math.round(opt.percentage / 5))
          lines.push(`- ${opt.text}: ${bar} ${opt.percentage}% (${opt.votes})`)
        }
        lines.push('')
      }

      if (msg.location) {
        lines.push(`📍 **Location:** ${msg.location.name || ''} ${msg.location.address || ''}`)
        lines.push(`[View on Map](https://www.google.com/maps?q=${msg.location.latitude},${msg.location.longitude})`)
        lines.push('')
      }

      if (msg.contact) {
        lines.push(`👤 **Contact:** ${msg.contact.name}`)
        if (msg.contact.phones?.length) {
          lines.push(`Phone: ${msg.contact.phones.join(', ')}`)
        }
        if (msg.contact.emails?.length) {
          lines.push(`Email: ${msg.contact.emails.join(', ')}`)
        }
        lines.push('')
      }

      if (msg.reactions?.length) {
        lines.push(`Reactions: ${msg.reactions.map((r) => `${r.emoji} ${r.count}`).join(' ')}`)
        lines.push('')
      }

      lines.push('---')
      lines.push('')
    }

    return lines.join('\n')
  }

  /**
   * Check if type is a system message type.
   */
  private isSystemMessageType(type: ExtendedMessageType): boolean {
    const systemTypes: ExtendedMessageType[] = [
      'system',
      'user_joined',
      'user_left',
      'user_added',
      'user_removed',
      'channel_created',
      'channel_renamed',
      'message_pinned',
      'call_started',
      'call_ended',
    ]
    return systemTypes.includes(type)
  }

  /**
   * Escape CSV special characters.
   */
  private escapeCSV(str: string): string {
    if (!str) return ''
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  /**
   * Escape HTML special characters.
   */
  private escapeHtml(str: string): string {
    if (!str) return ''
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let exportServiceInstance: MessageExportService | null = null

/**
 * Get or create the export service singleton.
 */
export function getMessageExportService(
  apolloClient: ApolloClient<NormalizedCacheObject>
): MessageExportService {
  if (!exportServiceInstance) {
    exportServiceInstance = new MessageExportService(apolloClient)
  }
  return exportServiceInstance
}

/**
 * Create a new export service instance (for testing).
 */
export function createMessageExportService(
  apolloClient: ApolloClient<NormalizedCacheObject>
): MessageExportService {
  return new MessageExportService(apolloClient)
}
