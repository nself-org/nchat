/**
 * Command Palette Store
 *
 * Zustand store for managing command palette state
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import type {
  Command,
  CommandPaletteState,
  CommandPaletteActions,
  CommandPaletteStore,
  CommandExecutionContext,
  CommandCategory,
} from "@/lib/command-palette/command-types";

import {
  getCommandRegistry,
  searchCommands,
  getCommandHistory,
  getCommandExecutor,
  filterByCategory,
  detectQueryMode,
} from "@/lib/command-palette";

// ============================================================================
// Initial State
// ============================================================================

const initialState: CommandPaletteState = {
  isOpen: false,
  query: "",
  mode: "all",
  selectedIndex: 0,
  isLoading: false,
  error: null,
  filteredCommands: [],
  recentCommands: [],
  showRecent: true,
};

// ============================================================================
// Store
// ============================================================================

export const useCommandPaletteStore = create<CommandPaletteStore>()(
  devtools(
    immer((set, get) => ({
      ...initialState,

      // ============================================================================
      // Open/Close/Toggle
      // ============================================================================

      open: (mode = "all") =>
        set(
          (state) => {
            state.isOpen = true;
            state.mode = mode;
            state.query = "";
            state.selectedIndex = 0;
            state.showRecent = true;
            state.error = null;

            // Load recent commands
            const history = getCommandHistory();
            const registry = getCommandRegistry();
            const allCommands = registry.getAll();
            state.recentCommands = history.filterRecentCommands(allCommands);

            // Set initial filtered commands
            if (mode === "all") {
              state.filteredCommands =
                state.recentCommands.length > 0
                  ? state.recentCommands
                  : allCommands.slice(0, 10);
            } else {
              const categoryMap: Record<string, CommandCategory> = {
                channels: "channel",
                dms: "dm",
                users: "user",
                search: "search",
                actions: "action",
              };
              const category = categoryMap[mode] || (mode as CommandCategory);
              state.filteredCommands = filterByCategory(allCommands, category);
            }
          },
          false,
          "commandPalette/open",
        ),

      close: () =>
        set(
          (state) => {
            state.isOpen = false;
            state.query = "";
            state.selectedIndex = 0;
            state.error = null;
          },
          false,
          "commandPalette/close",
        ),

      toggle: () => {
        const { isOpen } = get();
        if (isOpen) {
          get().close();
        } else {
          get().open();
        }
      },

      // ============================================================================
      // Query & Mode
      // ============================================================================

      setQuery: (query) =>
        set(
          (state) => {
            state.query = query;
            state.selectedIndex = 0;
            state.showRecent = query.length === 0;

            // Detect mode from query prefix
            const { mode: detectedMode, cleanQuery } = detectQueryMode(query);

            if (detectedMode !== "all" && detectedMode !== state.mode) {
              state.mode = detectedMode as CommandPaletteState["mode"];
            }

            // Search commands
            const registry = getCommandRegistry();
            const allCommands = registry.getAll();

            const searchQuery = detectedMode !== "all" ? cleanQuery : query;

            if (searchQuery.length === 0 && state.mode === "all") {
              // Show recent when no query
              const history = getCommandHistory();
              state.recentCommands = history.filterRecentCommands(allCommands);
              state.filteredCommands =
                state.recentCommands.length > 0
                  ? state.recentCommands
                  : allCommands.slice(0, 10);
            } else {
              // Filter by mode if not 'all'
              const categoryMap: Record<string, CommandCategory> = {
                channels: "channel",
                dms: "dm",
                users: "user",
                search: "search",
                actions: "action",
              };

              const categories: CommandCategory[] =
                state.mode !== "all"
                  ? [categoryMap[state.mode] || (state.mode as CommandCategory)]
                  : [];

              const results = searchCommands(allCommands, searchQuery, {
                categories,
                limit: 50,
              });

              state.filteredCommands = results.map((r) => r.command);
            }
          },
          false,
          "commandPalette/setQuery",
        ),

      setMode: (mode) =>
        set(
          (state) => {
            state.mode = mode;
            state.selectedIndex = 0;

            // Re-filter commands
            const registry = getCommandRegistry();
            const allCommands = registry.getAll();

            if (mode === "all") {
              if (state.query.length === 0) {
                const history = getCommandHistory();
                state.recentCommands =
                  history.filterRecentCommands(allCommands);
                state.filteredCommands =
                  state.recentCommands.length > 0
                    ? state.recentCommands
                    : allCommands.slice(0, 10);
              } else {
                const results = searchCommands(allCommands, state.query);
                state.filteredCommands = results.map((r) => r.command);
              }
            } else {
              const categoryMap: Record<string, CommandCategory> = {
                channels: "channel",
                dms: "dm",
                users: "user",
                search: "search",
                actions: "action",
              };
              const category = categoryMap[mode] || (mode as CommandCategory);
              const filtered = filterByCategory(allCommands, category);

              if (state.query.length > 0) {
                const results = searchCommands(filtered, state.query);
                state.filteredCommands = results.map((r) => r.command);
              } else {
                state.filteredCommands = filtered;
              }
            }
          },
          false,
          "commandPalette/setMode",
        ),

      // ============================================================================
      // Selection
      // ============================================================================

      selectNext: () =>
        set(
          (state) => {
            const maxIndex = state.filteredCommands.length - 1;
            state.selectedIndex = Math.min(state.selectedIndex + 1, maxIndex);
          },
          false,
          "commandPalette/selectNext",
        ),

      selectPrevious: () =>
        set(
          (state) => {
            state.selectedIndex = Math.max(state.selectedIndex - 1, 0);
          },
          false,
          "commandPalette/selectPrevious",
        ),

      selectIndex: (index) =>
        set(
          (state) => {
            const maxIndex = state.filteredCommands.length - 1;
            state.selectedIndex = Math.max(0, Math.min(index, maxIndex));
          },
          false,
          "commandPalette/selectIndex",
        ),

      // ============================================================================
      // Execution
      // ============================================================================

      executeSelected: (context) => {
        const { filteredCommands, selectedIndex } = get();
        const command = filteredCommands[selectedIndex];

        if (command) {
          get().executeCommand(command.id, context);
        }
      },

      executeCommand: async (commandId, context) => {
        const registry = getCommandRegistry();
        const command = registry.get(commandId);

        if (!command) {
          set(
            (state) => {
              state.error = `Command not found: ${commandId}`;
            },
            false,
            "commandPalette/executeCommand/notFound",
          );
          return;
        }

        set(
          (state) => {
            state.isLoading = true;
            state.error = null;
          },
          false,
          "commandPalette/executeCommand/start",
        );

        try {
          const executor = getCommandExecutor();
          const result = await executor.execute(command, context);

          if (result.success) {
            // Add to history
            get().addToHistory(commandId);

            // Close palette
            get().close();
          } else {
            set(
              (state) => {
                state.error = result.error || "Command execution failed";
                state.isLoading = false;
              },
              false,
              "commandPalette/executeCommand/error",
            );
          }
        } catch (error) {
          set(
            (state) => {
              state.error =
                error instanceof Error ? error.message : "Unknown error";
              state.isLoading = false;
            },
            false,
            "commandPalette/executeCommand/catch",
          );
        }
      },

      // ============================================================================
      // History
      // ============================================================================

      addToHistory: (commandId) => {
        const history = getCommandHistory();
        history.add(commandId);

        // Update recent commands
        const registry = getCommandRegistry();
        const allCommands = registry.getAll();

        set(
          (state) => {
            state.recentCommands = history.filterRecentCommands(allCommands);
          },
          false,
          "commandPalette/addToHistory",
        );
      },

      clearHistory: () => {
        const history = getCommandHistory();
        history.clear();

        set(
          (state) => {
            state.recentCommands = [];
          },
          false,
          "commandPalette/clearHistory",
        );
      },

      // ============================================================================
      // State Management
      // ============================================================================

      setFilteredCommands: (commands) =>
        set(
          (state) => {
            state.filteredCommands = commands;
            state.selectedIndex = 0;
          },
          false,
          "commandPalette/setFilteredCommands",
        ),

      setLoading: (loading) =>
        set(
          (state) => {
            state.isLoading = loading;
          },
          false,
          "commandPalette/setLoading",
        ),

      setError: (error) =>
        set(
          (state) => {
            state.error = error;
          },
          false,
          "commandPalette/setError",
        ),

      reset: () => set(() => initialState, false, "commandPalette/reset"),
    })),
    { name: "command-palette-store" },
  ),
);

// ============================================================================
// Selectors
// ============================================================================

export const selectIsOpen = (state: CommandPaletteStore) => state.isOpen;

export const selectQuery = (state: CommandPaletteStore) => state.query;

export const selectMode = (state: CommandPaletteStore) => state.mode;

export const selectSelectedIndex = (state: CommandPaletteStore) =>
  state.selectedIndex;

export const selectSelectedCommand = (
  state: CommandPaletteStore,
): Command | null => {
  const { filteredCommands, selectedIndex } = state;
  return filteredCommands[selectedIndex] || null;
};

export const selectFilteredCommands = (state: CommandPaletteStore) =>
  state.filteredCommands;

export const selectRecentCommands = (state: CommandPaletteStore) =>
  state.recentCommands;

export const selectIsLoading = (state: CommandPaletteStore) => state.isLoading;

export const selectError = (state: CommandPaletteStore) => state.error;

export const selectShowRecent = (state: CommandPaletteStore) =>
  state.showRecent;

export const selectHasResults = (state: CommandPaletteStore) =>
  state.filteredCommands.length > 0;

// ============================================================================
// Helper Types
// ============================================================================

export type { CommandPaletteState, CommandPaletteActions, CommandPaletteStore };
