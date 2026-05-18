"use client";

/**
 * Commands Hook
 *
 * This hook provides a complete interface for working with slash commands.
 * It combines filtering, execution, and state management.
 *
 * @example
 * ```tsx
 * function MessageInput() {
 *   const {
 *     availableCommands,
 *     filteredCommands,
 *     executeCommand,
 *     isSlashCommand,
 *   } = useCommands()
 *
 *   const handleInput = (value: string) => {
 *     if (isSlashCommand(value)) {
 *       // Show command menu
 *     }
 *   }
 * }
 * ```
 */

import { useCallback, useMemo } from "react";
import { useFeatureEnabled } from "@/lib/features/hooks/use-feature";
import { FEATURES } from "@/lib/features/feature-flags";
import {
  COMMANDS,
  searchCommands,
  getCommandByName,
  getCommandsByCategory,
  getCommandCategoriesInOrder,
  type SlashCommand,
  type CommandCategory,
} from "./commands";
import {
  parseCommand,
  isCommandInput,
  isTypingCommand,
  extractPartialCommand,
  validateCommandContext,
  type ParsedCommand,
  type ValidationContext,
} from "./command-parser";
import {
  executeCommand as executeCommandAction,
  type CommandContext,
  type CommandResult,
  type CommandEffect,
} from "./command-executor";
import {
  useCommandStore,
  selectMenuState,
  selectRecentCommandNames,
  selectFavorites,
  selectEnabledCustomCommands,
  type CustomCommand,
} from "./command-store";

// ============================================================================
// Types
// ============================================================================

export interface UseCommandsOptions {
  /** Current channel ID for context */
  channelId?: string;
  /** Current channel name */
  channelName?: string;
  /** Current thread ID */
  threadId?: string;
  /** Current user ID */
  userId?: string;
  /** Current user name */
  userName?: string;
  /** Current user role */
  userRole?: "owner" | "admin" | "moderator" | "member" | "guest";
  /** Enabled feature flags */
  enabledFeatures?: string[];
  /** Callback when command is executed */
  onExecute?: (result: CommandResult) => void;
  /** Callback when message should be sent */
  onSendMessage?: (
    content: string,
    type?: "text" | "action" | "system",
  ) => void;
  /** Callback when navigation should occur */
  onNavigate?: (path: string) => void;
  /** Callback when modal should open */
  onOpenModal?: (type: string, data?: Record<string, unknown>) => void;
}

export interface UseCommandsResult {
  /** Whether slash commands feature is enabled */
  isEnabled: boolean;
  /** All available commands (filtered by enabled features) */
  availableCommands: SlashCommand[];
  /** Commands filtered by current search query */
  filteredCommands: SlashCommand[];
  /** Commands grouped by category */
  commandsByCategory: Map<CommandCategory, SlashCommand[]>;
  /** Recent command names */
  recentCommands: string[];
  /** Favorite command names */
  favoriteCommands: string[];
  /** Custom commands from integrations */
  customCommands: CustomCommand[];
  /** Check if input is a slash command */
  isSlashCommand: (input: string) => boolean;
  /** Check if user is typing a command */
  isTypingCommand: (input: string) => boolean;
  /** Get partial command being typed */
  getPartialCommand: (input: string) => string;
  /** Get command by name */
  getCommand: (name: string) => SlashCommand | undefined;
  /** Parse command input */
  parseInput: (input: string) => ParsedCommand;
  /** Execute a command */
  execute: (input: string) => Promise<CommandResult>;
  /** Execute parsed command */
  executeParsed: (parsed: ParsedCommand) => Promise<CommandResult>;
  /** Validate command can be executed */
  validateCommand: (command: SlashCommand) => {
    valid: boolean;
    errors: string[];
  };
  /** Toggle command favorite */
  toggleFavorite: (commandName: string) => void;
  /** Check if command is favorited */
  isFavorite: (commandName: string) => boolean;
  /** Menu state */
  menuState: {
    isOpen: boolean;
    filter: string;
    selectedIndex: number;
  };
  /** Open command menu */
  openMenu: (triggerPosition?: number) => void;
  /** Close command menu */
  closeMenu: () => void;
  /** Set menu filter */
  setFilter: (filter: string) => void;
  /** Set selected index */
  setSelectedIndex: (index: number) => void;
  /** Move selection up/down */
  moveSelection: (direction: "up" | "down", maxIndex: number) => void;
  /** Select current command (for keyboard navigation) */
  selectCurrent: () => SlashCommand | undefined;
}

// ============================================================================
// Hook
// ============================================================================

export function useCommands(
  options: UseCommandsOptions = {},
): UseCommandsResult {
  const {
    channelId,
    channelName,
    threadId,
    userId = "",
    userName = "",
    userRole = "member",
    enabledFeatures = [],
    onExecute,
    onSendMessage,
    onNavigate,
    onOpenModal,
  } = options;

  // Check if slash commands feature is enabled
  const isEnabled = useFeatureEnabled(FEATURES.SLASH_COMMANDS);

  // Get store state and actions
  const menuState = useCommandStore(selectMenuState);
  const recentCommands = useCommandStore(selectRecentCommandNames);
  const favorites = useCommandStore(selectFavorites);
  const customCommands = useCommandStore(selectEnabledCustomCommands);

  const {
    openMenu,
    closeMenu,
    setFilter,
    setSelectedIndex,
    addToHistory,
    toggleFavorite: toggleFavoriteAction,
    isFavorite: isFavoriteCheck,
    addPendingEffect,
    setExecuting,
    setError,
  } = useCommandStore();

  // Build validation context
  const validationContext = useMemo<ValidationContext>(
    () => ({
      channelId,
      userRole,
      enabledFeatures,
    }),
    [channelId, userRole, enabledFeatures],
  );

  // Build execution context
  const executionContext = useMemo<CommandContext>(
    () => ({
      userId,
      userName,
      userRole,
      channelId,
      channelName,
      threadId,
    }),
    [userId, userName, userRole, channelId, channelName, threadId],
  );

  // Filter available commands based on features and permissions
  const availableCommands = useMemo(() => {
    if (!isEnabled) return [];

    return COMMANDS.filter((cmd) => {
      // Skip hidden commands
      if (cmd.hidden) return false;

      // Check feature requirement
      if (
        cmd.requiredFeature &&
        !enabledFeatures.includes(cmd.requiredFeature)
      ) {
        return false;
      }

      // Check permission requirement
      if (cmd.requiresPermission) {
        const roleHierarchy = [
          "guest",
          "member",
          "moderator",
          "admin",
          "owner",
        ];
        const requiredLevel = roleHierarchy.indexOf(cmd.requiresPermission);
        const userLevel = roleHierarchy.indexOf(userRole);
        if (userLevel < requiredLevel) return false;
      }

      // Check channel requirement
      if (cmd.requiresChannel && !channelId) {
        return false;
      }

      return true;
    });
  }, [isEnabled, enabledFeatures, userRole, channelId]);

  // Filter commands by search query
  const filteredCommands = useMemo(() => {
    const filter = menuState.filter.toLowerCase();
    if (!filter) return availableCommands;

    return availableCommands.filter((cmd) => {
      return (
        cmd.name.includes(filter) ||
        cmd.description.toLowerCase().includes(filter) ||
        cmd.aliases?.some((alias) => alias.includes(filter))
      );
    });
  }, [availableCommands, menuState.filter]);

  // Group commands by category
  const commandsByCategory = useMemo(() => {
    const map = new Map<CommandCategory, SlashCommand[]>();
    const categories = getCommandCategoriesInOrder();

    for (const category of categories) {
      const commands = filteredCommands.filter(
        (cmd) => cmd.category === category,
      );
      if (commands.length > 0) {
        map.set(category, commands);
      }
    }

    return map;
  }, [filteredCommands]);

  // Check if input is a slash command
  const isSlashCommand = useCallback((input: string) => {
    return isCommandInput(input);
  }, []);

  // Check if user is typing a command
  const isTypingCommandCheck = useCallback((input: string) => {
    return isTypingCommand(input);
  }, []);

  // Get partial command being typed
  const getPartialCommand = useCallback((input: string) => {
    return extractPartialCommand(input);
  }, []);

  // Get command by name
  const getCommand = useCallback((name: string) => {
    return getCommandByName(name);
  }, []);

  // Parse command input
  const parseInput = useCallback((input: string) => {
    return parseCommand(input);
  }, []);

  // Validate command
  const validateCommand = useCallback(
    (command: SlashCommand) => {
      return validateCommandContext(command, validationContext);
    },
    [validationContext],
  );

  // Execute command
  const execute = useCallback(
    async (input: string): Promise<CommandResult> => {
      if (!isEnabled) {
        return {
          success: false,
          type: "error",
          error: "Slash commands are not enabled.",
        };
      }

      const parsed = parseCommand(input);
      return executeParsed(parsed);
    },
    [isEnabled],
  );

  // Execute parsed command
  const executeParsed = useCallback(
    async (parsed: ParsedCommand): Promise<CommandResult> => {
      if (!isEnabled) {
        return {
          success: false,
          type: "error",
          error: "Slash commands are not enabled.",
        };
      }

      setExecuting(true);
      setError(null);

      try {
        const result = await executeCommandAction(parsed, executionContext);

        // Add to history
        addToHistory({
          commandString: parsed.commandString,
          commandName: parsed.commandName,
          executedAt: Date.now(),
          success: result.success,
          channelId,
        });

        // Handle effects
        if (result.success && result.effects) {
          for (const effect of result.effects) {
            handleEffect(effect);
          }
        }

        // Call onExecute callback
        onExecute?.(result);

        // Handle result based on type
        if (result.success) {
          switch (result.type) {
            case "message":
              if (result.data?.messageContent) {
                onSendMessage?.(
                  result.data.messageContent,
                  result.data.messageType as "text" | "action" | "system",
                );
              }
              break;
            case "navigation":
              if (result.data?.navigateTo) {
                onNavigate?.(result.data.navigateTo);
              }
              break;
            case "modal":
              if (result.data?.modal) {
                onOpenModal?.(
                  result.data.modal.type,
                  result.data.modal.data as Record<string, unknown>,
                );
              }
              break;
          }
        }

        setExecuting(false);
        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred.";
        setError(errorMessage);
        setExecuting(false);

        return {
          success: false,
          type: "error",
          error: errorMessage,
        };
      }
    },
    [
      isEnabled,
      executionContext,
      channelId,
      setExecuting,
      setError,
      addToHistory,
      onExecute,
      onSendMessage,
      onNavigate,
      onOpenModal,
    ],
  );

  // Handle command effect
  const handleEffect = useCallback(
    (effect: CommandEffect) => {
      // Add to pending effects for later processing
      addPendingEffect({
        commandName: "unknown", // Will be set by caller
        effect,
        executeAt: undefined,
      });
    },
    [addPendingEffect],
  );

  // Move selection with bounds checking
  const moveSelection = useCallback(
    (direction: "up" | "down", maxIndex: number) => {
      const currentIndex = menuState.selectedIndex;
      if (direction === "up") {
        setSelectedIndex(Math.max(0, currentIndex - 1));
      } else {
        setSelectedIndex(Math.min(maxIndex, currentIndex + 1));
      }
    },
    [menuState.selectedIndex, setSelectedIndex],
  );

  // Select current command
  const selectCurrent = useCallback(() => {
    if (filteredCommands.length === 0) return undefined;
    const index = Math.min(
      menuState.selectedIndex,
      filteredCommands.length - 1,
    );
    return filteredCommands[index];
  }, [filteredCommands, menuState.selectedIndex]);

  // Toggle favorite
  const toggleFavorite = useCallback(
    (commandName: string) => {
      toggleFavoriteAction(commandName);
    },
    [toggleFavoriteAction],
  );

  // Check if favorite
  const isFavorite = useCallback(
    (commandName: string) => {
      return isFavoriteCheck(commandName);
    },
    [isFavoriteCheck],
  );

  return {
    isEnabled,
    availableCommands,
    filteredCommands,
    commandsByCategory,
    recentCommands,
    favoriteCommands: favorites,
    customCommands,
    isSlashCommand,
    isTypingCommand: isTypingCommandCheck,
    getPartialCommand,
    getCommand,
    parseInput,
    execute,
    executeParsed,
    validateCommand,
    toggleFavorite,
    isFavorite,
    menuState: {
      isOpen: menuState.isOpen,
      filter: menuState.filter,
      selectedIndex: menuState.selectedIndex,
    },
    openMenu,
    closeMenu,
    setFilter,
    setSelectedIndex,
    moveSelection,
    selectCurrent,
  };
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook to get a single command by name
 */
export function useCommand(name: string): SlashCommand | undefined {
  return useMemo(() => getCommandByName(name), [name]);
}

/**
 * Hook to get commands in a category
 */
export function useCommandCategory(category: CommandCategory): SlashCommand[] {
  return useMemo(() => getCommandsByCategory(category), [category]);
}

/**
 * Hook to search commands
 */
export function useCommandSearch(query: string): SlashCommand[] {
  return useMemo(() => {
    if (!query) return [];
    return searchCommands(query);
  }, [query]);
}
