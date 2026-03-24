/**
 * Scheduler Service
 *
 * Manages scheduled/recurring jobs using BullMQ repeatable jobs.
 * Handles cron-based job scheduling with timezone support.
 *
 * @module services/jobs/scheduler.service
 * @version 0.9.1
 */

import { Queue, Job } from 'bullmq'
import { createLogger } from '@/lib/logger'
import { getQueueService, QueueService, QUEUE_NAMES } from './queue.service'
import {
  type NchatJobType,
  type QueueName,
  type JobPayload,
  type ScheduleOptions,
  type ScheduleRecord,
  type CreateJobOptions,
  JobPriorityValue,
} from './types'

const log = createLogger('SchedulerService')

// ============================================================================
// Types
// ============================================================================

/**
 * Internal schedule storage (in-memory until database is available)
 */
interface ScheduleEntry {
  id: string
  name: string
  description: string | null
  jobType: NchatJobType
  queueName: QueueName
  payload: JobPayload
  cronExpression: string
  timezone: string
  enabled: boolean
  lastRunAt: Date | null
  lastJobId: string | null
  nextRunAt: Date | null
  totalRuns: number
  successfulRuns: number
  failedRuns: number
  maxRuns: number | null
  endDate: Date | null
  metadata: Record<string, unknown>
  tags: string[]
  createdAt: Date
  updatedAt: Date
  createdBy: string | null
  repeatJobKey: string | null
}

/**
 * Result of creating a schedule
 */
export interface CreateScheduleResult {
  scheduleId: string
  name: string
  nextRunAt: Date | null
}

/**
 * Result of updating a schedule
 */
export interface UpdateScheduleResult {
  scheduleId: string
  updated: boolean
  nextRunAt: Date | null
}

// ============================================================================
// Scheduler Service Class
// ============================================================================

/**
 * SchedulerService manages recurring/scheduled jobs
 */
export class SchedulerService {
  private queueService: QueueService
  private schedules = new Map<string, ScheduleEntry>()
  private isInitialized = false

  constructor(queueService?: QueueService) {
    this.queueService = queueService || getQueueService()
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  /**
   * Initialize the scheduler service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      log.debug('Scheduler service already initialized')
      return
    }

    // Ensure queue service is initialized
    if (!this.queueService.initialized) {
      await this.queueService.initialize()
    }

    // Load existing schedules from database
    await this.loadSchedules()

    // Sync schedules with BullMQ
    await this.syncSchedules()

    this.isInitialized = true
    log.info('Scheduler service initialized')
  }

  /**
   * Load schedules from database
   */
  private async loadSchedules(): Promise<void> {
    // Schedules are in-memory only until cron plugin provides persistent storage
    log.debug('Loading schedules (in-memory mode)')
  }

  /**
   * Sync schedules with BullMQ repeatable jobs
   */
  private async syncSchedules(): Promise<void> {
    log.debug('Syncing schedules with BullMQ')

    for (const schedule of this.schedules.values()) {
      if (schedule.enabled) {
        await this.activateSchedule(schedule)
      }
    }
  }

  /**
   * Close the scheduler service
   */
  async close(): Promise<void> {
    log.info('Closing scheduler service')
    this.schedules.clear()
    this.isInitialized = false
  }

  // ============================================================================
  // Schedule Management
  // ============================================================================

  /**
   * Create a new schedule
   */
  async createSchedule(options: ScheduleOptions): Promise<CreateScheduleResult> {
    this.ensureInitialized()

    // Check for duplicate name
    const existing = Array.from(this.schedules.values()).find((s) => s.name === options.name)
    if (existing) {
      throw new Error(`Schedule with name "${options.name}" already exists`)
    }

    // Generate ID
    const id = `sched_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Create schedule entry
    const schedule: ScheduleEntry = {
      id,
      name: options.name,
      description: options.description || null,
      jobType: options.jobType,
      queueName: options.queueName || 'scheduled',
      payload: options.payload,
      cronExpression: options.cronExpression,
      timezone: options.timezone || 'UTC',
      enabled: options.enabled !== false,
      lastRunAt: null,
      lastJobId: null,
      nextRunAt: null,
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
      maxRuns: options.maxRuns ?? null,
      endDate: options.endDate ?? null,
      metadata: options.metadata || {},
      tags: options.tags || [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: null,
      repeatJobKey: null,
    }

    // Store schedule
    this.schedules.set(id, schedule)

    // Activate if enabled
    let nextRunAt: Date | null = null
    if (schedule.enabled) {
      const result = await this.activateSchedule(schedule)
      nextRunAt = result.nextRunAt
    }

    log.info('Schedule created', {
      scheduleId: id,
      name: options.name,
      cronExpression: options.cronExpression,
      enabled: schedule.enabled,
    })

    return {
      scheduleId: id,
      name: options.name,
      nextRunAt,
    }
  }

  /**
   * Update an existing schedule
   */
  async updateSchedule(
    scheduleId: string,
    updates: Partial<ScheduleOptions>
  ): Promise<UpdateScheduleResult> {
    this.ensureInitialized()

    const schedule = this.schedules.get(scheduleId)
    if (!schedule) {
      throw new Error(`Schedule not found: ${scheduleId}`)
    }

    // Check name uniqueness if updating name
    if (updates.name && updates.name !== schedule.name) {
      const existing = Array.from(this.schedules.values()).find((s) => s.name === updates.name)
      if (existing) {
        throw new Error(`Schedule with name "${updates.name}" already exists`)
      }
    }

    // Deactivate current schedule
    if (schedule.repeatJobKey) {
      await this.deactivateSchedule(schedule)
    }

    // Apply updates
    if (updates.name !== undefined) schedule.name = updates.name
    if (updates.description !== undefined) schedule.description = updates.description || null
    if (updates.jobType !== undefined) schedule.jobType = updates.jobType
    if (updates.queueName !== undefined) schedule.queueName = updates.queueName
    if (updates.payload !== undefined) schedule.payload = updates.payload
    if (updates.cronExpression !== undefined) schedule.cronExpression = updates.cronExpression
    if (updates.timezone !== undefined) schedule.timezone = updates.timezone
    if (updates.enabled !== undefined) schedule.enabled = updates.enabled
    if (updates.maxRuns !== undefined) schedule.maxRuns = updates.maxRuns
    if (updates.endDate !== undefined) schedule.endDate = updates.endDate
    if (updates.metadata !== undefined) schedule.metadata = updates.metadata
    if (updates.tags !== undefined) schedule.tags = updates.tags

    schedule.updatedAt = new Date()

    // Reactivate if enabled
    let nextRunAt: Date | null = null
    if (schedule.enabled) {
      const result = await this.activateSchedule(schedule)
      nextRunAt = result.nextRunAt
    }

    log.info('Schedule updated', {
      scheduleId,
      name: schedule.name,
      enabled: schedule.enabled,
    })

    return {
      scheduleId,
      updated: true,
      nextRunAt,
    }
  }

  /**
   * Delete a schedule
   */
  async deleteSchedule(scheduleId: string): Promise<boolean> {
    this.ensureInitialized()

    const schedule = this.schedules.get(scheduleId)
    if (!schedule) {
      return false
    }

    // Deactivate if active
    if (schedule.repeatJobKey) {
      await this.deactivateSchedule(schedule)
    }

    // Remove from storage
    this.schedules.delete(scheduleId)

    log.info('Schedule deleted', { scheduleId, name: schedule.name })

    return true
  }

  /**
   * Enable a schedule
   */
  async enableSchedule(scheduleId: string): Promise<UpdateScheduleResult> {
    return this.updateSchedule(scheduleId, { enabled: true })
  }

  /**
   * Disable a schedule
   */
  async disableSchedule(scheduleId: string): Promise<UpdateScheduleResult> {
    return this.updateSchedule(scheduleId, { enabled: false })
  }

  /**
   * Get a schedule by ID
   */
  getSchedule(scheduleId: string): ScheduleRecord | null {
    const schedule = this.schedules.get(scheduleId)
    if (!schedule) return null

    return this.toScheduleRecord(schedule)
  }

  /**
   * Get a schedule by name
   */
  getScheduleByName(name: string): ScheduleRecord | null {
    const schedule = Array.from(this.schedules.values()).find((s) => s.name === name)
    if (!schedule) return null

    return this.toScheduleRecord(schedule)
  }

  /**
   * Get all schedules
   */
  getSchedules(options?: {
    enabled?: boolean
    jobType?: NchatJobType
    tags?: string[]
  }): ScheduleRecord[] {
    let schedules = Array.from(this.schedules.values())

    if (options?.enabled !== undefined) {
      schedules = schedules.filter((s) => s.enabled === options.enabled)
    }

    if (options?.jobType) {
      schedules = schedules.filter((s) => s.jobType === options.jobType)
    }

    if (options?.tags && options.tags.length > 0) {
      schedules = schedules.filter((s) => options.tags!.some((tag) => s.tags.includes(tag)))
    }

    return schedules.map((s) => this.toScheduleRecord(s))
  }

  /**
   * Trigger a schedule to run immediately
   */
  async triggerSchedule(scheduleId: string): Promise<{ jobId: string } | null> {
    this.ensureInitialized()

    const schedule = this.schedules.get(scheduleId)
    if (!schedule) {
      return null
    }

    // Add a one-time job
    const { jobId } = await this.queueService.addJob(schedule.jobType, schedule.payload, {
      queue: schedule.queueName,
      metadata: {
        ...schedule.metadata,
        triggeredScheduleId: scheduleId,
        manualTrigger: true,
      },
      tags: [...schedule.tags, 'manual-trigger'],
    })

    log.info('Schedule triggered manually', { scheduleId, jobId })

    return { jobId }
  }

  // ============================================================================
  // Schedule Activation
  // ============================================================================

  /**
   * Activate a schedule (add to BullMQ as repeatable job)
   */
  private async activateSchedule(schedule: ScheduleEntry): Promise<{ nextRunAt: Date | null }> {
    const queue = this.queueService.getQueue(schedule.queueName)
    if (!queue) {
      throw new Error(`Queue not found: ${schedule.queueName}`)
    }

    // Check if schedule has ended
    if (schedule.endDate && new Date() > schedule.endDate) {
      log.info('Schedule has ended', { scheduleId: schedule.id })
      return { nextRunAt: null }
    }

    // Check if max runs reached
    if (schedule.maxRuns !== null && schedule.totalRuns >= schedule.maxRuns) {
      log.info('Schedule max runs reached', {
        scheduleId: schedule.id,
        totalRuns: schedule.totalRuns,
        maxRuns: schedule.maxRuns,
      })
      return { nextRunAt: null }
    }

    const jobData = {
      type: schedule.jobType,
      payload: schedule.payload,
      metadata: {
        ...schedule.metadata,
        scheduleId: schedule.id,
        scheduleName: schedule.name,
      },
      tags: schedule.tags,
      createdAt: new Date().toISOString(),
    }

    // Add repeatable job
    const job = await queue.add(schedule.jobType, jobData, {
      repeat: {
        pattern: schedule.cronExpression,
        tz: schedule.timezone,
        limit: schedule.maxRuns ?? undefined,
        endDate: schedule.endDate ?? undefined,
      },
      jobId: schedule.id,
    })

    // Store repeat job key
    schedule.repeatJobKey = `${schedule.jobType}:${schedule.id}:::${schedule.cronExpression}`

    // Calculate next run
    const repeatableJobs = await queue.getRepeatableJobs()
    const thisJob = repeatableJobs.find((j) => j.id === schedule.id)
    const nextRunAt = thisJob?.next ? new Date(thisJob.next) : null

    schedule.nextRunAt = nextRunAt

    log.info('Schedule activated', {
      scheduleId: schedule.id,
      cronExpression: schedule.cronExpression,
      nextRunAt,
    })

    return { nextRunAt }
  }

  /**
   * Deactivate a schedule (remove repeatable job from BullMQ)
   */
  private async deactivateSchedule(schedule: ScheduleEntry): Promise<void> {
    const queue = this.queueService.getQueue(schedule.queueName)
    if (!queue) return

    try {
      // Remove repeatable job
      const removed = await queue.removeRepeatableByKey(schedule.repeatJobKey!)
      if (removed) {
        log.info('Schedule deactivated', { scheduleId: schedule.id })
      }
    } catch (err) {
      log.warn('Failed to remove repeatable job', { scheduleId: schedule.id, error: err })
    }

    schedule.repeatJobKey = null
    schedule.nextRunAt = null
  }

  // ============================================================================
  // Run Tracking
  // ============================================================================

  /**
   * Record a schedule run (called by processor)
   */
  recordScheduleRun(scheduleId: string, jobId: string, success: boolean): void {
    const schedule = this.schedules.get(scheduleId)
    if (!schedule) return

    schedule.lastRunAt = new Date()
    schedule.lastJobId = jobId
    schedule.totalRuns++

    if (success) {
      schedule.successfulRuns++
    } else {
      schedule.failedRuns++
    }

    schedule.updatedAt = new Date()

    // Check if max runs reached
    if (schedule.maxRuns !== null && schedule.totalRuns >= schedule.maxRuns) {
      log.info('Schedule max runs reached, disabling', {
        scheduleId,
        totalRuns: schedule.totalRuns,
        maxRuns: schedule.maxRuns,
      })
      schedule.enabled = false
    }

    log.debug('Schedule run recorded', {
      scheduleId,
      jobId,
      success,
      totalRuns: schedule.totalRuns,
    })
  }

  // ============================================================================
  // Predefined Schedules
  // ============================================================================

  /**
   * Create daily email digest schedule
   */
  async createDailyDigestSchedule(
    userId: string,
    email: string,
    options?: {
      hour?: number
      timezone?: string
      channelIds?: string[]
    }
  ): Promise<CreateScheduleResult> {
    const hour = options?.hour ?? 8 // Default 8 AM
    const timezone = options?.timezone ?? 'UTC'

    return this.createSchedule({
      name: `daily-digest-${userId}`,
      description: `Daily email digest for user ${userId}`,
      jobType: 'email-digest',
      queueName: 'scheduled',
      payload: {
        userId,
        email,
        digestType: 'daily',
        periodStart: 0, // Will be calculated at runtime
        periodEnd: 0,
        channelIds: options?.channelIds,
        includeUnreadCount: true,
        includeMentions: true,
        includeThreadReplies: true,
      },
      cronExpression: `0 ${hour} * * *`, // Every day at specified hour
      timezone,
      tags: ['digest', 'email', 'user-notification'],
      metadata: { userId },
    })
  }

  /**
   * Create weekly email digest schedule
   */
  async createWeeklyDigestSchedule(
    userId: string,
    email: string,
    options?: {
      dayOfWeek?: number // 0 = Sunday, 1 = Monday, etc.
      hour?: number
      timezone?: string
      channelIds?: string[]
    }
  ): Promise<CreateScheduleResult> {
    const dayOfWeek = options?.dayOfWeek ?? 1 // Default Monday
    const hour = options?.hour ?? 9 // Default 9 AM
    const timezone = options?.timezone ?? 'UTC'

    return this.createSchedule({
      name: `weekly-digest-${userId}`,
      description: `Weekly email digest for user ${userId}`,
      jobType: 'email-digest',
      queueName: 'scheduled',
      payload: {
        userId,
        email,
        digestType: 'weekly',
        periodStart: 0,
        periodEnd: 0,
        channelIds: options?.channelIds,
        includeUnreadCount: true,
        includeMentions: true,
        includeThreadReplies: true,
      },
      cronExpression: `0 ${hour} * * ${dayOfWeek}`,
      timezone,
      tags: ['digest', 'email', 'user-notification'],
      metadata: { userId },
    })
  }

  /**
   * Create cleanup job schedule
   */
  async createCleanupSchedule(options?: {
    hour?: number
    interval?: 'daily' | 'weekly'
  }): Promise<CreateScheduleResult> {
    const hour = options?.hour ?? 3 // Default 3 AM
    const interval = options?.interval ?? 'daily'

    const cronExpression = interval === 'weekly' ? `0 ${hour} * * 0` : `0 ${hour} * * *`

    return this.createSchedule({
      name: 'system-cleanup',
      description: 'System cleanup job for expired content',
      jobType: 'cleanup-expired',
      queueName: 'low-priority',
      payload: {
        targetType: 'job_results',
        olderThanDays: 7,
        batchSize: 1000,
        dryRun: false,
      },
      cronExpression,
      timezone: 'UTC',
      tags: ['system', 'cleanup', 'maintenance'],
    })
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Ensure service is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Scheduler service not initialized. Call initialize() first.')
    }
  }

  /**
   * Convert internal entry to ScheduleRecord
   */
  private toScheduleRecord(entry: ScheduleEntry): ScheduleRecord {
    return {
      id: entry.id,
      name: entry.name,
      description: entry.description,
      jobType: entry.jobType,
      queueName: entry.queueName,
      payload: entry.payload,
      options: {},
      cronExpression: entry.cronExpression,
      timezone: entry.timezone,
      enabled: entry.enabled,
      lastRunAt: entry.lastRunAt,
      lastJobId: entry.lastJobId,
      nextRunAt: entry.nextRunAt,
      totalRuns: entry.totalRuns,
      successfulRuns: entry.successfulRuns,
      failedRuns: entry.failedRuns,
      maxRuns: entry.maxRuns,
      endDate: entry.endDate,
      metadata: entry.metadata,
      tags: entry.tags,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      createdBy: entry.createdBy,
      updatedBy: null,
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
   * Get total schedule count
   */
  get scheduleCount(): number {
    return this.schedules.size
  }

  /**
   * Get enabled schedule count
   */
  get enabledCount(): number {
    return Array.from(this.schedules.values()).filter((s) => s.enabled).length
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

let schedulerService: SchedulerService | null = null

/**
 * Get or create the scheduler service singleton
 */
export function getSchedulerService(): SchedulerService {
  if (!schedulerService) {
    schedulerService = new SchedulerService()
  }
  return schedulerService
}

/**
 * Create a new scheduler service instance
 */
export function createSchedulerService(queueService?: QueueService): SchedulerService {
  return new SchedulerService(queueService)
}

/**
 * Initialize the scheduler service
 */
export async function initializeSchedulerService(): Promise<SchedulerService> {
  const service = getSchedulerService()
  await service.initialize()
  return service
}

export default SchedulerService
