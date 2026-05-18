/**
 * useBotCommands Hook
 * Provides access to bot commands, execution, and command history
 */

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import type {
  SlashCommand,
  ParsedCommand,
  CommandContext,
  RichMessage,
} from "@/lib/bot-sdk/types";
import {
  CommandRegistry,
  createCommandRegistry,
} from "@/lib/bot-sdk/command-registry";

// ============================================================================
// TYPES
// ============================================================================

export interface CommandHistoryEntry {
  id: string;
  input: string;
  parsedCommand: ParsedCommand;
  timestamp: Date;
  response?: RichMessage | string;
  error?: string;
  duration?: number;
}

export interface UseBotCommandsOptions {
  prefix?: string;
  maxHistory?: number;
  onCommandExecuted?: (entry: CommandHistoryEntry) => void;
  onError?: (error: Error, command: string) => void;
}

export interface UseBotCommandsResult {
  // Registry access
  registry: CommandRegistry;
  commands: SlashCommand[];
  visibleCommands: SlashCommand[];

  // Command operations
  registerCommand: (command: SlashCommand) => void;
  unregisterCommand: (name: string) => void;
  hasCommand: (name: string) => boolean;
  getCommand: (name: string) => SlashCommand | undefined;

  // Parsing and execution
  parseInput: (input: string) => ParsedCommand | null;
  executeCommand: (
    input: string,
    context: Omit<
      CommandContext,
      "commandName" | "args" | "rawInput" | "respond" | "ack"
    >,
  ) => Promise<RichMessage | string | null>;

  // Autocomplete
  getMatches: (partial: string, limit?: number) => SlashCommand[];
  getSuggestions: (input: string) => SlashCommand[];

  // History
  history: CommandHistoryEntry[];
  clearHistory: () => void;
  getLastCommand: () => CommandHistoryEntry | undefined;

  // State
  isExecuting: boolean;
  lastError: string | null;
  clearError: () => void;

  // Utility
  getHelp: (name?: string) => string;
  getUsage: (name: string) => string | null;
  getPrefix: () => string;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useBotCommands(
  options: UseBotCommandsOptions = {},
): UseBotCommandsResult {
  const { prefix = "/", maxHistory = 50, onCommandExecuted, onError } = options;

  // Create registry instance
  const registryRef = useRef<CommandRegistry | null>(null);
  if (!registryRef.current) {
    registryRef.current = createCommandRegistry({ prefix });
  }
  const registry = registryRef.current;

  // State
  const [commands, setCommands] = useState<SlashCommand[]>([]);
  const [history, setHistory] = useState<CommandHistoryEntry[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  // Sync commands from registry
  const syncCommands = useCallback(() => {
    setCommands(registry.getAll());
  }, [registry]);

  // Register command
  const registerCommand = useCallback(
    (command: SlashCommand) => {
      registry.register(command);
      syncCommands();
    },
    [registry, syncCommands],
  );

  // Unregister command
  const unregisterCommand = useCallback(
    (name: string) => {
      registry.unregister(name);
      syncCommands();
    },
    [registry, syncCommands],
  );

  // Check if command exists
  const hasCommand = useCallback(
    (name: string) => {
      return registry.has(name);
    },
    [registry],
  );

  // Get command by name
  const getCommand = useCallback(
    (name: string) => {
      return registry.get(name);
    },
    [registry],
  );

  // Parse input
  const parseInput = useCallback(
    (input: string): ParsedCommand | null => {
      return registry.parse(input);
    },
    [registry],
  );

  // Execute command
  const executeCommand = useCallback(
    async (
      input: string,
      context: Omit<
        CommandContext,
        "commandName" | "args" | "rawInput" | "respond" | "ack"
      >,
    ): Promise<RichMessage | string | null> => {
      const parsed = registry.parse(input);

      if (!parsed) {
        return null;
      }

      const entryId = `cmd_${Date.now()}`;
      const startTime = Date.now();
      let response: RichMessage | string | undefined;
      let error: string | undefined;

      setIsExecuting(true);
      setLastError(null);

      try {
        // Create a promise that resolves with the response
        let resolveResponse: (value: RichMessage | string) => void;
        const responsePromise = new Promise<RichMessage | string>((resolve) => {
          resolveResponse = resolve;
        });

        await registry.execute(parsed, {
          ...context,
          respond: async (msg: RichMessage | string) => {
            response = msg;
            resolveResponse(msg);
          },
        });

        // Wait for response if handler called respond
        if (!response) {
          // Use a timeout for handlers that might not call respond
          const timeoutPromise = new Promise<RichMessage | string>(
            (resolve) => {
              setTimeout(() => resolve(""), 100);
            },
          );
          response = await Promise.race([responsePromise, timeoutPromise]);
        }
      } catch (err) {
        error = err instanceof Error ? err.message : "Command execution failed";
        setLastError(error);
        onError?.(err instanceof Error ? err : new Error(error), input);
      } finally {
        setIsExecuting(false);
      }

      const duration = Date.now() - startTime;

      // Create history entry
      const entry: CommandHistoryEntry = {
        id: entryId,
        input,
        parsedCommand: parsed,
        timestamp: new Date(),
        response,
        error,
        duration,
      };

      // Update history
      setHistory((prev) => {
        const newHistory = [entry, ...prev];
        if (newHistory.length > maxHistory) {
          return newHistory.slice(0, maxHistory);
        }
        return newHistory;
      });

      onCommandExecuted?.(entry);

      return response ?? null;
    },
    [registry, maxHistory, onCommandExecuted, onError],
  );

  // Get matching commands for autocomplete
  const getMatches = useCallback(
    (partial: string, limit = 10): SlashCommand[] => {
      return registry.getMatches(partial, limit);
    },
    [registry],
  );

  // Get command suggestions from input
  const getSuggestions = useCallback(
    (input: string): SlashCommand[] => {
      const trimmed = input.trim();

      if (!trimmed.startsWith(prefix)) {
        return [];
      }

      const withoutPrefix = trimmed.slice(prefix.length);

      // If there's a space, user is typing arguments, don't suggest
      if (withoutPrefix.includes(" ")) {
        return [];
      }

      return getMatches(withoutPrefix, 10);
    },
    [prefix, getMatches],
  );

  // Clear history
  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  // Get last command
  const getLastCommand = useCallback((): CommandHistoryEntry | undefined => {
    return history[0];
  }, [history]);

  // Clear error
  const clearError = useCallback(() => {
    setLastError(null);
  }, []);

  // Get help
  const getHelp = useCallback(
    (name?: string): string => {
      if (name) {
        return registry.getHelp(name) ?? `Unknown command: ${name}`;
      }
      return registry.getAllHelp();
    },
    [registry],
  );

  // Get usage
  const getUsage = useCallback(
    (name: string): string | null => {
      return registry.getUsage(name);
    },
    [registry],
  );

  // Get prefix
  const getPrefix = useCallback((): string => {
    return registry.getPrefix();
  }, [registry]);

  // Visible commands (not hidden)
  const visibleCommands = useMemo(() => {
    return commands.filter((cmd) => !cmd.hidden);
  }, [commands]);

  return {
    registry,
    commands,
    visibleCommands,
    registerCommand,
    unregisterCommand,
    hasCommand,
    getCommand,
    parseInput,
    executeCommand,
    getMatches,
    getSuggestions,
    history,
    clearHistory,
    getLastCommand,
    isExecuting,
    lastError,
    clearError,
    getHelp,
    getUsage,
    getPrefix,
  };
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Hook to check if current input is a valid command
 */
export function useIsCommand(input: string, prefix = "/"): boolean {
  return useMemo(() => {
    const trimmed = input.trim();
    return trimmed.startsWith(prefix) && trimmed.length > prefix.length;
  }, [input, prefix]);
}

/**
 * Hook to get command name from input
 */
export function useCommandName(input: string, prefix = "/"): string | null {
  return useMemo(() => {
    const trimmed = input.trim();
    if (!trimmed.startsWith(prefix)) {
      return null;
    }

    const withoutPrefix = trimmed.slice(prefix.length);
    const spaceIndex = withoutPrefix.indexOf(" ");

    if (spaceIndex === -1) {
      return withoutPrefix || null;
    }

    return withoutPrefix.slice(0, spaceIndex) || null;
  }, [input, prefix]);
}

/**
 * Hook to debounce command suggestions
 */
export function useDebouncedSuggestions(
  input: string,
  getSuggestions: (input: string) => SlashCommand[],
  delay = 150,
): SlashCommand[] {
  const [suggestions, setSuggestions] = useState<SlashCommand[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSuggestions(getSuggestions(input));
    }, delay);

    return () => clearTimeout(timer);
  }, [input, getSuggestions, delay]);

  return suggestions;
}

// ============================================================================
// BUILT-IN COMMANDS
// ============================================================================

/**
 * Create a help command
 */
export function createHelpCommand(registry: CommandRegistry): SlashCommand {
  return {
    name: "help",
    description: "Show available commands or help for a specific command",
    usage: "/help [command]",
    parameters: [
      {
        name: "command",
        type: "string",
        required: false,
        description: "The command to get help for",
      },
    ],
    handler: async (ctx) => {
      const commandName = ctx.args.command as string | undefined;

      if (commandName) {
        const help = registry.getHelp(commandName);
        if (help) {
          await ctx.respond(help);
        } else {
          await ctx.respond(`Unknown command: \`${commandName}\``);
        }
      } else {
        await ctx.respond(registry.getAllHelp());
      }
    },
  };
}

/**
 * Create a ping command
 */
export function createPingCommand(): SlashCommand {
  return {
    name: "ping",
    description: "Check if the bot is responding",
    usage: "/ping",
    parameters: [],
    handler: async (ctx) => {
      await ctx.respond("Pong!");
    },
  };
}

/**
 * Create an echo command
 */
export function createEchoCommand(): SlashCommand {
  return {
    name: "echo",
    description: "Echo back a message",
    usage: "/echo [message]",
    parameters: [
      {
        name: "message",
        type: "string",
        required: true,
        description: "The message to echo",
      },
    ],
    handler: async (ctx) => {
      const message = ctx.args.message as string;
      await ctx.respond(message);
    },
  };
}
