/**
 * useConversationImport Hook
 *
 * Client-side hook for managing conversation import operations.
 * Supports multiple platforms (WhatsApp, Telegram, Slack, Discord)
 * with progress tracking and conflict resolution.
 */

import { useState, useCallback, useRef } from "react";
import {
  ConversationImporter,
  detectImportFormat,
  parseWhatsAppExport,
  parseTelegramExport,
  parseNchatExport,
  estimateImportTime,
  createDefaultImportOptions,
  type ImportPlatform,
  type ImportOptions,
  type ImportProgress,
  type ImportStats,
  type ImportResult,
  type ParsedImportData,
} from "@/services/import";

// ============================================================================
// TYPES
// ============================================================================

export interface UseConversationImportOptions {
  onProgress?: (progress: ImportProgress) => void;
  onComplete?: (result: ImportResult) => void;
  onError?: (error: Error) => void;
}

export interface UseConversationImportReturn {
  // State
  isImporting: boolean;
  isParsing: boolean;
  progress: ImportProgress | null;
  stats: ImportStats | null;
  error: Error | null;
  parsedData: ParsedImportData | null;
  detectedPlatform: ImportPlatform | null;

  // Actions
  parseFile: (file: File) => Promise<ParsedImportData>;
  parseContent: (content: string) => ParsedImportData;
  startImport: (options: Partial<ImportOptions>) => Promise<ImportResult>;
  cancelImport: () => void;
  reset: () => void;

  // Utilities
  detectPlatform: (content: string) => ImportPlatform;
  estimateTime: () => number;
  getSupportedPlatforms: () => typeof SUPPORTED_PLATFORMS;
  validateData: (data: ParsedImportData) => {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SUPPORTED_PLATFORMS: Array<{
  value: ImportPlatform;
  label: string;
  description: string;
  fileTypes: string[];
  instructions: string;
}> = [
  {
    value: "nchat",
    label: "nchat Export",
    description: "Re-import a previous nchat export",
    fileTypes: [".json"],
    instructions: "Upload a JSON file from a previous nchat export.",
  },
  {
    value: "whatsapp",
    label: "WhatsApp",
    description: "Import from WhatsApp chat export",
    fileTypes: [".txt", ".zip"],
    instructions:
      "In WhatsApp, open a chat, tap More > Export chat. Upload the resulting .txt file.",
  },
  {
    value: "telegram",
    label: "Telegram",
    description: "Import from Telegram Desktop export",
    fileTypes: [".json", ".html"],
    instructions:
      "In Telegram Desktop, go to Settings > Advanced > Export Data. Choose JSON format.",
  },
  {
    value: "slack",
    label: "Slack",
    description: "Import from Slack workspace export",
    fileTypes: [".zip", ".json"],
    instructions:
      "From Slack admin, export your workspace data. Upload the ZIP file.",
  },
  {
    value: "discord",
    label: "Discord",
    description: "Import from Discord export",
    fileTypes: [".json"],
    instructions:
      "Use a Discord export tool like DiscordChatExporter. Upload the JSON file.",
  },
];

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useConversationImport(
  options: UseConversationImportOptions = {},
): UseConversationImportReturn {
  const { onProgress, onComplete, onError } = options;

  // State
  const [isImporting, setIsImporting] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [stats, setStats] = useState<ImportStats | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [parsedData, setParsedData] = useState<ParsedImportData | null>(null);
  const [detectedPlatform, setDetectedPlatform] =
    useState<ImportPlatform | null>(null);

  // Refs
  const importerRef = useRef<ConversationImporter | null>(null);

  /**
   * Parse a file and detect its format
   */
  const parseFile = useCallback(
    async (file: File): Promise<ParsedImportData> => {
      setIsParsing(true);
      setError(null);

      try {
        const content = await file.text();
        const data = parseContent(content);

        setParsedData(data);
        setDetectedPlatform(data.platform);

        return data;
      } catch (err) {
        const parseError =
          err instanceof Error ? err : new Error("Failed to parse file");
        setError(parseError);
        throw parseError;
      } finally {
        setIsParsing(false);
      }
    },
    [],
  );

  /**
   * Parse content string directly
   */
  const parseContent = useCallback((content: string): ParsedImportData => {
    const platform = detectImportFormat(content);
    setDetectedPlatform(platform);

    let data: ParsedImportData;

    switch (platform) {
      case "whatsapp":
        data = parseWhatsAppExport(content);
        break;
      case "telegram":
        data = parseTelegramExport(content);
        break;
      case "nchat":
        data = parseNchatExport(content);
        break;
      case "slack":
        // Use existing Slack parser
        throw new Error("Use the dedicated Slack importer for Slack exports");
      case "discord":
        // Use existing Discord parser
        throw new Error(
          "Use the dedicated Discord importer for Discord exports",
        );
      default:
        throw new Error(`Unsupported import format: ${platform}`);
    }

    setParsedData(data);
    return data;
  }, []);

  /**
   * Start the import process
   */
  const startImport = useCallback(
    async (importOptions: Partial<ImportOptions>): Promise<ImportResult> => {
      if (!parsedData) {
        throw new Error("No data to import. Parse a file first.");
      }

      setIsImporting(true);
      setError(null);

      const fullOptions = createDefaultImportOptions(
        detectedPlatform || "generic",
        importOptions,
      );

      // Create importer with progress callback
      const importer = new ConversationImporter((progressUpdate) => {
        setProgress(progressUpdate);
        onProgress?.(progressUpdate);
      });
      importerRef.current = importer;

      try {
        // Call the import API
        const response = await fetch("/api/conversations/import", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            platform: detectedPlatform,
            data: parsedData,
            options: fullOptions,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message || `Import failed: ${response.statusText}`,
          );
        }

        const result: ImportResult = await response.json();

        setStats(result.stats);
        setProgress({
          status: result.success ? "completed" : "failed",
          phase: result.success ? "Complete" : "Failed",
          progress: 100,
          itemsProcessed: result.stats.messagesImported,
          totalItems:
            result.stats.messagesImported +
            result.stats.messagesSkipped +
            result.stats.messagesFailed,
          errors: result.errors,
          warnings: result.warnings,
        });

        onComplete?.(result);
        return result;
      } catch (err) {
        const importError =
          err instanceof Error ? err : new Error("Import failed");
        setError(importError);
        setProgress({
          status: "failed",
          phase: "Failed",
          progress: 0,
          itemsProcessed: 0,
          totalItems: 0,
          errors: [
            {
              code: "IMPORT_FAILED",
              message: importError.message,
              recoverable: false,
            },
          ],
          warnings: [],
        });
        onError?.(importError);
        throw importError;
      } finally {
        setIsImporting(false);
        importerRef.current = null;
      }
    },
    [parsedData, detectedPlatform, onProgress, onComplete, onError],
  );

  /**
   * Cancel the import
   */
  const cancelImport = useCallback(() => {
    if (importerRef.current) {
      importerRef.current.cancel();
    }
    setIsImporting(false);
    setProgress(null);
  }, []);

  /**
   * Reset all state
   */
  const reset = useCallback(() => {
    setIsImporting(false);
    setIsParsing(false);
    setProgress(null);
    setStats(null);
    setError(null);
    setParsedData(null);
    setDetectedPlatform(null);
    importerRef.current = null;
  }, []);

  /**
   * Detect platform from content
   */
  const detectPlatform = useCallback((content: string): ImportPlatform => {
    return detectImportFormat(content);
  }, []);

  /**
   * Estimate import time based on parsed data
   */
  const estimateTime = useCallback((): number => {
    if (!parsedData) return 0;
    return Math.ceil(estimateImportTime(parsedData) / 1000);
  }, [parsedData]);

  /**
   * Get list of supported platforms
   */
  const getSupportedPlatforms = useCallback(() => SUPPORTED_PLATFORMS, []);

  /**
   * Validate parsed data before import
   */
  const validateData = useCallback(
    (
      data: ParsedImportData,
    ): { valid: boolean; errors: string[]; warnings: string[] } => {
      const errors: string[] = [];
      const warnings: string[] = [];

      if (!data.messages.length) {
        errors.push("No messages found in import data");
      }

      // Check for missing required fields
      let invalidMessages = 0;
      for (const msg of data.messages) {
        if (!msg.externalId || !msg.content || !msg.createdAt) {
          invalidMessages++;
        }
      }

      if (invalidMessages > 0) {
        warnings.push(
          `${invalidMessages} messages have missing required fields and will be skipped`,
        );
      }

      // Check for orphaned messages
      const channelIds = new Set(data.channels.map((c) => c.externalId));
      const orphanedMessages = data.messages.filter(
        (m) => !channelIds.has(m.channelId),
      ).length;

      if (orphanedMessages > 0 && data.channels.length > 0) {
        warnings.push(
          `${orphanedMessages} messages reference channels not in the export`,
        );
      }

      // Check for missing users
      const userIds = new Set(data.users.map((u) => u.externalId));
      const messagesWithoutUser = data.messages.filter(
        (m) => !userIds.has(m.userId),
      ).length;

      if (messagesWithoutUser > 0) {
        warnings.push(`${messagesWithoutUser} messages are from unknown users`);
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
      };
    },
    [],
  );

  return {
    // State
    isImporting,
    isParsing,
    progress,
    stats,
    error,
    parsedData,
    detectedPlatform,

    // Actions
    parseFile,
    parseContent,
    startImport,
    cancelImport,
    reset,

    // Utilities
    detectPlatform,
    estimateTime,
    getSupportedPlatforms,
    validateData,
  };
}

export default useConversationImport;
