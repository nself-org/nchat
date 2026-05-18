/**
 * Slash Command Registry
 * Register commands, parse input, validate, and generate help
 */

import type {
  SlashCommand,
  CommandParameter,
  ParsedCommand,
  CommandContext,
  ParameterType,
  BotPermission,
  RichMessage,
  UserId,
  ChannelId,
  MessageId,
  BotId,
} from "./types";
import { logger } from "@/lib/logger";

// ============================================================================
// TYPES
// ============================================================================

export interface RegisteredCommand {
  command: SlashCommand;
  cooldowns: Map<string, number>;
}

export interface CommandValidationResult {
  isValid: boolean;
  errors: string[];
  args: Record<string, unknown>;
}

export interface CommandRegistryConfig {
  prefix?: string;
  caseSensitive?: boolean;
  defaultCooldown?: number;
}

// ============================================================================
// COMMAND REGISTRY
// ============================================================================

/**
 * Registry for slash commands
 */
export class CommandRegistry {
  private commands: Map<string, RegisteredCommand> = new Map();
  private aliases: Map<string, string> = new Map();
  private config: Required<CommandRegistryConfig>;

  constructor(config: CommandRegistryConfig = {}) {
    this.config = {
      prefix: config.prefix ?? "/",
      caseSensitive: config.caseSensitive ?? false,
      defaultCooldown: config.defaultCooldown ?? 0,
    };
  }

  // ==========================================================================
  // REGISTRATION
  // ==========================================================================

  /**
   * Register a command
   */
  register(command: SlashCommand): void {
    const name = this.normalizeName(command.name);

    if (this.commands.has(name)) {
      throw new Error(`Command '${command.name}' is already registered`);
    }

    this.commands.set(name, {
      command: {
        ...command,
        cooldown: command.cooldown ?? this.config.defaultCooldown,
      },
      cooldowns: new Map(),
    });

    // Register aliases
    if (command.aliases) {
      for (const alias of command.aliases) {
        const normalizedAlias = this.normalizeName(alias);
        if (
          this.aliases.has(normalizedAlias) ||
          this.commands.has(normalizedAlias)
        ) {
          throw new Error(
            `Alias '${alias}' conflicts with existing command or alias`,
          );
        }
        this.aliases.set(normalizedAlias, name);
      }
    }
  }

  /**
   * Unregister a command
   */
  unregister(name: string): boolean {
    const normalizedName = this.normalizeName(name);
    const registered = this.commands.get(normalizedName);

    if (!registered) {
      return false;
    }

    // Remove aliases
    if (registered.command.aliases) {
      for (const alias of registered.command.aliases) {
        this.aliases.delete(this.normalizeName(alias));
      }
    }

    this.commands.delete(normalizedName);
    return true;
  }

  /**
   * Check if a command is registered
   */
  has(name: string): boolean {
    const normalizedName = this.normalizeName(name);
    return (
      this.commands.has(normalizedName) || this.aliases.has(normalizedName)
    );
  }

  /**
   * Get a command by name or alias
   */
  get(name: string): SlashCommand | undefined {
    const normalizedName = this.normalizeName(name);

    // Check direct match
    const direct = this.commands.get(normalizedName);
    if (direct) {
      return direct.command;
    }

    // Check aliases
    const aliasTarget = this.aliases.get(normalizedName);
    if (aliasTarget) {
      return this.commands.get(aliasTarget)?.command;
    }

    return undefined;
  }

  /**
   * Get all registered commands
   */
  getAll(): SlashCommand[] {
    return Array.from(this.commands.values()).map((r) => r.command);
  }

  /**
   * Get visible commands (not hidden)
   */
  getVisible(): SlashCommand[] {
    return this.getAll().filter((cmd) => !cmd.hidden);
  }

  /**
   * Get commands by category/permission
   */
  getByPermission(permission: BotPermission): SlashCommand[] {
    return this.getAll().filter((cmd) => cmd.permissions?.includes(permission));
  }

  // ==========================================================================
  // PARSING
  // ==========================================================================

  /**
   * Parse command input string
   */
  parse(input: string): ParsedCommand | null {
    const trimmed = input.trim();

    // Check for command prefix
    if (!trimmed.startsWith(this.config.prefix)) {
      return null;
    }

    // Extract command and raw args
    const withoutPrefix = trimmed.slice(this.config.prefix.length);
    const spaceIndex = withoutPrefix.indexOf(" ");

    let commandName: string;
    let rawArgs: string;

    if (spaceIndex === -1) {
      commandName = withoutPrefix;
      rawArgs = "";
    } else {
      commandName = withoutPrefix.slice(0, spaceIndex);
      rawArgs = withoutPrefix.slice(spaceIndex + 1).trim();
    }

    if (!commandName) {
      return null;
    }

    // Get command definition
    const command = this.get(commandName);
    if (!command) {
      return {
        name: commandName,
        args: {},
        rawArgs,
        isValid: false,
        errors: [`Unknown command: ${commandName}`],
      };
    }

    // Parse arguments
    const validation = this.validateAndParseArgs(rawArgs, command.parameters);

    return {
      name: commandName,
      args: validation.args,
      rawArgs,
      isValid: validation.isValid,
      errors: validation.errors,
    };
  }

  /**
   * Validate and parse command arguments
   */
  validateAndParseArgs(
    rawArgs: string,
    parameters: CommandParameter[],
  ): CommandValidationResult {
    const args: Record<string, unknown> = {};
    const errors: string[] = [];
    const tokens = this.tokenize(rawArgs);

    // Parse named arguments (--name value) and positional arguments
    const namedArgs: Record<string, string> = {};
    const positionalArgs: string[] = [];

    let i = 0;
    while (i < tokens.length) {
      const token = tokens[i];

      if (token.startsWith("--")) {
        const name = token.slice(2);
        const nextToken = tokens[i + 1];

        if (nextToken && !nextToken.startsWith("--")) {
          namedArgs[name] = nextToken;
          i += 2;
        } else {
          // Flag-style boolean
          namedArgs[name] = "true";
          i += 1;
        }
      } else {
        positionalArgs.push(token);
        i += 1;
      }
    }

    // Map to parameter definitions
    parameters.forEach((param, index) => {
      let rawValue: string | undefined;

      // Check named argument first
      if (namedArgs[param.name] !== undefined) {
        rawValue = namedArgs[param.name];
      } else if (positionalArgs[index] !== undefined) {
        rawValue = positionalArgs[index];
      }

      // Apply default if no value
      if (rawValue === undefined) {
        if (param.required) {
          errors.push(`Missing required parameter: ${param.name}`);
        } else if (param.default !== undefined) {
          args[param.name] = param.default;
        }
        return;
      }

      // Coerce and validate
      const coerced = this.coerceValue(rawValue, param.type);
      if (coerced.error) {
        errors.push(`Invalid value for ${param.name}: ${coerced.error}`);
      } else {
        // Validate choices if defined
        if (
          param.choices &&
          !param.choices.some((c) => c.value === String(coerced.value))
        ) {
          const validChoices = param.choices.map((c) => c.value).join(", ");
          errors.push(`${param.name} must be one of: ${validChoices}`);
        } else {
          args[param.name] = coerced.value;
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      args,
    };
  }

  // ==========================================================================
  // EXECUTION
  // ==========================================================================

  /**
   * Execute a parsed command
   */
  async execute(
    parsed: ParsedCommand,
    context: {
      userId: UserId;
      channelId: ChannelId;
      messageId?: MessageId;
      threadTs?: string;
      botId: BotId;
      respond: (message: RichMessage | string) => Promise<void>;
    },
  ): Promise<void> {
    const registered = this.getRegistered(parsed.name);

    if (!registered) {
      await context.respond(
        `Unknown command: \`${parsed.name}\`. Type \`${this.config.prefix}help\` for available commands.`,
      );
      return;
    }

    // Check cooldown
    const cooldownError = this.checkCooldown(registered, context.userId);
    if (cooldownError) {
      await context.respond(cooldownError);
      return;
    }

    // Check validation errors
    if (!parsed.isValid) {
      const errorMsg = parsed.errors.join("\n");
      await context.respond(`Command validation failed:\n${errorMsg}`);
      return;
    }

    // Create context
    const commandContext: CommandContext = {
      commandName: parsed.name,
      args: parsed.args,
      rawInput: parsed.rawArgs,
      userId: context.userId,
      channelId: context.channelId,
      messageId: context.messageId,
      threadTs: context.threadTs,
      botId: context.botId,
      respond: context.respond,
      ack: async () => {
        // Acknowledge receipt - can be implemented as a quick response
      },
    };

    // Execute handler
    try {
      await registered.command.handler(commandContext);
      this.setCooldown(registered, context.userId);
    } catch (error) {
      logger.error(
        `[CommandRegistry] Error executing command '${parsed.name}':`,
        error,
      );
      await context.respond("An error occurred while executing the command.");
    }
  }

  // ==========================================================================
  // HELP GENERATION
  // ==========================================================================

  /**
   * Generate help text for a specific command
   */
  getHelp(name: string): string | null {
    const command = this.get(name);
    if (!command) {
      return null;
    }

    let help = `**${this.config.prefix}${command.name}**\n`;
    help += `${command.description}\n\n`;

    if (command.aliases?.length) {
      help += `**Aliases:** ${command.aliases.map((a) => `\`${this.config.prefix}${a}\``).join(", ")}\n\n`;
    }

    help += `**Usage:** \`${command.usage}\`\n\n`;

    if (command.parameters.length > 0) {
      help += "**Parameters:**\n";
      for (const param of command.parameters) {
        const required = param.required ? " (required)" : "";
        const defaultVal =
          param.default !== undefined ? ` [default: ${param.default}]` : "";
        const choices = param.choices
          ? ` [choices: ${param.choices.map((c) => c.value).join(", ")}]`
          : "";
        help += `  \`${param.name}\` (${param.type})${required}${defaultVal}${choices}\n`;
        help += `    ${param.description}\n`;
      }
    }

    if (command.cooldown && command.cooldown > 0) {
      help += `\n**Cooldown:** ${command.cooldown} seconds\n`;
    }

    return help;
  }

  /**
   * Generate help text for all visible commands
   */
  getAllHelp(): string {
    const commands = this.getVisible();

    if (commands.length === 0) {
      return "No commands available.";
    }

    let help = "**Available Commands:**\n\n";

    // Sort alphabetically
    const sorted = [...commands].sort((a, b) => a.name.localeCompare(b.name));

    for (const cmd of sorted) {
      help += `\`${this.config.prefix}${cmd.name}\` - ${cmd.description}\n`;
    }

    help += `\nType \`${this.config.prefix}help <command>\` for detailed information about a specific command.`;

    return help;
  }

  /**
   * Generate usage string for a command
   */
  getUsage(name: string): string | null {
    const command = this.get(name);
    if (!command) {
      return null;
    }

    return command.usage;
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Get command prefix
   */
  getPrefix(): string {
    return this.config.prefix;
  }

  /**
   * Set command prefix
   */
  setPrefix(prefix: string): void {
    this.config.prefix = prefix;
  }

  /**
   * Get number of registered commands
   */
  count(): number {
    return this.commands.size;
  }

  /**
   * Clear all commands
   */
  clear(): void {
    this.commands.clear();
    this.aliases.clear();
  }

  /**
   * Get matching commands for autocomplete
   */
  getMatches(partial: string, limit = 10): SlashCommand[] {
    const normalized = this.normalizeName(
      partial.startsWith(this.config.prefix)
        ? partial.slice(this.config.prefix.length)
        : partial,
    );

    const matches: SlashCommand[] = [];

    for (const [name, registered] of this.commands) {
      if (name.startsWith(normalized) && !registered.command.hidden) {
        matches.push(registered.command);
        if (matches.length >= limit) break;
      }
    }

    // Also check aliases
    for (const [alias, target] of this.aliases) {
      if (alias.startsWith(normalized) && matches.length < limit) {
        const command = this.commands.get(target)?.command;
        if (command && !command.hidden && !matches.includes(command)) {
          matches.push(command);
        }
      }
    }

    return matches;
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  private normalizeName(name: string): string {
    return this.config.caseSensitive ? name : name.toLowerCase();
  }

  private getRegistered(name: string): RegisteredCommand | undefined {
    const normalizedName = this.normalizeName(name);

    const direct = this.commands.get(normalizedName);
    if (direct) {
      return direct;
    }

    const aliasTarget = this.aliases.get(normalizedName);
    if (aliasTarget) {
      return this.commands.get(aliasTarget);
    }

    return undefined;
  }

  private tokenize(input: string): string[] {
    const tokens: string[] = [];
    let current = "";
    let inQuotes = false;
    let quoteChar = "";

    for (let i = 0; i < input.length; i++) {
      const char = input[i];

      if ((char === '"' || char === "'") && !inQuotes) {
        inQuotes = true;
        quoteChar = char;
      } else if (char === quoteChar && inQuotes) {
        inQuotes = false;
        quoteChar = "";
      } else if (char === " " && !inQuotes) {
        if (current) {
          tokens.push(current);
          current = "";
        }
      } else {
        current += char;
      }
    }

    if (current) {
      tokens.push(current);
    }

    return tokens;
  }

  private coerceValue(
    value: string,
    type: ParameterType,
  ): { value?: unknown; error?: string } {
    switch (type) {
      case "string":
        return { value };

      case "number": {
        const num = parseFloat(value);
        if (isNaN(num)) {
          return { error: "must be a number" };
        }
        return { value: num };
      }

      case "boolean": {
        const lower = value.toLowerCase();
        if (lower === "true" || lower === "1" || lower === "yes") {
          return { value: true };
        }
        if (lower === "false" || lower === "0" || lower === "no") {
          return { value: false };
        }
        return { error: "must be true or false" };
      }

      case "user": {
        // Extract user ID from mention format <@userId>
        const match = value.match(/<@(\w+)>/);
        if (match) {
          return { value: match[1] };
        }
        // Accept raw ID
        return { value };
      }

      case "channel": {
        // Extract channel ID from mention format <#channelId>
        const match = value.match(/<#(\w+)>/);
        if (match) {
          return { value: match[1] };
        }
        // Accept raw ID
        return { value };
      }

      default:
        return { value };
    }
  }

  private checkCooldown(
    registered: RegisteredCommand,
    userId: string,
  ): string | null {
    const cooldown = registered.command.cooldown;
    if (!cooldown || cooldown <= 0) {
      return null;
    }

    const lastUse = registered.cooldowns.get(userId);
    if (!lastUse) {
      return null;
    }

    const elapsed = Date.now() - lastUse;
    const remaining = cooldown * 1000 - elapsed;

    if (remaining > 0) {
      const seconds = Math.ceil(remaining / 1000);
      return `Please wait ${seconds} second${seconds === 1 ? "" : "s"} before using this command again.`;
    }

    return null;
  }

  private setCooldown(registered: RegisteredCommand, userId: string): void {
    if (registered.command.cooldown && registered.command.cooldown > 0) {
      registered.cooldowns.set(userId, Date.now());
    }
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a new command registry
 */
export function createCommandRegistry(
  config?: CommandRegistryConfig,
): CommandRegistry {
  return new CommandRegistry(config);
}

/**
 * Create a command definition helper
 */
export function defineCommand(
  name: string,
  description: string,
  handler: SlashCommand["handler"],
): Omit<SlashCommand, "parameters" | "usage"> & {
  parameters: CommandParameter[];
  usage: string;
} {
  return {
    name,
    description,
    usage: `/${name}`,
    parameters: [],
    handler,
  };
}

/**
 * Helper to build parameter definitions
 */
export const param = {
  string: (
    name: string,
    description: string,
    required = false,
  ): CommandParameter => ({
    name,
    type: "string",
    description,
    required,
  }),

  number: (
    name: string,
    description: string,
    required = false,
  ): CommandParameter => ({
    name,
    type: "number",
    description,
    required,
  }),

  boolean: (
    name: string,
    description: string,
    required = false,
  ): CommandParameter => ({
    name,
    type: "boolean",
    description,
    required,
  }),

  user: (
    name: string,
    description: string,
    required = false,
  ): CommandParameter => ({
    name,
    type: "user",
    description,
    required,
  }),

  channel: (
    name: string,
    description: string,
    required = false,
  ): CommandParameter => ({
    name,
    type: "channel",
    description,
    required,
  }),

  choice: (
    name: string,
    description: string,
    choices: { label: string; value: string }[],
    required = false,
  ): CommandParameter => ({
    name,
    type: "string",
    description,
    required,
    choices,
  }),
};
