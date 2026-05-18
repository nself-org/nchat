"use client";

/**
 * SearchCommand
 *
 * Specialized command item for search actions.
 */

import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import { Search, MessageSquare, FileText, Users, Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import { CommandShortcut } from "./CommandShortcut";
import type { SearchCommandData } from "@/lib/command-palette/command-types";

// ============================================================================
// Types
// ============================================================================

export interface SearchCommandProps {
  /** Search command data */
  command: SearchCommandData;
  /** Whether this item is currently selected */
  isSelected?: boolean;
  /** Click handler */
  onSelect?: (command: SearchCommandData) => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Search Type Configuration
// ============================================================================

const searchTypeConfig: Record<
  string,
  { icon: React.ElementType; label: string; color: string }
> = {
  messages: {
    icon: MessageSquare,
    label: "Messages",
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  files: {
    icon: FileText,
    label: "Files",
    color: "bg-green-500/10 text-green-600 dark:text-green-400",
  },
  users: {
    icon: Users,
    label: "Users",
    color: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  },
  channels: {
    icon: Hash,
    label: "Channels",
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  all: { icon: Search, label: "All", color: "bg-muted text-muted-foreground" },
};

// ============================================================================
// Component
// ============================================================================

export function SearchCommand({
  command,
  isSelected = false,
  onSelect,
  className,
}: SearchCommandProps) {
  const config = searchTypeConfig[command.searchType] || searchTypeConfig.all;
  const Icon = config.icon;

  return (
    <CommandPrimitive.Item
      value={command.id}
      onSelect={() => onSelect?.(command)}
      className={cn(
        "relative flex cursor-pointer select-none items-center gap-3 rounded-md px-3 py-2 text-sm outline-none",
        "aria-selected:text-accent-foreground aria-selected:bg-accent",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        "hover:text-accent-foreground hover:bg-accent",
        isSelected && "text-accent-foreground bg-accent",
        className,
      )}
      data-selected={isSelected}
    >
      {/* Search icon */}
      <div
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-md",
          config.color.split(" ")[0], // Just the background color
        )}
      >
        <Icon
          className={cn("h-4 w-4", config.color.split(" ").slice(1).join(" "))}
        />
      </div>

      {/* Search info */}
      <div className="flex-1 overflow-hidden">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{command.name}</span>

          {/* Search type badge */}
          {command.searchType !== "all" && (
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-medium",
                config.color,
              )}
            >
              {config.label}
            </span>
          )}
        </div>

        {/* Description or search query */}
        {command.searchQuery ? (
          <p className="truncate text-xs text-muted-foreground">
            Search for "{command.searchQuery}"
          </p>
        ) : command.description ? (
          <p className="truncate text-xs text-muted-foreground">
            {command.description}
          </p>
        ) : null}
      </div>

      {/* Shortcut */}
      {command.shortcut && (
        <CommandShortcut keys={command.shortcut.keys} size="sm" />
      )}
    </CommandPrimitive.Item>
  );
}

export default SearchCommand;
