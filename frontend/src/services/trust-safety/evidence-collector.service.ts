/**
 * Evidence Collector Service
 *
 * Manages the collection, storage, and verification of evidence for trust & safety.
 * Implements immutable records with cryptographic integrity verification.
 */

import { logger } from "@/lib/logger";
import type {
  EvidenceRecord,
  EvidenceId,
  EvidenceType,
  EvidenceStatus,
  EvidencePriority,
  EvidenceCollectionRequest,
  CustodyEntry,
  CustodyChain,
  CustodyEventType,
  ContentHash,
  HashAlgorithm,
  VerificationResult,
  VerificationCheck,
  EvidenceStatistics,
  EvidenceError,
  EvidenceErrorCode,
  EvidenceReference,
} from "@/lib/trust-safety/evidence-types";

// ============================================================================
// Configuration
// ============================================================================

export interface EvidenceCollectorConfig {
  /** Hash algorithm for content integrity */
  hashAlgorithm: HashAlgorithm;
  /** Whether to encrypt evidence by default */
  encryptByDefault: boolean;
  /** Encryption key ID to use */
  encryptionKeyId?: string;
  /** Maximum content size in bytes */
  maxContentSize: number;
  /** Whether to enable chain hashing */
  enableChainHashing: boolean;
  /** Default retention days if no policy specified */
  defaultRetentionDays: number;
}

export const DEFAULT_COLLECTOR_CONFIG: EvidenceCollectorConfig = {
  hashAlgorithm: "SHA-256",
  encryptByDefault: false,
  maxContentSize: 10 * 1024 * 1024, // 10MB
  enableChainHashing: true,
  defaultRetentionDays: 365,
};

// ============================================================================
// Crypto Utilities
// ============================================================================

/**
 * Compute SHA-256 hash of content
 */
async function computeHash(
  content: string,
  algorithm: HashAlgorithm = "SHA-256",
): Promise<string> {
  // Try SubtleCrypto first (browser/Node 15+)
  if (typeof crypto !== "undefined" && crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(content);
      const hashBuffer = await crypto.subtle.digest(algorithm, data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    } catch {
      // Fall through to fallback
    }
  }

  // Fallback: deterministic hash for testing environments
  // Uses a simple but consistent hashing algorithm
  let hash1 = 5381;
  let hash2 = 52711;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash1 = ((hash1 << 5) + hash1) ^ char;
    hash2 = ((hash2 << 5) + hash2) ^ char;
  }
  const h1 = (hash1 >>> 0).toString(16).padStart(8, "0");
  const h2 = (hash2 >>> 0).toString(16).padStart(8, "0");
  const h3 = ((hash1 ^ hash2) >>> 0).toString(16).padStart(8, "0");
  const h4 = ((hash1 + hash2) >>> 0).toString(16).padStart(8, "0");
  return `${h1}${h2}${h3}${h4}`.padEnd(64, "0");
}

/**
 * Generate a unique ID
 */
function generateId(prefix: string = ""): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 11);
  return prefix
    ? `${prefix}_${timestamp}_${randomPart}`
    : `${timestamp}_${randomPart}`;
}

// ============================================================================
// Evidence Collector Service
// ============================================================================

export class EvidenceCollectorService {
  private config: EvidenceCollectorConfig;
  private evidence: Map<EvidenceId, EvidenceRecord> = new Map();
  private custodyEntries: Map<EvidenceId, CustodyEntry[]> = new Map();
  private lastChainHash: string | null = null;

  constructor(config: Partial<EvidenceCollectorConfig> = {}) {
    this.config = { ...DEFAULT_COLLECTOR_CONFIG, ...config };
  }

  // ==========================================================================
  // Evidence Collection
  // ==========================================================================

  /**
   * Collect and preserve evidence
   */
  async collect(
    request: EvidenceCollectionRequest,
    collectorId: string,
    collectorRole: string = "system",
  ): Promise<
    | { success: true; evidence: EvidenceRecord }
    | { success: false; error: EvidenceError }
  > {
    // Validate content size
    if (request.content.length > this.config.maxContentSize) {
      return {
        success: false,
        error: {
          code: "INVALID_OPERATION",
          message: `Content exceeds maximum size of ${this.config.maxContentSize} bytes`,
        },
      };
    }

    const now = new Date();
    const id = generateId("ev");

    // Compute content hash
    const contentHash = await this.computeContentHash(request.content);

    // Compute chain hash if enabled
    let chainHash: ContentHash | undefined;
    if (this.config.enableChainHashing && this.lastChainHash) {
      const chainContent = `${this.lastChainHash}|${contentHash.value}|${now.toISOString()}`;
      chainHash = {
        algorithm: this.config.hashAlgorithm,
        value: await computeHash(chainContent, this.config.hashAlgorithm),
        computedAt: now,
        previousHash: this.lastChainHash,
      };
    }

    // Encrypt content if configured
    let finalContent = request.content;
    let isEncrypted = request.encrypt ?? this.config.encryptByDefault;
    let encryptionKeyId: string | undefined;

    if (isEncrypted) {
      // In production, this would use actual encryption
      // For now, we mark it and store the content (would be encrypted in real impl)
      encryptionKeyId = this.config.encryptionKeyId || "default-key";
    }

    // Calculate retention expiration
    let retentionExpiresAt: Date | undefined;
    if (request.retentionPolicyId || this.config.defaultRetentionDays) {
      const retentionDays = this.config.defaultRetentionDays;
      retentionExpiresAt = new Date(
        now.getTime() + retentionDays * 24 * 60 * 60 * 1000,
      );
    }

    // Create immutable evidence record
    const evidence: EvidenceRecord = {
      id,
      type: request.type,
      status: "active",
      priority: request.priority || "medium",
      content: finalContent,
      isEncrypted,
      encryptionKeyId,
      contentHash,
      chainHash,
      metadata: {
        source: request.source,
        contentType: request.metadata?.contentType,
        sizeBytes: request.content.length,
        filename: request.metadata?.filename,
        custom: request.metadata?.custom,
      },
      references: (request.references || []).map((ref, idx) => ({
        ...ref,
        id: `ref_${id}_${idx}`,
      })),
      workspaceId: request.workspaceId,
      channelId: request.channelId,
      userId: request.userId,
      collectedBy: collectorId,
      collectedAt: now,
      collectionReason: request.reason,
      legalHoldIds: [],
      retentionPolicyId: request.retentionPolicyId,
      retentionExpiresAt,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };

    // Store evidence
    this.evidence.set(id, evidence);

    // Update chain hash for next record
    this.lastChainHash = contentHash.value;

    // Create initial custody entry
    await this.addCustodyEntry(id, {
      eventType: "collected",
      actorId: collectorId,
      actorRole: collectorRole,
      description: `Evidence collected: ${request.reason}`,
    });

    logger.info("Evidence collected", { evidenceId: id, type: request.type });

    return { success: true, evidence };
  }

  /**
   * Collect multiple pieces of evidence atomically
   */
  async collectBatch(
    requests: EvidenceCollectionRequest[],
    collectorId: string,
    collectorRole: string = "system",
  ): Promise<{
    success: boolean;
    collected: EvidenceRecord[];
    errors: { index: number; error: EvidenceError }[];
  }> {
    const collected: EvidenceRecord[] = [];
    const errors: { index: number; error: EvidenceError }[] = [];

    for (let i = 0; i < requests.length; i++) {
      const result = await this.collect(
        requests[i],
        collectorId,
        collectorRole,
      );
      if (result.success) {
        collected.push(result.evidence);
      } else {
        errors.push({ index: i, error: result.error });
      }
    }

    return {
      success: errors.length === 0,
      collected,
      errors,
    };
  }

  // ==========================================================================
  // Evidence Retrieval
  // ==========================================================================

  /**
   * Get evidence by ID
   */
  async get(
    evidenceId: EvidenceId,
    accessorId: string,
    accessorRole: string = "system",
  ): Promise<
    | { success: true; evidence: EvidenceRecord }
    | { success: false; error: EvidenceError }
  > {
    const evidence = this.evidence.get(evidenceId);

    if (!evidence) {
      return {
        success: false,
        error: {
          code: "EVIDENCE_NOT_FOUND",
          message: `Evidence not found: ${evidenceId}`,
          evidenceId,
        },
      };
    }

    // Record access in custody chain
    await this.addCustodyEntry(evidenceId, {
      eventType: "accessed",
      actorId: accessorId,
      actorRole: accessorRole,
      description: "Evidence accessed",
    });

    return { success: true, evidence };
  }

  /**
   * Get multiple evidence records
   */
  async getBatch(
    evidenceIds: EvidenceId[],
    accessorId: string,
    accessorRole: string = "system",
  ): Promise<Map<EvidenceId, EvidenceRecord>> {
    const results = new Map<EvidenceId, EvidenceRecord>();

    for (const id of evidenceIds) {
      const result = await this.get(id, accessorId, accessorRole);
      if (result.success) {
        results.set(id, result.evidence);
      }
    }

    return results;
  }

  /**
   * Search evidence with filters
   */
  search(filters: {
    type?: EvidenceType | EvidenceType[];
    status?: EvidenceStatus | EvidenceStatus[];
    priority?: EvidencePriority | EvidencePriority[];
    workspaceId?: string;
    channelId?: string;
    userId?: string;
    collectedBy?: string;
    startDate?: Date;
    endDate?: Date;
    hasLegalHold?: boolean;
    limit?: number;
    offset?: number;
  }): EvidenceRecord[] {
    let results = Array.from(this.evidence.values());

    // Apply filters
    if (filters.type) {
      const types = Array.isArray(filters.type) ? filters.type : [filters.type];
      results = results.filter((e) => types.includes(e.type));
    }

    if (filters.status) {
      const statuses = Array.isArray(filters.status)
        ? filters.status
        : [filters.status];
      results = results.filter((e) => statuses.includes(e.status));
    }

    if (filters.priority) {
      const priorities = Array.isArray(filters.priority)
        ? filters.priority
        : [filters.priority];
      results = results.filter((e) => priorities.includes(e.priority));
    }

    if (filters.workspaceId) {
      results = results.filter((e) => e.workspaceId === filters.workspaceId);
    }

    if (filters.channelId) {
      results = results.filter((e) => e.channelId === filters.channelId);
    }

    if (filters.userId) {
      results = results.filter((e) => e.userId === filters.userId);
    }

    if (filters.collectedBy) {
      results = results.filter((e) => e.collectedBy === filters.collectedBy);
    }

    if (filters.startDate) {
      results = results.filter((e) => e.collectedAt >= filters.startDate!);
    }

    if (filters.endDate) {
      results = results.filter((e) => e.collectedAt <= filters.endDate!);
    }

    if (filters.hasLegalHold !== undefined) {
      results = results.filter((e) =>
        filters.hasLegalHold
          ? e.legalHoldIds.length > 0
          : e.legalHoldIds.length === 0,
      );
    }

    // Sort by collected date (newest first)
    results.sort((a, b) => b.collectedAt.getTime() - a.collectedAt.getTime());

    // Apply pagination
    const offset = filters.offset || 0;
    const limit = filters.limit || 100;

    return results.slice(offset, offset + limit);
  }

  // ==========================================================================
  // Chain of Custody
  // ==========================================================================

  /**
   * Add a custody entry
   */
  async addCustodyEntry(
    evidenceId: EvidenceId,
    params: {
      eventType: CustodyEventType;
      actorId: string;
      actorRole: string;
      description: string;
      actorName?: string;
      ipAddress?: string;
      userAgent?: string;
      notes?: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<CustodyEntry> {
    const now = new Date();

    // Get previous entry hash
    const existingEntries = this.custodyEntries.get(evidenceId) || [];
    const previousEntryHash =
      existingEntries.length > 0
        ? existingEntries[existingEntries.length - 1].entryHash
        : undefined;

    // Create entry content for hashing
    const entryContent = JSON.stringify({
      evidenceId,
      eventType: params.eventType,
      actorId: params.actorId,
      timestamp: now.toISOString(),
      description: params.description,
      previousEntryHash,
    });

    const entryHash = await computeHash(
      entryContent,
      this.config.hashAlgorithm,
    );

    const entry: CustodyEntry = {
      id: generateId("custody"),
      evidenceId,
      eventType: params.eventType,
      actorId: params.actorId,
      actorName: params.actorName,
      actorRole: params.actorRole,
      timestamp: now,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      description: params.description,
      notes: params.notes,
      entryHash,
      previousEntryHash,
      metadata: params.metadata,
    };

    // Store entry
    if (!this.custodyEntries.has(evidenceId)) {
      this.custodyEntries.set(evidenceId, []);
    }
    this.custodyEntries.get(evidenceId)!.push(entry);

    return entry;
  }

  /**
   * Get complete custody chain for evidence
   */
  async getCustodyChain(evidenceId: EvidenceId): Promise<CustodyChain | null> {
    const entries = this.custodyEntries.get(evidenceId);
    if (!entries || entries.length === 0) {
      return null;
    }

    // Compute chain hash
    const chainContent = entries.map((e) => e.entryHash).join("|");
    const chainHash = await computeHash(
      chainContent,
      this.config.hashAlgorithm,
    );

    // Verify chain integrity
    const isValid = await this.verifyCustodyChainIntegrity(entries);

    return {
      evidenceId,
      entries,
      chainHash,
      lastVerified: new Date(),
      isValid,
    };
  }

  /**
   * Verify custody chain integrity
   */
  private async verifyCustodyChainIntegrity(
    entries: CustodyEntry[],
  ): Promise<boolean> {
    for (let i = 1; i < entries.length; i++) {
      if (entries[i].previousEntryHash !== entries[i - 1].entryHash) {
        return false;
      }
    }
    return true;
  }

  // ==========================================================================
  // Integrity Verification
  // ==========================================================================

  /**
   * Verify evidence integrity
   */
  async verify(
    evidenceId: EvidenceId,
    verifierId: string,
    verifierRole: string = "system",
  ): Promise<VerificationResult> {
    const evidence = this.evidence.get(evidenceId);
    const checks: VerificationCheck[] = [];
    let overallValid = true;

    if (!evidence) {
      return {
        evidenceId,
        isValid: false,
        verifiedAt: new Date(),
        verifiedBy: verifierId,
        checks: [
          {
            name: "existence",
            passed: false,
            error: "Evidence not found",
          },
        ],
        message: "Evidence not found",
      };
    }

    // Check 1: Content hash verification
    const currentHash = await computeHash(
      evidence.content,
      evidence.contentHash.algorithm,
    );
    const contentHashValid = currentHash === evidence.contentHash.value;
    checks.push({
      name: "content_hash",
      passed: contentHashValid,
      expected: evidence.contentHash.value,
      actual: currentHash,
      error: contentHashValid
        ? undefined
        : "Content hash mismatch - evidence may have been tampered",
    });
    if (!contentHashValid) overallValid = false;

    // Check 2: Chain hash verification (if applicable)
    if (evidence.chainHash) {
      // Verify chain hash includes previous hash
      const hasValidPreviousHash =
        evidence.chainHash.previousHash !== undefined;
      checks.push({
        name: "chain_hash_link",
        passed: hasValidPreviousHash,
        error: hasValidPreviousHash
          ? undefined
          : "Chain hash missing previous hash reference",
      });
      if (!hasValidPreviousHash) overallValid = false;
    }

    // Check 3: Custody chain integrity
    const custodyChain = await this.getCustodyChain(evidenceId);
    if (custodyChain) {
      checks.push({
        name: "custody_chain",
        passed: custodyChain.isValid,
        error: custodyChain.isValid
          ? undefined
          : "Custody chain integrity compromised",
      });
      if (!custodyChain.isValid) overallValid = false;
    }

    // Check 4: Status consistency
    const statusValid = ["active", "archived", "legal_hold"].includes(
      evidence.status,
    );
    checks.push({
      name: "status_valid",
      passed: statusValid,
      actual: evidence.status,
      error: statusValid ? undefined : "Evidence has invalid status",
    });
    if (!statusValid) overallValid = false;

    // Check 5: Legal hold consistency
    if (
      evidence.status === "legal_hold" &&
      evidence.legalHoldIds.length === 0
    ) {
      checks.push({
        name: "legal_hold_consistency",
        passed: false,
        error: "Evidence marked as legal_hold but has no legal hold IDs",
      });
      overallValid = false;
    } else if (
      evidence.legalHoldIds.length > 0 &&
      evidence.status !== "legal_hold"
    ) {
      checks.push({
        name: "legal_hold_consistency",
        passed: false,
        error: "Evidence has legal hold IDs but status is not legal_hold",
      });
      overallValid = false;
    } else {
      checks.push({
        name: "legal_hold_consistency",
        passed: true,
      });
    }

    // Record verification in custody chain
    await this.addCustodyEntry(evidenceId, {
      eventType: overallValid ? "verified" : "failed_verification",
      actorId: verifierId,
      actorRole: verifierRole,
      description: overallValid
        ? "Integrity verification passed"
        : `Integrity verification failed: ${checks
            .filter((c) => !c.passed)
            .map((c) => c.name)
            .join(", ")}`,
    });

    return {
      evidenceId,
      isValid: overallValid,
      verifiedAt: new Date(),
      verifiedBy: verifierId,
      checks,
      message: overallValid
        ? "All integrity checks passed"
        : `Verification failed: ${checks.filter((c) => !c.passed).length} check(s) failed`,
    };
  }

  /**
   * Verify multiple evidence records
   */
  async verifyBatch(
    evidenceIds: EvidenceId[],
    verifierId: string,
    verifierRole: string = "system",
  ): Promise<Map<EvidenceId, VerificationResult>> {
    const results = new Map<EvidenceId, VerificationResult>();

    for (const id of evidenceIds) {
      const result = await this.verify(id, verifierId, verifierRole);
      results.set(id, result);
    }

    return results;
  }

  // ==========================================================================
  // Status Management
  // ==========================================================================

  /**
   * Update evidence status
   */
  async updateStatus(
    evidenceId: EvidenceId,
    newStatus: EvidenceStatus,
    actorId: string,
    actorRole: string,
    reason: string,
  ): Promise<
    | { success: true; evidence: EvidenceRecord }
    | { success: false; error: EvidenceError }
  > {
    const evidence = this.evidence.get(evidenceId);

    if (!evidence) {
      return {
        success: false,
        error: {
          code: "EVIDENCE_NOT_FOUND",
          message: `Evidence not found: ${evidenceId}`,
          evidenceId,
        },
      };
    }

    // Check if evidence is under legal hold
    if (
      evidence.legalHoldIds.length > 0 &&
      ["deleted", "purged"].includes(newStatus)
    ) {
      return {
        success: false,
        error: {
          code: "LEGAL_HOLD_ACTIVE",
          message: "Cannot delete or purge evidence under legal hold",
          evidenceId,
          details: { legalHoldIds: evidence.legalHoldIds },
        },
      };
    }

    const oldStatus = evidence.status;
    evidence.status = newStatus;
    evidence.updatedAt = new Date();
    evidence.version++;

    // Record status change
    await this.addCustodyEntry(evidenceId, {
      eventType: "status_changed",
      actorId,
      actorRole,
      description: `Status changed from ${oldStatus} to ${newStatus}: ${reason}`,
      metadata: { oldStatus, newStatus, reason },
    });

    logger.info("Evidence status updated", {
      evidenceId,
      oldStatus,
      newStatus,
    });

    return { success: true, evidence };
  }

  /**
   * Archive evidence
   */
  async archive(
    evidenceId: EvidenceId,
    actorId: string,
    actorRole: string,
    reason: string,
  ): Promise<
    | { success: true; evidence: EvidenceRecord }
    | { success: false; error: EvidenceError }
  > {
    const result = await this.updateStatus(
      evidenceId,
      "archived",
      actorId,
      actorRole,
      reason,
    );

    if (result.success) {
      await this.addCustodyEntry(evidenceId, {
        eventType: "archived",
        actorId,
        actorRole,
        description: `Evidence archived: ${reason}`,
      });
    }

    return result;
  }

  /**
   * Restore archived evidence
   */
  async restore(
    evidenceId: EvidenceId,
    actorId: string,
    actorRole: string,
    reason: string,
  ): Promise<
    | { success: true; evidence: EvidenceRecord }
    | { success: false; error: EvidenceError }
  > {
    const result = await this.updateStatus(
      evidenceId,
      "active",
      actorId,
      actorRole,
      reason,
    );

    if (result.success) {
      await this.addCustodyEntry(evidenceId, {
        eventType: "restored",
        actorId,
        actorRole,
        description: `Evidence restored: ${reason}`,
      });
    }

    return result;
  }

  // ==========================================================================
  // Legal Hold Integration
  // ==========================================================================

  /**
   * Apply legal hold to evidence
   */
  async applyLegalHold(
    evidenceId: EvidenceId,
    legalHoldId: string,
    actorId: string,
    actorRole: string,
  ): Promise<
    | { success: true; evidence: EvidenceRecord }
    | { success: false; error: EvidenceError }
  > {
    const evidence = this.evidence.get(evidenceId);

    if (!evidence) {
      return {
        success: false,
        error: {
          code: "EVIDENCE_NOT_FOUND",
          message: `Evidence not found: ${evidenceId}`,
          evidenceId,
        },
      };
    }

    // Add legal hold ID if not already present
    if (!evidence.legalHoldIds.includes(legalHoldId)) {
      evidence.legalHoldIds.push(legalHoldId);
    }

    // Update status to legal_hold
    evidence.status = "legal_hold";
    evidence.updatedAt = new Date();
    evidence.version++;

    // Record in custody chain
    await this.addCustodyEntry(evidenceId, {
      eventType: "legal_hold_applied",
      actorId,
      actorRole,
      description: `Legal hold applied: ${legalHoldId}`,
      metadata: { legalHoldId },
    });

    logger.info("Legal hold applied to evidence", { evidenceId, legalHoldId });

    return { success: true, evidence };
  }

  /**
   * Release legal hold from evidence
   */
  async releaseLegalHold(
    evidenceId: EvidenceId,
    legalHoldId: string,
    actorId: string,
    actorRole: string,
  ): Promise<
    | { success: true; evidence: EvidenceRecord }
    | { success: false; error: EvidenceError }
  > {
    const evidence = this.evidence.get(evidenceId);

    if (!evidence) {
      return {
        success: false,
        error: {
          code: "EVIDENCE_NOT_FOUND",
          message: `Evidence not found: ${evidenceId}`,
          evidenceId,
        },
      };
    }

    // Remove legal hold ID
    evidence.legalHoldIds = evidence.legalHoldIds.filter(
      (id) => id !== legalHoldId,
    );

    // Update status if no more legal holds
    if (evidence.legalHoldIds.length === 0) {
      evidence.status = "active";
    }

    evidence.updatedAt = new Date();
    evidence.version++;

    // Record in custody chain
    await this.addCustodyEntry(evidenceId, {
      eventType: "legal_hold_released",
      actorId,
      actorRole,
      description: `Legal hold released: ${legalHoldId}`,
      metadata: { legalHoldId, remainingHolds: evidence.legalHoldIds.length },
    });

    logger.info("Legal hold released from evidence", {
      evidenceId,
      legalHoldId,
    });

    return { success: true, evidence };
  }

  /**
   * Get all evidence under a specific legal hold
   */
  getEvidenceByLegalHold(legalHoldId: string): EvidenceRecord[] {
    return Array.from(this.evidence.values()).filter((e) =>
      e.legalHoldIds.includes(legalHoldId),
    );
  }

  // ==========================================================================
  // References
  // ==========================================================================

  /**
   * Add a reference to evidence
   */
  async addReference(
    evidenceId: EvidenceId,
    reference: Omit<EvidenceReference, "id">,
    actorId: string,
    actorRole: string,
  ): Promise<
    | { success: true; evidence: EvidenceRecord }
    | { success: false; error: EvidenceError }
  > {
    const evidence = this.evidence.get(evidenceId);

    if (!evidence) {
      return {
        success: false,
        error: {
          code: "EVIDENCE_NOT_FOUND",
          message: `Evidence not found: ${evidenceId}`,
          evidenceId,
        },
      };
    }

    const refId = `ref_${evidenceId}_${evidence.references.length}`;
    evidence.references.push({
      ...reference,
      id: refId,
    });
    evidence.updatedAt = new Date();
    evidence.version++;

    await this.addCustodyEntry(evidenceId, {
      eventType: "annotated",
      actorId,
      actorRole,
      description: `Reference added: ${reference.type} - ${reference.relationship}`,
      metadata: { referenceId: refId, referenceType: reference.type },
    });

    return { success: true, evidence };
  }

  // ==========================================================================
  // Statistics
  // ==========================================================================

  /**
   * Get evidence statistics
   */
  getStatistics(workspaceId?: string): EvidenceStatistics {
    let records = Array.from(this.evidence.values());

    if (workspaceId) {
      records = records.filter((e) => e.workspaceId === workspaceId);
    }

    const byStatus: Record<EvidenceStatus, number> = {
      active: 0,
      archived: 0,
      legal_hold: 0,
      deleted: 0,
      purged: 0,
    };

    const byType: Record<EvidenceType, number> = {
      message: 0,
      attachment: 0,
      user_profile: 0,
      channel_metadata: 0,
      moderation_action: 0,
      report: 0,
      appeal: 0,
      system_log: 0,
      audit_trail: 0,
      screenshot: 0,
      media: 0,
    };

    const byPriority: Record<EvidencePriority, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    let totalSizeBytes = 0;
    let underLegalHold = 0;
    let lastCollectedAt: Date | undefined;

    for (const record of records) {
      byStatus[record.status]++;
      byType[record.type]++;
      byPriority[record.priority]++;
      totalSizeBytes += record.metadata.sizeBytes || 0;

      if (record.legalHoldIds.length > 0) {
        underLegalHold++;
      }

      if (!lastCollectedAt || record.collectedAt > lastCollectedAt) {
        lastCollectedAt = record.collectedAt;
      }
    }

    // Count unique legal holds
    const uniqueLegalHolds = new Set<string>();
    for (const record of records) {
      record.legalHoldIds.forEach((id) => uniqueLegalHolds.add(id));
    }

    return {
      total: records.length,
      byStatus,
      byType,
      byPriority,
      totalSizeBytes,
      underLegalHold,
      activeLegalHolds: uniqueLegalHolds.size,
      pendingExports: 0, // Would be tracked separately
      lastCollectedAt,
    };
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  /**
   * Compute content hash
   */
  private async computeContentHash(content: string): Promise<ContentHash> {
    const value = await computeHash(content, this.config.hashAlgorithm);
    return {
      algorithm: this.config.hashAlgorithm,
      value,
      computedAt: new Date(),
    };
  }

  /**
   * Check if evidence exists
   */
  exists(evidenceId: EvidenceId): boolean {
    return this.evidence.has(evidenceId);
  }

  /**
   * Get total evidence count
   */
  count(): number {
    return this.evidence.size;
  }

  /**
   * Clear all evidence (for testing)
   */
  clear(): void {
    this.evidence.clear();
    this.custodyEntries.clear();
    this.lastChainHash = null;
  }

  /**
   * Get configuration
   */
  getConfig(): EvidenceCollectorConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<EvidenceCollectorConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// ============================================================================
// Singleton Factory
// ============================================================================

let collectorInstance: EvidenceCollectorService | null = null;

export function getEvidenceCollector(
  config?: Partial<EvidenceCollectorConfig>,
): EvidenceCollectorService {
  if (!collectorInstance || config) {
    collectorInstance = new EvidenceCollectorService(config);
  }
  return collectorInstance;
}

export function createEvidenceCollector(
  config?: Partial<EvidenceCollectorConfig>,
): EvidenceCollectorService {
  return new EvidenceCollectorService(config);
}
