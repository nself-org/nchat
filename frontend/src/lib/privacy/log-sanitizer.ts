/**
 * Log Sanitizer
 *
 * Scrubs sensitive PII and metadata from log entries before storage.
 * Implements configurable sanitization rules for:
 * - Personal identifiable information (PII)
 * - Credentials and secrets
 * - IP addresses
 * - Custom patterns
 *
 * Integrates with the logging system to automatically sanitize output.
 *
 * @module lib/privacy/log-sanitizer
 * @version 1.0.0
 */

import { createLogger } from "@/lib/logger";
import { anonymizeIP, type AnonymizationStrategy } from "./ip-anonymizer";
import { hashValueSync } from "./metadata-minimizer";

const log = createLogger("LogSanitizer");

// ============================================================================
// TYPES
// ============================================================================

/**
 * Log severity levels
 */
export type LogSeverity = "debug" | "info" | "warn" | "error" | "critical";

/**
 * Sanitization action to take
 */
export type SanitizationAction =
  | "redact"
  | "hash"
  | "mask"
  | "truncate"
  | "anonymize_ip"
  | "remove"
  | "retain";

/**
 * Sensitive data pattern definition
 */
export interface SensitivePattern {
  id: string;
  name: string;
  description?: string;
  pattern: RegExp;
  action: SanitizationAction;
  replacement?: string;
  enabled: boolean;
  priority: number;
}

/**
 * Field-specific sanitization rule
 */
export interface FieldSanitizationRule {
  field: string;
  action: SanitizationAction;
  pattern?: RegExp;
  maxLength?: number;
  preservePrefix?: number;
  preserveSuffix?: number;
}

/**
 * Log entry structure
 */
export interface LogEntry {
  timestamp: Date | string;
  level: LogSeverity;
  message: string;
  context?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  error?: Error | string;
  requestId?: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  path?: string;
  [key: string]: unknown;
}

/**
 * Sanitization result
 */
export interface SanitizationResult {
  entry: LogEntry;
  fieldsRedacted: string[];
  fieldsHashed: string[];
  fieldsMasked: string[];
  fieldsRemoved: string[];
  patternsMatched: string[];
  sanitizationTimeMs: number;
}

/**
 * Log sanitizer configuration
 */
export interface LogSanitizerConfig {
  enabled: boolean;
  defaultAction: SanitizationAction;
  redactedPlaceholder: string;
  hashSalt: string;
  ipAnonymizationStrategy: AnonymizationStrategy;
  preserveLogStructure: boolean;
  sanitizeStackTraces: boolean;
  maxMessageLength: number;
  maxFieldLength: number;
  enablePatternMatching: boolean;
  strictMode: boolean;
  auditSanitization: boolean;
}

/**
 * Sanitization statistics
 */
export interface SanitizationStats {
  totalEntriesProcessed: number;
  totalFieldsRedacted: number;
  totalFieldsHashed: number;
  totalFieldsMasked: number;
  totalFieldsRemoved: number;
  totalPatternsMatched: number;
  byPattern: Record<string, number>;
  processingTimeMs: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default redacted placeholder
 */
export const REDACTED = "[REDACTED]";

/**
 * Default hashed placeholder prefix
 */
export const HASHED_PREFIX = "[HASH:";

/**
 * Default masked placeholder
 */
export const MASKED = "***";

/**
 * Default sensitive patterns
 */
export const DEFAULT_SENSITIVE_PATTERNS: SensitivePattern[] = [
  // Passwords and secrets
  {
    id: "password",
    name: "Password",
    pattern: /password['":\s]*[=:]\s*['"]?([^'"\s,}]+)/gi,
    action: "redact",
    enabled: true,
    priority: 100,
  },
  {
    id: "secret",
    name: "Secret",
    pattern: /secret['":\s]*[=:]\s*['"]?([^'"\s,}]+)/gi,
    action: "redact",
    enabled: true,
    priority: 100,
  },
  {
    id: "api_key",
    name: "API Key",
    pattern: /api[_-]?key['":\s]*[=:]\s*['"]?([^'"\s,}]+)/gi,
    action: "redact",
    enabled: true,
    priority: 100,
  },
  {
    id: "token",
    name: "Token",
    pattern:
      /(?:access|refresh|auth|bearer)[_-]?token['":\s]*[=:]\s*['"]?([^'"\s,}]+)/gi,
    action: "redact",
    enabled: true,
    priority: 100,
  },
  {
    id: "jwt",
    name: "JWT Token",
    pattern: /eyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/g,
    action: "redact",
    replacement: "[JWT_TOKEN]",
    enabled: true,
    priority: 90,
  },
  {
    id: "bearer",
    name: "Bearer Token",
    pattern: /Bearer\s+[A-Za-z0-9-_]+/gi,
    action: "redact",
    replacement: "Bearer [TOKEN]",
    enabled: true,
    priority: 90,
  },

  // Personal Information
  {
    id: "email",
    name: "Email Address",
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    action: "mask",
    enabled: true,
    priority: 80,
  },
  {
    id: "phone",
    name: "Phone Number",
    pattern: /(?:\+?1[-.]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g,
    action: "mask",
    enabled: true,
    priority: 80,
  },
  {
    id: "ssn",
    name: "Social Security Number",
    pattern: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,
    action: "redact",
    enabled: true,
    priority: 100,
  },
  {
    id: "credit_card",
    name: "Credit Card",
    pattern:
      /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g,
    action: "redact",
    enabled: true,
    priority: 100,
  },

  // IP Addresses
  {
    id: "ipv4",
    name: "IPv4 Address",
    pattern:
      /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
    action: "anonymize_ip",
    enabled: true,
    priority: 70,
  },
  {
    id: "ipv6",
    name: "IPv6 Address",
    pattern:
      /(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::(?:[0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}/g,
    action: "anonymize_ip",
    enabled: true,
    priority: 70,
  },

  // Database/Connection Strings
  {
    id: "connection_string",
    name: "Connection String",
    pattern: /(?:mongodb|postgres|mysql|redis|amqp):\/\/[^@\s]+@[^\s]+/gi,
    action: "redact",
    replacement: "[CONNECTION_STRING]",
    enabled: true,
    priority: 95,
  },

  // AWS Keys
  {
    id: "aws_key",
    name: "AWS Access Key",
    pattern: /(?:AKIA|ABIA|ACCA|ASIA)[0-9A-Z]{16}/g,
    action: "redact",
    enabled: true,
    priority: 100,
  },
  {
    id: "aws_secret",
    name: "AWS Secret Key",
    pattern:
      /aws[_-]?secret[_-]?access[_-]?key['":\s]*[=:]\s*['"]?([^'"\s,}]+)/gi,
    action: "redact",
    enabled: true,
    priority: 100,
  },

  // Private Keys
  {
    id: "private_key",
    name: "Private Key",
    pattern:
      /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |DSA )?PRIVATE KEY-----/g,
    action: "redact",
    replacement: "[PRIVATE_KEY]",
    enabled: true,
    priority: 100,
  },
];

/**
 * Default field sanitization rules
 */
export const DEFAULT_FIELD_RULES: FieldSanitizationRule[] = [
  { field: "password", action: "redact" },
  { field: "secret", action: "redact" },
  { field: "token", action: "redact" },
  { field: "apiKey", action: "redact" },
  { field: "api_key", action: "redact" },
  { field: "accessToken", action: "redact" },
  { field: "access_token", action: "redact" },
  { field: "refreshToken", action: "redact" },
  { field: "refresh_token", action: "redact" },
  { field: "authorization", action: "redact" },
  { field: "cookie", action: "redact" },
  { field: "sessionId", action: "hash" },
  { field: "session_id", action: "hash" },
  { field: "userId", action: "retain" },
  { field: "user_id", action: "retain" },
  { field: "email", action: "mask", preservePrefix: 2, preserveSuffix: 0 },
  { field: "phone", action: "mask", preservePrefix: 0, preserveSuffix: 4 },
  { field: "ip", action: "anonymize_ip" },
  { field: "ipAddress", action: "anonymize_ip" },
  { field: "ip_address", action: "anonymize_ip" },
  { field: "remoteAddr", action: "anonymize_ip" },
  { field: "remote_addr", action: "anonymize_ip" },
  { field: "xForwardedFor", action: "anonymize_ip" },
  { field: "x_forwarded_for", action: "anonymize_ip" },
  { field: "userAgent", action: "truncate", maxLength: 100 },
  { field: "user_agent", action: "truncate", maxLength: 100 },
  { field: "creditCard", action: "redact" },
  { field: "credit_card", action: "redact" },
  { field: "cardNumber", action: "redact" },
  { field: "card_number", action: "redact" },
  { field: "cvv", action: "redact" },
  { field: "ssn", action: "redact" },
  { field: "privateKey", action: "redact" },
  { field: "private_key", action: "redact" },
];

/**
 * Default configuration
 */
export const DEFAULT_SANITIZER_CONFIG: LogSanitizerConfig = {
  enabled: true,
  defaultAction: "redact",
  redactedPlaceholder: REDACTED,
  hashSalt: "",
  ipAnonymizationStrategy: "truncate",
  preserveLogStructure: true,
  sanitizeStackTraces: true,
  maxMessageLength: 10000,
  maxFieldLength: 1000,
  enablePatternMatching: true,
  strictMode: false,
  auditSanitization: false,
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Mask a string value
 */
export function maskString(
  value: string,
  maskChar: string = "*",
  preservePrefix: number = 0,
  preserveSuffix: number = 0,
): string {
  if (value.length <= preservePrefix + preserveSuffix) {
    // Always return at least one mask character (even for empty input)
    return maskChar.repeat(Math.max(1, value.length));
  }

  const prefix = value.substring(0, preservePrefix);
  const suffix = value.substring(value.length - preserveSuffix);
  const maskLength = Math.min(
    value.length - preservePrefix - preserveSuffix,
    8,
  );
  const masked = maskChar.repeat(maskLength);

  return prefix + masked + suffix;
}

/**
 * Mask an email address
 */
export function maskEmail(email: string): string {
  const parts = email.split("@");
  if (parts.length !== 2) {
    return maskString(email);
  }

  const [local, domain] = parts;
  const maskedLocal = maskString(local, "*", 2, 0);
  return `${maskedLocal}@${domain}`;
}

/**
 * Mask a phone number
 */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) {
    return maskString(phone);
  }
  return "*".repeat(digits.length - 4) + digits.slice(-4);
}

/**
 * Truncate a string
 */
export function truncateString(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return value.substring(0, maxLength) + "...[truncated]";
}

/**
 * Sanitize a stack trace
 */
export function sanitizeStackTrace(
  stack: string,
  patterns: SensitivePattern[],
): string {
  let sanitized = stack;

  // Remove file paths that might contain usernames
  sanitized = sanitized.replace(/\/Users\/[^\/]+/g, "/Users/[USER]");
  sanitized = sanitized.replace(/\/home\/[^\/]+/g, "/home/[USER]");
  sanitized = sanitized.replace(/C:\\Users\\[^\\]+/g, "C:\\Users\\[USER]");

  // Apply patterns
  for (const pattern of patterns) {
    if (pattern.enabled) {
      sanitized = sanitized.replace(
        pattern.pattern,
        pattern.replacement || REDACTED,
      );
    }
  }

  return sanitized;
}

/**
 * Check if a value looks like a secret
 */
export function looksLikeSecret(value: string): boolean {
  // High entropy strings are likely secrets
  if (value.length >= 20) {
    const charSet = new Set(value.split(""));
    const entropy = charSet.size / value.length;
    if (entropy > 0.6) {
      return true;
    }
  }

  // Check for common secret patterns
  const secretPatterns = [
    /^sk[-_]/i, // Stripe secret key
    /^pk[-_]/i, // Stripe public key
    /^ghp_/, // GitHub personal token
    /^gho_/, // GitHub OAuth token
    /^ghs_/, // GitHub server token
    /^xox[baprs]-/, // Slack tokens
    /^AKIA/, // AWS access key
  ];

  return secretPatterns.some((p) => p.test(value));
}

// ============================================================================
// LOG SANITIZER CLASS
// ============================================================================

/**
 * Log sanitizer for scrubbing sensitive data from log entries
 */
export class LogSanitizer {
  private config: LogSanitizerConfig;
  private patterns: Map<string, SensitivePattern> = new Map();
  private fieldRules: Map<string, FieldSanitizationRule> = new Map();
  private stats: SanitizationStats = {
    totalEntriesProcessed: 0,
    totalFieldsRedacted: 0,
    totalFieldsHashed: 0,
    totalFieldsMasked: 0,
    totalFieldsRemoved: 0,
    totalPatternsMatched: 0,
    byPattern: {},
    processingTimeMs: 0,
  };

  constructor(config: Partial<LogSanitizerConfig> = {}) {
    this.config = { ...DEFAULT_SANITIZER_CONFIG, ...config };
    this.initializePatterns();
    this.initializeFieldRules();
    log.info("LogSanitizer initialized", { enabled: this.config.enabled });
  }

  /**
   * Initialize default patterns
   */
  private initializePatterns(): void {
    for (const pattern of DEFAULT_SENSITIVE_PATTERNS) {
      this.patterns.set(pattern.id, pattern);
    }
  }

  /**
   * Initialize default field rules
   */
  private initializeFieldRules(): void {
    for (const rule of DEFAULT_FIELD_RULES) {
      this.fieldRules.set(rule.field.toLowerCase(), rule);
    }
  }

  /**
   * Sanitize a log entry
   */
  sanitize(entry: LogEntry): SanitizationResult {
    const startTime = Date.now();
    const result: SanitizationResult = {
      entry: { ...entry },
      fieldsRedacted: [],
      fieldsHashed: [],
      fieldsMasked: [],
      fieldsRemoved: [],
      patternsMatched: [],
      sanitizationTimeMs: 0,
    };

    if (!this.config.enabled) {
      result.sanitizationTimeMs = Date.now() - startTime;
      return result;
    }

    // Sanitize message
    if (entry.message) {
      const { sanitized, patterns } = this.sanitizeString(entry.message);
      result.entry.message = truncateString(
        sanitized,
        this.config.maxMessageLength,
      );
      result.patternsMatched.push(...patterns);
    }

    // Sanitize context
    if (entry.context) {
      result.entry.context = this.sanitizeObject(entry.context, result);
    }

    // Sanitize metadata
    if (entry.metadata) {
      result.entry.metadata = this.sanitizeObject(entry.metadata, result);
    }

    // Sanitize error
    if (entry.error) {
      if (typeof entry.error === "string") {
        const { sanitized, patterns } = this.sanitizeString(entry.error);
        result.entry.error = sanitized;
        result.patternsMatched.push(...patterns);
      } else if (entry.error instanceof Error) {
        const sanitizedMessage = this.sanitizeString(
          entry.error.message,
        ).sanitized;
        const sanitizedStack = entry.error.stack
          ? sanitizeStackTrace(
              entry.error.stack,
              Array.from(this.patterns.values()),
            )
          : undefined;
        result.entry.error = `${sanitizedMessage}${sanitizedStack ? "\n" + sanitizedStack : ""}`;
      }
    }

    // Sanitize known sensitive fields
    this.sanitizeKnownFields(result);

    // Update stats
    this.stats.totalEntriesProcessed++;
    this.stats.totalFieldsRedacted += result.fieldsRedacted.length;
    this.stats.totalFieldsHashed += result.fieldsHashed.length;
    this.stats.totalFieldsMasked += result.fieldsMasked.length;
    this.stats.totalFieldsRemoved += result.fieldsRemoved.length;
    this.stats.totalPatternsMatched += result.patternsMatched.length;

    for (const pattern of result.patternsMatched) {
      this.stats.byPattern[pattern] = (this.stats.byPattern[pattern] || 0) + 1;
    }

    result.sanitizationTimeMs = Date.now() - startTime;
    this.stats.processingTimeMs += result.sanitizationTimeMs;

    return result;
  }

  /**
   * Sanitize a string value
   */
  private sanitizeString(value: string): {
    sanitized: string;
    patterns: string[];
  } {
    let sanitized = value;
    const matchedPatterns: string[] = [];

    if (this.config.enablePatternMatching) {
      // Sort patterns by priority (higher first)
      const sortedPatterns = Array.from(this.patterns.values())
        .filter((p) => p.enabled)
        .sort((a, b) => b.priority - a.priority);

      for (const pattern of sortedPatterns) {
        if (pattern.pattern.test(sanitized)) {
          matchedPatterns.push(pattern.id);
          const replacement = this.getPatternReplacement(pattern);
          sanitized = sanitized.replace(pattern.pattern, replacement);
          // Reset lastIndex for global patterns
          pattern.pattern.lastIndex = 0;
        }
      }
    }

    return { sanitized, patterns: matchedPatterns };
  }

  /**
   * Get replacement string for a pattern
   */
  private getPatternReplacement(pattern: SensitivePattern): string {
    if (pattern.replacement) {
      return pattern.replacement;
    }

    switch (pattern.action) {
      case "redact":
        return this.config.redactedPlaceholder;
      case "hash":
        return `${HASHED_PREFIX}...]`;
      case "mask":
        return MASKED;
      default:
        return this.config.redactedPlaceholder;
    }
  }

  /**
   * Sanitize an object recursively
   */
  private sanitizeObject(
    obj: Record<string, unknown>,
    result: SanitizationResult,
    path: string = "",
    seen: Set<object> = new Set(),
  ): Record<string, unknown> {
    if (seen.has(obj)) {
      return { "[circular]": true };
    }
    seen.add(obj);
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      const fieldPath = path ? `${path}.${key}` : key;
      const rule = this.fieldRules.get(key.toLowerCase());

      if (value === null || value === undefined) {
        sanitized[key] = value;
        continue;
      }

      // Apply field rule if exists
      if (rule) {
        const sanitizedValue = this.applyFieldRule(key, value, rule, result);
        if (sanitizedValue !== undefined) {
          sanitized[key] = sanitizedValue;
        }
        continue;
      }

      // Handle nested objects
      if (
        typeof value === "object" &&
        !Array.isArray(value) &&
        !(value instanceof Date)
      ) {
        sanitized[key] = this.sanitizeObject(
          value as Record<string, unknown>,
          result,
          fieldPath,
          seen,
        );
        continue;
      }

      // Handle arrays
      if (Array.isArray(value)) {
        sanitized[key] = value.map((item, index) => {
          if (typeof item === "object" && item !== null) {
            return this.sanitizeObject(
              item as Record<string, unknown>,
              result,
              `${fieldPath}[${index}]`,
            );
          }
          if (typeof item === "string") {
            const { sanitized: s } = this.sanitizeString(item);
            return s;
          }
          return item;
        });
        continue;
      }

      // Handle string values
      if (typeof value === "string") {
        // Check if it looks like a secret
        if (looksLikeSecret(value)) {
          sanitized[key] = this.config.redactedPlaceholder;
          result.fieldsRedacted.push(fieldPath);
          continue;
        }

        const { sanitized: s, patterns } = this.sanitizeString(value);
        sanitized[key] = truncateString(s, this.config.maxFieldLength);
        result.patternsMatched.push(...patterns);
        continue;
      }

      // Keep other types as-is
      sanitized[key] = value;
    }

    return sanitized;
  }

  /**
   * Apply a field sanitization rule
   */
  private applyFieldRule(
    field: string,
    value: unknown,
    rule: FieldSanitizationRule,
    result: SanitizationResult,
  ): unknown {
    switch (rule.action) {
      case "redact":
        result.fieldsRedacted.push(field);
        return this.config.redactedPlaceholder;

      case "hash":
        if (typeof value === "string") {
          const hash = hashValueSync(value, this.config.hashSalt);
          result.fieldsHashed.push(field);
          return `${HASHED_PREFIX}${hash.substring(0, 8)}]`;
        }
        return this.config.redactedPlaceholder;

      case "mask":
        if (typeof value === "string") {
          result.fieldsMasked.push(field);
          if (field.toLowerCase().includes("email")) {
            return maskEmail(value);
          }
          if (field.toLowerCase().includes("phone")) {
            return maskPhone(value);
          }
          return maskString(
            value,
            "*",
            rule.preservePrefix ?? 2,
            rule.preserveSuffix ?? 2,
          );
        }
        return MASKED;

      case "truncate":
        if (typeof value === "string") {
          return truncateString(
            value,
            rule.maxLength ?? this.config.maxFieldLength,
          );
        }
        return value;

      case "anonymize_ip":
        if (typeof value === "string") {
          result.fieldsMasked.push(field);
          return anonymizeIP(value, this.config.ipAnonymizationStrategy);
        }
        return value;

      case "remove":
        result.fieldsRemoved.push(field);
        return undefined;

      case "retain":
      default:
        return value;
    }
  }

  /**
   * Sanitize known sensitive fields at the top level
   */
  private sanitizeKnownFields(result: SanitizationResult): void {
    const entry = result.entry;

    // IP address
    if (entry.ip && typeof entry.ip === "string") {
      entry.ip = anonymizeIP(entry.ip, this.config.ipAnonymizationStrategy);
      result.fieldsMasked.push("ip");
    }

    // User agent
    if (entry.userAgent && typeof entry.userAgent === "string") {
      entry.userAgent = truncateString(entry.userAgent, 100);
    }

    // User ID (hash for privacy in logs but keep trackable)
    // Note: We retain userId by default as it's often needed for debugging
  }

  /**
   * Sanitize a simple message string
   */
  sanitizeMessage(message: string): string {
    if (!this.config.enabled) {
      return message;
    }

    const { sanitized } = this.sanitizeString(message);
    return truncateString(sanitized, this.config.maxMessageLength);
  }

  /**
   * Sanitize multiple entries
   */
  sanitizeBatch(entries: LogEntry[]): SanitizationResult[] {
    return entries.map((entry) => this.sanitize(entry));
  }

  // ============================================================================
  // PATTERN MANAGEMENT
  // ============================================================================

  /**
   * Add a custom pattern
   */
  addPattern(pattern: SensitivePattern): void {
    this.patterns.set(pattern.id, pattern);
    log.info("Pattern added", { id: pattern.id, name: pattern.name });
  }

  /**
   * Remove a pattern
   */
  removePattern(patternId: string): boolean {
    const deleted = this.patterns.delete(patternId);
    if (deleted) {
      log.info("Pattern removed", { id: patternId });
    }
    return deleted;
  }

  /**
   * Enable/disable a pattern
   */
  setPatternEnabled(patternId: string, enabled: boolean): boolean {
    const pattern = this.patterns.get(patternId);
    if (pattern) {
      pattern.enabled = enabled;
      return true;
    }
    return false;
  }

  /**
   * Get all patterns
   */
  getPatterns(): SensitivePattern[] {
    return Array.from(this.patterns.values());
  }

  /**
   * Add a field rule
   */
  addFieldRule(rule: FieldSanitizationRule): void {
    this.fieldRules.set(rule.field.toLowerCase(), rule);
    log.info("Field rule added", { field: rule.field });
  }

  /**
   * Remove a field rule
   */
  removeFieldRule(field: string): boolean {
    return this.fieldRules.delete(field.toLowerCase());
  }

  /**
   * Get all field rules
   */
  getFieldRules(): FieldSanitizationRule[] {
    return Array.from(this.fieldRules.values());
  }

  // ============================================================================
  // STATISTICS
  // ============================================================================

  /**
   * Get sanitization statistics
   */
  getStats(): SanitizationStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalEntriesProcessed: 0,
      totalFieldsRedacted: 0,
      totalFieldsHashed: 0,
      totalFieldsMasked: 0,
      totalFieldsRemoved: 0,
      totalPatternsMatched: 0,
      byPattern: {},
      processingTimeMs: 0,
    };
  }

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  /**
   * Get configuration
   */
  getConfig(): LogSanitizerConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<LogSanitizerConfig>): void {
    this.config = { ...this.config, ...updates };
    log.info("LogSanitizer configuration updated");
  }

  /**
   * Enable/disable sanitization
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    log.info("LogSanitizer enabled state changed", { enabled });
  }

  /**
   * Check if sanitization is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let sanitizerInstance: LogSanitizer | null = null;

/**
 * Get or create the log sanitizer singleton
 */
export function getLogSanitizer(
  config?: Partial<LogSanitizerConfig>,
): LogSanitizer {
  if (!sanitizerInstance) {
    sanitizerInstance = new LogSanitizer(config);
  } else if (config) {
    sanitizerInstance.updateConfig(config);
  }
  return sanitizerInstance;
}

/**
 * Create a new log sanitizer instance
 */
export function createLogSanitizer(
  config?: Partial<LogSanitizerConfig>,
): LogSanitizer {
  return new LogSanitizer(config);
}

/**
 * Reset the singleton (for testing)
 */
export function resetLogSanitizer(): void {
  sanitizerInstance = null;
}

/**
 * Quick sanitize function for a log message
 */
export function sanitizeLogMessage(message: string): string {
  return getLogSanitizer().sanitizeMessage(message);
}

/**
 * Quick sanitize function for a log entry
 */
export function sanitizeLogEntry(entry: LogEntry): LogEntry {
  return getLogSanitizer().sanitize(entry).entry;
}

export default LogSanitizer;
