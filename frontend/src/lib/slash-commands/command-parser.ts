/**
 * Command Parser
 *
 * Parses user input into structured command data
 */

import type {
  SlashCommand,
  CommandArgument,
  ParsedCommand,
  ParsedArgument,
  ParseError,
  CommandArgValue,
} from "./command-types";

// ============================================================================
// Main Parser
// ============================================================================

/**
 * Parse user input into a command structure
 */
export function parseCommand(
  input: string,
  command: SlashCommand,
): ParsedCommand {
  const errors: ParseError[] = [];
  const parsedArgs: ParsedArgument[] = [];
  const parsedFlags: Record<string, ParsedArgument> = {};

  // Remove leading slash and command trigger
  const rawInput = input.trim();
  const triggerMatch = rawInput.match(/^\/(\S+)/);
  if (!triggerMatch) {
    return {
      command,
      args: [],
      flags: {},
      remainder: rawInput,
      errors: [{ type: "missing_required", message: "Invalid command format" }],
      isValid: false,
    };
  }

  // Get the argument portion
  const argsString = rawInput.slice(triggerMatch[0].length).trim();

  // Tokenize the input
  const tokens = tokenize(argsString);

  // Separate positional args from flags
  const positionalTokens: string[] = [];
  const flagTokens: Record<string, string> = {};
  let collectingFlag: string | null = null;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    // Check for long flag (--flag)
    if (token.startsWith("--")) {
      const flagName = token.slice(2);
      const eqIndex = flagName.indexOf("=");
      if (eqIndex !== -1) {
        // --flag=value format
        flagTokens[flagName.slice(0, eqIndex)] = flagName.slice(eqIndex + 1);
      } else {
        collectingFlag = flagName;
      }
      continue;
    }

    // Check for short flag (-f)
    if (token.startsWith("-") && token.length === 2) {
      const shortFlag = token.slice(1);
      // Find the argument with this short flag
      const arg = command.arguments.find((a) => a.shortFlag === shortFlag);
      if (arg && arg.flag) {
        collectingFlag = arg.flag;
      } else {
        errors.push({
          type: "unknown_flag",
          argument: shortFlag,
          message: `Unknown flag: -${shortFlag}`,
        });
      }
      continue;
    }

    // Collect flag value or positional arg
    if (collectingFlag) {
      flagTokens[collectingFlag] = token;
      collectingFlag = null;
    } else {
      positionalTokens.push(token);
    }
  }

  // Parse positional arguments
  const positionalArgs = command.arguments
    .filter((arg) => arg.position !== undefined)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  for (let i = 0; i < positionalArgs.length; i++) {
    const argDef = positionalArgs[i];

    // Handle 'rest' type - captures all remaining tokens
    if (argDef.type === "rest") {
      const restValue = positionalTokens.slice(i).join(" ");
      const parsed = parseArgumentValue(restValue || "", argDef);
      parsedArgs.push(parsed);
      if (!parsed.isValid && argDef.required) {
        errors.push({
          type: parsed.error?.includes("required")
            ? "missing_required"
            : "validation_failed",
          argument: argDef.name,
          message: parsed.error || `Invalid value for ${argDef.name}`,
        });
      }
      break; // Rest consumes everything
    }

    const token = positionalTokens[i];
    if (token === undefined) {
      if (argDef.required) {
        errors.push({
          type: "missing_required",
          argument: argDef.name,
          message: `Missing required argument: ${argDef.name}`,
        });
        parsedArgs.push({
          definition: argDef,
          rawValue: "",
          value: argDef.defaultValue,
          isValid: false,
          error: "Missing required argument",
        });
      } else {
        parsedArgs.push({
          definition: argDef,
          rawValue: "",
          value: argDef.defaultValue,
          isValid: true,
        });
      }
    } else {
      const parsed = parseArgumentValue(token, argDef);
      parsedArgs.push(parsed);
      if (!parsed.isValid && argDef.required) {
        errors.push({
          type: "validation_failed",
          argument: argDef.name,
          message: parsed.error || `Invalid value for ${argDef.name}`,
        });
      }
    }
  }

  // Parse flag arguments
  const flagArgs = command.arguments.filter((arg) => arg.flag);
  for (const argDef of flagArgs) {
    const flagValue = flagTokens[argDef.flag!];
    if (flagValue !== undefined) {
      const parsed = parseArgumentValue(flagValue, argDef);
      parsedFlags[argDef.flag!] = parsed;
      if (!parsed.isValid) {
        errors.push({
          type: "validation_failed",
          argument: argDef.name,
          message: parsed.error || `Invalid value for ${argDef.name}`,
        });
      }
    } else if (argDef.required) {
      errors.push({
        type: "missing_required",
        argument: argDef.name,
        message: `Missing required flag: --${argDef.flag}`,
      });
    }
  }

  // Calculate remainder (unused tokens)
  const usedPositionalCount = Math.min(
    positionalTokens.length,
    positionalArgs.filter((a) => a.type !== "rest").length,
  );
  const remainder = positionalArgs.some((a) => a.type === "rest")
    ? ""
    : positionalTokens.slice(usedPositionalCount).join(" ");

  return {
    command,
    args: parsedArgs,
    flags: parsedFlags,
    remainder,
    errors,
    isValid: errors.length === 0,
  };
}

// ============================================================================
// Tokenization
// ============================================================================

/**
 * Tokenize input string, respecting quotes
 */
function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let inQuotes = false;
  let quoteChar = "";

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    // Handle quotes
    if ((char === '"' || char === "'") && !inQuotes) {
      inQuotes = true;
      quoteChar = char;
      continue;
    }

    if (char === quoteChar && inQuotes) {
      inQuotes = false;
      quoteChar = "";
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }

    // Handle spaces
    if (char === " " && !inQuotes) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }

    current += char;
  }

  // Add final token
  if (current) {
    tokens.push(current);
  }

  return tokens;
}

// ============================================================================
// Argument Parsing
// ============================================================================

/**
 * Parse and validate a single argument value
 */
function parseArgumentValue(
  rawValue: string,
  argDef: CommandArgument,
): ParsedArgument {
  let value: CommandArgValue = rawValue;
  let isValid = true;
  let error: string | undefined;

  // Handle empty values
  if (!rawValue && rawValue !== "0") {
    if (argDef.required) {
      return {
        definition: argDef,
        rawValue,
        value: argDef.defaultValue,
        isValid: false,
        error: `${argDef.name} is required`,
      };
    }
    return {
      definition: argDef,
      rawValue,
      value: argDef.defaultValue,
      isValid: true,
    };
  }

  // Parse based on type
  switch (argDef.type) {
    case "string":
    case "rest":
      value = rawValue;
      break;

    case "number":
      const num = parseFloat(rawValue);
      if (isNaN(num)) {
        isValid = false;
        error = `${argDef.name} must be a number`;
      } else {
        value = num;
        // Validate min/max
        if (
          argDef.validation?.min !== undefined &&
          num < argDef.validation.min
        ) {
          isValid = false;
          error = `${argDef.name} must be at least ${argDef.validation.min}`;
        }
        if (
          argDef.validation?.max !== undefined &&
          num > argDef.validation.max
        ) {
          isValid = false;
          error = `${argDef.name} must be at most ${argDef.validation.max}`;
        }
      }
      break;

    case "boolean":
      const lower = rawValue.toLowerCase();
      if (["true", "yes", "1", "on"].includes(lower)) {
        value = true;
      } else if (["false", "no", "0", "off"].includes(lower)) {
        value = false;
      } else {
        isValid = false;
        error = `${argDef.name} must be true or false`;
      }
      break;

    case "user":
      // Extract user ID from @mention format
      const userMatch = rawValue.match(/^@?(\S+)$/);
      if (userMatch) {
        value = userMatch[1];
      } else {
        isValid = false;
        error = `Invalid user mention: ${rawValue}`;
      }
      break;

    case "channel":
      // Extract channel from #channel format
      const channelMatch = rawValue.match(/^#?(\S+)$/);
      if (channelMatch) {
        value = channelMatch[1];
      } else {
        isValid = false;
        error = `Invalid channel: ${rawValue}`;
      }
      break;

    case "date":
      value = parseDate(rawValue);
      if (!value) {
        isValid = false;
        error = `Invalid date: ${rawValue}`;
      }
      break;

    case "time":
      value = parseTime(rawValue);
      if (!value) {
        isValid = false;
        error = `Invalid time: ${rawValue}`;
      }
      break;

    case "datetime":
      value = parseDateTime(rawValue);
      if (!value) {
        isValid = false;
        error = `Invalid date/time: ${rawValue}`;
      }
      break;

    case "duration":
      value = parseDuration(rawValue);
      if (!value && rawValue !== "0") {
        isValid = false;
        error = `Invalid duration: ${rawValue}. Use format like 1h, 30m, 2d`;
      }
      break;

    case "choice":
      const validChoice = argDef.choices?.some((c) => c.value === rawValue);
      if (!validChoice) {
        isValid = false;
        error = `Invalid choice: ${rawValue}. Valid options: ${argDef.choices?.map((c) => c.value).join(", ")}`;
      }
      break;
  }

  // Additional validation
  if (isValid && argDef.validation) {
    const validationResult = validateValue(value as string, argDef.validation);
    if (!validationResult.isValid) {
      isValid = false;
      error = validationResult.error;
    }
  }

  return {
    definition: argDef,
    rawValue,
    value,
    isValid,
    error,
  };
}

// ============================================================================
// Date/Time Parsing
// ============================================================================

/**
 * Parse a date string (supports various formats)
 */
function parseDate(input: string): string | undefined {
  // Try ISO format
  const date = new Date(input);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split("T")[0];
  }

  // Try relative formats
  const lower = input.toLowerCase();
  const now = new Date();

  if (lower === "today") {
    return now.toISOString().split("T")[0];
  }
  if (lower === "tomorrow") {
    now.setDate(now.getDate() + 1);
    return now.toISOString().split("T")[0];
  }
  if (lower === "yesterday") {
    now.setDate(now.getDate() - 1);
    return now.toISOString().split("T")[0];
  }

  // Try "in X days" format
  const inDaysMatch = input.match(/^in\s+(\d+)\s*d(ays?)?$/i);
  if (inDaysMatch) {
    now.setDate(now.getDate() + parseInt(inDaysMatch[1]));
    return now.toISOString().split("T")[0];
  }

  return undefined;
}

/**
 * Parse a time string
 */
function parseTime(input: string): string | undefined {
  // Try HH:MM format
  const timeMatch = input.match(
    /^(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(am|pm))?$/i,
  );
  if (timeMatch) {
    let hours = parseInt(timeMatch[1]);
    const minutes = parseInt(timeMatch[2]);
    const seconds = timeMatch[3] ? parseInt(timeMatch[3]) : 0;
    const ampm = timeMatch[4]?.toLowerCase();

    if (ampm === "pm" && hours < 12) hours += 12;
    if (ampm === "am" && hours === 12) hours = 0;

    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }

  return undefined;
}

/**
 * Parse a datetime string
 */
function parseDateTime(input: string): string | undefined {
  // Try full ISO format
  const date = new Date(input);
  if (!isNaN(date.getTime())) {
    return date.toISOString();
  }

  // Try relative formats like "in 30m", "in 2h"
  const lower = input.toLowerCase();
  const now = new Date();

  const relativeMatch = lower.match(
    /^in\s+(\d+)\s*(m|min|minute|minutes|h|hr|hour|hours|d|day|days)$/i,
  );
  if (relativeMatch) {
    const amount = parseInt(relativeMatch[1]);
    const unit = relativeMatch[2].toLowerCase();

    if (unit.startsWith("m")) {
      now.setMinutes(now.getMinutes() + amount);
    } else if (unit.startsWith("h")) {
      now.setHours(now.getHours() + amount);
    } else if (unit.startsWith("d")) {
      now.setDate(now.getDate() + amount);
    }

    return now.toISOString();
  }

  // Try "tomorrow at TIME"
  const tomorrowAtMatch = lower.match(/^tomorrow\s+at\s+(.+)$/i);
  if (tomorrowAtMatch) {
    const time = parseTime(tomorrowAtMatch[1]);
    if (time) {
      now.setDate(now.getDate() + 1);
      const [h, m, s] = time.split(":").map(Number);
      now.setHours(h, m, s, 0);
      return now.toISOString();
    }
  }

  return undefined;
}

/**
 * Parse a duration string (returns milliseconds)
 */
function parseDuration(input: string): number | undefined {
  const lower = input.toLowerCase();

  // Handle special values
  if (lower === "forever" || lower === "permanent") {
    return -1; // Special value for forever
  }
  if (lower === "off" || lower === "disable" || lower === "0") {
    return 0;
  }

  // Parse duration format: 1h30m, 2d, 30s, etc.
  let totalMs = 0;
  const regex =
    /(\d+)\s*(s|sec|second|seconds|m|min|minute|minutes|h|hr|hour|hours|d|day|days|w|week|weeks)/gi;
  let match;

  while ((match = regex.exec(lower)) !== null) {
    const amount = parseInt(match[1]);
    const unit = match[2].toLowerCase();

    if (unit.startsWith("s")) {
      totalMs += amount * 1000;
    } else if (unit.startsWith("m") && !unit.startsWith("mo")) {
      totalMs += amount * 60 * 1000;
    } else if (unit.startsWith("h")) {
      totalMs += amount * 60 * 60 * 1000;
    } else if (unit.startsWith("d")) {
      totalMs += amount * 24 * 60 * 60 * 1000;
    } else if (unit.startsWith("w")) {
      totalMs += amount * 7 * 24 * 60 * 60 * 1000;
    }
  }

  return totalMs > 0 ? totalMs : undefined;
}

// ============================================================================
// Validation
// ============================================================================

import type { ArgumentValidation } from "./command-types";

/**
 * Validate a value against validation rules
 */
function validateValue(
  value: string,
  validation: ArgumentValidation,
): { isValid: boolean; error?: string } {
  if (
    validation.minLength !== undefined &&
    value.length < validation.minLength
  ) {
    return {
      isValid: false,
      error: `Must be at least ${validation.minLength} characters`,
    };
  }

  if (
    validation.maxLength !== undefined &&
    value.length > validation.maxLength
  ) {
    return {
      isValid: false,
      error: `Must be at most ${validation.maxLength} characters`,
    };
  }

  if (validation.pattern) {
    const regex = new RegExp(validation.pattern);
    if (!regex.test(value)) {
      return {
        isValid: false,
        error: `Invalid format`,
      };
    }
  }

  return { isValid: true };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if input starts with a command trigger
 */
export function isCommand(input: string): boolean {
  return input.trim().startsWith("/");
}

/**
 * Extract command trigger from input
 */
export function extractTrigger(input: string): string | null {
  const match = input.trim().match(/^\/(\S+)/);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Get the raw arguments string from input
 */
export function extractArgs(input: string): string {
  const match = input.trim().match(/^\/\S+\s*(.*)$/);
  return match ? match[1] : "";
}

/**
 * Convert parsed arguments to a simple key-value object
 */
export function argsToObject(
  parsed: ParsedCommand,
): Record<string, CommandArgValue> {
  const result: Record<string, CommandArgValue> = {};

  // Add positional args
  for (const arg of parsed.args) {
    result[arg.definition.id] = arg.value;
  }

  // Add flags
  for (const [flag, arg] of Object.entries(parsed.flags)) {
    result[flag] = arg.value;
  }

  return result;
}
