"use client";

/**
 * CommandList
 *
 * Scrollable list of commands with virtual scrolling support.
 */

import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import { cn } from "@/lib/utils";
import { CommandItem } from "./CommandItem";
import { CommandGroup, CommandSeparator } from "./CommandGroup";
import { CommandEmpty } from "./CommandEmpty";
import { CommandLoading } from "./CommandLoading";
import type {
  Command,
  CommandCategory,
  CommandSearchResult,
} from "@/lib/command-palette/command-types";
import { getCommandRegistry } from "@/lib/command-palette/command-registry";

// ============================================================================
// Types
// ============================================================================

export interface CommandListProps {
  /** Commands to display */
  commands: Command[];
  /** Search results with scores and matches */
  searchResults?: CommandSearchResult[];
  /** Currently selected index */
  selectedIndex?: number;
  /** Handler when a command is selected */
  onSelect?: (command: Command) => void;
  /** Handler when selection changes via keyboard */
  onSelectionChange?: (index: number) => void;
  /** Current search query */
  query?: string;
  /** Loading state */
  isLoading?: boolean;
  /** Whether to group commands by category */
  groupByCategory?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Maximum height */
  maxHeight?: number | string;
}

// ============================================================================
// Category Display Names
// ============================================================================

const getCategoryDisplayName = (category: CommandCategory): string => {
  const names: Record<CommandCategory, string> = {
    recent: "Recent",
    navigation: "Navigation",
    channel: "Channels",
    dm: "Direct Messages",
    user: "Users",
    message: "Messages",
    settings: "Settings",
    action: "Actions",
    search: "Search",
    create: "Create",
  };
  return names[category] || category;
};

// ============================================================================
// Group Commands by Category
// ============================================================================

function groupCommandsByCategory(
  commands: Command[],
): Map<CommandCategory, Command[]> {
  const groups = new Map<CommandCategory, Command[]>();

  // Define category order
  const categoryOrder: CommandCategory[] = [
    "recent",
    "navigation",
    "channel",
    "dm",
    "user",
    "search",
    "create",
    "action",
    "settings",
    "message",
  ];

  // Initialize groups in order
  for (const category of categoryOrder) {
    groups.set(category, []);
  }

  // Group commands
  for (const command of commands) {
    const group = groups.get(command.category);
    if (group) {
      group.push(command);
    } else {
      groups.set(command.category, [command]);
    }
  }

  // Remove empty groups
  for (const [category, items] of groups) {
    if (items.length === 0) {
      groups.delete(category);
    }
  }

  return groups;
}

// ============================================================================
// Component
// ============================================================================

export function CommandList({
  commands,
  searchResults,
  selectedIndex = 0,
  onSelect,
  onSelectionChange,
  query,
  isLoading = false,
  groupByCategory = true,
  className,
  maxHeight = 400,
}: CommandListProps) {
  const listRef = React.useRef<HTMLDivElement>(null);

  // Create a map of command id to search result for matches
  const resultMap = React.useMemo(() => {
    if (!searchResults) return new Map<string, CommandSearchResult>();
    return new Map(searchResults.map((r) => [r.command.id, r]));
  }, [searchResults]);

  // Auto-scroll to keep selected item visible
  React.useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.querySelector(
        '[data-selected="true"]',
      );
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: "nearest",
          behavior: "smooth",
        });
      }
    }
  }, [selectedIndex]);

  // Loading state
  if (isLoading) {
    return (
      <CommandLoading showSkeletons skeletonCount={5} className={className} />
    );
  }

  // Empty state
  if (commands.length === 0) {
    return <CommandEmpty query={query} className={className} />;
  }

  // Render grouped or flat list
  if (groupByCategory && !query) {
    const groups = groupCommandsByCategory(commands);
    let currentIndex = 0;

    return (
      <CommandPrimitive.List
        ref={listRef}
        className={cn("overflow-y-auto overflow-x-hidden", className)}
        style={{ maxHeight }}
      >
        {Array.from(groups.entries()).map(([category, items], groupIndex) => (
          <React.Fragment key={category}>
            {groupIndex > 0 && <CommandSeparator className="my-1" />}
            <CommandGroup heading={getCategoryDisplayName(category)}>
              {items.map((command) => {
                const itemIndex = currentIndex++;
                const result = resultMap.get(command.id);
                return (
                  <CommandItem
                    key={command.id}
                    command={command}
                    isSelected={itemIndex === selectedIndex}
                    onSelect={onSelect}
                    matches={result?.matches}
                  />
                );
              })}
            </CommandGroup>
          </React.Fragment>
        ))}
      </CommandPrimitive.List>
    );
  }

  // Flat list (when searching)
  return (
    <CommandPrimitive.List
      ref={listRef}
      className={cn("overflow-y-auto overflow-x-hidden py-2", className)}
      style={{ maxHeight }}
    >
      {commands.map((command, index) => {
        const result = resultMap.get(command.id);
        return (
          <CommandItem
            key={command.id}
            command={command}
            isSelected={index === selectedIndex}
            onSelect={onSelect}
            matches={result?.matches}
          />
        );
      })}
    </CommandPrimitive.List>
  );
}

export default CommandList;
