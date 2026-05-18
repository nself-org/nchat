/**
 * Command Parser
 *
 * This module provides utilities for parsing slash command input.
 * It detects commands, extracts arguments, and validates syntax.
 *
 * @example
 * ```typescript
 * import { parseCommand, isCommandInput } from '@/lib/commands/command-parser'
 *
 * const result = parseCommand('/poll "Favorite color?" "Red" "Blue" "Green"')
 * if (result.valid) {
 *   // console.log(result.commandName) // 'poll'
 *   // console.log(result.args) // ['Favorite color?', 'Red', 'Blue', 'Green']
 * }
 * ```
 */

import { getCommandByName } from "./commands";
import type { SlashCommand, CommandArg, CommandArgType } from "./commands";

// ============================================================================
// Types
// ============================================================================

/**
 * Result of parsing a command input
 */
export interface ParsedCommand {
  /** Whether the input is a valid command */
  valid: boolean;
  /** The command name (without slash) */
  commandName: string;
  /** The full command string including slash */
  commandString: string;
  /** The matched command definition */
  command?: SlashCommand;
  /** Raw arguments string (everything after command name) */
  rawArgs: string;
  /** Parsed arguments as an array */
  args: ParsedArg[];
  /** Named arguments map */
  namedArgs: Record<string, ParsedArg>;
  /** Validation errors */
  errors: ParseError[];
  /** Whether the command is complete and ready to execute */
  isComplete: boolean;
  /** Suggestions for next input */
  suggestions: ArgSuggestion[];
}

/**
 * A parsed argument
 */
export interface ParsedArg {
  /** Argument name from command definition */
  name: string;
  /** The raw value as entered */
  rawValue: string;
  /** The parsed/normalized value */
  value: string | string[];
  /** Type of the argument */
  type: CommandArgType;
  /** Position in the arguments list */
  position: number;
  /** Whether this argument is valid */
  valid: boolean;
  /** Error message if invalid */
  error?: string;
}

/**
 * Parse error information
 */
export interface ParseError {
  /** Type of error */
  type:
    | "unknown_command"
    | "missing_required"
    | "invalid_type"
    | "invalid_format"
    | "too_many_args";
  /** Error message */
  message: string;
  /** Position in input where error occurred */
  position?: number;
  /** Related argument name */
  argName?: string;
}

/**
 * Suggestion for completing an argument
 */
export interface ArgSuggestion {
  /** Suggested value */
  value: string;
  /** Display label */
  label: string;
  /** Description */
  description?: string;
  /** Type of suggestion */
  type: "user" | "channel" | "duration" | "emoji" | "text";
}

// ============================================================================
// Constants
// ============================================================================

/** Pattern to detect if input starts with a slash command */
export const COMMAND_PREFIX = "/";

/** Pattern to match command name */
export const COMMAND_NAME_PATTERN = /^\/([a-zA-Z][a-zA-Z0-9_-]*)(?:\s|$)/;

/** Pattern to match quoted strings */
export const QUOTED_STRING_PATTERN =
  /"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'/g;

/** Pattern to match user mentions */
export const USER_MENTION_PATTERN = /@([a-zA-Z][a-zA-Z0-9_.-]*)/g;

/** Pattern to match channel references */
export const CHANNEL_PATTERN = /#([a-zA-Z][a-zA-Z0-9_-]*)/g;

/** Pattern to match duration strings */
export const DURATION_PATTERN =
  /^(\d+)\s*(s|sec|second|seconds|m|min|minute|minutes|h|hr|hour|hours|d|day|days|w|week|weeks)$/i;

/** Pattern to match emoji (colon format or common emoji characters) */
export const EMOJI_PATTERN =
  /^:([a-zA-Z0-9_+-]+):$|^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]$/u;

// ============================================================================
// Core Parsing Functions
// ============================================================================

/**
 * Check if input is a command (starts with /)
 */
export function isCommandInput(input: string): boolean {
  return input.trimStart().startsWith(COMMAND_PREFIX);
}

/**
 * Check if input is starting to type a command
 */
export function isTypingCommand(input: string): boolean {
  const trimmed = input.trimStart();
  if (!trimmed.startsWith(COMMAND_PREFIX)) return false;

  // If just "/" or "/partial", it's typing a command
  // If "/command " with space, they've entered the command
  const match = trimmed.match(/^\/([a-zA-Z]*)$/);
  return match !== null;
}

/**
 * Extract command name from input
 */
export function extractCommandName(input: string): string | null {
  const match = input.trimStart().match(COMMAND_NAME_PATTERN);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Extract the partial command being typed (for autocomplete)
 */
export function extractPartialCommand(input: string): string {
  const trimmed = input.trimStart();
  if (!trimmed.startsWith(COMMAND_PREFIX)) return "";

  const match = trimmed.match(/^\/([a-zA-Z0-9_-]*)$/);
  return match ? match[1].toLowerCase() : "";
}

/**
 * Parse a complete command input
 */
export function parseCommand(input: string): ParsedCommand {
  const result: ParsedCommand = {
    valid: false,
    commandName: "",
    commandString: "",
    rawArgs: "",
    args: [],
    namedArgs: {},
    errors: [],
    isComplete: false,
    suggestions: [],
  };

  const trimmed = input.trimStart();

  if (!trimmed.startsWith(COMMAND_PREFIX)) {
    return result;
  }

  // Extract command name
  const commandName = extractCommandName(trimmed);
  if (!commandName) {
    return result;
  }

  result.commandName = commandName;
  result.commandString = `/${commandName}`;

  // Find the command definition
  const command = getCommandByName(commandName);
  if (!command) {
    result.errors.push({
      type: "unknown_command",
      message: `Unknown command: /${commandName}`,
    });
    return result;
  }

  result.command = command;

  // Extract raw arguments (everything after command name)
  const argsStartIndex = trimmed.indexOf(commandName) + commandName.length;
  result.rawArgs = trimmed.slice(argsStartIndex + 1).trim();

  // Parse arguments based on command definition
  const parsedArgs = parseArguments(result.rawArgs, command.args);
  result.args = parsedArgs.args;
  result.errors.push(...parsedArgs.errors);

  // Build named args map
  for (const arg of result.args) {
    result.namedArgs[arg.name] = arg;
  }

  // Validate required arguments
  for (const argDef of command.args) {
    if (argDef.required && !result.namedArgs[argDef.name]?.value) {
      result.errors.push({
        type: "missing_required",
        message: `Missing required argument: ${argDef.name}`,
        argName: argDef.name,
      });
    }
  }

  result.valid = result.errors.length === 0;
  result.isComplete = result.valid && result.args.every((a) => a.valid);

  // Generate suggestions for incomplete commands
  if (!result.isComplete) {
    result.suggestions = generateSuggestions(result);
  }

  return result;
}

// ============================================================================
// Argument Parsing
// ============================================================================

/**
 * Parse arguments string according to command argument definitions
 */
function parseArguments(
  argsString: string,
  argDefs: CommandArg[],
): { args: ParsedArg[]; errors: ParseError[] } {
  const args: ParsedArg[] = [];
  const errors: ParseError[] = [];

  if (!argsString || argDefs.length === 0) {
    return { args, errors };
  }

  // Extract tokens from args string
  const tokens = tokenizeArguments(argsString);

  // Match tokens to argument definitions
  let tokenIndex = 0;
  for (let i = 0; i < argDefs.length && tokenIndex < tokens.length; i++) {
    const argDef = argDefs[i];
    const token = tokens[tokenIndex];

    // Handle options type (consumes remaining tokens)
    if (argDef.type === "options") {
      const optionValues: string[] = [];
      while (tokenIndex < tokens.length) {
        optionValues.push(tokens[tokenIndex]);
        tokenIndex++;
      }

      args.push({
        name: argDef.name,
        rawValue: optionValues.join(" "),
        value: optionValues,
        type: argDef.type,
        position: i,
        valid: optionValues.length >= 2, // Polls need at least 2 options
        error: optionValues.length < 2 ? "Need at least 2 options" : undefined,
      });
      break;
    }

    // Parse single argument
    const parsedArg = parseSingleArgument(token, argDef, i);
    args.push(parsedArg);

    if (!parsedArg.valid && parsedArg.error) {
      errors.push({
        type: "invalid_type",
        message: parsedArg.error,
        argName: argDef.name,
      });
    }

    tokenIndex++;
  }

  // Check for extra arguments
  if (tokenIndex < tokens.length && argDefs.length > 0) {
    const lastArg = argDefs[argDefs.length - 1];
    if (lastArg.type === "text") {
      // Allow text type to consume remaining tokens
      const existingArg = args.find((a) => a.name === lastArg.name);
      if (existingArg) {
        const remaining = tokens.slice(tokenIndex).join(" ");
        existingArg.rawValue += " " + remaining;
        existingArg.value = (existingArg.value as string) + " " + remaining;
      }
    }
  }

  return { args, errors };
}

/**
 * Parse a single argument token
 */
function parseSingleArgument(
  token: string,
  argDef: CommandArg,
  position: number,
): ParsedArg {
  const result: ParsedArg = {
    name: argDef.name,
    rawValue: token,
    value: token,
    type: argDef.type,
    position,
    valid: true,
  };

  switch (argDef.type) {
    case "user":
      result.value = parseUserMention(token);
      result.valid = result.value !== "";
      if (!result.valid) {
        result.error = "Invalid user mention. Use @username format.";
      }
      break;

    case "channel":
      result.value = parseChannelReference(token);
      result.valid = result.value !== "";
      if (!result.valid) {
        result.error = "Invalid channel reference. Use #channel format.";
      }
      break;

    case "duration":
      const duration = parseDuration(token);
      result.value = duration.formatted;
      result.valid = duration.valid;
      if (!result.valid) {
        result.error = 'Invalid duration. Use format like "30m", "1h", "2d".';
      }
      break;

    case "emoji":
      result.valid = EMOJI_PATTERN.test(token);
      if (!result.valid) {
        result.error = "Invalid emoji format.";
      }
      break;

    case "text":
      // Text is always valid
      result.value = unquoteString(token);
      break;

    case "none":
      result.valid = true;
      break;
  }

  return result;
}

/**
 * Tokenize arguments string, respecting quoted strings
 */
function tokenizeArguments(argsString: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let inQuote = false;
  let quoteChar = "";

  for (let i = 0; i < argsString.length; i++) {
    const char = argsString[i];

    if ((char === '"' || char === "'") && !inQuote) {
      inQuote = true;
      quoteChar = char;
      continue;
    }

    if (char === quoteChar && inQuote) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      inQuote = false;
      quoteChar = "";
      continue;
    }

    if (char === " " && !inQuote) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }

    current += char;
  }

  if (current) {
    tokens.push(current);
  }

  return tokens;
}

// ============================================================================
// Type-Specific Parsers
// ============================================================================

/**
 * Parse a user mention (@username)
 */
export function parseUserMention(input: string): string {
  // Remove @ prefix if present
  const username = input.startsWith("@") ? input.slice(1) : input;
  // Validate username format
  if (/^[a-zA-Z][a-zA-Z0-9_.-]*$/.test(username)) {
    return username;
  }
  return "";
}

/**
 * Parse a channel reference (#channel)
 */
export function parseChannelReference(input: string): string {
  // Remove # prefix if present
  const channel = input.startsWith("#") ? input.slice(1) : input;
  // Validate channel name format
  if (/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(channel)) {
    return channel;
  }
  return "";
}

/**
 * Duration parsing result
 */
export interface ParsedDuration {
  valid: boolean;
  milliseconds: number;
  formatted: string;
  original: string;
}

/**
 * Parse a duration string (e.g., "30m", "1h", "2d")
 */
export function parseDuration(input: string): ParsedDuration {
  const result: ParsedDuration = {
    valid: false,
    milliseconds: 0,
    formatted: input,
    original: input,
  };

  const match = input.match(DURATION_PATTERN);
  if (!match) {
    // Try parsing natural language
    return parseNaturalDuration(input);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  const multipliers: Record<string, number> = {
    s: 1000,
    sec: 1000,
    second: 1000,
    seconds: 1000,
    m: 60 * 1000,
    min: 60 * 1000,
    minute: 60 * 1000,
    minutes: 60 * 1000,
    h: 60 * 60 * 1000,
    hr: 60 * 60 * 1000,
    hour: 60 * 60 * 1000,
    hours: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
    days: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    weeks: 7 * 24 * 60 * 60 * 1000,
  };

  const multiplier = multipliers[unit];
  if (multiplier) {
    result.valid = true;
    result.milliseconds = value * multiplier;
    result.formatted = formatDuration(result.milliseconds);
  }

  return result;
}

/**
 * Parse natural language duration (e.g., "in 30 minutes")
 */
function parseNaturalDuration(input: string): ParsedDuration {
  const result: ParsedDuration = {
    valid: false,
    milliseconds: 0,
    formatted: input,
    original: input,
  };

  // Handle "in X minutes/hours/etc"
  const inMatch = input.match(/^in\s+(\d+)\s+(minutes?|hours?|days?|weeks?)$/i);
  if (inMatch) {
    const durationStr = `${inMatch[1]}${inMatch[2][0]}`;
    return parseDuration(durationStr);
  }

  // Handle "tomorrow"
  if (input.toLowerCase() === "tomorrow") {
    result.valid = true;
    result.milliseconds = 24 * 60 * 60 * 1000;
    result.formatted = "1 day";
    return result;
  }

  return result;
}

/**
 * Format milliseconds as human-readable duration
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);

  if (weeks > 0) return `${weeks} week${weeks > 1 ? "s" : ""}`;
  if (days > 0) return `${days} day${days > 1 ? "s" : ""}`;
  if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""}`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""}`;
  return `${seconds} second${seconds !== 1 ? "s" : ""}`;
}

/**
 * Remove quotes from a string
 */
function unquoteString(input: string): string {
  if (
    (input.startsWith('"') && input.endsWith('"')) ||
    (input.startsWith("'") && input.endsWith("'"))
  ) {
    return input.slice(1, -1);
  }
  return input;
}

// ============================================================================
// Suggestion Generation
// ============================================================================

/**
 * Generate suggestions for incomplete command
 */
function generateSuggestions(parsed: ParsedCommand): ArgSuggestion[] {
  const suggestions: ArgSuggestion[] = [];

  if (!parsed.command) return suggestions;

  // Find the first incomplete/missing argument
  const nextArgIndex = parsed.args.length;
  const nextArgDef = parsed.command.args[nextArgIndex];

  if (!nextArgDef) return suggestions;

  switch (nextArgDef.type) {
    case "duration":
      suggestions.push(
        { value: "15m", label: "15 minutes", type: "duration" },
        { value: "30m", label: "30 minutes", type: "duration" },
        { value: "1h", label: "1 hour", type: "duration" },
        { value: "2h", label: "2 hours", type: "duration" },
        { value: "1d", label: "1 day", type: "duration" },
      );
      break;

    case "emoji":
      suggestions.push(
        { value: ":coffee:", label: "Coffee", type: "emoji" },
        { value: ":palm_tree:", label: "Vacation", type: "emoji" },
        { value: ":house:", label: "Working from home", type: "emoji" },
        { value: ":calendar:", label: "In a meeting", type: "emoji" },
      );
      break;

    default:
      if (nextArgDef.placeholder) {
        suggestions.push({
          value: "",
          label: nextArgDef.placeholder,
          description: nextArgDef.description,
          type: "text",
        });
      }
  }

  return suggestions;
}

// ============================================================================
// Validation Utilities
// ============================================================================

/**
 * Validate a command can be executed in the current context
 */
export interface ValidationContext {
  channelId?: string;
  userRole?: "owner" | "admin" | "moderator" | "member" | "guest";
  enabledFeatures?: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateCommandContext(
  command: SlashCommand,
  context: ValidationContext,
): ValidationResult {
  const errors: string[] = [];

  // Check channel requirement
  if (command.requiresChannel && !context.channelId) {
    errors.push("This command requires a channel context.");
  }

  // Check permission requirement
  if (command.requiresPermission) {
    const roleHierarchy = ["guest", "member", "moderator", "admin", "owner"];
    const requiredLevel = roleHierarchy.indexOf(command.requiresPermission);
    const userLevel = roleHierarchy.indexOf(context.userRole || "guest");

    if (userLevel < requiredLevel) {
      errors.push(
        `This command requires ${command.requiresPermission} permissions.`,
      );
    }
  }

  // Check feature requirement
  if (command.requiredFeature && context.enabledFeatures) {
    if (!context.enabledFeatures.includes(command.requiredFeature)) {
      errors.push("This command requires a feature that is not enabled.");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
