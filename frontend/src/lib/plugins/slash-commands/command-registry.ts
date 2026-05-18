/**
 * Plugin Command Registry
 *
 * Central registry for plugin slash commands. Handles registration,
 * namespace management, lookup, and autocomplete discovery.
 *
 * Key design decisions:
 * - Built-in commands occupy the root namespace (e.g., /help)
 * - App commands use appId:name format (e.g., /mybot:deploy)
 * - Apps can also register un-namespaced aliases if they don't conflict
 * - Built-in commands can NEVER be overridden
 * - Command names are case-insensitive
 */

import type {
  PluginCommand,
  PluginCommandSuggestion,
  UserRole,
  ChannelType,
} from "./types";
import { meetsRoleRequirement } from "./types";

// ============================================================================
// REGISTRY ERRORS
// ============================================================================

export class CommandRegistryError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "CommandRegistryError";
  }
}

// ============================================================================
// COMMAND REGISTRY
// ============================================================================

export class CommandRegistry {
  /** Commands by ID */
  private commandsById: Map<string, PluginCommand> = new Map();
  /** Commands by qualified name (case-insensitive) */
  private commandsByQualifiedName: Map<string, PluginCommand> = new Map();
  /** Commands by bare name for un-namespaced lookup (case-insensitive) */
  private commandsByBareName: Map<string, PluginCommand> = new Map();
  /** Counter for generating unique IDs */
  private idCounter = 0;

  // ==========================================================================
  // ID GENERATION
  // ==========================================================================

  private generateId(): string {
    this.idCounter++;
    return `cmd_${Date.now().toString(36)}_${this.idCounter.toString(36)}`;
  }

  // ==========================================================================
  // REGISTRATION
  // ==========================================================================

  /**
   * Register a command. Validates against namespace conflicts and built-in protection.
   */
  register(
    command: Omit<PluginCommand, "id" | "qualifiedName">,
  ): PluginCommand {
    const name = command.name.toLowerCase();
    const appId = command.appId || "";

    // Validate command name format
    if (!this.isValidCommandName(name)) {
      throw new CommandRegistryError(
        `Invalid command name "${name}". Must be 1-32 lowercase alphanumeric characters, hyphens, or underscores, starting with a letter.`,
        "INVALID_COMMAND_NAME",
      );
    }

    // Build qualified name
    const qualifiedName = appId ? `${appId}:${name}` : name;

    // Check for duplicate qualified name
    if (this.commandsByQualifiedName.has(qualifiedName.toLowerCase())) {
      throw new CommandRegistryError(
        `Command "${qualifiedName}" is already registered`,
        "DUPLICATE_COMMAND",
      );
    }

    // If this is an app command trying to register without namespace,
    // check it doesn't conflict with built-in
    if (!appId) {
      // Built-in registration: just check for conflicts with other built-ins
      const existingBare = this.commandsByBareName.get(name.toLowerCase());
      if (existingBare && existingBare.isBuiltIn) {
        throw new CommandRegistryError(
          `Built-in command "/${name}" is already registered`,
          "DUPLICATE_BUILTIN",
        );
      }
    } else {
      // App command: register with namespace, optionally add bare name alias
      // Bare name conflicts with built-in are NOT errors -- the built-in takes priority
    }

    const id = this.generateId();
    const fullCommand: PluginCommand = {
      ...command,
      id,
      name,
      appId,
      qualifiedName,
      enabled: command.enabled ?? true,
    };

    // Store by ID and qualified name
    this.commandsById.set(id, fullCommand);
    this.commandsByQualifiedName.set(qualifiedName.toLowerCase(), fullCommand);

    // For built-in commands, also register by bare name
    if (!appId) {
      this.commandsByBareName.set(name.toLowerCase(), fullCommand);
    }
    // For app commands, register bare name only if no conflict
    else if (!this.commandsByBareName.has(name.toLowerCase())) {
      this.commandsByBareName.set(name.toLowerCase(), fullCommand);
    }

    return fullCommand;
  }

  /**
   * Unregister a command by ID. Built-in commands cannot be unregistered.
   */
  unregister(commandId: string): boolean {
    const command = this.commandsById.get(commandId);
    if (!command) {
      return false;
    }

    if (command.isBuiltIn) {
      throw new CommandRegistryError(
        `Cannot unregister built-in command "/${command.name}"`,
        "CANNOT_UNREGISTER_BUILTIN",
      );
    }

    this.commandsById.delete(commandId);
    this.commandsByQualifiedName.delete(command.qualifiedName.toLowerCase());

    // Only remove bare name if this command owns it
    const bareEntry = this.commandsByBareName.get(command.name.toLowerCase());
    if (bareEntry && bareEntry.id === commandId) {
      this.commandsByBareName.delete(command.name.toLowerCase());
    }

    return true;
  }

  /**
   * Unregister all commands from a specific app.
   */
  unregisterApp(appId: string): number {
    const appCommands = this.getCommandsByApp(appId);
    let count = 0;
    for (const cmd of appCommands) {
      if (this.unregister(cmd.id)) {
        count++;
      }
    }
    return count;
  }

  // ==========================================================================
  // LOOKUP
  // ==========================================================================

  /**
   * Look up a command by its qualified name or bare name.
   * Qualified names (appId:name) always take priority.
   * For bare names, built-in commands take priority over app commands.
   */
  lookup(nameOrQualified: string): PluginCommand | undefined {
    const lower = nameOrQualified.toLowerCase();

    // Try qualified name first
    const byQualified = this.commandsByQualifiedName.get(lower);
    if (byQualified) {
      return byQualified;
    }

    // Try bare name
    return this.commandsByBareName.get(lower);
  }

  /**
   * Get a command by its internal ID.
   */
  getById(id: string): PluginCommand | undefined {
    return this.commandsById.get(id);
  }

  /**
   * Get all registered commands.
   */
  getAll(): PluginCommand[] {
    return Array.from(this.commandsById.values());
  }

  /**
   * Get all enabled commands.
   */
  getAllEnabled(): PluginCommand[] {
    return this.getAll().filter((cmd) => cmd.enabled);
  }

  /**
   * Get all built-in commands.
   */
  getBuiltIn(): PluginCommand[] {
    return this.getAll().filter((cmd) => cmd.isBuiltIn);
  }

  /**
   * Get all commands from a specific app.
   */
  getCommandsByApp(appId: string): PluginCommand[] {
    return this.getAll().filter((cmd) => cmd.appId === appId);
  }

  /**
   * Get the count of registered commands.
   */
  get size(): number {
    return this.commandsById.size;
  }

  // ==========================================================================
  // AUTOCOMPLETE / DISCOVERY
  // ==========================================================================

  /**
   * Get command suggestions matching a query, filtered by user permissions.
   */
  getSuggestions(
    query: string,
    options: {
      userRole?: UserRole;
      channelType?: ChannelType;
      grantedScopes?: string[];
      limit?: number;
    } = {},
  ): PluginCommandSuggestion[] {
    const { userRole, channelType, grantedScopes, limit = 15 } = options;
    const normalizedQuery = query.toLowerCase().replace(/^\//, "");

    const suggestions: PluginCommandSuggestion[] = [];

    for (const command of this.commandsById.values()) {
      if (!command.enabled) continue;

      // Filter by role
      if (userRole && !meetsRoleRequirement(userRole, command.requiredRole)) {
        continue;
      }

      // Filter by channel type
      if (channelType && !command.allowedChannelTypes.includes(channelType)) {
        continue;
      }

      // Filter by scopes (for app commands)
      if (command.appId && grantedScopes) {
        const hasRequiredScopes = command.requiredScopes.every((s) =>
          grantedScopes.includes(s),
        );
        if (!hasRequiredScopes) continue;
      }

      // Calculate match score
      const score = this.calculateScore(command, normalizedQuery);
      if (score > 0 || !normalizedQuery) {
        const label = command.appId
          ? `/${command.appId}:${command.name}`
          : `/${command.name}`;

        suggestions.push({ command, score: score || 1, label });
      }
    }

    // Sort by score descending, then alphabetically
    suggestions.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.command.name.localeCompare(b.command.name);
    });

    return suggestions.slice(0, limit);
  }

  /**
   * Get help text for a command.
   */
  getHelp(nameOrQualified: string): string | undefined {
    const command = this.lookup(nameOrQualified);
    if (!command) return undefined;

    const label = command.appId
      ? `/${command.appId}:${command.name}`
      : `/${command.name}`;

    let help = `**${label}** - ${command.description}`;
    if (command.usage) {
      help += `\n\nUsage: \`${command.usage}\``;
    }
    if (command.helpText) {
      help += `\n\n${command.helpText}`;
    }
    if (command.args.length > 0) {
      help += "\n\nArguments:";
      for (const arg of command.args) {
        const req = arg.required ? "(required)" : "(optional)";
        help += `\n  ${arg.name} [${arg.type}] ${req} - ${arg.description}`;
      }
    }
    return help;
  }

  // ==========================================================================
  // RESET
  // ==========================================================================

  /**
   * Clear all registered commands (for testing).
   */
  clear(): void {
    this.commandsById.clear();
    this.commandsByQualifiedName.clear();
    this.commandsByBareName.clear();
    this.idCounter = 0;
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  private isValidCommandName(name: string): boolean {
    return /^[a-z][a-z0-9_-]{0,31}$/.test(name);
  }

  private calculateScore(command: PluginCommand, query: string): number {
    if (!query) return 0;

    const name = command.name;
    const qualifiedName = command.qualifiedName;

    // Exact match on name
    if (name === query) return 150;
    if (qualifiedName === query) return 145;

    // Starts with
    if (name.startsWith(query)) return 100;
    if (qualifiedName.startsWith(query)) return 95;

    // Contains
    if (name.includes(query)) return 60;
    if (qualifiedName.includes(query)) return 55;

    // Description contains
    if (command.description.toLowerCase().includes(query)) return 30;

    return 0;
  }
}
