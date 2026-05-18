/**
 * Import Service Module
 *
 * Comprehensive import functionality supporting multiple platforms.
 */

export {
  ConversationImporter,
  parseWhatsAppExport,
  parseTelegramExport,
  parseNchatExport,
  detectImportFormat,
  createDefaultImportOptions,
  estimateImportTime,
  type ImportPlatform,
  type ImportStatus,
  type ConflictResolution,
  type ImportOptions,
  type ImportProgress,
  type ImportError,
  type ImportWarning,
  type ImportStats,
  type ImportResult,
  type ParsedImportData,
  type ParsedUser,
  type ParsedChannel,
  type ParsedMessage,
  type ParsedAttachment,
  type ParsedReaction,
} from "./conversation-importer";
