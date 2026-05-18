/**
 * Plugin Slash Command Types
 *
 * Type definitions for the plugin-level slash command engine.
 * This bridges the app/plugin system (app-contract.ts) with
 * the user-facing slash command infrastructure.
 */

import type { AppScope } from "../app-contract";

// ============================================================================
// USER ROLES
// ============================================================================

/**
 * User roles with hierarchical ordering.
 */
export type UserRole = "owner" | "admin" | "moderator" | "member" | "guest";

/**
 * Numeric hierarchy for role comparison. Higher = more privileged.
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  guest: 0,
  member: 1,
  moderator: 2,
  admin: 3,
  owner: 4,
};

/**
 * Check whether a role meets a minimum role requirement.
 */
export function meetsRoleRequirement(
  userRole: UserRole,
  minRole: UserRole,
): boolean {
  return (ROLE_HIERARCHY[userRole] ?? 0) >= (ROLE_HIERARCHY[minRole] ?? 0);
}

// ============================================================================
// ARGUMENT TYPES
// ============================================================================

/**
 * Supported argument types for plugin commands.
 */
export type PluginArgType =
  | "string"
  | "number"
  | "boolean"
  | "user"
  | "channel";

/**
 * Runtime argument value (parsed from user input).
 */
export type PluginArgValue = string | number | boolean | undefined;

/**
 * Schema definition for a single command argument.
 */
export interface PluginArgSchema {
  /** Argument name (used as key in parsed output) */
  name: string;
  /** Display description */
  description: string;
  /** Argument type */
  type: PluginArgType;
  /** Whether this argument is required */
  required: boolean;
  /** Default value when not provided */
  default?: PluginArgValue;
  /** Minimum value for numbers */
  min?: number;
  /** Maximum value for numbers */
  max?: number;
  /** Minimum length for strings */
  minLength?: number;
  /** Maximum length for strings */
  maxLength?: number;
  /** Regex pattern for strings */
  pattern?: string;
  /** Allowed values (enum-style) */
  choices?: string[];
}

// ============================================================================
// COMMAND DEFINITION
// ============================================================================

/**
 * Channel types where a command may be used.
 */
export type ChannelType = "public" | "private" | "direct" | "group";

/**
 * Full plugin command definition.
 */
export interface PluginCommand {
  /** Unique command ID (auto-generated) */
  id: string;
  /** App ID that owns this command (empty for built-in) */
  appId: string;
  /** Command name (what the user types after /) */
  name: string;
  /** Fully-qualified name (appId:name for app commands, plain name for built-in) */
  qualifiedName: string;
  /** Short description shown in autocomplete */
  description: string;
  /** Detailed help text */
  helpText?: string;
  /** Usage example */
  usage?: string;
  /** Argument schema */
  args: PluginArgSchema[];
  /** Required user role */
  requiredRole: UserRole;
  /** Required app scopes (only for app commands) */
  requiredScopes: AppScope[];
  /** Allowed channel types */
  allowedChannelTypes: ChannelType[];
  /** Whether command is a built-in system command */
  isBuiltIn: boolean;
  /** Whether command is enabled */
  enabled: boolean;
  /** Command handler function */
  handler: CommandHandler;
}

// ============================================================================
// EXECUTION CONTEXT
// ============================================================================

/**
 * Context provided to command handlers during execution.
 * For app commands, this is restricted to granted scopes.
 */
export interface CommandExecutionContext {
  /** User who invoked the command */
  userId: string;
  /** User's display name */
  username: string;
  /** User's role */
  userRole: UserRole;
  /** Channel where command was invoked */
  channelId: string;
  /** Channel type */
  channelType: ChannelType;
  /** App ID (for app commands) */
  appId?: string;
  /** Granted scopes (for app commands) */
  grantedScopes: AppScope[];
  /** Parsed arguments keyed by name */
  args: Record<string, PluginArgValue>;
  /** Raw input text */
  rawInput: string;
  /** Execution timestamp */
  timestamp: Date;
}

// ============================================================================
// COMMAND RESULT
// ============================================================================

/**
 * Visibility modes for command responses.
 */
export type ResponseVisibility = "ephemeral" | "channel" | "none";

/**
 * Result returned by command handlers.
 */
export interface CommandHandlerResult {
  /** Whether execution succeeded */
  success: boolean;
  /** Response message */
  message?: string;
  /** Response visibility */
  visibility?: ResponseVisibility;
  /** Arbitrary data payload */
  data?: Record<string, unknown>;
  /** Error message (when success = false) */
  error?: string;
}

/**
 * Command handler function signature.
 */
export type CommandHandler = (
  ctx: CommandExecutionContext,
) => Promise<CommandHandlerResult>;

// ============================================================================
// PARSE RESULT
// ============================================================================

/**
 * Result of parsing user input.
 */
export interface ParseResult {
  /** Whether parsing succeeded */
  success: boolean;
  /** Qualified command name (or raw trigger if not found) */
  commandName: string;
  /** Whether the command uses a namespace prefix (e.g., myapp:cmd) */
  isNamespaced: boolean;
  /** App namespace (empty string for built-in) */
  namespace: string;
  /** Bare command name without namespace */
  bareName: string;
  /** Parsed argument values keyed by name */
  args: Record<string, PluginArgValue>;
  /** Raw argument tokens */
  rawArgs: string[];
  /** Raw input after the command trigger */
  rawInput: string;
  /** Parse errors */
  errors: ParseError[];
}

/**
 * A single parse error.
 */
export interface ParseError {
  /** Error type */
  type:
    | "missing_required"
    | "invalid_type"
    | "validation_failed"
    | "unknown_argument"
    | "parse_error";
  /** Argument name that caused the error */
  argument?: string;
  /** Human-readable message */
  message: string;
}

// ============================================================================
// PERMISSION CHECK RESULT
// ============================================================================

/**
 * Result of a permission check.
 */
export interface PermissionCheckResult {
  /** Whether the user is allowed */
  allowed: boolean;
  /** Denial reason (when allowed = false) */
  reason?: string;
  /** Error code */
  code?:
    | "ROLE_INSUFFICIENT"
    | "SCOPE_INSUFFICIENT"
    | "CHANNEL_DENIED"
    | "COMMAND_DISABLED"
    | "RATE_LIMITED";
}

// ============================================================================
// COMMAND SUGGESTION
// ============================================================================

/**
 * A command suggestion for autocomplete.
 */
export interface PluginCommandSuggestion {
  /** The command */
  command: PluginCommand;
  /** Match score (higher = better) */
  score: number;
  /** Human-readable label (e.g., "/myapp:deploy") */
  label: string;
}

// ============================================================================
// EXECUTION RESULT (outer wrapper)
// ============================================================================

/**
 * Full result of attempting to execute a command, including
 * permission checks, parsing, rate limiting, and execution.
 */
export interface ExecutionResult {
  /** Whether the whole pipeline succeeded */
  success: boolean;
  /** The handler's result (if execution was reached) */
  handlerResult?: CommandHandlerResult;
  /** Error message (if failed before or during execution) */
  error?: string;
  /** Error code */
  code?: string;
  /** How long execution took in ms */
  durationMs: number;
}
