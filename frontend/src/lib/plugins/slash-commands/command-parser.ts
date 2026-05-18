/**
 * Plugin Command Parser
 *
 * Parses raw user input (e.g., "/myapp:deploy production --force true")
 * into a structured ParseResult with typed, validated arguments.
 *
 * Supports:
 * - Namespaced commands (appId:name)
 * - Positional arguments
 * - Quoted strings ("hello world")
 * - Type coercion (string -> number, boolean, @user, #channel)
 * - Schema validation (required, min/max, pattern, choices)
 */

import type {
  PluginCommand,
  PluginArgSchema,
  PluginArgValue,
  ParseResult,
  ParseError,
} from "./types";

// ============================================================================
// TOKENIZER
// ============================================================================

/**
 * Tokenize input string, respecting quoted strings.
 * Handles both single and double quotes.
 */
export function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let inQuotes = false;
  let quoteChar = "";

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    // Handle escape character
    if (char === "\\" && i + 1 < input.length) {
      current += input[i + 1];
      i++;
      continue;
    }

    // Start of quoted string
    if ((char === '"' || char === "'") && !inQuotes) {
      inQuotes = true;
      quoteChar = char;
      continue;
    }

    // End of quoted string
    if (char === quoteChar && inQuotes) {
      inQuotes = false;
      quoteChar = "";
      // Push even empty quoted strings
      tokens.push(current);
      current = "";
      continue;
    }

    // Space outside quotes = token boundary
    if (char === " " && !inQuotes) {
      if (current.length > 0) {
        tokens.push(current);
        current = "";
      }
      continue;
    }

    current += char;
  }

  // Trailing token
  if (current.length > 0) {
    tokens.push(current);
  }

  return tokens;
}

// ============================================================================
// COMMAND NAME EXTRACTION
// ============================================================================

/**
 * Extract command trigger info from raw input.
 * Returns null if input is not a valid command.
 */
export function extractCommandInfo(input: string): {
  fullTrigger: string;
  namespace: string;
  bareName: string;
  isNamespaced: boolean;
  rest: string;
} | null {
  const trimmed = input.trim();
  if (!trimmed.startsWith("/")) return null;

  // Match /namespace:command or /command
  const match = trimmed.match(
    /^\/([a-z0-9_.-]+:)?([a-z][a-z0-9_-]*)([\s].*)?$/i,
  );
  if (!match) {
    // Try to at least extract the trigger for error reporting
    const simpleMatch = trimmed.match(/^\/(\S+)/);
    if (simpleMatch) {
      const trigger = simpleMatch[1].toLowerCase();
      const colonIdx = trigger.indexOf(":");
      return {
        fullTrigger: trigger,
        namespace: colonIdx >= 0 ? trigger.slice(0, colonIdx) : "",
        bareName: colonIdx >= 0 ? trigger.slice(colonIdx + 1) : trigger,
        isNamespaced: colonIdx >= 0,
        rest: trimmed.slice(simpleMatch[0].length).trim(),
      };
    }
    return null;
  }

  const namespace = match[1] ? match[1].slice(0, -1).toLowerCase() : ""; // Remove trailing colon
  const bareName = match[2].toLowerCase();
  const rest = (match[3] || "").trim();
  const fullTrigger = namespace ? `${namespace}:${bareName}` : bareName;

  return {
    fullTrigger,
    namespace,
    bareName,
    isNamespaced: namespace.length > 0,
    rest,
  };
}

// ============================================================================
// ARGUMENT PARSING
// ============================================================================

/**
 * Parse raw input against a command's argument schema.
 */
export function parseArgs(
  rawInput: string,
  schema: PluginArgSchema[],
): {
  args: Record<string, PluginArgValue>;
  errors: ParseError[];
  rawArgs: string[];
} {
  const errors: ParseError[] = [];
  const args: Record<string, PluginArgValue> = {};
  const rawArgs = tokenize(rawInput);

  // Apply positional matching: args are matched in schema order
  let tokenIndex = 0;

  for (const argDef of schema) {
    if (tokenIndex >= rawArgs.length) {
      // No more tokens available
      if (argDef.required) {
        errors.push({
          type: "missing_required",
          argument: argDef.name,
          message: `Missing required argument: ${argDef.name}`,
        });
      } else {
        args[argDef.name] = argDef.default;
      }
      continue;
    }

    const rawToken = rawArgs[tokenIndex];
    tokenIndex++;

    // Parse and validate the token
    const result = parseAndValidateArg(rawToken, argDef);
    if (result.error) {
      errors.push(result.error);
      args[argDef.name] = argDef.default;
    } else {
      args[argDef.name] = result.value;
    }
  }

  return { args, errors, rawArgs };
}

/**
 * Parse a single argument value against its schema definition.
 */
export function parseAndValidateArg(
  rawValue: string,
  schema: PluginArgSchema,
): { value: PluginArgValue; error?: ParseError } {
  // Handle empty value
  if (rawValue === "" || rawValue === undefined || rawValue === null) {
    if (schema.required) {
      return {
        value: undefined,
        error: {
          type: "missing_required",
          argument: schema.name,
          message: `${schema.name} is required`,
        },
      };
    }
    return { value: schema.default };
  }

  let value: PluginArgValue;

  // Type coercion
  switch (schema.type) {
    case "string": {
      value = rawValue;
      // Validate length
      if (
        schema.minLength !== undefined &&
        rawValue.length < schema.minLength
      ) {
        return {
          value: rawValue,
          error: {
            type: "validation_failed",
            argument: schema.name,
            message: `${schema.name} must be at least ${schema.minLength} characters`,
          },
        };
      }
      if (
        schema.maxLength !== undefined &&
        rawValue.length > schema.maxLength
      ) {
        return {
          value: rawValue,
          error: {
            type: "validation_failed",
            argument: schema.name,
            message: `${schema.name} must be at most ${schema.maxLength} characters`,
          },
        };
      }
      // Pattern validation
      if (schema.pattern) {
        try {
          const regex = new RegExp(schema.pattern);
          if (!regex.test(rawValue)) {
            return {
              value: rawValue,
              error: {
                type: "validation_failed",
                argument: schema.name,
                message: `${schema.name} does not match the required pattern`,
              },
            };
          }
        } catch {
          // Invalid regex -- skip validation
        }
      }
      break;
    }

    case "number": {
      const num = Number(rawValue);
      if (isNaN(num)) {
        return {
          value: undefined,
          error: {
            type: "invalid_type",
            argument: schema.name,
            message: `${schema.name} must be a number, got "${rawValue}"`,
          },
        };
      }
      value = num;
      if (schema.min !== undefined && num < schema.min) {
        return {
          value: num,
          error: {
            type: "validation_failed",
            argument: schema.name,
            message: `${schema.name} must be at least ${schema.min}`,
          },
        };
      }
      if (schema.max !== undefined && num > schema.max) {
        return {
          value: num,
          error: {
            type: "validation_failed",
            argument: schema.name,
            message: `${schema.name} must be at most ${schema.max}`,
          },
        };
      }
      break;
    }

    case "boolean": {
      const lower = rawValue.toLowerCase();
      if (["true", "yes", "1", "on"].includes(lower)) {
        value = true;
      } else if (["false", "no", "0", "off"].includes(lower)) {
        value = false;
      } else {
        return {
          value: undefined,
          error: {
            type: "invalid_type",
            argument: schema.name,
            message: `${schema.name} must be a boolean (true/false), got "${rawValue}"`,
          },
        };
      }
      break;
    }

    case "user": {
      // Accept @username or plain username
      const cleaned = rawValue.startsWith("@") ? rawValue.slice(1) : rawValue;
      if (!cleaned || /\s/.test(cleaned)) {
        return {
          value: undefined,
          error: {
            type: "invalid_type",
            argument: schema.name,
            message: `${schema.name} must be a valid user mention (e.g., @username)`,
          },
        };
      }
      value = cleaned;
      break;
    }

    case "channel": {
      // Accept #channel or plain channel name
      const cleaned = rawValue.startsWith("#") ? rawValue.slice(1) : rawValue;
      if (!cleaned || /\s/.test(cleaned)) {
        return {
          value: undefined,
          error: {
            type: "invalid_type",
            argument: schema.name,
            message: `${schema.name} must be a valid channel reference (e.g., #general)`,
          },
        };
      }
      value = cleaned;
      break;
    }

    default: {
      value = rawValue;
    }
  }

  // Choices validation
  if (schema.choices && schema.choices.length > 0) {
    const strValue = String(value);
    if (!schema.choices.includes(strValue)) {
      return {
        value,
        error: {
          type: "validation_failed",
          argument: schema.name,
          message: `${schema.name} must be one of: ${schema.choices.join(", ")}`,
        },
      };
    }
  }

  return { value };
}

// ============================================================================
// FULL PARSE PIPELINE
// ============================================================================

/**
 * Parse complete user input into a structured ParseResult.
 * Does NOT look up the command in the registry -- that's the executor's job.
 */
export function parseInput(
  input: string,
  command?: PluginCommand,
): ParseResult {
  const info = extractCommandInfo(input);

  if (!info) {
    return {
      success: false,
      commandName: "",
      isNamespaced: false,
      namespace: "",
      bareName: "",
      args: {},
      rawArgs: [],
      rawInput: input,
      errors: [
        { type: "parse_error", message: "Input is not a valid command" },
      ],
    };
  }

  // If a command is provided, validate arguments against schema
  if (command) {
    const { args, errors, rawArgs } = parseArgs(info.rest, command.args);
    return {
      success: errors.length === 0,
      commandName: info.fullTrigger,
      isNamespaced: info.isNamespaced,
      namespace: info.namespace,
      bareName: info.bareName,
      args,
      rawArgs,
      rawInput: info.rest,
      errors,
    };
  }

  // No command provided -- just return the raw tokens
  const rawArgs = tokenize(info.rest);
  return {
    success: true,
    commandName: info.fullTrigger,
    isNamespaced: info.isNamespaced,
    namespace: info.namespace,
    bareName: info.bareName,
    args: {},
    rawArgs,
    rawInput: info.rest,
    errors: [],
  };
}
