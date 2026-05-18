/**
 * Slash Commands Library
 *
 * Complete slash command system for nself-chat
 */

// Types
export * from "./command-types";

// Built-in commands
export {
  builtInCommands,
  builtInCommandsMap,
  builtInTriggerMap,
  commandCategories,
} from "./built-in-commands";

// Parser
export {
  parseCommand,
  isCommand,
  extractTrigger,
  extractArgs,
  argsToObject,
} from "./command-parser";

// Registry
export {
  initializeRegistry,
  resetRegistry,
  registerCommand,
  unregisterCommand,
  registerCustomCommands,
  clearCustomCommands,
  getCommandById,
  getCommandByTrigger,
  getAllCommands,
  getBuiltInCommands,
  getCustomCommands,
  getCommandsByCategory,
  getCategoriesWithCommands,
  searchCommands,
  getCommandSuggestions,
  canUserUseCommand,
  canUseCommandInChannel,
} from "./command-registry";

// Executor
export { executeCommand } from "./command-executor";

// Builder
export {
  CommandBuilder,
  createCommand,
  createMessageCommand,
  createWebhookCommand,
  createNavigationCommand,
} from "./command-builder";

// Validator
export {
  validateCommand,
  isValidCommand,
  getValidationErrors,
  sanitizeTrigger,
} from "./command-validator";
