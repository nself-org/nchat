/**
 * Plugin Slash Command Engine - Public API
 *
 * Complete slash command system for the nChat plugin/app framework.
 * Provides command registration, parsing, permission gating,
 * argument validation, sandboxed execution, and discovery.
 */

// Types
export type {
  UserRole,
  PluginArgType,
  PluginArgValue,
  PluginArgSchema,
  ChannelType,
  PluginCommand,
  CommandExecutionContext,
  ResponseVisibility,
  CommandHandlerResult,
  CommandHandler,
  ParseResult,
  ParseError,
  PermissionCheckResult,
  PluginCommandSuggestion,
  ExecutionResult,
} from "./types";

export { ROLE_HIERARCHY, meetsRoleRequirement } from "./types";

// Registry
export { CommandRegistry, CommandRegistryError } from "./command-registry";

// Parser
export {
  tokenize,
  extractCommandInfo,
  parseArgs,
  parseAndValidateArg,
  parseInput,
} from "./command-parser";

// Executor
export {
  CommandExecutor,
  CommandRateLimiter,
  type ExecutorConfig,
} from "./command-executor";

// Built-in commands
export {
  registerBuiltInCommands,
  getBuiltInDefinitions,
  getBuiltInCommandNames,
} from "./built-in-commands";

// ============================================================================
// CONVENIENCE: Create a fully-initialized engine
// ============================================================================

import { CommandRegistry } from "./command-registry";
import { CommandExecutor, type ExecutorConfig } from "./command-executor";
import { registerBuiltInCommands } from "./built-in-commands";

/**
 * Create a fully-initialized slash command engine with built-in commands registered.
 */
export function createSlashCommandEngine(config?: Partial<ExecutorConfig>): {
  registry: CommandRegistry;
  executor: CommandExecutor;
} {
  const registry = new CommandRegistry();
  registerBuiltInCommands(registry);
  const executor = new CommandExecutor(registry, config);
  return { registry, executor };
}
