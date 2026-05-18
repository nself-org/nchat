"use client";

/**
 * RecentCommands
 *
 * Display recently used commands for quick access.
 */

import * as React from "react";
import { Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CommandItem } from "./CommandItem";
import { CommandGroup } from "./CommandGroup";
import type { Command } from "@/lib/command-palette/command-types";

// ============================================================================
// Types
// ============================================================================

export interface RecentCommandsProps {
  /** Recently used commands */
  commands: Command[];
  /** Handler when a command is selected */
  onSelect?: (command: Command) => void;
  /** Handler to clear history */
  onClearHistory?: () => void;
  /** Currently selected index */
  selectedIndex?: number;
  /** Maximum commands to show */
  maxItems?: number;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show the clear history button */
  showClearButton?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function RecentCommands({
  commands,
  onSelect,
  onClearHistory,
  selectedIndex = -1,
  maxItems = 5,
  className,
  showClearButton = true,
}: RecentCommandsProps) {
  const displayCommands = commands.slice(0, maxItems);

  if (displayCommands.length === 0) {
    return null;
  }

  return (
    <div className={cn("py-1", className)}>
      <CommandGroup
        heading="Recent"
        icon={Clock}
        headingClassName={cn(
          "flex items-center justify-between",
          showClearButton && "pr-2",
        )}
      >
        {displayCommands.map((command, index) => (
          <CommandItem
            key={command.id}
            command={{ ...command, isRecent: true }}
            isSelected={index === selectedIndex}
            onSelect={onSelect}
          />
        ))}
      </CommandGroup>

      {showClearButton && onClearHistory && (
        <div className="flex justify-end px-2 pt-1">
          <button
            type="button"
            onClick={onClearHistory}
            className={cn(
              "flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground",
              "hover:text-accent-foreground hover:bg-accent",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            )}
          >
            <X className="h-3 w-3" />
            Clear recent
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Compact Recent List
// ============================================================================

export interface CompactRecentListProps {
  /** Recently used commands */
  commands: Command[];
  /** Handler when a command is selected */
  onSelect?: (command: Command) => void;
  /** Maximum commands to show */
  maxItems?: number;
  /** Additional CSS classes */
  className?: string;
}

export function CompactRecentList({
  commands,
  onSelect,
  maxItems = 3,
  className,
}: CompactRecentListProps) {
  const displayCommands = commands.slice(0, maxItems);

  if (displayCommands.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap gap-1 px-3 py-2", className)}>
      <span className="mr-1 text-xs text-muted-foreground">Recent:</span>
      {displayCommands.map((command) => (
        <button
          key={command.id}
          type="button"
          onClick={() => onSelect?.(command)}
          className={cn(
            "inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs",
            "hover:text-accent-foreground hover:bg-accent",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          )}
        >
          <Clock className="h-2.5 w-2.5" />
          {command.name}
        </button>
      ))}
    </div>
  );
}

export default RecentCommands;
