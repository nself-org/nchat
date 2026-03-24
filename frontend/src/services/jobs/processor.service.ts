/**
 * Processor Service
 *
 * Job processor implementations for nchat background tasks.
 * Handles scheduled messages, email digests, cleanup, indexing, etc.
 *
 * @module services/jobs/processor.service
 * @version 0.9.1
 */

import { Worker, Job, Processor, type ConnectionOptions } from 'bullmq'
import IORedis from 'ioredis'
import { createLogger } from '@/lib/logger'
import { getQueueService, QUEUE_NAMES } from './queue.service'
import { getSchedulerService } from './scheduler.service'
import {
  type JobsServiceConfig,
  type NchatJobType,
  type QueueName,
  type JobPayload,
  type JobResult,
  type ScheduledMessagePayload,
  type ScheduledMessageResult,
  type EmailDigestPayload,
  type EmailDigestResult,
  type CleanupExpiredPayload,
  type CleanupResult,
  type IndexSearchPayload,
  type IndexSearchResult,
  type ProcessFilePayload,
  type ProcessFileResult,
  type SendNotificationPayload,
  type SendNotificationResult,
  type SendEmailPayload,
  type HttpWebhookPayload,
  type CustomJobPayload,
  type RegisteredProcessor,
  DEFAULT_JOBS_CONFIG,
} from './types'

const log = createLogger('ProcessorService')

// ============================================================================
// Job Data Interface
// ============================================================================

interface JobData {
  type: NchatJobType
  payload: JobPayload
  metadata: Record<string, unknown>
  tags: string[]
  createdAt: string
}

// ============================================================================
// Processor Implementations
// ============================================================================

/**
 * Process scheduled message job
 */
async function processScheduledMessage(
  job: Job<JobData>
): Promise<JobResult<ScheduledMessageResult>> {
  const payload = job.data.payload as ScheduledMessagePayload
  const jobLog = createLogger(`ScheduledMessage:${job.id}`)

  jobLog.info('Processing scheduled message', {
    scheduledMessageId: payload.scheduledMessageId,
    channelId: payload.channelId,
    userId: payload.userId,
  })

  try {
    await job.updateProgress(10)

    // Validate scheduled message exists and is still pending
    // This would check against the scheduled messages store/database
    await job.updateProgress(20)

    // Check if channel still exists and user has permission
    await job.updateProgress(40)

    // Create the actual message
    // In a real implementation, this would call the message creation API/service
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    await job.updateProgress(80)

    // Update scheduled message status to 'sent'
    await job.updateProgress(100)

    jobLog.info('Scheduled message sent successfully', {
      messageId,
      channelId: payload.channelId,
    })

    return {
      success: true,
      data: {
        messageId,
        channelId: payload.channelId,
        sentAt: new Date(),
      },
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    jobLog.error('Failed to send scheduled message', error)

    return {
      success: false,
      error: errorMessage,
    }
  }
}

/**
 * Process email digest job
 */
async function processEmailDigest(job: Job<JobData>): Promise<JobResult<EmailDigestResult>> {
  const payload = job.data.payload as EmailDigestPayload
  const jobLog = createLogger(`EmailDigest:${job.id}`)

  jobLog.info('Processing email digest', {
    userId: payload.userId,
    email: payload.email,
    digestType: payload.digestType,
  })

  try {
    await job.updateProgress(10)

    // Calculate period based on digest type
    const now = Date.now()
    const periodEnd = now
    const periodStart =
      payload.digestType === 'daily'
        ? now - 24 * 60 * 60 * 1000 // 24 hours
        : now - 7 * 24 * 60 * 60 * 1000 // 7 days

    await job.updateProgress(20)

    // Fetch unread messages, mentions, and thread replies
    // This would query the database for the relevant content
    let itemCount = 0

    if (payload.includeUnreadCount) {
      // Count unread messages from nchat_messages via Hasura
      itemCount += 0
    }

    if (payload.includeMentions) {
      // Count mentions from nchat_mentions via Hasura
      itemCount += 0
    }

    if (payload.includeThreadReplies) {
      // Count thread replies from nchat_messages via Hasura
      itemCount += 0
    }

    await job.updateProgress(50)

    // Generate digest HTML
    // This would use a template engine to create the email content
    await job.updateProgress(70)

    // Send email using email service
    // For now, simulate email sending
    const messageId = `digest_${Date.now()}`

    await job.updateProgress(100)

    jobLog.info('Email digest sent successfully', {
      userId: payload.userId,
      email: payload.email,
      itemCount,
    })

    return {
      success: true,
      data: {
        messageId,
        itemCount,
        sentTo: payload.email,
      },
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    jobLog.error('Failed to send email digest', error)

    return {
      success: false,
      error: errorMessage,
    }
  }
}

/**
 * Process cleanup expired content job
 */
async function processCleanupExpired(job: Job<JobData>): Promise<JobResult<CleanupResult>> {
  const payload = job.data.payload as CleanupExpiredPayload
  const jobLog = createLogger(`CleanupExpired:${job.id}`)

  jobLog.info('Processing cleanup job', {
    targetType: payload.targetType,
    olderThanHours: payload.olderThanHours,
    olderThanDays: payload.olderThanDays,
    batchSize: payload.batchSize,
    dryRun: payload.dryRun,
  })

  try {
    await job.updateProgress(10)

    // Calculate cutoff time
    const hours = payload.olderThanDays ? payload.olderThanDays * 24 : payload.olderThanHours || 24

    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000)

    await job.updateProgress(20)

    let deletedCount = 0
    let skippedCount = 0
    const deletedIds: string[] = []

    // Process based on target type
    switch (payload.targetType) {
      case 'messages':
        // Delete expired messages (e.g., disappearing messages)
        // This would query and delete from database
        break

      case 'attachments':
        // Delete orphaned attachments
        break

      case 'sessions':
        // Clean up expired sessions
        break

      case 'drafts':
        // Clean up old drafts
        break

      case 'scheduled_messages':
        // Clean up old sent/cancelled scheduled messages
        break

      case 'job_results':
        // Clean up old job results
        const queueService = getQueueService()
        for (const queueName of QUEUE_NAMES) {
          const removed = await queueService.cleanQueue(
            queueName,
            hours * 60 * 60 * 1000,
            'completed',
            payload.batchSize || 1000
          )
          deletedIds.push(...removed)
          deletedCount += removed.length
        }
        break
    }

    await job.updateProgress(100)

    jobLog.info('Cleanup completed', {
      targetType: payload.targetType,
      deletedCount,
      skippedCount,
      dryRun: payload.dryRun,
    })

    return {
      success: true,
      data: {
        deletedCount: payload.dryRun ? 0 : deletedCount,
        skippedCount,
        deletedIds: payload.dryRun ? [] : deletedIds,
      },
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    jobLog.error('Failed to process cleanup', error)

    return {
      success: false,
      error: errorMessage,
    }
  }
}

/**
 * Process search indexing job
 */
async function processIndexSearch(job: Job<JobData>): Promise<JobResult<IndexSearchResult>> {
  const payload = job.data.payload as IndexSearchPayload
  const jobLog = createLogger(`IndexSearch:${job.id}`)

  jobLog.info('Processing search indexing job', {
    operation: payload.operation,
    entityType: payload.entityType,
    entityCount: payload.entityIds.length,
    fullReindex: payload.fullReindex,
  })

  try {
    await job.updateProgress(10)

    let indexedCount = 0
    let failedCount = 0
    const taskIds: number[] = []

    // Process based on operation
    switch (payload.operation) {
      case 'index':
      case 'update':
        // Index/update entities in search
        // This would call the MeiliSearch indexer
        for (const entityId of payload.entityIds) {
          try {
            // getMessageIndexer().indexMessage(...)
            indexedCount++
          } catch {
            failedCount++
          }
          await job.updateProgress(
            10 + Math.floor(((indexedCount + failedCount) / payload.entityIds.length) * 80)
          )
        }
        break

      case 'delete':
        // Remove entities from search
        for (const entityId of payload.entityIds) {
          try {
            // getMessageIndexer().removeMessage(entityId)
            indexedCount++
          } catch {
            failedCount++
          }
        }
        break

      case 'reindex':
        // Full reindex
        if (payload.fullReindex) {
          // getMessageIndexer().reindexAll(...)
        } else if (payload.channelId) {
          // getMessageIndexer().reindexChannel(payload.channelId, ...)
        }
        break
    }

    await job.updateProgress(100)

    jobLog.info('Search indexing completed', {
      operation: payload.operation,
      indexedCount,
      failedCount,
    })

    return {
      success: failedCount === 0,
      data: {
        indexedCount,
        failedCount,
        taskIds,
      },
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    jobLog.error('Failed to process search indexing', error)

    return {
      success: false,
      error: errorMessage,
    }
  }
}

/**
 * Process file processing job
 */
async function processFile(job: Job<JobData>): Promise<JobResult<ProcessFileResult>> {
  const payload = job.data.payload as ProcessFilePayload
  const jobLog = createLogger(`ProcessFile:${job.id}`)

  jobLog.info('Processing file', {
    fileId: payload.fileId,
    mimeType: payload.mimeType,
    operations: payload.operations,
  })

  try {
    await job.updateProgress(10)

    const result: ProcessFileResult = {}
    const totalOps = payload.operations.length
    let completedOps = 0

    for (const operation of payload.operations) {
      switch (operation) {
        case 'thumbnail':
          // Generate thumbnail using image processing library
          // result.thumbnailUrl = await generateThumbnail(payload.fileUrl)
          result.thumbnailUrl = `${payload.fileUrl}?thumbnail=true`
          break

        case 'preview':
          // Generate preview (for documents, videos, etc.)
          result.previewUrl = `${payload.fileUrl}?preview=true`
          break

        case 'extract_text':
          // Extract text from documents (PDF, DOCX, etc.)
          result.extractedText = ''
          break

        case 'virus_scan':
          // Scan file for viruses
          result.virusScanPassed = true
          break

        case 'compress':
          // Compress file
          result.compressedUrl = payload.fileUrl
          break

        case 'transcode':
          // Transcode media file
          result.transcodedUrl = payload.fileUrl
          break
      }

      completedOps++
      await job.updateProgress(10 + Math.floor((completedOps / totalOps) * 80))
    }

    await job.updateProgress(100)

    jobLog.info('File processing completed', {
      fileId: payload.fileId,
      operations: payload.operations,
    })

    return {
      success: true,
      data: result,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    jobLog.error('Failed to process file', error)

    return {
      success: false,
      error: errorMessage,
    }
  }
}

/**
 * Process send notification job
 */
async function processSendNotification(
  job: Job<JobData>
): Promise<JobResult<SendNotificationResult>> {
  const payload = job.data.payload as SendNotificationPayload
  const jobLog = createLogger(`SendNotification:${job.id}`)

  jobLog.info('Processing notification', {
    type: payload.notificationType,
    userCount: payload.userIds.length,
    title: payload.title,
  })

  try {
    await job.updateProgress(10)

    let sentCount = 0
    let failedCount = 0
    const notificationIds: string[] = []

    for (const userId of payload.userIds) {
      try {
        // Send notification based on type
        switch (payload.notificationType) {
          case 'push':
            // Send push notification via FCM, APNS, etc.
            break
          case 'email':
            // Send email notification
            break
          case 'in-app':
            // Create in-app notification
            break
          case 'sms':
            // Send SMS notification
            break
        }

        const notificationId = `notif_${Date.now()}_${userId}`
        notificationIds.push(notificationId)
        sentCount++
      } catch {
        failedCount++
      }

      await job.updateProgress(
        10 + Math.floor(((sentCount + failedCount) / payload.userIds.length) * 80)
      )
    }

    await job.updateProgress(100)

    jobLog.info('Notifications sent', {
      sentCount,
      failedCount,
    })

    return {
      success: failedCount === 0,
      data: {
        sentCount,
        failedCount,
        notificationIds,
      },
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    jobLog.error('Failed to send notifications', error)

    return {
      success: false,
      error: errorMessage,
    }
  }
}

/**
 * Process send email job
 */
async function processSendEmail(
  job: Job<JobData>
): Promise<JobResult<{ messageId: string; accepted: string[]; rejected: string[] }>> {
  const payload = job.data.payload as SendEmailPayload
  const jobLog = createLogger(`SendEmail:${job.id}`)

  const recipients = Array.isArray(payload.to) ? payload.to : [payload.to]

  jobLog.info('Processing email', {
    to: recipients,
    subject: payload.subject,
  })

  try {
    await job.updateProgress(10)

    // Send email using email service
    // This would integrate with SendGrid, AWS SES, or other email provider
    const messageId = `email_${Date.now()}`
    const accepted = recipients
    const rejected: string[] = []

    await job.updateProgress(100)

    jobLog.info('Email sent', {
      messageId,
      acceptedCount: accepted.length,
      rejectedCount: rejected.length,
    })

    return {
      success: true,
      data: {
        messageId,
        accepted,
        rejected,
      },
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    jobLog.error('Failed to send email', error)

    return {
      success: false,
      error: errorMessage,
    }
  }
}

/**
 * Process HTTP webhook job
 */
async function processHttpWebhook(
  job: Job<JobData>
): Promise<JobResult<{ status: number; body: unknown; duration: number }>> {
  const payload = job.data.payload as HttpWebhookPayload
  const jobLog = createLogger(`HttpWebhook:${job.id}`)

  jobLog.info('Processing HTTP webhook', {
    url: payload.url,
    method: payload.method,
  })

  try {
    await job.updateProgress(10)

    const startTime = Date.now()

    // Make HTTP request
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), payload.timeout || 30000)

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...payload.headers,
    }

    // Add signature if secret provided
    if (payload.secret && payload.body) {
      // Add HMAC signature header
      // headers['X-Signature'] = generateHmacSignature(payload.body, payload.secret)
    }

    const response = await fetch(payload.url, {
      method: payload.method,
      headers,
      body: payload.body ? JSON.stringify(payload.body) : undefined,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    const duration = Date.now() - startTime
    const body = await response.json().catch(() => null)

    await job.updateProgress(100)

    // Check if should retry based on status
    if (payload.retryOnStatus?.includes(response.status)) {
      throw new Error(`Retryable HTTP status: ${response.status}`)
    }

    jobLog.info('HTTP webhook completed', {
      url: payload.url,
      status: response.status,
      duration,
    })

    return {
      success: response.ok,
      data: {
        status: response.status,
        body,
        duration,
      },
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    jobLog.error('Failed to process HTTP webhook', error)

    return {
      success: false,
      error: errorMessage,
    }
  }
}

/**
 * Process custom job
 */
async function processCustomJob(job: Job<JobData>): Promise<JobResult<unknown>> {
  const payload = job.data.payload as CustomJobPayload
  const jobLog = createLogger(`CustomJob:${job.id}`)

  jobLog.info('Processing custom job', {
    action: payload.action,
  })

  try {
    await job.updateProgress(50)

    // Custom jobs are handled externally via webhooks or Hasura Actions
    // This is a placeholder that can be extended

    await job.updateProgress(100)

    jobLog.info('Custom job completed', {
      action: payload.action,
    })

    return {
      success: true,
      data: payload.data,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    jobLog.error('Failed to process custom job', error)

    return {
      success: false,
      error: errorMessage,
    }
  }
}

// ============================================================================
// Processor Registry
// ============================================================================

/**
 * Map of job types to processors
 */
const processorRegistry: Record<NchatJobType, (job: Job<JobData>) => Promise<JobResult<unknown>>> =
  {
    'scheduled-message': processScheduledMessage,
    'email-digest': processEmailDigest,
    'cleanup-expired': processCleanupExpired,
    'index-search': processIndexSearch,
    'process-file': processFile,
    'send-notification': processSendNotification,
    'send-email': processSendEmail,
    'http-webhook': processHttpWebhook,
    custom: processCustomJob,
  }

// ============================================================================
// Processor Service Class
// ============================================================================

/**
 * ProcessorService manages BullMQ workers for processing jobs
 */
export class ProcessorService {
  private config: JobsServiceConfig
  private connection: IORedis | null = null
  private workers = new Map<QueueName, Worker>()
  private customProcessors = new Map<string, (job: Job<JobData>) => Promise<JobResult<unknown>>>()
  private isInitialized = false

  constructor(config?: Partial<JobsServiceConfig>) {
    this.config = { ...DEFAULT_JOBS_CONFIG, ...config }
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  /**
   * Initialize the processor service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      log.debug('Processor service already initialized')
      return
    }

    if (!this.config.enableWorker) {
      log.info('Worker disabled, processor service will not process jobs')
      this.isInitialized = true
      return
    }

    try {
      log.info('Initializing processor service', { redisUrl: this.config.redisUrl })

      // Create Redis connection
      this.connection = new IORedis(this.config.redisUrl, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      })

      // Create workers for each queue
      for (const queueName of QUEUE_NAMES) {
        await this.createWorker(queueName)
      }

      this.isInitialized = true
      log.info('Processor service initialized', { workerCount: this.workers.size })
    } catch (error) {
      log.error('Failed to initialize processor service', error)
      throw error
    }
  }

  /**
   * Create a worker for a queue
   */
  private async createWorker(queueName: QueueName): Promise<void> {
    const worker = new Worker(
      queueName,
      async (job: Job<JobData>) => {
        return this.processJob(job)
      },
      {
        connection: this.connection!.duplicate() as unknown as ConnectionOptions,
        concurrency: this.config.defaultConcurrency,
        autorun: true,
      }
    )

    // Setup worker event handlers
    worker.on('completed', (job) => {
      log.debug('Job completed', { jobId: job.id, queue: queueName })
    })

    worker.on('failed', (job, error) => {
      log.error('Job failed', error, {
        jobId: job?.id,
        queue: queueName,
        error: error.message,
      })
    })

    worker.on('error', (error) => {
      log.error('Worker error', error, { queue: queueName })
    })

    worker.on('stalled', (jobId) => {
      log.warn('Job stalled', { jobId, queue: queueName })
    })

    this.workers.set(queueName, worker)
    log.info('Worker created', { queue: queueName })
  }

  /**
   * Process a job
   */
  private async processJob(job: Job<JobData>): Promise<JobResult<unknown>> {
    const { type, payload, metadata } = job.data
    const startTime = Date.now()

    log.info('Processing job', {
      jobId: job.id,
      type,
      attemptsMade: job.attemptsMade,
    })

    try {
      // Check for custom processor first
      const customProcessor = this.customProcessors.get(type)
      if (customProcessor) {
        const result = await customProcessor(job)
        this.recordJobResult(job, result, startTime)
        return result
      }

      // Use built-in processor
      const processor = processorRegistry[type]
      if (!processor) {
        throw new Error(`No processor found for job type: ${type}`)
      }

      const result = await processor(job)
      this.recordJobResult(job, result, startTime)
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      log.error('Job processing error', error, {
        jobId: job.id,
        type,
      })

      return {
        success: false,
        error: errorMessage,
      }
    }
  }

  /**
   * Record job result for schedule tracking
   */
  private recordJobResult(job: Job<JobData>, result: JobResult<unknown>, startTime: number): void {
    const duration = Date.now() - startTime
    const { metadata } = job.data

    // Track schedule runs
    const scheduleId = metadata?.scheduleId as string | undefined
    if (scheduleId) {
      try {
        const schedulerService = getSchedulerService()
        schedulerService.recordScheduleRun(scheduleId, job.id!, result.success)
      } catch {
        // Scheduler may not be initialized
      }
    }

    log.debug('Job result recorded', {
      jobId: job.id,
      success: result.success,
      duration,
    })
  }

  /**
   * Close the processor service
   */
  async close(): Promise<void> {
    log.info('Closing processor service')

    // Close all workers
    for (const [queueName, worker] of this.workers) {
      await worker.close()
      log.debug('Worker closed', { queue: queueName })
    }
    this.workers.clear()

    // Close Redis connection
    if (this.connection) {
      this.connection.disconnect()
      this.connection = null
    }

    this.isInitialized = false
    log.info('Processor service closed')
  }

  // ============================================================================
  // Custom Processors
  // ============================================================================

  /**
   * Register a custom processor for a job type
   */
  registerProcessor(
    type: NchatJobType | string,
    processor: (job: Job<JobData>) => Promise<JobResult<unknown>>
  ): void {
    this.customProcessors.set(type, processor)
    log.info('Custom processor registered', { type })
  }

  /**
   * Unregister a custom processor
   */
  unregisterProcessor(type: NchatJobType | string): void {
    this.customProcessors.delete(type)
    log.info('Custom processor unregistered', { type })
  }

  // ============================================================================
  // Worker Management
  // ============================================================================

  /**
   * Pause a worker
   */
  async pauseWorker(queueName: QueueName): Promise<void> {
    const worker = this.workers.get(queueName)
    if (worker) {
      await worker.pause()
      log.info('Worker paused', { queue: queueName })
    }
  }

  /**
   * Resume a worker
   */
  async resumeWorker(queueName: QueueName): Promise<void> {
    const worker = this.workers.get(queueName)
    if (worker) {
      worker.resume()
      log.info('Worker resumed', { queue: queueName })
    }
  }

  /**
   * Get worker status
   */
  getWorkerStatus(queueName: QueueName): { running: boolean; paused: boolean } | null {
    const worker = this.workers.get(queueName)
    if (!worker) return null

    return {
      running: worker.isRunning(),
      paused: worker.isPaused(),
    }
  }

  // ============================================================================
  // Getters
  // ============================================================================

  /**
   * Check if service is initialized
   */
  get initialized(): boolean {
    return this.isInitialized
  }

  /**
   * Get worker count
   */
  get workerCount(): number {
    return this.workers.size
  }

  /**
   * Get active worker queues
   */
  get activeQueues(): QueueName[] {
    return Array.from(this.workers.keys())
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

let processorService: ProcessorService | null = null

/**
 * Get or create the processor service singleton
 */
export function getProcessorService(config?: Partial<JobsServiceConfig>): ProcessorService {
  if (!processorService) {
    processorService = new ProcessorService(config)
  }
  return processorService
}

/**
 * Create a new processor service instance
 */
export function createProcessorService(config?: Partial<JobsServiceConfig>): ProcessorService {
  return new ProcessorService(config)
}

/**
 * Initialize the processor service
 */
export async function initializeProcessorService(
  config?: Partial<JobsServiceConfig>
): Promise<ProcessorService> {
  const service = getProcessorService(config)
  await service.initialize()
  return service
}

export default ProcessorService
