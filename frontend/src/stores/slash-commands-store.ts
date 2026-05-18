/**
 * Slash Commands Store
 *
 * Zustand store for managing slash commands state
 */

import { create } from "zustand";
import { devtools, subscribeWithSelector, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type {
  SlashCommand,
  CommandDraft,
  CommandCategory,
  CommandExecution,
  CommandSuggestion,
  CommandContext,
  CommandResult,
  SlashCommandsState,
} from "@/lib/slash-commands/command-types";
import {
  initializeRegistry,
  registerCommand,
  unregisterCommand,
  registerCustomCommands,
  getAllCommands,
  getBuiltInCommands,
  getCustomCommands,
  getCommandsByCategory,
  getCommandSuggestions,
  executeCommand,
} from "@/lib/slash-commands";

// ============================================================================
// Types
// ============================================================================

export interface SlashCommandsActions {
  // Initialization
  initialize: () => void;

  // Command Management
  loadCustomCommands: (commands: SlashCommand[]) => void;
  addCommand: (command: SlashCommand) => void;
  updateCommand: (id: string, updates: Partial<SlashCommand>) => void;
  removeCommand: (id: string) => void;
  enableCommand: (id: string) => void;
  disableCommand: (id: string) => void;

  // Command Builder
  startEditing: (command?: CommandDraft) => void;
  updateDraft: (updates: Partial<CommandDraft>) => void;
  saveDraft: (createdBy: string) => SlashCommand | null;
  cancelEditing: () => void;

  // Command Execution
  execute: (
    input: string,
    context: Omit<CommandContext, "args" | "flags" | "rawInput" | "timestamp">,
  ) => Promise<CommandResult>;
  addExecution: (execution: CommandExecution) => void;
  clearExecutionHistory: () => void;

  // Search & Filter
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: CommandCategory | "all") => void;
  getSuggestions: (
    input: string,
    options?: {
      channelType?: "public" | "private" | "direct" | "group";
      userRole?: "owner" | "admin" | "moderator" | "member" | "guest";
    },
  ) => CommandSuggestion[];

  // Loading State
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Reset
  reset: () => void;
}

export type SlashCommandsStore = SlashCommandsState & SlashCommandsActions;

// ============================================================================
// Initial State
// ============================================================================

const initialState: SlashCommandsState = {
  commands: new Map(),
  commandsByTrigger: new Map(),
  builtInCommands: [],
  customCommands: [],
  editingCommand: null,
  isLoading: false,
  error: null,
  executionHistory: [],
  searchQuery: "",
  selectedCategory: "all",
};

// ============================================================================
// Store
// ============================================================================

export const useSlashCommandsStore = create<SlashCommandsStore>()(
  devtools(
    subscribeWithSelector(
      persist(
        immer((set, get) => ({
          ...initialState,

          // --------------------------------
          // Initialization
          // --------------------------------
          initialize: () => {
            // Initialize the registry
            initializeRegistry();

            // Get built-in commands
            const builtIn = getBuiltInCommands();
            const all = getAllCommands();

            set(
              (state) => {
                state.builtInCommands = builtIn;
                state.commands = new Map(all.map((c) => [c.id, c]));
                state.commandsByTrigger = new Map(
                  all.flatMap((c) => [
                    [c.trigger, c],
                    ...(c.aliases?.map(
                      (a) => [a, c] as [string, SlashCommand],
                    ) || []),
                  ]),
                );
              },
              false,
              "slashCommands/initialize",
            );
          },

          // --------------------------------
          // Command Management
          // --------------------------------
          loadCustomCommands: (commands) => {
            // Register with the registry
            registerCustomCommands(commands);

            set(
              (state) => {
                state.customCommands = commands;
                // Update commands map
                for (const cmd of commands) {
                  state.commands.set(cmd.id, cmd);
                  state.commandsByTrigger.set(cmd.trigger, cmd);
                  cmd.aliases?.forEach((alias) => {
                    state.commandsByTrigger.set(alias, cmd);
                  });
                }
              },
              false,
              "slashCommands/loadCustomCommands",
            );
          },

          addCommand: (command) => {
            // Register with the registry
            registerCommand(command);

            set(
              (state) => {
                state.commands.set(command.id, command);
                state.commandsByTrigger.set(command.trigger, command);
                command.aliases?.forEach((alias) => {
                  state.commandsByTrigger.set(alias, command);
                });
                if (!command.isBuiltIn) {
                  state.customCommands.push(command);
                }
              },
              false,
              "slashCommands/addCommand",
            );
          },

          updateCommand: (id, updates) => {
            const command = get().commands.get(id);
            if (!command || command.isBuiltIn) return;

            const updatedCommand: SlashCommand = {
              ...command,
              ...updates,
              updatedAt: new Date().toISOString(),
            };

            // Re-register with registry
            unregisterCommand(id);
            registerCommand(updatedCommand);

            set(
              (state) => {
                // Remove old trigger mappings
                state.commandsByTrigger.delete(command.trigger);
                command.aliases?.forEach((alias) => {
                  state.commandsByTrigger.delete(alias);
                });

                // Add updated command
                state.commands.set(id, updatedCommand);
                state.commandsByTrigger.set(
                  updatedCommand.trigger,
                  updatedCommand,
                );
                updatedCommand.aliases?.forEach((alias) => {
                  state.commandsByTrigger.set(alias, updatedCommand);
                });

                // Update custom commands list
                const index = state.customCommands.findIndex(
                  (c) => c.id === id,
                );
                if (index >= 0) {
                  state.customCommands[index] = updatedCommand;
                }
              },
              false,
              "slashCommands/updateCommand",
            );
          },

          removeCommand: (id) => {
            const command = get().commands.get(id);
            if (!command || command.isBuiltIn) return;

            // Unregister from registry
            unregisterCommand(id);

            set(
              (state) => {
                state.commands.delete(id);
                state.commandsByTrigger.delete(command.trigger);
                command.aliases?.forEach((alias) => {
                  state.commandsByTrigger.delete(alias);
                });
                state.customCommands = state.customCommands.filter(
                  (c) => c.id !== id,
                );
              },
              false,
              "slashCommands/removeCommand",
            );
          },

          enableCommand: (id) => {
            get().updateCommand(id, { isEnabled: true });
          },

          disableCommand: (id) => {
            get().updateCommand(id, { isEnabled: false });
          },

          // --------------------------------
          // Command Builder
          // --------------------------------
          startEditing: (command) => {
            set(
              (state) => {
                state.editingCommand = command || {
                  trigger: "",
                  arguments: [],
                  permissions: {
                    minRole: "member",
                    allowGuests: false,
                  },
                  channels: {
                    allowedTypes: ["public", "private", "direct", "group"],
                    allowInThreads: true,
                  },
                  responseConfig: {
                    type: "ephemeral",
                    ephemeral: true,
                    showTyping: false,
                  },
                  actionType: "message",
                  action: {
                    type: "message",
                  },
                  isEnabled: true,
                  isBuiltIn: false,
                };
              },
              false,
              "slashCommands/startEditing",
            );
          },

          updateDraft: (updates) => {
            set(
              (state) => {
                if (state.editingCommand) {
                  state.editingCommand = {
                    ...state.editingCommand,
                    ...updates,
                  };
                }
              },
              false,
              "slashCommands/updateDraft",
            );
          },

          saveDraft: (createdBy) => {
            const draft = get().editingCommand;
            if (!draft || !draft.trigger) return null;

            const now = new Date().toISOString();
            const id = draft.id || `custom-${draft.trigger}-${Date.now()}`;

            const command: SlashCommand = {
              id,
              trigger: draft.trigger,
              aliases: draft.aliases,
              name: draft.name || draft.trigger,
              description: draft.description || "",
              helpText: draft.helpText,
              usage: draft.usage,
              category: draft.category || "custom",
              arguments: draft.arguments || [],
              permissions: draft.permissions || {
                minRole: "member",
                allowGuests: false,
              },
              channels: draft.channels || {
                allowedTypes: ["public", "private", "direct", "group"],
                allowInThreads: true,
              },
              responseConfig: draft.responseConfig || {
                type: "ephemeral",
                ephemeral: true,
                showTyping: false,
              },
              webhook: draft.webhook,
              workflow: draft.workflow,
              actionType: draft.actionType || "message",
              action: draft.action || { type: "message" },
              isEnabled: draft.isEnabled ?? true,
              isBuiltIn: false,
              icon: draft.icon,
              order: draft.order,
              cooldown: draft.cooldown,
              createdAt: draft.id
                ? get().commands.get(draft.id)?.createdAt || now
                : now,
              updatedAt: now,
              createdBy,
            };

            // Add or update command
            if (get().commands.has(id)) {
              get().updateCommand(id, command);
            } else {
              get().addCommand(command);
            }

            // Clear editing state
            set(
              (state) => {
                state.editingCommand = null;
              },
              false,
              "slashCommands/saveDraft",
            );

            return command;
          },

          cancelEditing: () => {
            set(
              (state) => {
                state.editingCommand = null;
              },
              false,
              "slashCommands/cancelEditing",
            );
          },

          // --------------------------------
          // Command Execution
          // --------------------------------
          execute: async (input, context) => {
            const startTime = Date.now();
            const result = await executeCommand(input, context);
            const duration = Date.now() - startTime;

            // Extract trigger from input
            const triggerMatch = input.trim().match(/^\/(\S+)/);
            const trigger = triggerMatch?.[1] || "";
            const command = get().commandsByTrigger.get(trigger);

            // Record execution
            const execution: CommandExecution = {
              id: `exec-${Date.now()}`,
              commandId: command?.id || "",
              trigger,
              userId: context.userId,
              channelId: context.channelId,
              input,
              result,
              executedAt: new Date().toISOString(),
              duration,
            };

            get().addExecution(execution);

            return result;
          },

          addExecution: (execution) => {
            set(
              (state) => {
                state.executionHistory = [
                  execution,
                  ...state.executionHistory.slice(0, 99), // Keep last 100
                ];
              },
              false,
              "slashCommands/addExecution",
            );
          },

          clearExecutionHistory: () => {
            set(
              (state) => {
                state.executionHistory = [];
              },
              false,
              "slashCommands/clearExecutionHistory",
            );
          },

          // --------------------------------
          // Search & Filter
          // --------------------------------
          setSearchQuery: (query) => {
            set(
              (state) => {
                state.searchQuery = query;
              },
              false,
              "slashCommands/setSearchQuery",
            );
          },

          setSelectedCategory: (category) => {
            set(
              (state) => {
                state.selectedCategory = category;
              },
              false,
              "slashCommands/setSelectedCategory",
            );
          },

          getSuggestions: (input, options) => {
            return getCommandSuggestions(input, {
              limit: 10,
              channelType: options?.channelType,
              userRole: options?.userRole,
            });
          },

          // --------------------------------
          // Loading State
          // --------------------------------
          setLoading: (loading) => {
            set(
              (state) => {
                state.isLoading = loading;
              },
              false,
              "slashCommands/setLoading",
            );
          },

          setError: (error) => {
            set(
              (state) => {
                state.error = error;
              },
              false,
              "slashCommands/setError",
            );
          },

          // --------------------------------
          // Reset
          // --------------------------------
          reset: () => {
            set(
              () => ({
                ...initialState,
                commands: new Map(),
                commandsByTrigger: new Map(),
              }),
              false,
              "slashCommands/reset",
            );
          },
        })),
        {
          name: "nchat-slash-commands",
          // Only persist custom commands and execution history
          partialize: (state) => ({
            customCommands: state.customCommands,
            executionHistory: state.executionHistory.slice(0, 50),
          }),
          // Rehydrate Maps from persisted data
          onRehydrateStorage: () => (state) => {
            if (state) {
              // Re-initialize after rehydration
              state.initialize();
              if (state.customCommands.length > 0) {
                state.loadCustomCommands(state.customCommands);
              }
            }
          },
        },
      ),
    ),
    { name: "slash-commands-store" },
  ),
);

// ============================================================================
// Selectors
// ============================================================================

export const selectAllCommands = (state: SlashCommandsStore) =>
  Array.from(state.commands.values());

export const selectEnabledCommands = (state: SlashCommandsStore) =>
  Array.from(state.commands.values()).filter((c) => c.isEnabled);

export const selectBuiltInCommands = (state: SlashCommandsStore) =>
  state.builtInCommands;

export const selectCustomCommands = (state: SlashCommandsStore) =>
  state.customCommands;

export const selectCommandById = (id: string) => (state: SlashCommandsStore) =>
  state.commands.get(id);

export const selectCommandByTrigger =
  (trigger: string) => (state: SlashCommandsStore) =>
    state.commandsByTrigger.get(trigger.toLowerCase());

export const selectFilteredCommands = (state: SlashCommandsStore) => {
  let commands = Array.from(state.commands.values());

  // Filter by category
  if (state.selectedCategory !== "all") {
    commands = commands.filter((c) => c.category === state.selectedCategory);
  }

  // Filter by search query
  if (state.searchQuery) {
    const query = state.searchQuery.toLowerCase();
    commands = commands.filter(
      (c) =>
        c.trigger.toLowerCase().includes(query) ||
        c.name.toLowerCase().includes(query) ||
        c.description.toLowerCase().includes(query) ||
        c.aliases?.some((a) => a.toLowerCase().includes(query)),
    );
  }

  // Sort by order, then by name
  return commands.sort((a, b) => {
    if (a.order !== undefined && b.order !== undefined) {
      return a.order - b.order;
    }
    if (a.order !== undefined) return -1;
    if (b.order !== undefined) return 1;
    return a.name.localeCompare(b.name);
  });
};

export const selectIsEditing = (state: SlashCommandsStore) =>
  state.editingCommand !== null;

export const selectEditingCommand = (state: SlashCommandsStore) =>
  state.editingCommand;

export const selectRecentExecutions =
  (count = 10) =>
  (state: SlashCommandsStore) =>
    state.executionHistory.slice(0, count);

// ============================================================================
// Hooks
// ============================================================================

/**
 * Initialize the store on first use
 */
export function useInitializeSlashCommands() {
  const initialize = useSlashCommandsStore((state) => state.initialize);
  const isInitialized = useSlashCommandsStore(
    (state) => state.commands.size > 0,
  );

  if (!isInitialized) {
    initialize();
  }
}
