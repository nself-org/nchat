/**
 * Audit System - Main exports
 *
 * This module exports all audit system functionality.
 */

// Types
export * from "./audit-types";

// Events
export * from "./audit-events";

// Logger
export {
  AuditLogger,
  getAuditLogger,
  createAuditLogger,
  logAuditEvent,
  logUserEvent,
  logSecurityEvent,
  type LogEventOptions,
  type AuditLoggerConfig,
} from "./audit-logger";

// Formatter
export {
  formatTimestamp,
  formatRelativeTime,
  formatDateRange,
  formatDescription,
  formatEntrySummary,
  formatEntryForCSV,
  formatEntriesForJSON,
  getCSVHeaders,
  getSeverityBadgeClass,
  getCategoryBadgeClass,
  getCategoryIcon,
  getSeverityIcon,
  truncateText,
  formatIPAddress,
  formatFileSize,
  formatCount,
} from "./audit-formatter";

// Search
export {
  filterAuditLogs,
  sortAuditLogs,
  paginateAuditLogs,
  queryAuditLogs,
  buildSearchQueryString,
  parseSearchQueryString,
  searchParamsToFilters,
  getUniqueFieldValues,
  getEntriesByActor,
  getEntriesByResource,
  getEntriesInTimeRange,
  getFailedEntries,
  getEntriesBySeverity,
  getHighSeverityEntries,
  type SearchQueryParams,
} from "./audit-search";

// Export
export {
  exportToCSV,
  exportToJSON,
  exportAuditLogs,
  downloadFile,
  exportAndDownloadAuditLogs,
  defaultExportTemplates,
  calculateNextRunDate,
  generateExportSummary,
  type ExportTemplate,
  type ScheduledExportConfig,
  type ExportStatistics,
} from "./audit-export";

// Retention
export {
  defaultAuditSettings,
  createRetentionPolicy,
  updateRetentionPolicy,
  validateRetentionDays,
  getApplicablePolicy,
  shouldRetainEntry,
  getRetainedEntries,
  getExpiredEntries,
  archiveExpiredEntries,
  calculateRetentionStatistics,
  presetPolicies,
  getPresetPolicy,
  formatRetentionPeriod,
  getSuggestedRetentionForCompliance,
  type ArchiveResult,
  type RetentionStatistics,
} from "./audit-retention";

// Integrity (Tamper Detection)
export {
  AuditIntegrityService,
  getIntegrityService,
  createIntegrityService,
  computeHash,
  computeHMAC,
  verifyHMAC,
  generateGenesisHash,
  computeEntryHash,
  createIntegrityEntry,
  verifyEntry,
  verifyChain,
  buildMerkleTree,
  getMerkleRoot,
  generateMerkleProof,
  verifyMerkleProof,
  DEFAULT_INTEGRITY_CONFIG,
  type HashAlgorithm,
  type IntegrityAuditEntry,
  type EntryVerificationResult,
  type ChainVerificationResult,
  type ChainMetadata,
  type MerkleNode,
  type MerkleProof,
  type IntegrityConfig,
} from "./audit-integrity";
