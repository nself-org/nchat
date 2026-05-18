/**
 * DSAR (Data Subject Access Request) Workflow Service
 *
 * Enterprise-grade DSAR management service for GDPR and CCPA compliance.
 * Handles the complete lifecycle of data subject requests.
 *
 * @module services/compliance/dsar.service
 * @version 1.0.0
 */

import { v4 as uuidv4 } from "uuid";
import { createLogger } from "@/lib/logger";
import type {
  DSARRequest,
  DSARRequestType,
  DSARStatus,
  DSARPriority,
  RegulationFramework,
  VerificationMethod,
  VerificationStatus,
  IdentityVerification,
  DSARAuditEvent,
  DSARAction,
  DSARServiceConfig,
  DSARStatistics,
  CreateDSARInput,
  UpdateDSARInput,
  DSARListFilters,
  DSARListOptions,
  OperationResult,
  DEFAULT_DSAR_CONFIG,
} from "./compliance.types";
import type {
  ExportDataCategory,
  LegalHold,
} from "@/lib/compliance/compliance-types";

const log = createLogger("DSARService");

// ============================================================================
// CONSTANTS
// ============================================================================

const REGULATION_DEADLINES: Record<RegulationFramework, number> = {
  gdpr: 30,
  ccpa: 45,
  lgpd: 15,
  pdpa: 30,
  other: 30,
};

const REGULATION_EXTENSIONS: Record<RegulationFramework, number> = {
  gdpr: 60,
  ccpa: 45,
  lgpd: 15,
  pdpa: 0,
  other: 30,
};

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: DSARServiceConfig = {
  enabled: true,
  defaultDeadlineDays: 30,
  maxExtensionDays: 60,
  verificationExpiryHours: 48,
  requireIdentityVerification: true,
  allowedVerificationMethods: [
    "email_confirmation",
    "sms_otp",
    "knowledge_based",
  ],
  maxVerificationAttempts: 3,
  maxRequestsPerUserPerMonth: 5,
  maxConcurrentRequests: 2,
  defaultExportFormat: "zip",
  maxDownloads: 5,
  downloadExpiryDays: 7,
  notifyOnSubmission: true,
  notifyOnCompletion: true,
  notifyOnExpiry: true,
  autoAcknowledge: true,
  autoApproveVerified: false,
  retainRequestRecordsDays: 730,
  retainExportsDays: 7,
};

// ============================================================================
// DSAR SERVICE
// ============================================================================

export class DSARService {
  private config: DSARServiceConfig;
  private requests = new Map<string, DSARRequest>();
  private verifications = new Map<string, IdentityVerification>();
  private legalHolds: LegalHold[] = [];
  private isInitialized = false;

  constructor(config: Partial<DSARServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      log.debug("Service already initialized");
      return;
    }

    log.info("Initializing DSAR service");

    // Load requests from database (placeholder)
    await this.loadRequests();

    // Load legal holds
    await this.loadLegalHolds();

    this.isInitialized = true;
    log.info("DSAR service initialized", {
      requestCount: this.requests.size,
    });
  }

  /**
   * Load requests from database
   */
  private async loadRequests(): Promise<void> {
    log.debug("Loading DSAR requests from database");
    // Placeholder for database loading
  }

  /**
   * Load legal holds
   */
  private async loadLegalHolds(): Promise<void> {
    log.debug("Loading legal holds");
    // Placeholder for loading legal holds
  }

  /**
   * Close the service
   */
  async close(): Promise<void> {
    log.info("Closing DSAR service");
    this.requests.clear();
    this.verifications.clear();
    this.legalHolds = [];
    this.isInitialized = false;
  }

  // ============================================================================
  // REQUEST CRUD
  // ============================================================================

  /**
   * Create a new DSAR request
   */
  async createRequest(
    userId: string,
    userEmail: string,
    input: CreateDSARInput,
    context?: { ipAddress?: string; userAgent?: string },
  ): Promise<OperationResult<DSARRequest>> {
    this.ensureInitialized();

    if (!this.config.enabled) {
      return { success: false, error: "DSAR service is disabled" };
    }

    log.info("Creating DSAR request", {
      userId,
      type: input.requestType,
      regulation: input.regulation,
    });

    // Validate input
    const validation = this.validateCreateInput(input);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Check rate limits
    const rateLimitCheck = this.checkRateLimits(userId);
    if (!rateLimitCheck.allowed) {
      return { success: false, error: rateLimitCheck.reason };
    }

    // Determine regulation and deadline
    const regulation = input.regulation || this.inferRegulation(userEmail);
    const deadlineDays =
      REGULATION_DEADLINES[regulation] || this.config.defaultDeadlineDays;
    const now = new Date();
    const deadline = new Date(now);
    deadline.setDate(deadline.getDate() + deadlineDays);

    // Check legal holds
    const activeHolds = this.getActiveHoldsForUser(userId);
    const legalHoldBlocked =
      activeHolds.length > 0 && input.requestType === "erasure";

    // Create request
    const request: DSARRequest = {
      id: uuidv4(),
      externalRef: this.generateExternalRef(),
      userId,
      userEmail,

      requestType: input.requestType,
      regulation,
      status: "submitted",
      priority: this.determinePriority(input.requestType, regulation),

      dataCategories: input.dataCategories || ["all"],
      scope: input.scope
        ? {
            dateFrom: input.scope.dateFrom,
            dateTo: input.scope.dateTo,
            channels: input.scope.channels,
            includeAttachments: input.scope.includeAttachments ?? true,
            includeMetadata: input.scope.includeMetadata ?? true,
          }
        : undefined,

      submittedAt: now,
      deadlineAt: deadline,

      verificationRequired: this.config.requireIdentityVerification,

      deliveryMethod: input.deliveryMethod || "download",
      deliveryEmail: input.deliveryEmail || userEmail,
      downloadCount: 0,
      maxDownloads: this.config.maxDownloads,

      exportFormat: input.exportFormat || this.config.defaultExportFormat,

      legalHoldBlocked,
      legalHoldIds: legalHoldBlocked ? activeHolds.map((h) => h.id) : undefined,
      consentRecorded: false,

      auditEvents: [],

      sourceIp: context?.ipAddress,
      userAgent: context?.userAgent,
      notes: input.notes,
    };

    // Add initial audit event
    this.addAuditEvent(request, "request_submitted", {
      description: `DSAR request submitted for ${input.requestType}`,
      metadata: {
        regulation,
        categories: request.dataCategories,
        deadline: deadline.toISOString(),
      },
    });

    // Store request
    this.requests.set(request.id, request);

    // Auto-acknowledge if configured
    if (this.config.autoAcknowledge) {
      request.acknowledgedAt = now;
      this.addAuditEvent(request, "request_acknowledged", {
        description: "Request automatically acknowledged",
      });
    }

    // Initiate verification if required
    if (request.verificationRequired) {
      await this.initiateVerification(request);
    }

    log.info("DSAR request created", {
      id: request.id,
      externalRef: request.externalRef,
      type: request.requestType,
    });

    return { success: true, data: request };
  }

  /**
   * Get a request by ID
   */
  getRequest(requestId: string): DSARRequest | null {
    return this.requests.get(requestId) || null;
  }

  /**
   * Get request by external reference
   */
  getRequestByExternalRef(externalRef: string): DSARRequest | null {
    return (
      Array.from(this.requests.values()).find(
        (r) => r.externalRef === externalRef,
      ) || null
    );
  }

  /**
   * Update a request
   */
  async updateRequest(
    requestId: string,
    updates: UpdateDSARInput,
    actorId: string,
    actorEmail?: string,
  ): Promise<OperationResult<DSARRequest>> {
    this.ensureInitialized();

    const request = this.requests.get(requestId);
    if (!request) {
      return { success: false, error: "Request not found" };
    }

    log.info("Updating DSAR request", {
      requestId,
      updates: Object.keys(updates),
    });

    const previousStatus = request.status;

    // Apply updates
    if (updates.status !== undefined) {
      request.status = updates.status;
    }
    if (updates.priority !== undefined) {
      request.priority = updates.priority;
    }
    if (updates.assignedTo !== undefined) {
      request.assignedTo = updates.assignedTo;
    }
    if (updates.reviewNotes !== undefined) {
      request.reviewNotes = updates.reviewNotes;
    }
    if (updates.rejectionReason !== undefined) {
      request.rejectionReason = updates.rejectionReason;
    }
    if (updates.extensionReason !== undefined) {
      request.extensionReason = updates.extensionReason;
    }
    if (updates.notes !== undefined) {
      request.notes = updates.notes;
    }
    if (updates.tags !== undefined) {
      request.tags = updates.tags;
    }

    // Handle status-specific updates
    if (updates.status && updates.status !== previousStatus) {
      await this.handleStatusChange(
        request,
        previousStatus,
        updates.status,
        actorId,
        actorEmail,
      );
    }

    // Add audit event
    this.addAuditEvent(request, "status_changed", {
      actorId,
      actorEmail,
      previousStatus,
      newStatus: request.status,
      description: `Request updated: ${Object.keys(updates).join(", ")}`,
      metadata: updates as Record<string, unknown>,
    });

    log.info("DSAR request updated", { requestId });

    return { success: true, data: request };
  }

  /**
   * List requests with filters
   */
  listRequests(options: DSARListOptions = {}): {
    requests: DSARRequest[];
    total: number;
    hasMore: boolean;
  } {
    let requests = Array.from(this.requests.values());

    // Apply filters
    if (options.filters) {
      requests = this.applyFilters(requests, options.filters);
    }

    // Sort
    const sortBy = options.sortBy || "submittedAt";
    const sortOrder = options.sortOrder || "desc";
    requests = this.sortRequests(requests, sortBy, sortOrder);

    // Total before pagination
    const total = requests.length;

    // Pagination
    const offset = options.offset || 0;
    const limit = options.limit || 50;
    requests = requests.slice(offset, offset + limit);

    // Remove audit events if not requested
    if (!options.includeAuditEvents) {
      requests = requests.map((r) => ({ ...r, auditEvents: [] }));
    }

    return {
      requests,
      total,
      hasMore: offset + requests.length < total,
    };
  }

  /**
   * Get requests for a user
   */
  getRequestsByUser(userId: string): DSARRequest[] {
    return Array.from(this.requests.values()).filter(
      (r) => r.userId === userId,
    );
  }

  /**
   * Cancel a request
   */
  async cancelRequest(
    requestId: string,
    reason: string,
    actorId: string,
  ): Promise<OperationResult<void>> {
    const request = this.requests.get(requestId);
    if (!request) {
      return { success: false, error: "Request not found" };
    }

    const cancellableStatuses: DSARStatus[] = [
      "submitted",
      "identity_verification_pending",
      "identity_verified",
      "in_review",
      "approved",
    ];

    if (!cancellableStatuses.includes(request.status)) {
      return {
        success: false,
        error: `Cannot cancel request with status: ${request.status}`,
      };
    }

    request.status = "cancelled";
    request.closedAt = new Date();

    this.addAuditEvent(request, "request_cancelled", {
      actorId,
      description: `Request cancelled: ${reason}`,
      metadata: { reason },
    });

    log.info("DSAR request cancelled", { requestId, reason });

    return { success: true };
  }

  // ============================================================================
  // VERIFICATION
  // ============================================================================

  /**
   * Initiate identity verification
   */
  async initiateVerification(
    request: DSARRequest,
    method?: VerificationMethod,
  ): Promise<OperationResult<IdentityVerification>> {
    const verificationMethod =
      method || this.config.allowedVerificationMethods[0];

    if (!this.config.allowedVerificationMethods.includes(verificationMethod)) {
      return {
        success: false,
        error: `Verification method not allowed: ${verificationMethod}`,
      };
    }

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setHours(
      expiresAt.getHours() + this.config.verificationExpiryHours,
    );

    const verification: IdentityVerification = {
      id: uuidv4(),
      dsarId: request.id,
      method: verificationMethod,
      status: "pending",
      requestedAt: now,
      expiresAt,
      attempts: 0,
      maxAttempts: this.config.maxVerificationAttempts,
      verificationToken: this.generateVerificationToken(),
    };

    this.verifications.set(verification.id, verification);
    request.identityVerification = verification;
    request.status = "identity_verification_pending";

    this.addAuditEvent(request, "identity_verification_sent", {
      description: `Verification sent via ${verificationMethod}`,
      metadata: {
        method: verificationMethod,
        expiresAt: expiresAt.toISOString(),
      },
    });

    log.info("Verification initiated", {
      requestId: request.id,
      method: verificationMethod,
    });

    return { success: true, data: verification };
  }

  /**
   * Complete identity verification
   */
  async completeVerification(
    verificationId: string,
    token: string,
  ): Promise<OperationResult<DSARRequest>> {
    const verification = this.verifications.get(verificationId);
    if (!verification) {
      return { success: false, error: "Verification not found" };
    }

    const request = this.requests.get(verification.dsarId);
    if (!request) {
      return { success: false, error: "Request not found" };
    }

    // Check expiry
    if (new Date() > verification.expiresAt) {
      verification.status = "expired";
      request.status = "identity_failed";
      this.addAuditEvent(request, "identity_verification_failed", {
        description: "Verification expired",
        metadata: { reason: "expired" },
      });
      return { success: false, error: "Verification has expired" };
    }

    // Check attempts
    verification.attempts++;
    if (verification.attempts > verification.maxAttempts) {
      verification.status = "failed";
      verification.failureReason = "Maximum attempts exceeded";
      request.status = "identity_failed";
      this.addAuditEvent(request, "identity_verification_failed", {
        description: "Maximum verification attempts exceeded",
        metadata: { attempts: verification.attempts },
      });
      return {
        success: false,
        error: "Maximum verification attempts exceeded",
      };
    }

    // Verify token
    if (token !== verification.verificationToken) {
      return { success: false, error: "Invalid verification token" };
    }

    // Success
    verification.status = "verified";
    verification.completedAt = new Date();
    request.verifiedAt = new Date();
    request.status = "identity_verified";

    this.addAuditEvent(request, "identity_verification_completed", {
      description: "Identity successfully verified",
      metadata: {
        method: verification.method,
        attempts: verification.attempts,
      },
    });

    // Auto-approve if configured
    if (this.config.autoApproveVerified) {
      request.status = "approved";
      request.reviewedAt = new Date();
      this.addAuditEvent(request, "request_approved", {
        description: "Request automatically approved after verification",
      });
    }

    log.info("Verification completed", { requestId: request.id });

    return { success: true, data: request };
  }

  /**
   * Resend verification
   */
  async resendVerification(
    requestId: string,
  ): Promise<OperationResult<IdentityVerification>> {
    const request = this.requests.get(requestId);
    if (!request) {
      return { success: false, error: "Request not found" };
    }

    if (request.status !== "identity_verification_pending") {
      return { success: false, error: "Request is not pending verification" };
    }

    return this.initiateVerification(
      request,
      request.identityVerification?.method,
    );
  }

  // ============================================================================
  // WORKFLOW ACTIONS
  // ============================================================================

  /**
   * Assign request to staff member
   */
  async assignRequest(
    requestId: string,
    assigneeId: string,
    assignerActorId: string,
  ): Promise<OperationResult<DSARRequest>> {
    const request = this.requests.get(requestId);
    if (!request) {
      return { success: false, error: "Request not found" };
    }

    request.assignedTo = assigneeId;

    this.addAuditEvent(request, "request_assigned", {
      actorId: assignerActorId,
      description: `Request assigned to ${assigneeId}`,
      metadata: { assigneeId },
    });

    return { success: true, data: request };
  }

  /**
   * Approve a request
   */
  async approveRequest(
    requestId: string,
    actorId: string,
    notes?: string,
  ): Promise<OperationResult<DSARRequest>> {
    const request = this.requests.get(requestId);
    if (!request) {
      return { success: false, error: "Request not found" };
    }

    const approvableStatuses: DSARStatus[] = ["identity_verified", "in_review"];
    if (!approvableStatuses.includes(request.status)) {
      return {
        success: false,
        error: `Cannot approve request with status: ${request.status}`,
      };
    }

    request.status = "approved";
    request.reviewedBy = actorId;
    request.reviewedAt = new Date();
    if (notes) {
      request.reviewNotes = notes;
    }

    this.addAuditEvent(request, "request_approved", {
      actorId,
      description: "Request approved for processing",
      metadata: { notes },
    });

    log.info("DSAR request approved", { requestId, approver: actorId });

    return { success: true, data: request };
  }

  /**
   * Reject a request
   */
  async rejectRequest(
    requestId: string,
    reason: string,
    actorId: string,
  ): Promise<OperationResult<DSARRequest>> {
    const request = this.requests.get(requestId);
    if (!request) {
      return { success: false, error: "Request not found" };
    }

    request.status = "rejected";
    request.rejectionReason = reason;
    request.reviewedBy = actorId;
    request.reviewedAt = new Date();
    request.closedAt = new Date();

    this.addAuditEvent(request, "request_rejected", {
      actorId,
      description: `Request rejected: ${reason}`,
      metadata: { reason },
    });

    log.info("DSAR request rejected", { requestId, reason });

    return { success: true, data: request };
  }

  /**
   * Request an extension
   */
  async requestExtension(
    requestId: string,
    reason: string,
    actorId: string,
  ): Promise<OperationResult<DSARRequest>> {
    const request = this.requests.get(requestId);
    if (!request) {
      return { success: false, error: "Request not found" };
    }

    if (request.extensionDeadline) {
      return { success: false, error: "Extension already granted" };
    }

    const maxExtension =
      REGULATION_EXTENSIONS[request.regulation] || this.config.maxExtensionDays;
    if (maxExtension === 0) {
      return {
        success: false,
        error: `Extensions not allowed under ${request.regulation}`,
      };
    }

    const extensionDeadline = new Date(request.deadlineAt);
    extensionDeadline.setDate(extensionDeadline.getDate() + maxExtension);

    request.extensionDeadline = extensionDeadline;
    request.extensionReason = reason;

    this.addAuditEvent(request, "extension_granted", {
      actorId,
      description: `Extension granted until ${extensionDeadline.toISOString()}`,
      metadata: {
        reason,
        newDeadline: extensionDeadline.toISOString(),
        daysExtended: maxExtension,
      },
    });

    log.info("Extension granted", {
      requestId,
      newDeadline: extensionDeadline,
    });

    return { success: true, data: request };
  }

  /**
   * Mark request as delivered
   */
  async markDelivered(
    requestId: string,
    downloadUrl: string,
    actorId: string,
  ): Promise<OperationResult<DSARRequest>> {
    const request = this.requests.get(requestId);
    if (!request) {
      return { success: false, error: "Request not found" };
    }

    const now = new Date();
    const downloadExpiresAt = new Date(now);
    downloadExpiresAt.setDate(
      downloadExpiresAt.getDate() + this.config.downloadExpiryDays,
    );

    request.status = "delivered";
    request.downloadUrl = downloadUrl;
    request.downloadExpiresAt = downloadExpiresAt;
    request.completedAt = now;

    this.addAuditEvent(request, "data_delivered", {
      actorId,
      description: "Data export delivered to user",
      metadata: { downloadUrl, expiresAt: downloadExpiresAt.toISOString() },
    });

    log.info("DSAR request delivered", { requestId });

    return { success: true, data: request };
  }

  /**
   * Record download
   */
  async recordDownload(
    requestId: string,
    context?: { ipAddress?: string; userAgent?: string },
  ): Promise<OperationResult<number>> {
    const request = this.requests.get(requestId);
    if (!request) {
      return { success: false, error: "Request not found" };
    }

    if (!request.downloadUrl) {
      return { success: false, error: "Download not available" };
    }

    if (request.downloadExpiresAt && new Date() > request.downloadExpiresAt) {
      return { success: false, error: "Download link has expired" };
    }

    if (request.downloadCount >= request.maxDownloads) {
      return { success: false, error: "Maximum download limit reached" };
    }

    request.downloadCount++;

    this.addAuditEvent(request, "data_downloaded", {
      description: `Data downloaded (${request.downloadCount}/${request.maxDownloads})`,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      metadata: { downloadNumber: request.downloadCount },
    });

    return { success: true, data: request.downloadCount };
  }

  /**
   * Close a request
   */
  async closeRequest(
    requestId: string,
    actorId: string,
  ): Promise<OperationResult<void>> {
    const request = this.requests.get(requestId);
    if (!request) {
      return { success: false, error: "Request not found" };
    }

    if (
      !["delivered", "rejected", "cancelled", "expired"].includes(
        request.status,
      )
    ) {
      return {
        success: false,
        error: `Cannot close request with status: ${request.status}`,
      };
    }

    request.status = "closed";
    request.closedAt = new Date();

    this.addAuditEvent(request, "request_closed", {
      actorId,
      description: "Request closed",
    });

    log.info("DSAR request closed", { requestId });

    return { success: true };
  }

  // ============================================================================
  // DEADLINE MANAGEMENT
  // ============================================================================

  /**
   * Get overdue requests
   */
  getOverdueRequests(): DSARRequest[] {
    const now = new Date();
    return Array.from(this.requests.values()).filter((r) => {
      if (
        ["delivered", "closed", "rejected", "cancelled", "expired"].includes(
          r.status,
        )
      ) {
        return false;
      }
      const effectiveDeadline = r.extensionDeadline || r.deadlineAt;
      return now > effectiveDeadline;
    });
  }

  /**
   * Get requests approaching deadline
   */
  getApproachingDeadlineRequests(withinDays: number = 5): DSARRequest[] {
    const now = new Date();
    const threshold = new Date(now);
    threshold.setDate(threshold.getDate() + withinDays);

    return Array.from(this.requests.values()).filter((r) => {
      if (
        ["delivered", "closed", "rejected", "cancelled", "expired"].includes(
          r.status,
        )
      ) {
        return false;
      }
      const effectiveDeadline = r.extensionDeadline || r.deadlineAt;
      return effectiveDeadline > now && effectiveDeadline <= threshold;
    });
  }

  /**
   * Calculate remaining days for a request
   */
  getRemainingDays(requestId: string): number | null {
    const request = this.requests.get(requestId);
    if (!request) return null;

    const effectiveDeadline = request.extensionDeadline || request.deadlineAt;
    const remaining = Math.ceil(
      (effectiveDeadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    return Math.max(0, remaining);
  }

  // ============================================================================
  // STATISTICS
  // ============================================================================

  /**
   * Get DSAR statistics
   */
  getStatistics(periodDays: number = 30): DSARStatistics {
    const now = new Date();
    const periodStart = new Date(now);
    periodStart.setDate(periodStart.getDate() - periodDays);

    const requests = Array.from(this.requests.values());

    // Count by status
    const byStatus: Record<DSARStatus, number> = {} as Record<
      DSARStatus,
      number
    >;
    const allStatuses: DSARStatus[] = [
      "submitted",
      "identity_verification_pending",
      "identity_verified",
      "identity_failed",
      "in_review",
      "approved",
      "rejected",
      "in_progress",
      "awaiting_data",
      "ready_for_delivery",
      "delivered",
      "closed",
      "cancelled",
      "expired",
    ];
    allStatuses.forEach((s) => (byStatus[s] = 0));
    requests.forEach((r) => byStatus[r.status]++);

    // Count by type
    const byRequestType: Record<DSARRequestType, number> = {} as Record<
      DSARRequestType,
      number
    >;
    const allTypes: DSARRequestType[] = [
      "access",
      "portability",
      "rectification",
      "erasure",
      "restriction",
      "objection",
      "opt_out",
      "limit_use",
    ];
    allTypes.forEach((t) => (byRequestType[t] = 0));
    requests.forEach((r) => byRequestType[r.requestType]++);

    // Count by regulation
    const byRegulation: Record<RegulationFramework, number> = {} as Record<
      RegulationFramework,
      number
    >;
    const allRegulations: RegulationFramework[] = [
      "gdpr",
      "ccpa",
      "lgpd",
      "pdpa",
      "other",
    ];
    allRegulations.forEach((reg) => (byRegulation[reg] = 0));
    requests.forEach((r) => byRegulation[r.regulation]++);

    // Completed requests for timing metrics
    const completed = requests.filter((r) => r.completedAt);
    const completionDays = completed.map((r) => {
      const start = r.submittedAt.getTime();
      const end = r.completedAt!.getTime();
      return (end - start) / (1000 * 60 * 60 * 24);
    });
    const averageCompletionDays =
      completionDays.length > 0
        ? completionDays.reduce((a, b) => a + b, 0) / completionDays.length
        : 0;

    // Acknowledged for response time
    const acknowledged = requests.filter((r) => r.acknowledgedAt);
    const responseDays = acknowledged.map((r) => {
      const start = r.submittedAt.getTime();
      const ack = r.acknowledgedAt!.getTime();
      return (ack - start) / (1000 * 60 * 60 * 24);
    });
    const averageResponseDays =
      responseDays.length > 0
        ? responseDays.reduce((a, b) => a + b, 0) / responseDays.length
        : 0;

    // Verification metrics
    const verifiedRequests = requests.filter((r) => r.verifiedAt);
    const failedVerifications = requests.filter(
      (r) => r.status === "identity_failed",
    );
    const verificationSuccessRate =
      verifiedRequests.length + failedVerifications.length > 0
        ? verifiedRequests.length /
          (verifiedRequests.length + failedVerifications.length)
        : 1;

    const verificationAttempts = Array.from(this.verifications.values())
      .map((v) => v.attempts)
      .filter((a) => a > 0);
    const averageVerificationAttempts =
      verificationAttempts.length > 0
        ? verificationAttempts.reduce((a, b) => a + b, 0) /
          verificationAttempts.length
        : 1;

    return {
      totalRequests: requests.length,
      activeRequests: requests.filter(
        (r) =>
          !["delivered", "closed", "rejected", "cancelled", "expired"].includes(
            r.status,
          ),
      ).length,
      completedRequests: completed.length,
      rejectedRequests: requests.filter((r) => r.status === "rejected").length,
      cancelledRequests: requests.filter((r) => r.status === "cancelled")
        .length,

      byRequestType,
      byStatus,
      byRegulation,

      averageCompletionDays: Math.round(averageCompletionDays * 10) / 10,
      averageResponseDays: Math.round(averageResponseDays * 10) / 10,
      overdueCount: this.getOverdueRequests().length,

      periodStart,
      periodEnd: now,
      newRequestsInPeriod: requests.filter((r) => r.submittedAt >= periodStart)
        .length,
      completedInPeriod: completed.filter((r) => r.completedAt! >= periodStart)
        .length,

      verificationSuccessRate: Math.round(verificationSuccessRate * 100),
      averageVerificationAttempts:
        Math.round(averageVerificationAttempts * 10) / 10,
    };
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Validate create input
   */
  private validateCreateInput(input: CreateDSARInput): {
    valid: boolean;
    error?: string;
  } {
    if (!input.requestType) {
      return { valid: false, error: "Request type is required" };
    }

    const validTypes: DSARRequestType[] = [
      "access",
      "portability",
      "rectification",
      "erasure",
      "restriction",
      "objection",
      "opt_out",
      "limit_use",
    ];
    if (!validTypes.includes(input.requestType)) {
      return {
        valid: false,
        error: `Invalid request type: ${input.requestType}`,
      };
    }

    return { valid: true };
  }

  /**
   * Check rate limits
   */
  private checkRateLimits(userId: string): {
    allowed: boolean;
    reason?: string;
  } {
    const userRequests = this.getRequestsByUser(userId);

    // Check concurrent requests
    const activeRequests = userRequests.filter(
      (r) =>
        !["delivered", "closed", "rejected", "cancelled", "expired"].includes(
          r.status,
        ),
    );
    if (activeRequests.length >= this.config.maxConcurrentRequests) {
      return { allowed: false, reason: "Maximum concurrent requests reached" };
    }

    // Check monthly limit
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentRequests = userRequests.filter(
      (r) => r.submittedAt >= thirtyDaysAgo,
    );
    if (recentRequests.length >= this.config.maxRequestsPerUserPerMonth) {
      return { allowed: false, reason: "Monthly request limit reached" };
    }

    return { allowed: true };
  }

  /**
   * Infer regulation from email domain
   */
  private inferRegulation(email: string): RegulationFramework {
    // Simple heuristic - in production, use geolocation or user settings
    const domain = email.split("@")[1]?.toLowerCase() || "";

    if (
      domain.endsWith(".eu") ||
      domain.endsWith(".de") ||
      domain.endsWith(".fr") ||
      domain.endsWith(".uk") ||
      domain.endsWith(".nl")
    ) {
      return "gdpr";
    }
    if (domain.endsWith(".br")) {
      return "lgpd";
    }
    // Default to GDPR as most comprehensive
    return "gdpr";
  }

  /**
   * Determine request priority
   */
  private determinePriority(
    type: DSARRequestType,
    regulation: RegulationFramework,
  ): DSARPriority {
    // Erasure requests get higher priority
    if (type === "erasure") return "high";

    // CCPA has shorter opt-out deadline
    if (regulation === "ccpa" && type === "opt_out") return "high";

    return "normal";
  }

  /**
   * Generate external reference number
   */
  private generateExternalRef(): string {
    const prefix = "DSAR";
    const year = new Date().getFullYear();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${year}-${random}`;
  }

  /**
   * Generate verification token
   */
  private generateVerificationToken(): string {
    return uuidv4().replace(/-/g, "").substring(0, 16).toUpperCase();
  }

  /**
   * Get active legal holds for user
   */
  private getActiveHoldsForUser(userId: string): LegalHold[] {
    return this.legalHolds.filter(
      (h) => h.status === "active" && h.custodians.includes(userId),
    );
  }

  /**
   * Handle status change
   */
  private async handleStatusChange(
    request: DSARRequest,
    previousStatus: DSARStatus,
    newStatus: DSARStatus,
    actorId: string,
    actorEmail?: string,
  ): Promise<void> {
    // Handle specific transitions
    if (newStatus === "in_progress" && !request.completedAt) {
      // Mark start of processing
    }

    if (newStatus === "delivered") {
      request.completedAt = new Date();
    }

    if (["closed", "cancelled", "expired", "rejected"].includes(newStatus)) {
      request.closedAt = new Date();
    }
  }

  /**
   * Add audit event
   */
  private addAuditEvent(
    request: DSARRequest,
    action: DSARAction,
    options: {
      actorId?: string;
      actorEmail?: string;
      actorRole?: string;
      previousStatus?: DSARStatus;
      newStatus?: DSARStatus;
      description: string;
      ipAddress?: string;
      userAgent?: string;
      metadata?: Record<string, unknown>;
    },
  ): void {
    const event: DSARAuditEvent = {
      id: uuidv4(),
      dsarId: request.id,
      timestamp: new Date(),
      action,
      actorId: options.actorId,
      actorEmail: options.actorEmail,
      actorRole: options.actorRole,
      previousStatus: options.previousStatus,
      newStatus: options.newStatus,
      description: options.description,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      metadata: options.metadata,
    };

    request.auditEvents.push(event);
  }

  /**
   * Apply filters to requests
   */
  private applyFilters(
    requests: DSARRequest[],
    filters: DSARListFilters,
  ): DSARRequest[] {
    return requests.filter((r) => {
      if (filters.status && !filters.status.includes(r.status)) return false;
      if (filters.requestType && !filters.requestType.includes(r.requestType))
        return false;
      if (filters.regulation && !filters.regulation.includes(r.regulation))
        return false;
      if (filters.priority && !filters.priority.includes(r.priority))
        return false;
      if (filters.assignedTo && r.assignedTo !== filters.assignedTo)
        return false;
      if (filters.userId && r.userId !== filters.userId) return false;
      if (filters.userEmail && !r.userEmail.includes(filters.userEmail))
        return false;
      if (filters.submittedAfter && r.submittedAt < filters.submittedAfter)
        return false;
      if (filters.submittedBefore && r.submittedAt > filters.submittedBefore)
        return false;
      if (filters.deadlineBefore) {
        const deadline = r.extensionDeadline || r.deadlineAt;
        if (deadline > filters.deadlineBefore) return false;
      }
      if (filters.isOverdue !== undefined) {
        const isOverdue = this.getRemainingDays(r.id) === 0;
        if (filters.isOverdue !== isOverdue) return false;
      }
      if (filters.hasLegalHold !== undefined) {
        if (filters.hasLegalHold !== r.legalHoldBlocked) return false;
      }
      if (filters.tags && filters.tags.length > 0) {
        if (!r.tags || !filters.tags.some((t) => r.tags!.includes(t)))
          return false;
      }
      return true;
    });
  }

  /**
   * Sort requests
   */
  private sortRequests(
    requests: DSARRequest[],
    sortBy: string,
    sortOrder: "asc" | "desc",
  ): DSARRequest[] {
    return requests.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "submittedAt":
          comparison = a.submittedAt.getTime() - b.submittedAt.getTime();
          break;
        case "deadlineAt":
          comparison = a.deadlineAt.getTime() - b.deadlineAt.getTime();
          break;
        case "priority":
          const priorityOrder: Record<DSARPriority, number> = {
            urgent: 0,
            high: 1,
            normal: 2,
            low: 3,
          };
          comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
          break;
        case "status":
          comparison = a.status.localeCompare(b.status);
          break;
        default:
          comparison = a.submittedAt.getTime() - b.submittedAt.getTime();
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });
  }

  /**
   * Ensure service is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error("DSARService not initialized. Call initialize() first.");
    }
  }

  // ============================================================================
  // PUBLIC GETTERS
  // ============================================================================

  get initialized(): boolean {
    return this.isInitialized;
  }

  get enabled(): boolean {
    return this.config.enabled;
  }

  get requestCount(): number {
    return this.requests.size;
  }

  getConfig(): DSARServiceConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<DSARServiceConfig>): DSARServiceConfig {
    this.config = { ...this.config, ...updates };
    log.info("Configuration updated");
    return this.config;
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let dsarService: DSARService | null = null;

export function getDSARService(): DSARService {
  if (!dsarService) {
    dsarService = new DSARService();
  }
  return dsarService;
}

export function createDSARService(
  config?: Partial<DSARServiceConfig>,
): DSARService {
  return new DSARService(config);
}

export async function initializeDSARService(): Promise<DSARService> {
  const service = getDSARService();
  await service.initialize();
  return service;
}

export function resetDSARService(): void {
  if (dsarService) {
    dsarService.close();
    dsarService = null;
  }
}

export default DSARService;
