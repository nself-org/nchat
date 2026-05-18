"use client";

/**
 * useCommandPalette Hook
 *
 * Provides access to command palette functionality and state.
 * Handles registration of dynamic commands (channels, users).
 */

import { useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

import { useCommandPaletteStore } from "@/stores/command-palette-store";
import { useChannelStore, selectChannelList } from "@/stores/channel-store";
import { useUserStore, selectAllUsers } from "@/stores/user-store";
import { useUIStore } from "@/stores/ui-store";

import {
  getCommandRegistry,
  getCommandExecutor,
  getCommandHistory,
  type Command,
  type CommandExecutionContext,
  type CommandCategory,
} from "@/lib/command-palette";

// ============================================================================
// Types
// ============================================================================

export interface UseCommandPaletteOptions {
  /** Auto-register channels from store */
  registerChannels?: boolean;
  /** Auto-register users from store */
  registerUsers?: boolean;
  /** Custom context data for command execution */
  contextData?: Record<string, unknown>;
}

export interface UseCommandPaletteReturn {
  /** Whether the palette is open */
  isOpen: boolean;
  /** Current search query */
  query: string;
  /** Current mode */
  mode: "all" | "channels" | "dms" | "users" | "search" | "actions";
  /** Filtered commands */
  commands: Command[];
  /** Recent commands */
  recentCommands: Command[];
  /** Currently selected command */
  selectedCommand: Command | null;
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Open the palette */
  open: (
    mode?: "all" | "channels" | "dms" | "users" | "search" | "actions",
  ) => void;
  /** Close the palette */
  close: () => void;
  /** Toggle the palette */
  toggle: () => void;
  /** Update search query */
  setQuery: (query: string) => void;
  /** Set mode/filter */
  setMode: (
    mode: "all" | "channels" | "dms" | "users" | "search" | "actions",
  ) => void;
  /** Execute a command by ID */
  executeCommand: (commandId: string) => void;
  /** Execute the selected command */
  executeSelected: () => void;
  /** Select next item */
  selectNext: () => void;
  /** Select previous item */
  selectPrevious: () => void;
  /** Register a custom command */
  registerCommand: (command: Command) => void;
  /** Unregister a command */
  unregisterCommand: (commandId: string) => void;
  /** Clear command history */
  clearHistory: () => void;
}

// ============================================================================
// Hook
// ============================================================================

export function useCommandPalette(
  options: UseCommandPaletteOptions = {},
): UseCommandPaletteReturn {
  const {
    registerChannels = true,
    registerUsers = true,
    contextData,
  } = options;

  const router = useRouter();

  // Command palette store
  const store = useCommandPaletteStore();

  // Get channels and users from their stores
  const channels = useChannelStore(selectChannelList);
  const users = useUserStore(selectAllUsers);

  // UI store for additional context
  const openModal = useUIStore((s) => s.openModal);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  // Get registry and executor
  const registry = useMemo(() => getCommandRegistry(), []);
  const executor = useMemo(() => getCommandExecutor(), []);
  const history = useMemo(() => getCommandHistory(), []);

  // Register channels when they change
  useEffect(() => {
    if (!registerChannels) return;

    registry.registerChannels(
      channels.map((ch) => ({
        id: ch.id,
        name: ch.name,
        type: ch.type,
        memberCount: ch.memberCount,
      })),
    );
  }, [channels, registerChannels, registry]);

  // Register users when they change
  useEffect(() => {
    if (!registerUsers) return;

    registry.registerUsers(
      users.map((user) => ({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        presence: user.presence,
        role: user.role,
      })),
    );
  }, [users, registerUsers, registry]);

  // Create execution context
  const createContext = useCallback((): CommandExecutionContext => {
    return {
      closeCommandPalette: store.close,
      navigate: (path: string) => router.push(path),
      data: {
        openModal,
        toggleSidebar,
        ...contextData,
      },
    };
  }, [store.close, router, openModal, toggleSidebar, contextData]);

  // Execute command by ID
  const executeCommand = useCallback(
    (commandId: string) => {
      const command = registry.get(commandId);
      if (command) {
        const context = createContext();
        executor.execute(command, context);
        history.add(commandId);
      }
    },
    [registry, executor, history, createContext],
  );

  // Execute selected command
  const executeSelected = useCallback(() => {
    store.executeSelected(createContext());
  }, [store, createContext]);

  // Get selected command
  const selectedCommand = useMemo(() => {
    const { filteredCommands, selectedIndex } = store;
    return filteredCommands[selectedIndex] || null;
  }, [store]);

  // Register custom command
  const registerCommand = useCallback(
    (command: Command) => {
      registry.register(command);
    },
    [registry],
  );

  // Unregister command
  const unregisterCommand = useCallback(
    (commandId: string) => {
      registry.unregister(commandId);
    },
    [registry],
  );

  return {
    isOpen: store.isOpen,
    query: store.query,
    mode: store.mode,
    commands: store.filteredCommands,
    recentCommands: store.recentCommands,
    selectedCommand,
    isLoading: store.isLoading,
    error: store.error,
    open: store.open,
    close: store.close,
    toggle: store.toggle,
    setQuery: store.setQuery,
    setMode: store.setMode,
    executeCommand,
    executeSelected,
    selectNext: store.selectNext,
    selectPrevious: store.selectPrevious,
    registerCommand,
    unregisterCommand,
    clearHistory: store.clearHistory,
  };
}

export default useCommandPalette;
