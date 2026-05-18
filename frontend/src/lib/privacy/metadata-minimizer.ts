/**
 * Metadata Minimizer
 *
 * Scrubs and minimizes server-side metadata retention to protect user privacy.
 * Implements configurable retention policies and metadata scrubbing for:
 * - Request/response metadata
 * - User activity metadata
 * - Message metadata
 * - Session metadata
 *
 * @module lib/privacy/metadata-minimizer
 * @version 1.0.0
 */

import { createLogger } from "@/lib/logger";

const log = createLogger("MetadataMinimizer");

// ============================================================================
// TYPES
// ============================================================================

/**
 * Categories of metadata that can be minimized
 */
export type MetadataCategory =
  | "request"
  | "response"
  | "user_activity"
  | "message"
  | "session"
  | "analytics"
  | "audit"
  | "system";

/**
 * Sensitivity levels for metadata fields
 */
export type SensitivityLevel =
  | "public"
  | "internal"
  | "sensitive"
  | "pii"
  | "secret";

/**
 * Metadata field classification
 */
export interface MetadataFieldClassification {
  field: string;
  sensitivity: SensitivityLevel;
  retentionDays: number;
  scrubMethod: ScrubMethod;
  description?: string;
}

/**
 * Methods for scrubbing metadata
 */
export type ScrubMethod =
  | "remove"
  | "hash"
  | "truncate"
  | "mask"
  | "generalize"
  | "pseudonymize"
  | "aggregate"
  | "retain";

/**
 * Scrub options for different methods
 */
export interface ScrubOptions {
  method: ScrubMethod;
  hashAlgorithm?: "sha256" | "sha512" | "blake2b";
  hashSalt?: string;
  truncateLength?: number;
  maskChar?: string;
  maskPreserve?: number;
  generalizeLevel?: "hour" | "day" | "week" | "month";
  pseudonymSeed?: string;
}

/**
 * Metadata retention policy
 */
export interface MetadataRetentionPolicy {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  category: MetadataCategory;
  fields: MetadataFieldClassification[];
  defaultRetentionDays: number;
  defaultScrubMethod: ScrubMethod;
  applyToHistorical: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Minimization result
 */
export interface MinimizationResult<T = Record<string, unknown>> {
  data: T;
  fieldsRemoved: string[];
  fieldsHashed: string[];
  fieldsMasked: string[];
  fieldsGeneralized: string[];
  fieldsRetained: string[];
  processingTimeMs: number;
}

/**
 * Audit entry for minimization operations
 */
export interface MinimizationAuditEntry {
  id: string;
  timestamp: Date;
  category: MetadataCategory;
  policyId?: string;
  fieldsProcessed: number;
  fieldsRemoved: number;
  bytesRemoved: number;
  requestId?: string;
}

/**
 * Configuration for the metadata minimizer
 */
export interface MetadataMinimzerConfig {
  enabled: boolean;
  defaultRetentionDays: number;
  defaultScrubMethod: ScrubMethod;
  hashSalt: string;
  enableAuditLog: boolean;
  maxAuditLogEntries: number;
  strictMode: boolean; // Fail if unknown fields are encountered
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default sensitive field patterns
 */
export const SENSITIVE_FIELD_PATTERNS: readonly RegExp[] = [
  /^ip_?address$/i,
  /^ip$/i,
  /^remote_?addr$/i,
  /^x[-_]forwarded[-_]for$/i,
  /^user[-_]?agent$/i,
  /^cookie/i,
  /^authorization/i,
  /^auth[-_]token/i,
  /^access[-_]token/i,
  /^refresh[-_]token/i,
  /^session[-_]?id$/i,
  /^device[-_]?id$/i,
  /^fingerprint/i,
  /^location/i,
  /^geo[-_]/i,
  /^lat(itude)?$/i,
  /^lon(gitude)?$/i,
  /^coords?$/i,
  /^email$/i,
  /^phone/i,
  /^password/i,
  /^secret/i,
  /^private[-_]?key/i,
  /^ssn$/i,
  /^credit[-_]?card/i,
  /^card[-_]?number/i,
  /^cvv$/i,
  /^dob$/i,
  /^birth[-_]?date/i,
] as const;

/**
 * Default field classifications by category
 */
export const DEFAULT_FIELD_CLASSIFICATIONS: Record<
  MetadataCategory,
  MetadataFieldClassification[]
> = {
  request: [
    { field: "ip", sensitivity: "pii", retentionDays: 7, scrubMethod: "hash" },
    {
      field: "ipAddress",
      sensitivity: "pii",
      retentionDays: 7,
      scrubMethod: "hash",
    },
    {
      field: "userAgent",
      sensitivity: "sensitive",
      retentionDays: 30,
      scrubMethod: "truncate",
    },
    {
      field: "referer",
      sensitivity: "internal",
      retentionDays: 30,
      scrubMethod: "remove",
    },
    {
      field: "path",
      sensitivity: "internal",
      retentionDays: 90,
      scrubMethod: "retain",
    },
    {
      field: "method",
      sensitivity: "public",
      retentionDays: 90,
      scrubMethod: "retain",
    },
    {
      field: "statusCode",
      sensitivity: "public",
      retentionDays: 90,
      scrubMethod: "retain",
    },
    {
      field: "authorization",
      sensitivity: "secret",
      retentionDays: 0,
      scrubMethod: "remove",
    },
    {
      field: "cookie",
      sensitivity: "secret",
      retentionDays: 0,
      scrubMethod: "remove",
    },
  ],
  response: [
    {
      field: "setCookie",
      sensitivity: "secret",
      retentionDays: 0,
      scrubMethod: "remove",
    },
    {
      field: "contentLength",
      sensitivity: "public",
      retentionDays: 90,
      scrubMethod: "retain",
    },
    {
      field: "contentType",
      sensitivity: "public",
      retentionDays: 90,
      scrubMethod: "retain",
    },
  ],
  user_activity: [
    {
      field: "userId",
      sensitivity: "internal",
      retentionDays: 365,
      scrubMethod: "retain",
    },
    {
      field: "action",
      sensitivity: "internal",
      retentionDays: 90,
      scrubMethod: "retain",
    },
    {
      field: "timestamp",
      sensitivity: "internal",
      retentionDays: 90,
      scrubMethod: "generalize",
    },
    { field: "ip", sensitivity: "pii", retentionDays: 7, scrubMethod: "hash" },
    {
      field: "deviceId",
      sensitivity: "pii",
      retentionDays: 30,
      scrubMethod: "hash",
    },
    {
      field: "location",
      sensitivity: "pii",
      retentionDays: 7,
      scrubMethod: "generalize",
    },
    {
      field: "sessionId",
      sensitivity: "sensitive",
      retentionDays: 7,
      scrubMethod: "hash",
    },
  ],
  message: [
    {
      field: "senderId",
      sensitivity: "internal",
      retentionDays: 365,
      scrubMethod: "retain",
    },
    {
      field: "channelId",
      sensitivity: "internal",
      retentionDays: 365,
      scrubMethod: "retain",
    },
    {
      field: "timestamp",
      sensitivity: "internal",
      retentionDays: 365,
      scrubMethod: "retain",
    },
    {
      field: "editHistory",
      sensitivity: "internal",
      retentionDays: 30,
      scrubMethod: "remove",
    },
    {
      field: "clientMetadata",
      sensitivity: "sensitive",
      retentionDays: 7,
      scrubMethod: "remove",
    },
    {
      field: "deviceInfo",
      sensitivity: "pii",
      retentionDays: 7,
      scrubMethod: "remove",
    },
  ],
  session: [
    {
      field: "sessionId",
      sensitivity: "secret",
      retentionDays: 7,
      scrubMethod: "hash",
    },
    {
      field: "userId",
      sensitivity: "internal",
      retentionDays: 30,
      scrubMethod: "retain",
    },
    {
      field: "createdAt",
      sensitivity: "internal",
      retentionDays: 30,
      scrubMethod: "generalize",
    },
    {
      field: "lastActivityAt",
      sensitivity: "internal",
      retentionDays: 30,
      scrubMethod: "generalize",
    },
    { field: "ip", sensitivity: "pii", retentionDays: 7, scrubMethod: "hash" },
    {
      field: "userAgent",
      sensitivity: "sensitive",
      retentionDays: 7,
      scrubMethod: "truncate",
    },
    {
      field: "deviceFingerprint",
      sensitivity: "pii",
      retentionDays: 7,
      scrubMethod: "hash",
    },
  ],
  analytics: [
    {
      field: "userId",
      sensitivity: "internal",
      retentionDays: 365,
      scrubMethod: "pseudonymize",
    },
    {
      field: "sessionId",
      sensitivity: "sensitive",
      retentionDays: 30,
      scrubMethod: "pseudonymize",
    },
    {
      field: "event",
      sensitivity: "public",
      retentionDays: 365,
      scrubMethod: "retain",
    },
    {
      field: "timestamp",
      sensitivity: "internal",
      retentionDays: 365,
      scrubMethod: "generalize",
    },
    {
      field: "properties",
      sensitivity: "internal",
      retentionDays: 90,
      scrubMethod: "retain",
    },
    {
      field: "ip",
      sensitivity: "pii",
      retentionDays: 0,
      scrubMethod: "remove",
    },
    {
      field: "location",
      sensitivity: "pii",
      retentionDays: 30,
      scrubMethod: "generalize",
    },
  ],
  audit: [
    {
      field: "actorId",
      sensitivity: "internal",
      retentionDays: 730,
      scrubMethod: "retain",
    },
    {
      field: "action",
      sensitivity: "internal",
      retentionDays: 730,
      scrubMethod: "retain",
    },
    {
      field: "timestamp",
      sensitivity: "internal",
      retentionDays: 730,
      scrubMethod: "retain",
    },
    {
      field: "resource",
      sensitivity: "internal",
      retentionDays: 730,
      scrubMethod: "retain",
    },
    { field: "ip", sensitivity: "pii", retentionDays: 90, scrubMethod: "hash" },
    {
      field: "metadata",
      sensitivity: "internal",
      retentionDays: 365,
      scrubMethod: "retain",
    },
  ],
  system: [
    {
      field: "hostname",
      sensitivity: "internal",
      retentionDays: 90,
      scrubMethod: "retain",
    },
    {
      field: "version",
      sensitivity: "public",
      retentionDays: 365,
      scrubMethod: "retain",
    },
    {
      field: "timestamp",
      sensitivity: "internal",
      retentionDays: 90,
      scrubMethod: "retain",
    },
    {
      field: "metrics",
      sensitivity: "internal",
      retentionDays: 90,
      scrubMethod: "aggregate",
    },
  ],
};

/**
 * Default configuration
 */
export const DEFAULT_MINIMIZER_CONFIG: MetadataMinimzerConfig = {
  enabled: true,
  defaultRetentionDays: 30,
  defaultScrubMethod: "remove",
  hashSalt: "", // Should be set in production
  enableAuditLog: true,
  maxAuditLogEntries: 10000,
  strictMode: false,
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate a cryptographic hash of a value
 */
export async function hashValue(
  value: string,
  salt: string = "",
  algorithm: "sha256" | "sha512" | "blake2b" = "sha256",
): Promise<string> {
  const input = salt + value;

  if (typeof crypto !== "undefined" && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest(
      algorithm === "sha512" ? "SHA-512" : "SHA-256",
      data,
    );
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  // Fallback for environments without crypto.subtle
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash + char) & 0xffffffff;
  }
  return `hash_${Math.abs(hash).toString(16).padStart(8, "0")}`;
}

/**
 * Sync hash function for cases where async is not possible
 */
export function hashValueSync(value: string, salt: string = ""): string {
  const input = salt + value;
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) & 0xffffffff;
  }
  return `h_${Math.abs(hash).toString(16).padStart(8, "0")}`;
}

/**
 * Truncate a string value
 */
export function truncateValue(value: string, maxLength: number = 50): string {
  if (value.length <= maxLength) {
    return value;
  }
  return value.substring(0, maxLength) + "...";
}

/**
 * Mask a value preserving some characters
 */
export function maskValue(
  value: string,
  maskChar: string = "*",
  preserveFirst: number = 0,
  preserveLast: number = 0,
): string {
  if (value.length <= preserveFirst + preserveLast) {
    return maskChar.repeat(value.length);
  }

  const first = value.substring(0, preserveFirst);
  const last = value.substring(value.length - preserveLast);
  const masked = maskChar.repeat(value.length - preserveFirst - preserveLast);

  return first + masked + last;
}

/**
 * Generalize a timestamp to reduce precision
 */
export function generalizeTimestamp(
  timestamp: Date | string | number,
  level: "hour" | "day" | "week" | "month" = "hour",
): Date {
  const date = new Date(timestamp);

  switch (level) {
    case "hour":
      date.setMinutes(0, 0, 0);
      break;
    case "day":
      date.setHours(0, 0, 0, 0);
      break;
    case "week": {
      const day = date.getDay();
      date.setDate(date.getDate() - day);
      date.setHours(0, 0, 0, 0);
      break;
    }
    case "month":
      date.setDate(1);
      date.setHours(0, 0, 0, 0);
      break;
  }

  return date;
}

/**
 * Generate a pseudonym for a value (deterministic but unlinkable)
 */
export function pseudonymize(value: string, seed: string = ""): string {
  const hash = hashValueSync(value, seed);
  return `pseudo_${hash}`;
}

/**
 * Check if a field name matches sensitive patterns
 */
export function isSensitiveField(fieldName: string): boolean {
  const normalizedName = fieldName.toLowerCase();
  return SENSITIVE_FIELD_PATTERNS.some((pattern) =>
    pattern.test(normalizedName),
  );
}

/**
 * Generate unique ID for audit entries
 */
function generateAuditId(): string {
  return `min_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
}

// ============================================================================
// METADATA MINIMIZER CLASS
// ============================================================================

/**
 * Metadata minimizer for scrubbing and minimizing server-side metadata
 */
export class MetadataMinimizer {
  private config: MetadataMinimzerConfig;
  private policies = new Map<string, MetadataRetentionPolicy>();
  private fieldClassifications = new Map<
    string,
    Map<string, MetadataFieldClassification>
  >();
  private auditLog: MinimizationAuditEntry[] = [];

  constructor(config: Partial<MetadataMinimzerConfig> = {}) {
    this.config = { ...DEFAULT_MINIMIZER_CONFIG, ...config };
    this.initializeDefaultClassifications();
    log.info("MetadataMinimizer initialized", { enabled: this.config.enabled });
  }

  /**
   * Initialize default field classifications
   */
  private initializeDefaultClassifications(): void {
    for (const [category, fields] of Object.entries(
      DEFAULT_FIELD_CLASSIFICATIONS,
    )) {
      const categoryMap = new Map<string, MetadataFieldClassification>();
      for (const field of fields) {
        categoryMap.set(field.field.toLowerCase(), field);
      }
      this.fieldClassifications.set(category as MetadataCategory, categoryMap);
    }
  }

  /**
   * Minimize metadata according to configured policies
   */
  async minimize<T extends Record<string, unknown>>(
    data: T,
    category: MetadataCategory,
    options?: {
      policyId?: string;
      requestId?: string;
      retentionDaysOverride?: number;
    },
  ): Promise<MinimizationResult<T>> {
    const startTime = Date.now();
    const result: MinimizationResult<T> = {
      data: { ...data } as T,
      fieldsRemoved: [],
      fieldsHashed: [],
      fieldsMasked: [],
      fieldsGeneralized: [],
      fieldsRetained: [],
      processingTimeMs: 0,
    };

    if (!this.config.enabled) {
      result.fieldsRetained = Object.keys(data);
      result.processingTimeMs = Date.now() - startTime;
      return result;
    }

    const policy = options?.policyId
      ? this.policies.get(options.policyId)
      : null;
    const categoryClassifications = this.fieldClassifications.get(category);

    let bytesRemoved = 0;

    for (const [key, value] of Object.entries(data)) {
      const normalizedKey = key.toLowerCase();
      const classification = categoryClassifications?.get(normalizedKey);

      // Determine scrub method
      let scrubMethod = this.config.defaultScrubMethod;
      let scrubOptions: ScrubOptions = { method: scrubMethod };

      if (policy) {
        const policyField = policy.fields.find(
          (f) => f.field.toLowerCase() === normalizedKey,
        );
        if (policyField) {
          scrubMethod = policyField.scrubMethod;
          scrubOptions = { method: scrubMethod };
        }
      } else if (classification) {
        scrubMethod = classification.scrubMethod;
        scrubOptions = { method: scrubMethod };
      } else if (isSensitiveField(key)) {
        // Auto-detect sensitive fields
        scrubMethod = "remove";
        scrubOptions = { method: "remove" };
      }

      // Apply scrub method
      const scrubResult = await this.scrubField(key, value, scrubOptions);

      if (scrubResult.removed) {
        bytesRemoved += JSON.stringify(value).length;
        delete (result.data as Record<string, unknown>)[key];
        result.fieldsRemoved.push(key);
      } else if (scrubResult.modified) {
        (result.data as Record<string, unknown>)[key] = scrubResult.value;
        switch (scrubMethod) {
          case "hash":
            result.fieldsHashed.push(key);
            break;
          case "mask":
          case "truncate":
            result.fieldsMasked.push(key);
            break;
          case "generalize":
          case "aggregate":
            result.fieldsGeneralized.push(key);
            break;
          default:
            result.fieldsRetained.push(key);
        }
      } else {
        result.fieldsRetained.push(key);
      }
    }

    result.processingTimeMs = Date.now() - startTime;

    // Add audit entry
    if (this.config.enableAuditLog) {
      this.addAuditEntry({
        category,
        policyId: options?.policyId,
        fieldsProcessed: Object.keys(data).length,
        fieldsRemoved: result.fieldsRemoved.length,
        bytesRemoved,
        requestId: options?.requestId,
      });
    }

    log.debug("Metadata minimized", {
      category,
      removed: result.fieldsRemoved.length,
      hashed: result.fieldsHashed.length,
      masked: result.fieldsMasked.length,
      retained: result.fieldsRetained.length,
    });

    return result;
  }

  /**
   * Scrub a single field value
   */
  private async scrubField(
    _key: string,
    value: unknown,
    options: ScrubOptions,
  ): Promise<{ removed: boolean; modified: boolean; value?: unknown }> {
    if (value === null || value === undefined) {
      return { removed: false, modified: false };
    }

    switch (options.method) {
      case "remove":
        return { removed: true, modified: false };

      case "hash":
        if (typeof value === "string") {
          const hashed = await hashValue(
            value,
            options.hashSalt || this.config.hashSalt,
          );
          return { removed: false, modified: true, value: hashed };
        }
        return {
          removed: false,
          modified: true,
          value: hashValueSync(String(value)),
        };

      case "truncate":
        if (typeof value === "string") {
          const truncated = truncateValue(value, options.truncateLength ?? 50);
          return {
            removed: false,
            modified: truncated !== value,
            value: truncated,
          };
        }
        return { removed: false, modified: false, value };

      case "mask":
        if (typeof value === "string") {
          const masked = maskValue(
            value,
            options.maskChar ?? "*",
            options.maskPreserve ?? 2,
            2,
          );
          return { removed: false, modified: true, value: masked };
        }
        return { removed: false, modified: false, value };

      case "generalize":
        if (
          value instanceof Date ||
          typeof value === "number" ||
          typeof value === "string"
        ) {
          try {
            const generalized = generalizeTimestamp(
              value,
              options.generalizeLevel ?? "hour",
            );
            return { removed: false, modified: true, value: generalized };
          } catch {
            return { removed: false, modified: false, value };
          }
        }
        return { removed: false, modified: false, value };

      case "pseudonymize":
        if (typeof value === "string") {
          const pseudo = pseudonymize(
            value,
            options.pseudonymSeed ?? this.config.hashSalt,
          );
          return { removed: false, modified: true, value: pseudo };
        }
        return {
          removed: false,
          modified: true,
          value: pseudonymize(String(value)),
        };

      case "aggregate":
        // For aggregate, we just retain the value but mark it for later aggregation
        return { removed: false, modified: false, value };

      case "retain":
      default:
        return { removed: false, modified: false, value };
    }
  }

  /**
   * Minimize request metadata
   */
  async minimizeRequest<T extends Record<string, unknown>>(
    metadata: T,
    options?: { requestId?: string },
  ): Promise<MinimizationResult<T>> {
    return this.minimize(metadata, "request", options);
  }

  /**
   * Minimize user activity metadata
   */
  async minimizeActivity<T extends Record<string, unknown>>(
    metadata: T,
    options?: { requestId?: string },
  ): Promise<MinimizationResult<T>> {
    return this.minimize(metadata, "user_activity", options);
  }

  /**
   * Minimize message metadata
   */
  async minimizeMessage<T extends Record<string, unknown>>(
    metadata: T,
    options?: { requestId?: string },
  ): Promise<MinimizationResult<T>> {
    return this.minimize(metadata, "message", options);
  }

  /**
   * Minimize analytics metadata
   */
  async minimizeAnalytics<T extends Record<string, unknown>>(
    metadata: T,
    options?: { requestId?: string },
  ): Promise<MinimizationResult<T>> {
    return this.minimize(metadata, "analytics", options);
  }

  /**
   * Minimize session metadata
   */
  async minimizeSession<T extends Record<string, unknown>>(
    metadata: T,
    options?: { requestId?: string },
  ): Promise<MinimizationResult<T>> {
    return this.minimize(metadata, "session", options);
  }

  // ============================================================================
  // POLICY MANAGEMENT
  // ============================================================================

  /**
   * Add a retention policy
   */
  addPolicy(policy: MetadataRetentionPolicy): void {
    this.policies.set(policy.id, policy);

    // Update field classifications for this policy
    const categoryMap =
      this.fieldClassifications.get(policy.category) || new Map();
    for (const field of policy.fields) {
      categoryMap.set(field.field.toLowerCase(), field);
    }
    this.fieldClassifications.set(policy.category, categoryMap);

    log.info("Policy added", { id: policy.id, name: policy.name });
  }

  /**
   * Remove a policy
   */
  removePolicy(policyId: string): boolean {
    const deleted = this.policies.delete(policyId);
    if (deleted) {
      log.info("Policy removed", { id: policyId });
    }
    return deleted;
  }

  /**
   * Get a policy by ID
   */
  getPolicy(policyId: string): MetadataRetentionPolicy | undefined {
    return this.policies.get(policyId);
  }

  /**
   * List all policies
   */
  listPolicies(): MetadataRetentionPolicy[] {
    return Array.from(this.policies.values());
  }

  /**
   * Update field classification for a category
   */
  updateFieldClassification(
    category: MetadataCategory,
    field: string,
    classification: Partial<MetadataFieldClassification>,
  ): void {
    const categoryMap = this.fieldClassifications.get(category) || new Map();
    const existing = categoryMap.get(field.toLowerCase());

    if (existing) {
      categoryMap.set(field.toLowerCase(), { ...existing, ...classification });
    } else {
      categoryMap.set(field.toLowerCase(), {
        field,
        sensitivity: "internal",
        retentionDays: this.config.defaultRetentionDays,
        scrubMethod: this.config.defaultScrubMethod,
        ...classification,
      } as MetadataFieldClassification);
    }

    this.fieldClassifications.set(category, categoryMap);
  }

  /**
   * Get field classification
   */
  getFieldClassification(
    category: MetadataCategory,
    field: string,
  ): MetadataFieldClassification | undefined {
    return this.fieldClassifications.get(category)?.get(field.toLowerCase());
  }

  // ============================================================================
  // AUDIT LOG
  // ============================================================================

  /**
   * Add audit entry
   */
  private addAuditEntry(
    entry: Omit<MinimizationAuditEntry, "id" | "timestamp">,
  ): void {
    const auditEntry: MinimizationAuditEntry = {
      id: generateAuditId(),
      timestamp: new Date(),
      ...entry,
    };

    this.auditLog.push(auditEntry);

    // Trim audit log if too large
    if (this.auditLog.length > this.config.maxAuditLogEntries) {
      this.auditLog = this.auditLog.slice(-this.config.maxAuditLogEntries);
    }
  }

  /**
   * Get audit log entries
   */
  getAuditLog(options?: {
    category?: MetadataCategory;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): MinimizationAuditEntry[] {
    let entries = [...this.auditLog];

    if (options?.category) {
      entries = entries.filter((e) => e.category === options.category);
    }

    if (options?.startDate) {
      entries = entries.filter((e) => e.timestamp >= options.startDate!);
    }

    if (options?.endDate) {
      entries = entries.filter((e) => e.timestamp <= options.endDate!);
    }

    entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 100;

    return entries.slice(offset, offset + limit);
  }

  /**
   * Get audit statistics
   */
  getAuditStats(): {
    totalEntries: number;
    byCategory: Record<MetadataCategory, number>;
    totalFieldsProcessed: number;
    totalFieldsRemoved: number;
    totalBytesRemoved: number;
  } {
    const stats = {
      totalEntries: this.auditLog.length,
      byCategory: {} as Record<MetadataCategory, number>,
      totalFieldsProcessed: 0,
      totalFieldsRemoved: 0,
      totalBytesRemoved: 0,
    };

    for (const entry of this.auditLog) {
      stats.byCategory[entry.category] =
        (stats.byCategory[entry.category] || 0) + 1;
      stats.totalFieldsProcessed += entry.fieldsProcessed;
      stats.totalFieldsRemoved += entry.fieldsRemoved;
      stats.totalBytesRemoved += entry.bytesRemoved;
    }

    return stats;
  }

  /**
   * Clear audit log
   */
  clearAuditLog(): void {
    this.auditLog = [];
    log.info("Audit log cleared");
  }

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  /**
   * Get configuration
   */
  getConfig(): MetadataMinimzerConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<MetadataMinimzerConfig>): void {
    this.config = { ...this.config, ...updates };
    log.info("Configuration updated");
  }

  /**
   * Enable/disable minimization
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    log.info("Minimization enabled", { enabled });
  }

  /**
   * Check if minimization is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let minimizerInstance: MetadataMinimizer | null = null;

/**
 * Get or create the metadata minimizer singleton
 */
export function getMetadataMinimizer(
  config?: Partial<MetadataMinimzerConfig>,
): MetadataMinimizer {
  if (!minimizerInstance) {
    minimizerInstance = new MetadataMinimizer(config);
  } else if (config) {
    minimizerInstance.updateConfig(config);
  }
  return minimizerInstance;
}

/**
 * Create a new metadata minimizer instance
 */
export function createMetadataMinimizer(
  config?: Partial<MetadataMinimzerConfig>,
): MetadataMinimizer {
  return new MetadataMinimizer(config);
}

/**
 * Reset the singleton (for testing)
 */
export function resetMetadataMinimizer(): void {
  minimizerInstance = null;
}

export default MetadataMinimizer;
