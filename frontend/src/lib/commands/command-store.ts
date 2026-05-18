/**
 * Command Store - Zustand store for slash command state management
 *
 * Manages command history, favorites, custom commands, and execution state.
 *
 * @example
 * ```typescript
 * import { useCommandStore } from '@/lib/commands/command-store'
 *
 * const { history, addToHistory, favorites, toggleFavorite } = useCommandStore()
 * ```
 */

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type { SlashCommand } from "./commands";
import type { CommandResult, CommandEffect } from "./command-executor";
import type { ParsedCommand } from "./command-parser";

// ============================================================================
// Types
// ============================================================================

/**
 * Custom command definition (from integrations/bots)
 */
export interface CustomCommand extends Omit<SlashCommand, "category"> {
  /** Category is always 'custom' for custom commands */
  category: "custom";
  /** Source of the custom command */
  source: "integration" | "bot" | "user";
  /** Integration/bot ID that provided the command */
  sourceId: string;
  /** API endpoint to call for this command */
  endpoint?: string;
  /** Whether the command is enabled */
  enabled: boolean;
  /** When the command was added */
  createdAt: number;
}

/**
 * Command history entry
 */
export interface CommandHistoryEntry {
  /** Unique ID for the history entry */
  id: string;
  /** The full command string as entered */
  commandString: string;
  /** The command name */
  commandName: string;
  /** When the command was executed */
  executedAt: number;
  /** Whether the execution was successful */
  success: boolean;
  /** Channel/context where the command was executed */
  channelId?: string;
}

/**
 * Pending command effect to be executed
 */
export interface PendingEffect {
  /** Unique ID for the pending effect */
  id: string;
  /** The command that generated this effect */
  commandName: string;
  /** The effect to execute */
  effect: CommandEffect;
  /** When to execute (for delayed effects like reminders) */
  executeAt?: number;
  /** Whether the effect has been executed */
  executed: boolean;
}

/**
 * Command menu state
 */
export interface CommandMenuState {
  /** Whether the command menu is open */
  isOpen: boolean;
  /** Current filter/search query */
  filter: string;
  /** Currently selected command index */
  selectedIndex: number;
  /** Input position where "/" was typed */
  triggerPosition: number;
}

/**
 * Command preview state
 */
export interface CommandPreviewState {
  /** Whether preview is visible */
  isVisible: boolean;
  /** The parsed command being previewed */
  parsedCommand: ParsedCommand | null;
  /** The preview result */
  result: CommandResult | null;
  /** Loading state */
  isLoading: boolean;
}

// ============================================================================
// Store State & Actions
// ============================================================================

export interface CommandState {
  // Command Menu
  menu: CommandMenuState;

  // Preview
  preview: CommandPreviewState;

  // History
  history: CommandHistoryEntry[];
  maxHistoryLength: number;

  // Favorites
  favorites: string[];

  // Custom Commands
  customCommands: CustomCommand[];

  // Pending Effects
  pendingEffects: PendingEffect[];

  // Execution State
  isExecuting: boolean;
  lastError: string | null;
}

export interface CommandActions {
  // Menu Actions
  openMenu: (triggerPosition?: number) => void;
  closeMenu: () => void;
  setFilter: (filter: string) => void;
  setSelectedIndex: (index: number) => void;
  moveSelection: (direction: "up" | "down") => void;

  // Preview Actions
  showPreview: (parsedCommand: ParsedCommand, result: CommandResult) => void;
  hidePreview: () => void;
  setPreviewLoading: (loading: boolean) => void;

  // History Actions
  addToHistory: (entry: Omit<CommandHistoryEntry, "id">) => void;
  clearHistory: () => void;
  removeFromHistory: (id: string) => void;
  getRecentCommands: (limit?: number) => CommandHistoryEntry[];

  // Favorites Actions
  addFavorite: (commandName: string) => void;
  removeFavorite: (commandName: string) => void;
  toggleFavorite: (commandName: string) => void;
  isFavorite: (commandName: string) => boolean;

  // Custom Commands Actions
  addCustomCommand: (command: Omit<CustomCommand, "createdAt">) => void;
  removeCustomCommand: (name: string) => void;
  updateCustomCommand: (name: string, updates: Partial<CustomCommand>) => void;
  toggleCustomCommand: (name: string) => void;
  getCustomCommand: (name: string) => CustomCommand | undefined;

  // Effect Actions
  addPendingEffect: (effect: Omit<PendingEffect, "id" | "executed">) => void;
  markEffectExecuted: (id: string) => void;
  removePendingEffect: (id: string) => void;
  getReadyEffects: () => PendingEffect[];

  // Execution Actions
  setExecuting: (executing: boolean) => void;
  setError: (error: string | null) => void;

  // Reset
  reset: () => void;
}

export type CommandStore = CommandState & CommandActions;

// ============================================================================
// Initial State
// ============================================================================

const initialState: CommandState = {
  menu: {
    isOpen: false,
    filter: "",
    selectedIndex: 0,
    triggerPosition: 0,
  },
  preview: {
    isVisible: false,
    parsedCommand: null,
    result: null,
    isLoading: false,
  },
  history: [],
  maxHistoryLength: 100,
  favorites: [],
  customCommands: [],
  pendingEffects: [],
  isExecuting: false,
  lastError: null,
};

// ============================================================================
// Store
// ============================================================================

export const useCommandStore = create<CommandStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        // -----------------------------------------------------------------------
        // Menu Actions
        // -----------------------------------------------------------------------
        openMenu: (triggerPosition = 0) =>
          set(
            (state) => {
              state.menu.isOpen = true;
              state.menu.filter = "";
              state.menu.selectedIndex = 0;
              state.menu.triggerPosition = triggerPosition;
            },
            false,
            "command/openMenu",
          ),

        closeMenu: () =>
          set(
            (state) => {
              state.menu.isOpen = false;
              state.menu.filter = "";
              state.menu.selectedIndex = 0;
            },
            false,
            "command/closeMenu",
          ),

        setFilter: (filter) =>
          set(
            (state) => {
              state.menu.filter = filter;
              state.menu.selectedIndex = 0;
            },
            false,
            "command/setFilter",
          ),

        setSelectedIndex: (index) =>
          set(
            (state) => {
              state.menu.selectedIndex = index;
            },
            false,
            "command/setSelectedIndex",
          ),

        moveSelection: (direction) =>
          set(
            (state) => {
              // This will be updated by the component based on filtered list length
              if (direction === "up") {
                state.menu.selectedIndex = Math.max(
                  0,
                  state.menu.selectedIndex - 1,
                );
              } else {
                state.menu.selectedIndex += 1;
              }
            },
            false,
            "command/moveSelection",
          ),

        // -----------------------------------------------------------------------
        // Preview Actions
        // -----------------------------------------------------------------------
        showPreview: (parsedCommand, result) =>
          set(
            (state) => {
              state.preview.isVisible = true;
              state.preview.parsedCommand = parsedCommand;
              state.preview.result = result;
              state.preview.isLoading = false;
            },
            false,
            "command/showPreview",
          ),

        hidePreview: () =>
          set(
            (state) => {
              state.preview.isVisible = false;
              state.preview.parsedCommand = null;
              state.preview.result = null;
              state.preview.isLoading = false;
            },
            false,
            "command/hidePreview",
          ),

        setPreviewLoading: (loading) =>
          set(
            (state) => {
              state.preview.isLoading = loading;
            },
            false,
            "command/setPreviewLoading",
          ),

        // -----------------------------------------------------------------------
        // History Actions
        // -----------------------------------------------------------------------
        addToHistory: (entry) =>
          set(
            (state) => {
              const newEntry: CommandHistoryEntry = {
                ...entry,
                id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              };
              state.history.unshift(newEntry);
              // Trim history to max length
              if (state.history.length > state.maxHistoryLength) {
                state.history = state.history.slice(0, state.maxHistoryLength);
              }
            },
            false,
            "command/addToHistory",
          ),

        clearHistory: () =>
          set(
            (state) => {
              state.history = [];
            },
            false,
            "command/clearHistory",
          ),

        removeFromHistory: (id) =>
          set(
            (state) => {
              state.history = state.history.filter((h) => h.id !== id);
            },
            false,
            "command/removeFromHistory",
          ),

        getRecentCommands: (limit = 10) => {
          return get().history.slice(0, limit);
        },

        // -----------------------------------------------------------------------
        // Favorites Actions
        // -----------------------------------------------------------------------
        addFavorite: (commandName) =>
          set(
            (state) => {
              if (!state.favorites.includes(commandName)) {
                state.favorites.push(commandName);
              }
            },
            false,
            "command/addFavorite",
          ),

        removeFavorite: (commandName) =>
          set(
            (state) => {
              state.favorites = state.favorites.filter(
                (f) => f !== commandName,
              );
            },
            false,
            "command/removeFavorite",
          ),

        toggleFavorite: (commandName) =>
          set(
            (state) => {
              const index = state.favorites.indexOf(commandName);
              if (index === -1) {
                state.favorites.push(commandName);
              } else {
                state.favorites.splice(index, 1);
              }
            },
            false,
            "command/toggleFavorite",
          ),

        isFavorite: (commandName) => {
          return get().favorites.includes(commandName);
        },

        // -----------------------------------------------------------------------
        // Custom Commands Actions
        // -----------------------------------------------------------------------
        addCustomCommand: (command) =>
          set(
            (state) => {
              const existing = state.customCommands.find(
                (c) => c.name === command.name,
              );
              if (!existing) {
                state.customCommands.push({
                  ...command,
                  createdAt: Date.now(),
                });
              }
            },
            false,
            "command/addCustomCommand",
          ),

        removeCustomCommand: (name) =>
          set(
            (state) => {
              state.customCommands = state.customCommands.filter(
                (c) => c.name !== name,
              );
            },
            false,
            "command/removeCustomCommand",
          ),

        updateCustomCommand: (name, updates) =>
          set(
            (state) => {
              const index = state.customCommands.findIndex(
                (c) => c.name === name,
              );
              if (index !== -1) {
                state.customCommands[index] = {
                  ...state.customCommands[index],
                  ...updates,
                };
              }
            },
            false,
            "command/updateCustomCommand",
          ),

        toggleCustomCommand: (name) =>
          set(
            (state) => {
              const index = state.customCommands.findIndex(
                (c) => c.name === name,
              );
              if (index !== -1) {
                state.customCommands[index].enabled =
                  !state.customCommands[index].enabled;
              }
            },
            false,
            "command/toggleCustomCommand",
          ),

        getCustomCommand: (name) => {
          return get().customCommands.find((c) => c.name === name);
        },

        // -----------------------------------------------------------------------
        // Effect Actions
        // -----------------------------------------------------------------------
        addPendingEffect: (effect) =>
          set(
            (state) => {
              state.pendingEffects.push({
                ...effect,
                id: `effect_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                executed: false,
              });
            },
            false,
            "command/addPendingEffect",
          ),

        markEffectExecuted: (id) =>
          set(
            (state) => {
              const effect = state.pendingEffects.find((e) => e.id === id);
              if (effect) {
                effect.executed = true;
              }
            },
            false,
            "command/markEffectExecuted",
          ),

        removePendingEffect: (id) =>
          set(
            (state) => {
              state.pendingEffects = state.pendingEffects.filter(
                (e) => e.id !== id,
              );
            },
            false,
            "command/removePendingEffect",
          ),

        getReadyEffects: () => {
          const now = Date.now();
          return get().pendingEffects.filter(
            (e) => !e.executed && (!e.executeAt || e.executeAt <= now),
          );
        },

        // -----------------------------------------------------------------------
        // Execution Actions
        // -----------------------------------------------------------------------
        setExecuting: (executing) =>
          set(
            (state) => {
              state.isExecuting = executing;
            },
            false,
            "command/setExecuting",
          ),

        setError: (error) =>
          set(
            (state) => {
              state.lastError = error;
            },
            false,
            "command/setError",
          ),

        // -----------------------------------------------------------------------
        // Reset
        // -----------------------------------------------------------------------
        reset: () =>
          set(
            () => ({
              ...initialState,
              // Preserve persisted data
              history: get().history,
              favorites: get().favorites,
              customCommands: get().customCommands,
            }),
            false,
            "command/reset",
          ),
      })),
      {
        name: "nchat-commands",
        partialize: (state) => ({
          history: state.history,
          favorites: state.favorites,
          customCommands: state.customCommands,
        }),
      },
    ),
    { name: "command-store" },
  ),
);

// ============================================================================
// Selectors
// ============================================================================

export const selectMenuState = (state: CommandStore) => state.menu;

export const selectIsMenuOpen = (state: CommandStore) => state.menu.isOpen;

export const selectMenuFilter = (state: CommandStore) => state.menu.filter;

export const selectSelectedIndex = (state: CommandStore) =>
  state.menu.selectedIndex;

export const selectPreviewState = (state: CommandStore) => state.preview;

export const selectIsPreviewVisible = (state: CommandStore) =>
  state.preview.isVisible;

export const selectHistory = (state: CommandStore) => state.history;

export const selectFavorites = (state: CommandStore) => state.favorites;

export const selectCustomCommands = (state: CommandStore) =>
  state.customCommands;

export const selectEnabledCustomCommands = (state: CommandStore) =>
  state.customCommands.filter((c) => c.enabled);

export const selectIsExecuting = (state: CommandStore) => state.isExecuting;

export const selectLastError = (state: CommandStore) => state.lastError;

export const selectRecentCommandNames = (state: CommandStore) => {
  const seen = new Set<string>();
  return state.history
    .filter((h) => h.success)
    .map((h) => h.commandName)
    .filter((name) => {
      if (seen.has(name)) return false;
      seen.add(name);
      return true;
    })
    .slice(0, 5);
};

export const selectCommandUsageCount =
  (state: CommandStore) => (commandName: string) =>
    state.history.filter((h) => h.commandName === commandName).length;
