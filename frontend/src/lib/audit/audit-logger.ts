/**
 * Audit Logger - Core logging functionality for audit events
 *
 * This module provides the main audit logging functionality,
 * including event creation, batching, and persistence.
 */

import { v4 as uuidv4 } from "uuid";
import type {
  AuditAction,
  AuditActor,
  AuditCategory,
  AuditLogEntry,
  AuditResource,
  AuditSeverity,
  ActorType,
  ResourceType,
} from "./audit-types";

import { auditEventConfigs, getSensitiveFields } from "./audit-events";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface LogEventOptions {
  action: AuditAction;
  actor: AuditActor | string;
  category?: AuditCategory;
  severity?: AuditSeverity;
  resource?: AuditResource | { type: ResourceType; id: string; name?: string };
  target?: AuditResource | { type: ResourceType; id: string; name?: string };
  description?: string;
  metadata?: Record<string, unknown>;
  success?: boolean;
  errorMessage?: string;
  ipAddress?: string;
  requestId?: string;
  correlationId?: string;
}

export interface AuditLoggerConfig {
  enabled: boolean;
  sensitiveFieldMasking: boolean;
  ipLoggingEnabled: boolean;
  batchSize: number;
  flushIntervalMs: number;
  maxQueueSize: number;
  onLog?: (entry: AuditLogEntry) => void;
  onError?: (error: Error, entry: Partial<AuditLogEntry>) => void;
}

// ============================================================================
// Default Configuration
// ============================================================================

const defaultConfig: AuditLoggerConfig = {
  enabled: true,
  sensitiveFieldMasking: true,
  ipLoggingEnabled: true,
  batchSize: 10,
  flushIntervalMs: 5000,
  maxQueueSize: 1000,
};

// ============================================================================
// Audit Logger Class
// ============================================================================

class AuditLogger {
  private config: AuditLoggerConfig;
  private queue: AuditLogEntry[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor(config: Partial<AuditLoggerConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.startFlushTimer();
  }

  /**
   * Update logger configuration
   */
  configure(config: Partial<AuditLoggerConfig>): void {
    this.config = { ...this.config, ...config };
    this.restartFlushTimer();
  }

  /**
   * Log an audit event
   */
  async log(options: LogEventOptions): Promise<AuditLogEntry | null> {
    if (!this.config.enabled) {
      return null;
    }

    try {
      const entry = this.createLogEntry(options);

      // Mask sensitive fields if enabled
      if (this.config.sensitiveFieldMasking) {
        this.maskSensitiveFields(entry);
      }

      // Add to queue
      this.addToQueue(entry);

      // Call onLog callback if provided
      if (this.config.onLog) {
        this.config.onLog(entry);
      }

      return entry;
    } catch (error) {
      if (this.config.onError) {
        this.config.onError(error as Error, options as Partial<AuditLogEntry>);
      }
      logger.error("[AuditLogger] Error logging event:", error);
      return null;
    }
  }

  /**
   * Log a user event
   */
  async logUserEvent(
    action: AuditAction,
    actor: AuditActor | string,
    options: Partial<LogEventOptions> = {},
  ): Promise<AuditLogEntry | null> {
    return this.log({
      action,
      actor,
      category: "user",
      ...options,
    });
  }

  /**
   * Log a message event
   */
  async logMessageEvent(
    action: AuditAction,
    actor: AuditActor | string,
    messageId: string,
    channelId: string,
    options: Partial<LogEventOptions> = {},
  ): Promise<AuditLogEntry | null> {
    return this.log({
      action,
      actor,
      category: "message",
      resource: { type: "message", id: messageId },
      metadata: { channelId, ...options.metadata },
      ...options,
    });
  }

  /**
   * Log a channel event
   */
  async logChannelEvent(
    action: AuditAction,
    actor: AuditActor | string,
    channelId: string,
    channelName?: string,
    options: Partial<LogEventOptions> = {},
  ): Promise<AuditLogEntry | null> {
    return this.log({
      action,
      actor,
      category: "channel",
      resource: { type: "channel", id: channelId, name: channelName },
      ...options,
    });
  }

  /**
   * Log a file event
   */
  async logFileEvent(
    action: AuditAction,
    actor: AuditActor | string,
    fileId: string,
    fileName?: string,
    options: Partial<LogEventOptions> = {},
  ): Promise<AuditLogEntry | null> {
    return this.log({
      action,
      actor,
      category: "file",
      resource: { type: "file", id: fileId, name: fileName },
      ...options,
    });
  }

  /**
   * Log an admin event
   */
  async logAdminEvent(
    action: AuditAction,
    actor: AuditActor | string,
    options: Partial<LogEventOptions> = {},
  ): Promise<AuditLogEntry | null> {
    return this.log({
      action,
      actor,
      category: "admin",
      ...options,
    });
  }

  /**
   * Log a security event
   */
  async logSecurityEvent(
    action: AuditAction,
    actor: AuditActor | string,
    options: Partial<LogEventOptions> = {},
  ): Promise<AuditLogEntry | null> {
    return this.log({
      action,
      actor,
      category: "security",
      severity: options.severity ?? "warning",
      ...options,
    });
  }

  /**
   * Log an integration event
   */
  async logIntegrationEvent(
    action: AuditAction,
    actor: AuditActor | string,
    integrationId: string,
    integrationName?: string,
    options: Partial<LogEventOptions> = {},
  ): Promise<AuditLogEntry | null> {
    return this.log({
      action,
      actor,
      category: "integration",
      resource: {
        type: "integration",
        id: integrationId,
        name: integrationName,
      },
      ...options,
    });
  }

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

    try {
      // Here you would typically send the entries to the backend
      // For now, we'll just return them
      return entries;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Get the current queue size
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Clear the queue
   */
  clearQueue(): void {
    this.queue = [];
  }

  /**
   * Destroy the logger
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.queue = [];
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private createLogEntry(options: LogEventOptions): AuditLogEntry {
    const config = auditEventConfigs[options.action];
    const category = options.category ?? config?.category ?? "user";
    const severity = options.severity ?? config?.defaultSeverity ?? "info";
    const actor = this.normalizeActor(options.actor);

    const entry: AuditLogEntry = {
      id: uuidv4(),
      timestamp: new Date(),
      category,
      action: options.action,
      severity,
      actor,
      description:
        options.description ?? config?.description ?? `${options.action} event`,
      success: options.success ?? true,
      errorMessage: options.errorMessage,
      metadata: options.metadata,
      requestId: options.requestId,
      correlationId: options.correlationId,
    };

    // Add resource if provided
    if (options.resource) {
      entry.resource = this.normalizeResource(options.resource);
    }

    // Add target if provided
    if (options.target) {
      entry.target = this.normalizeResource(options.target);
    }

    // Add IP address if enabled and provided
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
    const sensitiveFields = getSensitiveFields(entry.action);
    if (sensitiveFields.length === 0 || !entry.metadata) {
      return;
    }

    for (const field of sensitiveFields) {
      if (field in entry.metadata) {
        entry.metadata[field] = "[REDACTED]";
      }
    }

    // Also mask in resource
    if (entry.resource?.metadata) {
      for (const field of sensitiveFields) {
        if (field in entry.resource.metadata) {
          entry.resource.metadata[field] = "[REDACTED]";
        }
      }
    }
  }

  private addToQueue(entry: AuditLogEntry): void {
    if (this.queue.length >= this.config.maxQueueSize) {
      // Remove oldest entries if queue is full
      this.queue.shift();
    }
    this.queue.push(entry);

    // Flush if batch size reached
    if (this.queue.length >= this.config.batchSize) {
      this.flush();
    }
  }

  private startFlushTimer(): void {
    if (this.flushTimer) {
      return;
    }
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
// Singleton Instance
// ============================================================================

let auditLoggerInstance: AuditLogger | null = null;

/**
 * Get the audit logger instance
 */
export function getAuditLogger(
  config?: Partial<AuditLoggerConfig>,
): AuditLogger {
  if (!auditLoggerInstance) {
    auditLoggerInstance = new AuditLogger(config);
  } else if (config) {
    auditLoggerInstance.configure(config);
  }
  return auditLoggerInstance;
}

/**
 * Create a new audit logger instance
 */
export function createAuditLogger(
  config?: Partial<AuditLoggerConfig>,
): AuditLogger {
  return new AuditLogger(config);
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Log an audit event using the singleton instance
 */
export async function logAuditEvent(
  options: LogEventOptions,
): Promise<AuditLogEntry | null> {
  return getAuditLogger().log(options);
}

/**
 * Log a user event using the singleton instance
 */
export async function logUserEvent(
  action: AuditAction,
  actor: AuditActor | string,
  options: Partial<LogEventOptions> = {},
): Promise<AuditLogEntry | null> {
  return getAuditLogger().logUserEvent(action, actor, options);
}

/**
 * Log a security event using the singleton instance
 */
export async function logSecurityEvent(
  action: AuditAction,
  actor: AuditActor | string,
  options: Partial<LogEventOptions> = {},
): Promise<AuditLogEntry | null> {
  return getAuditLogger().logSecurityEvent(action, actor, options);
}

export { AuditLogger };
