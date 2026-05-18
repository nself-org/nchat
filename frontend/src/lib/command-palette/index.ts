/**
 * Command Palette Library
 *
 * Central export point for all command palette utilities
 */

// Types
export * from "./command-types";

// Registry
export {
  CommandRegistry,
  getCommandRegistry,
  resetCommandRegistry,
} from "./command-registry";

// Search
export {
  searchCommands,
  filterByCategory,
  filterByCategories,
  filterByStatus,
  filterAvailable,
  sortByName,
  sortByPriority,
  sortByRecent,
  sortCommands,
  getHighlightedSegments,
  detectQueryMode,
  getSearchPlaceholder,
} from "./command-search";

// Executor
export {
  CommandExecutor,
  getCommandExecutor,
  resetCommandExecutor,
  executeCommand,
  createContextualExecutor,
  type ExecutionResult,
  type ExecutorOptions,
} from "./command-executor";

// History
export {
  CommandHistory,
  getCommandHistory,
  resetCommandHistory,
  type CommandHistoryOptions,
} from "./command-history";
