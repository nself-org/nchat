/**
 * Retention Policy Service
 *
 * Manages retention policies and legal holds for the nchat platform.
 * Provides CRUD operations for policies and evaluation of retention rules.
 *
 * @module services/retention/retention-policy.service
 * @version 0.9.1
 */

import { createLogger } from '@/lib/logger'
import {
  type RetentionPolicy,
  type RetentionRule,
  type RetentionScope,
  type RetentionContentType,
  type RetentionPolicyStatus,
  type RetentionResolutionContext,
  type ResolvedRetentionPolicy,
  type CreateRetentionPolicyInput,
  type UpdateRetentionPolicyInput,
  type LegalHold,
  type LegalHoldStatus,
  type CreateLegalHoldInput,
  type UpdateLegalHoldInput,
  type RetentionStats,
  type RetentionAuditEntry,
  type RetentionAuditEventType,
  type RetentionConfig,
  DEFAULT_RETENTION_CONFIG,
  generateRetentionId,
  ALL_CONTENT_TYPES,
} from '@/lib/retention/retention-types'
import {
  resolveRetentionPolicy,
  validatePolicy,
  validateLegalHold,
  detectPolicyConflicts,
  filterApplicablePolicies,
} from '@/lib/retention/policy-inheritance'

const log = createLogger('RetentionPolicyService')

// ============================================================================
// TYPES
// ============================================================================

/**
 * Options for listing policies
 */
export interface ListPoliciesOptions {
  scope?: RetentionScope
  targetId?: string
  status?: RetentionPolicyStatus
  contentType?: RetentionContentType
  limit?: number
  offset?: number
}

/**
 * Options for listing legal holds
 */
export interface ListLegalHoldsOptions {
  status?: LegalHoldStatus
  matterReference?: string
  createdBy?: string
  limit?: number
  offset?: number
}

/**
 * Result of policy operations
 */
export interface PolicyOperationResult<T> {
  success: boolean
  data?: T
  error?: string
}

// ============================================================================
// RETENTION POLICY SERVICE
// ============================================================================

/**
 * Service for managing retention policies and legal holds
 */
export class RetentionPolicyService {
  private policies = new Map<string, RetentionPolicy>()
  private legalHolds = new Map<string, LegalHold>()
  private auditLog: RetentionAuditEntry[] = []
  private config: RetentionConfig
  private isInitialized = false

  constructor(config?: Partial<RetentionConfig>) {
    this.config = { ...DEFAULT_RETENTION_CONFIG, ...config }
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

    log.info('Initializing retention policy service')

    // Load policies from Hasura when connected
    await this.loadPolicies()

    // Load legal holds from Hasura when connected
    await this.loadLegalHolds()

    this.isInitialized = true
    log.info('Retention policy service initialized', {
      policyCount: this.policies.size,
      legalHoldCount: this.legalHolds.size,
    })
  }

  /**
   * Load policies from database
   */
  private async loadPolicies(): Promise<void> {
    // Loads from nchat_retention_policies table when Hasura is connected
    log.debug('Loading policies from database')
  }

  /**
   * Load legal holds from database
   */
  private async loadLegalHolds(): Promise<void> {
    // Loads from nchat_legal_holds table when Hasura is connected
    log.debug('Loading legal holds from database')
  }

  /**
   * Close the service
   */
  async close(): Promise<void> {
    log.info('Closing retention policy service')
    this.policies.clear()
    this.legalHolds.clear()
    this.auditLog = []
    this.isInitialized = false
  }

  // ============================================================================
  // POLICY CRUD OPERATIONS
  // ============================================================================

  /**
   * Create a new retention policy
   */
  async createPolicy(
    input: CreateRetentionPolicyInput,
    actorId: string
  ): Promise<PolicyOperationResult<RetentionPolicy>> {
    this.ensureInitialized()

    log.info('Creating retention policy', { name: input.name, scope: input.scope })

    // Generate ID
    const id = generateRetentionId('pol')
    const now = new Date()

    // Build policy object
    const policy: RetentionPolicy = {
      id,
      name: input.name,
      description: input.description || '',
      scope: input.scope,
      targetId: input.targetId || null,
      status: 'active',
      rules: input.rules,
      allowOverride: input.allowOverride ?? true,
      inheritable: input.inheritable ?? true,
      priority: input.priority ?? 0,
      createdBy: actorId,
      createdAt: now,
      updatedAt: now,
      metadata: input.metadata,
    }

    // Validate policy
    const validation = validatePolicy(policy)
    if (!validation.valid) {
      log.warn('Policy validation failed', { errors: validation.errors })
      return { success: false, error: `Validation failed: ${validation.errors.join(', ')}` }
    }

    // Check for conflicts
    const existingPolicies = Array.from(this.policies.values())
    const conflicts = detectPolicyConflicts([...existingPolicies, policy])
    if (conflicts.length > 0) {
      log.warn('Policy conflicts detected', { conflicts })
      // We allow conflicts but log them - they'll be resolved at evaluation time
    }

    // Store policy
    this.policies.set(id, policy)

    // Audit log
    this.addAuditEntry({
      eventType: 'policy_created',
      actorId,
      policyId: id,
      details: { name: policy.name, scope: policy.scope },
    })

    log.info('Policy created successfully', { id, name: policy.name })

    return { success: true, data: policy }
  }

  /**
   * Get a policy by ID
   */
  getPolicy(policyId: string): RetentionPolicy | null {
    return this.policies.get(policyId) || null
  }

  /**
   * Update an existing policy
   */
  async updatePolicy(
    policyId: string,
    updates: UpdateRetentionPolicyInput,
    actorId: string
  ): Promise<PolicyOperationResult<RetentionPolicy>> {
    this.ensureInitialized()

    const policy = this.policies.get(policyId)
    if (!policy) {
      return { success: false, error: 'Policy not found' }
    }

    log.info('Updating retention policy', { id: policyId })

    // Apply updates
    const updatedPolicy: RetentionPolicy = {
      ...policy,
      name: updates.name ?? policy.name,
      description: updates.description ?? policy.description,
      status: updates.status ?? policy.status,
      rules: updates.rules ?? policy.rules,
      allowOverride: updates.allowOverride ?? policy.allowOverride,
      inheritable: updates.inheritable ?? policy.inheritable,
      priority: updates.priority ?? policy.priority,
      metadata: updates.metadata ?? policy.metadata,
      updatedAt: new Date(),
    }

    // Validate updated policy
    const validation = validatePolicy(updatedPolicy)
    if (!validation.valid) {
      return { success: false, error: `Validation failed: ${validation.errors.join(', ')}` }
    }

    // Store updated policy
    this.policies.set(policyId, updatedPolicy)

    // Audit log
    this.addAuditEntry({
      eventType: 'policy_updated',
      actorId,
      policyId,
      details: { updates: Object.keys(updates) },
    })

    log.info('Policy updated successfully', { id: policyId })

    return { success: true, data: updatedPolicy }
  }

  /**
   * Delete a policy
   */
  async deletePolicy(
    policyId: string,
    actorId: string
  ): Promise<PolicyOperationResult<void>> {
    this.ensureInitialized()

    const policy = this.policies.get(policyId)
    if (!policy) {
      return { success: false, error: 'Policy not found' }
    }

    log.info('Deleting retention policy', { id: policyId, name: policy.name })

    // Remove policy
    this.policies.delete(policyId)

    // Audit log
    this.addAuditEntry({
      eventType: 'policy_deleted',
      actorId,
      policyId,
      details: { name: policy.name },
    })

    log.info('Policy deleted successfully', { id: policyId })

    return { success: true }
  }

  /**
   * Activate a policy
   */
  async activatePolicy(
    policyId: string,
    actorId: string
  ): Promise<PolicyOperationResult<RetentionPolicy>> {
    return this.updatePolicy(policyId, { status: 'active' }, actorId)
  }

  /**
   * Deactivate a policy
   */
  async deactivatePolicy(
    policyId: string,
    actorId: string
  ): Promise<PolicyOperationResult<RetentionPolicy>> {
    return this.updatePolicy(policyId, { status: 'inactive' }, actorId)
  }

  /**
   * List policies with optional filtering
   */
  listPolicies(options?: ListPoliciesOptions): RetentionPolicy[] {
    let policies = Array.from(this.policies.values())

    if (options?.scope) {
      policies = policies.filter((p) => p.scope === options.scope)
    }

    if (options?.targetId) {
      policies = policies.filter((p) => p.targetId === options.targetId)
    }

    if (options?.status) {
      policies = policies.filter((p) => p.status === options.status)
    }

    if (options?.contentType) {
      policies = policies.filter((p) =>
        p.rules.some((r) => r.contentType === options.contentType && r.enabled)
      )
    }

    // Apply pagination
    const offset = options?.offset ?? 0
    const limit = options?.limit ?? 100

    return policies.slice(offset, offset + limit)
  }

  /**
   * Get policies by scope and target
   */
  getPoliciesByTarget(
    scope: RetentionScope,
    targetId: string | null
  ): RetentionPolicy[] {
    return Array.from(this.policies.values()).filter(
      (p) => p.scope === scope && p.targetId === targetId
    )
  }

  // ============================================================================
  // LEGAL HOLD OPERATIONS
  // ============================================================================

  /**
   * Create a legal hold
   */
  async createLegalHold(
    input: CreateLegalHoldInput,
    actorId: string
  ): Promise<PolicyOperationResult<LegalHold>> {
    this.ensureInitialized()

    log.info('Creating legal hold', { name: input.name, matterReference: input.matterReference })

    const id = generateRetentionId('lh')
    const now = new Date()

    const hold: LegalHold = {
      id,
      name: input.name,
      description: input.description,
      matterReference: input.matterReference,
      scope: input.scope,
      status: 'active',
      createdBy: actorId,
      createdAt: now,
      updatedAt: now,
      expiresAt: input.expiresAt,
      metadata: input.metadata,
    }

    // Validate legal hold
    const validation = validateLegalHold(hold)
    if (!validation.valid) {
      return { success: false, error: `Validation failed: ${validation.errors.join(', ')}` }
    }

    // Store legal hold
    this.legalHolds.set(id, hold)

    // Audit log
    this.addAuditEntry({
      eventType: 'legal_hold_created',
      actorId,
      legalHoldId: id,
      details: { name: hold.name, matterReference: hold.matterReference },
    })

    log.info('Legal hold created successfully', { id, name: hold.name })

    return { success: true, data: hold }
  }

  /**
   * Get a legal hold by ID
   */
  getLegalHold(holdId: string): LegalHold | null {
    return this.legalHolds.get(holdId) || null
  }

  /**
   * Update a legal hold
   */
  async updateLegalHold(
    holdId: string,
    updates: UpdateLegalHoldInput,
    actorId: string
  ): Promise<PolicyOperationResult<LegalHold>> {
    this.ensureInitialized()

    const hold = this.legalHolds.get(holdId)
    if (!hold) {
      return { success: false, error: 'Legal hold not found' }
    }

    if (hold.status === 'released') {
      return { success: false, error: 'Cannot update a released legal hold' }
    }

    log.info('Updating legal hold', { id: holdId })

    // Apply updates
    const updatedHold: LegalHold = {
      ...hold,
      name: updates.name ?? hold.name,
      description: updates.description ?? hold.description,
      matterReference: updates.matterReference ?? hold.matterReference,
      scope: updates.scope ? { ...hold.scope, ...updates.scope } : hold.scope,
      expiresAt: updates.expiresAt ?? hold.expiresAt,
      metadata: updates.metadata ?? hold.metadata,
      updatedAt: new Date(),
    }

    // Validate
    const validation = validateLegalHold(updatedHold)
    if (!validation.valid) {
      return { success: false, error: `Validation failed: ${validation.errors.join(', ')}` }
    }

    // Store updated hold
    this.legalHolds.set(holdId, updatedHold)

    // Audit log
    this.addAuditEntry({
      eventType: 'legal_hold_updated',
      actorId,
      legalHoldId: holdId,
      details: { updates: Object.keys(updates) },
    })

    return { success: true, data: updatedHold }
  }

  /**
   * Release a legal hold
   */
  async releaseLegalHold(
    holdId: string,
    actorId: string
  ): Promise<PolicyOperationResult<LegalHold>> {
    this.ensureInitialized()

    const hold = this.legalHolds.get(holdId)
    if (!hold) {
      return { success: false, error: 'Legal hold not found' }
    }

    if (hold.status === 'released') {
      return { success: false, error: 'Legal hold is already released' }
    }

    log.info('Releasing legal hold', { id: holdId, name: hold.name })

    const now = new Date()
    const releasedHold: LegalHold = {
      ...hold,
      status: 'released',
      releasedAt: now,
      releasedBy: actorId,
      updatedAt: now,
    }

    this.legalHolds.set(holdId, releasedHold)

    // Audit log
    this.addAuditEntry({
      eventType: 'legal_hold_released',
      actorId,
      legalHoldId: holdId,
      details: { name: hold.name, matterReference: hold.matterReference },
    })

    log.info('Legal hold released successfully', { id: holdId })

    return { success: true, data: releasedHold }
  }

  /**
   * List legal holds with optional filtering
   */
  listLegalHolds(options?: ListLegalHoldsOptions): LegalHold[] {
    let holds = Array.from(this.legalHolds.values())

    if (options?.status) {
      holds = holds.filter((h) => h.status === options.status)
    }

    if (options?.matterReference) {
      holds = holds.filter((h) => h.matterReference === options.matterReference)
    }

    if (options?.createdBy) {
      holds = holds.filter((h) => h.createdBy === options.createdBy)
    }

    // Apply pagination
    const offset = options?.offset ?? 0
    const limit = options?.limit ?? 100

    return holds.slice(offset, offset + limit)
  }

  /**
   * Get active legal holds
   */
  getActiveLegalHolds(): LegalHold[] {
    return this.listLegalHolds({ status: 'active' })
  }

  /**
   * Check for expired legal holds and update their status
   */
  async processExpiredLegalHolds(actorId: string): Promise<string[]> {
    const now = new Date()
    const expiredHolds: string[] = []

    for (const hold of this.legalHolds.values()) {
      if (
        hold.status === 'active' &&
        hold.expiresAt &&
        hold.expiresAt < now
      ) {
        hold.status = 'expired'
        hold.updatedAt = now
        expiredHolds.push(hold.id)

        this.addAuditEntry({
          eventType: 'legal_hold_released',
          actorId,
          legalHoldId: hold.id,
          details: { reason: 'expired', expiresAt: hold.expiresAt },
        })
      }
    }

    if (expiredHolds.length > 0) {
      log.info('Processed expired legal holds', { count: expiredHolds.length })
    }

    return expiredHolds
  }

  // ============================================================================
  // POLICY RESOLUTION
  // ============================================================================

  /**
   * Resolve effective retention policy for a context
   */
  resolvePolicy(context: RetentionResolutionContext): ResolvedRetentionPolicy {
    const policies = Array.from(this.policies.values())
    const legalHolds = Array.from(this.legalHolds.values())

    return resolveRetentionPolicy(policies, legalHolds, context)
  }

  /**
   * Check if deletion is blocked for a specific context
   */
  isDeletionBlocked(context: RetentionResolutionContext): {
    blocked: boolean
    reason?: string
    legalHolds?: string[]
  } {
    const resolved = this.resolvePolicy(context)

    if (resolved.deletionBlocked) {
      return {
        blocked: true,
        reason: 'Content is under legal hold',
        legalHolds: resolved.activeLegalHolds,
      }
    }

    return { blocked: false }
  }

  /**
   * Get applicable policies for a context
   */
  getApplicablePolicies(context: RetentionResolutionContext): RetentionPolicy[] {
    const policies = Array.from(this.policies.values())
    return filterApplicablePolicies(policies, context)
  }

  // ============================================================================
  // STATISTICS
  // ============================================================================

  /**
   * Get retention statistics
   */
  getStats(): RetentionStats {
    const policies = Array.from(this.policies.values())
    const holds = Array.from(this.legalHolds.values())

    const byContentType: Record<
      RetentionContentType,
      {
        total: number
        pendingDeletion: number
        deleted: number
        archived: number
      }
    > = {} as Record<
      RetentionContentType,
      {
        total: number
        pendingDeletion: number
        deleted: number
        archived: number
      }
    >

    for (const ct of ALL_CONTENT_TYPES) {
      byContentType[ct] = {
        total: 0,
        pendingDeletion: 0,
        deleted: 0,
        archived: 0,
      }
    }

    return {
      totalItems: 0, // Would be populated from database
      pendingDeletion: 0,
      inGracePeriod: 0,
      blockedByLegalHold: 0,
      deletedLast30Days: 0,
      archivedLast30Days: 0,
      storageFreeBytes: 0,
      byContentType,
      activePolicies: policies.filter((p) => p.status === 'active').length,
      activeLegalHolds: holds.filter((h) => h.status === 'active').length,
    }
  }

  // ============================================================================
  // AUDIT LOG
  // ============================================================================

  /**
   * Add an audit log entry
   */
  private addAuditEntry(params: {
    eventType: RetentionAuditEventType
    actorId: string
    policyId?: string
    jobId?: string
    legalHoldId?: string
    itemId?: string
    contentType?: RetentionContentType
    details: Record<string, unknown>
    ipAddress?: string
    userAgent?: string
  }): void {
    const entry: RetentionAuditEntry = {
      id: generateRetentionId('audit'),
      eventType: params.eventType,
      timestamp: new Date(),
      actorId: params.actorId,
      policyId: params.policyId,
      jobId: params.jobId,
      legalHoldId: params.legalHoldId,
      itemId: params.itemId,
      contentType: params.contentType,
      details: params.details,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    }

    this.auditLog.push(entry)

    // Trim audit log if too large (keep last 10000 entries in memory)
    if (this.auditLog.length > 10000) {
      this.auditLog = this.auditLog.slice(-10000)
    }
  }

  /**
   * Get audit log entries
   */
  getAuditLog(options?: {
    eventTypes?: RetentionAuditEventType[]
    policyId?: string
    legalHoldId?: string
    actorId?: string
    startDate?: Date
    endDate?: Date
    limit?: number
    offset?: number
  }): RetentionAuditEntry[] {
    let entries = [...this.auditLog]

    if (options?.eventTypes && options.eventTypes.length > 0) {
      entries = entries.filter((e) => options.eventTypes!.includes(e.eventType))
    }

    if (options?.policyId) {
      entries = entries.filter((e) => e.policyId === options.policyId)
    }

    if (options?.legalHoldId) {
      entries = entries.filter((e) => e.legalHoldId === options.legalHoldId)
    }

    if (options?.actorId) {
      entries = entries.filter((e) => e.actorId === options.actorId)
    }

    if (options?.startDate) {
      entries = entries.filter((e) => e.timestamp >= options.startDate!)
    }

    if (options?.endDate) {
      entries = entries.filter((e) => e.timestamp <= options.endDate!)
    }

    // Sort by timestamp descending
    entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    // Apply pagination
    const offset = options?.offset ?? 0
    const limit = options?.limit ?? 100

    return entries.slice(offset, offset + limit)
  }

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  /**
   * Get current configuration
   */
  getConfig(): RetentionConfig {
    return { ...this.config }
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<RetentionConfig>): RetentionConfig {
    this.config = { ...this.config, ...updates }
    log.info('Configuration updated')
    return this.config
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  /**
   * Ensure service is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('RetentionPolicyService not initialized. Call initialize() first.')
    }
  }

  /**
   * Check if service is initialized
   */
  get initialized(): boolean {
    return this.isInitialized
  }

  /**
   * Get total policy count
   */
  get policyCount(): number {
    return this.policies.size
  }

  /**
   * Get total legal hold count
   */
  get legalHoldCount(): number {
    return this.legalHolds.size
  }

  /**
   * Export all policies (for backup/migration)
   */
  exportPolicies(): RetentionPolicy[] {
    return Array.from(this.policies.values())
  }

  /**
   * Import policies (for restore/migration)
   */
  importPolicies(policies: RetentionPolicy[], actorId: string): {
    imported: number
    failed: number
    errors: string[]
  } {
    let imported = 0
    let failed = 0
    const errors: string[] = []

    for (const policy of policies) {
      const validation = validatePolicy(policy)
      if (validation.valid) {
        this.policies.set(policy.id, policy)
        imported++
      } else {
        failed++
        errors.push(`Policy ${policy.id}: ${validation.errors.join(', ')}`)
      }
    }

    this.addAuditEntry({
      eventType: 'policy_created',
      actorId,
      details: { action: 'bulk_import', imported, failed },
    })

    return { imported, failed, errors }
  }

  /**
   * Export all legal holds (for backup/migration)
   */
  exportLegalHolds(): LegalHold[] {
    return Array.from(this.legalHolds.values())
  }

  /**
   * Import legal holds (for restore/migration)
   */
  importLegalHolds(holds: LegalHold[], actorId: string): {
    imported: number
    failed: number
    errors: string[]
  } {
    let imported = 0
    let failed = 0
    const errors: string[] = []

    for (const hold of holds) {
      const validation = validateLegalHold(hold)
      if (validation.valid) {
        this.legalHolds.set(hold.id, hold)
        imported++
      } else {
        failed++
        errors.push(`Legal hold ${hold.id}: ${validation.errors.join(', ')}`)
      }
    }

    this.addAuditEntry({
      eventType: 'legal_hold_created',
      actorId,
      details: { action: 'bulk_import', imported, failed },
    })

    return { imported, failed, errors }
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let retentionPolicyService: RetentionPolicyService | null = null

/**
 * Get or create the retention policy service singleton
 */
export function getRetentionPolicyService(): RetentionPolicyService {
  if (!retentionPolicyService) {
    retentionPolicyService = new RetentionPolicyService()
  }
  return retentionPolicyService
}

/**
 * Create a new retention policy service instance
 */
export function createRetentionPolicyService(
  config?: Partial<RetentionConfig>
): RetentionPolicyService {
  return new RetentionPolicyService(config)
}

/**
 * Initialize the retention policy service
 */
export async function initializeRetentionPolicyService(): Promise<RetentionPolicyService> {
  const service = getRetentionPolicyService()
  await service.initialize()
  return service
}

/**
 * Reset the singleton (for testing)
 */
export function resetRetentionPolicyService(): void {
  if (retentionPolicyService) {
    retentionPolicyService.close()
    retentionPolicyService = null
  }
}

export default RetentionPolicyService
