/**
 * Audit Logger Service
 *
 * Enterprise-grade audit logging service with:
 * - Multi-category event logging (auth, authz, data, config, moderation, security, system)
 * - Tamper-proof hash chain integrity
 * - Configurable retention policies
 * - Batch processing for high-throughput
 * - Real-time event streaming
 */

import { v4 as uuidv4 } from "uuid";
import type {
  AuditLogEntry,
  AuditCategory,
  AuditAction,
  AuditSeverity,
  AuditActor,
  AuditResource,
  AuditRetentionPolicy,
  AuditSettings,
  ActorType,
  ResourceType,
} from "@/lib/audit/audit-types";
import {
  AuditIntegrityService,
  createIntegrityService,
  type IntegrityAuditEntry,
  type IntegrityConfig,
  type ChainVerificationResult,
} from "@/lib/audit/audit-integrity";
import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

/**
 * Event logging options
 */
export interface LogEventOptions {
  category: AuditCategory;
  action: AuditAction;
  actor: AuditActor | string;
  description: string;
  severity?: AuditSeverity;
  resource?: AuditResource | { type: ResourceType; id: string; name?: string };
  target?: AuditResource | { type: ResourceType; id: string; name?: string };
  metadata?: Record<string, unknown>;
  success?: boolean;
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  correlationId?: string;
}

/**
 * Shorthand event options (for convenience methods)
 */
export interface QuickLogOptions {
  actor: AuditActor | string;
  description?: string;
  metadata?: Record<string, unknown>;
  success?: boolean;
  errorMessage?: string;
  ipAddress?: string;
  requestId?: string;
}

/**
 * Service configuration
 */
export interface AuditLoggerServiceConfig {
  enabled: boolean;
  enableIntegrity: boolean;
  integrityConfig?: Partial<IntegrityConfig>;
  batchSize: number;
  flushIntervalMs: number;
  maxQueueSize: number;
  sensitiveFieldMasking: boolean;
  ipLoggingEnabled: boolean;
  retentionPolicies: AuditRetentionPolicy[];
  onLog?: (entry: AuditLogEntry) => void;
  onBatchFlush?: (entries: AuditLogEntry[]) => Promise<void>;
  onError?: (error: Error, context: Record<string, unknown>) => void;
  onIntegrityAlert?: (result: ChainVerificationResult) => void;
}

/**
 * Service statistics
 */
export interface AuditLoggerStats {
  totalLogged: number;
  totalFlushed: number;
  queueSize: number;
  integrityStatus: "valid" | "compromised" | "unknown" | "disabled";
  lastFlushAt?: Date;
  lastVerificationAt?: Date;
  errorCount: number;
  bySeverity: Record<AuditSeverity, number>;
  byCategory: Record<AuditCategory, number>;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: AuditLoggerServiceConfig = {
  enabled: true,
  enableIntegrity: true,
  batchSize: 50,
  flushIntervalMs: 5000,
  maxQueueSize: 10000,
  sensitiveFieldMasking: true,
  ipLoggingEnabled: true,
  retentionPolicies: [],
};

/**
 * Sensitive fields to mask
 */
const SENSITIVE_FIELDS = [
  "password",
  "secret",
  "token",
  "apiKey",
  "api_key",
  "accessToken",
  "access_token",
  "refreshToken",
  "refresh_token",
  "privateKey",
  "private_key",
  "creditCard",
  "credit_card",
  "ssn",
  "socialSecurityNumber",
];

// ============================================================================
// Audit Logger Service
// ============================================================================

export class AuditLoggerService {
  private config: AuditLoggerServiceConfig;
  private queue: AuditLogEntry[] = [];
  private integrityService: AuditIntegrityService | null = null;
  private flushTimer: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private stats: AuditLoggerStats = {
    totalLogged: 0,
    totalFlushed: 0,
    queueSize: 0,
    integrityStatus: "unknown",
    errorCount: 0,
    bySeverity: { info: 0, warning: 0, error: 0, critical: 0 },
    byCategory: {
      user: 0,
      message: 0,
      channel: 0,
      file: 0,
      attachment: 0,
      moderation: 0,
      admin: 0,
      security: 0,
      integration: 0,
    },
  };

  constructor(config: Partial<AuditLoggerServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    if (this.config.enableIntegrity) {
      this.integrityService = createIntegrityService({
        ...this.config.integrityConfig,
        onCompromiseDetected: this.config.onIntegrityAlert,
      });
    }

    this.startFlushTimer();
    logger.info("[AuditLoggerService] Initialized", {
      enabled: this.config.enabled,
      integrity: this.config.enableIntegrity,
    });
  }

  // ==========================================================================
  // Core Logging Methods
  // ==========================================================================

  /**
   * Log an audit event
   */
  async log(options: LogEventOptions): Promise<AuditLogEntry | null> {
    if (!this.config.enabled) {
      return null;
    }

    try {
      const entry = this.createEntry(options);

      // Mask sensitive fields
      if (this.config.sensitiveFieldMasking) {
        this.maskSensitiveFields(entry);
      }

      // Add to integrity chain if enabled
      if (this.integrityService) {
        await this.integrityService.addEntry(entry);
      }

      // Add to queue
      this.addToQueue(entry);

      // Update stats
      this.stats.totalLogged++;
      this.stats.bySeverity[entry.severity]++;
      this.stats.byCategory[entry.category]++;
      this.stats.queueSize = this.queue.length;

      // Call onLog callback
      if (this.config.onLog) {
        this.config.onLog(entry);
      }

      return entry;
    } catch (error) {
      this.stats.errorCount++;
      if (this.config.onError) {
        this.config.onError(error as Error, { options });
      }
      logger.error("[AuditLoggerService] Log error", error);
      return null;
    }
  }

  // ==========================================================================
  // Category-Specific Convenience Methods
  // ==========================================================================

  /**
   * Log authentication events
   */
  async logAuth(
    action:
      | "login"
      | "logout"
      | "signup"
      | "password_change"
      | "password_reset"
      | "mfa_enable"
      | "mfa_disable"
      | "failed_login"
      | "session_invalidate",
    options: QuickLogOptions,
  ): Promise<AuditLogEntry | null> {
    const severityMap: Record<string, AuditSeverity> = {
      login: "info",
      logout: "info",
      signup: "info",
      password_change: "warning",
      password_reset: "warning",
      mfa_enable: "info",
      mfa_disable: "warning",
      failed_login: "warning",
      session_invalidate: "warning",
    };

    return this.log({
      category: "user",
      action: action as AuditAction,
      actor: options.actor,
      description: options.description || `User ${action.replace("_", " ")}`,
      severity: severityMap[action] || "info",
      success: options.success ?? true,
      errorMessage: options.errorMessage,
      metadata: options.metadata,
      ipAddress: options.ipAddress,
      requestId: options.requestId,
    });
  }

  /**
   * Log authorization events
   */
  async logAuthz(
    action:
      | "role_assigned"
      | "role_unassigned"
      | "role_created"
      | "role_updated"
      | "role_deleted"
      | "permission_change",
    userId: string,
    options: QuickLogOptions & {
      targetUserId?: string;
      role?: string;
      permissions?: string[];
    },
  ): Promise<AuditLogEntry | null> {
    return this.log({
      category: "admin",
      action: action as AuditAction,
      actor: options.actor,
      description:
        options.description || `Authorization: ${action.replace("_", " ")}`,
      severity: "warning",
      target: options.targetUserId
        ? { type: "user", id: options.targetUserId }
        : undefined,
      metadata: {
        ...options.metadata,
        role: options.role,
        permissions: options.permissions,
        affectedUserId: userId,
      },
      success: options.success ?? true,
      errorMessage: options.errorMessage,
      ipAddress: options.ipAddress,
      requestId: options.requestId,
    });
  }

  /**
   * Log data access events
   */
  async logDataAccess(
    action:
      | "create"
      | "edit"
      | "delete"
      | "download"
      | "access"
      | "share"
      | "unshare"
      | "bulk_delete",
    resourceType: ResourceType,
    resourceId: string,
    options: QuickLogOptions & { resourceName?: string },
  ): Promise<AuditLogEntry | null> {
    const categoryMap: Record<string, AuditCategory> = {
      message: "message",
      channel: "channel",
      file: "file",
      attachment: "attachment",
    };

    return this.log({
      category: categoryMap[resourceType] || "file",
      action: action as AuditAction,
      actor: options.actor,
      description:
        options.description || `Data ${action}: ${resourceType} ${resourceId}`,
      severity:
        action === "delete" || action === "bulk_delete" ? "warning" : "info",
      resource: {
        type: resourceType,
        id: resourceId,
        name: options.resourceName,
      },
      metadata: options.metadata,
      success: options.success ?? true,
      errorMessage: options.errorMessage,
      ipAddress: options.ipAddress,
      requestId: options.requestId,
    });
  }

  /**
   * Log configuration change events
   */
  async logConfigChange(
    action:
      | "settings_change"
      | "config_update"
      | "feature_toggle"
      | "audit_settings_change"
      | "retention_policy_change",
    options: QuickLogOptions & {
      settingName?: string;
      previousValue?: unknown;
      newValue?: unknown;
    },
  ): Promise<AuditLogEntry | null> {
    return this.log({
      category: "admin",
      action: action as AuditAction,
      actor: options.actor,
      description:
        options.description || `Configuration: ${action.replace("_", " ")}`,
      severity: "warning",
      metadata: {
        ...options.metadata,
        settingName: options.settingName,
        previousValue: options.previousValue,
        newValue: options.newValue,
      },
      success: options.success ?? true,
      errorMessage: options.errorMessage,
      ipAddress: options.ipAddress,
      requestId: options.requestId,
    });
  }

  /**
   * Log moderation events
   */
  async logModeration(
    action:
      | "user_warned"
      | "user_muted"
      | "user_banned"
      | "user_shadowbanned"
      | "content_flagged"
      | "content_deleted"
      | "content_hidden"
      | "appeal_submitted"
      | "appeal_resolved",
    targetUserId: string,
    options: QuickLogOptions & {
      reason?: string;
      duration?: number;
      channelId?: string;
    },
  ): Promise<AuditLogEntry | null> {
    const severityMap: Record<string, AuditSeverity> = {
      user_warned: "info",
      user_muted: "warning",
      user_banned: "warning",
      user_shadowbanned: "warning",
      content_flagged: "info",
      content_deleted: "warning",
      content_hidden: "info",
      appeal_submitted: "info",
      appeal_resolved: "info",
    };

    return this.log({
      category: "moderation",
      action: action as AuditAction,
      actor: options.actor,
      description:
        options.description || `Moderation: ${action.replace("_", " ")}`,
      severity: severityMap[action] || "warning",
      target: { type: "user", id: targetUserId },
      metadata: {
        ...options.metadata,
        reason: options.reason,
        duration: options.duration,
        channelId: options.channelId,
      },
      success: options.success ?? true,
      errorMessage: options.errorMessage,
      ipAddress: options.ipAddress,
      requestId: options.requestId,
    });
  }

  /**
   * Log security events
   */
  async logSecurity(
    action:
      | "suspicious_activity"
      | "api_key_create"
      | "api_key_revoke"
      | "api_key_use"
      | "webhook_create"
      | "webhook_delete"
      | "ip_blocked"
      | "rate_limit_exceeded",
    options: QuickLogOptions & {
      severity?: AuditSeverity;
      threatLevel?: "low" | "medium" | "high" | "critical";
    },
  ): Promise<AuditLogEntry | null> {
    const severityMap: Record<string, AuditSeverity> = {
      suspicious_activity: "warning",
      api_key_create: "info",
      api_key_revoke: "warning",
      api_key_use: "info",
      webhook_create: "info",
      webhook_delete: "warning",
      ip_blocked: "warning",
      rate_limit_exceeded: "warning",
    };

    return this.log({
      category: "security",
      action: action as AuditAction,
      actor: options.actor,
      description:
        options.description || `Security: ${action.replace("_", " ")}`,
      severity: options.severity || severityMap[action] || "warning",
      metadata: {
        ...options.metadata,
        threatLevel: options.threatLevel,
      },
      success: options.success ?? true,
      errorMessage: options.errorMessage,
      ipAddress: options.ipAddress,
      requestId: options.requestId,
    });
  }

  // ==========================================================================
  // Batch Operations
  // ==========================================================================

  /**
   * Flush the queue immediately
   */
  async flush(): Promise<AuditLogEntry[]> {
    if (this.isProcessing || this.queue.length === 0) {
      return [];
    }

    this.isProcessing = true;
    const entries = [...this.queue];
    this.queue = [];
    this.stats.queueSize = 0;

    try {
      if (this.config.onBatchFlush) {
        await this.config.onBatchFlush(entries);
      }

      this.stats.totalFlushed += entries.length;
      this.stats.lastFlushAt = new Date();

      logger.debug("[AuditLoggerService] Flushed entries", {
        count: entries.length,
      });
      return entries;
    } catch (error) {
      // Re-queue entries on failure
      this.queue = [...entries, ...this.queue];
      this.stats.queueSize = this.queue.length;
      this.stats.errorCount++;

      if (this.config.onError) {
        this.config.onError(error as Error, {
          operation: "flush",
          entryCount: entries.length,
        });
      }
      logger.error("[AuditLoggerService] Flush error", error);
      return [];
    } finally {
      this.isProcessing = false;
    }
  }

  // ==========================================================================
  // Integrity Operations
  // ==========================================================================

  /**
   * Verify audit log integrity
   */
  async verifyIntegrity(): Promise<ChainVerificationResult | null> {
    if (!this.integrityService) {
      return null;
    }

    const result = await this.integrityService.verify();
    this.stats.integrityStatus = result.isValid ? "valid" : "compromised";
    this.stats.lastVerificationAt = new Date();

    return result;
  }

  /**
   * Get integrity entries
   */
  getIntegrityEntries(): IntegrityAuditEntry[] {
    return this.integrityService?.getEntries() || [];
  }

  /**
   * Export integrity chain state
   */
  exportIntegrityState(): ReturnType<
    AuditIntegrityService["exportState"]
  > | null {
    return this.integrityService?.exportState() || null;
  }

  /**
   * Import integrity chain state
   */
  importIntegrityState(
    state: ReturnType<AuditIntegrityService["exportState"]>,
  ): void {
    this.integrityService?.importState(state);
  }

  // ==========================================================================
  // Configuration and Management
  // ==========================================================================

  /**
   * Update configuration
   */
  configure(config: Partial<AuditLoggerServiceConfig>): void {
    this.config = { ...this.config, ...config };

    if (config.flushIntervalMs !== undefined) {
      this.restartFlushTimer();
    }

    logger.info("[AuditLoggerService] Configuration updated");
  }

  /**
   * Enable/disable logging
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  /**
   * Get current configuration
   */
  getConfig(): AuditLoggerServiceConfig {
    return { ...this.config };
  }

  /**
   * Get statistics
   */
  getStats(): AuditLoggerStats {
    return { ...this.stats };
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Clear queue (for testing)
   */
  clearQueue(): void {
    this.queue = [];
    this.stats.queueSize = 0;
  }

  /**
   * Get pending entries (queue contents)
   */
  getPendingEntries(): AuditLogEntry[] {
    return [...this.queue];
  }

  /**
   * Destroy the service
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.queue = [];
    logger.info("[AuditLoggerService] Destroyed");
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private createEntry(options: LogEventOptions): AuditLogEntry {
    const actor = this.normalizeActor(options.actor);

    const entry: AuditLogEntry = {
      id: uuidv4(),
      timestamp: new Date(),
      category: options.category,
      action: options.action,
      severity: options.severity || "info",
      actor,
      description: options.description,
      success: options.success ?? true,
      errorMessage: options.errorMessage,
      metadata: options.metadata,
      requestId: options.requestId,
      correlationId: options.correlationId,
    };

    if (options.resource) {
      entry.resource = this.normalizeResource(options.resource);
    }

    if (options.target) {
      entry.target = this.normalizeResource(options.target);
    }

    if (this.config.ipLoggingEnabled && options.ipAddress) {
      entry.ipAddress = options.ipAddress;
    }

    return entry;
  }

  private normalizeActor(actor: AuditActor | string): AuditActor {
    if (typeof actor === "string") {
      return {
        id: actor,
        type: "user" as ActorType,
      };
    }
    return actor;
  }

  private normalizeResource(
    resource: AuditResource | { type: ResourceType; id: string; name?: string },
  ): AuditResource {
    return {
      type: resource.type,
      id: resource.id,
      name: resource.name,
      ...("previousValue" in resource
        ? { previousValue: resource.previousValue }
        : {}),
      ...("newValue" in resource ? { newValue: resource.newValue } : {}),
      ...("metadata" in resource ? { metadata: resource.metadata } : {}),
    };
  }

  private maskSensitiveFields(entry: AuditLogEntry): void {
    if (!entry.metadata) return;

    for (const field of SENSITIVE_FIELDS) {
      if (field in entry.metadata) {
        entry.metadata[field] = "[REDACTED]";
      }
    }

    // Mask in nested metadata
    const maskNested = (obj: Record<string, unknown>) => {
      for (const key in obj) {
        if (SENSITIVE_FIELDS.includes(key.toLowerCase())) {
          obj[key] = "[REDACTED]";
        } else if (typeof obj[key] === "object" && obj[key] !== null) {
          maskNested(obj[key] as Record<string, unknown>);
        }
      }
    };

    maskNested(entry.metadata);
  }

  private addToQueue(entry: AuditLogEntry): void {
    if (this.queue.length >= this.config.maxQueueSize) {
      this.queue.shift(); // Remove oldest
      logger.warn("[AuditLoggerService] Queue overflow, dropping oldest entry");
    }
    this.queue.push(entry);
    this.stats.queueSize = this.queue.length;

    if (this.queue.length >= this.config.batchSize) {
      this.flush();
    }
  }

  private startFlushTimer(): void {
    if (this.flushTimer) return;

    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushIntervalMs);
  }

  private restartFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.startFlushTimer();
  }
}

// ============================================================================
// Singleton Factory
// ============================================================================

let serviceInstance: AuditLoggerService | null = null;

/**
 * Get singleton instance
 */
export function getAuditLoggerService(
  config?: Partial<AuditLoggerServiceConfig>,
): AuditLoggerService {
  if (!serviceInstance) {
    serviceInstance = new AuditLoggerService(config);
  } else if (config) {
    serviceInstance.configure(config);
  }
  return serviceInstance;
}

/**
 * Create new instance
 */
export function createAuditLoggerService(
  config?: Partial<AuditLoggerServiceConfig>,
): AuditLoggerService {
  return new AuditLoggerService(config);
}

export default AuditLoggerService;
