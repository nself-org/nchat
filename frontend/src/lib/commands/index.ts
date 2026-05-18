/**
 * Commands Module Index
 *
 * Re-exports all command-related functionality for easy importing.
 *
 * @example
 * ```typescript
 * import {
 *   COMMANDS,
 *   parseCommand,
 *   executeCommand,
 *   useCommands,
 *   useCommandStore,
 * } from '@/lib/commands'
 * ```
 */

// ============================================================================
// Commands
// ============================================================================

export {
  COMMANDS,
  COMMAND_CATEGORIES,
  getCommandByName,
  getCommandsByCategory,
  getVisibleCommands,
  searchCommands,
  getCommandCategoriesInOrder,
  type SlashCommand,
  type CommandArg,
  type CommandCategory,
  type CommandArgType,
} from "./commands";

// ============================================================================
// Parser
// ============================================================================

export {
  COMMAND_PREFIX,
  COMMAND_NAME_PATTERN,
  QUOTED_STRING_PATTERN,
  USER_MENTION_PATTERN,
  CHANNEL_PATTERN,
  DURATION_PATTERN,
  EMOJI_PATTERN,
  isCommandInput,
  isTypingCommand,
  extractCommandName,
  extractPartialCommand,
  parseCommand,
  parseUserMention,
  parseChannelReference,
  parseDuration,
  formatDuration,
  validateCommandContext,
  type ParsedCommand,
  type ParsedArg,
  type ParseError,
  type ArgSuggestion,
  type ParsedDuration,
  type ValidationContext,
  type ValidationResult,
} from "./command-parser";

// ============================================================================
// Executor
// ============================================================================

export {
  executeCommand,
  registerCommandHandler,
  unregisterCommandHandler,
  hasCommandHandler,
  type CommandContext,
  type CommandResult,
  type CommandResultType,
  type CommandResultData,
  type CommandEffect,
  type CommandEffectType,
  type CommandHandler,
} from "./command-executor";

// ============================================================================
// Store
// ============================================================================

export {
  useCommandStore,
  selectMenuState,
  selectIsMenuOpen,
  selectMenuFilter,
  selectSelectedIndex,
  selectPreviewState,
  selectIsPreviewVisible,
  selectHistory,
  selectFavorites,
  selectCustomCommands,
  selectEnabledCustomCommands,
  selectIsExecuting,
  selectLastError,
  selectRecentCommandNames,
  selectCommandUsageCount,
  type CustomCommand,
  type CommandHistoryEntry,
  type PendingEffect,
  type CommandMenuState,
  type CommandPreviewState,
  type CommandState,
  type CommandActions,
  type CommandStore,
} from "./command-store";

// ============================================================================
// Hooks
// ============================================================================

export {
  useCommands,
  useCommand,
  useCommandCategory,
  useCommandSearch,
  type UseCommandsOptions,
  type UseCommandsResult,
} from "./use-commands";
