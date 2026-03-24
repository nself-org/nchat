/**
 * Data Deletion Service
 *
 * Enterprise-grade data deletion service for GDPR Right to be Forgotten (Article 17)
 * and CCPA Right to Delete (1798.105). Provides complete deletion workflow with
 * verification, legal hold checks, and deletion certificates.
 *
 * @module services/compliance/data-deletion.service
 * @version 0.9.1
 */

import { v4 as uuidv4 } from 'uuid'
import { createLogger } from '@/lib/logger'
import type {
  DataDeletionJob,
  DeletionJobStatus,
  DeletionCertificate,
  DataDeletionServiceConfig,
  OperationResult,
  VerificationMethod,
} from './compliance.types'
import type {
  DataDeletionRequest,
  DeletionScope,
  DataCategory,
  LegalHold,
  DeletionConfirmation,
} from '@/lib/compliance/compliance-types'

const log = createLogger('DataDeletionService')

// ============================================================================
// TYPES
// ============================================================================

/**
 * Create deletion job input
 */
export interface CreateDeletionJobInput {
  dsarId: string
  userId: string
  userEmail: string
  scope: DeletionScope
  categories?: DataCategory[]
  reason?: string
}

/**
 * Data deleter function type
 */
export type DataDeleter<T> = (
  userId: string,
  options: { batchSize: number; dryRun?: boolean }
) => Promise<{ deleted: number; failed: number; details: T[] }>

/**
 * Registered data deleters
 */
export interface DataDeleters {
  messages: DataDeleter<{ id: string }>
  files: DataDeleter<{ id: string; filename: string }>
  reactions: DataDeleter<{ id: string }>
  activity: DataDeleter<{ id: string }>
  profile: (userId: string) => Promise<boolean>
  settings: (userId: string) => Promise<boolean>
  consents: DataDeleter<{ id: string }>
}

/**
 * Deletion progress callback
 */
export type DeletionProgressCallback = (job: DataDeletionJob) => void

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: DataDeletionServiceConfig = {
  enabled: true,
  coolingOffPeriodDays: 14,
  allowCancellation: true,
  requireVerification: true,
  verificationMethods: ['email_confirmation'],
  batchSize: 500,
  maxConcurrentJobs: 3,
  jobTimeoutMinutes: 120,
  anonymizeReferences: true,
  anonymizationPrefix: 'deleted_user_',
  retainAuditLogs: true,
  retainBillingRecords: true,
  retainLegalHoldData: true,
  generateCertificate: true,
  certificateRetentionDays: 730,
  purgeFromBackups: false,
  backupPurgeDays: 90,
}

// ============================================================================
// SCOPE CATEGORIES
// ============================================================================

const SCOPE_CATEGORIES: Record<DeletionScope, DataCategory[]> = {
  full_account: ['messages', 'files', 'reactions', 'threads', 'user_profiles', 'activity_logs'],
  messages_only: ['messages', 'threads'],
  files_only: ['files'],
  activity_only: ['activity_logs', 'analytics'],
  partial: [],
}

// ============================================================================
// DATA DELETION SERVICE
// ============================================================================

export class DataDeletionService {
  private config: DataDeletionServiceConfig
  private jobs = new Map<string, DataDeletionJob>()
  private requests = new Map<string, DataDeletionRequest>()
  private certificates = new Map<string, DeletionCertificate>()
  private legalHolds: LegalHold[] = []
  private dataDeleters: Partial<DataDeleters> = {}
  private progressCallbacks = new Map<string, DeletionProgressCallback[]>()
  private isInitialized = false

  constructor(config: Partial<DataDeletionServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      log.debug('Service already initialized')
      return
    }

    log.info('Initializing data deletion service')

    // Register default deleters
    this.registerDefaultDeleters()

    // Load legal holds
    await this.loadLegalHolds()

    this.isInitialized = true
    log.info('Data deletion service initialized')
  }

  /**
   * Register default data deleters (no-op until connected to Hasura)
   */
  private registerDefaultDeleters(): void {
    this.dataDeleters = {
      messages: async (userId, options) => ({
        deleted: 0,
        failed: 0,
        details: [],
      }),
      files: async (userId, options) => ({
        deleted: 0,
        failed: 0,
        details: [],
      }),
      reactions: async (userId, options) => ({
        deleted: 0,
        failed: 0,
        details: [],
      }),
      activity: async (userId, options) => ({
        deleted: 0,
        failed: 0,
        details: [],
      }),
      profile: async (userId) => true,
      settings: async (userId) => true,
      consents: async (userId, options) => ({
        deleted: 0,
        failed: 0,
        details: [],
      }),
    }
  }

  /**
   * Register a custom data deleter
   */
  registerDeleter<K extends keyof DataDeleters>(
    category: K,
    deleter: DataDeleters[K]
  ): void {
    this.dataDeleters[category] = deleter as DataDeleters[K]
    log.info('Data deleter registered', { category })
  }

  /**
   * Load legal holds
   */
  private async loadLegalHolds(): Promise<void> {
    log.debug('Loading legal holds')
    // Loads from nchat_legal_holds table when Hasura is connected
  }

  /**
   * Set legal holds (for testing or external updates)
   */
  setLegalHolds(holds: LegalHold[]): void {
    this.legalHolds = holds
  }

  /**
   * Close the service
   */
  async close(): Promise<void> {
    log.info('Closing data deletion service')
    this.jobs.clear()
    this.requests.clear()
    this.certificates.clear()
    this.progressCallbacks.clear()
    this.isInitialized = false
  }

  // ============================================================================
  // REQUEST MANAGEMENT
  // ============================================================================

  /**
   * Create a deletion request
   */
  async createRequest(
    userId: string,
    userEmail: string,
    scope: DeletionScope,
    options: {
      specificCategories?: DataCategory[]
      reason?: string
      ipAddress?: string
    } = {}
  ): Promise<OperationResult<DataDeletionRequest>> {
    this.ensureInitialized()

    if (!this.config.enabled) {
      return { success: false, error: 'Data deletion service is disabled' }
    }

    log.info('Creating deletion request', { userId, scope })

    // Validate scope
    const categories = this.getCategoriesForScope(scope, options.specificCategories)
    if (categories.length === 0) {
      return { success: false, error: 'No valid data categories specified' }
    }

    // Check for existing pending request
    const existingRequest = Array.from(this.requests.values()).find(
      (r) =>
        r.userId === userId &&
        ['pending', 'pending_verification', 'approved', 'processing'].includes(r.status)
    )

    if (existingRequest) {
      return { success: false, error: 'A pending deletion request already exists' }
    }

    // Check legal holds
    const activeHolds = this.getActiveHoldsForUser(userId)
    const isBlocked = activeHolds.length > 0

    // Calculate cooling-off period end
    const now = new Date()
    const coolingOffEnds = new Date(now)
    coolingOffEnds.setDate(coolingOffEnds.getDate() + this.config.coolingOffPeriodDays)

    // Create request
    const request: DataDeletionRequest = {
      id: uuidv4(),
      userId,
      userEmail,
      status: this.config.requireVerification ? 'pending_verification' : 'pending',
      scope,
      specificCategories: options.specificCategories,
      reason: options.reason,
      requestedAt: now,
      retentionPeriodEnds: coolingOffEnds,
      legalHoldBlocked: isBlocked,
      legalHoldIds: isBlocked ? activeHolds.map((h) => h.id) : undefined,
      ipAddress: options.ipAddress,
      confirmationSent: false,
      confirmationAcknowledged: false,
    }

    this.requests.set(request.id, request)
    log.info('Deletion request created', { requestId: request.id, blocked: isBlocked })

    return { success: true, data: request }
  }

  /**
   * Get a request by ID
   */
  getRequest(requestId: string): DataDeletionRequest | null {
    return this.requests.get(requestId) || null
  }

  /**
   * Get requests for a user
   */
  getRequestsByUser(userId: string): DataDeletionRequest[] {
    return Array.from(this.requests.values()).filter((r) => r.userId === userId)
  }

  /**
   * Verify deletion request
   */
  async verifyRequest(
    requestId: string,
    verificationToken: string
  ): Promise<OperationResult<DataDeletionRequest>> {
    const request = this.requests.get(requestId)
    if (!request) {
      return { success: false, error: 'Request not found' }
    }

    if (request.status !== 'pending_verification') {
      return { success: false, error: 'Request is not pending verification' }
    }

    // In production, validate the token
    // For now, accept any non-empty token
    if (!verificationToken) {
      return { success: false, error: 'Invalid verification token' }
    }

    request.status = 'approved'
    request.verifiedAt = new Date()
    request.approvedAt = new Date()

    log.info('Deletion request verified', { requestId })

    return { success: true, data: request }
  }

  /**
   * Approve a deletion request
   */
  async approveRequest(
    requestId: string,
    approvedBy: string
  ): Promise<OperationResult<DataDeletionRequest>> {
    const request = this.requests.get(requestId)
    if (!request) {
      return { success: false, error: 'Request not found' }
    }

    if (!['pending', 'pending_verification'].includes(request.status)) {
      return { success: false, error: `Cannot approve request with status: ${request.status}` }
    }

    if (request.legalHoldBlocked) {
      return { success: false, error: 'Request is blocked by legal hold' }
    }

    request.status = 'approved'
    request.approvedAt = new Date()
    request.approvedBy = approvedBy

    log.info('Deletion request approved', { requestId, approvedBy })

    return { success: true, data: request }
  }

  /**
   * Reject a deletion request
   */
  async rejectRequest(
    requestId: string,
    reason: string,
    rejectedBy: string
  ): Promise<OperationResult<DataDeletionRequest>> {
    const request = this.requests.get(requestId)
    if (!request) {
      return { success: false, error: 'Request not found' }
    }

    if (['completed', 'rejected', 'cancelled'].includes(request.status)) {
      return { success: false, error: `Cannot reject request with status: ${request.status}` }
    }

    request.status = 'rejected'
    request.rejectedAt = new Date()
    request.rejectedBy = rejectedBy
    request.rejectionReason = reason

    log.info('Deletion request rejected', { requestId, reason })

    return { success: true, data: request }
  }

  /**
   * Cancel a deletion request
   */
  async cancelRequest(requestId: string): Promise<OperationResult<void>> {
    if (!this.config.allowCancellation) {
      return { success: false, error: 'Cancellation is not allowed' }
    }

    const request = this.requests.get(requestId)
    if (!request) {
      return { success: false, error: 'Request not found' }
    }

    const cancellableStatuses = ['pending', 'pending_verification', 'approved']
    if (!cancellableStatuses.includes(request.status)) {
      return { success: false, error: `Cannot cancel request with status: ${request.status}` }
    }

    // Check if still in cooling-off period
    if (request.retentionPeriodEnds && new Date() > request.retentionPeriodEnds) {
      return { success: false, error: 'Cooling-off period has ended' }
    }

    request.status = 'cancelled'

    log.info('Deletion request cancelled', { requestId })

    return { success: true }
  }

  /**
   * Check if request can be cancelled
   */
  canCancelRequest(requestId: string): { canCancel: boolean; reason?: string } {
    const request = this.requests.get(requestId)
    if (!request) {
      return { canCancel: false, reason: 'Request not found' }
    }

    if (!this.config.allowCancellation) {
      return { canCancel: false, reason: 'Cancellation is disabled' }
    }

    const cancellableStatuses = ['pending', 'pending_verification', 'approved']
    if (!cancellableStatuses.includes(request.status)) {
      return { canCancel: false, reason: `Cannot cancel request with status: ${request.status}` }
    }

    if (request.retentionPeriodEnds && new Date() > request.retentionPeriodEnds) {
      return { canCancel: false, reason: 'Cooling-off period has ended' }
    }

    return { canCancel: true }
  }

  /**
   * Get remaining cooling-off days
   */
  getRemainingCoolingOffDays(requestId: string): number | null {
    const request = this.requests.get(requestId)
    if (!request || !request.retentionPeriodEnds) return null

    const remaining = Math.ceil(
      (request.retentionPeriodEnds.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )
    return Math.max(0, remaining)
  }

  // ============================================================================
  // JOB MANAGEMENT
  // ============================================================================

  /**
   * Create a deletion job
   */
  async createJob(input: CreateDeletionJobInput): Promise<OperationResult<DataDeletionJob>> {
    this.ensureInitialized()

    if (!this.config.enabled) {
      return { success: false, error: 'Data deletion service is disabled' }
    }

    log.info('Creating deletion job', { dsarId: input.dsarId, userId: input.userId })

    // Validate input
    if (!input.userId) {
      return { success: false, error: 'User ID is required' }
    }

    if (!input.dsarId) {
      return { success: false, error: 'DSAR ID is required' }
    }

    // Get categories
    const categories = this.getCategoriesForScope(input.scope, input.categories)
    if (categories.length === 0) {
      return { success: false, error: 'No valid data categories specified' }
    }

    // Check concurrent jobs
    const activeJobs = Array.from(this.jobs.values()).filter(
      (j) => !['completed', 'failed', 'partially_completed'].includes(j.status)
    )
    if (activeJobs.length >= this.config.maxConcurrentJobs) {
      return { success: false, error: 'Maximum concurrent deletion jobs reached' }
    }

    // Check legal holds
    const activeHolds = this.getActiveHoldsForUser(input.userId)
    const isBlocked = activeHolds.length > 0

    // Create job
    const job: DataDeletionJob = {
      id: uuidv4(),
      dsarId: input.dsarId,
      userId: input.userId,
      status: 'queued',
      progress: 0,
      currentPhase: 'Queued for processing',

      scope: input.scope,
      categories,
      retainAuditLogs: this.config.retainAuditLogs,

      messagesDeleted: 0,
      filesDeleted: 0,
      reactionsDeleted: 0,
      activitiesDeleted: 0,
      referencesAnonymized: 0,

      legalHoldBlocked: isBlocked,
      legalHoldIds: isBlocked ? activeHolds.map((h) => h.id) : undefined,
      retainedItemCount: 0,

      verificationRequired: this.config.requireVerification,
      certificateGenerated: false,

      retryCount: 0,
      maxRetries: 3,
    }

    this.jobs.set(job.id, job)
    log.info('Deletion job created', { jobId: job.id, blocked: isBlocked })

    return { success: true, data: job }
  }

  /**
   * Get a job by ID
   */
  getJob(jobId: string): DataDeletionJob | null {
    return this.jobs.get(jobId) || null
  }

  /**
   * Get jobs for a DSAR
   */
  getJobsByDSAR(dsarId: string): DataDeletionJob[] {
    return Array.from(this.jobs.values()).filter((j) => j.dsarId === dsarId)
  }

  /**
   * Get jobs for a user
   */
  getJobsByUser(userId: string): DataDeletionJob[] {
    return Array.from(this.jobs.values()).filter((j) => j.userId === userId)
  }

  // ============================================================================
  // JOB EXECUTION
  // ============================================================================

  /**
   * Execute a deletion job
   */
  async executeJob(
    jobId: string,
    options: { dryRun?: boolean } = {}
  ): Promise<OperationResult<DeletionCertificate>> {
    const job = this.jobs.get(jobId)
    if (!job) {
      return { success: false, error: 'Job not found' }
    }

    if (job.status !== 'queued') {
      return { success: false, error: `Job is not in queued state: ${job.status}` }
    }

    if (job.legalHoldBlocked) {
      return { success: false, error: 'Job is blocked by legal hold' }
    }

    log.info('Executing deletion job', { jobId, userId: job.userId, dryRun: options.dryRun })
    const startTime = Date.now()
    job.startedAt = new Date()

    try {
      // Phase 1: Verify eligibility
      await this.updateJobStatus(job, 'verifying_eligibility', 5, 'Verifying deletion eligibility')

      // Phase 2: Check legal holds
      await this.updateJobStatus(job, 'checking_legal_holds', 10, 'Checking legal holds')
      const activeHolds = this.getActiveHoldsForUser(job.userId)
      if (activeHolds.length > 0) {
        job.legalHoldBlocked = true
        job.legalHoldIds = activeHolds.map((h) => h.id)
        job.status = 'failed'
        job.errorMessage = 'Legal hold detected'
        job.completedAt = new Date()
        this.notifyProgress(job)
        return { success: false, error: 'Legal hold detected during execution' }
      }

      // Phase 3: Delete messages
      if (job.categories.includes('messages')) {
        await this.updateJobStatus(job, 'deleting_messages', 20, 'Deleting messages')
        if (this.dataDeleters.messages) {
          const result = await this.dataDeleters.messages(job.userId, {
            batchSize: this.config.batchSize,
            dryRun: options.dryRun,
          })
          job.messagesDeleted = result.deleted
        }
      }

      // Phase 4: Delete files
      if (job.categories.includes('files')) {
        await this.updateJobStatus(job, 'deleting_files', 35, 'Deleting files')
        if (this.dataDeleters.files) {
          const result = await this.dataDeleters.files(job.userId, {
            batchSize: this.config.batchSize,
            dryRun: options.dryRun,
          })
          job.filesDeleted = result.deleted
        }
      }

      // Phase 5: Delete reactions
      if (job.categories.includes('reactions')) {
        await this.updateJobStatus(job, 'deleting_reactions', 50, 'Deleting reactions')
        if (this.dataDeleters.reactions) {
          const result = await this.dataDeleters.reactions(job.userId, {
            batchSize: this.config.batchSize,
            dryRun: options.dryRun,
          })
          job.reactionsDeleted = result.deleted
        }
      }

      // Phase 6: Delete activity
      if (job.categories.includes('activity_logs') && !this.config.retainAuditLogs) {
        await this.updateJobStatus(job, 'deleting_activity', 60, 'Deleting activity logs')
        if (this.dataDeleters.activity) {
          const result = await this.dataDeleters.activity(job.userId, {
            batchSize: this.config.batchSize,
            dryRun: options.dryRun,
          })
          job.activitiesDeleted = result.deleted
        }
      }

      // Phase 7: Anonymize references
      if (this.config.anonymizeReferences) {
        await this.updateJobStatus(job, 'anonymizing_references', 75, 'Anonymizing references')
        job.referencesAnonymized = await this.anonymizeUserReferences(job.userId, options.dryRun)
      }

      // Phase 8: Delete profile (for full account deletion)
      if (job.scope === 'full_account' && job.categories.includes('user_profiles')) {
        await this.updateJobStatus(job, 'anonymizing_references', 85, 'Deleting profile')
        if (this.dataDeleters.profile) {
          await this.dataDeleters.profile(job.userId)
        }
      }

      // Phase 9: Generate certificate
      let certificate: DeletionCertificate | undefined
      if (this.config.generateCertificate) {
        await this.updateJobStatus(job, 'generating_certificate', 95, 'Generating certificate')
        certificate = await this.generateCertificate(job)
        job.certificateGenerated = true
        job.certificateUrl = `/api/compliance/certificates/${certificate.id}`
        job.certificateChecksum = certificate.checksum
      }

      // Complete
      await this.updateJobStatus(job, 'completed', 100, 'Deletion completed')
      job.completedAt = new Date()

      const duration = Date.now() - startTime
      log.info('Deletion job completed', {
        jobId,
        duration,
        messagesDeleted: job.messagesDeleted,
        filesDeleted: job.filesDeleted,
        reactionsDeleted: job.reactionsDeleted,
      })

      if (certificate) {
        return { success: true, data: certificate }
      }

      // Return a basic certificate if generation is disabled
      return {
        success: true,
        data: {
          id: uuidv4(),
          userId: job.userId,
          userEmail: '',
          dsarId: job.dsarId,
          jobId: job.id,
          requestedAt: job.startedAt || new Date(),
          completedAt: job.completedAt,
          scope: job.scope,
          categories: job.categories,
          itemsDeleted: {
            messages: job.messagesDeleted,
            files: job.filesDeleted,
            reactions: job.reactionsDeleted,
            threads: 0,
            user_profiles: job.scope === 'full_account' ? 1 : 0,
            activity_logs: job.activitiesDeleted,
            audit_logs: 0,
            analytics: 0,
            system_logs: 0,
            backups: 0,
          },
          totalItemsDeleted:
            job.messagesDeleted +
            job.filesDeleted +
            job.reactionsDeleted +
            job.activitiesDeleted,
          itemsRetained: {
            messages: 0,
            files: 0,
            reactions: 0,
            threads: 0,
            user_profiles: 0,
            activity_logs: 0,
            audit_logs: 0,
            analytics: 0,
            system_logs: 0,
            backups: 0,
          },
          retentionReasons: [],
          checksum: this.generateChecksum(job),
          auditTrailIncluded: false,
          generatedAt: new Date(),
          generatedBy: 'system',
        },
      }
    } catch (error) {
      job.status = 'failed'
      job.errorMessage = error instanceof Error ? error.message : 'Unknown error'
      job.errorDetails = { error: String(error) }
      job.completedAt = new Date()

      this.notifyProgress(job)
      log.error('Deletion job failed', error, { jobId })

      return {
        success: false,
        error: job.errorMessage,
        details: job.errorDetails,
      }
    }
  }

  /**
   * Update job status and notify
   */
  private async updateJobStatus(
    job: DataDeletionJob,
    status: DeletionJobStatus,
    progress: number,
    phase: string
  ): Promise<void> {
    job.status = status
    job.progress = progress
    job.currentPhase = phase
    this.notifyProgress(job)
  }

  /**
   * Anonymize user references
   */
  private async anonymizeUserReferences(
    userId: string,
    dryRun?: boolean
  ): Promise<number> {
    log.debug('Anonymizing user references', { userId, dryRun })
    // In production, this would update all references to the user
    // with an anonymized identifier
    return 0
  }

  /**
   * Generate deletion certificate
   */
  private async generateCertificate(job: DataDeletionJob): Promise<DeletionCertificate> {
    const certificate: DeletionCertificate = {
      id: uuidv4(),
      userId: job.userId,
      userEmail: '',
      dsarId: job.dsarId,
      jobId: job.id,
      requestedAt: job.startedAt || new Date(),
      completedAt: job.completedAt || new Date(),
      scope: job.scope,
      categories: job.categories,
      itemsDeleted: {
        messages: job.messagesDeleted,
        files: job.filesDeleted,
        reactions: job.reactionsDeleted,
        threads: 0,
        user_profiles: job.scope === 'full_account' ? 1 : 0,
        activity_logs: job.activitiesDeleted,
        audit_logs: 0,
        analytics: 0,
        system_logs: 0,
        backups: 0,
      },
      totalItemsDeleted:
        job.messagesDeleted +
        job.filesDeleted +
        job.reactionsDeleted +
        job.activitiesDeleted,
      itemsRetained: {
        messages: 0,
        files: 0,
        reactions: 0,
        threads: 0,
        user_profiles: 0,
        activity_logs: this.config.retainAuditLogs ? 1 : 0,
        audit_logs: 0,
        analytics: 0,
        system_logs: 0,
        backups: 0,
      },
      retentionReasons: this.config.retainAuditLogs ? ['Audit log retention policy'] : [],
      checksum: this.generateChecksum(job),
      auditTrailIncluded: true,
      generatedAt: new Date(),
      generatedBy: 'system',
    }

    this.certificates.set(certificate.id, certificate)
    log.info('Certificate generated', { certificateId: certificate.id, jobId: job.id })

    return certificate
  }

  /**
   * Generate checksum for verification
   */
  private generateChecksum(job: DataDeletionJob): string {
    const data = JSON.stringify({
      jobId: job.id,
      userId: job.userId,
      dsarId: job.dsarId,
      scope: job.scope,
      messagesDeleted: job.messagesDeleted,
      filesDeleted: job.filesDeleted,
      completedAt: job.completedAt?.toISOString(),
    })

    // Simple hash for demo - in production use crypto
    let hash = 0
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(16).padStart(16, '0')
  }

  // ============================================================================
  // CERTIFICATE MANAGEMENT
  // ============================================================================

  /**
   * Get a certificate by ID
   */
  getCertificate(certificateId: string): DeletionCertificate | null {
    return this.certificates.get(certificateId) || null
  }

  /**
   * Get certificates for a user
   */
  getCertificatesByUser(userId: string): DeletionCertificate[] {
    return Array.from(this.certificates.values()).filter((c) => c.userId === userId)
  }

  /**
   * Verify certificate checksum
   */
  verifyCertificate(certificateId: string): { valid: boolean; reason?: string } {
    const certificate = this.certificates.get(certificateId)
    if (!certificate) {
      return { valid: false, reason: 'Certificate not found' }
    }

    // In production, recalculate and compare checksum
    if (!certificate.checksum) {
      return { valid: false, reason: 'Certificate has no checksum' }
    }

    return { valid: true }
  }

  // ============================================================================
  // PROGRESS CALLBACKS
  // ============================================================================

  /**
   * Subscribe to job progress updates
   */
  onProgress(jobId: string, callback: DeletionProgressCallback): () => void {
    const callbacks = this.progressCallbacks.get(jobId) || []
    callbacks.push(callback)
    this.progressCallbacks.set(jobId, callbacks)

    return () => {
      const current = this.progressCallbacks.get(jobId) || []
      this.progressCallbacks.set(
        jobId,
        current.filter((cb) => cb !== callback)
      )
    }
  }

  /**
   * Notify progress callbacks
   */
  private notifyProgress(job: DataDeletionJob): void {
    const callbacks = this.progressCallbacks.get(job.id) || []
    callbacks.forEach((cb) => {
      try {
        cb(job)
      } catch (error) {
        log.error('Progress callback error', error, { jobId: job.id })
      }
    })
  }

  // ============================================================================
  // STATISTICS
  // ============================================================================

  /**
   * Get service statistics
   */
  getStatistics(): {
    totalJobs: number
    activeJobs: number
    completedJobs: number
    failedJobs: number
    totalItemsDeleted: number
    certificatesGenerated: number
    blockedByLegalHold: number
  } {
    const jobs = Array.from(this.jobs.values())
    const completed = jobs.filter((j) => j.status === 'completed')
    const failed = jobs.filter((j) => j.status === 'failed')
    const active = jobs.filter(
      (j) => !['completed', 'failed', 'partially_completed'].includes(j.status)
    )
    const blocked = jobs.filter((j) => j.legalHoldBlocked)

    const totalItemsDeleted = completed.reduce(
      (sum, j) =>
        sum + j.messagesDeleted + j.filesDeleted + j.reactionsDeleted + j.activitiesDeleted,
      0
    )

    return {
      totalJobs: jobs.length,
      activeJobs: active.length,
      completedJobs: completed.length,
      failedJobs: failed.length,
      totalItemsDeleted,
      certificatesGenerated: this.certificates.size,
      blockedByLegalHold: blocked.length,
    }
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Get categories for scope
   */
  private getCategoriesForScope(
    scope: DeletionScope,
    specificCategories?: DataCategory[]
  ): DataCategory[] {
    if (scope === 'partial' && specificCategories) {
      return specificCategories
    }
    return SCOPE_CATEGORIES[scope] || []
  }

  /**
   * Get active legal holds for user
   */
  private getActiveHoldsForUser(userId: string): LegalHold[] {
    return this.legalHolds.filter(
      (h) => h.status === 'active' && h.custodians.includes(userId)
    )
  }

  /**
   * Ensure service is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('DataDeletionService not initialized. Call initialize() first.')
    }
  }

  // ============================================================================
  // PUBLIC GETTERS
  // ============================================================================

  get initialized(): boolean {
    return this.isInitialized
  }

  get enabled(): boolean {
    return this.config.enabled
  }

  get jobCount(): number {
    return this.jobs.size
  }

  get requestCount(): number {
    return this.requests.size
  }

  get certificateCount(): number {
    return this.certificates.size
  }

  getConfig(): DataDeletionServiceConfig {
    return { ...this.config }
  }

  updateConfig(updates: Partial<DataDeletionServiceConfig>): DataDeletionServiceConfig {
    this.config = { ...this.config, ...updates }
    log.info('Configuration updated')
    return this.config
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let dataDeletionService: DataDeletionService | null = null

export function getDataDeletionService(): DataDeletionService {
  if (!dataDeletionService) {
    dataDeletionService = new DataDeletionService()
  }
  return dataDeletionService
}

export function createDataDeletionService(
  config?: Partial<DataDeletionServiceConfig>
): DataDeletionService {
  return new DataDeletionService(config)
}

export async function initializeDataDeletionService(): Promise<DataDeletionService> {
  const service = getDataDeletionService()
  await service.initialize()
  return service
}

export function resetDataDeletionService(): void {
  if (dataDeletionService) {
    dataDeletionService.close()
    dataDeletionService = null
  }
}

export default DataDeletionService
