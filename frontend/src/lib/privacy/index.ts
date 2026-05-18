/**
 * Privacy Module
 *
 * Comprehensive privacy protection utilities for the nself-chat platform.
 * Provides metadata minimization, IP anonymization, log sanitization,
 * and user privacy controls.
 *
 * @module lib/privacy
 * @version 1.0.0
 */

// Metadata Minimizer
export {
  MetadataMinimizer,
  getMetadataMinimizer,
  createMetadataMinimizer,
  resetMetadataMinimizer,
  hashValue,
  hashValueSync,
  truncateValue,
  maskValue,
  generalizeTimestamp,
  pseudonymize,
  isSensitiveField,
  SENSITIVE_FIELD_PATTERNS,
  DEFAULT_FIELD_CLASSIFICATIONS,
  DEFAULT_MINIMIZER_CONFIG,
  type MetadataCategory,
  type SensitivityLevel,
  type MetadataFieldClassification,
  type ScrubMethod,
  type ScrubOptions,
  type MetadataRetentionPolicy,
  type MinimizationResult,
  type MinimizationAuditEntry,
  type MetadataMinimzerConfig,
} from "./metadata-minimizer";

// IP Anonymizer
export {
  IPAnonymizer,
  getIPAnonymizer,
  createIPAnonymizer,
  resetIPAnonymizer,
  anonymizeIP,
  detectIPVersion,
  parseIPv4,
  parseIPv6,
  parseIPAddress,
  isPrivateIPv4,
  isLoopbackIPv4,
  isLinkLocalIPv4,
  truncateIPv4,
  truncateIPv6,
  compressIPv6,
  hashIPAddress,
  IPV4_PATTERN,
  IPV6_PATTERN,
  PRIVATE_IPV4_RANGES,
  TRUNCATION_CONFIG,
  DEFAULT_IP_ANONYMIZER_CONFIG,
  ANONYMIZED_IPV4,
  ANONYMIZED_IPV6,
  ANONYMIZED_PLACEHOLDER,
  type IPVersion,
  type AnonymizationStrategy,
  type TruncationLevel,
  type ParsedIPAddress,
  type AnonymizationResult,
  type GeoApproximation,
  type IPAnonymizerConfig,
  type BatchAnonymizationOptions,
} from "./ip-anonymizer";

// Log Sanitizer
export {
  LogSanitizer,
  getLogSanitizer,
  createLogSanitizer,
  resetLogSanitizer,
  sanitizeLogMessage,
  sanitizeLogEntry,
  maskString,
  maskEmail,
  maskPhone,
  truncateString,
  sanitizeStackTrace,
  looksLikeSecret,
  REDACTED,
  HASHED_PREFIX,
  MASKED,
  DEFAULT_SENSITIVE_PATTERNS,
  DEFAULT_FIELD_RULES,
  DEFAULT_SANITIZER_CONFIG,
  type LogSeverity,
  type SanitizationAction,
  type SensitivePattern,
  type FieldSanitizationRule,
  type LogEntry,
  type SanitizationResult,
  type LogSanitizerConfig,
  type SanitizationStats,
} from "./log-sanitizer";

// Privacy Settings
export {
  PrivacySettingsService,
  getPrivacySettingsService,
  createPrivacySettingsService,
  resetPrivacySettingsService,
  createDefaultSettings,
  PRIVACY_LEVEL_PRESETS,
  DEFAULT_DATA_COLLECTION,
  DEFAULT_METADATA_RETENTION,
  DEFAULT_PRIVACY_CONFIG,
  type PrivacyLevel,
  type DataCollectionCategory,
  type AnalyticsMode,
  type MetadataRetentionPreference,
  type DataCollectionPreference,
  type UserPrivacySettings,
  type UpdatePrivacySettingsInput,
  type PrivacyAuditEntry,
  type PrivacyAction,
  type PrivacyReport,
  type PrivacySettingsConfig,
} from "./privacy-settings";
