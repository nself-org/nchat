/**
 * Bot Command System
 * Command parsing, registration, and execution
 */

import type {
  BotCommandDefinition,
  CommandArgument,
  ParsedCommand,
  CommandContext,
  CommandHandler,
  BotApi,
  BotResponse,
  MessageContext,
} from "./bot-types";
import { logger } from "@/lib/logger";

// ============================================================================
// COMMAND REGISTRY
// ============================================================================

/**
 * Registry for bot commands
 */
export class CommandRegistry {
  private commands: Map<string, RegisteredCommand> = new Map();
  private aliases: Map<string, string> = new Map();
  private prefix: string = "/";

  constructor(prefix: string = "/") {
    this.prefix = prefix;
  }

  /**
   * Register a command
   */
  register(definition: BotCommandDefinition, handler: CommandHandler): void {
    const name = definition.name.toLowerCase();

    this.commands.set(name, {
      definition,
      handler,
      cooldowns: new Map(),
    });

    // Register aliases
    if (definition.aliases) {
      for (const alias of definition.aliases) {
        this.aliases.set(alias.toLowerCase(), name);
      }
    }
  }

  /**
   * Unregister a command
   */
  unregister(name: string): boolean {
    const lowerName = name.toLowerCase();
    const command = this.commands.get(lowerName);

    if (command) {
      // Remove aliases
      if (command.definition.aliases) {
        for (const alias of command.definition.aliases) {
          this.aliases.delete(alias.toLowerCase());
        }
      }
      this.commands.delete(lowerName);
      return true;
    }

    return false;
  }

  /**
   * Get a command by name or alias
   */
  get(name: string): RegisteredCommand | undefined {
    const lowerName = name.toLowerCase();

    // Check direct match
    if (this.commands.has(lowerName)) {
      return this.commands.get(lowerName);
    }

    // Check aliases
    const aliasTarget = this.aliases.get(lowerName);
    if (aliasTarget) {
      return this.commands.get(aliasTarget);
    }

    return undefined;
  }

  /**
   * Check if a command exists
   */
  has(name: string): boolean {
    const lowerName = name.toLowerCase();
    return this.commands.has(lowerName) || this.aliases.has(lowerName);
  }

  /**
   * Get all registered commands
   */
  getAll(): RegisteredCommand[] {
    return Array.from(this.commands.values());
  }

  /**
   * Get visible commands (not hidden)
   */
  getVisible(): RegisteredCommand[] {
    return this.getAll().filter((cmd) => !cmd.definition.hidden);
  }

  /**
   * Parse a message for a command
   */
  parse(content: string): ParsedCommand | null {
    const trimmed = content.trim();

    if (!trimmed.startsWith(this.prefix)) {
      return null;
    }

    const withoutPrefix = trimmed.slice(this.prefix.length);
    const match = withoutPrefix.match(/^(\w+)(?:\s+(.*))?$/);

    if (!match) {
      return null;
    }

    const [, name, rawArgs = ""] = match;

    return {
      name: name.toLowerCase(),
      rawArgs: rawArgs.trim(),
      args: this.parseArgs(rawArgs, this.get(name)?.definition.arguments),
      prefix: this.prefix,
    };
  }

  /**
   * Execute a command
   */
  async execute(ctx: MessageContext, api: BotApi): Promise<BotResponse | void> {
    if (!ctx.isCommand || !ctx.command) {
      return;
    }

    const command = this.get(ctx.command.name);

    if (!command) {
      return {
        content: `Unknown command: \`${ctx.command.name}\`. Use \`${this.prefix}help\` to see available commands.`,
        options: { ephemeral: true },
      };
    }

    // Check cooldown
    const cooldownResult = this.checkCooldown(command, ctx.user.id);
    if (cooldownResult) {
      return {
        content: cooldownResult,
        options: { ephemeral: true },
      };
    }

    // Validate arguments
    const validationError = this.validateArgs(
      ctx.command.args,
      command.definition.arguments,
    );
    if (validationError) {
      return {
        content: validationError,
        options: { ephemeral: true },
      };
    }

    // Create command context
    const commandCtx: CommandContext = {
      ...ctx,
      command: ctx.command,
      args: ctx.command.args,
    };

    // Execute handler
    try {
      const result = await command.handler(commandCtx, api);
      this.setCooldown(command, ctx.user.id);
      return result;
    } catch (error) {
      logger.error(
        `[CommandRegistry] Error executing '${ctx.command.name}':`,
        error,
      );
      return {
        content: `An error occurred while executing the command.`,
        options: { ephemeral: true },
      };
    }
  }

  /**
   * Parse command arguments based on definitions
   */
  private parseArgs(
    rawArgs: string,
    definitions?: CommandArgument[],
  ): Record<string, unknown> {
    const args: Record<string, unknown> = {};
    const tokens = this.tokenize(rawArgs);
    const positional: string[] = [];

    let i = 0;
    while (i < tokens.length) {
      const token = tokens[i];

      if (token.startsWith("--")) {
        const key = token.slice(2);
        const nextToken = tokens[i + 1];

        if (nextToken && !nextToken.startsWith("--")) {
          args[key] = this.coerceValue(
            nextToken,
            this.findArgDef(key, definitions),
          );
          i += 2;
        } else {
          args[key] = true;
          i += 1;
        }
      } else {
        positional.push(token);
        i += 1;
      }
    }

    // Map positional arguments to definitions
    if (definitions) {
      definitions.forEach((def, index) => {
        if (!args[def.name] && positional[index] !== undefined) {
          args[def.name] = this.coerceValue(positional[index], def);
        }
      });
    }

    // Apply defaults for missing required args
    if (definitions) {
      for (const def of definitions) {
        if (args[def.name] === undefined && def.default !== undefined) {
          args[def.name] = def.default;
        }
      }
    }

    args._positional = positional;
    args._raw = rawArgs;

    return args;
  }

  /**
   * Tokenize input string, respecting quotes
   */
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

  /**
   * Find argument definition by name
   */
  private findArgDef(
    name: string,
    definitions?: CommandArgument[],
  ): CommandArgument | undefined {
    return definitions?.find((d) => d.name === name);
  }

  /**
   * Coerce a string value to the appropriate type
   */
  private coerceValue(value: string, def?: CommandArgument): unknown {
    if (!def) {
      // Try auto-detection
      if (/^-?\d+$/.test(value)) return parseInt(value, 10);
      if (/^-?\d+\.\d+$/.test(value)) return parseFloat(value);
      if (value.toLowerCase() === "true") return true;
      if (value.toLowerCase() === "false") return false;
      return value;
    }

    switch (def.type) {
      case "number":
        return parseFloat(value) || 0;
      case "boolean":
        return value.toLowerCase() === "true" || value === "1";
      case "user":
        // Extract user ID from mention format <@userId>
        const userMatch = value.match(/<@(\w+)>/);
        return userMatch ? userMatch[1] : value;
      case "channel":
        // Extract channel ID from mention format <#channelId>
        const channelMatch = value.match(/<#(\w+)>/);
        return channelMatch ? channelMatch[1] : value;
      case "duration":
        return value; // Will be parsed by handler
      case "choice":
        // Validate against choices if provided
        if (def.choices) {
          const choice = def.choices.find(
            (c) =>
              c.value === value ||
              c.label.toLowerCase() === value.toLowerCase(),
          );
          return choice?.value || value;
        }
        return value;
      default:
        return value;
    }
  }

  /**
   * Validate arguments against definitions
   */
  private validateArgs(
    args: Record<string, unknown>,
    definitions?: CommandArgument[],
  ): string | null {
    if (!definitions) return null;

    for (const def of definitions) {
      const value = args[def.name];

      // Check required
      if (def.required && (value === undefined || value === "")) {
        return `Missing required argument: \`${def.name}\`\n${def.description ? `  ${def.description}` : ""}`;
      }

      if (value === undefined) continue;

      // Type-specific validation
      switch (def.type) {
        case "string":
          if (typeof value !== "string") {
            return `Argument \`${def.name}\` must be a string`;
          }
          if (def.minLength && value.length < def.minLength) {
            return `Argument \`${def.name}\` must be at least ${def.minLength} characters`;
          }
          if (def.maxLength && value.length > def.maxLength) {
            return `Argument \`${def.name}\` must be at most ${def.maxLength} characters`;
          }
          break;

        case "number":
          if (typeof value !== "number" || isNaN(value)) {
            return `Argument \`${def.name}\` must be a number`;
          }
          if (def.min !== undefined && value < def.min) {
            return `Argument \`${def.name}\` must be at least ${def.min}`;
          }
          if (def.max !== undefined && value > def.max) {
            return `Argument \`${def.name}\` must be at most ${def.max}`;
          }
          break;

        case "choice":
          if (def.choices && !def.choices.some((c) => c.value === value)) {
            const validChoices = def.choices.map((c) => c.value).join(", ");
            return `Argument \`${def.name}\` must be one of: ${validChoices}`;
          }
          break;
      }
    }

    return null;
  }

  /**
   * Check if user is on cooldown for a command
   */
  private checkCooldown(
    command: RegisteredCommand,
    userId: string,
  ): string | null {
    if (!command.definition.cooldown) return null;

    const lastUse = command.cooldowns.get(userId);
    if (!lastUse) return null;

    const elapsed = Date.now() - lastUse;
    const remaining = command.definition.cooldown * 1000 - elapsed;

    if (remaining > 0) {
      const seconds = Math.ceil(remaining / 1000);
      return `Please wait ${seconds} second${seconds === 1 ? "" : "s"} before using this command again.`;
    }

    return null;
  }

  /**
   * Set cooldown for a user on a command
   */
  private setCooldown(command: RegisteredCommand, userId: string): void {
    if (command.definition.cooldown) {
      command.cooldowns.set(userId, Date.now());
    }
  }

  /**
   * Generate help text for a command
   */
  getHelp(name: string): string | null {
    const command = this.get(name);
    if (!command) return null;

    const def = command.definition;
    let help = `**${this.prefix}${def.name}**\n${def.description}\n`;

    if (def.aliases?.length) {
      help += `\nAliases: ${def.aliases.map((a) => `\`${this.prefix}${a}\``).join(", ")}`;
    }

    if (def.arguments?.length) {
      help += "\n\n**Arguments:**\n";
      for (const arg of def.arguments) {
        const required = arg.required ? " (required)" : "";
        const defaultVal =
          arg.default !== undefined ? ` [default: ${arg.default}]` : "";
        help += `  \`${arg.name}\` - ${arg.description}${required}${defaultVal}\n`;
      }
    }

    if (def.examples?.length) {
      help += "\n**Examples:**\n";
      for (const example of def.examples) {
        help += `  \`${example}\`\n`;
      }
    }

    return help;
  }

  /**
   * Generate help for all commands
   */
  getAllHelp(): string {
    const commands = this.getVisible();

    if (commands.length === 0) {
      return "No commands available.";
    }

    let help = "**Available Commands:**\n\n";

    for (const cmd of commands.sort((a, b) =>
      a.definition.name.localeCompare(b.definition.name),
    )) {
      help += `\`${this.prefix}${cmd.definition.name}\` - ${cmd.definition.description}\n`;
    }

    help += `\nUse \`${this.prefix}help <command>\` for detailed information about a command.`;

    return help;
  }
}

// ============================================================================
// TYPES
// ============================================================================

interface RegisteredCommand {
  definition: BotCommandDefinition;
  handler: CommandHandler;
  cooldowns: Map<string, number>;
}

// ============================================================================
// COMMAND BUILDERS
// ============================================================================

/**
 * Fluent builder for command definitions
 */
export class CommandBuilder {
  private definition: BotCommandDefinition;

  constructor(name: string) {
    this.definition = {
      name,
      description: "",
    };
  }

  description(desc: string): this {
    this.definition.description = desc;
    return this;
  }

  aliases(...aliases: string[]): this {
    this.definition.aliases = aliases;
    return this;
  }

  argument(arg: CommandArgument): this {
    if (!this.definition.arguments) {
      this.definition.arguments = [];
    }
    this.definition.arguments.push(arg);
    return this;
  }

  stringArg(name: string, description: string, required = false): this {
    return this.argument({ name, description, type: "string", required });
  }

  numberArg(
    name: string,
    description: string,
    options?: { required?: boolean; min?: number; max?: number },
  ): this {
    return this.argument({
      name,
      description,
      type: "number",
      required: options?.required,
      min: options?.min,
      max: options?.max,
    });
  }

  userArg(name: string, description: string, required = false): this {
    return this.argument({ name, description, type: "user", required });
  }

  channelArg(name: string, description: string, required = false): this {
    return this.argument({ name, description, type: "channel", required });
  }

  durationArg(name: string, description: string, required = false): this {
    return this.argument({ name, description, type: "duration", required });
  }

  choiceArg(
    name: string,
    description: string,
    choices: { label: string; value: string }[],
    required = false,
  ): this {
    return this.argument({
      name,
      description,
      type: "choice",
      choices,
      required,
    });
  }

  example(...examples: string[]): this {
    this.definition.examples = examples;
    return this;
  }

  cooldown(seconds: number): this {
    this.definition.cooldown = seconds;
    return this;
  }

  hidden(): this {
    this.definition.hidden = true;
    return this;
  }

  build(): BotCommandDefinition {
    return { ...this.definition };
  }
}

/**
 * Create a new command builder
 */
export function command(name: string): CommandBuilder {
  return new CommandBuilder(name);
}

// ============================================================================
// BUILT-IN COMMANDS
// ============================================================================

/**
 * Built-in help command handler
 */
export function createHelpCommand(registry: CommandRegistry): {
  definition: BotCommandDefinition;
  handler: CommandHandler;
} {
  return {
    definition: {
      name: "help",
      description: "Show available commands or help for a specific command",
      arguments: [
        {
          name: "command",
          description: "The command to get help for",
          type: "string",
          required: false,
        },
      ],
      examples: ["/help", "/help remind"],
    },
    handler: (ctx) => {
      const commandName = ctx.args.command as string | undefined;

      if (commandName) {
        const help = registry.getHelp(commandName);
        if (help) {
          return { content: help };
        }
        return {
          content: `Unknown command: \`${commandName}\``,
          options: { ephemeral: true },
        };
      }

      return { content: registry.getAllHelp() };
    },
  };
}
