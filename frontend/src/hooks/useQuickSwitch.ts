"use client";

/**
 * useQuickSwitch Hook
 *
 * Simplified hook for quick channel/DM switching functionality.
 * Provides Slack-like Cmd+K quick switcher behavior.
 */

import { useCallback, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";

import { useCommandPaletteStore } from "@/stores/command-palette-store";
import {
  useChannelStore,
  selectChannelList,
  selectRecentChannels,
} from "@/stores/channel-store";
import { useUserStore, selectAllUsers } from "@/stores/user-store";
import { useHotkey } from "@/hooks/use-hotkey";

import {
  getCommandRegistry,
  searchCommands,
  type Command,
  type CommandCategory,
} from "@/lib/command-palette";

// ============================================================================
// Types
// ============================================================================

export interface QuickSwitchItem {
  id: string;
  name: string;
  type: "channel" | "dm" | "user";
  icon?: string;
  presence?: "online" | "away" | "dnd" | "offline";
  unreadCount?: number;
  isStarred?: boolean;
  path: string;
}

export interface UseQuickSwitchOptions {
  /** Maximum items to show */
  maxItems?: number;
  /** Include channels */
  includeChannels?: boolean;
  /** Include DMs */
  includeDMs?: boolean;
  /** Include users */
  includeUsers?: boolean;
  /** Keyboard shortcut to open (default: mod+k) */
  shortcut?: string;
  /** Enable keyboard shortcut */
  enableShortcut?: boolean;
}

export interface UseQuickSwitchReturn {
  /** Whether the quick switcher is open */
  isOpen: boolean;
  /** Current search query */
  query: string;
  /** Filtered items */
  items: QuickSwitchItem[];
  /** Recent items */
  recentItems: QuickSwitchItem[];
  /** Currently selected index */
  selectedIndex: number;
  /** Open the quick switcher */
  open: () => void;
  /** Close the quick switcher */
  close: () => void;
  /** Toggle the quick switcher */
  toggle: () => void;
  /** Update search query */
  setQuery: (query: string) => void;
  /** Navigate to an item */
  navigateTo: (item: QuickSwitchItem) => void;
  /** Select next item */
  selectNext: () => void;
  /** Select previous item */
  selectPrevious: () => void;
  /** Navigate to selected item */
  navigateToSelected: () => void;
}

// ============================================================================
// Hook
// ============================================================================

export function useQuickSwitch(
  options: UseQuickSwitchOptions = {},
): UseQuickSwitchReturn {
  const {
    maxItems = 10,
    includeChannels = true,
    includeDMs = true,
    includeUsers = true,
    shortcut = "mod+k",
    enableShortcut = true,
  } = options;

  const router = useRouter();

  // Use command palette store for state
  const {
    isOpen,
    query,
    selectedIndex,
    filteredCommands,
    open: openPalette,
    close,
    toggle,
    setQuery,
    selectNext,
    selectPrevious,
  } = useCommandPaletteStore();

  // Get channels and users
  const channels = useChannelStore(selectChannelList);
  const recentChannels = useChannelStore(selectRecentChannels);
  const users = useUserStore(selectAllUsers);

  // Convert commands to QuickSwitchItems
  const convertToItem = useCallback(
    (command: Command): QuickSwitchItem | null => {
      if (
        command.category === "channel" &&
        includeChannels &&
        "channelId" in command
      ) {
        return {
          id: command.id,
          name: command.name,
          type: "channel",
          unreadCount: (command as any).unreadCount,
          isStarred: (command as any).isStarred,
          path: `/chat/channel/${(command as any).channelId}`,
        };
      }

      if (command.category === "dm" && includeDMs && "userId" in command) {
        return {
          id: command.id,
          name: command.name,
          type: "dm",
          presence: (command as any).presence,
          unreadCount: (command as any).unreadCount,
          path: `/chat/dm/${(command as any).userId}`,
        };
      }

      if (command.category === "user" && includeUsers && "userId" in command) {
        return {
          id: command.id,
          name: command.name,
          type: "user",
          presence: (command as any).presence,
          path: `/user/${(command as any).userId}`,
        };
      }

      return null;
    },
    [includeChannels, includeDMs, includeUsers],
  );

  // Convert filtered commands to items
  const items = useMemo(() => {
    return filteredCommands
      .map(convertToItem)
      .filter((item): item is QuickSwitchItem => item !== null)
      .slice(0, maxItems);
  }, [filteredCommands, convertToItem, maxItems]);

  // Get recent items
  const recentItems = useMemo(() => {
    const recentChannelItems: QuickSwitchItem[] = recentChannels
      .slice(0, 5)
      .map((channel) => ({
        id: `channel:${channel.id}`,
        name: channel.name,
        type: "channel" as const,
        isStarred: false,
        path: `/chat/channel/${channel.id}`,
      }));

    return recentChannelItems;
  }, [recentChannels]);

  // Open with filtered categories
  const open = useCallback(() => {
    const categories: CommandCategory[] = [];
    if (includeChannels) categories.push("channel");
    if (includeDMs) categories.push("dm");
    if (includeUsers) categories.push("user");

    // Open in 'all' mode but the palette will filter
    openPalette("all");
  }, [openPalette, includeChannels, includeDMs, includeUsers]);

  // Navigate to item
  const navigateTo = useCallback(
    (item: QuickSwitchItem) => {
      router.push(item.path);
      close();
    },
    [router, close],
  );

  // Navigate to selected
  const navigateToSelected = useCallback(() => {
    const selectedItem = items[selectedIndex];
    if (selectedItem) {
      navigateTo(selectedItem);
    }
  }, [items, selectedIndex, navigateTo]);

  // Register keyboard shortcut
  useHotkey(
    shortcut,
    () => {
      toggle();
    },
    {
      enabled: enableShortcut,
      preventDefault: true,
      enableOnInputs: false,
    },
  );

  return {
    isOpen,
    query,
    items,
    recentItems,
    selectedIndex,
    open,
    close,
    toggle,
    setQuery,
    navigateTo,
    selectNext,
    selectPrevious,
    navigateToSelected,
  };
}

export default useQuickSwitch;
